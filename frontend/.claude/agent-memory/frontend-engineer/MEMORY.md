# Frontend Engineer Memory

## E2E Test Coverage — Dashboard Modules (2026-05-10)

Created 6 new Playwright E2E spec files covering dashboard modules without
tests:

1. **search.spec.ts** — Global search with result grouping (Clienti, Veicoli,
   Ordini, Fatture, Prenotazioni)
   - 15 tests: Render (3), Loading (1), Empty (1), Error (1), Data (5), Actions
     (5)
   - ID prefix: `SEARCH-`
   - Mock: `/api/dashboard/search?q=...`
   - Features: Debounced input, result navigation, type filters

2. **calendar.spec.ts** — Calendar + quick-add + sidebar stats
   - 16 tests: Render (3), Loading (1), Empty (1), Error (1), Data (6), Actions
     (5)
   - ID prefix: `CAL-`
   - Mocks: `/api/dashboard/calendar/events?from=...&to=...` +
     `/api/bookings/calendar/stats`
   - Features: View switcher (Mese/Settimana/Giorno), events, sidebar stats,
     today button

3. **diagnostics.spec.ts** — OBD diagnostics + severity levels + repair
   recommendations
   - 18 tests: Render (3), Loading (1), Empty (1), Error (1), Data (7), Actions
     (5)
   - ID prefix: `DIAG-`
   - Mocks: `/api/dashboard/diagnostics/analyze` +
     `/api/dashboard/diagnostics/history`
   - Features: DTC/symptoms input, severity badges, cost estimates, history
     replay

4. **payments.spec.ts** — Payment method + subscription status + plan info
   - 17 tests: Render (3), Loading (1), Empty (1), Error (1), Data (6), Actions
     (5)
   - ID prefix: `PAY-`
   - Mock: `/api/dashboard/billing/payment-method` (GET + POST)
   - Features: No payment method state, Stripe customer ID, expiration date,
     update button

5. **payroll.spec.ts** — Technician payroll + month selector + approval workflow
   - 20 tests: Render (3), Loading (1), Empty (1), Error (1), Data (8), Actions
     (6)
   - ID prefix: `PAYROLL-`
   - Mock: `/api/payroll?month=...&year=...` (GET + POST)
   - Features: Pay types (Orario/Stipendio/Commissione), status badges, month
     selector, export

6. **audit-logs.spec.ts** — Audit log list + filters + pagination
   - 20 tests: Render (4), Loading (1), Empty (1), Error (1), Data (7), Actions
     (6)
   - ID prefix: `AUDIT-`
   - Mock: `/api/dashboard/settings/audit?page=...&action=...&tableName=...`
   - Features: Action + table filters, pagination, user ID truncation,
     timestamps (it-IT locale)

## Pattern Notes

- All files use `import { test, expect } from '../fixtures/auth.fixture'`
- Mock objects follow API response shape from source files
- Each test has ≥2 assertions
- All tests follow 6-block pattern: Render (3-5) → Loading (1-2) → Empty (1) →
  Error (1) → Data (5-8) → Actions (3-6)
- Hardcoded Italian UI: "Ricerca", "Calendario", "Pagamenti", "Buste paga",
  "Audit Log"
- Dark mode tests included where applicable
- Never real API calls — all mocked via `page.route('**...')`
- Regex patterns prefer flexible matchers for UI stability (e.g.,
  `/Ricerca|Ricarica|cercai/`)

## File Paths

```
frontend/e2e/dashboard/
  ├── search.spec.ts
  ├── calendar.spec.ts
  ├── diagnostics.spec.ts
  ├── payments.spec.ts
  ├── payroll.spec.ts
  └── audit-logs.spec.ts
```

## Testing Conventions

- `test.beforeEach`: setup mocks + navigate to page +
  waitForLoadState('networkidle')
- `test.describe` block per "feature" (Render, Loading, Empty, Error, Data,
  Actions)
- ID naming: `MODULE-NNN` (e.g., `SEARCH-001`, `CAL-012`, `DIAG-007`)
- Arrow function: `async ({ page }) => { ... }`
- Async assertions: `await expect(...).toBeVisible()`
- Flexible selectors to avoid brittleness (regex, multi-option `.or()`)
- `.catch(() => false)` on optional UI elements

---

**Created:** 2026-05-10 by Claude Code **Status:** ✅ All 6 files written,
linted by Prettier **Next:** Run `npx playwright test frontend/e2e/dashboard/`
to validate

## Compliance E2E Tests (2026-05-12)

Added 2 new Playwright spec files for compliance & FatturaPA:

1. **cookie-consent.spec.ts** — GDPR Cookie Consent Banner
   - 10 tests: Banner visibility (1), Accept all (1), Necessary only (1),
     Persistence (1), Dashboard suppression (1), Auth page (1), Preferences (2),
     Mobile responsive (1), Privacy link (1)
   - Features: localStorage flag validation, preferences panel, analytics
     toggle, mobile 375px responsive
   - Key: `localStorage.getItem('mechmind-cookie-consent')` must return JSON
     with `{necessary, analytics, timestamp}`

2. **fatturapa-flow.spec.ts** — FatturaPA / SDI Invoice Flow
   - 14 tests: Page load (1), API status (1), Form fields (1), List state (1),
     Actions (1), Form labels (1), Detail view (1), Mobile responsive (1), Dark
     mode (1), Tax fields (1), Amount fields (1), Error handling (1), JSON
     validation (1)
   - Features: API health check (/api/v1/invoices), FatturaPA field presence
     (IVA, CF, CIG, CUP, SDI), dark mode rendering, no 500/502 errors
   - Key: Tests UI presence (not actual SDI transmission)

Both test files:

- Use `@playwright/test` fixtures
- No auth fixture (tests public pages or skip auth)
- localStorage clear before each test
- Responsive + dark mode validation
- No external API mocks (tests real endpoints on localhost:3001)

## File Paths

```
frontend/e2e/compliance/
  ├── cookie-consent.spec.ts
  └── fatturapa-flow.spec.ts
```

## Landing Page Status

- Cookie banner: ✅ Already implemented (CookieConsentLoader + CookieConsent)
- Feature section: ✅ FeaturePillars (Gestisci/Fattura/Prenota)
- Pricing: ✅ PricingPreview (Starter/Pro plans)
- No changes needed — all required sections exist
