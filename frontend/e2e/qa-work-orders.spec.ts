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

async function getFirstWorkOrderId(page: Page): Promise<string | null> {
  await page.goto(`${BASE}/dashboard/work-orders`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);
  const viewBtn = page.locator('button', { hasText: /visualizza/i }).first();
  const exists = await viewBtn.isVisible().catch(() => false);
  if (!exists) return null;
  await Promise.all([
    page.waitForURL(/\/dashboard\/work-orders\/[^/?#]+/, { timeout: 10000, waitUntil: 'commit' }),
    viewBtn.click(),
  ]);
  const url = page.url();
  const match = url.match(/\/work-orders\/([^/?#]+)/);
  return match ? match[1] : null;
}

async function getFirstInspectionId(page: Page): Promise<string | null> {
  await page.goto(`${BASE}/dashboard/inspections`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);
  const viewBtn = page.locator('button', { hasText: /visualizza/i }).first();
  const exists = await viewBtn.isVisible().catch(() => false);
  if (!exists) return null;
  await Promise.all([
    page.waitForURL(/\/dashboard\/inspections\/[^/?#]+/, { timeout: 10000, waitUntil: 'commit' }),
    viewBtn.click(),
  ]);
  const url = page.url();
  const match = url.match(/\/inspections\/([^/?#]+)/);
  return match ? match[1] : null;
}

// ---------------------------------------------------------------------------
// ORDINI DI LAVORO — Lista
// ---------------------------------------------------------------------------

test.describe.serial('ORDINI DI LAVORO /dashboard/work-orders', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('carica senza errori JS critici', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${BASE}/dashboard/work-orders`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const critical = errors.filter(
      e => !e.includes('ResizeObserver') && !e.includes('hydrat') && !e.includes('Warning')
    );
    expect(critical).toHaveLength(0);
  });

  test('heading "Ordini di Lavoro" presente', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/work-orders`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const heading = page.locator('h1', { hasText: /ordini di lavoro/i });
    await expect(heading).toBeVisible({ timeout: 8000 });
  });

  test('bottone "Nuovo OdL" naviga a /work-orders/new', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/work-orders`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const btn = page.locator('button', { hasText: /nuovo odl/i }).first();
    await expect(btn).toBeVisible({ timeout: 8000 });
    await Promise.all([
      page.waitForURL(/\/dashboard\/work-orders\/new/, { timeout: 10000, waitUntil: 'commit' }),
      btn.click(),
    ]);
    expect(page.url()).toMatch(/\/work-orders\/new/);
  });

  test('stats cards presenti (Totale OdL, Aperti, In Lavorazione, Completati)', async ({
    page,
  }) => {
    await page.goto(`${BASE}/dashboard/work-orders`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    const labels = ['Totale OdL', 'Aperti', 'In Lavorazione', 'Completati'];
    for (const label of labels) {
      const cnt = await page.locator(`text=${label}`).count();
      expect(cnt).toBeGreaterThan(0);
    }
  });

  test('campo ricerca e filtro stato presenti', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/work-orders`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const search = page.locator('[aria-label="Cerca ordini di lavoro"]');
    const filter = page.locator('[aria-label="Filtra per stato ordine di lavoro"]');
    await expect(search).toBeVisible({ timeout: 8000 });
    await expect(filter).toBeVisible({ timeout: 8000 });
  });

  test('nessun undefined/null nel contenuto', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/work-orders`);
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
// NUOVO OdL
// ---------------------------------------------------------------------------

test.describe.serial('NUOVO OdL /dashboard/work-orders/new', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard/work-orders/new`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('pagina carica con heading "Nuovo Ordine di Lavoro"', async ({ page }) => {
    const heading = page.locator('h1', { hasText: /nuovo ordine di lavoro/i });
    await expect(heading).toBeVisible({ timeout: 8000 });
  });

  test('ricerca cliente presente', async ({ page }) => {
    const customerSearch = page.locator('input[placeholder*="Cerca per nome"]').first();
    await expect(customerSearch).toBeVisible({ timeout: 8000 });
  });

  test('select veicolo presente', async ({ page }) => {
    const vehicleSelect = page.locator('[aria-label="Veicolo"]');
    await expect(vehicleSelect).toBeAttached({ timeout: 8000 });
  });

  test('bottone submit "Crea" o "Salva" presente', async ({ page }) => {
    const submitBtn = page.locator('button[type="submit"]').first();
    await expect(submitBtn).toBeAttached({ timeout: 8000 });
  });
});

// ---------------------------------------------------------------------------
// DETTAGLIO OdL
// ---------------------------------------------------------------------------

test.describe.serial('DETTAGLIO OdL /dashboard/work-orders/[id]', () => {
  let workOrderId: string | null = null;

  test('ottieni ID OdL dalla lista', async ({ page }) => {
    await login(page);
    workOrderId = await getFirstWorkOrderId(page);
    if (!workOrderId) test.skip();
    expect(workOrderId).toBeTruthy();
  });

  test('dettaglio OdL carica senza crash', async ({ page }) => {
    if (!workOrderId) test.skip();
    await login(page);
    await page.goto(`${BASE}/dashboard/work-orders/${workOrderId}`);
    await page.waitForLoadState('domcontentloaded');
    await page
      .waitForSelector('.animate-spin', { state: 'hidden', timeout: 10000 })
      .catch(() => {});
    await page.waitForTimeout(2000);
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: 8000 });
  });

  test('breadcrumb o link "Ordini di Lavoro" presente', async ({ page }) => {
    if (!workOrderId) test.skip();
    await login(page);
    await page.goto(`${BASE}/dashboard/work-orders/${workOrderId}`);
    await page.waitForLoadState('domcontentloaded');
    await page
      .waitForSelector('.animate-spin', { state: 'hidden', timeout: 10000 })
      .catch(() => {});
    await page.waitForTimeout(2000);
    const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]');
    const linked = page.locator('a', { hasText: /ordini di lavoro/i }).first();
    const breadcrumbExists = await breadcrumb.isVisible().catch(() => false);
    const linkExists = await linked.isVisible().catch(() => false);
    expect(breadcrumbExists || linkExists).toBeTruthy();
  });

  test('nessun undefined/null nel dettaglio', async ({ page }) => {
    if (!workOrderId) test.skip();
    await login(page);
    await page.goto(`${BASE}/dashboard/work-orders/${workOrderId}`);
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
// ISPEZIONI — Lista
// ---------------------------------------------------------------------------

test.describe.serial('ISPEZIONI /dashboard/inspections', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('carica senza errori JS critici', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${BASE}/dashboard/inspections`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const critical = errors.filter(
      e => !e.includes('ResizeObserver') && !e.includes('hydrat') && !e.includes('Warning')
    );
    expect(critical).toHaveLength(0);
  });

  test('heading "Ispezioni" presente', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/inspections`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const heading = page.locator('h1', { hasText: /ispezioni/i });
    await expect(heading).toBeVisible({ timeout: 8000 });
  });

  test('bottone "Nuova Ispezione" naviga a /inspections/new', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/inspections`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const btn = page.locator('button', { hasText: /nuova ispezione/i }).first();
    await expect(btn).toBeVisible({ timeout: 8000 });
    await Promise.all([
      page.waitForURL(/\/dashboard\/inspections\/new/, { timeout: 10000, waitUntil: 'commit' }),
      btn.click(),
    ]);
    expect(page.url()).toMatch(/\/inspections\/new/);
  });

  test('stats cards ispezioni presenti', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/inspections`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    const labels = ['Totale Ispezioni', 'Critiche', 'Gravità Alta', 'Tutto OK'];
    let found = 0;
    for (const label of labels) {
      const cnt = await page.locator(`text=${label}`).count();
      if (cnt > 0) found++;
    }
    expect(found).toBeGreaterThanOrEqual(2);
  });

  test('nessun undefined/null nel contenuto', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/inspections`);
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
// NUOVA ISPEZIONE
// ---------------------------------------------------------------------------

test.describe.serial('NUOVA ISPEZIONE /dashboard/inspections/new', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard/inspections/new`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('pagina carica con heading "Nuova Ispezione"', async ({ page }) => {
    const heading = page.locator('h1', { hasText: /nuova ispezione/i });
    await expect(heading).toBeVisible({ timeout: 8000 });
  });

  test('breadcrumb con link "Ispezioni" presente', async ({ page }) => {
    const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]');
    await expect(breadcrumb).toBeVisible({ timeout: 8000 });
    const link = breadcrumb.locator('a', { hasText: /ispezioni/i }).first();
    await expect(link).toBeVisible();
  });

  test('form carica senza crash', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.waitForTimeout(1000);
    const critical = errors.filter(
      e => !e.includes('ResizeObserver') && !e.includes('hydrat') && !e.includes('Warning')
    );
    expect(critical).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// DETTAGLIO ISPEZIONE
// ---------------------------------------------------------------------------

test.describe.serial('DETTAGLIO ISPEZIONE /dashboard/inspections/[id]', () => {
  let inspectionId: string | null = null;

  test('ottieni ID ispezione dalla lista', async ({ page }) => {
    await login(page);
    inspectionId = await getFirstInspectionId(page);
    if (!inspectionId) test.skip();
    expect(inspectionId).toBeTruthy();
  });

  test('dettaglio ispezione carica senza crash', async ({ page }) => {
    if (!inspectionId) test.skip();
    await login(page);
    await page.goto(`${BASE}/dashboard/inspections/${inspectionId}`);
    await page.waitForLoadState('domcontentloaded');
    await page
      .waitForSelector('.animate-spin', { state: 'hidden', timeout: 10000 })
      .catch(() => {});
    await page.waitForTimeout(2000);
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: 8000 });
  });

  test('nessun undefined/null nel dettaglio ispezione', async ({ page }) => {
    if (!inspectionId) test.skip();
    await login(page);
    await page.goto(`${BASE}/dashboard/inspections/${inspectionId}`);
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
