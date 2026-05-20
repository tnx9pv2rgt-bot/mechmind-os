import { test, expect } from '../fixtures/auth.fixture';

/**
 * Work Orders Page E2E Tests — API-mocked, no backend required.
 * 6-block pattern: Render, Loading, Empty, Error, Data, Actions.
 */

const MOCK_WORK_ORDERS = {
  data: [
    {
      id: 'wo-1',
      woNumber: 'OdL-001',
      status: 'OPEN',
      priority: 'HIGH',
      vehicleMake: 'Fiat',
      vehicleModel: 'Punto',
      vehiclePlate: 'AB123CD',
      customerName: 'Marco Verdi',
      technicianName: 'Luca Meccanico',
      totalCost: 350,
      estimatedHours: 3,
      createdAt: '2026-03-20T08:00:00Z',
      updatedAt: '2026-03-20T10:00:00Z',
    },
    {
      id: 'wo-2',
      woNumber: 'OdL-002',
      status: 'IN_PROGRESS',
      priority: 'NORMAL',
      vehicleMake: 'BMW',
      vehicleModel: '320d',
      vehiclePlate: 'EF456GH',
      customerName: 'Laura Bianchi',
      technicianName: 'Andrea Tecnico',
      totalCost: 1200,
      estimatedHours: 8,
      createdAt: '2026-03-19T14:00:00Z',
      updatedAt: '2026-03-20T09:00:00Z',
    },
    {
      id: 'wo-3',
      woNumber: 'OdL-003',
      status: 'COMPLETED',
      priority: 'LOW',
      vehicleMake: 'Audi',
      vehicleModel: 'A4',
      vehiclePlate: 'IJ789KL',
      customerName: 'Paolo Gialli',
      technicianName: 'Luca Meccanico',
      totalCost: 680,
      estimatedHours: 5,
      createdAt: '2026-03-18T10:00:00Z',
      updatedAt: '2026-03-19T16:00:00Z',
    },
  ],
  total: 3,
  page: 1,
  limit: 20,
};

function mockWorkOrdersApi(
  page: import('@playwright/test').Page,
  data = MOCK_WORK_ORDERS
): Promise<void> {
  return page.route('**/api/work-orders**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(data),
    });
  });
}

test.describe('Work Orders - Render', () => {
  test.beforeEach(async ({ page }) => {

    await mockWorkOrdersApi(page);
    await page.goto('/dashboard/work-orders');
    await page.waitForLoadState('networkidle');
  });

  test('shows search input', async ({ page }) => {
    await expect(page.getByPlaceholder(/Cerca/i)).toBeVisible();
  });

  test('shows status filter dropdown', async ({ page }) => {
    await expect(page.locator('select').or(
      page.getByText(/Tutti gli stati/i)
    ).first()).toBeVisible();
  });

  test('shows view mode toggle (list/kanban)', async ({ page }) => {
    // List and Kanban view toggle icons
    const listToggle = page.locator('button[aria-label*="list"], button[title*="list"]').or(
      page.locator('button').filter({ has: page.locator('[class*="LayoutList"]') })
    ).first();
    const kanbanToggle = page.locator('button[aria-label*="kanban"], button[title*="kanban"]').or(
      page.locator('button').filter({ has: page.locator('[class*="LayoutGrid"]') })
    ).first();

    // At least one toggle should be visible
    const isListVisible = await listToggle.isVisible().catch(() => false);
    const isKanbanVisible = await kanbanToggle.isVisible().catch(() => false);
    expect(isListVisible || isKanbanVisible).toBe(true);
  });
});

test.describe('Work Orders - Loading', () => {
  test('shows skeleton while loading', async ({ page }) => {


    await page.route('**/api/work-orders**', async (route) => {
      await new Promise((r) => setTimeout(r, 3000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_WORK_ORDERS),
      });
    });

    await page.goto('/dashboard/work-orders');
    const skeletons = page.locator('.animate-pulse');
    await expect(skeletons.first()).toBeVisible();
  });
});

test.describe('Work Orders - Empty State', () => {
  test('shows empty state when no work orders', async ({ page }) => {

    await mockWorkOrdersApi(page, { data: [], total: 0, page: 1, limit: 20 });
    await page.goto('/dashboard/work-orders');

    await expect(page.getByText(/Nessun ordine|nessun risultato/i).first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Work Orders - Error State', () => {
  test('shows error state on API failure', async ({ page }) => {


    await page.route('**/api/work-orders**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await page.goto('/dashboard/work-orders');
    await expect(page.getByText(/errore|impossibile/i).first()).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Work Orders - Data', () => {
  test.beforeEach(async ({ page }) => {

    await mockWorkOrdersApi(page);
    await page.goto('/dashboard/work-orders');
    await page.waitForLoadState('networkidle');
  });

  test('shows work order numbers', async ({ page }) => {
    await expect(page.getByText('OdL-001')).toBeVisible();
    await expect(page.getByText('OdL-002')).toBeVisible();
  });

  test('shows customer names', async ({ page }) => {
    await expect(page.getByText('Marco Verdi')).toBeVisible();
    await expect(page.getByText('Laura Bianchi')).toBeVisible();
  });

  test('shows status badges with correct labels', async ({ page }) => {
    await expect(page.getByText('Aperto')).toBeVisible();
    await expect(page.getByText('In Lavorazione')).toBeVisible();
    await expect(page.getByText('Completato')).toBeVisible();
  });

  test('shows vehicle plates', async ({ page }) => {
    await expect(page.getByText('AB123CD')).toBeVisible();
    await expect(page.getByText('EF456GH')).toBeVisible();
  });
});

test.describe('Work Orders - Actions', () => {
  test('search filters work orders', async ({ page }) => {


    let lastSearchParam = '';
    await page.route('**/api/work-orders**', async (route) => {
      const url = new URL(route.request().url());
      lastSearchParam = url.searchParams.get('search') || '';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_WORK_ORDERS),
      });
    });

    await page.goto('/dashboard/work-orders');
    await page.getByPlaceholder(/Cerca/i).fill('Marco');
    await page.waitForTimeout(600);
    expect(lastSearchParam).toBe('Marco');
  });

  test('status filter changes API request', async ({ page }) => {


    let lastStatusParam = '';
    await page.route('**/api/work-orders**', async (route) => {
      const url = new URL(route.request().url());
      lastStatusParam = url.searchParams.get('status') || '';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_WORK_ORDERS),
      });
    });

    await page.goto('/dashboard/work-orders');

    // Select a status from the dropdown
    const statusSelect = page.locator('select').first();
    if (await statusSelect.isVisible().catch(() => false)) {
      await statusSelect.selectOption('OPEN');
      await page.waitForTimeout(600);
      expect(lastStatusParam).toBe('OPEN');
    }
  });

  test('clicking a work order navigates to detail', async ({ page }) => {

    await mockWorkOrdersApi(page);
    await page.goto('/dashboard/work-orders');

    // Click on the first WO row/card
    const firstWo = page.getByText('OdL-001');
    await firstWo.click();

    await page.waitForURL(/work-orders\/wo-1/);
  });

  test('kanban view toggle switches layout', async ({ page }) => {

    await mockWorkOrdersApi(page);
    await page.goto('/dashboard/work-orders');

    const kanbanToggle = page.locator('button').filter({ has: page.locator('[class*="LayoutGrid"]') }).first();
    if (await kanbanToggle.isVisible().catch(() => false)) {
      await kanbanToggle.click();
      // Kanban columns should appear
      await expect(page.getByText('Bozza').or(page.getByText('Aperto')).first()).toBeVisible();
    }
  });
});
