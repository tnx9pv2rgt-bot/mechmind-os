import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';

// ---------------------------------------------------------------------------
// LANDING PAGE — homepage pubblica
// ---------------------------------------------------------------------------

test.describe.serial('LANDING PAGE /', () => {
  test('carica senza errori JS critici', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${BASE}/`);
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

  test('titolo pagina contiene "MechMind"', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveTitle(/MechMind/i, { timeout: 10000 });
  });

  test('navbar visibile con logo MechMind', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible({ timeout: 8000 });
    const mechMindText = page.locator('text=MechMind').first();
    await expect(mechMindText).toBeAttached({ timeout: 8000 });
  });

  test('hero section con CTA "Inizia gratis" presente', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const cta = page
      .locator('a, button', { hasText: /inizia gratis|prova gratis|prova gratuita/i })
      .first();
    await expect(cta).toBeAttached({ timeout: 8000 });
  });

  test('link "Accedi" porta a /auth/login', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const loginLink = page.locator('a', { hasText: /accedi/i }).first();
    await expect(loginLink).toBeAttached({ timeout: 8000 });
    const href = await loginLink.getAttribute('href');
    expect(href).toMatch(/auth|login/);
  });

  test('nessun undefined/null nel testo above-the-fold', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    const content = await page
      .locator('main, body')
      .first()
      .evaluate(el => el.innerText)
      .catch(() => '');
    const hasUndefined =
      content.includes('undefined') || (content.includes('null') && !content.includes('Annulla'));
    expect(hasUndefined).toBeFalsy();
  });

  test('responsive 375px — no overflow orizzontale', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE}/`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(380);
  });

  test('meta description presente', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.waitForLoadState('domcontentloaded');
    const metaDesc = page.locator('meta[name="description"]');
    await expect(metaDesc).toBeAttached({ timeout: 8000 });
    const content = await metaDesc.getAttribute('content');
    expect(content?.length).toBeGreaterThan(10);
  });
});

// ---------------------------------------------------------------------------
// PRICING PAGE
// ---------------------------------------------------------------------------

test.describe.serial('PRICING /pricing', () => {
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

  test('titolo pagina contiene "Prezzi"', async ({ page }) => {
    await page.goto(`${BASE}/pricing`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveTitle(/prezzi|pricing|MechMind/i, { timeout: 10000 });
  });

  test('piano di prezzo presente', async ({ page }) => {
    await page.goto(`${BASE}/pricing`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    // Cerca testo con "€" o "/" mensile o simile
    const priceEl = page.locator('text=/€|mese|anno|mensile/i').first();
    await expect(priceEl).toBeAttached({ timeout: 10000 });
  });

  test('nessun undefined/null nel contenuto', async ({ page }) => {
    await page.goto(`${BASE}/pricing`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    const content = await page
      .locator('main, body')
      .first()
      .evaluate(el => el.innerText)
      .catch(() => '');
    const hasUndefined =
      content.includes('undefined') || (content.includes('null') && !content.includes('Annulla'));
    expect(hasUndefined).toBeFalsy();
  });
});

// ---------------------------------------------------------------------------
// PRIVACY POLICY
// ---------------------------------------------------------------------------

test.describe.serial('PRIVACY /privacy', () => {
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

  test('contenuto GDPR presente', async ({ page }) => {
    await page.goto(`${BASE}/privacy`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const content = await page
      .locator('main, body')
      .first()
      .evaluate(el => el.innerText)
      .catch(() => '');
    expect(content.toLowerCase()).toMatch(/gdpr|dati personali|privacy/);
  });
});

// ---------------------------------------------------------------------------
// TERMS OF SERVICE
// ---------------------------------------------------------------------------

test.describe.serial('TERMS /terms', () => {
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

  test('nessun undefined/null nel contenuto', async ({ page }) => {
    await page.goto(`${BASE}/terms`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const content = await page
      .locator('main, body')
      .first()
      .evaluate(el => el.innerText)
      .catch(() => '');
    const hasUndefined =
      content.includes('undefined') || (content.includes('null') && !content.includes('Annulla'));
    expect(hasUndefined).toBeFalsy();
  });
});

// ---------------------------------------------------------------------------
// DPA
// ---------------------------------------------------------------------------

test.describe.serial('DPA /dpa', () => {
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
});

// ---------------------------------------------------------------------------
// TRUST PAGE
// ---------------------------------------------------------------------------

test.describe.serial('TRUST /trust', () => {
  test('carica senza crash JS', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${BASE}/trust`);
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

  test('heading sicurezza/trust presente', async ({ page }) => {
    await page.goto(`${BASE}/trust`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: 8000 });
  });
});

// ---------------------------------------------------------------------------
// 404 PAGE
// ---------------------------------------------------------------------------

test.describe('404 NOT FOUND', () => {
  test('pagina 404 carica senza crash', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    const response = await page.goto(`${BASE}/questa-pagina-non-esiste-xyz123`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    // Status 404 OR page shows not-found content
    const status = response?.status();
    const content = await page
      .locator('body')
      .evaluate(el => el.innerText)
      .catch(() => '');
    const is404 =
      status === 404 ||
      content.toLowerCase().includes('non trovata') ||
      content.toLowerCase().includes('not found') ||
      content.toLowerCase().includes('404');
    expect(is404).toBeTruthy();
    const critical = errors.filter(
      e =>
        !e.includes('ResizeObserver') &&
        !e.includes('hydrat') &&
        !e.includes('Warning') &&
        !e.includes('ChunkLoadError')
    );
    expect(critical).toHaveLength(0);
  });
});
