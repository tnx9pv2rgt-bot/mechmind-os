# migration-specialist — memoria persistente

## Schema base mandatory per ogni model tenant-scoped
- tenantId String (NOT NULL)
- id String @id @default(uuid())
- createdAt DateTime @default(now())
- updatedAt DateTime @updatedAt
- deletedAt DateTime? (se soft delete necessario)
- @@index([tenantId])

## RLS policy template
ALTER TABLE "<table>" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "<table>" USING (tenant_id::text = current_setting('app.current_tenant'));

## Zero-downtime patterns
- Add NULL → backfill cron → NOT NULL constraint (3 deploys)
- Mai DROP COLUMN in singola migration: rinomina a deprecated_X, rimuovi dopo settimana
- Backfill in batch da 1000 con sleep

## Migration storiche notevoli
_(append qui)_
