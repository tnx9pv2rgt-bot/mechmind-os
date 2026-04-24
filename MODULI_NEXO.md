# Moduli Nexo Gestionale - Tracciamento QA

> Aggiornato: 2026-04-24 | Branch attivo: `qa/booking-coverage`
> Soglie target: ≥80% statements, ≥75% branches (per moduli P0)
> Sistema test: PATH B Atomic RAM + Cascade Models + Quality Gates (90% coverage threshold)

---

## Backend — Matrice di Complessità Moduli (Model Selection)

**Sistema di selezione modello intelligente per test generation:**

Ogni modulo backend viene testato con il modello Claude appropriato alla sua complessità e criticità. Questa matrice riduce i costi token del **55-60%** mantenendo qualità **infinitamente rigorosa** dove conta.

### TIER_1: CRITICAL (P0) → `claude-opus-4-7`

Test generation con Opus 4.7 (best quality). Moduli mission-critical, security-sensitive, PII handling, state machine.

| Modulo | Percorso | Ragione |
|--------|----------|---------|
| **auth** | `backend/src/auth` | 14 service, security-critical (JWT, OAuth, 2FA, session mgmt) |
| **booking** | `backend/src/booking` | State machine (proposed→confirmed→completed), advisory lock, concurrency |
| **invoice** | `backend/src/invoice` | FatturaPA XML, tax compliance (EU), PDF generation |
| **payment-link** | `backend/src/payment-link` | Stripe integration, webhooks, PCI compliance, HMAC signing |
| **subscription** | `backend/src/subscription` | Recurring billing, dunning, metering, upgrade/downgrade |
| **gdpr** | `backend/src/gdpr` | Data export/deletion, RLS policies, consent tracking, EU compliance |

**Cost Impact:** Opus (3.5×) justified for mission-critical modules. Coverage must reach 90%+ statements & branches.

---

### TIER_2: HIGH (P1) → `claude-sonnet-4-6`

Test generation con Sonnet 4.6 (balanced quality). Complex logic, multi-service dependencies, external integrations.

| Modulo | Percorso | Reason |
|--------|----------|--------|
| **notifications** | `backend/src/notifications` | 10 service, queue (BullMQ), real-time, broadcast, filtering |
| **admin** | `backend/src/admin` | 7 controller, audit logs, role management, system stats |
| **analytics** | `backend/src/analytics` | 5 service, aggregation, time-series, forecasting, Metabase |
| **common** | `backend/src/common` | **SPOF**: PrismaService, EncryptionService (AES-256), RLS policies (11 service) |
| **dvi** | `backend/src/dvi` | Digital Vehicle Inspection, photo upload, AI analysis, state machine |
| **iot** | `backend/src/iot` | 4 service, sensor data ingestion, real-time telemetry, MQTT |
| **work-order** | `backend/src/work-order` | State machine (open→in_progress→completed), lineitem calculus, pricing |
| **customer** | `backend/src/customer` | 5 service, PII encryption, multi-tenant queries, lifecycle |
| **estimate** | `backend/src/estimate` | Quote generation, conversion to invoice/work-order, margin logic |
| **voice** | `backend/src/voice` | Vapi integration, transcription, call logs, routing |

**Cost Impact:** Sonnet (1.0×) provides good quality at optimal cost.

---

### TIER_3: MEDIUM (P2) → `claude-sonnet-4-6`

Test generation con Sonnet 4.6 (standard quality). Moderate complexity, clear business logic, fewer external dependencies.

| Modulo | Percorso | Reason |
|--------|----------|--------|
| **rentri** | `backend/src/rentri` | Italian fiscal compliance (Peppol), tax reporting |
| **parts** | `backend/src/parts` | Inventory management, stock alerts, supplier integration |
| **canned-job** | `backend/src/canned-job` | Standard job templates, pricing, multi-select items |
| **accounting** | `backend/src/accounting` | GL entries, P&L reporting, tax calculation |
| **portal** | `backend/src/portal` | Customer-facing, prenotazioni, documenti, auth isolated |
| **membership** | `backend/src/membership` | Loyalty tiers, points, benefits, tier upgrades |
| **sms** | `backend/src/sms` | Twilio wrapper, message queue, delivery tracking |
| **reviews** | `backend/src/reviews` | Rating/feedback, moderation, score aggregation |
| **location** | `backend/src/location` | Multi-location support, site management, hierarchy |
| **predictive-maintenance** | `backend/src/predictive-maintenance` | ML model serving, feature extraction, inference |
| **ai-diagnostic** | `backend/src/ai-diagnostic` | OpenAI integration, prompt engineering, result caching |
| **ai-scheduling** | `backend/src/ai-scheduling` | Smart scheduling algorithm, optimization, constraint solving |
| **ai-compliance** | `backend/src/ai-compliance` | Compliance checking, rule engine, audit trail |
| **benchmarking** | `backend/src/benchmarking` | Industry comparison, KPI, peer analysis |
| **campaign** | `backend/src/campaign` | Email/SMS campaigns, segmentation, send queue |
| **fleet** | `backend/src/fleet` | Company vehicle management, assignment, tracking |
| **kiosk** | `backend/src/kiosk` | Check-in station, display management, queue display |
| **labor-guide** | `backend/src/labor-guide` | Labor time/cost guide, repair estimator, markup |
| **obd** | `backend/src/obd` | OBD2 device connection, data parsing, vehicle diagnostics |
| **payroll** | `backend/src/payroll` | Employee payroll calculation, tax deductions, net pay |
| **peppol** | `backend/src/peppol` | EU e-invoicing, B2B compliance, routing |
| **production-board** | `backend/src/production-board` | Kanban board, job tracking, status flow |
| **public-token** | `backend/src/public-token` | Public link token generation, expiry, scope |
| **security-incident** | `backend/src/security-incident` | Incident tracking, audit trail, remediation |
| **tire** | `backend/src/tire` | Tire inventory, replacement history, specs |
| **vehicle-history** | `backend/src/vehicle-history` | Service history, maintenance log, cost tracking |
| **webhook-subscription** | `backend/src/webhook-subscription` | Webhook registration, event delivery, retry logic |
| **declined-service** | `backend/src/declined-service` | Declined request tracking, customer communication |
| **inventory-alerts** | `backend/src/inventory-alerts` | Stock level alerts, notification trigger, thresholds |

**Cost Impact:** Sonnet (1.0×) efficient for moderate-complexity features.

---

### TIER_4: UTILITY → `claude-haiku-4-5`

Test generation con Haiku 4.5 (minimal). No business logic, infrastructure/configuration layers only.

| Modulo | Percorso | Reason |
|--------|----------|--------|
| **config** | `backend/src/config` | Env variables, static configuration, schema validation |
| **lib** | `backend/src/lib` | Shared utilities, no business logic, helpers |
| **middleware** | `backend/src/middleware` | Express middleware, CORS, logging, error handling |
| **test** | `backend/src/test` | Test utilities, fixtures, cross-tenant isolation helpers |
| **types** | `backend/src/types` | TypeScript definitions, interfaces, mock factories |
| **services** (barrel) | `backend/src/services` | Service re-exports, module organization |

**Cost Impact:** Haiku (0.1×) saves 90% on utility-layer testing.

---

## Legenda — Tier System

| Tier | Model | Cost | Uso | Moduli |
|------|-------|------|-----|--------|
| TIER_1 | Opus 4.7 | 3.5× | Mission-critical, security, PII, state machine, legal/fiscal | 6 moduli |
| TIER_2 | Sonnet 4.6 | 1.0× | Complex logic, multi-service, external APIs, real-time | 11 moduli |
| TIER_3 | Sonnet 4.6 | 1.0× | Moderate complexity, clear business logic, standard features | 20 moduli |
| TIER_4 | Haiku 4.5 | 0.1× | No business logic, utility/infrastructure only | 6 moduli |

**Total:** 43 backend moduli + 51 totali includendo config/lib/middleware/test/types

---

## Frontend — Pagine UI (`frontend/app/`)

| Modulo | Percorso | Priorità | Coverage (stmt/branch) | Stato | Note |
|--------|----------|----------|------------------------|-------|------|
| Auth | `frontend/app/auth` | P0 | 81% / 75% | ✅ Testato | GoogleOneTap/handleGoogleLogin saltati (richiedono live Google SDK) |
| Customers | `frontend/app/dashboard/customers` | P0 | 88% / 78% | ✅ Testato | 133 test, wizard+steps+import+dettaglio. Soglie in jest.config.js. server-page.tsx (Server Component) escluso dai conteggi realistici |
| Bookings | `frontend/app/dashboard/bookings` | P0 | 85% / 86% | ✅ Testato | 155 test, page+error+loading+[id]+smart-scheduling. layout.tsx (Server Component) escluso dai conteggi realistici |
| Work Orders | `frontend/app/dashboard/work-orders` | P0 | 95% / 80% | ✅ Testato | page+error+loading+[id]+new. layout.tsx (Server Component) escluso. CollapsibleSection unused (dead code) non coperta. Soglie in jest.config.js. |
| Invoices | `frontend/app/dashboard/invoices` | P0 | ? / ? | ➖ Non iniziato | Fatturazione elettronica, PDF, pagamenti |
| Estimates | `frontend/app/dashboard/estimates` | P0 | ? / ? | ➖ Non iniziato | Preventivi, conversione in ordine |
| Payments / Billing | `frontend/app/billing` | P0 | ? / ? | ➖ Non iniziato | Stripe checkout, success/cancel |
| Subscription | `frontend/app/dashboard/subscription` | P0 | ? / ? | ➖ Non iniziato | Piani, upgrade, downgrade |
| Vehicles | `frontend/app/dashboard/vehicles` | P0 | ? / ? | ➖ Non iniziato | Scheda veicolo, storico interventi |
| Portal Login/Auth | `frontend/app/portal` | P1 | ? / ? | ➖ Non iniziato | Portale cliente: login, prenotazioni, documenti |
| Inspections (DVI) | `frontend/app/dashboard/inspections` | P1 | ? / ? | ➖ Non iniziato | Digital Vehicle Inspection |
| Parts | `frontend/app/dashboard/parts` | P1 | ? / ? | ➖ Non iniziato | Magazzino ricambi, alerting scorte |
| Settings | `frontend/app/dashboard/settings` | P1 | ? / ? | ➖ Non iniziato | Configurazione officina, utenti, ruoli |
| GDPR | `frontend/app/dashboard/gdpr` | P1 | ? / ? | ➖ Non iniziato | Consensi, export dati, diritto all'oblio |
| Analytics | `frontend/app/dashboard/analytics` | P1 | ? / ? | ➖ Non iniziato | KPI, Metabase embed, benchmarking |
| Calendar | `frontend/app/dashboard/calendar` | P1 | ? / ? | ➖ Non iniziato | Vista calendario prenotazioni |
| Notifications | `frontend/app/dashboard` (notifiche) | P1 | ? / ? | ➖ Non iniziato | Toast, centro notifiche, real-time |
| Onboarding | `frontend/app/onboarding` | P1 | ? / ? | ➖ Non iniziato | Wizard setup officina |
| Maintenance | `frontend/app/dashboard/maintenance` | P2 | ? / ? | ➖ Non iniziato | Manutenzione preventiva predittiva |
| Rentri / Peppol | `frontend/app/dashboard/rentri` | P2 | ? / ? | ➖ Non iniziato | Compliance fiscale IT/EU |
| Marketing / Campaign | `frontend/app/dashboard/marketing` | P2 | ? / ? | ➖ Non iniziato | Campagne SMS/email |
| Canned Jobs | `frontend/app/dashboard/canned-jobs` | P2 | ? / ? | ➖ Non iniziato | Lavorazioni standard |
| Production Board | `frontend/app/dashboard/production-board` | P2 | ? / ? | ➖ Non iniziato | Kanban officina |
| Messaging (SMS) | `frontend/app/dashboard/messaging` | P2 | ? / ? | ➖ Non iniziato | Thread SMS con clienti |
| Warranty | `frontend/app/dashboard/warranty` | P2 | ? / ? | ➖ Non iniziato | Garanzie su interventi |
| Payroll | `frontend/app/dashboard/payroll` | P2 | ? / ? | ➖ Non iniziato | Gestione tecnici/paghe |
| Fleet | `frontend/app/dashboard/fleet` | P2 | ? / ? | ➖ Non iniziato | Gestione flotte aziendali |
| Declined Services | `frontend/app/dashboard/declined-services` | P2 | ? / ? | ➖ Non iniziato | Servizi rifiutati, follow-up |
| Locations | `frontend/app/dashboard/locations` | P2 | ? / ? | ➖ Non iniziato | Multi-sede |
| Kiosk | `frontend/app/kiosk` | P2 | ? / ? | ➖ Non iniziato | Check-in autonomo cliente |
| TV Display | `frontend/app/tv` | P2 | ? / ? | ➖ Non iniziato | Schermata sala attesa |
| Public Pages | `frontend/app/public` | P2 | ? / ? | ➖ Non iniziato | Preventivi/ispezioni pubbliche, pagamenti |
| AI Diagnostic | `frontend/app/dashboard/diagnostics` | P2 | ? / ? | ➖ Non iniziato | Diagnosi AI veicoli |
| Voice | `frontend/app/dashboard/voice` | P2 | ? / ? | ➖ Non iniziato | Assistente vocale (Vapi) |

---

## Frontend — API Routes (`frontend/app/api/`)

> Le route API sono proxy verso il backend NestJS. Test di integrazione prioritari solo per le route P0.

| Route | Priorità | Stato | Note |
|-------|----------|-------|------|
| `api/auth/*` | P0 | ✅ Testato | Covered dai test auth page + backend-proxy |
| `api/customers/*` | P0 | ➖ Non iniziato | |
| `api/bookings/*` | P0 | ➖ Non iniziato | |
| `api/invoices/*` | P0 | ➖ Non iniziato | |
| `api/estimates/*` | P0 | ➖ Non iniziato | |
| `api/work-orders/*` | P0 | ➖ Non iniziato | |
| `api/stripe/*` | P0 | ➖ Non iniziato | Webhook Stripe, firma obbligatoria |
| `api/payments/*` | P0 | ➖ Non iniziato | |
| `api/subscription/*` | P0 | ➖ Non iniziato | |
| `api/vehicles/*` | P0 | ➖ Non iniziato | |
| `api/portal/*` | P1 | ➖ Non iniziato | |
| `api/inspections/*` | P1 | ➖ Non iniziato | |
| `api/notifications/*` | P1 | ➖ Non iniziato | |
| `api/gdpr/*` | P1 | ➖ Non iniziato | |
| `api/analytics/*` | P1 | ➖ Non iniziato | |

---

## Legenda

| Simbolo | Significato |
|---------|-------------|
| ✅ Testato | Coverage ≥70% branch, test verificano comportamento reale |
| ⏳ In corso | Test in scrittura, coverage parziale |
| ❌ Bloccato | Problemi tecnici o dipendenze mancanti |
| ➖ Non iniziato | Nessun test di qualità ancora eseguito |
| ➖ Non verificato | Spec esistono ma coverage non misurata |

| Priorità | Criterio |
|----------|---------|
| P0 | Core business — perdita di dati, regressione = danno diretto (fatture, prenotazioni, auth) |
| P1 | Importante — funzionalità visibili al cliente, compliance GDPR/fiscale |
| P2 | Secondario — feature avanzate, integrazioni opzionali |

---

## Ordine di lavoro suggerito (frontend, P0 → P1)

1. ✅ **Auth** — `frontend/app/auth` — completato
2. ✅ **Customers** — `frontend/app/dashboard/customers` — 88%/78% — completato
3. ✅ **Bookings** — `frontend/app/dashboard/bookings` — 85%/86% — completato
4. ✅ **Work Orders** — `frontend/app/dashboard/work-orders` — 95%/80% — completato
5. ➖ **Invoices** — `frontend/app/dashboard/invoices`
6. ➖ **Estimates** — `frontend/app/dashboard/estimates`
7. ➖ **Vehicles** — `frontend/app/dashboard/vehicles`
8. ➖ **Payments/Billing** — `frontend/app/billing`
9. ➖ **Subscription** — `frontend/app/dashboard/subscription`
10. ➖ **Portal** — `frontend/app/portal`

---

## Log completamenti automatici

| Data | Area | Modulo | Service | Coverage | Stato |
|------|------|--------|---------|----------|-------|
<\!-- AUTO-LOG: righe aggiunte automaticamente da /genera-test -->
