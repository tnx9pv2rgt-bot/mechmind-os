import { test, expect, type Page } from '@playwright/test';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';

async function login(page: Page) {
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
// MANUTENZIONE PREVENTIVA
// ---------------------------------------------------------------------------

test.describe.serial('MANUTENZIONE /dashboard/maintenance', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('carica senza errori JS critici', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${BASE}/dashboard/maintenance`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const critical = errors.filter(
      e => !e.includes('ResizeObserver') && !e.includes('hydrat') && !e.includes('Warning')
    );
    expect(critical).toHaveLength(0);
  });

  test('heading "Manutenzione Preventiva" presente', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/maintenance`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const heading = page.locator('h1', { hasText: /manutenzione preventiva/i });
    await expect(heading).toBeVisible({ timeout: 8000 });
  });

  test('nessun undefined/null nel contenuto', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/maintenance`);
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
    await page.goto(`${BASE}/dashboard/maintenance`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(380);
  });
});

// ---------------------------------------------------------------------------
// TEMPLATE LAVORO (Canned Jobs)
// ---------------------------------------------------------------------------

test.describe.serial('TEMPLATE LAVORO /dashboard/canned-jobs', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('carica senza crash JS critici', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${BASE}/dashboard/canned-jobs`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const critical = errors.filter(
      e => !e.includes('ResizeObserver') && !e.includes('hydrat') && !e.includes('Warning')
    );
    expect(critical).toHaveLength(0);
  });

  test('heading "Template Lavoro" presente', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/canned-jobs`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const heading = page.locator('h1', { hasText: /template lavoro/i });
    await expect(heading).toBeVisible({ timeout: 8000 });
  });

  test('nessun undefined/null nel contenuto', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/canned-jobs`);
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
});

// ---------------------------------------------------------------------------
// DIAGNOSTICA AI
// ---------------------------------------------------------------------------

test.describe.serial('DIAGNOSTICA AI /dashboard/diagnostics/ai', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('carica senza crash JS critici', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${BASE}/dashboard/diagnostics/ai`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const critical = errors.filter(
      e => !e.includes('ResizeObserver') && !e.includes('hydrat') && !e.includes('Warning')
    );
    expect(critical).toHaveLength(0);
  });

  test('heading "Diagnostica AI" presente', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/diagnostics/ai`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const heading = page.locator('h1', { hasText: /diagnostica ai/i });
    await expect(heading).toBeVisible({ timeout: 8000 });
  });

  test('nessun undefined/null nel contenuto', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/diagnostics/ai`);
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
});

// ---------------------------------------------------------------------------
// GARANZIE API — verifica che le route API esistano (light check)
// ---------------------------------------------------------------------------

test.describe('GARANZIE API', () => {
  test('GET /api/warranties risponde (non 404)', async ({ page }) => {
    await login(page);
    const response = await page.request.get(`${BASE}/api/warranties`);
    // Può essere 200 (lista vuota) o 401 (non auth, ma non 404)
    expect(response.status()).not.toBe(404);
  });
});
