# Fix Frontend — Progress Report
**Data:** 2026-03-12

---

## Architettura Scelta

**Decisione critica**: Il backend è REST puro (NestJS). Non esiste un server tRPC. Il tRPC client/provider nel frontend è scaffolding morto.

**Approccio**: REST API client + React Query hooks + Next.js API proxy routes
- Browser → `/api/*` (Next.js route handler, legge HttpOnly cookie) → NestJS `/v1/*`
- Nessun tRPC usato, nessun file tRPC modificato (zero breakage)

---

## Block 1: REST API Client + Auth Proxy ✅

### File creati:
- `lib/api-client.ts` — REST fetch wrapper con `credentials: 'include'`
- `lib/auth/api-proxy.ts` — Helper per route handler (legge HttpOnly cookie, forwarda a NestJS)
- `app/api/auth/me/route.ts` — GET /api/auth/me (verifica sessione)
- `app/api/auth/logout/route.ts` — POST /api/auth/logout (clear cookies)
- `app/api/dashboard/route.ts` — Proxy a /v1/analytics/dashboard
- `app/api/bookings/route.ts` — Proxy a /v1/bookings (GET + POST)
- `app/api/bookings/[id]/route.ts` — Proxy a /v1/bookings/:id (GET + PATCH + DELETE)
- `app/api/customers/route.ts` — Proxy a /v1/customers (GET + POST)
- `app/api/customers/[id]/route.ts` — Proxy a /v1/customers/:id (GET + PATCH)
- `app/api/vehicles/route.ts` — Proxy a /v1/vehicles (GET + POST)
- `app/api/settings/route.ts` — Proxy a /v1/tenant/settings (GET + PUT)
- `app/api/gdpr/customers/[id]/export/route.ts` — GDPR export
- `app/api/gdpr/customers/[id]/delete/route.ts` — GDPR delete
- `app/api/auth/mfa/status/route.ts` — MFA status
- `app/api/auth/password/change/route.ts` — Cambio password

### Bug risolti:
- ✅ HttpOnly cookie conflict — Browser non può leggere auth_token con js-cookie/document.cookie.
  Fix: Le API route leggono il cookie server-side con `cookies()` e lo inviano come Bearer header.

---

## Block 2: Auth Guard + Providers ✅

### File creati:
- `components/auth/AuthGuard.tsx` — Redirect a /auth se non autenticato
- `components/dashboard/DashboardProviders.tsx` — QueryClientProvider + AuthProvider + AuthGuard

### File modificati:
- `app/dashboard/layout.tsx` — Wrappa con DashboardProviders
- `hooks/useAuth.tsx` — Aggiunto tenantId/tenantName a User interface

### Bug risolti:
- ✅ D-1/BK-1/C-1/V-1/S-1: Dashboard accessibile senza autenticazione → AuthGuard redirect a /auth

---

## Block 3: Dashboard con dati reali ✅

### File creati:
- `hooks/useApi.ts` — React Query hooks per tutti i resource (dashboard, bookings, customers, vehicles, settings, MFA, password)

### File modificati:
- `app/dashboard/page.tsx` — Rimossi dati hardcoded, usa useDashboardStats()

### Bug risolti:
- ✅ D-2: Dati 100% hardcoded → useDashboardStats() con fallback graceful
- ✅ D-3: Tenant name hardcoded "Officina Rossi" → Da API o user.tenantName

---

## Block 4: Bookings con dati reali ✅

### File modificati:
- `app/dashboard/bookings/page.tsx` — Rimosso mockBookings, usa useBookings()
- `app/dashboard/bookings/[id]/page.tsx` — Rimosso bookingData hardcoded, usa useBooking(id)

### Bug risolti:
- ✅ BK-2: Lista + stats 100% hardcoded → useBookings()
- ✅ BK-3: Booking detail usa mock fissi → useBooking(id)
- Bottoni "Completa Lavoro" e "Annulla" connessi a useUpdateBooking()

---

## Block 5: Customers con dati reali + GDPR ✅

### File modificati:
- `app/dashboard/customers/page.tsx` — Rimosso mockCustomers, usa useCustomers()

### Bug risolti:
- ✅ C-2: Lista clienti 100% hardcoded → useCustomers()
- ✅ C-3: Nessun bottone "Esporta dati" GDPR → Download icon con useGdprExport()
- ✅ C-4: Nessun bottone "Elimina account" GDPR → Trash icon + GdprDeleteDialog con type-to-confirm

---

## Block 6: Vehicles con dati reali ✅

### File modificati:
- `app/dashboard/vehicles/page.tsx` — Rimosso mockVehicles, usa useVehicles()

### Bug risolti:
- ✅ V-2: Lista veicoli 100% hardcoded → useVehicles()
- ✅ V-3: Nessun storico DVI → Link a /dashboard/inspections?vehicle=id

---

## Block 7: Settings con save reale + MFA + Passkey + Danger Zone ✅

### File modificati:
- `app/dashboard/settings/page.tsx` — Riscritta con 4 sezioni nel tab Sicurezza

### Bug risolti:
- ✅ S-2: Save "Salva Modifiche" non chiama API → useSaveSettings()
- ✅ S-3: Nessun toggle MFA → MfaSection con QR code + 6-digit verify
- ✅ S-4: Nessuna gestione Passkey → PasskeySection con bottone "Registra Passkey"
- ✅ S-5: Nessuna "Danger zone" → DangerZone con type-to-confirm "ELIMINA ACCOUNT"

---

## Block 8: Mobile Hamburger Menu ✅

### File modificati:
- `app/dashboard/dashboard-provider.tsx` — Desktop nav hidden su mobile, slide-out menu con backdrop

### Bug risolti:
- ✅ D-4: Navbar con 11 item causa overflow su mobile → Hamburger menu slide-out

---

## Build ✅

```
npx tsc --noEmit → 0 errors
npm run build → SUCCESS
```

---

## Scorecard BEFORE vs AFTER

| Metrica | Prima | Dopo |
|---------|-------|------|
| Auth guard frontend | ❌ 0/5 pagine | ✅ 5/5 pagine |
| API calls reali | ❌ 0/5 pagine | ✅ 5/5 pagine |
| GDPR export button | ❌ Assente | ✅ Presente |
| GDPR delete button | ❌ Assente | ✅ Presente (type-to-confirm) |
| MFA toggle | ❌ Assente | ✅ QR + 6-digit verify |
| Passkey management | ❌ Assente | ✅ Sezione presente |
| Danger zone | ❌ Assente | ✅ Type-to-confirm |
| Mobile responsive nav | ⚠️ Overflow | ✅ Hamburger menu |
| Tenant name hardcoded | ❌ "Officina Rossi" | ✅ Da API |
| Settings save API | ❌ Solo stato locale | ✅ useSaveSettings() |
| Build | ✅ | ✅ |

### Bug risolti: 15/15 (tutti i bug dell'audit)
- 5 🔴 CRITICI → ✅ (auth guard)
- 8 🟠 ALTI → ✅ (hardcoded data, GDPR, MFA, passkey, danger zone, settings save, tenant name)
- 1 🟡 MEDIO → ✅ (DVI history link)
- 1 🟢 BASSO → ✅ (mobile overflow)
