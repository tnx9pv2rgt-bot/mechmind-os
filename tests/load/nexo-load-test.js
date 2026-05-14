/**
 * Nexo Gestionale — k6 Load Test Suite
 * Scenarios: bookings, auth, invoices, gdpr-export, customers
 * Thresholds: p95 <200ms, p99 <500ms, error rate <1%
 *
 * Usage:
 *   k6 run tests/load/nexo-load-test.js
 *   k6 run tests/load/nexo-load-test.js --env BASE_URL=http://localhost:3002 --env JWT_TOKEN=<token>
 *   k6 run tests/load/nexo-load-test.js --out json=k6-report.json
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Mark 401/429 as expected (not failures) — unauthenticated load test baseline
http.setResponseCallback(http.expectedStatuses(
  { min: 200, max: 299 },
  401, 402, 422, 429,
));

// ── Config ────────────────────────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3002';
const JWT_TOKEN = __ENV.JWT_TOKEN || '';
const TENANT_ID = __ENV.TENANT_ID || 'load-test-tenant';

// ── Custom Metrics ────────────────────────────────────────────────────────────
const errorRate = new Rate('errors');
const bookingDuration = new Trend('booking_duration', true);
const authDuration = new Trend('auth_duration', true);
const invoiceDuration = new Trend('invoice_duration', true);
const gdprDuration = new Trend('gdpr_export_duration', true);
const customerDuration = new Trend('customer_duration', true);
const totalRequests = new Counter('total_requests');

// ── Thresholds ────────────────────────────────────────────────────────────────
export const options = {
  scenarios: {
    // Scenario 1: GET /v1/bookings — advisory lock stress
    bookings_load: {
      executor: 'constant-arrival-rate',
      rate: 50,
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 20,
      maxVUs: 60,
      exec: 'bookingsScenario',
      tags: { scenario: 'bookings' },
    },

    // Scenario 2: POST /v1/auth/login — auth stress
    auth_load: {
      executor: 'constant-arrival-rate',
      rate: 20,
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 10,
      maxVUs: 30,
      exec: 'authScenario',
      tags: { scenario: 'auth' },
    },

    // Scenario 3: GET /v1/invoices — complex query
    invoices_load: {
      executor: 'constant-arrival-rate',
      rate: 30,
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 15,
      maxVUs: 45,
      exec: 'invoicesScenario',
      tags: { scenario: 'invoices' },
    },

    // Scenario 4: POST /v1/gdpr/export-full — heavy export (low rate)
    gdpr_export_load: {
      executor: 'constant-arrival-rate',
      rate: 5,
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 5,
      maxVUs: 15,
      exec: 'gdprExportScenario',
      tags: { scenario: 'gdpr_export' },
    },

    // Scenario 5: GET /v1/customers — paginated list
    customers_load: {
      executor: 'constant-arrival-rate',
      rate: 40,
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 15,
      maxVUs: 50,
      exec: 'customersScenario',
      tags: { scenario: 'customers' },
    },
  },

  thresholds: {
    // Global HTTP thresholds
    http_req_duration: ['p(95)<200', 'p(99)<500'],
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.01'],

    // Per-scenario thresholds
    booking_duration: ['p(95)<200', 'p(99)<500'],
    auth_duration: ['p(95)<300', 'p(99)<600'],
    invoice_duration: ['p(95)<250', 'p(99)<500'],
    gdpr_export_duration: ['p(95)<2000', 'p(99)<5000'],
    customer_duration: ['p(95)<200', 'p(99)<500'],
  },
};

// ── Shared Headers ────────────────────────────────────────────────────────────
function authHeaders() {
  return {
    'Content-Type': 'application/json',
    ...(JWT_TOKEN ? { Authorization: `Bearer ${JWT_TOKEN}` } : {}),
  };
}

// ── Scenario 1: Bookings ──────────────────────────────────────────────────────
export function bookingsScenario() {
  const res = http.get(`${BASE_URL}/v1/bookings?page=1&limit=20`, {
    headers: authHeaders(),
    tags: { endpoint: 'GET /v1/bookings' },
  });

  const ok = check(res, {
    'bookings: status 200 or 401': (r) => r.status === 200 || r.status === 401,
    'bookings: response time <500ms': (r) => r.timings.duration < 500,
  });

  bookingDuration.add(res.timings.duration);
  errorRate.add(res.status >= 500 ? 1 : 0);
  totalRequests.add(1);
  sleep(0.1);
}

// ── Scenario 2: Auth Login ────────────────────────────────────────────────────
export function authScenario() {
  const payload = JSON.stringify({
    email: `loadtest+${__VU}@nexo-test.internal`,
    password: 'LoadTest1234!',
  });

  const res = http.post(`${BASE_URL}/v1/auth/login`, payload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { endpoint: 'POST /v1/auth/login' },
  });

  const ok = check(res, {
    'auth: status 2xx or 400 or 401 or 429': (r) =>
      r.status < 500,
    'auth: response time <600ms': (r) => r.timings.duration < 600,
    'auth: no 500': (r) => r.status !== 500,
  });

  authDuration.add(res.timings.duration);
  errorRate.add(res.status === 500 ? 1 : 0);
  totalRequests.add(1);
  sleep(0.05);
}

// ── Scenario 3: Invoices ──────────────────────────────────────────────────────
export function invoicesScenario() {
  const res = http.get(
    `${BASE_URL}/v1/invoices?page=1&limit=20&status=DRAFT`,
    {
      headers: authHeaders(),
      tags: { endpoint: 'GET /v1/invoices' },
    },
  );

  const ok = check(res, {
    'invoices: status 200 or 401': (r) => r.status === 200 || r.status === 401,
    'invoices: response time <500ms': (r) => r.timings.duration < 500,
  });

  invoiceDuration.add(res.timings.duration);
  errorRate.add(res.status >= 500 ? 1 : 0);
  totalRequests.add(1);
  sleep(0.1);
}

// ── Scenario 4: GDPR Export ───────────────────────────────────────────────────
export function gdprExportScenario() {
  const res = http.get(`${BASE_URL}/v1/gdpr/export-full`, {
    headers: authHeaders(),
    tags: { endpoint: 'GET /v1/gdpr/export-full' },
    timeout: '10s',
  });

  const ok = check(res, {
    'gdpr: status 200 or 401 or 202': (r) =>
      r.status === 200 || r.status === 401 || r.status === 202,
    'gdpr: no 500': (r) => r.status !== 500,
  });

  gdprDuration.add(res.timings.duration);
  errorRate.add(res.status === 500 ? 1 : 0);
  totalRequests.add(1);
  sleep(0.5);
}

// ── Scenario 5: Customers (paginated) ────────────────────────────────────────
export function customersScenario() {
  const page = Math.floor(Math.random() * 5) + 1;
  const res = http.get(
    `${BASE_URL}/v1/customers?page=${page}&limit=20`,
    {
      headers: authHeaders(),
      tags: { endpoint: 'GET /v1/customers' },
    },
  );

  const ok = check(res, {
    'customers: status 200 or 401': (r) => r.status === 200 || r.status === 401,
    'customers: response time <500ms': (r) => r.timings.duration < 500,
  });

  customerDuration.add(res.timings.duration);
  errorRate.add(res.status >= 500 ? 1 : 0);
  totalRequests.add(1);
  sleep(0.05);
}

// ── Summary Handler ────────────────────────────────────────────────────────────
export function handleSummary(data) {
  const thresholdsPassed = Object.values(data.metrics).every(
    (m) => !m.thresholds || Object.values(m.thresholds).every((t) => !t.ok === false),
  );

  return {
    stdout: JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        total_requests: data.metrics.total_requests?.values?.count || 0,
        http_req_duration_p95: data.metrics.http_req_duration?.values?.['p(95)'],
        http_req_duration_p99: data.metrics.http_req_duration?.values?.['p(99)'],
        error_rate: data.metrics.errors?.values?.rate,
        per_scenario: {
          bookings_p95: data.metrics.booking_duration?.values?.['p(95)'],
          auth_p95: data.metrics.auth_duration?.values?.['p(95)'],
          invoices_p95: data.metrics.invoice_duration?.values?.['p(95)'],
          gdpr_export_p95: data.metrics.gdpr_export_duration?.values?.['p(95)'],
          customers_p95: data.metrics.customer_duration?.values?.['p(95)'],
        },
      },
      null,
      2,
    ),
  };
}
