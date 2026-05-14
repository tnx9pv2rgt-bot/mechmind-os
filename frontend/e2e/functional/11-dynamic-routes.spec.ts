/**
 * DYNAMIC ROUTES — ID reali e ID inesistenti (404 handling)
 */
import { test, expect } from '@playwright/test';
import { bug, screenshot, goto, waitForContent, collectConsoleErrors } from './helpers';

const REAL_IDS = {
  customer: '28a153c8-065c-4575-b441-806a19a39e95',
  vehicle: 'ae2fbaeb-77b3-41fe-a83c-02fc8bf253be',
  workOrder: 'e154cc92-f7b6-45e9-a712-ee46f9f11d1d',
};

const FAKE_UUID = '00000000-0000-0000-0000-000000000001';

test.describe('DYNAMIC ROUTES — Route dinamiche con ID reali', () => {
  test('DYN-01: Customer dettaglio ID reale', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const resp = await page.goto(`/dashboard/customers/${REAL_IDS.customer}`, { waitUntil: 'domcontentloaded' });
    await waitForContent(page);

    if (resp?.status() === 500) {
      bug({ module: 'Customers/Detail', url: `/dashboard/customers/${REAL_IDS.customer}`, action: 'Dettaglio cliente ID reale', expected: 'HTTP 200, scheda cliente', observed: 'HTTP 500', severity: 'CRITICO', reproSteps: [`Vai a /dashboard/customers/${REAL_IDS.customer}`] });
      await screenshot(page, 'bug-dyn-customer-500');
    }

    const critErrors = errors.filter(e => e.includes('TypeError'));
    if (critErrors.length > 0) {
      bug({ module: 'Customers/Detail', url: `/dashboard/customers/${REAL_IDS.customer}`, action: 'JS errors', expected: 'Nessun TypeError', observed: critErrors[0].substring(0, 200), severity: 'ALTO', reproSteps: [`Vai a /dashboard/customers/${REAL_IDS.customer}`, 'Apri console'] });
    }
  });

  test('DYN-02: Vehicle dettaglio ID reale', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const resp = await page.goto(`/dashboard/vehicles/${REAL_IDS.vehicle}`, { waitUntil: 'domcontentloaded' });
    await waitForContent(page);

    if (resp?.status() === 500) {
      bug({ module: 'Vehicles/Detail', url: `/dashboard/vehicles/${REAL_IDS.vehicle}`, action: 'Dettaglio veicolo ID reale', expected: 'HTTP 200, scheda veicolo', observed: 'HTTP 500', severity: 'CRITICO', reproSteps: [`Vai a /dashboard/vehicles/${REAL_IDS.vehicle}`] });
      await screenshot(page, 'bug-dyn-vehicle-500');
    }
  });

  test('DYN-03: Work Order dettaglio ID reale', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const resp = await page.goto(`/dashboard/work-orders/${REAL_IDS.workOrder}`, { waitUntil: 'domcontentloaded' });
    await waitForContent(page);

    if (resp?.status() === 500) {
      bug({ module: 'WorkOrders/Detail', url: `/dashboard/work-orders/${REAL_IDS.workOrder}`, action: 'Dettaglio OdL ID reale', expected: 'HTTP 200, scheda OdL', observed: 'HTTP 500', severity: 'CRITICO', reproSteps: [`Vai a /dashboard/work-orders/${REAL_IDS.workOrder}`] });
      await screenshot(page, 'bug-dyn-workorder-500');
    }
  });
});

test.describe('DYNAMIC ROUTES — 404 handling per ID inesistenti', () => {
  test('DYN-04: Customer ID inesistente → 404 non 500', async ({ page }) => {
    await page.goto(`/dashboard/customers/${FAKE_UUID}`, { waitUntil: 'domcontentloaded' });
    await waitForContent(page);

    const has500 = await page.locator('text=500, h1:has-text("500")').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'Customers/Detail', url: `/dashboard/customers/${FAKE_UUID}`, action: 'Cliente inesistente → 404', expected: 'Pagina 404 o redirect', observed: '500 invece di 404', severity: 'ALTO', reproSteps: [`Vai a /dashboard/customers/UUID-inesistente`] });
      await screenshot(page, 'bug-dyn-customer-404-as-500');
    }
  });

  test('DYN-05: Vehicle ID inesistente → 404 non 500', async ({ page }) => {
    await page.goto(`/dashboard/vehicles/${FAKE_UUID}`, { waitUntil: 'domcontentloaded' });
    await waitForContent(page);

    const has500 = await page.locator('text=500, h1:has-text("500")').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'Vehicles/Detail', url: `/dashboard/vehicles/${FAKE_UUID}`, action: 'Veicolo inesistente → 404', expected: 'Pagina 404 o redirect', observed: '500 invece di 404', severity: 'ALTO', reproSteps: [`Vai a /dashboard/vehicles/UUID-inesistente`] });
      await screenshot(page, 'bug-dyn-vehicle-404-as-500');
    }
  });

  test('DYN-06: Work Order ID inesistente → 404 non 500', async ({ page }) => {
    await page.goto(`/dashboard/work-orders/${FAKE_UUID}`, { waitUntil: 'domcontentloaded' });
    await waitForContent(page);

    const has500 = await page.locator('text=500, h1:has-text("500")').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'WorkOrders/Detail', url: `/dashboard/work-orders/${FAKE_UUID}`, action: 'OdL inesistente → 404', expected: 'Pagina 404 o redirect', observed: '500 invece di 404', severity: 'ALTO', reproSteps: [`Vai a /dashboard/work-orders/UUID-inesistente`] });
      await screenshot(page, 'bug-dyn-wo-404-as-500');
    }
  });

  test('DYN-07: Invoice ID inesistente → 404 non 500', async ({ page }) => {
    await page.goto(`/dashboard/invoices/${FAKE_UUID}`, { waitUntil: 'domcontentloaded' });
    await waitForContent(page);

    const has500 = await page.locator('text=500, h1:has-text("500")').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'Invoices/Detail', url: `/dashboard/invoices/${FAKE_UUID}`, action: 'Fattura inesistente → 404', expected: 'Pagina 404 o redirect', observed: '500 invece di 404', severity: 'ALTO', reproSteps: [`Vai a /dashboard/invoices/UUID-inesistente`] });
      await screenshot(page, 'bug-dyn-invoice-404-as-500');
    }
  });

  test('DYN-08: Booking ID inesistente → 404 non 500', async ({ page }) => {
    await page.goto(`/dashboard/bookings/${FAKE_UUID}`, { waitUntil: 'domcontentloaded' });
    await waitForContent(page);

    const has500 = await page.locator('text=500, h1:has-text("500")').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'Bookings/Detail', url: `/dashboard/bookings/${FAKE_UUID}`, action: 'Prenotazione inesistente → 404', expected: 'Pagina 404 o redirect', observed: '500 invece di 404', severity: 'ALTO', reproSteps: [`Vai a /dashboard/bookings/UUID-inesistente`] });
      await screenshot(page, 'bug-dyn-booking-404-as-500');
    }
  });
});

test.describe('DYNAMIC ROUTES — Navigazione e breadcrumb', () => {
  test('DYN-09: Customer edit page carica', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const resp = await page.goto(`/dashboard/customers/${REAL_IDS.customer}/edit`, { waitUntil: 'domcontentloaded' });
    await waitForContent(page);

    if (resp?.status() === 500) {
      bug({ module: 'Customers/Edit', url: `/dashboard/customers/${REAL_IDS.customer}/edit`, action: 'Edit cliente', expected: 'Form edit cliente', observed: 'HTTP 500', severity: 'CRITICO', reproSteps: [`Vai a /dashboard/customers/${REAL_IDS.customer}/edit`] });
      await screenshot(page, 'bug-dyn-customer-edit-500');
    }

    const critErrors = errors.filter(e => e.includes('TypeError'));
    if (critErrors.length > 0) {
      bug({ module: 'Customers/Edit', url: `/dashboard/customers/${REAL_IDS.customer}/edit`, action: 'JS errors', expected: 'Nessun TypeError', observed: critErrors[0].substring(0, 200), severity: 'ALTO', reproSteps: [`Vai a /dashboard/customers/${REAL_IDS.customer}/edit`, 'Apri console'] });
    }
  });
});
