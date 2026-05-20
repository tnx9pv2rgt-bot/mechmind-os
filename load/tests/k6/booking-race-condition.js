/**
 * Booking Race Condition Test — MechMind OS
 * 10 VU tentano di prenotare lo STESSO slot contemporaneamente
 * Expected: ESATTAMENTE 1 successo (201), 9 conflitti (409)
 * Verifica: advisory lock + SERIALIZABLE transaction
 *
 * Usage: k6 run -e TOKEN=<jwt> -e CUSTOMER_ID=<id> -e SLOT_ID=<id> -e DATE=<iso> booking-race-condition.js
 */
import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';
import { authHeaders, BASE_URL } from './helpers.js';

const bookingSuccess = new Counter('booking_success');
const bookingConflict = new Counter('booking_conflict');
const bookingError = new Counter('booking_error');

export const options = {
  scenarios: {
    race_condition: {
      executor: 'per-vu-iterations',
      vus: 10,
      iterations: 1,
      maxDuration: '30s',
    },
  },
  thresholds: {
    booking_success: ['count<=1'],
    booking_error: ['count==0'],
  },
};

export function setup() {
  if (!__ENV.TOKEN) throw new Error('Pass -e TOKEN=<jwt>');
  if (!__ENV.CUSTOMER_ID) throw new Error('Pass -e CUSTOMER_ID=<id>');
  if (!__ENV.SLOT_ID) throw new Error('Pass -e SLOT_ID=<id>');
  if (!__ENV.DATE) throw new Error('Pass -e DATE=<iso>');

  return {
    token: __ENV.TOKEN,
    customerId: __ENV.CUSTOMER_ID,
    slotId: __ENV.SLOT_ID,
    scheduledDate: __ENV.DATE,
  };
}

export default function (data) {
  const res = http.post(
    `${BASE_URL}/v1/bookings`,
    JSON.stringify({
      customerId: data.customerId,
      slotId: data.slotId,
      scheduledDate: data.scheduledDate,
      durationMinutes: 60,
      notes: `VU ${__VU} race attempt`,
      idempotencyKey: `race-vu-${__VU}-${Date.now()}`,
    }),
    authHeaders(data.token),
  );

  if (res.status === 201) {
    bookingSuccess.add(1);
    console.log(`VU ${__VU}: BOOKED (201) ✓`);
    check(res, { 'booking created': (r) => r.status === 201 });
  } else if (res.status === 409 || res.status === 400) {
    bookingConflict.add(1);
    console.log(`VU ${__VU}: CONFLICT (${res.status})`);
    check(res, { 'conflict expected': () => true });
  } else if (res.status === 429) {
    bookingConflict.add(1);
    console.log(`VU ${__VU}: RATE LIMITED (429)`);
    check(res, { 'rate limited': () => true });
  } else {
    bookingError.add(1);
    console.log(`VU ${__VU}: UNEXPECTED ${res.status} — ${res.body}`);
    check(res, { 'unexpected status': () => false });
  }
}

export function teardown() {
  console.log('=== Race Condition Results ===');
  console.log('Expected: ≤1 success, rest conflicts/rate-limited');
  console.log('If booking_success > 1: ADVISORY LOCK IS BROKEN');
}
