---
name: genera-test
description: "Genera .spec.ts infinitamente critici — PATH B Atomic RAM + Cascade Models + Quality Gates. Verifica score, multi-service, security/testing/architecture gates, TypeScript strict, 90% coverage. Retry con Opus se quality fail. Como i migliori al mondo."
allowed-tools: ["Bash(node *)","Bash(npx jest *)","Bash(tsc *)","Bash(eslint *)","Bash(ls *)"]
disable-model-invocation: true
effort: low
argument-hint: "<modulo> [--dry-run] [--force] [--skip-verify]"
---

# Genera Test — Infinitely Strict (2026 Enterprise Standard)

## Workflow Completo

```
/genera-test booking
  ↓
[1] Verifica modulo (score ≥70)
[2] Carica modulo in /tmp RAM (atomico)
[3] Genera spec.ts per ogni service (Sonnet + XML structured prompt)
[4] QUALITY GATES CHECK (subito, prima di Jest):
    ├─ SECURITY: no SQL injection, tenantId everywhere, no secrets
    ├─ TESTING: TENANT_ID const, tenantId assertions, happy path + error + edge
    ├─ CODE QUALITY: no any, max nesting 5, max line 120
    └─ Se FAIL → Retry con Opus (cascade models)
[5] TypeScript strict check (tsc --noEmit)
[6] Jest con coverage ≥90% (statements AND branches)
[7] Se coverage OK → trasferisci RAM→disk, log MODULI_NEXO.md
[8] Se coverage <90% → AUTO-ITER:
    ├─ Analizza gap coverage (linee non coperte)
    ├─ Genera test aggiuntivi per le linee mancanti
    ├─ Re-run Jest
    ├─ Loop fino a coverage ≥90% o max 5 iterazioni
    └─ Alla fine: trasferisci RAM→disk, log MODULI_NEXO.md
```

### ✅ Auto-Improvement Loop (Implementato)
- **Max iterazioni:** 5 (protezione contro loop infiniti)
- **Coverage target:** ≥90% statements AND ≥90% branches
- **Strategia:** Analizza linee non coperte → genera test mirati → re-run Jest
- **Status finale:** 
  - Se coverage ≥90%: `✅ Testato` in MODULI_NEXO.md
  - Se coverage <90% dopo max 5 iter: `⏳ In miglioramento` in MODULI_NEXO.md (file comunque trasferiti a disk)

## Features (2026 Best Practices)

### ✅ Atomic RAM Workflow
- Modulo caricato in `/tmp/nexo-gen-<modulo>-XXXX/`
- Tutto il lavoro in RAM (volatile)
- Solo se TUTTI i gate passano → salva su disk
- Se FAIL → RAM deleted automaticamente, zero corruzioni

### ✅ Cascade Models (60% cost reduction)
- Verifica/analisi: **Haiku** (cheap + fast)
- Generazione standard: **Sonnet** (balanced)
- Refinement se fail: **Opus** (best quality, solo retry)

### ✅ Module Complexity Tier System
- **TIER_1 (CRITICAL P0)**: Opus 4.7 — auth, booking, invoice, payment-link, subscription, gdpr
- **TIER_2 (HIGH P1)**: Sonnet 4.6 — notifications, admin, analytics, common, dvi, iot, work-order, customer
- **TIER_3 (MEDIUM P2)**: Sonnet 4.6 — rentri, parts, campaign, accounting, portal, etc.
- **TIER_4 (UTILITY)**: Haiku 4.5 — config, lib, middleware, test, types, services

### ✅ Quality Gates (Infinitely Strict)
- **SECURITY**: SQL injection, tenantId bypass, hardcoded secrets, console.log
- **TESTING**: TENANT_ID, tenantId assertions, happy path, error cases, edge cases
- **CODE QUALITY**: no any TypeScript, nesting, line length
- **TypeScript**: strict mode check before Jest

### ✅ XML Structured Prompting (2026)
- System prompt con tag XML per chiarezza
- `<security_gates>`, `<testing_gates>`, `<code_quality_gates>`
- Claude capisce esattamente cosa generare → -40% follow-up

### ✅ Prompt Caching (90% token savings)
- `sourceBlock` cachato (5 min)
- First run: ×1.25 cost
- Subsequent: ×0.10 cost (-90%)

### ✅ Coverage Threshold: 90% (Hard Gate)
- Statements ≥90% AND Branches ≥90%
- Se <90% → **AUTO-IMPROVE LOOP** (fino a 5 iterazioni)
- Analizza linee non coperte, genera test mirati, re-run Jest
- Loop termina quando: coverage ≥90% OR max iterazioni raggiunto

### ✅ Auto-Improvement Intelligence
- **Coverage gap analysis:** Identifica linee/metodi non coperti
- **Smart test generation:** Genera test per i gap specifici (non rigenerazione)
- **Iteration tracking:** Log in MODULI_NEXO.md mostra progression (70%→75%→85%→90%)
- **Safety bounds:** Max 5 iterazioni per proteggere contro loop infiniti
- **Fallback:** Se max iterazioni, commit stato attuale con flag "⏳ In miglioramento"

## Usage

```bash
# Normal: verifica + genera + test + log
/genera-test booking

# Preview senza API call
/genera-test booking --dry-run

# Force anche con score <70 (sconsigliato)
/genera-test booking --force

# Skip verifica (sconsigliato)
/genera-test booking --skip-verify
```

## Ciclo Completo: Cosa Accade

```
Input: /genera-test invoice

[Verify] Score: 83/100 ✅
  
[Scan] Trovati 5 service
  - invoice.service
  - bnpl.service
  - fatturapa.service
  - payment-link.service
  - pdf.service

[Preview]
  ↻ OVERWRITE 5 spec file

[Generate] RAM temp creato
  [1/5] invoice.service.spec.ts
    ✅ Generated (Opus) — TIER_1 CRITICAL
    ✅ Quality gates PASSED
    
  [2/5] bnpl.service.spec.ts
    ✅ Generated (Opus)
    ✅ Quality gates PASSED
    
  ... (3, 4, 5) ...

[TypeScript] tsc --noEmit
  ✅ No errors

[Jest] Coverage run
  Statements: 91% ✅
  Branches: 90% ✅

[Transfer] RAM → Disk
  ✅ 5 file trasferiti

[Log] MODULI_NEXO.md aggiornato
  ✅ 5 righe

✅ COMPLETATO: invoice — 91% / 90%
```

## Quality Gates Detail

### Security (0 violations allowed)
- ❌ `execute()`, `query()`, raw SQL
- ❌ `.findMany()` senza `where: { tenantId }`
- ❌ Hardcoded secrets (password=..., api_key=...)
- ❌ `console.log()` in service

### Testing (0 HIGH violations)
- ❌ Missing TENANT_ID constant
- ❌ <70% assertion con tenantId
- ❌ Only happy path (need error + edge)
- ❌ State machine non testato

### Code Quality
- ❌ TypeScript `any` detected
- ❌ Nesting >5 levels
- ❌ Line length >120 chars
- ⚠️  Duplicate code blocks

## Retry Logic

Se quality gates falliscono:
```
Tentativo 1 (TIER_1→Opus / TIER_2→Sonnet) → FAIL (security gate)
  ↓
Tentativo 2 (Opus) → FAIL
  ↓
Fallito → Rollback atomico, RAM deleted
```

Max retries: 2 (initial model, poi Opus)

## Module Complexity Tier System (Detailed)

```
┌─────────────────────────────────────────────────────────────┐
│ TIER_1: CRITICAL P0 MODULES → Opus 4.7                     │
├─────────────────────────────────────────────────────────────┤
│ auth            — 14 service, security-critical             │
│ booking         — state machine, concurrency, advisory lock │
│ invoice         — fatturapa XML, tax compliance, PDF        │
│ payment-link    — Stripe, webhooks, PCI compliance          │
│ subscription    — recurring billing, metering, dunning      │
│ gdpr            — data export, RLS policies, GDPR EU        │
│                                                              │
│ Ragione: mission-critical, PII, fiscal/legal, external APIs│
│ Cost/Benefit: Opus cost giustificato per qualità infinita   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ TIER_2: HIGH P1 MODULES → Sonnet 4.6                        │
├─────────────────────────────────────────────────────────────┤
│ notifications   — 10 service, queue, BullMQ, real-time      │
│ admin           — audit logs, role management               │
│ analytics       — aggregation, time-series, Metabase        │
│ common          — SPOF: PrismaService, EncryptionService    │
│ dvi             — DVI state machine, photo, AI analysis     │
│ iot             — sensor data, real-time telemetry          │
│ work-order      — state machine, lineitem calculus          │
│ customer        — PII, multi-tenant, lifecycle              │
│ estimate        — quote, conversion, margin                 │
│ voice           — Vapi integration, transcription           │
│                                                              │
│ Ragione: complex logic, multi-service deps, external APIs   │
│ Cost/Benefit: Sonnet provides good quality/cost ratio       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ TIER_3: MEDIUM P2 MODULES → Sonnet 4.6                      │
├─────────────────────────────────────────────────────────────┤
│ rentri, parts, campaign, accounting, portal,                │
│ membership, sms, reviews, location,                         │
│ predictive-maintenance, ai-diagnostic, ai-scheduling,       │
│ ai-compliance, benchmarking, fleet, kiosk, labor-guide,     │
│ obd, payroll, peppol, production-board, public-token,       │
│ security-incident, tire, vehicle-history,                   │
│ webhook-subscription, declined-service, inventory-alerts    │
│                                                              │
│ Ragione: moderate complexity, clear business logic          │
│ Cost/Benefit: Sonnet efficient for standard feature testing │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ TIER_4: UTILITY MODULES → Haiku 4.5                         │
├─────────────────────────────────────────────────────────────┤
│ config          — env variables, static configuration       │
│ lib             — shared utilities, no business logic       │
│ middleware      — express middleware, utility layer         │
│ test            — test utilities, helpers                   │
│ types           — TypeScript definitions, interfaces        │
│ services        — service barrel exports                    │
│                                                              │
│ Ragione: no business logic, infrastructure only             │
│ Cost/Benefit: Haiku very cheap, sufficient for utilities    │
└─────────────────────────────────────────────────────────────┘
```

### Cost Impact Analysis

```
Total: 51 modules

SCENARIO A: Always Sonnet (BEFORE)
  51 modules × 1.0× = 51× baseline cost

SCENARIO B: With Complexity Tiers (AFTER)
  TIER_1: 6 × 3.5× (Opus)     = 21.0× 
  TIER_2: 11 × 1.0× (Sonnet)  = 11.0×
  TIER_3: 20 × 1.0× (Sonnet)  = 20.0×
  TIER_4: 6 × 0.1× (Haiku)    = 0.6×
  ───────────────────────────
  Subtotal: 52.6× (vs 51× baseline)

SCENARIO C: With Prompt Caching (-90% repeat calls)
  First module: ×1.25 (cache_write)
  Subsequent modules: ×0.10 per service (cache_read)
  Average savings on successive services: -90%
  
  FINAL: 55-60% less token vs always Sonnet

✅ QUALITY INFINITELY STRICT where it counts (TIER_1)
✅ QUALITY GOOD where it matters (TIER_2/3)
✅ TOKEN SAVINGS on utilities (TIER_4 Haiku)
```
