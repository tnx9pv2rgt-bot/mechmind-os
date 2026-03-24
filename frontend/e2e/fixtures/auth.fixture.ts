import { test as base, expect, type Page, type Locator } from '@playwright/test';

// =============================================================================
// Mock user for /api/auth/me
// =============================================================================
const MOCK_USER = {
  user: {
    id: 'test-user-id',
    email: 'admin@demo.it',
    name: 'Admin Test',
    role: 'ADMIN',
    tenantId: 'test-tenant-id',
    tenantName: 'Officina Test',
  },
};

// =============================================================================
// Extended test with auto auth mocking
// =============================================================================

/**
 * Extended test that automatically:
 * 1. Sets auth cookies (auth_token, tenant_id, tenant_slug, portal_token)
 * 2. Mocks /api/auth/me to return a valid user
 * 3. Mocks /api/auth/refresh to return success
 *
 * All dashboard/portal tests should import { test, expect } from this file.
 */
export const test = base.extend<{
  autoAuth: void;
  adminPage: Page;
  mechanicPage: Page;
  userPage: Page;
  mfaPage: { expectMFASetup: () => Promise<void>; expectMFARequired: () => Promise<void>; enterTOTPCode: (code: string) => Promise<void>; selectRecoveryCode: () => Promise<void>; enterRecoveryCode: (code: string) => Promise<void> };
}>({
  autoAuth: [async ({ page }, use) => {
    // Set auth cookies for middleware
    await page.context().addCookies([
      { name: 'auth_token', value: 'mock-jwt-token', domain: 'localhost', path: '/' },
      { name: 'tenant_id', value: 'test-tenant-id', domain: 'localhost', path: '/' },
      { name: 'tenant_slug', value: 'demo', domain: 'localhost', path: '/' },
      { name: 'portal_token', value: 'mock-portal-token', domain: 'localhost', path: '/' },
      { name: 'cookie_consent', value: 'accepted', domain: 'localhost', path: '/' },
    ]);

    // Dismiss cookie consent dialogs (they use localStorage)
    await page.addInitScript(() => {
      localStorage.setItem('cookie-consent', JSON.stringify({ necessary: true, analytics: true, timestamp: new Date().toISOString() }));
      localStorage.setItem('mechmind-cookie-consent', 'accepted');
    });

    // Mock auth endpoint so AuthGuard doesn't redirect
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_USER),
      });
    });

    // Mock auth refresh
    await page.route('**/api/auth/refresh', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await use();
  }, { auto: true }],

  // adminPage is just the regular page (auto-auth already sets ADMIN role)
  adminPage: async ({ page }, use) => {
    await use(page);
  },

  // mechanicPage is the regular page (tests can override the role mock if needed)
  mechanicPage: async ({ page }, use) => {
    await use(page);
  },

  // userPage is the regular page (for non-admin user tests)
  userPage: async ({ page }, use) => {
    await use(page);
  },

  // mfaPage provides helper methods for MFA testing
  mfaPage: async ({ page }, use) => {
    await use({
      async expectMFASetup() {
        const { expect: e } = await import('@playwright/test');
        await e(page.getByText(/configura|setup|mfa|2fa/i)).toBeVisible({ timeout: 10000 });
      },
      async expectMFARequired() {
        const { expect: e } = await import('@playwright/test');
        await e(page.getByText(/codice|verifica|mfa|2fa/i)).toBeVisible({ timeout: 10000 });
      },
      async enterTOTPCode(code: string) {
        await page.locator('input[type="text"]').first().fill(code);
        await page.getByRole('button', { name: /verifica|verify|conferma/i }).click();
      },
      async selectRecoveryCode() {
        await page.getByText(/codice di recupero|recovery code|backup/i).click();
      },
      async enterRecoveryCode(code: string) {
        await page.getByLabel(/codice di recupero|recovery code/i).fill(code);
        await page.getByRole('button', { name: /verifica|verify|conferma/i }).click();
      },
    });
  },
});

export { expect };
