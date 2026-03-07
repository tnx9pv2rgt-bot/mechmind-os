# MechMind OS v10 - Backend Architecture Documentation

> **Document Version**: 10.0.0  
> **Last Updated**: 2026-02-28  
> **Classification**: Internal Technical Specification  
> **Owner**: Platform Engineering Team

---

## 1. Executive Summary

MechMind OS v10 is a multi-tenant SaaS platform built on **NestJS** with **PostgreSQL** and **Redis**, designed for automotive repair shop management with AI-powered voice booking capabilities. This document provides comprehensive technical documentation of the backend architecture, design patterns, and operational considerations.

### 1.1 Key Architectural Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| **NestJS Framework** | Enterprise-grade TypeScript framework with excellent DI, modular architecture | Learning curve for new developers |
| **PostgreSQL with RLS** | ACID compliance + native row-level security for multi-tenancy | Complex RLS policy management |
| **Prisma ORM** | Type-safe database access with excellent migration support | Performance overhead vs raw SQL |
| **BullMQ** | Redis-backed job queues with reliability guarantees | Redis dependency for job processing |
| **Serializable Transactions** | Guarantees isolation for concurrent booking operations | Performance impact under high load |

---

## 2. System Architecture

### 2.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  Web App     │  │ Mobile App   │  │ Vapi Voice   │  │ Partner API  │   │
│  │  (Next.js)   │  │ (React Native)│ │  Webhooks    │  │   Clients    │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
└─────────┼─────────────────┼─────────────────┼─────────────────┼───────────┘
          │                 │                 │                 │
          └─────────────────┴────────┬────────┴─────────────────┘
                                     │
┌────────────────────────────────────┼──────────────────────────────────────┐
│                              API GATEWAY                                     │
│  ┌─────────────────────────────────┼──────────────────────────────────┐  │
│  │      AWS Application Load Balancer / Kong / Nginx                  │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────────────────┐  │  │
│  │  │ Rate Limit  │  │  JWT Auth   │  │   CORS / Security Headers │  │  │
│  │  └─────────────┘  └─────────────┘  └───────────────────────────┘  │  │
│  └─────────────────────────────────┼──────────────────────────────────┘  │
└────────────────────────────────────┼──────────────────────────────────────┘
                                     │
┌────────────────────────────────────┼──────────────────────────────────────┐
│                         NESTJS APPLICATION LAYER                             │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    GLOBAL MIDDLEWARE PIPELINE                        │   │
│  │  ┌─────────────┐ → ┌─────────────┐ → ┌─────────────┐ → ┌──────────┐ │   │
│  │  │   Helmet    │   │    CORS     │   │  Compression│   │  Swagger │ │   │
│  │  └─────────────┘   └─────────────┘   └─────────────┘   └──────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                       │
│  ┌───────────────────────────────────┼───────────────────────────────────┐  │
│  │                     TENANT CONTEXT MIDDLEWARE                         │  │
│  │                    (JWT Extraction → RLS Context)                      │  │
│  └───────────────────────────────────┼───────────────────────────────────┘  │
│                                      │                                       │
│  ┌───────────────────────────────────┼───────────────────────────────────┐  │
│  │                      FEATURE MODULES                                   │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐      │  │
│  │  │   Auth     │  │  Booking   │  │  Customer  │  │   Voice    │      │  │
│  │  │   Module   │  │   Module   │  │   Module   │  │   Module   │      │  │
│  │  │            │  │            │  │            │  │            │      │  │
│  │  │ • JWT Auth │  │ • Advisory │  │ • PII      │  │ • Vapi     │      │  │
│  │  │ • RBAC     │  │   Locks    │  │   Encrypt  │  │   Webhooks │      │  │
│  │  │ • Tenant   │  │ • Slots    │  │ • GDPR     │  │ • Intent   │      │  │
│  │  │   Context  │  │ • Events   │  │   Service  │  │   Handler  │      │  │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘      │  │
│  │                                                                      │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐                      │  │
│  │  │    GDPR    │  │  Analytics │  │   Common   │                      │  │
│  │  │   Module   │  │   Module   │  │   Module   │                      │  │
│  │  │            │  │            │  │  (Global)  │                      │  │
│  │  │ • Deletion │  │ • CAC/LTV  │  │            │                      │  │
│  │  │ • Export   │  │ • Churn    │  │ • Prisma   │                      │  │
│  │  │ • Consent  │  │ • Unit Econ│  │ • BullMQ   │                      │  │
│  │  └────────────┘  └────────────┘  └────────────┘                      │  │
│  └───────────────────────────────────┼───────────────────────────────────┘  │
│                                      │                                       │
│  ┌───────────────────────────────────┼───────────────────────────────────┐  │
│  │                    EVENT-DRIVEN ARCHITECTURE                          │  │
│  │              (EventEmitter2 → Async Job Queue Processing)             │  │
│  └───────────────────────────────────┼───────────────────────────────────┘  │
└──────────────────────────────────────┼──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────┼──────────────────────────────────────┐
│                         DATA & MESSAGE LAYER                                 │
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │   PostgreSQL    │  │     Redis       │  │    External Services        │  │
│  │   (Primary DB)  │  │  (BullMQ/Cache) │  │                             │  │
│  │                 │  │                 │  │  ┌─────────────────────┐    │  │
│  │ ┌─────────────┐ │  │ ┌─────────────┐ │  │  │    Vapi AI Voice    │    │  │
│  │ │  RLS Enabled│ │  │ │   Booking   │ │  │  │  ┌───────────────┐  │    │  │
│  │ │  Encrypted  │ │  │ │    Queue    │ │  │  │  │ Call Handling │  │    │  │
│  │ │    PII      │ │  │ └─────────────┘ │  │  │  │ Intent Recog. │  │    │  │
│  │ └─────────────┘ │  │ ┌─────────────┐ │  │  │  └───────────────┘  │    │  │
│  │ ┌─────────────┐ │  │ │   GDPR      │ │  │  └─────────────────────┘    │  │
│  │ │ Serializable│ │  │ │  Deletion   │ │  │  ┌─────────────────────┐    │  │
│  │ │ Transactions│ │  │ │   Queue     │ │  │  │      Twilio         │    │  │
│  │ └─────────────┘ │  │ └─────────────┘ │  │  │  ┌───────────────┐  │    │  │
│  │ ┌─────────────┐ │  │ ┌─────────────┐ │  │  │  │     SMS       │  │    │  │
│  │ │ Advisory    │ │  │ │   Voice     │ │  │  │  │   Fallback    │  │    │  │
│  │ │ Locks       │ │  │ │   Queue     │ │  │  │  └───────────────┘  │    │  │
│  │ └─────────────┘ │  │ └─────────────┘ │  │  └─────────────────────┘    │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Module Dependency Graph

```
                         ┌─────────────────┐
                         │   AppModule     │
                         │   (Root)        │
                         └────────┬────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CommonModule  │    │  AuthModule     │    │ BookingModule   │
│   (Global)      │◄───│  (Core)         │◄───│  (Feature)      │
│                 │    │                 │    │                 │
│ • PrismaService │    │ • JWT Strategy  │    │ • BookingService│
│ • QueueService  │    │ • Roles Guard   │    │ • Slot Service  │
│ • EncryptSvc    │    │ • Tenant Mid.   │    │ • Event Listener│
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                      │                      │
         │    ┌─────────────────┴──────────────────────┘
         │    │
         │    ▼
         │ ┌─────────────────┐    ┌─────────────────┐
         │ │ CustomerModule  │    │   VoiceModule   │
         │ │  (Feature)      │    │  (Feature)      │
         │ │                 │    │                 │
         │ │ • Customer Svc  │    │ • Vapi Webhook  │
         │ │ • GdprService   │    │ • Intent Handler│
         │ │ • Vehicle Svc   │    │ • EscalationSvc │
         │ └────────┬────────┘    └─────────────────┘
         │          │
         │          ▼
         │ ┌─────────────────┐    ┌─────────────────┐
         │ │   GdprModule    │    │ AnalyticsModule │
         └►│  (Feature)      │    │  (Feature)      │
           │                 │    │                 │
           │ • Deletion Svc  │    │ • Unit Econ Svc │
           │ • Export Svc    │    │ • Metrics Ctrl  │
           │ • Retention Svc │    │                 │
           └─────────────────┘    └─────────────────┘
```

---

## 3. NestJS Application Structure

### 3.1 Directory Structure

```
mechmind-os/backend/
├── src/
│   ├── main.ts                      # Application entry point
│   ├── app.module.ts                # Root module with global config
│   │
│   ├── auth/                        # Authentication & Authorization
│   │   ├── auth.module.ts
│   │   ├── controllers/
│   │   │   └── auth.controller.ts
│   │   ├── services/
│   │   │   └── auth.service.ts
│   │   ├── strategies/
│   │   │   └── jwt.strategy.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   ├── roles.decorator.ts
│   │   └── middleware/
│   │       └── tenant-context.middleware.ts
│   │
│   ├── booking/                     # Booking Management
│   │   ├── booking.module.ts
│   │   ├── controllers/
│   │   │   └── booking.controller.ts
│   │   ├── services/
│   │   │   ├── booking.service.ts
│   │   │   └── booking-slot.service.ts
│   │   ├── listeners/
│   │   │   └── booking-event.listener.ts
│   │   └── dto/
│   │       ├── create-booking.dto.ts
│   │       └── booking-slot.dto.ts
│   │
│   ├── customer/                    # Customer & GDPR
│   │   ├── customer.module.ts
│   │   ├── controllers/
│   │   │   └── customer.controller.ts
│   │   ├── services/
│   │   │   ├── customer.service.ts
│   │   │   ├── gdpr.service.ts
│   │   │   └── vehicle.service.ts
│   │   └── dto/
│   │       ├── customer.dto.ts
│   │       └── vehicle.dto.ts
│   │
│   ├── voice/                       # Voice AI Integration
│   │   ├── voice.module.ts
│   │   ├── controllers/
│   │   │   └── voice-webhook.controller.ts
│   │   ├── services/
│   │   │   ├── vapi-webhook.service.ts
│   │   │   ├── intent-handler.service.ts
│   │   │   └── escalation.service.ts
│   │   ├── listeners/
│   │   │   └── voice-event.listener.ts
│   │   └── dto/
│   │       └── vapi-webhook.dto.ts
│   │
│   ├── gdpr/                        # GDPR Compliance Module
│   │   ├── gdpr.module.ts
│   │   ├── controllers/
│   │   │   ├── gdpr.controller.ts
│   │   │   └── gdpr-webhook.controller.ts
│   │   ├── services/
│   │   │   ├── gdpr-deletion.service.ts
│   │   │   ├── gdpr-export.service.ts
│   │   │   ├── gdpr-consent.service.ts
│   │   │   ├── gdpr-request.service.ts
│   │   │   └── data-retention.service.ts
│   │   ├── processors/
│   │   │   ├── gdpr-deletion.processor.ts
│   │   │   └── data-retention.processor.ts
│   │   └── dto/
│   │       └── gdpr.dto.ts
│   │
│   ├── analytics/                   # Business Analytics
│   │   ├── analytics.module.ts
│   │   ├── controllers/
│   │   │   └── metrics.controller.ts
│   │   └── services/
│   │       └── unit-economics.service.ts
│   │
│   └── common/                      # Shared Infrastructure
│       ├── common.module.ts
│       ├── services/
│       │   ├── prisma.service.ts
│       │   ├── encryption.service.ts
│       │   ├── queue.service.ts
│       │   └── logger.service.ts
│       ├── interceptors/
│       │   ├── transform.interceptor.ts
│       │   └── logger.interceptor.ts
│       └── utils/
│           └── lock-utils.ts
│
├── prisma/
│   └── schema.prisma                # Database schema
│
├── test/                            # E2E tests
├── package.json
└── tsconfig.json
```

### 3.2 Path Aliases Configuration

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["src/*"],
      "@auth/*": ["src/auth/*"],
      "@booking/*": ["src/booking/*"],
      "@voice/*": ["src/voice/*"],
      "@customer/*": ["src/customer/*"],
      "@common/*": ["src/common/*"],
      "@gdpr/*": ["src/gdpr/*"]
    }
  }
}
```

---

## 4. Key Services Deep Dive

### 4.1 BookingService - Advisory Locks & Race Condition Prevention

The `BookingService` implements a sophisticated concurrency control mechanism to prevent double-booking scenarios.

#### 4.1.1 Lock Acquisition Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      BOOKING RESERVATION FLOW                                │
│                                                                              │
│   Client Request                                                            │
│       │                                                                     │
│       ▼                                                                     │
│   ┌───────────────────────────────────────────────────────────────────┐    │
│   │ POST /v1/bookings/reserve                                         │    │
│   │ { slotId, customerId, vehicleId, serviceIds, notes }             │    │
│   └───────────────────────────────────────────────────────────────────┘    │
│       │                                                                     │
│       ▼                                                                     │
│   ┌──────────────────┐                                                      │
│   │  STEP 1: Acquire │  ◄─────────────────────────────────────────────┐    │
│   │  Advisory Lock   │                                               │    │
│   │                  │  SELECT pg_try_advisory_lock(lock_id)         │    │
│   └────────┬─────────┘                                               │    │
│            │                                                         │    │
│            ▼                                                         │    │
│   ┌──────────────────┐     ┌──────────────────┐                      │    │
│   │  Lock Acquired?  │──NO─┤  Queue for Retry │──────────────────────┘    │
│   └────────┬─────────┘     │  (BullMQ)        │                           │
│           YES              └──────────────────┘                           │
│            │                                                               │
│            ▼                                                               │
│   ┌──────────────────┐                                                     │
│   │  STEP 2-9:       │  BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE    │
│   │  Serializable    │  ───────────────────────────────────────────────   │
│   │  Transaction     │                                                     │
│   └────────┬─────────┘                                                     │
│            │                                                               │
│   ┌────────┴────────┬────────────────┬────────────────┐                    │
│   ▼                 ▼                ▼                ▼                    │
│ ┌───────┐     ┌───────────┐   ┌───────────┐   ┌───────────┐               │
│ │Validate│     │  Create   │   │  Update   │   │  Create   │               │
│ │  Slot  │────►│  Booking  │──►│   Slot    │──►│  Event    │               │
│ │ Status │     │  Record   │   │  Status   │   │  Log      │               │
│ └───────┘     └───────────┘   └───────────┘   └───────────┘               │
│       │                                                         │          │
│       ▼                                                         │          │
│   ┌──────────────────┐                                          │          │
│   │  STEP 10:        │  COMMIT / ROLLBACK                       │          │
│   │  Commit/Rollback │                                          │          │
│   └────────┬─────────┘                                          │          │
│            │                                                     │          │
│            ▼                                                     │          │
│   ┌──────────────────┐     ┌──────────────────┐                  │          │
│   │  Release Lock    │────►│  Emit Event      │                  │          │
│   │                  │     │  booking.created │                  │          │
│   └──────────────────┘     └──────────────────┘                  │          │
│                                                                          │          │
└──────────────────────────────────────────────────────────────────────────┴──────────┘
```

#### 4.1.2 Implementation Code

```typescript
// booking/services/booking.service.ts
@Injectable()
export class BookingService {
  async reserveSlot(
    tenantId: string,
    dto: ReserveSlotDto,
  ): Promise<BookingReservationResult> {
    const { slotId, customerId, vehicleId, serviceIds, notes } = dto;

    // Step 1: Try to acquire advisory lock
    const lockAcquired = await this.prisma.acquireAdvisoryLock(tenantId, slotId);

    if (!lockAcquired) {
      // Queue for retry with BullMQ
      const job = await this.queueService.addBookingJob(
        'reserve-slot-retry',
        { type: 'reserve-slot-retry', payload: dto, tenantId },
        { delay: 5000 },
      );

      return {
        success: false,
        conflict: true,
        retryAfter: 5000,
        queuePosition: 1,
        message: 'Slot is currently being reserved by another request.',
      };
    }

    try {
      // Step 2-9: Execute in SERIALIZABLE transaction
      const result = await this.prisma.withSerializableTransaction(
        async (tx) => {
          // Validate slot is available
          const slot = await tx.bookingSlot.findFirst({
            where: { id: slotId, tenantId },
          });

          if (!slot || slot.status !== 'AVAILABLE') {
            throw new ConflictException('Slot is not available');
          }

          // Create booking event for audit trail
          const bookingEvent = await tx.bookingEvent.create({...});

          // Update slot status
          await tx.bookingSlot.update({
            where: { id: slotId },
            data: { status: 'BOOKED' },
          });

          // Create booking
          const booking = await tx.booking.create({...});

          return booking;
        },
        { maxRetries: 3, retryDelay: 100 },
      );

      // Step 8: Emit event for async processing
      this.eventEmitter.emit('booking.created', new BookingCreatedEvent(...));

      return { success: true, booking: result };

    } finally {
      // Step 10: Always release advisory lock
      await this.prisma.releaseAdvisoryLock(tenantId, slotId);
    }
  }
}
```

### 4.2 PrismaService - Multi-Tenancy & RLS

The `PrismaService` extends PrismaClient with tenant context management and PostgreSQL advisory locks.

#### 4.2.1 Row-Level Security Implementation

```typescript
// common/services/prisma.service.ts
@Injectable()
export class PrismaService extends PrismaClient {
  private currentTenantContext: TenantContext | null = null;

  /**
   * Set PostgreSQL RLS context variable
   * All subsequent queries will be filtered by tenant_id
   */
  async setTenantContext(tenantId: string): Promise<void> {
    this.currentTenantContext = { tenantId };
    await this.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, true)`;
  }

  /**
   * Execute callback within specific tenant context
   * Automatically restores previous context on completion
   */
  async withTenant<T>(
    tenantId: string,
    callback: (prisma: PrismaService) => Promise<T>
  ): Promise<T> {
    const previousContext = this.currentTenantContext;
    try {
      await this.setTenantContext(tenantId);
      return await callback(this);
    } finally {
      if (previousContext) {
        await this.setTenantContext(previousContext.tenantId);
      } else {
        await this.clearTenantContext();
      }
    }
  }

  /**
   * Execute with SERIALIZABLE isolation for race condition prevention
   * Implements automatic retry on serialization failures (P2034)
   */
  async withSerializableTransaction<T>(
    callback: (prisma: PrismaService) => Promise<T>,
    options?: { maxRetries?: number; retryDelay?: number },
  ): Promise<T> {
    const maxRetries = options?.maxRetries ?? 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.$transaction(
          async (tx) => callback(tx as unknown as PrismaService),
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            maxWait: 5000,
            timeout: 10000,
          },
        );
      } catch (error) {
        // Retry on serialization failure
        if (error instanceof Prisma.PrismaClientKnownRequestError 
            && error.code === 'P2034') {
          await this.delay(retryDelay * attempt);
          continue;
        }
        throw error;
      }
    }
  }

  /**
   * Generate unique 64-bit lock ID from tenant + resource
   * Uses bit-shifting: lock_id = (tenant_hash << 32) | resource_hash
   */
  private generateLockId(tenantId: string, resourceId: string): string {
    const tenantHash = this.hashUUID(tenantId);
    const resourceHash = this.hashUUID(resourceId);
    
    const lockId = (BigInt.asUintN(64, BigInt(tenantHash) << BigInt(32)) | 
                    BigInt.asUintN(64, BigInt(resourceHash)));
    
    return lockId.toString();
  }

  /**
   * PostgreSQL RLS Policy Setup
   * Applied to all tenant-scoped tables
   */
  private async setupRLS(): Promise<void> {
    const tables = ['users', 'customers', 'vehicles', 'bookings', 'booking_slots', 'services'];
    
    for (const table of tables) {
      await this.$executeRawUnsafe(`
        ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY ${table}_tenant_isolation ON ${table}
          USING (tenant_id = current_setting('app.current_tenant', true)::text);
      `);
    }
  }
}
```

### 4.3 GdprDeletionService - Automated Data Erasure

Implements Article 17 "Right to Erasure" with 24-hour SLA using BullMQ job processing.

```typescript
// gdpr/services/gdpr-deletion.service.ts
@Injectable()
export class GdprDeletionService {
  private readonly SNAPSHOT_RETENTION_DAYS = 30;
  private readonly DELETION_SLA_HOURS = 24;

  /**
   * Queue customer data deletion job
   * Returns estimated completion time with SLA tracking
   */
  async queueDeletion(
    customerId: string,
    tenantId: string,
    requestId: string,
    reason: string,
    options?: { verifiedBy?: string; priority?: number }
  ): Promise<{
    jobId: string;
    status: string;
    estimatedCompletion: Date;
    slaDeadline: Date;
  }> {
    // Verify customer exists and not already anonymized
    const customer = await this.prisma.withTenant(tenantId, async (prisma) => {
      return prisma.customerEncrypted.findFirst({
        where: { id: customerId, tenantId, anonymizedAt: null },
      });
    });

    if (!customer) {
      throw new NotFoundException(`Customer not found or already anonymized`);
    }

    // Queue deletion job with priority
    const job = await this.deletionQueue.add(
      'customer-deletion',
      { customerId, tenantId, requestId, reason, ...options },
      {
        jobId: `deletion:${customerId}`,
        priority: options?.priority ?? 5,
        attempts: 3,
        backoff: { type: 'exponential', delay: 60000 },
      },
    );

    const slaDeadline = new Date(
      Date.now() + this.DELETION_SLA_HOURS * 60 * 60 * 1000
    );

    return {
      jobId: job.id as string,
      status: 'QUEUED',
      estimatedCompletion: new Date(Date.now() + 2 * 60 * 60 * 1000),
      slaDeadline,
    };
  }

  /**
   * Anonymize customer data while preserving referential integrity
   * Encrypts PII fields with 'DELETED' value, preserves ID for FK constraints
   */
  async anonymizeCustomer(
    customerId: string,
    tenantId: string,
    requestId: string,
  ): Promise<AnonymizationResult> {
    await this.prisma.withTenant(tenantId, async (prisma) => {
      await prisma.customerEncrypted.update({
        where: { id: customerId },
        data: {
          phoneEncrypted: Buffer.from(this.encryption.encrypt('DELETED')),
          emailEncrypted: Buffer.from(this.encryption.encrypt('DELETED')),
          nameEncrypted: Buffer.from(this.encryption.encrypt('DELETED')),
          gdprConsent: false,
          marketingConsent: false,
          isDeleted: true,
          deletedAt: new Date(),
          anonymizedAt: new Date(),
          dataSubjectRequestId: requestId,
        },
      });
    });

    return {
      success: true,
      customerId,
      anonymizedAt: new Date(),
      anonymizedFields: ['phoneEncrypted', 'emailEncrypted', 'nameEncrypted'],
      preservedFields: ['id', 'tenantId', 'createdAt', 'bookings', 'vehicles'],
    };
  }

  /**
   * Create encrypted deletion snapshot for legal compliance
   * Retained for 30 days then permanently deleted
   */
  async createDeletionSnapshot(
    customerId: string,
    tenantId: string,
    requestId: string,
  ): Promise<DeletionSnapshot> {
    const snapshotId = `snap-${Date.now()}-${customerId.substring(0, 8)}`;
    const expiresAt = new Date(
      Date.now() + this.SNAPSHOT_RETENTION_DAYS * 24 * 60 * 60 * 1000
    );

    // Gather customer data (metadata only, no PII)
    const customerData = await this.prisma.withTenant(tenantId, async (prisma) => {
      return prisma.customerEncrypted.findFirst({
        where: { id: customerId, tenantId },
        include: { vehicles: true, bookings: { include: { invoices: true } } },
      });
    });

    // Encrypt and store snapshot
    const snapshotContent = { snapshotId, expiresAt, data: customerData };
    const encryptedSnapshot = this.encryption.encrypt(JSON.stringify(snapshotContent));

    return {
      snapshotId,
      expiresAt,
      checksum: this.generateChecksum(JSON.stringify(snapshotContent)),
      storageLocation: `snapshots/${tenantId}/${snapshotId}.enc`,
    };
  }
}
```

### 4.4 QueueService - BullMQ Integration

```typescript
// common/services/queue.service.ts
@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('booking') private readonly bookingQueue: Queue,
    @InjectQueue('voice') private readonly voiceQueue: Queue,
    @InjectQueue('notification') private readonly notificationQueue: Queue,
  ) {}

  async addBookingJob(
    jobName: string,
    data: QueueJobData,
    options?: JobOptions,
  ): Promise<Job<QueueJobData>> {
    return this.bookingQueue.add(jobName, data, {
      attempts: options?.attempts ?? 3,
      backoff: options?.backoff ?? {
        type: 'exponential',
        delay: 1000,
      },
    });
  }

  async getQueueMetrics(queueName: 'booking' | 'voice' | 'notification'): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const queue = this.getQueue(queueName);
    
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  async retryFailedJobs(
    queueName: 'booking' | 'voice' | 'notification',
    count: number = 100,
  ): Promise<Job[]> {
    const queue = this.getQueue(queueName);
    const failedJobs = await queue.getFailed();
    
    const retried: Job[] = [];
    for (const job of failedJobs.slice(0, count)) {
      await job.retry();
      retried.push(job);
    }
    return retried;
  }
}
```

### 4.5 EncryptionService - AES-256 Implementation

```typescript
// common/services/encryption.service.ts
@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-cbc';
  private readonly key: Buffer;
  private readonly iv: Buffer;

  constructor(private readonly configService: ConfigService) {
    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY');
    if (!encryptionKey || encryptionKey.length < 32) {
      throw new Error('ENCRYPTION_KEY must be at least 32 characters');
    }
    this.key = Buffer.from(encryptionKey.slice(0, 32));
    this.iv = Buffer.from((configService.get('ENCRYPTION_IV') || encryptionKey.slice(0, 16)).slice(0, 16));
  }

  /**
   * Encrypt sensitive data using AES-256-CBC
   */
  encrypt(data: string): string {
    if (!data) return data;
    const cipher = crypto.createCipheriv(this.algorithm, this.key, this.iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  /**
   * Decrypt data
   */
  decrypt(encryptedData: string): string {
    if (!encryptedData) return encryptedData;
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, this.iv);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Create HMAC-SHA256 hash for lookup (e.g., phone number hash)
   */
  hash(data: string): string {
    const normalized = this.normalizeForHash(data);
    return crypto
      .createHmac('sha256', this.key)
      .update(normalized)
      .digest('hex');
  }

  /**
   * Encrypt specific fields of an object
   */
  encryptFields<T extends Record<string, any>>(
    data: T,
    fieldsToEncrypt: (keyof T)[],
  ): T {
    const encrypted = { ...data };
    for (const field of fieldsToEncrypt) {
      if (typeof encrypted[field] === 'string') {
        (encrypted as any)[field] = this.encrypt(encrypted[field] as string);
      }
    }
    return encrypted;
  }

  private normalizeForHash(data: string): string {
    return data
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9+]/g, '');
  }
}
```

---

## 5. API Endpoints Reference

### 5.1 Authentication API

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/v1/auth/login` | User login with credentials | No |
| `POST` | `/v1/auth/refresh` | Refresh access token | No |

**Login Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "tenantSlug": "garage-roma"
}
```

**Login Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 86400
}
```

### 5.2 Bookings API

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| `POST` | `/v1/bookings/reserve` | Reserve slot with advisory lock | Yes | RECEPTIONIST, MANAGER, ADMIN |
| `POST` | `/v1/bookings` | Create booking | Yes | RECEPTIONIST, MANAGER, ADMIN |
| `GET` | `/v1/bookings` | List bookings with filters | Yes | MECHANIC, RECEPTIONIST, MANAGER, ADMIN |
| `GET` | `/v1/bookings/:id` | Get booking by ID | Yes | MECHANIC, RECEPTIONIST, MANAGER, ADMIN |
| `PATCH` | `/v1/bookings/:id` | Update booking | Yes | RECEPTIONIST, MANAGER, ADMIN |
| `DELETE` | `/v1/bookings/:id` | Cancel booking | Yes | MANAGER, ADMIN |
| `GET` | `/v1/bookings/stats/overview` | Get booking statistics | Yes | MANAGER, ADMIN |

**Slot Management Endpoints:**

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| `GET` | `/v1/bookings/slots/available` | Get available slots | Yes | RECEPTIONIST, MANAGER, ADMIN |
| `POST` | `/v1/bookings/slots` | Create new slot | Yes | MANAGER, ADMIN |
| `GET` | `/v1/bookings/slots/:id` | Get slot by ID | Yes | RECEPTIONIST, MANAGER, ADMIN |
| `PATCH` | `/v1/bookings/slots/:id/block` | Block a slot | Yes | MANAGER, ADMIN |
| `DELETE` | `/v1/bookings/slots/:id` | Delete slot | Yes | ADMIN |

### 5.3 Customers API

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| `POST` | `/v1/customers` | Create customer | Yes | RECEPTIONIST, MANAGER, ADMIN |
| `GET` | `/v1/customers` | List customers | Yes | RECEPTIONIST, MANAGER, ADMIN |
| `GET` | `/v1/customers/search` | Search customers | Yes | RECEPTIONIST, MANAGER, ADMIN |
| `GET` | `/v1/customers/:id` | Get customer by ID | Yes | RECEPTIONIST, MANAGER, ADMIN |
| `PATCH` | `/v1/customers/:id` | Update customer | Yes | RECEPTIONIST, MANAGER, ADMIN |
| `DELETE` | `/v1/customers/:id` | Delete customer (GDPR) | Yes | MANAGER, ADMIN |

**GDPR Endpoints:**

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| `GET` | `/v1/customers/:id/export` | Export customer data | Yes | ADMIN |
| `POST` | `/v1/customers/:id/consent/gdpr` | Update GDPR consent | Yes | RECEPTIONIST, MANAGER, ADMIN |
| `POST` | `/v1/customers/:id/consent/marketing` | Update marketing consent | Yes | RECEPTIONIST, MANAGER, ADMIN |
| `GET` | `/v1/customers/:id/consent/history` | Get consent history | Yes | MANAGER, ADMIN |

**Vehicle Endpoints:**

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| `POST` | `/v1/customers/:id/vehicles` | Add vehicle to customer | Yes | RECEPTIONIST, MANAGER, ADMIN |
| `GET` | `/v1/customers/:id/vehicles` | Get customer vehicles | Yes | RECEPTIONIST, MANAGER, ADMIN |
| `GET` | `/v1/customers/vehicles/:vehicleId` | Get vehicle by ID | Yes | RECEPTIONIST, MANAGER, ADMIN |
| `PATCH` | `/v1/customers/vehicles/:vehicleId` | Update vehicle | Yes | RECEPTIONIST, MANAGER, ADMIN |
| `DELETE` | `/v1/customers/vehicles/:vehicleId` | Delete vehicle | Yes | MANAGER, ADMIN |

### 5.4 Voice Webhooks API

| Method | Endpoint | Description | Auth Required | Headers |
|--------|----------|-------------|---------------|---------|
| `POST` | `/webhooks/vapi/call-event` | Handle Vapi call events | HMAC Signature | `X-Vapi-Signature`, `X-Vapi-Timestamp` |
| `POST` | `/webhooks/vapi/transfer` | Handle transfer requests | HMAC Signature | `X-Vapi-Signature` |
| `POST` | `/webhooks/vapi/health` | Health check | No | - |

**Webhook Signature Verification:**
```typescript
private verifySignature(payload: any, signature: string, timestamp?: string): boolean {
  const secret = this.configService.get<string>('VAPI_WEBHOOK_SECRET');
  const signedPayload = timestamp
    ? `${timestamp}.${JSON.stringify(payload)}`
    : JSON.stringify(payload);
  
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature),
  );
}
```

### 5.5 GDPR API

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| `POST` | `/gdpr/requests` | Create data subject request | Yes | ADMIN, SECRETARY |
| `GET` | `/gdpr/requests` | List requests | Yes | ADMIN, SECRETARY |
| `GET` | `/gdpr/requests/pending` | Get pending requests | Yes | ADMIN, SECRETARY |
| `GET` | `/gdpr/requests/:requestId` | Get specific request | Yes | ADMIN, SECRETARY |
| `PATCH` | `/gdpr/requests/:requestId/status` | Update request status | Yes | ADMIN, SECRETARY |
| `POST` | `/gdpr/requests/:requestId/verify` | Verify identity | Yes | ADMIN, SECRETARY |
| `POST` | `/gdpr/requests/:requestId/assign` | Assign request | Yes | ADMIN |
| `POST` | `/gdpr/requests/:requestId/reject` | Reject request | Yes | ADMIN |
| `GET` | `/gdpr/customers/:customerId/export` | Export customer data | Yes | ADMIN, SECRETARY |
| `GET` | `/gdpr/customers/:customerId/portability` | Portable data export | Yes | ADMIN, SECRETARY |
| `POST` | `/gdpr/customers/:customerId/delete` | Queue deletion | Yes | ADMIN |
| `GET` | `/gdpr/deletion-jobs/:jobId` | Get deletion status | Yes | ADMIN, SECRETARY |
| `POST` | `/gdpr/deletion-jobs/:jobId/cancel` | Cancel deletion | Yes | ADMIN |
| `GET` | `/gdpr/retention/policy` | Get retention policy | Yes | ADMIN |
| `POST` | `/gdpr/retention/enforce` | Enforce retention | Yes | ADMIN |

### 5.6 Analytics API

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| `GET` | `/v1/analytics/cac` | Customer Acquisition Cost | Yes | ADMIN |
| `GET` | `/v1/analytics/ltv` | Lifetime Value | Yes | ADMIN |
| `GET` | `/v1/analytics/churn` | Churn rate analysis | Yes | ADMIN |
| `GET` | `/v1/analytics/gross-margin` | Gross margin analysis | Yes | ADMIN |
| `GET` | `/v1/analytics/break-even` | Break-even analysis | Yes | ADMIN |
| `GET` | `/v1/analytics/ltv-cac-ratio` | LTV/CAC ratio | Yes | ADMIN |
| `GET` | `/v1/analytics/payback-period` | CAC payback period | Yes | ADMIN |

---

## 6. Multi-Tenancy Implementation

### 6.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MULTI-TENANCY ARCHITECTURE                            │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                        TENANT ISOLATION LAYERS                       │   │
│   │                                                                      │   │
│   │  Layer 1: JWT Token                                                  │   │
│   │  ┌─────────────────────────────────────────────────────────────┐    │   │
│   │  │  Payload: { sub: "userId:tenantId", email, role, tenantId } │    │   │
│   │  └─────────────────────────────────────────────────────────────┘    │   │
│   │                        │                                            │   │
│   │                        ▼                                            │   │
│   │  Layer 2: Tenant Context Middleware                                 │   │
│   │  ┌─────────────────────────────────────────────────────────────┐    │   │
│   │  │  Extract tenantId from JWT → Set Prisma RLS context        │    │   │
│   │  │  SELECT set_config('app.current_tenant', tenantId, true)   │    │   │
│   │  └─────────────────────────────────────────────────────────────┘    │   │
│   │                        │                                            │   │
│   │                        ▼                                            │   │
│   │  Layer 3: PostgreSQL RLS Policies                                   │   │
│   │  ┌─────────────────────────────────────────────────────────────┐    │   │
│   │  │  CREATE POLICY tenant_isolation ON bookings                 │    │   │
│   │  │    USING (tenant_id = current_setting('app.current_tenant'));│   │   │
│   │  └─────────────────────────────────────────────────────────────┘    │   │
│   │                        │                                            │   │
│   │                        ▼                                            │   │
│   │  Layer 4: Application-Level Validation                              │   │
│   │  ┌─────────────────────────────────────────────────────────────┐    │   │
│   │  │  All queries include: WHERE tenant_id = <current_tenant>   │    │   │
│   │  └─────────────────────────────────────────────────────────────┘    │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 JWT Strategy with Tenant Extraction

```typescript
// auth/strategies/jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
      passReqToCallback: true, // Pass request for tenant extraction
    });
  }

  async validate(req: Request, payload: JwtPayload): Promise<AuthenticatedUser> {
    // Extract user and tenant from compound subject: "userId:tenantId"
    const userId = this.authService.extractUserIdFromPayload(payload);
    const tenantId = this.authService.extractTenantIdFromPayload(payload);

    // Store in request for middleware
    (req as any).tenantId = tenantId;
    (req as any).userId = userId;

    return {
      userId,
      email: payload.email,
      role: payload.role,
      tenantId,
    };
  }
}

// JWT Payload Format
export interface JwtPayload {
  sub: string;        // "userId:tenantId"
  email: string;
  role: string;
  tenantId: string;   // Explicit field for redundancy
  iat?: number;
  exp?: number;
}
```

### 6.3 Tenant Context Middleware

```typescript
// auth/middleware/tenant-context.middleware.ts
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async use(req: RequestWithTenant, res: Response, next: NextFunction) {
    const tenantId = req.tenantId; // Set by JWT strategy

    if (tenantId) {
      try {
        // Set PostgreSQL RLS context variable
        await this.prisma.setTenantContext(tenantId);
        
        this.logger.debug(`Tenant context set: ${tenantId}`);
        
        // Clear context after response completes
        res.on('finish', async () => {
          try {
            await this.prisma.clearTenantContext();
            this.logger.debug(`Tenant context cleared: ${tenantId}`);
          } catch (error) {
            this.logger.error('Failed to clear tenant context', error.stack);
          }
        });
      } catch (error) {
        this.logger.error(`Failed to set tenant context: ${error.message}`);
      }
    }

    next();
  }
}
```

---

## 7. Code Patterns

### 7.1 Dependency Injection

```typescript
// Module-level providers
@Module({
  imports: [
    ConfigModule,
    EventEmitterModule.forRoot(),
    CommonModule,  // Provides PrismaService, QueueService, EncryptionService
  ],
  controllers: [BookingController],
  providers: [
    // Services are injected into controllers and other services
    BookingService,
    BookingSlotService,
    BookingEventListener,
  ],
  exports: [BookingService, BookingSlotService], // Available to importing modules
})
export class BookingModule {}

// Constructor injection pattern
@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,        // Database access
    private readonly eventEmitter: EventEmitter2,  // Event publishing
    private readonly queueService: QueueService,   // Job queuing
    private readonly logger: LoggerService,        // Logging
  ) {}
}
```

### 7.2 Event-Driven Architecture

```typescript
// 1. Define event
export class BookingCreatedEvent {
  constructor(
    public readonly bookingId: string,
    public readonly tenantId: string,
    public readonly customerId: string,
    public readonly scheduledDate: Date,
    public readonly source: string,
  ) {}
}

// 2. Emit event
@Injectable()
export class BookingService {
  async createBooking(...) {
    // ... create booking logic ...
    
    this.eventEmitter.emit(
      'booking.created',
      new BookingCreatedEvent(booking.id, tenantId, customerId, scheduledDate, source),
    );
  }
}

// 3. Listen for event
@Injectable()
export class BookingEventListener {
  constructor(
    private readonly logger: LoggerService,
    private readonly queueService: QueueService,
  ) {}

  @OnEvent('booking.created')
  async handleBookingCreated(event: BookingCreatedEvent) {
    this.logger.log(`Booking created: ${event.bookingId}`);
    
    // Queue async notification job
    await this.queueService.addNotificationJob('send-booking-confirmation', {
      type: 'booking-confirmation',
      payload: { bookingId: event.bookingId, customerId: event.customerId },
      tenantId: event.tenantId,
    });
    
    // Queue calendar sync
    await this.queueService.addNotificationJob('sync-calendar', {
      type: 'calendar-sync',
      payload: { bookingId: event.bookingId, action: 'create' },
      tenantId: event.tenantId,
    });
  }

  @OnEvent('booking.cancelled')
  async handleBookingCancelled(event: { bookingId: string; tenantId: string; reason?: string }) {
    // Handle cancellation side effects
  }
}
```

### 7.3 Error Handling Patterns

```typescript
// Service layer with specific exceptions
@Injectable()
export class BookingService {
  async findById(tenantId: string, bookingId: string): Promise<any> {
    return this.prisma.withTenant(tenantId, async (prisma) => {
      const booking = await prisma.booking.findFirst({
        where: { id: bookingId, tenantId },
        include: { customer: true, vehicle: true, slot: true },
      });

      if (!booking) {
        throw new NotFoundException(`Booking ${bookingId} not found`);
      }

      return booking;
    });
  }

  async reserveSlot(tenantId: string, dto: ReserveSlotDto): Promise<BookingReservationResult> {
    try {
      return await this.prisma.withSerializableTransaction(async (tx) => {
        // ... transaction logic ...
      });
    } catch (error) {
      // Handle Prisma-specific errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2034') { // Serialization failure
          throw new ConflictException('Booking conflict detected. Please try again.');
        }
        if (error.code === 'P2002') { // Unique constraint violation
          throw new ConflictException('Duplicate booking detected.');
        }
      }
      
      // Re-throw known HTTP exceptions
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      
      // Wrap unknown errors
      throw new BadRequestException(`Failed to create booking: ${error.message}`);
    }
  }
}

// Exception filter (global)
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    
    const message = exception instanceof HttpException
      ? exception.getResponse()
      : 'Internal server error';

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
```

### 7.4 Repository Pattern with Prisma

```typescript
// Repository abstraction (optional - can use Prisma directly)
export interface IBookingRepository {
  findById(id: string, tenantId: string): Promise<Booking | null>;
  findAll(filters: BookingFilters): Promise<Booking[]>;
  create(data: CreateBookingDto, tenantId: string): Promise<Booking>;
  update(id: string, data: UpdateBookingDto, tenantId: string): Promise<Booking>;
  delete(id: string, tenantId: string): Promise<void>;
}

// Prisma implementation
@Injectable()
export class BookingRepository implements IBookingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, tenantId: string): Promise<Booking | null> {
    return this.prisma.withTenant(tenantId, async (prisma) => {
      return prisma.booking.findFirst({
        where: { id, tenantId },
        include: { customer: true, vehicle: true, slot: true },
      });
    });
  }

  async create(data: CreateBookingDto, tenantId: string): Promise<Booking> {
    return this.prisma.withTenant(tenantId, async (prisma) => {
      return prisma.booking.create({
        data: {
          ...data,
          tenant: { connect: { id: tenantId } },
          customer: { connect: { id: data.customerId } },
        },
        include: { customer: true, vehicle: true },
      });
    });
  }
}

// Service uses repository
@Injectable()
export class BookingService {
  constructor(
    private readonly bookingRepo: BookingRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}
}
```

---

## 8. Configuration Reference

### 8.1 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Environment mode |
| `PORT` | No | `3000` | Application port |
| `API_VERSION` | No | `v1` | API version prefix |
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `DATABASE_POOL_SIZE` | No | `20` | Connection pool size |
| `REDIS_HOST` | No | `localhost` | Redis hostname |
| `REDIS_PORT` | No | `6379` | Redis port |
| `REDIS_PASSWORD` | No | - | Redis password |
| `REDIS_DB` | No | `0` | Redis database number |
| `JWT_SECRET` | Yes | - | JWT signing secret |
| `JWT_EXPIRES_IN` | No | `24h` | Access token expiry |
| `JWT_REFRESH_SECRET` | Yes | - | Refresh token secret |
| `JWT_REFRESH_EXPIRES_IN` | No | `7d` | Refresh token expiry |
| `ENCRYPTION_KEY` | Yes | - | AES-256 key (32+ chars) |
| `ENCRYPTION_IV` | No | - | AES initialization vector (16 chars) |
| `VAPI_WEBHOOK_SECRET` | Yes | - | Vapi webhook HMAC secret |
| `VAPI_API_KEY` | Yes | - | Vapi API key |
| `LOG_LEVEL` | No | `info` | Logging level |
| `LOG_FORMAT` | No | `simple` | Log format (json/simple) |
| `GDPR_DATA_RETENTION_DAYS` | No | `2555` | Default retention (7 years) |

### 8.2 Module Configuration

```typescript
// Global rate limiting
ThrottlerModule.forRoot([
  {
    name: 'default',
    ttl: 60000,      // 1 minute
    limit: 100,      // 100 requests per minute
  },
  {
    name: 'webhook',
    ttl: 60000,
    limit: 1000,     // Higher limit for webhooks
  },
]),

// Global validation pipe
{
  provide: APP_PIPE,
  useFactory: () =>
    new ValidationPipe({
      whitelist: true,              // Strip unknown properties
      forbidNonWhitelisted: true,   // Throw on unknown properties
      transform: true,              // Auto-transform payloads
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
},

// BullMQ configuration
BullModule.forRootAsync({
  useFactory: () => ({
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    },
  }),
}),
```

---

## 9. Security Considerations

### 9.1 Security Layers

| Layer | Implementation | Purpose |
|-------|----------------|---------|
| **Network** | Helmet.js, CORS | HTTP security headers, origin validation |
| **Authentication** | JWT with RS256 | Stateless token-based auth |
| **Authorization** | RBAC with Guards | Role-based access control |
| **Data Isolation** | PostgreSQL RLS | Tenant data separation |
| **PII Protection** | AES-256-CBC | Encryption at rest |
| **Audit** | Event Logging | Comprehensive audit trail |

### 9.2 Webhook Security

```typescript
// HMAC-SHA256 signature verification
private verifySignature(payload: any, signature: string, timestamp?: string): boolean {
  const secret = this.configService.get<string>('VAPI_WEBHOOK_SECRET');
  
  // Construct signed payload
  const signedPayload = timestamp
    ? `${timestamp}.${JSON.stringify(payload)}`
    : JSON.stringify(payload);
  
  // Compute HMAC
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  
  // Timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  } catch {
    return false;
  }
}

// Replay attack prevention
private validateTimestamp(timestamp: string): boolean {
  const timestampMs = parseInt(timestamp, 10);
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  
  return Math.abs(now - timestampMs) < fiveMinutes;
}
```

---

## 10. Operational Guidelines

### 10.1 Deployment Checklist

- [ ] All environment variables configured
- [ ] PostgreSQL RLS policies enabled
- [ ] Redis accessible for BullMQ
- [ ] JWT secrets rotated from defaults
- [ ] Encryption keys generated (32+ characters)
- [ ] Vapi webhook secret configured
- [ ] Database migrations applied
- [ ] Health check endpoint verified
- [ ] Rate limiting rules validated

### 10.2 Monitoring & Alerting

| Metric | Source | Threshold | Action |
|--------|--------|-----------|--------|
| API Response Time | Application | > 500ms p95 | Scale horizontally |
| Error Rate | Application | > 1% | Page on-call |
| Queue Depth | BullMQ | > 1000 jobs | Scale workers |
| Failed Jobs | BullMQ | > 10/hour | Investigate |
| DB Connections | PostgreSQL | > 80% pool | Increase pool size |
| RLS Violations | PostgreSQL | > 0 | Security incident |

### 10.3 Runbook: Handling Booking Conflicts

```
1. Check booking queue depth:
   GET /admin/queues/booking/metrics

2. If high conflict rate:
   - Review slot availability configuration
   - Check for client-side retry storms
   - Consider increasing advisory lock timeout

3. If persistent conflicts:
   - Identify contended slots from logs
   - Manually review slot status in database
   - Release stuck locks if necessary:
     SELECT pg_advisory_unlock_all();

4. Escalate if data inconsistency detected
```

---

## 11. References

- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Vapi API Reference](https://docs.vapi.ai/)

---

**Document Owner**: Platform Engineering Team  
**Review Schedule**: Quarterly  
**Next Review Date**: 2026-05-28
