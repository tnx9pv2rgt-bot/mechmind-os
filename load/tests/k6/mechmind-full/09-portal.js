// 09-portal.js — Customer Portal load test
// Simula: portale clienti — prenotazioni, veicoli, documenti, messaggi
// 100K clienti: ~150 req/sec (clienti finali, non meccanici)

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { BASE_URL, getToken, authHeaders } from './helpers.js';

const errorRate = new Rate('portal_errors');

export const options = {
  scenarios: {
    portal_clienti: {
      executor: 'constant-arrival-rate',
      rate: 150,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 60,
      maxVUs: 80,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<400'],
    http_req_failed: ['rate<0.01'],
    portal_errors: ['rate<0.01'],
  },
};

export function setup() {
  return { token: getToken() };
}

export default function (data) {
  const headers = authHeaders(data.token);

  const endpoints = [
    { url: '/v1/portal/bookings', name: 'portal-bookings' },
    { url: '/v1/portal/vehicles', name: 'portal-vehicles' },
    { url: '/v1/portal/documents', name: 'portal-documents' },
    { url: '/v1/portal/estimates', name: 'portal-estimates' },
    { url: '/v1/portal/messages', name: 'portal-messages' },
    { url: '/v1/portal/maintenance', name: 'portal-maintenance' },
    { url: '/v1/portal/inspections', name: 'portal-inspections' },
    { url: '/v1/portal/account', name: 'portal-account' },
    { url: '/v1/portal/tracking', name: 'portal-tracking' },
    { url: '/v1/portal/notification-preferences', name: 'portal-notif-prefs' },
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
