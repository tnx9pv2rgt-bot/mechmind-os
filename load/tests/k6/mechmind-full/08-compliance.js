// 08-compliance.js — GDPR, RENTRI, NIS2, AI Act compliance
// Simula: verifica compliance, richieste GDPR, log audit
// 100K clienti: ~20 req/sec (basso volume, alta importanza)

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { BASE_URL, getToken, authHeaders } from './helpers.js';

const errorRate = new Rate('compliance_errors');

export const options = {
  scenarios: {
    compliance: {
      executor: 'constant-arrival-rate',
      rate: 20,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 20,
      maxVUs: 30,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<300', 'p(99)<600'],
    http_req_failed: ['rate<0.01'],
    compliance_errors: ['rate<0.01'],
  },
};

export function setup() {
  return { token: getToken() };
}

export default function (data) {
  const headers = authHeaders(data.token);

  const endpoints = [
    { url: '/v1/gdpr/requests', name: 'gdpr-requests' },
    { url: '/v1/gdpr/requests/stats', name: 'gdpr-stats' },
    { url: '/v1/gdpr/deletion-jobs/stats', name: 'gdpr-deletion-stats' },
    { url: '/v1/ai-compliance/decisions', name: 'ai-decisions' },
    { url: '/v1/ai-compliance/dashboard', name: 'ai-dashboard' },
    { url: '/v1/rentri/operations', name: 'rentri-ops' },
    { url: '/v1/rentri/compliance-status', name: 'rentri-status' },
    { url: '/v1/nis2/incidents', name: 'nis2-incidents' },
    { url: '/v1/nis2/dashboard', name: 'nis2-dashboard' },
  ];

  const ep = endpoints[Math.floor(Math.random() * endpoints.length)];
  const res = http.get(`${BASE_URL}${ep.url}`, {
    headers,
    tags: { name: ep.name },
  });

  const ok = check(res, {
    'status 2xx': (r) => r.status >= 200 && r.status < 400,
  });
  errorRate.add(!ok);

  sleep(Math.random() * 1 + 0.5);
}
