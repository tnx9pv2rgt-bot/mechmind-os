import { test, expect } from '@playwright/test';

/**
 * Cookie Consent Banner E2E Tests (B-004)
 *
 * Tests the GDPR-compliant cookie consent banner:
 * - Banner appears on first visit (no localStorage flag)
 * - Accept all → disappears + flag set
 * - Necessary only → disappears + flag set
 * - Subsequent visit → banner NOT shown (flag already set)
 *
 * Banner is suppressed on /dashboard/* (authenticated pages).
 */

test.describe('B-004 — Cookie Consent Banner', () => {
  // Tests use fresh pages with cleared storage

  test('banner appears on first visit to homepage (no localStorage flag)', async ({ page }) => {
    // Clear localStorage to simulate first visit
    await page.evaluate(() => localStorage.clear());

    await page.goto('/', { waitUntil: 'networkidle' });

    // Wait for cookie banner to appear
    const banner = page.locator('[role="dialog"][aria-label="Consenso cookie"]');
    await expect(banner).toBeVisible({ timeout: 10000 });

    // Verify banner has required elements
    await expect(page.locator('text=Utilizziamo cookie tecnici')).toBeVisible();
    await expect(page.locator('button:has-text("Solo necessari")')).toBeVisible();
    await expect(page.locator('button:has-text("Accetta tutti")')).toBeVisible();
  });

  test('click "Accetta tutti" → banner disappears + localStorage flag set', async ({ page }) => {
    // Clear storage
    await page.evaluate(() => localStorage.clear());

    await page.goto('/', { waitUntil: 'networkidle' });

    // Wait for banner
    const banner = page.locator('[role="dialog"][aria-label="Consenso cookie"]');
    await expect(banner).toBeVisible({ timeout: 10000 });

    // Click "Accetta tutti"
    await page.locator('button:has-text("Accetta tutti")').click();

    // Banner should disappear
    await expect(banner).not.toBeVisible({ timeout: 5000 });

    // Verify localStorage flag is set
    const consent = await page.evaluate(() => localStorage.getItem('mechmind-cookie-consent'));
    expect(consent).toBeTruthy();

    if (consent) {
      const consentData = JSON.parse(consent);
      expect(consentData.necessary).toBe(true);
      expect(consentData.analytics).toBe(true);
      expect(consentData.timestamp).toBeTruthy();
    }
  });

  test('click "Solo necessari" → banner disappears + localStorage flag set (analytics=false)', async ({
    page,
  }) => {
    // Clear storage
    await page.evaluate(() => localStorage.clear());

    await page.goto('/', { waitUntil: 'networkidle' });

    // Wait for banner
    const banner = page.locator('[role="dialog"][aria-label="Consenso cookie"]');
    await expect(banner).toBeVisible({ timeout: 10000 });

    // Click "Solo necessari"
    await page.locator('button:has-text("Solo necessari")').click();

    // Banner should disappear
    await expect(banner).not.toBeVisible({ timeout: 5000 });

    // Verify localStorage flag is set with analytics=false
    const consent = await page.evaluate(() => localStorage.getItem('mechmind-cookie-consent'));
    expect(consent).toBeTruthy();

    if (consent) {
      const consentData = JSON.parse(consent);
      expect(consentData.necessary).toBe(true);
      expect(consentData.analytics).toBe(false);
      expect(consentData.timestamp).toBeTruthy();
    }
  });

  test('second visit with flag set → banner NOT shown', async ({ page }) => {
    // Simulate first visit with consent already given
    const consentData = {
      necessary: true,
      analytics: true,
      timestamp: new Date().toISOString(),
    };

    // Set localStorage before navigating
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.evaluate(data => {
      localStorage.setItem('mechmind-cookie-consent', JSON.stringify(data));
    }, consentData);

    // Reload to apply storage
    await page.reload({ waitUntil: 'networkidle' });

    // Banner should NOT be visible
    const banner = page.locator('[role="dialog"][aria-label="Consenso cookie"]');
    await expect(banner).not.toBeVisible({ timeout: 5000 });
  });

  test('banner NOT shown on /dashboard/* (authenticated pages)', async ({ page }) => {
    // Clear localStorage
    await page.evaluate(() => localStorage.clear());

    // Try to navigate to dashboard (may redirect to /auth if not authenticated)
    await page.goto('/dashboard', { waitUntil: 'networkidle' });

    // Wait a bit for page to load
    await page.waitForTimeout(1000);

    // Banner should NOT be visible on dashboard
    const banner = page.locator('[role="dialog"][aria-label="Consenso cookie"]');
    const isBannerVisible = await banner.isVisible().catch(() => false);
    expect(isBannerVisible).toBe(false);
  });

  test('banner appears on /auth (public page, no consent)', async ({ page }) => {
    // Clear localStorage
    await page.evaluate(() => localStorage.clear());

    await page.goto('/auth', { waitUntil: 'networkidle' });

    // Wait for page to load
    await page.waitForTimeout(1000);

    // Banner should be visible on /auth
    const banner = page.locator('[role="dialog"][aria-label="Consenso cookie"]');
    const isBannerVisible = await banner.isVisible().catch(() => false);
    expect(isBannerVisible).toBe(true);
  });

  test('"Personalizza" button opens preferences panel', async ({ page }) => {
    // Clear storage
    await page.evaluate(() => localStorage.clear());

    await page.goto('/', { waitUntil: 'networkidle' });

    // Wait for banner
    const banner = page.locator('[role="dialog"][aria-label="Consenso cookie"]');
    await expect(banner).toBeVisible({ timeout: 10000 });

    // Click "Personalizza"
    await page.locator('button:has-text("Personalizza")').click();

    // Wait for preferences panel
    await page.waitForTimeout(300);

    // Verify preferences panel elements
    await expect(page.locator('text=Impostazioni cookie')).toBeVisible();
    await expect(page.locator('text=Cookie tecnici')).toBeVisible();
    await expect(page.locator('text=Cookie analitici')).toBeVisible();
    await expect(page.locator('button:has-text("Salva preferenze")')).toBeVisible();
  });

  test('preferences: toggle analytics and save', async ({ page }) => {
    // Clear storage
    await page.evaluate(() => localStorage.clear());

    await page.goto('/', { waitUntil: 'networkidle' });

    // Wait for banner and click "Personalizza"
    const banner = page.locator('[role="dialog"][aria-label="Consenso cookie"]');
    await expect(banner).toBeVisible({ timeout: 10000 });
    await page.locator('button:has-text("Personalizza")').click();

    await page.waitForTimeout(300);

    // Toggle analytics switch
    const analyticsSwitch = page.locator('[role="switch"][aria-label="Attiva cookie analitici"]');
    await expect(analyticsSwitch).toBeVisible();
    await analyticsSwitch.click();

    // Click "Salva preferenze"
    await page.locator('button:has-text("Salva preferenze")').click();

    // Banner should disappear
    await expect(banner).not.toBeVisible({ timeout: 5000 });

    // Verify localStorage has analytics enabled
    const consent = await page.evaluate(() => localStorage.getItem('mechmind-cookie-consent'));
    if (consent) {
      const consentData = JSON.parse(consent);
      expect(consentData.analytics).toBe(true);
    }
  });

  test('privacy policy link is present and clickable', async ({ page }) => {
    // Clear storage
    await page.evaluate(() => localStorage.clear());

    await page.goto('/', { waitUntil: 'networkidle' });

    // Wait for banner
    const banner = page.locator('[role="dialog"][aria-label="Consenso cookie"]');
    await expect(banner).toBeVisible({ timeout: 10000 });

    // Check privacy link
    const privacyLink = page.locator('a[href="/privacy"]');
    await expect(privacyLink).toBeVisible();
    expect(await privacyLink.getAttribute('href')).toBe('/privacy');
  });

  test('banner is responsive on mobile (375px)', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Clear storage
    await page.evaluate(() => localStorage.clear());

    await page.goto('/', { waitUntil: 'networkidle' });

    // Wait for banner
    const banner = page.locator('[role="dialog"][aria-label="Consenso cookie"]');
    await expect(banner).toBeVisible({ timeout: 10000 });

    // Verify buttons are visible and clickable
    await expect(page.locator('button:has-text("Accetta tutti")')).toBeVisible();
    await expect(page.locator('button:has-text("Solo necessari")')).toBeVisible();

    // Click should work on mobile
    await page.locator('button:has-text("Accetta tutti")').click();
    await expect(banner).not.toBeVisible({ timeout: 5000 });
  });
});
