import http from 'k6/http';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3002';

export function getToken() {
  if (__ENV.TOKEN) return __ENV.TOKEN;
  const res = http.post(`${BASE_URL}/v1/auth/demo-session`, '{}', {
    headers: { 'Content-Type': 'application/json' },
  });
  if (res.status === 200) {
    const body = res.json();
    return body.data ? body.data.accessToken : body.accessToken;
  }
  console.error(`Failed to get token: ${res.status} ${res.body}`);
  return '';
}

export function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export { BASE_URL };
