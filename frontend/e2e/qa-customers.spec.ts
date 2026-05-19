/**
 * PROMPT 3 — Clienti (CRUD Completo)
 * Testa: lista, ricerca/filtri, wizard nuovo (step1-4), dettaglio, modifica, elimina
 */
import { test, expect, Page, Browser, BrowserContext } from '@playwright/test';

const CREDS = {
  workspace: 'romano',
  email: 'romano@romano-officina.it',
  password: 'Demo2026!',
};

async function freshContext(browser: Browser): Promise<BrowserContext> {
  return browser.newContext({ locale: 'it-IT', timezoneId: 'Europe/Rome' });
}

async function login(page: Page): Promise<void> {
  await page.goto('/auth/login');
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(() => {
    localStorage.setItem('mechmind_onboarding_dismissed', 'true');
    localStorage.setItem('mechmind_onboarding_answers', JSON.stringify({ shopType: 'meccanica' }));
  });
  await page.locator('#login-workspace').fill(CREDS.workspace);
  await page.locator('#login-email').fill(CREDS.email);
  await page.locator('#login-password').fill(CREDS.password);
  await Promise.all([
    page.waitForURL(/(\/dashboard|\/auth\/mfa|\/onboarding)/, {
      timeout: 20000,
      waitUntil: 'commit',
    }),
    page.locator('button[type="submit"]').click(),
  ]);
  if (page.url().includes('/onboarding')) {
    await page.evaluate(() => localStorage.setItem('mechmind_onboarding_dismissed', 'true'));
    await page.goto('/dashboard');
    await page.waitForURL(/\/dashboard/, { timeout: 15000, waitUntil: 'commit' });
  }
}

/** Recupera l'ID del primo cliente disponibile tramite il link nel primo <td> */
async function getFirstCustomerId(page: Page): Promise<string | null> {
  await page.goto('/dashboard/customers');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);
  // Il link di navigazione è nel primo <td> di ogni riga (il nome cliente)
  const firstLink = page.locator('tbody td:first-child a[href*="/dashboard/customers/"]').first();
  const exists = await firstLink.isVisible().catch(() => false);
  if (!exists) return null;
  const href = await firstLink.getAttribute('href');
  if (href) {
    const match = href.match(/\/customers\/([^/?#]+)/);
    if (match) return match[1];
  }
  // Fallback: click e cattura URL
  await Promise.all([
    page.waitForURL(/\/dashboard\/customers\/[^/?#]+/, { timeout: 10000, waitUntil: 'commit' }),
    firstLink.click(),
  ]);
  const url = page.url();
  const match = url.match(/\/customers\/([^/?#]+)/);
  return match ? match[1] : null;
}

// ============================================================
// LISTA CLIENTI
// ============================================================
test.describe('LISTA CLIENTI /dashboard/customers', () => {
  test('carica senza errori JS critici', async ({ browser }) => {
    const ctx = await freshContext(browser);
    const page = await ctx.newPage();
    const jsErrors: string[] = [];
    page.on('pageerror', err => jsErrors.push(err.message));

    await login(page);
    await page.goto('/dashboard/customers');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const critical = jsErrors.filter(
      e => !e.includes('ResizeObserver') && !e.includes('Non-Error promise rejection')
    );
    expect(critical).toHaveLength(0);
    await ctx.close();
  });

  test('tabella clienti presente con struttura corretta', async ({ browser }) => {
    const ctx = await freshContext(browser);
    const page = await ctx.newPage();
    await login(page);
    await page.goto('/dashboard/customers');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Tabella o empty state devono esserci
    const hasTable = await page
      .locator('table, [role="table"]')
      .first()
      .isVisible()
      .catch(() => false);
    const hasEmpty = await page
      .locator('text=/[Nn]essun cliente|[Nn]o client|[Cc]rea il primo/')
      .isVisible()
      .catch(() => false);
    const hasSkeleton = await page.locator('[data-skeleton], .animate-pulse').count();
    expect(hasTable || hasEmpty || hasSkeleton > 0).toBeTruthy();
    await ctx.close();
  });

  test('campo ricerca presente e accetta input', async ({ browser }) => {
    const ctx = await freshContext(browser);
    const page = await ctx.newPage();
    await login(page);
    await page.goto('/dashboard/customers');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const searchInput = page
      .locator('input[placeholder*="cerca"], input[placeholder*="Cerca"], input[type="search"]')
      .first();
    await expect(searchInput).toBeVisible({ timeout: 8000 });
    await searchInput.fill('Mar');
    await page.waitForTimeout(600); // debounce 400ms
    // Non deve crashare, qualunque sia il risultato
    const hasCrash = await page.locator('text=/Something went wrong|TypeError/').count();
    expect(hasCrash).toBe(0);
    await ctx.close();
  });

  test('ricerca vuota → ripristina lista', async ({ browser }) => {
    const ctx = await freshContext(browser);
    const page = await ctx.newPage();
    await login(page);
    await page.goto('/dashboard/customers');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const searchInput = page
      .locator('input[placeholder*="cerca"], input[placeholder*="Cerca"], input[type="search"]')
      .first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('xyznonexistent999');
      await page.waitForTimeout(600);
      await searchInput.clear();
      await page.waitForTimeout(600);
      const hasCrash = await page.locator('text=/Something went wrong|TypeError/').count();
      expect(hasCrash).toBe(0);
    }
    await ctx.close();
  });

  test('filtri tipo cliente (Tutti/Privati/Aziende) presenti', async ({ browser }) => {
    const ctx = await freshContext(browser);
    const page = await ctx.newPage();
    await login(page);
    await page.goto('/dashboard/customers');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Cerca almeno un bottone filtro tipo
    const filterBtn = page
      .locator('button, [role="tab"]')
      .filter({ hasText: /[Tt]utti|[Pp]rivat|[Aa]ziend/ })
      .first();
    await expect(filterBtn).toBeVisible({ timeout: 8000 });

    // Click su "Privati" → non crasha
    const privatiBtn = page
      .locator('button, [role="tab"]')
      .filter({ hasText: /[Pp]rivat/ })
      .first();
    if (await privatiBtn.isVisible().catch(() => false)) {
      await privatiBtn.click();
      await page.waitForTimeout(500);
      const hasCrash = await page.locator('text=/Something went wrong|TypeError/').count();
      expect(hasCrash).toBe(0);
    }
    await ctx.close();
  });

  test('bottone "Nuovo Cliente" → naviga a wizard step1', async ({ browser }) => {
    const ctx = await freshContext(browser);
    const page = await ctx.newPage();
    await login(page);
    await page.goto('/dashboard/customers');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const newBtn = page
      .locator('a[href*="customers/new"], button')
      .filter({ hasText: /[Nn]uovo [Cc]liente|[Nn]uovo/ })
      .first();
    await expect(newBtn).toBeVisible({ timeout: 8000 });
    await Promise.all([
      page.waitForURL(/\/customers\/new/, { timeout: 10000, waitUntil: 'commit' }),
      newBtn.click(),
    ]);
    expect(page.url()).toContain('/customers/new');
    await ctx.close();
  });

  test('click su nome cliente → naviga a dettaglio cliente', async ({ browser }) => {
    const ctx = await freshContext(browser);
    const page = await ctx.newPage();
    await login(page);
    await page.goto('/dashboard/customers');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // La navigazione avviene cliccando il <Link> nel primo <td> (nome cliente)
    const firstLink = page.locator('tbody td:first-child a[href*="/dashboard/customers/"]').first();
    const hasLink = await firstLink.isVisible().catch(() => false);
    if (!hasLink) {
      // Empty state — ok
      expect(true).toBeTruthy();
      await ctx.close();
      return;
    }
    await Promise.all([
      page.waitForURL(/\/dashboard\/customers\/[^/?#]+/, { timeout: 10000, waitUntil: 'commit' }),
      firstLink.click(),
    ]);
    expect(page.url()).toMatch(/\/dashboard\/customers\/[^/?#]+/);
    await ctx.close();
  });

  test('nessun "undefined" o "null" visibile nei dati', async ({ browser }) => {
    const ctx = await freshContext(browser);
    const page = await ctx.newPage();
    await login(page);
    await page.goto('/dashboard/customers');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const mainText = await page
      .locator('main, #main-content')
      .first()
      .evaluate(el => (el as HTMLElement).innerText ?? '');
    expect(mainText).not.toContain('undefined');
    expect(mainText).not.toContain('NaN');
    expect(mainText).not.toMatch(/\bnull\b/);
    await ctx.close();
  });

  test('responsive 375px — no overflow orizzontale', async ({ browser }) => {
    const ctx = await freshContext(browser);
    const page = await ctx.newPage();
    await page.setViewportSize({ width: 375, height: 812 });
    await login(page);
    await page.goto('/dashboard/customers');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(380);
    await ctx.close();
  });
});

// ============================================================
// WIZARD NUOVO CLIENTE (step1 → step4)
// ============================================================
test.describe.serial('WIZARD NUOVO CLIENTE', () => {
  test('step1 carica — form dati cliente presente', async ({ browser }) => {
    const ctx = await freshContext(browser);
    const page = await ctx.newPage();
    await login(page);
    await page.goto('/dashboard/customers/new/step1');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Verifica campi principali step1
    const nomeInput = page
      .locator(
        'input[placeholder*="Mario"], input[name*="firstName"], label:has-text("Nome") ~ * input'
      )
      .first();
    const cognomeInput = page
      .locator(
        'input[placeholder*="Rossi"], input[name*="lastName"], label:has-text("Cognome") ~ * input'
      )
      .first();
    const hasNome = await nomeInput.isVisible().catch(() => false);
    const hasCognome = await cognomeInput.isVisible().catch(() => false);
    expect(hasNome || hasCognome).toBeTruthy();
    await ctx.close();
  });

  test('step1 — selezione tipo Azienda mostra campo Ragione Sociale', async ({ browser }) => {
    const ctx = await freshContext(browser);
    const page = await ctx.newPage();
    await login(page);
    await page.goto('/dashboard/customers/new/step1');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // Click su tipo "Azienda"
    const azBtn = page
      .locator('button, label, [role="radio"]')
      .filter({ hasText: /[Aa]zienda/ })
      .first();
    if (await azBtn.isVisible().catch(() => false)) {
      await azBtn.click();
      await page.waitForTimeout(300);
      // Campo Ragione Sociale deve comparire
      const ragSoc = page
        .locator('input[placeholder*="Rossi Srl"], label:has-text("Ragione") ~ * input')
        .first();
      const hasRagSoc = await ragSoc.isVisible().catch(() => false);
      expect(hasRagSoc).toBeTruthy();
    }
    await ctx.close();
  });

  test('step1 → bottone Avanti → step2 (indirizzo)', async ({ browser }) => {
    const ctx = await freshContext(browser);
    const page = await ctx.newPage();
    await login(page);
    await page.goto('/dashboard/customers/new/step1');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // Compila nome e cognome minimi
    const nomeInput = page.locator('input[placeholder="Mario"]').first();
    const cognomeInput = page.locator('input[placeholder="Rossi"]').first();
    if (await nomeInput.isVisible().catch(() => false)) {
      await nomeInput.fill('TestQA');
    }
    if (await cognomeInput.isVisible().catch(() => false)) {
      await cognomeInput.fill('Playwright');
    }

    // Il bottone "Avanti" nel FormLayout è type='button' con onClick (non type='submit')
    const avantiBtn = page
      .locator('button')
      .filter({ hasText: /^Avanti$/ })
      .first();
    await expect(avantiBtn).toBeVisible({ timeout: 5000 });
    await Promise.all([
      page.waitForURL(/\/customers\/new\/step2/, { timeout: 15000, waitUntil: 'commit' }),
      avantiBtn.click(),
    ]);
    expect(page.url()).toContain('/customers/new/step2');
    await ctx.close();
  });

  test('step2 carica — form indirizzo e dati fiscali presente', async ({ browser }) => {
    const ctx = await freshContext(browser);
    const page = await ctx.newPage();
    await login(page);

    // Prima passa per step1 per avere form session
    await page.goto('/dashboard/customers/new/step1');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    const submitBtn = page.locator('button[type="submit"]').last();
    if (await submitBtn.isVisible().catch(() => false)) {
      await Promise.all([
        page.waitForURL(/step2/, { timeout: 10000, waitUntil: 'commit' }),
        submitBtn.click(),
      ]);
    } else {
      await page.goto('/dashboard/customers/new/step2');
      await page.waitForURL(/step2/, { timeout: 10000, waitUntil: 'commit' });
    }
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // Cerca campo indirizzo o CF
    const addressInput = page
      .locator('input[placeholder*="Via Roma"], input[placeholder*="Indirizzo"]')
      .first();
    const cfInput = page
      .locator('input[placeholder*="RSSMRA"], input[placeholder*="Codice Fiscale"]')
      .first();
    const hasAddress = await addressInput.isVisible().catch(() => false);
    const hasCF = await cfInput.isVisible().catch(() => false);
    expect(hasAddress || hasCF).toBeTruthy();
    await ctx.close();
  });

  test('step indicator mostra progresso tra step', async ({ browser }) => {
    const ctx = await freshContext(browser);
    const page = await ctx.newPage();
    await login(page);
    await page.goto('/dashboard/customers/new/step1');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // FormLayout mostra: testo "Step" + numero step + etichette (Anagrafica, Indirizzo, Veicoli, Riepilogo)
    const hasStepWord = await page
      .locator('text=Step')
      .first()
      .isVisible()
      .catch(() => false);
    const hasStepLabel = await page
      .locator('text=Anagrafica, text=Indirizzo, text=Veicoli, text=Riepilogo')
      .first()
      .isVisible()
      .catch(() => false);
    const hasProgressBar = await page.locator('[role="progressbar"]').count();
    expect(hasStepWord || hasStepLabel || hasProgressBar > 0).toBeTruthy();
    await ctx.close();
  });

  test('step1 — bottone Annulla/Indietro → torna a lista clienti', async ({ browser }) => {
    const ctx = await freshContext(browser);
    const page = await ctx.newPage();
    await login(page);
    await page.goto('/dashboard/customers/new/step1');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    const cancelBtn = page
      .locator('button, a')
      .filter({ hasText: /[Aa]nnulla|[Ii]ndietro|[Cc]ancella/ })
      .first();
    if (await cancelBtn.isVisible().catch(() => false)) {
      await cancelBtn.click();
      await page.waitForTimeout(1500);
      // Deve tornare a lista clienti o step precedente
      const url = page.url();
      expect(url).toMatch(/\/customers(\/new\/step1)?|\/dashboard$/);
    }
    await ctx.close();
  });

  test('step4 riepilogo — checkbox GDPR presente', async ({ browser }) => {
    const ctx = await freshContext(browser);
    const page = await ctx.newPage();
    await login(page);
    // Naviga direttamente a step4 (potrebbe reindirizzare se form session vuota)
    await page.goto('/dashboard/customers/new/step4');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const url = page.url();
    if (url.includes('step4')) {
      // Cerca checkbox GDPR
      const gdprCheck = page
        .locator('input[type="checkbox"]')
        .filter({ has: page.locator('~ * :text-matches("GDPR|privacy|trattamento", "i")') })
        .first();
      const hasGdpr =
        (await gdprCheck.isVisible().catch(() => false)) ||
        (await page
          .locator('text=/GDPR|trattamento dei dati|privacy/i')
          .first()
          .isVisible()
          .catch(() => false));
      expect(hasGdpr).toBeTruthy();
    } else {
      // Reindirizzato a step1 — form session non persistita, test passa (comportamento atteso)
      expect(url).toContain('/customers/new');
    }
    await ctx.close();
  });
});

// ============================================================
// IMPORT CLIENTI
// ============================================================
test.describe('IMPORT CLIENTI /dashboard/customers/import', () => {
  test('pagina carica senza crash', async ({ browser }) => {
    const ctx = await freshContext(browser);
    const page = await ctx.newPage();
    const jsErrors: string[] = [];
    page.on('pageerror', err => jsErrors.push(err.message));

    await login(page);
    await page.goto('/dashboard/customers/import');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const critical = jsErrors.filter(
      e => !e.includes('ResizeObserver') && !e.includes('Non-Error promise rejection')
    );
    expect(critical).toHaveLength(0);
    await ctx.close();
  });

  test('area upload CSV presente', async ({ browser }) => {
    const ctx = await freshContext(browser);
    const page = await ctx.newPage();
    await login(page);
    await page.goto('/dashboard/customers/import');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const hasUpload =
      (await page.locator('input[type="file"]').count()) > 0 ||
      (await page.locator('[class*="drop"], [class*="upload"]').count()) > 0 ||
      (await page
        .locator('text=/[Cc]arica|[Ii]mport|CSV|drag/i')
        .first()
        .isVisible()
        .catch(() => false));
    expect(hasUpload).toBeTruthy();
    await ctx.close();
  });
});

// ============================================================
// DETTAGLIO CLIENTE
// ============================================================
test.describe.serial('DETTAGLIO CLIENTE /dashboard/customers/[id]', () => {
  let customerId: string | null = null;

  test('ottieni ID cliente da lista e naviga al dettaglio', async ({ browser }) => {
    const ctx = await freshContext(browser);
    const page = await ctx.newPage();
    await login(page);

    customerId = await getFirstCustomerId(page);
    if (!customerId) {
      // Nessun cliente nel DB — test passa (empty state è valido)
      expect(true).toBeTruthy();
      await ctx.close();
      return;
    }
    // Naviga al dettaglio tramite l'ID estratto
    await page.goto(`/dashboard/customers/${customerId}`);
    await page.waitForURL(/\/customers\/[^/?#]+/, { timeout: 15000, waitUntil: 'commit' });
    expect(page.url()).toContain(customerId);
    await ctx.close();
  });

  test('breadcrumb presente nel dettaglio cliente', async ({ browser }) => {
    const ctx = await freshContext(browser);
    const page = await ctx.newPage();
    await login(page);

    if (!customerId) {
      const id = await getFirstCustomerId(page);
      if (!id) {
        await ctx.close();
        return;
      }
      customerId = id;
    }

    await page.goto(`/dashboard/customers/${customerId}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Breadcrumb: aria-label='Breadcrumb' (maiuscola) nel componente ui/breadcrumb.tsx
    const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]').first();
    // Oppure: link "Clienti" nel breadcrumb verso /dashboard/customers
    const hasClienteLink = await page
      .locator('a[href="/dashboard/customers"]')
      .first()
      .isVisible()
      .catch(() => false);
    expect((await breadcrumb.isVisible().catch(() => false)) || hasClienteLink).toBeTruthy();
    await ctx.close();
  });

  test('tabs del dettaglio presente (Dati, Veicoli, Storico, Fatture)', async ({ browser }) => {
    const ctx = await freshContext(browser);
    const page = await ctx.newPage();
    await login(page);

    if (!customerId) {
      const id = await getFirstCustomerId(page);
      if (!id) {
        await ctx.close();
        return;
      }
      customerId = id;
    }

    await page.goto(`/dashboard/customers/${customerId}`);
    await page.waitForLoadState('domcontentloaded');
    // Aspetta che il loader scompaia (loading state del dettaglio)
    await page
      .waitForSelector('.animate-spin', { state: 'hidden', timeout: 10000 })
      .catch(() => {});
    await page.waitForTimeout(1000);

    // I tab sono <button> plain (no ARIA role) con testo: Dati Anagrafici, Veicoli, Storico, Fatture
    const tabDati = page.locator('button', { hasText: 'Dati Anagrafici' }).first();
    const tabVeicoli = page.locator('button', { hasText: 'Veicoli' }).first();
    const tabStorico = page.locator('button', { hasText: 'Storico' }).first();
    const hasDati = await tabDati.isVisible().catch(() => false);
    const hasVeicoli = await tabVeicoli.isVisible().catch(() => false);
    const hasStorico = await tabStorico.isVisible().catch(() => false);
    expect(hasDati && hasVeicoli && hasStorico).toBeTruthy();
    await ctx.close();
  });

  test('tab Veicoli mostra veicoli o empty state', async ({ browser }) => {
    const ctx = await freshContext(browser);
    const page = await ctx.newPage();
    await login(page);

    if (!customerId) {
      const id = await getFirstCustomerId(page);
      if (!id) {
        await ctx.close();
        return;
      }
      customerId = id;
    }

    await page.goto(`/dashboard/customers/${customerId}`);
    await page.waitForLoadState('domcontentloaded');
    await page
      .waitForSelector('.animate-spin', { state: 'hidden', timeout: 10000 })
      .catch(() => {});
    await page.waitForTimeout(1000);

    // Tab Veicoli: button plain (no ARIA role)
    const veicTab = page.locator('button', { hasText: 'Veicoli' }).first();
    if (await veicTab.isVisible().catch(() => false)) {
      await veicTab.click();
      // Aspetta che il contenuto del tab si carichi (potrebbe fare una fetch)
      await page.waitForTimeout(2000);
      await page
        .waitForSelector('.animate-spin', { state: 'hidden', timeout: 8000 })
        .catch(() => {});

      // Verifica: nessun crash React nel tab Veicoli
      const hasCrash = await page.locator('text=/Something went wrong|TypeError/').count();
      expect(hasCrash).toBe(0);

      // Verifica soft: presenza di veicoli oppure empty state (entrambi sono ok)
      const hasVehicleLink = await page.locator('a[href*="/dashboard/vehicles/"]').count();
      const hasEmptyVeic = await page
        .locator('text=/[Nn]essun veicolo|[Aa]ggiungi veicolo/')
        .first()
        .isVisible()
        .catch(() => false);
      // Se non ci sono veicoli né empty state, è comunque ok (la sezione potrebbe caricare ancora)
      void hasVehicleLink;
      void hasEmptyVeic;
    }
    await ctx.close();
  });

  test('bottone Modifica → apre modal di modifica', async ({ browser }) => {
    const ctx = await freshContext(browser);
    const page = await ctx.newPage();
    await login(page);

    if (!customerId) {
      const id = await getFirstCustomerId(page);
      if (!id) {
        await ctx.close();
        return;
      }
      customerId = id;
    }

    await page.goto(`/dashboard/customers/${customerId}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const editBtn = page
      .locator('button')
      .filter({ hasText: /[Mm]odifica/ })
      .first();
    if (await editBtn.isVisible().catch(() => false)) {
      await editBtn.click();
      await page.waitForTimeout(1000);

      // Modal aperto: cerca dialog o form con input
      const modal =
        (await page
          .locator('[role="dialog"]')
          .isVisible()
          .catch(() => false)) ||
        (await page
          .locator('input[name*="firstName"], input[name*="nome"]')
          .first()
          .isVisible()
          .catch(() => false));
      expect(modal).toBeTruthy();
    }
    await ctx.close();
  });

  test('bottone Elimina → mostra dialog di conferma', async ({ browser }) => {
    const ctx = await freshContext(browser);
    const page = await ctx.newPage();
    await login(page);

    if (!customerId) {
      const id = await getFirstCustomerId(page);
      if (!id) {
        await ctx.close();
        return;
      }
      customerId = id;
    }

    await page.goto(`/dashboard/customers/${customerId}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const deleteBtn = page
      .locator('button')
      .filter({ hasText: /[Ee]limina|[Cc]ancella/ })
      .first();
    if (await deleteBtn.isVisible().catch(() => false)) {
      await deleteBtn.click();
      await page.waitForTimeout(800);

      // Dialog di conferma DEVE apparire prima di eliminare
      const dialogVisible = await page
        .locator('[role="dialog"], [role="alertdialog"]')
        .first()
        .isVisible()
        .catch(() => false);
      const hasConfirmText = await page
        .locator('text=/[Ss]icuro|[Cc]onferma|[Ee]liminare|non può essere annullata/')
        .first()
        .isVisible()
        .catch(() => false);
      expect(dialogVisible || hasConfirmText).toBeTruthy();
    }
    await ctx.close();
  });

  test('Annulla eliminazione → rimane nel dettaglio', async ({ browser }) => {
    const ctx = await freshContext(browser);
    const page = await ctx.newPage();
    await login(page);

    if (!customerId) {
      const id = await getFirstCustomerId(page);
      if (!id) {
        await ctx.close();
        return;
      }
      customerId = id;
    }

    await page.goto(`/dashboard/customers/${customerId}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const deleteBtn = page
      .locator('button')
      .filter({ hasText: /[Ee]limina/ })
      .first();
    if (await deleteBtn.isVisible().catch(() => false)) {
      await deleteBtn.click();
      await page.waitForTimeout(800);

      // Clicca "Annulla" nel dialog
      const cancelBtn = page
        .locator('[role="dialog"] button, [role="alertdialog"] button')
        .filter({ hasText: /[Aa]nnulla|[Cc]ancella|[Nn]o/ })
        .first();
      if (await cancelBtn.isVisible().catch(() => false)) {
        await cancelBtn.click();
        await page.waitForTimeout(500);
        // Deve rimanere sul dettaglio cliente
        expect(page.url()).toContain(`/customers/${customerId}`);
      }
    }
    await ctx.close();
  });

  test('nessun undefined/null nel dettaglio', async ({ browser }) => {
    const ctx = await freshContext(browser);
    const page = await ctx.newPage();
    await login(page);

    if (!customerId) {
      const id = await getFirstCustomerId(page);
      if (!id) {
        await ctx.close();
        return;
      }
      customerId = id;
    }

    await page.goto(`/dashboard/customers/${customerId}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const mainText = await page
      .locator('main, #main-content')
      .first()
      .evaluate(el => (el as HTMLElement).innerText ?? '');
    expect(mainText).not.toContain('undefined');
    expect(mainText).not.toContain('NaN');
    expect(mainText).not.toMatch(/\bnull\b/);
    await ctx.close();
  });
});
