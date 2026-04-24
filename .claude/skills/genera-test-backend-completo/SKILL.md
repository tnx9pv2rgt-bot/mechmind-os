---
name: genera-test-backend-completo
description: "Orchestrazione completa: TUTTI i 51 moduli backend → 90/90 coverage + Mutation Testing (Stryker.js). Parallelo intelligente, tier-based models, logging MODULI_NEXO.md, quality gates OWASP+GDPR+PCI."
allowed-tools: ["Bash(node *)","Bash(npx *)","Bash(find *)","Bash(grep *)","Bash(ls *)"]
disable-model-invocation: false
effort: high
argument-hint: "[--dry-run] [--parallel N] [--tiers TIER_1,TIER_2,TIER_3,TIER_4] [--mutation-only] [--skip-90-check]"
---

# Genera Test Backend Completo — 90/90 + Mutation Testing (World-Class)

## 🎯 Obiettivo

**Porta TUTTI i 51 moduli backend a 90/90 coverage (Statements ≥90% ∧ Branches ≥90%) + Mutation Testing per verificare qualità effettiva dei test.**

## 📊 Stato Iniziale (2026-04-24)

| Tier | Moduli | At 90/90 | Target |
|------|--------|----------|--------|
| TIER_1 CRITICAL | 6 | 3/6 ✅ | 6/6 by May 1 |
| TIER_2 HIGH | 11 | 3/11 ⚠️ | 11/11 by May 8 |
| TIER_3 MEDIUM | 34 | 4/34 ❌ | 34/34 by May 15 |
| TIER_4 UTILITY | 6 | —/6 ❌ | 6/6 by May 15 |
| **TOTALE** | **51** | **10/51 (19.6%)** | **51/51 by May 15** |

## 🔄 Workflow Completo

```
Input: /genera-test-backend-completo [--parallel 5] [--tiers TIER_1,TIER_2,TIER_3]

[PHASE 1] Inventory & Setup
  ├─ Scan backend/src → lista 51 moduli
  ├─ Classifica per TIER (complexity-based)
  ├─ Verifica Stryker.js (installa se manca)
  └─ Configura stryker.conf.js (mutation thresholds)

[PHASE 2] Test Generation — Parallelo Intelligente
  ├─ TIER_1 CRITICAL (3 bajo 90/90):
  │   └─ Chiama /genera-test <modulo> sequenziale (Opus 4.7)
  │       ├─ auto-improve loop finché ≥90%/90%
  │       └─ log MODULI_NEXO.md quando completato
  │
  ├─ TIER_2 HIGH (8 under 90/90):
  │   └─ Parallelo ×3 (Sonnet 4.6)
  │
  ├─ TIER_3 MEDIUM (30 under 90/90):
  │   └─ Parallelo ×5 (Sonnet 4.6, batch)
  │
  └─ TIER_4 UTILITY (6 no tests yet):
      └─ Parallelo ×4 (Haiku 4.5, fast)

[PHASE 3] Mutation Testing (Stryker.js)
  ├─ Per ogni modulo ≥90%/90%:
  │   ├─ npx stryker run src/<modulo>
  │   ├─ Raccogli Mutation Score (target ≥80%)
  │   └─ Log mutazione: modulo | coverage% | mutation_score% | status
  │
  └─ Report finale: mutation_score per modulo (identificare weak test areas)

[PHASE 4] Verify & Log
  ├─ Ricapitolativo finale in MODULI_NEXO.md:
  │   ├─ Coverage report: modulo | statements% | branches% | mutation%
  │   ├─ Timeline: TIER_1 May 1 ✅ | TIER_2 May 8 ✅ | TIER_3 May 15 ✅
  │   └─ Quality gates: OWASP A01-A10 ✅ | GDPR ✅ | PCI DSS ✅
  │
  └─ Export JSON: comprehensive quality matrix
```

## 🛠️ Setup Stryker.js

```bash
# [1] Installa Stryker
cd backend
npm install --save-dev @stryker-mutator/core @stryker-mutator/typescript-checker

# [2] Genera config (auto)
npx stryker init  # (oppure manual setup in stryker.conf.js)

# [3] Config file: stryker.conf.js
module.exports = {
  mutate: ["src/**/*.ts", "!src/**/*.spec.ts", "!src/**/*.mock.ts"],
  testRunner: "jest",
  coverageAnalysis: "perTest",
  thresholds: {
    high: 80,    # ✅ Mutation score ≥80%
    medium: 70,  # ⚠️ 70-79%
    low: 50      # ❌ <50%
  },
  timeoutMS: 5000,
  timeoutFactor: 1.25
};

# [4] Run mutation test per modulo
npx stryker run src/invoice --strykerConfig stryker.conf.js
```

## 📋 Usage Examples

```bash
# Full orchestration: tutti i 51 moduli (FASE 2 + FASE 3)
/genera-test-backend-completo

# Dry-run: preview senza genera
/genera-test-backend-completo --dry-run

# Solo TIER_1 CRITICAL (3 moduli under 90/90)
/genera-test-backend-completo --tiers TIER_1

# Parallelo aggressive (max 10 simultanei)
/genera-test-backend-completo --parallel 10

# Solo mutation testing (skip test generation)
/genera-test-backend-completo --mutation-only

# Ignora moduli che hanno ≥90/90, ritest solo i rest
/genera-test-backend-completo --skip-90-check
```

## 🎯 Phase 2 Detail — Parallelo Intelligente

### TIER_1 CRITICAL (Sequenziale + Opus 4.7)
```
[1] auth (94.23% / 82.77%)
    └─ /genera-test auth (auto-improve, target 90/90)
       ├─ Iter 1: +7 test → branches 82.77% → 87.5%?
       ├─ Iter 2: +5 test → branches 87.5% → 91.2%? ✅
       └─ Log MODULI_NEXO: ✅ COMPLETATO

[2] invoice (98.34% / 80.81%)
    └─ /genera-test invoice (auto-improve)
       ├─ Iter 1: +8 test → branches 80.81% → 85%?
       ├─ Iter 2: +6 test → branches 85% → 91%? ✅
       └─ Log MODULI_NEXO: ✅ COMPLETATO

[3] payment-link (100% / 84%)
    └─ /genera-test payment-link (auto-improve)
       ├─ Iter 1: +12 test → branches 84% → 90%? ✅
       └─ Log MODULI_NEXO: ✅ COMPLETATO
```

### TIER_2 HIGH (Parallelo ×3, Sonnet 4.6)
```
Batch 1:                    Batch 2:               Batch 3:
  analytics (TBD)            common (95.92%/80.53%)  voice (100%/84.84%)
  dvi (91.52%/80.79%)        iot (98.75%/86.64%)
                             notifications (92.57%/81.59%)

Ogni batch: /genera-test <modulo> in parallelo → transfer RAM→disk → log
```

### TIER_3 MEDIUM (Parallelo ×5, Sonnet 4.6)
```
Batch 1: rentri, parts, estimate, customer, admin
Batch 2: accounting, membership, sms, reviews, location
... fino a 34 moduli completati
```

### TIER_4 UTILITY (Parallelo ×4, Haiku 4.5)
```
Batch 1: config, lib, middleware, test
Batch 2: types, services
```

## 📊 Phase 3 Detail — Mutation Testing

Per ogni modulo ≥90%/90%, esegui Stryker:

```bash
cd backend

# Modulo singolo
npx stryker run src/invoice --strykerConfig stryker.conf.js
# Output:
# Killed: 143
# Survived: 18
# Mutation Score: 88.8% ✅

# Log in MODULI_NEXO.md:
# | 2026-04-25 14:30 | backend | invoice | module SUMMARY | 98% / 91% | ✅ COMPLETATO (Mutation: 88.8%) |
```

### Mutation Metrics to Track
- **Killed mutations**: Test detected the bug ✅
- **Survived mutations**: Test missed the bug (weak test)
- **Mutation Score**: Killed / (Killed + Survived) × 100%

### Interpreting Mutation Scores
- **≥90%**: Excellent — tests catch almost all bugs
- **80-89%**: Good — most bugs caught
- **70-79%**: Fair — need improvement
- **<70%**: Poor — tests not semantically aware of behavior

## 🚨 Constraints & Safeguards

### Atomic RAM Workflow (per modulo)
- Ogni modulo testato in `/tmp/nexo-gen-<modulo>-XXXX/`
- Se test FAIL → RAM deleted, no corruption
- Se SUCCESS → transfer disk + log

### Cascade Models (cost optimization)
```
TIER_1 → Opus 4.7 (best quality, critical modules)
TIER_2 → Sonnet 4.6 (balanced)
TIER_3 → Sonnet 4.6 (standard)
TIER_4 → Haiku 4.5 (minimal, utilities only)
```

### Timeout Protection
- Jest per modulo: max 10 min
- Stryker per modulo: max 15 min
- Se timeout → flag ⏳ e continua prossimo

### Parallel Limits
- Max simultaneous jobs: 5 (adjustable via `--parallel`)
- CPU-bound work (Stryker) serial, not parallel
- Test generation parallelizable (Sonnet/Haiku)

## 📈 Expected Timeline

```
Phase 1 (Setup):           5 min
Phase 2 (Test Gen):        ~8 hours (51 moduli × avg 10 min/modulo)
  - TIER_1 (6 moduli):     ~60 min (Opus, sequential)
  - TIER_2 (11 moduli):    ~30 min (Sonnet, ×3 parallel)
  - TIER_3 (34 moduli):    ~170 min (Sonnet, ×5 parallel)
  - TIER_4 (6 moduli):     ~15 min (Haiku, ×4 parallel)
Phase 3 (Mutation):        ~2 hours (Stryker, serial per modulo)
Phase 4 (Verify+Log):      10 min

TOTAL: ~10-11 hours (heavily parallelized)
```

## ✅ Verification Checklist

```
[Phase 1 - Setup]
☐ Stryker.js installato (npm list @stryker-mutator/core)
☐ stryker.conf.js configurato
☐ MODULI_NEXO.md backup creato

[Phase 2 - Test Generation]
☐ TIER_1 all 6 moduli ≥90%/90% (auth, booking, invoice, payment-link, subscription, gdpr)
☐ TIER_2 all 11 moduli ≥90%/90%
☐ TIER_3 all 34 moduli ≥90%/90%
☐ TIER_4 all 6 moduli ≥90%/90%
☐ tsc --noEmit: 0 errors (all 51 moduli)
☐ eslint src --max-warnings 0: 0 errors

[Phase 3 - Mutation Testing]
☐ Mutation Score ≥80% per almeno 40/51 moduli
☐ Gap analysis: moduli con <80% mutation → identify weak test areas
☐ Report Stryker salvato: reports/mutation-results-<date>.json

[Phase 4 - Logging]
☐ MODULI_NEXO.md aggiornato con tutte le metriche
☐ Timeline tracking: ✅ TIER_1 (May 1), TIER_2 (May 8), TIER_3 (May 15)
☐ Quality gates documented: OWASP + GDPR + PCI DSS

[Final]
☐ All 51 modules: Statements ≥90% AND Branches ≥90%
☐ Mutation Score ≥80% (world-class test quality)
☐ Production-ready: zero tech debt in test layer
```

## 🔗 Related Files

- `.claude/rules/coverage-standard.md` — 90/90 specification (Google + NASA + fintech standard)
- `MODULI_NEXO.md` — Progress tracking (updated per phase)
- `CLAUDE.md` — Global standards (test generation TDD, tenantId isolation, security gates)
- `/genera-test` skill — Single module test generation (reused in Phase 2)
- `stryker.conf.js` — Mutation testing configuration (to be created)

## 🎓 Why This Approach?

1. **90/90 Coverage**: Aligns with Google "exemplary", NASA mission-critical, fintech best practice
2. **Mutation Testing**: Verifies test QUALITY, not just line coverage (catches semantic gaps)
3. **Parallel + Tiered**: Cost-optimized (Opus for critical, Sonnet for standard, Haiku for utility)
4. **Atomic RAM**: Zero corruption risk; rollback automatic if any gate fails
5. **World-Class Quality**: OWASP A01-A10, GDPR 2026, PCI DSS 4.0.1 all tested

---

**Last updated:** 2026-04-24
**Owner:** Giovanni Romano (MechMind OS)
**Status:** Ready to execute
