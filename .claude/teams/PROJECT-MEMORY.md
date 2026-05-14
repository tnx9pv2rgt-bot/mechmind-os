# PROJECT MEMORY — NEXO GESTIONALE

> Documento di memoria persistente. Aggiornare a FINE di ogni sessione. Leggere
> all'INIZIO di ogni sessione prima di qualsiasi azione. Owner: nexo-architect.
> Append-only per sezione CRONOLOGIA e BUG.

**Ultimo aggiornamento:** 2026-05-12 **Branch corrente:** `qa/booking-coverage`
**Versione prodotto:** v10.2.0 (semantic-release 2026-04-22) **Verdict QA:** ✅
GO conditional (NASA-QA-REPORT-FINAL.md, 2026-05-09)

---

## STACK TECNICO

| Layer    | Tecnologia                                                              | Porta |
| -------- | ----------------------------------------------------------------------- | ----- |
| Backend  | NestJS + Prisma + PostgreSQL 15 + Redis 7 + BullMQ                      | :3002 |
| Frontend | Next.js 16.2.4 + App Router + Tailwind + Radix UI                       | :3000 |
| Auth     | JWT (jti obbligatorio) + MFA + Passkey                                  | —     |
| Infra    | Docker Compose locale, Vercel (frontend), [backend deploy: DA DEFINIRE] | —     |
| CI/CD    | GitHub Actions (unit test, lint, tsc, semgrep, npm audit)               | —     |

---

## STATO ATTUALE (snapshot 2026-05-12)

1. **Backend unit coverage**: ~47 moduli auditati. ~5 a TARGET MET (branches
   ≥90%). ~40+ a CEILING architetturale (branches 73-89% per NestJS IIFE —
   limite strutturale, non fixabile). 2 sotto statements 90% (middleware 88.3%,
   services 88.47%). 262 suite, 8302 test pass.
2. **Frontend E2E**: 75+ spec, 1.050+ test case, 67.7% presence (21/31 moduli
   dashboard). Target 95%. Gap: 10 moduli senza test.
3. **Frontend unit**: NON configurato (jest/jsdom mancante). 32 hook custom, 2
   spec (useIsClient, useBilling) — BLOCCANTE parziale.
4. **RENTRI**: backend ✅ (96.82%/79.01%), E2E ✅ (13 test, 2026-05-10).
5. **Billing**: E2E ✅ (13 test, 2026-05-10). Core business validato.
6. **NASA QA Report** (2026-05-09): 365/366 test pass (99.7%). 1 failure AUTH-04
   (infra). Verdict: GO conditional.
7. **Bug risolti**: BUG-B04 CSP nonce ✅, tenantId webhooks ✅, tenantId
   location ✅, tenantId payment-link ✅, BUG-A23 Framer Motion ✅, BUG-A22
   Analytics SSR ✅, FORM-V-03 ✅, sms-F006 ✅, membership-quality ✅.
8. **Bug aperti**: AUTH-04 MEDIO, PERF-TTI-02 BASSO, CSP-02-TEST INFO,
   ai-diagnostic MEDIA, middleware-stmt BASSO, public-token CEILING_ACCEPTED.
9. **Multi-agent system**: 22 agenti configurati, verify-config 103/103 PASS, 0
   lock attivi.
10. **Roadmap**: 5 fasi definite (COVERAGE-REAL.md). Fase 0 parziale
    (rentri+billing E2E ✅, 2 hook spec ✅). Prossima: completare Fase 0
    (restanti 30 hook).

---

## CRONOLOGIA SESSIONI

| Data       | Azioni completate                                                                                                                                                                                                                                                                                                                                 | File chiave modificati                             | Bug risolti                                      | Nuovi bug                             |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------ | ------------------------------------- |
| 2026-04-22 | v10.2.0: dark mode, rate limit fix, expo backoff                                                                                                                                                                                                                                                                                                  | CHANGELOG.md                                       | rate limit 429 ✅                                | —                                     |
| 2026-04-24 | TIER2 batch: 1.622 test, 85 suites, target parziale                                                                                                                                                                                                                                                                                               | TIER2_BATCH_RESULTS.md                             | work-order coverage ⚠️                           | —                                     |
| 2026-04-25 | Remediation 8 fasi: da 64.5/100 → ≥95/100                                                                                                                                                                                                                                                                                                         | REMEDIATION_REPORT.md                              | —                                                | —                                     |
| 2026-04-29 | Audit auth (95.83%/83.97%), booking (97.35%/85.22%)                                                                                                                                                                                                                                                                                               | MODULI_NEXO.md                                     | 3 passkey tenantId ✅, 3 booking ✅              | —                                     |
| 2026-04-30 | Audit subscription (98.70%/90.41%), payroll (98.29%/86.41%)                                                                                                                                                                                                                                                                                       | MODULI_NEXO.md                                     | 4 finding subscription ✅                        | —                                     |
| 2026-05-01 | Audit common, declined-service, fleet, inventory-alerts, kiosk, labor-guide, lib                                                                                                                                                                                                                                                                  | MODULI_NEXO.md                                     | F-001 inventory-alerts ✅                        | —                                     |
| 2026-05-02 | Audit massivo ~25 moduli (dvi, work-order, analytics, ai-compliance, ai-diagnostic, ai-scheduling, campaign, canned-job, gdpr, iot, kiosk, membership, notifications, parts, portal, production-board, public-token, rentri, reviews, security-incident, services, sms, tire, vehicle-history, voice, webhook-subscription, webhooks, work-order) | MODULI_NEXO.md, docs/audit-reports/\*              | BUG-001 webhooks ✅, payment-link tenantId ✅    | membership quality ALTA               |
| 2026-05-03 | FASE1+2 scan copertura reale tutti i moduli. Divergenze trovate (invoice, ai-scheduling, kiosk, location, sms, middleware). Audit portal ✅, admin ✅                                                                                                                                                                                             | MODULI_NEXO.md                                     | —                                                | invoice branch 92%→81.77% (real scan) |
| 2026-05-09 | NASA QA Report FINAL: 365/366 pass, GO conditional                                                                                                                                                                                                                                                                                                | NASA-QA-REPORT-FINAL.md                            | BUG-B04 CSP ✅, BUG-A23 ✅, BUG-A22 ✅           | AUTH-04, FORM-V-03                    |
| 2026-05-10 | Config migration: 22 agenti, 103/103 verify, memory 2026                                                                                                                                                                                                                                                                                          | NEXO_AI_AGENCY_GUIDE.md, .claude/settings.json     | skipDangerousModePermissionPrompt rimossa        | —                                     |
| 2026-05-10 | Coverage audit E2E reale (Task 1): 75 spec, 1.050 test, 61.3% presence                                                                                                                                                                                                                                                                            | frontend/e2e/COVERAGE-REAL.md                      | —                                                | 12 moduli senza test                  |
| 2026-05-10 | Roadmap TPM 5 fasi (Task 2): obiettivo lancio 4 mesi                                                                                                                                                                                                                                                                                              | .claude/teams/PROJECT-MEMORY.md                    | —                                                | —                                     |
| 2026-05-10 | Fase 0 completata: rentri.spec.ts (13t), billing.spec.ts (13t), useIsClient.test.ts (22t), useBilling.test.ts (10t). 2613 test pass. E2E 67.7% (21/31). Agenti in bgr: E2E admin/voice/workflows/prod-board, hook batch 30 hook, public-token branches ≥90%.                                                                                      | frontend/e2e/dashboard/, frontend/**tests**/hooks/ | B1 rentri ✅, B2 billing ✅, B4 jest ✅          | —                                     |
| 2026-05-12 | Fix 35 TS errors (spec files, ts-fixer). Fix 7 ESLint errors. sms-F006: timestamp validation + private method (complexity ≤15). FORM-V-03: isSubmitting double-submit guard. Confermato membership-quality già risolto. public-token CEILING_ACCEPTED (ts-jest isolatedModules). 262 suite, 8302 test pass, 0 regressioni.                        | sms-thread.controller.ts, VehicleForm.tsx, 6 spec  | FORM-V-03 ✅, sms-F006 ✅, membership-quality ✅ | —                                     |

---

## BUG APERTI

| #   | ID                  | Severity         | Modulo        | Descrizione                                                    | Bloccante lancio       | Assegnato a           |
| --- | ------------------- | ---------------- | ------------- | -------------------------------------------------------------- | ---------------------- | --------------------- |
| 1   | AUTH-04             | MEDIO            | Auth infra    | Backend non avviato in test env (NestJS :3002) → AUTH-04 fail  | No (infra, non codice) | devops-engineer       |
| 3   | PERF-TTI-02         | BASSO            | Customers     | TTI 4433ms (< 5000ms soglia, ma > 4000ms target ideale)        | No                     | performance-optimizer |
| 4   | CSP-02-TEST         | INFO             | Test          | Logic bug nel test CSP-02 (feature CSP OK, test sbagliato)     | No                     | test-runner           |
| 7   | ai-diagnostic       | MEDIA            | ai-diagnostic | 3 finding: prompt injection, rate limiting, query optimization | No                     | security-auditor      |
| 8   | middleware-stmt     | BASSO            | middleware    | Stmt 88.3% < 90% (static constants ceiling)                    | No                     | test-runner           |
| 9   | services-stmt       | BASSO            | services      | Stmt 88.47% < 90% (3 file DEPRECATED)                          | No (CEILING_ACCEPTED)  | —                     |
| 10  | public-token-branch | CEILING_ACCEPTED | public-token  | Branches 65.85% artefatto ts-jest isolatedModules, 53 test ok  | No (non reale)         | —                     |

---

## MODULI — STATO COPERTURA

### Backend (targeting: Statements ≥90% AND Branches ≥90%)

| Modulo                 | Stmt%  | Branch% | Stato                             | Report              |
| ---------------------- | ------ | ------- | --------------------------------- | ------------------- |
| estimate               | 98.86  | 90.35   | ✅ TARGET MET                     | —                   |
| predictive-maintenance | 95.70  | 90.83   | ✅ TARGET MET                     | —                   |
| subscription           | 98.70  | 90.41   | ✅ TARGET MET                     | —                   |
| obd                    | 100.00 | 93.15   | ✅ TARGET MET                     | —                   |
| middleware             | 88.30  | 92.14   | ⚠️ Stmt <90%                      | —                   |
| auth                   | 95.83  | 83.97   | ⏳ CEILING (-6pp)                 | —                   |
| booking                | 97.35  | 85.22   | ⏳ CEILING (-5pp)                 | —                   |
| customer               | 96.26  | 89.20   | ⏳ CEILING (-0.8pp)               | docs/audit-reports/ |
| gdpr                   | 97.58  | 87.57   | ⏳ CEILING (-2.43pp)              | docs/audit-reports/ |
| ai-compliance          | 95.70  | 82.25   | ⏳ CEILING (-8pp)                 | docs/audit-reports/ |
| ai-scheduling          | 96.90  | 85.00   | ⏳ CEILING (-5pp)                 | docs/audit-reports/ |
| ai-diagnostic          | 96.68  | 85.10   | ⏳ CEILING (-4.9pp)               | docs/audit-reports/ |
| invoice                | 98.18  | 81.77   | ⏳ CEILING (-8pp)                 | —                   |
| common                 | 93.85  | 78.84   | ⏳ CEILING (-11pp)                | —                   |
| declined-service       | 93.42  | 81.03   | ⏳ CEILING (-9pp)                 | —                   |
| fleet                  | 97.61  | 76.66   | ⏳ CEILING (-13pp)                | —                   |
| inventory-alerts       | 92.69  | 76.00   | ⏳ CEILING (-14pp)                | —                   |
| kiosk                  | 90.86  | 79.31   | ⏳ CEILING (-11pp)                | docs/audit-reports/ |
| labor-guide            | 97.14  | 86.58   | ⏳ CEILING (-3pp)                 | —                   |
| lib                    | 94.04  | 78.57   | ⏳ CEILING (-11pp)                | —                   |
| location               | 96.05  | 73.91   | ⏳ CEILING (-16pp)                | —                   |
| payment-link           | 93.23  | 82.19   | ⏳ CEILING (-8pp)                 | —                   |
| payroll                | 98.29  | 86.41   | ⏳ CEILING (-4pp)                 | —                   |
| peppol                 | 94.58  | 88.04   | ⏳ CEILING (-2pp)                 | —                   |
| rentri                 | 96.82  | 79.01   | ⏳ CEILING (-11pp)                | —                   |
| production-board       | 97.22  | 82.60   | ⏳ CEILING (-7.4pp)               | docs/audit-reports/ |
| public-token           | 80.00  | 65.85   | ❌ CEILING (-24pp)                | —                   |
| security-incident      | 97.21  | 83.00   | ⏳ CEILING (-7pp)                 | —                   |
| services               | 88.47  | 76.51   | ⚠️ Stmt <90% + CEILING            | docs/audit-reports/ |
| sms                    | 90.93  | 70.58   | ⏳ CEILING (-19pp)                | —                   |
| vehicle-history        | 93.78  | 79.41   | ⏳ CEILING (-11pp)                | —                   |
| webhooks               | 97.46  | 77.63   | ⏳ CEILING (-12pp)                | docs/audit-reports/ |
| portal                 | 98.49  | 84.71   | ⏳ CEILING (-5pp, 100% eff.)      | docs/audit-reports/ |
| dvi                    | 97.45  | 83.57   | ⏳ CEILING (-6.43pp)              | docs/audit-reports/ |
| work-order             | 96.98  | 86.76   | ⏳ CEILING (-3.24pp)              | docs/audit-reports/ |
| reviews                | 97.53  | 86.04   | ⏳ CEILING (-3.96pp)              | docs/audit-reports/ |
| analytics              | 97.57  | 85.95   | ⏳ CEILING (-4.05pp)              | docs/audit-reports/ |
| campaign               | 97.36  | 85.88   | ⏳ CEILING (-4.12pp)              | docs/audit-reports/ |
| parts                  | 98.41  | 85.45   | ⏳ CEILING (-4.55pp)              | docs/audit-reports/ |
| canned-job             | 95.54  | 83.58   | ⏳ CEILING (-6.42pp)              | docs/audit-reports/ |
| membership             | 96.50  | 80.82   | ⏳ CEILING (-9.18pp)              | docs/audit-reports/ |
| voice                  | 96.14  | 83.25   | ⏳ CEILING (-6.75pp, 90.43% eff.) | docs/audit-reports/ |
| accounting             | 97.51  | 81.18   | ⏳ CEILING (-8.82pp)              | —                   |
| benchmarking           | 96.25  | 81.42   | ⏳ CEILING (-8.58pp)              | docs/audit-reports/ |
| tire                   | 95.83  | 80.59   | ⏳ CEILING (-9.41pp)              | docs/audit-reports/ |
| iot                    | 98.55  | 81.41   | ⏳ CEILING (-8.59pp)              | docs/audit-reports/ |
| webhook-subscription   | 98.19  | 84.33   | ⏳ CEILING (-5.67pp)              | docs/audit-reports/ |
| notifications          | 96.70  | 88.30   | ⏳ CEILING (-2pp)                 | —                   |
| admin                  | 93.87  | 75.84   | ✅ AUDIT COMPLETO (eff. 95.2%)    | —                   |

> **Nota ceiling**: NestJS `@UseGuards`, `@Roles`, `@ApiOperation`,
> `class-validator` DTO metadata generano branch IIFE non strumentabili da
> c8/Istanbul. Gap medio 8-15pp. Non risolvibile con più test.

### Frontend E2E (targeting: presenza scenario per modulo ≥95%)

| Modulo               | Spec dedicata                                                    | Test case | Stato       |
| -------------------- | ---------------------------------------------------------------- | --------- | ----------- |
| analytics            | dashboard/analytics.spec.ts                                      | 15        | ✅          |
| bookings             | dashboard/bookings + bookings/booking-flow + race-condition      | 61        | ✅          |
| canned-jobs          | dashboard/canned-jobs.spec.ts                                    | 17        | ✅          |
| customers            | dashboard/customers + customers/customer-management              | 27        | ✅          |
| estimates            | dashboard/estimates + functional/09                              | 20        | ✅          |
| inspections          | dashboard/inspections + inspection-workflow                      | 30        | ✅          |
| invoices             | dashboard/invoices + invoices/invoice-management + functional/05 | 43        | ✅          |
| locations            | dashboard/locations.spec.ts                                      | 14        | ✅          |
| maintenance          | dashboard/maintenance.spec.ts                                    | 11        | ✅          |
| marketing            | dashboard/marketing.spec.ts                                      | 15        | ✅          |
| messaging            | dashboard/messaging.spec.ts                                      | 14        | ✅          |
| obd                  | dashboard/obd.spec.ts                                            | 17        | ✅          |
| parts                | dashboard/parts + functional/09                                  | 20        | ✅          |
| settings             | dashboard/settings + settings/settings                           | 32        | ✅          |
| subscription         | dashboard/subscription.spec.ts                                   | 14        | ✅          |
| vehicles             | vehicles/vehicle-management + vehicles-audit + functional/07     | 33        | ✅          |
| warranty             | dashboard/warranty + warranty-claim                              | 41        | ✅          |
| work-orders          | dashboard/work-orders + functional/06                            | 20        | ✅          |
| dashboard (home)     | dashboard/dashboard.spec.ts                                      | 17        | ✅          |
| gdpr                 | functional/10-analytics-gdpr (parziale)                          | 21 (mix)  | ⚠️ parziale |
| rentri               | dashboard/rentri.spec.ts (2026-05-10)                            | 13        | ✅          |
| billing              | dashboard/billing.spec.ts (2026-05-10)                           | 13        | ✅          |
| **admin**            | ❌ nessuno (solo backend auditato)                               | 0         | ❌          |
| **voice**            | ❌ nessuno                                                       | 0         | ❌          |
| **workflows**        | ❌ nessuno                                                       | 0         | ❌          |
| **production-board** | ❌ nessuno                                                       | 0         | ❌          |
| **search**           | ❌ nessuno                                                       | 0         | ❌          |
| **calendar**         | ❌ nessuno                                                       | 0         | ❌          |
| **diagnostics**      | ❌ nessuno                                                       | 0         | ❌          |
| **payments**         | ❌ nessuno                                                       | 0         | ❌          |
| **payroll**          | ❌ nessuno                                                       | 0         | ❌          |
| **audit-logs**       | ❌ nessuno                                                       | 0         | ❌          |

**Presence rate: 21/31 = 67.7% | Target: 95% | Gap: 10 moduli**

### Frontend unit (hooks)

| Layer       | File                    | Spec                             | Coverage          |
| ----------- | ----------------------- | -------------------------------- | ----------------- |
| hooks/      | 32 custom hook          | 2 spec (useIsClient, useBilling) | parziale          |
| app/        | [jest/jsdom non config] | —                                | ❌ non misurabile |
| components/ | 271 .tsx                | E2E-first                        | CEILING_ACCEPTED  |

---

## ROADMAP (5 FASI — lancio obiettivo entro 4 mesi)

| Fase                      | Durata   | Stato          | Prossima azione                                                      | Responsabile               |
| ------------------------- | -------- | -------------- | -------------------------------------------------------------------- | -------------------------- |
| **0: Fondamenta**         | 2 sett   | ⏳ DA INIZIARE | Setup jest/jsdom, test 32 hook, E2E rentri+billing, fix public-token | test-runner + ts-fixer     |
| **1: Core completamento** | 3 sett   | ⏳ DA INIZIARE | E2E 8 moduli mancanti, RENTRI integration test, SDI end-to-end       | qa-lead + backend-engineer |
| **2: Beta privata**       | 3 sett   | ⏳ DA INIZIARE | 3-5 officine beta, DPA, NPS ≥7                                       | Giovanni (umano)           |
| **3: Go-To-Market**       | 3 sett   | ⏳ DA INIZIARE | Landing IT, pricing 3 tier, trial 14gg, legale                       | Giovanni + content-writer  |
| **4: Lancio**             | 1 sett   | ⏳ DA INIZIARE | Deploy prod, smoke 142 route, monitoring, supporto L1                | devops-engineer + Giovanni |
| **5: Post-lancio**        | continuo | ⏳             | App mobile, TecRMI, scaling                                          | tutti                      |

**Meccanismo revisione**: ogni 2 settimane → rileggere questo file +
COVERAGE-REAL.md + decisioni MRR → ricalibro priorità → append in decisions.md.

---

## AGENTI ATTIVI (22/22)

| Agente                | Model  | Ruolo                                   | Memory seed                                 |
| --------------------- | ------ | --------------------------------------- | ------------------------------------------- |
| nexo-architect        | opus   | Orchestratore, decisioni architetturali | .claude/agent-memory/nexo-architect/        |
| backend-engineer      | sonnet | NestJS, servizi, DTO                    | .claude/agent-memory/backend-engineer/      |
| frontend-engineer     | sonnet | Next.js, componenti, hook               | .claude/agent-memory/frontend-engineer/     |
| db-auditor            | haiku  | Audit query Prisma, N+1, tenantId       | .claude/agent-memory/db-auditor/            |
| migration-specialist  | sonnet | Schema Prisma, migration zero-downtime  | .claude/agent-memory/migration-specialist/  |
| ts-fixer              | sonnet | Errori TypeScript strict                | .claude/agent-memory/ts-fixer/              |
| qa-lead               | sonnet | Coverage orchestration, MODULI_NEXO.md  | .claude/agent-memory/qa-lead/               |
| test-runner           | sonnet | Spec backend (\*.spec.ts)               | .claude/agent-memory/test-runner/           |
| code-reviewer         | sonnet | Code review, audit-reports/             | .claude/agent-memory/code-reviewer/         |
| security-auditor      | opus   | OWASP Top10:2025, GDPR, PCI             | .claude/agent-memory/security-auditor/      |
| devops-engineer       | sonnet | CI/CD, Docker, Vercel                   | .claude/agent-memory/devops-engineer/       |
| incident-responder    | sonnet | Runbook P0/P1, post-mortem              | .claude/agent-memory/incident-responder/    |
| performance-optimizer | sonnet | LCP/INP/CLS, Lighthouse                 | .claude/agent-memory/performance-optimizer/ |
| compliance-officer    | opus   | GDPR, FatturaPA/SDI, RENTRI, EU AI Act  | .claude/agent-memory/compliance-officer/    |
| tech-writer           | haiku  | openapi.json, README moduli             | .claude/agent-memory/tech-writer/           |
| ux-auditor            | sonnet | WCAG 2.2 AA, dark mode, mobile          | .claude/agent-memory/ux-auditor/            |
| i18n-agent            | haiku  | frontend/locales/, IT/EN/DE             | .claude/agent-memory/i18n-agent/            |
| analytics-reporter    | haiku  | KPI digest (MCP: GA4, Stripe, Sentry)   | .claude/agent-memory/analytics-reporter/    |
| seo-geo-agent         | haiku  | Schema.org, sitemap, GEO 2026           | .claude/agent-memory/seo-geo-agent/         |
| content-writer        | haiku  | Blog, release notes, FAQ                | .claude/agent-memory/content-writer/        |
| support-l1-agent      | haiku  | Triage ticket (MCP: email/chat)         | .claude/agent-memory/support-l1-agent/      |
| product-thinker       | sonnet | PRD, user story, RICE/MoSCoW            | .claude/agent-memory/product-thinker/       |

---

## DECISIONI ARCHITETTURALI

| Data       | Decisione                                   | Motivazione                                                                                                 | Chi            |
| ---------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------- |
| 2026-05-10 | Multi-agent architecture v1 (22 agenti)     | Migrazione da 4 specialist a sistema gerarchico con file-ownership e cost-ceiling                           | Giovanni       |
| 2026-05-10 | SOC2 escluso dalla compliance target        | Non applicabile al mercato italiano; target: GDPR + FatturaPA/SDI + RENTRI                                  | nexo-architect |
| 2026-05-10 | Frontend E2E-first per components           | 271 .tsx — unit test MSW impraticabili; Playwright più efficace per UI                                      | nexo-architect |
| 2026-05-10 | Branch ceiling NestJS accettato             | @UseGuards/@Roles/@ApiOperation IIFE + class-validator metadata non strumentabili da c8                     | nexo-architect |
| 2026-05-03 | Divergenze coverage rilevate su scan reale  | Alcuni moduli mostavano valori diversi da quelli precedentemente tracciati (nuovi file aggiunti post-audit) | qa-lead        |
| 2026-04-22 | Dark mode esclusivo (no light/system)       | Design choice v10.2.0                                                                                       | Giovanni       |
| 2026-04-20 | Peppol BIS 3.0 per B2B EU (non SDI diretto) | Standard europeo più ampio di SDI; SDI B2C da verificare                                                    | Giovanni       |

---

## FILE CRITICI DA CONOSCERE

```
CLAUDE.md                                     # 36L, regole non negoziabili
MODULI_NEXO.md                                # Coverage log backend (fonte di verità)
frontend/e2e/COVERAGE-REAL.md                 # Coverage audit E2E (2026-05-10)
frontend/e2e/functional/NASA-QA-REPORT-FINAL.md  # QA Report GO conditional (2026-05-09)
.claude/teams/PROJECT-MEMORY.md               # Questo file
.claude/teams/decisions.md                    # Decision log architetturale
.claude/teams/tasks.jsonl                     # Task history agenti
.claude/teams/ownership-matrix.md             # Single-writer rules
docs/audit-reports/                           # Report dettagliati per modulo
docs/security/                                # [creare] Report OWASP/GDPR
```

---

## ISTRUZIONI PER LA PROSSIMA SESSIONE

1. **Leggi questo file** prima di qualsiasi altra cosa.
2. **Controlla sezione PROSSIMA AZIONE** qui sotto.
3. **Non ripetere analisi già fatte** — i dati sono in MODULI_NEXO.md e
   COVERAGE-REAL.md.
4. **Verifica i bug aperti** — non chiudere il task se ce ne sono di P0.
5. **Aggiorna questo file** a fine sessione: aggiungi riga in CRONOLOGIA,
   aggiorna BUG APERTI, aggiorna stato ROADMAP.

### PROSSIMA AZIONE IMMEDIATA

**Fase 0 — Fondamenta** (chi: test-runner + ts-fixer)

```
Step 1: cd frontend && npm install --save-dev jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom
Step 2: Creare jest.config.ts per frontend
Step 3: Scrivere spec per i 32 custom hook in frontend/hooks/ (coverage target ≥60%)
Step 4: Creare frontend/e2e/dashboard/rentri.spec.ts (scenario: caricamento, registrazione rifiuto, errore API)
Step 5: Creare frontend/e2e/dashboard/billing.spec.ts (scenario: caricamento, piano abbonamento, pagamento)
Step 6: Fix public-token: indagare se 65.85% branches è reale o artefatto ts-jest
Step 7: Aggiornare COVERAGE-REAL.md con nuovi dati
Step 8: Aggiornare questo file (cronologia + stato roadmap)
```

**Prompt suggerito per avviare Fase 0:**

```
Leggi .claude/teams/PROJECT-MEMORY.md e frontend/e2e/COVERAGE-REAL.md.
Sei test-runner. Esegui Fase 0 della roadmap:
1. Setup jest/jsdom per frontend (verifica se già configurato, altrimenti installa)
2. Scrivi spec per i 5 hook più critici in frontend/hooks/ (inizia da quelli usati in bookings e invoices)
3. Crea frontend/e2e/dashboard/rentri.spec.ts con 8 test scenario
4. Crea frontend/e2e/dashboard/billing.spec.ts con 6 test scenario
Worktree obbligatorio. Nessuna modifica al codice produzione.
```
