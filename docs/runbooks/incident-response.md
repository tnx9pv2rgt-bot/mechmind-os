# Incident Response Runbook

This runbook provides procedures for handling incidents in the MechMind OS production environment.

## Severity Levels

| Level | Name | Response Time | Examples |
|-------|------|---------------|----------|
| P0 | Critical | 15 minutes | Complete outage, data loss, security breach |
| P1 | High | 1 hour | Major feature degraded, booking system down |
| P2 | Medium | 4 hours | Partial degradation, non-critical bugs |
| P3 | Low | 24 hours | Minor issues, feature requests |

## On-Call Procedures

### Getting Alerted

1. **PagerDuty** alerts are the primary notification method
2. **Slack** #incidents channel for awareness
3. **Phone call** for P0/P1 incidents

### Initial Response (First 5 Minutes)

1. **Acknowledge** the alert in PagerDuty
2. **Join** the incident Slack channel: `#incident-{YYYY-MM-DD}-{id}`
3. **Assess** severity and impact
4. **Communicate** in Slack that you're investigating

```
@channel - I'm investigating [alert description]. 
Current status: Investigating
Impact: [initial assessment]
ETA for update: 10 minutes
```

### Investigation Checklist

- [ ] Check system status dashboard: https://status.mechmind.io
- [ ] Review recent deployments: `kubectl rollout history deployment/api`
- [ ] Check error rates in Datadog
- [ ] Review application logs: `kubectl logs -f deployment/api`
- [ ] Check database health: `kubectl exec -it postgres -- pg_isready`
- [ ] Verify external dependencies (Vapi, SendGrid, etc.)

## P0 Incident Response

### Complete Outage

**Symptoms**: API returns 503, website unreachable, all bookings failing

**Immediate Actions**:

1. **Page additional on-call** if needed
2. **Check infrastructure status**:
   ```bash
   # Check cluster status
   kubectl get nodes
   kubectl get pods --all-namespaces
   
   # Check ingress
   kubectl get ingress
   kubectl describe ingress api-ingress
   ```

3. **Check recent deployments**:
   ```bash
   # View recent deployments
   kubectl rollout history deployment/api
   
   # Check for failed pods
   kubectl get pods | grep -v Running
   ```

4. **If deployment caused issue, rollback**:
   ```bash
   # Rollback to previous version
   kubectl rollout undo deployment/api
   
   # Monitor rollback
   kubectl rollout status deployment/api
   ```

5. **Scale up if resource exhaustion**:
   ```bash
   # Scale API pods
   kubectl scale deployment api --replicas=10
   
   # Check HPA status
   kubectl get hpa
   ```

### Database Outage

**Symptoms**: DB connection errors, query timeouts

**Immediate Actions**:

1. **Check database pod status**:
   ```bash
   kubectl get pods -l app=postgres
   kubectl describe pod postgres-0
   ```

2. **Check connection pool**:
   ```sql
   -- Run in database
   SELECT count(*), state FROM pg_stat_activity GROUP BY state;
   ```

3. **If primary is down, failover**:
   ```bash
   # Trigger failover to replica
   kubectl exec -it postgres-replica-0 -- pg_ctl promote
   
   # Update connection strings
   kubectl apply -f config/db-primary-replica.yaml
   ```

4. **If disk full**:
   ```bash
   # Check disk usage
   kubectl exec -it postgres-0 -- df -h
   
   # Expand PVC
   kubectl patch pvc postgres-data -p '{"spec":{"resources":{"requests":{"storage":"500Gi"}}}}'
   ```

### Voice System Outage

**Symptoms**: Vapi webhooks failing, voice bookings not working

**Immediate Actions**:

1. **Check Vapi status**: https://status.vapi.ai
2. **Verify webhook endpoint**:
   ```bash
   curl -I https://api.mechmind.io/webhooks/vapi/call-event
   ```

3. **Check webhook logs**:
   ```bash
   kubectl logs -l app=api --tail=100 | grep webhook
   ```

4. **Enable fallback mode** (manual booking):
   ```bash
   # Enable fallback
   kubectl set env deployment/api VOICE_FALLBACK_ENABLED=true
   ```

## P1 Incident Response

### Booking System Degraded

**Symptoms**: Slow bookings, slot conflicts, double bookings

**Investigation**:

1. **Check advisory locks**:
   ```sql
   SELECT * FROM pg_locks WHERE locktype = 'advisory';
   ```

2. **Check for lock contention**:
   ```sql
   SELECT pid, state, query_start, query 
   FROM pg_stat_activity 
   WHERE state != 'idle' AND query_start < NOW() - INTERVAL '5 minutes';
   ```

3. **Clear stuck locks** if necessary:
   ```sql
   -- Identify and terminate stuck processes
   SELECT pg_terminate_pid(pid) FROM pg_stat_activity 
   WHERE state = 'idle in transaction' AND query_start < NOW() - INTERVAL '10 minutes';
   ```

### High Error Rate

**Symptoms**: Error rate > 5%, latency > 2s

**Investigation**:

1. **Check error distribution**:
   ```bash
   # View error breakdown
   kubectl logs -l app=api --tail=1000 | grep ERROR | sort | uniq -c | sort -rn
   ```

2. **Check external dependencies**:
   ```bash
   # Test Vapi connectivity
   curl https://api.vapi.ai/health
   
   # Test SendGrid
   curl https://api.sendgrid.com/v3/user/profile -H "Authorization: Bearer $SENDGRID_KEY"
   ```

3. **Enable circuit breakers** if needed:
   ```bash
   kubectl set env deployment/api CIRCUIT_BREAKER_ENABLED=true
   ```

## Communication Templates

### Initial Notification

```
🚨 INCIDENT ALERT 🚨
Severity: P{0-3}
Service: {service name}
Impact: {brief description}
Started: {timestamp}
Status: Investigating

Next update in: 15 minutes
Incident channel: #incident-{date}-{id}
```

### Status Update

```
📊 INCIDENT UPDATE
Status: {Investigating/Identified/Monitoring/Resolved}
Duration: {X minutes}

What we know:
- {fact 1}
- {fact 2}

What we're doing:
- {action 1}
- {action 2}

Next update: {time}
```

### Resolution

```
✅ INCIDENT RESOLVED
Duration: {X minutes}
Resolution: {brief description}

Root cause: {description}
Preventive actions: {list}

Post-mortem: {link to doc}
```

## Post-Incident Procedures

### Within 24 Hours

1. **Create incident timeline**
2. **Document root cause**
3. **Identify preventive measures**
4. **Schedule post-mortem meeting**

### Post-Mortem Template

```markdown
# Incident Post-Mortem: [Title]

## Summary
- Date: 
- Duration: 
- Severity: 
- Impact: 

## Timeline
- 09:00 - Alert fired
- 09:05 - On-call acknowledged
- 09:15 - Issue identified
- 09:30 - Mitigation applied
- 10:00 - Service restored

## Root Cause
[Detailed explanation]

## Resolution
[Steps taken to resolve]

## Lessons Learned
- What went well:
- What could be better:

## Action Items
- [ ] Action 1 (Owner, Due Date)
- [ ] Action 2 (Owner, Due Date)
```

## Escalation Contacts

| Role | Name | Phone | Slack |
|------|------|-------|-------|
| Primary On-Call | Rotation | PagerDuty | @oncall |
| Engineering Lead | TBD | TBD | @eng-lead |
| VP Engineering | TBD | TBD | @vp-eng |
| CTO | TBD | TBD | @cto |

## Useful Commands

```bash
# Quick health check
curl https://api.mechmind.io/v1/admin/health

# View recent logs
kubectl logs -l app=api --tail=100 -f

# Check resource usage
kubectl top pods

# Restart deployment
kubectl rollout restart deployment/api

# Scale deployment
kubectl scale deployment api --replicas=5

# Port forward for debugging
kubectl port-forward svc/postgres 5432:5432

# Database backup check
kubectl exec -it postgres-0 -- pg_dump -Fc dbname > backup.dump
```
