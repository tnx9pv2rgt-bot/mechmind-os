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

const SETTINGS_ROUTES = [
  { path: '/dashboard/settings', heading: /impostazioni/i, name: 'Settings principale' },
  { path: '/dashboard/settings/security', heading: /sicurezza/i, name: 'Sicurezza' },
  { path: '/dashboard/settings/team', heading: /team/i, name: 'Team' },
  { path: '/dashboard/settings/roles', heading: /ruol/i, name: 'Ruoli' },
  { path: '/dashboard/settings/sessions', heading: /session/i, name: 'Sessioni' },
  { path: '/dashboard/settings/webhooks', heading: /webhook/i, name: 'Webhooks' },
  { path: '/dashboard/settings/appearance', heading: /apparenza|tema|aspett/i, name: 'Apparenza' },
  { path: '/dashboard/settings/audit', heading: /audit|log/i, name: 'Audit' },
];

// ---------------------------------------------------------------------------
// SETTINGS PRINCIPALE
// ---------------------------------------------------------------------------

test.describe.serial('IMPOSTAZIONI /dashboard/settings', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('carica senza errori JS critici', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${BASE}/dashboard/settings`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const critical = errors.filter(
      e => !e.includes('ResizeObserver') && !e.includes('hydrat') && !e.includes('Warning')
    );
    expect(critical).toHaveLength(0);
  });

  test('heading "Impostazioni" presente', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/settings`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const heading = page.locator('h1', { hasText: /impostazioni/i });
    await expect(heading).toBeVisible({ timeout: 8000 });
  });

  test('tab Notifiche presente nel DOM', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/settings`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const notifTab = page.locator('button', { hasText: /notifich/i }).first();
    await expect(notifTab).toBeAttached({ timeout: 8000 });
  });

  test('nessun undefined/null nel contenuto', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/settings`);
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
// SICUREZZA
// ---------------------------------------------------------------------------

test.describe.serial('SICUREZZA /dashboard/settings/security', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('carica senza crash', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${BASE}/dashboard/settings/security`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const critical = errors.filter(
      e => !e.includes('ResizeObserver') && !e.includes('hydrat') && !e.includes('Warning')
    );
    expect(critical).toHaveLength(0);
  });

  test('heading "Sicurezza" presente', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/settings/security`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const heading = page.locator('h1', { hasText: /sicurezza/i });
    await expect(heading).toBeVisible({ timeout: 8000 });
  });

  test('nessun undefined/null nel contenuto', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/settings/security`);
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
// TEAM
// ---------------------------------------------------------------------------

test.describe.serial('TEAM /dashboard/settings/team', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('carica senza crash', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${BASE}/dashboard/settings/team`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const critical = errors.filter(
      e => !e.includes('ResizeObserver') && !e.includes('hydrat') && !e.includes('Warning')
    );
    expect(critical).toHaveLength(0);
  });

  test('heading "Team" presente', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/settings/team`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const heading = page.locator('h1', { hasText: /team/i });
    await expect(heading).toBeVisible({ timeout: 8000 });
  });

  test('nessun undefined/null nel contenuto', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/settings/team`);
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
// ALTRE SOTTO-SEZIONI: crash check
// ---------------------------------------------------------------------------

for (const route of SETTINGS_ROUTES.slice(3)) {
  test.describe(`${route.name} ${route.path}`, () => {
    test(`${route.name} carica senza crash`, async ({ page }) => {
      await login(page);
      const errors: string[] = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(`${BASE}${route.path}`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      const critical = errors.filter(
        e => !e.includes('ResizeObserver') && !e.includes('hydrat') && !e.includes('Warning')
      );
      expect(critical).toHaveLength(0);
    });

    test(`${route.name} ha un heading visibile`, async ({ page }) => {
      await login(page);
      await page.goto(`${BASE}${route.path}`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      const heading = page.locator('h1').first();
      await expect(heading).toBeVisible({ timeout: 8000 });
    });
  });
}
