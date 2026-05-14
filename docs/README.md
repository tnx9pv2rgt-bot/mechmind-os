# Nexo Gestionale — Documentation Index

**Ultimo aggiornamento:** 2026-05-03
**Totale file docs:** 101 (pulizia eseguita 2026-05-03)

> I file di codice sorgente (controller, service, DTO, schema, test)
> sono nel repository e vengono letti da Claude Code on-demand.
> Per i numeri del codebase vedi [01-PROJECT-OVERVIEW.md](01-PROJECT-OVERVIEW.md).

---

## Compliance & Legal

| Documento | Data | Descrizione |
|-----------|------|-------------|
| [SLA.md](SLA.md) | 2026-05-03 | Service Level Agreement — Nexo Gestionale (attivo) |
| [DPA.md](DPA.md) | 2026-05-03 | Data Processing Agreement — versione firmata attiva |
| [compliance/DPA_TEMPLATE.md](compliance/DPA_TEMPLATE.md) | 2026-03-22 | Template DPA per rinnovi e nuovi clienti |
| [ASVS-5.0.0-assessment.md](ASVS-5.0.0-assessment.md) | 2026-05-03 | OWASP ASVS 5.0.0 self-assessment |
| [SOC2-plan.md](SOC2-plan.md) | 2026-05-03 | SOC 2 Type II — piano avvio (observation period luglio 2026) |
| [SOC2-trust-center.md](SOC2-trust-center.md) | 2026-05-03 | Trust Center pubblico Nexo Gestionale |
| [architecture/compliance.md](architecture/compliance.md) | 2026-03-22 | GDPR, CCPA, SOC 2 compliance architetturale |

---

## Architecture

| Documento | Righe | Descrizione |
|-----------|-------|-------------|
| [architecture/overview.md](architecture/overview.md) | 253 | Architettura sistema, numeri reali codebase, module map |
| [architecture/database.md](architecture/database.md) | 462 | Database design, RLS, 110 modelli Prisma |
| [architecture/security.md](architecture/security.md) | 656 | Security model, JWT, encryption, RBAC |
| [architecture/voice-flow.md](architecture/voice-flow.md) | 705 | Voice AI integration (Vapi) |
| [EXECUTIVE_ARCHITECTURE.md](EXECUTIVE_ARCHITECTURE.md) | 502 | Overview architetturale executive (C-level) |
| [TECHNICAL_SPECIFICATIONS.md](TECHNICAL_SPECIFICATIONS.md) | 992 | Specifiche tecniche dettagliate |
| [notifications-architecture.md](notifications-architecture.md) | 370 | Architettura notifiche (email, SMS, push) |

---

## API

| Documento | Righe | Descrizione |
|-----------|-------|-------------|
| [04-API-REFERENCE.md](04-API-REFERENCE.md) | 183 | Riferimento API — 519 endpoint |
| [API_FEATURES.md](API_FEATURES.md) | 753 | Feature API complete |
| [api/endpoints/authentication.md](api/endpoints/authentication.md) | 178 | Auth endpoints (JWT, MFA, passkey) |
| [api/endpoints/bookings.md](api/endpoints/bookings.md) | 345 | Booking endpoints |
| [api/endpoints/voice-webhooks.md](api/endpoints/voice-webhooks.md) | 335 | Voice webhook endpoints |
| [openapi.json](openapi.json) | — | OpenAPI 3.0 specification |

---

## Domain

| Documento | Righe | Descrizione |
|-----------|-------|-------------|
| [01-PROJECT-OVERVIEW.md](01-PROJECT-OVERVIEW.md) | 70 | Overview progetto, numeri codebase |
| [05-DOMAIN-GLOSSARY.md](05-DOMAIN-GLOSSARY.md) | 75 | Glossario dominio (43 termini) |
| [06-CODING-CONVENTIONS.md](06-CODING-CONVENTIONS.md) | 69 | Convenzioni di codice |
| [09-ERROR-CATALOG.md](09-ERROR-CATALOG.md) | 77 | Catalogo errori per modulo |
| [11-DEPENDENCY-MAP.md](11-DEPENDENCY-MAP.md) | 236 | Mappa dipendenze runtime (caller graph) |
| [PRD-MechMind-OS.md](PRD-MechMind-OS.md) | 1402 | Product Requirements Document |

---

## Operations

| Documento | Righe | Descrizione |
|-----------|-------|-------------|
| [ENGINEERING_OPERATIONS.md](ENGINEERING_OPERATIONS.md) | 581 | Pratiche engineering e operazioni |
| [OPERATIONS_AND_ROADMAP.md](OPERATIONS_AND_ROADMAP.md) | 230 | Roadmap operativa |
| [12-PR-WORKFLOW-EXAMPLE.md](12-PR-WORKFLOW-EXAMPLE.md) | 268 | Workflow PR esempio |
| [DEPLOYMENT_GUIDE_NOTIFICATIONS.md](DEPLOYMENT_GUIDE_NOTIFICATIONS.md) | 192 | Guida deploy notifiche |
| [backup.md](backup.md) | 63 | Strategia backup |
| [disaster-recovery-plan.md](disaster-recovery-plan.md) | 174 | Piano disaster recovery |
| [METABASE_SETUP.md](METABASE_SETUP.md) | 411 | Setup Metabase analytics dashboard |
| [incident-response.md](incident-response.md) | 129 | Incident response runbook Nexo-specific (2026-05-03) |

---

## Runbooks

| Documento | Righe | Descrizione |
|-----------|-------|-------------|
| [runbooks/incident-response.md](runbooks/incident-response.md) | 325 | Gestione incidenti P0/P1 (generico) |
| [runbooks/database-operations.md](runbooks/database-operations.md) | 462 | Backup, restore, manutenzione DB |
| [runbooks/deployment.md](runbooks/deployment.md) | 426 | Procedure di deploy |
| [runbooks/monitoring.md](runbooks/monitoring.md) | 365 | Alert e metriche |
| [runbooks/gdpr-requests.md](runbooks/gdpr-requests.md) | 405 | Gestione richieste GDPR |
| [runbooks/gdpr-incident-response.md](runbooks/gdpr-incident-response.md) | 525 | Risposta incidenti GDPR |
| [runbooks/dr-drill-schedule.md](runbooks/dr-drill-schedule.md) | 684 | Schedule drill DR |
| [runbooks/backend-down.md](runbooks/backend-down.md) | 112 | Runbook backend down |
| [runbooks/brute-force-detected.md](runbooks/brute-force-detected.md) | 102 | Runbook brute force |
| [runbooks/circuit-breaker-open.md](runbooks/circuit-breaker-open.md) | 97 | Runbook circuit breaker open |
| [runbooks/high-error-rate.md](runbooks/high-error-rate.md) | 104 | Runbook alto tasso errori |
| [runbooks/high-p95-latency.md](runbooks/high-p95-latency.md) | 95 | Runbook alta latenza p95 |
| [runbooks/post-mortem-template.md](runbooks/post-mortem-template.md) | 62 | Template post-mortem incidente |

---

## Developer Guide

| Documento | Righe | Descrizione |
|-----------|-------|-------------|
| [developers/setup.md](developers/setup.md) | 360 | Setup ambiente sviluppo locale |
| [developers/testing.md](developers/testing.md) | 667 | Strategie e pratiche di test |
| [developers/contributing.md](developers/contributing.md) | 363 | Linee guida contribuzione |

---

## EU Compliance (2026)

| Documento | Righe | Descrizione |
|-----------|-------|-------------|
| [eu/README.md](eu/README.md) | 279 | Overview compliance EU |
| [eu/compliance-roadmap.md](eu/compliance-roadmap.md) | 509 | Roadmap compliance EU |
| [eu/architecture-blueprint.md](eu/architecture-blueprint.md) | 591 | Blueprint architettura EU |
| [eu/database-schema-eu.md](eu/database-schema-eu.md) | 1404 | Schema DB compliance EU |
| [eu/integration-architecture.md](eu/integration-architecture.md) | 1496 | Architettura integrazioni EU |
| [eu/risk-assessment.md](eu/risk-assessment.md) | 795 | Valutazione rischi EU AI Act |
| [eu/tech-stack-eu.md](eu/tech-stack-eu.md) | 880 | Tech stack per compliance EU |

---

## Business

| Documento | Righe | Descrizione |
|-----------|-------|-------------|
| [business/pricing-model.md](business/pricing-model.md) | 270 | Modello pricing |
| [business/unit-economics.md](business/unit-economics.md) | 327 | Unit economics |
| [business/investor-metrics.md](business/investor-metrics.md) | 459 | Metriche per investitori |
| [business/churn-mitigation.md](business/churn-mitigation.md) | 449 | Strategia anti-churn |

---

## i18n

| Documento | Righe | Descrizione |
|-----------|-------|-------------|
| [i18n/formatting-guide.md](i18n/formatting-guide.md) | 92 | Guida formattazione i18n |
| [i18n/quality-checklist.md](i18n/quality-checklist.md) | 70 | Checklist qualità traduzioni |

---

## Audit Reports (Q1-Q2 2026)

Un report per modulo backend/frontend. Versione più recente per ciascun modulo.

| Modulo | File | Data |
|--------|------|------|
| admin | [audit-reports/admin-2026-05-02.md](audit-reports/admin-2026-05-02.md) | 2026-05-02 |
| ai-compliance | [audit-reports/ai-compliance-2026-05-02.md](audit-reports/ai-compliance-2026-05-02.md) | 2026-05-02 |
| ai-diagnostic | [audit-reports/ai-diagnostic-2026-05-02.md](audit-reports/ai-diagnostic-2026-05-02.md) | 2026-05-02 |
| ai-scheduling | [audit-reports/ai-scheduling-2026-05-02.md](audit-reports/ai-scheduling-2026-05-02.md) | 2026-05-02 |
| analytics | [audit-reports/analytics-2026-05-02.md](audit-reports/analytics-2026-05-02.md) | 2026-05-02 |
| audit-all | [audit-reports/audit-all-2026-05-02.md](audit-reports/audit-all-2026-05-02.md) | 2026-05-02 |
| auth | [audit-reports/auth-2026-04-29.md](audit-reports/auth-2026-04-29.md) | 2026-04-29 |
| benchmarking | [audit-reports/benchmarking-2026-05-02.md](audit-reports/benchmarking-2026-05-02.md) | 2026-05-02 |
| booking | [audit-reports/booking-2026-04-29.md](audit-reports/booking-2026-04-29.md) | 2026-04-29 |
| dvi | [audit-reports/dvi-2026-05-02.md](audit-reports/dvi-2026-05-02.md) | 2026-05-02 |
| fleet | [audit-reports/fleet-2026-05-01.md](audit-reports/fleet-2026-05-01.md) | 2026-05-01 |
| frontend-components | [audit-reports/frontend-components-2026-05-02.md](audit-reports/frontend-components-2026-05-02.md) | 2026-05-02 |
| frontend-hooks | [audit-reports/frontend-hooks-2026-05-02.md](audit-reports/frontend-hooks-2026-05-02.md) | 2026-05-02 |
| frontend-lib | [audit-reports/frontend-lib-2026-05-02.md](audit-reports/frontend-lib-2026-05-02.md) | 2026-05-02 |
| gdpr | [audit-reports/gdpr-2026-05-02.md](audit-reports/gdpr-2026-05-02.md) | 2026-05-02 |
| invoice | [audit-reports/invoice-2026-04-29.md](audit-reports/invoice-2026-04-29.md) | 2026-04-29 |
| kiosk | [audit-reports/kiosk-2026-05-02.md](audit-reports/kiosk-2026-05-02.md) | 2026-05-02 |
| labor-guide | [audit-reports/labor-guide-2026-05-01.md](audit-reports/labor-guide-2026-05-01.md) | 2026-05-01 |
| lib | [audit-reports/lib-2026-05-01.md](audit-reports/lib-2026-05-01.md) | 2026-05-01 |
| membership | [audit-reports/membership-2026-05-02.md](audit-reports/membership-2026-05-02.md) | 2026-05-02 |
| notifications | [audit-reports/notifications-2026-05-02.md](audit-reports/notifications-2026-05-02.md) | 2026-05-02 |
| parts | [audit-reports/parts-2026-05-02.md](audit-reports/parts-2026-05-02.md) | 2026-05-02 |
| payment-link | [audit-reports/payment-link-2026-04-29.md](audit-reports/payment-link-2026-04-29.md) | 2026-04-29 |
| portal | [audit-reports/portal-2026-05-02.md](audit-reports/portal-2026-05-02.md) | 2026-05-02 |
| production-board | [audit-reports/production-board-2026-05-02.md](audit-reports/production-board-2026-05-02.md) | 2026-05-02 |
| public-token | [audit-reports/public-token-2026-05-01.md](audit-reports/public-token-2026-05-01.md) | 2026-05-01 |
| reviews | [audit-reports/reviews-2026-05-02.md](audit-reports/reviews-2026-05-02.md) | 2026-05-02 |
| services | [audit-reports/services-2026-05-02.md](audit-reports/services-2026-05-02.md) | 2026-05-02 |
| sms | [audit-reports/sms-2026-05-02.md](audit-reports/sms-2026-05-02.md) | 2026-05-02 |
| sms (storico) | [audit-reports/sms-2026-04-29.md](audit-reports/sms-2026-04-29.md) | 2026-04-29 |
| sms (storico) | [audit-reports/sms-2026-04-30.md](audit-reports/sms-2026-04-30.md) | 2026-04-30 |
| subscription | [audit-reports/subscription-2026-04-30.md](audit-reports/subscription-2026-04-30.md) | 2026-04-30 |
| tire | [audit-reports/tire-2026-05-02.md](audit-reports/tire-2026-05-02.md) | 2026-05-02 |
| voice | [audit-reports/voice-2026-05-02.md](audit-reports/voice-2026-05-02.md) | 2026-05-02 |
| webhook-subscription | [audit-reports/webhook-subscription-2026-05-02.md](audit-reports/webhook-subscription-2026-05-02.md) | 2026-05-02 |
| webhooks | [audit-reports/webhooks-2026-05-02.md](audit-reports/webhooks-2026-05-02.md) | 2026-05-02 |
| work-order | [audit-reports/work-order-2026-05-02.md](audit-reports/work-order-2026-05-02.md) | 2026-05-02 |

---

## Altro

| Documento | Descrizione |
|-----------|-------------|
| [UX-AUDIT-VERIFICATION.md](UX-AUDIT-VERIFICATION.md) | Risultati verifica UX audit (snapshot 2026-04-04) |
