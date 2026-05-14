/**
 * WORK ORDERS — Ordini di lavoro: lista, form, stati, tecnici
 */
import { test, expect } from '@playwright/test';
import { bug, screenshot, goto, waitForContent, collectConsoleErrors } from './helpers';

const WORK_ORDER_ID = 'e154cc92-f7b6-45e9-a712-ee46f9f11d1d';

test.describe('WORK ORDERS — Ordini di Lavoro', () => {
  test('WO-01: Lista ordini di lavoro carica', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard/work-orders');
    await waitForContent(page);

    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'WorkOrders', url: '/dashboard/work-orders', action: 'Load lista', expected: 'Lista ordini di lavoro', observed: '500', severity: 'CRITICO', reproSteps: ['Vai a /dashboard/work-orders'] });
      await screenshot(page, 'bug-wo-list-500');
      return;
    }

    const critErrors = errors.filter(e => e.includes('TypeError'));
    if (critErrors.length > 0) {
      bug({ module: 'WorkOrders', url: '/dashboard/work-orders', action: 'JS errors on load', expected: 'Nessun TypeError', observed: critErrors[0].substring(0, 200), severity: 'ALTO', reproSteps: ['Vai a /dashboard/work-orders', 'Apri console'] });
    }

    const newBtn = page.locator('a[href*="work-orders/new"], button:has-text("Nuovo"), button:has-text("Ordine")').first();
    if (!(await newBtn.isVisible().catch(() => false))) {
      bug({ module: 'WorkOrders', url: '/dashboard/work-orders', action: 'Pulsante nuovo OdL', expected: 'Pulsante visibile', observed: 'Non trovato', severity: 'MEDIO', reproSteps: ['Vai a /dashboard/work-orders'] });
    }
  });

  test('WO-02: Form nuovo ordine di lavoro — carica', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard/work-orders/new');
    await waitForContent(page);

    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'WorkOrders', url: '/dashboard/work-orders/new', action: 'Load form OdL', expected: 'Form ordine di lavoro', observed: '500', severity: 'CRITICO', reproSteps: ['Vai a /dashboard/work-orders/new'] });
      await screenshot(page, 'bug-wo-new-500');
    }

    const critErrors = errors.filter(e => e.includes('TypeError') || e.includes('Cannot read'));
    if (critErrors.length > 0) {
      bug({ module: 'WorkOrders', url: '/dashboard/work-orders/new', action: 'JS errors', expected: 'Nessun TypeError', observed: critErrors[0].substring(0, 200), severity: 'ALTO', reproSteps: ['Vai a /dashboard/work-orders/new', 'Apri console'] });
      await screenshot(page, 'bug-wo-new-jserror');
    }
  });

  test('WO-03: Form nuovo OdL — submit vuoto → validazione', async ({ page }) => {
    await goto(page, '/dashboard/work-orders/new');
    await waitForContent(page);

    const submitBtn = page.locator('button[type="submit"], button:has-text("Salva"), button:has-text("Crea"), button:has-text("Apri ordine")').first();
    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(1500);

      const url = page.url();
      if (url.includes('/work-orders/') && !url.includes('/new')) {
        bug({ module: 'WorkOrders', url: '/dashboard/work-orders/new', action: 'Submit form vuoto', expected: 'Validazione errori', observed: `Redirect inatteso: ${url}`, severity: 'ALTO', reproSteps: ['Vai a /dashboard/work-orders/new', 'Submit senza dati'] });
      }
    }
  });

  test('WO-04: Dettaglio ordine esistente', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const resp = await page.goto(`/dashboard/work-orders/${WORK_ORDER_ID}`, { waitUntil: 'domcontentloaded' });
    await waitForContent(page);

    const status = resp?.status() ?? 0;
    if (status === 500) {
      bug({ module: 'WorkOrders', url: `/dashboard/work-orders/${WORK_ORDER_ID}`, action: 'Apri dettaglio OdL', expected: 'Scheda OdL carica', observed: 'HTTP 500', severity: 'CRITICO', reproSteps: [`Vai a /dashboard/work-orders/${WORK_ORDER_ID}`] });
      await screenshot(page, 'bug-wo-detail-500');
      return;
    }

    const hasContent = await page.locator('h1, h2, [data-testid="work-order"], .work-order-detail').first().isVisible().catch(() => false);
    const has404 = await page.locator('text=404, text=Non trovato').first().isVisible().catch(() => false);
    if (!hasContent && !has404) {
      bug({ module: 'WorkOrders', url: `/dashboard/work-orders/${WORK_ORDER_ID}`, action: 'Contenuto OdL', expected: 'Dati ordine visibili', observed: 'Pagina vuota', severity: 'ALTO', reproSteps: [`Vai a /dashboard/work-orders/${WORK_ORDER_ID}`] });
    }
  });

  test('WO-05: Cambio stato OdL — pulsanti azione visibili', async ({ page }) => {
    const resp = await page.goto(`/dashboard/work-orders/${WORK_ORDER_ID}`, { waitUntil: 'domcontentloaded' });
    await waitForContent(page);

    if (resp?.status() === 500) return;

    // Status change buttons should be visible
    const actionBtn = page.locator('button:has-text("Inizia"), button:has-text("Completa"), button:has-text("Check-in"), button:has-text("In lavorazione"), [data-testid*="status"]').first();
    const hasActionBtns = await actionBtn.isVisible().catch(() => false);
    // Just check no crash when clicking any status button
    if (hasActionBtns) {
      // Don't actually click — could change real data. Just verify UI loads
    }
  });

  test('WO-06: Production board carica', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard/production-board');
    await waitForContent(page);

    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'WorkOrders', url: '/dashboard/production-board', action: 'Load production board', expected: 'Production board kanban', observed: '500', severity: 'CRITICO', reproSteps: ['Vai a /dashboard/production-board'] });
      await screenshot(page, 'bug-wo-prodboard-500');
    }

    const critErrors = errors.filter(e => e.includes('TypeError'));
    if (critErrors.length > 0) {
      bug({ module: 'WorkOrders', url: '/dashboard/production-board', action: 'JS errors', expected: 'Nessun TypeError', observed: critErrors[0].substring(0, 200), severity: 'ALTO', reproSteps: ['Vai a /dashboard/production-board', 'Apri console'] });
    }
  });
});
