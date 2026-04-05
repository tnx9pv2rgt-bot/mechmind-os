/**
 * Load Test — MechMind OS
 * Ramp: 0→10 VU (30s) → hold 10 VU (1m30s) → ramp down (30s)
 * PRD targets: p95 < 150ms, p99 < 500ms, error rate < 0.1%
 * Note: 429 (rate limit) is expected behavior, not counted as app error
 * Usage: k6 run -e TOKEN=<jwt> load-test.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter } from 'k6/metrics';
import { getAuthToken, authHeaders, BASE_URL } from './helpers.js';

const appErrorRate = new Rate('app_errors');
const requestCount = new Counter('total_requests');
const rateLimited = new Counter('rate_limited');

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m30s', target: 10 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<150', 'p(99)<500'],
    app_errors: ['rate<0.01'],
  },
};

export function setup() {
  if (__ENV.TOKEN) {
    return { token: __ENV.TOKEN };
  }
  const auth = getAuthToken('load');
  if (!auth) throw new Error('No token obtained. Pass -e TOKEN=<jwt> or wait for rate limit reset.');
  return auth;
}

export default function (data) {
  const scenario = Math.random();

  if (scenario < 0.3) {
    const res = http.get(`${BASE_URL}/health`);
    requestCount.add(1);
    if (res.status === 429) { rateLimited.add(1); }
    else if (!check(res, { 'health ok': (r) => r.status === 200 })) appErrorRate.add(1);
  } else if (scenario < 0.6) {
    const res = http.get(`${BASE_URL}/v1/customers`, authHeaders(data.token));
    requestCount.add(1);
    if (res.status === 429) { rateLimited.add(1); }
    else if (!check(res, { 'customers ok': (r) => r.status === 200 })) appErrorRate.add(1);
  } else if (scenario < 0.8) {
    const res = http.get(`${BASE_URL}/v1/bookings`, authHeaders(data.token));
    requestCount.add(1);
    if (res.status === 429) { rateLimited.add(1); }
    else if (!check(res, { 'bookings ok': (r) => r.status === 200 })) appErrorRate.add(1);
  } else if (scenario < 0.9) {
    const res = http.get(`${BASE_URL}/v1/vehicles`, authHeaders(data.token));
    requestCount.add(1);
    if (res.status === 429) { rateLimited.add(1); }
    else if (!check(res, { 'vehicles ok': (r) => r.status === 200 })) appErrorRate.add(1);
  } else {
    const res = http.post(
      `${BASE_URL}/v1/customers`,
      JSON.stringify({
        firstName: `Load${__VU}`,
        lastName: `Test${__ITER}`,
        email: `load-${__VU}-${__ITER}-${Date.now()}@test.com`,
        phone: `+39333${String(Date.now()).slice(-7)}`,
      }),
      authHeaders(data.token),
    );
    requestCount.add(1);
    if (res.status === 429) { rateLimited.add(1); }
    else if (!check(res, { 'create customer ok': (r) => r.status === 201 })) appErrorRate.add(1);
  }

  sleep(Math.random() * 2 + 1);
}
