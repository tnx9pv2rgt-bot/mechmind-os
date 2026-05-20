import { test, expect, type Page } from '@playwright/test';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';

// ---------------------------------------------------------------------------
// Portal auth helper — injects localStorage BEFORE any JS runs (addInitScript)
// ---------------------------------------------------------------------------

const PORTAL_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0In0.fake';
const PORTAL_USER = JSON.stringify({
  id: 'test-customer-id',
  email: 'cliente@test.it',
  firstName: 'Mario',
  lastName: 'Rossi',
  tenantId: 'romano-tenant-id',
  tenantSlug: 'romano',
  tenantName: 'Romano Officina',
});

async function goToPortalPage(page: Page, path: string): Promise<void> {
  // Inject localStorage BEFORE any page JS runs — bypasses layout auth redirect
  await page.addInitScript(
    ({ token, user }: { token: string; user: string }) => {
      localStorage.setItem('portal_token', token);
      localStorage.setItem('portal_user', user);
    },
    { token: PORTAL_TOKEN, user: PORTAL_USER }
  );

  await page.goto(`${BASE}${path}`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2500);
}

// ---------------------------------------------------------------------------
// LOGIN — pagina pubblica
// ---------------------------------------------------------------------------

test.describe.serial('PORTAL LOGIN /portal/login', () => {
  test('carica senza errori JS critici', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${BASE}/portal/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const critical = errors.filter(
      e =>
        !e.includes('ResizeObserver') &&
        !e.includes('hydrat') &&
        !e.includes('Warning') &&
        !e.includes('ChunkLoadError')
    );
    expect(critical).toHaveLength(0);
  });

  test('heading "MechMind Portal" presente', async ({ page }) => {
    await page.goto(`${BASE}/portal/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const heading = page.locator('h1', { hasText: /mechmind portal/i });
    await expect(heading).toBeVisible({ timeout: 8000 });
  });

  test('campo email presente', async ({ page }) => {
    await page.goto(`${BASE}/portal/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    const emailInput = page.locator('#email');
    await expect(emailInput).toBeVisible({ timeout: 8000 });
  });

  test('campo password presente', async ({ page }) => {
    await page.goto(`${BASE}/portal/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    const passwordInput = page.locator('#password');
    await expect(passwordInput).toBeVisible({ timeout: 8000 });
  });

  test('link "Password dimenticata?" porta a /portal/reset-password', async ({ page }) => {
    await page.goto(`${BASE}/portal/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    const link = page.locator('a', { hasText: /password dimenticata/i });
    await expect(link).toBeVisible({ timeout: 8000 });
    const href = await link.getAttribute('href');
    expect(href).toContain('/portal/reset-password');
  });

  test('link "Registrati" porta a /portal/register', async ({ page }) => {
    await page.goto(`${BASE}/portal/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    const link = page.locator('a', { hasText: /registrati/i });
    await expect(link).toBeVisible({ timeout: 8000 });
    const href = await link.getAttribute('href');
    expect(href).toContain('/portal/register');
  });

  test('bottone mostra/nascondi password funziona', async ({ page }) => {
    await page.goto(`${BASE}/portal/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    const passwordInput = page.locator('#password');
    await expect(passwordInput).toHaveAttribute('type', 'password');
    const toggleBtn = page.locator('button[aria-label*="password"]').first();
    await toggleBtn.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
  });

  test('credenziali errate mostrano errore', async ({ page }) => {
    await page.goto(`${BASE}/portal/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    await page.locator('#email').fill('fake@fake.it');
    await page.locator('#password').fill('wrongpassword');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(3000);
    // Non deve navigare a dashboard
    expect(page.url()).not.toContain('/portal/dashboard');
  });

  test('responsive 375px — no overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE}/portal/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(380);
  });
});

// ---------------------------------------------------------------------------
// REGISTER — pagina pubblica
// ---------------------------------------------------------------------------

test.describe.serial('PORTAL REGISTER /portal/register', () => {
  test('carica senza errori JS critici', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${BASE}/portal/register`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const critical = errors.filter(
      e =>
        !e.includes('ResizeObserver') &&
        !e.includes('hydrat') &&
        !e.includes('Warning') &&
        !e.includes('ChunkLoadError')
    );
    expect(critical).toHaveLength(0);
  });

  test('heading "Crea il tuo account" presente', async ({ page }) => {
    await page.goto(`${BASE}/portal/register`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const heading = page.locator('h1', { hasText: /crea il tuo account/i });
    await expect(heading).toBeVisible({ timeout: 8000 });
  });

  test('step 1: campo Nome presente', async ({ page }) => {
    await page.goto(`${BASE}/portal/register`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    const firstName = page.locator('#firstName');
    await expect(firstName).toBeVisible({ timeout: 8000 });
  });

  test('step 1: bottone Continua porta a step 2', async ({ page }) => {
    await page.goto(`${BASE}/portal/register`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    await page.locator('#firstName').fill('Mario');
    await page.locator('#lastName').fill('Rossi');
    await page.locator('#email').fill('mario.rossi@test.it');
    await page.locator('#phone').fill('+39 333 1234567');
    const continuaBtn = page.locator('button', { hasText: /continua/i }).first();
    await continuaBtn.click();
    await page.waitForTimeout(500);
    // Step 2: password field appears
    const passwordInput = page.locator('#password');
    await expect(passwordInput).toBeVisible({ timeout: 5000 });
  });

  test('link "Accedi" porta a /portal/login', async ({ page }) => {
    await page.goto(`${BASE}/portal/register`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    const link = page.locator('a', { hasText: /accedi/i });
    await expect(link).toBeVisible({ timeout: 8000 });
    const href = await link.getAttribute('href');
    expect(href).toContain('/portal/login');
  });
});

// ---------------------------------------------------------------------------
// RESET PASSWORD — pagina pubblica
// ---------------------------------------------------------------------------

test.describe.serial('PORTAL RESET PASSWORD /portal/reset-password', () => {
  test('carica senza crash JS', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${BASE}/portal/reset-password`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const critical = errors.filter(
      e =>
        !e.includes('ResizeObserver') &&
        !e.includes('hydrat') &&
        !e.includes('Warning') &&
        !e.includes('ChunkLoadError')
    );
    expect(critical).toHaveLength(0);
  });

  test('campo email presente', async ({ page }) => {
    await page.goto(`${BASE}/portal/reset-password`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    const emailInput = page.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible({ timeout: 8000 });
  });

  test('link torna al login presente', async ({ page }) => {
    await page.goto(`${BASE}/portal/reset-password`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    const backLink = page.locator('a', { hasText: /login|accedi/i }).first();
    await expect(backLink).toBeAttached({ timeout: 8000 });
  });
});

// ---------------------------------------------------------------------------
// PORTAL DASHBOARD — pagina autenticata (localStorage mock)
// ---------------------------------------------------------------------------

test.describe.serial('PORTAL DASHBOARD /portal/dashboard', () => {
  test('carica senza crash JS con auth mock', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await goToPortalPage(page, '/portal/dashboard');
    const critical = errors.filter(
      e =>
        !e.includes('ResizeObserver') &&
        !e.includes('hydrat') &&
        !e.includes('Warning') &&
        !e.includes('ChunkLoadError') &&
        !e.includes('Unexpected token') // API errors with fake token
    );
    expect(critical).toHaveLength(0);
  });

  test('URL rimane su /portal/dashboard dopo auth mock', async ({ page }) => {
    await goToPortalPage(page, '/portal/dashboard');
    // Attende fino a 10s che il layout finisca il check auth (spinner sparisce o header appare)
    await page
      .waitForFunction(
        () => !document.querySelector('.animate-spin') || document.querySelector('header') !== null,
        { timeout: 10000 }
      )
      .catch(() => {});
    // URL deve rimanere su dashboard (non redirezionato a login)
    const url = page.url();
    const isOnPortal = url.includes('/portal/') && !url.endsWith('/portal/login');
    expect(isOnPortal).toBeTruthy();
  });

  test('nessun undefined/null nel contenuto', async ({ page }) => {
    await goToPortalPage(page, '/portal/dashboard');
    const content = await page
      .locator('main, #main-content')
      .first()
      .evaluate(el => el.innerText)
      .catch(() => '');
    const hasUndefined =
      content.includes('undefined') || (content.includes('null') && !content.includes('Annulla'));
    expect(hasUndefined).toBeFalsy();
  });
});

// ---------------------------------------------------------------------------
// PORTAL BOOKINGS — pagina autenticata
// ---------------------------------------------------------------------------

test.describe.serial('PORTAL BOOKINGS /portal/bookings', () => {
  test('carica senza crash JS', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await goToPortalPage(page, '/portal/bookings');
    const critical = errors.filter(
      e =>
        !e.includes('ResizeObserver') &&
        !e.includes('hydrat') &&
        !e.includes('Warning') &&
        !e.includes('ChunkLoadError') &&
        !e.includes('Unexpected token')
    );
    expect(critical).toHaveLength(0);
  });

  test('nessun undefined/null nel contenuto', async ({ page }) => {
    await goToPortalPage(page, '/portal/bookings');
    const content = await page
      .locator('main, #main-content')
      .first()
      .evaluate(el => el.innerText)
      .catch(() => '');
    const hasUndefined =
      content.includes('undefined') || (content.includes('null') && !content.includes('Annulla'));
    expect(hasUndefined).toBeFalsy();
  });
});

// ---------------------------------------------------------------------------
// PORTAL INVOICES — pagina autenticata
// ---------------------------------------------------------------------------

test.describe.serial('PORTAL INVOICES /portal/invoices', () => {
  test('carica senza crash JS', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await goToPortalPage(page, '/portal/invoices');
    const critical = errors.filter(
      e =>
        !e.includes('ResizeObserver') &&
        !e.includes('hydrat') &&
        !e.includes('Warning') &&
        !e.includes('ChunkLoadError') &&
        !e.includes('Unexpected token')
    );
    expect(critical).toHaveLength(0);
  });

  test('nessun undefined/null nel contenuto', async ({ page }) => {
    await goToPortalPage(page, '/portal/invoices');
    const content = await page
      .locator('main, #main-content')
      .first()
      .evaluate(el => el.innerText)
      .catch(() => '');
    const hasUndefined =
      content.includes('undefined') || (content.includes('null') && !content.includes('Annulla'));
    expect(hasUndefined).toBeFalsy();
  });
});

// ---------------------------------------------------------------------------
// PORTAL altre sezioni — crash check
// ---------------------------------------------------------------------------

const PORTAL_ROUTES = [
  '/portal/repairs',
  '/portal/estimates',
  '/portal/documents',
  '/portal/inspections',
  '/portal/maintenance',
  '/portal/warranty',
  '/portal/messages',
  '/portal/notifications',
  '/portal/payments',
  '/portal/settings',
];

for (const route of PORTAL_ROUTES) {
  test.describe(`PORTAL ${route}`, () => {
    test(`${route} carica senza crash`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', e => errors.push(e.message));
      await goToPortalPage(page, route);
      const critical = errors.filter(
        e =>
          !e.includes('ResizeObserver') &&
          !e.includes('hydrat') &&
          !e.includes('Warning') &&
          !e.includes('ChunkLoadError') &&
          !e.includes('Unexpected token')
      );
      expect(critical).toHaveLength(0);
    });

    test(`${route} — no undefined/null nel contenuto`, async ({ page }) => {
      await goToPortalPage(page, route);
      const content = await page
        .locator('main, #main-content')
        .first()
        .evaluate(el => el.innerText)
        .catch(() => '');
      const hasUndefined =
        content.includes('undefined') || (content.includes('null') && !content.includes('Annulla'));
      expect(hasUndefined).toBeFalsy();
    });
  });
}
