# Coverage Standard — 90/90 (World-Class)

## 🎯 UNIVERSAL REQUIREMENT

**ALL backend modules (51 total) must achieve Statements ≥90% AND Branches ≥90%.**

No exceptions. No modules below this threshold.

## 📊 Why 90/90?

This aligns with best-in-class standards globally:

| Standard | Statements | Branches | Use Case |
|----------|-----------|----------|----------|
| **Google** | 90% | N/A | "Exemplary" target |
| **NASA/JPL** | 100% | 100% | Safety-critical (space, avionics) |
| **Healthcare (HIPAA/FDA)** | 100% | 100% | Patient data, compliance-critical |
| **Fintech (PCI DSS)** | 85-100% | 85-100% | Payment processing, transaction-critical |
| **Nexo Gestionale** | **90%** | **90%** | Fintech + healthcare-level compliance (GDPR, PCI, OWASP) |

Source: [Google Testing Blog](https://testing.googleblog.com/2020/08/code-coverage-best-practices.html), [NASA JPL Standards](https://swehb.nasa.gov/spaces/SWEHBVD/pages/102695524/SWE-189+-+Code+Coverage+Measurements)

## ✅ Measurement Method

```bash
# Measure coverage ONLY via real terminal commands (never trust agent-reported numbers)
cd backend && npx jest src/<modulo> --coverage --forceExit

# Expected output:
# Statements   : 90% ( X/Y )    ✅
# Branches     : 90% ( X/Y )    ✅
# Functions    : (no hard target)
# Lines        : (no hard target)
```

**Rule:** If real terminal output differs from agent claims → reject and regenerate. Always verify before logging to MODULI_NEXO.md.

## 📋 Progress Tracking

Every module completion MUST include:
1. Real terminal output (copy/paste `Statements: X%` and `Branches: X%`)
2. Timestamp (YYYY-MM-DD HH:MM)
3. Entry in MODULI_NEXO.md log: `| timestamp | backend | <modulo> | <service> | X% / Y% | ✅/⏳/❌ |`

No logging without verified real numbers.

## 🛠️ Coverage Gap Analysis (When < 90%)

If a module is below 90% in either metric:

1. **Identify uncovered lines**: `npx jest src/<modulo> --coverage` → find lines/branches not executed
2. **Understand the code**: Read the source file to understand what those branches do
3. **Write targeted tests**: Add tests for:
   - Happy path (sunny day)
   - Error cases (exception handling, validation)
   - Edge cases (null, undefined, empty, boundary values)
   - Conditional branches (all if/else, switch cases, ternaries)
4. **Re-measure**: `npx jest src/<modulo> --coverage --forceExit`
5. **Repeat** until both Statements ≥90% AND Branches ≥90%

## ⚠️ Anti-Patterns (Forbidden)

```typescript
// ❌ NO: Measuring coverage without clearing cache
npx jest src/modulo --coverage
// (may use stale bytecode)

// ❌ NO: Trusting agent-reported coverage numbers
Agent says: "coverage improved to 92%"
// (must verify with real terminal command)

// ❌ NO: Logging coverage without real numbers
MODULI_NEXO.md: "| 2026-04-24 | backend | invoice | service | ~91% / ~85% |"
// (vague estimates not allowed)

// ❌ NO: Skipping low-coverage branches
// (even if hard to test — find a way or mark as integration-only)
```

## ✅ Example: Compliance Audit

```
Module: subscription/controllers
Terminal output:
  Statements   : 100% (283/283)  ✅
  Branches     : 73.75% (118/160)  ❌ (Target 90%)
  
Gap: 16.25 percentage points

Action: Add tests for:
  - webhook.handleWebhook: missing error branches (signature validation)
  - getPricingInfo: missing filter+map edge cases
  - comparePlans: missing price formatting branches
  
Add: 8-12 targeted test cases

Re-measure: Branches 73.75% → 85% (+11.25pp)
Still below: Add 4 more tests
Re-measure: Branches 85% → 91% ✅

Log to MODULI_NEXO.md:
| 2026-04-24 23:30 | backend | subscription | controllers | 100% / 91% | ✅ COMPLETATO |
```

## 📅 Rollout Timeline

- **NOW (April 24, 2026)**: Implement 90/90 standard on all NEW test generation
- **Week 1 (Apr 25-May 1)**: Fix all P0 modules (6 TIER_1 critical)
- **Week 2 (May 2-8)**: Fix all P1 modules (11 TIER_2 high)
- **Week 3 (May 9-15)**: Fix all P2/P3 modules (30+ TIER_3 medium/utility)
- **May 15, 2026**: All 51 backend modules at 90/90 ✅

## 🔗 References

- CLAUDE.md: Global dev standards
- complete-testing-strategy.md: Full V&V suite (unit → integration → E2E → load → security)
- nasa-level-quality.md: Cyclomatic complexity, MC/DC coverage, assertions ≥2/func
- cyber-security-2026.md: OWASP A01-A10, GDPR 2026, PCI DSS 4.0.1

---

**Last updated:** 2026-04-24
**Owner:** Giovanni Romano (MechMind OS)
**Standard:** World-class fintech + healthcare compliance
