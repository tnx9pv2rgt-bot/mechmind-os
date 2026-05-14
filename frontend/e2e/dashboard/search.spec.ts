import { test, expect } from '../fixtures/auth.fixture';

/**
 * Search Page E2E Tests — API-mocked, no backend required.
 * 6-block pattern: Render, Loading, Empty, Error, Data, Actions.
 */

const MOCK_SEARCH_RESULTS = {
  results: [
    {
      id: 'c-1',
      type: 'customer',
      title: 'Marco Verdi',
      subtitle: 'Cliente privato',
      url: '/dashboard/customers/c-1',
    },
    {
      id: 'v-1',
      type: 'vehicle',
      title: 'Fiat Punto AB123CD',
      subtitle: 'Veicolo di Marco Verdi',
      url: '/dashboard/vehicles/v-1',
    },
    {
      id: 'w-1',
      type: 'work-order',
      title: 'Ordine WO-001',
      subtitle: 'Riparazione freni',
      url: '/dashboard/work-orders/w-1',
    },
    {
      id: 'i-1',
      type: 'invoice',
      title: 'Fattura INV-2026-001',
      subtitle: '€ 250,00',
      url: '/dashboard/invoices/i-1',
    },
    {
      id: 'b-1',
      type: 'booking',
      title: 'Prenotazione 20/03/2026',
      subtitle: 'Tagliando',
      url: '/dashboard/bookings/b-1',
    },
  ],
  total: 5,
};

function mockSearchApi(
  page: import('@playwright/test').Page,
  results = MOCK_SEARCH_RESULTS
): Promise<void> {
  return page.route('**/api/dashboard/search?**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(results),
    });
  });
}

test.describe('Search - Render', () => {
  test.beforeEach(async ({ page }) => {
    await mockSearchApi(page);
    await page.goto('/dashboard/search');
    await page.waitForLoadState('networkidle');
  });

  test('SEARCH-001: shows search input with placeholder', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/Cerca clienti|veicoli|ordini/i);
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute('type', 'search');
  });

  test('SEARCH-002: shows page header with title', async ({ page }) => {
    await expect(page.getByText(/Ricerca/i)).toBeVisible();
    await expect(page.getByText(/Cerca in tutto il sistema/i)).toBeVisible();
  });

  test('SEARCH-003: search input is auto-focused', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/Cerca clienti|veicoli|ordini/i);
    await expect(searchInput).toBeFocused();
  });
});

test.describe('Search - Loading', () => {
  test('SEARCH-004: shows loader while typing and fetching', async ({ page }) => {
    await page.route('**/api/dashboard/search?**', async route => {
      await new Promise(r => setTimeout(r, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_SEARCH_RESULTS),
      });
    });

    await page.goto('/dashboard/search');
    const searchInput = page.getByPlaceholder(/Cerca clienti|veicoli|ordini/i);
    await searchInput.fill('Marco');

    const loader = page.locator('svg.animate-spin').first();
    await expect(loader).toBeVisible();
  });
});

test.describe('Search - Empty State', () => {
  test('SEARCH-005: shows empty message when no results', async ({ page }) => {
    await mockSearchApi(page, { results: [], total: 0 });
    await page.goto('/dashboard/search?q=zzzzzzzzzzz');

    // Wait for API to complete
    await page.waitForTimeout(500);

    await expect(page.getByText(/Nessun risultato|non trovato/i).first()).toBeVisible({
      timeout: 5000,
    });
  });
});

test.describe('Search - Error State', () => {
  test('SEARCH-006: shows error message on API failure', async ({ page }) => {
    await page.route('**/api/dashboard/search?**', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await page.goto('/dashboard/search');
    const searchInput = page.getByPlaceholder(/Cerca clienti|veicoli|ordini/i);
    await searchInput.fill('test');

    await expect(page.getByText(/Errore durante la ricerca|impossibile/i).first()).toBeVisible({
      timeout: 10000,
    });
  });
});

test.describe('Search - Data', () => {
  test.beforeEach(async ({ page }) => {
    await mockSearchApi(page);
    await page.goto('/dashboard/search');
    await page.waitForLoadState('networkidle');
  });

  test('SEARCH-007: displays customer results', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/Cerca clienti|veicoli|ordini/i);
    await searchInput.fill('Marco');
    await page.waitForTimeout(400);

    await expect(page.getByText('Marco Verdi')).toBeVisible();
    await expect(page.getByText('Cliente privato')).toBeVisible();
  });

  test('SEARCH-008: displays vehicle results', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/Cerca clienti|veicoli|ordini/i);
    await searchInput.fill('Fiat');
    await page.waitForTimeout(400);

    await expect(page.getByText(/Fiat Punto|AB123CD/i).first()).toBeVisible();
  });

  test('SEARCH-009: displays work order results', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/Cerca clienti|veicoli|ordini/i);
    await searchInput.fill('riparazione');
    await page.waitForTimeout(400);

    await expect(page.getByText('Ordine WO-001')).toBeVisible();
    await expect(page.getByText('Riparazione freni')).toBeVisible();
  });

  test('SEARCH-010: displays result type badges', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/Cerca clienti|veicoli|ordini/i);
    await searchInput.fill('Marco');
    await page.waitForTimeout(400);

    // Check for type badges (Clienti, Veicoli, Ordini, etc.)
    await expect(page.getByText(/Clienti|Veicoli|Ordini di Lavoro/i).first()).toBeVisible();
  });

  test('SEARCH-011: shows result count badges', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/Cerca clienti|veicoli|ordini/i);
    await searchInput.fill('M');
    await page.waitForTimeout(400);

    // Count badge should show number of results per type
    const badge = page
      .locator('span')
      .filter({ hasText: /^[0-9]+$/ })
      .first();
    await expect(badge).toBeVisible();
  });
});

test.describe('Search - Actions', () => {
  test('SEARCH-012: debounces search input (300ms)', async ({ page }) => {
    let requestCount = 0;
    await page.route('**/api/dashboard/search?**', async route => {
      requestCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_SEARCH_RESULTS),
      });
    });

    await page.goto('/dashboard/search');
    const searchInput = page.getByPlaceholder(/Cerca clienti|veicoli|ordini/i);

    // Type multiple characters quickly
    await searchInput.fill('M');
    await page.waitForTimeout(100);
    await searchInput.fill('Ma');
    await page.waitForTimeout(100);
    await searchInput.fill('Mar');

    // Wait for debounce to settle
    await page.waitForTimeout(400);

    // Should only make 1-2 requests, not 3
    expect(requestCount).toBeLessThanOrEqual(2);
  });

  test('SEARCH-013: clicking result navigates to detail', async ({ page }) => {
    await mockSearchApi(page);
    await page.goto('/dashboard/search');
    const searchInput = page.getByPlaceholder(/Cerca clienti|veicoli|ordini/i);
    await searchInput.fill('Marco');
    await page.waitForTimeout(400);

    const resultLink = page.getByText('Marco Verdi');
    await resultLink.click();

    await page.waitForURL(/customers\/c-1/);
  });

  test('SEARCH-014: keyboard navigation works', async ({ page }) => {
    await mockSearchApi(page);
    await page.goto('/dashboard/search');
    const searchInput = page.getByPlaceholder(/Cerca clienti|veicoli|ordini/i);

    await searchInput.fill('Marco');
    await page.waitForTimeout(400);

    // Tab to first result should be possible
    await searchInput.press('Tab');

    // Focus should move to a result
    const focusedElement = await page.evaluate(() => document.activeElement?.textContent);
    expect(focusedElement).toBeTruthy();
  });

  test('SEARCH-015: clearing search hides results', async ({ page }) => {
    await mockSearchApi(page);
    await page.goto('/dashboard/search');
    const searchInput = page.getByPlaceholder(/Cerca clienti|veicoli|ordini/i);

    await searchInput.fill('Marco');
    await page.waitForTimeout(400);
    await expect(page.getByText('Marco Verdi')).toBeVisible();

    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(200);

    // Results should be hidden
    const resultVisible = await page
      .getByText('Marco Verdi')
      .isVisible()
      .catch(() => false);
    expect(resultVisible).toBe(false);
  });
});
