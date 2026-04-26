---
name: aiuto
description: Mostra tutte le skill disponibili e spiega come usarle.
type: utility
category: documentation
user-invocable: true
argument-hint: "[SKILL_NAME] [--category] [--search KEYWORD]"
effort: low
---

# Help — MechMind Nexo Skills Index

Browse, search, and learn about all available skills and hooks.

## Comandi

```bash
/help
/help genera-test
/help --category testing
/help --search webhook
```

## Skill Inventory by Category

### 🧪 Testing & Quality
- **genera-test** — Single module or all 51 backend modules (90/90 coverage + mutation ≥80%)
- **genera-test-e2e** — Playwright E2E golden path (booking, payment, auth, invoice)
- **test-regressione** — Critical path regression (10% subset, <3 min)
- **test-carico** — k6 load testing (P95 <200ms @ 100 VU)
- **verifica-skill** — Audit skill syntax and hook robustness
- **chaos-test** — Failure modes: Redis down, crypto key corruption, race conditions, webhook tampering

### 🔐 Security & Compliance
- **revisione** — Unified review (--type code|commit|security|all)
- **revisione-sicurezza-owasp** — OWASP 2025 + GDPR 2026 + PCI DSS 4.0.1 audit
- **revisione-dipendenze** — npm audit, SBOM, CVE, supply chain (OWASP A03:2026)
- **conformita-gdpr** — GDPR Art.5/17/20/25/32 compliance check (encryption, soft-delete, export, erasure, audit)
- **audit-state-machine** — FMEA audit state machine (booking, work-order, invoice) — race condition detection
- **integrita-db** — Database integrity audit (index missing, N+1 queries, tenantId enforcement, PII encryption)
- **risposta-incidente** — Incident runbook (payment failure, auth breach, data corruption, DB/Redis down)
- **chaos-test** — Resilience testing (Redis down, encryption key corruption, race conditions, webhook tampering)

### 🏗️ Development
- **nuovo-endpoint** — Create NestJS API endpoint
- **nuovo-modulo** — Create NestJS module (controller + service + DTO + test)
- **nuova-pagina** — Create Next.js page
- **risolvi-bug** — Structured bug fix workflow (logs-first method)
- **analisi-bug** — Bug investigation with metrics

### 📊 Observability & Metrics
- **misura-kpi** — Track execution time, coverage trends, MTTD/MTTR, deployment velocity

### 📚 Reference & Utilities
- **help** — This command (skill index and docs)

---

## Skill Details

### /genera-test

**Purpose:** Generate high-quality test specs for backend modules (single or all 51).

**Modes:**
- `--scope single --module booking` — atomic RAM, 90/90 coverage, auto-improve loop (5 iter)
- `--scope all --tiers TIER_1,TIER_2` — parallel (2-5 per tier), mutation ≥80%, CRAP analysis, flakiness detection

**Effort:** max (15-20 min per module)  
**Output:** spec files on disk, MODULI_NEXO.md log, quality scorecard

**Example:**
```bash
/genera-test --scope single --module invoice
# or
/genera-test --scope all --parallel 4
```

---

### /revisione-sicurezza

**Purpose:** OWASP Top 10:2025 + GDPR 2026 + PCI DSS 4.0.1 security audit.

**Checks:**
- A01 (Broken Access Control): RLS, tenant isolation, authorization guards
- A02 (Cryptographic Failures): PII encryption, JWT `jti`, TLS, password hashing
- A03 (Injection): Prisma, class-validator, parameterization
- A04-A10: All OWASP 2025 categories
- GDPR: data minimization, export API, audit trail
- PCI DSS: webhook signature, idempotency, error handling

**Effort:** high (600s timeout)  
**Output:** security audit report, blockers/warnings/info, OWASP score

**Example:**
```bash
/revisione-sicurezza --type all --report-path ./SEC_AUDIT.md
```

---

### /test-regressione

**Purpose:** Fast regression testing (10% critical path, <3 min).

**Target:** booking, payment, auth, invoice (critical flows only)

**Effort:** medium  
**Output:** PASS/FAIL on critical functions, identifies regressions

---

### /chaos-test

**Purpose:** Resilience testing — simulate failure modes.

**Scenarios:**
- Redis down (fallback pub/sub, graceful timeout)
- Encryption key corrupted (PII becomes unreadable, system logs CRITICAL)
- Booking race condition (advisory lock prevents concurrency)
- Webhook signature invalid (Stripe tampering detected and rejected)

**Effort:** max (900s)  
**Output:** failure mode report, resilience score

---

### /verifica-skill

**Purpose:** Audit skill quality — ShellCheck, YAML validation, functional tests.

**Checks:**
- ShellCheck on all .sh hook files
- YAML syntax on all SKILL.md files
- Functional tests on stop-quality-gate.sh and task-completed.sh
- Robustness metrics (timeout defined? cross-platform?)

**Effort:** medium (300s)  
**Output:** HEALTH_SKILLS.md report with ✅/❌

---

## Hook Reference

### stop-quality-gate.sh
Blocks submission if:
- Backend TypeScript errors
- Frontend TypeScript errors
- ESLint violations

**Bypass:** `{"stop_hook_active":true}` in input JSON

### task-completed.sh
Verifies new services have corresponding .spec.ts files.

**Output:** warning if spec missing, log on stderr

---

## Categories

### 🧪 Testing
- Test generation, regression, load, E2E, mutation, flakiness

### 🔐 Security
- OWASP, GDPR, PCI, injection, access control, crypto

### 🏗️ Development
- Endpoint, module, page, bug fix, analysis

### 📊 Observability
- Metrics, KPI, telemetry, trends

### 🎛️ Infrastructure
- Docker, CI/CD, GitHub Actions, deployment

---

## Quick Search

| Keyword | Skills |
|---------|--------|
| test | genera-test, test-regressione, test-carico, genera-test-e2e |
| security | revisione-sicurezza, revisione-dipendenze, chaos-test |
| coverage | genera-test, misura-kpi |
| bug | risolvi-bug, analisi-bug |
| webhook | revisione-sicurezza (A08), chaos-test |
| compliance | revisione-sicurezza (GDPR/PCI), revisione-dipendenze (OWASP A03) |

---

## Tips

✅ **For new modules:** Start with `/genera-test --scope single --module <name>`  
✅ **Before merge:** Run `/test-regressione` to catch regressions  
✅ **Monthly:** Run `/genera-test --scope all` for full compliance  
✅ **On security changes:** Run `/revisione-sicurezza --type all`  
✅ **On dependency update:** Run `/revisione-dipendenze --all`  

---

**Last Updated:** 2026-04-25  
**Version:** Unified skill index v1
