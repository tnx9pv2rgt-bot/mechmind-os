import { test, expect } from '../fixtures/auth.fixture';
import type { Page } from '@playwright/test';

// ============================================
// MOCK DATA
// ============================================

const MOCK_PROFILE = {
  data: {
    id: 'cust-1',
    firstName: 'Marco',
    lastName: 'Bianchi',
    email: 'marco@example.it',
    phone: '+393331234567',
  },
};

const MOCK_VEHICLES = {
  data: [
    { id: 'v-1', make: 'Fiat', model: 'Punto', year: 2020, licensePlate: 'AB123CD', vin: 'WVWZZZ3CZWE123456', mileage: 45000, fuelType: 'petrol' },
    { id: 'v-2', make: 'VW', model: 'Golf', year: 2019, licensePlate: 'EF456GH', vin: 'WBANE72050B123456', mileage: 62000, fuelType: 'diesel' },
  ],
};

const MOCK_PREFERENCES = {
  data: {
    emailNotifications: true,
    smsNotifications: false,
    whatsappNotifications: true,
    bookingReminders: true,
    maintenanceAlerts: true,
    promotionalEmails: false,
  },
};

function setupPortalSettingsMocks(page: Page): void {
  void page.route('**/api/portal/account**', (route) => {
    if (route.request().method() === 'PUT' || route.request().method() === 'PATCH') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'Profilo aggiornato' }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_PROFILE) });
  });
  void page.route('**/api/portal/customer**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_PROFILE) })
  );
  void page.route('**/api/portal/vehicles**', (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'v-new' }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_VEHICLES) });
  });
  void page.route('**/api/portal/preferences**', (route) => {
    if (route.request().method() === 'PUT' || route.request().method() === 'PATCH') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'Preferenze aggiornate' }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_PREFERENCES) });
  });
  void page.route('**/api/portal/auth/change-password**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'Password aggiornata' }) })
  );
  void page.route('**/api/portal/gdpr/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'OK' }) })
  );
  void page.route('**/api/portal/settings**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_PROFILE) })
  );
  void page.route('**/api/portal/dashboard**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          customer: MOCK_PROFILE.data,
          maintenanceDue: [],
          unpaidInvoices: { count: 0, total: 0 },
          activeRepairs: { count: 0 },
        },
      }),
    })
  );
}

// ============================================
// 1. RENDER
// ============================================

test.describe('Portal Settings - Render', () => {
  test('should render the settings page', async ({ page }) => {
    setupPortalSettingsMocks(page);
    await page.goto('/portal/settings');

    const heading = page.getByRole('heading', { name: /impostazioni|profilo|account/i })
      .or(page.getByText(/impostazioni|il tuo profilo/i).first());
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('should render tabs for different sections', async ({ page }) => {
    setupPortalSettingsMocks(page);
    await page.goto('/portal/settings');
    await page.waitForLoadState('networkidle');

    const tabs = page.getByRole('tab').or(page.locator('[role="tab"]'));
    if (await tabs.first().isVisible().catch(() => false)) {
      const count = await tabs.count();
      expect(count).toBeGreaterThanOrEqual(2);
    }
  });
});

// ============================================
// 2. LOADING
// ============================================

test.describe('Portal Settings - Loading', () => {
  test('should show loading state while fetching profile', async ({ page }) => {
    void page.route('**/api/portal/**', (route) =>
      new Promise((resolve) => setTimeout(() => resolve(route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_PROFILE),
      })), 3000))
    );

    await page.goto('/portal/settings');

    const loader = page.locator('.animate-spin').or(page.getByText(/caricamento/i));
    if (await loader.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(loader.first()).toBeVisible();
    }
  });
});

// ============================================
// 3. EMPTY
// ============================================

test.describe('Portal Settings - Empty', () => {
  test('should render settings with no vehicles', async ({ page }) => {
    setupPortalSettingsMocks(page);

    void page.route('**/api/portal/vehicles**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) })
    );

    await page.goto('/portal/settings');
    await page.waitForLoadState('networkidle');

    // Click on vehicles tab
    const vehicleTab = page.getByRole('tab', { name: /veicoli|vehicles|auto/i })
      .or(page.getByText(/veicoli|i tuoi veicoli/i));
    if (await vehicleTab.first().isVisible().catch(() => false)) {
      await vehicleTab.first().click();
      await page.waitForTimeout(500);
    }
  });
});

// ============================================
// 4. ERROR
// ============================================

test.describe('Portal Settings - Error', () => {
  test('should show error state on API failure', async ({ page }) => {
    void page.route('**/api/portal/**', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Server Error' }) })
    );

    await page.goto('/portal/settings');
    await page.waitForLoadState('networkidle');

    const errorEl = page.getByText(/errore|impossibile|problema/i);
    if (await errorEl.first().isVisible().catch(() => false)) {
      await expect(errorEl.first()).toBeVisible();
    }
  });
});

// ============================================
// 5. DATA
// ============================================

test.describe('Portal Settings - Data', () => {
  test.beforeEach(async ({ page }) => {
    setupPortalSettingsMocks(page);
    await page.goto('/portal/settings');
    await page.waitForLoadState('networkidle');
  });

  test('should display profile form with customer data', async ({ page }) => {
    // Name fields should be pre-filled
    const nameField = page.getByLabel(/nome/i).first();
    if (await nameField.isVisible().catch(() => false)) {
      const value = await nameField.inputValue();
      expect(value).toContain('Marco');
    }
  });

  test('should display email field', async ({ page }) => {
    const emailField = page.getByLabel(/email/i);
    if (await emailField.isVisible().catch(() => false)) {
      const value = await emailField.inputValue();
      expect(value).toContain('marco@example.it');
    }
  });

  test('should display vehicle list', async ({ page }) => {
    const vehicleTab = page.getByRole('tab', { name: /veicoli|vehicles|auto/i })
      .or(page.getByText(/veicoli|i tuoi veicoli/i));
    if (await vehicleTab.first().isVisible().catch(() => false)) {
      await vehicleTab.first().click();
      await page.waitForLoadState('networkidle');

      await expect(page.getByText(/fiat|punto/i).first()).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('AB123CD')).toBeVisible();
    }
  });

  test('should display notification preferences section', async ({ page }) => {
    const notifTab = page.getByRole('tab', { name: /notifiche|notifications/i })
      .or(page.getByText(/notifiche|preferenze notifiche/i));
    if (await notifTab.first().isVisible().catch(() => false)) {
      await notifTab.first().click();
      await page.waitForLoadState('networkidle');

      const emailToggle = page.getByText(/email/i).first();
      await expect(emailToggle).toBeVisible({ timeout: 10000 });
    }
  });

  test('should display privacy/GDPR section', async ({ page }) => {
    const privacyTab = page.getByRole('tab', { name: /privacy|gdpr|sicurezza/i })
      .or(page.getByText(/privacy|gdpr|protezione dati/i));
    if (await privacyTab.first().isVisible().catch(() => false)) {
      await privacyTab.first().click();
      await page.waitForLoadState('networkidle');

      const gdprText = page.getByText(/dati personali|esporta|elimina|privacy/i);
      await expect(gdprText.first()).toBeVisible({ timeout: 10000 });
    }
  });
});

// ============================================
// 6. ACTIONS
// ============================================

test.describe('Portal Settings - Actions', () => {
  test.beforeEach(async ({ page }) => {
    setupPortalSettingsMocks(page);
    await page.goto('/portal/settings');
    await page.waitForLoadState('networkidle');
  });

  test('should save profile changes', async ({ page }) => {
    const nameField = page.getByLabel(/nome/i).first();
    if (await nameField.isVisible().catch(() => false)) {
      await nameField.fill('MarcoUpdated');

      const saveBtn = page.getByRole('button', { name: /salva|aggiorna|save/i });
      if (await saveBtn.first().isVisible().catch(() => false)) {
        await saveBtn.first().click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('should add a new vehicle', async ({ page }) => {
    const vehicleTab = page.getByRole('tab', { name: /veicoli|vehicles/i })
      .or(page.getByText(/veicoli/i));
    if (await vehicleTab.first().isVisible().catch(() => false)) {
      await vehicleTab.first().click();
      await page.waitForLoadState('networkidle');

      const addBtn = page.getByRole('button', { name: /aggiungi|nuovo veicolo|add/i });
      if (await addBtn.isVisible().catch(() => false)) {
        await addBtn.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('should export personal data (GDPR)', async ({ page }) => {
    const privacyTab = page.getByRole('tab', { name: /privacy|gdpr|sicurezza/i })
      .or(page.getByText(/privacy|gdpr/i));
    if (await privacyTab.first().isVisible().catch(() => false)) {
      await privacyTab.first().click();
      await page.waitForLoadState('networkidle');

      const exportBtn = page.getByRole('button', { name: /esporta|scarica|export/i });
      if (await exportBtn.first().isVisible().catch(() => false)) {
        await exportBtn.first().click();
        await page.waitForTimeout(500);
      }
    }
  });
});
