// 00-master-100k.js — MASTER TEST: 100.000 clienti simultanei
//
// Matematica:
//   100.000 officine x 5% peak online = 5.000 utenti attivi
//   5.000 utenti x 1 req/2s = 2.500 req/sec totale
//   Distribuito su tutti gli scenari sotto = ~1.700 req/sec effettivi
//   (il resto e' think time e sleep)
//
// Metodo: constant-arrival-rate per ogni gruppo (Netflix/Google pattern)

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3002';
const errorRate = new Rate('global_errors');
const reqCounter = new Counter('total_requests');

export const options = {
  scenarios: {
    // ── CORE — Alta priorita (peak morning traffic) ──

    dashboard_peak: {
      executor: 'constant-arrival-rate',
      exec: 'dashboardScenario',
      rate: 500,
      timeUnit: '1s',
      duration: '10m',
      preAllocatedVUs: 100,
      maxVUs: 200,
      tags: { group: 'core' },
    },

    booking_flow: {
      executor: 'constant-arrival-rate',
      exec: 'bookingScenario',
      rate: 100,
      timeUnit: '1s',
      duration: '10m',
      preAllocatedVUs: 80,
      maxVUs: 120,
      tags: { group: 'core' },
    },

    work_order_flow: {
      executor: 'constant-arrival-rate',
      exec: 'workOrderScenario',
      rate: 150,
      timeUnit: '1s',
      duration: '10m',
      preAllocatedVUs: 80,
      maxVUs: 120,
      tags: { group: 'core' },
    },

    invoice_flow: {
      executor: 'constant-arrival-rate',
      exec: 'invoiceScenario',
      rate: 80,
      timeUnit: '1s',
      duration: '10m',
      preAllocatedVUs: 60,
      maxVUs: 80,
      tags: { group: 'core' },
    },

    // ── SECONDARY — Media priorita ──

    customer_management: {
      executor: 'constant-arrival-rate',
      exec: 'customerScenario',
      rate: 200,
      timeUnit: '1s',
      duration: '10m',
      preAllocatedVUs: 80,
      maxVUs: 100,
      tags: { group: 'secondary' },
    },

    inventory: {
      executor: 'constant-arrival-rate',
      exec: 'inventoryScenario',
      rate: 100,
      timeUnit: '1s',
      duration: '10m',
      preAllocatedVUs: 50,
      maxVUs: 70,
      tags: { group: 'secondary' },
    },

    portal_clienti: {
      executor: 'constant-arrival-rate',
      exec: 'portalScenario',
      rate: 150,
      timeUnit: '1s',
      duration: '10m',
      preAllocatedVUs: 60,
      maxVUs: 80,
      tags: { group: 'secondary' },
    },

    // ── BACKGROUND — Bassa priorita ──

    compliance_gdpr: {
      executor: 'constant-arrival-rate',
      exec: 'complianceScenario',
      rate: 20,
      timeUnit: '1s',
      duration: '10m',
      preAllocatedVUs: 20,
      maxVUs: 30,
      tags: { group: 'background' },
    },

    notifications: {
      executor: 'constant-arrival-rate',
      exec: 'notificationScenario',
      rate: 100,
      timeUnit: '1s',
      duration: '10m',
      preAllocatedVUs: 40,
      maxVUs: 60,
      tags: { group: 'background' },
    },

    admin_ops: {
      executor: 'constant-arrival-rate',
      exec: 'adminScenario',
      rate: 50,
      timeUnit: '1s',
      duration: '10m',
      preAllocatedVUs: 30,
      maxVUs: 40,
      tags: { group: 'background' },
    },
  },

  // ── SLO GLOBALI ──
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'],
    http_req_failed: ['rate<0.01'],
    'http_req_duration{group:core}': ['p(95)<150'],
    'http_req_duration{group:secondary}': ['p(95)<200'],
    'http_req_duration{group:background}': ['p(95)<300'],
    checks: ['rate>0.95'],
    global_errors: ['rate<0.01'],
  },
};

// TOTALE: ~1.450 req/sec = traffico reale da ~100.000 clienti in peak
// Con think time effettivo: ~2.500 iterazioni/sec

function getToken() {
  if (__ENV.TOKEN) return __ENV.TOKEN;
  const res = http.post(`${BASE_URL}/v1/auth/demo-session`, '{}', {
    headers: { 'Content-Type': 'application/json' },
  });
  if (res.status === 200) {
    try { return res.json().data.accessToken; } catch (_e) { return ''; }
  }
  return '';
}

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function doGet(token, url, name) {
  const res = http.get(`${BASE_URL}${url}`, {
    headers: headers(token),
    tags: { name },
  });
  const ok = check(res, { [`${name} ok`]: (r) => r.status >= 200 && r.status < 400 });
  errorRate.add(!ok);
  reqCounter.add(1);
  return res;
}

export function setup() {
  const token = getToken();
  console.log(`[MASTER] Token obtained: ${token ? 'YES' : 'NO'}`);
  console.log(`[MASTER] Starting 100K simulation — ~1.450 req/sec across 10 scenarios`);
  return { token };
}

// ── SCENARIO FUNCTIONS ──

export function dashboardScenario(data) {
  const ep = pickRandom([
    ['/v1/analytics/dashboard', 'dash-main'],
    ['/v1/analytics/dashboard-kpis', 'dash-kpis'],
    ['/v1/analytics/break-even', 'dash-breakeven'],
    ['/v1/analytics/revenue?year=2026', 'dash-revenue'],
    ['/v1/analytics/churn', 'dash-churn'],
    ['/v1/bookings?limit=10', 'dash-bookings'],
    ['/v1/work-orders?limit=10', 'dash-wo'],
    ['/v1/notifications?limit=10', 'dash-notif'],
    ['/v1/settings', 'dash-settings'],
  ]);
  doGet(data.token, ep[0], ep[1]);
  sleep(Math.random() * 0.3 + 0.1);
}

export function bookingScenario(data) {
  const ep = pickRandom([
    ['/v1/bookings?limit=20', 'book-list'],
    ['/v1/bookings/slots/available?date=2026-07-01', 'book-slots'],
    ['/v1/bookings/calendar?from=2026-07-01&to=2026-07-07', 'book-calendar'],
    ['/v1/bookings?limit=10&status=CONFIRMED', 'book-confirmed'],
  ]);
  doGet(data.token, ep[0], ep[1]);
  sleep(Math.random() * 0.3 + 0.2);
}

export function workOrderScenario(data) {
  const ep = pickRandom([
    ['/v1/work-orders?limit=20', 'wo-list'],
    ['/v1/work-orders?limit=10&status=IN_PROGRESS', 'wo-progress'],
    ['/v1/estimates?limit=20', 'wo-estimates'],
    ['/v1/canned-jobs?limit=20', 'wo-canned'],
  ]);
  doGet(data.token, ep[0], ep[1]);
  sleep(Math.random() * 0.3 + 0.1);
}

export function invoiceScenario(data) {
  const ep = pickRandom([
    ['/v1/invoices?limit=20', 'inv-list'],
    ['/v1/invoices/stats', 'inv-stats'],
    ['/v1/invoices?limit=10&status=PAID', 'inv-paid'],
    ['/v1/invoices?limit=10&status=PENDING', 'inv-pending'],
  ]);
  doGet(data.token, ep[0], ep[1]);
  sleep(Math.random() * 0.3 + 0.2);
}

export function customerScenario(data) {
  const ep = pickRandom([
    ['/v1/customers?limit=20', 'cust-list'],
    ['/v1/customers/search', 'cust-search'],
    ['/v1/vehicles?limit=20', 'cust-vehicles'],
    ['/v1/customers?limit=10&sort=createdAt', 'cust-recent'],
  ]);
  doGet(data.token, ep[0], ep[1]);
  sleep(Math.random() * 0.3 + 0.1);
}

export function inventoryScenario(data) {
  const ep = pickRandom([
    ['/v1/parts?limit=20', 'inv-parts'],
    ['/v1/parts/alerts/low-stock', 'inv-lowstock'],
    ['/v1/parts/suppliers/list', 'inv-suppliers'],
    ['/v1/parts/purchase-orders/list', 'inv-po'],
  ]);
  doGet(data.token, ep[0], ep[1]);
  sleep(Math.random() * 0.3 + 0.2);
}

export function portalScenario(data) {
  const ep = pickRandom([
    ['/v1/portal/bookings', 'portal-book'],
    ['/v1/portal/vehicles', 'portal-vehicles'],
    ['/v1/portal/documents', 'portal-docs'],
    ['/v1/portal/estimates', 'portal-est'],
    ['/v1/portal/messages', 'portal-msg'],
    ['/v1/portal/maintenance', 'portal-maint'],
    ['/v1/portal/account', 'portal-acct'],
    ['/v1/portal/tracking', 'portal-track'],
  ]);
  doGet(data.token, ep[0], ep[1]);
  sleep(Math.random() * 0.3 + 0.2);
}

export function complianceScenario(data) {
  const ep = pickRandom([
    ['/v1/gdpr/requests', 'compl-gdpr'],
    ['/v1/gdpr/requests/stats', 'compl-gdpr-stats'],
    ['/v1/ai-compliance/decisions', 'compl-ai'],
    ['/v1/ai-compliance/dashboard', 'compl-ai-dash'],
    ['/v1/rentri/operations', 'compl-rentri'],
    ['/v1/nis2/incidents', 'compl-nis2'],
  ]);
  doGet(data.token, ep[0], ep[1]);
  sleep(Math.random() * 0.5 + 0.3);
}

export function notificationScenario(data) {
  const ep = pickRandom([
    ['/v1/notifications?limit=20', 'notif-list'],
    ['/v1/api/notifications/v2/history', 'notif-history'],
    ['/v1/notifications/api/health', 'notif-health'],
    ['/v1/api/notifications/v2/preferences', 'notif-prefs'],
  ]);
  doGet(data.token, ep[0], ep[1]);
  sleep(Math.random() * 0.3 + 0.2);
}

export function adminScenario(data) {
  const ep = pickRandom([
    ['/v1/admin/tenants', 'admin-tenants'],
    ['/v1/admin/subscriptions', 'admin-subs'],
    ['/v1/subscription/current', 'admin-sub-curr'],
    ['/v1/subscription/usage', 'admin-sub-usage'],
    ['/v1/auth/security/activity', 'admin-sec-activity'],
    ['/v1/auth/security/summary', 'admin-sec-summary'],
    ['/v1/campaigns', 'admin-campaigns'],
  ]);
  doGet(data.token, ep[0], ep[1]);
  sleep(Math.random() * 0.5 + 0.3);
}

export function handleSummary(data) {
  const duration = data.metrics.http_req_duration;
  const failed = data.metrics.http_req_failed;
  const reqs = data.metrics.http_reqs;

  const summary = {
    test: 'MechMind OS — 100K Client Simulation',
    timestamp: new Date().toISOString(),
    total_requests: reqs ? reqs.values.count : 0,
    rps: reqs ? reqs.values.rate : 0,
    p95_ms: duration ? duration.values['p(95)'] : 0,
    p99_ms: duration ? duration.values['p(99)'] : 0,
    avg_ms: duration ? duration.values.avg : 0,
    min_ms: duration ? duration.values.min : 0,
    max_ms: duration ? duration.values.max : 0,
    error_rate: failed ? failed.values.rate : 0,
    checks_passed: data.metrics.checks ? data.metrics.checks.values.rate : 0,
  };

  return {
    '/tmp/k6_master_summary.json': JSON.stringify(summary, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data) {
  const d = data.metrics.http_req_duration;
  const f = data.metrics.http_req_failed;
  const r = data.metrics.http_reqs;
  return `
===============================================
  MECHMIND OS — 100K CLIENT LOAD TEST RESULTS
===============================================
  Total requests : ${r ? r.values.count : 'N/A'}
  Throughput     : ${r ? r.values.rate.toFixed(1) : 'N/A'} req/sec
  Avg latency    : ${d ? d.values.avg.toFixed(2) : 'N/A'} ms
  p95 latency    : ${d ? d.values['p(95)'].toFixed(2) : 'N/A'} ms
  p99 latency    : ${d ? d.values['p(99)'].toFixed(2) : 'N/A'} ms
  Max latency    : ${d ? d.values.max.toFixed(2) : 'N/A'} ms
  Error rate     : ${f ? (f.values.rate * 100).toFixed(3) : 'N/A'}%
===============================================
`;
}
