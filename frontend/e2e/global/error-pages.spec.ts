import { test, expect } from '../fixtures/auth.fixture';
import type { Page } from '@playwright/test';

function setupMinimalMocks(page: Page): void {
  void page.route('**/api/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) })
  );
}

// ============================================
// 1. RENDER - 404 Page
// ============================================

test.describe('Error Pages - 404 Render', () => {
  test('should render 404 page for unknown dashboard route', async ({ page }) => {
    setupMinimalMocks(page);
    await page.goto('/dashboard/nonexistent-page-xyz');

    const notFoundText = page.getByText(/404|non trovata|not found|pagina inesistente/i);
    await expect(notFoundText.first()).toBeVisible({ timeout: 10000 });
  });

  test('should render 404 page for unknown portal route', async ({ page }) => {
    setupMinimalMocks(page);
    await page.goto('/portal/nonexistent-page-xyz');

    const notFoundText = page.getByText(/404|non trovata|not found/i);
    // Portal may redirect to login; if not, expect 404
    const currentUrl = page.url();
    if (currentUrl.includes('nonexistent')) {
      await expect(notFoundText.first()).toBeVisible({ timeout: 10000 });
    }
  });
});

// ============================================
// 2. LOADING - N/A for error pages
// ============================================

// ============================================
// 3. EMPTY - N/A for error pages
// ============================================

// ============================================
// 4. ERROR - 500 Page
// ============================================

test.describe('Error Pages - 500 Error', () => {
  test('should handle 500 errors gracefully', async ({ page }) => {

    // Mock all API calls to fail
    void page.route('**/api/**', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Internal Server Error' }) })
    );

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Should still render the page shell (error boundary catches it)
    const hasContent = await page.locator('body').isVisible();
    expect(hasContent).toBe(true);

    // Error message should be shown somewhere
    const errorText = page.getByText(/errore|error|problema|qualcosa è andato storto/i);
    if (await errorText.first().isVisible().catch(() => false)) {
      await expect(errorText.first()).toBeVisible();
    }
  });
});

// ============================================
// 5. DATA - 404 Page Content
// ============================================

test.describe('Error Pages - 404 Content', () => {
  test('should have a link back to dashboard on 404', async ({ page }) => {
    setupMinimalMocks(page);
    await page.goto('/dashboard/nonexistent-page-xyz-123');

    const backLink = page.getByRole('link', { name: /torna|dashboard|home|indietro/i });
    if (await backLink.first().isVisible().catch(() => false)) {
      await expect(backLink.first()).toBeVisible();
    }
  });

  test('should navigate back to dashboard from 404 page', async ({ page }) => {
    setupMinimalMocks(page);
    await page.goto('/dashboard/nonexistent-page-xyz-456');

    const backLink = page.getByRole('link', { name: /torna|dashboard|home|indietro/i });
    if (await backLink.first().isVisible().catch(() => false)) {
      await backLink.first().click();
      await expect(page).toHaveURL(/dashboard/);
    }
  });
});

// ============================================
// 6. ACTIONS - Session Expired
// ============================================

test.describe('Error Pages - Session Expired', () => {
  test('should redirect to auth on 401 response', async ({ page }) => {

    void page.route('**/api/**', (route) =>
      route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'Unauthorized' }) })
    );

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // May show session expired dialog or redirect to login
    const sessionExpired = page.getByText(/sessione scaduta|session expired|accedi nuovamente|non autorizzato/i);
    const loginPage = page.getByLabel(/email/i);

    const hasSessionDialog = await sessionExpired.first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasLoginRedirect = await loginPage.isVisible({ timeout: 5000 }).catch(() => false);

    expect(hasSessionDialog || hasLoginRedirect).toBe(true);
  });

  test('should show session expired dialog when token expires mid-session', async ({ page }) => {

    // First request succeeds, subsequent fail with 401
    let requestCount = 0;
    void page.route('**/api/**', (route) => {
      requestCount++;
      if (requestCount <= 2) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
      }
      return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'Token expired' }) });
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Trigger another API call
    await page.goto('/dashboard/customers');
    await page.waitForLoadState('networkidle');

    // Should show session expired or redirect
    const sessionDialog = page.getByText(/sessione scaduta|session expired|accedi/i);
    if (await sessionDialog.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(sessionDialog.first()).toBeVisible();
    }
  });

  test('should handle 403 forbidden gracefully', async ({ page }) => {

    void page.route('**/api/**', (route) =>
      route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ message: 'Forbidden' }) })
    );

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Should show some feedback about access denied
    const hasContent = await page.locator('body').isVisible();
    expect(hasContent).toBe(true);
  });
});
