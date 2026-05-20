# Compliance Officer Memory Index

## User Context

- Role: Compliance Officer — Nexo Gestionale multi-tenant ERP
  (automotive/officine)
- Email: romanogiovanni1993@gmail.com
- Git: qa/booking-coverage branch active
- Scope: Read-only documentation (docs/compliance/**, docs/eu/**,
  docs/audit-reports/\*\*)

## Key Compliance Frameworks (In Scope)

- GDPR (Art. 5/6/7/15-22/28/32/33/35)
- EU AI Act (Regolamento 2024/1689) — Limited Risk modules: Vapi Voice, AI
  Scheduling
- FatturaPA 1.2.2 + SDI integration
- RENTRI (registro rifiuti 2026 deadline)
- PCI DSS 4.0.1 (Stripe tokenization only)
- NIS2 security (12-month log retention)
- ASVS 5.0.0 (cross-ref with security-auditor)

## Completed Tasks (2026-05-12)

- DPO Nomination Template (Art. 37-39 GDPR) — CREATED
- Data Retention Policy (365-day logs/backups, 10y invoices) — CREATED
- render.yaml verification — EU data residency confirmed (Frankfurt)
- public-token CEILING documentation — ts-jest source map limitation
- DPA.md signing process checklist — Appendix added

## Critical Files Created/Updated

| File                                                   | Purpose                                          | Version  |
| ------------------------------------------------------ | ------------------------------------------------ | -------- |
| `/docs/legal/dpo-nomina-template.md`                   | Client-facing DPO template                       | 1.0      |
| `/docs/legal/retention-policy.md`                      | Data retention schedule                          | 1.0      |
| `/docs/DPA.md` (appendix)                              | Signing checklist for beta clients               | 1.0      |
| `/docs/audit-reports/public-token-ceiling-accepted.md` | CEILING decision + root cause                    | 1.0      |
| `/render.yaml`                                         | Deployment config — VERIFIED (no changes needed) | existing |

## Normative Deadlines (P0)

- 2026-12-31: RENTRI API integration required (D.Lgs. 116/2020) — **NOT
  STARTED**
- 2026-12-31: FatturaPA transmission to SDI required (DPR 633/72) — **NOT
  STARTED**
- 2026-12-31: EU AI Act disclosure obligations (modules Voice, Scheduling) —
  **NOT STARTED**
- 2026-12-31: Cookie consent banner live (ePrivacy § 122 CAD) — **NOT STARTED**
- 2026-06-30: Beta client DPA signatures must be collected + audit-logged —
  **DPA exists but acceptance tracking missing**

## Commercial Launch Status (2026-05-14)

- **Audit Result:** ⚠️ **NOT READY FOR PRODUCTION** — 12 gaps identified, 4
  blockers
- **Critical Audit:**
  `/docs/audit-reports/compliance-commercial-launch-2026-05-14.md` (14 pages)
- **Blockers:** RENTRI API (GAP-1), SDI transmission (GAP-2), Cookie banner
  (GAP-3), Incomplete ToS (GAP-4)
- **High Priority:** AI Act disclosure (GAP-5), Breach notification process
  (GAP-6), DPA tracking (GAP-7)
- **Recommendation:** 4-week CAP before launch; beta program acceptable with
  workarounds

## Important Notes

- Nexo is Data Processor (GDPR Art. 28) — clients are Data Controllers
- Clients must have their own DPO if >50 employees + large-scale processing
- Backup retention: Supabase (EU Frankfurt) — 365 days minimum
- Log retention: 365 days for audit trail (Art. 32 GDPR + SOC2)
- Never modify code — only .md, .yaml, .json configuration files
- Output must pass human legal reviewer before client-facing use
