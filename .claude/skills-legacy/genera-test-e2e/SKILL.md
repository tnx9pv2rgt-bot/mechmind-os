---
name: genera-test-ui
description: "Genera test end-to-end con Playwright per i percorsi critici."
user-invocable: true
disable-model-invocation: false
effort: high
context: fork
allowed-tools: ["Read", "Bash", "Grep", "Glob", "Write", "Edit"]
argument-hint: "[booking|payment|auth|invoice|dvi|all]"
arguments: flusso
---

# E2E Test Generator — Playwright Golden Path

## Filosofia

I test E2E coprono ciò che i test unitari non possono:
il flusso completo utente da browser → frontend → backend → DB → risposta.

**Target**: Zero regressioni sui flussi che generano revenue.

## Prerequisiti

```bash
# Verifica Playwright installato
cd frontend && npx playwright --version 2>/dev/null || \
  npm install --save-dev @playwright/test && npx playwright install chromium
```

## STEP 1 — Identifica Golden Path

Per `$ARGUMENTS`, identifica il flusso critico:

### `booking` — Prenotazione Online
```
1. Cliente apre pagina prenotazione
2. Seleziona servizio + data + orario
3. Inserisce dati (nome, tel, targa)
4. Conferma prenotazione
5. Riceve conferma email / toast successo
6. Booking appare nel backend con status PENDING
```

### `payment` — Checkout Pagamento
```
1. Operatore crea payment link
2. Cliente apre link
3. Inserisce carta (Stripe test: 4242424242424242)
4. Completa pagamento
5. Webhook ricevuto → status PAID
6. Invoice generata
```

### `auth` — Login / Logout
```
1. Apre /login
2. Inserisce credenziali valide
3. Redirect a /dashboard
4. Vede proprio tenant (no cross-tenant leak)
5. Logout → redirect /login
6. Token invalidato (no accesso con vecchio token)
```

### `invoice` — Creazione Fattura
```
1. Operatore apre nuovo OdL
2. Aggiunge pezzi + manodopera
3. Chiude OdL → genera fattura
4. Fattura appare con status DRAFT
5. Invia → status SENT
6. XML FatturaPA generato correttamente
```

## STEP 2 — Leggi Frontend Routes

```bash
find frontend/app -name "page.tsx" | head -30
find frontend/app -name "route.ts" | head -20
```

Identifica URL esatti per ogni step del golden path.

## STEP 3 — Genera Playwright Test

Crea `frontend/tests/e2e/$ARGUMENTS.spec.ts`:

```typescript
import { test, expect, Page } from '@playwright/test';

// Test data — usa sempre dati di test isolati
const TEST_TENANT = 'e2e-test-tenant';
const TEST_EMAIL = 'e2e@test.nexo.it';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'TestPass123!';

test.describe('$ARGUMENTS Golden Path', () => {
  let page: Page;
  
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('should complete $ARGUMENTS flow successfully', async () => {
    // STEP 1: Navigate
    await page.goto(process.env.FRONTEND_URL + '/...');
    await expect(page).toHaveURL(/.../);
    
    // STEP 2: Fill form
    await page.fill('[data-testid="field-name"]', 'Mario Rossi');
    await page.fill('[data-testid="field-phone"]', '+39 333 1234567');
    
    // STEP 3: Submit
    await page.click('[data-testid="btn-submit"]');
    
    // STEP 4: Verify success
    await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="booking-status"]')).toHaveText('PENDING');
  });

  test('should reject invalid input', async () => {
    await page.goto(process.env.FRONTEND_URL + '/...');
    await page.click('[data-testid="btn-submit"]'); // Submit without filling
    await expect(page.locator('[data-testid="error-required"]')).toBeVisible();
  });

  test('should not leak cross-tenant data', async () => {
    // Verifica che URL con ID di altro tenant restituisca 403/404
    await page.goto(process.env.FRONTEND_URL + '/.../other-tenant-id');
    await expect(page).toHaveURL(/\/403|\/404|\/login/);
  });
});
```

## STEP 4 — Data-testid Convention

Aggiungi attributi `data-testid` ai componenti frontend critici:

```tsx
// ✅ Pattern corretto
<Button data-testid="btn-confirm-booking" onClick={handleConfirm}>
  Conferma Prenotazione
</Button>

<div data-testid="booking-status">{booking.status}</div>

<Toast data-testid="toast-success">Prenotazione confermata</Toast>
```

## STEP 5 — Playwright Config

Verifica/crea `frontend/playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false, // E2E sequenziali per evitare conflitti DB
  retries: process.env.CI ? 2 : 0,
  reporter: [['html'], ['github']],
  
  use: {
    baseURL: process.env.FRONTEND_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  
  // Avvia frontend + backend prima dei test
  webServer: [
    {
      command: 'cd backend && npm run start:test',
      port: 3002,
      timeout: 30_000,
    },
    {
      command: 'cd frontend && npm run dev',
      port: 3000,
      timeout: 30_000,
    },
  ],
});
```

## STEP 6 — Esegui Test

```bash
# Run specifico flusso
cd frontend && npx playwright test $ARGUMENTS --reporter=list

# Run tutti E2E
cd frontend && npx playwright test

# Con UI interattiva (debug)
cd frontend && npx playwright test --ui

# Headless in CI
cd frontend && npx playwright test --reporter=github
```

## Regole E2E

- **No mock backend** — E2E deve colpire il backend reale
- **Dati isolati** — ogni run usa dati unici (UUID o timestamp)
- **Cleanup** — `afterAll` pulisce i dati creati durante il test
- **Asserzioni minime per test**: 3 (stato iniziale, azione, stato finale)
- **Timeout realistico** — 30s per navigazione, 5s per assertion
- **`data-testid`** — mai selettori CSS fragili (`.btn-primary` può cambiare)
- **Indipendenza** — ogni test deve poter girare standalone
