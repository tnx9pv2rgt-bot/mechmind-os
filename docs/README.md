# MechMind OS — Documentation Index

**Ultimo aggiornamento:** 2026-04-04
**Totale file docs:** 55

> **Nota:** Questo indice copre solo la documentazione markdown.
> I file di codice sorgente (controller, service, DTO, schema, test)
> sono nel repository e vengono letti da Claude Code on-demand.
> Per i numeri del codebase vedi [01-PROJECT-OVERVIEW.md](01-PROJECT-OVERVIEW.md).

## Architecture

| Documento | Righe | Descrizione |
|-----------|-------|-------------|
| [architecture/overview.md](architecture/overview.md) | 230 | Architettura sistema, numeri reali codebase, module map |
| [architecture/database.md](architecture/database.md) | 462 | Database design, RLS, 110 modelli Prisma |
| [architecture/security.md](architecture/security.md) | 656 | Security model, JWT, encryption, RBAC |
| [architecture/voice-flow.md](architecture/voice-flow.md) | 705 | Voice AI integration (Vapi) |
| [architecture/compliance.md](architecture/compliance.md) | 633 | GDPR, CCPA, SOC 2 compliance |
| [EXECUTIVE_ARCHITECTURE.md](EXECUTIVE_ARCHITECTURE.md) | 502 | Overview architetturale executive |
| [TECHNICAL_SPECIFICATIONS.md](TECHNICAL_SPECIFICATIONS.md) | 992 | Specifiche tecniche dettagliate |
| [notifications-architecture.md](notifications-architecture.md) | 370 | Architettura notifiche (email, SMS, push) |

## API

| Documento | Righe | Descrizione |
|-----------|-------|-------------|
| [04-API-REFERENCE.md](04-API-REFERENCE.md) | 183 | Riferimento API (519 endpoint) |
| [API_FEATURES.md](API_FEATURES.md) | 753 | Feature API complete |
| [api/endpoints/authentication.md](api/endpoints/authentication.md) | 178 | Auth endpoints (JWT, MFA, passkey) |
| [api/endpoints/bookings.md](api/endpoints/bookings.md) | 345 | Booking endpoints |
| [api/endpoints/voice-webhooks.md](api/endpoints/voice-webhooks.md) | 335 | Voice webhook endpoints |

## Domain

| Documento | Righe | Descrizione |
|-----------|-------|-------------|
| [05-DOMAIN-GLOSSARY.md](05-DOMAIN-GLOSSARY.md) | 75 | Glossario dominio (43 termini) |
| [09-ERROR-CATALOG.md](09-ERROR-CATALOG.md) | 77 | Catalogo errori |
| [PRD-MechMind-OS.md](PRD-MechMind-OS.md) | 1402 | Product Requirements Document |

## Operations

| Documento | Righe | Descrizione |
|-----------|-------|-------------|
| [ENGINEERING_OPERATIONS.md](ENGINEERING_OPERATIONS.md) | 581 | Operazioni engineering |
| [OPERATIONS_AND_ROADMAP.md](OPERATIONS_AND_ROADMAP.md) | 230 | Roadmap e operazioni |
| [11-DEPENDENCY-MAP.md](11-DEPENDENCY-MAP.md) | 236 | Mappa dipendenze |
| [12-PR-WORKFLOW-EXAMPLE.md](12-PR-WORKFLOW-EXAMPLE.md) | 268 | Workflow PR example |
| [DEPLOYMENT_GUIDE_NOTIFICATIONS.md](DEPLOYMENT_GUIDE_NOTIFICATIONS.md) | 192 | Guida deploy notifiche |
| [backup.md](backup.md) | 63 | Strategia backup |
| [disaster-recovery-plan.md](disaster-recovery-plan.md) | 174 | Piano disaster recovery |
| [METABASE_SETUP.md](METABASE_SETUP.md) | 411 | Setup Metabase analytics |

## Runbooks

| Documento | Righe | Descrizione |
|-----------|-------|-------------|
| [runbooks/incident-response.md](runbooks/incident-response.md) | 325 | Gestione incidenti P0/P1 |
| [runbooks/database-operations.md](runbooks/database-operations.md) | 462 | Backup, restore, manutenzione DB |
| [runbooks/deployment.md](runbooks/deployment.md) | 426 | Procedure di deploy |
| [runbooks/monitoring.md](runbooks/monitoring.md) | 365 | Alert e metriche |
| [runbooks/gdpr-requests.md](runbooks/gdpr-requests.md) | 405 | Gestione richieste GDPR |
| [runbooks/gdpr-incident-response.md](runbooks/gdpr-incident-response.md) | 525 | Risposta incidenti GDPR |
| [runbooks/dr-drill-schedule.md](runbooks/dr-drill-schedule.md) | 684 | Schedule drill DR |
| [runbooks/backend-down.md](runbooks/backend-down.md) | 112 | Runbook backend down |
| [runbooks/brute-force-detected.md](runbooks/brute-force-detected.md) | 102 | Runbook brute force |
| [runbooks/circuit-breaker-open.md](runbooks/circuit-breaker-open.md) | 97 | Runbook circuit breaker |
| [runbooks/high-error-rate.md](runbooks/high-error-rate.md) | 104 | Runbook alto tasso errori |
| [runbooks/high-p95-latency.md](runbooks/high-p95-latency.md) | 95 | Runbook alta latenza p95 |
| [runbooks/post-mortem-template.md](runbooks/post-mortem-template.md) | 62 | Template post-mortem |

## Developer Guide

| Documento | Righe | Descrizione |
|-----------|-------|-------------|
| [developers/setup.md](developers/setup.md) | 360 | Setup ambiente sviluppo locale |
| [developers/testing.md](developers/testing.md) | 667 | Strategie e pratiche di test |
| [developers/contributing.md](developers/contributing.md) | 363 | Linee guida contribuzione |

## EU Compliance (2026)

| Documento | Righe | Descrizione |
|-----------|-------|-------------|
| [eu/README.md](eu/README.md) | 279 | Overview compliance EU |
| [eu/compliance-roadmap.md](eu/compliance-roadmap.md) | 509 | Roadmap compliance |
| [eu/architecture-blueprint.md](eu/architecture-blueprint.md) | 591 | Blueprint architettura EU |
| [eu/database-schema-eu.md](eu/database-schema-eu.md) | 1404 | Schema DB compliance EU |
| [eu/integration-architecture.md](eu/integration-architecture.md) | 1496 | Architettura integrazioni EU |
| [eu/risk-assessment.md](eu/risk-assessment.md) | 795 | Valutazione rischi EU |
| [eu/tech-stack-eu.md](eu/tech-stack-eu.md) | 880 | Tech stack per compliance EU |

## Business

| Documento | Righe | Descrizione |
|-----------|-------|-------------|
| [business/pricing-model.md](business/pricing-model.md) | 270 | Modello pricing |
| [business/unit-economics.md](business/unit-economics.md) | 327 | Unit economics |
| [business/investor-metrics.md](business/investor-metrics.md) | 459 | Metriche per investitori |
| [business/churn-mitigation.md](business/churn-mitigation.md) | 449 | Strategia anti-churn |

## i18n

| Documento | Righe | Descrizione |
|-----------|-------|-------------|
| [i18n/formatting-guide.md](i18n/formatting-guide.md) | 92 | Guida formattazione i18n |
| [i18n/quality-checklist.md](i18n/quality-checklist.md) | 70 | Checklist qualita' traduzioni |

## Compliance (DPA)

| Documento | Righe | Descrizione |
|-----------|-------|-------------|
| [compliance/DPA_TEMPLATE.md](compliance/DPA_TEMPLATE.md) | 351 | Template Data Processing Agreement |

## API Spec

| File | Descrizione |
|------|-------------|
| [openapi.json](openapi.json) | OpenAPI 3.0 specification |
