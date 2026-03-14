# Audit Funzionale Completo — 5 Pagine Critiche
**Data:** 2026-03-12 | **Tool:** Playwright + curl API | **Browser:** Chromium headless

---

## PAGINA 1 — /dashboard (17/17 Playwright ✅)

### Scorecard

| Test | Risultato | Severità |
|------|-----------|----------|
| Rendering | ✅ Nessun JS error | — |
| Dati reali (no skeleton) | ❌ **DATI HARDCODED** | 🟠 ALTA |
| Tenant isolation | ❌ **"Officina Rossi" hardcoded** | 🟠 ALTA |
| PII leggibili | ✅ N/A (no PII) | — |
| Mobile responsive | ⚠️ Overflow orizzontale 375px | 🟢 BASSA |
| API endpoint | ❌ **No /v1/dashboard** | 🟠 ALTA |
| API auth | ✅ Backend enforce 401 | — |
| Auth guard frontend | ❌ **Accessibile SENZA login** | 🔴 CRITICA |

### Bug: 4 (1🔴, 2🟠, 1🟢)
- 🔴 **D-1**: Dashboard accessibile senza autenticazione — `app/dashboard/layout.tsx` non verifica token
- 🟠 **D-2**: Dati 100% hardcoded (KPIs, prenotazioni, car count, alert) — `page.tsx:130-384`
- 🟠 **D-3**: Tenant name hardcoded "Officina Rossi" — `page.tsx:149`
- 🟢 **D-4**: Navbar con 11 item causa overflow su mobile — `dashboard-provider.tsx:87-100`

---

## PAGINA 2 — /bookings (20/20 Playwright ✅, 5/5 API ✅)

### Scorecard

| Test | Risultato | Severità |
|------|-----------|----------|
| Rendering | ✅ | — |
| Dati reali | ❌ **HARDCODED (mockBookings)** | 🟠 ALTA |
| Tenant isolation | ❌ **Stessi mock per ogni tenant** | 🟠 ALTA |
| Search/Filter | ✅ Funziona su mock | — |
| Booking detail | ✅ Pagina dettaglio completa | — |
| New booking form | ⚠️ Usa MOCK_CUSTOMERS/SLOTS | 🟡 MEDIA |
| API auth | ✅ 401 senza token | — |
| API validation | ✅ 400 con messaggi chiari | — |
| Auth guard frontend | ❌ **Accessibile SENZA login** | 🔴 CRITICA |

### Bug: 4 (1🔴, 2🟠, 1🟡)
- 🔴 **BK-1**: Bookings accessibili senza autenticazione (= D-1)
- 🟠 **BK-2**: Lista + stats 100% hardcoded — `bookings/page.tsx:48-54`
- 🟠 **BK-3**: Booking detail usa mock fissi — `[id]/page.tsx:32-73`
- 🟡 **BK-4**: New booking form usa MOCK_CUSTOMERS/MOCK_SLOTS, non API

---

## PAGINA 3 — /customers (16/16 Playwright ✅, 6/6 API ✅)

### Scorecard

| Test | Risultato | Severità |
|------|-----------|----------|
| Rendering | ✅ | — |
| Dati reali | ❌ **HARDCODED (mockCustomers)** | 🟠 ALTA |
| Search | ✅ Funziona per nome/email (su mock) | — |
| PII leggibili | ✅ In chiaro (ma mock, non EncryptionService) | — |
| GDPR Export | ❌ **Bottone assente** | 🟠 ALTA |
| GDPR Delete | ❌ **Bottone assente** | 🟠 ALTA |
| API auth | ✅ 401 senza token | — |
| API GDPR export | ✅ Endpoint funziona (201) | — |
| Auth guard frontend | ❌ **Accessibile SENZA login** | 🔴 CRITICA |

### Bug: 5 (1🔴, 3🟠, 1 nota)
- 🔴 **C-1**: Customers accessibili senza autenticazione (= D-1)
- 🟠 **C-2**: Lista clienti 100% hardcoded — `customers/page.tsx:48-54`
- 🟠 **C-3**: Nessun bottone "Esporta dati" GDPR nella UI
- 🟠 **C-4**: Nessun bottone "Elimina account" GDPR nella UI
- ℹ️ **C-5**: PII in chiaro nella UI sono mock, non decriptati da EncryptionService

---

## PAGINA 4 — /vehicles (13/13 Playwright ✅)

### Scorecard

| Test | Risultato | Severità |
|------|-----------|----------|
| Rendering | ✅ | — |
| Dati reali | ❌ **HARDCODED (mockVehicles)** | 🟠 ALTA |
| Search | ✅ Funziona per targa/marca/owner (su mock) | — |
| Plate/PII leggibili | ✅ Targhe in chiaro (mock) | — |
| DVI/Storico | ❌ **Non implementato** | 🟡 MEDIA |
| OBD streaming | ❌ **Non implementato in questa pagina** | 🟡 MEDIA |
| Auth guard frontend | ❌ **Accessibile SENZA login** | 🔴 CRITICA |

### Bug: 4 (1🔴, 1🟠, 2🟡)
- 🔴 **V-1**: Vehicles accessibili senza autenticazione (= D-1)
- 🟠 **V-2**: Lista veicoli 100% hardcoded — `vehicles/page.tsx:55-61`
- 🟡 **V-3**: Nessun storico DVI/manutenzioni nel dettaglio veicolo
- 🟡 **V-4**: Nessun dato OBD streaming nella pagina veicoli

---

## PAGINA 5 — /settings (14/14 Playwright ✅, 5/5 API ✅)

### Scorecard

| Test | Risultato | Severità |
|------|-----------|----------|
| Rendering | ✅ | — |
| Shop info form | ✅ Ma hardcoded defaultValue | — |
| Save funziona | ⚠️ Solo stato locale, no API | 🟠 ALTA |
| Team tab | ✅ Ma hardcoded | — |
| Notifiche tab | ✅ Ma hardcoded, no save | — |
| Billing tab | ✅ Redirect a billing page | — |
| Password change | ✅ Form presente | — |
| MFA toggle | ❌ **ASSENTE** | 🟠 ALTA |
| Passkey management | ❌ **ASSENTE** | 🟠 ALTA |
| Danger zone | ❌ **ASSENTE** | 🟠 ALTA |
| Auth guard frontend | ❌ **Accessibile SENZA login** | 🔴 CRITICA |

### Bug: 5 (1🔴, 4🟠)
- 🔴 **S-1**: Settings accessibili senza autenticazione (= D-1)
- 🟠 **S-2**: Save "Salva Modifiche" non chiama API — solo stato locale
- 🟠 **S-3**: Nessun toggle MFA nel tab Sicurezza (backend ha `/v1/auth/mfa/status`)
- 🟠 **S-4**: Nessuna gestione Passkey nel tab Sicurezza
- 🟠 **S-5**: Nessuna "Danger zone" per eliminazione account

---

# SCORECARD GLOBALE

## Totali

| Metrica | Valore |
|---------|--------|
| **Test Playwright eseguiti** | **80** |
| **Test Playwright passati** | **80 (100%)** |
| **Test API eseguiti** | **16** |
| **Test API passati** | **16 (100%)** |
| **Totale test** | **96** |
| **Bug trovati** | **22** |
| — 🔴 CRITICI | **5** (tutti lo stesso: NO AUTH GUARD) |
| — 🟠 ALTI | **12** |
| — 🟡 MEDI | **3** |
| — 🟢 BASSI | **1** |
| — ℹ️ Info | **1** |

## Pattern Ricorrente: il Problema Architetturale

**TUTTE e 5 le pagine** condividono gli stessi 2 problemi fondamentali:

### 1. 🔴 Nessun Auth Guard Frontend (CRITICA)
- `/dashboard/*` è accessibile senza login
- Il middleware (`middleware.ts`) non verifica token JWT per le pagine dashboard
- In dev, il tenant fallback è hardcoded `demo-tenant`
- **Impatto**: Chiunque può accedere alle pagine senza autenticazione
- **Fix**: Auth guard nel `DashboardProvider` o nel middleware che redirecta a `/auth`

### 2. 🟠 Tutte le pagine usano dati hardcoded (ALTA)
- Nessuna pagina fa API call al backend
- Tutte usano `mockBookings`, `mockCustomers`, `mockVehicles`, etc.
- Il backend ha endpoint funzionanti con auth + validation
- **Impatto**: L'app è una demo statica, non un gestionale funzionante
- **Fix**: Connettere le pagine agli endpoint backend esistenti

## Lista Fix Ordinata per Priorità

| # | Bug | Severità | File | Fix |
|---|-----|----------|------|-----|
| 1 | **NO AUTH GUARD** su tutte le pagine /dashboard/* | 🔴 CRITICA | `middleware.ts` o `dashboard-provider.tsx` | Check JWT, redirect a `/auth` se assente |
| 2 | Dashboard dati hardcoded | 🟠 ALTA | `dashboard/page.tsx` | Creare/usare API backend |
| 3 | Bookings dati hardcoded | 🟠 ALTA | `bookings/page.tsx` | Connettere a `GET /v1/bookings` |
| 4 | Customers dati hardcoded | 🟠 ALTA | `customers/page.tsx` | Connettere a `GET /v1/customers` |
| 5 | Vehicles dati hardcoded | 🟠 ALTA | `vehicles/page.tsx` | Connettere a `GET /v1/customers` (includes vehicles) |
| 6 | Settings save non chiama API | 🟠 ALTA | `settings/page.tsx` | Connettere a API tenant settings |
| 7 | GDPR: nessun export/delete button | 🟠 ALTA | `customers/page.tsx` | Aggiungere bottoni GDPR, connettere a `/v1/gdpr/customers/:id/export` |
| 8 | MFA toggle assente in settings | 🟠 ALTA | `settings/page.tsx` | Aggiungere sezione MFA, connettere a `/v1/auth/mfa/*` |
| 9 | Passkey management assente | 🟠 ALTA | `settings/page.tsx` | Aggiungere gestione passkey |
| 10 | Danger zone assente | 🟠 ALTA | `settings/page.tsx` | Aggiungere sezione eliminazione account |
| 11 | Tenant name hardcoded | 🟠 ALTA | `dashboard/page.tsx` | Fetch da API tenant |
| 12 | Booking form usa mock | 🟡 MEDIA | `booking-form-complete.tsx` | Connettere a API customers/slots |
| 13 | Storico DVI non implementato | 🟡 MEDIA | `vehicles/page.tsx` | Aggiungere link a DVI |
| 14 | OBD streaming non in vehicles | 🟡 MEDIA | `vehicles/page.tsx` | Integrare con pagina OBD |
| 15 | Overflow mobile navbar | 🟢 BASSA | `dashboard-provider.tsx` | Nascondere nav, hamburger menu |

**Nota**: I bug 🔴 (auth guard) sono tutti la stessa issue — un singolo fix nel middleware o nel DashboardProvider risolve tutti e 5.
