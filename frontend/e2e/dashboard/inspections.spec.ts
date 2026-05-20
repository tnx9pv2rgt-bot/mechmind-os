import { test, expect } from '../fixtures/auth.fixture';
import type { Page } from '@playwright/test';

const MOCK_INSPECTIONS = [
  {
    id: 'insp-001abc',
    vehiclePlate: 'AB123CD',
    vehicleName: 'Fiat Panda 1.2',
    customerName: 'Marco Bianchi',
    inspectorName: 'Luigi Rossi',
    type: 'PERIODIC',
    inspectionType: 'PERIODIC',
    status: 'completed',
    createdAt: '2026-03-15T10:00:00Z',
    itemCount: 12,
    maxSeverity: 'CRITICO',
  },
  {
    id: 'insp-002def',
    vehiclePlate: 'EF456GH',
    vehicleName: 'BMW 320d',
    customerName: 'Laura Verdi',
    inspectorName: 'Paolo Neri',
    type: 'PRE_PURCHASE',
    inspectionType: 'PRE_PURCHASE',
    status: 'completed',
    createdAt: '2026-03-12T14:30:00Z',
    itemCount: 8,
    maxSeverity: 'OK',
  },
];

function mockInspectionsApi(page: Page, data: unknown[] = MOCK_INSPECTIONS): Promise<void> {
  return page.route('**/api/inspections', (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
    } else {
      route.continue();
    }
  });
}

test.describe('Ispezioni - Render', () => {
  test('la pagina si carica con il titolo visibile e zero errori console', async ({ page }) => {

    await mockInspectionsApi(page);

    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/dashboard/inspections');

    await expect(page.getByRole('heading', { name: 'Ispezioni' })).toBeVisible();
    await expect(page.getByText('Gestione ispezioni veicoli')).toBeVisible();
    expect(errors).toHaveLength(0);
  });
});

test.describe('Ispezioni - Loading', () => {
  test('mostra spinner durante il caricamento', async ({ page }) => {


    await page.route('**/api/inspections', (route) =>
      setTimeout(() => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }), 3000),
    );

    await page.goto('/dashboard/inspections');

    // Stats show '...' during loading
    await expect(page.getByText('...')).toBeVisible({ timeout: 2000 });
  });
});

test.describe('Ispezioni - Empty State', () => {
  test('mostra messaggio vuoto con CTA', async ({ page }) => {

    await mockInspectionsApi(page, []);

    await page.goto('/dashboard/inspections');

    await expect(page.getByText('Nessuna ispezione trovata')).toBeVisible();
    await expect(page.getByText('Non ci sono ispezioni registrate. Crea una nuova ispezione per iniziare.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nuova Ispezione' }).nth(1)).toBeVisible();
  });
});

test.describe('Ispezioni - Error State', () => {
  test('mostra errore e bottone Riprova quando API restituisce 500', async ({ page }) => {


    await page.route('**/api/inspections', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Internal Server Error' }) }),
    );

    await page.goto('/dashboard/inspections');

    await expect(page.getByText('Impossibile caricare le ispezioni')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Riprova' })).toBeVisible();
  });

  test('il bottone Riprova ricarica i dati', async ({ page }) => {

    let callCount = 0;

    await page.route('**/api/inspections', (route) => {
      callCount++;
      if (callCount <= 1) {
        route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'fail' }) });
      } else {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_INSPECTIONS) });
      }
    });

    await page.goto('/dashboard/inspections');
    await expect(page.getByText('Impossibile caricare le ispezioni')).toBeVisible();

    await page.getByRole('button', { name: 'Riprova' }).click();
    await expect(page.getByText('Fiat Panda 1.2')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Ispezioni - Data', () => {
  test('visualizza correttamente le ispezioni mockate con badge gravita', async ({ page }) => {

    await mockInspectionsApi(page);

    await page.goto('/dashboard/inspections');

    // Verify vehicle names
    await expect(page.getByText('Fiat Panda 1.2')).toBeVisible();
    await expect(page.getByText('BMW 320d')).toBeVisible();

    // Verify plates and customers
    await expect(page.getByText(/AB123CD/)).toBeVisible();
    await expect(page.getByText(/Marco Bianchi/)).toBeVisible();

    // Verify severity badges
    await expect(page.getByText('Critico')).toBeVisible();
    await expect(page.getByText('OK')).toBeVisible();
  });

  test('visualizza le statistiche', async ({ page }) => {

    await mockInspectionsApi(page);

    await page.goto('/dashboard/inspections');

    await expect(page.getByText('Totali')).toBeVisible();
    await expect(page.getByText('Critiche')).toBeVisible();
    await expect(page.getByText('Tutto OK')).toBeVisible();
  });

  test('il filtro di ricerca funziona', async ({ page }) => {

    await mockInspectionsApi(page);

    await page.goto('/dashboard/inspections');
    await expect(page.getByText('Fiat Panda 1.2')).toBeVisible();
    await expect(page.getByText('BMW 320d')).toBeVisible();

    await page.getByLabel('Cerca ispezioni').fill('Fiat');

    await expect(page.getByText('Fiat Panda 1.2')).toBeVisible();
    await expect(page.getByText('BMW 320d')).not.toBeVisible();
  });

  test('il filtro per gravita funziona', async ({ page }) => {

    await mockInspectionsApi(page);

    await page.goto('/dashboard/inspections');

    await page.locator('select').selectOption('CRITICO');

    await expect(page.getByText('Fiat Panda 1.2')).toBeVisible();
    await expect(page.getByText('BMW 320d')).not.toBeVisible();
  });

  test('mostra messaggio filtro vuoto quando nessun risultato', async ({ page }) => {

    await mockInspectionsApi(page);

    await page.goto('/dashboard/inspections');

    await page.getByLabel('Cerca ispezioni').fill('ZZZinesistente');

    await expect(page.getByText('Nessuna ispezione trovata')).toBeVisible();
    await expect(page.getByText('Nessun risultato. Prova con altri filtri.')).toBeVisible();
  });
});

test.describe('Ispezioni - Actions', () => {
  test('"Nuova Ispezione" naviga alla pagina di creazione', async ({ page }) => {

    await mockInspectionsApi(page);

    await page.goto('/dashboard/inspections');

    await page.getByRole('button', { name: 'Nuova Ispezione' }).first().click();

    await expect(page).toHaveURL(/dashboard\/inspections\/new/);
  });

  test('il bottone Dettagli naviga al dettaglio', async ({ page }) => {

    await mockInspectionsApi(page);

    await page.goto('/dashboard/inspections');

    await page.getByRole('button', { name: 'Dettagli' }).first().click();

    await expect(page).toHaveURL(/dashboard\/inspections\/insp-001abc/);
  });

  test('il bottone elimina apre il dialog di conferma', async ({ page }) => {

    await mockInspectionsApi(page);

    await page.goto('/dashboard/inspections');

    await page.getByLabel('Elimina ispezione').first().click();

    await expect(page.getByText('Elimina ispezione')).toBeVisible();
    await expect(page.getByText('Sei sicuro di voler eliminare questa ispezione?')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Elimina' })).toBeVisible();
  });

  test('eliminazione chiama API e chiude dialog', async ({ page }) => {

    await mockInspectionsApi(page);

    await page.route('**/api/inspections/insp-001abc', (route) => {
      if (route.request().method() === 'DELETE') {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
      } else {
        route.continue();
      }
    });

    await page.goto('/dashboard/inspections');
    await page.getByLabel('Elimina ispezione').first().click();

    await page.getByRole('button', { name: 'Elimina' }).click();

    await expect(page.getByText('Ispezione eliminata')).toBeVisible({ timeout: 5000 });
  });
});
