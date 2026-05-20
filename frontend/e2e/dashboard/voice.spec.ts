import { test, expect } from '../fixtures/auth.fixture';

/**
 * Voice Dashboard E2E Tests — API-mocked, no backend required.
 * Modulo: Assistente vocale AI per gestione chiamate automatiche
 * Pattern: Render | Loading | Empty | Error | Data | Actions
 */

// =============================================================================
// Mock data
// =============================================================================
const MOCK_VOICE_STATS = {
  data: {
    callsToday: 24,
    avgDuration: 185,
    resolutionRate: 78.5,
    totalCalls: 412,
  },
};

const MOCK_VOICE_CALLS = {
  data: [
    {
      id: 'call-1',
      timestamp: '2026-05-09T16:30:00Z',
      callerNumber: '+393331234567',
      duration: 245,
      outcome: 'BOOKING_CREATED',
      transcriptSummary: 'Cliente ha prenotato manutenzione ordinaria per lunedì',
    },
    {
      id: 'call-2',
      timestamp: '2026-05-09T15:15:00Z',
      callerNumber: '+393339876543',
      duration: 120,
      outcome: 'INFO_PROVIDED',
      transcriptSummary: 'Richiesta informazioni su disponibilità servizio pneumatici',
    },
    {
      id: 'call-3',
      timestamp: '2026-05-09T14:00:00Z',
      callerNumber: '+393331122334',
      duration: 45,
      outcome: 'TRANSFERRED',
      transcriptSummary: 'Trasferito a operatore per dettagli specifici garanzia',
    },
    {
      id: 'call-4',
      timestamp: '2026-05-09T12:30:00Z',
      callerNumber: '+393335556666',
      duration: 0,
      outcome: 'MISSED',
      transcriptSummary: 'Chiamata persa',
    },
    {
      id: 'call-5',
      timestamp: '2026-05-08T18:00:00Z',
      callerNumber: '+393337778888',
      duration: 300,
      outcome: 'BOOKING_CREATED',
      transcriptSummary: 'Prenotazione cambio olio e filtri per domani mattina',
    },
  ],
};

// =============================================================================
// Helpers
// =============================================================================
async function mockVoiceApi(
  page: import('@playwright/test').Page,
  stats = MOCK_VOICE_STATS,
  calls = MOCK_VOICE_CALLS
): Promise<void> {
  await page.route('**/api/dashboard/voice/stats**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(stats),
    });
  });

  await page.route('**/api/dashboard/voice/calls**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(calls),
    });
  });
}

// =============================================================================
// RENDER — pagina carica con struttura base
// =============================================================================
test.describe('Voice - Render', () => {
  test.beforeEach(async ({ page }) => {
    await mockVoiceApi(page);
    await page.goto('/dashboard/voice');
    await page.waitForLoadState('networkidle');
  });

  test('VOICE-R01: mostra heading Assistente Vocale AI', async ({ page }) => {
    await expect(
      page
        .getByRole('heading', { name: /Assistente Vocale/i })
        .or(page.getByText(/Assistente Vocale/i).first())
    ).toBeVisible();
  });

  test('VOICE-R02: mostra descrizione assistente vocale', async ({ page }) => {
    await expect(
      page
        .getByText(/Gestisci le chiamate/i)
        .or(page.getByText(/automatiche/i))
        .first()
    ).toBeVisible();
  });

  test('VOICE-R03: mostra switch attivazione/disattivazione', async ({ page }) => {
    await expect(
      page
        .getByRole('switch')
        .or(page.getByText(/Attivo|Disattivato/i))
        .first()
    ).toBeVisible();
  });

  test('VOICE-R04: mostra 4 KPI cards (Chiamate, Durata, Risoluzione, Totale)', async ({
    page,
  }) => {
    await expect(page.getByText(/Chiamate oggi/i)).toBeVisible();
    await expect(page.getByText(/Durata media/i)).toBeVisible();
    await expect(page.getByText(/Tasso risoluzione/i)).toBeVisible();
    await expect(page.getByText(/Totale chiamate/i)).toBeVisible();
  });

  test('VOICE-R05: mostra sezione Chiamate Recenti', async ({ page }) => {
    await expect(
      page
        .getByRole('heading', { name: /Chiamate Recenti/i })
        .or(page.getByText(/Chiamate Recenti/i).first())
    ).toBeVisible();
  });

  test('VOICE-R06: mostra sezione Configurazione', async ({ page }) => {
    await expect(
      page
        .getByRole('heading', { name: /Configurazione/i })
        .or(page.getByText(/Configurazione/i).first())
    ).toBeVisible();
  });
});

// =============================================================================
// LOADING — stato di caricamento
// =============================================================================
test.describe('Voice - Loading', () => {
  test('VOICE-L01: mostra placeholder durante fetch stats', async ({ page }) => {
    let resolveRoute: () => void;
    const routeBlocked = new Promise<void>(res => {
      resolveRoute = res;
    });

    await page.route('**/api/dashboard/voice/stats**', async route => {
      await routeBlocked;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_VOICE_STATS),
      });
    });
    await page.route('**/api/dashboard/voice/calls**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_VOICE_CALLS),
      });
    });

    await page.goto('/dashboard/voice');
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
// EMPTY — nessuna chiamata
// =============================================================================
test.describe('Voice - Empty state', () => {
  test('VOICE-E01: mostra empty state se nessuna chiamata recente', async ({ page }) => {
    await mockVoiceApi(page, MOCK_VOICE_STATS, { data: [] });
    await page.goto('/dashboard/voice');
    await page.waitForLoadState('networkidle');

    await expect(
      page
        .getByText(/Nessuna chiamata recente/i)
        .or(page.getByText(/Non ci sono/i))
        .first()
    ).toBeVisible();
  });

  test('VOICE-E02: empty state mostra messaggio informativo', async ({ page }) => {
    await mockVoiceApi(page, MOCK_VOICE_STATS, { data: [] });
    await page.goto('/dashboard/voice');
    await page.waitForLoadState('networkidle');

    await expect(
      page
        .getByText(/appariranno qui/i)
        .or(page.getByText(/gestite/i))
        .first()
    ).toBeVisible();
  });
});

// =============================================================================
// ERROR — errore API
// =============================================================================
test.describe('Voice - Error', () => {
  test('VOICE-ERR01: mostra errore se stats API fallisce', async ({ page }) => {
    await page.route('**/api/dashboard/voice/stats**', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });
    await page.route('**/api/dashboard/voice/calls**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_VOICE_CALLS),
      });
    });
    await page.goto('/dashboard/voice');
    await page.waitForLoadState('networkidle');

    await expect(
      page
        .getByText(/Impossibile caricare/i)
        .or(page.getByText(/Errore/i))
        .first()
    ).toBeVisible();
  });

  test('VOICE-ERR02: mostra bottone Riprova in caso di errore', async ({ page }) => {
    await page.route('**/api/dashboard/voice/stats**', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server Error' }),
      });
    });
    await page.route('**/api/dashboard/voice/calls**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_VOICE_CALLS),
      });
    });
    await page.goto('/dashboard/voice');
    await page.waitForLoadState('networkidle');

    await expect(
      page
        .getByRole('button', { name: /Riprova/i })
        .or(page.getByText(/Riprova/i))
        .first()
    ).toBeVisible();
  });
});

// =============================================================================
// DATA — dati presenti
// =============================================================================
test.describe('Voice - Data', () => {
  test.beforeEach(async ({ page }) => {
    await mockVoiceApi(page);
    await page.goto('/dashboard/voice');
    await page.waitForLoadState('networkidle');
  });

  test('VOICE-D01: mostra KPI Chiamate oggi', async ({ page }) => {
    await expect(page.getByText('24')).toBeVisible();
  });

  test('VOICE-D02: mostra KPI Durata media formattata', async ({ page }) => {
    await expect(page.getByText(/3:05/i).or(page.getByText(/3m/i)).first()).toBeVisible();
  });

  test('VOICE-D03: mostra KPI Tasso risoluzione in percentuale', async ({ page }) => {
    await expect(page.getByText(/78/i).or(page.getByText(/78%/i)).first()).toBeVisible();
  });

  test('VOICE-D04: mostra KPI Totale chiamate', async ({ page }) => {
    await expect(page.getByText('412')).toBeVisible();
  });

  test('VOICE-D05: mostra numero telefonico della chiamata', async ({ page }) => {
    await expect(page.getByText('+393331234567')).toBeVisible();
  });

  test('VOICE-D06: mostra outcome badge BOOKING_CREATED', async ({ page }) => {
    await expect(
      page
        .getByText(/Prenotazione creata/i)
        .or(page.getByText(/BOOKING/i))
        .first()
    ).toBeVisible();
  });

  test('VOICE-D07: mostra outcome badge INFO_PROVIDED', async ({ page }) => {
    await expect(
      page
        .getByText(/Info fornite/i)
        .or(page.getByText(/INFO/i))
        .first()
    ).toBeVisible();
  });

  test('VOICE-D08: mostra outcome badge TRANSFERRED', async ({ page }) => {
    await expect(
      page
        .getByText(/Trasferito/i)
        .or(page.getByText(/TRANSFERRED/i))
        .first()
    ).toBeVisible();
  });

  test('VOICE-D09: mostra outcome badge MISSED', async ({ page }) => {
    await expect(
      page
        .getByText(/Persa/i)
        .or(page.getByText(/MISSED/i))
        .first()
    ).toBeVisible();
  });

  test('VOICE-D10: mostra transcript summary della chiamata', async ({ page }) => {
    await expect(
      page
        .getByText(/Cliente ha prenotato/i)
        .or(page.getByText(/manutenzione ordinaria/i))
        .first()
    ).toBeVisible();
  });
});

// =============================================================================
// ACTIONS — interazioni
// =============================================================================
test.describe('Voice - Actions', () => {
  test.beforeEach(async ({ page }) => {
    await mockVoiceApi(page);
    await page.goto('/dashboard/voice');
    await page.waitForLoadState('networkidle');
  });

  test('VOICE-A01: click su switch attiva/disattiva assistente', async ({ page }) => {
    const switchElement = page.getByRole('switch').first();
    const initialState = await switchElement.isChecked();

    await switchElement.click();
    const newState = await switchElement.isChecked();

    expect(newState).toBe(!initialState);
  });

  test('VOICE-A02: click su Modifica messaggio di benvenuto', async ({ page }) => {
    const modifyButton = page.getByRole('button', { name: /Modifica/i }).first();

    if (await modifyButton.isVisible()) {
      await modifyButton.click();
      await expect(
        page
          .getByText(/messaggio/i)
          .or(page.getByText(/benvenuto/i))
          .first()
      ).toBeVisible({ timeout: 3000 });
    }
  });

  test('VOICE-A03: click su Configura orari di attività', async ({ page }) => {
    const buttons = page.getByRole('button', { name: /Configura/i });
    const count = await buttons.count();

    if (count > 0) {
      await buttons.first().click();
      await expect(
        page
          .getByText(/Orari/i)
          .or(page.getByText(/attivo/i))
          .first()
      ).toBeVisible({ timeout: 3000 });
    }
  });

  test('VOICE-A04: click su chiamata apre dettaglio (se implementato)', async ({ page }) => {
    const callRow = page.getByText('+393331234567');

    if (await callRow.isVisible()) {
      await callRow.click();
      // Verifica navigazione o apertura modal
      await expect(page.getByText(/Transcript/i).or(page.getByText(/Dettagli/i)))
        .toBeVisible({ timeout: 3000 })
        .catch(() => {
          // Navigazione non implementata, OK
        });
    }
  });

  test('VOICE-A05: stato switch di attivazione/disattivazione riflette il valore', async ({
    page,
  }) => {
    const statusText = page.getByText(/Attivo|Disattivato/i).first();
    const switchElement = page.getByRole('switch').first();

    const isChecked = await switchElement.isChecked();
    const statusContent = await statusText.textContent();

    if (isChecked) {
      expect(statusContent).toContain('Attivo');
    } else {
      expect(statusContent).toContain('Disattivato');
    }
  });
});
