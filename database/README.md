# MechMind OS v10 - Database Schema

Multi-tenant SaaS Database for Automotive Repair Shops with AI Voice Booking

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         MechMind OS v10 Database                        │
├─────────────────────────────────────────────────────────────────────────┤
│  Multi-Tenancy: Bridge Model (Schema-per-tenant + RLS fallback)        │
│  Data Consistency: CQRS + Event Sourcing (booking/payment path)        │
│  PII Encryption: pgcrypto AES-256                                       │
│  Race Condition Prevention: Advisory Locks + SERIALIZABLE fallback     │
└─────────────────────────────────────────────────────────────────────────┘
```

## File Structure

```
mechmind-os/database/
├── prisma/
│   ├── schema.prisma              # Complete Prisma schema with all models
│   ├── seed.sql                   # Sample data for development
│   └── migrations/
│       ├── 000000000000_init/     # Initial migration - all tables
│       │   └── migration.sql
│       ├── 000000000001_rls_policies/  # RLS policies
│       │   └── migration.sql
│       ├── 000000000002_pgcrypto_encryption/  # PII encryption
│       │   └── migration.sql
│       └── 000000000003_exclusion_constraints/  # Race condition prevention
│           └── migration.sql
└── src/
    └── db/
        ├── encryption.ts          # PII encryption utilities
        └── rls.ts                 # RLS middleware & helpers
```

## Quick Start

### 1. Install Dependencies

```bash
npm install @prisma/client prisma
```

### 2. Configure Environment

```bash
# .env
DATABASE_URL="postgresql://user:password@localhost:5432/mechmind_os"
```

### 3. Run Migrations

```bash
# Apply all migrations
npx prisma migrate dev

# Or apply SQL migrations directly
psql $DATABASE_URL -f prisma/migrations/000000000000_init/migration.sql
psql $DATABASE_URL -f prisma/migrations/000000000001_rls_policies/migration.sql
psql $DATABASE_URL -f prisma/migrations/000000000002_pgcrypto_encryption/migration.sql
psql $DATABASE_URL -f prisma/migrations/000000000003_exclusion_constraints/migration.sql
```

### 4. Seed Database

```bash
psql $DATABASE_URL -f prisma/seed.sql
```

### 5. Generate Prisma Client

```bash
npx prisma generate
```

## Database Schema

### Core Tables

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `tenants` | Multi-tenant root | UUID PK, subscription tier, encryption key ref |
| `tenant_users` | User management | Auth0 integration, role-based access |
| `booking_slots` | Time slot management | EXCLUSION constraint prevents double-booking |
| `booking_events` | Event store (CQRS) | Immutable log, JSONB payload, references to PII |
| `bookings` | Booking records | Links slots, customers, vehicles |
| `customers_encrypted` | PII storage | AES-256 encrypted fields, GDPR compliance |
| `vehicles` | Vehicle registry | License plate uniqueness per tenant |
| `invoices` | Billing records | Payment tracking, tax calculation |
| `daily_metrics` | Analytics | Pre-aggregated metrics for dashboards |
| `audit_log` | Compliance | All data changes logged with IP/user |

### Entity Relationship Diagram

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────────┐
│   tenants   │────▶│  tenant_users   │     │ encryption_keys  │
└──────┬──────┘     └─────────────────┘     └──────────────────┘
       │
       │    ┌────────────────────────────────────────────────────┐
       │    │                                                    │
       ▼    ▼                                                    │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐│
│  booking_slots  │◀───│  booking_events │    │     bookings    ││
└────────┬────────┘    └─────────────────┘    └────────┬────────┘│
         │                                             │         │
         │         ┌─────────────────┐                 │         │
         │         │ customers_encrypted│◀─────────────┘         │
         │         └────────┬────────┘                          │
         │                  │                                   │
         │         ┌────────▼────────┐    ┌─────────────────┐   │
         └────────▶│    vehicles     │    │    invoices     │   │
                   └─────────────────┘    └─────────────────┘   │
                                                                │
                   ┌─────────────────┐    ┌─────────────────┐   │
                   │  daily_metrics  │    │   audit_log     │◀──┘
                   └─────────────────┘    └─────────────────┘
```

## Multi-Tenancy (RLS)

### How It Works

1. **Set Tenant Context** before queries:
```typescript
await prisma.$executeRaw`SET app.current_tenant = 'tenant-uuid'`;
```

2. **RLS Policies** automatically filter rows:
```sql
CREATE POLICY tenant_isolation ON bookings
  USING (tenant_id = current_setting('app.current_tenant')::UUID);
```

3. **Bypass for Admin** operations:
```typescript
await prisma.$executeRaw`SET app.bypass_rls = 'true'`;
```

### Using RLS Utilities

```typescript
import { RLSManager, extendPrismaWithRLS } from './src/db/rls';

// Extend Prisma with RLS
const prisma = extendPrismaWithRLS(new PrismaClient());

// Execute within tenant context
const result = await prisma.$rls.withTenant('tenant-uuid', async () => {
  return prisma.bookings.findMany();
});

// Admin operations (cross-tenant)
const allTenants = await prisma.$rls.withAdminAccess(async () => {
  return prisma.tenants.findMany();
});
```

## PII Encryption

### Encryption Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Plaintext     │────▶│  pgcrypto AES   │────▶│  Encrypted      │
│   (phone/email) │     │  256-CBC + IV   │     │  BYTEA          │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Using Encryption Service

```typescript
import { createEncryptionService } from './src/db/encryption';

const encryptionService = createEncryptionService(prisma, 'demo');

// Create encrypted customer
const customerId = await encryptionService.createEncryptedCustomer(
  'tenant-uuid',
  {
    phone: '+1-555-0100',
    email: 'customer@example.com',
    name: 'John Doe',
    gdprConsent: true,
  }
);

// Decrypt customer data
const customer = await encryptionService.decryptCustomer(
  'tenant-uuid',
  customerId
);
// Returns: { id, phone, email, name, ... }

// GDPR anonymization
await encryptionService.anonymizeCustomer('tenant-uuid', customerId);
```

### SQL Encryption Functions

```sql
-- Encrypt data
SELECT encrypt_pii('sensitive data', 'encryption-key');

-- Decrypt data
SELECT decrypt_pii(encrypted_bytea, 'encryption-key');

-- Create encrypted customer
SELECT create_encrypted_customer(
  'tenant-uuid'::uuid,
  '+1-555-0100',
  'email@example.com',
  'Customer Name',
  'encryption-key',
  true  -- gdpr_consent
);
```

## Event Sourcing (CQRS)

### Event Store Pattern

```sql
-- Events are immutable and reference PII, never contain it
INSERT INTO booking_events (
  tenant_id,
  slot_id,
  event_type,
  event_data
) VALUES (
  'tenant-uuid',
  'slot-uuid',
  'BOOKING_CREATED',
  '{
    "booking_id": "...",
    "customer_id": "...",  -- Reference only!
    "timestamp": "..."
  }'::jsonb
);
```

### Event Types

| Event Type | Description |
|------------|-------------|
| `SLOT_CREATED` | New booking slot available |
| `SLOT_BOOKED` | Slot reserved |
| `SLOT_CANCELLED` | Slot released |
| `BOOKING_CREATED` | New booking confirmed |
| `BOOKING_CONFIRMED` | Booking status updated |
| `BOOKING_CANCELLED` | Booking cancelled |
| `PAYMENT_INITIATED` | Payment started |
| `PAYMENT_COMPLETED` | Payment successful |
| `PAYMENT_FAILED` | Payment error |
| `PAYMENT_REFUNDED` | Refund processed |

### Reconstructing State

```sql
-- Get all events for a slot (event sourcing)
SELECT * FROM booking_events
WHERE slot_id = 'slot-uuid'
ORDER BY created_at ASC;

-- Rebuild booking state from events
SELECT 
  slot_id,
  event_type,
  event_data,
  created_at
FROM booking_events
WHERE tenant_id = 'tenant-uuid'
  AND created_at > NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;
```

## Race Condition Prevention

### Advisory Locks

```typescript
// Acquire lock before booking
const locked = await prisma.$queryRaw`
  SELECT acquire_booking_lock_with_timeout(
    ${tenantId}::uuid,
    ${slotId}::uuid,
    5  -- timeout seconds
  )
`;

if (locked) {
  // Safe to book - no other process can modify this slot
  await createBooking(...);
  
  // Release lock
  await prisma.$queryRaw`
    SELECT release_booking_lock(${tenantId}::uuid, ${slotId}::uuid)
  `;
}
```

### Using Transaction Functions

```typescript
// Built-in locking function
const result = await prisma.$queryRaw`
  SELECT * FROM book_slot_with_lock(
    ${tenantId}::uuid,
    ${slotId}::uuid,
    ${customerId}::uuid,
    ${vehicleId}::uuid,
    60  -- estimated minutes
  )
`;
// Returns: { booking_id, success, message }
```

### EXCLUSION Constraint

```sql
-- Prevents overlapping slots at database level
ALTER TABLE booking_slots
  ADD CONSTRAINT no_overlapping_slots
  EXCLUDE USING GIST (
    tenant_id WITH =,
    mechanic_id WITH =,
    slot_date WITH =,
    tsrange(slot_start::time, slot_end::time) WITH &&
  );
```

## GDPR Compliance

### Features

| Feature | Implementation |
|---------|---------------|
| Right to Erasure | `anonymize_customer()` function |
| Data Retention | `enforce_data_retention()` scheduled job |
| Consent Tracking | `gdpr_consent` + `gdpr_consent_date` fields |
| Audit Trail | `audit_log` table tracks all changes |
| Data Export | `exportCustomerData()` for portability |

### Anonymization

```sql
-- GDPR right to erasure
SELECT anonymize_customer('customer-uuid', 'encryption-key');

-- This will:
-- 1. Replace PII with anonymized placeholders
-- 2. Mark customer as deleted
-- 3. Anonymize related booking events
-- 4. Soft-delete (retain for legal requirements)
```

### Data Retention

```sql
-- Enforce retention policies (run daily via cron)
SELECT enforce_data_retention();

-- Check customers pending deletion
SELECT * FROM customers_encrypted
WHERE is_deleted = false
  AND gdpr_consent = true
  AND created_at < NOW() - (data_retention_days || ' days')::interval;
```

## Performance Optimization

### Indexes

All tables have optimized indexes for common query patterns:

```sql
-- Booking lookups by tenant + status
CREATE INDEX idx_bookings_tenant_status ON bookings(tenant_id, status);

-- Slot availability queries
CREATE INDEX idx_booking_slots_tenant_mechanic_date 
  ON booking_slots(tenant_id, mechanic_id, slot_date);

-- Event sourcing queries
CREATE INDEX idx_booking_events_tenant_type_created 
  ON booking_events(tenant_id, event_type, created_at);

-- GDPR compliance queries
CREATE INDEX idx_customers_tenant_deleted ON customers_encrypted(tenant_id, is_deleted);
```

### Materialized Views

```sql
-- Available slots (pre-filtered)
CREATE VIEW available_slots AS
SELECT * FROM booking_slots WHERE status = 'available';

-- Booking summary (no PII)
CREATE VIEW booking_summary AS
SELECT b.*, bs.slot_date, bs.slot_start, bs.slot_end
FROM bookings b
JOIN booking_slots bs ON b.slot_id = bs.id;
```

## Testing

### Run Tests with Seed Data

```bash
# Reset and seed database
psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
psql $DATABASE_URL -f prisma/migrations/000000000000_init/migration.sql
psql $DATABASE_URL -f prisma/migrations/000000000001_rls_policies/migration.sql
psql $DATABASE_URL -f prisma/migrations/000000000002_pgcrypto_encryption/migration.sql
psql $DATABASE_URL -f prisma/migrations/000000000003_exclusion_constraints/migration.sql
psql $DATABASE_URL -f prisma/seed.sql
```

### Sample Queries

```sql
-- Get available slots for a mechanic
SELECT * FROM available_slots
WHERE mechanic_id = 'mechanic-uuid'
  AND slot_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7;

-- Get customer bookings (with RLS)
SET app.current_tenant = 'tenant-uuid';
SELECT * FROM bookings
WHERE customer_id = 'customer-uuid'
ORDER BY created_at DESC;

-- Get booking event history
SELECT * FROM booking_events
WHERE slot_id = 'slot-uuid'
ORDER BY created_at ASC;

-- Daily revenue metrics
SELECT 
  metric_date,
  bookings_count,
  revenue_cents / 100.0 as revenue_dollars
FROM daily_metrics
WHERE tenant_id = 'tenant-uuid'
ORDER BY metric_date DESC
LIMIT 30;
```

## Security Checklist

- [ ] RLS policies enabled on all tenant-scoped tables
- [ ] PII encrypted with AES-256
- [ ] Encryption keys stored in external KMS
- [ ] Audit logging enabled
- [ ] Advisory locks for booking operations
- [ ] EXCLUSION constraints prevent double-booking
- [ ] GDPR consent tracking implemented
- [ ] Data retention policies enforced
- [ ] Connection pooling with tenant isolation
- [ ] Query logging for security monitoring

## License

Proprietary - MechMind OS v10
