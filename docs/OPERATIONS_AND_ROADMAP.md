# OPERATIONS RUNBOOK

## System Health Dashboard

| Component | Status | Latency | Uptime | Last Deploy |
|-----------|--------|---------|--------|-------------|
| Frontend (Vercel Edge) | 🟢 Operational | 45ms | 99.99% | 2026-03-02 |
| API (NestJS/Fargate) | 🟢 Operational | 89ms | 99.95% | 2026-03-02 |
| Database (PostgreSQL 15) | 🟢 Operational | 12ms | 99.99% | - |
| Redis Cache | 🟢 Operational | 3ms | 99.99% | - |
| Metabase Analytics | 🟢 Operational | 120ms | 99.9% | 2026-03-02 |
| File Storage (S3) | 🟢 Operational | 25ms | 99.99% | - |
| SMS Gateway (Twilio) | 🟢 Operational | 180ms | 99.9% | - |
| Email Service (Resend) | 🟢 Operational | 95ms | 99.9% | - |

**Overall System Status**: 🟢 **All Systems Operational**

---

## Deployment Playbook

### 1. Pre-deployment Checklist

- [ ] All E2E tests passing (212/212)
- [ ] Unit test coverage ≥ 85%
- [ ] Security scan clean (Snyk/Semgrep)
- [ ] Database migrations reviewed and tested
- [ ] Feature flags configured for gradual rollout
- [ ] Rollback plan documented and tested
- [ ] Staging environment verified
- [ ] On-call engineer notified

### 2. Deployment Steps (Blue/Green)

```bash
# Step 1: Build & Test
$ npm run build:production
$ npm run test:e2e:ci

# Step 2: Deploy to Green Environment
$ vercel deploy --target=production --meta=version=v10.x.x
$ aws ecs update-service --service mechmind-api-green --force-new-deployment

# Step 3: Health Check (5 min)
$ ./scripts/health-check.sh https://api-green.mechmind-os.com

# Step 4: Database Migrations (zero-downtime)
$ npx prisma migrate deploy

# Step 5: Traffic Shift (gradual)
$ vercel promote green --percentage=10
# Monitor for 10 min, then:
$ vercel promote green --percentage=50
# Monitor for 10 min, then:
$ vercel promote green --percentage=100

# Step 6: Verify & Cleanup
$ ./scripts/smoke-tests.sh
$ aws ecs update-service --service mechmind-api-blue --desired-count=0
```

### 3. Post-deployment Verification

| Check | Command | Expected Result |
|-------|---------|-----------------|
| API Health | `curl /health` | `{"status":"ok"}` |
| Database | `SELECT version()` | PostgreSQL 15.x |
| Redis | `redis-cli ping` | `PONG` |
| Auth Flow | E2E Test Suite | 100% pass |
| Notifications | Test Event | SSE + Email + SMS |
| Critical Path | Smoke Tests | All green |

### 4. Rollback Procedure

**Automatic Rollback Triggers:**
- Error rate > 5% for 2 minutes
- Latency p95 > 2s for 3 minutes
- Critical health check failure

**Manual Rollback (if needed):**
```bash
# Immediate rollback to previous stable version
$ vercel rollback --target=production
$ aws ecs update-service --service mechmind-api-blue --force-new-deployment
$ aws ecs update-service --service mechmind-api-green --desired-count=0

# Database rollback (if migrations failed)
$ npx prisma migrate resolve --rolled-back "20260302_xxxxx"
```

---

## Monitoring & Alerting

| Alert Name | Condition | Action | Severity | Channel |
|------------|-----------|--------|----------|---------|
| **API Error Spike** | Error rate > 5% for 5 min | Page on-call engineer | P1 | PagerDuty + Slack |
| **High Latency** | p95 latency > 1s for 5 min | Auto-scale + notify | P2 | Slack |
| **Database Connections** | > 80% pool utilization | Scale RDS + alert | P2 | Slack |
| **Queue Depth** | > 1,000 pending jobs | Scale workers | P2 | Slack |
| **Disk Space** | > 85% storage used | Cleanup + alert | P2 | Email |
| **Failed Logins** | > 50 attempts/min | Block IP + notify | P2 | Slack |
| **SSL Expiry** | < 30 days remaining | Auto-renew + alert | P3 | Email |
| **Cost Anomaly** | > 120% of budget | Review + alert | P3 | Email |

### On-Call Runbook

**P1 - Critical (Page Immediately)**
1. Acknowledge alert within 5 minutes
2. Assess impact on customers
3. If customer-impacting → execute rollback
4. Update status page
5. Post-mortem within 24 hours

**P2 - High (Slack within 30 min)**
1. Review metrics dashboard
2. Apply automated remediation if available
3. Escalate to P1 if customer impact detected

---

## Cost Analysis

| Service | Tier | Monthly Cost | Utilization | Optimization |
|---------|------|--------------|-------------|--------------|
| **Vercel Pro** | Pro Plan | $20 | 45% | - |
| **AWS ECS/Fargate** | 2 vCPU / 4GB | $50 | 62% | Auto-scaling enabled |
| **RDS PostgreSQL** | db.t3.micro | $15 | 58% | Reserved instance candidate |
| **ElastiCache Redis** | cache.t3.micro | $20 | 40% | - |
| **Twilio SMS/Voice** | Pay-as-you-go | ~$30 | - | Fallback to email if quota |
| **Resend Email** | Free Tier | $0 | 23% | 3,000 emails/mo free |
| **Metabase** | Self-hosted (ECS) | $0 | - | Included in Fargate |
| **S3 Storage** | Standard | ~$5 | 12% | Lifecycle policies active |
| **CloudFront CDN** | - | ~$8 | - | Edge caching |
| **Data Transfer** | - | ~$12 | - | - |
| **Monitoring** | Datadog (free) | $0 | - | APM + Logs |
| **Security** | Snyk + GitGuardian | $0 | - | Open source tiers |
| **TOTAL** | | **~$160/mo** | | |

### Cost Optimization Roadmap

| Initiative | Potential Savings | Effort | Timeline |
|------------|-------------------|--------|----------|
| RDS Reserved Instance (1yr) | $3/mo | Low | Q2 2026 |
| ECS Spot Instances | $15/mo | Medium | Q2 2026 |
| S3 Intelligent-Tiering | $2/mo | Low | Q2 2026 |
| Image optimization (WebP/AVIF) | $3/mo | Medium | Q2 2026 |
| **Projected Savings** | **~$23/mo (14%)** | | |

---

# PRODUCT ROADMAP

> **Philosophy**: Build in public. Ship fast. Listen to mechanics.

---

## ✅ Now (Q1 2026 - Complete)

| Feature | Status | Impact | Ships |
|---------|--------|--------|-------|
| **Real-time Notifications (SSE)** | ✅ Live | High | Feb 2026 |
| **Email & SMS Integration** | ✅ Live | High | Feb 2026 |
| **BI Dashboards (Metabase)** | ✅ Live | High | Feb 2026 |
| **2FA/MFA Security** | ✅ Live | Critical | Mar 2026 |
| **E2E Testing Suite** | ✅ 212 tests | Critical | Mar 2026 |
| **Dark Mode** | ✅ Live | Medium | Mar 2026 |
| **PDF Invoicing** | ✅ Live | High | Mar 2026 |

**Milestone**: Production-ready v10 launch 🚀

---

## 🔨 Next (Q2 2026)

| Feature | Status | Customer Need | ETA |
|---------|--------|---------------|-----|
| **Mobile App (React Native)** | 🔄 In Design | 87% requested | June 2026 |
| **AI Predictive Maintenance** | 📋 Spec | Reduce downtime 40% | May 2026 |
| **Multi-language Support** | 📋 Spec | IT / EN / DE | April 2026 |
| **Advanced Analytics ML** | 📋 Research | Business insights | June 2026 |
| **API Webhooks** | 🔄 In Progress | Integrations | April 2026 |
| **Inventory Alerts** | 📋 Backlog | Stock management | May 2026 |

**Theme**: *Intelligence & Accessibility*

---

## 🔮 Later (2026+)

| Feature | Horizon | Strategic Value |
|---------|---------|-----------------|
| **White-label Solution** | Q3 2026 | OEM partnerships |
| **Franchise Management** | Q4 2026 | Multi-location chains |
| **IoT OBD Integration** | Q4 2026 | Real-time vehicle data |
| **Marketplace Ricambi** | 2027 | Parts e-commerce |
| **Video Support Calls** | 2027 | Remote diagnostics |
| **Blockchain Service History** | 2027 | Tamper-proof records |

**Theme**: *Ecosystem & Scale*

---

## Technical Debt Register

| Item | Impact | Effort | Priority | Owner | Due |
|------|--------|--------|----------|-------|-----|
| **Next.js 14 → 15 Upgrade** | Medium | 2 days | P2 | Frontend | Q2 2026 |
| **NestJS 10 → 11 Upgrade** | Low | 1 day | P3 | Backend | Q2 2026 |
| **PostgreSQL 15 → 16** | Low | 4 hours | P3 | DevOps | Q2 2026 |
| **Prisma ORM Optimization** | High | 3 days | P1 | Backend | April 2026 |
| **Test Coverage to 90%** | Medium | 5 days | P2 | QA | Q2 2026 |
| **Monorepo Migration (Turborepo)** | Medium | 1 week | P2 | Platform | Q3 2026 |
| **Legacy Migration Scripts** | Low | 1 day | P3 | Backend | Q2 2026 |

---

## Success Metrics

| KPI | Current | Target Q2 | Target 2026 |
|-----|---------|-----------|-------------|
| Monthly Active Users | 150 | 500 | 2,000 |
| System Uptime | 99.95% | 99.99% | 99.999% |
| Avg API Response Time | 89ms | < 50ms | < 30ms |
| Customer Satisfaction | 4.5/5 | 4.7/5 | 4.8/5 |
| Revenue MRR | - | $5,000 | $25,000 |

---

*Last updated: 2026-03-02 | Roadmap owner: @product-team | Questions: roadmap@mechmind-os.com*
