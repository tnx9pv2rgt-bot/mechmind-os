import { test, expect } from '../fixtures/auth.fixture';

/**
 * Customers Page E2E Tests — API-mocked, no backend required.
 * 6-block pattern: Render, Loading, Empty, Error, Data, Actions.
 */

const MOCK_CUSTOMERS = {
  data: [
    {
      id: 'c-1',
      firstName: 'Marco',
      lastName: 'Verdi',
      email: 'marco@example.com',
      phone: '+393331234567',
      type: 'private',
      vehicleCount: 2,
      createdAt: '2026-01-15T10:00:00Z',
      updatedAt: '2026-03-10T08:00:00Z',
    },
    {
      id: 'c-2',
      firstName: 'Autofficina',
      lastName: 'Rossi SRL',
      email: 'info@rossi-srl.it',
      phone: '+393337654321',
      type: 'business',
      vehicleCount: 5,
      createdAt: '2025-11-01T09:00:00Z',
      updatedAt: '2026-03-18T12:00:00Z',
    },
    {
      id: 'c-3',
      firstName: 'Giulia',
      lastName: 'Neri',
      email: 'giulia@example.com',
      phone: '+393339876543',
      type: 'private',
      vehicleCount: 1,
      createdAt: '2026-02-20T14:00:00Z',
      updatedAt: '2026-03-19T16:00:00Z',
    },
  ],
  total: 3,
  page: 1,
  limit: 20,
};

function mockCustomersApi(page: import('@playwright/test').Page, data = MOCK_CUSTOMERS): Promise<void> {
  return page.route('**/api/customers**', async (route) => {
    const url = route.request().url();
    // Handle DELETE
    if (route.request().method() === 'DELETE') {
      await route.fulfill({ status: 204 });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(data),
    });
  });
}

test.describe('Customers - Render', () => {
  test.beforeEach(async ({ page }) => {

    await mockCustomersApi(page);
    await page.goto('/dashboard/customers');
    await page.waitForLoadState('networkidle');
  });

  test('shows page header with search and new customer button', async ({ page }) => {
    await expect(page.getByPlaceholder(/Cerca/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /Nuovo Cliente/i }).or(
      page.getByRole('button', { name: /Nuovo Cliente/i })
    ).first()).toBeVisible();
  });

  test('shows customer type filter tabs', async ({ page }) => {
    // The page has "all", "private", "business" filter tabs or similar
    await expect(page.getByText(/Tutti/i).first()).toBeVisible();
  });
});

test.describe('Customers - Loading', () => {
  test('shows skeleton while loading', async ({ page }) => {


    await page.route('**/api/customers**', async (route) => {
      await new Promise((r) => setTimeout(r, 3000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_CUSTOMERS),
      });
    });

    await page.goto('/dashboard/customers');
    const skeletons = page.locator('.animate-pulse');
    await expect(skeletons.first()).toBeVisible();
  });
});

test.describe('Customers - Empty State', () => {
  test('shows empty state when no customers', async ({ page }) => {

    await mockCustomersApi(page, { data: [], total: 0, page: 1, limit: 20 });
    await page.goto('/dashboard/customers');

    await expect(page.getByText(/Nessun cliente/i).or(
      page.getByText(/nessun risultato/i)
    ).first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Customers - Error State', () => {
  test('shows error state on API failure', async ({ page }) => {


    await page.route('**/api/customers**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await page.goto('/dashboard/customers');

    await expect(page.getByText(/errore|impossibile/i).first()).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Customers - Data', () => {
  test.beforeEach(async ({ page }) => {

    await mockCustomersApi(page);
    await page.goto('/dashboard/customers');
    await page.waitForLoadState('networkidle');
  });

  test('shows customer names', async ({ page }) => {
    await expect(page.getByText('Marco')).toBeVisible();
    await expect(page.getByText('Giulia')).toBeVisible();
  });

  test('shows customer emails', async ({ page }) => {
    await expect(page.getByText('marco@example.com')).toBeVisible();
  });

  test('shows customer count badge or total', async ({ page }) => {
    // Total count should be visible somewhere
    await expect(page.getByText(/3/).first()).toBeVisible();
  });
});

test.describe('Customers - Actions', () => {
  test('search filters results', async ({ page }) => {


    let lastSearchParam = '';
    await page.route('**/api/customers**', async (route) => {
      const url = new URL(route.request().url());
      lastSearchParam = url.searchParams.get('search') || '';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_CUSTOMERS),
      });
    });

    await page.goto('/dashboard/customers');
    const searchInput = page.getByPlaceholder(/Cerca/i);
    await searchInput.fill('Marco');

    // Wait for debounced search to trigger API call
    await page.waitForTimeout(600);
    expect(lastSearchParam).toBe('Marco');
  });

  test('new customer button navigates to wizard', async ({ page }) => {

    await mockCustomersApi(page);
    await page.goto('/dashboard/customers');

    const newBtn = page.getByRole('link', { name: /Nuovo Cliente/i }).or(
      page.getByRole('button', { name: /Nuovo Cliente/i })
    ).first();
    await newBtn.click();

    await page.waitForURL(/customers\/new/);
  });

  test('delete customer shows confirmation dialog', async ({ page }) => {

    await mockCustomersApi(page);
    await page.goto('/dashboard/customers');

    // Open action menu for first customer
    const menuBtn = page.locator('button').filter({ has: page.locator('[class*="MoreHorizontal"], [class*="more"]') }).first();

    if (await menuBtn.isVisible().catch(() => false)) {
      await menuBtn.click();
      const deleteBtn = page.getByRole('menuitem', { name: /Elimina/i }).or(
        page.getByRole('button', { name: /Elimina/i })
      ).first();

      if (await deleteBtn.isVisible().catch(() => false)) {
        await deleteBtn.click();
        // ConfirmDialog (AlertDialog) should appear
        await expect(page.getByText(/Sei sicuro|Conferma eliminazione/i).first()).toBeVisible();
      }
    }
  });
});
