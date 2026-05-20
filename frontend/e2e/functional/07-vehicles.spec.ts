/**
 * VEHICLES — Veicoli: lista, form, dettaglio, OBD
 */
import { test, expect } from '@playwright/test';
import { bug, screenshot, goto, waitForContent, collectConsoleErrors } from './helpers';

const VEHICLE_ID = 'ae2fbaeb-77b3-41fe-a83c-02fc8bf253be';

test.describe('VEHICLES — Veicoli', () => {
  test('VEH-01: Lista veicoli carica', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard/vehicles');
    await waitForContent(page);

    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'Vehicles', url: '/dashboard/vehicles', action: 'Load lista veicoli', expected: 'Lista veicoli', observed: '500', severity: 'CRITICO', reproSteps: ['Vai a /dashboard/vehicles'] });
      await screenshot(page, 'bug-veh-list-500');
      return;
    }

    const newBtn = page.locator('a[href*="vehicles/new"], button:has-text("Nuovo"), button:has-text("Veicolo"), button:has-text("Aggiungi")').first();
    if (!(await newBtn.isVisible().catch(() => false))) {
      bug({ module: 'Vehicles', url: '/dashboard/vehicles', action: 'Pulsante nuovo veicolo', expected: 'Pulsante visibile', observed: 'Non trovato', severity: 'MEDIO', reproSteps: ['Vai a /dashboard/vehicles'] });
    }
  });

  test('VEH-02: Form nuovo veicolo — carica', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard/vehicles/new');
    await waitForContent(page);

    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'Vehicles', url: '/dashboard/vehicles/new', action: 'Load form veicolo', expected: 'Form inserimento veicolo', observed: '500', severity: 'CRITICO', reproSteps: ['Vai a /dashboard/vehicles/new'] });
      await screenshot(page, 'bug-veh-new-500');
    }

    const critErrors = errors.filter(e => e.includes('TypeError'));
    if (critErrors.length > 0) {
      bug({ module: 'Vehicles', url: '/dashboard/vehicles/new', action: 'JS errors', expected: 'Nessun TypeError', observed: critErrors[0].substring(0, 200), severity: 'ALTO', reproSteps: ['Vai a /dashboard/vehicles/new', 'Apri console'] });
    }
  });

  test('VEH-03: Form nuovo veicolo — submit vuoto → validazione', async ({ page }) => {
    await goto(page, '/dashboard/vehicles/new');
    await waitForContent(page);

    const submitBtn = page.locator('button[type="submit"], button:has-text("Salva"), button:has-text("Aggiungi")').first();
    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(1500);

      const hasError = await page.locator('[class*="error"], [aria-invalid="true"], [role="alert"]').first().isVisible().catch(() => false);
      const url = page.url();
      if (!hasError && url.includes('vehicles/new')) {
        bug({ module: 'Vehicles', url: '/dashboard/vehicles/new', action: 'Submit form vuoto', expected: 'Errori validazione visibili', observed: 'Nessun errore visibile', severity: 'MEDIO', reproSteps: ['Vai a /dashboard/vehicles/new', 'Submit senza dati'] });
      }
    }
  });

  test('VEH-04: Dettaglio veicolo esistente', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const resp = await page.goto(`/dashboard/vehicles/${VEHICLE_ID}`, { waitUntil: 'domcontentloaded' });
    await waitForContent(page);

    const status = resp?.status() ?? 0;
    if (status === 500) {
      bug({ module: 'Vehicles', url: `/dashboard/vehicles/${VEHICLE_ID}`, action: 'Apri dettaglio veicolo', expected: 'Scheda veicolo carica', observed: 'HTTP 500', severity: 'CRITICO', reproSteps: [`Vai a /dashboard/vehicles/${VEHICLE_ID}`] });
      await screenshot(page, 'bug-veh-detail-500');
      return;
    }

    const hasContent = await page.locator('h1, h2, [data-testid*="vehicle"], .vehicle-detail').first().isVisible().catch(() => false);
    const has404 = await page.locator('text=404, text=Non trovato').first().isVisible().catch(() => false);
    if (!hasContent && !has404) {
      bug({ module: 'Vehicles', url: `/dashboard/vehicles/${VEHICLE_ID}`, action: 'Contenuto veicolo', expected: 'Dati veicolo visibili', observed: 'Pagina vuota', severity: 'ALTO', reproSteps: [`Vai a /dashboard/vehicles/${VEHICLE_ID}`] });
    }
  });

  test('VEH-05: OBD Dashboard carica', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard/obd');
    await waitForContent(page);

    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'Vehicles/OBD', url: '/dashboard/obd', action: 'Load OBD dashboard', expected: 'OBD dashboard', observed: '500', severity: 'CRITICO', reproSteps: ['Vai a /dashboard/obd'] });
      await screenshot(page, 'bug-obd-500');
    }
  });

  test('VEH-06: OBD Alerts carica', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard/obd/alerts');
    await waitForContent(page);

    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'Vehicles/OBD', url: '/dashboard/obd/alerts', action: 'Load OBD alerts', expected: 'Lista alert OBD', observed: '500', severity: 'ALTO', reproSteps: ['Vai a /dashboard/obd/alerts'] });
      await screenshot(page, 'bug-obd-alerts-500');
    }
  });

  test('VEH-07: OBD Pair device carica', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard/obd/pair');
    await waitForContent(page);

    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'Vehicles/OBD', url: '/dashboard/obd/pair', action: 'Load OBD pair', expected: 'Pagina abbinamento OBD', observed: '500', severity: 'ALTO', reproSteps: ['Vai a /dashboard/obd/pair'] });
      await screenshot(page, 'bug-obd-pair-500');
    }
  });
});
