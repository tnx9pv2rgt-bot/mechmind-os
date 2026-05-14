/**
 * ESTIMATES & PARTS — Preventivi e Ricambi
 */
import { test, expect } from '@playwright/test';
import { bug, screenshot, goto, waitForContent, collectConsoleErrors } from './helpers';

test.describe('ESTIMATES — Preventivi', () => {
  test('EST-01: Lista preventivi carica', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard/estimates');
    await waitForContent(page);

    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'Estimates', url: '/dashboard/estimates', action: 'Load lista preventivi', expected: 'Lista preventivi', observed: '500', severity: 'CRITICO', reproSteps: ['Vai a /dashboard/estimates'] });
      await screenshot(page, 'bug-est-list-500');
      return;
    }

    const newBtn = page.locator('a[href*="estimates/new"], button:has-text("Nuovo"), button:has-text("Preventivo")').first();
    if (!(await newBtn.isVisible().catch(() => false))) {
      bug({ module: 'Estimates', url: '/dashboard/estimates', action: 'Pulsante nuovo preventivo', expected: 'Pulsante visibile', observed: 'Non trovato', severity: 'MEDIO', reproSteps: ['Vai a /dashboard/estimates'] });
    }
  });

  test('EST-02: Form nuovo preventivo — carica', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard/estimates/new');
    await waitForContent(page);

    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'Estimates', url: '/dashboard/estimates/new', action: 'Load form preventivo', expected: 'Form preventivo', observed: '500', severity: 'CRITICO', reproSteps: ['Vai a /dashboard/estimates/new'] });
      await screenshot(page, 'bug-est-new-500');
    }

    const critErrors = errors.filter(e => e.includes('TypeError'));
    if (critErrors.length > 0) {
      bug({ module: 'Estimates', url: '/dashboard/estimates/new', action: 'JS errors', expected: 'Nessun TypeError', observed: critErrors[0].substring(0, 200), severity: 'ALTO', reproSteps: ['Vai a /dashboard/estimates/new', 'Apri console'] });
    }
  });

  test('EST-03: Form preventivo — submit vuoto → validazione', async ({ page }) => {
    await goto(page, '/dashboard/estimates/new');
    await waitForContent(page);

    const submitBtn = page.locator('button[type="submit"], button:has-text("Salva"), button:has-text("Crea preventivo")').first();
    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(1500);
      const url = page.url();
      if (url.includes('/estimates/') && !url.includes('/new')) {
        bug({ module: 'Estimates', url: '/dashboard/estimates/new', action: 'Submit form vuoto', expected: 'Validazione errori', observed: `Redirect: ${url}`, severity: 'ALTO', reproSteps: ['Vai a /dashboard/estimates/new', 'Submit senza dati'] });
      }
    }
  });
});

test.describe('PARTS — Ricambi', () => {
  test('PAR-01: Lista ricambi carica', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard/parts');
    await waitForContent(page);

    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'Parts', url: '/dashboard/parts', action: 'Load lista ricambi', expected: 'Lista ricambi', observed: '500', severity: 'CRITICO', reproSteps: ['Vai a /dashboard/parts'] });
      await screenshot(page, 'bug-parts-list-500');
    }
  });

  test('PAR-02: Catalogo ricambi carica', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard/parts/catalog');
    await waitForContent(page);

    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'Parts', url: '/dashboard/parts/catalog', action: 'Load catalogo ricambi', expected: 'Catalogo ricambi', observed: '500', severity: 'CRITICO', reproSteps: ['Vai a /dashboard/parts/catalog'] });
      await screenshot(page, 'bug-parts-catalog-500');
    }
  });

  test('PAR-03: Form nuovo ricambio — carica', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard/parts/new');
    await waitForContent(page);

    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'Parts', url: '/dashboard/parts/new', action: 'Load form ricambio', expected: 'Form ricambio', observed: '500', severity: 'CRITICO', reproSteps: ['Vai a /dashboard/parts/new'] });
      await screenshot(page, 'bug-parts-new-500');
    }
  });

  test('PAR-04: Nuovo ordine ricambi — carica', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard/parts/orders/new');
    await waitForContent(page);

    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'Parts', url: '/dashboard/parts/orders/new', action: 'Load form ordine ricambi', expected: 'Form ordine', observed: '500', severity: 'CRITICO', reproSteps: ['Vai a /dashboard/parts/orders/new'] });
      await screenshot(page, 'bug-parts-order-new-500');
    }
  });
});
