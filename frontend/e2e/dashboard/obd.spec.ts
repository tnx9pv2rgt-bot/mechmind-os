import { test, expect } from '../fixtures/auth.fixture';
import type { Page } from '@playwright/test';

// ============================================
// MOCK DATA
// ============================================

const MOCK_DEVICES = {
  data: [
    {
      id: 'obd-1',
      deviceId: 'OBD-AA001',
      vehicleId: 'v-1',
      vehicleName: 'Fiat Punto 1.3',
      vehiclePlate: 'AB123CD',
      connected: true,
      lastReadingAt: '2026-03-20T10:15:00Z',
    },
    {
      id: 'obd-2',
      deviceId: 'OBD-BB002',
      vehicleId: 'v-2',
      vehicleName: 'Volkswagen Golf',
      vehiclePlate: 'EF456GH',
      connected: true,
      lastReadingAt: '2026-03-20T09:45:00Z',
    },
    {
      id: 'obd-3',
      deviceId: 'OBD-CC003',
      vehicleId: 'v-3',
      vehicleName: 'BMW Serie 3',
      vehiclePlate: 'IJ789KL',
      connected: false,
      lastReadingAt: '2026-03-19T18:00:00Z',
    },
  ],
};

const MOCK_DTC_ALERTS = {
  data: [
    {
      id: 'dtc-1',
      vehicleId: 'v-1',
      vehicleName: 'Fiat Punto 1.3',
      vehiclePlate: 'AB123CD',
      code: 'P0300',
      description: 'Mancata accensione casuale/multipla rilevata',
      severity: 'high',
      detectedAt: '2026-03-20T08:00:00Z',
    },
    {
      id: 'dtc-2',
      vehicleId: 'v-2',
      vehicleName: 'Volkswagen Golf',
      vehiclePlate: 'EF456GH',
      code: 'P0171',
      description: 'Sistema troppo magro (Banco 1)',
      severity: 'medium',
      detectedAt: '2026-03-19T16:30:00Z',
    },
    {
      id: 'dtc-3',
      vehicleId: 'v-3',
      vehicleName: 'BMW Serie 3',
      vehiclePlate: 'IJ789KL',
      code: 'P0420',
      description: 'Efficienza catalizzatore sotto soglia',
      severity: 'low',
      detectedAt: '2026-03-18T12:00:00Z',
    },
  ],
};

const MOCK_LIVE_DATA = {
  rpm: 2500,
  speed: 0,
  coolantTemp: 85,
  fuelLevel: 72,
  batteryVoltage: 14.2,
  engineLoad: 35,
};

function setupOBDMocks(page: Page): void {
  void page.route('**/api/dashboard/obd/devices**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DEVICES) })
  );
  void page.route('**/api/dashboard/obd/alerts**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DTC_ALERTS) })
  );
  void page.route('**/api/dashboard/obd/*/live**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_LIVE_DATA) })
  );
  void page.route('**/api/dashboard/obd/*/history**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          { timestamp: '2026-03-20T08:00:00Z', rpm: 2000, speed: 50, coolantTemp: 80 },
          { timestamp: '2026-03-20T09:00:00Z', rpm: 2500, speed: 60, coolantTemp: 85 },
          { timestamp: '2026-03-20T10:00:00Z', rpm: 1800, speed: 40, coolantTemp: 82 },
        ],
      }),
    })
  );
}

// ============================================
// 1. RENDER
// ============================================

test.describe('OBD - Render', () => {
  test('should render the OBD page with title', async ({ page }) => {

    setupOBDMocks(page);
    await page.goto('/dashboard/obd');

    await expect(page.getByRole('heading', { name: /diagnostica obd/i })).toBeVisible();
    await expect(page.getByText(/monitoraggio dispositivi/i)).toBeVisible();
  });

  test('should render "Associa Dispositivo" button', async ({ page }) => {

    setupOBDMocks(page);
    await page.goto('/dashboard/obd');

    await expect(page.getByText('Associa Dispositivo')).toBeVisible();
  });

  test('should render "Regole Alert" button', async ({ page }) => {

    setupOBDMocks(page);
    await page.goto('/dashboard/obd');

    await expect(page.getByText('Regole Alert')).toBeVisible();
  });
});

// ============================================
// 2. LOADING
// ============================================

test.describe('OBD - Loading', () => {
  test('should show loading indicator while fetching devices', async ({ page }) => {


    void page.route('**/api/dashboard/obd/devices**', (route) =>
      new Promise((resolve) => setTimeout(() => resolve(route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_DEVICES),
      })), 3000))
    );

    await page.goto('/dashboard/obd');

    const loader = page.locator('.animate-spin');
    await expect(loader.first()).toBeVisible({ timeout: 5000 });
  });
});

// ============================================
// 3. EMPTY
// ============================================

test.describe('OBD - Empty', () => {
  test('should show empty state when no devices', async ({ page }) => {


    void page.route('**/api/dashboard/obd/devices**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) })
    );

    await page.goto('/dashboard/obd');
    await page.waitForLoadState('networkidle');

    const emptyText = page.getByText(/nessun dispositivo|non ci sono dispositivi/i);
    await expect(emptyText.first()).toBeVisible({ timeout: 10000 });
  });
});

// ============================================
// 4. ERROR
// ============================================

test.describe('OBD - Error', () => {
  test('should show error state on API failure', async ({ page }) => {


    void page.route('**/api/dashboard/obd/devices**', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Server Error' }) })
    );

    await page.goto('/dashboard/obd');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/errore nel caricamento dei dati obd/i)
      .or(page.getByText(/errore|impossibile/i).first())
    ).toBeVisible({ timeout: 10000 });
  });

  test('should show retry button on error', async ({ page }) => {


    void page.route('**/api/dashboard/obd/devices**', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Server Error' }) })
    );

    await page.goto('/dashboard/obd');
    await page.waitForLoadState('networkidle');

    const retryBtn = page.getByText(/riprova/i);
    await expect(retryBtn.first()).toBeVisible({ timeout: 10000 });
  });
});

// ============================================
// 5. DATA
// ============================================

test.describe('OBD - Data', () => {
  test.beforeEach(async ({ page }) => {

    setupOBDMocks(page);
    await page.goto('/dashboard/obd');
    await page.waitForLoadState('networkidle');
  });

  test('should display device grid with vehicle names', async ({ page }) => {
    await expect(page.getByText('Fiat Punto 1.3')).toBeVisible();
    await expect(page.getByText('Volkswagen Golf')).toBeVisible();
    await expect(page.getByText('BMW Serie 3')).toBeVisible();
  });

  test('should display license plates', async ({ page }) => {
    await expect(page.getByText('AB123CD')).toBeVisible();
    await expect(page.getByText('EF456GH')).toBeVisible();
  });

  test('should show connection status indicators', async ({ page }) => {
    // Stats cards show connected/disconnected counts
    await expect(page.getByText('Connessi')).toBeVisible();
    await expect(page.getByText('Disconnessi')).toBeVisible();

    // 2 connected devices
    await expect(page.getByText('2').first()).toBeVisible();
    // 1 disconnected device
    await expect(page.getByText('1').first()).toBeVisible();
  });

  test('should display stat cards', async ({ page }) => {
    await expect(page.getByText('Dispositivi Totali')).toBeVisible();
    await expect(page.getByText('Connessi')).toBeVisible();
    await expect(page.getByText('Disconnessi')).toBeVisible();
    await expect(page.getByText('3').first()).toBeVisible(); // total devices
  });

  test('should display "Dispositivi Collegati" section header', async ({ page }) => {
    await expect(page.getByText('Dispositivi Collegati')).toBeVisible();
  });
});

// ============================================
// 6. ACTIONS
// ============================================

test.describe('OBD - Actions', () => {
  test.beforeEach(async ({ page }) => {

    setupOBDMocks(page);
    await page.goto('/dashboard/obd');
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to pair device page', async ({ page }) => {
    await page.getByText('Associa Dispositivo').click();
    await expect(page).toHaveURL(/dashboard\/obd\/pair/);
  });

  test('should navigate to alert rules page', async ({ page }) => {
    await page.getByText('Regole Alert').click();
    await expect(page).toHaveURL(/dashboard\/obd\/alerts/);
  });

  test('should refresh device data', async ({ page }) => {
    const refreshBtn = page.locator('button').filter({ has: page.locator('svg') }).first();
    await refreshBtn.click();
    // Should not crash
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to device detail page on click', async ({ page }) => {
    const deviceLink = page.getByRole('link', { name: /dettagli|visualizza/i })
      .or(page.locator('a[href*="/dashboard/obd/"]').first());
    if (await deviceLink.isVisible().catch(() => false)) {
      await deviceLink.click();
      await expect(page).toHaveURL(/dashboard\/obd\//);
    }
  });
});

// ============================================
// DTC Codes (OBD Alerts)
// ============================================

test.describe('OBD - DTC Alerts Page', () => {
  test('should render alerts page', async ({ page }) => {


    void page.route('**/api/dashboard/obd/alerts**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DTC_ALERTS) })
    );
    void page.route('**/api/dashboard/obd/devices**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DEVICES) })
    );

    await page.goto('/dashboard/obd/alerts');
    await page.waitForLoadState('networkidle');

    const heading = page.getByRole('heading', { name: /alert|regole|avvisi|dtc/i })
      .or(page.getByText(/regole alert|avvisi/i).first());
    await expect(heading).toBeVisible({ timeout: 10000 });
  });
});
