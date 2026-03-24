import { test, expect } from './fixtures/auth.fixture';
import type { Page } from '@playwright/test';

/**
 * Bookings page functional audit
 * Tests run against http://localhost:3001/dashboard/bookings
 */

test.use({ reducedMotion: 'reduce' });

async function goToBookings(page: Page) {
  await page.goto('/dashboard/bookings', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1500);
}

// ─── BK1: Rendering base ─────────────────────────────────────────────────────

test.describe('BK1 — Rendering base', () => {
  test('page loads without JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => {
      if (!err.message.includes('hydrat') && !err.message.includes('Text content does not match')) {
        errors.push(err.message);
      }
    });
    await goToBookings(page);
    expect(errors).toEqual([]);
  });

  test('header and title visible', async ({ page }) => {
    await goToBookings(page);
    await expect(page.locator('h1:has-text("Prenotazioni")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Gestisci gli appuntamenti')).toBeVisible();
  });

  test('new booking button visible', async ({ page }) => {
    await goToBookings(page);
    await expect(page.locator('text=Nuova Prenotazione')).toBeVisible({ timeout: 5000 });
  });
});

// ─── BK2: Dati e lista ───────────────────────────────────────────────────────

test.describe('BK2 — Dati e lista', () => {
  test('booking stats cards render', async ({ page }) => {
    await goToBookings(page);
    await expect(page.locator('text=Oggi')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Questa settimana')).toBeVisible();
    await expect(page.locator('text=In attesa').first()).toBeVisible();
    await expect(page.locator('text=Completate')).toBeVisible();
  });

  test('booking list renders with entries', async ({ page }) => {
    await goToBookings(page);
    await expect(page.locator('text=Lista Prenotazioni')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Mario Rossi').first()).toBeVisible();
    await expect(page.locator('text=Laura Bianchi').first()).toBeVisible();
  });

  test('DATA IS HARDCODED — no API calls to backend', async ({ page }) => {
    const apiCalls: string[] = [];
    page.on('request', (req) => {
      const url = req.url();
      if (url.includes('/api/') && !url.includes('_next') && !url.includes('favicon')) {
        apiCalls.push(url);
      }
    });
    await goToBookings(page);
    console.log(`Bookings API calls: ${apiCalls.length} (${apiCalls.join(', ') || 'NONE'})`);
  });

  test('booking status badges render correctly', async ({ page }) => {
    await goToBookings(page);
    await expect(page.locator('text=Confermato').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=In corso').first()).toBeVisible();
  });
});

// ─── BK3: Search & Filter ─────────────────────────────────────────────────────

test.describe('BK3 — Search & Filter', () => {
  test('search input is present and functional', async ({ page }) => {
    await goToBookings(page);
    const searchInput = page.locator('input[placeholder*="Cerca"]');
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    // Search for a specific customer
    await searchInput.fill('Laura');
    await page.waitForTimeout(500);

    // Laura Bianchi should be visible, Mario Rossi should be filtered out
    await expect(page.locator('text=Laura Bianchi').first()).toBeVisible();
    // Check Mario is gone (filtered)
    const marioVisible = await page.locator('text=Mario Rossi').isVisible().catch(() => false);
    expect(marioVisible).toBeFalsy();
  });

  test('date filter input is present', async ({ page }) => {
    await goToBookings(page);
    const dateInput = page.locator('input[type="date"]');
    await expect(dateInput).toBeVisible({ timeout: 5000 });
  });

  test('filter button is present', async ({ page }) => {
    await goToBookings(page);
    await expect(page.locator('button:has-text("Filtra")')).toBeVisible({ timeout: 5000 });
  });
});

// ─── BK4: Navigation ──────────────────────────────────────────────────────────

test.describe('BK4 — Navigation', () => {
  test('"Nuova Prenotazione" button links to new booking page', async ({ page }) => {
    await goToBookings(page);
    const newBookingLink = page.locator('a[href="/dashboard/bookings/new"]');
    await expect(newBookingLink).toBeVisible({ timeout: 5000 });
  });

  test('new booking page loads with form', async ({ page }) => {
    await page.goto('/dashboard/bookings/new', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1500);
    // Should show booking form
    const hasForm = await page.locator('form').isVisible().catch(() => false);
    const hasContent = await page.locator('text=/Prenota|Prenotazione|Cliente|Servizio|Nuova/i').first().isVisible().catch(() => false);
    expect(hasForm || hasContent).toBeTruthy();
  });

  test('booking detail page loads', async ({ page }) => {
    await page.goto('/dashboard/bookings/bk-001', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1500);
    // Should show booking detail with service name
    await expect(page.locator('text=Tagliando completo')).toBeVisible({ timeout: 5000 });
  });
});

// ─── BK5: Booking detail ──────────────────────────────────────────────────────

test.describe('BK5 — Booking detail page', () => {
  test('customer info visible', async ({ page }) => {
    await page.goto('/dashboard/bookings/bk-001', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1500);
    await expect(page.locator('text=Mario Rossi').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=+39 333 123 4567')).toBeVisible();
  });

  test('vehicle info visible with plate (not ciphertext)', async ({ page }) => {
    await page.goto('/dashboard/bookings/bk-001', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1500);
    await expect(page.locator('text=AB123CD')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Fiat').first()).toBeVisible();
  });

  test('timeline renders', async ({ page }) => {
    await page.goto('/dashboard/bookings/bk-001', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1500);
    await expect(page.locator('text=Cronologia')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Lavorazione iniziata')).toBeVisible();
  });

  test('action buttons render', async ({ page }) => {
    await page.goto('/dashboard/bookings/bk-001', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1500);
    await expect(page.locator('text=WhatsApp Cliente')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Completa Lavoro')).toBeVisible();
    await expect(page.locator('text=Annulla Prenotazione')).toBeVisible();
  });

  test('financial summary renders', async ({ page }) => {
    await page.goto('/dashboard/bookings/bk-001', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1500);
    await expect(page.locator('text=Preventivo')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=€280')).toBeVisible();
  });
});

// ─── BK6: Responsive ──────────────────────────────────────────────────────────

test.describe('BK6 — Responsive', () => {
  test('mobile 375px: bookings list readable', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await goToBookings(page);
    await expect(page.locator('h1:has-text("Prenotazioni")')).toBeVisible({ timeout: 5000 });
  });
});

// ─── BK7: Auth guard ──────────────────────────────────────────────────────────

test.describe('BK7 — Auth guard', () => {
  test('bookings accessible without login (NO AUTH GUARD)', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/dashboard/bookings', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    const url = page.url();
    console.log(`Bookings without auth: URL=${url}`);
    if (url.includes('/dashboard/bookings')) {
      console.log('BUG: Bookings page is accessible without authentication!');
    }
  });
});
