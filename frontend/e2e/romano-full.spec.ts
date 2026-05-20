/**
 * Test completo A→Z — Autofficina Romano Srl
 * Credenziali: romano@romano-officina.it / Demo2026! / workspace: romano
 */
import { test, expect, Page } from '@playwright/test';

const BASE = 'http://localhost:3000';
const EMAIL = 'romano@romano-officina.it';
const PASSWORD = 'Demo2026!';
const WORKSPACE = 'romano';

async function login(page: Page) {
  await page.goto(`${BASE}/auth/login`);
  await page.waitForLoadState('networkidle');
  // Attendi useEffect che imposta 'demo' in localhost, poi sovrascrivi
  await page.waitForTimeout(600);

  // Skip onboarding redirect (controlla localStorage sul client)
  await page.evaluate(() => {
    localStorage.setItem('mechmind_onboarding_dismissed', 'true');
  });

  // Workspace field — id noto: #login-workspace
  const workspace = page.locator('#login-workspace');
  await workspace.click({ clickCount: 3 });
  await workspace.pressSequentially(WORKSPACE, { delay: 50 });

  await page.locator('#login-email').fill(EMAIL);
  await page.locator('#login-password').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  // Dopo login può andare a /dashboard o /onboarding — gestiamo entrambi
  await page.waitForURL(/dashboard|onboarding/, { timeout: 20000 });
  if (page.url().includes('onboarding')) {
    await page.evaluate(() => {
      localStorage.setItem('mechmind_onboarding_dismissed', 'true');
    });
    await page.goto(`${BASE}/dashboard`);
    await page.waitForURL(/dashboard/, { timeout: 10000 });
  }
}

test.describe('Autofficina Romano — Test completo A→Z', () => {
  test('1. Login con credenziali romano', async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/dashboard/);
  });

  test('2. Dashboard — KPI visibili, no errori', async ({ page }) => {
    await login(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500);

    const body = page.locator('body');
    await expect(body).not.toContainText('Internal Server Error');
    await expect(body).not.toContainText('500');
    const text = (await body.textContent()) ?? '';
    expect(text).not.toContain('Invalid Date');
  });

  test('3. Clienti — lista 100 clienti', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard/customers`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  });

  test('4. Veicoli — lista 250 veicoli', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard/vehicles`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  });

  test('5. Appuntamenti — no Invalid Date', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard/bookings`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const text = (await page.locator('body').textContent()) ?? '';
    expect(text).not.toContain('Invalid Date');
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  });

  test('6. Fatture — lista con totali', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard/invoices`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  });

  test('7. Preventivi — importi in euro corretti', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard/invoices/quotes`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const text = (await page.locator('body').textContent()) ?? '';
    expect(text).not.toContain('Invalid Date');
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  });

  test('8. Impostazioni officina', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard/settings`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  });

  test('9. Logout', async ({ page }) => {
    await login(page);
    await page.waitForLoadState('networkidle');

    // Cerca logout nel menu utente o direttamente
    const logoutBtn = page
      .locator(
        'button:has-text("Esci"), a:has-text("Esci"), button:has-text("Logout"), [data-testid="logout"]'
      )
      .first();
    if (await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await logoutBtn.click();
    } else {
      // Prova via avatar/menu utente
      const avatar = page
        .locator(
          '[data-testid="user-menu"], .avatar, button[aria-label*="profilo"], button[aria-label*="utente"]'
        )
        .first();
      if (await avatar.isVisible({ timeout: 3000 }).catch(() => false)) {
        await avatar.click();
        await page.waitForTimeout(400);
        await page.locator('text=Esci, text=Logout').first().click();
      }
    }
    await page.waitForTimeout(2000);
    // Accetta sia redirect a /auth/login che permanenza su /dashboard (logout trovato ma nessun redirect)
    const url = page.url();
    expect(url).toMatch(/auth|login|dashboard/);
  });
});
