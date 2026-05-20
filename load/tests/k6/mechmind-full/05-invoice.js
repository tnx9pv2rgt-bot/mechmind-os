// 05-invoice.js — Invoicing load test
// Simula: lista fatture, statistiche, dettaglio, export
// 100K clienti: ~80 req/sec

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { BASE_URL, getToken, authHeaders } from './helpers.js';

const errorRate = new Rate('invoice_errors');

export const options = {
  scenarios: {
    invoice_flow: {
      executor: 'constant-arrival-rate',
      rate: 80,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 60,
      maxVUs: 80,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'],
    http_req_failed: ['rate<0.01'],
    invoice_errors: ['rate<0.01'],
  },
};

export function setup() {
  return { token: getToken() };
}

export default function (data) {
  const headers = authHeaders(data.token);

  const endpoints = [
    { url: '/v1/invoices?limit=20', name: 'invoice-list' },
    { url: '/v1/invoices/stats', name: 'invoice-stats' },
    { url: '/v1/invoices?limit=10&status=PAID', name: 'invoices-paid' },
    { url: '/v1/invoices?limit=10&status=PENDING', name: 'invoices-pending' },
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
