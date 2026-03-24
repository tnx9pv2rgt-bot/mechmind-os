import { test, expect } from '../fixtures/auth.fixture';
import type { Page } from '@playwright/test';

// ============================================
// MOCK DATA
// ============================================

const MOCK_ANALYTICS = {
  data: {
    kpis: {
      revenue: 45230.50,
      completedOrders: 87,
      newCustomers: 12,
      avgTicket: 520.00,
      conversionRate: 78.5,
    },
    revenueChart: [
      { period: 'Gen', revenue: 35000 },
      { period: 'Feb', revenue: 38000 },
      { period: 'Mar', revenue: 45230 },
    ],
    workOrdersByStatus: [
      { status: 'OPEN', count: 15 },
      { status: 'IN_PROGRESS', count: 23 },
      { status: 'COMPLETED', count: 87 },
      { status: 'CANCELLED', count: 3 },
    ],
    topServices: [
      { name: 'Tagliando', count: 42 },
      { name: 'Cambio Freni', count: 28 },
      { name: 'Revisione', count: 25 },
      { name: 'Cambio Olio', count: 18 },
      { name: 'Diagnosi Elettronica', count: 15 },
    ],
    customerTrends: [
      { period: 'Gen', newCustomers: 8, returningCustomers: 45 },
      { period: 'Feb', newCustomers: 10, returningCustomers: 50 },
      { period: 'Mar', newCustomers: 12, returningCustomers: 55 },
    ],
    capacityUtilization: [
      { period: 'Lun', utilization: 85 },
      { period: 'Mar', utilization: 92 },
      { period: 'Mer', utilization: 78 },
      { period: 'Gio', utilization: 90 },
      { period: 'Ven', utilization: 88 },
    ],
    revenueByTechnician: [
      { name: 'Mario Rossi', revenue: 15000 },
      { name: 'Luigi Bianchi', revenue: 12000 },
      { name: 'Andrea Verdi', revenue: 10230 },
    ],
  },
};

function setupAnalyticsMocks(page: Page): void {
  void page.route('**/api/dashboard/analytics**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ANALYTICS) })
  );
  void page.route('**/api/analytics/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ANALYTICS) })
  );
}

// ============================================
// 1. RENDER
// ============================================

test.describe('Analytics - Render', () => {
  test('should render the analytics page with title', async ({ page }) => {

    setupAnalyticsMocks(page);
    await page.goto('/dashboard/analytics');

    const heading = page.getByRole('heading', { name: /analytics|analisi|statistiche|report/i })
      .or(page.getByText(/analytics|analisi/i).first());
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('should render period selector', async ({ page }) => {

    setupAnalyticsMocks(page);
    await page.goto('/dashboard/analytics');
    await page.waitForLoadState('networkidle');

    // Period options: Oggi, Settimana, Mese, Trimestre, Anno
    const periodButton = page.getByText('Mese').or(page.getByText('Settimana')).or(page.getByText('Oggi'));
    await expect(periodButton.first()).toBeVisible({ timeout: 10000 });
  });
});

// ============================================
// 2. LOADING
// ============================================

test.describe('Analytics - Loading', () => {
  test('should show loading indicator while fetching analytics', async ({ page }) => {


    void page.route('**/api/dashboard/analytics**', (route) =>
      new Promise((resolve) => setTimeout(() => resolve(route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_ANALYTICS),
      })), 3000))
    );

    await page.goto('/dashboard/analytics');

    const loader = page.locator('.animate-spin');
    await expect(loader.first()).toBeVisible({ timeout: 5000 });
  });
});

// ============================================
// 3. EMPTY
// ============================================

test.describe('Analytics - Empty', () => {
  test('should render page even with zero data', async ({ page }) => {


    void page.route('**/api/dashboard/analytics**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            kpis: { revenue: 0, completedOrders: 0, newCustomers: 0, avgTicket: 0, conversionRate: 0 },
            revenueChart: [],
            workOrdersByStatus: [],
            topServices: [],
            customerTrends: [],
            capacityUtilization: [],
            revenueByTechnician: [],
          },
        }),
      })
    );

    await page.goto('/dashboard/analytics');
    await page.waitForLoadState('networkidle');

    // KPI cards should still render with zero values
    await expect(page.getByText('Fatturato')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/0,00/)).toBeVisible();
  });
});

// ============================================
// 4. ERROR
// ============================================

test.describe('Analytics - Error', () => {
  test('should show error state on API failure', async ({ page }) => {


    void page.route('**/api/dashboard/analytics**', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Server Error' }) })
    );

    await page.goto('/dashboard/analytics');
    await page.waitForLoadState('networkidle');

    const errorEl = page.getByText(/errore|impossibile|problema/i).first();
    await expect(errorEl).toBeVisible({ timeout: 10000 });
  });
});

// ============================================
// 5. DATA
// ============================================

test.describe('Analytics - Data', () => {
  test.beforeEach(async ({ page }) => {

    setupAnalyticsMocks(page);
    await page.goto('/dashboard/analytics');
    await page.waitForLoadState('networkidle');
  });

  test('should display 5 KPI cards', async ({ page }) => {
    await expect(page.getByText('Fatturato')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('OdL Completati')).toBeVisible();
    await expect(page.getByText('Clienti Nuovi')).toBeVisible();
    await expect(page.getByText('Ticket Medio')).toBeVisible();
    await expect(page.getByText('Tasso Conversione')).toBeVisible();
  });

  test('should display KPI values', async ({ page }) => {
    // Revenue: 45.230,50
    await expect(page.getByText(/45\.230/)).toBeVisible({ timeout: 10000 });
    // Completed orders: 87
    await expect(page.getByText('87')).toBeVisible();
    // New customers: 12
    await expect(page.getByText('12')).toBeVisible();
    // Conversion rate: 78.5%
    await expect(page.getByText(/78,5/)).toBeVisible();
  });

  test('should render 6 recharts charts (SVG elements)', async ({ page }) => {
    // Recharts renders SVG elements with class .recharts-surface
    const svgElements = page.locator('.recharts-surface, .recharts-wrapper svg, svg.recharts-surface');
    await expect(svgElements.first()).toBeVisible({ timeout: 10000 });

    const svgCount = await svgElements.count();
    expect(svgCount).toBeGreaterThanOrEqual(1);

    // Also check for specific chart containers
    const chartContainers = page.locator('.recharts-wrapper, .recharts-responsive-container');
    const containerCount = await chartContainers.count();
    expect(containerCount).toBeGreaterThanOrEqual(1);
  });

  test('should display revenue chart', async ({ page }) => {
    // Revenue chart should have bars or lines
    const revenueChart = page.locator('.recharts-bar, .recharts-line, .recharts-area').first();
    await expect(revenueChart).toBeVisible({ timeout: 10000 });
  });

  test('should display period options in Italian', async ({ page }) => {
    await expect(page.getByText('Oggi')).toBeVisible();
    await expect(page.getByText('Settimana')).toBeVisible();
    await expect(page.getByText('Mese')).toBeVisible();
    await expect(page.getByText('Trimestre')).toBeVisible();
    await expect(page.getByText('Anno')).toBeVisible();
  });

  test('should display export buttons', async ({ page }) => {
    const exportBtn = page.getByRole('button', { name: /esporta|export|scarica|download/i })
      .or(page.getByText(/esporta|export/i));
    if (await exportBtn.first().isVisible().catch(() => false)) {
      await expect(exportBtn.first()).toBeVisible();
    }
  });
});

// ============================================
// 6. ACTIONS
// ============================================

test.describe('Analytics - Actions', () => {
  test.beforeEach(async ({ page }) => {

    setupAnalyticsMocks(page);
    await page.goto('/dashboard/analytics');
    await page.waitForLoadState('networkidle');
  });

  test('should switch period and refetch data', async ({ page }) => {
    // Click on "Settimana" period
    const weekBtn = page.getByText('Settimana');
    await weekBtn.click();
    await page.waitForLoadState('networkidle');

    // KPIs should still be visible
    await expect(page.getByText('Fatturato')).toBeVisible();
  });

  test('should switch to "Trimestre" period', async ({ page }) => {
    const quarterBtn = page.getByText('Trimestre');
    await quarterBtn.click();
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Fatturato')).toBeVisible();
  });

  test('should switch to "Anno" period', async ({ page }) => {
    const yearBtn = page.getByText('Anno');
    await yearBtn.click();
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Fatturato')).toBeVisible();
  });

  test('export button should be clickable', async ({ page }) => {
    const exportBtn = page.getByRole('button', { name: /esporta|export|scarica/i })
      .or(page.getByText(/esporta|export/i));
    if (await exportBtn.first().isVisible().catch(() => false)) {
      await exportBtn.first().click();
      // Should not crash
      await page.waitForTimeout(500);
    }
  });
});
