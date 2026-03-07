/**
 * MechMind OS v10 - k6 Load Test for Concurrent Users
 * General load testing for all API endpoints
 * 
 * Validation Points:
 * - System stability under 100+ concurrent users
 * - Response time degradation analysis
 * - Error rate monitoring
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomString, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const apiResponseTime = new Trend('api_response_time');
const errorRate = new Rate('error_rate');
const requestCount = new Counter('request_count');
const throughput = new Rate('throughput');

// Test configuration
export const options = {
  scenarios: {
    // Smoke test - light load to verify functionality
    smoke: {
      executor: 'constant-vus',
      vus: 5,
      duration: '1m',
      exec: 'mixedApiTest',
      tags: { test_type: 'smoke' },
    },
    // Load test - expected normal load
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '5m', target: 50 },
        { duration: '2m', target: 0 },
      ],
      exec: 'mixedApiTest',
      tags: { test_type: 'load' },
    },
    // Stress test - beyond expected capacity
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '5m', target: 200 },
        { duration: '2m', target: 0 },
      ],
      exec: 'mixedApiTest',
      tags: { test_type: 'stress' },
    },
    // Soak test - sustained load for memory leak detection
    soak: {
      executor: 'constant-vus',
      vus: 30,
      duration: '30m',
      exec: 'mixedApiTest',
      tags: { test_type: 'soak' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    api_response_time: ['p(95)<500'],
    error_rate: ['rate<0.01'],
  },
};

// Base URL
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';
const JWT_TOKEN = __ENV.JWT_TOKEN || 'test-jwt-token';
const TEST_TENANT_ID = __ENV.TEST_TENANT_ID || 'test-tenant-123';
const TEST_SHOP_ID = __ENV.TEST_SHOP_ID || 'test-shop-456';

// Test data generators
function generateBookingPayload() {
  const futureDate = new Date(Date.now() + randomIntBetween(1, 30) * 24 * 60 * 60 * 1000);
  futureDate.setHours(randomIntBetween(8, 17), 0, 0, 0);
  
  return JSON.stringify({
    shopId: TEST_SHOP_ID,
    serviceType: ['oil_change', 'tire_rotation', 'brake_service', 'inspection'][randomIntBetween(0, 3)],
    scheduledAt: futureDate.toISOString(),
    durationMinutes: [30, 60, 90, 120][randomIntBetween(0, 3)],
    notes: `Load test booking - ${randomString(8)}`,
  });
}

function generateCustomerPayload() {
  return JSON.stringify({
    firstName: `Test${randomString(5)}`,
    lastName: `User${randomString(5)}`,
    phone: `+1${randomIntBetween(2000000000, 9999999999)}`,
    email: `test${randomString(5)}@example.com`,
    gdprConsent: true,
  });
}

/**
 * Mixed API Test
 * Simulates realistic user behavior across multiple endpoints
 */
export function mixedApiTest() {
  const startTime = Date.now();
  
  // Weighted random action selection
  const action = randomIntBetween(1, 100);
  
  if (action <= 40) {
    // 40% - Get bookings (read operation)
    getBookings();
  } else if (action <= 70) {
    // 30% - Create booking (write operation)
    createBooking();
  } else if (action <= 85) {
    // 15% - Get available slots
    getAvailableSlots();
  } else if (action <= 95) {
    // 10% - Get customer info
    getCustomerInfo();
  } else {
    // 5% - Cancel booking
    cancelBooking();
  }
  
  const duration = Date.now() - startTime;
  apiResponseTime.add(duration);
  requestCount.add(1);
  
  // Random think time between requests
  sleep(randomIntBetween(1, 5));
}

/**
 * Get bookings list
 */
function getBookings() {
  group('GET /bookings', () => {
    const startDate = new Date(Date.now()).toISOString();
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const response = http.get(
      `${BASE_URL}/bookings?shopId=${TEST_SHOP_ID}&startDate=${startDate}&endDate=${endDate}`,
      {
        headers: {
          'Authorization': `Bearer ${JWT_TOKEN}`,
        },
        tags: { endpoint: 'list_bookings' },
      }
    );

    const isError = response.status >= 400;
    errorRate.add(isError);

    check(response, {
      'bookings retrieved': (r) => r.status === 200,
      'response is array': (r) => Array.isArray(r.json()),
    });
  });
}

/**
 * Create new booking
 */
function createBooking() {
  group('POST /bookings', () => {
    const payload = generateBookingPayload();
    
    const response = http.post(`${BASE_URL}/bookings`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${JWT_TOKEN}`,
      },
      tags: { endpoint: 'create_booking' },
    });

    const isError = response.status >= 500;
    errorRate.add(isError);

    check(response, {
      'booking created or conflict': (r) => r.status === 201 || r.status === 409,
      'has booking ID on success': (r) => r.status !== 201 || r.json('id') !== undefined,
    });
  });
}

/**
 * Get available time slots
 */
function getAvailableSlots() {
  group('GET /bookings/available-slots', () => {
    const date = new Date(Date.now() + randomIntBetween(1, 14) * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    
    const response = http.get(
      `${BASE_URL}/bookings/available-slots?shopId=${TEST_SHOP_ID}&date=${date}&duration=60`,
      {
        headers: {
          'Authorization': `Bearer ${JWT_TOKEN}`,
        },
        tags: { endpoint: 'available_slots' },
      }
    );

    const isError = response.status >= 400;
    errorRate.add(isError);

    check(response, {
      'slots retrieved': (r) => r.status === 200,
    });
  });
}

/**
 * Get customer information
 */
function getCustomerInfo() {
  group('GET /customers', () => {
    const response = http.get(`${BASE_URL}/customers?shopId=${TEST_SHOP_ID}&limit=10`, {
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
      },
      tags: { endpoint: 'list_customers' },
    });

    const isError = response.status >= 400;
    errorRate.add(isError);

    check(response, {
      'customers retrieved': (r) => r.status === 200,
    });
  });
}

/**
 * Cancel a booking
 */
function cancelBooking() {
  group('DELETE /bookings/:id', () => {
    // First, get a list of bookings
    const listResponse = http.get(
      `${BASE_URL}/bookings?shopId=${TEST_SHOP_ID}&status=confirmed&limit=5`,
      {
        headers: {
          'Authorization': `Bearer ${JWT_TOKEN}`,
        },
      }
    );

    if (listResponse.status === 200) {
      const bookings = listResponse.json();
      if (bookings && bookings.length > 0) {
        const bookingToCancel = bookings[randomIntBetween(0, bookings.length - 1)];
        
        const response = http.del(
          `${BASE_URL}/bookings/${bookingToCancel.id}`,
          JSON.stringify({ reason: 'Load test cancellation' }),
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${JWT_TOKEN}`,
            },
            tags: { endpoint: 'cancel_booking' },
          }
        );

        const isError = response.status >= 500;
        errorRate.add(isError);

        check(response, {
          'booking cancelled or not found': (r) => r.status === 200 || r.status === 404,
        });
      }
    }
  });
}

/**
 * Health check endpoint
 */
export function healthCheck() {
  group('Health Check', () => {
    const response = http.get(`${BASE_URL.replace('/api/v1', '')}/health`, {
      tags: { endpoint: 'health' },
    });

    check(response, {
      'service healthy': (r) => r.status === 200,
      'database connected': (r) => r.json('database') === 'connected',
    });
  });
}

/**
 * Setup function
 */
export function setup() {
  console.log('👥 Starting MechMind OS Concurrent Users Load Test');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`🏢 Tenant ID: ${TEST_TENANT_ID}`);
  
  // Verify API is accessible
  const healthCheck = http.get(`${BASE_URL.replace('/api/v1', '')}/health`);
  if (healthCheck.status !== 200) {
    console.error('❌ API health check failed!');
    return { skip: true };
  }
  
  console.log('✅ API is healthy, starting concurrent users test...');
  return {};
}

/**
 * Teardown function
 */
export function teardown(data) {
  if (data.skip) {
    console.log('⏭️ Test skipped due to setup failure');
    return;
  }
  
  console.log('\n📊 Concurrent Users Test Summary:');
  console.log('=================================');
  console.log('✅ Concurrent users load test completed');
}
