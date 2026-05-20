# devops-engineer — memoria persistente

## Pipeline esistenti

- ci.yml: TS + lint + jest + Semgrep + npm audit + build
- Mancante: E2E Playwright, Lighthouse CI, k6 load, Sentry monitoring

## Service container template

- postgres:15, redis:7 sempre

## Cache strategy

- npm: actions/setup-node@v4 con cache: npm
- node version: 20

## Deploy targets

- Frontend: Vercel
- Backend: TBD (self-hosted vs Vercel/Render)

## Infrastructure Fixes (2026-05-14)

- ✅ FIX 1 (H3): Invoice model — added `@@index([tenantId, status, createdAt])`
  compound index for query performance
- ✅ FIX 2 (H1): render.yaml — pre-existing, backend config already in place
  with proper build/start commands, env vars, database/redis services
- ✅ FIX 3 (H4): CircuitBreakerService — already implemented with opossum
  library, includes Prisma/Redis breakers, metrics, logging, spec tests
- ✅ FIX 4 (H5): Dead Letter Queue — BullMQ queues (email, notification, sms)
  configured with removeOnFail > 0, all processors have @OnWorkerEvent('failed')
  listeners

## Staging Backend Setup (2026-05-16)

- ✅ TASK 1: render.yaml staging config
  - Backend service: nexo-backend-staging (starter plan, Frankfurt)
  - Database: nexo-db-staging (PostgreSQL 15, free tier, 256MB)
  - Redis: nexo-redis-staging (free tier, 30MB, allkeys-lru)
  - autoDeploy: false (manual trigger only, safety gate)
  - Health check: /readiness (includes DB + Redis checks), timeout 30s
  - All secrets via sync: false (manual config in Render dashboard)
  - Build: `cd backend && npm ci && npm run build`
  - Start: `cd backend && node dist/main`
  - Port: 3002 (default backend port)

- ✅ TASK 2: Health check endpoint
  - /health: Full check (DB + Redis), returns 200 if DB up, 503 if down
  - /readiness: Used by load balancer, 200 only if DB up (never serve during
    shutdown)
  - /liveness: Process alive check, always 200
  - All endpoints already implemented in
    backend/src/common/health/health.controller.ts
  - No changes needed, fully compliant with Kubernetes probe patterns

- ✅ TASK 3: Sentry documentation
  - Created: docs/SENTRY-SETUP.md (comprehensive guide)
  - Backend: @sentry/nestjs@^10.43.0 already in package.json
  - Integration file: backend/src/instrument.ts (imports in main.ts)
  - Config: auto-captures 500 errors, traces, profiles, DB/Redis latency
  - Setup steps: Create Sentry account → Copy DSN → Add to Render env vars →
    Deploy
  - Environment tags: traces sample rate 100% for staging (10% for prod)
  - No code changes needed, already instrumented

## Incident pattern (sync con incident-responder)

_(append qui)_
