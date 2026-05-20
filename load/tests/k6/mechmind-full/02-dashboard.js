// 02-dashboard.js — Dashboard & Analytics load test
// Simula: apertura dashboard, KPI, report — pagina più visitata
// 100K clienti: ~2000 req/sec (peak morning traffic)

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { BASE_URL, getToken, authHeaders } from './helpers.js';

const errorRate = new Rate('dashboard_errors');
let token;

export const options = {
  scenarios: {
    dashboard_peak: {
      executor: 'constant-arrival-rate',
      rate: 500,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 100,
      maxVUs: 200,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<150', 'p(99)<300'],
    http_req_failed: ['rate<0.01'],
    dashboard_errors: ['rate<0.01'],
  },
};

export function setup() {
  return { token: getToken() };
}

export default function (data) {
  const headers = authHeaders(data.token);

  const endpoints = [
    { url: '/v1/analytics/dashboard', name: 'dashboard' },
    { url: '/v1/analytics/dashboard-kpis', name: 'dashboard-kpis' },
    { url: '/v1/analytics/break-even', name: 'break-even' },
    { url: '/v1/analytics/revenue?year=2026', name: 'revenue' },
    { url: '/v1/analytics/cac', name: 'cac' },
    { url: '/v1/analytics/churn', name: 'churn' },
    { url: '/v1/bookings?limit=10', name: 'bookings-today' },
    { url: '/v1/work-orders?limit=10', name: 'work-orders-open' },
    { url: '/v1/notifications?limit=10', name: 'notifications' },
    { url: '/v1/settings', name: 'settings' },
  ];

  const ep = endpoints[Math.floor(Math.random() * endpoints.length)];
  const res = http.get(`${BASE_URL}${ep.url}`, {
    headers,
    tags: { name: ep.name },
  });

  const ok = check(res, {
    'status 2xx': (r) => r.status >= 200 && r.status < 300,
  });
  errorRate.add(!ok);

  sleep(Math.random() * 0.5 + 0.2);
}
