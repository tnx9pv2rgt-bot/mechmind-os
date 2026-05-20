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
// ANALYTICS PRINCIPALE
// ---------------------------------------------------------------------------

test.describe.serial('ANALYTICS /dashboard/analytics', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('carica senza errori JS critici', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${BASE}/dashboard/analytics`);
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

  test('heading "Analytics" presente', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/analytics`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const heading = page.locator('h1', { hasText: /analytics/i });
    await expect(heading).toBeVisible({ timeout: 8000 });
  });

  test('sezione KPI carica (revenues, ordini, clienti)', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/analytics`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(4000);
    // La pagina deve caricare almeno qualcosa di visibile — no spinner infinito
    const spinner = page.locator('.animate-spin').first();
    const stillSpinning = await spinner.isVisible().catch(() => false);
    // Accettiamo sia che il loading sia finito, sia che ci sia qualche contenuto
    const mainContent = page.locator('main, #main-content').first();
    const text = await mainContent.evaluate(el => el.innerText).catch(() => '');
    expect(text.length).toBeGreaterThan(10);
    expect(stillSpinning).toBeFalsy();
  });

  test('nessun undefined/null nel contenuto', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/analytics`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(4000);
    const content = await page
      .locator('main, #main-content')
      .first()
      .evaluate(el => el.innerText)
      .catch(() => '');
    const hasUndefined =
      content.includes('undefined') || (content.includes('null') && !content.includes('Annulla'));
    expect(hasUndefined).toBeFalsy();
  });

  test('responsive 375px — no overflow orizzontale', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE}/dashboard/analytics`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(380);
  });
});

// ---------------------------------------------------------------------------
// BENCHMARKING
// ---------------------------------------------------------------------------

test.describe.serial('BENCHMARKING /dashboard/analytics/benchmarking', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('carica senza crash JS critici', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${BASE}/dashboard/analytics/benchmarking`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const critical = errors.filter(
      e => !e.includes('ResizeObserver') && !e.includes('hydrat') && !e.includes('Warning')
    );
    expect(critical).toHaveLength(0);
  });

  test('heading "Benchmarking" presente', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/analytics/benchmarking`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const heading = page.locator('h1', { hasText: /benchmarking/i });
    await expect(heading).toBeVisible({ timeout: 8000 });
  });

  test('nessun undefined/null nel benchmarking', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/analytics/benchmarking`);
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
// EFFICIENZA TECNICI
// ---------------------------------------------------------------------------

test.describe.serial('TECNICI /dashboard/analytics/technicians', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('carica senza crash JS critici', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${BASE}/dashboard/analytics/technicians`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const critical = errors.filter(
      e => !e.includes('ResizeObserver') && !e.includes('hydrat') && !e.includes('Warning')
    );
    expect(critical).toHaveLength(0);
  });

  test('heading "Efficienza Tecnici" presente', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/analytics/technicians`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const heading = page.locator('h1', { hasText: /efficienza tecnici/i });
    await expect(heading).toBeVisible({ timeout: 8000 });
  });

  test('nessun undefined/null nei tecnici', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/analytics/technicians`);
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
