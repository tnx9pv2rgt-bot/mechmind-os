// 03-booking-flow.js — Booking flow load test (critical path)
// Simula: lista booking, slot disponibili, calendario, dettaglio
// 100K clienti: ~300 prenotazioni/min = 50 req/sec

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate } from 'k6/metrics';
import { BASE_URL, getToken, authHeaders } from './helpers.js';

const errorRate = new Rate('booking_errors');

export const options = {
  scenarios: {
    booking_flow: {
      executor: 'constant-arrival-rate',
      rate: 50,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 80,
      maxVUs: 120,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'],
    http_req_failed: ['rate<0.01'],
    booking_errors: ['rate<0.01'],
  },
};

export function setup() {
  return { token: getToken() };
}

export default function (data) {
  const headers = authHeaders(data.token);

  group('booking_list', () => {
    const listRes = http.get(`${BASE_URL}/v1/bookings?limit=20`, {
      headers,
      tags: { name: 'booking-list' },
    });
    const ok = check(listRes, { 'list 200': (r) => r.status === 200 });
    errorRate.add(!ok);
  });

  sleep(Math.random() * 0.3 + 0.2);

  group('booking_slots', () => {
    const slotsRes = http.get(
      `${BASE_URL}/v1/bookings/slots/available?date=2026-07-01`,
      { headers, tags: { name: 'booking-slots' } },
    );
    check(slotsRes, { 'slots 2xx': (r) => r.status >= 200 && r.status < 300 });
  });

  sleep(Math.random() * 0.3 + 0.2);

  group('booking_calendar', () => {
    const calRes = http.get(
      `${BASE_URL}/v1/bookings/calendar?from=2026-07-01&to=2026-07-07`,
      { headers, tags: { name: 'booking-calendar' } },
    );
    check(calRes, { 'calendar 2xx': (r) => r.status >= 200 && r.status < 300 });
  });

  sleep(Math.random() * 0.5 + 0.3);
}
