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
// SEDI
// ---------------------------------------------------------------------------

test.describe.serial('SEDI /dashboard/locations', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('carica senza errori JS critici', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${BASE}/dashboard/locations`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const critical = errors.filter(
      e => !e.includes('ResizeObserver') && !e.includes('hydrat') && !e.includes('Warning')
    );
    expect(critical).toHaveLength(0);
  });

  test('heading "Sedi" presente', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/locations`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const heading = page.locator('h1', { hasText: /^Sedi/i });
    await expect(heading).toBeVisible({ timeout: 8000 });
  });

  test('nessun undefined/null nel contenuto', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/locations`);
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
// RENTRI
// ---------------------------------------------------------------------------

test.describe.serial('RENTRI /dashboard/rentri', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('carica senza crash JS critici', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${BASE}/dashboard/rentri`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const critical = errors.filter(
      e => !e.includes('ResizeObserver') && !e.includes('hydrat') && !e.includes('Warning')
    );
    expect(critical).toHaveLength(0);
  });

  test('heading "Gestione Rifiuti (RENTRI)" presente', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/rentri`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const heading = page.locator('h1', { hasText: /gestione rifiuti|rentri/i });
    await expect(heading).toBeVisible({ timeout: 8000 });
  });

  test('nessun undefined/null nel contenuto RENTRI', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/rentri`);
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

  test('RENTRI FIR carica senza crash', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${BASE}/dashboard/rentri/fir`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const critical = errors.filter(
      e => !e.includes('ResizeObserver') && !e.includes('hydrat') && !e.includes('Warning')
    );
    expect(critical).toHaveLength(0);
  });

  test('RENTRI entries carica senza crash', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${BASE}/dashboard/rentri/entries`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const critical = errors.filter(
      e => !e.includes('ResizeObserver') && !e.includes('hydrat') && !e.includes('Warning')
    );
    expect(critical).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// OBD
// ---------------------------------------------------------------------------

test.describe.serial('OBD /dashboard/obd', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('carica senza crash JS critici', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${BASE}/dashboard/obd`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const critical = errors.filter(
      e => !e.includes('ResizeObserver') && !e.includes('hydrat') && !e.includes('Warning')
    );
    expect(critical).toHaveLength(0);
  });

  test('heading "Diagnostica OBD" presente', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/obd`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const heading = page.locator('h1', { hasText: /diagnostica obd/i });
    await expect(heading).toBeVisible({ timeout: 8000 });
  });

  test('nessun undefined/null nel contenuto OBD', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/obd`);
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

  test('OBD pair carica senza crash', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${BASE}/dashboard/obd/pair`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const critical = errors.filter(
      e => !e.includes('ResizeObserver') && !e.includes('hydrat') && !e.includes('Warning')
    );
    expect(critical).toHaveLength(0);
  });

  test('OBD alerts carica senza crash', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${BASE}/dashboard/obd/alerts`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const critical = errors.filter(
      e => !e.includes('ResizeObserver') && !e.includes('hydrat') && !e.includes('Warning')
    );
    expect(critical).toHaveLength(0);
  });
});
