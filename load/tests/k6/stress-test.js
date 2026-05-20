/**
 * Stress Test — MechMind OS
 * Ramp: 0→20 VU (1m) → hold 20 VU (2m) → spike 50 VU (30s) → ramp down (30s)
 * Trova il punto di rottura del sistema
 * Usage: k6 run -e TOKEN=<jwt> stress-test.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter } from 'k6/metrics';
import { authHeaders, BASE_URL } from './helpers.js';

const appErrorRate = new Rate('app_errors');
const requestCount = new Counter('total_requests');
const rateLimited = new Counter('rate_limited');

export const options = {
  stages: [
    { duration: '1m', target: 20 },
    { duration: '2m', target: 20 },
    { duration: '30s', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<300', 'p(99)<1000'],
    app_errors: ['rate<0.05'],
  },
};

export function setup() {
  if (!__ENV.TOKEN) throw new Error('Pass -e TOKEN=<jwt>');
  return { token: __ENV.TOKEN };
}

export default function (data) {
  const scenario = Math.random();
  let res;

  if (scenario < 0.4) {
    res = http.get(`${BASE_URL}/health`);
  } else if (scenario < 0.7) {
    const endpoints = ['/v1/customers', '/v1/bookings', '/v1/vehicles'];
    const ep = endpoints[Math.floor(Math.random() * endpoints.length)];
    res = http.get(`${BASE_URL}${ep}`, authHeaders(data.token));
  } else {
    res = http.post(
      `${BASE_URL}/v1/customers`,
      JSON.stringify({
        firstName: `Stress${__VU}`,
        lastName: `T${__ITER}`,
        email: `s-${__VU}-${__ITER}-${Date.now()}@test.com`,
        phone: `+39333${String(Date.now()).slice(-7)}`,
      }),
      authHeaders(data.token),
    );
  }

  requestCount.add(1);
  if (res.status === 429) {
    rateLimited.add(1);
  } else if (res.status >= 500) {
    appErrorRate.add(1);
    check(res, { 'no 5xx': (r) => r.status < 500 });
  } else {
    check(res, { 'response ok': (r) => r.status >= 200 && r.status < 400 });
  }

  sleep(Math.random() * 1.5 + 0.5);
}
