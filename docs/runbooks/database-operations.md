# Database Operations Runbook

This runbook covers database maintenance, backup, restore, and migration procedures for MechMind OS PostgreSQL databases.

## Architecture Overview

```
┌─────────────────┐         ┌─────────────────┐
│  Primary DB     │◀───────▶│  Replica DB     │
│  (Read/Write)   │  Streaming │  (Read Only)  │
└────────┬────────┘  Replication └─────────────────┘
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

## Connection Information

| Environment | Host | Database | User |
|-------------|------|----------|------|
| Production | postgres.mechmind.internal | mechmind_prod | app_user |
| Staging | postgres-staging.mechmind.internal | mechmind_staging | app_user |
| Sandbox | postgres-sandbox.mechmind.internal | mechmind_sandbox | app_user |

## Daily Operations

### Health Check

```bash
# Check database connectivity
kubectl exec -it postgres-0 -- pg_isready -U app_user -d mechmind_prod

# Check replication lag
kubectl exec -it postgres-0 -- psql -U app_user -c "
  SELECT 
    client_addr,
    state,
    pg_size_pretty(pg_wal_lsn_diff(sent_lsn, flush_lsn)) as lag
  FROM pg_stat_replication;
"

# Check connection count
kubectl exec -it postgres-0 -- psql -U app_user -c "
  SELECT count(*), state 
  FROM pg_stat_activity 
  GROUP BY state;
"
```

### Connection Pool Monitoring

```sql
-- Check active connections by application
SELECT 
  application_name,
  count(*) as connections,
  state
FROM pg_stat_activity
WHERE datname = 'mechmind_prod'
GROUP BY application_name, state
ORDER BY connections DESC;

-- Check for long-running queries
SELECT 
  pid,
  usename,
  state,
  query_start,
  now() - query_start as duration,
  left(query, 100) as query_preview
FROM pg_stat_activity
WHERE state != 'idle'
  AND query_start < NOW() - INTERVAL '5 minutes'
ORDER BY query_start;
```

## Backup Procedures

### Automated Backups

Backups run automatically via cron:
- **Full backup**: Daily at 02:00 UTC
- **WAL archiving**: Continuous
- **Retention**: 30 days

### Manual Backup

```bash
# Create manual backup
kubectl exec -it postgres-0 -- pg_dump \
  -U app_user \
  -d mechmind_prod \
  -Fc \
  -f /backups/manual_backup_$(date +%Y%m%d_%H%M%S).dump

# Compress and upload to S3
kubectl cp postgres-0:/backups/manual_backup_*.dump ./
aws s3 cp manual_backup_*.dump s3://mechmind-backups/manual/

# Verify backup
pg_restore --list manual_backup_*.dump | head -20
```

### Backup Verification

```bash
# Weekly backup verification job
kubectl apply -f - <<EOF
apiVersion: CronJob
metadata:
  name: backup-verify
spec:
  schedule: "0 6 * * 0"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: verify
            image: postgres:15
            command:
            - /bin/sh
            - -c
            - |
              LATEST=$(aws s3 ls s3://mechmind-backups/daily/ | sort | tail -1 | awk '{print $4}')
              aws s3 cp s3://mechmind-backups/daily/$LATEST /tmp/backup.dump
              pg_restore --list /tmp/backup.dump > /dev/null && echo "Backup valid"
          restartPolicy: OnFailure
EOF
```

## Restore Procedures

### Point-in-Time Recovery

```bash
# 1. Stop application
kubectl scale deployment api --replicas=0

# 2. Restore from backup
kubectl exec -it postgres-0 -- pg_restore \
  -U postgres \
  -d mechmind_prod \
  --clean \
  --if-exists \
  /backups/backup_20240115_020000.dump

# 3. Verify restore
kubectl exec -it postgres-0 -- psql -U app_user -c "SELECT count(*) FROM bookings;"

# 4. Restart application
kubectl scale deployment api --replicas=3
```

### Replica Promotion (Failover)

```bash
# 1. Stop replication on replica
kubectl exec -it postgres-replica-0 -- psql -U postgres -c "SELECT pg_promote();"

# 2. Update service endpoints
kubectl patch service postgres -p '{"spec":{"selector":{"role":"primary"}}}'

# 3. Verify new primary
kubectl exec -it postgres-replica-0 -- psql -U postgres -c "SELECT pg_is_in_recovery();"
# Should return 'f' (false)

# 4. Rebuild old primary as replica (after recovery)
# ... rebuild procedure
```

## Migration Procedures

### Pre-Migration Checklist

- [ ] Migration tested in staging
- [ ] Backup completed
- [ ] Maintenance window scheduled
- [ ] Rollback plan documented
- [ ] Team notified

### Running Migrations

```bash
# Using migrate CLI
migrate -path ./migrations \
  -database "postgresql://app_user:password@postgres:5432/mechmind_prod?sslmode=require" \
  up

# Check migration status
migrate -path ./migrations \
  -database "postgresql://app_user:password@postgres:5432/mechmind_prod?sslmode=require" \
  version
```

### Migration Rollback

```bash
# Rollback one migration
migrate -path ./migrations \
  -database "postgresql://app_user:password@postgres:5432/mechmind_prod?sslmode=require" \
  down 1

# Rollback to specific version
migrate -path ./migrations \
  -database "postgresql://app_user:password@postgres:5432/mechmind_prod?sslmode=require" \
  goto 20240101000001
```

### Zero-Downtime Migrations

For large tables, use online migration strategy:

```sql
-- 1. Create new column
ALTER TABLE bookings ADD COLUMN new_status VARCHAR(20);

-- 2. Backfill in batches
DO $$
DECLARE
  batch_size INT := 1000;
  last_id UUID := '00000000-0000-0000-0000-000000000000';
  batch_count INT;
BEGIN
  LOOP
    UPDATE bookings 
    SET new_status = status
    WHERE id > last_id
    ORDER BY id
    LIMIT batch_size;
    
    GET DIAGNOSTICS batch_count = ROW_COUNT;
    EXIT WHEN batch_count = 0;
    
    COMMIT;
    PERFORM pg_sleep(0.1);
  END LOOP;
END $$;

-- 3. Add trigger for new writes
CREATE OR REPLACE FUNCTION sync_status()
RETURNS TRIGGER AS $$
BEGIN
  NEW.new_status = NEW.status;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bookings_status_sync
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION sync_status();

-- 4. Deploy code using new column

-- 5. Drop old column (after verification)
ALTER TABLE bookings DROP COLUMN status;
ALTER TABLE bookings RENAME COLUMN new_status TO status;
```

## Performance Optimization

### Query Analysis

```sql
-- Find slow queries
SELECT 
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  rows
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Reset statistics
SELECT pg_stat_statements_reset();
```

### Index Management

```sql
-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Find missing indexes
SELECT 
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  n_tup_ins,
  n_tup_upd,
  n_tup_del
FROM pg_stat_user_tables
WHERE seq_scan > 0
ORDER BY seq_tup_read DESC
LIMIT 10;

-- Create index concurrently (no locks)
CREATE INDEX CONCURRENTLY idx_bookings_customer_date 
ON bookings(customer_id, created_at);
```

### Vacuum and Analyze

```sql
-- Check table bloat
SELECT 
  schemaname,
  tablename,
  n_tup_ins,
  n_tup_upd,
  n_tup_del,
  n_live_tup,
  n_dead_tup
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC;

-- Manual vacuum
VACUUM ANALYZE bookings;

-- Vacuum full (requires lock, use with caution)
VACUUM FULL bookings;
```

## Security Operations

### Audit Log Review

```sql
-- Check failed login attempts
SELECT 
  usename,
  count(*) as failed_attempts,
  max(timestamp) as last_attempt
FROM pg_audit_log
WHERE event_type = 'login_failed'
  AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY usename
ORDER BY failed_attempts DESC;

-- Check privilege changes
SELECT *
FROM pg_audit_log
WHERE event_type IN ('grant', 'revoke')
  AND timestamp > NOW() - INTERVAL '7 days'
ORDER BY timestamp DESC;
```

### User Management

```sql
-- Create read-only user
CREATE USER readonly WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE mechmind_prod TO readonly;
GRANT USAGE ON SCHEMA public TO readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO readonly;

-- Rotate application password
ALTER USER app_user WITH PASSWORD 'new_secure_password';
-- Update Kubernetes secret
kubectl create secret generic db-credentials \
  --from-literal=password='new_secure_password' \
  --dry-run=client -o yaml | kubectl apply -f -
```

## Troubleshooting

### Connection Issues

```bash
# Check max connections
kubectl exec -it postgres-0 -- psql -U postgres -c "SHOW max_connections;"

# Check current connections
kubectl exec -it postgres-0 -- psql -U postgres -c "
  SELECT count(*) FROM pg_stat_activity;
"

# Increase connection limit (requires restart)
kubectl patch configmap postgres-config --patch '{"data":{"max_connections":"500"}}'
kubectl rollout restart statefulset postgres
```

### Lock Contention

```sql
-- Check blocking queries
SELECT 
  blocked_locks.pid AS blocked_pid,
  blocked_activity.usename AS blocked_user,
  blocking_locks.pid AS blocking_pid,
  blocking_activity.usename AS blocking_user,
  blocked_activity.query AS blocked_statement,
  blocking_activity.query AS blocking_statement
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks 
  ON blocking_locks.locktype = blocked_locks.locktype
  AND blocking_locks.relation = blocked_locks.relation
  AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;

-- Terminate blocking process (use with caution)
SELECT pg_terminate_pid(blocking_pid) FROM (...above query...);
```

### Disk Space Issues

```bash
# Check disk usage
kubectl exec -it postgres-0 -- df -h

# Check database sizes
kubectl exec -it postgres-0 -- psql -U postgres -c "
  SELECT 
    datname,
    pg_size_pretty(pg_database_size(datname))
  FROM pg_database
  ORDER BY pg_database_size(datname) DESC;
"

# Check table sizes
kubectl exec -it postgres-0 -- psql -U app_user -c "
  SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
  LIMIT 20;
"
```

## Emergency Contacts

| Role | Contact | Escalation |
|------|---------|------------|
| DBA On-Call | PagerDuty | +1 hour |
| Engineering Lead | Slack @eng-lead | +2 hours |
| VP Engineering | Slack @vp-eng | +4 hours |
