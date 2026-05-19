import { test, expect, type Page } from '@playwright/test';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';

async function login(page: Page) {
  await page.goto(`${BASE}/auth/login`);
  await page.waitForLoadState('domcontentloaded');
  // Attende che il form sia idratato (evita form GET fallback)
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

async function getFirstInvoiceId(page: Page): Promise<string | null> {
  await page.goto(`${BASE}/dashboard/invoices`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);
  const viewBtn = page.locator('button', { hasText: /visualizza/i }).first();
  const exists = await viewBtn.isVisible().catch(() => false);
  if (!exists) return null;
  await Promise.all([
    page.waitForURL(/\/dashboard\/invoices\/[^/?#]+/, { timeout: 10000, waitUntil: 'commit' }),
    viewBtn.click(),
  ]);
  const url = page.url();
  const match = url.match(/\/invoices\/([^/?#]+)/);
  return match ? match[1] : null;
}

// ---------------------------------------------------------------------------
// LISTA FATTURE
// ---------------------------------------------------------------------------

test.describe('LISTA FATTURE /dashboard/invoices', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('carica senza errori JS critici', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${BASE}/dashboard/invoices`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const critical = errors.filter(
      e => !e.includes('ResizeObserver') && !e.includes('hydrat') && !e.includes('Warning')
    );
    expect(critical).toHaveLength(0);
  });

  test('heading "Fatture" presente', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/invoices`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const heading = page.locator('h1', { hasText: /^Fatture/i });
    await expect(heading).toBeVisible({ timeout: 8000 });
  });

  test('bottone "Nuova Fattura" naviga a /invoices/new', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/invoices`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const btn = page.locator('button', { hasText: /nuova fattura/i }).first();
    await expect(btn).toBeVisible({ timeout: 8000 });
    await Promise.all([
      page.waitForURL(/\/dashboard\/invoices\/new/, { timeout: 10000, waitUntil: 'commit' }),
      btn.click(),
    ]);
    expect(page.url()).toMatch(/\/invoices\/new/);
  });

  test('stats cards presenti (fatturato, attesa, inviate, pagate)', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/invoices`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    const labels = ['Fatturato Mese', 'In Attesa', 'Inviate', 'Pagate'];
    for (const label of labels) {
      const el = page.locator(`text=${label}`).first();
      await expect(el).toBeAttached({ timeout: 8000 });
    }
  });

  test('campo ricerca fatture presente', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/invoices`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const searchInput = page.locator('[aria-label="Cerca fatture"]');
    await expect(searchInput).toBeVisible({ timeout: 8000 });
    await searchInput.fill('test');
    await expect(searchInput).toHaveValue('test');
  });

  test('filtro stato fattura presente', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/invoices`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const filter = page.locator('[aria-label="Filtra per stato fattura"]');
    await expect(filter).toBeVisible({ timeout: 8000 });
  });

  test('nessun undefined/null visibile nel contenuto', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/invoices`);
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
// NUOVA FATTURA
// ---------------------------------------------------------------------------

test.describe.serial('NUOVA FATTURA /dashboard/invoices/new', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard/invoices/new`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('pagina carica con heading "Nuova Fattura"', async ({ page }) => {
    const heading = page.locator('h1', { hasText: /nuova fattura/i });
    await expect(heading).toBeVisible({ timeout: 8000 });
  });

  test('breadcrumb presente con link "Fatture"', async ({ page }) => {
    const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]');
    await expect(breadcrumb).toBeVisible({ timeout: 8000 });
    const fattureLink = breadcrumb.locator('a', { hasText: /fatture/i }).first();
    await expect(fattureLink).toBeVisible();
  });

  test('campi data emissione e scadenza presenti', async ({ page }) => {
    const issueDate = page.locator('#inv-issue-date');
    const dueDate = page.locator('#inv-due-date');
    await expect(issueDate).toBeVisible({ timeout: 8000 });
    await expect(dueDate).toBeVisible({ timeout: 8000 });
  });

  test('campo ricerca cliente e select cliente presenti', async ({ page }) => {
    const customerSearch = page.locator('[aria-label="Cerca cliente per nome"]');
    await expect(customerSearch).toBeVisible({ timeout: 8000 });
    const customerSelect = page.locator('[aria-label="Seleziona cliente"]');
    await expect(customerSelect).toBeVisible({ timeout: 8000 });
  });

  test('riga fattura con campo descrizione presente', async ({ page }) => {
    const descInput = page.locator('input[placeholder*="Cambio olio"]').first();
    await expect(descInput).toBeVisible({ timeout: 8000 });
  });

  test('"Aggiungi Riga" aggiunge una nuova riga', async ({ page }) => {
    const addBtn = page.locator('button', { hasText: /aggiungi riga/i }).first();
    await expect(addBtn).toBeVisible({ timeout: 8000 });
    const initialRows = await page.locator('input[placeholder*="Cambio olio"]').count();
    await addBtn.click();
    await page.waitForTimeout(500);
    const newRows = await page.locator('input[placeholder*="Cambio olio"]').count();
    expect(newRows).toBeGreaterThan(initialRows);
  });

  test('bottoni "Salva come Bozza" e "Salva e Invia" presenti', async ({ page }) => {
    const draftBtn = page.locator('button', { hasText: /salva come bozza/i });
    const sendBtn = page.locator('button', { hasText: /salva e invia/i });
    await expect(draftBtn).toBeVisible({ timeout: 8000 });
    await expect(sendBtn).toBeVisible({ timeout: 8000 });
  });

  test('ESC naviga back a /invoices', async ({ page }) => {
    await Promise.all([
      page.waitForURL(/\/dashboard\/invoices$/, { timeout: 10000, waitUntil: 'commit' }),
      page.keyboard.press('Escape'),
    ]);
    expect(page.url()).toMatch(/\/invoices$/);
  });
});

// ---------------------------------------------------------------------------
// DETTAGLIO FATTURA
// ---------------------------------------------------------------------------

test.describe.serial('DETTAGLIO FATTURA /dashboard/invoices/[id]', () => {
  let invoiceId: string | null = null;

  test('ottieni ID fattura dalla lista', async ({ page }) => {
    await login(page);
    invoiceId = await getFirstInvoiceId(page);
    // Se non ci sono fatture in lista, il test è skippato con un warning
    if (!invoiceId) {
      test.skip();
    }
    expect(invoiceId).toBeTruthy();
  });

  test('dettaglio carica senza crash', async ({ page }) => {
    if (!invoiceId) test.skip();
    await login(page);
    await page.goto(`${BASE}/dashboard/invoices/${invoiceId}`);
    await page.waitForLoadState('domcontentloaded');
    await page
      .waitForSelector('.animate-spin', { state: 'hidden', timeout: 10000 })
      .catch(() => {});
    await page.waitForTimeout(2000);
    // deve avere heading o numero fattura
    const headingOrNumber = page.locator('h1').first();
    await expect(headingOrNumber).toBeVisible({ timeout: 8000 });
  });

  test('breadcrumb presente', async ({ page }) => {
    if (!invoiceId) test.skip();
    await login(page);
    await page.goto(`${BASE}/dashboard/invoices/${invoiceId}`);
    await page.waitForLoadState('domcontentloaded');
    await page
      .waitForSelector('.animate-spin', { state: 'hidden', timeout: 10000 })
      .catch(() => {});
    await page.waitForTimeout(2000);
    const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]');
    await expect(breadcrumb).toBeVisible({ timeout: 8000 });
  });

  test('tabs Dettagli, Pagamenti, SDI, Storico presenti', async ({ page }) => {
    if (!invoiceId) test.skip();
    await login(page);
    await page.goto(`${BASE}/dashboard/invoices/${invoiceId}`);
    await page.waitForLoadState('domcontentloaded');
    await page
      .waitForSelector('.animate-spin', { state: 'hidden', timeout: 10000 })
      .catch(() => {});
    await page.waitForTimeout(2000);
    const tabLabels = ['Dettagli', 'Pagamenti', 'SDI', 'Storico'];
    for (const label of tabLabels) {
      const tab = page.locator('button', { hasText: label }).first();
      await expect(tab).toBeAttached({ timeout: 8000 });
    }
  });

  test('click tab Pagamenti → contenuto cambia', async ({ page }) => {
    if (!invoiceId) test.skip();
    await login(page);
    await page.goto(`${BASE}/dashboard/invoices/${invoiceId}`);
    await page.waitForLoadState('domcontentloaded');
    await page
      .waitForSelector('.animate-spin', { state: 'hidden', timeout: 10000 })
      .catch(() => {});
    await page.waitForTimeout(2000);
    const paymentsTab = page.locator('button', { hasText: 'Pagamenti' }).first();
    await paymentsTab.click();
    await page.waitForTimeout(500);
    const paymentsContent = page.locator('text=/Storico Pagamenti|Nessun pagamento/i').first();
    await expect(paymentsContent).toBeVisible({ timeout: 8000 });
  });

  test('nessun undefined/null nel dettaglio fattura', async ({ page }) => {
    if (!invoiceId) test.skip();
    await login(page);
    await page.goto(`${BASE}/dashboard/invoices/${invoiceId}`);
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
// PREVENTIVI
// ---------------------------------------------------------------------------

test.describe.serial('PREVENTIVI /dashboard/invoices/quotes', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('pagina carica senza crash', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${BASE}/dashboard/invoices/quotes`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const critical = errors.filter(
      e => !e.includes('ResizeObserver') && !e.includes('hydrat') && !e.includes('Warning')
    );
    expect(critical).toHaveLength(0);
  });

  test('heading "Preventivi" presente', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/invoices/quotes`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const heading = page.locator('h1', { hasText: /preventivi/i });
    await expect(heading).toBeVisible({ timeout: 8000 });
  });

  test('bottone "Nuovo Preventivo" presente', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/invoices/quotes`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const btn = page.locator('button', { hasText: /nuovo preventivo/i }).first();
    await expect(btn).toBeVisible({ timeout: 8000 });
  });

  test('stats cards preventivi presenti', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/invoices/quotes`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    const labels = ['In Bozza', 'Inviati', 'Approvati', 'Rifiutati', 'Scaduti'];
    let visibleCount = 0;
    for (const label of labels) {
      const cnt = await page.locator(`text=${label}`).count();
      if (cnt > 0) visibleCount++;
    }
    expect(visibleCount).toBeGreaterThanOrEqual(3);
  });

  test('campo ricerca preventivi presente', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/invoices/quotes`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const search = page.locator('input[placeholder*="Cerca preventivo"]').first();
    await expect(search).toBeVisible({ timeout: 8000 });
  });

  test('nessun undefined/null nel contenuto', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/invoices/quotes`);
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
// FINANCIAL DASHBOARD
// ---------------------------------------------------------------------------

test.describe('FINANCIAL DASHBOARD /dashboard/invoices/financial', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('pagina carica senza crash', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${BASE}/dashboard/invoices/financial`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const critical = errors.filter(
      e => !e.includes('ResizeObserver') && !e.includes('hydrat') && !e.includes('Warning')
    );
    expect(critical).toHaveLength(0);
  });

  test('contenuto financial o redirect gestito', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/invoices/financial`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    // accetta: rimane su /financial, o redirect a /invoices
    const isOk = currentUrl.includes('/financial') || currentUrl.includes('/invoices');
    expect(isOk).toBeTruthy();
  });
});
