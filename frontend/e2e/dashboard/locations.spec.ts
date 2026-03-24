import { test, expect } from '../fixtures/auth.fixture';
import type { Page } from '@playwright/test';

const MOCK_LOCATIONS = [
  {
    id: 'loc-001',
    name: 'Officina Centrale',
    address: 'Via Roma 42',
    city: 'Milano',
    phone: '+39 02 1234567',
    isActive: true,
  },
  {
    id: 'loc-002',
    name: 'Sede Sud',
    address: 'Corso Italia 15',
    city: 'Napoli',
    phone: '+39 081 9876543',
    isActive: false,
  },
];

function mockLocationsApi(page: Page, data: unknown[] = MOCK_LOCATIONS): Promise<void> {
  return page.route('**/api/locations*', (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data }) });
    } else {
      route.continue();
    }
  });
}

test.describe('Sedi - Render', () => {
  test('la pagina si carica con il titolo visibile e zero errori console', async ({ page }) => {

    await mockLocationsApi(page);

    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/dashboard/locations');

    await expect(page.getByRole('heading', { name: 'Sedi' })).toBeVisible();
    await expect(page.getByText('Gestisci le tue sedi')).toBeVisible();
    expect(errors).toHaveLength(0);
  });
});

test.describe('Sedi - Loading', () => {
  test('mostra spinner durante il caricamento', async ({ page }) => {


    await page.route('**/api/locations*', (route) =>
      setTimeout(() => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) }), 3000),
    );

    await page.goto('/dashboard/locations');

    // Loader2 spinner should be visible
    await expect(page.locator('.animate-spin').first()).toBeVisible({ timeout: 2000 });
  });
});

test.describe('Sedi - Empty State', () => {
  test('mostra messaggio vuoto quando non ci sono sedi', async ({ page }) => {

    await mockLocationsApi(page, []);

    await page.goto('/dashboard/locations');

    await expect(page.getByText('Nessuna sede trovata. Aggiungi la prima sede per iniziare.')).toBeVisible();
  });
});

test.describe('Sedi - Error State', () => {
  test('mostra errore e bottone Riprova quando API restituisce 500', async ({ page }) => {


    await page.route('**/api/locations*', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Internal Server Error' }) }),
    );

    await page.goto('/dashboard/locations');

    await expect(page.getByText('Impossibile caricare le sedi')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Riprova' })).toBeVisible();
  });

  test('il bottone Riprova ricarica i dati', async ({ page }) => {

    let callCount = 0;

    await page.route('**/api/locations*', (route) => {
      callCount++;
      if (callCount <= 1) {
        route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'fail' }) });
      } else {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: MOCK_LOCATIONS }) });
      }
    });

    await page.goto('/dashboard/locations');
    await expect(page.getByText('Impossibile caricare le sedi')).toBeVisible();

    await page.getByRole('button', { name: 'Riprova' }).click();
    await expect(page.getByText('Officina Centrale')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Sedi - Data', () => {
  test('visualizza le card delle sedi con nome, citta e stato', async ({ page }) => {

    await mockLocationsApi(page);

    await page.goto('/dashboard/locations');

    // Verify location names
    await expect(page.getByText('Officina Centrale')).toBeVisible();
    await expect(page.getByText('Sede Sud')).toBeVisible();

    // Verify cities
    await expect(page.getByText('Milano')).toBeVisible();
    await expect(page.getByText('Napoli')).toBeVisible();
  });

  test('visualizza le statistiche', async ({ page }) => {

    await mockLocationsApi(page);

    await page.goto('/dashboard/locations');

    await expect(page.getByText('Sedi Totali')).toBeVisible();
    await expect(page.getByText('Fatturato Totale')).toBeVisible();
    await expect(page.getByText('Tecnici')).toBeVisible();
    await expect(page.getByText('Veicoli/gg')).toBeVisible();
  });

  test('il filtro di ricerca funziona', async ({ page }) => {

    await mockLocationsApi(page);

    await page.goto('/dashboard/locations');
    await expect(page.getByText('Officina Centrale')).toBeVisible();
    await expect(page.getByText('Sede Sud')).toBeVisible();

    await page.getByLabel('Cerca sedi').fill('Milano');

    await expect(page.getByText('Officina Centrale')).toBeVisible();
    await expect(page.getByText('Sede Sud')).not.toBeVisible();
  });

  test('le tab Confronto e Magazzino sono visibili', async ({ page }) => {

    await mockLocationsApi(page);

    await page.goto('/dashboard/locations');

    await expect(page.getByRole('tab', { name: 'Sedi' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Confronto' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Magazzino' })).toBeVisible();
  });

  test('la tab Confronto mostra la lista confronto', async ({ page }) => {

    await mockLocationsApi(page);

    await page.goto('/dashboard/locations');

    await page.getByRole('tab', { name: 'Confronto' }).click();

    await expect(page.getByText('Confronto Performance')).toBeVisible();
    await expect(page.getByText('Officina Centrale')).toBeVisible();
  });

  test('la tab Magazzino mostra il contenuto magazzino', async ({ page }) => {

    await mockLocationsApi(page);

    await page.goto('/dashboard/locations');

    await page.getByRole('tab', { name: 'Magazzino' }).click();

    await expect(page.getByText('Magazzino Condiviso')).toBeVisible();
    await expect(page.getByText('Gestione Magazzino')).toBeVisible();
  });
});

test.describe('Sedi - Actions', () => {
  test('"Nuova Sede" apre il dialog', async ({ page }) => {

    await mockLocationsApi(page);

    await page.goto('/dashboard/locations');

    await page.getByRole('button', { name: 'Nuova Sede' }).click();

    // The LocationDialog should open
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
  });

  test('il bottone Vedi naviga al dettaglio della sede', async ({ page }) => {

    await mockLocationsApi(page);

    await page.goto('/dashboard/locations');

    await page.getByRole('button', { name: 'Vedi' }).first().click();

    await expect(page).toHaveURL(/dashboard\/locations\/loc-001/);
  });

  test('il bottone Seleziona mostra il dettaglio inline', async ({ page }) => {

    await mockLocationsApi(page);

    await page.goto('/dashboard/locations');

    // Click Seleziona on the second location
    await page.getByRole('button', { name: 'Seleziona' }).nth(1).click();

    // The detail section should show Sede Sud info
    await expect(page.getByText('Corso Italia 15')).toBeVisible();
  });
});
