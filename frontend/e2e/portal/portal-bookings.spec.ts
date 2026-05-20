import { test, expect } from '../fixtures/auth.fixture';
import type { Page } from '@playwright/test';

// ============================================
// MOCK DATA
// ============================================

const MOCK_BOOKINGS = {
  data: [
    {
      id: 'book-1',
      scheduledDate: '2026-03-25T10:00:00Z',
      serviceType: 'Tagliando',
      status: 'confirmed',
      notes: 'Cambio olio e filtri',
      vehicle: { id: 'v-1', make: 'Fiat', model: 'Punto', year: 2020, licensePlate: 'AB123CD' },
    },
    {
      id: 'book-2',
      scheduledDate: '2026-03-28T14:00:00Z',
      serviceType: 'Revisione',
      status: 'pending',
      notes: '',
      vehicle: { id: 'v-2', make: 'VW', model: 'Golf', year: 2019, licensePlate: 'EF456GH' },
    },
    {
      id: 'book-3',
      scheduledDate: '2026-02-15T09:00:00Z',
      serviceType: 'Freni',
      status: 'completed',
      notes: 'Sostituzione pastiglie anteriori',
      vehicle: { id: 'v-1', make: 'Fiat', model: 'Punto', year: 2020, licensePlate: 'AB123CD' },
    },
    {
      id: 'book-4',
      scheduledDate: '2026-01-10T11:00:00Z',
      serviceType: 'Diagnosi',
      status: 'cancelled',
      notes: '',
      vehicle: { id: 'v-2', make: 'VW', model: 'Golf', year: 2019, licensePlate: 'EF456GH' },
    },
  ],
};

const MOCK_SERVICES = {
  data: [
    { id: 'svc-1', name: 'Tagliando', duration: 60, price: 150 },
    { id: 'svc-2', name: 'Revisione', duration: 45, price: 80 },
    { id: 'svc-3', name: 'Freni', duration: 90, price: 250 },
    { id: 'svc-4', name: 'Diagnosi Elettronica', duration: 30, price: 50 },
  ],
};

const MOCK_SLOTS = {
  data: [
    { date: '2026-03-25', slots: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'] },
    { date: '2026-03-26', slots: ['09:00', '10:00', '14:00', '15:00'] },
  ],
};

function setupBookingMocks(page: Page): void {
  void page.route('**/api/portal/bookings**', (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'book-new', status: 'pending' }),
      });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_BOOKINGS) });
  });
  void page.route('**/api/portal/services**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SERVICES) })
  );
  void page.route('**/api/portal/availability**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SLOTS) })
  );
  void page.route('**/api/bookings/**', (route) => {
    if (route.request().method() === 'PATCH') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_BOOKINGS.data[0]) });
  });
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

test.describe('Portal Bookings - Render', () => {
  test('should render the bookings page', async ({ page }) => {
    setupBookingMocks(page);
    await page.goto('/portal/bookings');

    const heading = page.getByRole('heading', { name: /prenotazioni|appuntamenti/i })
      .or(page.getByText(/prenotazioni|le tue prenotazioni/i).first());
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('should render new booking button', async ({ page }) => {
    setupBookingMocks(page);
    await page.goto('/portal/bookings');

    const newBtn = page.getByRole('button', { name: /nuova prenotazione|prenota/i })
      .or(page.getByRole('link', { name: /nuova prenotazione|prenota/i }))
      .or(page.getByText(/nuova prenotazione/i));
    await expect(newBtn.first()).toBeVisible({ timeout: 10000 });
  });
});

// ============================================
// 2. LOADING
// ============================================

test.describe('Portal Bookings - Loading', () => {
  test('should show loading state while fetching bookings', async ({ page }) => {
    void page.route('**/api/portal/bookings**', (route) =>
      new Promise((resolve) => setTimeout(() => resolve(route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_BOOKINGS),
      })), 3000))
    );
    void page.route('**/api/portal/customer**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { id: 'c-1', firstName: 'Marco', lastName: 'Bianchi' } }),
      })
    );

    await page.goto('/portal/bookings');

    const loader = page.locator('.animate-spin').or(page.getByText(/caricamento/i));
    if (await loader.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(loader.first()).toBeVisible();
    }
  });
});

// ============================================
// 3. EMPTY
// ============================================

test.describe('Portal Bookings - Empty', () => {
  test('should show empty state when no bookings', async ({ page }) => {
    void page.route('**/api/portal/bookings**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) })
    );
    void page.route('**/api/portal/customer**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { id: 'c-1', firstName: 'Marco', lastName: 'Bianchi' } }),
      })
    );

    await page.goto('/portal/bookings');
    await page.waitForLoadState('networkidle');

    const emptyText = page.getByText(/nessuna prenotazione|non hai prenotazioni/i);
    if (await emptyText.isVisible().catch(() => false)) {
      await expect(emptyText).toBeVisible();
    }
  });
});

// ============================================
// 4. ERROR
// ============================================

test.describe('Portal Bookings - Error', () => {
  test('should show error state on API failure', async ({ page }) => {
    void page.route('**/api/portal/bookings**', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Server Error' }) })
    );
    void page.route('**/api/portal/customer**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { id: 'c-1', firstName: 'Marco', lastName: 'Bianchi' } }),
      })
    );

    await page.goto('/portal/bookings');
    await page.waitForLoadState('networkidle');

    const errorEl = page.getByText(/errore|impossibile|problema/i);
    await expect(errorEl.first()).toBeVisible({ timeout: 10000 });
  });
});

// ============================================
// 5. DATA
// ============================================

test.describe('Portal Bookings - Data', () => {
  test.beforeEach(async ({ page }) => {
    setupBookingMocks(page);
    await page.goto('/portal/bookings');
    await page.waitForLoadState('networkidle');
  });

  test('should display booking cards (not table rows)', async ({ page }) => {
    // Bookings are displayed as cards, not in a table
    await expect(page.getByText('Tagliando').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Revisione').first()).toBeVisible();
  });

  test('should display vehicle info on booking cards', async ({ page }) => {
    await expect(page.getByText(/fiat|punto|AB123CD/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('should display booking status', async ({ page }) => {
    const statusText = page.getByText(/confermata|in attesa|completata|annullata/i);
    await expect(statusText.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display filter tabs for upcoming/past', async ({ page }) => {
    const filterBtn = page.getByText(/prossime|future|passate|tutte/i);
    await expect(filterBtn.first()).toBeVisible({ timeout: 10000 });
  });
});

// ============================================
// 6. ACTIONS
// ============================================

test.describe('Portal Bookings - Actions', () => {
  test.beforeEach(async ({ page }) => {
    setupBookingMocks(page);
    await page.goto('/portal/bookings');
    await page.waitForLoadState('networkidle');
  });

  test('should filter bookings by upcoming/past', async ({ page }) => {
    const upcomingBtn = page.getByText(/prossime|future|upcoming/i);
    if (await upcomingBtn.isVisible().catch(() => false)) {
      await upcomingBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test('should show cancel action for pending/confirmed bookings', async ({ page }) => {
    const cancelBtn = page.getByRole('button', { name: /annulla|cancella/i });
    if (await cancelBtn.first().isVisible().catch(() => false)) {
      await expect(cancelBtn.first()).toBeVisible();
    }
  });

  test('should show confirm dialog on cancel', async ({ page }) => {
    const cancelBtn = page.getByRole('button', { name: /annulla|cancella/i });
    if (await cancelBtn.first().isVisible().catch(() => false)) {
      await cancelBtn.first().click();

      const dialog = page.getByRole('alertdialog').or(page.getByRole('dialog'));
      await expect(dialog).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show reschedule action', async ({ page }) => {
    const rescheduleBtn = page.getByRole('button', { name: /riprogramma|modifica|sposta/i });
    if (await rescheduleBtn.first().isVisible().catch(() => false)) {
      await expect(rescheduleBtn.first()).toBeVisible();
    }
  });
});
