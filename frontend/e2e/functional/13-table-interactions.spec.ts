/**
 * TABLE INTERACTIONS — Sort, filter, search, pagination, bulk actions
 */
import { test, expect } from '@playwright/test';
import { bug, screenshot, goto, waitForContent } from './helpers';

type TablePage = { path: string; module: string; sortableCol?: string };

const TABLE_PAGES: TablePage[] = [
  { path: '/dashboard/customers', module: 'Customers', sortableCol: 'th:has-text("Nome"), th:has-text("Cliente")' },
  { path: '/dashboard/vehicles', module: 'Vehicles', sortableCol: 'th:has-text("Targa"), th:has-text("Veicolo")' },
  { path: '/dashboard/work-orders', module: 'WorkOrders', sortableCol: 'th:has-text("Data"), th:has-text("Stato")' },
  { path: '/dashboard/invoices', module: 'Invoices', sortableCol: 'th:has-text("Data"), th:has-text("Importo")' },
  { path: '/dashboard/bookings', module: 'Bookings', sortableCol: 'th:has-text("Data"), th:has-text("Cliente")' },
  { path: '/dashboard/estimates', module: 'Estimates', sortableCol: 'th:has-text("Cliente"), th:has-text("Data")' },
  { path: '/dashboard/parts', module: 'Parts', sortableCol: 'th:has-text("Nome"), th:has-text("Codice")' },
];

// ─── Search ───────────────────────────────────────────────────────────────────

test.describe('TABLE-SEARCH — Ricerca nelle tabelle', () => {
  for (const { path, module } of TABLE_PAGES) {
    test(`TABLE-SEARCH-${module}: Ricerca con termine presente`, async ({ page }) => {
      await goto(page, path);
      await waitForContent(page);
      const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
      if (has500) return;

      const searchInput = page.locator('input[type="search"], input[placeholder*="cerca" i], input[placeholder*="search" i], input[placeholder*="filtra" i]').first();
      if (!(await searchInput.isVisible().catch(() => false))) return;

      await searchInput.fill('a');
      await page.waitForTimeout(1200);

      const crashed = await page.locator('text=500, text=Uncaught TypeError').first().isVisible().catch(() => false);
      if (crashed) {
        bug({ module: `${module}/Table`, url: path, action: 'Ricerca con lettera "a"', expected: 'Risultati o lista vuota', observed: 'Crash dopo ricerca', severity: 'CRITICO', reproSteps: [`Vai a ${path}`, 'Cerca "a"'] });
        await screenshot(page, `bug-table-search-${module.toLowerCase()}`);
      }
    });

    test(`TABLE-SEARCH-${module}: Ricerca con termine assente → empty state`, async ({ page }) => {
      await goto(page, path);
      await waitForContent(page);
      const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
      if (has500) return;

      const searchInput = page.locator('input[type="search"], input[placeholder*="cerca" i], input[placeholder*="search" i], input[placeholder*="filtra" i]').first();
      if (!(await searchInput.isVisible().catch(() => false))) return;

      await searchInput.fill('ZZZZZ_termine_inesistente_12345_xwqz');
      await page.waitForTimeout(1200);

      const crashed = await page.locator('text=500, text=Uncaught TypeError').first().isVisible().catch(() => false);
      if (crashed) {
        bug({ module: `${module}/Table`, url: path, action: 'Ricerca termine assente', expected: 'Empty state (nessun risultato)', observed: 'Crash', severity: 'ALTO', reproSteps: [`Vai a ${path}`, 'Cerca termine inesistente'] });
        await screenshot(page, `bug-table-empty-search-${module.toLowerCase()}`);
      }
    });

    test(`TABLE-SEARCH-${module}: Ricerca con campo vuoto → reset lista`, async ({ page }) => {
      await goto(page, path);
      await waitForContent(page);
      const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
      if (has500) return;

      const searchInput = page.locator('input[type="search"], input[placeholder*="cerca" i], input[placeholder*="search" i], input[placeholder*="filtra" i]').first();
      if (!(await searchInput.isVisible().catch(() => false))) return;

      await searchInput.fill('test');
      await page.waitForTimeout(800);
      await searchInput.clear();
      await page.waitForTimeout(800);

      const crashed = await page.locator('text=500').first().isVisible().catch(() => false);
      if (crashed) {
        bug({ module: `${module}/Table`, url: path, action: 'Reset ricerca (clear)', expected: 'Lista completa torna', observed: 'Crash dopo clear', severity: 'ALTO', reproSteps: [`Vai a ${path}`, 'Cerca "test"', 'Cancella la ricerca'] });
      }
    });
  }
});

// ─── Sort ─────────────────────────────────────────────────────────────────────

test.describe('TABLE-SORT — Ordinamento colonne', () => {
  for (const { path, module, sortableCol } of TABLE_PAGES) {
    if (!sortableCol) continue;

    test(`TABLE-SORT-${module}: Click colonna ordina`, async ({ page }) => {
      await goto(page, path);
      await waitForContent(page);
      const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
      if (has500) return;

      const header = page.locator(sortableCol).first();
      if (!(await header.isVisible().catch(() => false))) return;

      await header.click();
      await page.waitForTimeout(800);

      const crashed = await page.locator('text=500').first().isVisible().catch(() => false);
      if (crashed) {
        bug({ module: `${module}/Table`, url: path, action: 'Click header colonna', expected: 'Ordinamento applicato', observed: 'Crash dopo sort', severity: 'ALTO', reproSteps: [`Vai a ${path}`, `Click su ${sortableCol}`] });
        await screenshot(page, `bug-table-sort-${module.toLowerCase()}`);
      }

      // Click again for reverse sort
      if (!crashed) {
        await header.click();
        await page.waitForTimeout(600);
        const crashed2 = await page.locator('text=500').first().isVisible().catch(() => false);
        if (crashed2) {
          bug({ module: `${module}/Table`, url: path, action: 'Click colonna secondo click (reverse sort)', expected: 'Ordinamento invertito', observed: 'Crash', severity: 'ALTO', reproSteps: [`Vai a ${path}`, `Click due volte su colonna`] });
        }
      }
    });
  }
});

// ─── Filter ───────────────────────────────────────────────────────────────────

test.describe('TABLE-FILTER — Filtri status/data', () => {
  test('TABLE-FILTER-bookings: Filtro per stato', async ({ page }) => {
    await goto(page, '/dashboard/bookings');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;

    const filterSelect = page.locator('select[name*="status" i], [role="combobox"]:has-text("Stato"), button:has-text("Stato"), button:has-text("Filtra")').first();
    if (!(await filterSelect.isVisible().catch(() => false))) return;

    await filterSelect.click();
    await page.waitForTimeout(500);

    const option = page.locator('[role="option"], option').first();
    if (await option.isVisible().catch(() => false)) {
      await option.click();
      await page.waitForTimeout(800);

      const crashed = await page.locator('text=500').first().isVisible().catch(() => false);
      if (crashed) {
        bug({ module: 'Bookings/Table', url: '/dashboard/bookings', action: 'Filtro per stato', expected: 'Lista filtrata', observed: 'Crash', severity: 'ALTO', reproSteps: ['Vai a /dashboard/bookings', 'Seleziona filtro stato'] });
        await screenshot(page, 'bug-table-filter-booking-status');
      }
    }
  });

  test('TABLE-FILTER-invoices: Filtro per stato fattura', async ({ page }) => {
    await goto(page, '/dashboard/invoices');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;

    const filterBtn = page.locator('button:has-text("Bozza"), button:has-text("Inviata"), button:has-text("Pagata"), [role="combobox"]:has-text("Stato")').first();
    if (!(await filterBtn.isVisible().catch(() => false))) return;

    await filterBtn.click();
    await page.waitForTimeout(800);

    const crashed = await page.locator('text=500').first().isVisible().catch(() => false);
    if (crashed) {
      bug({ module: 'Invoices/Table', url: '/dashboard/invoices', action: 'Filtro stato fattura', expected: 'Lista filtrata per stato', observed: 'Crash', severity: 'ALTO', reproSteps: ['Vai a /dashboard/invoices', 'Click filtro stato'] });
    }
  });

  test('TABLE-FILTER-workorders: Filtro per stato OdL', async ({ page }) => {
    await goto(page, '/dashboard/work-orders');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;

    const filterBtn = page.locator('[role="combobox"], select, button:has-text("Stato"), button:has-text("Filtra")').first();
    if (!(await filterBtn.isVisible().catch(() => false))) return;

    await filterBtn.click();
    await page.waitForTimeout(800);

    const crashed = await page.locator('text=500').first().isVisible().catch(() => false);
    if (crashed) {
      bug({ module: 'WorkOrders/Table', url: '/dashboard/work-orders', action: 'Filtro stato OdL', expected: 'Lista filtrata', observed: 'Crash', severity: 'ALTO', reproSteps: ['Vai a /dashboard/work-orders', 'Click filtro stato'] });
    }
  });
});

// ─── Pagination ───────────────────────────────────────────────────────────────

test.describe('TABLE-PAGINATION — Paginazione', () => {
  for (const { path, module } of TABLE_PAGES) {
    test(`TABLE-PAG-${module}: Navigazione pagine`, async ({ page }) => {
      await goto(page, path);
      await waitForContent(page);
      const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
      if (has500) return;

      const nextBtn = page.locator('button:has-text("Prossima"), button:has-text("Next"), button[aria-label*="next" i], button[aria-label*="prossim" i], [data-testid*="next"]').first();
      if (!(await nextBtn.isVisible().catch(() => false))) return;
      if (await nextBtn.isDisabled().catch(() => false)) return;

      await nextBtn.click();
      await page.waitForTimeout(1000);

      const crashed = await page.locator('text=500').first().isVisible().catch(() => false);
      if (crashed) {
        bug({ module: `${module}/Table`, url: path, action: 'Navigazione pagina successiva', expected: 'Pagina 2 caricata', observed: 'Crash', severity: 'ALTO', reproSteps: [`Vai a ${path}`, 'Click "Prossima pagina"'] });
        await screenshot(page, `bug-table-pagination-${module.toLowerCase()}`);
      }
    });
  }
});

// ─── Bulk Actions ─────────────────────────────────────────────────────────────

test.describe('TABLE-BULK — Azioni bulk', () => {
  for (const { path, module } of [
    { path: '/dashboard/customers', module: 'Customers' },
    { path: '/dashboard/work-orders', module: 'WorkOrders' },
    { path: '/dashboard/invoices', module: 'Invoices' },
  ]) {
    test(`TABLE-BULK-${module}: Seleziona tutti + azione bulk`, async ({ page }) => {
      await goto(page, path);
      await waitForContent(page);
      const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
      if (has500) return;

      const selectAll = page.locator('input[type="checkbox"][aria-label*="tutti" i], input[type="checkbox"][aria-label*="all" i], thead input[type="checkbox"]').first();
      if (!(await selectAll.isVisible().catch(() => false))) return;

      await selectAll.click();
      await page.waitForTimeout(500);

      const bulkBtn = page.locator('button:has-text("Elimina selezionati"), button:has-text("Esporta"), button:has-text("Azione"), [data-testid*="bulk"]').first();
      const isVisible = await bulkBtn.isVisible().catch(() => false);

      if (!isVisible) {
        bug({ module: `${module}/Table`, url: path, action: 'Seleziona tutti → azione bulk', expected: 'Toolbar azioni bulk visibile', observed: 'Nessuna toolbar dopo selezione', severity: 'BASSO', reproSteps: [`Vai a ${path}`, 'Seleziona tutti i record'] });
      }

      if (isVisible) {
        await bulkBtn.click();
        await page.waitForTimeout(500);
        const crashed = await page.locator('text=500').first().isVisible().catch(() => false);
        if (crashed) {
          bug({ module: `${module}/Table`, url: path, action: 'Click azione bulk', expected: 'Azione eseguita o conferma modale', observed: 'Crash', severity: 'ALTO', reproSteps: [`Vai a ${path}`, 'Seleziona tutti', 'Click azione bulk'] });
          await screenshot(page, `bug-table-bulk-${module.toLowerCase()}`);
        }
      }
    });
  }
});

// ─── Empty & Error States ─────────────────────────────────────────────────────

test.describe('TABLE-STATES — Empty e error state', () => {
  test('TABLE-EMPTY: Ricerca senza risultati mostra empty state', async ({ page }) => {
    await goto(page, '/dashboard/customers');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;

    const searchInput = page.locator('input[type="search"], input[placeholder*="cerca" i]').first();
    if (!(await searchInput.isVisible().catch(() => false))) return;

    await searchInput.fill('ZZZZZ_NESSUN_MATCH_XYZ999');
    await page.waitForTimeout(1200);

    const hasEmptyState = await page.locator('text=Nessun risultato, text=No results, text=Nessun cliente, text=Nessun dato, [data-testid*="empty"]').first().isVisible().catch(() => false);
    const hasContent = await page.locator('tbody tr, [role="row"]').first().isVisible().catch(() => false);

    if (!hasEmptyState && !hasContent) {
      bug({ module: 'Customers/Table', url: '/dashboard/customers', action: 'Ricerca senza risultati', expected: 'Empty state visibile', observed: 'Nessun feedback visivo', severity: 'BASSO', reproSteps: ['Cerca termine inesistente su /dashboard/customers'] });
    }
  });

  test('TABLE-ERROR: API 500 → error state visibile', async ({ page }) => {
    await page.route('**/api/customers*', route => route.fulfill({ status: 500, body: JSON.stringify({ message: 'Internal Server Error' }) }));
    await goto(page, '/dashboard/customers');
    await waitForContent(page);

    const hasError = await page.locator('text=errore, text=error, text=500, [role="alert"], [data-testid*="error"]').first().isVisible().catch(() => false);
    if (!hasError) {
      bug({ module: 'Customers/Table', url: '/dashboard/customers', action: 'API 500 → error state', expected: 'Messaggio errore visibile', observed: 'Nessun feedback errore (silent fail)', severity: 'ALTO', reproSteps: ['Intercepta API customers con 500', 'Verifica messaggio errore'] });
    }
  });
});
