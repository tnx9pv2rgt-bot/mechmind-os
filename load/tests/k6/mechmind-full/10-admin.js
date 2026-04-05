// 10-admin.js — Admin panel, notifications, campaigns, payments
// Simula: pannello admin, gestione tenant, notifiche, campagne
// 100K clienti: ~100 req/sec (admin + background)

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { BASE_URL, getToken, authHeaders } from './helpers.js';

const errorRate = new Rate('admin_errors');

export const options = {
  scenarios: {
    admin_background: {
      executor: 'constant-arrival-rate',
      rate: 100,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 40,
      maxVUs: 60,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'],
    http_req_failed: ['rate<0.01'],
    admin_errors: ['rate<0.01'],
  },
};

export function setup() {
  return { token: getToken() };
}

export default function (data) {
  const headers = authHeaders(data.token);

  const endpoints = [
    { url: '/v1/admin/tenants', name: 'admin-tenants' },
    { url: '/v1/admin/subscriptions', name: 'admin-subs' },
    { url: '/v1/campaigns', name: 'campaigns' },
    { url: '/v1/subscription/current', name: 'subscription' },
    { url: '/v1/subscription/usage', name: 'sub-usage' },
    { url: '/v1/subscription/limits', name: 'sub-limits' },
    { url: '/v1/api/notifications/v2/history', name: 'notif-history' },
    { url: '/v1/notifications/api/health', name: 'notif-health' },
    { url: '/v1/auth/security/activity', name: 'security-activity' },
    { url: '/v1/auth/security/summary', name: 'security-summary' },
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

  sleep(Math.random() * 0.5 + 0.3);
}
