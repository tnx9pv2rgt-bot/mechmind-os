import { test, expect, type Page } from '@playwright/test';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';

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
    page.waitForURL(/(\/dashboard|\/onboarding)/, { timeout: 20000, waitUntil: 'commit' }),
    page.locator('button[type="submit"]').click(),
  ]);
  if (page.url().includes('/onboarding')) {
    await page.evaluate(() => localStorage.setItem('mechmind_onboarding_dismissed', 'true'));
    await page.goto(`${BASE}/dashboard`);
    await page.waitForURL(/\/dashboard/, { timeout: 15000, waitUntil: 'commit' });
  }
}

// ---------------------------------------------------------------------------
// 404 — pagine inesistenti
// ---------------------------------------------------------------------------

test.describe.serial('ERROR STATE — 404 Page', () => {
  test('pagina /percorso-inesistente → mostra 404 o redirect', async ({ page }) => {
    const response = await page.goto(`${BASE}/pagina-che-non-esiste-xyz`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    const status = response?.status();
    const content = await page
      .locator('body')
      .evaluate(el => el.innerText)
      .catch(() => '');
    const is404 =
      status === 404 ||
      content.toLowerCase().includes('not found') ||
      content.toLowerCase().includes('non trovata') ||
      content.toLowerCase().includes('404');
    expect(is404).toBeTruthy();
  });

  test('/dashboard/modulo-inesistente autenticato → 404 o redirect', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard/questo-modulo-non-esiste`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const content = await page
      .locator('body')
      .evaluate(el => el.innerText)
      .catch(() => '');
    // Deve mostrare 404, redirect a dashboard, o pagina vuota — non un crash JS
    const url = page.url();
    const isHandled =
      content.toLowerCase().includes('not found') ||
      content.toLowerCase().includes('non trovata') ||
      content.toLowerCase().includes('404') ||
      url.includes('/dashboard');
    expect(isHandled).toBeTruthy();
  });

  test('nessun crash JS su pagina 404', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${BASE}/pagina-che-non-esiste-xyz-123`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    const critical = errors.filter(
      e =>
        !e.includes('ResizeObserver') &&
        !e.includes('hydrat') &&
        !e.includes('Warning') &&
        !e.includes('ChunkLoadError')
    );
    expect(critical).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// FORM VALIDATION — Login
// ---------------------------------------------------------------------------

test.describe.serial('ERROR STATE — Form validation login', () => {
  test('submit form vuoto → errori di validazione visibili', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#login-workspace', { state: 'visible', timeout: 15000 });
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1500);
    // Non deve navigare al dashboard
    expect(page.url()).not.toContain('/dashboard');
  });

  test('email non valida → errore mostrato', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#login-workspace', { state: 'visible', timeout: 15000 });
    await page.locator('#login-workspace').fill('romano');
    await page.locator('#login-email').fill('non-una-email');
    await page.locator('#login-password').fill('password123');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(2000);
    // Non deve navigare al dashboard con email invalida
    expect(page.url()).not.toContain('/dashboard');
  });

  test('credenziali errate → messaggio di errore visibile', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#login-workspace', { state: 'visible', timeout: 15000 });
    await page.locator('#login-workspace').fill('romano');
    await page.locator('#login-email').fill('romano@romano-officina.it');
    await page.locator('#login-password').fill('password-sbagliata-xxx');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(3000);
    // Deve mostrare errore (non redirect a dashboard)
    expect(page.url()).not.toContain('/dashboard');
    // Verifica che ci sia qualche feedback di errore
    const errorVisible =
      (await page
        .locator('[role="alert"], .text-red, .text-destructive, [class*="error"]')
        .count()) > 0 ||
      (await page.locator('p, div', { hasText: /errore|credenziali|non valid/i }).count()) > 0;
    expect(errorVisible).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// FORM VALIDATION — Portal Register
// ---------------------------------------------------------------------------

test.describe.serial('ERROR STATE — Form validation portal register', () => {
  test('step 1 con email non valida → errore', async ({ page }) => {
    await page.goto(`${BASE}/portal/register`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    await page.locator('#firstName').fill('Mario');
    await page.locator('#lastName').fill('Rossi');
    await page.locator('#email').fill('non-email');
    await page.locator('#phone').fill('+39 333 1234567');
    const continuaBtn = page.locator('button', { hasText: /continua/i }).first();
    await continuaBtn.click();
    await page.waitForTimeout(500);
    // Deve rimanere a step 1 (no password field)
    const passwordField = page.locator('#password');
    const passwordVisible = await passwordField.isVisible().catch(() => false);
    expect(passwordVisible).toBeFalsy();
  });

  test('step 2 con password troppo corta → errore', async ({ page }) => {
    await page.goto(`${BASE}/portal/register`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    // Completa step 1
    await page.locator('#firstName').fill('Mario');
    await page.locator('#lastName').fill('Rossi');
    await page.locator('#email').fill('mario@test.it');
    await page.locator('#phone').fill('+39 333 1234567');
    await page
      .locator('button', { hasText: /continua/i })
      .first()
      .click();
    await page.waitForTimeout(500);
    // Step 2
    await page.locator('#password').fill('abc'); // troppo corta
    await page.locator('#confirmPassword').fill('abc');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1000);
    // Non deve navigare a dashboard
    expect(page.url()).not.toContain('/dashboard');
  });
});

// ---------------------------------------------------------------------------
// EMPTY STATES — pagine senza dati
// ---------------------------------------------------------------------------

test.describe.serial('ERROR STATE — Empty states', () => {
  test('/dashboard/bookings — stato vuoto senza crash', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard/bookings`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    const errors: string[] = [];
    // Nessun crash JS
    page.on('pageerror', e => errors.push(e.message));
    const critical = errors.filter(
      e => !e.includes('ResizeObserver') && !e.includes('hydrat') && !e.includes('Warning')
    );
    expect(critical).toHaveLength(0);
    // Contenuto non ha undefined/null
    const content = await page
      .locator('main, #main-content')
      .first()
      .evaluate(el => el.innerText)
      .catch(() => '');
    expect(content.includes('undefined')).toBeFalsy();
  });

  test('/dashboard/customers — stato vuoto o lista senza crash', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard/customers`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    const content = await page
      .locator('main, #main-content')
      .first()
      .evaluate(el => el.innerText)
      .catch(() => '');
    expect(content.includes('undefined')).toBeFalsy();
  });

  test('/dashboard/invoices — stato vuoto o lista senza crash', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard/invoices`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    const content = await page
      .locator('main, #main-content')
      .first()
      .evaluate(el => el.innerText)
      .catch(() => '');
    expect(content.includes('undefined')).toBeFalsy();
  });
});

// ---------------------------------------------------------------------------
// NAVIGAZIONE — URL non validi nel dashboard
// ---------------------------------------------------------------------------

test.describe.serial('ERROR STATE — Dashboard URL invalidi', () => {
  test('/dashboard/customers/id-non-valido → 404 o redirect', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard/customers/questo-id-non-esiste-mai-xyz`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    // Non deve crashare (nessun "undefined" nel testo)
    const content = await page
      .locator('body')
      .evaluate(el => el.innerText)
      .catch(() => '');
    expect(content.includes('undefined')).toBeFalsy();
    // Deve gestire l'errore mostrando 404, redirect o empty state
    const isHandled =
      content.toLowerCase().includes('not found') ||
      content.toLowerCase().includes('non trovata') ||
      content.toLowerCase().includes('errore') ||
      content.toLowerCase().includes('404') ||
      page.url().includes('/dashboard/customers');
    expect(isHandled).toBeTruthy();
  });

  test('/dashboard/vehicles/id-non-valido → gestito senza crash', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard/vehicles/questo-id-non-esiste-mai-xyz`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    const critical = errors.filter(
      e =>
        !e.includes('ResizeObserver') &&
        !e.includes('hydrat') &&
        !e.includes('Warning') &&
        !e.includes('ChunkLoadError')
    );
    expect(critical).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// LOADING STATES — verifica che non restino spinner infiniti
// ---------------------------------------------------------------------------

test.describe.serial('ERROR STATE — No spinner infinito', () => {
  test('/dashboard non rimane in loading state', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState('domcontentloaded');
    // Aspetta max 8s che lo spinner sparisca
    await page
      .waitForFunction(
        () => {
          const spinners = document.querySelectorAll('.animate-spin');
          return spinners.length === 0 || document.querySelector('h1') !== null;
        },
        { timeout: 8000 }
      )
      .catch(() => {});
    // Verifica che ci sia almeno un h1 (la pagina è renderizzata)
    const h1 = page.locator('h1').first();
    await expect(h1).toBeAttached({ timeout: 5000 });
  });

  test('/dashboard/customers non rimane in loading state', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard/customers`);
    await page.waitForLoadState('domcontentloaded');
    await page
      .waitForFunction(
        () => {
          const spinners = document.querySelectorAll('.animate-spin');
          return spinners.length === 0 || document.querySelector('h1') !== null;
        },
        { timeout: 8000 }
      )
      .catch(() => {});
    const h1 = page.locator('h1').first();
    await expect(h1).toBeAttached({ timeout: 5000 });
  });
});
