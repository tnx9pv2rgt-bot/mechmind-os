// 01-auth.js — Authentication load test
// Simula: login demo-session, refresh token, get profile
// 100K clienti: ~200 login/min = ~3 req/sec (conservativo per auth)

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { BASE_URL, authHeaders } from './helpers.js';

const errorRate = new Rate('auth_errors');
const loginDuration = new Trend('login_duration');

export const options = {
  scenarios: {
    auth_load: {
      executor: 'constant-arrival-rate',
      rate: 10,
      timeUnit: '1s',
      duration: '3m',
      preAllocatedVUs: 20,
      maxVUs: 30,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    auth_errors: ['rate<0.01'],
  },
};

export default function () {
  // POST demo-session (simula login)
  const loginRes = http.post(
    `${BASE_URL}/v1/auth/demo-session`,
    '{}',
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'login' } },
  );

  loginDuration.add(loginRes.timings.duration);
  const loginOk = check(loginRes, {
    'login 200 or 429': (r) => r.status === 200 || r.status === 429,
    'has accessToken or throttled': (r) => {
      if (r.status === 429) return true; // rate limit is expected security behavior
      try { return r.json().data.accessToken !== undefined; } catch (_e) { return false; }
    },
  });
  errorRate.add(!loginOk);

  if (loginRes.status !== 200) {
    sleep(2); // backoff on throttle
    return;
  }

  const token = loginRes.json().data.accessToken;
  sleep(Math.random() * 0.5 + 0.3);

  // GET /v1/auth/me
  const meRes = http.get(`${BASE_URL}/v1/auth/me`, {
    headers: authHeaders(token),
    tags: { name: 'auth-me' },
  });
  check(meRes, { 'me 200': (r) => r.status === 200 });

  sleep(Math.random() * 0.5 + 0.3);

  // GET /v1/auth/sessions
  const sessRes = http.get(`${BASE_URL}/v1/auth/sessions`, {
    headers: authHeaders(token),
    tags: { name: 'auth-sessions' },
  });
  check(sessRes, { 'sessions 200': (r) => r.status === 200 });

  sleep(Math.random() * 1 + 0.5);
}
