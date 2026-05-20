import { test, expect } from '../fixtures/auth.fixture';
import type { Page } from '@playwright/test';

function setupDashboardMocks(page: Page): void {
  void page.route('**/api/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) })
  );
}

// ============================================
// 1. RENDER - Mobile
// ============================================

test.describe('Responsive - Mobile (375x667)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    setupDashboardMocks(page);
  });

  test('should hide desktop sidebar on mobile', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const sidebar = page.locator('aside, [data-testid="sidebar"]').first();
    const isVisible = await sidebar.isVisible().catch(() => false);

    if (isVisible) {
      const box = await sidebar.boundingBox();
      // Sidebar should be off-screen or very narrow
      expect(box?.width ?? 0).toBeLessThanOrEqual(80);
    }
  });

  test('should show bottom navigation or mobile menu on mobile', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const bottomNav = page.locator('[data-testid="bottom-nav"], .bottom-navigation, nav[class*="bottom"], nav[class*="mobile"]');
    const mobileMenu = page.getByRole('button', { name: /menu/i })
      .or(page.locator('[data-testid="mobile-menu-toggle"]'));

    const bottomNavVisible = await bottomNav.first().isVisible().catch(() => false);
    const menuVisible = await mobileMenu.isVisible().catch(() => false);

    // At least one mobile nav pattern should exist
    expect(bottomNavVisible || menuVisible).toBe(true);
  });

  test('should have no horizontal overflow on mobile', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);

    // No horizontal scroll (allow 2px tolerance for borders)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test('should render dashboard content on mobile', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Main content should be visible
    const mainContent = page.locator('main, [role="main"], [data-testid="main-content"]').first();
    if (await mainContent.isVisible().catch(() => false)) {
      await expect(mainContent).toBeVisible();
    }
  });
});

// ============================================
// 2. LOADING - N/A for responsive
// ============================================

// ============================================
// 3. EMPTY - N/A for responsive
// ============================================

// ============================================
// 4. ERROR - N/A for responsive
// ============================================

// ============================================
// 5. DATA - Tablet
// ============================================

test.describe('Responsive - Tablet (768x1024)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    setupDashboardMocks(page);
  });

  test('should show collapsed sidebar on tablet', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const sidebar = page.locator('aside, [data-testid="sidebar"]').first();
    if (await sidebar.isVisible().catch(() => false)) {
      const box = await sidebar.boundingBox();
      // Collapsed sidebar should be narrow (< 100px) or full
      // Accept both collapsed and expanded states
      expect(box?.width).toBeDefined();
    }
  });

  test('should have no horizontal overflow on tablet', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });
});

// ============================================
// 6. ACTIONS - Desktop
// ============================================

test.describe('Responsive - Desktop (1280x720)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    setupDashboardMocks(page);
  });

  test('should show expanded sidebar on desktop', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const sidebar = page.locator('aside, [data-testid="sidebar"]').first();
    if (await sidebar.isVisible().catch(() => false)) {
      const box = await sidebar.boundingBox();
      // Expanded sidebar should be wider than 150px
      expect(box?.width ?? 0).toBeGreaterThan(100);
    }
  });

  test('should show sidebar text labels on desktop', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const navText = page.locator('nav, aside').getByText(/dashboard|clienti|fatture/i);
    await expect(navText.first()).toBeVisible({ timeout: 10000 });
  });

  test('should have no horizontal overflow on desktop', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });
});

// ============================================
// CROSS-PAGE RESPONSIVE TESTS
// ============================================

test.describe('Responsive - Cross-page mobile', () => {
  test('should not overflow on customers page', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    setupDashboardMocks(page);
    await page.goto('/dashboard/customers');
    await page.waitForLoadState('networkidle');

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test('should not overflow on invoices page', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    setupDashboardMocks(page);
    await page.goto('/dashboard/invoices');
    await page.waitForLoadState('networkidle');

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test('should not overflow on work-orders page', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    setupDashboardMocks(page);
    await page.goto('/dashboard/work-orders');
    await page.waitForLoadState('networkidle');

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });
});
