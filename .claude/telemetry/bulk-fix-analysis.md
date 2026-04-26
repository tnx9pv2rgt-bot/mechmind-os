# Bulk Coverage Fix Analysis — 2026-04-26

## Executive Summary

- **Total files below 90/90**: 125 backend modules
- **Critical (0% coverage)**: 3 files (vehicle-document, sse, peppol controllers)
- **High priority (0-70% branches)**: 11 files
- **Medium priority (70-90% branches)**: 111 files

## Remediation Strategy

### Phase 1: CRITICAL (Do First)
- 3 files with 0% coverage
- Action: Create `.spec.ts` files from scratch
- Estimated effort: 1-2 hours per file
- Files:
  1. `src/customer/controllers/vehicle-document.controller.ts`
  2. `src/notifications/controllers/sse.controller.ts`
  3. `src/peppol/peppol.controller.ts`

### Phase 2: HIGH PRIORITY (Branches 0-70%)
- 11 files with significant gaps
- Action: Add targeted test cases for uncovered branches
- Estimated effort: 30-45 min per file
- Focus: Exception handling, edge cases, conditional branches

### Phase 3: MEDIUM PRIORITY (Branches 70-90%)
- 111 files near target
- Action: Add 2-5 additional tests per file to reach 90%
- Estimated effort: 10-20 min per file
- Focus: Decorator logic, ternaries, switch cases

## Effort Estimation

| Phase | Files | Avg Time | Total |
|-------|-------|----------|-------|
| Critical | 3 | 2 hrs | 6 hrs |
| High | 11 | 45 min | 8 hrs |
| Medium | 111 | 15 min | 28 hrs |
| **TOTAL** | **125** | — | **42 hrs** |

With bulk automation (fix-coverage-file): **~8-10 hrs** (5x acceleration)

## Next Steps

1. ✅ Completed: Discovery phase (analysis of all 125 files)
2. ⏳ Recommended: Use `/fix-all-coverage --limit 10` to process top 10 files
3. ⏳ Then: Process batches of 5-10 files
4. ⏳ Finally: Run full test suite to verify all at 90/90

## Files Sorted by Priority

### TIER_1: CRITICAL (No Tests)
```
src/customer/controllers/vehicle-document.controller.ts (0.0% / 0.0%)
src/notifications/controllers/sse.controller.ts (0.0% / 0.0%)
src/peppol/peppol.controller.ts (0.0% / 0.0%)
```

### TIER_2: HIGH (0-70% Branches)
```
src/admin/roles.controller.ts (100.0% / 50.0%) ← 100% statements, only 50% branches
src/customer/services/vehicle.service.ts (84.4% / 58.3%)
src/inventory-alerts/services/inventory-alerts.service.ts (95.2% / 61.5%)
src/admin/tenant-settings.controller.ts (93.0% / 63.6%)
src/portal/portal.service.ts (57.2% / 64.1%)
src/accounting/services/quickbooks.service.ts (88.9% / 66.7%)
src/common/metrics/metrics.controller.ts (100.0% / 66.7%)
src/invoice/controllers/bnpl-webhook.controller.ts (94.1% / 66.7%)
src/portal/portal.controller.ts (87.3% / 69.0%)
src/labor-guide/controllers/labor-guide.controller.ts (100.0% / 69.4%)
src/gdpr/controllers/gdpr.controller.ts (100.0% / 69.6%)
```

### TIER_3: MEDIUM (70-90% Branches)
(111 files, see full list in coverage-summary.json)

---

**Generated**: 2026-04-26 08:15 UTC
**Tool**: fix-all-coverage bulk analysis
**Status**: ANALYSIS COMPLETE — Ready for remediation
