import { test, expect, Page } from '@playwright/test';

/**
 * Vehicles page functional audit
 * Tests run against http://localhost:3001/dashboard/vehicles
 */

test.use({ reducedMotion: 'reduce' });

async function goToVehicles(page: Page) {
  await page.goto('/dashboard/vehicles', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1500);
}

// ─── V1: Rendering ───────────────────────────────────────────────────────────

test.describe('V1 — Rendering base', () => {
  test('page loads without JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => {
      if (!err.message.includes('hydrat') && !err.message.includes('Text content does not match')) {
        errors.push(err.message);
      }
    });
    await goToVehicles(page);
    expect(errors).toEqual([]);
  });

  test('header and title visible', async ({ page }) => {
    await goToVehicles(page);
    await expect(page.locator('h1:has-text("Veicoli")')).toBeVisible({ timeout: 5000 });
  });

  test('new vehicle button visible', async ({ page }) => {
    await goToVehicles(page);
    await expect(page.locator('text=Nuovo Veicolo')).toBeVisible({ timeout: 5000 });
  });
});

// ─── V2: Data ─────────────────────────────────────────────────────────────────

test.describe('V2 — Dati e lista', () => {
  test('vehicle stats render', async ({ page }) => {
    await goToVehicles(page);
    await expect(page.locator('text=Totale Veicoli')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=In Officina')).toBeVisible();
  });

  test('vehicle cards render with plate visible (not ciphertext)', async ({ page }) => {
    await goToVehicles(page);
    await expect(page.locator('text=AB123CD')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=CD456EF')).toBeVisible();
    // Plates are readable, not encrypted
    console.log('Plates in chiaro (mock data, not from EncryptionService)');
  });

  test('vehicle status badges render', async ({ page }) => {
    await goToVehicles(page);
    await expect(page.locator('text=Pronto').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=In lavorazione').first()).toBeVisible();
  });

  test('owner name visible on cards', async ({ page }) => {
    await goToVehicles(page);
    await expect(page.locator('text=Mario Rossi').first()).toBeVisible({ timeout: 5000 });
  });

  test('service dates visible', async ({ page }) => {
    await goToVehicles(page);
    await expect(page.locator('text=Ultimo service').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Prossimo service').first()).toBeVisible();
  });

  test('DATA IS HARDCODED — no API calls', async ({ page }) => {
    const apiCalls: string[] = [];
    page.on('request', (req) => {
      const url = req.url();
      if (url.includes('/api/') && !url.includes('_next')) {
        apiCalls.push(url);
      }
    });
    await goToVehicles(page);
    console.log(`Vehicles API calls: ${apiCalls.length} (${apiCalls.join(', ') || 'NONE'})`);
  });
});

// ─── V3: Search ───────────────────────────────────────────────────────────────

test.describe('V3 — Search', () => {
  test('search by plate works', async ({ page }) => {
    await goToVehicles(page);
    const searchInput = page.locator('input[placeholder*="Cerca per targa"]');
    await expect(searchInput).toBeVisible({ timeout: 5000 });
    await searchInput.fill('AB123');
    await page.waitForTimeout(500);
    await expect(page.locator('text=AB123CD')).toBeVisible();
    const otherVisible = await page.locator('text=CD456EF').isVisible().catch(() => false);
    expect(otherVisible).toBeFalsy();
  });

  test('search by owner works', async ({ page }) => {
    await goToVehicles(page);
    const searchInput = page.locator('input[placeholder*="Cerca per targa"]');
    await searchInput.fill('Laura');
    await page.waitForTimeout(500);
    await expect(page.locator('text=Laura Bianchi')).toBeVisible();
  });
});

// ─── V4: Responsive ──────────────────────────────────────────────────────────

test.describe('V4 — Responsive', () => {
  test('mobile 375px: vehicle cards readable', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await goToVehicles(page);
    await expect(page.locator('h1:has-text("Veicoli")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=AB123CD')).toBeVisible();
  });
});

// ─── V5: Auth guard ──────────────────────────────────────────────────────────

test.describe('V5 — Auth guard', () => {
  test('vehicles accessible without login (NO AUTH GUARD)', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/dashboard/vehicles', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    const url = page.url();
    console.log(`Vehicles without auth: URL=${url}`);
    if (url.includes('/dashboard/vehicles')) {
      console.log('BUG: Vehicles page is accessible without authentication!');
    }
  });
});
