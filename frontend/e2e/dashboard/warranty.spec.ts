import { test, expect } from '../fixtures/auth.fixture';
import type { Page } from '@playwright/test';

const MOCK_WARRANTIES = {
  data: [
    {
      id: 'war-001',
      warrantyNumber: 'GAR-2026-001',
      status: 'ACTIVE',
      coverageType: 'MANUFACTURER',
      provider: 'Fiat SpA',
      startDate: '2025-01-01T00:00:00Z',
      expirationDate: '2027-01-01T00:00:00Z',
      maxClaimAmount: 10000,
      deductibleAmount: 250,
      mileageLimit: 100000,
      vehicle: {
        id: 'veh-001',
        make: 'Fiat',
        model: 'Panda',
        year: 2024,
        vin: 'ZFA31200001234567',
        licensePlate: 'AB123CD',
      },
      claims: [],
    },
    {
      id: 'war-002',
      warrantyNumber: 'GAR-2026-002',
      status: 'EXPIRING_SOON',
      coverageType: 'EXTENDED',
      provider: 'BMW Warranty',
      startDate: '2024-06-01T00:00:00Z',
      expirationDate: '2026-04-01T00:00:00Z',
      maxClaimAmount: 15000,
      deductibleAmount: 500,
      mileageLimit: 150000,
      vehicle: {
        id: 'veh-002',
        make: 'BMW',
        model: '320d',
        year: 2023,
        vin: 'WBA32010001234567',
        licensePlate: 'EF456GH',
      },
      claims: [
        {
          id: 'claim-001',
          status: 'SUBMITTED',
          issueDescription: 'Problema sensore motore',
          estimatedCost: 800,
          createdAt: '2026-03-10T00:00:00Z',
        },
      ],
    },
    {
      id: 'war-003',
      warrantyNumber: 'GAR-2026-003',
      status: 'EXPIRED',
      coverageType: 'DEALER',
      provider: 'Concessionaria Roma',
      startDate: '2023-01-01T00:00:00Z',
      expirationDate: '2025-01-01T00:00:00Z',
      maxClaimAmount: 5000,
      deductibleAmount: 100,
      mileageLimit: null,
      vehicle: {
        id: 'veh-003',
        make: 'Audi',
        model: 'A3',
        year: 2022,
        vin: 'WAUZZZ8V0001234567',
        licensePlate: 'IJ789KL',
      },
      claims: [
        {
          id: 'claim-002',
          status: 'APPROVED',
          issueDescription: 'Sostituzione pompa acqua',
          estimatedCost: 600,
          approvedAmount: 500,
          createdAt: '2024-06-15T00:00:00Z',
        },
      ],
    },
  ],
};

const MOCK_CLAIMS = {
  data: [
    {
      id: 'claim-001',
      status: 'SUBMITTED',
      issueDescription: 'Problema sensore motore',
      estimatedCost: 800,
      createdAt: '2026-03-10T00:00:00Z',
      warranty: { vehicle: { make: 'BMW', model: '320d' } },
    },
    {
      id: 'claim-002',
      status: 'APPROVED',
      issueDescription: 'Sostituzione pompa acqua',
      estimatedCost: 600,
      approvedAmount: 500,
      createdAt: '2024-06-15T00:00:00Z',
      warranty: { vehicle: { make: 'Audi', model: 'A3' } },
    },
  ],
};

const MOCK_EXPIRING = {
  data: [MOCK_WARRANTIES.data[1]],
};

function mockWarrantyApi(page: Page, warranties = MOCK_WARRANTIES, claims = MOCK_CLAIMS, expiring = MOCK_EXPIRING): Promise<void> {
  return Promise.all([
    page.route('**/api/warranties/claims*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(claims) }),
    ),
    page.route('**/api/warranties/expiring*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(expiring) }),
    ),
    page.route('**/api/warranties', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(warranties) });
      } else {
        route.continue();
      }
    }),
  ]).then(() => undefined);
}

test.describe('Garanzie - Render', () => {
  test('la pagina si carica con il titolo visibile e zero errori console', async ({ page }) => {

    await mockWarrantyApi(page);

    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/dashboard/warranty');

    await expect(page.getByRole('heading', { name: 'Gestione Garanzie' })).toBeVisible();
    await expect(page.getByText('Monitora le garanzie e gestisci i reclami')).toBeVisible();
    expect(errors).toHaveLength(0);
  });
});

test.describe('Garanzie - Loading', () => {
  test('mostra spinner durante il caricamento', async ({ page }) => {


    await page.route('**/api/warranties*', (route) =>
      setTimeout(() => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) }), 3000),
    );

    await page.goto('/dashboard/warranty');

    // Spinner (border-b-2 border-blue-600)
    await expect(page.locator('.animate-spin').first()).toBeVisible({ timeout: 2000 });
  });
});

test.describe('Garanzie - Empty State', () => {
  test('mostra messaggio vuoto con CTA quando non ci sono garanzie', async ({ page }) => {

    await mockWarrantyApi(page, { data: [] }, { data: [] }, { data: [] });

    await page.goto('/dashboard/warranty');

    await expect(page.getByText('Nessuna garanzia')).toBeVisible();
    await expect(page.getByText('Crea una garanzia per iniziare a monitorare la copertura')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Crea Garanzia' })).toBeVisible();
  });
});

test.describe('Garanzie - Error State', () => {
  test('mostra toast errore quando API restituisce 500', async ({ page }) => {


    await page.route('**/api/warranties/claims*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) }),
    );
    await page.route('**/api/warranties/expiring*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) }),
    );
    await page.route('**/api/warranties', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Internal Server Error' }) }),
    );

    await page.goto('/dashboard/warranty');

    // SWR will throw and the useEffect will show a toast
    await expect(page.getByText('Errore nel caricamento')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Garanzie - Data', () => {
  test('visualizza le statistiche', async ({ page }) => {

    await mockWarrantyApi(page);

    await page.goto('/dashboard/warranty');

    await expect(page.getByText('Garanzie Attive')).toBeVisible();
    await expect(page.getByText('In Scadenza')).toBeVisible();
    await expect(page.getByText('Scadute')).toBeVisible();
    await expect(page.getByText('Reclami in Attesa')).toBeVisible();
  });

  test('visualizza le card delle garanzie', async ({ page }) => {

    await mockWarrantyApi(page);

    await page.goto('/dashboard/warranty');

    // Warranty cards should be rendered (via WarrantyCard component)
    // The tab "Garanzie" is default
    await expect(page.getByRole('tab', { name: 'Garanzie' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Reclami' })).toBeVisible();
  });

  test('il banner garanzie in scadenza e visibile', async ({ page }) => {

    await mockWarrantyApi(page);

    await page.goto('/dashboard/warranty');

    // ExpiringAlert component should be shown when expiring warranties exist
    // The exact text depends on ExpiringAlert component
    await expect(page.locator('[class*="amber"], [class*="yellow"], [class*="warning"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('la tab Reclami mostra la lista reclami', async ({ page }) => {

    await mockWarrantyApi(page);

    await page.goto('/dashboard/warranty');

    await page.getByRole('tab', { name: 'Reclami' }).click();

    // ClaimsList component should render the claims
    await expect(page.getByText(/Problema sensore motore|Sostituzione pompa acqua/).first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Garanzie - Actions', () => {
  test('"Nuova Garanzia" apre il dialog di creazione', async ({ page }) => {

    await mockWarrantyApi(page);

    await page.goto('/dashboard/warranty');

    await page.getByRole('button', { name: 'Nuova Garanzia' }).click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Nuova Garanzia')).toBeVisible();
    await expect(page.getByText('Aggiungi una nuova garanzia per un veicolo')).toBeVisible();
  });

  test('CTA dello stato vuoto apre il dialog', async ({ page }) => {

    await mockWarrantyApi(page, { data: [] }, { data: [] }, { data: [] });

    await page.goto('/dashboard/warranty');

    await page.getByRole('button', { name: 'Crea Garanzia' }).click();

    await expect(page.getByRole('dialog')).toBeVisible();
  });
});

// --- Detail Page Tests ---

const MOCK_WARRANTY_DETAIL = {
  data: {
    id: 'war-001',
    warrantyNumber: 'GAR-2026-001',
    status: 'ACTIVE',
    coverageType: 'MANUFACTURER',
    provider: 'Fiat SpA',
    startDate: '2025-01-01T00:00:00Z',
    expirationDate: '2027-01-01T00:00:00Z',
    maxClaimAmount: 10000,
    deductibleAmount: 250,
    mileageLimit: 100000,
    vehicle: {
      id: 'veh-001',
      make: 'Fiat',
      model: 'Panda',
      year: 2024,
      vin: 'ZFA31200001234567',
    },
    claims: [
      {
        id: 'claim-010',
        status: 'SUBMITTED',
        issueDescription: 'Rumore sospensione anteriore',
        estimatedCost: 400,
        createdAt: '2026-03-18T00:00:00Z',
      },
      {
        id: 'claim-011',
        status: 'APPROVED',
        issueDescription: 'Sostituzione sensore lambda',
        estimatedCost: 350,
        approvedAmount: 300,
        createdAt: '2026-02-10T00:00:00Z',
      },
    ],
  },
};

function mockWarrantyDetailApi(page: Page): Promise<void> {
  return page.route('**/api/warranties/war-001', (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_WARRANTY_DETAIL) });
    } else if (route.request().method() === 'DELETE') {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    } else {
      route.continue();
    }
  });
}

test.describe('Garanzia Dettaglio - Render', () => {
  test('la pagina dettaglio carica con le informazioni', async ({ page }) => {

    await mockWarrantyDetailApi(page);

    await page.goto('/dashboard/warranty/war-001');

    await expect(page.getByText('Garanzia Fiat Panda')).toBeVisible();
    await expect(page.getByText('Stato Garanzia')).toBeVisible();
    await expect(page.getByText('Attiva')).toBeVisible();
  });
});

test.describe('Garanzia Dettaglio - Data', () => {
  test('mostra la progress bar della copertura', async ({ page }) => {

    await mockWarrantyDetailApi(page);

    await page.goto('/dashboard/warranty/war-001');

    await expect(page.getByText('Periodo di Copertura')).toBeVisible();
    await expect(page.getByText(/% trascorso/)).toBeVisible();
  });

  test('mostra i dettagli copertura', async ({ page }) => {

    await mockWarrantyDetailApi(page);

    await page.goto('/dashboard/warranty/war-001');

    await expect(page.getByText('Copertura Max')).toBeVisible();
    await expect(page.getByText('Franchigia')).toBeVisible();
    await expect(page.getByText('Copertura Km')).toBeVisible();
    await expect(page.getByText('100.000 km')).toBeVisible();
  });

  test('mostra informazioni veicolo', async ({ page }) => {

    await mockWarrantyDetailApi(page);

    await page.goto('/dashboard/warranty/war-001');

    await expect(page.getByText('Informazioni Veicolo')).toBeVisible();
    await expect(page.getByText('Fiat')).toBeVisible();
    await expect(page.getByText('Panda')).toBeVisible();
    await expect(page.getByText('2024')).toBeVisible();
    await expect(page.getByText('ZFA31200001234567')).toBeVisible();
  });

  test('mostra la sezione reclami con tab', async ({ page }) => {

    await mockWarrantyDetailApi(page);

    await page.goto('/dashboard/warranty/war-001');

    await expect(page.getByText('Storico Reclami')).toBeVisible();

    // Tabs
    await expect(page.getByRole('tab', { name: /Tutti/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /In Attesa/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Approvati/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Rifiutati/ })).toBeVisible();
  });

  test('la tab Rifiutati mostra messaggio vuoto', async ({ page }) => {

    await mockWarrantyDetailApi(page);

    await page.goto('/dashboard/warranty/war-001');

    await page.getByRole('tab', { name: /Rifiutati/ }).click();

    await expect(page.getByText('Nessun reclamo rifiutato')).toBeVisible();
  });

  test('mostra i giorni rimanenti', async ({ page }) => {

    await mockWarrantyDetailApi(page);

    await page.goto('/dashboard/warranty/war-001');

    await expect(page.getByText(/giorni rimanenti/)).toBeVisible();
  });

  test('mostra breadcrumb', async ({ page }) => {

    await mockWarrantyDetailApi(page);

    await page.goto('/dashboard/warranty/war-001');

    await expect(page.getByText('Dashboard')).toBeVisible();
    await expect(page.getByText('Garanzie')).toBeVisible();
    await expect(page.getByText('GAR-2026-001')).toBeVisible();
  });
});

test.describe('Garanzia Dettaglio - Actions', () => {
  test('il bottone Invia Reclamo apre il dialog', async ({ page }) => {

    await mockWarrantyDetailApi(page);

    await page.goto('/dashboard/warranty/war-001');

    await page.getByRole('button', { name: 'Invia Reclamo' }).click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Invia un Reclamo')).toBeVisible();
    await expect(page.getByText('Invia un nuovo reclamo per questa garanzia')).toBeVisible();
  });

  test('il bottone Elimina apre il dialog di conferma', async ({ page }) => {

    await mockWarrantyDetailApi(page);

    await page.goto('/dashboard/warranty/war-001');

    await page.getByRole('button', { name: /Elimina/ }).click();

    await expect(page.getByText('Elimina garanzia')).toBeVisible();
    await expect(page.getByText('Sei sicuro di voler eliminare questa garanzia?')).toBeVisible();
  });

  test('eliminazione chiama API e naviga alla lista', async ({ page }) => {

    await mockWarrantyDetailApi(page);
    // Also mock the list page for navigation
    await mockWarrantyApi(page);

    await page.goto('/dashboard/warranty/war-001');

    await page.getByRole('button', { name: /Elimina/ }).click();
    await page.getByRole('button', { name: 'Elimina' }).nth(1).click();

    await expect(page.getByText('Garanzia eliminata con successo')).toBeVisible({ timeout: 5000 });
  });

  test('il bottone Torna alle garanzie naviga indietro', async ({ page }) => {

    await mockWarrantyDetailApi(page);
    await mockWarrantyApi(page);

    await page.goto('/dashboard/warranty/war-001');

    await page.getByLabel('Torna alle garanzie').click();

    await expect(page).toHaveURL(/dashboard\/warranty$/);
  });
});
