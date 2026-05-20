import http from 'k6/http';

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3002';

export function getAuthToken(suffix) {
  // Register a unique tenant per call to avoid conflicts
  const ts = Date.now();
  const sfx = suffix || `${ts}-${Math.floor(Math.random() * 100000)}`;
  const uniqueSlug = `k6-${sfx}`;

  const email = `k6-${sfx}@test.com`;
  const registerRes = http.post(
    `${BASE_URL}/v1/auth/register`,
    JSON.stringify({
      shopName: `K6 Test Shop ${sfx}`,
      slug: uniqueSlug,
      name: `Test User ${sfx}`,
      email,
      password: 'K6TestPass2026!',
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  if (registerRes.status === 201) {
    const body = JSON.parse(registerRes.body);
    return {
      token: body.data.tokens.accessToken,
      tenantId: body.data.tenant.id,
      slug: body.data.tenant.slug,
    };
  }

  console.error(`Auth failed: register=${registerRes.status} ${registerRes.body}`);
  return null;
}

export function authHeaders(token) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
}

export function createCustomer(token, suffix) {
  const sfx = suffix || `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const res = http.post(
    `${BASE_URL}/v1/customers`,
    JSON.stringify({
      firstName: `Mario${sfx}`,
      lastName: `Rossi`,
      email: `mario-${sfx}@test.com`,
      phone: `+39333000${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
    }),
    authHeaders(token),
  );
  if (res.status === 201) {
    return JSON.parse(res.body).data.id;
  }
  return null;
}

export function createSlot(token, offsetHours) {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(8 + (offsetHours || 0), 0, 0, 0);
  const endDate = new Date(date);
  endDate.setHours(endDate.getHours() + 1);

  const res = http.post(
    `${BASE_URL}/v1/bookings/slots`,
    JSON.stringify({
      startTime: date.toISOString(),
      endTime: endDate.toISOString(),
    }),
    authHeaders(token),
  );
  if (res.status === 201) {
    return JSON.parse(res.body).data.id;
  }
  return null;
}
