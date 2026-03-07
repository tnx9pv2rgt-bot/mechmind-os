# MechMind OS v10 - Testing & Operations Architecture

**Enterprise Technical Documentation**  
**Version:** 1.0  
**Effective Date:** 2026-02-28  
**Classification:** INTERNAL USE ONLY  
**Owner:** Platform Engineering & SRE Teams

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Test Pyramid Architecture](#2-test-pyramid-architecture)
3. [Test Suite Structure](#3-test-suite-structure)
4. [k6 Load Testing Framework](#4-k6-load-testing-framework)
5. [Test Coverage Requirements](#5-test-coverage-requirements)
6. [Operational Runbooks](#6-operational-runbooks)
7. [Disaster Recovery](#7-disaster-recovery)
8. [Production Readiness Checklist](#8-production-readiness-checklist)
9. [Appendices](#9-appendices)

---

## 1. Executive Summary

### 1.1 Purpose

This document provides comprehensive technical documentation for the MechMind OS v10 Testing & Operations Architecture. It serves as the authoritative reference for:

- Test engineering practices and standards
- Load testing methodologies and frameworks
- Operational procedures and incident response
- Disaster recovery protocols
- Production readiness validation

### 1.2 Scope

| Domain | Coverage |
|--------|----------|
| Unit Testing | Jest framework, critical path validation |
| Integration Testing | Database, API, voice system integration |
| Security Testing | OWASP Top 10, GDPR compliance validation |
| Load Testing | k6 framework, race conditions, throughput |
| Operations | Incident response, monitoring, alerting |
| Disaster Recovery | RTO/RPO targets, failover procedures |

### 1.3 Key Metrics Summary

| Metric | Target | Measurement |
|--------|--------|-------------|
| Code Coverage (Global) | > 90% | Jest coverage reports |
| Code Coverage (Critical) | > 95% | Booking, encryption, GDPR |
| Race Condition Test | 0 double bookings | k6 validation |
| Advisory Lock Wait | < 50ms p99 | k6 metrics |
| Voice Response Time | < 2s p99 | k6 metrics |
| GDPR Deletion | < 1 hour | k6 job duration |
| RTO (Multi-AZ) | < 3 min | DR drill validation |
| RPO (Multi-AZ) | 0 | DR drill validation |

---

## 2. Test Pyramid Architecture

### 2.1 Test Pyramid Diagram

```
                    ┌─────────────────┐
                    │   E2E Tests     │  ← 5% of test suite
                    │  (Smoke Tests)  │     Validates full user journeys
                    │    ~10 tests    │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
       ┌──────▼──────┐ ┌─────▼─────┐ ┌──────▼──────┐
       │  Security   │ │  Load     │ │ Integration │  ← 15% of test suite
       │   Tests     │ │  Tests    │ │   Tests     │     API, DB, Voice
       │  (OWASP +   │ │  (k6)     │ │  ~30 tests  │
       │   GDPR)     │ │  ~4 scenarios│            │
       │  ~50 tests  │ │           │ │             │
       └─────────────┘ └───────────┘ └─────────────┘
                             │
                    ┌────────▼────────┐
                    │   Unit Tests    │  ← 80% of test suite
                    │  (Jest + NestJS)│     Business logic validation
                    │   ~150 tests    │
                    └─────────────────┘
```

### 2.2 Test Category Distribution

```
┌─────────────────────────────────────────────────────────────┐
│                     TEST EXECUTION FREQUENCY                 │
├─────────────────────────────────────────────────────────────┤
│ Unit Tests        ████████████████████████████████████  On every commit  │
│ Integration Tests ██████████████████████               4x daily           │
│ Security Tests    ██████████                           Weekly             │
│ Load Tests        ██████                               Weekly + on demand │
│ E2E Tests         ████                                 Pre-release        │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Test Runner | Jest 29+ | Unit and integration test execution |
| Test Framework | NestJS Testing Module | Dependency injection testing |
| HTTP Testing | Supertest | API endpoint validation |
| Database | PostgreSQL 15 | Test database with RLS |
| Load Testing | k6 | Performance and concurrency testing |
| Mocking | Jest Mock | Service isolation |
| Factories | Custom | Test data generation |

---

## 3. Test Suite Structure

### 3.1 Directory Structure

```
tests/
├── jest.config.js                    # Main Jest configuration
├── jest.integration.config.js        # Integration test config
├── jest.e2e.config.js                # E2E test configuration
├── TEST-SUITE-SUMMARY.md             # Test suite overview
├── README.md                         # Test documentation
│
├── unit/                             # Unit Tests (80%)
│   ├── booking.service.spec.ts       # Advisory locks, race conditions
│   ├── encryption.service.spec.ts    # PII encryption/decryption
│   ├── rls.policies.spec.ts          # Tenant isolation
│   └── voice-webhook.handler.spec.ts # HMAC verification
│
├── integration/                      # Integration Tests (15%)
│   ├── database.integration.spec.ts  # RLS, locks, constraints
│   ├── booking-api.integration.spec.ts # JWT auth, slot conflicts
│   └── voice.integration.spec.ts     # Voice flow, SMS confirmation
│
├── security/                         # Security Tests
│   ├── owasp.security.spec.ts        # OWASP Top 10 validation
│   └── gdpr.compliance.spec.ts       # GDPR Articles 5-34
│
├── load/                             # Load Tests (k6)
│   ├── k6/
│   │   ├── race-condition-test.js    # 100 VUs, same slot
│   │   ├── lock-contention-test.js   # 1000 VUs, 100 slots
│   │   ├── voice-throughput-test.js  # 100 calls/sec
│   │   ├── gdpr-deletion-test.js     # 10k records
│   │   ├── config.js                 # Shared configuration
│   │   ├── run-tests.sh              # Test orchestration
│   │   └── utils/
│   │       └── db-helpers.js         # Database utilities
│   └── README.md                     # k6 documentation
│
└── utils/                            # Test Utilities
    ├── test-setup.ts                 # Global test configuration
    ├── database.ts                   # Database helpers
    ├── mock-factories.ts             # Test data factories
    ├── jwt-helpers.ts                # JWT utilities
    ├── global-setup.ts               # Global setup
    ├── global-teardown.ts            # Global cleanup
    ├── integration-setup.ts          # Integration test setup
    └── e2e-setup.ts                  # E2E test setup
```

### 3.2 Unit Tests (Jest)

#### 3.2.1 Booking Service Tests (`booking.service.spec.ts`)

| Test Suite | Test Cases | Critical Path |
|------------|------------|---------------|
| `createBooking` | 8 tests | ✅ Yes |
| `updateBooking` | 3 tests | ✅ Yes |
| `cancelBooking` | 2 tests | ✅ Yes |
| `advisory lock performance` | 1 test | ✅ Yes |

**Key Validations:**
- Advisory lock acquisition and release
- Zero double bookings under concurrent requests
- Lock timeout handling (< 50ms p99)
- Transaction rollback on errors
- Tenant isolation enforcement

```typescript
// Critical Test: Concurrent booking simulation
it('should prevent double booking with concurrent requests', async () => {
  const promises = Array.from({ length: 100 }, () =>
    service.createBooking(tenantId, sameSlotPayload)
  );
  const results = await Promise.allSettled(promises);
  const successes = results.filter(r => r.status === 'fulfilled');
  expect(successes.length).toBeLessThanOrEqual(1);
});
```

#### 3.2.2 Encryption Service Tests (`encryption.service.spec.ts`)

| Test Suite | Test Cases | Critical Path |
|------------|------------|---------------|
| `encrypt` | 5 tests | ✅ Yes |
| `decrypt` | 5 tests | ✅ Yes |
| `encryptObject/decryptObject` | 4 tests | ✅ Yes |
| `key rotation` | 1 test | ✅ Yes |
| `GDPR compliance` | 2 tests | ✅ Yes |

**Key Validations:**
- AES-256-GCM encryption with unique IV per operation
- Authentication tag verification (GCM mode)
- Key rotation backward compatibility
- PII field encryption with object helpers
- Decryption failure with tampered ciphertext

#### 3.2.3 RLS Policy Tests (`rls.policies.spec.ts`)

| Test Suite | Test Cases | Critical Path |
|------------|------------|---------------|
| `Tenant Isolation` | 3 tests | ✅ Yes |
| `Cross-Tenant Insert Prevention` | 1 test | ✅ Yes |
| `Cross-Tenant Update Prevention` | 1 test | ✅ Yes |
| `Cross-Tenant Delete Prevention` | 1 test | ✅ Yes |
| `RLS Policy Enforcement` | 2 tests | ✅ Yes |

**Key Validations:**
- Tenant 1 cannot see Tenant 2 data
- Cross-tenant queries return zero results
- RLS policies enabled on all tenant tables
- Superuser bypass capability for admin operations

#### 3.2.4 Voice Webhook Tests (`voice-webhook.handler.spec.ts`)

| Test Suite | Test Cases | Critical Path |
|------------|------------|---------------|
| `HMAC Signature Verification` | 5 tests | ✅ Yes |
| `Intent Extraction` | 3 tests | No |
| `Booking Flow` | 4 tests | ✅ Yes |
| `Timeout Handling` | 3 tests | ✅ Yes |
| `Response Latency` | 1 test | ✅ Yes |

**Key Validations:**
- HMAC-SHA256 signature verification
- Tampered payload rejection
- Response latency < 2s (p99)
- Timeout escalation to human agents

### 3.3 Integration Tests

#### 3.3.1 Database Integration (`database.integration.spec.ts`)

| Test Suite | Test Cases | Purpose |
|------------|------------|---------|
| `RLS Policies` | 3 tests | Tenant data isolation |
| `Advisory Locks` | 3 tests | Lock acquisition/contention |
| `EXCLUSION Constraints` | 4 tests | Prevent double bookings |
| `Transaction Rollback` | 1 test | Data consistency |
| `Event Store` | 1 test | Audit trail |

#### 3.3.2 Booking API Integration (`booking-api.integration.spec.ts`)

| Test Suite | Test Cases | Purpose |
|------------|------------|---------|
| `POST /api/v1/bookings` | 7 tests | Create with auth/conflict validation |
| `GET /api/v1/bookings/:id` | 3 tests | Read with tenant isolation |
| `PATCH /api/v1/bookings/:id` | 2 tests | Update with conflict check |
| `DELETE /api/v1/bookings/:id` | 2 tests | Cancel booking |
| `GET /api/v1/bookings` | 3 tests | List with filters |

#### 3.3.3 Voice Integration (`voice.integration.spec.ts`)

| Test Suite | Test Cases | Purpose |
|------------|------------|---------|
| `POST /api/v1/voice/webhook` | 7 tests | Complete voice flow |
| `POST /api/v1/voice/callback` | 1 test | Voice callback handling |
| `POST /api/v1/voice/transcription` | 1 test | Transcription processing |
| `Voice Response Latency` | 1 test | < 2s p99 validation |
| `SMS Confirmation` | 1 test | Post-booking notifications |

### 3.4 Security Tests

#### 3.4.1 OWASP Security Tests (`owasp.security.spec.ts`)

| OWASP Category | Test Cases | Status |
|----------------|------------|--------|
| A01: Broken Access Control | 4 tests | ✅ Implemented |
| A02: Cryptographic Failures | 2 tests | ✅ Implemented |
| A03: Injection | 4 tests | ✅ Implemented |
| A04: Insecure Design | 3 tests | ✅ Implemented |
| A05: Security Misconfiguration | 3 tests | ✅ Implemented |
| A06: Vulnerable Components | 1 test | ✅ Documented |
| A07: Authentication Failures | 5 tests | ✅ Implemented |
| A08: Integrity Failures | 2 tests | ✅ Implemented |
| A09: Logging Failures | 2 tests | ✅ Documented |
| A10: SSRF | 2 tests | ✅ Implemented |

#### 3.4.2 GDPR Compliance Tests (`gdpr.compliance.spec.ts`)

| GDPR Article | Test Cases | Validation |
|--------------|------------|------------|
| Art. 5: Data Minimization | 2 tests | PII encryption |
| Art. 6: Lawful Basis | 2 tests | Consent recording |
| Art. 15: Right to Access | 2 tests | Data export endpoint |
| Art. 16: Right to Rectification | 1 test | Data correction |
| Art. 17: Right to Erasure | 3 tests | Anonymization workflow |
| Art. 20: Data Portability | 2 tests | JSON/CSV export |
| Art. 25: Privacy by Design | 2 tests | RLS, encryption |
| Art. 30: Records of Processing | 2 tests | Audit logging |
| Art. 32: Security of Processing | 2 tests | AES-256-GCM |
| Art. 33-34: Breach Notification | 2 tests | Detection config |

---

## 4. k6 Load Testing Framework

### 4.1 k6 Test Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    k6 LOAD TEST SUITE                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐      ┌──────────────────────────┐     │
│  │  Orchestration   │      │   Configuration Layer    │     │
│  │  run-tests.sh    │─────▶│   config.js              │     │
│  └──────────────────┘      │   - Environment configs  │     │
│                            │   - Thresholds           │     │
│  ┌──────────────────┐      │   - Test data            │     │
│  │   Test Scripts   │◀─────└──────────────────────────┘     │
│  │                  │                                       │
│  │ • race-condition │      ┌──────────────────────────┐     │
│  │ • lock-contention│      │   Metrics Collection     │     │
│  │ • voice-througput│─────▶│   - HTTP metrics         │     │
│  │ • gdpr-deletion  │      │   - Custom metrics       │     │
│  └──────────────────┘      │   - Threshold validation │     │
│                            └──────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 k6 Test Scenarios

#### 4.2.1 Race Condition Test

```javascript
// Test Configuration: race-condition-test.js
export const options = {
  scenarios: {
    race_condition: {
      executor: 'shared-iterations',
      vus: 100,           // 100 concurrent users
      iterations: 100,
      maxDuration: '5m',
    },
  },
  thresholds: {
    http_req_duration: ['p(99)<500'],     // p99 < 500ms
    http_req_failed: ['rate<0.01'],        // Error rate < 1%
    double_booking_detected: ['count==0'], // Zero double bookings
    lock_wait_ms: ['p(99)<50'],            // Lock wait < 50ms
  },
};
```

**Test Scenario Table:**

| Parameter | Value | Description |
|-----------|-------|-------------|
| Virtual Users | 100 | Concurrent booking attempts |
| Target Slot | 1 shared slot | All VUs compete for same slot |
| Expected Success | 1 | Exactly one successful booking |
| Expected Conflict | 99 | 99 VUs receive 409 Conflict |
| Max Duration | 5 minutes | Test timeout |
| p99 Response | < 500ms | Performance threshold |
| p99 Lock Wait | < 50ms | Advisory lock performance |

**Custom Metrics:**

| Metric | Type | Target |
|--------|------|--------|
| `double_booking_detected` | Counter | 0 |
| `lock_wait_ms` | Trend | p99 < 50ms |
| `booking_success_rate` | Rate | Track only |
| `conflict_rate` | Rate | Track only |

#### 4.2.2 Lock Contention Test

```javascript
// Test Configuration: lock-contention-test.js
const TOTAL_SLOTS = 100;
const VUS_PER_SLOT = 10;
const TOTAL_VUS = 1000;

export const options = {
  scenarios: {
    lock_contention: {
      executor: 'shared-iterations',
      vus: 1000,
      iterations: 1000,
      maxDuration: '10m',
    },
    sustained_contention: {
      executor: 'ramping-vus',
      stages: [
        { duration: '1m', target: 500 },
        { duration: '3m', target: 500 },
        { duration: '1m', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(99)<1000'],
    lock_wait_ms: ['p(99)<100'],           // Lock wait < 100ms
    deadlock_detected: ['count==0'],       // Zero deadlocks
    booking_success_rate: ['rate==1'],     // 100% success (distributed slots)
  },
};
```

**Test Scenario Table:**

| Parameter | Value | Description |
|-----------|-------|-------------|
| Total VUs | 1000 | Maximum concurrency |
| Slots | 100 | Distributed targets |
| VUs per Slot | 10 | Contention level per slot |
| Expected Success | 100 | One per slot |
| p99 Lock Wait | < 100ms | Performance threshold |
| Deadlock Target | 0 | Zero tolerance |

#### 4.2.3 Voice Throughput Test

```javascript
// Test Configuration: voice-throughput-test.js
const TARGET_RPS = 100;

export const options = {
  scenarios: {
    steady_state: {
      executor: 'constant-arrival-rate',
      rate: 100,              // 100 calls/sec
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 200,
      maxVUs: 500,
    },
    burst_test: {
      executor: 'constant-arrival-rate',
      rate: 200,              // 200 calls/sec burst
      timeUnit: '1s',
      duration: '30s',
      startTime: '6m',
    },
  },
  thresholds: {
    voice_response_time: ['p(99)<2500'],   // p99 < 2.5s
    webhook_processing_time: ['p(99)<2000'],
    http_req_failed: ['rate<0.01'],        // < 1% error rate
    lost_webhooks: ['count==0'],           // Zero lost webhooks
  },
};
```

**Test Scenario Table:**

| Parameter | Value | Description |
|-----------|-------|-------------|
| Steady Rate | 100 calls/sec | Sustained throughput |
| Burst Rate | 200 calls/sec | 30-second burst test |
| p99 Latency | < 2.5s | Voice response time |
| Error Rate | < 1% | Maximum acceptable errors |
| Lost Webhooks | 0 | SQS DLQ must be empty |

#### 4.2.4 GDPR Deletion Test

```javascript
// Test Configuration: gdpr-deletion-test.js
const TARGET_RECORDS = 10000;
const MAX_DURATION_SECONDS = 3600;

export const options = {
  scenarios: {
    setup_customers: {
      executor: 'shared-iterations',
      vus: 50,
      iterations: 200,        // 10,000 records / 50 VUs
      maxDuration: '30m',
    },
    gdpr_deletion: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 1,
      maxDuration: '1h',
      startTime: '32m',
    },
  },
  thresholds: {
    deletion_job_duration: ['max<3600000'],  // < 1 hour
    pii_leak_detected: ['count==0'],         // Zero PII leaks
    deletion_success_rate: ['rate==1'],      // 100% success
  },
};
```

**Test Scenario Table:**

| Parameter | Value | Description |
|-----------|-------|-------------|
| Records Created | 10,000 | Test data volume |
| Creation VUs | 50 | Parallel creation |
| Max Duration | 1 hour | Deletion SLA |
| PII Leak Target | 0 | Complete anonymization |
| Throughput | Variable | Records per second |

### 4.3 k6 Test Execution Matrix

| Test | Duration | Frequency | Environment | CI/CD |
|------|----------|-----------|-------------|-------|
| Race Condition | ~5 min | Weekly | Staging | Automated |
| Lock Contention | ~10 min | Weekly | Staging | Automated |
| Voice Throughput | ~10 min | Weekly | Staging | Automated |
| GDPR Deletion | ~60 min | Monthly | Sandbox | Manual |

### 4.4 k6 Metrics Reference

#### 4.4.1 Standard HTTP Metrics

| Metric | Description | Aggregation |
|--------|-------------|-------------|
| `http_req_duration` | Total request time | avg, min, med, max, p(90), p(95), p(99) |
| `http_req_blocked` | Time blocked | avg |
| `http_req_connecting` | TCP connection time | avg |
| `http_req_tls_handshaking` | TLS handshake time | avg |
| `http_req_sending` | Request send time | avg |
| `http_req_waiting` | Time to first byte | avg |
| `http_req_receiving` | Response receive time | avg |
| `http_req_failed` | Failed requests | rate |

#### 4.4.2 Custom Application Metrics

| Metric | Type | Purpose |
|--------|------|---------|
| `double_booking_detected` | Counter | Zero tolerance validation |
| `lock_wait_ms` | Trend | Advisory lock performance |
| `deadlock_detected` | Counter | Database health |
| `voice_response_time` | Trend | End-to-end latency |
| `lost_webhooks` | Counter | SQS DLQ monitoring |
| `deletion_job_duration` | Trend | GDPR compliance timing |
| `pii_leak_detected` | Counter | Data anonymization validation |

---

## 5. Test Coverage Requirements

### 5.1 Global Coverage Thresholds

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

| Metric | Global Threshold | Enforcement |
|--------|------------------|-------------|
| Branches | 85% | CI/CD gate |
| Functions | 90% | CI/CD gate |
| Lines | 90% | CI/CD gate |
| Statements | 90% | CI/CD gate |

### 5.2 Critical Path Coverage (95%)

```javascript
// Critical paths require 95% coverage
coverageThreshold: {
  './src/booking/**/*.ts': {
    branches: 95,
    functions: 95,
    lines: 95,
    statements: 95,
  },
  './src/encryption/**/*.ts': {
    branches: 95,
    functions: 95,
    lines: 95,
    statements: 95,
  },
  './src/gdpr/**/*.ts': {
    branches: 95,
    functions: 95,
    lines: 95,
    statements: 95,
  },
}
```

| Path | Branch | Function | Line | Statement |
|------|--------|----------|------|-----------|
| `src/booking/**/*.ts` | 95% | 95% | 95% | 95% |
| `src/encryption/**/*.ts` | 95% | 95% | 95% | 95% |
| `src/gdpr/**/*.ts` | 95% | 95% | 95% | 95% |

### 5.3 Coverage Exclusions

```javascript
collectCoverageFrom: [
  '../src/**/*.ts',
  '!../src/**/*.dto.ts',        // Data transfer objects
  '!../src/**/*.entity.ts',     // Database entities
  '!../src/**/*.module.ts',     // NestJS modules
  '!../src/main.ts',            // Application entry
  '!../src/**/*.spec.ts',       // Test files
],
```

### 5.4 CI/CD Integration

#### 5.4.1 GitHub Actions Workflow

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
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests with coverage
        run: npm run test:unit -- --coverage
      
      - name: Run integration tests
        run: npm run test:integration -- --coverage
      
      - name: Run security tests
        run: npm run test:security
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          fail_ci_if_error: true
          threshold: 90%
```

#### 5.4.2 Coverage Gates

| Gate | Condition | Action |
|------|-----------|--------|
| Unit Tests | Coverage < 90% | Block PR |
| Integration Tests | Coverage < 85% | Block PR |
| Critical Paths | Coverage < 95% | Block PR |
| Load Tests | Thresholds failed | Block release |

---

## 6. Operational Runbooks

### 6.1 Runbook Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     INCIDENT RESPONSE FLOW                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │ Detection│───▶│ Triage   │───▶│ Response │───▶│ Resolution│  │
│  │          │    │          │    │          │    │           │  │
│  │ PagerDuty│    │ Severity │    │ Runbook  │    │ Post-Mortem│  │
│  │ Alert    │    │ P0/P1/P2 │    │ Selected │    │            │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│                                       │                          │
│                    ┌──────────────────┼──────────────────┐       │
│                    │                  │                  │       │
│              ┌─────▼─────┐     ┌──────▼──────┐    ┌──────▼─────┐ │
│              │incident-  │     │gdpr-incident│    │ database-  │ │
│              │response.md│     │-response.md │    │ operations │ │
│              └───────────┘     └─────────────┘    └────────────┘ │
│                    │                  │                  │       │
│              ┌─────▼─────┐     ┌──────▼──────┐    ┌──────▼─────┐ │
│              │deployment │     │ gdpr-requests│   │ monitoring │ │
│              │   .md     │     │    .md      │    │    .md     │ │
│              └───────────┘     └─────────────┘    └────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Incident Response Runbook

#### 6.2.1 Severity Levels

| Level | Name | Response Time | Examples |
|-------|------|---------------|----------|
| P0 | Critical | 15 minutes | Complete outage, data loss, security breach |
| P1 | High | 1 hour | Major feature degraded, booking system down |
| P2 | Medium | 4 hours | Partial degradation, non-critical bugs |
| P3 | Low | 24 hours | Minor issues, feature requests |

#### 6.2.2 P0 Incident Response Flowchart

```
┌──────────────────────────────────────────────────────────────┐
│                    P0 INCIDENT DETECTED                       │
└────────────────────────────┬─────────────────────────────────┘
                             │
              ┌──────────────▼──────────────┐
              │  1. ACKNOWLEDGE (1 minute)  │
              │     - PagerDuty ack         │
              │     - Join #incidents       │
              └──────────────┬──────────────┘
                             │
              ┌──────────────▼──────────────┐
              │  2. ASSESS (5 minutes)      │
              │     - Check dashboards      │
              │     - Verify impact scope   │
              └──────────────┬──────────────┘
                             │
              ┌──────────────▼──────────────┐
              │  3. RESPOND (15 minutes)    │
              │     - Execute runbook       │
              │     - Page additional       │
              └──────────────┬──────────────┘
                             │
              ┌──────────────▼──────────────┐
              │  4. COMMUNICATE             │
              │     - Status updates        │
              │     - Stakeholder notify    │
              └──────────────┬──────────────┘
                             │
              ┌──────────────▼──────────────┐
              │  5. RESOLVE                 │
              │     - Apply fix             │
              │     - Verify restoration    │
              └──────────────┬──────────────┘
                             │
              ┌──────────────▼──────────────┐
              │  6. POST-INCIDENT           │
              │     - Timeline doc          │
              │     - Post-mortem           │
              └─────────────────────────────┘
```

#### 6.2.3 Escalation Matrix

| Time | Action | Contact |
|------|--------|---------|
| T+0 | Incident detected | On-call Engineer |
| T+15 min | P0 confirmed | Incident Commander |
| T+30 min | Engineering Lead notified | @eng-lead |
| T+1 hour | VP Engineering briefed | @vp-eng |
| T+4 hours | Executive update | CTO |

### 6.3 GDPR Incident Response Runbook

#### 6.3.1 Breach Severity Classification

| Level | Criteria | Response Time | Notification |
|-------|----------|---------------|--------------|
| CRITICAL | >10,000 subjects; sensitive data; ongoing | Immediate | DPA 24h, subjects immediate |
| HIGH | 1,000-10,000 subjects; financial data | 1 hour | DPA 48h, subjects 72h |
| MEDIUM | 100-1,000 subjects; limited data | 4 hours | DPA 72h if risk |
| LOW | <100 subjects; encrypted; no sensitive | 24 hours | Internal only |

#### 6.3.2 72-Hour Notification Timeline

```
T+0      T+15min   T+30min   T+1hr     T+4hr     T+24hr    T+72hr
 │         │         │         │         │         │         │
 ▼         ▼         ▼         ▼         ▼         ▼         ▼
Detect  Confirm   DPO      Legal    Notify    DPA      Subject
breach   breach   notify   counsel  exec      notify   notify
  │         │         │         │         │         │         │
  └─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘
                    72-HOUR NOTIFICATION WINDOW
```

#### 6.3.3 DPA Notification Requirements (Art. 33)

**Lead Authority:**
- **Garante per la Protezione dei Dati Personali**
- Email: garante@gpdp.it
- Web: https://www.garanteprivacy.it
- Phone: +39 06 696771

**Required Information:**
1. Nature of personal data breach
2. Name and contact details of DPO
3. Likely consequences of breach
4. Measures taken or proposed
5. Cross-border notification (if applicable)

### 6.4 GDPR Data Subject Requests

#### 6.4.1 Request Types and SLAs

| Type | Article | SLA | Description |
|------|---------|-----|-------------|
| Access | Art. 15 | 30 days | Provide copy of personal data |
| Deletion | Art. 17 | 30 days | Right to be Forgotten |
| Rectification | Art. 16 | 30 days | Correct inaccurate data |
| Portability | Art. 20 | 30 days | Machine-readable export |
| Restriction | Art. 18 | 30 days | Limit processing |

#### 6.4.2 Request Processing Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Request   │────▶│  Validate   │────▶│   Verify    │
│   Received  │     │   Identity  │     │   Identity  │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
┌─────────────┐     ┌─────────────┐     ┌──────▼──────┐
│   Confirm   │◀────│   Execute   │◀────│   Process   │
│ Completion  │     │   Request   │     │   Request   │
└─────────────┘     └─────────────┘     └─────────────┘
```

### 6.5 Database Operations Runbook

#### 6.5.1 Backup Architecture

```
┌─────────────────┐         ┌─────────────────┐
│  Primary DB     │◀───────▶│  Replica DB     │
│  (Read/Write)   │Streaming │  (Read Only)   │
└────────┬────────┘Replication└─────────────────┘
         │
    ┌────┴────┐
    │  Daily  │
    │ Backups │
    └────┬────┘
         │
    ┌────┴────┐
    │   S3    │
    │ Storage │
    └─────────┘
```

#### 6.5.2 Backup Schedule

| Type | Frequency | Retention | Method |
|------|-----------|-----------|--------|
| Full Backup | Daily 02:00 UTC | 30 days | pg_dump + S3 |
| WAL Archiving | Continuous | 30 days | Streaming |
| Cross-Region | Daily | 90 days | AWS Backup |
| Point-in-Time | On-demand | - | WAL replay |

### 6.6 Deployment Runbook

#### 6.6.1 Deployment Strategies

| Strategy | Use Case | Rollback Time | Risk Level |
|----------|----------|---------------|------------|
| Rolling | Standard releases | ~5 min | Low |
| Blue-Green | Major features | ~2 min | Medium |
| Canary | Gradual rollouts | ~1 min | Low |
| Hotfix | Critical fixes | ~1 min | High |

#### 6.6.2 Deployment Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   GitHub    │────▶│    CI/CD    │────▶│   Staging   │
│   Repo      │     │  (GitHub    │     │   Cluster   │
└─────────────┘     │  Actions)   │     └─────────────┘
                    └──────┬──────┘            │
                           │                    │
                    ┌──────▼──────┐     ┌──────▼──────┐
                    │   Docker    │     │   Promote   │
                    │   Build &   │     │   to Prod   │
                    │    Push     │     └──────┬──────┘
                    └─────────────┘            │
                                        ┌──────▼──────┐
                                        │ Production  │
                                        │  Cluster    │
                                        └─────────────┘
```

### 6.7 Monitoring Runbook

#### 6.7.1 Alert Response Matrix

| Alert | Severity | Response | Auto-Action |
|-------|----------|----------|-------------|
| Error Rate > 5% | P1 | Immediate | Page on-call |
| Latency > 2s | P1 | 15 min | Page on-call |
| DB Connections > 80% | P2 | 30 min | Slack alert |
| Disk Usage > 80% | P2 | 1 hour | Slack alert |
| Pod Restarts > 3/hr | P2 | 30 min | Slack alert |

#### 6.7.2 Key Metrics Dashboard

| Category | Metric | Warning | Critical |
|----------|--------|---------|----------|
| API | Error Rate | > 1% | > 5% |
| API | Response Time | > 500ms | > 2s |
| DB | Active Connections | > 80% | > 95% |
| DB | Query Duration | > 100ms | > 1s |
| DB | Replication Lag | > 5s | > 30s |
| Infra | CPU Usage | > 70% | > 90% |
| Infra | Memory Usage | > 80% | > 95% |
| Infra | Disk Usage | > 80% | > 90% |

---

## 7. Disaster Recovery

### 7.1 DR Scenario Matrix

| Scenario | RTO Target | RPO Target | Recovery Method |
|----------|------------|------------|-----------------|
| Single AZ Failure | < 3 min | 0 | Multi-AZ failover |
| Regional Failure | < 4 hours | < 24 hours | Cross-region DR |
| Database Corruption | < 1 hour | < 1 hour | Point-in-time restore |
| Ransomware Attack | < 8 hours | < 24 hours | Clean backup restore |
| Complete Data Center | < 4 hours | < 24 hours | Cross-region DR |

### 7.2 RTO/RPO by Scenario

```
┌──────────────────────────────────────────────────────────────────┐
│                    RECOVERY OBJECTIVES                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Multi-AZ Failover          RTO: 3 min    RPO: 0                  │
│  ████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    │
│                                                                   │
│  Database Corruption        RTO: 1 hour   RPO: 1 hour            │
│  ████████████████████████████████████████░░░░░░░░░░░░░░░░░░░░    │
│                                                                   │
│  Cross-Region DR            RTO: 4 hours  RPO: 24 hours          │
│  ██████████████████████████████████████████████████████████░░    │
│                                                                   │
│  Ransomware Recovery        RTO: 8 hours  RPO: 24 hours          │
│  ████████████████████████████████████████████████████████████    │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 7.3 Multi-AZ Failover Procedure

```bash
# 1. Enable maintenance mode (read-only)
aws rds modify-db-parameter-group \
  --db-parameter-group-name mechmind-prod-postgres-params \
  --parameters ParameterName=default_transaction_read_only,ParameterValue=on

# 2. Force failover
aws rds reboot-db-instance \
  --db-instance-identifier mechmind-prod-postgres \
  --force-failover

# 3. Monitor failover progress
watch -n 5 'aws rds describe-db-instances \
  --db-instance-identifier mechmind-prod-postgres \
  --query "DBInstances[0].[DBInstanceStatus,AvailabilityZone]"'

# 4. Verify new primary
aws rds describe-db-instances \
  --db-instance-identifier mechmind-prod-postgres \
  --query 'DBInstances[0].[AvailabilityZone,Endpoint.Address]'

# 5. Disable maintenance mode
aws rds modify-db-parameter-group \
  --db-parameter-group-name mechmind-prod-postgres-params \
  --parameters ParameterName=default_transaction_read_only,ParameterValue=off
```

### 7.4 Cross-Region DR Activation

```bash
#!/bin/bash
# Cross-Region DR Activation

DR_REGION="eu-west-1"
SOURCE_REGION="us-east-1"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo "=== DR ACTIVATION - $TIMESTAMP ==="

# Step 1: Identify latest cross-region backup
LATEST_BACKUP=$(aws backup list-recovery-points-by-backup-vault \
  --backup-vault-name mechmind-dr-vault \
  --region $DR_REGION \
  --query 'sort_by(RecoveryPoints, &CreationDate)[-1].RecoveryPointArn' \
  --output text)

# Step 2: Restore database in DR
aws backup start-restore-job \
  --recovery-point-arn $LATEST_BACKUP \
  --metadata file://dr-restore-metadata.json \
  --iam-role-arn arn:aws:iam::${ACCOUNT_ID}:role/AWSBackupDefaultServiceRole \
  --region $DR_REGION

# Step 3: Activate Lambda functions
for func in api-main worker-booking worker-notification voice-handler; do
  aws lambda update-function-configuration \
    --function-name mechmind-prod-$func \
    --region $DR_REGION \
    --environment Variables="{ENVIRONMENT=prod,DR_MODE=active}"
done
```

### 7.5 DR Drill Schedule

| Frequency | Test Type | Duration | Participants |
|-----------|-----------|----------|--------------|
| Weekly | Automated Restore | 30 min | Automated |
| Monthly | Backup Integrity | 1 hour | SRE Team |
| Quarterly | Full Failover | 4 hours | Platform Team |
| Bi-Annually | Cross-Region DR | 8 hours | Full Engineering |
| Annually | Ransomware Drill | 1 day | Full Organization |

### 7.6 2026 DR Calendar

| Month | Activity | Owner |
|-------|----------|-------|
| January | Q1 Failover Simulation | Platform Team |
| March | Bi-Annual DR Drill | Full Engineering |
| April | Q2 Failover Simulation | Platform Team |
| June | Q3 Failover Simulation | Platform Team |
| September | Bi-Annual DR Drill | Full Engineering |
| October | Annual Ransomware Drill | Full Organization |
| December | Year-end DR Review | Platform Lead |

---

## 8. Production Readiness Checklist

### 8.1 Security Validation

| # | Check | Status | Evidence |
|---|-------|--------|----------|
| 1 | OWASP Top 10 tests passing | ☐ | `npm run test:security:owasp` |
| 2 | GDPR compliance tests passing | ☐ | `npm run test:security:gdpr` |
| 3 | PII encryption validated | ☐ | AES-256-GCM implementation |
| 4 | RLS policies enabled | ☐ | Tenant isolation verified |
| 5 | Secrets management configured | ☐ | Kubernetes secrets |
| 6 | HTTPS enforced | ☐ | Load balancer configuration |
| 7 | Security headers present | ☐ | HSTS, CSP, X-Frame-Options |
| 8 | Rate limiting enabled | ☐ | 429 responses validated |

### 8.2 Performance Benchmarks

| # | Check | Target | Validation |
|---|-------|--------|------------|
| 1 | Race condition test | 0 double bookings | k6 test |
| 2 | Advisory lock wait | < 50ms p99 | k6 metrics |
| 3 | API response time | < 500ms p95 | k6 test |
| 4 | Voice response time | < 2s p99 | k6 test |
| 5 | Database query time | < 100ms p95 | Query analysis |
| 6 | Load test pass rate | > 99% | k6 thresholds |
| 7 | Concurrent user support | 1000 VUs | k6 test |

### 8.3 Compliance Verification

| # | Check | Requirement | Evidence |
|---|-------|-------------|----------|
| 1 | GDPR Art. 33 | Breach notification process | Runbook documented |
| 2 | GDPR Art. 15-17 | Data subject rights | API endpoints tested |
| 3 | Data retention | 7 years max | Configuration validated |
| 4 | Audit logging | All data access logged | Audit table verified |
| 5 | Encryption at rest | AES-256 | Database configuration |
| 6 | Encryption in transit | TLS 1.3 | Certificate validation |

### 8.4 Monitoring Setup

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | Metrics collection | ☐ | Prometheus/Grafana |
| 2 | Alerting rules | ☐ | PagerDuty integration |
| 3 | Log aggregation | ☐ | Datadog/ELK |
| 4 | Distributed tracing | ☐ | Jaeger/Zipkin |
| 5 | Synthetic monitoring | ☐ | Uptime checks |
| 6 | Error tracking | ☐ | Sentry integration |
| 7 | Performance dashboards | ☐ | Grafana configured |

### 8.5 Documentation Completeness

| Document | Status | Location |
|----------|--------|----------|
| API Documentation | ☐ | `/docs/api` |
| Runbooks | ☐ | `/docs/runbooks` |
| Architecture Diagrams | ☐ | `/docs/architecture` |
| Deployment Guide | ☐ | `/docs/deployment` |
| Security Procedures | ☐ | `/docs/security` |
| DR Procedures | ☐ | `/docs/dr` |
| On-Call Playbook | ☐ | `/docs/oncall` |

---

## 9. Appendices

### Appendix A: Test Execution Commands

```bash
# Unit Tests
npm run test:unit
npm run test:unit -- --coverage
npm run test:unit -- booking.service.spec.ts

# Integration Tests
npm run test:integration
npm run test:integration -- --coverage

# Security Tests
npm run test:security
npm run test:security -- owasp.security.spec.ts

# Load Tests (k6)
k6 run tests/load/k6/race-condition-test.js
k6 run tests/load/k6/lock-contention-test.js
k6 run tests/load/k6/voice-throughput-test.js
k6 run tests/load/k6/gdpr-deletion-test.js

# All Tests
npm test
```

### Appendix B: Environment Configuration

| Variable | Local | Staging | Production |
|----------|-------|---------|------------|
| `DB_HOST` | localhost | postgres-staging.mechmind.internal | postgres.mechmind.internal |
| `DB_NAME` | mechmind_test | mechmind_staging | mechmind_prod |
| `JWT_SECRET` | test-secret | staging-secret | prod-secret |
| `ENCRYPTION_KEY` | test-key | staging-key | prod-key |
| `VOICE_WEBHOOK_SECRET` | test-webhook-secret | staging-webhook | prod-webhook |

### Appendix C: Regulatory Contacts

| Authority | Jurisdiction | Contact | Emergency |
|-----------|--------------|---------|-----------|
| Garante | Italy | garante@gpdp.it | +39 06 696771 |
| CNIL | France | accueil@cnil.fr | +33 1 53 73 22 22 |
| ICO | UK | casework@ico.org.uk | +44 303 123 1113 |
| BfDI | Germany | mailbox@bfdi.bund.de | +49 228 997799-0 |

### Appendix D: Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-28 | Platform Team | Initial release |

---

**Document Owner:** Platform Engineering & SRE Teams  
**Next Review Date:** 2026-05-28  
**Classification:** INTERNAL USE ONLY

---

*This document is part of MechMind OS v10 Enterprise Documentation Suite*
