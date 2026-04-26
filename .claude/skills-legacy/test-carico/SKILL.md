---
name: test-carico
description: "Genera script k6 per load test su endpoint critici: booking/confirm, payment/checkout, auth/login, invoice/create. Target: P95 <200ms a 100 VU concurrent. SLA detection automatica."
user-invocable: true
disable-model-invocation: false
effort: high
context: fork
allowed-tools: ["Read", "Bash", "Write", "Edit"]
argument-hint: "[booking|payment|auth|invoice|all]"
arguments: endpoint
---

# Load Test Generator — k6

## Obiettivo

Verificare che gli endpoint critici reggano il carico reale:
- **100 VU concorrenti** per 5 minuti
- **P95 < 200ms** (target SLA)
- **Error rate < 1%**
- **Throughput ≥ 50 req/s**

## Prerequisiti

```bash
# Installa k6
brew install k6  # macOS
# o scarica da https://k6.io/docs/get-started/installation/

k6 version
```

## STEP 1 — Identifica Endpoint Critici

```bash
# Trova controller con route annotations
grep -rn "@Post\|@Get\|@Put\|@Delete" \
  backend/src/$ARGUMENTS --include="*.controller.ts" | head -20
```

Per `$ARGUMENTS`, identifica i 3-5 endpoint più usati in produzione.

## STEP 2 — Genera Script k6

Crea `tests/load/$ARGUMENTS.load.js`:

```javascript
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('error_rate');
const p95ResponseTime = new Trend('p95_response_time', true);
const successfulRequests = new Counter('successful_requests');

// SLA targets
const SLA_P95_MS = 200;     // P95 < 200ms
const SLA_ERROR_RATE = 0.01; // Error rate < 1%

export const options = {
  stages: [
    { duration: '1m', target: 10 },   // Ramp up
    { duration: '3m', target: 100 },  // Peak load
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: [`p(95)<${SLA_P95_MS}`],
    error_rate: [`rate<${SLA_ERROR_RATE}`],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BACKEND_URL || 'http://localhost:3002';
const TENANT_ID = __ENV.TEST_TENANT_ID || 'load-test-tenant';

// Auth token (ottenuto prima del test)
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${AUTH_TOKEN}`,
  'x-tenant-id': TENANT_ID,
};

export function setup() {
  // Login per ottenere token
  const loginRes = http.post(`${BASE_URL}/v1/auth/login`, JSON.stringify({
    email: __ENV.TEST_EMAIL || 'loadtest@nexo.it',
    password: __ENV.TEST_PASSWORD,
    tenantId: TENANT_ID,
  }), { headers: { 'Content-Type': 'application/json' } });
  
  check(loginRes, { 'login successful': r => r.status === 200 });
  return { token: loginRes.json('accessToken') };
}

export default function (data) {
  const authHeaders = {
    ...headers,
    'Authorization': `Bearer ${data.token}`,
  };

  group('GET /v1/$ARGUMENTS (list)', () => {
    const res = http.get(
      `${BASE_URL}/v1/$ARGUMENTS?page=1&limit=20`,
      { headers: authHeaders }
    );
    
    const ok = check(res, {
      'status 200': r => r.status === 200,
      'response time < 200ms': r => r.timings.duration < SLA_P95_MS,
      'has data array': r => r.json('data') !== undefined,
    });
    
    errorRate.add(!ok);
    if (ok) successfulRequests.add(1);
    p95ResponseTime.add(res.timings.duration);
  });

  sleep(0.1); // 100ms think time

  group('POST /v1/$ARGUMENTS (create)', () => {
    const payload = {
      tenantId: TENANT_ID,
      // Aggiungi campi specifici per $ARGUMENTS
    };
    
    const res = http.post(
      `${BASE_URL}/v1/$ARGUMENTS`,
      JSON.stringify(payload),
      { headers: authHeaders }
    );
    
    const ok = check(res, {
      'status 201': r => r.status === 201,
      'response time < 500ms': r => r.timings.duration < 500,
    });
    
    errorRate.add(!ok);
    if (ok) successfulRequests.add(1);
  });

  sleep(0.5); // 500ms think time
}

export function teardown(data) {
  // Cleanup dati di test se necessario
  console.log(`Test completato. Token usato: ${data.token.substring(0, 10)}...`);
}
```

## STEP 3 — Scenari Specifici per Modulo

### Booking — Load Test Critico (race condition)
```javascript
// Simula prenotazioni concorrenti sullo stesso slot
group('Concurrent booking (race condition test)', () => {
  const slot = '2026-06-01T10:00:00Z';
  
  const res = http.post(`${BASE_URL}/v1/bookings`, JSON.stringify({
    tenantId: TENANT_ID,
    serviceId: __ENV.TEST_SERVICE_ID,
    scheduledAt: slot,
    customerId: __ENV.TEST_CUSTOMER_ID,
  }), { headers: authHeaders });
  
  // Deve essere o 201 (primo) o 409 (slot occupato) — MAI 500
  check(res, {
    'no server error': r => r.status !== 500,
    'valid response (201 or 409)': r => [201, 409].includes(r.status),
  });
});
```

### Auth — Rate Limiting Test
```javascript
group('Auth rate limit (brute force protection)', () => {
  const res = http.post(`${BASE_URL}/v1/auth/login`, JSON.stringify({
    email: 'attacker@evil.com',
    password: 'wrong-password',
    tenantId: TENANT_ID,
  }), { headers: { 'Content-Type': 'application/json' } });
  
  // Dopo N tentativi deve ricevere 429 Too Many Requests
  check(res, {
    'rate limited after multiple failures': r => 
      r.status === 429 || r.status === 401,
  });
});
```

## STEP 4 — Esegui Test

```bash
# Test locale (backend deve essere running)
cd backend && npm run start:dev &
sleep 5

# Run load test
k6 run tests/load/$ARGUMENTS.load.js \
  --env BACKEND_URL=http://localhost:3002 \
  --env TEST_EMAIL=loadtest@nexo.it \
  --env TEST_PASSWORD=LoadTest123! \
  --out json=tests/load/results/$ARGUMENTS-$(date +%Y%m%d-%H%M%S).json

# Con Grafana Cloud (opzionale)
k6 run --out cloud tests/load/$ARGUMENTS.load.js
```

## STEP 5 — Analisi Risultati

```bash
# Leggi risultati JSON
cat tests/load/results/$ARGUMENTS-*.json | \
  jq '{
    p95: .metrics.http_req_duration.values["p(95)"],
    p99: .metrics.http_req_duration.values["p(99)"],
    rps: .metrics.http_reqs.values.rate,
    error_rate: .metrics.http_req_failed.values.rate
  }'
```

**SLA PASS criteria:**
- `p95 < 200` ✅
- `error_rate < 0.01` ✅
- `rps ≥ 50` ✅

## Regole Load Testing

- **MAI** eseguire load test su produzione senza finestra di manutenzione
- **Sempre** usare tenant dedicato per load test (`load-test-tenant`)
- **Cleanup** dati di test dopo ogni run (`afterAll` o scheduled job)
- **Baseline** prima di ogni release: confronta con run precedente
- **Alert** se P95 regredisce >20% tra release
