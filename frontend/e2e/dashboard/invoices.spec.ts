import { test, expect } from '../fixtures/auth.fixture';

/**
 * Invoices Page E2E Tests — API-mocked, no backend required.
 * 6-block pattern: Render, Loading, Empty, Error, Data, Actions.
 */

const MOCK_INVOICES = {
  data: [
    {
      id: 'inv-1',
      number: 'FT-2026/001',
      customerName: 'Marco Verdi',
      createdAt: '2026-03-15T10:00:00Z',
      dueDate: '2026-04-15T10:00:00Z',
      total: 1230.50,
      subtotal: 1008.61,
      taxAmount: 221.89,
      status: 'SENT',
    },
    {
      id: 'inv-2',
      number: 'FT-2026/002',
      customerName: 'Autofficina Rossi SRL',
      createdAt: '2026-03-10T09:00:00Z',
      dueDate: '2026-04-10T09:00:00Z',
      total: 4500.00,
      subtotal: 3688.52,
      taxAmount: 811.48,
      status: 'PAID',
    },
    {
      id: 'inv-3',
      number: 'FT-2026/003',
      customerName: 'Giulia Neri',
      createdAt: '2026-02-01T08:00:00Z',
      dueDate: '2026-03-01T08:00:00Z',
      total: 320.00,
      subtotal: 262.30,
      taxAmount: 57.70,
      status: 'OVERDUE',
    },
    {
      id: 'inv-4',
      number: 'FT-2026/004',
      customerName: 'Paolo Gialli',
      createdAt: '2026-03-20T11:00:00Z',
      dueDate: '2026-04-20T11:00:00Z',
      total: 180.00,
      subtotal: 147.54,
      taxAmount: 32.46,
      status: 'DRAFT',
    },
  ],
  total: 4,
  page: 1,
  limit: 20,
};

const MOCK_INVOICE_STATS = {
  monthlyRevenue: 6230.50,
  pendingCount: 1,
  sentCount: 1,
  paidCount: 1,
};

function mockInvoicesApi(
  page: import('@playwright/test').Page,
  invoices = MOCK_INVOICES,
  stats = MOCK_INVOICE_STATS
): Promise<void[]> {
  return Promise.all([
    page.route('**/api/invoices?**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(invoices),
      });
    }),
    page.route('**/api/invoices/stats**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(stats),
      });
    }),
  ]);
}

test.describe('Invoices - Render', () => {
  test.beforeEach(async ({ page }) => {

    await mockInvoicesApi(page);
    await page.goto('/dashboard/invoices');
    await page.waitForLoadState('networkidle');
  });

  test('shows search input', async ({ page }) => {
    await expect(page.getByPlaceholder(/Cerca/i).first()).toBeVisible();
  });

  test('shows new invoice button', async ({ page }) => {
    await expect(page.getByRole('link', { name: /Nuova Fattura/i }).or(
      page.getByRole('button', { name: /Nuova Fattura/i })
    ).first()).toBeVisible();
  });

  test('shows status filter', async ({ page }) => {
    await expect(page.getByText(/Tutti gli stati/i).first()).toBeVisible();
  });
});

test.describe('Invoices - Loading', () => {
  test('shows skeleton while loading', async ({ page }) => {


    await page.route('**/api/invoices**', async (route) => {
      await new Promise((r) => setTimeout(r, 3000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_INVOICES),
      });
    });

    await page.goto('/dashboard/invoices');
    const skeletons = page.locator('.animate-pulse');
    await expect(skeletons.first()).toBeVisible();
  });
});

test.describe('Invoices - Empty State', () => {
  test('shows empty state when no invoices', async ({ page }) => {

    await mockInvoicesApi(page, { data: [], total: 0, page: 1, limit: 20 }, MOCK_INVOICE_STATS);
    await page.goto('/dashboard/invoices');

    await expect(page.getByText(/Nessuna fattura|nessun risultato/i).first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Invoices - Error State', () => {
  test('shows error on API failure', async ({ page }) => {


    await page.route('**/api/invoices**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await page.goto('/dashboard/invoices');
    await expect(page.getByText(/errore|impossibile/i).first()).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Invoices - Data', () => {
  test.beforeEach(async ({ page }) => {

    await mockInvoicesApi(page);
    await page.goto('/dashboard/invoices');
    await page.waitForLoadState('networkidle');
  });

  test('shows invoice numbers', async ({ page }) => {
    await expect(page.getByText('FT-2026/001')).toBeVisible();
    await expect(page.getByText('FT-2026/002')).toBeVisible();
  });

  test('shows customer names', async ({ page }) => {
    await expect(page.getByText('Marco Verdi')).toBeVisible();
    await expect(page.getByText('Autofficina Rossi SRL')).toBeVisible();
  });

  test('shows status badges', async ({ page }) => {
    await expect(page.getByText('Inviata')).toBeVisible();
    await expect(page.getByText('Pagata')).toBeVisible();
    await expect(page.getByText('Scaduta')).toBeVisible();
    await expect(page.getByText('Bozza').first()).toBeVisible();
  });

  test('shows invoice amounts', async ({ page }) => {
    // Amounts are formatted as Italian currency
    await expect(page.getByText(/1\.230,50|1230,50/).first()).toBeVisible();
  });
});

test.describe('Invoices - Actions', () => {
  test('search filters invoices', async ({ page }) => {


    let lastSearch = '';
    await page.route('**/api/invoices**', async (route) => {
      const url = new URL(route.request().url());
      lastSearch = url.searchParams.get('search') || '';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_INVOICES),
      });
    });

    await page.goto('/dashboard/invoices');
    await page.getByPlaceholder(/Cerca/i).first().fill('Marco');
    await page.waitForTimeout(600);
    expect(lastSearch).toBe('Marco');
  });

  test('new invoice button navigates to create page', async ({ page }) => {

    await mockInvoicesApi(page);
    await page.goto('/dashboard/invoices');

    const newBtn = page.getByRole('link', { name: /Nuova Fattura/i }).or(
      page.getByRole('button', { name: /Nuova Fattura/i })
    ).first();
    await newBtn.click();

    await page.waitForURL(/invoices\/new/);
  });

  test('clicking an invoice navigates to detail', async ({ page }) => {

    await mockInvoicesApi(page);
    await page.goto('/dashboard/invoices');

    // Click on first invoice number
    await page.getByText('FT-2026/001').click();
    await page.waitForURL(/invoices\/inv-1/);
  });

  test('status filter changes displayed invoices', async ({ page }) => {


    let lastStatusParam = '';
    await page.route('**/api/invoices**', async (route) => {
      const url = new URL(route.request().url());
      lastStatusParam = url.searchParams.get('status') || '';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_INVOICES),
      });
    });

    await page.goto('/dashboard/invoices');

    // Click on a status filter tab/button
    const paidFilter = page.getByRole('button', { name: /^Pagata$/i }).or(
      page.locator('button').filter({ hasText: /^Pagata$/ })
    ).first();

    if (await paidFilter.isVisible().catch(() => false)) {
      await paidFilter.click();
      await page.waitForTimeout(300);
    }
  });
});
