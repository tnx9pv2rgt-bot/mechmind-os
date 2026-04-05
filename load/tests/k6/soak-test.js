/**
 * Soak Test — MechMind OS
 * 100 VU for 30 minutes at constant load
 * Detects memory leaks, connection pool exhaustion, event loop drift
 * Netflix/Stripe endurance standard: p95 must NOT degrade over time
 *
 * Usage: k6 run -e TOKEN=<jwt> soak-test.js
 * Or:    k6 run -e TOKEN=<jwt> -e BASE_URL=https://staging.example.com soak-test.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';
import { authHeaders, BASE_URL } from './helpers.js';

const appErrorRate = new Rate('app_errors');
const requestCount = new Counter('total_requests');
const rateLimited = new Counter('rate_limited');
const healthLatency = new Trend('health_latency', true);
const customersLatency = new Trend('customers_latency', true);
const bookingsLatency = new Trend('bookings_latency', true);

export const options = {
  scenarios: {
    soak: {
      executor: 'constant-vus',
      vus: 100,
      duration: '30m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<200', 'avg<100'],
    app_errors: ['rate<0.001'],
    http_reqs: ['rate>50'],
  },
};

export function setup() {
  if (!__ENV.TOKEN) throw new Error('Pass -e TOKEN=<jwt>');
  return { token: __ENV.TOKEN };
}

function isAcceptable(status) {
  return (status >= 200 && status < 400) || status === 429;
}

export default function (data) {
  const hdrs = authHeaders(data.token);

  // 1. Health check (no auth)
  const healthRes = http.get(`${BASE_URL}/health`);
  healthLatency.add(healthRes.timings.duration);
  requestCount.add(1);
  if (healthRes.status === 429) {
    rateLimited.add(1);
  } else if (!check(healthRes, { 'health ok': (r) => r.status === 200 })) {
    appErrorRate.add(1);
  }

  sleep(Math.random() * 0.5 + 0.2);

  // 2. GET /v1/customers
  const custRes = http.get(`${BASE_URL}/v1/customers?limit=20`, hdrs);
  customersLatency.add(custRes.timings.duration);
  requestCount.add(1);
  if (custRes.status === 429) {
    rateLimited.add(1);
  } else if (!check(custRes, { 'customers ok': (r) => isAcceptable(r.status) })) {
    appErrorRate.add(1);
  }

  sleep(Math.random() * 0.5 + 0.2);

  // 3. GET /v1/bookings
  const bookRes = http.get(`${BASE_URL}/v1/bookings`, hdrs);
  bookingsLatency.add(bookRes.timings.duration);
  requestCount.add(1);
  if (bookRes.status === 429) {
    rateLimited.add(1);
  } else if (!check(bookRes, { 'bookings ok': (r) => isAcceptable(r.status) })) {
    appErrorRate.add(1);
  }

  // Think time — simulates real mechanic behavior (1-3s between actions)
  sleep(Math.random() * 2 + 1);
}
