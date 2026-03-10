# MechMind OS v10 - Claude Code Instructions

## Build & Test Commands
```bash
# Backend (NestJS)
cd backend && npm run start:dev       # Dev server :3000
cd backend && npm run test            # Unit tests
cd backend && npm run test:cov        # Coverage
cd backend && npm run test:integration # Integration
cd backend && npm run lint            # ESLint
cd backend && npx prisma studio       # DB GUI

# Frontend (Next.js 14)
cd frontend && npm run dev            # Dev server :3001
cd frontend && npm run test           # Jest
cd frontend && npm run test:e2e       # Playwright
cd frontend && npm run lint           # ESLint

# Docker
docker compose up -d                  # Full local stack
docker compose -f docker-compose.test.yml up -d  # Test env

# Verify before commit
cd backend && npm run test && npm run lint
cd frontend && npm run test && npm run lint
```

## Architecture Overview
```
backend/          NestJS 10 API (TypeScript, Prisma, PostgreSQL, Redis)
frontend/         Next.js 14 App Router (TailwindCSS, Radix UI, tRPC)
mobile/           React Native (customer-app, manager-app, technician-app)
ml/               Python ML models (churn, predictive maintenance, labor)
infrastructure/   Terraform AWS (Lambda, RDS, SQS, S3)
database/         Seeds & migrations
docs/             Technical documentation
```

## Key Backend Modules
- `auth/` - JWT + MFA + Passkeys (WebAuthn)
- `booking/` - Advisory locks, SERIALIZABLE isolation
- `customer/` - PII encryption (AES-256-CBC)
- `voice/` - Vapi.ai webhook integration
- `gdpr/` - Data deletion, export, retention
- `notifications/` - Email (Resend), SMS (Twilio), SSE
- `analytics/` - Unit economics, KPI metrics
- `parts/` - Inventory, suppliers, purchase orders
- `iot/` & `obd/` - Vehicle diagnostics

## Conventions (STRICT)
- TypeScript strict: **no `any`**, no `@ts-ignore`, explicit return types
- TDD: failing test first, 100% service coverage target
- `kebab-case` files, `PascalCase` classes, `camelCase` methods
- Prisma only, **no raw SQL** ever
- RLS + `tenant_id` on ALL tables
- `@TenantId()` decorator on all tenant-scoped endpoints
- Controllers: class-validator DTOs only
- Services: throw domain exceptions (never HTTP exceptions)
- Audit all mutations via domain events (EventEmitter2)

## Multi-Tenancy Pattern
- JWT contains `userId:tenantId`
- TenantContextMiddleware sets `app.current_tenant` on PostgreSQL
- Row-Level Security policies isolate all tenant data
- NEVER query without tenant context

## PII Encryption Pattern
- AES-256-CBC for customer name, phone, email
- Encrypted fields: `encryptedPhone`, `encryptedEmail`
- Hash-based lookup fields for search without decryption
- Use `EncryptionService` - never encrypt manually

## Database
- PostgreSQL 15 + Prisma 5.22
- Schema: `backend/prisma/schema.prisma`
- Migrations: `backend/database/migrations/`
- Key models: Tenant, User, Customer, Booking, Vehicle, Inspection, WorkOrder, Part

## Environment
- `.env.example` for all required variables
- NEVER read/write `.env` files directly
- Required secrets: JWT_SECRET, ENCRYPTION_KEY, DATABASE_URL, REDIS_URL

## Compact Instructions
When compacting, preserve: test output, code changes made, file paths modified, architectural decisions, current task context, and error messages being debugged.
