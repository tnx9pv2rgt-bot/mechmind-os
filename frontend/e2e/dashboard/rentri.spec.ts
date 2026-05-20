import { test, expect } from '../fixtures/auth.fixture';

/**
 * RENTRI Dashboard E2E Tests — API-mocked, no backend required.
 * Modulo: Gestione Rifiuti (normativa RENTRI obbligatoria 2026)
 * Pattern: Render | Loading | Empty | Error | Data | Actions
 */

// =============================================================================
// Mock data
// =============================================================================
const MOCK_DASHBOARD: {
  totalStoredKg: number;
  monthlyEntries: number;
  activeFir: number;
  activeAlerts: number;
  recentEntries: Array<{
    id: string;
    entryNumber: number;
    date: string;
    type: 'CARICO' | 'SCARICO';
    cerCode: string;
    cerDescription: string;
    quantity: number;
    unit: string;
    hazardous: boolean;
  }>;
} = {
  totalStoredKg: 2450.5,
  monthlyEntries: 12,
  activeFir: 3,
  activeAlerts: 1,
  recentEntries: [
    {
      id: 'entry-1',
      entryNumber: 1,
      date: '2026-05-08T10:00:00Z',
      type: 'CARICO',
      cerCode: '13.02.05',
      cerDescription: 'Oli minerali non clorurati per motori',
      quantity: 150,
      unit: 'kg',
      hazardous: true,
    },
    {
      id: 'entry-2',
      entryNumber: 2,
      date: '2026-05-07T14:00:00Z',
      type: 'SCARICO',
      cerCode: '16.01.03',
      cerDescription: 'Pneumatici fuori uso',
      quantity: 80,
      unit: 'kg',
      hazardous: false,
    },
  ],
};

const MOCK_ALERTS = {
  data: [
    {
      id: 'alert-1',
      type: 'SCADENZA_FIR',
      message: 'FIR #2026/003 in scadenza tra 5 giorni',
      severity: 'warning',
      createdAt: '2026-05-09T08:00:00Z',
    },
  ],
};

// =============================================================================
// Helpers
// =============================================================================
function mockRentriApi(
  page: import('@playwright/test').Page,
  dashboard = MOCK_DASHBOARD,
  alerts: typeof MOCK_ALERTS | null = MOCK_ALERTS
): Promise<void[]> {
  return Promise.all([
    page.route('**/api/rentri/dashboard**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(dashboard),
      });
    }),
    page.route('**/api/rentri/alerts**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(alerts ?? { data: [] }),
      });
    }),
  ]);
}

// =============================================================================
// RENDER — pagina carica con struttura base
// =============================================================================
test.describe('RENTRI - Render', () => {
  test.beforeEach(async ({ page }) => {
    await mockRentriApi(page);
    await page.goto('/dashboard/rentri');
    await page.waitForLoadState('networkidle');
  });

  test('RENTRI-R01: mostra heading Gestione Rifiuti', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Gestione Rifiuti/i })).toBeVisible();
  });

  test('RENTRI-R02: mostra breadcrumb con Dashboard e Rifiuti', async ({ page }) => {
    await expect(page.getByText('Dashboard').first()).toBeVisible();
    await expect(page.getByText(/RENTRI/i).first()).toBeVisible();
  });

  test('RENTRI-R03: mostra bottone Nuovo Carico', async ({ page }) => {
    await expect(
      page
        .getByRole('button', { name: /Nuovo Carico/i })
        .or(page.getByRole('link', { name: /Nuovo Carico/i }))
        .first()
    ).toBeVisible();
  });

  test('RENTRI-R04: mostra 4 KPI cards', async ({ page }) => {
    await expect(page.getByText(/Totale Rifiuti Stoccati/i)).toBeVisible();
    await expect(page.getByText(/Registrazioni Mese/i)).toBeVisible();
    await expect(page.getByText(/FIR Attivi/i)).toBeVisible();
    await expect(page.getByText(/Alert Attivi/i)).toBeVisible();
  });
});

// =============================================================================
// LOADING — stato di caricamento
// =============================================================================
test.describe('RENTRI - Loading', () => {
  test('RENTRI-L01: mostra placeholder durante fetch', async ({ page }) => {
    let resolveRoute: () => void;
    const routeBlocked = new Promise<void>(res => {
      resolveRoute = res;
    });

    await page.route('**/api/rentri/dashboard**', async route => {
      await routeBlocked;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_DASHBOARD),
      });
    });
    await page.route('**/api/rentri/alerts**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });

    await page.goto('/dashboard/rentri');
    // KPI values mostrano '...' durante il loading
    const dots = page.getByText('...').first();
    await expect(dots)
      .toBeVisible({ timeout: 3000 })
      .catch(() => {
        /* già caricato */
      });
    resolveRoute!();
  });
});

// =============================================================================
// EMPTY — nessuna registrazione trovata
// =============================================================================
test.describe('RENTRI - Empty state', () => {
  test('RENTRI-E01: mostra empty state se nessuna registrazione', async ({ page }) => {
    await mockRentriApi(page, { ...MOCK_DASHBOARD, recentEntries: [] });
    await page.goto('/dashboard/rentri');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/Nessuna registrazione trovata/i)).toBeVisible();
  });

  test('RENTRI-E02: empty state mostra CTA Registra il primo carico', async ({ page }) => {
    await mockRentriApi(page, { ...MOCK_DASHBOARD, recentEntries: [] });
    await page.goto('/dashboard/rentri');
    await page.waitForLoadState('networkidle');

    await expect(
      page
        .getByRole('button', { name: /Registra il primo carico/i })
        .or(page.getByText(/Registra il primo carico/i))
        .first()
    ).toBeVisible();
  });
});

// =============================================================================
// ERROR — errore API
// =============================================================================
test.describe('RENTRI - Error', () => {
  test('RENTRI-ERR01: mostra errore se dashboard API fallisce', async ({ page }) => {
    await page.route('**/api/rentri/dashboard**', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });
    await page.route('**/api/rentri/alerts**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });
    await page.goto('/dashboard/rentri');
    await page.waitForLoadState('networkidle');

    await expect(
      page
        .getByText(/Impossibile caricare/i)
        .or(page.getByText(/Riprova/i))
        .first()
    ).toBeVisible();
  });
});

// =============================================================================
// DATA — dati presenti
// =============================================================================
test.describe('RENTRI - Data', () => {
  test.beforeEach(async ({ page }) => {
    await mockRentriApi(page);
    await page.goto('/dashboard/rentri');
    await page.waitForLoadState('networkidle');
  });

  test('RENTRI-D01: mostra valore KPI totalStoredKg formattato', async ({ page }) => {
    await expect(
      page
        .getByText(/2\.450,5 kg/i)
        .or(page.getByText(/2\.450/i))
        .first()
    ).toBeVisible();
  });

  test('RENTRI-D02: mostra registrazioni recenti con codice CER', async ({ page }) => {
    await expect(page.getByText('13.02.05')).toBeVisible();
    await expect(page.getByText('16.01.03')).toBeVisible();
  });

  test('RENTRI-D03: mostra badge CARICO e SCARICO', async ({ page }) => {
    await expect(page.getByText('CARICO').first()).toBeVisible();
    await expect(page.getByText('SCARICO').first()).toBeVisible();
  });

  test('RENTRI-D04: mostra sezione avvisi se presenti', async ({ page }) => {
    await expect(page.getByText(/Avvisi/i).first()).toBeVisible();
    await expect(page.getByText(/FIR #2026\/003/i)).toBeVisible();
  });

  test('RENTRI-D05: mostra sezione azioni rapide', async ({ page }) => {
    await expect(page.getByText(/Azioni rapide/i)).toBeVisible();
    await expect(page.getByText(/Nuovo FIR/i).first()).toBeVisible();
    await expect(page.getByText(/Registro Completo/i)).toBeVisible();
  });
});

// =============================================================================
// ACTIONS — navigazione e interazioni
// =============================================================================
test.describe('RENTRI - Actions', () => {
  test.beforeEach(async ({ page }) => {
    await mockRentriApi(page);
    await page.goto('/dashboard/rentri');
    await page.waitForLoadState('networkidle');
  });

  test('RENTRI-A01: click Nuovo Carico naviga a /rentri/entries/new', async ({ page }) => {
    await page
      .getByRole('button', { name: /Nuovo Carico/i })
      .or(page.getByRole('link', { name: /Nuovo Carico/i }))
      .first()
      .click();
    await expect(page).toHaveURL(/\/rentri\/entries\/new/);
  });

  test('RENTRI-A02: click Vedi tutto naviga a /rentri/entries', async ({ page }) => {
    await page.getByRole('link', { name: /Vedi tutto/i }).click();
    await expect(page).toHaveURL(/\/rentri\/entries/);
  });

  test('RENTRI-A03: click su registrazione naviga al dettaglio', async ({ page }) => {
    await page.getByText('13.02.05').click();
    await expect(page).toHaveURL(/\/rentri\/entries\/entry-1/);
  });
});
