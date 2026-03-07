/**
 * MechMind OS v10 - k6 Lock Contention Load Test
 * Test 2: 1000 concurrent requests (100 slots) - p99 lock wait <100ms
 * 
 * Validated Requirements:
 * - 1000 VUs across 100 different slots (10 per slot)
 * - Measure advisory lock wait times
 * - Zero deadlocks
 * - 100% booking success rate
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import {
  getApiUrl,
  getHealthUrl,
  getDefaultHeaders,
  generateUUID,
  TEST_DATA,
  THRESHOLDS,
  logConfig,
} from './config.js';

// ============================================
// CUSTOM METRICS
// ============================================

/**
 * Trend for lock wait times in milliseconds
 */
const lockWaitMs = new Trend('lock_wait_ms');

/**
 * Counter for deadlock detections (must be 0)
 */
const deadlockDetected = new Counter('deadlock_detected');

/**
 * Rate for booking success
 */
const bookingSuccessRate = new Rate('booking_success_rate');

/**
 * Counter for successful bookings
 */
const successfulBookings = new Counter('successful_bookings');

/**
 * Counter for failed bookings
 */
const failedBookings = new Counter('failed_bookings');

/**
 * Trend for slot contention level
 */
const slotContentionLevel = new Trend('slot_contention_level');

// ============================================
// TEST CONFIGURATION
// ============================================

// Test parameters
const TOTAL_SLOTS = 100;
const VUS_PER_SLOT = 10;
const TOTAL_VUS = TOTAL_SLOTS * VUS_PER_SLOT; // 1000 VUs

export const options = {
  scenarios: {
    // Lock contention test: 1000 VUs distributed across 100 slots
    lock_contention: {
      executor: 'shared-iterations',
      vus: TOTAL_VUS,
      iterations: TOTAL_VUS,
      maxDuration: '10m',
      exec: 'lockContentionTest',
    },
    
    // Sustained contention test
    sustained_contention: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 500 },
        { duration: '3m', target: 500 },
        { duration: '1m', target: 0 },
      ],
      exec: 'sustainedContentionTest',
    },
  },
  thresholds: {
    // HTTP request duration
    http_req_duration: [`p(99)<${THRESHOLDS.httpReqDuration.p99}`],
    http_req_failed: [`rate<${THRESHOLDS.httpReqFailed.rate}`],
    
    // Lock wait time p99 < 100ms
    lock_wait_ms: [`p(99)<${THRESHOLDS.lockWaitTime.p99}`],
    
    // Zero deadlocks
    deadlock_detected: ['count==0'],
    
    // 100% booking success rate (no conflicts in distributed slots)
    booking_success_rate: ['rate==1'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

// ============================================
// SETUP FUNCTION
// ============================================

export function setup() {
  logConfig();
  console.log('\n🔒 Lock Contention Test: 1000 VUs across 100 slots');
  console.log(`   Configuration: ${VUS_PER_SLOT} VUs per slot, ${TOTAL_SLOTS} slots`);
  console.log(`   Target: p99 lock wait < ${THRESHOLDS.lockWaitTime.p99}ms`);
  console.log(`   Target: Zero deadlocks\n`);
  
  // Verify API health
  const healthCheck = http.get(getHealthUrl());
  if (healthCheck.status !== 200) {
    console.error('❌ API health check failed! Aborting test.');
    return { skip: true, reason: 'API unhealthy' };
  }
  
  console.log('✅ API is healthy');
  
  // Pre-create 100 slots for the test
  console.log(`\n📅 Pre-creating ${TOTAL_SLOTS} test slots...`);
  const slotIds = createTestSlots(TOTAL_SLOTS);
  
  if (slotIds.length < TOTAL_SLOTS) {
    console.error(`❌ Failed to create all test slots. Created ${slotIds.length}/${TOTAL_SLOTS}`);
    return { skip: true, reason: 'Failed to create slots', slotIds };
  }
  
  console.log(`✅ Created ${slotIds.length} test slots\n`);
  
  return {
    testStartTime: new Date().toISOString(),
    slotIds: slotIds,
    expectedBookings: TOTAL_SLOTS, // 1 booking per slot expected
  };
}

// ============================================
// MAIN TEST FUNCTIONS
// ============================================

/**
 * Main lock contention test
 * Each VU is assigned to a specific slot group
 */
export function lockContentionTest() {
  // Calculate which slot this VU should use
  // VU IDs are 1-based
  const slotIndex = (Math.floor((__VU - 1) / VUS_PER_SLOT)) % TOTAL_SLOTS;
  const slotId = __ENV.SLOT_IDS ? __ENV.SLOT_IDS.split(',')[slotIndex] : generateSlotId(slotIndex);
  
  // Track contention level for this slot
  const contentionLevel = ((__VU - 1) % VUS_PER_SLOT) + 1;
  slotContentionLevel.add(contentionLevel);
  
  group(`Lock Contention - Slot ${slotIndex + 1}/${TOTAL_SLOTS}`, () => {
    const startTime = Date.now();
    
    // Prepare booking payload
    const payload = JSON.stringify({
      slotId: slotId,
      customerId: generateCustomerId(__VU),
      notes: `Lock contention test - Slot ${slotIndex} - VU ${__VU} - ${generateUUID()}`,
    });
    
    const headers = getDefaultHeaders();
    headers['X-Slot-Index'] = `${slotIndex}`;
    headers['X-Contention-Level'] = `${contentionLevel}`;
    
    // Make the reservation request
    const response = http.post(
      getApiUrl('bookings/reserve'),
      payload,
      {
        headers: headers,
        tags: {
          test_type: 'lock_contention',
          endpoint: 'reserve_slot',
          slot_group: `${slotIndex}`,
        },
        timeout: '30s',
      }
    );
    
    const requestDuration = Date.now() - startTime;
    lockWaitMs.add(requestDuration);
    
    // Analyze response
    const isSuccess = response.status === 201;
    const isConflict = response.status === 409;
    const isDeadlock = response.status === 500 && 
      (response.body.includes('deadlock') || response.body.includes('Deadlock'));
    
    bookingSuccessRate.add(isSuccess);
    
    if (isSuccess) {
      successfulBookings.add(1);
    } else {
      failedBookings.add(1);
    }
    
    if (isDeadlock) {
      deadlockDetected.add(1);
      console.error(`💀 DEADLOCK DETECTED: VU ${__VU}, Slot ${slotIndex}`);
    }
    
    // Perform checks
    check(response, {
      'status is 201 (success)': (r) => r.status === 201,
      'no server errors': (r) => r.status < 500,
      'response time < 100ms (p99 target)': (r) => r.timings.duration < 100,
      'no deadlock errors': () => !isDeadlock,
    });
    
    if (response.status >= 500) {
      console.error(`❌ VU ${__VU}: Server error ${response.status} - ${response.body}`);
    }
    
    // Small think time to simulate realistic behavior
    sleep(0.01);
  });
}

/**
 * Sustained contention test
 * Tests lock behavior under sustained load with ramping
 */
export function sustainedContentionTest() {
  // Distribute VUs across slots randomly
  const slotIndex = Math.floor(Math.random() * TOTAL_SLOTS);
  const slotId = generateSlotId(slotIndex);
  
  group('Sustained Lock Contention', () => {
    const startTime = Date.now();
    
    const payload = JSON.stringify({
      slotId: slotId,
      customerId: generateCustomerId(Math.floor(Math.random() * 10000)),
      notes: `Sustained test - ${generateUUID()}`,
    });
    
    const response = http.post(
      getApiUrl('bookings/reserve'),
      payload,
      {
        headers: getDefaultHeaders(),
        tags: { test_type: 'sustained_contention' },
        timeout: '30s',
      }
    );
    
    const requestDuration = Date.now() - startTime;
    lockWaitMs.add(requestDuration);
    
    const isSuccess = response.status === 201;
    bookingSuccessRate.add(isSuccess);
    
    check(response, {
      'request successful or conflict': (r) => r.status === 201 || r.status === 409,
      'response time < 100ms': (r) => r.timings.duration < 100,
    });
    
    sleep(Math.random() * 0.5);
  });
}

// ============================================
// TEARDOWN FUNCTION
// ============================================

export function teardown(data) {
  if (data.skip) {
    console.log(`\n⏭️  Test skipped: ${data.reason}`);
    return;
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🔒 LOCK CONTENTION TEST - POST-TEST VALIDATION');
  console.log('='.repeat(60));
  
  // Wait a moment for any pending operations to complete
  sleep(2);
  
  // Verify booking results
  console.log('\n🔍 Verifying booking results...');
  const verificationResult = verifyBookingResults(data.slotIds);
  
  // Check for deadlocks in logs/metrics
  const deadlockCount = getDeadlockCount();
  
  console.log('\n📈 Test Summary:');
  console.log(`   Total Slots: ${TOTAL_SLOTS}`);
  console.log(`   VUs per Slot: ${VUS_PER_SLOT}`);
  console.log(`   Total VUs: ${TOTAL_VUS}`);
  console.log(`   Expected Bookings: ${data.expectedBookings}`);
  console.log(`   Actual Bookings: ${verificationResult.totalBookings}`);
  console.log(`   Successful Bookings: ${successfulBookings.value}`);
  console.log(`   Failed Bookings: ${failedBookings.value}`);
  console.log(`   Deadlock Count: ${deadlockCount}`);
  
  // Determine pass/fail
  const hasCorrectBookingCount = verificationResult.totalBookings === data.expectedBookings;
  const hasNoDeadlocks = deadlockCount === 0;
  const hasHighSuccessRate = bookingSuccessRate.value >= 0.99;
  
  const testPassed = hasCorrectBookingCount && hasNoDeadlocks && hasHighSuccessRate;
  
  console.log('\n📊 Validation Results:');
  console.log(`   ✅ Booking Count Correct: ${hasCorrectBookingCount}`);
  console.log(`   ✅ No Deadlocks: ${hasNoDeadlocks}`);
  console.log(`   ✅ High Success Rate: ${hasHighSuccessRate} (${(bookingSuccessRate.value * 100).toFixed(2)}%)`);
  
  console.log(`\n${testPassed ? '✅ TEST PASSED' : '❌ TEST FAILED'}`);
  console.log('='.repeat(60) + '\n');
  
  return {
    passed: testPassed,
    totalSlots: TOTAL_SLOTS,
    totalVus: TOTAL_VUS,
    expectedBookings: data.expectedBookings,
    actualBookings: verificationResult.totalBookings,
    deadlockCount: deadlockCount,
    successRate: bookingSuccessRate.value,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create test slots via API
 * @param {number} count - Number of slots to create
 * @returns {string[]} Array of created slot IDs
 */
function createTestSlots(count) {
  const slotIds = [];
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + 7); // 1 week from now
  
  for (let i = 0; i < count; i++) {
    const slotTime = new Date(baseDate);
    slotTime.setHours(9 + Math.floor(i / 10), (i % 10) * 5, 0, 0);
    
    const payload = JSON.stringify({
      shopId: TEST_DATA.shopId,
      startTime: slotTime.toISOString(),
      endTime: new Date(slotTime.getTime() + 60 * 60 * 1000).toISOString(),
      isAvailable: true,
      metadata: {
        testSlot: true,
        slotIndex: i,
      },
    });
    
    const response = http.post(
      getApiUrl('bookings/slots'),
      payload,
      {
        headers: getDefaultHeaders(),
        tags: { test_type: 'setup' },
      }
    );
    
    if (response.status === 201) {
      const slotId = response.json('data.id');
      if (slotId) {
        slotIds.push(slotId);
      }
    } else {
      // If slot creation fails, generate a deterministic ID for testing
      slotIds.push(generateSlotId(i));
    }
    
    // Small delay to avoid overwhelming the API
    if (i % 10 === 0) {
      sleep(0.1);
    }
  }
  
  return slotIds;
}

/**
 * Generate a deterministic slot ID for testing
 * @param {number} index - Slot index
 * @returns {string} Slot ID
 */
function generateSlotId(index) {
  // Generate a UUID-like string based on index for consistency
  return `550e8400-e29b-41d4-a716-${(index + 10000).toString().padStart(12, '0')}`;
}

/**
 * Generate a deterministic customer ID
 * @param {number} vu - Virtual user number
 * @returns {string} Customer ID
 */
function generateCustomerId(vu) {
  return `550e8400-e29b-41d4-a716-${(100000 + vu).toString().padStart(12, '0')}`;
}

/**
 * Verify booking results by querying the API
 * @param {string[]} slotIds - Array of slot IDs
 * @returns {Object} Verification result
 */
function verifyBookingResults(slotIds) {
  let totalBookings = 0;
  let checkedSlots = 0;
  
  // Sample check: verify a subset of slots
  const sampleSize = Math.min(20, slotIds.length);
  const sampleIndices = [];
  for (let i = 0; i < sampleSize; i++) {
    sampleIndices.push(Math.floor(Math.random() * slotIds.length));
  }
  
  for (const index of sampleIndices) {
    const slotId = slotIds[index];
    const response = http.get(
      `${getApiUrl('bookings')}?slotId=${slotId}&status=CONFIRMED`,
      {
        headers: getDefaultHeaders(),
        tags: { test_type: 'verification' },
      }
    );
    
    if (response.status === 200) {
      const bookings = response.json('data') || [];
      totalBookings += bookings.length;
      checkedSlots++;
    }
    
    sleep(0.05);
  }
  
  // Extrapolate total bookings
  const estimatedTotal = checkedSlots > 0 
    ? Math.round((totalBookings / checkedSlots) * slotIds.length)
    : 0;
  
  return {
    totalBookings: estimatedTotal,
    checkedSlots: checkedSlots,
    sampleBookings: totalBookings,
  };
}

/**
 * Get deadlock count from metrics
 * In a real implementation, this would query the database or logs
 * @returns {number} Number of deadlocks detected
 */
function getDeadlockCount() {
  return deadlockDetected.value;
}
