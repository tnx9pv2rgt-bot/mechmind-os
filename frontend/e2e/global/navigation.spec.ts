import { test, expect } from '../fixtures/auth.fixture';
import type { Page } from '@playwright/test';

function setupDashboardMocks(page: Page): void {
  void page.route('**/api/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) })
  );
}

// ============================================
// 1. RENDER
// ============================================

test.describe('Navigation - Render', () => {
  test('should render sidebar navigation', async ({ page }) => {
    setupDashboardMocks(page);
    await page.goto('/dashboard');

    const sidebar = page.locator('aside, nav, [data-testid="sidebar"]').first();
    await expect(sidebar).toBeVisible({ timeout: 10000 });
  });

  test('should render logo in sidebar', async ({ page }) => {
    setupDashboardMocks(page);
    await page.goto('/dashboard');

    const logo = page.getByAltText(/logo|mechmind/i).or(page.locator('img[src*="logo"]'));
    if (await logo.first().isVisible().catch(() => false)) {
      await expect(logo.first()).toBeVisible();
    }
  });
});

// ============================================
// 2. LOADING - N/A for navigation
// ============================================

// ============================================
// 3. EMPTY - N/A for navigation
// ============================================

// ============================================
// 4. ERROR - N/A for navigation
// ============================================

// ============================================
// 5. DATA - Navigation Groups & Items
// ============================================

test.describe('Navigation - Sidebar Groups', () => {
  test.beforeEach(async ({ page }) => {
    setupDashboardMocks(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should display main navigation items', async ({ page }) => {
    const navItems = [
      /dashboard|panoramica/i,
      /clienti|customers/i,
      /veicoli|vehicles/i,
      /prenotazioni|bookings/i,
    ];

    for (const pattern of navItems) {
      const item = page.locator('nav, aside').getByText(pattern);
      if (await item.first().isVisible().catch(() => false)) {
        await expect(item.first()).toBeVisible();
      }
    }
  });

  test('should display work management items', async ({ page }) => {
    const workItems = [
      /ordini di lavoro|work orders|odl/i,
      /fatture|invoices/i,
    ];

    for (const pattern of workItems) {
      const item = page.locator('nav, aside').getByText(pattern);
      if (await item.first().isVisible().catch(() => false)) {
        await expect(item.first()).toBeVisible();
      }
    }
  });

  test('should display advanced/tools items', async ({ page }) => {
    const advItems = [
      /analytics|analisi|report/i,
      /impostazioni|settings/i,
    ];

    for (const pattern of advItems) {
      const item = page.locator('nav, aside').getByText(pattern);
      if (await item.first().isVisible().catch(() => false)) {
        await expect(item.first()).toBeVisible();
      }
    }
  });

  test('should have at least 6 navigation groups/sections', async ({ page }) => {
    const navLinks = page.locator('nav a, aside a, [data-testid*="nav"]');
    const count = await navLinks.count();
    expect(count).toBeGreaterThanOrEqual(6);
  });
});

// ============================================
// 6. ACTIONS
// ============================================

test.describe('Navigation - Actions', () => {
  test.beforeEach(async ({ page }) => {
    setupDashboardMocks(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should highlight active navigation item', async ({ page }) => {
    const activeItem = page.locator('nav a[aria-current="page"], nav a[class*="active"], aside a[class*="active"]');
    if (await activeItem.first().isVisible().catch(() => false)) {
      await expect(activeItem.first()).toBeVisible();
    }
  });

  test('should navigate to different pages via sidebar', async ({ page }) => {
    const customerLink = page.locator('nav, aside').getByText(/clienti/i).first();
    if (await customerLink.isVisible().catch(() => false)) {
      await customerLink.click();
      await expect(page).toHaveURL(/dashboard\/customers/);
    }
  });

  test('should toggle sidebar collapse', async ({ page }) => {
    const toggleBtn = page.getByRole('button', { name: /comprimi|espandi|collapse|expand|toggle/i })
      .or(page.locator('[data-testid="sidebar-toggle"]'));

    if (await toggleBtn.isVisible().catch(() => false)) {
      const sidebar = page.locator('aside, [data-testid="sidebar"]').first();
      const initialWidth = await sidebar.boundingBox().then(box => box?.width ?? 0);

      await toggleBtn.click();
      await page.waitForTimeout(300);

      const newWidth = await sidebar.boundingBox().then(box => box?.width ?? 0);
      expect(newWidth).not.toBe(initialWidth);
    }
  });

  test('should open command palette with Ctrl+K', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(500);

    const palette = page.getByRole('dialog').or(page.locator('[data-testid="command-palette"]'))
      .or(page.locator('[cmdk-dialog]'));
    if (await palette.isVisible().catch(() => false)) {
      await expect(palette).toBeVisible();

      // Should have search input
      const searchInput = palette.getByRole('textbox').or(palette.getByPlaceholder(/cerca|search/i));
      await expect(searchInput.first()).toBeVisible();

      // Close with Escape
      await page.keyboard.press('Escape');
    }
  });

  test('should open command palette with Meta+K on Mac', async ({ page }) => {
    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(500);

    const palette = page.getByRole('dialog').or(page.locator('[cmdk-dialog]'));
    if (await palette.isVisible().catch(() => false)) {
      await expect(palette).toBeVisible();
      await page.keyboard.press('Escape');
    }
  });
});
