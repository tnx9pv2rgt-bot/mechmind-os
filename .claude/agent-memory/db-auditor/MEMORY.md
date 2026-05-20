# db-auditor — memoria persistente

## Modelli tenant-scoped (canonical list)

booking, customer, estimate, fleet, inspection, invoice, notification, part,
purchaseOrder, service, subscription, user, vehicle, workOrder, smsThread,
obdDevice, obdReading, auditLog, campaign, inventoryItem, supplier, technician

## Eccezioni cross-tenant autorizzate

- Cron: processPending, markOverdue, sendReminders → operano su tutti i tenant
  per design
- Auth: query userId/email (globalmente unico)
- Webhook: lookup per external_id DOPO verifica HMAC
- GDPR: export/delete cross-tenant per legge

## Pattern N+1 storici

_(append qui quando trovati: file:linea + fix consigliato)_

## Index mancanti documentati

_(append qui)_

## Raw SQL autorizzato

- `PrismaService.setTenantContext()` — `SET app.current_tenant` per RLS
- `PrismaService.acquireAdvisoryLock()` — `pg_try_advisory_lock`
- `HealthController.checkDatabase()` — `SELECT 1`
- Materialized view refresh (analytics)

## Lezioni accumulate

_(append-only)_
