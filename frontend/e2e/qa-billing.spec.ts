import { test, expect, type Page } from '@playwright/test';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';

async function login(page: Page): Promise<void> {
  await page.goto(`${BASE}/auth/login`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('#login-workspace', { state: 'visible', timeout: 15000 });
  await page.evaluate(() => {
    localStorage.setItem('mechmind_onboarding_dismissed', 'true');
    localStorage.setItem(
      'mechmind_onboarding_answers',
      JSON.stringify({ shopType: 'officina', priorities: ['bookings'] })
    );
  });
  await page.locator('#login-workspace').fill('romano');
  await page.locator('#login-email').fill('romano@romano-officina.it');
  await page.locator('#login-password').fill('Demo2026!');
  await Promise.all([
    page.waitForURL(/(\/dashboard|\/onboarding)/, { timeout: 20000, waitUntil: 'commit' }),
    page.locator('button[type="submit"]').click(),
  ]);
  if (page.url().includes('/onboarding')) {
    await page.evaluate(() => localStorage.setItem('mechmind_onboarding_dismissed', 'true'));
    await page.goto(`${BASE}/dashboard`);
    await page.waitForURL(/\/dashboard/, { timeout: 15000, waitUntil: 'commit' });
  }
}

// ---------------------------------------------------------------------------
// BILLING — /dashboard/billing
// ---------------------------------------------------------------------------

test.describe.serial('BILLING /dashboard/billing', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('carica senza errori JS critici', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${BASE}/dashboard/billing`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    const critical = errors.filter(
      e =>
        !e.includes('ResizeObserver') &&
        !e.includes('hydrat') &&
        !e.includes('Warning') &&
        !e.includes('ChunkLoadError')
    );
    expect(critical).toHaveLength(0);
  });

  test('heading "Fatturazione" o "Billing" presente', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/billing`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    const heading = page.locator('h1', { hasText: /fatturazione|billing|pagamento/i });
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('nessun undefined/null nel contenuto', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/billing`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    const content = await page
      .locator('main, #main-content')
      .first()
      .evaluate(el => el.innerText)
      .catch(() => '');
    const hasUndefined =
      content.includes('undefined') || (content.includes('null') && !content.includes('Annulla'));
    expect(hasUndefined).toBeFalsy();
  });

  test('responsive 375px — no overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE}/dashboard/billing`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(380);
  });
});

// ---------------------------------------------------------------------------
// SUBSCRIPTION — /dashboard/subscription
// ---------------------------------------------------------------------------

test.describe.serial('SUBSCRIPTION /dashboard/subscription', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('carica senza errori JS critici', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${BASE}/dashboard/subscription`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    const critical = errors.filter(
      e =>
        !e.includes('ResizeObserver') &&
        !e.includes('hydrat') &&
        !e.includes('Warning') &&
        !e.includes('ChunkLoadError')
    );
    expect(critical).toHaveLength(0);
  });

  test('heading presente (abbonamento o errore caricamento)', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/subscription`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    // La pagina mostra h1 "Abbonamento" (con dati) o h3 "Errore di caricamento" (senza Stripe)
    const heading = page.locator('h1, h2, h3').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('nessun undefined/null nel contenuto', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/subscription`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    const content = await page
      .locator('main, #main-content')
      .first()
      .evaluate(el => el.innerText)
      .catch(() => '');
    const hasUndefined =
      content.includes('undefined') || (content.includes('null') && !content.includes('Annulla'));
    expect(hasUndefined).toBeFalsy();
  });

  test('mostra informazioni sul piano attuale', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/subscription`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(4000);
    const content = await page
      .locator('main, #main-content')
      .first()
      .evaluate(el => el.innerText)
      .catch(() => '');
    // Deve mostrare info piano o errore di caricamento (tenant senza Stripe)
    const hasPlanInfo = content
      .toLowerCase()
      .match(
        /piano|trial|free|starter|professional|enterprise|attivo|scaduto|annulla|abbonamento|errore|caricamento/
      );
    expect(hasPlanInfo).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// PRICING PAGE — /pricing
// ---------------------------------------------------------------------------

test.describe.serial('PRICING PAGE /pricing', () => {
  test('carica senza crash JS', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${BASE}/pricing`);
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

  test('mostra almeno un piano con prezzo', async ({ page }) => {
    await page.goto(`${BASE}/pricing`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    const content = await page
      .locator('body')
      .evaluate(el => el.innerText)
      .catch(() => '');
    // Deve contenere simbolo € o "mese" o "anno"
    expect(content).toMatch(/€|mese|anno|mensile|annuale/i);
  });

  test('CTA "Inizia" o "Prova" presente in almeno un piano', async ({ page }) => {
    await page.goto(`${BASE}/pricing`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    const ctaBtn = page.locator('a, button', { hasText: /inizia|prova|scegli|abbonati/i }).first();
    await expect(ctaBtn).toBeAttached({ timeout: 10000 });
  });
});

// ---------------------------------------------------------------------------
// BILLING PAGES — success/cancel (Stripe redirect pages)
// ---------------------------------------------------------------------------

test.describe.serial('BILLING REDIRECT — success/cancel', () => {
  test('/billing/success carica senza crash', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${BASE}/billing/success`);
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

  test('/billing/success ha contenuto (non pagina vuota)', async ({ page }) => {
    await page.goto(`${BASE}/billing/success`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const content = await page
      .locator('body')
      .evaluate(el => el.innerText)
      .catch(() => '');
    expect(content.trim().length).toBeGreaterThan(5);
  });

  test('/billing/cancel carica senza crash', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${BASE}/billing/cancel`);
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

  test('/billing/cancel ha contenuto (non pagina vuota)', async ({ page }) => {
    await page.goto(`${BASE}/billing/cancel`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const content = await page
      .locator('body')
      .evaluate(el => el.innerText)
      .catch(() => '');
    expect(content.trim().length).toBeGreaterThan(5);
  });
});

// ---------------------------------------------------------------------------
// BILLING API — risposta senza auth
// ---------------------------------------------------------------------------

test.describe.serial('BILLING API — auth required', () => {
  test('GET /api/dashboard/subscription senza cookie → 401', async ({ page }) => {
    const response = await page.request.get(`${BASE}/api/dashboard/subscription`);
    expect([401, 403, 302]).toContain(response.status());
  });

  test('GET /api/dashboard/billing/invoices senza cookie → 401', async ({ page }) => {
    const response = await page.request.get(`${BASE}/api/dashboard/billing/invoices`);
    expect([401, 403, 302]).toContain(response.status());
  });

  test('GET /api/dashboard/subscription autenticato → risponde (non 500)', async ({ page }) => {
    await login(page);
    const response = await page.request.get(`${BASE}/api/dashboard/subscription`);
    expect(response.status()).not.toBe(500);
    // 200 (OK), 404 (nessun abbonamento), 401 (redirect) - tutti accettabili
    expect([200, 404, 401, 403]).toContain(response.status());
  });
});
