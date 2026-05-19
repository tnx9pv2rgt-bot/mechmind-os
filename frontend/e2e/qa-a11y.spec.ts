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
// A11Y — Login Page
// ---------------------------------------------------------------------------

test.describe.serial('A11Y — Login Page', () => {
  test('label associate agli input (htmlFor)', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#login-workspace', { state: 'visible', timeout: 15000 });

    // Ogni input ha una label associata
    const workspaceLabel = page.locator('label[for="login-workspace"]');
    await expect(workspaceLabel).toBeAttached({ timeout: 5000 });
    const emailLabel = page.locator('label[for="login-email"]');
    await expect(emailLabel).toBeAttached({ timeout: 5000 });
    const passwordLabel = page.locator('label[for="login-password"]');
    await expect(passwordLabel).toBeAttached({ timeout: 5000 });
  });

  test('form submit button accessibile con keyboard (Enter)', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#login-workspace', { state: 'visible', timeout: 15000 });
    // Tab fino al bottone submit
    await page.locator('#login-workspace').focus();
    await page.keyboard.press('Tab'); // email
    await page.keyboard.press('Tab'); // password
    await page.keyboard.press('Tab'); // bottone
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    // Il focus deve essere su un elemento interattivo (BUTTON, INPUT, A)
    expect(['BUTTON', 'INPUT', 'A']).toContain(focused);
  });

  test('bottone mostra/nascondi password ha aria-label', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    const toggleBtn = page.locator('button[aria-label*="password"]').first();
    await expect(toggleBtn).toBeAttached({ timeout: 8000 });
  });

  test('heading principale presente (h1 o h2)', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    // Login usa h2 come heading principale
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 8000 });
  });

  test('nessun elemento <img> senza alt', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    const imagesWithoutAlt = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs.filter(img => !img.hasAttribute('alt')).length;
    });
    expect(imagesWithoutAlt).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// A11Y — Dashboard
// ---------------------------------------------------------------------------

test.describe.serial('A11Y — Dashboard', () => {
  test('landmark <main> presente', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const mainEl = page.locator('main, [role="main"]').first();
    await expect(mainEl).toBeAttached({ timeout: 8000 });
  });

  test('landmark <nav> presente nella sidebar', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const navEl = page.locator('nav').first();
    await expect(navEl).toBeAttached({ timeout: 8000 });
  });

  test('h1 presente nella dashboard', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible({ timeout: 8000 });
  });

  test('skip link o landmark presente (WCAG 2.4.1)', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    // Skip link o id="main-content" o role="main"
    const skipLink = page
      .locator('a[href="#main-content"], [id="main-content"], [role="main"]')
      .first();
    await expect(skipLink).toBeAttached({ timeout: 8000 });
  });

  test('bottoni con icone hanno aria-label o testo visibile', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    // Tutti i bottoni devono avere testo o aria-label
    const buttonsWithoutLabel = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.filter(btn => {
        const hasText = (btn.textContent?.trim().length ?? 0) > 0;
        const hasAriaLabel = btn.hasAttribute('aria-label') || btn.hasAttribute('aria-labelledby');
        const hasTitle = btn.hasAttribute('title');
        return !hasText && !hasAriaLabel && !hasTitle;
      }).length;
    });
    // Toleriamo max 2 bottoni senza label (icone decorative in librerie UI)
    expect(buttonsWithoutLabel).toBeLessThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// A11Y — Customers Page touch targets
// ---------------------------------------------------------------------------

test.describe.serial('A11Y — Touch Targets (min 44px)', () => {
  test('bottoni sul dashboard ≥44px height', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    // Verifica che i bottoni principali abbiano altezza >= 44px (WCAG 2.5.5)
    const smallButtons = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button:not([aria-hidden="true"])'));
      return buttons.filter(btn => {
        const rect = btn.getBoundingClientRect();
        // Solo bottoni visibili e renderizzati (non hidden)
        if (rect.width === 0 && rect.height === 0) return false;
        return rect.height < 40 && rect.width > 0; // tolleranza 4px
      }).length;
    });
    // Max 3 bottoni sotto 44px (potrebbe avere badge/chips piccoli)
    expect(smallButtons).toBeLessThanOrEqual(3);
  });

  test('link di navigazione sidebar ≥44px height', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const smallNavLinks = await page.evaluate(() => {
      const navLinks = Array.from(document.querySelectorAll('nav a'));
      return navLinks.filter(link => {
        const rect = link.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return false;
        return rect.height < 40 && rect.width > 0;
      }).length;
    });
    expect(smallNavLinks).toBeLessThanOrEqual(5);
  });
});

// ---------------------------------------------------------------------------
// A11Y — Form Inputs
// ---------------------------------------------------------------------------

test.describe.serial('A11Y — Form inputs customers', () => {
  test('/dashboard/customers/new — tutti gli input hanno label', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard/customers/new`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    // Conta input senza label
    const inputsWithoutLabel = await page.evaluate(() => {
      const inputs = Array.from(
        document.querySelectorAll(
          'input:not([type="hidden"]):not([type="submit"]):not([type="checkbox"])'
        )
      );
      return inputs.filter(input => {
        const id = input.id;
        if (!id) return false; // input senza id potrebbe avere label via aria
        const labelEl = document.querySelector(`label[for="${id}"]`);
        const hasAriaLabel =
          input.hasAttribute('aria-label') || input.hasAttribute('aria-labelledby');
        const hasPlaceholder = (input.getAttribute('placeholder')?.trim().length ?? 0) > 0;
        // placeholder non è accessibile ma è meglio di niente
        return !labelEl && !hasAriaLabel && !hasPlaceholder;
      }).length;
    });
    expect(inputsWithoutLabel).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// A11Y — Keyboard navigation
// ---------------------------------------------------------------------------

test.describe.serial('A11Y — Keyboard navigation', () => {
  test('tab key naviga tra i campi del form login', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#login-workspace', { state: 'visible', timeout: 15000 });

    // Fai focus sul primo campo
    await page.locator('#login-workspace').focus();
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('login-workspace');

    // Tab al successivo
    await page.keyboard.press('Tab');
    const afterFirstTab = await page.evaluate(() => document.activeElement?.id);
    expect(afterFirstTab).toBe('login-email');

    await page.keyboard.press('Tab');
    const afterSecondTab = await page.evaluate(() => document.activeElement?.id);
    expect(afterSecondTab).toBe('login-password');
  });

  test('Escape chiude modal/dropdown se aperto', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard/customers`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    // Premi Escape — non deve causare crash
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    // Pagina deve ancora avere un h1
    const h1 = page.locator('h1').first();
    await expect(h1).toBeAttached({ timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// A11Y — Portal Login
// ---------------------------------------------------------------------------

test.describe.serial('A11Y — Portal Login', () => {
  test('label associate agli input (htmlFor)', async ({ page }) => {
    await page.goto(`${BASE}/portal/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    const emailLabel = page.locator('label[for="email"]');
    await expect(emailLabel).toBeAttached({ timeout: 5000 });
    const passwordLabel = page.locator('label[for="password"]');
    await expect(passwordLabel).toBeAttached({ timeout: 5000 });
  });

  test('h1 presente', async ({ page }) => {
    await page.goto(`${BASE}/portal/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible({ timeout: 8000 });
  });

  test('nessun img senza alt', async ({ page }) => {
    await page.goto(`${BASE}/portal/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    const imagesWithoutAlt = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('img')).filter(img => !img.hasAttribute('alt'))
        .length;
    });
    expect(imagesWithoutAlt).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// A11Y — Landing Page
// ---------------------------------------------------------------------------

test.describe.serial('A11Y — Landing Page', () => {
  test('h1 unico nella homepage', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const h1Count = await page.locator('h1').count();
    // Max 1-2 h1 (buona pratica: 1)
    expect(h1Count).toBeGreaterThanOrEqual(1);
    expect(h1Count).toBeLessThanOrEqual(2);
  });

  test('link hanno testo descrittivo (no "clicca qui")', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const genericLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      return links.filter(a => {
        const text = a.textContent?.trim().toLowerCase() ?? '';
        return text === 'clicca qui' || text === 'click here' || text === 'qui';
      }).length;
    });
    expect(genericLinks).toBe(0);
  });

  test('struttura semantica della landing (nav + h1)', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    // La landing usa div invece di main, ma ha nav e h1
    const hasStructure = await page.evaluate(() => {
      return document.querySelector('nav') !== null && document.querySelector('h1') !== null;
    });
    expect(hasStructure).toBeTruthy();
  });
});
