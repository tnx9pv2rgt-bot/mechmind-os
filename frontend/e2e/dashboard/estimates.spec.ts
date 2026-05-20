import { test, expect } from '../fixtures/auth.fixture';
import type { Page } from '@playwright/test';

const MOCK_ESTIMATES = [
  {
    id: 'est-001',
    number: 'PRV-2026-001',
    customerName: 'Marco Bianchi',
    vehiclePlate: 'AB123CD',
    vehicleBrand: 'Fiat',
    vehicleModel: 'Panda',
    total: 1250.0,
    status: 'DRAFT',
    createdAt: '2026-03-15T10:00:00Z',
    expiresAt: '2026-04-15T10:00:00Z',
  },
  {
    id: 'est-002',
    number: 'PRV-2026-002',
    customerName: 'Laura Verdi',
    vehiclePlate: 'EF456GH',
    vehicleBrand: 'BMW',
    vehicleModel: '320d',
    total: 3450.5,
    status: 'ACCEPTED',
    createdAt: '2026-03-10T14:30:00Z',
    expiresAt: '2026-04-10T14:30:00Z',
  },
];

const MOCK_STATS = {
  total: 25,
  pending: 8,
  accepted: 12,
  conversionRate: 48,
};

function mockEstimatesApi(page: Page, data: unknown[] = MOCK_ESTIMATES): Promise<void> {
  return Promise.all([
    page.route('**/api/estimates', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
      } else {
        route.continue();
      }
    }),
    page.route('**/api/estimates/stats', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_STATS) }),
    ),
  ]).then(() => undefined);
}

test.describe('Preventivi - Render', () => {
  test('la pagina si carica con il titolo visibile', async ({ page }) => {

    await mockEstimatesApi(page);

    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/dashboard/estimates');

    await expect(page.getByRole('heading', { name: 'Preventivi' })).toBeVisible();
    await expect(page.getByText('Gestisci i preventivi per i tuoi clienti')).toBeVisible();
    expect(errors).toHaveLength(0);
  });
});

test.describe('Preventivi - Loading', () => {
  test('mostra spinner durante il caricamento', async ({ page }) => {


    await page.route('**/api/estimates', (route) =>
      setTimeout(() => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }), 3000),
    );
    await page.route('**/api/estimates/stats', (route) =>
      setTimeout(() => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_STATS) }), 3000),
    );

    await page.goto('/dashboard/estimates');

    // Stats show '...' during loading
    await expect(page.getByText('...')).toBeVisible({ timeout: 2000 });
  });
});

test.describe('Preventivi - Empty State', () => {
  test('mostra messaggio vuoto con CTA', async ({ page }) => {

    await mockEstimatesApi(page, []);

    await page.goto('/dashboard/estimates');

    await expect(page.getByText('Nessun preventivo. Crea il primo preventivo.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Crea il primo preventivo' })).toBeVisible();
  });
});

test.describe('Preventivi - Error State', () => {
  test('mostra errore e bottone Riprova quando API restituisce 500', async ({ page }) => {


    await page.route('**/api/estimates', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Internal Server Error' }) }),
    );
    await page.route('**/api/estimates/stats', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Internal Server Error' }) }),
    );

    await page.goto('/dashboard/estimates');

    await expect(page.getByText('Impossibile caricare i preventivi')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Riprova' })).toBeVisible();
  });

  test('il bottone Riprova ricarica i dati', async ({ page }) => {

    let callCount = 0;

    await page.route('**/api/estimates', (route) => {
      callCount++;
      if (callCount <= 1) {
        route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'fail' }) });
      } else {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ESTIMATES) });
      }
    });
    await page.route('**/api/estimates/stats', (route) => {
      if (callCount <= 1) {
        route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'fail' }) });
      } else {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_STATS) });
      }
    });

    await page.goto('/dashboard/estimates');
    await expect(page.getByText('Impossibile caricare i preventivi')).toBeVisible();

    await page.getByRole('button', { name: 'Riprova' }).click();
    await expect(page.getByText('PRV-2026-001')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Preventivi - Data', () => {
  test('visualizza correttamente i preventivi mockati', async ({ page }) => {

    await mockEstimatesApi(page);

    await page.goto('/dashboard/estimates');

    // Verify estimate numbers
    await expect(page.getByText('PRV-2026-001')).toBeVisible();
    await expect(page.getByText('PRV-2026-002')).toBeVisible();

    // Verify customer names
    await expect(page.getByText(/Marco Bianchi/)).toBeVisible();
    await expect(page.getByText(/Laura Verdi/)).toBeVisible();

    // Verify status badges (Italian labels)
    await expect(page.getByText('Bozza')).toBeVisible();
    await expect(page.getByText('Accettato')).toBeVisible();
  });

  test('visualizza le statistiche', async ({ page }) => {

    await mockEstimatesApi(page);

    await page.goto('/dashboard/estimates');

    await expect(page.getByText('25')).toBeVisible();
    await expect(page.getByText('Totale Preventivi')).toBeVisible();
    await expect(page.getByText('In Attesa')).toBeVisible();
    await expect(page.getByText('Accettati')).toBeVisible();
    await expect(page.getByText('48%')).toBeVisible();
    await expect(page.getByText('Tasso Conversione')).toBeVisible();
  });

  test('il filtro di ricerca funziona', async ({ page }) => {

    await mockEstimatesApi(page);

    await page.goto('/dashboard/estimates');
    await expect(page.getByText('PRV-2026-001')).toBeVisible();
    await expect(page.getByText('PRV-2026-002')).toBeVisible();

    await page.getByLabel('Cerca preventivi').fill('Marco');

    await expect(page.getByText('PRV-2026-001')).toBeVisible();
    await expect(page.getByText('PRV-2026-002')).not.toBeVisible();
  });

  test('il filtro per stato funziona', async ({ page }) => {

    await mockEstimatesApi(page);

    await page.goto('/dashboard/estimates');

    await page.locator('select').selectOption('ACCEPTED');

    await expect(page.getByText('PRV-2026-002')).toBeVisible();
    await expect(page.getByText('PRV-2026-001')).not.toBeVisible();
  });
});

test.describe('Preventivi - Actions', () => {
  test('"Nuovo Preventivo" naviga alla pagina di creazione', async ({ page }) => {

    await mockEstimatesApi(page);

    await page.goto('/dashboard/estimates');

    await page.getByRole('button', { name: 'Nuovo Preventivo' }).click();

    await expect(page).toHaveURL(/dashboard\/estimates\/new/);
  });

  test('il bottone Visualizza naviga al dettaglio', async ({ page }) => {

    await mockEstimatesApi(page);

    await page.goto('/dashboard/estimates');

    await page.getByRole('button', { name: 'Visualizza' }).first().click();

    await expect(page).toHaveURL(/dashboard\/estimates\/est-001/);
  });

  test('il bottone Invia appare solo per le bozze', async ({ page }) => {

    await mockEstimatesApi(page);

    await page.goto('/dashboard/estimates');

    // DRAFT estimate should have "Invia" button
    const draftRow = page.locator('text=PRV-2026-001').locator('..');
    await expect(page.getByRole('button', { name: 'Invia' })).toBeVisible();

    // Filter to ACCEPTED only — no Invia button
    await page.locator('select').selectOption('ACCEPTED');
    await expect(page.getByRole('button', { name: 'Invia' })).not.toBeVisible();
  });

  test('il bottone Invia chiama API e mostra toast', async ({ page }) => {

    await mockEstimatesApi(page);

    await page.route('**/api/estimates/est-001/send', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) }),
    );

    await page.goto('/dashboard/estimates');
    await page.getByRole('button', { name: 'Invia' }).click();

    await expect(page.getByText('Preventivo inviato con successo')).toBeVisible({ timeout: 5000 });
  });
});
