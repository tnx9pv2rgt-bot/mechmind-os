/**
 * INVOICES — Fatture: lista, form, stati, note di credito
 */
import { test, expect } from '@playwright/test';
import { bug, screenshot, goto, waitForContent, collectConsoleErrors } from './helpers';

const INVOICE_ID = 'real-test-id'; // Will be discovered dynamically

test.describe('INVOICES — Fatturazione', () => {
  test('INV-01: Lista fatture carica', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard/invoices');
    await waitForContent(page);

    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'Invoices', url: '/dashboard/invoices', action: 'Load lista fatture', expected: 'Lista fatture', observed: '500', severity: 'CRITICO', reproSteps: ['Vai a /dashboard/invoices'] });
      await screenshot(page, 'bug-inv-list-500');
      return;
    }

    const newBtn = page.locator('a[href*="invoices/new"], button:has-text("Nuova"), button:has-text("Fattura")').first();
    if (!(await newBtn.isVisible().catch(() => false))) {
      bug({ module: 'Invoices', url: '/dashboard/invoices', action: 'Pulsante nuova fattura', expected: 'Pulsante visibile', observed: 'Non trovato', severity: 'MEDIO', reproSteps: ['Vai a /dashboard/invoices'] });
    }
  });

  test('INV-02: Form nuova fattura carica', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard/invoices/new');
    await waitForContent(page);

    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'Invoices', url: '/dashboard/invoices/new', action: 'Load form fattura', expected: 'Form fattura', observed: '500', severity: 'CRITICO', reproSteps: ['Vai a /dashboard/invoices/new'] });
      await screenshot(page, 'bug-inv-new-500');
    }

    const critErrors = errors.filter(e => e.includes('TypeError') || e.includes('Cannot read'));
    if (critErrors.length > 0) {
      bug({ module: 'Invoices', url: '/dashboard/invoices/new', action: 'JS errors', expected: 'Nessun TypeError', observed: critErrors[0].substring(0, 200), severity: 'ALTO', reproSteps: ['Vai a /dashboard/invoices/new', 'Apri console'] });
      await screenshot(page, 'bug-inv-new-jserror');
    }
  });

  test('INV-03: Form nuova fattura — submit vuoto → validazione', async ({ page }) => {
    await goto(page, '/dashboard/invoices/new');
    await waitForContent(page);

    const submitBtn = page.locator('button[type="submit"], button:has-text("Salva"), button:has-text("Crea fattura"), button:has-text("Emetti")').first();
    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(1500);

      const url = page.url();
      if (url.includes('/invoices/') && !url.includes('/new')) {
        bug({ module: 'Invoices', url: '/dashboard/invoices/new', action: 'Submit form vuoto', expected: 'Validazione errori', observed: `Redirect inatteso a: ${url}`, severity: 'ALTO', reproSteps: ['Vai a /dashboard/invoices/new', 'Submit senza dati'] });
      }
    }
  });

  test('INV-04: Nuova nota di credito — carica', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard/invoices/credit-note/new');
    await waitForContent(page);

    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'Invoices', url: '/dashboard/invoices/credit-note/new', action: 'Load nota di credito', expected: 'Form nota di credito', observed: '500', severity: 'CRITICO', reproSteps: ['Vai a /dashboard/invoices/credit-note/new'] });
      await screenshot(page, 'bug-inv-credit-500');
    }
  });

  test('INV-05: Pagina financial — carica', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    // This was previously identified as potentially broken
    await goto(page, '/dashboard/invoices/financial');
    await waitForContent(page);

    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'Invoices', url: '/dashboard/invoices/financial', action: 'Load financial page', expected: 'Pagina finanziaria', observed: '500', severity: 'CRITICO', reproSteps: ['Vai a /dashboard/invoices/financial'] });
      await screenshot(page, 'bug-inv-financial-500');
    }
  });

  test('INV-06: Pagina quotes — carica', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    // This was previously identified as potentially broken
    await goto(page, '/dashboard/invoices/quotes');
    await waitForContent(page);

    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'Invoices', url: '/dashboard/invoices/quotes', action: 'Load quotes page', expected: 'Pagina preventivi fiscali', observed: '500', severity: 'CRITICO', reproSteps: ['Vai a /dashboard/invoices/quotes'] });
      await screenshot(page, 'bug-inv-quotes-500');
    }
  });

  test('INV-07: Filtri lista fatture funzionano', async ({ page }) => {
    await goto(page, '/dashboard/invoices');
    await waitForContent(page);

    // Try status filter
    const filterBtn = page.locator('button:has-text("Filtro"), button:has-text("Filter"), select[name*="status"], [role="combobox"]').first();
    if (await filterBtn.isVisible().catch(() => false)) {
      await filterBtn.click().catch(() => {});
      await page.waitForTimeout(500);

      const crashed = await page.locator('text=500, text=Uncaught TypeError').first().isVisible().catch(() => false);
      if (crashed) {
        bug({ module: 'Invoices', url: '/dashboard/invoices', action: 'Apri filtro stato', expected: 'Dropdown filtro aperto', observed: 'Crash o 500', severity: 'ALTO', reproSteps: ['Vai a /dashboard/invoices', 'Click filtro stato'] });
        await screenshot(page, 'bug-inv-filter-crash');
      }
    }
  });
});
