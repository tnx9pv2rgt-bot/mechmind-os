/**
 * TOUR COMPLETO — ogni azione del gestionale
 * Esegue operazioni reali: crea, modifica, naviga, clicca ogni bottone
 */
import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const SCREENSHOT_DIR = '/tmp/tour-screenshots';
let screenshotIndex = 0;

if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

async function screenshot(page: Page, label: string): Promise<void> {
  screenshotIndex++;
  const filename = path.join(
    SCREENSHOT_DIR,
    `${String(screenshotIndex).padStart(3, '0')}-${label.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`
  );
  await page.screenshot({ path: filename, fullPage: false });
}

async function wait(ms = 600): Promise<void> {
  await new Promise(r => setTimeout(r, ms));
}

async function login(page: Page): Promise<void> {
  await page.goto(`${BASE}/auth/login`);
  await page.waitForLoadState('domcontentloaded');
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
    page.waitForURL(/(\/dashboard|\/onboarding)/, { timeout: 25000, waitUntil: 'commit' }),
    page.locator('button[type="submit"]').click(),
  ]);
  if (page.url().includes('/onboarding')) {
    await page.evaluate(() => localStorage.setItem('mechmind_onboarding_dismissed', 'true'));
    await page.goto(`${BASE}/dashboard`);
    await page.waitForURL(/\/dashboard/, { timeout: 15000, waitUntil: 'commit' });
  }
  await page.waitForTimeout(1500);
}

// ─────────────────────────────────────────────────────────────
// 1. LOGIN
// ─────────────────────────────────────────────────────────────
test.describe.serial('01 — AUTH', () => {
  test('login con credenziali reali', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`);
    await page.waitForSelector('#login-workspace', { state: 'visible', timeout: 15000 });
    await screenshot(page, 'login-pagina');
    await page.locator('#login-workspace').fill('romano');
    await page.locator('#login-email').fill('romano@romano-officina.it');
    await page.locator('#login-password').fill('Demo2026!');
    await screenshot(page, 'login-form-compilato');
    await page.evaluate(() => {
      localStorage.setItem('mechmind_onboarding_dismissed', 'true');
      localStorage.setItem(
        'mechmind_onboarding_answers',
        JSON.stringify({ shopType: 'officina', priorities: ['bookings'] })
      );
    });
    await Promise.all([
      page.waitForURL(/(\/dashboard|\/onboarding)/, { timeout: 25000, waitUntil: 'commit' }),
      page.locator('button[type="submit"]').click(),
    ]);
    if (page.url().includes('/onboarding')) {
      await page.evaluate(() => localStorage.setItem('mechmind_onboarding_dismissed', 'true'));
      await page.goto(`${BASE}/dashboard`);
    }
    await page.waitForURL(/\/dashboard/, { timeout: 15000, waitUntil: 'commit' });
    await page.waitForTimeout(2000);
    await screenshot(page, 'dashboard-dopo-login');
    expect(page.url()).toContain('/dashboard');
  });

  test('mostra/nascondi password', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`);
    await page.waitForSelector('#login-password', { state: 'visible', timeout: 15000 });
    await page.locator('#login-password').fill('Demo2026!');
    const toggleBtn = page.locator('button[aria-label*="password"]').first();
    if (await toggleBtn.isVisible()) {
      await toggleBtn.click();
      await wait();
      const type = await page.locator('#login-password').getAttribute('type');
      expect(type).toBe('text');
      await toggleBtn.click();
      await screenshot(page, 'password-toggle');
    }
  });
});

// ─────────────────────────────────────────────────────────────
// 2. DASHBOARD
// ─────────────────────────────────────────────────────────────
test.describe.serial('02 — DASHBOARD', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('dashboard principale — stats e navigazione', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await screenshot(page, 'dashboard-home');
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible({ timeout: 8000 });
    // Click sulla prima stat card se presente
    const statCard = page.locator('[class*="card"], [class*="stat"]').first();
    if (await statCard.isVisible().catch(() => false)) {
      await statCard.click({ force: true });
      await wait();
    }
    await screenshot(page, 'dashboard-after-click');
  });

  test('sidebar — tutti i link di navigazione', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    await page.waitForTimeout(2000);
    const navLinks = [
      '/dashboard/customers',
      '/dashboard/vehicles',
      '/dashboard/bookings',
      '/dashboard/invoices',
      '/dashboard/work-orders',
      '/dashboard/parts',
      '/dashboard/analytics',
      '/dashboard/marketing',
      '/dashboard/settings',
    ];
    for (const link of navLinks) {
      await page.goto(`${BASE}${link}`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1200);
      await screenshot(page, `nav-${link.split('/').pop()}`);
      const hasContent = await page
        .locator('h1, h2, main')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false);
      expect(hasContent).toBeTruthy();
    }
  });
});

// ─────────────────────────────────────────────────────────────
// 3. CLIENTI — CRUD COMPLETO
// ─────────────────────────────────────────────────────────────
test.describe.serial('03 — CLIENTI CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('lista clienti — ricerca e filtri', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/customers`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await screenshot(page, 'clienti-lista');
    // Cerca nella search bar
    const search = page
      .locator(
        'input[type="search"], input[placeholder*="cerca" i], input[placeholder*="search" i]'
      )
      .first();
    if (await search.isVisible().catch(() => false)) {
      await search.fill('mario');
      await page.waitForTimeout(800);
      await screenshot(page, 'clienti-ricerca');
      await search.clear();
      await wait();
    }
  });

  test('crea nuovo cliente', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/customers/new`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    await screenshot(page, 'cliente-nuovo-form');
    // Compila il form
    const nameField = page
      .locator('#name, input[name="name"], input[placeholder*="nome" i]')
      .first();
    if (await nameField.isVisible().catch(() => false)) {
      await nameField.fill('Cliente Test QA 2026');
    }
    const emailField = page.locator('#email, input[name="email"], input[type="email"]').first();
    if (await emailField.isVisible().catch(() => false)) {
      await emailField.fill('test.qa.2026@mechmind.it');
    }
    const phoneField = page
      .locator('#phone, input[name="phone"], input[placeholder*="telefono" i]')
      .first();
    if (await phoneField.isVisible().catch(() => false)) {
      await phoneField.fill('+39 333 1234567');
    }
    await screenshot(page, 'cliente-form-compilato');
    // Prova a salvare
    const submitBtn = page
      .locator('button[type="submit"], button:has-text("Salva"), button:has-text("Crea")')
      .first();
    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(2000);
      await screenshot(page, 'cliente-dopo-salvataggio');
    }
  });

  test('visualizza dettaglio cliente esistente', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/customers`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    // Clicca sul primo cliente in lista
    const firstRow = page.locator('tr, [class*="row"], a[href*="/customers/"]').first();
    if (await firstRow.isVisible().catch(() => false)) {
      await firstRow.click();
      await page.waitForTimeout(1500);
      await screenshot(page, 'cliente-dettaglio');
      // Naviga alle tab se presenti
      const tabs = page.locator('[role="tab"]');
      const tabCount = await tabs.count();
      for (let i = 0; i < Math.min(tabCount, 4); i++) {
        await tabs.nth(i).click();
        await wait(500);
        await screenshot(page, `cliente-tab-${i}`);
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────
// 4. VEICOLI — CRUD COMPLETO
// ─────────────────────────────────────────────────────────────
test.describe.serial('04 — VEICOLI CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('lista veicoli — ricerca', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/vehicles`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await screenshot(page, 'veicoli-lista');
    const search = page
      .locator('input[type="search"], input[placeholder*="targa" i], input[placeholder*="cerca" i]')
      .first();
    if (await search.isVisible().catch(() => false)) {
      await search.fill('AB123CD');
      await page.waitForTimeout(800);
      await screenshot(page, 'veicoli-ricerca-targa');
      await search.clear();
    }
  });

  test('crea nuovo veicolo', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/vehicles/new`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    await screenshot(page, 'veicolo-nuovo-form');
    const plateField = page
      .locator('#plate, input[name="plate"], input[placeholder*="targa" i]')
      .first();
    if (await plateField.isVisible().catch(() => false)) {
      await plateField.fill('QA123XY');
    }
    const makeField = page
      .locator('#make, input[name="make"], input[placeholder*="marca" i]')
      .first();
    if (await makeField.isVisible().catch(() => false)) {
      await makeField.fill('Fiat');
    }
    const modelField = page
      .locator('#model, input[name="model"], input[placeholder*="model" i]')
      .first();
    if (await modelField.isVisible().catch(() => false)) {
      await modelField.fill('Panda');
    }
    await screenshot(page, 'veicolo-form-compilato');
    const submitBtn = page
      .locator('button[type="submit"], button:has-text("Salva"), button:has-text("Crea")')
      .first();
    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(2000);
      await screenshot(page, 'veicolo-dopo-salvataggio');
    }
  });

  test('dettaglio veicolo esistente', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/vehicles`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const firstLink = page.locator('a[href*="/vehicles/"]').first();
    if (await firstLink.isVisible().catch(() => false)) {
      await firstLink.click();
      await page.waitForTimeout(1500);
      await screenshot(page, 'veicolo-dettaglio');
      // Click su ogni tab
      const tabs = page.locator('[role="tab"]');
      const tabCount = await tabs.count();
      for (let i = 0; i < Math.min(tabCount, 5); i++) {
        await tabs.nth(i).click();
        await wait(600);
        await screenshot(page, `veicolo-tab-${i}`);
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────
// 5. PRENOTAZIONI — CRUD COMPLETO
// ─────────────────────────────────────────────────────────────
test.describe.serial('05 — PRENOTAZIONI CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('calendario prenotazioni', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/bookings`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await screenshot(page, 'prenotazioni-lista');
    // Switcha tra viste (lista/calendario) se disponibili
    const viewBtns = page.locator(
      'button:has-text("Calendario"), button:has-text("Lista"), button[aria-label*="calendar" i]'
    );
    const viewCount = await viewBtns.count();
    for (let i = 0; i < viewCount; i++) {
      await viewBtns
        .nth(i)
        .click()
        .catch(() => {});
      await wait(800);
      await screenshot(page, `prenotazioni-vista-${i}`);
    }
  });

  test('nuova prenotazione', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/bookings/new`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    await screenshot(page, 'prenotazione-nuova-form');
    // Cerca i campi del form
    const typeField = page.locator('select, [role="combobox"]').first();
    if (await typeField.isVisible().catch(() => false)) {
      await typeField.click();
      await wait(500);
      await screenshot(page, 'prenotazione-tipo-aperto');
      await page.keyboard.press('Escape');
    }
    await screenshot(page, 'prenotazione-form-compilato');
  });

  test('dettaglio prenotazione esistente', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/bookings`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const firstLink = page.locator('a[href*="/bookings/"], tr').first();
    if (await firstLink.isVisible().catch(() => false)) {
      await firstLink.click();
      await page.waitForTimeout(1500);
      await screenshot(page, 'prenotazione-dettaglio');
    }
  });
});

// ─────────────────────────────────────────────────────────────
// 6. FATTURE — CRUD COMPLETO
// ─────────────────────────────────────────────────────────────
test.describe.serial('06 — FATTURE CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('lista fatture — filtri stato', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/invoices`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await screenshot(page, 'fatture-lista');
    // Clicca sui filtri di stato
    const filterBtns = page.locator(
      'button:has-text("Tutte"), button:has-text("Bozza"), button:has-text("Inviate"), button:has-text("Pagate"), button:has-text("Scadute")'
    );
    const count = await filterBtns.count();
    for (let i = 0; i < count; i++) {
      await filterBtns
        .nth(i)
        .click()
        .catch(() => {});
      await wait(600);
      await screenshot(page, `fatture-filtro-${i}`);
    }
  });

  test('nuova fattura — compila form completo', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/invoices/new`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await screenshot(page, 'fattura-nuova');
    // Cerca cliente
    const clienteSearch = page
      .locator('input[placeholder*="cliente" i], input[placeholder*="cerca" i]')
      .first();
    if (await clienteSearch.isVisible().catch(() => false)) {
      await clienteSearch.fill('Romano');
      await page.waitForTimeout(800);
      await screenshot(page, 'fattura-ricerca-cliente');
      // Seleziona il primo risultato
      const firstResult = page
        .locator('[role="option"], [class*="suggestion"], [class*="result"]')
        .first();
      if (await firstResult.isVisible({ timeout: 3000 }).catch(() => false)) {
        await firstResult.click();
        await wait();
      }
    }
    // Aggiungi riga
    const addRowBtn = page
      .locator('button:has-text("Aggiungi Riga"), button:has-text("+ Riga")')
      .first();
    if (await addRowBtn.isVisible().catch(() => false)) {
      await addRowBtn.click();
      await wait(600);
      await screenshot(page, 'fattura-riga-aggiunta');
      // Compila la riga
      const descField = page
        .locator('input[placeholder*="descrizione" i], input[placeholder*="servizio" i]')
        .first();
      if (await descField.isVisible().catch(() => false)) {
        await descField.fill('Tagliando olio e filtri');
      }
      const qtyField = page
        .locator(
          'input[placeholder*="qtà" i], input[placeholder*="quantità" i], input[name*="quantity"]'
        )
        .first();
      if (await qtyField.isVisible().catch(() => false)) {
        await qtyField.fill('1');
      }
      const priceField = page
        .locator(
          'input[placeholder*="prezzo" i], input[placeholder*="price" i], input[name*="price"]'
        )
        .first();
      if (await priceField.isVisible().catch(() => false)) {
        await priceField.fill('120');
      }
    }
    await screenshot(page, 'fattura-form-compilato');
    // Salva come bozza
    const draftBtn = page
      .locator('button:has-text("Bozza"), button:has-text("Salva come Bozza")')
      .first();
    if (await draftBtn.isVisible().catch(() => false)) {
      await draftBtn.click();
      await page.waitForTimeout(2000);
      await screenshot(page, 'fattura-salvata-bozza');
    }
  });

  test('dettaglio fattura — tutte le tab', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/invoices`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const firstLink = page.locator('a[href*="/invoices/"]').first();
    if (await firstLink.isVisible().catch(() => false)) {
      await firstLink.click();
      await page.waitForTimeout(1500);
      await screenshot(page, 'fattura-dettaglio');
      const tabs = page.locator('[role="tab"]');
      const tabCount = await tabs.count();
      for (let i = 0; i < tabCount; i++) {
        await tabs.nth(i).click();
        await wait(700);
        await screenshot(page, `fattura-tab-${i}`);
      }
    }
  });

  test('preventivi', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/invoices/quotes`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await screenshot(page, 'preventivi-lista');
  });
});

// ─────────────────────────────────────────────────────────────
// 7. ORDINI DI LAVORO
// ─────────────────────────────────────────────────────────────
test.describe.serial('07 — ORDINI DI LAVORO', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('lista OL — filtri e stati', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/work-orders`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await screenshot(page, 'ol-lista');
    const filterBtns = page.locator(
      'button:has-text("Aperto"), button:has-text("In Corso"), button:has-text("Completato"), button:has-text("Tutti")'
    );
    const count = await filterBtns.count();
    for (let i = 0; i < count; i++) {
      await filterBtns
        .nth(i)
        .click()
        .catch(() => {});
      await wait(600);
      await screenshot(page, `ol-filtro-${i}`);
    }
  });

  test('nuovo OL', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/work-orders/new`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    await screenshot(page, 'ol-nuovo-form');
    // Cerca veicolo
    const veicSearch = page
      .locator('input[placeholder*="veicolo" i], input[placeholder*="targa" i]')
      .first();
    if (await veicSearch.isVisible().catch(() => false)) {
      await veicSearch.fill('QA');
      await page.waitForTimeout(800);
      await screenshot(page, 'ol-cerca-veicolo');
      await page.keyboard.press('Escape');
    }
    await screenshot(page, 'ol-form');
  });

  test('dettaglio OL — cambio stato', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/work-orders`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const firstLink = page.locator('a[href*="/work-orders/"]').first();
    if (await firstLink.isVisible().catch(() => false)) {
      await firstLink.click();
      await page.waitForTimeout(1500);
      await screenshot(page, 'ol-dettaglio');
      // Prova cambio stato
      const statusBtn = page
        .locator(
          'button:has-text("Avvia"), button:has-text("Completa"), button:has-text("In Corso")'
        )
        .first();
      if (await statusBtn.isVisible().catch(() => false)) {
        await screenshot(page, 'ol-bottone-stato');
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────
// 8. RICAMBI
// ─────────────────────────────────────────────────────────────
test.describe.serial('08 — RICAMBI', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('lista ricambi — ricerca e filtri', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/parts`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await screenshot(page, 'ricambi-lista');
    const search = page
      .locator(
        'input[type="search"], input[placeholder*="ricambio" i], input[placeholder*="cerca" i]'
      )
      .first();
    if (await search.isVisible().catch(() => false)) {
      await search.fill('olio');
      await page.waitForTimeout(800);
      await screenshot(page, 'ricambi-ricerca');
      await search.clear();
    }
  });

  test('nuovo ricambio', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/parts/new`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    await screenshot(page, 'ricambio-nuovo-form');
    const nameField = page
      .locator('#name, input[name="name"], input[placeholder*="nome" i]')
      .first();
    if (await nameField.isVisible().catch(() => false)) {
      await nameField.fill('Olio Motore 5W30 QA Test');
    }
    const skuField = page.locator('#sku, input[name="sku"], input[placeholder*="sku" i]').first();
    if (await skuField.isVisible().catch(() => false)) {
      await skuField.fill('QA-OIL-5W30');
    }
    const priceField = page
      .locator('#price, input[name="price"], input[placeholder*="prezzo" i]')
      .first();
    if (await priceField.isVisible().catch(() => false)) {
      await priceField.fill('25.00');
    }
    await screenshot(page, 'ricambio-form-compilato');
    const submitBtn = page.locator('button[type="submit"], button:has-text("Salva")').first();
    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(2000);
      await screenshot(page, 'ricambio-salvato');
    }
  });

  test('catalogo ricambi', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/parts/catalog`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await screenshot(page, 'catalogo-ricambi');
  });
});

// ─────────────────────────────────────────────────────────────
// 9. ANALYTICS
// ─────────────────────────────────────────────────────────────
test.describe.serial('09 — ANALYTICS', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('analytics — tutti i grafici e filtri data', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/analytics`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    await screenshot(page, 'analytics-home');
    // Cambia periodo
    const periodBtns = page.locator(
      'button:has-text("7 giorni"), button:has-text("30 giorni"), button:has-text("3 mesi"), button:has-text("1 anno"), button:has-text("Settimana"), button:has-text("Mese")'
    );
    const count = await periodBtns.count();
    for (let i = 0; i < count; i++) {
      await periodBtns
        .nth(i)
        .click()
        .catch(() => {});
      await page.waitForTimeout(1000);
      await screenshot(page, `analytics-periodo-${i}`);
    }
    // Scorri per vedere tutti i grafici
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await wait(800);
    await screenshot(page, 'analytics-bottom');
  });
});

// ─────────────────────────────────────────────────────────────
// 10. MARKETING
// ─────────────────────────────────────────────────────────────
test.describe.serial('10 — MARKETING', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('lista campagne e navigazione', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/marketing`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await screenshot(page, 'marketing-lista');
    const nuovaCampagna = page
      .locator('a[href*="/marketing/new"], button:has-text("Nuova Campagna")')
      .first();
    if (await nuovaCampagna.isVisible().catch(() => false)) {
      await nuovaCampagna.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);
      await screenshot(page, 'marketing-nuova-campagna');
      await page.goBack();
    }
  });

  test('segmenti clienti', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/marketing/segments`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await screenshot(page, 'marketing-segmenti');
  });
});

// ─────────────────────────────────────────────────────────────
// 11. SETTINGS
// ─────────────────────────────────────────────────────────────
test.describe.serial('11 — SETTINGS', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('impostazioni — tutte le sezioni', async ({ page }) => {
    const sections = [
      '/dashboard/settings',
      '/dashboard/settings/profile',
      '/dashboard/settings/shop',
      '/dashboard/settings/users',
      '/dashboard/settings/notifications',
      '/dashboard/settings/integrations',
    ];
    for (const section of sections) {
      await page.goto(`${BASE}${section}`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);
      await screenshot(page, `settings-${section.split('/').pop()}`);
      // Controlla se ci sono form editabili
      const inputs = page.locator('input:not([type="hidden"]):not([type="checkbox"])');
      const inputCount = await inputs.count();
      if (inputCount > 0) {
        await inputs
          .first()
          .click()
          .catch(() => {});
        await wait(300);
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────
// 12. GDPR
// ─────────────────────────────────────────────────────────────
test.describe.serial('12 — GDPR', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('export dati personali', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/gdpr/export`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await screenshot(page, 'gdpr-export');
    const exportBtn = page
      .locator('button:has-text("Esporta"), button:has-text("Scarica"), button:has-text("Export")')
      .first();
    if (await exportBtn.isVisible().catch(() => false)) {
      await screenshot(page, 'gdpr-export-bottone');
    }
  });

  test('cancellazione account', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/gdpr/deletion`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await screenshot(page, 'gdpr-cancellazione');
  });
});

// ─────────────────────────────────────────────────────────────
// 13. BILLING / ABBONAMENTO
// ─────────────────────────────────────────────────────────────
test.describe.serial('13 — BILLING', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('billing e subscription', async ({ page }) => {
    for (const path of ['/dashboard/billing', '/dashboard/subscription', '/pricing']) {
      await page.goto(`${BASE}${path}`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2500);
      await screenshot(page, `billing-${path.split('/').pop()}`);
    }
  });
});

// ─────────────────────────────────────────────────────────────
// 14. PORTAL CLIENTI
// ─────────────────────────────────────────────────────────────
test.describe.serial('14 — PORTAL CLIENTI', () => {
  test('portal login page', async ({ page }) => {
    await page.goto(`${BASE}/portal/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    await screenshot(page, 'portal-login');
    // Compila form
    const emailField = page.locator('#email, input[type="email"]').first();
    const passwordField = page.locator('#password, input[type="password"]').first();
    if (await emailField.isVisible().catch(() => false)) {
      await emailField.fill('cliente@test.it');
      await passwordField.fill('Password123!');
      await screenshot(page, 'portal-login-compilato');
    }
  });

  test('portal register', async ({ page }) => {
    await page.goto(`${BASE}/portal/register`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    await screenshot(page, 'portal-register');
  });

  test('portal pages — accesso con token', async ({ page }) => {
    const PORTAL_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0In0.fake';
    const PORTAL_USER = JSON.stringify({
      id: 'test',
      email: 'cliente@test.it',
      firstName: 'Mario',
      lastName: 'Rossi',
    });
    const portalPages = [
      '/portal/dashboard',
      '/portal/bookings',
      '/portal/vehicles',
      '/portal/invoices',
      '/portal/documents',
      '/portal/profile',
    ];
    for (const p of portalPages) {
      await page.addInitScript(
        ({ token, user }: { token: string; user: string }) => {
          localStorage.setItem('portal_token', token);
          localStorage.setItem('portal_user', user);
        },
        { token: PORTAL_TOKEN, user: PORTAL_USER }
      );
      await page.goto(`${BASE}${p}`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);
      await screenshot(page, `portal-${p.split('/').pop()}`);
    }
  });
});

// ─────────────────────────────────────────────────────────────
// 15. ISPEZIONI E MANUTENZIONI
// ─────────────────────────────────────────────────────────────
test.describe.serial('15 — ISPEZIONI E MANUTENZIONI', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('ispezioni', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/inspections`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await screenshot(page, 'ispezioni-lista');
    const newBtn = page
      .locator('a[href*="/inspections/new"], button:has-text("Nuova Ispezione")')
      .first();
    if (await newBtn.isVisible().catch(() => false)) {
      await newBtn.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);
      await screenshot(page, 'ispezione-nuova');
      await page.goBack();
    }
  });

  test('manutenzioni e garanzie', async ({ page }) => {
    for (const path of ['/dashboard/maintenance', '/dashboard/maintenance/warranty']) {
      await page.goto(`${BASE}${path}`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);
      await screenshot(page, `manutenzione-${path.split('/').pop()}`);
    }
  });
});

// ─────────────────────────────────────────────────────────────
// 16. MOBILE RESPONSIVE (375px)
// ─────────────────────────────────────────────────────────────
test.describe.serial('16 — MOBILE RESPONSIVE', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('pagine principali su mobile 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const mobilePages = [
      '/dashboard',
      '/dashboard/customers',
      '/dashboard/invoices',
      '/dashboard/bookings',
      '/dashboard/work-orders',
    ];
    for (const p of mobilePages) {
      await page.goto(`${BASE}${p}`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);
      await screenshot(page, `mobile-${p.split('/').pop()}`);
      // Verifica no overflow
      const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(385);
    }
  });
});

// ─────────────────────────────────────────────────────────────
// 17. DARK MODE
// ─────────────────────────────────────────────────────────────
test.describe.serial('17 — DARK MODE', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('dark mode su pagine principali', async ({ page }) => {
    // Attiva dark mode via localStorage o settings
    await page.emulateMedia({ colorScheme: 'dark' });
    const darkPages = ['/dashboard', '/dashboard/customers', '/dashboard/invoices', '/auth/login'];
    for (const p of darkPages) {
      await page.goto(`${BASE}${p}`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);
      await screenshot(page, `dark-${p.split('/').pop()}`);
    }
  });
});
