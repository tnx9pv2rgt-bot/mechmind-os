# MechMind OS Test Suite

This directory contains comprehensive test suites for MechMind OS, including unit tests and integration tests.

## Test Structure

```
backend/
├── src/common/__tests__/          # Unit tests for CommonModule
│   ├── encryption.service.spec.ts # Encryption service tests
│   ├── prisma.service.spec.ts     # Prisma service tests (RLS, transactions)
│   └── tenant.guard.spec.ts       # Tenant guard tests
├── tests/integration/             # Integration tests
│   ├── booking-race-condition.spec.ts  # Concurrent booking tests
│   ├── rls-isolation.spec.ts           # Row Level Security tests
│   ├── gdpr-deletion.spec.ts           # GDPR compliance tests
│   └── booking-flow.spec.ts            # Full booking workflow tests
└── test/                          # Test setup files
    ├── setup.ts                   # Unit test setup
    └── setup-integration.ts       # Integration test setup
```

## Unit Tests

### Running Unit Tests

```bash
# Run all unit tests
npm test

# Run with coverage
npm run test:cov

# Run specific module tests
npm run test -- common --coverage

# Watch mode
npm run test:watch
```

### Unit Test Coverage

- **encryption.service.spec.ts**: 100% coverage
  - Constructor validation
  - Encrypt/decrypt functionality
  - Wrong key rejection
  - Hash operations
  - Field encryption/decryption
  
- **prisma.service.spec.ts**: 100% coverage
  - RLS context setting
  - Tenant context management
  - Serializable transactions
  - Transaction retry logic
  - Advisory locks
  
- **tenant.guard.spec.ts**: 100% coverage
  - Tenant validation
  - Unauthorized blocking
  - UUID format validation
  - Cross-tenant access prevention

## Integration Tests

### Prerequisites

1. Docker with PostgreSQL and Redis running:
```bash
docker-compose up -d postgres redis
```

2. Database `mechmind_test` created:
```bash
npx prisma migrate dev --name init
```

### Running Integration Tests

```bash
# Run all integration tests
npm run test:integration

# Run with coverage
npm run test:integration:cov

# Run specific integration test
npm run test:integration -- booking-race-condition
```

### Integration Test Coverage

#### 1. Booking Race Condition Test (`booking-race-condition.spec.ts`)

Tests concurrent booking creation with real database:
- **100 concurrent requests** on the same slot
- Expected: Exactly **1 success** (201), **99 conflicts** (409)
- Verifies advisory locks prevent double-booking
- Tests SERIALIZABLE transaction retry logic
- Database verification: Only 1 booking created

#### 2. RLS Isolation Test (`rls-isolation.spec.ts`)

Verifies Row Level Security policies:
- Tenant-1 data invisible to tenant-2
- Cross-tenant queries return no results
- RLS enforced on SELECT, UPDATE, DELETE
- Raw query RLS enforcement
- withTenant() helper functionality

#### 3. GDPR Deletion Test (`gdpr-deletion.spec.ts`)

Tests GDPR compliance (Right to Erasure):
- Real encryption of PII before deletion
- PII fields anonymized (encrypted 'DELETED')
- Customer record preserved for referential integrity
- Phone hash retained for audit purposes
- Related bookings/vehicles preserved

#### 4. Full Booking Flow Test (`booking-flow.spec.ts`)

End-to-end booking workflow:
1. Customer creation with encrypted PII
2. Vehicle registration
3. Slot availability check
4. Booking reservation with advisory lock
5. Booking confirmation
6. Booking update
7. Booking cancellation
8. Slot availability restoration
9. Data integrity verification

## Test Commands Summary

```bash
# Unit tests
npm test                          # Run all unit tests
npm run test:cov                  # Run with coverage
npm run test:common               # Run CommonModule tests

# Integration tests
npm run test:integration          # Run all integration tests
npm run test:integration:cov      # Run with coverage

# All tests
npm test && npm run test:integration
```

## Environment Variables

Unit tests use mocked environment variables defined in `test/setup.ts`.

Integration tests require:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_HOST` / `REDIS_PORT`: Redis connection
- `ENCRYPTION_KEY`: 32+ character encryption key
- `ENCRYPTION_IV`: 16 character IV

## Coverage Requirements

- **Branches**: 100%
- **Functions**: 100%
- **Lines**: 100%
- **Statements**: 100%

## CI/CD Integration

```yaml
# Example GitHub Actions workflow
- name: Run Unit Tests
  run: npm run test:common -- --coverage

- name: Run Integration Tests
  run: npm run test:integration
  env:
    DATABASE_URL: postgresql://postgres:postgres@localhost:5432/mechmind_test
```

## Troubleshooting

### Database Connection Issues

Ensure PostgreSQL is running and accessible:
```bash
psql postgresql://postgres:postgres@localhost:5432/mechmind_test -c "SELECT 1"
```

### Redis Connection Issues

Ensure Redis is running:
```bash
redis-cli ping  # Should return PONG
```

### Migration Issues

If tests fail due to schema changes:
```bash
npx prisma migrate reset --force
npx prisma generate
```
