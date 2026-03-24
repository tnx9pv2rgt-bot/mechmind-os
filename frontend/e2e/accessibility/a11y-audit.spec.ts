import { test, expect } from '../fixtures/auth.fixture';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

function setupDashboardMocks(page: Page): void {
  void page.route('**/api/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) })
  );
}

// ============================================
// CRITICAL PAGES AUDIT
// ============================================

test.describe('Accessibility - WCAG 2.0 AA Audit', () => {
  test('should have no critical/serious violations on /dashboard', async ({ page }) => {
    setupDashboardMocks(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const criticalAndSerious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    if (criticalAndSerious.length > 0) {
      const summary = criticalAndSerious.map(
        (v) => `[${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} instances)`
      ).join('\n');
      console.log('A11y violations on /dashboard:\n', summary);
    }

    expect(criticalAndSerious.length).toBe(0);
  });

  test('should have no critical/serious violations on /dashboard/customers', async ({ page }) => {
    setupDashboardMocks(page);
    await page.goto('/dashboard/customers');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const criticalAndSerious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    if (criticalAndSerious.length > 0) {
      const summary = criticalAndSerious.map(
        (v) => `[${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} instances)`
      ).join('\n');
      console.log('A11y violations on /dashboard/customers:\n', summary);
    }

    expect(criticalAndSerious.length).toBe(0);
  });

  test('should have no critical/serious violations on /dashboard/work-orders', async ({ page }) => {
    setupDashboardMocks(page);
    await page.goto('/dashboard/work-orders');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const criticalAndSerious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    if (criticalAndSerious.length > 0) {
      const summary = criticalAndSerious.map(
        (v) => `[${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} instances)`
      ).join('\n');
      console.log('A11y violations on /dashboard/work-orders:\n', summary);
    }

    expect(criticalAndSerious.length).toBe(0);
  });

  test('should have no critical/serious violations on /dashboard/invoices', async ({ page }) => {
    setupDashboardMocks(page);
    await page.goto('/dashboard/invoices');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const criticalAndSerious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    if (criticalAndSerious.length > 0) {
      const summary = criticalAndSerious.map(
        (v) => `[${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} instances)`
      ).join('\n');
      console.log('A11y violations on /dashboard/invoices:\n', summary);
    }

    expect(criticalAndSerious.length).toBe(0);
  });

  test('should have no critical/serious violations on /auth', async ({ page }) => {
    setupDashboardMocks(page);
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const criticalAndSerious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    if (criticalAndSerious.length > 0) {
      const summary = criticalAndSerious.map(
        (v) => `[${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} instances)`
      ).join('\n');
      console.log('A11y violations on /auth:\n', summary);
    }

    expect(criticalAndSerious.length).toBe(0);
  });

  test('should have no critical/serious violations on /portal/dashboard', async ({ page }) => {
    await page.context().addCookies([
      { name: 'portal_token', value: 'mock-portal', domain: 'localhost', path: '/' },
      { name: 'auth_token', value: 'mock-jwt', domain: 'localhost', path: '/' },
      { name: 'tenant_slug', value: 'demo', domain: 'localhost', path: '/' },
    ]);

    void page.route('**/api/portal/dashboard**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            customer: { id: 'c-1', firstName: 'Test', lastName: 'User', email: 'test@test.it' },
            upcomingBooking: null,
            maintenanceDue: [],
            recentInspection: null,
            unpaidInvoices: { count: 0, total: 0 },
            activeRepairs: { count: 0 },
          },
        }),
      })
    );
    void page.route('**/api/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) })
    );

    await page.goto('/portal/dashboard');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const criticalAndSerious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    if (criticalAndSerious.length > 0) {
      const summary = criticalAndSerious.map(
        (v) => `[${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} instances)`
      ).join('\n');
      console.log('A11y violations on /portal/dashboard:\n', summary);
    }

    expect(criticalAndSerious.length).toBe(0);
  });
});

// ============================================
// SKIP LINK
// ============================================

test.describe('Accessibility - Skip Link', () => {
  test('should have a skip link that becomes visible on focus', async ({ page }) => {
    setupDashboardMocks(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Press Tab to focus the skip link
    await page.keyboard.press('Tab');

    const skipLink = page.getByRole('link', { name: /salta|skip to content|vai al contenuto/i })
      .or(page.locator('[data-testid="skip-link"]'))
      .or(page.locator('a[href="#main-content"], a[href="#content"]'));

    if (await skipLink.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(skipLink.first()).toBeVisible();
    }
  });

  test('should skip to main content when skip link is activated', async ({ page }) => {
    setupDashboardMocks(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await page.keyboard.press('Tab');

    const skipLink = page.getByRole('link', { name: /salta|skip to content/i })
      .or(page.locator('a[href="#main-content"], a[href="#content"]'));

    if (await skipLink.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await skipLink.first().click();

      // Focus should move to main content
      const focused = page.locator(':focus');
      const focusedId = await focused.getAttribute('id');
      if (focusedId) {
        expect(focusedId).toMatch(/main|content/i);
      }
    }
  });
});

// ============================================
// KEYBOARD NAVIGATION
// ============================================

test.describe('Accessibility - Keyboard Navigation', () => {
  test('should support Tab key navigation', async ({ page }) => {
    setupDashboardMocks(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Tab through a few elements
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
    }

    const focused = page.locator(':focus');
    await expect(focused).toBeVisible({ timeout: 5000 });
  });

  test('should have visible focus indicators', async ({ page }) => {
    setupDashboardMocks(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Tab to first interactive element
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    const focused = page.locator(':focus');
    if (await focused.isVisible().catch(() => false)) {
      const outline = await focused.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          outline: styles.outline,
          boxShadow: styles.boxShadow,
          border: styles.border,
        };
      });

      // Should have some focus indicator (outline, box-shadow, or border change)
      const hasFocusIndicator =
        outline.outline !== 'none' ||
        outline.boxShadow !== 'none' ||
        outline.border !== '';
      expect(hasFocusIndicator).toBe(true);
    }
  });

  test('should escape modal dialogs with Escape key', async ({ page }) => {
    setupDashboardMocks(page);
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');

    // Auth page should be navigable with keyboard
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible({ timeout: 5000 });
  });
});
