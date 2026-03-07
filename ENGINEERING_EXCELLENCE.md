# ENGINEERING EXCELLENCE

> *"Quality is not an act, it is a habit."* — MechMind Engineering Charter v10

---

## Development Workflow

### Branching Strategy: Trunk-Based Development

| Aspect | Policy |
|--------|--------|
| Default Branch | `main` |
| Feature Lifetime | < 24h (target), max 48h (hard limit) |
| PR Size | < 400 LOC (enforced via CI) |
| Branch Naming | `feat/MECH-123-short-desc`, `fix/MECH-456-bug-desc` |
| Merge Strategy | Squash & merge only |

### CI/CD Pipeline

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Commit    │───▶│    Lint     │───▶│    Test     │───▶│   Build     │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                               │
                          ┌─────────────┐    ┌─────────────┐   │
                          │  Production │◀───│   Staging   │◀──┘
                          │   Deploy    │    │   Deploy    │
                          └─────────────┘    └─────────────┘
```

| Stage | Trigger | Duration | Gates |
|-------|---------|----------|-------|
| `lint-and-type` | Every push | ~2min | ESLint, Prettier, tsc --noEmit |
| `unit-test` | PR opened | ~4min | Jest coverage > 90% |
| `e2e-test` | PR opened | ~8min | Playwright 212 tests |
| `security-scan` | PR opened | ~3min | Snyk, npm audit, secrets detection |
| `build` | PR merged | ~5min | Docker build, image scan |
| `deploy-staging` | `main` merge | ~3min | Smoke tests, health checks |
| `deploy-prod` | Manual + approval | ~5min | Canary 10% → 50% → 100% |

### Code Review Requirements

| Rule | Enforcement |
|------|-------------|
| **2 approvals** required for `main` | Branch protection |
| **1 senior engineer** (L4+) for critical paths | CODEOWNERS |
| **No stale reviews** (> 24h) | Bot auto-ping |
| **CI must pass** | Required status checks |
| **Conventional commits** | commitlint |

---

## Quality Gates

| Gate | Tool | Threshold | Owner | Fail Action |
|------|------|-----------|-------|-------------|
| **Unit Tests** | Jest + Testing Library | > 90% coverage, 0 failing | Engineering | Block merge |
| **E2E Tests** | Playwright | 212/212 tests passing | QA | Block merge |
| **Type Safety** | TypeScript v5.x | `strict: true`, 0 `any` new | Engineering | Block merge |
| **Security** | npm audit + Snyk | 0 high/critical vulnerabilities | Security | Block pipeline |
| **Performance** | Lighthouse CI | > 90 all categories | Performance | Warning → Block |
| **Bundle Size** | Bundlesize | < 200KB main chunk | Engineering | Block merge |
| **Accessibility** | Axe + Pa11y | 0 critical violations | Design | Block merge |

### Coverage Enforcement

```json
{
  "coverageThreshold": {
    "global": {
      "branches": 90,
      "functions": 95,
      "lines": 95,
      "statements": 95
    }
  }
}
```

---

## Observability Strategy

> *"You can't improve what you don't measure."*

### Three Pillars

| Pillar | Implementation | Retention | Alerting |
|--------|----------------|-----------|----------|
| **Logs** | Winston → Datadog | 30 days hot, 1 year cold | Error rate > 0.1% |
| **Metrics** | Prometheus + Grafana | 15 months | P95 latency > 500ms |
| **Traces** | Jaeger + OpenTelemetry | 7 days | Trace error rate > 1% |

### Key SLIs/SLOs

| SLI | SLO | Error Budget |
|-----|-----|--------------|
| Availability | 99.95% | 21.6 min/month |
| P95 Latency (API) | < 200ms | 5% exceedance |
| P99 Latency (API) | < 500ms | 1% exceedance |
| Error Rate | < 0.1% | 4.32 min/month |

### Alert Severity Matrix

| Severity | Response Time | Channel | Example |
|----------|---------------|---------|---------|
| **P1 (Critical)** | 15 min | PagerDuty + Slack #incidents | Payment down, data loss |
| **P2 (High)** | 1 hour | Slack #alerts | Degraded performance |
| **P3 (Medium)** | 4 hours | Slack #notifications | Elevated error rate |
| **P4 (Low)** | 24 hours | Weekly report | Minor UI glitch |

---

## Incident Response

### Severity Levels

| Level | Definition | Response Time | Escalation |
|-------|------------|---------------|------------|
| **SEV 0** | Complete outage, revenue impact | 5 min | CEO notified |
| **SEV 1** | Major feature degraded, workaround exists | 15 min | VP Engineering |
| **SEV 2** | Partial degradation, limited impact | 1 hour | Engineering Lead |
| **SEV 3** | Minor issue, no customer impact | 4 hours | On-call engineer |
| **SEV 4** | Post-mortem required observations | 24 hours | Team channel |

### On-Call Rotation

- **Primary**: Rotating weekly (3 engineers)
- **Secondary**: Rotating weekly (2 engineers)
- **Shadow**: New hires (optional)
- **Handoff**: Every Monday 09:00 CET with runbook review

### Post-Mortem Template

```markdown
## INCIDENT-202X-XXX: [Title]

| Field | Value |
|-------|-------|
| **Severity** | SEV-1 |
| **Duration** | 42 minutes |
| **Impact** | 1,247 users affected, €12K revenue at risk |
| **Detection** | Automated alert (P95 latency) |
| **Root Cause** | [5 Whys] |

### Timeline
- **14:32** — First error spike detected
- **14:35** — On-call paged
- **14:40** — Rollback initiated
- **14:55** — Service restored

### Root Cause
[Detailed RCA]

### Action Items
| ID | Action | Owner | Due Date | Priority |
|----|--------|-------|----------|----------|
| AI-1 | [Fix] | @engineer | YYYY-MM-DD | P0 |
| AI-2 | [Prevent] | @team | YYYY-MM-DD | P1 |

### Lessons Learned
- What went well
- What went wrong
- Where we got lucky
```

---

# ARCHITECTURE DECISION RECORDS

> Decisions are immutable. Reversal requires new ADR.

---

## ADR-001: SSE over WebSocket for Real-time Updates

| Field | Value |
|-------|-------|
| **Status** | ✅ Accepted |
| **Date** | 2025-11-15 |
| **Authors** | @tech-lead, @backend-lead |
| **Tags** | `real-time`, `infrastructure`, `scalability` |

### Context

MechMind OS richiede aggiornamenti real-time per:
- Stato ordini di lavoro (meccanici aggiornano, reception vede)
- Notifiche scadenze (assicurazioni, revisioni)
- Chat interna officina

**Vincoli:**
- Deploy su Vercel Edge (stateless, serverless)
- 10.000+ officine target (scalabilità orizzontale)
- Devono funzionare dietro firewall aziendali restrittivi

### Decision

**Adottare Server-Sent Events (SSE) invece di WebSocket.**

| Criterio | SSE | WebSocket |
|----------|-----|-----------|
| Vercel Edge | ✅ Native support | ❌ Requires external service |
| Firewall-friendly | ✅ HTTP/HTTPS | ⚠️ Upgrade handshake |
| Riconnessione automatica | ✅ Built-in | ❌ Manual |
| Bidirezionale | ❌ No (non serve) | ✅ Yes (overkill) |
| Overhead | ~100 bytes/msg | ~2-14 bytes + framing |
| Scaling cost | $0.02/1M conn | $50+/1M conn (Pusher/Ably) |

### Consequences

**✅ Pros:**
- Zero cost infrastrutturale aggiuntivo su Vercel
- Auto-reconnect con `EventSource` nativo
- Funziona con load balancer standard (no sticky sessions)
- Debuggabile con curl/HTTP tools

**❌ Cons:**
- Unidirezionale (client → server richiede HTTP POST)
- Limite 6 connessioni per dominio (browser) — mitigato con EventSource polyfill
- No binary nativo (base64 overhead per immagini)

**Mitigazioni:**
- HTTP POST per azioni utente (REST API)
- CDN per asset binari
- Connection pooling lato client

---

## ADR-002: Modular Monolith vs Microservices

| Field | Value |
|-------|-------|
| **Status** | ✅ Accepted |
| **Date** | 2025-10-01 |
| **Authors** | @cto, @architect |
| **Tags** | `architecture`, `team-structure`, `nestjs` |

### Context

Team attuale: 8 engineers (2 backend senior, 3 full-stack, 2 frontend, 1 DevOps).

**Scenari valutati:**
1. **Microservices** (Kubernetes + Istio)
2. **Modular Monolith** (NestJS con bounded contexts)
3. **Serverless functions** (AWS Lambda/Vercel Functions)

### Decision

**Modular Monolith con NestJS, deploy su Docker containers.**

| Criterio | Weight | Modular Monolith | Microservices |
|----------|--------|------------------|---------------|
| Time to market | 30% | ⭐⭐⭐ | ⭐ |
| Operational complexity | 25% | ⭐⭐⭐ | ⭐ |
| Team productivity (8ppl) | 20% | ⭐⭐⭐ | ⭐⭐ |
| Independent deploy | 15% | ⭐⭐ | ⭐⭐⭐ |
| Tech diversity | 10% | ⭐⭐ | ⭐⭐⭐ |
| **Weighted Score** | — | **2.65** | **1.65** |

### Consequences

**✅ Pros:**
- Single codebase = refactoring senza friction
- Local development: `docker-compose up` (30s startup)
- Testing E2E semplificato (no testcontainers per ogni servizio)
- Database condiviso (transazioni ACID su operazioni multi-modulo)
- Deploy unificato = rollback atomico

**❌ Cons:**
- Scale richiede scale orizzontale dell'intero app
- Degrado di un modulo impatta tutto (blast radius)
- Tech stack locked (Node.js/NestJS)

**Exit Strategy:**
- I moduli sono già bounded contexts con API interne chiare
- Estrazione in microservices possibile se team > 20 engineers
- Database per modulo (schema separation) prepara per split futuro

---

## ADR-003: Resend + Twilio vs AWS SES/SNS

| Field | Value |
|-------|-------|
| **Status** | ✅ Accepted |
| **Date** | 2025-09-20 |
| **Authors** | @backend-lead, @product |
| **Tags** | `integrations`, `costs`, `email`, `sms` |

### Context

MechMind OS invia:
- 50K email/mese (transazionali: ordini, fatture, promemoria)
- 5K SMS/mese (2FA, alert urgenti)

**Volumi previsti scaling:**
- Email: 500K/mese entro 12 mesi
- SMS: 50K/mese entro 12 mesi

### Decision

**Resend per Email, Twilio per SMS.**

#### Cost Analysis (proiezione 12 mesi)

| Provider | Email (500K) | SMS (50K) | **Totale Annuo** | DX |
|----------|--------------|-----------|------------------|-----|
| **Resend + Twilio** | $0 (100K/mese free) + $4,800 | $3,750 | **$8,550** | ⭐⭐⭐ |
| AWS SES + SNS | $2,500 + $1,250 | $3,750 | **$7,500** | ⭐⭐ |
| SendGrid + Twilio | $4,800 | $3,750 | **$8,550** | ⭐⭐⭐ |
| AWS Pinpoint | Bundle | Bundle | **$9,200** | ⭐ |

**Note:**
- Resend: 3.000 email/day free tier (sufficiente per MVP)
- AWS SES: richiede dedicated IP ($24.95/mese) per reputation
- Resend DX: webhook debugging dashboard, React Email templates

### Consequences

**✅ Pros:**
- Costo marginale zero fino a 100K email/mese
- React Email = type-safe templates con preview
- Webhook per eventi (delivery, bounce, open) out-of-the-box
- Twilio = gold standard SMS, delivery reports affidabili

**❌ Cons:**
- Vendor lock-in su Resend (startup, risk acquisizione)
- Due provider = due SDK, due dashboard, due fatture
- AWS SES avrebbe integrazione IAM più semplice (già su AWS per backup)

**Risk Mitigation:**
- Abstract email provider con adapter pattern
- Backup provider (AWS SES) configurato, switch in 15 min

---

## ADR-004: Metabase Self-hosted vs Cloud

| Field | Value |
|-------|-------|
| **Status** | ✅ Accepted |
| **Date** | 2025-11-01 |
| **Authors** | @data-lead, @security |
| **Tags** | `bi`, `compliance`, `gdpr`, `self-hosted` |

### Context

Requisiti BI:
- Dashboard per officine (KPI propri)
- Dashboard interne (growth, retention, unit economics)
- 100+ query SQL scritte dai PM
- Data source: PostgreSQL (OLTP), futuro data warehouse

**Compliance:**
- GDPR: dati clienti italiani, no transfer fuori EU
- ISO 27001 roadmap (Q2 2026)

### Decision

**Metabase Self-hosted su AWS Frankfurt (eu-central-1).**

#### Evaluation Matrix

| Criterio | Weight | Self-hosted | Metabase Cloud |
|----------|--------|-------------|----------------|
| GDPR compliance | 30% | ⭐⭐⭐ | ⭐⭐ (US hosting) |
| Costo (50 users) | 20% | €200/mese | $500/mese |
| Customizzazione | 20% | ⭐⭐⭐ | ⭐⭐ |
| Operational burden | 15% | ⭐⭐ | ⭐⭐⭐ |
| SSO/SAML | 15% | ⭐⭐⭐ (Enterprise OSS) | ⭐⭐⭐ |
| **Weighted Score** | — | **2.65** | **2.25** |

**Dettaglio costi Self-hosted:**
- EC2 t3.medium: €35/mese
- RDS PostgreSQL: €50/mese
- Backup/storage: €15/mese
- Lavoro DevOps: ~2h/mese

### Consequences

**✅ Pros:**
- Dati mai lasciano EU (GDPR compliance automatico)
- Metabase Enterprise features gratis (SSO, auditing, sandboxes)
- Custom plugins possibili (tema MechMind, connettori custom)
- VPC isolation (security hardening)

**❌ Cons:**
- On-call per Metabase (monitoring, backup, updates)
- Upgrade manuale (security patches)
- Scaling manuale se query lente

**Operazioni:**
- Deploy via Terraform su AWS ECS Fargate
- Backup giornaliero RDS → S3 (7 giorni retention)
- Version pinning, upgrade quarterly

---

## ADR-005: TOTP vs WebAuthn for MFA

| Field | Value |
|-------|-------|
| **Status** | ✅ Accepted |
| **Date** | 2025-12-10 |
| **Authors** | @security, @ux-lead |
| **Tags** | `security`, `mfa`, `authentication`, `ux` |

### Context

MFA obbligatorio per:
- Admin MechMind (accesso dati tutte le officine)
- Utenti con permessi "pagamenti" o "fatturazione"

**User base:**
- Meccanici: ~70% smartphone Android (5+ anni)
- Receptionist: misto iOS/Android
- Adozione MFA: target 85% entro 3 mesi dal rollout

### Decision

**TOTP (RFC 6238) come MFA primario, WebAuthn in roadmap Q3 2026.**

#### Security vs Usability Trade-off

| Criterio | TOTP | WebAuthn |
|----------|------|----------|
| Phishing resistance | ⚠️ Medium | ✅ High (origin-bound) |
| User adoption | ⭐⭐⭐ (familiar) | ⭐⭐ (nuovo, confusione) |
| Device requirements | Qualsiasi smartphone | Hardware key / biometrics |
| Implementation complexity | 2 giorni | 2 settimane + testing |
| Recovery flow | ✅ Backup codes | ❌ Complesso |
| Costo | $0 | ~$5/key se YubiKey |

### Consequences

**✅ Pros (TOTP):**
- Google Authenticator / Authy già installati su 90% device target
- Setup: scan QR code → 30 secondi
- Libreria `speakeasy` battle-tested (2M+ downloads/settimana)
- Backup codes per recovery (print & store)

**❌ Cons (TOTP):**
- Vulnerabile a phishing (attacker può relay code)
- Secret storage lato server (risk breach)
- UX friction: cambio app, copia/incolla codice

**WebAuthn Roadmap:**
- **Q3 2026**: WebAuthn per tier "Enterprise" (officine +50 dipendenti)
- **Q1 2027**: Passkeys come MFA primario, TOTP fallback
- **Trigger**: quando >30% user base ha device con biometric auth

**Implementazione TOTP:**
```typescript
// Enrollment
const secret = speakeasy.generateSecret({
  name: `MechMind:${user.email}`,
  issuer: 'MechMind OS'
});

// Verify
const valid = speakeasy.totp.verify({
  secret: user.totpSecret,
  encoding: 'base32',
  token: userInput,
  window: 1 // ±30s drift
});
```

---

## ADR Index

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| 001 | SSE over WebSocket for Real-time | ✅ Accepted | 2025-11-15 |
| 002 | Modular Monolith vs Microservices | ✅ Accepted | 2025-10-01 |
| 003 | Resend + Twilio vs AWS SES/SNS | ✅ Accepted | 2025-09-20 |
| 004 | Metabase Self-hosted vs Cloud | ✅ Accepted | 2025-11-01 |
| 005 | TOTP vs WebAuthn for MFA | ✅ Accepted | 2025-12-10 |

---

*Last updated: 2026-02-28*
*Next review: 2026-05-28*
