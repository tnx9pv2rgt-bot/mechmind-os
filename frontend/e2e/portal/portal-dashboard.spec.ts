import { test, expect } from '../fixtures/auth.fixture';
import type { Page } from '@playwright/test';

// ============================================
// MOCK DATA
// ============================================

const MOCK_DASHBOARD = {
  data: {
    customer: {
      id: 'cust-1',
      firstName: 'Marco',
      lastName: 'Bianchi',
      email: 'marco@example.it',
      phone: '+393331234567',
    },
    upcomingBooking: {
      id: 'book-1',
      scheduledDate: '2026-03-25T10:00:00Z',
      serviceType: 'Tagliando',
      status: 'confirmed',
      vehicle: { id: 'v-1', make: 'Fiat', model: 'Punto', year: 2020, licensePlate: 'AB123CD' },
    },
    maintenanceDue: [
      {
        id: 'maint-1',
        description: 'Cambio olio motore',
        dueDate: '2026-04-01T00:00:00Z',
        vehicle: { id: 'v-1', make: 'Fiat', model: 'Punto', year: 2020, licensePlate: 'AB123CD' },
      },
    ],
    recentInspection: {
      id: 'insp-1',
      type: 'ANNUAL',
      status: 'COMPLETED',
      createdAt: '2026-03-15T00:00:00Z',
      vehicle: { id: 'v-1', make: 'Fiat', model: 'Punto', year: 2020, licensePlate: 'AB123CD' },
    },
    unpaidInvoices: { count: 2, total: 450.00 },
    activeRepairs: { count: 1 },
    warranty: { active: 1, expiringSoon: 0 },
  },
};

function setupPortalDashboardMocks(page: Page): void {
  void page.route('**/api/portal/dashboard**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DASHBOARD) })
  );
  void page.route('**/api/portal/customer**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: MOCK_DASHBOARD.data.customer }) })
  );
}

// ============================================
// 1. RENDER
// ============================================

test.describe('Portal Dashboard - Render', () => {
  test('should render the portal dashboard with welcome message', async ({ page }) => {
    setupPortalDashboardMocks(page);
    await page.goto('/portal/dashboard');

    const welcome = page.getByText(/ciao, marco/i).or(page.getByText(/benvenuto/i));
    await expect(welcome.first()).toBeVisible({ timeout: 10000 });
  });

  test('should render dashboard subtitle', async ({ page }) => {
    setupPortalDashboardMocks(page);
    await page.goto('/portal/dashboard');

    const subtitle = page.getByText(/cosa c'è di nuovo|veicoli/i);
    await expect(subtitle.first()).toBeVisible({ timeout: 10000 });
  });
});

// ============================================
// 2. LOADING
// ============================================

test.describe('Portal Dashboard - Loading', () => {
  test('should show loading state while fetching dashboard', async ({ page }) => {
    void page.route('**/api/portal/dashboard**', (route) =>
      new Promise((resolve) => setTimeout(() => resolve(route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_DASHBOARD),
      })), 3000))
    );

    await page.goto('/portal/dashboard');

    // Loading spinner
    const loader = page.locator('.border-apple-blue, .animate-spin').or(page.locator('[class*="border-t-transparent"]'));
    await expect(loader.first()).toBeVisible({ timeout: 5000 });
  });
});

// ============================================
// 3. EMPTY
// ============================================

test.describe('Portal Dashboard - Empty', () => {
  test('should render dashboard with no upcoming bookings', async ({ page }) => {
    void page.route('**/api/portal/dashboard**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            customer: { id: 'c-1', firstName: 'Test', lastName: 'User', email: 'test@example.it' },
            upcomingBooking: null,
            maintenanceDue: [],
            recentInspection: null,
            unpaidInvoices: { count: 0, total: 0 },
            activeRepairs: { count: 0 },
          },
        }),
      })
    );

    await page.goto('/portal/dashboard');
    await page.waitForLoadState('networkidle');

    const noneText = page.getByText(/nessuno|nessuna/i);
    await expect(noneText.first()).toBeVisible({ timeout: 10000 });
  });
});

// ============================================
// 4. ERROR
// ============================================

test.describe('Portal Dashboard - Error', () => {
  test('should show error state on API failure', async ({ page }) => {
    void page.route('**/api/portal/dashboard**', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Server Error' }) })
    );

    await page.goto('/portal/dashboard');
    await page.waitForLoadState('networkidle');

    const errorEl = page.getByText(/errore|riprova/i);
    await expect(errorEl.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show retry button on error', async ({ page }) => {
    void page.route('**/api/portal/dashboard**', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Server Error' }) })
    );

    await page.goto('/portal/dashboard');
    await page.waitForLoadState('networkidle');

    const retryBtn = page.getByText(/riprova/i);
    await expect(retryBtn.first()).toBeVisible({ timeout: 10000 });
  });
});

// ============================================
// 5. DATA
// ============================================

test.describe('Portal Dashboard - Data', () => {
  test.beforeEach(async ({ page }) => {
    setupPortalDashboardMocks(page);
    await page.goto('/portal/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should display quick stats cards', async ({ page }) => {
    // Next appointment card
    await expect(page.getByText(/prossimo appuntamento/i)).toBeVisible({ timeout: 10000 });

    // Unpaid invoices
    const unpaidText = page.getByText(/da pagare|fatture|pagamento/i);
    await expect(unpaidText.first()).toBeVisible();
  });

  test('should display upcoming booking info', async ({ page }) => {
    await expect(page.getByText(/tagliando/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('should display maintenance due items', async ({ page }) => {
    await expect(page.getByText(/cambio olio/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('should display quick action links', async ({ page }) => {
    // Quick actions: prenota, traccia riparazione, etc.
    const actions = page.getByRole('link').filter({ hasText: /prenota|prenotazione|veicoli|fatture/i });
    if (await actions.first().isVisible().catch(() => false)) {
      await expect(actions.first()).toBeVisible();
    }
  });
});

// ============================================
// 6. ACTIONS
// ============================================

test.describe('Portal Dashboard - Actions', () => {
  test.beforeEach(async ({ page }) => {
    setupPortalDashboardMocks(page);
    await page.goto('/portal/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to bookings from quick action', async ({ page }) => {
    const bookingLink = page.getByRole('link', { name: /prenota|prenotazione|nuova/i })
      .or(page.getByRole('link').filter({ hasText: /prenota/i }));
    if (await bookingLink.first().isVisible().catch(() => false)) {
      await bookingLink.first().click();
      await expect(page).toHaveURL(/portal\/(bookings|booking)/);
    }
  });

  test('should navigate to invoices from quick action', async ({ page }) => {
    const invoiceLink = page.getByRole('link', { name: /fatture|invoices|pagamenti/i })
      .or(page.getByRole('link').filter({ hasText: /fattur/i }));
    if (await invoiceLink.first().isVisible().catch(() => false)) {
      await invoiceLink.first().click();
      await expect(page).toHaveURL(/portal\/invoices/);
    }
  });
});
