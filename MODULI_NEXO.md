# Moduli Nexo Gestionale - Tracciamento QA

> Aggiornato: 2026-04-23 | Branch attivo: `qa/booking-coverage`
> Soglie target: ≥80% statements, ≥75% branches (per moduli P0)

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

## Backend — Moduli NestJS (`backend/src/`)

> Il backend ha spec.ts per ~98% dei moduli. Questa sezione traccia la qualità dei test esistenti.

| Modulo | Percorso | Priorità | Coverage | Stato | Note |
|--------|----------|----------|----------|-------|------|
| auth | `backend/src/auth` | P0 | ? / ? | ➖ Non verificato | 14 spec files |
| customer | `backend/src/customer` | P0 | ? / ? | ➖ Non verificato | 6 spec files |
| booking | `backend/src/booking` | P0 | ? / ? | ➖ Non verificato | 4 spec files |
| invoice | `backend/src/invoice` | P0 | ? / ? | ➖ Non verificato | 7 spec files incl. fatturapa |
| estimate | `backend/src/estimate` | P0 | ? / ? | ➖ Non verificato | 4 spec files |
| subscription | `backend/src/subscription` | P0 | ? / ? | ➖ Non verificato | 7 spec files |
| payment-link | `backend/src/payment-link` | P0 | ? / ? | ➖ Non verificato | 3 spec files |
| work-order | `backend/src/work-order` | P0 | ? / ? | ➖ Non verificato | 3 spec files |
| common | `backend/src/common` | P0 | ? / ? | ➖ Non verificato | 19 spec files — SPOF EncryptionService/PrismaService |
| gdpr | `backend/src/gdpr` | P1 | ? / ? | ➖ Non verificato | 9 spec files |
| notifications | `backend/src/notifications` | P1 | ? / ? | ➖ Non verificato | 13 spec files |
| admin | `backend/src/admin` | P1 | ? / ? | ➖ Non verificato | 12 spec files |
| analytics | `backend/src/analytics` | P1 | ? / ? | ➖ Non verificato | 8 spec files |
| dvi | `backend/src/dvi` | P1 | ? / ? | ➖ Non verificato | 4 spec files |
| parts | `backend/src/parts` | P1 | ? / ? | ➖ Non verificato | 2 spec files |
| portal | `backend/src/portal` | P1 | ? / ? | ➖ Non verificato | 2 spec files |
| accounting | `backend/src/accounting` | P1 | ? / ? | ➖ Non verificato | 3 spec files |
| canned-job | `backend/src/canned-job` | P2 | ? / ? | ➖ Non verificato | 4 spec files |
| campaign | `backend/src/campaign` | P2 | ? / ? | ➖ Non verificato | 2 spec files |
| benchmarking | `backend/src/benchmarking` | P2 | ? / ? | ➖ Non verificato | 2 spec files |
| rentri | `backend/src/rentri` | P2 | ? / ? | ➖ Non verificato | 4 spec files |
| iot | `backend/src/iot` | P2 | ? / ? | ➖ Non verificato | 9 spec files |
| voice | `backend/src/voice` | P2 | ? / ? | ➖ Non verificato | 5 spec files |
| ai-diagnostic | `backend/src/ai-diagnostic` | P2 | ? / ? | ➖ Non verificato | 2 spec files |
| ai-scheduling | `backend/src/ai-scheduling` | P2 | ? / ? | ➖ Non verificato | 2 spec files |
| ai-compliance | `backend/src/ai-compliance` | P2 | ? / ? | ➖ Non verificato | 2 spec files |
| predictive-maintenance | `backend/src/predictive-maintenance` | P2 | ? / ? | ➖ Non verificato | 2 spec files |
| fleet | `backend/src/fleet` | P2 | ? / ? | ➖ Non verificato | 2 spec files |
| payroll | `backend/src/payroll` | P2 | ? / ? | ➖ Non verificato | 2 spec files |
| webhooks | `backend/src/webhooks` | P1 | ? / ? | ❌ Bloccato | **Unico modulo senza spec files** |
| membership | `backend/src/membership` | P2 | ? / ? | ➖ Non verificato | 2 spec files |
| sms | `backend/src/sms` | P2 | ? / ? | ➖ Non verificato | 2 spec files |
| reviews | `backend/src/reviews` | P2 | ? / ? | ➖ Non verificato | 2 spec files |
| declined-service | `backend/src/declined-service` | P2 | ? / ? | ➖ Non verificato | 2 spec files |
| labor-guide | `backend/src/labor-guide` | P2 | ? / ? | ➖ Non verificato | 2 spec files |
| kiosk | `backend/src/kiosk` | P2 | ? / ? | ➖ Non verificato | 2 spec files |
| production-board | `backend/src/production-board` | P2 | ? / ? | ➖ Non verificato | 2 spec files |
| tire | `backend/src/tire` | P2 | ? / ? | ➖ Non verificato | 2 spec files |
| vehicle-history | `backend/src/vehicle-history` | P2 | ? / ? | ➖ Non verificato | 2 spec files |
| location | `backend/src/location` | P2 | ? / ? | ➖ Non verificato | 2 spec files |
| peppol | `backend/src/peppol` | P2 | ? / ? | ➖ Non verificato | 1 spec file |
| security-incident | `backend/src/security-incident` | P2 | ? / ? | ➖ Non verificato | 2 spec files |

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
<!-- AUTO-LOG: righe aggiunte automaticamente da /genera-test -->
