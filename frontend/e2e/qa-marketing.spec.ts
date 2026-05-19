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
// CAMPAGNE MARKETING
// ---------------------------------------------------------------------------

test.describe.serial('CAMPAGNE MARKETING /dashboard/marketing', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('carica senza errori JS critici', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${BASE}/dashboard/marketing`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const critical = errors.filter(
      e => !e.includes('ResizeObserver') && !e.includes('hydrat') && !e.includes('Warning')
    );
    expect(critical).toHaveLength(0);
  });

  test('heading "Campagne Marketing" presente', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/marketing`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const heading = page.locator('h1', { hasText: /campagne marketing/i });
    await expect(heading).toBeVisible({ timeout: 8000 });
  });

  test('bottone "Nuova Campagna" naviga a /marketing/new', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/marketing`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const btn = page.locator('button', { hasText: /nuova campagna/i }).first();
    await expect(btn).toBeVisible({ timeout: 8000 });
    await Promise.all([
      page.waitForURL(/\/dashboard\/marketing\/new/, { timeout: 10000, waitUntil: 'commit' }),
      btn.click(),
    ]);
    expect(page.url()).toMatch(/\/marketing\/new/);
  });

  test('campo ricerca campagne presente', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/marketing`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const search = page.locator('[aria-label="Cerca campagne"]');
    await expect(search).toBeVisible({ timeout: 8000 });
  });

  test('nessun undefined/null nel contenuto', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/marketing`);
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
// NUOVA CAMPAGNA
// ---------------------------------------------------------------------------

test.describe.serial('NUOVA CAMPAGNA /dashboard/marketing/new', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard/marketing/new`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('pagina carica senza crash', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.waitForTimeout(1000);
    const critical = errors.filter(
      e => !e.includes('ResizeObserver') && !e.includes('hydrat') && !e.includes('Warning')
    );
    expect(critical).toHaveLength(0);
  });

  test('ha heading visibile', async ({ page }) => {
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: 8000 });
  });

  test('nessun undefined/null nel form', async ({ page }) => {
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
// SEGMENTI CLIENTI
// ---------------------------------------------------------------------------

test.describe.serial('SEGMENTI /dashboard/marketing/segments', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('carica senza crash', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${BASE}/dashboard/marketing/segments`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const critical = errors.filter(
      e => !e.includes('ResizeObserver') && !e.includes('hydrat') && !e.includes('Warning')
    );
    expect(critical).toHaveLength(0);
  });

  test('heading "Segmenti Clienti" presente', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/marketing/segments`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const heading = page.locator('h1', { hasText: /segmenti clienti/i });
    await expect(heading).toBeVisible({ timeout: 8000 });
  });

  test('nessun undefined/null nei segmenti', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/marketing/segments`);
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
// FOLLOW-UP
// ---------------------------------------------------------------------------

test.describe.serial('FOLLOW-UP /dashboard/marketing/follow-ups', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('carica senza crash', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${BASE}/dashboard/marketing/follow-ups`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const critical = errors.filter(
      e => !e.includes('ResizeObserver') && !e.includes('hydrat') && !e.includes('Warning')
    );
    expect(critical).toHaveLength(0);
  });

  test('heading "Follow-up" presente', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/marketing/follow-ups`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const heading = page.locator('h1', { hasText: /follow-up/i });
    await expect(heading).toBeVisible({ timeout: 8000 });
  });

  test('nessun undefined/null nei follow-up', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/marketing/follow-ups`);
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
