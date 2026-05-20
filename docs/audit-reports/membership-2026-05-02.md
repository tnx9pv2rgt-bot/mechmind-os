# Audit Report: `membership`

**Data:** 2026-05-02 16:45 | **Sessione:** audit-membership-2026-05-02
**Risk Score:** 81/100 backend | **Production-ready:** ⚠️ CONDITIONAL (test quality gates fail)
**Mutation Score:** CEILING (832 LOC > 800 OOM threshold)

---

## CVE & Supply Chain

| CVE | Status | Action |
|-----|--------|--------|
| CVE-2025-54782 NestJS devtools CSRF RCE | ✅ Safe | @nestjs/devtools-integration not used |
| CVE-2025-66478 Next.js RSC RCE | ✅ N/A | Backend-only module |
| npm high/critical | ✅ 0 | npm audit clean |

---

## Coverage (c8)

| Metrica | Prima | Dopo | CEILING |
|---------|-------|------|---------|
| Statements | 96.5% | 96.5% | — |
| Branches | 80.82% | 80.82% | ✅ Service 91.2% ≥90% (DTO 50% class-validator IIFE) |

---

## Score Backend

| Asse | Gate superati | Gate ceiling | Score |
|------|--------------|--------------|-------|
| Sicurezza | 6/6 | 0 | 10/10 |
| Supply Chain | 3/3 | 0 | 10/10 |
| Resilienza | 3/3 | 0 | 9/10 |
| Test | 3/8 | 2 (Stryker OOM, assertion/mock/verify) | 3.75/10 |
| Osservabilità | 2/2 | 0 | 8/10 |
| Performance | 2/2 | 0 | 8/10 |
| Architettura | 2/2 | 0 | 8/10 |
| **TOTALE** | **21/28** | **2** | **57.75/70** |

---

## Problemi (per urgenza)

| Urgenza | Asse | Problema | Traceability | Stato |
|---------|------|----------|--------------|-------|
| ALTA | Test | Gate 6: assertion density 1.37/test < 2 target | test-quality-gates.md §5 | APERTO |
| ALTA | Test | Gate 7: 61 mock violations (no Once) | test-quality-gates.md §6 | APERTO |
| ALTA | Test | Gate 8: 13/50 call verification < target | test-quality-gates.md §7 | APERTO |

---

## Root Cause Analysis (Test Quality)

### F-001: Mock State Management Violations

**Before (VIOLATIONS):**
```typescript
mockPrisma.membershipProgram.findUnique.mockResolvedValue(mockProgram()); // ❌ NO Once!
// This rejects FOREVER for subsequent tests

it('test 1: program not found', async () => {
  mockPrisma.membershipProgram.findUnique.mockResolvedValue(null);
  // ❌ NO Once — contaminates test 2
});

it('test 2: should succeed', async () => {
  // Inherits mockResolvedValue(null) from test 1 — FAILS ❌
  const result = await service.getProgram('tenant-1', 'prog-1');
  expect(result).toBeDefined(); // FAILS because mock still returns null
});
```

**After (FIXED):**
```typescript
beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.membershipProgram.findUnique.mockResolvedValue(mockProgram()); // ✅ Default
});

it('test 1: program not found', async () => {
  mockPrisma.membershipProgram.findUnique.mockResolvedValueOnce(null); // ✅ Once!
  await expect(service.getProgram('tenant-1', 'prog-1')).rejects.toThrow(NotFoundException);
  expect(mockPrisma.membershipProgram.findUnique).toHaveBeenCalledTimes(1);
});

it('test 2: should succeed', async () => {
  const result = await service.getProgram('tenant-1', 'prog-1');
  expect(result).toBeDefined();     // ✅ Uses default from beforeEach
  expect(result.id).toBe('prog-uuid-001');
  expect(mockPrisma.membershipProgram.findUnique).toHaveBeenCalledWith(
    expect.objectContaining({ where: expect.objectContaining({ id: 'prog-1' }) })
  );
});
```

**Impact:** Test pollution cascades. Each violation can break up to N subsequent tests.
**Traceability:** OWASP A10:2025 (Exceptional Conditions) — test reliability
**DORA Rework:** Yes (flaky tests → developer distrust)

---

## Stato dell'arte 2026

✅ In linea: 
- OWASP A01:2025 — tenantId isolation on all 12 queries ✅
- OWASP A07:2025 — JwtAuthGuard + @CurrentUser decorator on all endpoints ✅
- GDPR Art.32 — no PII in logs, Prisma RLS-ready ✅
- Statements coverage 96.5% exceeds 90% target ✅

⚠️ Indietro: 
- Test quality (gates 6/7/8) — mock enforcement, assertion density, call verification
- Service layer logic covered (91.2% branches) but test structure needs refactoring

❌ Mancante: 
- Mutation score (Stryker blocked by OOM risk on 8GB RAM)

---

## Fonti Consultate

- [CVE-2025-54782 NestJS RCE](https://github.com/advisories/GHSA-85cg-cmq5-qjm7)
- [OWASP Top 10:2025](https://owasp.org/Top10/2025/)
- [test-quality-gates.md — dual validation](../../.claude/rules/test-quality-gates.md)
- [NASA NPR 7150.2D §3.7.2 — coverage measurement](https://swehb.nasa.gov/spaces/SWEHBVD/pages/102695524/SWE-189+-+Code+Coverage+Measurements)

---

## Prossimi Passi

1. **Immediato** (blocca merge): Refactor specs to fix gates 6/7/8
   - Add `mockResolvedValueOnce`/`mockRejectedValueOnce` to all test bodies
   - Increase assertion density to ≥2 per test
   - Add `toHaveBeenCalled(With|Times)` on all mock-using tests

2. **Sprint corrente**: Verify mutations via manual code path analysis (Stryker not runnable)

3. **Prossimo sprint**: Integrate Stryker once OOM threshold addressed (e.g., split service into smaller units)

---

**Audit Status:** ⏳ CEILING_ACCEPTED (2 gates documented, F-001 ALTA open)
**Recommendation:** Fix test quality gates before production deployment.
