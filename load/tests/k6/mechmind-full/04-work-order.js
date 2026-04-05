// 04-work-order.js — Work Order (OdL) load test
// Simula: lista OdL, dettaglio, timer, progress
// 100K clienti: ~150 req/sec (ogni officina gestisce 10-15 OdL/giorno)

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate } from 'k6/metrics';
import { BASE_URL, getToken, authHeaders } from './helpers.js';

const errorRate = new Rate('work_order_errors');

export const options = {
  scenarios: {
    work_order_flow: {
      executor: 'constant-arrival-rate',
      rate: 150,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 80,
      maxVUs: 120,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<150', 'p(99)<300'],
    http_req_failed: ['rate<0.01'],
    work_order_errors: ['rate<0.01'],
  },
};

export function setup() {
  return { token: getToken() };
}

export default function (data) {
  const headers = authHeaders(data.token);

  const endpoints = [
    { url: '/v1/work-orders?limit=20', name: 'wo-list' },
    { url: '/v1/work-orders?limit=10&status=IN_PROGRESS', name: 'wo-in-progress' },
    { url: '/v1/estimates?limit=20', name: 'estimates-list' },
    { url: '/v1/canned-jobs?limit=20', name: 'canned-jobs' },
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
