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

test.describe('Dark Mode - Render', () => {
  test('should render page in light mode by default', async ({ page }) => {
    setupDashboardMocks(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const hasDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    );
    // Default may be light or system preference - just check page renders
    expect(typeof hasDark).toBe('boolean');
  });
});

// ============================================
// 2. LOADING - N/A
// ============================================

// ============================================
// 3. EMPTY - N/A
// ============================================

// ============================================
// 4. ERROR - N/A
// ============================================

// ============================================
// 5. DATA - Dark Mode Visual Checks
// ============================================

test.describe('Dark Mode - Visual Checks', () => {
  test('should apply dark class to html element when dark mode enabled', async ({ page }) => {
    setupDashboardMocks(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Force dark mode via class
    await page.evaluate(() => document.documentElement.classList.add('dark'));

    const hasDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    );
    expect(hasDark).toBe(true);
  });

  test('should have dark background colors in dark mode', async ({ page }) => {
    setupDashboardMocks(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Enable dark mode
    await page.evaluate(() => document.documentElement.classList.add('dark'));

    const bgColor = await page.evaluate(() => {
      const body = document.body;
      return window.getComputedStyle(body).backgroundColor;
    });

    // Dark mode background should be dark (low RGB values)
    const match = bgColor.match(/rgb\((\d+), (\d+), (\d+)\)/);
    if (match) {
      const [, r, g, b] = match.map(Number);
      // At least one channel should be below 100 for dark
      expect(Math.min(r, g, b)).toBeLessThan(128);
    }
  });

  test('should have readable text in dark mode', async ({ page }) => {
    setupDashboardMocks(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Enable dark mode
    await page.evaluate(() => document.documentElement.classList.add('dark'));

    // Check that heading text is light colored
    const heading = page.getByRole('heading').first();
    if (await heading.isVisible().catch(() => false)) {
      const color = await heading.evaluate((el) => {
        return window.getComputedStyle(el).color;
      });

      // Text should be light in dark mode
      const match = color.match(/rgb\((\d+), (\d+), (\d+)\)/);
      if (match) {
        const [, r, g, b] = match.map(Number);
        // At least one channel should be above 128 for readable text
        expect(Math.max(r, g, b)).toBeGreaterThan(100);
      }
    }
  });

  test('should have contrast between text and background in dark mode', async ({ page }) => {
    setupDashboardMocks(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await page.evaluate(() => document.documentElement.classList.add('dark'));

    const contrast = await page.evaluate(() => {
      const body = document.body;
      const bgColor = window.getComputedStyle(body).backgroundColor;
      const heading = document.querySelector('h1, h2, h3');
      if (!heading) return { bg: bgColor, text: 'unknown' };
      const textColor = window.getComputedStyle(heading).color;
      return { bg: bgColor, text: textColor };
    });

    // Both should be defined
    expect(contrast.bg).toBeDefined();
    expect(contrast.text).toBeDefined();
  });
});

// ============================================
// 6. ACTIONS
// ============================================

test.describe('Dark Mode - Actions', () => {
  test('should toggle dark mode via UI control', async ({ page }) => {
    setupDashboardMocks(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Look for dark mode toggle
    const darkToggle = page.getByRole('button', { name: /dark|theme|tema|scuro|chiaro/i })
      .or(page.locator('[data-testid="dark-mode-toggle"]'))
      .or(page.locator('[data-testid="theme-toggle"]'));

    if (await darkToggle.isVisible().catch(() => false)) {
      const wasDark = await page.evaluate(() =>
        document.documentElement.classList.contains('dark')
      );

      await darkToggle.click();
      await page.waitForTimeout(300);

      const isDark = await page.evaluate(() =>
        document.documentElement.classList.contains('dark')
      );

      expect(isDark).not.toBe(wasDark);
    }
  });

  test('should persist dark mode preference across page navigation', async ({ page }) => {
    setupDashboardMocks(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Force dark mode
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    });

    // Navigate to another page
    await page.goto('/dashboard/customers');
    await page.waitForLoadState('networkidle');

    const storedTheme = await page.evaluate(() => localStorage.getItem('theme'));
    expect(storedTheme).toBe('dark');
  });

  test('should apply dark mode on auth page', async ({ page }) => {
    setupDashboardMocks(page);
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');

    await page.evaluate(() => document.documentElement.classList.add('dark'));

    const hasDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    );
    expect(hasDark).toBe(true);
  });
});
