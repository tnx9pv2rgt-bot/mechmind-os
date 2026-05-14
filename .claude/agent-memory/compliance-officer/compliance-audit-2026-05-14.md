---
name: Commercial Launch Compliance Audit 2026-05-14
description:
  Critical gaps identified for Nexo Gestionale commercial launch — 12 issues
  blocking deployment, 4-week remediation required
type: project
---

# Compliance Audit Result — Commercial Launch (2026-05-14)

## Status: ⚠️ NOT READY FOR PRODUCTION

**Output file:**
`/docs/audit-reports/compliance-commercial-launch-2026-05-14.md`

### Critical Blockers (Must Fix Before Launch)

1. **RENTRI 2026 API Integration Missing** (D.Lgs. 116/2020)
   - Service has validation schema but only SIMULATES export (line 486:
     `const trackingId = 'AGE-...'`)
   - No actual MTLS HTTP POST to Agenzia Entrate endpoint
   - **Fix:** Implement real HTTP transmission + retry logic
   - **Timeline:** 2-3 weeks (depends on Agenzia sandbox access)
   - **Deadline:** 2026-12-31

2. **FatturaPA Not Transmitted to SDI** (DPR 633/72)
   - XML generated ✅ but stored only on S3
   - Test file `fatturapa-sdi-sandbox.spec.ts` disabled
     (`ENABLE_SDI_SANDBOX=false`)
   - No SDI callback handler for delivery confirmation
   - **Fix:** Implement SdiTransmissionService + mTLS certificate + idempotency
   - **Timeline:** 2-3 weeks
   - **Deadline:** Immediate (non-compliance from day 1)

3. **Cookie Consent Banner Missing** (ePrivacy § 122 CAD)
   - Privacy page mentions cookies but zero consent UI
   - No cookie consent library integrated
   - No audit trail of consent (GDPR Art. 7 proof-of-consent requirement unmet)
   - **Fix:** Integrate Cookiebot/react-cookie-consent + consent storage
   - **Timeline:** 1 week
   - **Deadline:** 2026-12-31

4. **Terms of Service Incomplete** (Italian Civil Code + GDPR Art. 28)
   - Sections 1-6 only, missing critical: SLA, liability, GDPR Art. 28 DPA
     terms, sub-processor mgmt, breach notification, termination
   - Uses generic SaaS template (not Italy-customized)
   - **Fix:** Legal review + sections 7-16 + separate DPA page with e-signature
   - **Timeline:** 2-3 weeks (depends on legal counsel)
   - **Deadline:** Before first commercial contract

### High-Priority Issues (Resolve Before Commercial)

5. **EU AI Act Disclosure Missing** (Reg. 2024/1689 Art. 50-52)
   - Voice (Vapi) + Scheduling modules = Limited Risk systems
   - Zero disclosure to clients, no System Card, no human override UI
   - **Fix:** Create System Card pages + AI audit log table + transparency UI
   - **Timeline:** 2 weeks
   - **Deadline:** 2026-12-31

6. **Data Breach Notification Undefined** (GDPR Art. 33-34)
   - Audit logs exist but no breach detection/response playbook
   - No 72h timer enforcement, no Autorità Garante notification template
   - **Fix:** Create playbook + breach detection monitoring + IncidentLog table
   - **Timeline:** 1-2 weeks
   - **Deadline:** Before launch

7. **DPA Acceptance Not Audit-Logged** (GDPR Art. 28(3))
   - DPA.md exists but no proof of client signature
   - No e-signature integration, no DpaAcceptance table
   - Cannot demonstrate "in writing" requirement to regulators
   - **Fix:** E-signature integration + onboarding UI + acceptance tracking
   - **Timeline:** 2 weeks
   - **Deadline:** Before first customer

### Medium-Severity (Pre-Launch Acceptable if Documented)

8. **Bollo Virtuale Logic Incomplete** (DPR 642/72) — 3-5 days
9. **RENTRI Missing Geolocation Data** (D.Lgs. 116/2020) — 1 week
10. **BNPL Webhook Signature Verification** (PCI DSS 4.0.1) — Audit needed, 3
    days to fix if required
11. **No English Translation** (GDPR Art. 13 + eIDAS) — 1 week (defer if
    Italy-only launch)

---

## Deployment Recommendation

**Status:** ❌ **NOT READY FOR COMMERCIAL LAUNCH**

**Recommended action:**

1. **Week 1-2:** Fix GAP-3 (cookie banner), GAP-4 (terms), GAP-7 (DPA tracking)
2. **Week 2-3:** Parallel: Start GAP-1 (RENTRI) + GAP-2 (SDI) API integration
   with Agenzia sandbox
3. **Week 3-4:** Fix GAP-5 (AI disclosure), GAP-6 (breach playbook)
4. **GO/NO-GO Decision:** 2026-06-30 (after fixes + legal review)

**ACCEPTABLE PATH:** Deploy to limited BETA (5 clients max) with **signed DPA +
documented workarounds** while completing critical fixes in parallel. Limit to
single-tenant test deployment until RENTRI/SDI live.

---

## Why Audit Blocked Commercial Launch

Nexo has **strong baseline** (GDPR infrastructure ✅, audit logs ✅, PII
encryption ✅, DSR endpoints ✅) but **12 gaps that violate mandatory EU+IT
norms:**

- **GAP-1,2:** SDI/RENTRI transmission = fundamental for invoicing.
  Non-compliance = €250-1,500 per month fines, invoice rejection.
- **GAP-3:** Cookie banner = base GDPR/ePrivacy requirement. Fines €10-20k.
  Blocks all analytics/cookies.
- **GAP-4:** Incomplete ToS = unenforceable contract + no processor authority
  (GDPR Art. 28 violation).
- **GAP-5:** AI Act disclosure = new regulatory (August 2026 deadline).
  Non-disclosure = €15M/3% revenue.
- **GAP-6,7:** Breach playbook + DPA tracking = table-stakes for GDPR processor
  status. Missing = joint liability with clients.

---

## Next Steps

**For Compliance Officer (Giovanni):**

1. Present audit to CTO + legal counsel (meeting scheduled 2026-05-15?)
2. Break CAP into sprints: Critical (week 1-2), High (week 3-4), Medium
   (post-launch)
3. Assign owners: RENTRI/SDI (backend), Cookie banner (frontend), Legal review
   (external counsel)
4. Set hard deadline: 2026-06-30 (go-live decision point)
5. Update MEMORY.md every Friday with CAP progress

**For Executive Team:**

- Announce delay (initially planned June → realistic August 2026) to board
- Allocate legal budget (€3-5k for ToS customization + DPA e-signature setup)
- Consider beta program (5 early customers) to parallelize CAP work + revenue
  generation

---

## Evidence Files Reviewed

- `backend/src/rentri/services/rentri.service.ts` (L.470-504: exportToAgenzia is
  simulated)
- `backend/src/invoice/services/fatturapa.service.ts` (L.114-236: generation OK,
  transmission missing)
- `backend/src/invoice/services/fatturapa-sdi-sandbox.spec.ts` (SDI test
  disabled)
- `frontend/app/privacy/page.tsx` (comprehensive but no consent UI)
- `frontend/app/terms/page.tsx` (incomplete, generic template)
- `docs/DPA.md` (well-written but no acceptance tracking)
- `docs/legal/retention-policy.md` (backup retention date mismatch with
  privacy.tsx)
- `docs/eu/compliance-roadmap.md` (AI Act deadline recognized, but no System
  Card yet)

---

**Audit completed:** 2026-05-14 10:00 UTC  
**Report location:**
`/docs/audit-reports/compliance-commercial-launch-2026-05-14.md` (14 pages, full
detail)  
**Status:** Ready for CTO + Legal review  
**Re-audit scheduled:** 2026-06-15 (CAP progress check)
