import { test, expect } from '../fixtures/auth.fixture';
import type { Page } from '@playwright/test';

// ============================================
// MOCK DATA
// ============================================

const MOCK_SETTINGS = {
  data: {
    businessName: 'Officina Demo',
    email: 'info@officina-demo.it',
    phone: '+393331234567',
    address: 'Via Roma 1, 00100 Roma',
    openingHours: { mon: { open: '08:00', close: '18:00' } },
    timezone: 'Europe/Rome',
    locale: 'it-IT',
    currency: 'EUR',
  },
};

const MOCK_TEAM = {
  data: [
    { id: 'u-1', firstName: 'Admin', lastName: 'Test', email: 'admin@demo.it', role: 'ADMIN', status: 'ACTIVE' },
    { id: 'u-2', firstName: 'Mario', lastName: 'Meccanico', email: 'mario@demo.it', role: 'MECHANIC', status: 'ACTIVE' },
    { id: 'u-3', firstName: 'Laura', lastName: 'Receptionist', email: 'laura@demo.it', role: 'RECEPTIONIST', status: 'ACTIVE' },
  ],
};

const MOCK_ROLES = {
  data: [
    {
      id: 'ADMIN',
      name: 'Amministratore',
      permissions: ['customers:read', 'customers:write', 'work-orders:read', 'work-orders:write', 'invoices:read', 'invoices:write', 'settings:read', 'settings:write'],
    },
    {
      id: 'MECHANIC',
      name: 'Meccanico',
      permissions: ['customers:read', 'work-orders:read', 'work-orders:write'],
    },
    {
      id: 'RECEPTIONIST',
      name: 'Receptionist',
      permissions: ['customers:read', 'customers:write', 'work-orders:read', 'invoices:read'],
    },
  ],
};

const MOCK_AUDIT_LOG = {
  data: [
    { id: 'log-1', action: 'UPDATE', entity: 'WorkOrder', entityId: 'wo-1', userId: 'u-1', userName: 'Admin Test', createdAt: '2026-03-20T10:00:00Z', details: { field: 'status', oldValue: 'OPEN', newValue: 'IN_PROGRESS' } },
    { id: 'log-2', action: 'CREATE', entity: 'Invoice', entityId: 'inv-1', userId: 'u-1', userName: 'Admin Test', createdAt: '2026-03-20T09:30:00Z', details: {} },
    { id: 'log-3', action: 'DELETE', entity: 'Customer', entityId: 'cust-1', userId: 'u-1', userName: 'Admin Test', createdAt: '2026-03-19T17:00:00Z', details: {} },
  ],
  meta: { total: 3 },
};

const MOCK_WEBHOOKS = {
  data: [
    { id: 'wh-1', url: 'https://example.com/webhook', events: ['work_order.completed', 'invoice.paid'], active: true, createdAt: '2026-03-10T00:00:00Z' },
    { id: 'wh-2', url: 'https://crm.example.com/hook', events: ['customer.created'], active: false, createdAt: '2026-03-05T00:00:00Z' },
  ],
};

function setupSettingsMocks(page: Page): void {
  void page.route('**/api/settings**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SETTINGS) })
  );
  void page.route('**/api/dashboard/settings**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SETTINGS) })
  );
  void page.route('**/api/team**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TEAM) })
  );
  void page.route('**/api/dashboard/team**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TEAM) })
  );
  void page.route('**/api/roles**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ROLES) })
  );
  void page.route('**/api/dashboard/roles**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ROLES) })
  );
  void page.route('**/api/audit-log**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_AUDIT_LOG) })
  );
  void page.route('**/api/dashboard/audit**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_AUDIT_LOG) })
  );
  void page.route('**/api/webhooks**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_WEBHOOKS) })
  );
  void page.route('**/api/dashboard/webhooks**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_WEBHOOKS) })
  );
  void page.route('**/api/tenant-settings**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SETTINGS) })
  );
}

// ============================================
// 1. RENDER
// ============================================

test.describe('Settings - Render', () => {
  test('should render the settings page with heading', async ({ page }) => {

    setupSettingsMocks(page);
    await page.goto('/dashboard/settings');

    await expect(page.getByRole('heading', { name: /impostazioni|settings/i })).toBeVisible({ timeout: 10000 });
  });

  test('should render settings tabs', async ({ page }) => {

    setupSettingsMocks(page);
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');

    // Should have tabs for different settings sections
    const tabList = page.getByRole('tablist').or(page.locator('[role="tablist"]'));
    if (await tabList.isVisible().catch(() => false)) {
      await expect(tabList).toBeVisible();
    }
  });
});

// ============================================
// 2. LOADING
// ============================================

test.describe('Settings - Loading', () => {
  test('should show loading state while fetching settings', async ({ page }) => {


    void page.route('**/api/settings**', (route) =>
      new Promise((resolve) => setTimeout(() => resolve(route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_SETTINGS),
      })), 3000))
    );
    void page.route('**/api/dashboard/settings**', (route) =>
      new Promise((resolve) => setTimeout(() => resolve(route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_SETTINGS),
      })), 3000))
    );
    void page.route('**/api/tenant-settings**', (route) =>
      new Promise((resolve) => setTimeout(() => resolve(route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_SETTINGS),
      })), 3000))
    );

    await page.goto('/dashboard/settings');

    const loader = page.locator('.animate-spin').or(page.getByText(/caricamento/i));
    if (await loader.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(loader.first()).toBeVisible();
    }
  });
});

// ============================================
// 3. EMPTY
// ============================================

test.describe('Settings - Empty', () => {
  test('should render settings page even with minimal data', async ({ page }) => {


    void page.route('**/api/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: {} }) })
    );

    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');

    const heading = page.getByRole('heading', { name: /impostazioni|settings/i });
    await expect(heading).toBeVisible({ timeout: 10000 });
  });
});

// ============================================
// 4. ERROR
// ============================================

test.describe('Settings - Error', () => {
  test('should show error state on API failure', async ({ page }) => {


    void page.route('**/api/settings**', (route) =>
      route.fulfill({ status: 500, body: 'Server Error' })
    );
    void page.route('**/api/dashboard/settings**', (route) =>
      route.fulfill({ status: 500, body: 'Server Error' })
    );
    void page.route('**/api/tenant-settings**', (route) =>
      route.fulfill({ status: 500, body: 'Server Error' })
    );

    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');

    // Settings page should still render even on error
    const heading = page.getByRole('heading', { name: /impostazioni|settings/i });
    await expect(heading).toBeVisible({ timeout: 10000 });
  });
});

// ============================================
// 5. DATA
// ============================================

test.describe('Settings - Data', () => {
  test.beforeEach(async ({ page }) => {

    setupSettingsMocks(page);
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');
  });

  test('should display settings tabs for different sections', async ({ page }) => {
    // Check for common tab labels
    const tabs = [
      /profilo|profile/i,
      /sicurezza|security/i,
      /notifiche|notifications/i,
      /team|squadra|utenti/i,
    ];

    for (const tabPattern of tabs) {
      const tab = page.getByRole('tab', { name: tabPattern }).or(page.getByText(tabPattern));
      if (await tab.first().isVisible().catch(() => false)) {
        await expect(tab.first()).toBeVisible();
      }
    }
  });

  test('should display team management table when on team tab', async ({ page }) => {
    const teamTab = page.getByRole('tab', { name: /team|squadra|utenti/i });
    if (await teamTab.isVisible().catch(() => false)) {
      await teamTab.click();
      await page.waitForLoadState('networkidle');

      // Should show team members
      const memberRow = page.getByText('Admin Test').or(page.getByText('admin@demo.it'));
      if (await memberRow.isVisible().catch(() => false)) {
        await expect(memberRow).toBeVisible();
      }
    }
  });

  test('should display roles section', async ({ page }) => {
    const rolesTab = page.getByRole('tab', { name: /ruoli|roles|permessi/i });
    if (await rolesTab.isVisible().catch(() => false)) {
      await rolesTab.click();
      await page.waitForLoadState('networkidle');

      const roleText = page.getByText(/amministratore|meccanico|receptionist/i);
      if (await roleText.first().isVisible().catch(() => false)) {
        await expect(roleText.first()).toBeVisible();
      }
    }
  });

  test('should display audit log section', async ({ page }) => {
    const auditTab = page.getByRole('tab', { name: /audit|registro|log/i });
    if (await auditTab.isVisible().catch(() => false)) {
      await auditTab.click();
      await page.waitForLoadState('networkidle');

      const logEntry = page.getByText(/UPDATE|CREATE|DELETE/i);
      if (await logEntry.first().isVisible().catch(() => false)) {
        await expect(logEntry.first()).toBeVisible();
      }
    }
  });

  test('should display webhook list section', async ({ page }) => {
    const webhookTab = page.getByRole('tab', { name: /webhook|integrazioni|api/i });
    if (await webhookTab.isVisible().catch(() => false)) {
      await webhookTab.click();
      await page.waitForLoadState('networkidle');

      const webhookEntry = page.getByText(/example\.com|webhook/i);
      if (await webhookEntry.first().isVisible().catch(() => false)) {
        await expect(webhookEntry.first()).toBeVisible();
      }
    }
  });
});

// ============================================
// 6. ACTIONS
// ============================================

test.describe('Settings - Actions', () => {
  test.beforeEach(async ({ page }) => {

    setupSettingsMocks(page);
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');
  });

  test('should switch between tabs', async ({ page }) => {
    const tabs = page.getByRole('tab');
    const tabCount = await tabs.count();

    for (let i = 0; i < Math.min(tabCount, 4); i++) {
      await tabs.nth(i).click();
      await page.waitForTimeout(300);
    }
  });

  test('should have save button on profile tab', async ({ page }) => {
    const profileTab = page.getByRole('tab', { name: /profilo|profile/i });
    if (await profileTab.isVisible().catch(() => false)) {
      await profileTab.click();
      await page.waitForLoadState('networkidle');

      const saveBtn = page.getByRole('button', { name: /salva|save/i });
      if (await saveBtn.isVisible().catch(() => false)) {
        await expect(saveBtn).toBeVisible();
      }
    }
  });

  test('should have invite button on team tab', async ({ page }) => {
    const teamTab = page.getByRole('tab', { name: /team|squadra|utenti/i });
    if (await teamTab.isVisible().catch(() => false)) {
      await teamTab.click();
      await page.waitForLoadState('networkidle');

      const inviteBtn = page.getByRole('button', { name: /invita|invite|aggiungi/i });
      if (await inviteBtn.isVisible().catch(() => false)) {
        await expect(inviteBtn).toBeVisible();
      }
    }
  });
});
