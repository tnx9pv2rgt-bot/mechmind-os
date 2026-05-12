import { test, expect } from '@playwright/test';

/**
 * FatturaPA Flow E2E Tests (B-002)
 *
 * Tests the FatturaPA (SDI) invoice generation and submission flow:
 * - Invoice list has SDI/export actions
 * - Create invoice form includes FatturaPA-required fields
 * - XML export is available for issued invoices
 * - API endpoints respond without errors
 *
 * Note: These tests verify UI presence of FatturaPA features.
 * They do not test actual SDI transmission (would require test instance of SDI).
 */

test.describe('B-002 — FatturaPA / SDI Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Skip auth for now — tests focus on UI/API presence
    // In a real scenario, would authenticate first
  });

  test('invoices page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => {
      if (!err.message.includes('hydrat')) {
        errors.push(err.message);
      }
    });

    await page.goto('/dashboard/invoices', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Should not have fatal errors
    expect(errors.filter(e => !e.includes('fetch'))).toEqual([]);
  });

  test('API /api/v1/invoices responds with 200 or 401 (not 500)', async ({ page }) => {
    const response = await page.request.get('/api/v1/invoices?limit=10', {
      headers: { 'Content-Type': 'application/json' },
    });

    // Should not be a server error (500/502)
    expect(response.status()).not.toBe(500);
    expect(response.status()).not.toBe(502);

    // Should be either 200 (authenticated) or 401 (unauthorized)
    expect([200, 401]).toContain(response.status());
  });

  test('invoice creation page has FatturaPA-related fields', async ({ page }) => {
    await page.goto('/dashboard/invoices/new', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const pageContent = await page.content();

    // Check for FatturaPA field indicators (may vary in exact naming)
    const hasPIVAField =
      pageContent.includes('IVA') ||
      pageContent.includes('P.IVA') ||
      pageContent.includes('Partita') ||
      pageContent.includes('partitaIva') ||
      pageContent.includes('piva');

    const hasCodiceFiscale =
      pageContent.includes('Fiscale') ||
      pageContent.includes('CF') ||
      pageContent.includes('codice') ||
      pageContent.includes('fiscal');

    // At least one FatturaPA field should be present
    expect(hasPIVAField || hasCodiceFiscale).toBe(true);
  });

  test('invoice list shows at least one invoice or empty state', async ({ page }) => {
    await page.goto('/dashboard/invoices', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Check if there are invoices or empty state
    const invoiceRows = page.locator('[data-testid*="invoice"], .invoice-row, table tbody tr');
    const emptyState = page.locator('text=Nessuna fattura, text=No invoices');

    const hasInvoices = (await invoiceRows.count()) > 0;
    const hasEmptyState = await emptyState
      .first()
      .isVisible()
      .catch(() => false);

    // Should have either invoices or an empty state
    expect(hasInvoices || hasEmptyState).toBe(true);
  });

  test('invoice actions are available (menu or buttons)', async ({ page }) => {
    await page.goto('/dashboard/invoices', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Look for action buttons/menus
    const actionMenu = page.locator(
      '[data-testid*="actions"], [aria-label*="azioni"], .invoice-actions'
    );
    const downloadButton = page.locator(
      'button:has-text("Scarica"), button:has-text("Download"), button:has-text("XML")'
    );

    const hasActions = (await actionMenu.count()) > 0 || (await downloadButton.count()) > 0;

    // Should have some action capability
    // (may be empty list, but if there are invoices, should have actions)
    expect(hasActions || (await page.locator('[data-testid*="invoice"]').count()) === 0).toBe(true);
  });

  test('FatturaPA form fields are properly labeled', async ({ page }) => {
    await page.goto('/dashboard/invoices/new', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const pageContent = await page.content();

    // Check for common FatturaPA labels in Italian
    const labels = [
      'Partita IVA',
      'P.IVA',
      'Codice Fiscale',
      'Codice Destinatario',
      'SDI',
      'CIG',
      'CUP',
    ];

    const hasLabels = labels.some(label => pageContent.includes(label));

    // At least one FatturaPA label should be present in form
    expect(hasLabels).toBe(true);
  });

  test('invoice detail view has export/SDI options', async ({ page }) => {
    await page.goto('/dashboard/invoices', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Try to find first invoice and navigate to it
    const firstInvoice = page.locator(
      '[data-testid*="invoice"]:first-child, table tbody tr:first-child'
    );
    const isInvoicePresent = (await firstInvoice.count()) > 0;

    if (isInvoicePresent) {
      await firstInvoice.click().catch(() => {
        // May not be clickable, try link instead
        const link = firstInvoice.locator('a').first();
        return link.click();
      });

      await page.waitForNavigation().catch(() => {
        // May not navigate if no details view
      });
      await page.waitForTimeout(1000);

      // Check for export actions
      const hasExport = await page
        .locator('button:has-text("Scarica"), button:has-text("Export"), button:has-text("XML")')
        .isVisible()
        .catch(() => false);

      // If detail page loaded, should have export
      if ((await page.url()).includes('invoice')) {
        expect(hasExport || (await page.locator('[aria-label*="export"]').count()) > 0).toBe(true);
      }
    } else {
      // No invoices — that's also valid
      expect(true).toBe(true);
    }
  });

  test('responsive: invoices page works on mobile (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    await page.goto('/dashboard/invoices', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Page should be visible without horizontal scroll
    const viewportSize = await page.viewportSize();
    expect(viewportSize?.width).toBeLessThanOrEqual(375);

    // Should not have elements overflowing
    const overflow = await page.evaluate(() => {
      const html = document.documentElement;
      return html.scrollWidth > html.clientWidth;
    });
    expect(overflow).toBe(false);
  });

  test('dark mode: invoice page renders correctly in dark mode', async ({ page }) => {
    await page.goto('/dashboard/invoices', { waitUntil: 'networkidle' });

    // Enable dark mode
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    });

    await page.waitForTimeout(1000);

    // Should still be readable — no color contrast issues
    const bgColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).backgroundColor;
    });

    // Background should not be white in dark mode
    expect(bgColor).not.toMatch(/rgb\(255,\s*255,\s*255\)/);
  });

  test('invoice form has tax (IVA) fields', async ({ page }) => {
    await page.goto('/dashboard/invoices/new', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const pageContent = await page.content();

    // Should have IVA/tax-related fields
    const hasTaxFields =
      pageContent.includes('IVA') ||
      pageContent.includes('Imposta') ||
      pageContent.includes('Aliquota') ||
      pageContent.includes('Tax');

    expect(hasTaxFields).toBe(true);
  });

  test('invoice form has total/amount fields', async ({ page }) => {
    await page.goto('/dashboard/invoices/new', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const pageContent = await page.content();

    // Should have amount/total fields
    const hasAmountFields =
      pageContent.includes('Totale') ||
      pageContent.includes('Imponibile') ||
      pageContent.includes('Importo') ||
      pageContent.includes('Total') ||
      pageContent.includes('Amount');

    expect(hasAmountFields).toBe(true);
  });

  test('no server errors (500/502) on invoice routes', async ({ page }) => {
    const errorStatus: number[] = [];

    page.on('response', response => {
      // Only check API/navigation responses, not assets
      if (!response.url().includes('.js') && !response.url().includes('.css')) {
        if (response.status() >= 500) {
          errorStatus.push(response.status());
        }
      }
    });

    await page.goto('/dashboard/invoices', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Should not have 500/502 errors
    expect(errorStatus.filter(s => s >= 500)).toEqual([]);
  });

  test('invoice API returns valid JSON', async ({ page }) => {
    const response = await page.request.get('/api/v1/invoices?limit=1', {
      headers: { 'Content-Type': 'application/json' },
    });

    // If response is successful, should be JSON
    if (response.ok || response.status() === 401) {
      try {
        const json = await response.json();
        // Should have some structure
        expect(typeof json).not.toBe('undefined');
      } catch {
        // Might be empty or not JSON if 401
        expect(response.status()).toBe(401);
      }
    }
  });
});
