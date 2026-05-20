// 06-customer.js — Customer management load test
// Simula: lista clienti, ricerca, dettaglio, veicoli
// 100K clienti: ~200 req/sec

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { BASE_URL, getToken, authHeaders } from './helpers.js';

const errorRate = new Rate('customer_errors');

export const options = {
  scenarios: {
    customer_management: {
      executor: 'constant-arrival-rate',
      rate: 200,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 80,
      maxVUs: 100,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<150', 'p(99)<300'],
    http_req_failed: ['rate<0.01'],
    customer_errors: ['rate<0.01'],
  },
};

export function setup() {
  return { token: getToken() };
}

export default function (data) {
  const headers = authHeaders(data.token);

  const endpoints = [
    { url: '/v1/customers?limit=20', name: 'customer-list' },
    { url: '/v1/customers/search', name: 'customer-search' },
    { url: '/v1/vehicles?limit=20', name: 'vehicle-list' },
    { url: '/v1/customers?limit=10&sort=createdAt', name: 'customer-recent' },
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
