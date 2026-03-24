import { test, expect } from '../fixtures/auth.fixture';

/**
 * Dashboard Home E2E Tests — API-mocked, no backend required.
 */

const MOCK_STATS = {
  revenue: 42500,
  revenueChange: 12,
  bookingsToday: 8,
  bookingsChange: 5,
  avgTicket: 350,
  avgTicketChange: -3,
  vehiclesInShop: 14,
  vehiclesChange: 2,
  recentBookings: [],
  alerts: [],
  tenantName: 'Officina Test',
};

const MOCK_WORK_ORDERS = {
  data: [
    {
      id: 'wo-1',
      orderNumber: 'OdL-001',
      status: 'IN_PROGRESS',
      customerName: 'Marco Verdi',
      vehiclePlate: 'AB123CD',
      createdAt: '2026-03-20T10:00:00Z',
      totalCost: 250,
    },
    {
      id: 'wo-2',
      orderNumber: 'OdL-002',
      status: 'OPEN',
      customerName: 'Laura Bianchi',
      vehiclePlate: 'EF456GH',
      createdAt: '2026-03-19T14:00:00Z',
      totalCost: 480,
    },
  ],
  total: 2,
  page: 1,
  limit: 5,
};

const MOCK_BOOKINGS = {
  data: [
    {
      id: 'bk-1',
      customerName: 'Giulia Neri',
      vehiclePlate: 'IJ789KL',
      vehicleBrand: 'Fiat',
      serviceName: 'Tagliando',
      status: 'confirmed',
      scheduledAt: new Date().toISOString(),
    },
  ],
  total: 1,
  page: 1,
  limit: 5,
};

function mockDashboardApis(page: import('@playwright/test').Page): Promise<void[]> {
  return Promise.all([
    page.route('**/api/dashboard**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_STATS),
      });
    }),
    page.route('**/api/work-orders**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_WORK_ORDERS),
      });
    }),
    page.route('**/api/bookings**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_BOOKINGS),
      });
    }),
  ]);
}

test.describe('Dashboard - Render', () => {
  test.beforeEach(async ({ page }) => {
    await mockDashboardApis(page);
    await page.goto('/dashboard');
    // Wait for dashboard to fully load (handles cold start)
    await expect(page.getByRole('heading', { name: /Pannello/i })).toBeVisible({ timeout: 15000 });
  });

  test('shows "Pannello" heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Pannello/i })).toBeVisible();
  });

  test('shows tenant name', async ({ page }) => {
    await expect(page.getByText('Officina Test')).toBeVisible();
  });

  test('shows Agenda link', async ({ page }) => {
    await expect(page.getByText(/Agenda/i)).toBeVisible();
  });

  test('shows 4 KPI cards', async ({ page }) => {
    await expect(page.getByText('Ordini di Lavoro Attivi')).toBeVisible();
    await expect(page.getByText('Fatturato Mese')).toBeVisible();
    await expect(page.getByText('Prenotazioni Oggi')).toBeVisible();
    await expect(page.getByText('ARO Medio')).toBeVisible();
  });

  test('KPI cards show correct values', async ({ page }) => {
    // vehiclesInShop = 14, bookingsToday = 8
    // Use locator chain to find values within KPI card context
    await expect(page.locator('text=14').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=8').first()).toBeVisible();
  });
});

test.describe('Dashboard - Quick Actions', () => {
  test.beforeEach(async ({ page }) => {

    await mockDashboardApis(page);
    await page.goto('/dashboard');
  });

  test('shows "Azioni Rapide" section', async ({ page }) => {
    await expect(page.getByText('Azioni Rapide')).toBeVisible();
  });

  test('shows all 6 quick action buttons', async ({ page }) => {
    await expect(page.getByText('Nuovo OdL')).toBeVisible();
    await expect(page.getByText('Nuova Fattura')).toBeVisible();
    await expect(page.getByText('Nuovo Cliente')).toBeVisible();
    await expect(page.getByText('Nuova Prenotazione')).toBeVisible();
    await expect(page.getByText('Nuovo Preventivo')).toBeVisible();
    await expect(page.getByText('Nuova Ispezione')).toBeVisible();
  });

  test('quick actions link to correct pages', async ({ page }) => {
    const newWoLink = page.locator('a[href="/dashboard/work-orders/new"]');
    await expect(newWoLink).toBeVisible();
    const newInvoiceLink = page.locator('a[href="/dashboard/invoices/new"]');
    await expect(newInvoiceLink).toBeVisible();
  });
});

test.describe('Dashboard - Recent Work Orders', () => {
  test.beforeEach(async ({ page }) => {

    await mockDashboardApis(page);
    await page.goto('/dashboard');
  });

  test('shows "Ordini di Lavoro Recenti" heading', async ({ page }) => {
    await expect(page.getByText('Ordini di Lavoro Recenti')).toBeVisible();
  });

  test('shows "Vedi tutti" link', async ({ page }) => {
    await expect(page.getByRole('link', { name: /Vedi tutti/i }).or(
      page.getByRole('button', { name: /Vedi tutti/i })
    ).first()).toBeVisible();
  });

  test('shows work order data in table', async ({ page }) => {
    await expect(page.getByText('Marco Verdi')).toBeVisible();
    await expect(page.getByText('Laura Bianchi')).toBeVisible();
    await expect(page.getByText('AB123CD')).toBeVisible();
  });

  test('shows status badges', async ({ page }) => {
    await expect(page.getByText('In corso')).toBeVisible();
    await expect(page.getByText('Aperto')).toBeVisible();
  });
});

test.describe('Dashboard - Today Bookings', () => {
  test.beforeEach(async ({ page }) => {

    await mockDashboardApis(page);
    await page.goto('/dashboard');
  });

  test('shows "Prenotazioni di Oggi" heading', async ({ page }) => {
    await expect(page.getByText('Prenotazioni di Oggi')).toBeVisible();
  });

  test('shows booking data', async ({ page }) => {
    await expect(page.getByText('Giulia Neri')).toBeVisible();
    await expect(page.getByText(/IJ789KL/)).toBeVisible();
  });
});

test.describe('Dashboard - Loading State', () => {
  test('shows skeleton loaders while loading', async ({ page }) => {


    // Delay API responses to observe loading state
    await page.route('**/api/dashboard**', async (route) => {
      await new Promise((r) => setTimeout(r, 3000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_STATS),
      });
    });
    await page.route('**/api/work-orders**', async (route) => {
      await new Promise((r) => setTimeout(r, 3000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_WORK_ORDERS),
      });
    });
    await page.route('**/api/bookings**', async (route) => {
      await new Promise((r) => setTimeout(r, 3000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_BOOKINGS),
      });
    });

    await page.goto('/dashboard');

    // Skeleton pulse elements should be visible
    const skeletons = page.locator('.animate-pulse');
    await expect(skeletons.first()).toBeVisible();
  });
});

test.describe('Dashboard - Error State', () => {
  test('shows error state with retry on API failure', async ({ page }) => {


    await page.route('**/api/dashboard**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });
    // Still need to mock other routes so the page doesn't hang
    await page.route('**/api/work-orders**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_WORK_ORDERS) });
    });
    await page.route('**/api/bookings**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_BOOKINGS) });
    });

    await page.goto('/dashboard');

    // ErrorState component renders
    await expect(page.getByText(/Impossibile caricare la dashboard/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /Riprova/i })).toBeVisible();
  });
});

test.describe('Dashboard - Empty State', () => {
  test('shows empty state for work orders when none exist', async ({ page }) => {


    await page.route('**/api/dashboard**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_STATS),
      });
    });
    await page.route('**/api/work-orders**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], total: 0, page: 1, limit: 5 }),
      });
    });
    await page.route('**/api/bookings**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], total: 0, page: 1, limit: 5 }),
      });
    });

    await page.goto('/dashboard');

    await expect(page.getByText(/Nessun ordine di lavoro recente/i)).toBeVisible();
    await expect(page.getByText(/Nessuna prenotazione per oggi/i)).toBeVisible();
  });
});
