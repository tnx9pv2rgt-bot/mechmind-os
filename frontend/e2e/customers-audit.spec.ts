import { test, expect } from './fixtures/auth.fixture';
import type { Page } from '@playwright/test';

/**
 * Customers page functional audit
 * Tests run against http://localhost:3001/dashboard/customers
 */

test.use({ reducedMotion: 'reduce' });

async function goToCustomers(page: Page) {
  await page.goto('/dashboard/customers', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1500);
}

// ─── C1: Rendering base ──────────────────────────────────────────────────────

test.describe('C1 — Rendering base', () => {
  test('page loads without JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => {
      if (!err.message.includes('hydrat') && !err.message.includes('Text content does not match')) {
        errors.push(err.message);
      }
    });
    await goToCustomers(page);
    expect(errors).toEqual([]);
  });

  test('header and title visible', async ({ page }) => {
    await goToCustomers(page);
    await expect(page.locator('h1:has-text("Clienti")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Gestisci il tuo database clienti')).toBeVisible();
  });

  test('new customer button visible', async ({ page }) => {
    await goToCustomers(page);
    await expect(page.locator('text=Nuovo Cliente')).toBeVisible({ timeout: 5000 });
  });
});

// ─── C2: Dati e lista ────────────────────────────────────────────────────────

test.describe('C2 — Dati e lista', () => {
  test('customer stats cards render', async ({ page }) => {
    await goToCustomers(page);
    await expect(page.locator('text=Clienti Totali')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Nuovi questo mese')).toBeVisible();
  });

  test('customer cards render with PII in chiaro', async ({ page }) => {
    await goToCustomers(page);
    // PII should be readable, not ciphertext
    await expect(page.locator('text=Mario Rossi').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=mario@email.it')).toBeVisible();
    await expect(page.locator('text=+39 333 1234567')).toBeVisible();
    // Note: these are mock data, not from backend EncryptionService
    console.log('WARNING: PII is mock data — not decrypted from EncryptionService');
  });

  test('loyalty badges render', async ({ page }) => {
    await goToCustomers(page);
    await expect(page.locator('text=Gold').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Silver').first()).toBeVisible();
  });

  test('DATA IS HARDCODED — no API calls', async ({ page }) => {
    const apiCalls: string[] = [];
    page.on('request', (req) => {
      const url = req.url();
      if (url.includes('/api/') && !url.includes('_next')) {
        apiCalls.push(url);
      }
    });
    await goToCustomers(page);
    console.log(`Customers API calls: ${apiCalls.length} (${apiCalls.join(', ') || 'NONE'})`);
  });
});

// ─── C3: Search ───────────────────────────────────────────────────────────────

test.describe('C3 — Search', () => {
  test('search filters customers by name', async ({ page }) => {
    await goToCustomers(page);
    const searchInput = page.locator('input[placeholder*="Cerca clienti"]');
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    await searchInput.fill('Giuseppe');
    await page.waitForTimeout(500);
    await expect(page.locator('text=Giuseppe Verdi')).toBeVisible();
    const marioVisible = await page.locator('text=Mario Rossi').isVisible().catch(() => false);
    expect(marioVisible).toBeFalsy();
  });

  test('search filters customers by email', async ({ page }) => {
    await goToCustomers(page);
    const searchInput = page.locator('input[placeholder*="Cerca clienti"]');
    await searchInput.fill('laura@');
    await page.waitForTimeout(500);
    await expect(page.locator('text=Laura Bianchi')).toBeVisible();
  });
});

// ─── C4: GDPR buttons ────────────────────────────────────────────────────────

test.describe('C4 — GDPR compliance UI', () => {
  test('MISSING: no "Esporta dati" button on customer page', async ({ page }) => {
    await goToCustomers(page);
    const exportBtn = await page.locator('text=/Esporta dati|Export data|GDPR/i').isVisible().catch(() => false);
    console.log(`GDPR Export button present: ${exportBtn}`);
    // This is expected to be false — it's a bug finding
    if (!exportBtn) {
      console.log('BUG: No GDPR data export button on customers page');
    }
  });

  test('MISSING: no "Elimina account" button on customer page', async ({ page }) => {
    await goToCustomers(page);
    const deleteBtn = await page.locator('text=/Elimina account|Cancella dati|Delete account/i').isVisible().catch(() => false);
    console.log(`GDPR Delete button present: ${deleteBtn}`);
    if (!deleteBtn) {
      console.log('BUG: No GDPR delete button on customers page');
    }
  });
});

// ─── C5: Navigation ──────────────────────────────────────────────────────────

test.describe('C5 — Navigation', () => {
  test('new customer link works', async ({ page }) => {
    await goToCustomers(page);
    const newLink = page.locator('a[href="/dashboard/customers/new"]');
    await expect(newLink).toBeVisible({ timeout: 5000 });
  });

  test('new customer wizard loads', async ({ page }) => {
    await page.goto('/dashboard/customers/new', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    // Should redirect to landing or show step 1
    const url = page.url();
    const hasContent = url.includes('customers/new');
    expect(hasContent).toBeTruthy();
  });

  test('"Dettagli" button present on customer cards', async ({ page }) => {
    await goToCustomers(page);
    const detailButtons = page.locator('button:has-text("Dettagli")');
    const count = await detailButtons.count();
    expect(count).toBeGreaterThan(0);
    console.log(`Detail buttons found: ${count}`);
  });
});

// ─── C6: Responsive ──────────────────────────────────────────────────────────

test.describe('C6 — Responsive', () => {
  test('mobile 375px: customer cards readable', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await goToCustomers(page);
    await expect(page.locator('h1:has-text("Clienti")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Mario Rossi').first()).toBeVisible();
  });
});

// ─── C7: Auth guard ──────────────────────────────────────────────────────────

test.describe('C7 — Auth guard', () => {
  test('customers accessible without login (NO AUTH GUARD)', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/dashboard/customers', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    const url = page.url();
    console.log(`Customers without auth: URL=${url}`);
    if (url.includes('/dashboard/customers')) {
      console.log('BUG: Customers page is accessible without authentication!');
    }
  });
});
