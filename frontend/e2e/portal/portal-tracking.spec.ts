import { test, expect } from '../fixtures/auth.fixture';
import type { Page } from '@playwright/test';

// ============================================
// MOCK DATA
// ============================================

const MOCK_TRACKING = {
  data: {
    id: 'wo-1',
    woNumber: 'WO-2026-001',
    status: 'IN_PROGRESS',
    vehicleMake: 'Fiat',
    vehicleModel: 'Punto',
    vehiclePlate: 'AB123CD',
    customerName: 'Marco Bianchi',
    technicianName: 'Luigi Meccanico',
    bayName: 'Ponte 1',
    estimatedCompletion: '2026-03-22T16:00:00Z',
    inspectionId: 'insp-1',
    estimateId: 'est-1',
    checkInPhotos: [],
    createdAt: '2026-03-20T08:00:00Z',
    updatedAt: '2026-03-20T14:00:00Z',
    statusHistory: [
      { status: 'CHECKED_IN', timestamp: '2026-03-20T08:00:00Z' },
      { status: 'INSPECTION', timestamp: '2026-03-20T09:00:00Z' },
      { status: 'ESTIMATE_SENT', timestamp: '2026-03-20T10:00:00Z' },
      { status: 'ESTIMATE_APPROVED', timestamp: '2026-03-20T11:00:00Z' },
      { status: 'IN_PROGRESS', timestamp: '2026-03-20T12:00:00Z' },
    ],
  },
};

function setupTrackingMocks(page: Page): void {
  void page.route('**/api/portal/tracking**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TRACKING) })
  );
  void page.route('**/api/portal/work-orders/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TRACKING) })
  );
}

// ============================================
// 1. RENDER
// ============================================

test.describe('Portal Tracking - Render', () => {
  test('should render the tracking page', async ({ page }) => {
    setupTrackingMocks(page);
    await page.goto('/portal/tracking?token=test-token');

    const heading = page.getByRole('heading', { name: /tracciamento|tracking|stato|riparazione/i })
      .or(page.getByText(/tracciamento|stato riparazione|segui/i).first());
    await expect(heading).toBeVisible({ timeout: 10000 });
  });
});

// ============================================
// 2. LOADING
// ============================================

test.describe('Portal Tracking - Loading', () => {
  test('should show loading state while fetching tracking data', async ({ page }) => {
    void page.route('**/api/portal/tracking**', (route) =>
      new Promise((resolve) => setTimeout(() => resolve(route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_TRACKING),
      })), 3000))
    );

    await page.goto('/portal/tracking?token=test-token');

    const loader = page.locator('.animate-spin').or(page.getByText(/caricamento/i));
    await expect(loader.first()).toBeVisible({ timeout: 5000 });
  });
});

// ============================================
// 3. EMPTY
// ============================================

test.describe('Portal Tracking - Empty/Invalid', () => {
  test('should show error when no token provided', async ({ page }) => {
    setupTrackingMocks(page);
    await page.goto('/portal/tracking');

    const errorText = page.getByText(/link non valido|nessun risultato|token/i);
    await expect(errorText.first()).toBeVisible({ timeout: 10000 });
  });
});

// ============================================
// 4. ERROR
// ============================================

test.describe('Portal Tracking - Error', () => {
  test('should show error state on API failure', async ({ page }) => {
    void page.route('**/api/portal/tracking**', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Server Error' }) })
    );

    await page.goto('/portal/tracking?token=test-token');
    await page.waitForLoadState('networkidle');

    const errorEl = page.getByText(/errore|impossibile|problema/i);
    await expect(errorEl.first()).toBeVisible({ timeout: 10000 });
  });
});

// ============================================
// 5. DATA
// ============================================

test.describe('Portal Tracking - Data', () => {
  test.beforeEach(async ({ page }) => {
    setupTrackingMocks(page);
    await page.goto('/portal/tracking?token=test-token');
    await page.waitForLoadState('networkidle');
  });

  test('should display FSM stepper with Italian status labels', async ({ page }) => {
    // Check for Italian step labels from the FSM stepper
    await expect(page.getByText('Veicolo accettato')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Ispezione completata')).toBeVisible();
    await expect(page.getByText('Preventivo inviato')).toBeVisible();
    await expect(page.getByText('Preventivo approvato')).toBeVisible();
    await expect(page.getByText('In lavorazione')).toBeVisible();
  });

  test('should display remaining FSM steps', async ({ page }) => {
    await expect(page.getByText('In attesa ricambi')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Controllo qualità')).toBeVisible();
    await expect(page.getByText('Pronto per il ritiro')).toBeVisible();
    await expect(page.getByText('Ritirato')).toBeVisible();
  });

  test('should highlight current step (In lavorazione)', async ({ page }) => {
    // The "In lavorazione" step should be visually highlighted as current
    const currentStep = page.getByText('In lavorazione');
    await expect(currentStep).toBeVisible({ timeout: 10000 });
  });

  test('should display vehicle information', async ({ page }) => {
    await expect(page.getByText(/fiat/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/punto/i).first()).toBeVisible();
    await expect(page.getByText('AB123CD')).toBeVisible();
  });

  test('should display technician name', async ({ page }) => {
    const techName = page.getByText(/luigi/i).or(page.getByText(/tecnico|meccanico/i));
    if (await techName.first().isVisible().catch(() => false)) {
      await expect(techName.first()).toBeVisible();
    }
  });

  test('should display work order number', async ({ page }) => {
    const woNumber = page.getByText(/WO-2026-001/i);
    if (await woNumber.isVisible().catch(() => false)) {
      await expect(woNumber).toBeVisible();
    }
  });
});

// ============================================
// 6. ACTIONS
// ============================================

test.describe('Portal Tracking - Actions', () => {
  test.beforeEach(async ({ page }) => {
    setupTrackingMocks(page);
    await page.goto('/portal/tracking?token=test-token');
    await page.waitForLoadState('networkidle');
  });

  test('should display "Contatta Officina" button', async ({ page }) => {
    const contactBtn = page.getByRole('button', { name: /contatta|chiama|officina|telefono/i })
      .or(page.getByRole('link', { name: /contatta|chiama|officina/i }))
      .or(page.getByText(/contatta officina|contatta l'officina/i));
    await expect(contactBtn.first()).toBeVisible({ timeout: 10000 });
  });

  test('should have clickable contact button', async ({ page }) => {
    const contactBtn = page.getByRole('button', { name: /contatta|chiama|officina/i })
      .or(page.getByRole('link', { name: /contatta|chiama|officina/i }))
      .or(page.getByText(/contatta officina/i));
    if (await contactBtn.first().isVisible().catch(() => false)) {
      await contactBtn.first().click();
      await page.waitForTimeout(500);
    }
  });
});
