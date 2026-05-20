/**
 * Booking Load Test — k6 (Livello 5)
 *
 * Scenario: 50 utenti concurrent × 30s
 * Threshold: p95 < 200ms, error rate < 1%
 *
 * Uso:
 *   export K6_BASE_URL=http://localhost:3002
 *   export K6_JWT_TOKEN=eyJ...
 *   k6 run backend/tests/load/booking.k6.js
 *
 * CI nightly:
 *   k6 run --env BASE_URL=$K6_BASE_URL --env JWT_TOKEN=$K6_JWT_TOKEN booking.k6.js
 */
// @ts-nocheck

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ── Custom metrics ─────────────────────────────────────────────────────────
const errorRate = new Rate('booking_errors');
const listLatency = new Trend('booking_list_latency');
const statsLatency = new Trend('booking_stats_latency');
const slotsLatency = new Trend('booking_slots_latency');

// ── Options ────────────────────────────────────────────────────────────────
export const options = {
  stages: [
    { duration: '10s', target: 25 },  // ramp up to 25
    { duration: '10s', target: 50 },  // ramp up to 50
    { duration: '30s', target: 50 },  // steady 50 users
    { duration: '10s', target: 0 },   // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'],          // 95th percentile < 200ms
    http_req_failed: ['rate<0.01'],            // global error rate < 1%
    booking_errors: ['rate<0.01'],             // booking-specific error rate < 1%
    booking_list_latency: ['p(95)<200'],       // GET /v1/bookings p95 < 200ms
    booking_stats_latency: ['p(95)<200'],      // GET /v1/bookings/stats p95 < 200ms
    booking_slots_latency: ['p(95)<200'],      // GET /v1/bookings/slots/available p95 < 200ms
  },
};

// ── Config ─────────────────────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3002';
const JWT_TOKEN = __ENV.JWT_TOKEN || '';

const HEADERS = {
  Authorization: `Bearer ${JWT_TOKEN}`,
  'Content-Type': 'application/json',
};

// ── Scenario 1: GET /v1/bookings (read-heavy, most common) ────────────────
function testListBookings() {
  const start = Date.now();
  const res = http.get(`${BASE_URL}/v1/bookings?limit=20`, { headers: HEADERS });
  listLatency.add(Date.now() - start);

  const ok = check(res, {
    'GET /v1/bookings: 200': r => r.status === 200,
    'GET /v1/bookings: has body': r => r.body !== null && r.body.length > 0,
    'GET /v1/bookings: latency < 200ms': r => r.timings.duration < 200,
  });
  errorRate.add(!ok);
}

// ── Scenario 2: GET /v1/bookings/stats/overview ────────────────────────────
function testBookingStats() {
  const start = Date.now();
  const res = http.get(`${BASE_URL}/v1/bookings/stats/overview`, { headers: HEADERS });
  statsLatency.add(Date.now() - start);

  const ok = check(res, {
    'GET /v1/bookings/stats/overview: 200': r => r.status === 200,
    'GET /v1/bookings/stats/overview: latency < 200ms': r => r.timings.duration < 200,
  });
  errorRate.add(!ok);
}

// ── Scenario 3: GET /v1/bookings/slots/available ───────────────────────────
function testAvailableSlots() {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const start = Date.now();
  const res = http.get(`${BASE_URL}/v1/bookings/slots/available?date=${tomorrow}`, {
    headers: HEADERS,
  });
  slotsLatency.add(Date.now() - start);

  const ok = check(res, {
    'GET /v1/bookings/slots/available: 200': r => r.status === 200,
    'GET /v1/bookings/slots/available: latency < 200ms': r => r.timings.duration < 200,
  });
  errorRate.add(!ok);
}

// ── Scenario 4: GET /v1/bookings/calendar (date range) ────────────────────
function testCalendarBookings() {
  const from = new Date(Date.now()).toISOString();
  const to = new Date(Date.now() + 7 * 86400000).toISOString();
  const res = http.get(
    `${BASE_URL}/v1/bookings/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    { headers: HEADERS },
  );

  const ok = check(res, {
    'GET /v1/bookings/calendar: 200': r => r.status === 200,
    'GET /v1/bookings/calendar: latency < 300ms': r => r.timings.duration < 300,
  });
  errorRate.add(!ok);
}

// ── Default function (virtual user loop) ──────────────────────────────────
export default function () {
  // Weight: 50% list, 20% stats, 20% slots, 10% calendar
  const roll = Math.random();

  if (roll < 0.50) {
    testListBookings();
  } else if (roll < 0.70) {
    testBookingStats();
  } else if (roll < 0.90) {
    testAvailableSlots();
  } else {
    testCalendarBookings();
  }

  sleep(0.5); // think time between requests
}

// ── Setup: verify app is reachable ────────────────────────────────────────
export function setup() {
  const res = http.get(`${BASE_URL}/health`);
  if (res.status !== 200) {
    throw new Error(`App non raggiungibile: ${BASE_URL}/health → HTTP ${res.status}`);
  }
  console.log(`✅ App raggiungibile: ${BASE_URL}`);
}
