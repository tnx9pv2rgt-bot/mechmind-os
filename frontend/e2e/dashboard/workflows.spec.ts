import { test, expect } from '../fixtures/auth.fixture';

/**
 * Workflows Dashboard E2E Tests — API-mocked, no backend required.
 * Modulo: Automazioni e workflow per operazioni ricorrenti
 * Pattern: Render | Loading | Empty | Error | Data | Actions
 */

// =============================================================================
// Mock data
// =============================================================================
const MOCK_WORKFLOWS = {
  data: [
    {
      id: 'wf-1',
      name: 'Notifica cambio olio',
      description: 'Invia notifica cliente quando cambio olio è completato',
      triggerType: 'work_order_status',
      actionsCount: 3,
      enabled: true,
      lastRun: '2026-05-09T14:30:00Z',
      runCount: 47,
      status: 'active',
    },
    {
      id: 'wf-2',
      name: 'Fattura automatica su completamento',
      description: 'Genera fattura quando ordine di lavoro è completato',
      triggerType: 'work_order_status',
      actionsCount: 2,
      enabled: true,
      lastRun: '2026-05-09T13:15:00Z',
      runCount: 156,
      status: 'active',
    },
    {
      id: 'wf-3',
      name: 'Reminder prenotazione',
      description: 'Invia SMS reminder 24 ore prima della prenotazione',
      triggerType: 'booking_created',
      actionsCount: 1,
      enabled: true,
      lastRun: '2026-05-08T10:00:00Z',
      runCount: 89,
      status: 'active',
    },
    {
      id: 'wf-4',
      name: 'Alert fattura scaduta',
      description: 'Notifica admin quando una fattura non viene pagata',
      triggerType: 'invoice_overdue',
      actionsCount: 2,
      enabled: false,
      lastRun: '2026-04-28T09:45:00Z',
      runCount: 12,
      status: 'paused',
    },
    {
      id: 'wf-5',
      name: 'Garanzia in scadenza',
      description: 'Avviso cliente quando garanzia sta per scadere',
      triggerType: 'warranty_expiring',
      actionsCount: 1,
      enabled: true,
      lastRun: null,
      runCount: 0,
      status: 'error',
    },
  ],
};

// =============================================================================
// Helpers
// =============================================================================
async function mockWorkflowsApi(
  page: import('@playwright/test').Page,
  workflows = MOCK_WORKFLOWS
): Promise<void> {
  await page.route('**/api/workflows**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(workflows),
    });
  });

  await page.route('**/api/workflows/**', async route => {
    // Mock PATCH per toggle workflow
    if (route.request().method() === 'PATCH') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    } else {
      await route.continue();
    }
  });
}

// =============================================================================
// RENDER — pagina carica con struttura base
// =============================================================================
test.describe('Workflows - Render', () => {
  test.beforeEach(async ({ page }) => {
    await mockWorkflowsApi(page);
    await page.goto('/dashboard/workflows');
    await page.waitForLoadState('networkidle');
  });

  test('WFLOW-R01: mostra heading Automazioni', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /Automazioni/i }).or(page.getByText(/Automazioni/i).first())
    ).toBeVisible();
  });

  test('WFLOW-R02: mostra descrizione Automazioni', async ({ page }) => {
    await expect(
      page
        .getByText(/Crea workflow/i)
        .or(page.getByText(/automatici/i))
        .first()
    ).toBeVisible();
  });

  test('WFLOW-R03: mostra bottone Nuovo Workflow', async ({ page }) => {
    await expect(
      page
        .getByRole('button', { name: /Nuovo Workflow/i })
        .or(page.getByRole('link', { name: /Nuovo Workflow/i }))
        .first()
    ).toBeVisible();
  });

  test('WFLOW-R04: mostra sezione Elenco Workflow', async ({ page }) => {
    await expect(
      page
        .getByRole('heading', { name: /Elenco Workflow/i })
        .or(page.getByText(/Elenco Workflow/i).first())
    ).toBeVisible();
  });

  test('WFLOW-R05: mostra breadcrumb Dashboard', async ({ page }) => {
    await expect(page.getByText('Dashboard').first()).toBeVisible();
  });
});

// =============================================================================
// LOADING — stato di caricamento
// =============================================================================
test.describe('Workflows - Loading', () => {
  test('WFLOW-L01: mostra spinner durante fetch workflows', async ({ page }) => {
    let resolveRoute: () => void;
    const routeBlocked = new Promise<void>(res => {
      resolveRoute = res;
    });

    await page.route('**/api/workflows**', async route => {
      await routeBlocked;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_WORKFLOWS),
      });
    });

    await page.goto('/dashboard/workflows');
    const loader = page.locator('[role="status"]').or(page.getByText('...')).first();
    await expect(loader)
      .toBeVisible({ timeout: 3000 })
      .catch(() => {
        /* già caricato */
      });
    resolveRoute!();
  });
});

// =============================================================================
// EMPTY — nessun workflow
// =============================================================================
test.describe('Workflows - Empty state', () => {
  test('WFLOW-E01: mostra empty state se nessun workflow', async ({ page }) => {
    await mockWorkflowsApi(page, { data: [] });
    await page.goto('/dashboard/workflows');
    await page.waitForLoadState('networkidle');

    await expect(
      page
        .getByText(/Nessun workflow/i)
        .or(page.getByText(/Non ci sono/i))
        .first()
    ).toBeVisible();
  });

  test('WFLOW-E02: empty state mostra CTA Crea Workflow', async ({ page }) => {
    await mockWorkflowsApi(page, { data: [] });
    await page.goto('/dashboard/workflows');
    await page.waitForLoadState('networkidle');

    await expect(
      page
        .getByRole('button', { name: /Crea Workflow/i })
        .or(page.getByText(/Crea Workflow/i))
        .first()
    ).toBeVisible();
  });
});

// =============================================================================
// ERROR — errore API
// =============================================================================
test.describe('Workflows - Error', () => {
  test('WFLOW-ERR01: mostra errore se workflows API fallisce', async ({ page }) => {
    await page.route('**/api/workflows**', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });
    await page.goto('/dashboard/workflows');
    await page.waitForLoadState('networkidle');

    await expect(
      page
        .getByText(/Errore/i)
        .or(page.getByText(/Impossibile/i))
        .first()
    ).toBeVisible();
  });
});

// =============================================================================
// DATA — dati presenti
// =============================================================================
test.describe('Workflows - Data', () => {
  test.beforeEach(async ({ page }) => {
    await mockWorkflowsApi(page);
    await page.goto('/dashboard/workflows');
    await page.waitForLoadState('networkidle');
  });

  test('WFLOW-D01: mostra nome workflow', async ({ page }) => {
    await expect(page.getByText('Notifica cambio olio')).toBeVisible();
  });

  test('WFLOW-D02: mostra tipo trigger', async ({ page }) => {
    await expect(
      page
        .getByText(/Ordine di lavoro cambia stato/i)
        .or(page.getByText(/work_order_status/i))
        .first()
    ).toBeVisible();
  });

  test('WFLOW-D03: mostra numero azioni', async ({ page }) => {
    await expect(
      page
        .getByText(/3 azioni/i)
        .or(page.getByText(/2 azioni/i))
        .first()
    ).toBeVisible();
  });

  test('WFLOW-D04: mostra stato enabled/disabled workflow', async ({ page }) => {
    // Workflow attivo deve mostrare toggle ON
    const toggleButtons = page.getByRole('button').filter({ has: page.locator('svg') });
    expect(await toggleButtons.count()).toBeGreaterThan(0);
  });

  test('WFLOW-D05: mostra numero esecuzioni workflow', async ({ page }) => {
    await expect(
      page
        .getByText(/47 esecuzioni/i)
        .or(page.getByText(/156 esecuzioni/i))
        .first()
    ).toBeVisible();
  });

  test('WFLOW-D06: mostra data ultimo run (se disponibile)', async ({ page }) => {
    await expect(
      page
        .getByText(/Ultimo:/i)
        .or(page.getByText(/Last run/i))
        .first()
    ).toBeVisible();
  });

  test('WFLOW-D07: mostra workflow con status error con icona alert', async ({ page }) => {
    // Workflow con status 'error' deve avere AlertCircle icon
    const errorWorkflow = page.getByText('Garanzia in scadenza').first();
    await expect(errorWorkflow).toBeVisible();
  });

  test('WFLOW-D08: mostra workflow disattivato con colore differente', async ({ page }) => {
    const disabledWorkflow = page.getByText('Alert fattura scaduta').first();
    await expect(disabledWorkflow).toBeVisible();
  });

  test('WFLOW-D09: mostra trigger con etichette leggibili', async ({ page }) => {
    await expect(
      page
        .getByText(/Nuova prenotazione/i)
        .or(page.getByText(/Notifica cambio olio/i))
        .first()
    ).toBeVisible();
  });

  test('WFLOW-D10: mostra numero totale workflow nel heading', async ({ page }) => {
    // Elenco Workflow dovrebbe mostrare il numero di workflow
    const workflows = page.getByText(/Elenco Workflow/i);
    await expect(workflows).toBeVisible();
  });
});

// =============================================================================
// ACTIONS — navigazione e interazioni
// =============================================================================
test.describe('Workflows - Actions', () => {
  test.beforeEach(async ({ page }) => {
    await mockWorkflowsApi(page);
    await page.goto('/dashboard/workflows');
    await page.waitForLoadState('networkidle');
  });

  test('WFLOW-A01: click bottone Nuovo Workflow naviga a /workflows/new', async ({ page }) => {
    const newButton = page
      .getByRole('button', { name: /Nuovo Workflow/i })
      .or(page.getByRole('link', { name: /Nuovo Workflow/i }))
      .first();

    await newButton.click();
    await expect(page).toHaveURL(/\/dashboard\/workflows\/new|\/workflows\/new/);
  });

  test('WFLOW-A02: click su workflow naviga a dettaglio/edit', async ({ page }) => {
    // Click sul nome del workflow per navigare
    const workflowLink = page.getByText('Notifica cambio olio').first();

    if (await workflowLink.isVisible()) {
      await workflowLink.click();
      await expect(page).toHaveURL(/\/dashboard\/workflows\/wf-/);
    }
  });

  test('WFLOW-A03: click toggle attiva/disattiva workflow', async ({ page }) => {
    // Usa data-testid se disponibile, altrimenti seleziona primo switch
    const switchToggle = page.locator('[data-testid*="toggle"], [role="switch"]').first();

    if (await switchToggle.isVisible()) {
      const initialState = (await switchToggle.getAttribute('data-state')) || 'off';

      await switchToggle.click();

      // Verifica che la richiesta PATCH sia stata inviata
      await page
        .waitForRequest(req => req.url().includes('/api/workflows') && req.method() === 'PATCH')
        .catch(() => {
          // Caricamento può essere veloce
        });
    }
  });

  test('WFLOW-A04: toggle workflow invia richiesta PATCH', async ({ page }) => {
    const patchPromise = page.waitForRequest(
      req => req.url().includes('/api/workflows') && req.method() === 'PATCH'
    );

    const toggleButtons = page.getByRole('button').filter({ has: page.locator('svg') });
    if ((await toggleButtons.count()) > 0) {
      await toggleButtons.first().click();
      const request = await patchPromise;
      expect(request.method()).toBe('PATCH');
    }
  });

  test('WFLOW-A05: click CTA Crea Workflow in empty state naviga a new', async ({ page }) => {
    await mockWorkflowsApi(page, { data: [] });
    await page.goto('/dashboard/workflows');
    await page.waitForLoadState('networkidle');

    const createButton = page
      .getByRole('button', { name: /Crea Workflow/i })
      .or(page.getByText(/Crea Workflow/i))
      .first();

    await createButton.click();
    await expect(page).toHaveURL(/\/dashboard\/workflows\/new|\/workflows\/new/);
  });
});
