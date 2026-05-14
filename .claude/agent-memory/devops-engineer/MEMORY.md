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

## Incident pattern (sync con incident-responder)

_(append qui)_
