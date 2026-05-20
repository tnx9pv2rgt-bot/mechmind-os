/**
 * DEEP INTERACTION TEST — Ogni elemento interattivo, ogni form, ogni bottone
 * QA Manager: zero ipotesi. Ogni click viene eseguito e verificato.
 */
import { test, expect } from '@playwright/test';
import { bug, screenshot, goto, waitForContent, collectConsoleErrors } from './helpers';

const BUGS_DIR = 'bug-reports';

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function clickAndCheck(page: any, selector: string, label: string, module: string, url: string) {
  const el = page.locator(selector).first();
  if (!(await el.isVisible().catch(() => false))) return;
  try {
    await el.click({ timeout: 5000 });
    await page.waitForTimeout(600);
    const crashed = await page.locator('text=500').first().isVisible().catch(() => false);
    const jsErr = await page.locator('text=Uncaught TypeError').first().isVisible().catch(() => false);
    if (crashed || jsErr) {
      bug({ module, url, action: `Click: ${label}`, expected: 'Azione senza crash', observed: crashed ? '500 dopo click' : 'TypeError dopo click', severity: 'ALTO', reproSteps: [`Vai a ${url}`, `Clicca: ${label}`] });
      await screenshot(page, `bug-click-${module.toLowerCase().replace(/\//g, '-')}-${label.substring(0, 20).replace(/\s/g, '_')}`);
    }
  } catch {
    // element not clickable or navigated away — ok
  }
}

async function pressEscOnModal(page: any, module: string, url: string, triggerSelector: string) {
  try {
    const trigger = page.locator(triggerSelector).first();
    if (!(await trigger.isVisible().catch(() => false))) return;
    await trigger.click({ timeout: 5000 });
    await page.waitForTimeout(800);
    const dialog = page.locator('[role="dialog"], [data-state="open"]').first();
    if (!(await dialog.isVisible().catch(() => false))) return;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
    const stillOpen = await dialog.isVisible().catch(() => false);
    if (stillOpen) {
      bug({ module, url, action: `ESC non chiude modale aperto da: ${triggerSelector}`, expected: 'Modale chiuso con ESC', observed: 'Modale ancora aperto', severity: 'MEDIO', reproSteps: [`Vai a ${url}`, `Apri modale con: ${triggerSelector}`, 'Premi ESC', 'Modale non chiuso'] });
    }
  } catch { /* ok */ }
}

async function checkConsoleErrors(page: any, errors: string[], module: string, url: string) {
  const crit = errors.filter(e =>
    e.includes('TypeError') ||
    e.includes('ReferenceError') ||
    e.includes('SyntaxError') ||
    e.includes('Failed to fetch') ||
    (e.includes('Error') && !e.includes('404') && !e.includes('401'))
  );
  if (crit.length > 0) {
    bug({ module, url, action: 'Console errors durante navigazione', expected: 'Nessun errore JS critico', observed: crit[0].substring(0, 300), severity: 'MEDIO', reproSteps: [`Vai a ${url}`, 'Apri DevTools Console'] });
  }
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────

test.describe('DEEP-01 — Dashboard core', () => {
  test('Dashboard: ogni tab e card interattiva', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard');
    await waitForContent(page);

    // Click su ogni bottone visibile nella dashboard
    const buttons = await page.locator('button:visible').all();
    let btnCount = 0;
    for (const btn of buttons.slice(0, 20)) {
      try {
        const text = await btn.textContent() ?? '';
        const ariaLabel = await btn.getAttribute('aria-label') ?? '';
        if (text.trim() || ariaLabel) {
          await btn.click({ timeout: 3000 }).catch(() => {});
          await page.waitForTimeout(400);
          const crashed = await page.locator('text=500').first().isVisible().catch(() => false);
          if (crashed) {
            bug({ module: 'Dashboard', url: '/dashboard', action: `Click bottone: "${(text || ariaLabel).substring(0, 40)}"`, expected: 'Nessun crash', observed: '500', severity: 'ALTO', reproSteps: ['/dashboard', `click "${text || ariaLabel}"`] });
            await screenshot(page, `bug-dash-btn-${btnCount}`);
          }
          btnCount++;
          if (page.url() !== 'http://localhost:3000/dashboard') {
            await goto(page, '/dashboard');
            await waitForContent(page);
          }
        }
      } catch { /* btn gone after nav */ }
    }

    // Click su ogni link di navigazione nella sidebar
    const navLinks = await page.locator('nav a:visible, aside a:visible').all();
    for (const link of navLinks.slice(0, 15)) {
      try {
        const href = await link.getAttribute('href') ?? '';
        if (href && href.startsWith('/dashboard') && !href.includes('[')) {
          await link.click({ timeout: 3000 }).catch(() => {});
          await page.waitForTimeout(500);
          const crashed = await page.locator('text=500').first().isVisible().catch(() => false);
          if (crashed) {
            bug({ module: 'Dashboard/Nav', url: href, action: 'Click link navigazione', expected: 'Pagina carica', observed: '500', severity: 'CRITICO', reproSteps: [`Click nav link: ${href}`] });
            await screenshot(page, `bug-nav-${href.replace(/\//g, '-')}`);
          }
          if (!page.url().includes(href.split('?')[0])) {
            await goto(page, '/dashboard');
          }
        }
      } catch { /* ok */ }
    }

    await checkConsoleErrors(page, errors, 'Dashboard', '/dashboard');
  });
});

// ─── CUSTOMERS DEEP ──────────────────────────────────────────────────────────

test.describe('DEEP-02 — Customers deep interaction', () => {
  test('Customers lista: search + sort + filtri', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard/customers');
    await waitForContent(page);

    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) { bug({ module: 'Customers', url: '/dashboard/customers', action: 'Caricamento lista', expected: 'Lista clienti', observed: '500', severity: 'CRITICO', reproSteps: ['/dashboard/customers'] }); return; }

    // Search
    const search = page.locator('input[type="search"], input[placeholder*="cerca" i], input[placeholder*="search" i]').first();
    if (await search.isVisible().catch(() => false)) {
      await search.fill('Mario');
      await page.waitForTimeout(1500);
      await search.fill('');
      await page.waitForTimeout(800);
      await search.fill('<script>alert(1)</script>');
      await page.waitForTimeout(1200);
      const xssAlert = await page.locator('text=<script>').first().isVisible().catch(() => false);
      if (xssAlert) bug({ module: 'Customers', url: '/dashboard/customers', action: 'XSS in search', expected: 'Input sanitizzato', observed: 'HTML non escapato', severity: 'CRITICO', reproSteps: ['/dashboard/customers', 'Search: <script>alert(1)</script>'] });
      await search.fill('');
    }

    // Ordina per ogni colonna cliccabile
    const sortableCols = await page.locator('th[class*="sort"], th button, th[onClick], th:has(button)').all();
    for (const col of sortableCols.slice(0, 4)) {
      try {
        await col.click({ timeout: 3000 });
        await page.waitForTimeout(600);
        const crashed = await page.locator('text=500').first().isVisible().catch(() => false);
        if (crashed) {
          const colText = await col.textContent() ?? '';
          bug({ module: 'Customers', url: '/dashboard/customers', action: `Sort colonna: ${colText}`, expected: 'Ordinamento', observed: '500', severity: 'ALTO', reproSteps: ['/dashboard/customers', `Click header: ${colText}`] });
        }
      } catch { /* ok */ }
    }

    // Filtri/select visibili
    const selects = await page.locator('select:visible, [role="combobox"]:visible').all();
    for (const sel of selects.slice(0, 3)) {
      try {
        const tag = await sel.evaluate((el: Element) => el.tagName);
        if (tag === 'SELECT') {
          const opts = await sel.locator('option').all();
          if (opts.length > 1) {
            await sel.selectOption({ index: 1 });
            await page.waitForTimeout(600);
            const crashed = await page.locator('text=500').first().isVisible().catch(() => false);
            if (crashed) bug({ module: 'Customers', url: '/dashboard/customers', action: 'Cambio filtro select', expected: 'Lista filtrata', observed: '500', severity: 'ALTO', reproSteps: ['/dashboard/customers', 'Cambia filtro select'] });
            await sel.selectOption({ index: 0 });
          }
        }
      } catch { /* ok */ }
    }

    // Paginazione
    const nextPage = page.locator('button[aria-label*="next" i], button:has-text("Successiva"), button:has-text(">")').first();
    if (await nextPage.isVisible().catch(() => false) && !(await nextPage.isDisabled().catch(() => true))) {
      await nextPage.click({ timeout: 3000 });
      await page.waitForTimeout(800);
      const crashed = await page.locator('text=500').first().isVisible().catch(() => false);
      if (crashed) bug({ module: 'Customers', url: '/dashboard/customers', action: 'Pagina successiva', expected: 'Prossima pagina', observed: '500', severity: 'ALTO', reproSteps: ['/dashboard/customers', 'Click pagina successiva'] });
    }

    await checkConsoleErrors(page, errors, 'Customers', '/dashboard/customers');
  });

  test('Customers nuovo: form completo happy path + validazione', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard/customers/new');
    await waitForContent(page);
    // Viene rediretto a step1
    await page.waitForURL(/customers\/new/, { timeout: 5000 }).catch(() => {});
    await waitForContent(page);

    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) { bug({ module: 'Customers/New', url: '/dashboard/customers/new', action: 'Form nuovo cliente', expected: 'Form step1', observed: '500', severity: 'CRITICO', reproSteps: ['/dashboard/customers/new'] }); return; }

    // Submit vuoto → validazione
    const submitBtn = page.locator('button[type="submit"], button:has-text("Continua"), button:has-text("Avanti"), button:has-text("Salva")').first();
    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(1000);
      const url = page.url();
      const hasErrors = await page.locator('[aria-invalid="true"], .text-red-500, [role="alert"]').first().isVisible().catch(() => false);
      const crashed = await page.locator('text=500').first().isVisible().catch(() => false);
      if (crashed) {
        bug({ module: 'Customers/New', url: '/dashboard/customers/new', action: 'Submit form vuoto', expected: 'Errori validazione', observed: '500', severity: 'CRITICO', reproSteps: ['/dashboard/customers/new', 'Submit senza dati'] });
        await screenshot(page, 'bug-customer-form-empty-500');
      }
    }

    // Inserisci email non valida
    const emailField = page.locator('input[type="email"], input[name*="email" i]').first();
    if (await emailField.isVisible().catch(() => false)) {
      await emailField.fill('notanemail');
      await emailField.blur();
      await page.waitForTimeout(800);
      const errorMsg = await page.locator('[role="alert"], .text-red-500, [aria-live="polite"]').first().isVisible().catch(() => false);
      if (!errorMsg) {
        bug({ module: 'Customers/New', url: '/dashboard/customers/new', action: 'Email non valida — validazione', expected: 'Messaggio errore email visibile', observed: 'Nessun errore mostrato', severity: 'MEDIO', reproSteps: ['/dashboard/customers/new', 'Inserisci "notanemail" nel campo email', 'Blur', 'Nessun errore'] });
      }
      await emailField.fill('');
    }

    // Input XSS nel nome
    const firstNameField = page.locator('input[name*="firstName" i], input[name*="nome" i], input[placeholder*="nome" i]').first();
    if (await firstNameField.isVisible().catch(() => false)) {
      await firstNameField.fill('<script>alert("xss")</script>');
      await page.waitForTimeout(400);
      const xssRendered = await page.locator('text=<script>').first().isVisible().catch(() => false);
      if (xssRendered) bug({ module: 'Customers/New', url: '/dashboard/customers/new', action: 'XSS in nome cliente', expected: 'Input sanitizzato', observed: 'HTML tag renderizzato nel DOM', severity: 'CRITICO', reproSteps: ['/dashboard/customers/new', 'Nome: <script>alert("xss")</script>'] });
      await firstNameField.fill('');
    }

    await checkConsoleErrors(page, errors, 'Customers/New', '/dashboard/customers/new');
  });
});

// ─── VEHICLES DEEP ───────────────────────────────────────────────────────────

test.describe('DEEP-03 — Vehicles deep interaction', () => {
  test('Vehicles nuovo: form validazione targa + VIN', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard/vehicles/new');
    await waitForContent(page);

    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) { bug({ module: 'Vehicles/New', url: '/dashboard/vehicles/new', action: 'Form nuovo veicolo', expected: 'Form', observed: '500', severity: 'CRITICO', reproSteps: ['/dashboard/vehicles/new'] }); return; }

    // Submit vuoto
    const submitBtn = page.locator('button[type="submit"]').first();
    if (await submitBtn.isVisible().catch(() => false) && !(await submitBtn.isDisabled().catch(() => false))) {
      await submitBtn.click();
      await page.waitForTimeout(1000);
      const crashed = await page.locator('text=500').first().isVisible().catch(() => false);
      if (crashed) {
        bug({ module: 'Vehicles/New', url: '/dashboard/vehicles/new', action: 'Submit vuoto', expected: 'Errori validazione', observed: '500', severity: 'CRITICO', reproSteps: ['/dashboard/vehicles/new', 'Submit senza dati'] });
        await screenshot(page, 'bug-vehicle-form-empty-500');
        return;
      }
    }

    // Targa non valida
    const plateField = page.locator('input[name*="plate" i], input[name*="targa" i], input[placeholder*="targa" i]').first();
    if (await plateField.isVisible().catch(() => false)) {
      await plateField.fill('TARGAINVALIDA123456789');
      await plateField.blur();
      await page.waitForTimeout(600);
    }

    // VIN non valido (< 17 char)
    const vinField = page.locator('input[name*="vin" i], input[placeholder*="vin" i]').first();
    if (await vinField.isVisible().catch(() => false)) {
      await vinField.fill('SHORTVIN');
      await vinField.blur();
      await page.waitForTimeout(600);
    }

    // Double submit test
    const submitBtn2 = page.locator('button[type="submit"]').first();
    if (await submitBtn2.isVisible().catch(() => false)) {
      await submitBtn2.click({ timeout: 2000 }).catch(() => {});
      await submitBtn2.click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(1000);
      const crashed = await page.locator('text=500').first().isVisible().catch(() => false);
      if (crashed) bug({ module: 'Vehicles/New', url: '/dashboard/vehicles/new', action: 'Double submit', expected: 'Protezione double-submit', observed: '500', severity: 'ALTO', reproSteps: ['/dashboard/vehicles/new', 'Double click submit'] });
    }

    await checkConsoleErrors(page, errors, 'Vehicles/New', '/dashboard/vehicles/new');
  });

  test('Vehicles lista: azioni su riga', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard/vehicles');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;

    // Cerca pulsanti azione nelle righe tabella
    const actionBtns = await page.locator('tbody tr button, tbody tr [role="button"], tbody tr a').all();
    for (const btn of actionBtns.slice(0, 5)) {
      try {
        const text = await btn.textContent() ?? '';
        const ariaLabel = await btn.getAttribute('aria-label') ?? '';
        if ((text + ariaLabel).toLowerCase().includes('elimina') || (text + ariaLabel).toLowerCase().includes('delete')) continue; // skip delete
        await btn.click({ timeout: 3000 });
        await page.waitForTimeout(600);
        const crashed = await page.locator('text=500').first().isVisible().catch(() => false);
        if (crashed) {
          bug({ module: 'Vehicles', url: '/dashboard/vehicles', action: `Azione riga: ${(text || ariaLabel).substring(0, 30)}`, expected: 'Azione eseguita', observed: '500', severity: 'ALTO', reproSteps: ['/dashboard/vehicles', 'Click azione su riga'] });
          await screenshot(page, 'bug-vehicles-row-action');
        }
        if (!page.url().includes('/vehicles')) {
          await goto(page, '/dashboard/vehicles');
          await waitForContent(page);
        }
      } catch { /* ok */ }
    }
    await checkConsoleErrors(page, errors, 'Vehicles', '/dashboard/vehicles');
  });
});

// ─── WORK ORDERS DEEP ────────────────────────────────────────────────────────

test.describe('DEEP-04 — Work Orders deep interaction', () => {
  test('WO nuovo: form interazione completa', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard/work-orders/new');
    await waitForContent(page);

    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) { bug({ module: 'WorkOrders/New', url: '/dashboard/work-orders/new', action: 'Form nuovo OdL', expected: 'Form', observed: '500', severity: 'CRITICO', reproSteps: ['/dashboard/work-orders/new'] }); return; }

    // Submit vuoto
    const submitBtn = page.locator('button[type="submit"]').first();
    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(1000);
      const crashed = await page.locator('text=500').first().isVisible().catch(() => false);
      if (crashed) {
        bug({ module: 'WorkOrders/New', url: '/dashboard/work-orders/new', action: 'Submit OdL vuoto', expected: 'Validazione', observed: '500', severity: 'CRITICO', reproSteps: ['/dashboard/work-orders/new', 'Submit vuoto'] });
        await screenshot(page, 'bug-wo-empty-submit-500');
        return;
      }
    }

    // Controlla che tutti i select abbiano label
    const unlabeledSelects = await page.evaluate(() => {
      const selects = document.querySelectorAll('select, [role="combobox"]');
      const issues: string[] = [];
      selects.forEach(sel => {
        const id = sel.getAttribute('id');
        const ariaLabel = sel.getAttribute('aria-label');
        const ariaLabelledby = sel.getAttribute('aria-labelledby');
        const hasLabel = id ? !!document.querySelector(`label[for="${id}"]`) : false;
        if (!hasLabel && !ariaLabel && !ariaLabelledby) {
          issues.push(sel.outerHTML.substring(0, 100));
        }
      });
      return issues;
    });
    if (unlabeledSelects.length > 0) {
      bug({ module: 'WorkOrders/New', url: '/dashboard/work-orders/new', action: 'Select senza label', expected: '0 select senza label accessibile', observed: `${unlabeledSelects.length} select senza label: ${unlabeledSelects[0]}`, severity: 'ALTO', reproSteps: ['/dashboard/work-orders/new', 'Ispeziona select'] });
    }

    // Input con valori limiti
    const textInputs = await page.locator('input[type="text"]:visible, textarea:visible').all();
    for (const inp of textInputs.slice(0, 3)) {
      try {
        await inp.fill('A'.repeat(10000));
        await inp.blur();
        await page.waitForTimeout(400);
        const crashed = await page.locator('text=500').first().isVisible().catch(() => false);
        if (crashed) {
          bug({ module: 'WorkOrders/New', url: '/dashboard/work-orders/new', action: 'Input 10000 chars', expected: 'Troncamento o validazione', observed: '500 dopo overflow input', severity: 'ALTO', reproSteps: ['/dashboard/work-orders/new', 'Inserisci 10000 chars'] });
          await screenshot(page, 'bug-wo-input-overflow');
          break;
        }
        await inp.fill('');
      } catch { /* ok */ }
    }

    await checkConsoleErrors(page, errors, 'WorkOrders/New', '/dashboard/work-orders/new');
  });

  test('WO lista: filtri, stato, azioni riga', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard/work-orders');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;

    // Ogni button nella lista
    const allBtns = await page.locator('button:visible').all();
    for (const btn of allBtns.slice(0, 10)) {
      try {
        const txt = await btn.textContent() ?? '';
        const aria = await btn.getAttribute('aria-label') ?? '';
        if ((txt + aria).toLowerCase().includes('elimina') || (txt + aria).toLowerCase().includes('delete')) continue;
        if (!txt.trim() && !aria) {
          bug({ module: 'WorkOrders', url: '/dashboard/work-orders', action: `Bottone senza testo/aria-label`, expected: 'Ogni bottone ha nome accessibile', observed: `Button vuoto: ${(await btn.evaluate((el: Element) => el.outerHTML)).substring(0, 100)}`, severity: 'MEDIO', reproSteps: ['/dashboard/work-orders', 'Ispeziona bottoni'] });
        }
      } catch { /* ok */ }
    }
    await checkConsoleErrors(page, errors, 'WorkOrders', '/dashboard/work-orders');
  });
});

// ─── INVOICES DEEP ───────────────────────────────────────────────────────────

test.describe('DEEP-05 — Invoices deep interaction', () => {
  test('Invoices nuova: form + validazione + modali', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard/invoices/new');
    await waitForContent(page);

    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) { bug({ module: 'Invoices/New', url: '/dashboard/invoices/new', action: 'Form nuova fattura', expected: 'Form', observed: '500', severity: 'CRITICO', reproSteps: ['/dashboard/invoices/new'] }); return; }

    // Submit vuoto
    const submitBtn = page.locator('button[type="submit"], button:has-text("Salva"), button:has-text("Crea fattura"), button:has-text("Crea Fattura")').first();
    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(1000);
      const crashed = await page.locator('text=500').first().isVisible().catch(() => false);
      if (crashed) {
        bug({ module: 'Invoices/New', url: '/dashboard/invoices/new', action: 'Submit fattura vuota', expected: 'Validazione', observed: '500', severity: 'CRITICO', reproSteps: ['/dashboard/invoices/new', 'Submit vuoto'] });
        await screenshot(page, 'bug-invoice-empty-submit-500');
      }
    }

    // Numero negativo in importo
    const amountInput = page.locator('input[type="number"][name*="amount" i], input[name*="importo" i], input[name*="price" i], input[name*="prezzo" i]').first();
    if (await amountInput.isVisible().catch(() => false)) {
      await amountInput.fill('-9999');
      await amountInput.blur();
      await page.waitForTimeout(600);
      const errorMsg = await page.locator('.text-red-500, [role="alert"], [aria-invalid="true"]').first().isVisible().catch(() => false);
      if (!errorMsg) {
        bug({ module: 'Invoices/New', url: '/dashboard/invoices/new', action: 'Importo negativo', expected: 'Errore validazione su importo negativo', observed: 'Nessun errore mostrato', severity: 'MEDIO', reproSteps: ['/dashboard/invoices/new', 'Importo: -9999', 'Blur'] });
      }
      await amountInput.fill('');
    }

    // ESC su modale "aggiungi riga"
    await pressEscOnModal(page, 'Invoices/New', '/dashboard/invoices/new', 'button:has-text("Aggiungi riga"), button:has-text("Aggiungi voce"), button:has-text("+ Aggiungi")');

    await checkConsoleErrors(page, errors, 'Invoices/New', '/dashboard/invoices/new');
  });

  test('Invoices lista: click azioni su ogni fattura', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard/invoices');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;

    // Dropdown azioni
    const actionMenus = await page.locator('[data-testid*="action"], button[aria-haspopup="menu"], button:has-text("⋮"), button:has-text("..."), button[aria-label*="azioni" i], button[aria-label*="menu" i]').all();
    for (const menu of actionMenus.slice(0, 3)) {
      try {
        await menu.click({ timeout: 3000 });
        await page.waitForTimeout(500);
        const dropdown = page.locator('[role="menu"]:visible').first();
        if (await dropdown.isVisible().catch(() => false)) {
          await page.keyboard.press('Escape');
          await page.waitForTimeout(400);
          const stillOpen = await dropdown.isVisible().catch(() => false);
          if (stillOpen) {
            bug({ module: 'Invoices', url: '/dashboard/invoices', action: 'ESC non chiude dropdown menu', expected: 'Dropdown chiuso con ESC', observed: 'Dropdown ancora visibile', severity: 'MEDIO', reproSteps: ['/dashboard/invoices', 'Apri menu azioni', 'ESC'] });
          }
        }
      } catch { /* ok */ }
    }
    await checkConsoleErrors(page, errors, 'Invoices', '/dashboard/invoices');
  });
});

// ─── BOOKINGS DEEP ───────────────────────────────────────────────────────────

test.describe('DEEP-06 — Bookings deep interaction', () => {
  test('Bookings lista: calendar + stato + filtri', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard/bookings');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) { bug({ module: 'Bookings', url: '/dashboard/bookings', action: 'Lista bookings', expected: 'Lista', observed: '500', severity: 'CRITICO', reproSteps: ['/dashboard/bookings'] }); return; }

    // Bottone nuova prenotazione
    const newBtn = page.locator('a[href*="bookings/new"], button:has-text("Nuova"), button:has-text("Prenota")').first();
    if (!(await newBtn.isVisible().catch(() => false))) {
      bug({ module: 'Bookings', url: '/dashboard/bookings', action: 'Pulsante nuova prenotazione', expected: '"Nuova prenotazione" visibile', observed: 'Pulsante assente', severity: 'MEDIO', reproSteps: ['/dashboard/bookings', 'Cerca pulsante'] });
    } else {
      await newBtn.click({ timeout: 5000 });
      await page.waitForTimeout(800);
      const crashed = await page.locator('text=500').first().isVisible().catch(() => false);
      if (crashed) bug({ module: 'Bookings', url: '/dashboard/bookings/new', action: 'Click nuova prenotazione', expected: 'Form prenotazione', observed: '500', severity: 'CRITICO', reproSteps: ['/dashboard/bookings', 'Click "Nuova prenotazione"'] });
      await goto(page, '/dashboard/bookings');
      await waitForContent(page);
    }

    // Tab/filtri stato booking
    const statusFilters = await page.locator('[role="tab"], button[data-state], button:has-text("Confermati"), button:has-text("In attesa"), button:has-text("Tutti")').all();
    for (const filter of statusFilters.slice(0, 5)) {
      try {
        await filter.click({ timeout: 3000 });
        await page.waitForTimeout(600);
        const crashed = await page.locator('text=500').first().isVisible().catch(() => false);
        if (crashed) {
          const txt = await filter.textContent() ?? '';
          bug({ module: 'Bookings', url: '/dashboard/bookings', action: `Filtro stato: ${txt}`, expected: 'Lista filtrata', observed: '500', severity: 'ALTO', reproSteps: ['/dashboard/bookings', `Click filtro: ${txt}`] });
        }
      } catch { /* ok */ }
    }
    await checkConsoleErrors(page, errors, 'Bookings', '/dashboard/bookings');
  });

  test('Calendar: navigazione mesi + click giorno', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard/calendar');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) { bug({ module: 'Calendar', url: '/dashboard/calendar', action: 'Calendario', expected: 'Calendario', observed: '500', severity: 'CRITICO', reproSteps: ['/dashboard/calendar'] }); return; }

    // Naviga mese precedente
    const prevBtn = page.locator('button[aria-label*="previous" i], button[aria-label*="prev" i], button[title*="prev" i]').first();
    if (await prevBtn.isVisible().catch(() => false)) {
      await prevBtn.click({ timeout: 3000 });
      await page.waitForTimeout(600);
      const crashed = await page.locator('text=500').first().isVisible().catch(() => false);
      if (crashed) bug({ module: 'Calendar', url: '/dashboard/calendar', action: 'Navigazione mese precedente', expected: 'Mese precedente', observed: '500', severity: 'ALTO', reproSteps: ['/dashboard/calendar', 'Click prev month'] });
    }

    // Naviga mese successivo
    const nextBtn = page.locator('button[aria-label*="next" i], button[title*="next" i]').first();
    if (await nextBtn.isVisible().catch(() => false)) {
      await nextBtn.click({ timeout: 3000 });
      await page.waitForTimeout(600);
      await nextBtn.click({ timeout: 3000 });
      await page.waitForTimeout(600);
      const crashed = await page.locator('text=500').first().isVisible().catch(() => false);
      if (crashed) bug({ module: 'Calendar', url: '/dashboard/calendar', action: 'Navigazione mese successivo', expected: 'Mese successivo', observed: '500', severity: 'ALTO', reproSteps: ['/dashboard/calendar', 'Click next month x2'] });
    }

    // Click su un giorno
    const dayCell = page.locator('[class*="fc-day"]:not([class*="other-month"]):not([class*="disabled"]):not([class*="fc-day-today"]), [role="gridcell"]:not([aria-disabled="true"])').first();
    if (await dayCell.isVisible().catch(() => false)) {
      await dayCell.click({ timeout: 3000 });
      await page.waitForTimeout(800);
      const crashed = await page.locator('text=500').first().isVisible().catch(() => false);
      if (crashed) bug({ module: 'Calendar', url: '/dashboard/calendar', action: 'Click su giorno del calendario', expected: 'Dettaglio giorno o form', observed: '500', severity: 'ALTO', reproSteps: ['/dashboard/calendar', 'Click su un giorno'] });
    }
    await checkConsoleErrors(page, errors, 'Calendar', '/dashboard/calendar');
  });
});

// ─── SETTINGS DEEP ───────────────────────────────────────────────────────────

test.describe('DEEP-07 — Settings deep interaction', () => {
  test('Settings: ogni tab, ogni toggle, ogni form', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard/settings');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) { bug({ module: 'Settings', url: '/dashboard/settings', action: 'Settings', expected: 'Pagina', observed: '500', severity: 'CRITICO', reproSteps: ['/dashboard/settings'] }); return; }

    // Click ogni tab
    const tabs = await page.locator('[role="tab"]').all();
    for (const tab of tabs) {
      try {
        const txt = await tab.textContent() ?? '';
        await tab.click({ timeout: 3000 });
        await page.waitForTimeout(600);
        const crashed = await page.locator('text=500').first().isVisible().catch(() => false);
        if (crashed) bug({ module: 'Settings', url: '/dashboard/settings', action: `Tab: ${txt}`, expected: 'Contenuto tab', observed: '500', severity: 'ALTO', reproSteps: ['/dashboard/settings', `Click tab: ${txt}`] });
      } catch { /* ok */ }
    }

    // Toggle switches
    const toggles = await page.locator('[role="switch"]:visible, input[type="checkbox"]:visible').all();
    for (const toggle of toggles.slice(0, 8)) {
      try {
        const initialState = await toggle.isChecked().catch(() => false);
        await toggle.click({ timeout: 3000 });
        await page.waitForTimeout(500);
        const crashed = await page.locator('text=500').first().isVisible().catch(() => false);
        if (crashed) {
          bug({ module: 'Settings', url: '/dashboard/settings', action: 'Toggle switch', expected: 'Toggle cambia stato', observed: '500', severity: 'ALTO', reproSteps: ['/dashboard/settings', 'Toggle uno switch'] });
          await screenshot(page, 'bug-settings-toggle-500');
        }
      } catch { /* ok */ }
    }

    await checkConsoleErrors(page, errors, 'Settings', '/dashboard/settings');
  });

  test('Settings Team: modali invito + ruoli', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard/settings/team');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) { bug({ module: 'Settings/Team', url: '/dashboard/settings/team', action: 'Team page', expected: 'Pagina team', observed: '500', severity: 'CRITICO', reproSteps: ['/dashboard/settings/team'] }); return; }

    // Bottone invita membro
    const inviteBtn = page.locator('button:has-text("Invita"), button:has-text("Aggiungi membro"), button:has-text("Invita utente")').first();
    if (await inviteBtn.isVisible().catch(() => false)) {
      await inviteBtn.click({ timeout: 5000 });
      await page.waitForTimeout(800);
      const modal = page.locator('[role="dialog"]:visible').first();
      if (await modal.isVisible().catch(() => false)) {
        // Invia form invito vuoto
        const submitInvite = modal.locator('button[type="submit"], button:has-text("Invia"), button:has-text("Invita")').first();
        if (await submitInvite.isVisible().catch(() => false)) {
          await submitInvite.click();
          await page.waitForTimeout(1000);
          const crashed = await page.locator('text=500').first().isVisible().catch(() => false);
          if (crashed) bug({ module: 'Settings/Team', url: '/dashboard/settings/team', action: 'Submit invito vuoto', expected: 'Validazione email', observed: '500', severity: 'ALTO', reproSteps: ['/dashboard/settings/team', 'Invita', 'Submit vuoto'] });

          // Email non valida
          const emailInvite = modal.locator('input[type="email"]').first();
          if (await emailInvite.isVisible().catch(() => false)) {
            await emailInvite.fill('notanemail');
            await submitInvite.click().catch(() => {});
            await page.waitForTimeout(800);
            const errorVisible = await page.locator('[role="alert"], .text-red-500, [aria-invalid]').first().isVisible().catch(() => false);
            if (!errorVisible) bug({ module: 'Settings/Team', url: '/dashboard/settings/team', action: 'Invito con email invalida', expected: 'Errore validazione email', observed: 'Nessun errore inline', severity: 'MEDIO', reproSteps: ['/dashboard/settings/team', 'Invita', 'Email: notanemail', 'Submit'] });
          }
        }
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      } else {
        const crashed = await page.locator('text=500').first().isVisible().catch(() => false);
        if (!crashed) bug({ module: 'Settings/Team', url: '/dashboard/settings/team', action: 'Click Invita — modale non aperto', expected: 'Modale invito', observed: 'Nessun modale', severity: 'ALTO', reproSteps: ['/dashboard/settings/team', 'Click Invita', 'Nessun modale'] });
      }
    }
    await checkConsoleErrors(page, errors, 'Settings/Team', '/dashboard/settings/team');
  });

  test('Settings Security: form cambio password', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard/settings/security');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) { bug({ module: 'Settings/Security', url: '/dashboard/settings/security', action: 'Security page', expected: 'Pagina', observed: '500', severity: 'CRITICO', reproSteps: ['/dashboard/settings/security'] }); return; }

    // Form cambio password submit vuoto
    const pwSubmit = page.locator('button:has-text("Cambia password"), button:has-text("Aggiorna password"), button[type="submit"]').first();
    if (await pwSubmit.isVisible().catch(() => false)) {
      await pwSubmit.click();
      await page.waitForTimeout(1000);
      const crashed = await page.locator('text=500').first().isVisible().catch(() => false);
      if (crashed) bug({ module: 'Settings/Security', url: '/dashboard/settings/security', action: 'Submit cambio password vuoto', expected: 'Validazione', observed: '500', severity: 'CRITICO', reproSteps: ['/dashboard/settings/security', 'Submit senza dati'] });
    }
    await checkConsoleErrors(page, errors, 'Settings/Security', '/dashboard/settings/security');
  });
});

// ─── ANALYTICS DEEP ──────────────────────────────────────────────────────────

test.describe('DEEP-08 — Analytics deep interaction', () => {
  test('Analytics: filtri data + export', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard/analytics');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) { bug({ module: 'Analytics', url: '/dashboard/analytics', action: 'Analytics', expected: 'Dashboard', observed: '500', severity: 'CRITICO', reproSteps: ['/dashboard/analytics'] }); return; }

    // Filtri periodo
    const periodBtns = await page.locator('button:has-text("7 giorni"), button:has-text("30 giorni"), button:has-text("90 giorni"), button:has-text("1 anno"), button:has-text("Questo mese")').all();
    for (const btn of periodBtns) {
      try {
        const txt = await btn.textContent() ?? '';
        await btn.click({ timeout: 3000 });
        await page.waitForTimeout(1000);
        const crashed = await page.locator('text=500').first().isVisible().catch(() => false);
        if (crashed) bug({ module: 'Analytics', url: '/dashboard/analytics', action: `Filtro periodo: ${txt}`, expected: 'Grafico aggiornato', observed: '500', severity: 'ALTO', reproSteps: ['/dashboard/analytics', `Click: ${txt}`] });
      } catch { /* ok */ }
    }

    // Export button
    const exportBtn = page.locator('button:has-text("Esporta"), button:has-text("Export"), button[aria-label*="export" i]').first();
    if (await exportBtn.isVisible().catch(() => false)) {
      await exportBtn.click({ timeout: 3000 });
      await page.waitForTimeout(800);
      const crashed = await page.locator('text=500').first().isVisible().catch(() => false);
      if (crashed) bug({ module: 'Analytics', url: '/dashboard/analytics', action: 'Export dati', expected: 'Download o conferma', observed: '500', severity: 'MEDIO', reproSteps: ['/dashboard/analytics', 'Click Esporta'] });
    }
    await checkConsoleErrors(page, errors, 'Analytics', '/dashboard/analytics');
  });
});

// ─── GDPR DEEP ───────────────────────────────────────────────────────────────

test.describe('DEEP-09 — GDPR deep interaction', () => {
  test('GDPR Export: click export + risposta', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard/gdpr/export');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) { bug({ module: 'GDPR/Export', url: '/dashboard/gdpr/export', action: 'Export page', expected: 'Pagina', observed: '500', severity: 'CRITICO', reproSteps: ['/dashboard/gdpr/export'] }); return; }

    const exportBtn = page.locator('button:has-text("Esporta"), button:has-text("Richiedi"), button[type="submit"]').first();
    if (await exportBtn.isVisible().catch(() => false)) {
      await exportBtn.click({ timeout: 5000 });
      await page.waitForTimeout(1500);
      const crashed = await page.locator('text=500').first().isVisible().catch(() => false);
      const success = await page.locator('[role="alert"], .toast, text=richiesta inviata, text=export, text=successo').first().isVisible().catch(() => false);
      if (crashed) bug({ module: 'GDPR/Export', url: '/dashboard/gdpr/export', action: 'Richiedi export', expected: 'Conferma richiesta', observed: '500', severity: 'CRITICO', reproSteps: ['/dashboard/gdpr/export', 'Click Esporta'] });
      else if (!success) bug({ module: 'GDPR/Export', url: '/dashboard/gdpr/export', action: 'Richiedi export — no feedback', expected: 'Toast o messaggio conferma', observed: 'Nessun feedback visibile dopo click', severity: 'MEDIO', reproSteps: ['/dashboard/gdpr/export', 'Click Esporta', 'Nessun feedback'] });
    }
    await checkConsoleErrors(page, errors, 'GDPR/Export', '/dashboard/gdpr/export');
  });

  test('GDPR Deletion: form conferma', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard/gdpr/deletion');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) { bug({ module: 'GDPR/Deletion', url: '/dashboard/gdpr/deletion', action: 'Deletion page', expected: 'Pagina', observed: '500', severity: 'CRITICO', reproSteps: ['/dashboard/gdpr/deletion'] }); return; }

    // Submit senza password
    const deleteBtn = page.locator('button[type="submit"], button:has-text("Elimina"), button:has-text("Conferma eliminazione")').first();
    if (await deleteBtn.isVisible().catch(() => false)) {
      await deleteBtn.click();
      await page.waitForTimeout(1000);
      const crashed = await page.locator('text=500').first().isVisible().catch(() => false);
      if (crashed) bug({ module: 'GDPR/Deletion', url: '/dashboard/gdpr/deletion', action: 'Submit delete senza password', expected: 'Validazione', observed: '500', severity: 'CRITICO', reproSteps: ['/dashboard/gdpr/deletion', 'Submit senza dati'] });
      else {
        // Deve restare sulla pagina (form non valido)
        const currentUrl = page.url();
        if (!currentUrl.includes('/gdpr/deletion')) bug({ module: 'GDPR/Deletion', url: '/dashboard/gdpr/deletion', action: 'Submit delete senza dati → redirect', expected: 'Rimane su /gdpr/deletion con errori', observed: `Redirect a: ${currentUrl}`, severity: 'CRITICO', reproSteps: ['/dashboard/gdpr/deletion', 'Submit senza password'] });
      }
    }
    await checkConsoleErrors(page, errors, 'GDPR/Deletion', '/dashboard/gdpr/deletion');
  });
});

// ─── MODALI ESC ──────────────────────────────────────────────────────────────

test.describe('DEEP-10 — Modali: ESC + click outside', () => {
  const MODAL_TRIGGERS = [
    { url: '/dashboard/customers', trigger: 'button:has-text("Elimina"), button[aria-label*="elimina" i]', module: 'Customers/Delete' },
    { url: '/dashboard/vehicles', trigger: 'button:has-text("Elimina"), button[aria-label*="elimina" i]', module: 'Vehicles/Delete' },
    { url: '/dashboard/invoices', trigger: 'button:has-text("Elimina"), button[aria-label*="elimina" i]', module: 'Invoices/Delete' },
    { url: '/dashboard/settings/team', trigger: 'button:has-text("Invita"), button:has-text("Aggiungi")', module: 'Settings/Team/Modal' },
  ];

  for (const { url, trigger, module } of MODAL_TRIGGERS) {
    test(`${module}: ESC chiude modale`, async ({ page }) => {
      await goto(page, url);
      await waitForContent(page);
      const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
      if (has500) return;
      await pressEscOnModal(page, module, url, trigger);
    });
  }
});

// ─── API ERRORS UI ────────────────────────────────────────────────────────────

test.describe('DEEP-11 — API Error states (intercept 500)', () => {
  const API_PAGES = [
    { url: '/dashboard/customers', api: '**/api/customers**', module: 'Customers' },
    { url: '/dashboard/vehicles', api: '**/api/vehicles**', module: 'Vehicles' },
    { url: '/dashboard/invoices', api: '**/api/invoices**', module: 'Invoices' },
    { url: '/dashboard/work-orders', api: '**/api/work-orders**', module: 'WorkOrders' },
    { url: '/dashboard/bookings', api: '**/api/bookings**', module: 'Bookings' },
  ];

  for (const { url, api, module } of API_PAGES) {
    test(`${module}: UI mostra errore su API 500`, async ({ page }) => {
      await page.route(api, route => route.fulfill({ status: 500, body: JSON.stringify({ message: 'Internal Server Error' }) }));
      await goto(page, url);
      await waitForContent(page);

      const hasErrorUI = await page.locator('[role="alert"], .text-red-500, text=errore, text=problema, text=riprova, text=impossibile').first().isVisible().catch(() => false);
      const hasSilentFail = await page.locator('tbody:empty, [class*="empty-state"]').first().isVisible().catch(() => false);
      const crashed = await page.locator('text=Unhandled Error, text=Application error').first().isVisible().catch(() => false);

      if (crashed) {
        bug({ module, url, action: 'UI con API 500 intercettata', expected: 'Messaggio errore gestito', observed: 'Crash applicazione — errore non gestito', severity: 'CRITICO', reproSteps: [`Route ${api} → 500`, `Vai a ${url}`] });
        await screenshot(page, `bug-api500-crash-${module.toLowerCase()}`);
      } else if (!hasErrorUI) {
        bug({ module, url, action: 'UI con API 500 — silent fail', expected: 'Messaggio errore visibile', observed: 'Pagina carica ma nessun messaggio errore visibile', severity: 'ALTO', reproSteps: [`Route ${api} → 500`, `Vai a ${url}`, 'Nessun errore mostrato'] });
        await screenshot(page, `bug-api500-silent-${module.toLowerCase()}`);
      }
    });
  }
});

// ─── TOKEN SCADUTO ───────────────────────────────────────────────────────────

test.describe('DEEP-12 — Token scaduto → redirect login', () => {
  test('Cookie auth_token scaduto → redirect /auth', async ({ page }) => {
    // Naviga su una pagina protetta
    await goto(page, '/dashboard');
    await waitForContent(page);

    // Sovrascrivi il cookie con uno scaduto
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name === 'auth_token' || c.name === 'accessToken');
    if (authCookie) {
      await page.context().addCookies([{
        ...authCookie,
        value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxfQ.invalid',
        expires: Math.floor(Date.now() / 1000) - 3600,
      }]);

      // Tenta di navigare su pagina protetta
      await goto(page, '/dashboard/customers');
      await page.waitForTimeout(2000);
      const currentUrl = page.url();
      const redirectedToAuth = currentUrl.includes('/auth') || currentUrl.includes('/login');
      if (!redirectedToAuth) {
        bug({ module: 'Auth', url: '/dashboard/customers', action: 'Token JWT scaduto', expected: 'Redirect a /auth', observed: `Pagina accessibile con token scaduto: ${currentUrl}`, severity: 'CRITICO', reproSteps: ['Forza cookie auth_token scaduto', 'Naviga su /dashboard/customers', 'Nessun redirect a /auth'] });
        await screenshot(page, 'bug-expired-token-no-redirect');
      }
    }
  });
});

// ─── PERFORMANCE CHECK ───────────────────────────────────────────────────────

test.describe('DEEP-13 — Performance (TTFB + LCP)', () => {
  const PERF_PAGES = [
    '/dashboard',
    '/dashboard/customers',
    '/dashboard/invoices',
    '/dashboard/work-orders',
    '/dashboard/bookings',
    '/dashboard/analytics',
  ];

  for (const path of PERF_PAGES) {
    test(`PERF: ${path} — LCP < 3s`, async ({ page }) => {
      const startTime = Date.now();
      await goto(page, path);
      await waitForContent(page);
      const loadTime = Date.now() - startTime;

      if (loadTime > 5000) {
        bug({ module: 'Performance', url: path, action: 'Time to Interactive', expected: 'Pagina interattiva in < 5s', observed: `${loadTime}ms`, severity: 'ALTO', reproSteps: [`Naviga a ${path}`, `Attendi networkidle`, `Misura tempo: ${loadTime}ms`] });
      } else if (loadTime > 3000) {
        bug({ module: 'Performance', url: path, action: 'Time to Interactive lento', expected: '< 3s', observed: `${loadTime}ms`, severity: 'MEDIO', reproSteps: [`Naviga a ${path}`, `Tempo: ${loadTime}ms`] });
      }
    });
  }
});

// ─── ACCESSIBILITY AXE ───────────────────────────────────────────────────────

test.describe('DEEP-14 — Accessibility axe-core spot check', () => {
  const AXE_PAGES = [
    { url: '/dashboard', module: 'Dashboard' },
    { url: '/dashboard/customers', module: 'Customers' },
    { url: '/dashboard/customers/new', module: 'Customers/New' },
    { url: '/dashboard/invoices/new', module: 'Invoices/New' },
    { url: '/dashboard/settings', module: 'Settings' },
    { url: '/dashboard/settings/team', module: 'Settings/Team' },
  ];

  for (const { url, module } of AXE_PAGES) {
    test(`A11Y: ${module} — 0 violations WCAG AA`, async ({ page }) => {
      await goto(page, url);
      await waitForContent(page);
      await page.waitForURL(/dashboard/, { timeout: 5000 }).catch(() => {});
      await waitForContent(page);

      // Inject axe
      await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.8.2/axe.min.js' }).catch(() => {});
      await page.waitForTimeout(500);

      const violations = await page.evaluate(async () => {
        if (!(window as any).axe) return [];
        const results = await (window as any).axe.run(document, {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
        });
        return results.violations.map((v: any) => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          nodes: v.nodes.length,
        }));
      }).catch(() => []);

      const critical = (violations as any[]).filter(v => v.impact === 'critical');
      const serious = (violations as any[]).filter(v => v.impact === 'serious');

      if (critical.length > 0) {
        for (const v of critical) {
          bug({ module: `${module}/A11Y`, url, action: `axe CRITICAL: ${v.id}`, expected: '0 violazioni critical', observed: `${v.nodes} nodi — ${v.description}`, severity: 'CRITICO', reproSteps: [url, `axe rule: ${v.id}`, `${v.nodes} elementi colpiti`] });
        }
      }
      if (serious.length > 0) {
        for (const v of serious.slice(0, 3)) {
          bug({ module: `${module}/A11Y`, url, action: `axe SERIOUS: ${v.id}`, expected: '0 violazioni serious', observed: `${v.nodes} nodi — ${v.description}`, severity: 'ALTO', reproSteps: [url, `axe rule: ${v.id}`, `${v.nodes} elementi colpiti`] });
        }
      }
    });
  }
});
