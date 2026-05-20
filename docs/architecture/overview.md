# MechMind OS — Architecture Overview

**Ultimo aggiornamento:** 2026-04-04
**Generato da:** audit automatico codebase

MechMind OS e' un SaaS multi-tenant per officine meccaniche italiane.

## Numeri Reali del Codebase

| Area | Conteggio |
|------|-----------|
| Modelli Prisma | 110 |
| Indici Prisma (@@index/@@unique/@unique) | 373 |
| Schema lines | 4062 |
| Moduli NestJS | 46 |
| Controller | 73 |
| Service | 102 |
| DTO | 69 |
| Endpoint (decorator count) | 519 |
| Guards | 8 |
| Interceptors | 4 |
| Middleware | 3 |
| Listeners | 2 |
| Gateways (WebSocket) | 3 |
| File di test | 235 |
| Test cases | 4797 |
| Pagine frontend | 137 |
| Componenti React | 270 |
| Route API proxy | 303 |
| Skills Claude | 18 |
| Docs (.md) | 55 |

## Technology Stack

### Backend

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | NestJS | 10 |
| ORM | Prisma | 5.22 |
| Database | PostgreSQL | 15 |
| Cache / Queue | Redis + BullMQ | 7 |
| Auth | JWT (RS256) + Passport | - |
| Validation | class-validator + class-transformer | - |
| API docs | Swagger (@nestjs/swagger) | - |

### Frontend

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Next.js (App Router) | 14 |
| UI | TailwindCSS + Radix UI (shadcn) | - |
| Forms | react-hook-form + Zod | - |
| Data fetching | SWR | - |
| Toast | Sonner | - |
| Charts | Recharts | - |

### Infrastructure

| Layer | Technology |
|-------|------------|
| Containerization | Docker Compose (dev) |
| Services | PostgreSQL 15, Redis 7 |
| CI/CD | GitHub Actions |

## System Architecture

```
Browser/Mobile
    |
    v
Next.js 14 (porta 3000)
    |
    | app/api/*/route.ts (303 route proxy)
    | proxyToNestJS()
    v
NestJS 10 (porta 3002)
    |
    |--- 73 controller → 519 endpoint
    |--- 102 service (business logic)
    |--- 8 guard (auth, roles, throttle, MFA)
    |--- 4 interceptor (idempotency, logger, transform, timeout)
    |--- 3 middleware (auth, tenant-context, subscription)
    |--- 3 gateway (WebSocket: OBD, shop-floor, voice)
    |
    v
Prisma 5.22 (ORM, RLS via tenantId)
    |
    v
PostgreSQL 15 (110 modelli, 373 indici)
    |
Redis 7 (BullMQ, cache, pub-sub, rate limiting)
```

## Multi-Tenant Architecture

Approccio: **single database, tenantId su ogni riga** con Row-Level Security.

```
Request → JwtAuthGuard → @TenantId() decorator → tenantId nel where Prisma
                                                    ↓
                                          PrismaService.setTenantContext(tenantId)
                                                    ↓
                                          OGNI query: where: { tenantId, ... }
```

- 110 modelli Prisma, quasi tutti con `tenantId String`
- TenantContextMiddleware setta il contesto per ogni request
- PII criptati con EncryptionService (AES-256-CBC)

## Backend Module Map (53 moduli)

```
backend/src/
├── accounting/          — Contabilita', nota credito
├── admin/               — Admin panel, gestione tenant
├── ai-compliance/       — EU AI Act compliance
├── ai-diagnostic/       — Diagnostica AI veicoli
├── ai-scheduling/       — Scheduling intelligente
├── ai_act/              — Registri AI Act
├── analytics/           — KPI, reporting, ML integration
├── auth/                — JWT, MFA, passkey, OAuth, sessions
├── benchmarking/        — Benchmark officine
├── booking/             — Prenotazioni (advisory lock)
├── campaign/            — Campagne marketing
├── canned-job/          — Lavori predefiniti
├── common/              — PrismaService, EncryptionService, guards, interceptors
├── config/              — Configurazione env
├── customer/            — Gestione clienti, PII encrypt
├── declined-service/    — Servizi rifiutati
├── distributors/        — Fornitori ricambi
├── dpp/                 — Digital Product Passport
├── dvi/                 — Ispezioni digitali veicoli
├── estimate/            — Preventivi
├── fleet/               — Gestione flotte
├── gdpr/                — GDPR export/deletion
├── i18n/                — Internazionalizzazione
├── invoice/             — Fatturazione elettronica SDI
├── iot/                 — IoT (OBD, shop-floor)
├── kiosk/               — Chiosco accettazione
├── labor-guide/         — Tempari manodopera
├── lib/                 — Librerie condivise
├── location/            — Sedi multiple
├── membership/          — Programmi fedelta'
├── middleware/           — Auth, rate limiter
├── notifications/       — Email, SMS, push, webhook
├── obd/                 — Diagnostica OBD-II
├── parts/               — Ricambi, magazzino
├── payment-link/        — Link di pagamento
├── payroll/             — Gestione buste paga
├── portal/              — Portale clienti (20+ endpoint)
├── predictive-maintenance/ — Manutenzione predittiva
├── production-board/    — Lavagna produzione
├── public-token/        — Token pubblici (preventivi, ispezioni)
├── rentri/              — RENTRI gestione rifiuti
├── reviews/             — Recensioni clienti
├── security-incident/   — Incidenti sicurezza NIS2
├── services/            — Servizi esterni (VIES, P.IVA)
├── sms/                 — SMS thread
├── subscription/        — Abbonamenti Stripe
├── test/                — Utilities di test
├── tire/                — Gestione pneumatici
├── types/               — Tipi condivisi
├── vehicle-history/     — Storico veicoli
├── voice/               — Voice AI (Vapi)
├── webhooks/            — Webhook handler
└── work-order/          — Ordini di lavoro (state machine)
```

## Frontend Architecture

### Routing Tree (App Router)

```
frontend/app/
├── (landing)            — Landing page marketing
├── auth/                — Login, register, MFA, magic-link, forgot-password
├── dashboard/           — Area protetta titolare/tecnico
│   ├── analytics/       — KPI, benchmarking, tecnici
│   ├── bookings/        — Calendario prenotazioni
│   ├── customers/       — Gestione clienti (import, wizard 4 step)
│   ├── work-orders/     — Ordini di lavoro
│   ├── invoices/        — Fatturazione (credit note, quotes, financial)
│   ├── estimates/       — Preventivi
│   ├── inspections/     — Ispezioni DVI
│   ├── parts/           — Ricambi e magazzino
│   ├── vehicles/        — Veicoli e manutenzione
│   ├── obd/             — Diagnostica OBD
│   ├── marketing/       — Campagne e follow-up
│   ├── messaging/       — Messaggistica
│   ├── rentri/          — Gestione rifiuti RENTRI
│   ├── warranty/        — Garanzie e claims
│   ├── settings/        — Team, ruoli, sicurezza, audit, webhook
│   ├── production-board/— Lavagna produzione
│   ├── payroll/         — Buste paga
│   └── voice/           — Voice AI config
├── portal/              — Customer portal (21 pagine)
│   ├── bookings/        — Prenotazione appuntamenti
│   ├── estimates/       — Preventivi (accetta/rifiuta)
│   ├── invoices/        — Fatture
│   ├── tracking/        — Stato lavorazione
│   ├── maintenance/     — Manutenzioni
│   ├── warranty/        — Garanzie
│   ├── messages/        — Messaggi con officina
│   └── settings/        — Profilo cliente
├── public/              — Pagine pubbliche (preventivi, ispezioni, pagamenti)
├── kiosk/               — Chiosco accettazione
├── demo/                — Demo senza registrazione
├── tv/                  — Display TV officina
└── api/                 — 303 route proxy → backend NestJS
```

### Data Flow

```
Page → SWR hook → /app/api/[resource]/route.ts → proxyToNestJS() → Backend NestJS → Prisma+RLS → PostgreSQL
```

## Booking Flow (Advisory Lock)

```
1. Client richiede slot
2. BookingService acquisisce advisory lock (pg_advisory_xact_lock)
3. Verifica disponibilita' in transazione SERIALIZABLE
4. Crea booking + aggiorna slot
5. Rilascio lock automatico al commit
6. Notifica via BullMQ (email/SMS)
```

## Security Layers

```
Request → Rate Limiter (Redis) → JWT Auth → RBAC (RolesGuard) → Tenant Isolation (tenantId) → RLS → DB
                                    ↓
                              MFA Guard (TOTP/SMS)
                                    ↓
                              Audit Log (domain events)
```

- PII: AES-256-CBC via EncryptionService
- Password: bcrypt (12 rounds)
- JWT: RS256 con jti per revocabilita'
- GDPR: soft delete, export, consent management

## Performance Targets

| Metrica | Target | Alert |
|---------|--------|-------|
| API p95 | < 200ms | > 500ms |
| API p99 | < 500ms | > 1s |
| DB query | < 50ms | > 100ms |
| Webhook latency | < 2s | > 5s |
| Uptime | 99.9% | < 99.5% |
