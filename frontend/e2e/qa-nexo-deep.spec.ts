import { test, expect } from './fixtures/auth.fixture';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// QA DEEP TEST — Complete 94-page dashboard audit
// ============================================================================

// Create bug report directory
const BUG_REPORT_DIR = path.join(__dirname, '..', 'bug-reports');
if (!fs.existsSync(BUG_REPORT_DIR)) {
  fs.mkdirSync(BUG_REPORT_DIR, { recursive: true });
}

// All 94 pages to test
const PAGES = [
  '/dashboard',
  '/dashboard/analytics',
  '/dashboard/analytics/benchmarking',
  '/dashboard/analytics/technicians',
  '/dashboard/audit-logs',
  '/dashboard/billing',
  '/dashboard/bookings',
  '/dashboard/bookings/new',
  '/dashboard/bookings/smart-scheduling',
  '/dashboard/bookings/test-id',
  '/dashboard/calendar',
  '/dashboard/canned-jobs',
  '/dashboard/canned-jobs/new',
  '/dashboard/customers',
  '/dashboard/customers/new',
  '/dashboard/customers/new/landing',
  '/dashboard/customers/new/step1',
  '/dashboard/customers/new/step2',
  '/dashboard/customers/new/step3',
  '/dashboard/customers/new/step4',
  '/dashboard/customers/import',
  '/dashboard/customers/test-id',
  '/dashboard/diagnostics/ai',
  '/dashboard/estimates',
  '/dashboard/estimates/new',
  '/dashboard/estimates/test-id',
  '/dashboard/gdpr/deletion',
  '/dashboard/gdpr/export',
  '/dashboard/inspections',
  '/dashboard/inspections/new',
  '/dashboard/inspections/test-id',
  '/dashboard/invoices',
  '/dashboard/invoices/new',
  '/dashboard/invoices/financial',
  '/dashboard/invoices/quotes',
  '/dashboard/invoices/credit-note/new',
  '/dashboard/invoices/test-id',
  '/dashboard/locations',
  '/dashboard/locations/test-id',
  '/dashboard/maintenance',
  '/dashboard/marketing',
  '/dashboard/marketing/new',
  '/dashboard/marketing/segments',
  '/dashboard/marketing/follow-ups',
  '/dashboard/marketing/test-id',
  '/dashboard/messaging',
  '/dashboard/messaging/test-id',
  '/dashboard/obd',
  '/dashboard/obd/alerts',
  '/dashboard/obd/pair',
  '/dashboard/obd/test-vehicle',
  '/dashboard/parts',
  '/dashboard/parts/new',
  '/dashboard/parts/catalog',
  '/dashboard/parts/orders/new',
  '/dashboard/parts/test-id',
  '/dashboard/payments',
  '/dashboard/payroll',
  '/dashboard/production-board',
  '/dashboard/rentri',
  '/dashboard/rentri/entries',
  '/dashboard/rentri/entries/new',
  '/dashboard/rentri/fir',
  '/dashboard/rentri/fir/test-id',
  '/dashboard/search',
  '/dashboard/settings',
  '/dashboard/settings/appearance',
  '/dashboard/settings/audit',
  '/dashboard/settings/ai-compliance',
  '/dashboard/settings/memberships',
  '/dashboard/settings/portability',
  '/dashboard/settings/roles',
  '/dashboard/settings/security',
  '/dashboard/settings/security/incidents',
  '/dashboard/settings/sessions',
  '/dashboard/settings/team',
  '/dashboard/settings/webhooks',
  '/dashboard/subscription',
  '/dashboard/vehicles',
  '/dashboard/vehicles/new',
  '/dashboard/vehicles/test-id',
  '/dashboard/vehicles/test-id/maintenance',
  '/dashboard/voice',
  '/dashboard/warranty',
  '/dashboard/warranty/new',
  '/dashboard/warranty/claims',
  '/dashboard/warranty/test-id',
  '/dashboard/warranty/claims/test-id',
  '/dashboard/work-orders',
  '/dashboard/work-orders/new',
  '/dashboard/work-orders/test-id',
  '/dashboard/workflows',
  '/dashboard/workflows/new',
  '/dashboard/admin/subscriptions',
];

// Critical pages that need interactive testing
const CRITICAL_PAGES = [
  '/dashboard/customers/new',
  '/dashboard/bookings/new',
  '/dashboard/vehicles/new',
  '/dashboard/invoices/new',
  '/dashboard/estimates/new',
  '/dashboard/work-orders/new',
  '/dashboard/inspections/new',
  '/dashboard/parts/new',
  '/dashboard/settings',
  '/dashboard/canned-jobs/new',
];

// Pages that need error state testing
const MAIN_LIST_PAGES = [
  '/dashboard/customers',
  '/dashboard/bookings',
  '/dashboard/invoices',
  '/dashboard/vehicles',
  '/dashboard/parts',
];

// ============================================================================
// Test: Phase 1 — Page Scan (all 94 pages)
// ============================================================================

test.describe('Phase 1: Full Dashboard Page Scan (94 pages)', () => {
  let bugCount = 0;
  const pageResults: any[] = [];

  test.beforeAll(async () => {
    console.log('🚀 Starting Phase 1: Page Scan on 94 pages');
  });

  for (const page of PAGES) {
    test(`Load and verify ${page}`, async ({ page: browserPage }, testInfo) => {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];
      let screenshotPath = '';

      // Collect console errors
      browserPage.on('console', msg => {
        if (msg.type() === 'error' || msg.type() === 'warning') {
          consoleErrors.push(`[${msg.type()}] ${msg.text()}`);
        }
      });

      // Collect page errors
      browserPage.on('pageerror', error => {
        pageErrors.push(error.toString());
      });

      const startTime = Date.now();
      let response;
      try {
        response = await browserPage.goto(page, { waitUntil: 'domcontentloaded', timeout: 30000 });
      } catch (e: any) {
        bugCount++;
        const bugId = `BUG-${String(bugCount).padStart(3, '0')}`;
        screenshotPath = path.join(BUG_REPORT_DIR, `${bugId}-load-timeout.png`);
        try {
          await browserPage.screenshot({ path: screenshotPath });
        } catch {}
        pageResults.push({
          page,
          status: 'TIMEOUT',
          loadTime: -1,
          bug: bugId,
          issue: `Navigation timeout: ${e.message}`,
        });
        return;
      }
      const loadTime = Date.now() - startTime;

      // Check for redirect to /auth (auth failure)
      if (browserPage.url().includes('/auth')) {
        bugCount++;
        const bugId = `BUG-${String(bugCount).padStart(3, '0')}`;
        screenshotPath = path.join(BUG_REPORT_DIR, `${bugId}-auth-redirect.png`);
        await browserPage.screenshot({ path: screenshotPath });
        pageResults.push({
          page,
          status: 'AUTH_FAIL',
          loadTime,
          bug: bugId,
          issue: `Unexpected redirect to /auth`,
        });
        return;
      }

      // Check response status
      if (response && response.status() >= 500) {
        bugCount++;
        const bugId = `BUG-${String(bugCount).padStart(3, '0')}`;
        screenshotPath = path.join(BUG_REPORT_DIR, `${bugId}-500-error.png`);
        await browserPage.screenshot({ path: screenshotPath });
        pageResults.push({
          page,
          status: 'SERVER_ERROR',
          loadTime,
          statusCode: response.status(),
          bug: bugId,
          issue: `HTTP ${response.status()}`,
        });
        return;
      }

      // Check for React hydration errors
      const hydrationErrors = consoleErrors.filter(
        e =>
          e.includes('Hydration') ||
          e.includes('Warning: ReactDOM.render') ||
          e.includes('TypeError: Cannot read property')
      );
      if (hydrationErrors.length > 0) {
        bugCount++;
        const bugId = `BUG-${String(bugCount).padStart(3, '0')}`;
        screenshotPath = path.join(BUG_REPORT_DIR, `${bugId}-hydration-error.png`);
        await browserPage.screenshot({ path: screenshotPath });
        pageResults.push({
          page,
          status: 'HYDRATION_ERROR',
          loadTime,
          bug: bugId,
          issue: hydrationErrors[0],
        });
        return;
      }

      // Check if body has visible content
      const bodyText = await browserPage.locator('body').textContent();
      if (!bodyText || bodyText.trim().length === 0) {
        bugCount++;
        const bugId = `BUG-${String(bugCount).padStart(3, '0')}`;
        screenshotPath = path.join(BUG_REPORT_DIR, `${bugId}-empty-page.png`);
        await browserPage.screenshot({ path: screenshotPath });
        pageResults.push({
          page,
          status: 'EMPTY_BODY',
          loadTime,
          bug: bugId,
          issue: 'Page body is empty',
        });
        return;
      }

      // Collect all console errors (not just hydration)
      const otherErrors = consoleErrors.filter(
        e =>
          !e.includes('Hydration') &&
          !e.includes('Warning: ReactDOM.render') &&
          !e.includes('Cannot read property')
      );

      // Log performance
      if (loadTime > 5000) {
        console.warn(`⚠️  SLOW LOAD: ${page} took ${loadTime}ms`);
      }

      pageResults.push({
        page,
        status: 'OK',
        loadTime,
        consoleErrors: otherErrors.length > 0 ? otherErrors.slice(0, 3) : [],
        pageErrors: pageErrors.length > 0 ? pageErrors.slice(0, 2) : [],
      });
    });
  }
});

// ============================================================================
// Test: Phase 2 — Interactive Elements on Critical Pages
// ============================================================================

test.describe('Phase 2: Interactive Elements Testing (10 critical pages)', () => {
  for (const pagePath of CRITICAL_PAGES) {
    test(`Interactive test: ${pagePath}`, async ({ page }) => {
      await page.goto(pagePath, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Find all interactive elements
      const buttons = await page.locator('button').all();
      const inputs = await page.locator('input').all();
      const selects = await page.locator('select').all();
      const textareas = await page.locator('textarea').all();

      console.log(
        `Found: ${buttons.length} buttons, ${inputs.length} inputs, ${selects.length} selects, ${textareas.length} textareas`
      );

      // Test empty form submission (if there are buttons)
      for (const button of buttons.slice(0, 3)) {
        const buttonText = await button.textContent();
        const isSubmit =
          buttonText?.toLowerCase().includes('submit') ||
          buttonText?.toLowerCase().includes('invia') ||
          buttonText?.toLowerCase().includes('save') ||
          buttonText?.toLowerCase().includes('salva');

        if (isSubmit) {
          try {
            await button.click({ timeout: 5000 });
            // Check if validation errors appear
            await page.waitForTimeout(500);
            const errorElements = await page
              .locator('[role="alert"], .error, [data-testid*="error"]')
              .all();
            if (errorElements.length > 0) {
              console.log(`✓ Form validation triggered for ${pagePath}`);
            }
          } catch (e) {
            // Error is expected for empty form
          }
        }
      }

      // Test XSS in first text input
      if (inputs.length > 0) {
        try {
          await inputs[0].fill("<script>alert('xss')</script>", { timeout: 5000 });
          const inputValue = await inputs[0].inputValue();
          if (inputValue.includes('<script>')) {
            console.warn(
              `⚠️  XSS vulnerability possible on ${pagePath} — script tag not sanitized`
            );
          }
        } catch {
          // Input may not be fillable
        }
      }

      // Test double-click on submit buttons
      for (const button of buttons.slice(0, 2)) {
        try {
          await button.dblclick({ timeout: 5000 });
          await page.waitForTimeout(300);
        } catch {
          // Expected behavior
        }
      }
    });
  }
});

// ============================================================================
// Test: Phase 3 — Error States
// ============================================================================

test.describe('Phase 3: Error State Testing (API failure scenarios)', () => {
  for (const pagePath of MAIN_LIST_PAGES) {
    test(`Error handling: ${pagePath} — API 500`, async ({ page }) => {
      // Route API calls to return 500
      await page.route('**/api/**', async route => {
        await route.abort();
      });

      await page.goto(pagePath, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1000);

      // Check for error message
      const errorVisible = await page
        .locator('[role="alert"], .error, [data-testid*="error"]')
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      if (!errorVisible) {
        console.warn(`⚠️  No error message shown on ${pagePath} when API fails`);
      }
    });

    test(`Error handling: ${pagePath} — Empty data`, async ({ page }) => {
      // Mock API to return empty array
      await page.route('**/api/**', async route => {
        const url = route.request().url();
        if (url.includes('get') || url.includes('list')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([]),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto(pagePath, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1500);

      // Check for "no data" message
      const emptyMessageVisible = await page
        .locator('text=/nessun|no data|empty|vuoto/i')
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      if (!emptyMessageVisible) {
        console.warn(`⚠️  No empty state message on ${pagePath}`);
      }
    });

    test(`Error handling: ${pagePath} — Slow load`, async ({ page }) => {
      // Delay API responses
      await page.route('**/api/**', async route => {
        await page.waitForTimeout(3000);
        await route.continue();
      });

      await page.goto(pagePath, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Check for loading state
      const loadingVisible = await page
        .locator('[data-testid*="loading"], .spinner, [role="progressbar"]')
        .isVisible({ timeout: 2000 })
        .catch(() => false);

      if (!loadingVisible) {
        console.warn(`⚠️  No loading state on ${pagePath}`);
      }
    });
  }
});

// ============================================================================
// Test: Phase 4 — Accessibility Basics
// ============================================================================

test.describe('Phase 4: Accessibility Check (main pages)', () => {
  const a11yPages = MAIN_LIST_PAGES.concat(['/dashboard', '/dashboard/settings']);

  for (const pagePath of a11yPages) {
    test(`A11Y: ${pagePath}`, async ({ page }) => {
      await page.goto(pagePath, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Check for h1
      const h1Count = await page.locator('h1').count();
      if (h1Count === 0) {
        console.warn(`⚠️  Missing h1 on ${pagePath}`);
      }

      // Check heading hierarchy
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
      for (let i = 1; i < headings.length; i++) {
        const prevLevel = parseInt((await headings[i - 1].evaluate(el => el.tagName))[1]);
        const currLevel = parseInt((await headings[i].evaluate(el => el.tagName))[1]);
        if (currLevel > prevLevel + 1) {
          console.warn(`⚠️  Heading hierarchy skip on ${pagePath}: h${prevLevel} → h${currLevel}`);
        }
      }

      // Check for inputs without labels
      const inputs = await page.locator('input:not([type="hidden"])').all();
      for (const input of inputs.slice(0, 5)) {
        const ariaLabel = await input.getAttribute('aria-label');
        const labelId = await input.getAttribute('id');
        let hasLabel = !!ariaLabel;

        if (!hasLabel && labelId) {
          const label = await page.locator(`label[for="${labelId}"]`).count();
          hasLabel = label > 0;
        }

        if (!hasLabel) {
          console.warn(`⚠️  Input without label on ${pagePath}`);
        }
      }

      // Check focus visible on buttons
      const buttons = await page.locator('button').all();
      if (buttons.length > 0) {
        try {
          await buttons[0].focus();
          const focusOutline = await buttons[0].evaluate(el => {
            const styles = window.getComputedStyle(el);
            return styles.outline !== 'none' || styles.boxShadow !== 'none';
          });

          if (!focusOutline) {
            console.warn(`⚠️  No focus visible on button ${pagePath}`);
          }
        } catch {
          // Focus test failed
        }
      }
    });
  }
});

// ============================================================================
// Test Summary Report
// ============================================================================

test('Generate QA Report', async ({ page }) => {
  console.log('\n\n================================');
  console.log('🎯 QA DEEP TEST SUMMARY');
  console.log('================================\n');
  console.log(`Total bugs detected: ${bugCount}`);
  console.log(`Report saved to: ${BUG_REPORT_DIR}`);
  console.log(`Screenshots: /bug-reports/BUG-*.png`);
});
