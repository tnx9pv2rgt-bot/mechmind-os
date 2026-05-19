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

async function getFirstPartId(page: Page): Promise<string | null> {
  await page.goto(`${BASE}/dashboard/parts`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);
  // Try link first (parts might use links in rows)
  const link = page.locator('a[href*="/dashboard/parts/"]').first();
  const linkExists = await link.isVisible().catch(() => false);
  if (linkExists) {
    const href = await link.getAttribute('href');
    const match = href?.match(/\/parts\/([^/?#]+)/);
    return match ? match[1] : null;
  }
  // Fallback: button
  const viewBtn = page.locator('button', { hasText: /visualizza|dettagl/i }).first();
  const btnExists = await viewBtn.isVisible().catch(() => false);
  if (!btnExists) return null;
  await Promise.all([
    page.waitForURL(/\/dashboard\/parts\/[^/?#]+/, { timeout: 10000, waitUntil: 'commit' }),
    viewBtn.click(),
  ]);
  const url = page.url();
  const match = url.match(/\/parts\/([^/?#]+)/);
  return match ? match[1] : null;
}

// ---------------------------------------------------------------------------
// LISTA RICAMBI
// ---------------------------------------------------------------------------

test.describe.serial('RICAMBI /dashboard/parts', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('carica senza errori JS critici', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${BASE}/dashboard/parts`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const critical = errors.filter(
      e => !e.includes('ResizeObserver') && !e.includes('hydrat') && !e.includes('Warning')
    );
    expect(critical).toHaveLength(0);
  });

  test('heading "Ricambi" presente', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/parts`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const heading = page.locator('h1', { hasText: /^Ricambi/i });
    await expect(heading).toBeVisible({ timeout: 8000 });
  });

  test('bottone "Nuovo Ricambio" naviga a /parts/new', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/parts`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const btn = page.locator('button', { hasText: /nuovo ricambio/i }).first();
    await expect(btn).toBeVisible({ timeout: 8000 });
    await Promise.all([
      page.waitForURL(/\/dashboard\/parts\/new/, { timeout: 10000, waitUntil: 'commit' }),
      btn.click(),
    ]);
    expect(page.url()).toMatch(/\/parts\/new/);
  });

  test('campo ricerca ricambi presente', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/parts`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const search = page.locator('[aria-label="Cerca ricambi"]');
    await expect(search).toBeVisible({ timeout: 8000 });
    await search.fill('brembo');
    await expect(search).toHaveValue('brembo');
  });

  test('stats card "Ricambi Totali" presente', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/parts`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    const cnt = await page.locator('text=Ricambi Totali').count();
    expect(cnt).toBeGreaterThan(0);
  });

  test('nessun undefined/null nel contenuto', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/parts`);
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
// NUOVO RICAMBIO
// ---------------------------------------------------------------------------

test.describe.serial('NUOVO RICAMBIO /dashboard/parts/new', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard/parts/new`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('heading "Nuovo Ricambio" presente', async ({ page }) => {
    const heading = page.locator('h1', { hasText: /nuovo ricambio/i });
    await expect(heading).toBeVisible({ timeout: 8000 });
  });

  test('breadcrumb con link "Ricambi" presente', async ({ page }) => {
    const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]');
    await expect(breadcrumb).toBeVisible({ timeout: 8000 });
    const link = breadcrumb.locator('a', { hasText: /ricambi/i }).first();
    await expect(link).toBeVisible();
  });

  test('campo nome presente', async ({ page }) => {
    const nameInput = page.locator('input[placeholder*="Pastiglie freno"]').first();
    await expect(nameInput).toBeVisible({ timeout: 8000 });
  });

  test('campo SKU presente', async ({ page }) => {
    const skuInput = page.locator('input[placeholder*="BRK-PAD"]').first();
    await expect(skuInput).toBeVisible({ timeout: 8000 });
  });

  test('bottone submit presente', async ({ page }) => {
    const submitBtn = page.locator('button[type="submit"]').first();
    await expect(submitBtn).toBeAttached({ timeout: 8000 });
  });
});

// ---------------------------------------------------------------------------
// DETTAGLIO RICAMBIO
// ---------------------------------------------------------------------------

test.describe.serial('DETTAGLIO RICAMBIO /dashboard/parts/[id]', () => {
  let partId: string | null = null;

  test('ottieni ID ricambio dalla lista', async ({ page }) => {
    await login(page);
    partId = await getFirstPartId(page);
    if (!partId) test.skip();
    expect(partId).toBeTruthy();
  });

  test('dettaglio ricambio carica senza crash', async ({ page }) => {
    if (!partId) test.skip();
    await login(page);
    await page.goto(`${BASE}/dashboard/parts/${partId}`);
    await page.waitForLoadState('domcontentloaded');
    await page
      .waitForSelector('.animate-spin', { state: 'hidden', timeout: 10000 })
      .catch(() => {});
    await page.waitForTimeout(2000);
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: 8000 });
  });

  test('nessun undefined/null nel dettaglio', async ({ page }) => {
    if (!partId) test.skip();
    await login(page);
    await page.goto(`${BASE}/dashboard/parts/${partId}`);
    await page.waitForLoadState('domcontentloaded');
    await page
      .waitForSelector('.animate-spin', { state: 'hidden', timeout: 10000 })
      .catch(() => {});
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
// CATALOGO RICAMBI MULTI-FORNITORE
// ---------------------------------------------------------------------------

test.describe.serial('CATALOGO RICAMBI /dashboard/parts/catalog', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('pagina carica senza crash', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${BASE}/dashboard/parts/catalog`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const critical = errors.filter(
      e => !e.includes('ResizeObserver') && !e.includes('hydrat') && !e.includes('Warning')
    );
    expect(critical).toHaveLength(0);
  });

  test('heading "Catalogo Ricambi" presente', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/parts/catalog`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const heading = page.locator('h1', { hasText: /catalogo ricambi/i });
    await expect(heading).toBeVisible({ timeout: 8000 });
  });

  test('nessun undefined/null nel catalogo', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/parts/catalog`);
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
// ORDINE FORNITORE
// ---------------------------------------------------------------------------

test.describe.serial('ORDINE FORNITORE /dashboard/parts/orders/new', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard/parts/orders/new`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('heading "Ordine Fornitore" presente', async ({ page }) => {
    const heading = page.locator('h1', { hasText: /ordine fornitore/i });
    await expect(heading).toBeVisible({ timeout: 8000 });
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
