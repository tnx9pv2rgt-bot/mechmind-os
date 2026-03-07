# 🛠️ Engineering Practices & Operations

> **MechMind OS** — Engineering Excellence through disciplined execution
> 
> *"Excellence is not an act, but a habit."* — Aristotle, probably after a solid CI/CD pipeline

---

## 1. 🏆 Engineering Excellence

### 1.1 Development Workflow

#### Trunk-Based Development
```
┌─────────────────────────────────────────────────────────────┐
│                    MAIN BRANCH (production)                 │
│                             │                               │
│    ┌────────────┐    ┌──────┴──────┐    ┌────────────┐     │
│    │ feature/*  │    │ hotfix/*    │    │ release/*  │     │
│    │  < 3 days  │    │  immediate  │    │   weekly   │     │
│    └─────┬──────┘    └──────┬──────┘    └─────┬──────┘     │
│          │                  │                  │            │
│          └──────────────────┼──────────────────┘            │
│                             ▼                               │
│                    PR → Review → Merge                      │
└─────────────────────────────────────────────────────────────┘
```

**Core Principles:**
- ✅ **Single source of truth**: `main` branch always deployable
- ✅ **Short-lived branches**: Max 3 days lifetime
- ✅ **Feature flags**: Dark launches for incomplete features
- ✅ **No long-running branches**: Rebase, don't merge from main

#### Pull Request Requirements

| Requirement | Threshold | Enforcement |
|-------------|-----------|-------------|
| Lines of Code | `< 400 LOC` | Bot blocks oversized PRs |
| Code Review | `2 approvals` | Branch protection rule |
| CI Status | `All green` | Required status checks |
| Linear History | `Squash merge` | Enforced by GitHub |
| Description | `Required` | Template enforced |

**PR Template:**
```markdown
## 📝 Change Summary
- **JIRA**: [PROJ-123](link)
- **Type**: Feature | Bugfix | Refactor | Hotfix
- **Risk Level**: Low | Medium | High

## ✅ Checklist
- [ ] Tests added/updated
- [ ] TypeScript strict mode passes
- [ ] Documentation updated
- [ ] Feature flag added (if applicable)

## 🧪 Testing Evidence
<!-- Screenshots, test results, loom video -->
```

#### CI/CD Pipeline (8 Stages)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CONTINUOUS INTEGRATION PIPELINE                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐  │
│   │  BUILD   │──▶│   LINT   │──▶│   TEST   │──▶│  SAFETY  │──▶│ SECURITY │  │
│   │  ~30s    │   │  ~15s    │   │  ~45s    │   │  ~20s    │   │  ~30s    │  │
│   └──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘  │
│         │                                                            │      │
│         ▼                                                            ▼      │
│   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌─────────────────────────┐  │
│   │  BUILD   │──▶│   E2E    │──▶│  PERF    │──▶│      DEPLOYMENT         │  │
│   │   DOCS   │   │ ~2m 30s  │   │  ~15s    │   │   Staging → Production  │  │
│   └──────────┘   └──────────┘   └──────────┘   └─────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Stage | Description | Tools | Duration |
|-------|-------------|-------|----------|
| 1. **Build** | TypeScript compilation, dependency install | `pnpm`, `tsc` | ~30s |
| 2. **Lint** | ESLint, Prettier, commit message | `eslint`, `prettier` | ~15s |
| 3. **Test** | Unit tests with coverage | `jest` | ~45s |
| 4. **Safety** | TypeScript strict mode check | `tsc --noEmit` | ~20s |
| 5. **Security** | Dependency audit, SAST scan | `npm audit`, `snyk` | ~30s |
| 6. **Build Docs** | API docs, Storybook build | `storybook`, `typedoc` | ~60s |
| 7. **E2E Tests** | Integration & E2E testing | `playwright` | ~2m 30s |
| 8. **Performance** | Bundle analysis, Lighthouse | `lighthouse`, `bundlesize` | ~15s |

**Pipeline Metrics:**
```
🎯 Target:  < 5 minutes end-to-end
📊 Current:  4m 15s (P50)
🚨 SLO:      < 6 minutes (95th percentile)
```

---

### 1.2 Quality Gates

| Gate | Tool | Threshold | Fail Action | Owner |
|------|------|-----------|-------------|-------|
| 🧪 Unit Tests | Jest | `> 90% coverage` | 🔴 Block merge | Engineering |
| 🎭 E2E Tests | Playwright | `212 tests passing` | 🔴 Block deploy | QA |
| 🔷 Type Safety | TypeScript | `Strict mode: zero errors` | 🔴 Block build | Engineering |
| 🔒 Security | npm audit | `0 high/critical` | 🔴 Block pipeline | Security |
| ⚡ Performance | Lighthouse | `> 90 score` | 🟡 Warning (Slack) | Platform |
| 📦 Bundle Size | bundlesize | `< 200KB main bundle` | 🟡 Warning (Slack) | Frontend |
| 📚 Documentation | Storybook | `100% public components` | 🟡 Warning | Docs |

**Coverage Enforcement:**
```javascript
// jest.config.js
{
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  }
}
```

---

### 1.3 Observability Strategy

#### The Three Pillars

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           OBSERVABILITY STACK                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────┐      ┌─────────────┐      ┌─────────────┐                 │
│   │    LOGS     │      │   METRICS   │      │   TRACES    │                 │
│   │   Winston   │      │  Prometheus │      │   Jaeger    │                 │
│   │  + Datadog  │      │   + Grafana │      │+ OpenTelemetry│                │
│   │             │      │             │      │             │                 │
│   │  "What     │      │  "How much  │      │  "Where did │                 │
│   │   happened?│"     │   is it?"   │      │   it go?"   │                 │
│   └──────┬──────┘      └──────┬──────┘      └──────┬──────┘                 │
│          │                    │                    │                         │
│          └────────────────────┼────────────────────┘                         │
│                               ▼                                              │
│                     ┌─────────────────┐                                      │
│                     │   DATADOG /     │                                      │
│                     │   GRAFANA CLOUD │                                      │
│                     └─────────────────┘                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Logging Standards (Winston)

```typescript
// Structured logging with correlation IDs
const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'mechmind-api',
    environment: process.env.NODE_ENV
  }
});

// Usage
logger.info('Order processed', {
  orderId: 'ord_123',
  customerId: 'cus_456',
  amount: 99.99,
  duration: 245, // ms
  traceId: context.traceId
});
```

**Log Levels by Environment:**
| Environment | Level | Retention | Sampling |
|-------------|-------|-----------|----------|
| Local | `debug` | Console only | 100% |
| Staging | `info` | 7 days | 100% |
| Production | `warn` | 30 days | 100% errors, 1% info |

#### Metrics & SLIs/SLOs

**Service Level Indicators (SLIs):**

| SLI | Metric | Source |
|-----|--------|--------|
| Availability | HTTP 200 rate | `http_requests_total{status!~"5.."}` |
| Latency | P50, P95, P99 response time | `http_request_duration_seconds` |
| Error Rate | 5xx rate / total requests | `rate(http_requests_total{status=~"5.."}[5m])` |
| Saturation | CPU, memory, DB connections | Node.js + RDS metrics |

**Service Level Objectives (SLOs):**

| SLO | Target | Burn Rate Alert |
|-----|--------|-----------------|
| Availability | `99.9%` | 2% budget/day = page |
| P50 Latency | `< 100ms` | 5min > 150ms = alert |
| P95 Latency | `< 500ms` | 5min > 750ms = alert |
| Error Rate | `< 0.1%` | 1% for 5min = page |

```promql
# SLO Query Examples
# Availability SLO
sum(rate(http_requests_total{status!~"5.."}[30d])) 
/ sum(rate(http_requests_total[30d]))

# Error Budget (monthly)
1 - (
  sum(rate(http_requests_total{status=~"5.."}[30d])) 
  / sum(rate(http_requests_total[30d]))
) - 0.999  // Should be > 0
```

#### Distributed Tracing (OpenTelemetry)

```typescript
// Automatic instrumentation
import { NodeSDK } from '@opentelemetry/sdk-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';

const sdk = new NodeSDK({
  traceExporter: new JaegerExporter({
    endpoint: process.env.JAEGER_ENDPOINT
  }),
  serviceName: 'mechmind-api'
});

// Manual span for critical operations
const span = tracer.startSpan('process-order');
span.setAttribute('order.id', orderId);
span.setAttribute('customer.tier', 'premium');
// ... operation ...
span.end();
```

---

### 1.4 Incident Response

#### Severity Matrix

| Severity | Description | Response Time | Escalation | Page? |
|----------|-------------|---------------|------------|-------|
| 🔴 **SEV 0** | Complete outage, revenue impact | **5 min** | CEO + CTO + Eng VP | 🔥 YES |
| 🟠 **SEV 1** | Critical feature down, workaround exists | **15 min** | CTO + Eng Director | 🔥 YES |
| 🟡 **SEV 2** | Major degradation, partial impact | **1 hour** | Eng Manager | ✅ Yes (biz hours) |
| 🟢 **SEV 3** | Minor impact, internal tools affected | **4 hours** | Team Lead | ❌ No |
| 🔵 **SEV 4** | Cosmetic, no user impact | **24 hours** | — | ❌ No |

#### Incident Response Playbook

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      INCIDENT LIFECYCLE                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   DETECT ──▶ ACK ──▶ MITIGATE ──▶ RESOLVE ──▶ POSTMORTEM                   │
│      │        │        │           │           │                            │
│      ▼        ▼        ▼           ▼           ▼                            │
│   PagerDuty  Status   Rollback   All Clear   5 Whys                        │
│   Alert      Page     Hotfix     Deploy      Document                       │
│                                                                              │
│   SLAs: 5min  2min    30min      1hr         48hr                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**On-Call Rotation:**
| Role | Rotation | Escalation |
|------|----------|------------|
| Primary | Weekly rotation | Auto-escalate in 15 min |
| Secondary | Same as primary + 1 | Auto-escalate in 30 min |
| Manager | On-demand | Paged if no response |

**Communication Channels:**
- 🔥 **SEV 0-1**: `#incidents-war-room` (Slack) + Bridge call
- 🟡 **SEV 2-3**: `#incidents` channel only
- 📢 **Status Page**: status.mechmind.io (SEV 0-2)

---

## 2. 📋 Operations Runbook

### 2.1 System Health Dashboard

#### Real-Time Status

| Component | Status | Latency | Throughput | Error Rate | Last Deploy |
|-----------|--------|---------|------------|------------|-------------|
| 🌐 Frontend (Vercel) | 🟢 Operational | 45ms | 2.4K rpm | 0.01% | 2026-03-02 14:32 |
| ⚡ API (NestJS) | 🟢 Operational | 89ms | 1.8K rpm | 0.05% | 2026-03-02 14:30 |
| 🗄️ Database (RDS) | 🟢 Operational | 12ms | 4.2K qps | 0.00% | — |
| ⚡ Redis Cache | 🟢 Operational | 3ms | 12K ops | 0.00% | — |
| 📨 Queue (Bull) | 🟢 Operational | — | 450 jobs/min | 0.02% | — |
| 🔍 Search (Meilisearch) | 🟢 Operational | 25ms | 890 qps | 0.01% | 2026-03-01 09:00 |

#### Status Legend
```
🟢 Operational      — All systems nominal
🟡 Degraded         — Performance impacted, functioning
🟠 Partial Outage   — Some features unavailable
🔴 Major Outage     — Service completely down
⚫ Maintenance       — Planned downtime
```

**Dashboard URLs:**
- Grafana: `https://grafana.mechmind.io/d/system-health`
- Vercel Analytics: `https://vercel.com/dashboard/analytics`
- Datadog APM: `https://app.datadoghq.com/apm/services`

---

### 2.2 Deployment Playbook

#### Pre-Deployment Checklist

```markdown
## ✅ Pre-Deploy Checklist

### Code Quality
- [ ] All PRs merged to `main`
- [ ] CI/CD pipeline green on `main`
- [ ] Code coverage > 90%
- [ ] No TypeScript errors (strict mode)
- [ ] Security audit passed (0 high/critical)

### Testing
- [ ] E2E tests passing (212/212)
- [ ] Staging smoke tests passed
- [ ] Performance regression < 10%
- [ ] Mobile responsive verified

### Documentation
- [ ] CHANGELOG.md updated
- [ ] API docs regenerated
- [ ] Feature flags documented
- [ ] Runbook updated (if new components)

### Monitoring
- [ ] Alert thresholds reviewed
- [ ] Dashboards updated
- [ ] Rollback plan documented
- [ ] On-call engineer notified
```

#### Blue/Green Deployment Steps

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      BLUE/GREEN DEPLOYMENT FLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Step 1: Pre-Deploy                Step 2: Deploy Green                     │
│   ┌─────────────────┐               ┌─────────────────┐                      │
│   │   🔵 Blue       │               │   🔵 Blue       │                      │
│   │   (Current)     │────Deploy───▶│   (Current)     │                      │
│   │   100% Traffic  │               │   100% Traffic  │                      │
│   └─────────────────┘               │   🟢 Green      │                      │
│                                     │   (New) 0%      │                      │
│                                     └─────────────────┘                      │
│                                                                              │
│   Step 3: Traffic Split             Step 4: Full Cutover                     │
│   ┌─────────────────┐               ┌─────────────────┐                      │
│   │   🔵 Blue 90%   │               │   🔵 Blue 0%    │                      │
│   │   🟢 Green 10%  │────Verify───▶│   🟢 Green 100% │                      │
│   │   (Canary)      │               │   (Production)  │                      │
│   └─────────────────┘               └─────────────────┘                      │
│                                                                              │
│   Step 5: Validation                Step 6: Cleanup                          │
│   Monitor for 30 min                Keep Blue for 1 hour, then destroy       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Deployment Commands:**
```bash
# 1. Deploy to staging
./scripts/deploy.sh --env staging --version $(git rev-parse --short HEAD)

# 2. Run smoke tests
pnpm test:smoke --env staging

# 3. Deploy to production (blue/green)
./scripts/deploy.sh --env production --strategy blue-green

# 4. Verify deployment
./scripts/verify-deploy.sh --env production

# 5. Monitor for 30 minutes
./scripts/monitor-deploy.sh --duration 30m
```

#### Post-Deployment Verification

| Check | Command | Expected | Timeout |
|-------|---------|----------|---------|
| Health endpoint | `curl /health` | `{"status":"ok"}` | 5s |
| Key API calls | `pnpm test:smoke` | All pass | 60s |
| Error rate | Grafana dashboard | < 0.1% | 5min |
| P95 latency | Datadog APM | < 500ms | 5min |
| Business metrics | Internal dashboard | Normal range | 10min |

#### Rollback Procedure (< 5 min)

```bash
#!/bin/bash
# rollback.sh - Emergency rollback

ENV=$1
VERSION=$2

echo "🚨 Initiating emergency rollback for $ENV..."

# Step 1: Stop current deployment
echo "⏹️ Stopping current deployment..."
vercel --scope mechmind --yes remove mechmind-frontend --safe

# Step 2: Deploy previous version
echo "⏪ Rolling back to $VERSION..."
vercel --scope mechmind deploy --prod \
  --meta gitCommitSha=$VERSION \
  --yes

# Step 3: Verify rollback
echo "✅ Verifying rollback..."
./scripts/verify-deploy.sh --env $ENV

# Step 4: Notify
echo "📢 Sending rollback notification..."
curl -X POST $SLACK_WEBHOOK \
  -d '{"text":"🚨 Rollback completed for '$ENV' to '$VERSION'"}'

echo "✅ Rollback complete!"
```

**Rollback Triggers:**
- Error rate > 1% for 2 minutes
- P95 latency > 2x baseline for 5 minutes
- Critical business metric drop > 20%
- Manual trigger from on-call engineer

---

### 2.3 Cost Analysis

#### Monthly Infrastructure Costs

| Service | Tier | Monthly Cost | Usage Pattern |
|---------|------|--------------|---------------|
| 🚀 Vercel Pro | Pro Plan | $20 | Frontend hosting, 1TB bandwidth |
| ⚙️ Render/ECS | Standard | $50 | API containers, 2 vCPU / 4GB RAM |
| 🗄️ RDS Postgres | db.t3.micro | $15 | Single-AZ, 20GB storage |
| ⚡ Redis Cloud | 250MB | $20 | Caching & session store |
| 📞 Twilio | Pay-as-you-go | ~$30 | SMS notifications (~1000/month) |
| 📧 Resend | Free Tier | $0 | Transactional emails (< 3000/month) |
| 📊 Datadog | Free Tier | $0 | 5 hosts, 1-day retention |
| 🔍 Meilisearch | Self-hosted | $0 | EC2 included in Render |
| 🗂️ S3 Backup | Standard | $5 | Daily DB backups |
| **TOTAL** | — | **~$135/month** | — |

#### Cost Optimization Opportunities

| Optimization | Current | Target | Savings | Effort |
|--------------|---------|--------|---------|--------|
| Reserved RDS instances | On-demand | 1-year reserved | $5/mo | 2h |
| Vercel edge caching | Standard | Aggressive | $10/mo | 1h |
| Lambda for background jobs | ECS always-on | Serverless | $15/mo | 4h |
| Redis connection pooling | 50 connections | 10 pooled | — | 2h |

---

## 3. 📉 Technical Debt Register

### Active Debt Items

| ID | Item | Impact | Effort | Priority | Owner | Created |
|----|------|--------|--------|----------|-------|---------|
| DEBT-001 | Next.js 15 upgrade | 🟡 Medium — Performance improvements, new features | 2 days | **P2** | @frontend-team | 2026-02-15 |
| DEBT-002 | PostgreSQL 16 migration | 🟢 Low — Security patches, minor perf gains | 4 hours | **P3** | @backend-team | 2026-02-20 |
| DEBT-003 | Replace Jest with Vitest | 🟡 Medium — 2x faster tests, native ESM | 1 day | **P2** | @platform-team | 2026-02-10 |
| DEBT-004 | API pagination standardization | 🟡 Medium — Consistent response format | 3 days | **P2** | @backend-team | 2026-01-28 |
| DEBT-005 | Consolidate logging libraries | 🟢 Low — Remove pino, use Winston everywhere | 4 hours | **P3** | @backend-team | 2026-02-25 |
| DEBT-006 | Remove legacy feature flags | 🟢 Low — Code cleanup, ~200 lines | 2 hours | **P3** | @frontend-team | 2026-02-18 |

### Debt Triage Criteria

| Priority | Definition | Allocation | Examples |
|----------|------------|------------|----------|
| **P0** | Blocker, must fix immediately | 0% planned, interrupt-driven | Security vulns, data loss bugs |
| **P1** | High impact, schedule within sprint | 10% sprint capacity | Deprecation blockers, major perf |
| **P2** | Medium impact, quarterly planning | 20% quarterly capacity | Framework upgrades, refactors |
| **P3** | Nice to have, opportunistic | As time permits | Code cleanup, minor optimizations |

### Debt Paydown Schedule

```
Q1 2026
├── January: DEBT-004 (API pagination)
├── February: DEBT-001 (Next.js 15)
└── March: DEBT-003 (Vitest migration)

Q2 2026
├── April: DEBT-002 (PostgreSQL 16)
└── May: DEBT-005 (Logging consolidation)

Backlog: DEBT-006 (Feature flag cleanup)
```

---

## 📚 Quick Reference

### Emergency Contacts

| Role | Name | Slack | Phone |
|------|------|-------|-------|
| CTO | — | @cto | On-call roster |
| VP Engineering | — | @vp-eng | On-call roster |
| Platform Lead | — | @platform-lead | On-call roster |
| Security | — | @security | On-call roster |

### Critical URLs

| Resource | URL | Description |
|----------|-----|-------------|
| Production | https://app.mechmind.io | Main application |
| Staging | https://staging.mechmind.io | Pre-production |
| Status Page | https://status.mechmind.io | Public status |
| Grafana | https://grafana.mechmind.io | Metrics & dashboards |
| Datadog | https://app.datadoghq.com | APM & logs |
| Runbooks | https://wiki.mechmind.io/runbooks | Detailed procedures |

### Run Commands

```bash
# Local development
pnpm dev                    # Start all services
pnpm test:watch            # Watch mode testing
pnpm storybook             # Component development

# Deployment
./scripts/deploy.sh staging $(git rev-parse --short HEAD)
./scripts/deploy.sh production --strategy blue-green

# Incident response
./scripts/rollback.sh production <commit-sha>
./scripts/scale.sh --service api --replicas 4

# Debugging
pnpm logs:production       # Tail production logs
pnpm metrics               # Show local metrics
pnpm db:migrate:status     # Check migration status
```

---

> **Document Version:** 1.0  
> **Last Updated:** 2026-03-02  
> **Owner:** Platform Team  
> **Review Cycle:** Monthly

---

<div align="center">

**🛡️ Engineering Excellence is a Team Sport**

*Questions? Reach out in #engineering-ops*

</div>
