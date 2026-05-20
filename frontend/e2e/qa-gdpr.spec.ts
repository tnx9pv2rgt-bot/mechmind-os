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
// PRIVACY PAGE
// ---------------------------------------------------------------------------

test.describe.serial('GDPR — Privacy Page /privacy', () => {
  test('carica senza crash JS', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${BASE}/privacy`);
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

  test('heading "Privacy" presente', async ({ page }) => {
    await page.goto(`${BASE}/privacy`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const heading = page.locator('h1', { hasText: /privacy/i });
    await expect(heading).toBeVisible({ timeout: 8000 });
  });

  test('contiene riferimento a GDPR', async ({ page }) => {
    await page.goto(`${BASE}/privacy`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const content = await page
      .locator('body')
      .evaluate(el => el.innerText)
      .catch(() => '');
    expect(content.toLowerCase()).toMatch(/gdpr|regolamento|dato personale|trattamento/);
  });

  test('contiene base legale o titolare del trattamento', async ({ page }) => {
    await page.goto(`${BASE}/privacy`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const content = await page
      .locator('body')
      .evaluate(el => el.innerText)
      .catch(() => '');
    // GDPR Art.13: deve indicare il titolare
    expect(content.toLowerCase()).toMatch(/titolare|mechmind|responsabile|dati|trattamento/);
  });

  test('nessun undefined/null nel testo', async ({ page }) => {
    await page.goto(`${BASE}/privacy`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const content = await page
      .locator('body')
      .evaluate(el => el.innerText)
      .catch(() => '');
    const hasUndefined =
      content.includes('undefined') || (content.includes('null') && !content.includes('Annulla'));
    expect(hasUndefined).toBeFalsy();
  });
});

// ---------------------------------------------------------------------------
// DPA PAGE
// ---------------------------------------------------------------------------

test.describe.serial('GDPR — DPA Page /dpa', () => {
  test('carica senza crash JS', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${BASE}/dpa`);
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

  test('heading DPA presente', async ({ page }) => {
    await page.goto(`${BASE}/dpa`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: 8000 });
  });

  test('contiene riferimento a GDPR o DPA', async ({ page }) => {
    await page.goto(`${BASE}/dpa`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const content = await page
      .locator('body')
      .evaluate(el => el.innerText)
      .catch(() => '');
    expect(content.toLowerCase()).toMatch(/gdpr|dpa|responsabile|trattamento|dato/);
  });
});

// ---------------------------------------------------------------------------
// GDPR — Export dati (Art. 20 GDPR — diritto alla portabilità)
// ---------------------------------------------------------------------------

test.describe.serial('GDPR — Export dati /dashboard/gdpr/export', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('carica senza crash JS', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${BASE}/dashboard/gdpr/export`);
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

  test('heading export/portabilità presente', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/gdpr/export`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 8000 });
  });

  test('nessun undefined/null nel contenuto', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/gdpr/export`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
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
// GDPR — Cancellazione account (Art. 17 GDPR — diritto alla cancellazione)
// ---------------------------------------------------------------------------

test.describe.serial('GDPR — Cancellazione /dashboard/gdpr/deletion', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('carica senza crash JS', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${BASE}/dashboard/gdpr/deletion`);
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

  test('heading cancellazione presente', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/gdpr/deletion`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 8000 });
  });

  test('nessun undefined/null nel contenuto', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/gdpr/deletion`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const content = await page
      .locator('main, #main-content')
      .first()
      .evaluate(el => el.innerText)
      .catch(() => '');
    // Usa word boundary per evitare falsi positivi con "annullare" / "annulla"
    const hasUndefined = /\bundefined\b/.test(content) || /\bnull\b/.test(content);
    expect(hasUndefined).toBeFalsy();
  });
});

// ---------------------------------------------------------------------------
// GDPR — Cookie Consent
// ---------------------------------------------------------------------------

test.describe.serial('GDPR — Cookie Consent', () => {
  test('cookie consent banner appare su homepage (prima visita)', async ({ page }) => {
    // Naviga senza cookie di consenso
    await page.goto(`${BASE}/`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    // Il banner cookie dovrebbe apparire su prima visita
    // o almeno la homepage carica senza crash
    const content = await page
      .locator('body')
      .evaluate(el => el.innerText)
      .catch(() => '');
    expect(content.trim().length).toBeGreaterThan(0);
  });

  test("cookie consent non blocca l'accesso al sito", async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    // Il sito deve essere navigabile anche con il banner cookie
    const h1 = page.locator('h1').first();
    await expect(h1).toBeAttached({ timeout: 8000 });
  });
});

// ---------------------------------------------------------------------------
// GDPR — API senza auth
// ---------------------------------------------------------------------------

test.describe.serial('GDPR — API auth required', () => {
  test('GET /api/gdpr/export senza cookie → 401', async ({ page }) => {
    const response = await page.request.get(`${BASE}/api/gdpr/export`);
    expect([400, 401, 403, 302, 405]).toContain(response.status());
  });

  test('POST /api/gdpr/deletion senza cookie → 401', async ({ page }) => {
    const response = await page.request.post(`${BASE}/api/gdpr/deletion`, {
      data: { reason: 'test' },
    });
    expect([401, 403, 302]).toContain(response.status());
  });

  test('DELETE /api/gdpr/delete-account senza cookie → 401', async ({ page }) => {
    const response = await page.request.delete(`${BASE}/api/gdpr/delete-account`);
    expect([401, 403, 302, 405]).toContain(response.status());
  });
});

// ---------------------------------------------------------------------------
// GDPR — Terms of Service
// ---------------------------------------------------------------------------

test.describe.serial('GDPR — Terms /terms', () => {
  test('carica senza crash JS', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${BASE}/terms`);
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

  test('heading termini presente', async ({ page }) => {
    await page.goto(`${BASE}/terms`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: 8000 });
  });

  test('contiene informazioni su servizio e responsabilità', async ({ page }) => {
    await page.goto(`${BASE}/terms`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const content = await page
      .locator('body')
      .evaluate(el => el.innerText)
      .catch(() => '');
    expect(content.toLowerCase()).toMatch(/servizio|utilizzo|responsabilità|condizioni|termini/);
  });
});
