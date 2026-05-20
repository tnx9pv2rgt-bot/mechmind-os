/**
 * CUSTOMERS CRUD — Creazione, lista, dettaglio, modifica, validazione
 */
import { test, expect } from '@playwright/test';
import { bug, screenshot, goto, waitForContent, collectConsoleErrors } from './helpers';

const CUSTOMER_NAME = `QA Test ${Date.now()}`;
const CUSTOMER_EMAIL = `qatest_${Date.now()}@test.nexo.it`;
const CUSTOMER_PHONE = '+39 333 1234567';

let createdCustomerId: string | null = null;

test.describe('CUSTOMERS — CRUD Completo', () => {
  test('CUS-01: Lista clienti carica e mostra dati', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard/customers');
    await waitForContent(page);

    // Should have table or empty state
    const hasTable = await page.locator('table, [role="grid"], [data-testid*="customer"]').first().isVisible().catch(() => false);
    const hasEmptyState = await page.locator('text=Nessun cliente, text=No customers, text=Aggiungi').first().isVisible().catch(() => false);
    const hasError = await page.locator('text=500, text=Errore').first().isVisible().catch(() => false);

    if (hasError) {
      bug({ module: 'Customers', url: '/dashboard/customers', action: 'Load customer list', expected: 'Lista clienti o stato vuoto', observed: 'Errore 500 o crash', severity: 'CRITICO', reproSteps: ['Naviga a /dashboard/customers'] });
      await screenshot(page, 'bug-cus-list-500');
    }

    // Check for "Nuovo cliente" or equivalent button
    const newBtn = page.locator('a[href*="customers/new"], button:has-text("Nuovo"), button:has-text("Aggiungi cliente")').first();
    if (!(await newBtn.isVisible().catch(() => false))) {
      bug({ module: 'Customers', url: '/dashboard/customers', action: 'Check pulsante Nuovo', expected: 'Pulsante "Nuovo cliente" visibile', observed: 'Pulsante non trovato', severity: 'ALTO', reproSteps: ['Naviga a /dashboard/customers', 'Cerca pulsante Nuovo'] });
    }
  });

  test('CUS-02: Form nuovo cliente — validazione campi vuoti', async ({ page }) => {
    await goto(page, '/dashboard/customers/new');
    await waitForContent(page);

    // Try submit without filling
    const submitBtn = page.locator('button[type="submit"], button:has-text("Salva"), button:has-text("Crea"), button:has-text("Avanti")').first();
    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(1500);

      const url = page.url();
      // Should NOT have navigated away if form is invalid
      const hasValidationError = await page.locator('[class*="error"], [class*="invalid"], [aria-invalid="true"], [role="alert"]').first().isVisible().catch(() => false);
      if (!hasValidationError && url.includes('customers/new')) {
        // No visible error and still on same page — silent failure
        bug({ module: 'Customers', url: '/dashboard/customers/new', action: 'Submit form vuoto', expected: 'Errori di validazione visibili per campi obbligatori', observed: 'Nessun errore visibile dopo submit senza dati', severity: 'MEDIO', reproSteps: ['Vai a /dashboard/customers/new', 'Click Salva senza compilare', 'Nessun errore mostrato'] });
      }
    }
  });

  test('CUS-03: Form nuovo cliente — wizard step 1 (se esiste)', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard/customers/new/step1');
    await waitForContent(page);

    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'Customers', url: '/dashboard/customers/new/step1', action: 'Load wizard step 1', expected: 'Form step 1', observed: '500 error', severity: 'ALTO', reproSteps: ['Vai a /dashboard/customers/new/step1'] });
    }

    const hasCrash = errors.filter(e => e.includes('TypeError')).length > 0;
    if (hasCrash) {
      bug({ module: 'Customers', url: '/dashboard/customers/new/step1', action: 'Load wizard — JS errors', expected: 'Nessun TypeError', observed: errors.filter(e => e.includes('TypeError'))[0]?.substring(0, 200) ?? '', severity: 'ALTO', reproSteps: ['Vai a /dashboard/customers/new/step1', 'Osserva console'] });
    }
  });

  test('CUS-04: Ricerca clienti funziona', async ({ page }) => {
    await goto(page, '/dashboard/customers');
    await waitForContent(page);

    const searchInput = page.locator('input[type="search"], input[placeholder*="cerca" i], input[placeholder*="search" i], input[placeholder*="ricerca" i]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('test query xyz_nonexistent');
      await page.waitForTimeout(1500); // debounce

      // Results should change
      const emptyResult = await page.locator('text=Nessun risultato, text=No results, text=0 clienti').first().isVisible().catch(() => false);
      // This is expected for a non-existent search term
      // Just verify no crash
      const crashed = await page.locator('text=500, text=Uncaught').first().isVisible().catch(() => false);
      if (crashed) {
        bug({ module: 'Customers', url: '/dashboard/customers', action: 'Ricerca con termine non trovato', expected: 'Lista vuota o messaggio "nessun risultato"', observed: 'Crash o 500 dopo ricerca', severity: 'ALTO', reproSteps: ['Vai a /dashboard/customers', 'Cerca "xyz_nonexistent"', 'Osserva crash'] });
        await screenshot(page, 'bug-cus-search-crash');
      }
    }
  });

  test('CUS-05: Dettaglio cliente esistente (id reale)', async ({ page }) => {
    // Use real customer ID from data setup
    const CUSTOMER_ID = '28a153c8-065c-4575-b441-806a19a39e95';
    const errors = collectConsoleErrors(page);

    const resp = await page.goto(`/dashboard/customers/${CUSTOMER_ID}`, { waitUntil: 'domcontentloaded' });
    await waitForContent(page);

    const status = resp?.status() ?? 0;
    if (status === 500) {
      bug({ module: 'Customers', url: `/dashboard/customers/${CUSTOMER_ID}`, action: 'Apri dettaglio cliente', expected: 'Scheda cliente carica', observed: 'HTTP 500', severity: 'CRITICO', reproSteps: [`Vai a /dashboard/customers/${CUSTOMER_ID}`] });
      await screenshot(page, 'bug-cus-detail-500');
      return;
    }

    // Check content
    const hasContent = await page.locator('h1, h2, [data-testid="customer-name"], .customer-detail').first().isVisible().catch(() => false);
    const has404 = await page.locator('text=404, text=Non trovato, text=Not found').first().isVisible().catch(() => false);

    if (!hasContent && !has404) {
      bug({ module: 'Customers', url: `/dashboard/customers/${CUSTOMER_ID}`, action: 'Dettaglio cliente — contenuto', expected: 'Dati cliente visibili', observed: 'Pagina vuota senza contenuto', severity: 'ALTO', reproSteps: [`Vai a /dashboard/customers/${CUSTOMER_ID}`, 'Osserva pagina'] });
    }

    const critErrors = errors.filter(e => e.includes('TypeError') || e.includes('Cannot read'));
    if (critErrors.length > 0) {
      bug({ module: 'Customers', url: `/dashboard/customers/${CUSTOMER_ID}`, action: 'Dettaglio cliente — JS errors', expected: 'Nessun TypeError', observed: critErrors[0].substring(0, 200), severity: 'ALTO', reproSteps: [`Vai a /dashboard/customers/${CUSTOMER_ID}`, 'Osserva console'] });
      await screenshot(page, 'bug-cus-detail-jserror');
    }
  });

  test('CUS-06: Dettaglio cliente ID inesistente → 404 gestito', async ({ page }) => {
    const FAKE_ID = '00000000-0000-0000-0000-000000099999';
    await page.goto(`/dashboard/customers/${FAKE_ID}`, { waitUntil: 'domcontentloaded' });
    await waitForContent(page);

    const has500 = await page.locator('text=500, h1:has-text("500")').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'Customers', url: `/dashboard/customers/${FAKE_ID}`, action: 'Cliente ID non trovato', expected: 'Pagina 404 o redirect a lista', observed: 'HTTP/page 500 invece di 404', severity: 'ALTO', reproSteps: [`Vai a /dashboard/customers/UUID-non-esistente`] });
      await screenshot(page, 'bug-cus-detail-notfound-500');
    }
  });
});
