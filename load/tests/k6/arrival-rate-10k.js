/**
 * 10K Client Simulation — MechMind OS
 * Uses constant-arrival-rate to simulate 10,000 concurrent offices
 * with only 150 VU (RAM-safe: ~300-750MB)
 *
 * Math: 10,000 offices × 3 mechanics each × ~5 req/min = ~833 req/sec peak
 * We test at 500 req/sec sustained = ~6,000 offices equivalent
 *
 * Usage: k6 run -e TOKEN=<jwt> arrival-rate-10k.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter } from 'k6/metrics';
import { authHeaders, BASE_URL } from './helpers.js';

const appErrorRate = new Rate('app_errors');
const requestCount = new Counter('total_requests');
const rateLimited = new Counter('rate_limited');
const droppedIterations = new Counter('custom_dropped');

export const options = {
  scenarios: {
    ten_thousand_clients: {
      executor: 'constant-arrival-rate',
      rate: 500,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 150,
      maxVUs: 200,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<150', 'p(99)<500'],
    app_errors: ['rate<0.001'],
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
  const scenario = Math.random();
  let res;

  if (scenario < 0.3) {
    // Health check — no auth, lightest endpoint
    res = http.get(`${BASE_URL}/health`);
  } else if (scenario < 0.6) {
    // GET customers — standard authenticated read
    res = http.get(`${BASE_URL}/v1/customers?limit=20`, hdrs);
  } else if (scenario < 0.8) {
    // GET bookings — standard authenticated read
    res = http.get(`${BASE_URL}/v1/bookings`, hdrs);
  } else if (scenario < 0.9) {
    // GET vehicles — standard authenticated read
    res = http.get(`${BASE_URL}/v1/vehicles`, hdrs);
  } else {
    // POST customer — write operation
    res = http.post(
      `${BASE_URL}/v1/customers`,
      JSON.stringify({
        email: `arr-${__VU}-${__ITER}-${Date.now()}@test.com`,
        phone: `+39333${String(Date.now()).slice(-7)}`,
      }),
      hdrs,
    );
  }

  requestCount.add(1);

  if (res.status === 429) {
    rateLimited.add(1);
  } else if (res.status >= 500) {
    appErrorRate.add(1);
    check(res, { 'no 5xx': (r) => r.status < 500 });
  } else {
    check(res, { 'response ok': (r) => isAcceptable(r.status) });
  }
}
