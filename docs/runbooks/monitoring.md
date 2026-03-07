# Monitoring & Alerting Runbook

This runbook covers monitoring systems, alert response procedures, and metric interpretation for MechMind OS.

## Monitoring Stack

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Applications   │────▶│   Prometheus    │────▶│    Grafana      │
│   (Metrics)     │     │   (Collection)  │     │  (Dashboards)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                                               │
         │                      ┌─────────────────┐      │
         └─────────────────────▶│   AlertManager  │◀─────┘
                                │   (Alerts)      │
                                └────────┬────────┘
                                         │
                                ┌────────▼────────┐
                                │  PagerDuty/     │
                                │    Slack        │
                                └─────────────────┘
```

## Key Metrics

### Application Metrics

| Metric | Description | Warning | Critical |
|--------|-------------|---------|----------|
| `api_requests_total` | Total API requests | - | - |
| `api_errors_total` | Total API errors | > 1% | > 5% |
| `api_response_time_seconds` | Response time | > 500ms | > 2s |
| `api_active_requests` | Concurrent requests | > 100 | > 500 |

### Database Metrics

| Metric | Description | Warning | Critical |
|--------|-------------|---------|----------|
| `db_connections_active` | Active connections | > 80% | > 95% |
| `db_query_duration_seconds` | Query duration | > 100ms | > 1s |
| `db_replication_lag_seconds` | Replica lag | > 5s | > 30s |
| `db_deadlocks_total` | Deadlock count | > 0/hr | > 10/hr |

### Infrastructure Metrics

| Metric | Description | Warning | Critical |
|--------|-------------|---------|----------|
| `cpu_usage_percent` | CPU utilization | > 70% | > 90% |
| `memory_usage_percent` | Memory utilization | > 80% | > 95% |
| `disk_usage_percent` | Disk utilization | > 80% | > 90% |
| `pod_restarts_total` | Pod restart count | > 3/hr | > 10/hr |

## Alert Response Procedures

### High Error Rate Alert

**Alert**: `api_errors_total > 5%`

**Response**:

1. **Verify alert**:
   ```bash
   # Check error rate in Datadog
   datadog query "sum:mechmind.api.errors{*}.as_rate() / sum:mechmind.api.requests{*}.as_rate() * 100"
   ```

2. **Identify error source**:
   ```bash
   # Check logs
   kubectl logs -l app=api --tail=1000 | grep ERROR
   
   # Check error distribution
   kubectl logs -l app=api | grep ERROR | awk '{print $5}' | sort | uniq -c | sort -rn
   ```

3. **Common causes**:
   - Recent deployment issue → Rollback
   - Database connectivity → Check DB health
   - External service failure → Check dependencies
   - Traffic spike → Scale up

4. **Escalate if**: Error rate > 10% or customer-facing impact

### High Latency Alert

**Alert**: `api_response_time_seconds > 2s`

**Response**:

1. **Check latency distribution**:
   ```bash
   # P95/P99 latency
   datadog query "avg:mechmind.api.response_time.95percentile{*}"
   ```

2. **Identify slow endpoints**:
   ```bash
   # Check slow queries in database
   kubectl exec -it postgres-0 -- psql -U app_user -c "
     SELECT query, mean_exec_time 
     FROM pg_stat_statements 
     ORDER BY mean_exec_time DESC 
     LIMIT 10;
   "
   ```

3. **Common causes**:
   - Missing database indexes → Add indexes
   - N+1 queries → Optimize code
   - External API slowness → Enable circuit breaker
   - Resource exhaustion → Scale up

### Database Connection Alert

**Alert**: `db_connections_active > 80%`

**Response**:

1. **Check connection usage**:
   ```sql
   -- Check active connections
   SELECT count(*), state 
   FROM pg_stat_activity 
   GROUP BY state;
   
   -- Check connections by application
   SELECT application_name, count(*) 
   FROM pg_stat_activity 
   GROUP BY application_name;
   ```

2. **Identify connection leaks**:
   ```sql
   -- Long-running idle connections
   SELECT pid, usename, state, query_start
   FROM pg_stat_activity
   WHERE state = 'idle in transaction'
     AND query_start < NOW() - INTERVAL '5 minutes';
   ```

3. **Immediate actions**:
   ```bash
   # Terminate idle connections
   kubectl exec -it postgres-0 -- psql -U postgres -c "
     SELECT pg_terminate_pid(pid) 
     FROM pg_stat_activity 
     WHERE state = 'idle in transaction' 
       AND query_start < NOW() - INTERVAL '10 minutes';
   "
   
   # Scale connection pool
   kubectl set env deployment/api DB_POOL_SIZE=50
   ```

### Disk Space Alert

**Alert**: `disk_usage_percent > 80%`

**Response**:

1. **Check disk usage**:
   ```bash
   kubectl exec -it postgres-0 -- df -h
   ```

2. **Check database size**:
   ```sql
   -- Table sizes
   SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
   FROM pg_tables
   ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
   LIMIT 20;
   ```

3. **Free space**:
   ```bash
   # Vacuum to reclaim space
   kubectl exec -it postgres-0 -- psql -U postgres -c "VACUUM FULL;"
   
   # Expand PVC
   kubectl patch pvc postgres-data -p '{"spec":{"resources":{"requests":{"storage":"500Gi"}}}}'
   ```

## Dashboards

### Main Dashboard

URL: https://grafana.mechmind.io/d/mechmind-main

Panels:
- Request rate and errors
- Response time percentiles
- Active connections
- Database metrics
- Infrastructure health

### Voice System Dashboard

URL: https://grafana.mechmind.io/d/mechmind-voice

Panels:
- Call volume
- Booking conversion rate
- Webhook latency
- Vapi API health

### Business Metrics Dashboard

URL: https://grafana.mechmind.io/d/mechmind-business

Panels:
- Bookings per hour/day
- Revenue
- Customer satisfaction
- Mechanic utilization

## Log Analysis

### Centralized Logging

Platform: Datadog Log Management

URL: https://app.datadoghq.com/logs

### Common Queries

```
# API errors
source:mechmind status:error

# Slow requests
source:mechmind @duration:>2000

# Voice webhook failures
source:mechmind service:voice @level:error

# Database errors
source:mechmind service:postgres @level:error

# Specific customer issue
source:mechmind @customer_id:550e8400-e29b-41d4-a716-446655440000
```

### Log Correlation

```bash
# Correlate logs across services
kubectl logs -l app=api --since=1h | grep "request_id=abc123"
kubectl logs -l app=voice --since=1h | grep "request_id=abc123"
kubectl logs -l app=postgres --since=1h | grep "request_id=abc123"
```

## Synthetic Monitoring

### Uptime Checks

| Check | URL | Frequency | Alert Threshold |
|-------|-----|-----------|-----------------|
| API Health | /v1/admin/health | 1 min | 2 failures |
| Booking Flow | /v1/slots | 5 min | 1 failure |
| Voice Webhook | /webhooks/vapi/call-event | 1 min | 2 failures |

### Run Synthetic Tests

```bash
# Manual health check
curl -f https://api.mechmind.io/v1/admin/health

# Test booking flow
curl -X POST https://api.mechmind.io/v1/bookings/reserve \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"slot_id":"test","mechanic_id":"test","customer_phone":"+15555555555"}'
```

## Alert Configuration

### Prometheus Alert Rules

```yaml
# alerts.yaml
groups:
  - name: mechmind-api
    rules:
      - alert: HighErrorRate
        expr: |
          (
            sum(rate(api_errors_total[5m])) 
            / sum(rate(api_requests_total[5m]))
          ) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          
      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(api_response_time_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High API latency detected"
          
      - alert: DatabaseConnectionsHigh
        expr: db_connections_active / db_connections_max > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Database connection pool near capacity"
```

## On-Call Checklist

### Shift Start

- [ ] Review open alerts
- [ ] Check system health dashboard
- [ ] Review recent deployments
- [ ] Check error logs for anomalies
- [ ] Verify backup status

### During Shift

- [ ] Monitor #alerts Slack channel
- [ ] Respond to PagerDuty pages within SLA
- [ ] Document all incidents
- [ ] Communicate status in #incidents

### Shift End

- [ ] Document unresolved issues
- [ ] Hand off to next on-call
- [ ] Update runbooks if needed

## Useful Commands

```bash
# Check all pod status
kubectl get pods --all-namespaces

# Check resource usage
kubectl top pods
kubectl top nodes

# View recent events
kubectl get events --sort-by='.lastTimestamp' | tail -20

# Check ingress
kubectl get ingress
kubectl describe ingress api-ingress

# Port forward for debugging
kubectl port-forward svc/api 8080:80

# Execute commands in pod
kubectl exec -it deployment/api -- /bin/sh

# Check ConfigMaps
kubectl get configmaps
kubectl describe configmap api-config

# Check Secrets (names only)
kubectl get secrets
```
