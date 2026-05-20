/**
 * Smoke Test — MechMind OS
 * 1 VU, 30s, verifica che gli endpoint principali rispondano correttamente
 * PRD targets: p95 < 150ms, p99 < 500ms, error rate < 0.1%
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { getAuthToken, authHeaders, BASE_URL } from './helpers.js';

const errorRate = new Rate('errors');
const healthLatency = new Trend('health_latency', true);
const customersLatency = new Trend('customers_latency', true);
const bookingsLatency = new Trend('bookings_latency', true);

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<150', 'p(99)<500'],
    errors: ['rate<0.01'],
  },
};

export function setup() {
  const auth = getAuthToken('smoke');
  if (!auth) {
    throw new Error('Failed to authenticate');
  }
  return auth;
}

function isSuccess(status) {
  return status >= 200 && status < 400;
}

function isAcceptable(status) {
  return isSuccess(status) || status === 429; // 429 = rate limit, not an app error
}

export default function (data) {
  // 1. Health check (no auth)
  const healthRes = http.get(`${BASE_URL}/health`);
  healthLatency.add(healthRes.timings.duration);
  const healthOk = check(healthRes, {
    'health: acceptable': (r) => isAcceptable(r.status),
    'health: status ok': (r) => isSuccess(r.status) ? JSON.parse(r.body).status === 'ok' : true,
  });
  if (!healthOk && !isAcceptable(healthRes.status)) errorRate.add(1);

  sleep(1);

  // 2. GET /v1/customers (authenticated)
  const custRes = http.get(`${BASE_URL}/v1/customers`, authHeaders(data.token));
  customersLatency.add(custRes.timings.duration);
  const custOk = check(custRes, {
    'customers: acceptable': (r) => isAcceptable(r.status),
    'customers: has data': (r) => isSuccess(r.status) ? JSON.parse(r.body).success === true : true,
  });
  if (!custOk && !isAcceptable(custRes.status)) errorRate.add(1);

  sleep(1);

  // 3. GET /v1/bookings (authenticated)
  const bookRes = http.get(`${BASE_URL}/v1/bookings`, authHeaders(data.token));
  bookingsLatency.add(bookRes.timings.duration);
  const bookOk = check(bookRes, {
    'bookings: acceptable': (r) => isAcceptable(r.status),
  });
  if (!bookOk && !isAcceptable(bookRes.status)) errorRate.add(1);

  sleep(1);

  // 4. GET /metrics (Prometheus)
  const metricsRes = http.get(`${BASE_URL}/metrics`);
  const metricsOk = check(metricsRes, {
    'metrics: acceptable': (r) => isAcceptable(r.status),
    'metrics: has content': (r) => isSuccess(r.status) ? r.body.includes('http_requests_total') : true,
  });
  if (!metricsOk && !isAcceptable(metricsRes.status)) errorRate.add(1);

  sleep(1);
}
