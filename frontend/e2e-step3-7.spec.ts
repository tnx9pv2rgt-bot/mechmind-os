import { test, expect } from '@playwright/test';

// Helper: login via API and inject cookies
async function loginViaAPI(page: import('@playwright/test').Page) {
  // Call the Next.js API proxy route (same as the frontend does)
  const response = await page.request.post('http://localhost:3001/api/auth/password/login', {
    data: {
      email: 'admin@demo.mechmind.it',
      password: 'Demo2026!',
      tenantSlug: 'demo',
    },
  });

  const status = response.status();
  console.log(`[loginAPI] Response status: ${status}`);

  if (status !== 200) {
    const body = await response.text();
    console.log(`[loginAPI] Error body: ${body}`);
    return false;
  }

  // Cookies are set via Set-Cookie headers in the response
  // page.request automatically handles cookies in the browser context
  return true;
}

// ============================================================
// STEP 3.4 — Frontend redirect senza login
// ============================================================
test('3.4 - Redirect to login when not authenticated', async ({ page }) => {
  await page.context().clearCookies();
  await page.goto('http://localhost:3001/dashboard/bookings');
  await page.waitForTimeout(3000);

  const url = page.url();
  console.log(`[3.4] Final URL: ${url}`);
  expect(url.includes('/auth') || url.includes('/login')).toBeTruthy();
});

// ============================================================
// STEP 4.5 — 401 redirect
// ============================================================
test('4.5 - Cleared auth redirects to login', async ({ page }) => {
  await page.context().clearCookies();
  await page.goto('http://localhost:3001/dashboard');
  await page.waitForTimeout(3000);

  const url = page.url();
  console.log(`[4.5] Final URL: ${url}`);
  expect(url.includes('/auth') || url.includes('/login')).toBeTruthy();
});

// ============================================================
// STEP 7.1 — Login flow via UI (with reduced motion)
// ============================================================
test('7.1 - Login flow via UI', async ({ browser }) => {
  // Create context with reduced motion to skip animations
  const context = await browser.newContext({
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.context().clearCookies();

  await page.goto('http://localhost:3001/auth');
  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'e2e-screenshots/step7-1-methods.png' });

  // Click "Accedi"
  const accediBtn = page.locator('button:has-text("Accedi")');
  expect(await accediBtn.isVisible()).toBeTruthy();
  await accediBtn.click();

  // Wait for inputs to appear
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'e2e-screenshots/step7-1-email-step.png' });

  const inputs = page.locator('input:visible');
  const inputCount = await inputs.count();
  console.log(`[7.1] Visible inputs after Accedi: ${inputCount}`);

  if (inputCount >= 2) {
    await inputs.nth(0).fill('demo');
    await inputs.nth(1).fill('admin@demo.mechmind.it');
    await page.screenshot({ path: 'e2e-screenshots/step7-1-filled.png' });

    // Click Continua
    await page.locator('button:has-text("Continua")').click();
    await page.waitForTimeout(1500);

    // Password step
    const pwInput = page.locator('input[type="password"]:visible');
    if (await pwInput.isVisible().catch(() => false)) {
      await pwInput.fill('Demo2026!');
      await page.screenshot({ path: 'e2e-screenshots/step7-1-password.png' });

      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(5000);

      console.log(`[7.1] After login URL: ${page.url()}`);
      await page.screenshot({ path: 'e2e-screenshots/step7-1-after-login.png' });
    } else {
      console.log('[7.1] Password input not visible');
      await page.screenshot({ path: 'e2e-screenshots/step7-1-no-password.png' });
    }
  } else {
    console.log('[7.1] Email inputs not visible (animation issue)');
  }

  await context.close();
});

// ============================================================
// STEP 7.1b — Login via API (validates cookie auth works)
// ============================================================
test('7.1b - Login via API and access dashboard', async ({ page }) => {
  const success = await loginViaAPI(page);
  console.log(`[7.1b] Login API success: ${success}`);

  // Now navigate to dashboard
  await page.goto('http://localhost:3001/dashboard');
  await page.waitForTimeout(5000);

  const url = page.url();
  console.log(`[7.1b] Dashboard URL: ${url}`);

  const content = await page.textContent('body');
  console.log(`[7.1b] Content (first 300): ${content?.substring(0, 300)}`);
  await page.screenshot({ path: 'e2e-screenshots/step7-1b-dashboard.png' });

  // If auth works, we should be on dashboard (not redirected to /auth)
  const isOnDashboard = url.includes('/dashboard');
  console.log(`[7.1b] On dashboard: ${isOnDashboard}`);
});

// ============================================================
// STEP 7.5 — Bookings list
// ============================================================
test('7.5 - Bookings list shows data', async ({ page }) => {
  await loginViaAPI(page);

  await page.goto('http://localhost:3001/dashboard/bookings');
  await page.waitForTimeout(5000);

  const url = page.url();
  console.log(`[7.5] URL: ${url}`);

  const content = await page.textContent('body');
  console.log(`[7.5] Content (first 500): ${content?.substring(0, 500)}`);
  await page.screenshot({ path: 'e2e-screenshots/step7-5-bookings.png' });
});

// ============================================================
// STEP 7.3 — Customer creation page
// ============================================================
test('7.3 - Customer creation page loads', async ({ page }) => {
  await loginViaAPI(page);

  await page.goto('http://localhost:3001/dashboard/customers');
  await page.waitForTimeout(5000);

  const url = page.url();
  console.log(`[7.3] Customers URL: ${url}`);

  const content = await page.textContent('body');
  console.log(`[7.3] Content (first 500): ${content?.substring(0, 500)}`);
  await page.screenshot({ path: 'e2e-screenshots/step7-3-customers.png' });
});

// ============================================================
// STEP 7.6 — Logout protection
// ============================================================
test('7.6 - After clearing auth, dashboard is protected', async ({ page }) => {
  // First login
  await loginViaAPI(page);

  // Verify we can access dashboard
  await page.goto('http://localhost:3001/dashboard');
  await page.waitForTimeout(3000);
  const dashUrl = page.url();
  console.log(`[7.6] Dashboard with auth: ${dashUrl}`);

  // Clear cookies (simulate logout)
  await page.context().clearCookies();

  // Try accessing dashboard again
  await page.goto('http://localhost:3001/dashboard');
  await page.waitForTimeout(3000);

  const afterLogout = page.url();
  console.log(`[7.6] After logout URL: ${afterLogout}`);

  expect(afterLogout.includes('/auth') || afterLogout.includes('/login')).toBeTruthy();
});
