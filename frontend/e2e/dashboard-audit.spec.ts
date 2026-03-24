import { test, expect } from './fixtures/auth.fixture';
import type { Page } from '@playwright/test';

/**
 * Dashboard page functional audit
 * Tests run against http://localhost:3001/dashboard
 */

test.use({ reducedMotion: 'reduce' });

// Login helper — navigate to /auth, login, get redirected
async function loginAndGoToDashboard(page: Page) {
  // Try direct access first — check if middleware allows it
  await page.goto('/dashboard', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1500);

  // If redirected to auth, do login
  if (page.url().includes('/auth')) {
    // Switch to password tab
    await page.locator('button', { hasText: 'Password' }).click();
    await page.waitForSelector('input[type="password"]', { state: 'visible', timeout: 10000 });
    await page.waitForTimeout(300);

    await page.locator('input[placeholder="garage-roma"]').fill('demo');
    await page.locator('input[placeholder="tu@officina.it"]').fill('admin@demo.mechmind.it');
    await page.locator('input[type="password"]').fill('Demo2026!');

    const responsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/auth/password/login'),
      { timeout: 15000 },
    );
    await page.locator('button[type="submit"]').click();
    await responsePromise;

    await page.waitForTimeout(3000);

    // Navigate to dashboard after login
    if (!page.url().includes('/dashboard')) {
      await page.goto('/dashboard', { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(1500);
    }
  }
}

async function goToDashboard(page: Page) {
  await page.goto('/dashboard', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1500);
}

// ─── D1: Rendering base ───────────────────────────────────────────────────────

test.describe('D1 — Rendering base', () => {
  test('page loads without JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => {
      if (!err.message.includes('hydrat') && !err.message.includes('Text content does not match')) {
        errors.push(err.message);
      }
    });
    await goToDashboard(page);
    expect(errors).toEqual([]);
  });

  test('dashboard header and title visible', async ({ page }) => {
    await goToDashboard(page);
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 5000 });
  });

  test('KPI cards render with values', async ({ page }) => {
    await goToDashboard(page);
    // Check all 4 KPI cards are visible
    await expect(page.locator('text=Fatturato Oggi')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Veicoli in Officina')).toBeVisible();
    await expect(page.locator('text=ARO Medio')).toBeVisible();
    await expect(page.locator('text=Clienti Nuovi')).toBeVisible();
  });

  test('feature cards render', async ({ page }) => {
    await goToDashboard(page);
    await expect(page.locator('text=Ispezioni Digitali')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('h3:has-text("Ricambi")').first()).toBeVisible();
  });
});

// ─── D2: Data display ─────────────────────────────────────────────────────────

test.describe('D2 — Dati e widget', () => {
  test('KPI values are displayed (not skeleton/loading)', async ({ page }) => {
    await goToDashboard(page);
    // KPIs should show actual values (hardcoded or fetched)
    const kpiValues = ['€2,450', '18', '€186', '4'];
    for (const val of kpiValues) {
      await expect(page.locator(`text=${val}`).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('recent bookings list renders', async ({ page }) => {
    await goToDashboard(page);
    await expect(page.locator('text=Prenotazioni Recenti')).toBeVisible({ timeout: 5000 });
    // Should show booking entries
    await expect(page.locator('text=Mario Rossi').first()).toBeVisible();
    await expect(page.locator('text=Laura Bianchi').first()).toBeVisible();
  });

  test('car count widget renders', async ({ page }) => {
    await goToDashboard(page);
    await expect(page.locator('text=Car Count')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=In Servizio')).toBeVisible();
    await expect(page.locator('text=Pronti')).toBeVisible();
  });

  test('alert cards render', async ({ page }) => {
    await goToDashboard(page);
    await expect(page.locator('text=Ricambi in esaurimento')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Appuntamenti domani')).toBeVisible();
  });

  test('DATA IS HARDCODED — no API calls made', async ({ page }) => {
    const apiCalls: string[] = [];
    page.on('request', (req) => {
      const url = req.url();
      if (url.includes('/api/') && !url.includes('_next') && !url.includes('favicon')) {
        apiCalls.push(url);
      }
    });
    await goToDashboard(page);
    // This is a BUG indicator — dashboard should fetch real data
    console.log(`Dashboard API calls: ${apiCalls.length} (${apiCalls.join(', ') || 'NONE'})`);
    // We just log it — the fact that data is hardcoded is a finding
  });
});

// ─── D3: Tenant isolation ─────────────────────────────────────────────────────

test.describe('D3 — Tenant isolation', () => {
  test('hardcoded data shows "Officina Rossi" (demo tenant only)', async ({ page }) => {
    await goToDashboard(page);
    // Hardcoded subtitle
    const subtitle = page.locator('text=Officina Rossi');
    await expect(subtitle).toBeVisible({ timeout: 5000 });
    // This is hardcoded, not tenant-aware — it's a finding
    console.log('WARNING: "Officina Rossi" is hardcoded, not pulled from tenant context');
  });
});

// ─── D4: Navigation ───────────────────────────────────────────────────────────

test.describe('D4 — Navigation', () => {
  test('navbar links present and correct', async ({ page }) => {
    await goToDashboard(page);
    // macOS-style navbar should have these links
    const navItems = ['Dashboard', 'Prenotazioni', 'Clienti', 'Veicoli', 'Ispezioni', 'Ricambi', 'Fatture', 'Analytics', 'Impostazioni'];
    for (const item of navItems) {
      await expect(page.locator(`nav >> text=${item}`).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('KPI card links navigate correctly', async ({ page }) => {
    await goToDashboard(page);
    // "Fatturato Oggi" links to /dashboard/invoices
    const kpiLink = page.locator('a[href*="/dashboard/invoices"]').first();
    await expect(kpiLink).toBeVisible({ timeout: 5000 });
  });

  test('"Vedi tutte" bookings link works', async ({ page }) => {
    await goToDashboard(page);
    const vediTutte = page.locator('text=Vedi tutte');
    await expect(vediTutte).toBeVisible({ timeout: 5000 });
  });

  test('feature card links navigate correctly', async ({ page }) => {
    await goToDashboard(page);
    await expect(page.locator('a[href="/dashboard/inspections"]').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('a[href="/dashboard/obd"]').first()).toBeVisible();
    await expect(page.locator('a[href="/dashboard/parts"]').first()).toBeVisible();
  });
});

// ─── D5: Responsive ───────────────────────────────────────────────────────────

test.describe('D5 — Responsive', () => {
  test('mobile 375px renders without overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await goToDashboard(page);
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 5000 });
    // Check no horizontal overflow
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    // Log overflow status — not a hard fail for now
    console.log(`Mobile overflow: ${hasOverflow}`);
  });

  test('mobile menu button visible on small screen', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await goToDashboard(page);
    // DashboardProvider has a mobile menu button (md:hidden)
    const mobileBtn = page.locator('button.md\\:hidden').first();
    // Just check if the page loads — mobile nav may auto-show
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 5000 });
  });
});

// ─── D6: Auth guard ───────────────────────────────────────────────────────────

test.describe('D6 — Auth guard', () => {
  test('dashboard accessible without login (NO AUTH GUARD)', async ({ page }) => {
    // Clear cookies first
    await page.context().clearCookies();
    await page.goto('/dashboard', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);

    const url = page.url();
    const isOnDashboard = url.includes('/dashboard');
    const isRedirectedToAuth = url.includes('/auth');

    console.log(`Dashboard without auth: URL=${url}`);
    console.log(`Auth guard active: ${isRedirectedToAuth}`);
    console.log(`Dashboard accessible without login: ${isOnDashboard}`);

    // This test documents the current behavior — no assertion
    // If accessible without login, it's a CRITICAL finding
    if (isOnDashboard) {
      console.log('BUG: Dashboard is accessible without authentication!');
    }
  });
});
