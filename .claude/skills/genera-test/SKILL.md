---
name: genera-test
description: "Test generation unified (single module OR all 51 backend modules). Single: atomic RAM + cascade models + 90% coverage. All: mutation ≥80%, CRAP analysis, flakiness detection, assertion density ≥2.5, world-class quality gates."
allowed-tools: ["Bash", "Read", "Edit", "Write", "Glob", "Grep", "Agent"]
disable-model-invocation: true
effort: max
context: fork
argument-hint: "[--scope single|all] [--module MODULE] [--tiers TIER_1,...] [--dry-run] [--force] [--skip-verify] [--parallel N]"
---

# Genera Test — Unified (Single Module + All Backend)

Single-module or all-51-modules test generation with world-class quality gates.

## Modalità

### SINGLE MODULE (--scope single)
```bash
/genera-test --scope single --module booking
/genera-test --scope single --module auth --dry-run
```
- Atomic RAM workflow
- Cascade models (Haiku → Sonnet → Opus)
- Coverage ≥90% statements AND ≥90% branches
- Auto-improvement loop (max 5 iterations)
- Output: modulo testato, spec trasferito su disco, MODULI_NEXO.md aggiornato

### ALL MODULES (--scope all)
```bash
/genera-test --scope all
/genera-test --scope all --tiers TIER_1,TIER_2
/genera-test --scope all --parallel 4
```
- Parallel processing (default: 2 TIER_1, 3 TIER_2, 5 TIER_3/4)
- For each module: coverage ≥90% + mutation ≥80% (Stryker incremental)
- CRAP score analysis (target <10)
- Flakiness detection (3 runs)
- Assertion density ≥2.5
- Final scorecard per modulo
- Quality gates: TypeScript strict, ESLint 0 warnings
- Overall report: MODULI_NEXO.md + QUALITY_SCORECARD.md

## Tiers

```
TIER_1 (CRITICAL P0): auth, booking, invoice, payment-link, subscription, gdpr
  → Opus 4.7, max 2 parallel, mutation ≥80% required
  
TIER_2 (HIGH P1): notifications, admin, analytics, common, dvi, iot, work-order, customer, estimate, voice
  → Sonnet 4.6, max 3 parallel, mutation ≥75% required

TIER_3 (MEDIUM P2): rentri, parts, campaign, accounting, portal, membership, sms, reviews, location, etc.
  → Sonnet 4.6, max 5 parallel, mutation ≥70% required

TIER_4 (UTILITY): config, lib, middleware, types, services
  → Haiku 4.5, max 5 parallel, coverage ≥90% required (mutation optional)
```

## Features

✅ **Atomic RAM Workflow** — no disk corruption on failure
✅ **Cascade Models** — adaptive model selection by tier + retry on fail
✅ **90/90 Coverage** — statements AND branches (both required)
✅ **Mutation Testing** — Stryker.js incremental (1-5 min vs 20-30 min full)
✅ **CRAP Analysis** — Cyclomatic Complexity Risk (target <10)
✅ **Flakiness Detection** — 3 runs, 0 tolerance for instability
✅ **Assertion Density** — ≥2.5 expectations per test
✅ **Property-Based Testing** — boundary values for numeric/state machine funcs
✅ **Quality Scorecard** — per-modulo report with all metrics
✅ **Auto-Improve Loop** — detect gaps, generate targeted tests, re-measure (max 5 iter)

## Workflow (Single Module)

```
1. [Verify] Module score ≥70 (complexity analysis)
2. [Scan] Find all .service.ts files
3. [Load] Copy to /tmp RAM (atomic staging)
4. [Generate] For each service:
   - Cascade: try Tier model → fail → retry Opus
   - Quality gates: security, testing, code quality
   - Write to $STAGING/ (not disk yet)
5. [TypeScript] tsc --noEmit (first disk touch)
6. [ESLint] npm run lint --max-warnings 0
7. [Coverage] jest --coverage → ≥90%/≥90%?
   - If YES → transfer staging to disk, log MODULI_NEXO.md ✅
   - If NO → analyze gaps, generate more tests, loop (max 5 iter)
8. [Assertion Density] Verify ≥2.5 expects/test
9. [Done] RAM cleaned, spec on disk, MODULI_NEXO.md updated
```

## Workflow (All Modules)

```
0. [Pre-Flight] CRAP analysis, complexity check, jest config validation
1. [Inventory] List all 51 modules, baseline coverage
2. [Tier-based parallelization] 
   - Launch Agents: TIER_1 (2 parallel) → TIER_2 (3) → TIER_3 (5) → TIER_4 (5)
   - Each Agent: full single-module workflow + mutation
3. [Mutation] Stryker incremental for each module
   - TIER_1: ≥80% killed (excellent)
   - TIER_2/3: ≥75% killed (good)
   - TIER_4: ≥70% (utility, lower bar)
4. [Quality Gates]
   - Flakiness: 0 tests allowed to vary across runs
   - Assertion density: ≥2.5 (no decorative tests)
   - Dead code: 0 unused vars/functions
   - Test pyramid: ≥70% unit (not e2e heavy)
5. [Scorecard] Generate QUALITY_SCORECARD.md:
   - Module | Statements | Branches | Mutation | CRAP | Density | Flakiness | Status
6. [Log] Update MODULI_NEXO.md with all metrics
7. [Report] Final summary: X modules at 90/90, Y modules at ceiling, Z modules needs work
```

## Usage Examples

```bash
# Single module — simple
/genera-test --scope single --module booking

# Single module — preview only
/genera-test --scope single --module auth --dry-run

# All modules — default (TIER_1 → TIER_2 → TIER_3 → TIER_4)
/genera-test --scope all

# All modules — specific tier only
/genera-test --scope all --tiers TIER_1

# All modules — with parallelism
/genera-test --scope all --parallel 6

# All modules — skip verify (sconsigliato)
/genera-test --scope all --skip-verify
```

## Output

### Single Module
```
✅ booking — 92% / 91% (iteration 2)
   + 8 test cases added
   + Assertion density: 2.7
   
📝 MODULI_NEXO.md updated:
   | 2026-04-25 14:30 | backend | booking | service | 92% / 91% | ✅ COMPLETATO (+2pp, iter:2) |
```

### All Modules
```
╔═══════════════════════════════════════════════════════════╗
║           QUALITY SCORECARD — ALL MODULES                ║
║           (2026-04-25 14:30)                              ║
╠═══════════════════════════════════════════════════════════╣
║ TIER_1 CRITICAL (6 modules)                              ║
║  auth       │ 100% │ 98%  │ 85% │ 6.2  │ 2.8 │ ✅    │
║  booking    │ 92%  │ 91%  │ 82% │ 7.1  │ 2.6 │ ✅    │
║  invoice    │ 96%  │ 94%  │ 88% │ 5.8  │ 2.9 │ ✅    │
║  ...                                                      ║
║                                                           ║
║ TIER_2 HIGH (11 modules)                                 ║
║  ...                                                      ║
║                                                           ║
║ TIER_3 MEDIUM (20 modules)                               ║
║  ...                                                      ║
║                                                           ║
║ TIER_4 UTILITY (6 modules)                               ║
║  ...                                                      ║
║                                                           ║
║ SUMMARY:                                                  ║
║  ✅ 48 modules at 90/90 (world-class)                    ║
║  🟠 2 modules at 88/87 (acceptable, ceiling documented)  ║
║  ❌ 1 module below bar (needs refactoring)               ║
╚═══════════════════════════════════════════════════════════╝

📊 Full report: QUALITY_SCORECARD.md
📝 Log: MODULI_NEXO.md (51 entries)
🔄 Mutation: all incremental configs saved for next run
```

## Failure Scenarios

| Scenario | Action |
|----------|--------|
| Coverage <90% after 5 auto-iter | Flag ⏳ CEILING_ARCHITETTURALE, log gap analysis |
| Mutation <60% | Escalate (likely weak assertions) |
| TypeScript error | Rollback RAM, disk invariant, report error |
| ESLint error | Fix code, re-run (atomic safety) |
| Flakiness detected | Quarantine test, log isolation issue (67% DB state leak) |

## Quality Gates (Non-negotiable)

```
✅ TypeScript strict (0 errors)
✅ ESLint (0 warnings)
✅ Coverage Statements ≥90%
✅ Coverage Branches ≥90%
✅ Mutation score ≥80% (TIER_1) / ≥75% (TIER_2) / ≥70% (TIER_3/4)
✅ Assertion density ≥2.5
✅ Flakiness detection (0 allowed)
✅ CRAP score <10 per method (max 3 methods 10-15 acceptable)
✅ Atomic RAM (disk untouched until gates verified)
```

---

**Last Updated:** 2026-04-25  
**Standard:** Google 90% exemplary + Stryker >80% excellent + Meta ACH mutation
**Atomic RAM:** World-class — disco invariated until all gates ✅
