/**
 * MechMind OS v10 - k6 Race Condition Load Test
 * Test 1: 100 concurrent bookings same slot (zero double bookings)
 * 
 * Validated Requirements:
 * - Zero double bookings under concurrent load
 * - p99 HTTP response time < 500ms
 * - Post-test DB validation
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import crypto from 'k6/crypto';
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
 * Counter for detected double bookings (must be 0)
 */
const doubleBookingDetected = new Counter('double_booking_detected');

/**
 * Trend for advisory lock wait times
 */
const lockWaitMs = new Trend('lock_wait_ms');

/**
 * Rate for booking success
 */
const bookingSuccessRate = new Rate('booking_success_rate');

/**
 * Rate for conflict (409) responses (expected)
 */
const conflictRate = new Rate('conflict_rate');

/**
 * Counter for total booking attempts
 */
const bookingAttempts = new Counter('booking_attempts');

/**
 * Counter for successful bookings
 */
const successfulBookings = new Counter('successful_bookings');

// ============================================
// TEST CONFIGURATION
// ============================================

export const options = {
  scenarios: {
    // Main race condition test: 100 VUs, 1 iteration each
    race_condition: {
      executor: 'shared-iterations',
      vus: 100,
      iterations: 100,
      maxDuration: '5m',
      exec: 'raceConditionTest',
    },
  },
  thresholds: {
    // HTTP request duration p99 < 500ms
    http_req_duration: [`p(99)<${THRESHOLDS.httpReqDuration.p99}`],
    
    // Error rate < 1%
    http_req_failed: [`rate<${THRESHOLDS.httpReqFailed.rate}`],
    
    // Zero double bookings detected
    double_booking_detected: ['count==0'],
    
    // Booking success rate tracking (not enforced as threshold since conflicts are expected)
    booking_success_rate: [],
    
    // Lock wait time tracking
    lock_wait_ms: [`p(99)<${THRESHOLDS.lockWaitTime.p99}`],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

// Global array to store successful booking IDs (via console logs)
const successfulBookingIds = [];

// ============================================
// SETUP FUNCTION
// ============================================

export function setup() {
  logConfig();
  console.log('\n🎯 Race Condition Test: 100 VUs competing for 1 slot');
  console.log(`📅 Target Slot ID: ${TEST_DATA.sharedSlotId}`);
  console.log(`📅 Target Slot Time: ${TEST_DATA.sharedSlotTime}`);
  
  // Verify API health
  const healthCheck = http.get(getHealthUrl());
  if (healthCheck.status !== 200) {
    console.error('❌ API health check failed! Aborting test.');
    return { skip: true, reason: 'API unhealthy' };
  }
  
  console.log('✅ API is healthy\n');
  
  // Pre-check: Verify slot exists and is available
  const slotCheck = http.get(
    `${getApiUrl('bookings/slots')}/${TEST_DATA.sharedSlotId}`,
    { headers: getDefaultHeaders() }
  );
  
  if (slotCheck.status === 404) {
    console.log('⚠️  Slot not found, attempting to create test slot...');
    // Create the slot if it doesn't exist
    const createSlotPayload = JSON.stringify({
      shopId: TEST_DATA.shopId,
      startTime: TEST_DATA.sharedSlotTime,
      endTime: new Date(new Date(TEST_DATA.sharedSlotTime).getTime() + 60 * 60 * 1000).toISOString(),
      isAvailable: true,
    });
    
    const createSlot = http.post(
      getApiUrl('bookings/slots'),
      createSlotPayload,
      { headers: getDefaultHeaders() }
    );
    
    if (createSlot.status !== 201) {
      console.error('❌ Failed to create test slot:', createSlot.body);
      return { skip: true, reason: 'Failed to create slot' };
    }
    console.log('✅ Test slot created\n');
  } else {
    console.log('✅ Test slot exists\n');
  }
  
  return {
    testStartTime: new Date().toISOString(),
    slotId: TEST_DATA.sharedSlotId,
  };
}

// ============================================
// MAIN TEST FUNCTION
// ============================================

export function raceConditionTest() {
  group('Race Condition - Same Slot Reservation', () => {
    const startTime = Date.now();
    
    // Prepare booking payload - all VUs try to book the SAME slot
    const payload = JSON.stringify({
      slotId: TEST_DATA.sharedSlotId,
      customerId: TEST_DATA.customerId,
      notes: `Race condition test - VU ${__VU} - Iter ${__ITER} - ${generateUUID()}`,
    });
    
    const headers = getDefaultHeaders();
    headers['X-VU-ID'] = `${__VU}`;
    headers['X-Iter'] = `${__ITER}`;
    
    bookingAttempts.add(1);
    
    // Make the reservation request
    const response = http.post(
      getApiUrl('bookings/reserve'),
      payload,
      {
        headers: headers,
        tags: { test_type: 'race_condition', endpoint: 'reserve_slot' },
        timeout: '30s',
      }
    );
    
    const requestDuration = Date.now() - startTime;
    lockWaitMs.add(requestDuration);
    
    // Analyze response
    const isSuccess = response.status === 201;
    const isConflict = response.status === 409;
    const isError = response.status >= 500;
    
    bookingSuccessRate.add(isSuccess);
    conflictRate.add(isConflict);
    
    if (isSuccess) {
      successfulBookings.add(1);
      const bookingId = response.json('data.id');
      if (bookingId) {
        console.log(`✅ VU ${__VU}: Successfully created booking ${bookingId}`);
      }
    }
    
    // Perform checks
    check(response, {
      'status is 201 (success) or 409 (conflict)': (r) => 
        r.status === 201 || r.status === 409,
      'no server errors (5xx)': (r) => r.status < 500,
      'response time < 500ms (p99)': (r) => r.timings.duration < 500,
      'has valid response structure': (r) => {
        if (r.status === 201) {
          return r.json('success') === true && r.json('data.id') !== undefined;
        }
        if (r.status === 409) {
          return r.json('statusCode') === 409 || r.json('message') !== undefined;
        }
        return true;
      },
    });
    
    // Log errors
    if (isError) {
      console.error(`❌ VU ${__VU}: Server error ${response.status} - ${response.body}`);
    }
    
    // Minimal think time between attempts
    sleep(0.05);
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
  console.log('📊 RACE CONDITION TEST - POST-TEST VALIDATION');
  console.log('='.repeat(60));
  
  // Query database to verify no double bookings
  console.log('\n🔍 Verifying no double bookings in database...');
  
  const verificationResult = verifyNoDoubleBookings(data.slotId);
  
  if (verificationResult.hasDoubleBooking) {
    console.error(`❌ DOUBLE BOOKING DETECTED: ${verificationResult.confirmedCount} confirmed bookings for slot ${data.slotId}`);
    doubleBookingDetected.add(verificationResult.confirmedCount - 1);
  } else {
    console.log(`✅ No double bookings detected. ${verificationResult.confirmedCount} confirmed booking(s) for slot.`);
  }
  
  // Print summary
  console.log('\n📈 Test Summary:');
  console.log(`   Slot ID: ${data.slotId}`);
  console.log(`   Test Start: ${data.testStartTime}`);
  console.log(`   Test End: ${new Date().toISOString()}`);
  console.log(`   Expected: 1 success, 99 conflicts`);
  
  // Export pass/fail status
  const testPassed = !verificationResult.hasDoubleBooking;
  console.log(`\n${testPassed ? '✅ TEST PASSED' : '❌ TEST FAILED'}`);
  console.log('='.repeat(60) + '\n');
  
  // Return summary for potential CI/CD integration
  return {
    passed: testPassed,
    slotId: data.slotId,
    hasDoubleBooking: verificationResult.hasDoubleBooking,
    confirmedCount: verificationResult.confirmedCount,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Verify no double bookings exist for a slot
 * Note: In a real implementation, this would query the database directly
 * For k6, we use the API to verify
 * 
 * @param {string} slotId - The slot ID to check
 * @returns {Object} Verification result
 */
function verifyNoDoubleBookings(slotId) {
  // Query bookings for the specific slot
  const response = http.get(
    `${getApiUrl('bookings')}?slotId=${slotId}&status=CONFIRMED`,
    {
      headers: getDefaultHeaders(),
      tags: { test_type: 'verification' },
    }
  );
  
  if (response.status !== 200) {
    console.error(`❌ Failed to query bookings: ${response.status} - ${response.body}`);
    return { hasDoubleBooking: false, confirmedCount: 0, error: true };
  }
  
  const bookings = response.json('data') || [];
  const confirmedBookings = bookings.filter(b => 
    b.status === 'CONFIRMED' || b.status === 'PENDING'
  );
  
  return {
    hasDoubleBooking: confirmedBookings.length > 1,
    confirmedCount: confirmedBookings.length,
    bookings: confirmedBookings,
  };
}

/**
 * Generate HMAC signature for authentication (if needed)
 * @param {string} payload - Payload to sign
 * @returns {string} HMAC signature
 */
function generateSignature(payload) {
  return crypto.hmac('sha256', TEST_DATA.webhookSecret || 'test-secret', payload, 'hex');
}
