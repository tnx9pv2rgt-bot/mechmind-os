import { test, expect } from '../fixtures/auth.fixture';
import type { Page } from '@playwright/test';

const MOCK_MAINTENANCE_ITEMS = {
  success: true,
  data: {
    items: [
      {
        id: 'maint-001',
        type: 'OIL_CHANGE',
        status: 'PENDING',
        isOverdue: true,
        daysUntilDue: -5,
        nextDueKm: 45000,
        nextDueDate: '2026-03-10T00:00:00Z',
        lastPerformedDate: '2025-09-10T00:00:00Z',
        lastPerformedKm: 40000,
        vehicle: {
          id: 'veh-001',
          make: 'Fiat',
          model: 'Panda',
          licensePlate: 'AB123CD',
        },
      },
      {
        id: 'maint-002',
        type: 'BRAKE_CHECK',
        status: 'PENDING',
        isOverdue: false,
        daysUntilDue: 3,
        nextDueKm: 50000,
        nextDueDate: '2026-03-23T00:00:00Z',
        lastPerformedDate: '2025-06-15T00:00:00Z',
        lastPerformedKm: 35000,
        vehicle: {
          id: 'veh-002',
          make: 'BMW',
          model: '320d',
          licensePlate: 'EF456GH',
        },
      },
      {
        id: 'maint-003',
        type: 'FILTER',
        status: 'COMPLETED',
        isOverdue: false,
        daysUntilDue: 30,
        nextDueKm: 55000,
        nextDueDate: '2026-04-20T00:00:00Z',
        lastPerformedDate: '2026-03-01T00:00:00Z',
        lastPerformedKm: 48000,
        vehicle: {
          id: 'veh-003',
          make: 'Audi',
          model: 'A3',
          licensePlate: 'IJ789KL',
        },
      },
    ],
    total: 3,
  },
};

const MOCK_OVERDUE = {
  success: true,
  data: [
    {
      id: 'maint-001',
      type: 'OIL_CHANGE',
      daysOverdue: 5,
      vehicle: { make: 'Fiat', model: 'Panda', licensePlate: 'AB123CD' },
    },
  ],
};

function mockMaintenanceApi(page: Page, data = MOCK_MAINTENANCE_ITEMS): Promise<void> {
  return Promise.all([
    page.route('**/api/maintenance?*', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
      } else {
        route.continue();
      }
    }),
    page.route('**/api/maintenance/overdue*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_OVERDUE) }),
    ),
    page.route('**/api/maintenance/upcoming*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) }),
    ),
  ]).then(() => undefined);
}

test.describe('Manutenzione - Render', () => {
  test('la pagina si carica con il titolo visibile e zero errori console', async ({ page }) => {

    await mockMaintenanceApi(page);

    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/dashboard/maintenance');

    await expect(page.getByRole('heading', { name: 'Manutenzione Preventiva' })).toBeVisible();
    await expect(page.getByText('Gestisci le programmazioni di manutenzione per tutti i veicoli')).toBeVisible();
    expect(errors).toHaveLength(0);
  });
});

test.describe('Manutenzione - Loading', () => {
  test('mostra skeleton durante il caricamento', async ({ page }) => {


    await page.route('**/api/maintenance?*', (route) =>
      setTimeout(() => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_MAINTENANCE_ITEMS) }), 3000),
    );
    await page.route('**/api/maintenance/overdue*', (route) =>
      setTimeout(() => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_OVERDUE) }), 3000),
    );
    await page.route('**/api/maintenance/upcoming*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) }),
    );

    await page.goto('/dashboard/maintenance');

    // Skeleton items should be visible
    await expect(page.locator('.animate-pulse').first()).toBeVisible({ timeout: 2000 });
  });
});

test.describe('Manutenzione - Empty State', () => {
  test('mostra messaggio vuoto quando non ci sono manutenzioni', async ({ page }) => {


    const emptyData = { success: true, data: { items: [], total: 0 } };
    await page.route('**/api/maintenance?*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(emptyData) }),
    );
    await page.route('**/api/maintenance/overdue*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) }),
    );
    await page.route('**/api/maintenance/upcoming*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) }),
    );

    await page.goto('/dashboard/maintenance');

    await expect(page.getByText('Nessuna manutenzione trovata')).toBeVisible();
    await expect(page.getByText('Crea una nuova programmazione per iniziare')).toBeVisible();
  });
});

test.describe('Manutenzione - Error State', () => {
  test('gestisce errori API senza crash', async ({ page }) => {


    await page.route('**/api/maintenance?*', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Internal Server Error' }) }),
    );
    await page.route('**/api/maintenance/overdue*', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'fail' }) }),
    );
    await page.route('**/api/maintenance/upcoming*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) }),
    );

    await page.goto('/dashboard/maintenance');

    // Page should still render without crashing
    await expect(page.getByRole('heading', { name: 'Manutenzione Preventiva' })).toBeVisible();
  });
});

test.describe('Manutenzione - Data', () => {
  test('visualizza le manutenzioni con badge stato', async ({ page }) => {

    await mockMaintenanceApi(page);

    await page.goto('/dashboard/maintenance');

    // Verify maintenance types (Italian labels)
    await expect(page.getByText('Cambio Olio')).toBeVisible();
    await expect(page.getByText('Controllo Freni')).toBeVisible();

    // Verify vehicle info
    await expect(page.getByText(/Fiat Panda/)).toBeVisible();
    await expect(page.getByText(/BMW 320d/)).toBeVisible();
  });

  test('gli elementi scaduti sono evidenziati', async ({ page }) => {

    await mockMaintenanceApi(page);

    await page.goto('/dashboard/maintenance');

    // Overdue badge
    await expect(page.getByText('In ritardo')).toBeVisible();

    // Due soon badge
    await expect(page.getByText('A breve')).toBeVisible();
  });

  test('mostra km e giorni rimanenti', async ({ page }) => {

    await mockMaintenanceApi(page);

    await page.goto('/dashboard/maintenance');

    await expect(page.getByText('5 giorni fa')).toBeVisible();
    await expect(page.getByText('Tra 3 giorni')).toBeVisible();
    await expect(page.getByText('45.000 km')).toBeVisible();
  });

  test('le tab Elenco, Calendario e Pannello funzionano', async ({ page }) => {

    await mockMaintenanceApi(page);

    await page.goto('/dashboard/maintenance');

    // Default tab is "list"
    await expect(page.getByText('Programmazioni Manutenzione')).toBeVisible();

    // Click Pannello tab
    await page.getByRole('tab', { name: /Pannello/ }).click();
    await expect(page.getByText('Prossime Scadenze')).toBeVisible();
    await expect(page.getByText('Storico Manutenzioni')).toBeVisible();
  });

  test('la ricerca filtra per veicolo', async ({ page }) => {

    await mockMaintenanceApi(page);

    await page.goto('/dashboard/maintenance');

    await page.getByPlaceholder('Cerca veicolo...').fill('Fiat');

    await expect(page.getByText(/Fiat Panda/)).toBeVisible();
    await expect(page.getByText(/BMW 320d/)).not.toBeVisible();
  });
});

test.describe('Manutenzione - Actions', () => {
  test('"Nuova Programmazione" apre il form', async ({ page }) => {

    await mockMaintenanceApi(page);

    await page.goto('/dashboard/maintenance');

    await page.getByRole('button', { name: 'Nuova Programmazione' }).click();

    // MaintenanceForm dialog should open
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
  });

  test('il bottone Completa esiste per ogni riga', async ({ page }) => {

    await mockMaintenanceApi(page);

    await page.goto('/dashboard/maintenance');

    // "Completa" buttons should be present
    const completeButtons = page.getByRole('button', { name: 'Completa' });
    await expect(completeButtons.first()).toBeVisible();
  });
});
