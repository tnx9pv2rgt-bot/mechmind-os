/**
 * k6 Load Test — Nexo Gestionale Baseline (2026-05-13)
 * Simula 50 officine simultanee su 5 endpoint critici.
 *
 * Prerequisiti:
 *   brew install k6  (o scarica da https://k6.io/docs/get-started/installation/)
 *
 * Esecuzione:
 *   k6 run docs/perf/k6-baseline.js --env BASE_URL=http://localhost:3002
 *
 * Salva risultati JSON:
 *   k6 run docs/perf/k6-baseline.js --out json=docs/perf/results-2026-05-13.json
 *
 * Soglie enterprise (p95):
 *   - POST /auth/login       < 300ms
 *   - GET  /v1/analytics     < 500ms
 *   - GET  /v1/bookings      < 400ms
 *   - GET  /v1/invoices      < 400ms
 *   - GET  /v1/vehicles      < 300ms
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ─── Metriche custom ──────────────────────────────────────────────────────────
const errorRate = new Rate('error_rate');
const loginLatency = new Trend('login_latency');
const dashboardLatency = new Trend('dashboard_latency');
const bookingsLatency = new Trend('bookings_latency');
const invoicesLatency = new Trend('invoices_latency');
const vehiclesLatency = new Trend('vehicles_latency');

// ─── Configurazione scenari ───────────────────────────────────────────────────
export const options = {
  scenarios: {
    officine_simultanee: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 }, // ramp-up a 50 officine
        { duration: '5m', target: 50 }, // steady state
        { duration: '1m', target: 0 }, // ramp-down
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],
    login_latency: ['p(95)<300'],
    dashboard_latency: ['p(95)<500'],
    bookings_latency: ['p(95)<400'],
    invoices_latency: ['p(95)<400'],
    vehicles_latency: ['p(95)<300'],
    error_rate: ['rate<0.01'],
    http_req_failed: ['rate<0.01'],
  },
};

// ─── Setup: ottieni token JWT per ogni VU ────────────────────────────────────
export function setup() {
  const BASE_URL = __ENV.BASE_URL || 'http://localhost:3002';

  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({
      email: __ENV.TEST_USER_EMAIL || 'test@mechmind.io',
      password: __ENV.TEST_USER_PASSWORD || 'Test@123456',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  const token =
    loginRes.status === 200 || loginRes.status === 201
      ? JSON.parse(loginRes.body).accessToken || null
      : null;

  return { token, BASE_URL };
}

// ─── Scenario principale ──────────────────────────────────────────────────────
export default function (data) {
  const { token, BASE_URL } = data;

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  // 1. Login (1 VU su 5 simula nuova sessione)
  if (Math.random() < 0.2) {
    const start = Date.now();
    const res = http.post(
      `${BASE_URL}/auth/login`,
      JSON.stringify({
        email: __ENV.TEST_USER_EMAIL || 'test@mechmind.io',
        password: __ENV.TEST_USER_PASSWORD || 'Test@123456',
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    loginLatency.add(Date.now() - start);
    errorRate.add(res.status >= 400);
    check(res, { 'login: 200/201': r => r.status === 200 || r.status === 201 });
  }

  sleep(0.5);

  // 2. Dashboard / Analytics
  {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/v1/analytics/dashboard`, { headers });
    dashboardLatency.add(Date.now() - start);
    errorRate.add(res.status >= 400);
    check(res, {
      'dashboard: 200': r => r.status === 200,
      'dashboard: body presente': r => r.body && r.body.length > 0,
    });
  }

  sleep(0.3);

  // 3. Lista prenotazioni
  {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/v1/bookings?limit=20&page=1`, { headers });
    bookingsLatency.add(Date.now() - start);
    errorRate.add(res.status >= 400);
    check(res, { 'bookings: 200': r => r.status === 200 });
  }

  sleep(0.3);

  // 4. Lista fatture
  {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/v1/invoices?limit=20&page=1`, { headers });
    invoicesLatency.add(Date.now() - start);
    errorRate.add(res.status >= 400);
    check(res, { 'invoices: 200': r => r.status === 200 });
  }

  sleep(0.3);

  // 5. Lista veicoli
  {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/v1/vehicles?limit=20&page=1`, { headers });
    vehiclesLatency.add(Date.now() - start);
    errorRate.add(res.status >= 400);
    check(res, { 'vehicles: 200': r => r.status === 200 });
  }

  sleep(1);
}
