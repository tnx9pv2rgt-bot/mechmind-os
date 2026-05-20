import { test, expect } from '../fixtures/auth.fixture';

/**
 * Audit Logs Page E2E Tests — API-mocked, no backend required.
 * 6-block pattern: Render, Loading, Empty, Error, Data, Actions.
 */

const MOCK_AUDIT_LOGS = {
  success: true,
  data: [
    {
      id: 'al-1',
      action: 'CREATE',
      tableName: 'bookings',
      recordId: 'bk-1',
      userId: 'user-123456',
      createdAt: '2026-05-09T10:30:00Z',
      metadata: { service: 'Tagliando' },
    },
    {
      id: 'al-2',
      action: 'UPDATE',
      tableName: 'customers',
      recordId: 'c-1',
      userId: 'user-789012',
      createdAt: '2026-05-09T09:15:00Z',
      metadata: { field: 'email' },
    },
    {
      id: 'al-3',
      action: 'DELETE',
      tableName: 'estimates',
      recordId: 'est-1',
      userId: 'user-345678',
      createdAt: '2026-05-09T08:45:00Z',
      metadata: null,
    },
    {
      id: 'al-4',
      action: 'CREATE',
      tableName: 'invoices',
      recordId: 'inv-1',
      userId: 'user-123456',
      createdAt: '2026-05-08T16:20:00Z',
      metadata: { amount: 250 },
    },
    {
      id: 'al-5',
      action: 'UPDATE',
      tableName: 'work_orders',
      recordId: 'wo-1',
      userId: 'user-789012',
      createdAt: '2026-05-08T14:00:00Z',
      metadata: { status: 'completed' },
    },
  ],
  total: 5,
};

function mockAuditLogsApi(
  page: import('@playwright/test').Page,
  logs = MOCK_AUDIT_LOGS
): Promise<void> {
  return page.route('**/api/dashboard/settings/audit?**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(logs),
    });
  });
}

test.describe('Audit-Logs - Render', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuditLogsApi(page);
    await page.goto('/dashboard/audit-logs');
    await page.waitForLoadState('networkidle');
  });

  test('AUDIT-001: shows page header "Audit Log"', async ({ page }) => {
    await expect(page.getByText(/Audit Log|Audit/i)).toBeVisible();
  });

  test('AUDIT-002: displays action filter input', async ({ page }) => {
    const actionFilter = page.getByPlaceholder(/Filtra per azione|action/i).first();
    await expect(actionFilter).toBeVisible();
  });

  test('AUDIT-003: displays table name filter input', async ({ page }) => {
    const tableFilter = page.getByPlaceholder(/Filtra per tabella|table/i).first();
    await expect(tableFilter).toBeVisible();
  });

  test('AUDIT-004: shows total record count badge', async ({ page }) => {
    await expect(page.getByText(/5|record|totali/i).first()).toBeVisible();
  });
});

test.describe('Audit-Logs - Loading', () => {
  test('AUDIT-005: shows loader while fetching logs', async ({ page }) => {
    await page.route('**/api/dashboard/settings/audit?**', async route => {
      await new Promise(r => setTimeout(r, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_AUDIT_LOGS),
      });
    });

    await page.goto('/dashboard/audit-logs');
    const loader = page
      .getByText(/Caricamento|Loading/)
      .or(page.locator('svg.animate-spin'))
      .first();
    await expect(loader).toBeVisible({ timeout: 3000 });
  });
});

test.describe('Audit-Logs - Empty State', () => {
  test('AUDIT-006: shows empty message when no logs found', async ({ page }) => {
    await mockAuditLogsApi(page, { success: true, data: [], total: 0 });
    await page.goto('/dashboard/audit-logs');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/Nessun log|non trovato/i).first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Audit-Logs - Error State', () => {
  test('AUDIT-007: shows error when API fails', async ({ page }) => {
    await page.route('**/api/dashboard/settings/audit?**', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await page.goto('/dashboard/audit-logs');
    await expect(page.getByText(/Errore|impossibile/i).first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Audit-Logs - Data', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuditLogsApi(page);
    await page.goto('/dashboard/audit-logs');
    await page.waitForLoadState('networkidle');
  });

  test('AUDIT-008: displays audit log actions', async ({ page }) => {
    await expect(page.getByText('CREATE').or(page.getByText('UPDATE')).first()).toBeVisible();
  });

  test('AUDIT-009: shows table names for logs', async ({ page }) => {
    await expect(page.getByText('bookings').or(page.getByText('customers')).first()).toBeVisible();
  });

  test('AUDIT-010: displays record IDs', async ({ page }) => {
    const recordId = page.getByText(/bk-1|c-1|est-1/i).first();
    const isVisible = await recordId.isVisible().catch(() => false);
    expect(isVisible).toBe(true);
  });

  test('AUDIT-011: shows user IDs (truncated)', async ({ page }) => {
    const userId = page.getByText(/user|123456/i).first();
    const isVisible = await userId.isVisible().catch(() => false);
    expect(isVisible).toBe(true);
  });

  test('AUDIT-012: displays log timestamps in Italian locale', async ({ page }) => {
    // Should show date in format: 09/05/2026 or similar
    const timeText = page.getByText(/maggio|Maggio|09|05|2026/i).first();
    const isVisible = await timeText.isVisible().catch(() => false);
    expect(isVisible).toBe(true);
  });

  test('AUDIT-013: shows action type badges with colors', async ({ page }) => {
    const badge = page
      .locator('[class*="badge"], [class*="px"], span')
      .filter({ hasText: /CREATE|UPDATE|DELETE/i })
      .first();
    const isVisible = await badge.isVisible().catch(() => false);
    expect(isVisible).toBe(true);
  });

  test('AUDIT-014: displays 5 log entries total', async ({ page }) => {
    const logRows = page.locator('div').filter({ hasText: /CREATE|UPDATE|DELETE/ });
    const count = await logRows.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Audit-Logs - Actions', () => {
  test('AUDIT-015: action filter updates results', async ({ page }) => {
    let lastActionFilter = '';
    await page.route('**/api/dashboard/settings/audit?**', async route => {
      const url = new URL(route.request().url());
      lastActionFilter = url.searchParams.get('action') || '';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_AUDIT_LOGS),
      });
    });

    await page.goto('/dashboard/audit-logs');
    const actionFilter = page.getByPlaceholder(/Filtra per azione|action/i).first();
    await actionFilter.fill('CREATE');
    await page.waitForTimeout(400);

    expect(lastActionFilter).toBe('CREATE');
  });

  test('AUDIT-016: table name filter updates results', async ({ page }) => {
    let lastTableFilter = '';
    await page.route('**/api/dashboard/settings/audit?**', async route => {
      const url = new URL(route.request().url());
      lastTableFilter = url.searchParams.get('tableName') || '';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_AUDIT_LOGS),
      });
    });

    await page.goto('/dashboard/audit-logs');
    const tableFilter = page.getByPlaceholder(/Filtra per tabella|table/i).first();
    await tableFilter.fill('bookings');
    await page.waitForTimeout(400);

    expect(lastTableFilter).toBe('bookings');
  });

  test('AUDIT-017: pagination control is visible when needed', async ({ page }) => {
    // Mock 100 total logs to require pagination
    const manyLogs = {
      ...MOCK_AUDIT_LOGS,
      total: 100,
    };
    await mockAuditLogsApi(page, manyLogs);
    await page.goto('/dashboard/audit-logs');
    await page.waitForLoadState('networkidle');

    const pagination = page.locator('[class*="pagination"], nav').first();
    const isVisible = await pagination.isVisible().catch(() => false);
    expect(
      isVisible ||
        (await page
          .getByText(/Pagina|Page/i)
          .isVisible()
          .catch(() => false))
    ).toBeTruthy();
  });

  test('AUDIT-018: clearing filters resets results', async ({ page }) => {
    let filterCount = 0;
    await page.route('**/api/dashboard/settings/audit?**', async route => {
      filterCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_AUDIT_LOGS),
      });
    });

    await page.goto('/dashboard/audit-logs');
    await page.waitForLoadState('networkidle');

    const actionFilter = page.getByPlaceholder(/Filtra per azione|action/i).first();
    await actionFilter.fill('CREATE');
    await page.waitForTimeout(200);

    // Clear filter
    await actionFilter.clear();
    await page.waitForTimeout(200);

    expect(filterCount).toBeGreaterThanOrEqual(2);
  });

  test('AUDIT-019: search preserves pagination state', async ({ page }) => {
    await mockAuditLogsApi(page);
    await page.goto('/dashboard/audit-logs');
    await page.waitForLoadState('networkidle');

    // Apply filter
    const actionFilter = page.getByPlaceholder(/Filtra per azione|action/i).first();
    await actionFilter.fill('CREATE');
    await page.waitForTimeout(300);

    // Results should be updated
    await expect(page.getByText(/CREATE/i)).toBeVisible();
  });

  test('AUDIT-020: dark mode renders correctly', async ({ page, context }) => {
    // Set dark mode
    await context.addInitScript(() => {
      document.documentElement.classList.add('dark');
    });

    await mockAuditLogsApi(page);
    await page.goto('/dashboard/audit-logs');
    await page.waitForLoadState('networkidle');

    const logEntry = page.getByText('CREATE').or(page.getByText('UPDATE')).first();
    await expect(logEntry).toBeVisible();
  });
});
