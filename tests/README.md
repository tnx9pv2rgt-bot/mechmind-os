# MechMind OS v10 - Testing Suite Documentation

## Overview

This comprehensive testing suite for MechMind OS v10 validates critical paths including:
- **Race Condition Testing**: 100 concurrent booking attempts with zero double bookings
- **GDPR Compliance**: PII encryption, right-to-be-forgotten, audit trails
- **Booking Consistency**: Transaction rollback, lock timeout handling
- **Security**: OWASP Top 10 validation
- **Performance**: <50ms advisory lock wait (p99), <2s voice response (p99)

## Validation Points (from spec)

| Metric | Target | Test File |
|--------|--------|-----------|
| Zero GDPR violations | 100% compliance | `security/gdpr.compliance.spec.ts` |
| P1+ incident rate | <2% in Beta | All test suites |
| Advisory lock wait | <50ms (p99) | `load/booking-race-conditions.js` |
| Voice response latency | <2s (p99) | `load/voice-api-load.js` |
| Booking consistency | 100% (no double bookings) | `load/booking-race-conditions.js` |

## Directory Structure

```
tests/
├── jest.config.js                    # Main Jest configuration
├── jest.integration.config.js        # Integration test config
├── jest.e2e.config.js                # E2E test config
├── unit/                             # Unit tests
│   ├── booking.service.spec.ts       # Booking service tests
│   ├── encryption.service.spec.ts    # PII encryption tests
│   ├── rls.policies.spec.ts          # Row-level security tests
│   └── voice-webhook.handler.spec.ts # Voice webhook tests
├── integration/                      # Integration tests
│   ├── database.integration.spec.ts  # Database/RLS/locks tests
│   ├── booking-api.integration.spec.ts # API endpoint tests
│   └── voice.integration.spec.ts     # Voice flow integration
├── load/                             # k6 load tests
│   ├── booking-race-conditions.js    # Race condition load test
│   ├── voice-api-load.js             # Voice API load test
│   └── concurrent-users.js           # General load test
├── security/                         # Security tests
│   ├── owasp.security.spec.ts        # OWASP Top 10 tests
│   └── gdpr.compliance.spec.ts       # GDPR compliance tests
└── utils/                            # Test utilities
    ├── test-setup.ts                 # Global test setup
    ├── database.ts                   # Database helpers
    ├── mock-factories.ts             # Test data factories
    ├── jwt-helpers.ts                # JWT test utilities
    ├── global-setup.ts               # Global setup
    ├── global-teardown.ts            # Global teardown
    ├── integration-test-environment.ts # Integration env
    ├── integration-setup.ts          # Integration setup
    └── e2e-setup.ts                  # E2E setup
```

## Running Tests

### Prerequisites

```bash
# Install dependencies
npm install

# Set up test database
npm run test:db:setup

# Configure environment
cp .env.test.example .env.test
```

### Environment Variables (.env.test)

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=mechmind_test
DB_PASSWORD=test_password
DB_DATABASE=mechmind_test

# JWT
JWT_SECRET=test-jwt-secret
JWT_REFRESH_SECRET=test-refresh-secret

# Encryption
ENCRYPTION_KEY=base64-encoded-32-byte-key
ENCRYPTION_ALGORITHM=aes-256-gcm

# Voice
VOICE_WEBHOOK_SECRET=test-webhook-secret

# Test Configuration
CI=true
```

### Run Unit Tests

```bash
# Run all unit tests
npm run test:unit

# Run with coverage
npm run test:unit -- --coverage

# Run specific test file
npm run test:unit -- booking.service.spec.ts

# Run with watch mode
npm run test:unit -- --watch
```

### Run Integration Tests

```bash
# Run all integration tests
npm run test:integration

# Run with coverage
npm run test:integration -- --coverage

# Run specific test file
npm run test:integration -- database.integration.spec.ts
```

### Run Security Tests

```bash
# Run OWASP security tests
npm run test:security -- owasp.security.spec.ts

# Run GDPR compliance tests
npm run test:security -- gdpr.compliance.spec.ts

# Run all security tests
npm run test:security
```

### Run Load Tests (k6)

```bash
# Install k6
brew install k6  # macOS
# or
sudo apt-get install k6  # Ubuntu

# Run race condition load test
k6 run tests/load/booking-race-conditions.js

# Run with custom environment
BASE_URL=https://api.mechmind.io/api/v1 \
JWT_TOKEN=your-jwt-token \
k6 run tests/load/booking-race-conditions.js

# Run voice API load test
k6 run tests/load/voice-api-load.js

# Run concurrent users test
k6 run tests/load/concurrent-users.js
```

### Run All Tests

```bash
# Run complete test suite
npm test

# Run with coverage report
npm test -- --coverage

# Generate coverage report
npm run test:coverage:report
```

## Test Coverage Requirements

### Global Coverage Thresholds

```javascript
// jest.config.js
coverageThreshold: {
  global: {
    branches: 85,
    functions: 90,
    lines: 90,
    statements: 90,
  },
}
```

### Critical Path Coverage (95%)

- `src/booking/**/*.ts`
- `src/encryption/**/*.ts`
- `src/gdpr/**/*.ts`

## Test Categories

### 1. Unit Tests

Tests individual components in isolation with mocked dependencies.

**Key Tests:**
- Advisory lock acquisition and release
- PII encryption/decryption
- RLS policy enforcement
- HMAC signature verification
- Intent extraction

**Run:** `npm run test:unit`

### 2. Integration Tests

Tests component interactions with real database.

**Key Tests:**
- Database RLS policy enforcement
- EXCLUSION constraint validation
- Advisory lock contention
- API endpoint authentication
- Voice webhook flow

**Run:** `npm run test:integration`

### 3. Load Tests (k6)

Tests system behavior under concurrent load.

**Key Tests:**
- 100 concurrent booking attempts → zero double bookings
- Advisory lock wait time <50ms (p99)
- Voice response latency <2s (p99)
- System stability under 200+ concurrent users

**Run:** `k6 run tests/load/booking-race-conditions.js`

### 4. Security Tests

Tests OWASP Top 10 vulnerabilities and GDPR compliance.

**Key Tests:**
- SQL injection prevention
- JWT tampering detection
- Rate limiting enforcement
- PII encryption at rest
- Right-to-be-forgotten workflow
- Audit trail maintenance

**Run:** `npm run test:security`

## Race Condition Testing

### Test Scenario

```javascript
// 100 concurrent users attempt to book the same slot
// Expected: Exactly 1 success, 99 conflicts (409)

export const options = {
  scenarios: {
    race_condition_test: {
      executor: 'per-vu-iterations',
      vus: 100,
      iterations: 1,
    },
  },
};
```

### Validation

```javascript
check(response, {
  'status is 201 or 409': (r) => r.status === 201 || r.status === 409,
  'no double bookings': (r) => verifyNoDoubleBookings(),
});
```

### Success Criteria

- ✅ Zero double bookings
- ✅ Advisory lock wait <50ms (p99)
- ✅ 100% booking consistency

## GDPR Compliance Testing

### Tested Articles

| Article | Description | Test File |
|---------|-------------|-----------|
| 5 | Data minimization | `gdpr.compliance.spec.ts` |
| 6 | Lawful basis | `gdpr.compliance.spec.ts` |
| 15 | Right to access | `gdpr.compliance.spec.ts` |
| 16 | Right to rectification | `gdpr.compliance.spec.ts` |
| 17 | Right to erasure | `gdpr.compliance.spec.ts` |
| 20 | Data portability | `gdpr.compliance.spec.ts` |
| 25 | Privacy by design | `gdpr.compliance.spec.ts` |
| 30 | Records of processing | `gdpr.compliance.spec.ts` |
| 32 | Security of processing | `gdpr.compliance.spec.ts` |
| 33-34 | Breach notification | `gdpr.compliance.spec.ts` |

### Right to be Forgotten Test

```typescript
it('should anonymize customer data on request', async () => {
  // Request erasure
  const response = await request(app)
    .post(`/api/v1/gdpr/erase/${customerId}`)
    .send({ reason: 'Customer request' });

  // Verify anonymization
  expect(response.body.anonymized).toBe(true);
  
  // Verify PII is encrypted/anonymized
  expect(customer.first_name_encrypted).toMatch(/^ANONYMIZED_/);
  
  // Verify audit trail maintained
  expect(auditLog.rows.length).toBeGreaterThan(0);
});
```

## Performance Benchmarks

### Advisory Lock Performance

```
Target: <50ms (p99)
Test: load/booking-race-conditions.js
Metric: advisory_lock_wait_time
```

### Voice Response Performance

```
Target: <2s (p99)
Test: load/voice-api-load.js
Metric: voice_response_time
```

### API Response Performance

```
Target: <500ms (p95)
Test: load/concurrent-users.js
Metric: http_req_duration
```

## Continuous Integration

### GitHub Actions Workflow

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: mechmind_test
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: mechmind_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit -- --coverage
      
      - name: Run integration tests
        run: npm run test:integration -- --coverage
      
      - name: Run security tests
        run: npm run test:security
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Troubleshooting

### Common Issues

#### Database Connection Failed

```bash
# Ensure PostgreSQL is running
sudo service postgresql start

# Create test database
createdb mechmind_test

# Run migrations
npm run db:migrate:test
```

#### Lock Contention Timeouts

```bash
# Increase lock timeout for tests
export LOCK_TIMEOUT_MS=10000

# Run with longer timeout
npm run test:integration -- --testTimeout=30000
```

#### k6 Installation Issues

```bash
# macOS
brew install k6

# Ubuntu
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### Debug Mode

```bash
# Enable debug logging
DEBUG=true npm run test:unit

# Verbose output
npm run test:unit -- --verbose

# Single test with logs
npm run test:unit -- --testNamePattern="should acquire advisory lock"
```

## Test Data

### Mock Factories

```typescript
// Create test tenant
const tenant = createTenant({ name: 'Test Tenant' });

// Create test shop
const shop = createShop(tenant.id, { name: 'Test Shop' });

// Create test customer with encrypted PII
const customer = createCustomer(tenant.id, shop.id, {
  firstName: 'John',
  lastName: 'Doe',
  phone: '+15551234567',
});

// Create test booking
const booking = createBooking(tenant.id, shop.id, {
  serviceType: 'oil_change',
  scheduledAt: new Date('2024-01-15T14:00:00Z'),
});
```

### JWT Tokens

```typescript
// Create tenant-scoped JWT
const token = createTenantJWT(tenantId, userId, ['shop_manager']);

// Create expired token (for negative testing)
const expiredToken = generateExpiredToken(tenantId);

// Create tampered token (for security testing)
const tamperedToken = generateTamperedToken(tenantId);
```

## Reporting

### Coverage Report

```bash
# Generate HTML coverage report
npm run test:coverage

# Open report
open coverage/index.html
```

### Test Results

```bash
# Generate JUnit XML report
npm run test:unit -- --reporters=jest-junit

# Report location
ls reports/junit.xml
```

### Load Test Results

```bash
# Run with detailed output
k6 run --out json=results.json tests/load/booking-race-conditions.js

# Generate HTML report
k6 run --out influxdb=http://localhost:8086/k6 tests/load/booking-race-conditions.js
```

## Contributing

### Adding New Tests

1. Create test file in appropriate directory
2. Follow naming convention: `*.spec.ts` or `*.test.ts`
3. Use mock factories for test data
4. Add to relevant test suite in `package.json`
5. Update this README with new test documentation

### Test Best Practices

- ✅ Use descriptive test names
- ✅ Follow AAA pattern (Arrange, Act, Assert)
- ✅ Mock external dependencies
- ✅ Clean up test data after each test
- ✅ Use factories for test data
- ✅ Test both positive and negative cases
- ✅ Keep tests independent and isolated

## License

Copyright © 2024 MechMind OS. All rights reserved.
