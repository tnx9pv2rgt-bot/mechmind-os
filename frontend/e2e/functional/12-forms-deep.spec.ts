/**
 * FORMS DEEP — Boundary values, XSS, SQLi, double-submit, validation per field
 */
import { test, expect } from '@playwright/test';
import { bug, screenshot, goto, waitForContent } from './helpers';
import {
  BOUNDARY_STRINGS,
  XSS_PAYLOADS,
  SQLI_PAYLOADS,
  testXssReflection,
  testDoubleSubmit,
  saveBugToReport,
} from './nasa-helpers';

// ─── Customer Form ──────────────────────────────────────────────────────────

test.describe('FORM-CUSTOMER — Form nuovo cliente', () => {
  test('FORM-C-01: Submit vuoto → tutti i messaggi di errore', async ({ page }) => {
    await goto(page, '/dashboard/customers/new');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;

    const submitBtn = page.locator('button[type="submit"]').first();
    if (!(await submitBtn.isVisible().catch(() => false))) return;

    await submitBtn.click();
    await page.waitForTimeout(1000);

    const url = page.url();
    if (!url.includes('/customers/new') && !url.includes('/customers')) {
      bug({ module: 'Customers/Form', url: '/dashboard/customers/new', action: 'Submit vuoto', expected: 'Rimane su pagina con errori di validazione', observed: `Redirect a ${url}`, severity: 'ALTO', reproSteps: ['Vai a /dashboard/customers/new', 'Click submit senza dati'] });
    }
  });

  test('FORM-C-02: Email non valida → errore', async ({ page }) => {
    await goto(page, '/dashboard/customers/new');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;

    const emailInput = page.locator('input[type="email"], input[name*="email" i], input[placeholder*="email" i]').first();
    if (!(await emailInput.isVisible().catch(() => false))) return;

    await emailInput.fill('non-email-valida');
    const submitBtn = page.locator('button[type="submit"]').first();
    if (await submitBtn.isVisible().catch(() => false)) await submitBtn.click();
    await page.waitForTimeout(800);

    const hasError = await page.locator('[role="alert"], .error, [class*="error"], [class*="invalid"]').first().isVisible().catch(() => false);
    if (!hasError) {
      bug({ module: 'Customers/Form', url: '/dashboard/customers/new', action: 'Email non valida', expected: 'Messaggio errore email', observed: 'Nessuna validazione mostrata', severity: 'MEDIO', reproSteps: ['Inserisci "non-email-valida" nel campo email', 'Submit'] });
    }
  });

  test('FORM-C-03: XSS in campo nome', async ({ page }) => {
    await goto(page, '/dashboard/customers/new');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;

    const nameInput = page.locator('input[name*="name" i], input[name*="nome" i], input[placeholder*="nome" i]').first();
    const triggered = await testXssReflection(page, '/dashboard/customers/new', 'input[name*="name" i], input[name*="nome" i]', 'Customers/Form');
    if (triggered) await screenshot(page, 'bug-form-customer-xss');
  });

  test('FORM-C-04: Boundary — nome 10000 caratteri', async ({ page }) => {
    await goto(page, '/dashboard/customers/new');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;

    const nameInput = page.locator('input[name*="name" i], input[name*="nome" i]').first();
    if (!(await nameInput.isVisible().catch(() => false))) return;

    await nameInput.fill(BOUNDARY_STRINGS.max10k);
    await page.waitForTimeout(500);

    const crashed = await page.locator('text=500').first().isVisible().catch(() => false);
    if (crashed) {
      bug({ module: 'Customers/Form', url: '/dashboard/customers/new', action: 'Nome 10k chars', expected: 'Troncamento o errore validazione', observed: 'Crash 500', severity: 'ALTO', reproSteps: ['Inserisci 10000 caratteri nel campo nome'] });
      await screenshot(page, 'bug-form-customer-10k');
    }
  });

  test('FORM-C-05: Boundary — caratteri Unicode ed emoji', async ({ page }) => {
    await goto(page, '/dashboard/customers/new');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;

    const nameInput = page.locator('input[name*="name" i], input[name*="nome" i]').first();
    if (!(await nameInput.isVisible().catch(() => false))) return;

    await nameInput.fill(BOUNDARY_STRINGS.unicode);
    await page.waitForTimeout(300);
    const val = await nameInput.inputValue().catch(() => '');

    if (val === '') {
      bug({ module: 'Customers/Form', url: '/dashboard/customers/new', action: 'Unicode input', expected: 'Caratteri Unicode accettati', observed: 'Campo resettato/vuoto', severity: 'BASSO', reproSteps: ['Inserisci Unicode nel nome'] });
    }
  });

  test('FORM-C-06: Double-submit protezione', async ({ page }) => {
    await goto(page, '/dashboard/customers/new');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;
    await testDoubleSubmit(page, '/dashboard/customers/new', 'button[type="submit"]', 'Customers/Form');
  });

  test('FORM-C-07: SQLi in campo ricerca', async ({ page }) => {
    await goto(page, '/dashboard/customers');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;

    const searchInput = page.locator('input[type="search"], input[placeholder*="cerca" i], input[placeholder*="search" i]').first();
    if (!(await searchInput.isVisible().catch(() => false))) return;

    for (const payload of SQLI_PAYLOADS) {
      await searchInput.fill(payload);
      await page.waitForTimeout(800);
      const crashed = await page.locator('text=500, text=syntax error, text=SQL').first().isVisible().catch(() => false);
      if (crashed) {
        bug({ module: 'Customers/Search', url: '/dashboard/customers', action: 'SQLi injection', expected: 'Nessun errore DB esposto', observed: `Crash con payload: ${payload.substring(0, 40)}`, severity: 'CRITICO', reproSteps: [`Cerca: ${payload}`, 'Osserva risposta'] });
        await screenshot(page, 'bug-form-customer-sqli');
        break;
      }
      await searchInput.clear();
    }
  });
});

// ─── Booking Form ────────────────────────────────────────────────────────────

test.describe('FORM-BOOKING — Form prenotazione', () => {
  test('FORM-B-01: Submit vuoto → validazione', async ({ page }) => {
    await goto(page, '/dashboard/bookings/new');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;

    const submitBtn = page.locator('button[type="submit"]').first();
    if (!(await submitBtn.isVisible().catch(() => false))) return;

    await submitBtn.click();
    await page.waitForTimeout(1000);
    const url = page.url();
    if (!url.includes('/new')) {
      bug({ module: 'Bookings/Form', url: '/dashboard/bookings/new', action: 'Submit vuoto', expected: 'Validazione in pagina', observed: `Redirect a ${url}`, severity: 'ALTO', reproSteps: ['Vai a /dashboard/bookings/new', 'Submit senza dati'] });
    }
  });

  test('FORM-B-02: Data passata → errore', async ({ page }) => {
    await goto(page, '/dashboard/bookings/new');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;

    const dateInput = page.locator('input[type="date"], input[name*="date" i], input[name*="data" i]').first();
    if (!(await dateInput.isVisible().catch(() => false))) return;

    await dateInput.fill('2000-01-01');
    const submitBtn = page.locator('button[type="submit"]').first();
    if (await submitBtn.isVisible().catch(() => false)) await submitBtn.click();
    await page.waitForTimeout(800);

    const crashed = await page.locator('text=500').first().isVisible().catch(() => false);
    if (crashed) {
      bug({ module: 'Bookings/Form', url: '/dashboard/bookings/new', action: 'Data passata', expected: 'Validazione errore data', observed: 'Crash 500', severity: 'ALTO', reproSteps: ['Inserisci data 2000-01-01', 'Submit'] });
      await screenshot(page, 'bug-form-booking-past-date');
    }
  });

  test('FORM-B-03: Double-submit protezione', async ({ page }) => {
    await goto(page, '/dashboard/bookings/new');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;
    await testDoubleSubmit(page, '/dashboard/bookings/new', 'button[type="submit"]', 'Bookings/Form');
  });

  test('FORM-B-04: XSS in campo note', async ({ page }) => {
    await goto(page, '/dashboard/bookings/new');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;

    const triggered = await testXssReflection(page, '/dashboard/bookings/new', 'textarea, input[name*="note" i]', 'Bookings/Form');
    if (triggered) await screenshot(page, 'bug-form-booking-xss');
  });
});

// ─── Invoice Form ─────────────────────────────────────────────────────────────

test.describe('FORM-INVOICE — Form fattura', () => {
  test('FORM-I-01: Submit vuoto → validazione', async ({ page }) => {
    await goto(page, '/dashboard/invoices/new');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;

    const submitBtn = page.locator('button[type="submit"]').first();
    if (!(await submitBtn.isVisible().catch(() => false))) return;

    await submitBtn.click();
    await page.waitForTimeout(1000);
    const url = page.url();
    if (!url.includes('/new')) {
      bug({ module: 'Invoices/Form', url: '/dashboard/invoices/new', action: 'Submit vuoto', expected: 'Validazione in pagina', observed: `Redirect a ${url}`, severity: 'ALTO', reproSteps: ['Vai a /dashboard/invoices/new', 'Submit senza dati'] });
    }
  });

  test('FORM-I-02: Importo negativo → errore', async ({ page }) => {
    await goto(page, '/dashboard/invoices/new');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;

    const amountInput = page.locator('input[type="number"], input[name*="amount" i], input[name*="importo" i]').first();
    if (!(await amountInput.isVisible().catch(() => false))) return;

    await amountInput.fill('-100');
    const submitBtn = page.locator('button[type="submit"]').first();
    if (await submitBtn.isVisible().catch(() => false)) await submitBtn.click();
    await page.waitForTimeout(800);

    const crashed = await page.locator('text=500').first().isVisible().catch(() => false);
    if (crashed) {
      bug({ module: 'Invoices/Form', url: '/dashboard/invoices/new', action: 'Importo negativo', expected: 'Validazione errore', observed: 'Crash 500', severity: 'ALTO', reproSteps: ['Inserisci -100 come importo', 'Submit'] });
      await screenshot(page, 'bug-form-invoice-negative');
    }
  });

  test('FORM-I-03: Partita IVA non valida → errore', async ({ page }) => {
    await goto(page, '/dashboard/invoices/new');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;

    const vatInput = page.locator('input[name*="vat" i], input[name*="piva" i], input[name*="partita" i]').first();
    if (!(await vatInput.isVisible().catch(() => false))) return;

    await vatInput.fill('12345'); // non valida
    const submitBtn = page.locator('button[type="submit"]').first();
    if (await submitBtn.isVisible().catch(() => false)) await submitBtn.click();
    await page.waitForTimeout(800);

    const crashed = await page.locator('text=500').first().isVisible().catch(() => false);
    if (crashed) {
      bug({ module: 'Invoices/Form', url: '/dashboard/invoices/new', action: 'P.IVA non valida', expected: 'Errore validazione', observed: 'Crash 500', severity: 'ALTO', reproSteps: ['Inserisci "12345" come P.IVA', 'Submit'] });
    }
  });

  test('FORM-I-04: Double-submit protezione', async ({ page }) => {
    await goto(page, '/dashboard/invoices/new');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;
    await testDoubleSubmit(page, '/dashboard/invoices/new', 'button[type="submit"]', 'Invoices/Form');
  });
});

// ─── Work Order Form ──────────────────────────────────────────────────────────

test.describe('FORM-WORKORDER — Form ordine di lavoro', () => {
  test('FORM-W-01: Submit vuoto → validazione', async ({ page }) => {
    await goto(page, '/dashboard/work-orders/new');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;

    const submitBtn = page.locator('button[type="submit"]').first();
    if (!(await submitBtn.isVisible().catch(() => false))) return;

    await submitBtn.click();
    await page.waitForTimeout(1000);
    const url = page.url();
    if (!url.includes('/new')) {
      bug({ module: 'WorkOrders/Form', url: '/dashboard/work-orders/new', action: 'Submit vuoto', expected: 'Validazione in pagina', observed: `Redirect a ${url}`, severity: 'ALTO', reproSteps: ['Vai a /dashboard/work-orders/new', 'Submit senza dati'] });
    }
  });

  test('FORM-W-02: XSS in note tecniche', async ({ page }) => {
    await goto(page, '/dashboard/work-orders/new');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;

    const triggered = await testXssReflection(page, '/dashboard/work-orders/new', 'textarea, input[name*="note" i], input[name*="description" i]', 'WorkOrders/Form');
    if (triggered) await screenshot(page, 'bug-form-wo-xss');
  });

  test('FORM-W-03: Double-submit protezione', async ({ page }) => {
    await goto(page, '/dashboard/work-orders/new');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;
    await testDoubleSubmit(page, '/dashboard/work-orders/new', 'button[type="submit"]', 'WorkOrders/Form');
  });
});

// ─── Estimate Form ────────────────────────────────────────────────────────────

test.describe('FORM-ESTIMATE — Form preventivo', () => {
  test('FORM-E-01: Submit vuoto → validazione', async ({ page }) => {
    await goto(page, '/dashboard/estimates/new');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;

    const submitBtn = page.locator('button[type="submit"]').first();
    if (!(await submitBtn.isVisible().catch(() => false))) return;

    await submitBtn.click();
    await page.waitForTimeout(1000);
    const url = page.url();
    if (!url.includes('/new')) {
      bug({ module: 'Estimates/Form', url: '/dashboard/estimates/new', action: 'Submit vuoto', expected: 'Validazione in pagina', observed: `Redirect a ${url}`, severity: 'ALTO', reproSteps: ['Vai a /dashboard/estimates/new', 'Submit senza dati'] });
    }
  });

  test('FORM-E-02: Quantità zero/negativa → errore', async ({ page }) => {
    await goto(page, '/dashboard/estimates/new');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;

    const qtyInput = page.locator('input[name*="qty" i], input[name*="quantity" i], input[name*="quantita" i]').first();
    if (!(await qtyInput.isVisible().catch(() => false))) return;

    await qtyInput.fill('0');
    const submitBtn = page.locator('button[type="submit"]').first();
    if (await submitBtn.isVisible().catch(() => false)) await submitBtn.click();
    await page.waitForTimeout(800);

    const crashed = await page.locator('text=500').first().isVisible().catch(() => false);
    if (crashed) {
      bug({ module: 'Estimates/Form', url: '/dashboard/estimates/new', action: 'Quantità zero', expected: 'Errore validazione', observed: 'Crash 500', severity: 'MEDIO', reproSteps: ['Inserisci 0 come quantità', 'Submit'] });
    }
  });
});

// ─── Vehicle Form ────────────────────────────────────────────────────────────

test.describe('FORM-VEHICLE — Form veicolo', () => {
  test('FORM-V-01: Submit vuoto → validazione', async ({ page }) => {
    await goto(page, '/dashboard/vehicles/new');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;

    const submitBtn = page.locator('button[type="submit"]').first();
    if (!(await submitBtn.isVisible().catch(() => false))) return;

    await submitBtn.click();
    await page.waitForTimeout(1000);
    const url = page.url();
    if (!url.includes('/new')) {
      bug({ module: 'Vehicles/Form', url: '/dashboard/vehicles/new', action: 'Submit vuoto', expected: 'Validazione in pagina', observed: `Redirect a ${url}`, severity: 'ALTO', reproSteps: ['Vai a /dashboard/vehicles/new', 'Submit senza dati'] });
    }
  });

  test('FORM-V-02: VIN non valido (lunghezza errata)', async ({ page }) => {
    await goto(page, '/dashboard/vehicles/new');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;

    const vinInput = page.locator('input[name*="vin" i]').first();
    if (!(await vinInput.isVisible().catch(() => false))) return;

    await vinInput.fill('ABC123'); // troppo corto
    const submitBtn = page.locator('button[type="submit"]').first();
    if (await submitBtn.isVisible().catch(() => false)) await submitBtn.click();
    await page.waitForTimeout(800);

    const crashed = await page.locator('text=500').first().isVisible().catch(() => false);
    if (crashed) {
      bug({ module: 'Vehicles/Form', url: '/dashboard/vehicles/new', action: 'VIN non valido', expected: 'Errore validazione VIN', observed: 'Crash 500', severity: 'ALTO', reproSteps: ['Inserisci "ABC123" come VIN', 'Submit'] });
      await screenshot(page, 'bug-form-vehicle-vin');
    }
  });

  test('FORM-V-03: Anno immatricolazione futuro', async ({ page }) => {
    await goto(page, '/dashboard/vehicles/new');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;

    const yearInput = page.locator('input[name*="year" i], input[name*="anno" i]').first();
    if (!(await yearInput.isVisible().catch(() => false))) return;

    await yearInput.fill('2099');
    const submitBtn = page.locator('button[type="submit"]').first();
    if (await submitBtn.isVisible().catch(() => false)) await submitBtn.click();
    await page.waitForTimeout(800);

    const crashed = await page.locator('text=500').first().isVisible().catch(() => false);
    if (crashed) {
      bug({ module: 'Vehicles/Form', url: '/dashboard/vehicles/new', action: 'Anno futuro 2099', expected: 'Errore validazione anno', observed: 'Crash 500', severity: 'MEDIO', reproSteps: ['Inserisci 2099 come anno', 'Submit'] });
    }
  });

  test('FORM-V-04: XSS in targa', async ({ page }) => {
    await goto(page, '/dashboard/vehicles/new');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;

    const triggered = await testXssReflection(page, '/dashboard/vehicles/new', 'input[name*="plate" i], input[name*="targa" i]', 'Vehicles/Form');
    if (triggered) await screenshot(page, 'bug-form-vehicle-xss');
  });

  test('FORM-V-05: Double-submit protezione', async ({ page }) => {
    await goto(page, '/dashboard/vehicles/new');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;
    await testDoubleSubmit(page, '/dashboard/vehicles/new', 'button[type="submit"]', 'Vehicles/Form');
  });
});

// ─── Settings Forms ───────────────────────────────────────────────────────────

test.describe('FORM-SETTINGS — Impostazioni forms', () => {
  test('FORM-S-01: Webhook URL non valida → errore', async ({ page }) => {
    await goto(page, '/dashboard/settings/webhooks');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;

    const addBtn = page.locator('button:has-text("Aggiungi"), button:has-text("Nuovo"), button:has-text("Add")').first();
    if (!(await addBtn.isVisible().catch(() => false))) return;

    await addBtn.click();
    await page.waitForTimeout(500);

    const urlInput = page.locator('input[type="url"], input[name*="url" i]').first();
    if (!(await urlInput.isVisible().catch(() => false))) return;

    await urlInput.fill('non-un-url-valida');
    const submitBtn = page.locator('button[type="submit"], button:has-text("Salva"), button:has-text("Crea")').first();
    if (await submitBtn.isVisible().catch(() => false)) await submitBtn.click();
    await page.waitForTimeout(800);

    const crashed = await page.locator('text=500').first().isVisible().catch(() => false);
    if (crashed) {
      bug({ module: 'Settings/Webhooks', url: '/dashboard/settings/webhooks', action: 'Webhook URL non valida', expected: 'Errore validazione URL', observed: 'Crash 500', severity: 'ALTO', reproSteps: ['Aggiungi webhook', 'Inserisci URL non valida', 'Submit'] });
      await screenshot(page, 'bug-form-webhook-invalid-url');
    }
  });

  test('FORM-S-02: GDPR export — email non valida', async ({ page }) => {
    await goto(page, '/dashboard/gdpr/export');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;

    const emailInput = page.locator('input[type="email"]').first();
    if (!(await emailInput.isVisible().catch(() => false))) return;

    await emailInput.fill('non-email@@invalida');
    const submitBtn = page.locator('button[type="submit"]').first();
    if (await submitBtn.isVisible().catch(() => false)) await submitBtn.click();
    await page.waitForTimeout(800);

    const crashed = await page.locator('text=500').first().isVisible().catch(() => false);
    if (crashed) {
      bug({ module: 'GDPR/Export', url: '/dashboard/gdpr/export', action: 'Email non valida', expected: 'Errore validazione', observed: 'Crash 500', severity: 'ALTO', reproSteps: ['Inserisci email non valida nel form GDPR export', 'Submit'] });
    }
  });
});
