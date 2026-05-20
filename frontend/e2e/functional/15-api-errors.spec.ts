/**
 * API ERRORS — Intercept 500/401/403/404/429/offline, JWT expiry, double-submit
 */
import { test, expect } from '@playwright/test';
import { bug, screenshot, goto, waitForContent } from './helpers';

// ─── HTTP 500 Handling ────────────────────────────────────────────────────────

test.describe('API-500 — Gestione errori server 500', () => {
  const ENDPOINTS_TO_MOCK_500: { apiPattern: string; page: string; module: string }[] = [
    { apiPattern: '**/api/customers*', page: '/dashboard/customers', module: 'Customers' },
    { apiPattern: '**/api/bookings*', page: '/dashboard/bookings', module: 'Bookings' },
    { apiPattern: '**/api/invoices*', page: '/dashboard/invoices', module: 'Invoices' },
    { apiPattern: '**/api/work-orders*', page: '/dashboard/work-orders', module: 'WorkOrders' },
    { apiPattern: '**/api/vehicles*', page: '/dashboard/vehicles', module: 'Vehicles' },
  ];

  for (const { apiPattern, page: pagePath, module } of ENDPOINTS_TO_MOCK_500) {
    test(`API-500-${module}: API 500 → error state (non crash)`, async ({ page }) => {
      await page.route(apiPattern, route =>
        route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Internal Server Error' }) })
      );

      await goto(page, pagePath);
      await waitForContent(page);

      // Should show error state, NOT an unhandled error that renders nothing
      const hasErrorUI = await page.locator('[role="alert"], text=errore, text=error, text=qualcosa è andato storto, [data-testid*="error"], [class*="error-state"]').first().isVisible().catch(() => false);
      const hasEmptyScreen = await page.locator('main:empty, [class*="main"]:empty').first().isVisible().catch(() => false);

      if (!hasErrorUI) {
        bug({
          module: `${module}/API`,
          url: pagePath,
          action: 'API 500 → error boundary/state',
          expected: 'Messaggio errore visibile (error boundary o toast)',
          observed: 'Nessun feedback errore dopo API 500',
          severity: 'ALTO',
          reproSteps: [`Intercepta ${apiPattern} con 500`, `Vai a ${pagePath}`],
        });
      }
    });
  }
});

// ─── HTTP 401 / Auth Errors ───────────────────────────────────────────────────

test.describe('API-401 — Gestione errori autenticazione', () => {
  test('API-401-01: API 401 → redirect a login', async ({ page }) => {
    await page.route('**/api/customers*', route =>
      route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'Unauthorized' }) })
    );

    await goto(page, '/dashboard/customers');
    await waitForContent(page);

    await page.waitForTimeout(2000);
    const currentUrl = page.url();

    if (!currentUrl.includes('/login') && !currentUrl.includes('/auth')) {
      // Non è necessariamente un bug immediato — potrebbe usare token refresh
      // Bug solo se crash invece di graceful handling
      const hasCrash = await page.locator('text=Uncaught, text=TypeError, text=Cannot read').first().isVisible().catch(() => false);
      if (hasCrash) {
        bug({ module: 'Customers/API', url: '/dashboard/customers', action: 'API 401 graceful handling', expected: 'Redirect a login o token refresh', observed: 'Crash JavaScript', severity: 'CRITICO', reproSteps: ['Intercepta /api/customers con 401', 'Verifica comportamento'] });
        await screenshot(page, 'bug-api-401-crash');
      }
    }
  });
});

// ─── HTTP 403 ─────────────────────────────────────────────────────────────────

test.describe('API-403 — Accesso negato', () => {
  test('API-403-01: API 403 → messaggio accesso negato', async ({ page }) => {
    await page.route('**/api/analytics*', route =>
      route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ message: 'Forbidden' }) })
    );

    await goto(page, '/dashboard/analytics');
    await waitForContent(page);

    const hasCrash = await page.locator('text=Uncaught, text=TypeError').first().isVisible().catch(() => false);
    if (hasCrash) {
      bug({ module: 'Analytics/API', url: '/dashboard/analytics', action: 'API 403 handling', expected: 'Messaggio accesso negato o redirect', observed: 'Crash JavaScript', severity: 'ALTO', reproSteps: ['Intercepta /api/analytics con 403'] });
    }
  });
});

// ─── HTTP 404 ─────────────────────────────────────────────────────────────────

test.describe('API-404 — Risorsa non trovata', () => {
  test('API-404-01: API 404 → not found UI (non 500)', async ({ page }) => {
    const FAKE_UUID = '00000000-0000-0000-0000-000000000002';

    await page.route(`**/api/customers/${FAKE_UUID}*`, route =>
      route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'Not Found' }) })
    );

    await goto(page, `/dashboard/customers/${FAKE_UUID}`);
    await waitForContent(page);

    const has500 = await page.locator('text=500, h1:has-text("500")').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'Customers/API', url: `/dashboard/customers/${FAKE_UUID}`, action: 'API 404 → 404 UI', expected: 'Pagina 404 o redirect', observed: '500 invece di 404', severity: 'ALTO', reproSteps: [`Vai a /dashboard/customers/${FAKE_UUID}`] });
      await screenshot(page, 'bug-api-404-shows-500');
    }
  });
});

// ─── HTTP 429 Rate Limiting ───────────────────────────────────────────────────

test.describe('API-429 — Rate limiting', () => {
  test('API-429-01: API 429 → messaggio friendly (non crash)', async ({ page }) => {
    await page.route('**/api/customers*', route =>
      route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ message: 'Too Many Requests' }), headers: { 'Retry-After': '60' } })
    );

    await goto(page, '/dashboard/customers');
    await waitForContent(page);

    const hasCrash = await page.locator('text=Uncaught, text=TypeError').first().isVisible().catch(() => false);
    if (hasCrash) {
      bug({ module: 'Customers/API', url: '/dashboard/customers', action: 'API 429 handling', expected: 'Messaggio rate limit o retry', observed: 'Crash JavaScript', severity: 'ALTO', reproSteps: ['Intercepta API con 429'] });
    }
  });
});

// ─── Network Offline ──────────────────────────────────────────────────────────

test.describe('API-OFFLINE — Comportamento offline', () => {
  test('API-OFFLINE-01: Offline su lista clienti → error state', async ({ page }) => {
    await goto(page, '/dashboard/customers');
    await waitForContent(page);

    // Go offline
    await page.context().setOffline(true);

    // Try navigating to another page
    await page.route('**/api/**', route => route.abort('connectionrefused'));
    await goto(page, '/dashboard/invoices');
    await waitForContent(page);

    const hasCrash = await page.locator('text=Uncaught TypeError, text=Cannot read properties').first().isVisible().catch(() => false);
    if (hasCrash) {
      bug({ module: 'General/Offline', url: '/dashboard/invoices', action: 'Navigazione offline', expected: 'Messaggio connessione assente', observed: 'Crash JavaScript', severity: 'ALTO', reproSteps: ['Vai offline', 'Naviga a /dashboard/invoices'] });
      await screenshot(page, 'bug-api-offline-crash');
    }

    // Go back online
    await page.context().setOffline(false);
    await page.unrouteAll();
  });

  test('API-OFFLINE-02: Retry dopo reconnect', async ({ page }) => {
    await goto(page, '/dashboard/customers');
    await waitForContent(page);

    await page.context().setOffline(true);
    await page.waitForTimeout(1000);
    await page.context().setOffline(false);
    await page.waitForTimeout(2000);

    const hasCrash = await page.locator('text=Uncaught, text=TypeError').first().isVisible().catch(() => false);
    if (hasCrash) {
      bug({ module: 'General/Offline', url: '/dashboard/customers', action: 'Reconnect dopo offline', expected: 'Pagina funziona dopo reconnect', observed: 'Crash dopo reconnect', severity: 'MEDIO', reproSteps: ['Vai offline brevemente poi torna online'] });
    }
  });
});

// ─── JWT Expiry ───────────────────────────────────────────────────────────────

test.describe('API-JWT — JWT scadenza', () => {
  test('API-JWT-01: Token scaduto → refresh automatico o redirect', async ({ page }) => {
    // Simula token scaduto modificando cookie (se accessibile)
    await goto(page, '/dashboard/customers');
    await waitForContent(page);

    // Intercepta e simula risposta 401 per auth_token scaduto
    await page.route('**/api/customers*', route =>
      route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'Token expired' }) })
    );

    // Ricarica la pagina
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    const hasCrash = await page.locator('text=Uncaught TypeError').first().isVisible().catch(() => false);

    if (hasCrash) {
      bug({ module: 'Auth/JWT', url: '/dashboard/customers', action: 'JWT scaduto', expected: 'Redirect a login o refresh token', observed: 'Crash JavaScript', severity: 'CRITICO', reproSteps: ['Intercepta API con 401 (token scaduto)', 'Ricarica pagina'] });
      await screenshot(page, 'bug-jwt-expired-crash');
    }

    await page.unrouteAll();
  });
});

// ─── Timeout Handling ─────────────────────────────────────────────────────────

test.describe('API-TIMEOUT — Timeout richieste', () => {
  test('API-TIMEOUT-01: API lenta (3s delay) → loading state', async ({ page }) => {
    await page.route('**/api/customers*', async route => {
      await new Promise(r => setTimeout(r, 3000));
      await route.continue();
    });

    await goto(page, '/dashboard/customers');

    // Should show loading state
    const hasLoading = await page.locator('[aria-busy="true"], [class*="skeleton"], [class*="loading"], [class*="spinner"]').first().isVisible().catch(() => false);
    if (!hasLoading) {
      bug({ module: 'Customers/API', url: '/dashboard/customers', action: 'Loading state su API lenta', expected: 'Skeleton/spinner durante caricamento', observed: 'Nessun indicatore di caricamento', severity: 'BASSO', reproSteps: ['Intercepta API con 3s delay', 'Verifica loading state'] });
    }

    await page.waitForTimeout(4000);
    await page.unrouteAll();
  });
});
