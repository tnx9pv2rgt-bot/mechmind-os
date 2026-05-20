import { test, expect } from '../fixtures/auth.fixture';
import type { Page } from '@playwright/test';

const MOCK_PARTS = {
  data: [
    {
      id: 'part-001',
      name: 'Filtro Olio Mann W 712/95',
      brand: 'Mann Filter',
      partNumber: '06A115561B',
      currentStock: 15,
      minStockLevel: 5,
      retailPrice: 12.5,
      supplier: { name: 'Autodoc Italia' },
      supplierName: 'Autodoc Italia',
    },
    {
      id: 'part-002',
      name: 'Pastiglie Freno Brembo P85075',
      brand: 'Brembo',
      partNumber: 'P85075',
      currentStock: 2,
      minStockLevel: 5,
      retailPrice: 45.9,
      supplier: { name: 'Ricambi Express' },
      supplierName: 'Ricambi Express',
    },
    {
      id: 'part-003',
      name: 'Candela Accensione NGK BKR6E',
      brand: 'NGK',
      partNumber: 'BKR6E',
      currentStock: 0,
      minStockLevel: 3,
      retailPrice: 5.2,
      supplier: { name: 'Autodoc Italia' },
      supplierName: 'Autodoc Italia',
    },
  ],
  total: 3,
};

const MOCK_SUPPLIERS = [
  { id: 'sup-001', name: 'Autodoc Italia' },
  { id: 'sup-002', name: 'Ricambi Express' },
];

function mockPartsApi(page: Page, partsData = MOCK_PARTS, suppliers = MOCK_SUPPLIERS): Promise<void> {
  return Promise.all([
    page.route('**/api/parts*', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(partsData) });
      } else {
        route.continue();
      }
    }),
    page.route('**/api/suppliers*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(suppliers) }),
    ),
  ]).then(() => undefined);
}

test.describe('Ricambi - Render', () => {
  test('la pagina si carica con il titolo visibile e zero errori console', async ({ page }) => {

    await mockPartsApi(page);

    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/dashboard/parts');

    await expect(page.getByRole('heading', { name: 'Ricambi' })).toBeVisible();
    await expect(page.getByText('Gestione ricambi e fornitori')).toBeVisible();
    expect(errors).toHaveLength(0);
  });
});

test.describe('Ricambi - Loading', () => {
  test('mostra skeleton durante il caricamento', async ({ page }) => {


    await page.route('**/api/parts*', (route) =>
      setTimeout(() => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_PARTS) }), 3000),
    );
    await page.route('**/api/suppliers*', (route) =>
      setTimeout(() => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SUPPLIERS) }), 3000),
    );

    await page.goto('/dashboard/parts');

    // Skeleton elements should be visible (animate-pulse class)
    await expect(page.locator('.animate-pulse').first()).toBeVisible({ timeout: 2000 });
  });
});

test.describe('Ricambi - Empty State', () => {
  test('mostra messaggio vuoto quando non ci sono ricambi', async ({ page }) => {

    await mockPartsApi(page, { data: [], total: 0 });

    await page.goto('/dashboard/parts');

    await expect(page.getByText('Nessun ricambio trovato')).toBeVisible();
  });
});

test.describe('Ricambi - Error State', () => {
  test('mostra errore e bottone Riprova quando API restituisce 500', async ({ page }) => {


    await page.route('**/api/parts*', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Internal Server Error' }) }),
    );
    await page.route('**/api/suppliers*', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Internal Server Error' }) }),
    );

    await page.goto('/dashboard/parts');

    await expect(page.getByText('Impossibile caricare i ricambi')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Riprova' })).toBeVisible();
  });
});

test.describe('Ricambi - Data', () => {
  test('visualizza correttamente i ricambi con badge stock', async ({ page }) => {

    await mockPartsApi(page);

    await page.goto('/dashboard/parts');

    // Verify part names
    await expect(page.getByText('Filtro Olio Mann W 712/95')).toBeVisible();
    await expect(page.getByText('Pastiglie Freno Brembo P85075')).toBeVisible();
    await expect(page.getByText('Candela Accensione NGK BKR6E')).toBeVisible();

    // Verify stock badges
    await expect(page.getByText('Disponibile')).toBeVisible();
    await expect(page.getByText('Pochi rimasti')).toBeVisible();
    await expect(page.getByText('Esaurito')).toBeVisible();

    // Verify OEM numbers
    await expect(page.getByText('OEM: 06A115561B')).toBeVisible();
    await expect(page.getByText('OEM: P85075')).toBeVisible();
  });

  test('visualizza le statistiche', async ({ page }) => {

    await mockPartsApi(page);

    await page.goto('/dashboard/parts');

    await expect(page.getByText('Ricambi totali')).toBeVisible();
    await expect(page.getByText('Fornitori')).toBeVisible();
    await expect(page.getByText('Stock basso')).toBeVisible();
  });

  test('la ricerca funziona', async ({ page }) => {

    await mockPartsApi(page);

    await page.goto('/dashboard/parts');
    await expect(page.getByText('Filtro Olio Mann W 712/95')).toBeVisible();

    // Type in search — debounced, triggers API re-fetch
    await page.getByLabel('Cerca ricambi').fill('Brembo');

    // Since search is debounced and triggers refetch, mock new response
    await page.route('**/api/parts*', (route) => {
      const url = new URL(route.request().url());
      const search = url.searchParams.get('search');
      if (search && search.includes('Brembo')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [MOCK_PARTS.data[1]], total: 1 }),
        });
      } else {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_PARTS) });
      }
    });

    // Wait for debounce and refetch
    await page.waitForTimeout(500);
    await expect(page.getByText(/Risultati per "Brembo"/)).toBeVisible({ timeout: 5000 });
  });

  test('i chip fornitori sono visibili', async ({ page }) => {

    await mockPartsApi(page);

    await page.goto('/dashboard/parts');

    await expect(page.getByRole('button', { name: 'Tutti' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Autodoc Italia' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ricambi Express' })).toBeVisible();
  });
});

test.describe('Ricambi - Actions', () => {
  test('"Nuovo Ricambio" naviga alla pagina di creazione', async ({ page }) => {

    await mockPartsApi(page);

    await page.goto('/dashboard/parts');

    await page.getByRole('button', { name: 'Nuovo Ricambio' }).click();

    await expect(page).toHaveURL(/dashboard\/parts\/new/);
  });

  test('"Ordine Fornitore" naviga alla pagina ordini', async ({ page }) => {

    await mockPartsApi(page);

    await page.goto('/dashboard/parts');

    await page.getByRole('button', { name: 'Ordine Fornitore' }).click();

    await expect(page).toHaveURL(/dashboard\/parts\/orders\/new/);
  });

  test('click su un ricambio naviga al dettaglio', async ({ page }) => {

    await mockPartsApi(page);

    await page.goto('/dashboard/parts');

    await page.getByText('Filtro Olio Mann W 712/95').click();

    await expect(page).toHaveURL(/dashboard\/parts\/part-001/);
  });

  test('bottone Nuovo fornitore apre il dialog', async ({ page }) => {

    await mockPartsApi(page);

    await page.goto('/dashboard/parts');

    await page.getByRole('button', { name: 'Nuovo' }).click();

    await expect(page.getByText('Nuovo Fornitore')).toBeVisible();
    await expect(page.getByText('Nome fornitore *')).toBeVisible();
  });

  test('form fornitore valida i campi obbligatori', async ({ page }) => {

    await mockPartsApi(page);

    await page.goto('/dashboard/parts');
    await page.getByRole('button', { name: 'Nuovo' }).click();

    // Submit empty form
    await page.getByRole('button', { name: 'Aggiungi fornitore' }).click();

    await expect(page.getByText('Il nome del fornitore è obbligatorio')).toBeVisible();
  });
});
