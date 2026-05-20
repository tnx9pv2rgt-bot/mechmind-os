// 07-inventory.js — Inventory & Parts load test
// Simula: lista ricambi, alert stock basso, fornitori
// 100K clienti: ~100 req/sec

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { BASE_URL, getToken, authHeaders } from './helpers.js';

const errorRate = new Rate('inventory_errors');

export const options = {
  scenarios: {
    inventory: {
      executor: 'constant-arrival-rate',
      rate: 100,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 50,
      maxVUs: 70,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<400'],
    http_req_failed: ['rate<0.01'],
    inventory_errors: ['rate<0.01'],
  },
};

export function setup() {
  return { token: getToken() };
}

export default function (data) {
  const headers = authHeaders(data.token);

  const endpoints = [
    { url: '/v1/parts?limit=20', name: 'parts-list' },
    { url: '/v1/parts/alerts/low-stock', name: 'parts-low-stock' },
    { url: '/v1/parts/suppliers/list', name: 'suppliers' },
    { url: '/v1/parts/purchase-orders/list', name: 'purchase-orders' },
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
