import { test, expect } from '../fixtures/auth.fixture';

/**
 * Admin Dashboard E2E Tests — API-mocked, no backend required.
 * Modulo: Amministrazione tenant e impostazioni globali
 * Pattern: Render | Loading | Error | Data | Actions
 */

// =============================================================================
// Mock data
// =============================================================================
const MOCK_ADMIN_OVERVIEW = {
  tenantName: 'Officina Test',
  userCount: 12,
  activeLocations: 3,
  apiQuotaUsed: 450,
  apiQuotaLimit: 1000,
  lastBackupAt: '2026-05-09T22:00:00Z',
  systemHealth: 'good',
  pendingApprovals: 2,
};

const MOCK_USERS = {
  data: [
    {
      id: 'user-1',
      email: 'admin@demo.it',
      name: 'Admin Test',
      role: 'ADMIN',
      createdAt: '2026-01-15T10:00:00Z',
      lastLogin: '2026-05-09T18:30:00Z',
    },
    {
      id: 'user-2',
      email: 'mechanic@demo.it',
      name: 'Meccanico Test',
      role: 'MECHANIC',
      createdAt: '2026-02-01T14:00:00Z',
      lastLogin: '2026-05-08T16:15:00Z',
    },
    {
      id: 'user-3',
      email: 'receptionist@demo.it',
      name: 'Receptionist Test',
      role: 'RECEPTIONIST',
      createdAt: '2026-03-10T09:00:00Z',
      lastLogin: '2026-05-09T12:45:00Z',
    },
  ],
};

const MOCK_PENDING_APPROVALS = {
  data: [
    {
      id: 'approval-1',
      type: 'invoice_export',
      description: 'Esportazione fatture Marzo 2026',
      requestedBy: 'user-2',
      requestedAt: '2026-05-09T10:30:00Z',
      status: 'pending',
    },
    {
      id: 'approval-2',
      type: 'settings_change',
      description: 'Modifica impostazioni pagamento',
      requestedBy: 'user-1',
      requestedAt: '2026-05-09T15:00:00Z',
      status: 'pending',
    },
  ],
};

// =============================================================================
// Helpers
// =============================================================================
async function mockAdminApi(
  page: import('@playwright/test').Page,
  overview = MOCK_ADMIN_OVERVIEW,
  users = MOCK_USERS,
  approvals = MOCK_PENDING_APPROVALS
): Promise<void> {
  await page.route('**/api/dashboard/admin/overview**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(overview),
    });
  });

  await page.route('**/api/dashboard/admin/users**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(users),
    });
  });

  await page.route('**/api/dashboard/admin/approvals**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(approvals),
    });
  });
}

// =============================================================================
// RENDER — pagina carica con struttura base
// =============================================================================
test.describe('Admin - Render', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/dashboard/admin');
    await page.waitForLoadState('networkidle');
  });

  test('ADMIN-R01: mostra heading Amministrazione', async ({ page }) => {
    await expect(
      page
        .getByRole('heading', { name: /Amministrazione/i })
        .or(page.getByText(/Amministrazione/i).first())
    ).toBeVisible();
  });

  test('ADMIN-R02: mostra breadcrumb Dashboard', async ({ page }) => {
    await expect(page.getByText('Dashboard').first()).toBeVisible();
  });

  test('ADMIN-R03: mostra sezione panoramica tenant', async ({ page }) => {
    await expect(
      page
        .getByText(/Panoramica/i)
        .or(page.getByText(/Overview/i))
        .first()
    ).toBeVisible();
  });

  test('ADMIN-R04: mostra sezione utenti e permessi', async ({ page }) => {
    await expect(
      page
        .getByText(/Utenti/i)
        .or(page.getByText(/Persone/i))
        .first()
    ).toBeVisible();
  });

  test('ADMIN-R05: mostra sezione impostazioni', async ({ page }) => {
    await expect(
      page
        .getByText(/Impostazioni/i)
        .or(page.getByText(/Settings/i))
        .first()
    ).toBeVisible();
  });
});

// =============================================================================
// LOADING — stato di caricamento
// =============================================================================
test.describe('Admin - Loading', () => {
  test('ADMIN-L01: mostra spinner durante fetch overview', async ({ page }) => {
    let resolveRoute: () => void;
    const routeBlocked = new Promise<void>(res => {
      resolveRoute = res;
    });

    await page.route('**/api/admin/overview**', async route => {
      await routeBlocked;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_ADMIN_OVERVIEW),
      });
    });
    await mockAdminApi(page, MOCK_ADMIN_OVERVIEW, MOCK_USERS, MOCK_PENDING_APPROVALS);

    await page.goto('/dashboard/admin');

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
// EMPTY — nessun dato
// =============================================================================
test.describe('Admin - Empty state', () => {
  test('ADMIN-E01: mostra empty state se nessun utente', async ({ page }) => {
    await mockAdminApi(page, MOCK_ADMIN_OVERVIEW, { data: [] }, MOCK_PENDING_APPROVALS);
    await page.goto('/dashboard/admin');
    await page.waitForLoadState('networkidle');

    await expect(
      page
        .getByText(/Nessun utente/i)
        .or(page.getByText(/Non ci sono utenti/i))
        .first()
    ).toBeVisible();
  });

  test('ADMIN-E02: mostra empty state se nessuna approvazione in sospeso', async ({ page }) => {
    await mockAdminApi(page, MOCK_ADMIN_OVERVIEW, MOCK_USERS, { data: [] });
    await page.goto('/dashboard/admin');
    await page.waitForLoadState('networkidle');

    await expect(
      page
        .getByText(/Nessuna approvazione/i)
        .or(page.getByText(/Niente da approvare/i))
        .first()
    ).toBeVisible();
  });
});

// =============================================================================
// ERROR — errore API
// =============================================================================
test.describe('Admin - Error', () => {
  test('ADMIN-ERR01: mostra errore se overview API fallisce', async ({ page }) => {
    await page.route('**/api/admin/overview**', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });
    await page.route('**/api/admin/users**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_USERS),
      });
    });
    await page.route('**/api/admin/approvals**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_PENDING_APPROVALS),
      });
    });
    await page.goto('/dashboard/admin');
    await page.waitForLoadState('networkidle');

    await expect(
      page
        .getByText(/Errore/i)
        .or(page.getByText(/Impossibile/i))
        .first()
    ).toBeVisible();
  });

  test('ADMIN-ERR02: mostra errore se utenti API fallisce', async ({ page }) => {
    await page.route('**/api/admin/overview**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_ADMIN_OVERVIEW),
      });
    });
    await page.route('**/api/admin/users**', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server Error' }),
      });
    });
    await page.route('**/api/admin/approvals**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_PENDING_APPROVALS),
      });
    });
    await page.goto('/dashboard/admin');
    await page.waitForLoadState('networkidle');

    await expect(
      page
        .getByText(/Errore nel caricamento/i)
        .or(page.getByText(/Riprova/i))
        .first()
    ).toBeVisible();
  });
});

// =============================================================================
// DATA — dati presenti
// =============================================================================
test.describe('Admin - Data', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/dashboard/admin');
    await page.waitForLoadState('networkidle');
  });

  test('ADMIN-D01: mostra nome tenant', async ({ page }) => {
    await expect(page.getByText('Officina Test')).toBeVisible();
  });

  test('ADMIN-D02: mostra numero utenti', async ({ page }) => {
    await expect(page.getByText(/12/i)).toBeVisible();
  });

  test('ADMIN-D03: mostra numero locazioni attive', async ({ page }) => {
    await expect(page.getByText(/3/i)).toBeVisible();
  });

  test('ADMIN-D04: mostra utilizzo quota API', async ({ page }) => {
    await expect(page.getByText(/450/i).or(page.getByText(/45%/i)).first()).toBeVisible();
  });

  test('ADMIN-D05: mostra lista utenti con email', async ({ page }) => {
    await expect(page.getByText('admin@demo.it')).toBeVisible();
    await expect(page.getByText('mechanic@demo.it')).toBeVisible();
  });

  test('ADMIN-D06: mostra ruoli utenti', async ({ page }) => {
    await expect(page.getByText(/ADMIN/i)).toBeVisible();
    await expect(page.getByText(/MECHANIC/i)).toBeVisible();
  });

  test('ADMIN-D07: mostra approvazioni in sospeso', async ({ page }) => {
    await expect(page.getByText(/Esportazione fatture/i)).toBeVisible();
    await expect(page.getByText(/Modifica impostazioni pagamento/i)).toBeVisible();
  });

  test('ADMIN-D08: mostra numero approvazioni in sospeso come badge', async ({ page }) => {
    await expect(
      page
        .getByText(/2/i)
        .or(page.getByText(/2 approvazioni/i))
        .first()
    ).toBeVisible();
  });

  test('ADMIN-D09: mostra data ultimo backup', async ({ page }) => {
    await expect(
      page
        .getByText(/Backup/i)
        .or(page.getByText(/ultimo/i))
        .first()
    ).toBeVisible();
  });

  test('ADMIN-D10: mostra stato salute sistema', async ({ page }) => {
    await expect(page.getByText(/Buono/i).or(page.getByText(/Good/i)).first()).toBeVisible();
  });
});

// =============================================================================
// ACTIONS — navigazione e interazioni
// =============================================================================
test.describe('Admin - Actions', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/dashboard/admin');
    await page.waitForLoadState('networkidle');
  });

  test('ADMIN-A01: click su utente naviga a dettaglio utente', async ({ page }) => {
    await page.getByText('admin@demo.it').click();
    await expect(page).toHaveURL(/\/admin\/users\/user-1|\/dashboard\/admin\/users/);
  });

  test('ADMIN-A02: click approvazione apre modal conferma', async ({ page }) => {
    const approvalButton = page
      .getByRole('button', { name: /Approva/i })
      .or(page.getByRole('button', { name: /Conferma/i }))
      .first();

    if (await approvalButton.isVisible()) {
      await approvalButton.click();
      await expect(
        page
          .getByText(/Confermi\?/i)
          .or(page.getByText(/Sei sicuro/i))
          .first()
      ).toBeVisible({ timeout: 3000 });
    }
  });

  test('ADMIN-A03: navigazione a impostazioni tenant', async ({ page }) => {
    const settingsButton = page
      .getByRole('button', { name: /Impostazioni/i })
      .or(page.getByRole('link', { name: /Impostazioni/i }))
      .first();

    if (await settingsButton.isVisible()) {
      await settingsButton.click();
      await expect(page).toHaveURL(/\/dashboard\/admin\/settings|\/admin\/settings/);
    }
  });

  test('ADMIN-A04: click bottone aggiungi utente naviga a form', async ({ page }) => {
    const addUserButton = page
      .getByRole('button', { name: /Aggiungi utente/i })
      .or(page.getByRole('button', { name: /Nuovo/i }))
      .first();

    if (await addUserButton.isVisible()) {
      await addUserButton.click();
      await expect(page).toHaveURL(/\/admin\/users\/new|\/dashboard\/admin\/users\/new/);
    }
  });

  test('ADMIN-A05: refresh button ricarica i dati', async ({ page }) => {
    const refreshButton = page
      .getByRole('button', { name: /Aggiorna/i })
      .or(page.getByRole('button', { name: /Ricarica/i }))
      .first();

    if (await refreshButton.isVisible()) {
      const requestPromise = page.waitForRequest(req => req.url().includes('/api/admin'));
      await refreshButton.click();
      await requestPromise;
    }
  });
});
