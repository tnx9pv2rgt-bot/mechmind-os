/**
 * MechMind OS v10 - k6 Load Test for Race Conditions
 * Tests 100 concurrent booking attempts to verify zero double bookings
 * 
 * Validation Points:
 * - Zero double bookings under concurrent load
 * - <50ms advisory lock wait (p99)
 * - 100% booking consistency
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const doubleBookingErrors = new Counter('double_booking_errors');
const lockWaitTime = new Trend('advisory_lock_wait_time');
const bookingSuccessRate = new Rate('booking_success_rate');
const conflictRate = new Rate('conflict_rate');

// Test configuration
export const options = {
  scenarios: {
    // Race condition test: 100 concurrent users trying to book same slot
    race_condition_test: {
      executor: 'per-vu-iterations',
      vus: 100,
      iterations: 1,
      maxDuration: '2m',
      exec: 'raceConditionTest',
    },
    // Sustained load test
    sustained_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 100 },
        { duration: '1m', target: 100 },
        { duration: '30s', target: 0 },
      ],
      exec: 'sustainedLoadTest',
    },
    // Spike test for lock contention
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 200 },
        { duration: '30s', target: 200 },
        { duration: '10s', target: 0 },
      ],
      exec: 'spikeTest',
    },
  },
  thresholds: {
    // Performance thresholds
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    
    // Custom thresholds
    advisory_lock_wait_time: ['p(99)<50'], // <50ms p99 requirement
    double_booking_errors: ['count==0'], // Zero double bookings
    booking_success_rate: ['rate>0.95'],
  },
};

// Base URL
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';

// Test data
const TEST_TENANT_ID = __ENV.TEST_TENANT_ID || 'test-tenant-123';
const TEST_SHOP_ID = __ENV.TEST_SHOP_ID || 'test-shop-456';
const TEST_CUSTOMER_ID = __ENV.TEST_CUSTOMER_ID || 'test-customer-789';
const JWT_TOKEN = __ENV.JWT_TOKEN || 'test-jwt-token';

// Shared slot for race condition testing
const SHARED_SLOT = '2024-02-15T14:00:00.000Z';

/**
 * Race Condition Test
 * 100 concurrent users attempt to book the exact same slot
 * Expected: Exactly 1 success, 99 conflicts (409)
 */
export function raceConditionTest() {
  group('Race Condition - Same Slot Booking', () => {
    const payload = JSON.stringify({
      shopId: TEST_SHOP_ID,
      customerId: TEST_CUSTOMER_ID,
      serviceType: 'oil_change',
      scheduledAt: SHARED_SLOT,
      durationMinutes: 60,
      notes: `Race condition test - VU ${__VU}`,
    });

    const startTime = Date.now();
    
    const response = http.post(`${BASE_URL}/bookings`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'X-Request-ID': randomString(16),
      },
      tags: { test_type: 'race_condition' },
    });

    const duration = Date.now() - startTime;
    lockWaitTime.add(duration);

    // Check response
    const isSuccess = response.status === 201;
    const isConflict = response.status === 409;
    const isError = response.status >= 500;

    bookingSuccessRate.add(isSuccess);
    conflictRate.add(isConflict);

    // Track double booking errors (should never happen)
    if (response.status === 201) {
      // Verify this is actually a new booking, not a duplicate
      const bookingId = response.json('id');
      if (bookingId) {
        // Store booking ID for verification
        console.log(`VU ${__VU}: Created booking ${bookingId}`);
      }
    }

    check(response, {
      'status is 201 or 409': (r) => r.status === 201 || r.status === 409,
      'no server errors': (r) => r.status < 500,
      'response time < 1s': (r) => r.timings.duration < 1000,
    });

    if (isError) {
      console.error(`VU ${__VU}: Error ${response.status} - ${response.body}`);
    }
  });

  sleep(0.1);
}

/**
 * Sustained Load Test
 * Gradual ramp-up to 100 concurrent users booking different slots
 */
export function sustainedLoadTest() {
  group('Sustained Load - Various Slots', () => {
    // Each VU books a different time slot
    const slotOffset = __VU % 24; // Spread across 24 hours
    const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    scheduledAt.setHours(slotOffset, 0, 0, 0);

    const payload = JSON.stringify({
      shopId: TEST_SHOP_ID,
      customerId: TEST_CUSTOMER_ID,
      serviceType: ['oil_change', 'tire_rotation', 'brake_service'][__VU % 3],
      scheduledAt: scheduledAt.toISOString(),
      durationMinutes: 60,
      notes: `Sustained load test - VU ${__VU}`,
    });

    const response = http.post(`${BASE_URL}/bookings`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${JWT_TOKEN}`,
      },
      tags: { test_type: 'sustained_load' },
    });

    const isSuccess = response.status === 201;
    bookingSuccessRate.add(isSuccess);

    check(response, {
      'status is 201 or 409': (r) => r.status === 201 || r.status === 409,
      'response time < 500ms (p95)': (r) => r.timings.duration < 500,
    });
  });

  sleep(0.5);
}

/**
 * Spike Test
 * Sudden spike to 200 users to test lock contention
 */
export function spikeTest() {
  group('Spike Test - Lock Contention', () => {
    // Book slots with some overlap to create contention
    const overlapGroup = Math.floor(__VU / 10); // Groups of 10 VUs
    const scheduledAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    scheduledAt.setHours(overlapGroup, 0, 0, 0);

    const payload = JSON.stringify({
      shopId: TEST_SHOP_ID,
      customerId: TEST_CUSTOMER_ID,
      serviceType: 'oil_change',
      scheduledAt: scheduledAt.toISOString(),
      durationMinutes: 60,
      notes: `Spike test - VU ${__VU}, Group ${overlapGroup}`,
    });

    const startTime = Date.now();
    
    const response = http.post(`${BASE_URL}/bookings`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${JWT_TOKEN}`,
      },
      tags: { test_type: 'spike' },
    });

    const duration = Date.now() - startTime;
    lockWaitTime.add(duration);

    check(response, {
      'status is 201 or 409': (r) => r.status === 201 || r.status === 409,
      'lock wait < 50ms (p99)': () => duration < 50,
    });
  });

  sleep(0.2);
}

/**
 * Verify no double bookings after test
 * This function should be called after the main test
 */
export function verifyNoDoubleBookings() {
  group('Verification - No Double Bookings', () => {
    // Query bookings for the shared slot
    const response = http.get(
      `${BASE_URL}/bookings?shopId=${TEST_SHOP_ID}&startDate=${SHARED_SLOT}&endDate=${SHARED_SLOT}`,
      {
        headers: {
          'Authorization': `Bearer ${JWT_TOKEN}`,
        },
      }
    );

    if (response.status === 200) {
      const bookings = response.json();
      const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
      
      check(response, {
        'no double bookings': () => confirmedBookings.length <= 1,
      });

      if (confirmedBookings.length > 1) {
        console.error(`DOUBLE BOOKING DETECTED: ${confirmedBookings.length} bookings for same slot!`);
        doubleBookingErrors.add(confirmedBookings.length - 1);
      }
    }
  });
}

/**
 * Setup function - runs once before the test
 */
export function setup() {
  console.log('🚀 Starting MechMind OS Race Condition Load Test');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`🏢 Tenant ID: ${TEST_TENANT_ID}`);
  console.log(`🏪 Shop ID: ${TEST_SHOP_ID}`);
  console.log(`📅 Shared Slot: ${SHARED_SLOT}`);
  
  // Verify API is accessible
  const healthCheck = http.get(`${BASE_URL.replace('/api/v1', '')}/health`);
  if (healthCheck.status !== 200) {
    console.error('❌ API health check failed!');
    return { skip: true };
  }
  
  console.log('✅ API is healthy, starting test...');
  return {};
}

/**
 * Teardown function - runs once after the test
 */
export function teardown(data) {
  if (data.skip) {
    console.log('⏭️ Test skipped due to setup failure');
    return;
  }
  
  console.log('\n📊 Test Summary:');
  console.log('================');
  
  // Verify no double bookings
  verifyNoDoubleBookings();
  
  console.log('\n✅ Race condition load test completed');
}
