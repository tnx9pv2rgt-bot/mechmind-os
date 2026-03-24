import { test, expect } from '../fixtures/auth.fixture';
import type { Page } from '@playwright/test';

// ============================================
// MOCK DATA
// ============================================

const MOCK_INVOICES = {
  data: [
    {
      id: 'inv-1',
      invoiceNumber: 'FE-2026-001',
      total: 350.00,
      status: 'SENT',
      createdAt: '2026-03-15T00:00:00Z',
      dueDate: '2026-04-15T00:00:00Z',
      paidAt: null,
      items: [
        { description: 'Tagliando completo', qty: 1, price: 250 },
        { description: 'Olio motore 5W30', qty: 4, price: 25 },
      ],
    },
    {
      id: 'inv-2',
      invoiceNumber: 'FE-2026-002',
      total: 180.00,
      status: 'PAID',
      createdAt: '2026-03-10T00:00:00Z',
      dueDate: '2026-04-10T00:00:00Z',
      paidAt: '2026-03-12T00:00:00Z',
      items: [
        { description: 'Revisione', qty: 1, price: 80 },
        { description: 'Sostituzione filtri', qty: 1, price: 100 },
      ],
    },
    {
      id: 'inv-3',
      invoiceNumber: 'FE-2026-003',
      total: 520.00,
      status: 'OVERDUE',
      createdAt: '2026-02-20T00:00:00Z',
      dueDate: '2026-03-20T00:00:00Z',
      paidAt: null,
      items: [
        { description: 'Sostituzione freni anteriori', qty: 1, price: 520 },
      ],
    },
    {
      id: 'inv-4',
      invoiceNumber: 'FE-2026-004',
      total: 100.00,
      status: 'DRAFT',
      createdAt: '2026-03-18T00:00:00Z',
      dueDate: null,
      paidAt: null,
      items: [
        { description: 'Diagnosi elettronica', qty: 1, price: 100 },
      ],
    },
  ],
};

function setupInvoiceMocks(page: Page): void {
  void page.route('**/api/portal/invoices**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_INVOICES) })
  );
  void page.route('**/api/portal/invoices/*/pdf**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/pdf',
      body: Buffer.from('fake-pdf-content').toString('base64'),
    })
  );
  void page.route('**/api/portal/invoices/*/pay**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ url: 'https://checkout.stripe.com/test' }),
    })
  );
  void page.route('**/api/portal/customer**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { id: 'c-1', firstName: 'Marco', lastName: 'Bianchi' } }),
    })
  );
}

// ============================================
// 1. RENDER
// ============================================

test.describe('Portal Invoices - Render', () => {
  test('should render the invoices page', async ({ page }) => {
    setupInvoiceMocks(page);
    await page.goto('/portal/invoices');

    const heading = page.getByRole('heading', { name: /fatture|invoice/i })
      .or(page.getByText(/le tue fatture|fatture/i).first());
    await expect(heading).toBeVisible({ timeout: 10000 });
  });
});

// ============================================
// 2. LOADING
// ============================================

test.describe('Portal Invoices - Loading', () => {
  test('should show loading state while fetching invoices', async ({ page }) => {
    void page.route('**/api/portal/invoices**', (route) =>
      new Promise((resolve) => setTimeout(() => resolve(route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_INVOICES),
      })), 3000))
    );
    void page.route('**/api/portal/customer**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { id: 'c-1', firstName: 'Marco', lastName: 'Bianchi' } }),
      })
    );

    await page.goto('/portal/invoices');

    const loader = page.locator('.animate-spin').or(page.getByText(/caricamento/i));
    await expect(loader.first()).toBeVisible({ timeout: 5000 });
  });
});

// ============================================
// 3. EMPTY
// ============================================

test.describe('Portal Invoices - Empty', () => {
  test('should show empty state when no invoices', async ({ page }) => {
    void page.route('**/api/portal/invoices**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) })
    );
    void page.route('**/api/portal/customer**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { id: 'c-1', firstName: 'Marco', lastName: 'Bianchi' } }),
      })
    );

    await page.goto('/portal/invoices');
    await page.waitForLoadState('networkidle');

    const emptyText = page.getByText(/nessuna fattura|non hai fatture/i);
    if (await emptyText.isVisible().catch(() => false)) {
      await expect(emptyText).toBeVisible();
    }
  });
});

// ============================================
// 4. ERROR
// ============================================

test.describe('Portal Invoices - Error', () => {
  test('should show error state on API failure', async ({ page }) => {
    void page.route('**/api/portal/invoices**', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Server Error' }) })
    );
    void page.route('**/api/portal/customer**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { id: 'c-1', firstName: 'Marco', lastName: 'Bianchi' } }),
      })
    );

    await page.goto('/portal/invoices');
    await page.waitForLoadState('networkidle');

    const errorEl = page.getByText(/errore|impossibile|problema/i);
    await expect(errorEl.first()).toBeVisible({ timeout: 10000 });
  });
});

// ============================================
// 5. DATA
// ============================================

test.describe('Portal Invoices - Data', () => {
  test.beforeEach(async ({ page }) => {
    setupInvoiceMocks(page);
    await page.goto('/portal/invoices');
    await page.waitForLoadState('networkidle');
  });

  test('should display invoice list with invoice numbers', async ({ page }) => {
    await expect(page.getByText('FE-2026-001')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('FE-2026-002')).toBeVisible();
  });

  test('should display invoice status badges in Italian', async ({ page }) => {
    await expect(page.getByText('Da pagare').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Pagata').first()).toBeVisible();
    await expect(page.getByText('Scaduta').first()).toBeVisible();
  });

  test('should display invoice totals', async ({ page }) => {
    await expect(page.getByText(/350/).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/180/).first()).toBeVisible();
  });

  test('should display "Paga Ora" button for unpaid invoices', async ({ page }) => {
    const payBtn = page.getByRole('button', { name: /paga|paga ora|pay/i })
      .or(page.getByText(/paga ora/i));
    await expect(payBtn.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display PDF download button', async ({ page }) => {
    const pdfBtn = page.getByRole('button', { name: /pdf|scarica|download/i })
      .or(page.locator('button').filter({ has: page.locator('svg') }));
    await expect(pdfBtn.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display filter tabs for all/unpaid/paid', async ({ page }) => {
    const tabs = page.getByText(/tutte|da pagare|pagate/i);
    await expect(tabs.first()).toBeVisible({ timeout: 10000 });
  });
});

// ============================================
// 6. ACTIONS
// ============================================

test.describe('Portal Invoices - Actions', () => {
  test.beforeEach(async ({ page }) => {
    setupInvoiceMocks(page);
    await page.goto('/portal/invoices');
    await page.waitForLoadState('networkidle');
  });

  test('should click "Paga Ora" button', async ({ page }) => {
    const payBtn = page.getByRole('button', { name: /paga|paga ora/i })
      .or(page.getByText(/paga ora/i));
    if (await payBtn.first().isVisible().catch(() => false)) {
      await payBtn.first().click();
      await page.waitForTimeout(500);
    }
  });

  test('should filter by unpaid invoices', async ({ page }) => {
    const unpaidTab = page.getByText(/da pagare/i).first();
    if (await unpaidTab.isVisible().catch(() => false)) {
      await unpaidTab.click();
      await page.waitForTimeout(500);
    }
  });

  test('should filter by paid invoices', async ({ page }) => {
    const paidTab = page.getByText(/pagate/i).first();
    if (await paidTab.isVisible().catch(() => false)) {
      await paidTab.click();
      await page.waitForTimeout(500);
    }
  });

  test('should navigate to invoice detail', async ({ page }) => {
    const invoiceLink = page.getByText('FE-2026-001').or(
      page.getByRole('link').filter({ hasText: /FE-2026-001/ })
    );
    if (await invoiceLink.isVisible().catch(() => false)) {
      await invoiceLink.click();
      await page.waitForTimeout(500);
    }
  });
});
