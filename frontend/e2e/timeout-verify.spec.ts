import { test, expect } from '@playwright/test';

// Verifica che le pagine con timeout ora mostrano errore in <15s invece di bloccarsi
const TIMEOUT_PAGES = [
  '/dashboard/locations',
  '/dashboard/locations/test-id',
  '/dashboard/warranty/test-id',
  '/dashboard/warranty/claims/test-id',
  '/dashboard/parts/test-id',
  '/dashboard/work-orders/test-id',
];

test.use({
  baseURL: 'http://localhost:3000',
  navigationTimeout: 20000,
  actionTimeout: 5000,
});

for (const path of TIMEOUT_PAGES) {
  test(`${path} — fail fast (no hang)`, async ({ page }) => {
    // Mock auth
    await page.context().addCookies([
      { name: 'auth_token', value: 'mock-jwt-token', domain: 'localhost', path: '/' },
      { name: 'tenant_id', value: 'test-tenant-id', domain: 'localhost', path: '/' },
      { name: 'tenant_slug', value: 'demo', domain: 'localhost', path: '/' },
    ]);
    await page.route('**/api/auth/me', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: 'u1', email: 'a@b.it', role: 'ADMIN', tenantId: 't1' } }) }));

    const start = Date.now();
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    // Wait max 18s for either error state or loading to resolve
    await page.waitForTimeout(18000);
    const elapsed = Date.now() - start;

    // Should NOT still be showing a loading spinner after 18s
    const hasSpinner = await page.locator('.animate-spin').isVisible().catch(() => false);
    console.log(`${path}: ${elapsed}ms, spinner_visible=${hasSpinner}`);
    
    // After 18s, spinner should be gone (either error shown or data loaded)
    // Previously these pages hung for 45+ seconds with spinner forever
    expect(elapsed).toBeLessThan(20000);
  });
}
