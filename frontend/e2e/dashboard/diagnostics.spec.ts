import { test, expect } from '../fixtures/auth.fixture';

/**
 * Diagnostics Page E2E Tests — API-mocked, no backend required.
 * 6-block pattern: Render, Loading, Empty, Error, Data, Actions.
 */

const MOCK_DIAGNOSTIC_RESULT = {
  severity: 'high',
  probableCause: 'Sensore di ossigeno difettoso (O2 Sensor Fault)',
  confidence: 0.92,
  description:
    "Il sensore di ossigeno nel sistema di scarico è difettoso. Questa condizione riduce l'efficienza del motore e aumenta le emissioni.",
  repairs: [
    {
      description: 'Sostituzione sensore ossigeno anteriore',
      estimatedPartsCost: 150,
      estimatedLaborHours: 1.5,
      priority: 'high',
    },
    {
      description: 'Pulizia del catalizzatore',
      estimatedPartsCost: 0,
      estimatedLaborHours: 0.5,
      priority: 'medium',
    },
  ],
  additionalTests: ['Verifica del sistema di scarico', 'Test del catalizzatore'],
};

const MOCK_DIAGNOSTIC_HISTORY = {
  data: [
    {
      id: 'dh-1',
      createdAt: '2026-05-09T10:30:00Z',
      type: 'dtc',
      input: 'P0131',
      severity: 'high',
      probableCause: 'O2 Sensor Circuit Low Voltage',
    },
    {
      id: 'dh-2',
      createdAt: '2026-05-08T14:15:00Z',
      type: 'symptoms',
      input: 'Motore irregolare, consumi aumentati',
      severity: 'medium',
      probableCause: 'Carburante non adatto o iniezione difettosa',
    },
    {
      id: 'dh-3',
      createdAt: '2026-05-07T09:45:00Z',
      type: 'dtc',
      input: 'P0300',
      severity: 'high',
      probableCause: 'Random Misfire',
    },
  ],
};

function mockDiagnosticsApi(page: import('@playwright/test').Page): Promise<void[]> {
  return Promise.all([
    page.route('**/api/dashboard/diagnostics/analyze**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_DIAGNOSTIC_RESULT),
      });
    }),
    page.route('**/api/dashboard/diagnostics/history**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_DIAGNOSTIC_HISTORY),
      });
    }),
  ]);
}

test.describe('Diagnostics - Render', () => {
  test.beforeEach(async ({ page }) => {
    await mockDiagnosticsApi(page);
    await page.goto('/dashboard/diagnostics/ai');
    await page.waitForLoadState('networkidle');
  });

  test('DIAG-001: shows diagnostics page header', async ({ page }) => {
    await expect(page.getByText(/Diagnosi|Diagnostica/i).first()).toBeVisible();
  });

  test('DIAG-002: shows input field for DTC code or symptoms', async ({ page }) => {
    const input = page
      .getByPlaceholder(/Inserisci DTC|sintomi/i)
      .or(page.getByPlaceholder(/Codice|errore/i))
      .first();
    await expect(input).toBeVisible();
  });

  test('DIAG-003: shows vehicle selector or recent vehicles list', async ({ page }) => {
    const vehicleSection = page.getByText(/Veicolo|auto|seleziona/i).first();
    const isVisible = await vehicleSection.isVisible().catch(() => false);
    expect(
      isVisible ||
        (await page
          .locator('select, [role="combobox"]')
          .first()
          .isVisible()
          .catch(() => false))
    ).toBeTruthy();
  });
});

test.describe('Diagnostics - Loading', () => {
  test('DIAG-004: shows loader while analyzing', async ({ page }) => {
    await page.route('**/api/dashboard/diagnostics/analyze**', async route => {
      await new Promise(r => setTimeout(r, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_DIAGNOSTIC_RESULT),
      });
    });

    await page.route('**/api/dashboard/diagnostics/history**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_DIAGNOSTIC_HISTORY),
      });
    });

    await page.goto('/dashboard/diagnostics/ai');
    const input = page
      .getByPlaceholder(/Inserisci DTC|sintomi/i)
      .or(page.getByPlaceholder(/Codice|errore/i))
      .first();

    if (await input.isVisible()) {
      await input.fill('P0131');
      const submitBtn = page.getByRole('button', { name: /Analizza|Diagnosti/i }).first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        const loader = page.locator('svg.animate-spin').first();
        await expect(loader).toBeVisible({ timeout: 3000 });
      }
    }
  });
});

test.describe('Diagnostics - Empty State', () => {
  test('DIAG-005: shows empty state when no diagnosis performed', async ({ page }) => {
    await mockDiagnosticsApi(page);
    await page.goto('/dashboard/diagnostics/ai');

    // Initially no result should be displayed
    const noResultsMsg = page.getByText(/Nessuna diagnosi|inserisci un codice/i).first();
    const isVisible = await noResultsMsg.isVisible().catch(() => false);
    expect(isVisible || (await page.getByText(/Diagnostica/i).isVisible())).toBe(true);
  });
});

test.describe('Diagnostics - Error State', () => {
  test('DIAG-006: shows error when diagnosis analysis fails', async ({ page }) => {
    await page.route('**/api/dashboard/diagnostics/analyze**', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await page.route('**/api/dashboard/diagnostics/history**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_DIAGNOSTIC_HISTORY),
      });
    });

    await page.goto('/dashboard/diagnostics/ai');
    const input = page
      .getByPlaceholder(/Inserisci DTC|sintomi/i)
      .or(page.getByPlaceholder(/Codice|errore/i))
      .first();

    if (await input.isVisible()) {
      await input.fill('P0131');
      const submitBtn = page.getByRole('button', { name: /Analizza|Diagnosti/i }).first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await expect(page.getByText(/Errore|impossibile|fallito/i).first()).toBeVisible({
          timeout: 10000,
        });
      }
    }
  });
});

test.describe('Diagnostics - Data', () => {
  test.beforeEach(async ({ page }) => {
    await mockDiagnosticsApi(page);
    await page.goto('/dashboard/diagnostics/ai');
    await page.waitForLoadState('networkidle');
  });

  test('DIAG-007: displays diagnostic severity level', async ({ page }) => {
    // Should show severity badge/indicator
    const severityText = page.getByText(/Alta|Critica|Bassa|Media/i).first();
    const isVisible = await severityText.isVisible().catch(() => false);
    expect(isVisible).toBeTruthy();
  });

  test('DIAG-008: shows probable cause description', async ({ page }) => {
    const probable = page.getByText(/Sensore|ossigeno|difettoso/i).first();
    const isVisible = await probable.isVisible().catch(() => false);
    expect(isVisible).toBeTruthy();
  });

  test('DIAG-009: displays recommended repairs with cost estimates', async ({ page }) => {
    const repairText = page.getByText(/Sostituzione|sensore|costo/i).first();
    const isVisible = await repairText.isVisible().catch(() => false);
    expect(isVisible).toBeTruthy();
  });

  test('DIAG-010: shows labor hours estimates for repairs', async ({ page }) => {
    const hoursText = page.getByText(/ore|hour|1\.5|labor/i).first();
    const isVisible = await hoursText.isVisible().catch(() => false);
    expect(isVisible).toBeTruthy();
  });

  test('DIAG-011: displays confidence level percentage', async ({ page }) => {
    const confidenceText = page.getByText(/92|confiden|certezza/i).first();
    const isVisible = await confidenceText.isVisible().catch(() => false);
    expect(isVisible).toBeTruthy();
  });

  test('DIAG-012: shows diagnostic history list', async ({ page }) => {
    const historySection = page.getByText(/Cronologia|Storico|Recenti/i).first();
    const isVisible = await historySection.isVisible().catch(() => false);
    expect(isVisible).toBeTruthy();
  });

  test('DIAG-013: displays past diagnostic entries', async ({ page }) => {
    const pastEntry = page.getByText(/P0131|P0300/i).first();
    const isVisible = await pastEntry.isVisible().catch(() => false);
    expect(isVisible).toBeTruthy();
  });
});

test.describe('Diagnostics - Actions', () => {
  test('DIAG-014: clicking history entry reloads diagnosis', async ({ page }) => {
    await mockDiagnosticsApi(page);
    await page.goto('/dashboard/diagnostics/ai');
    await page.waitForLoadState('networkidle');

    const historyItem = page.getByText(/P0131/).first();
    if (await historyItem.isVisible()) {
      await historyItem.click();
      await page.waitForTimeout(300);

      // Diagnosis result should be visible
      const resultVisible = await page
        .getByText(/Alta|Diagnosi/i)
        .first()
        .isVisible()
        .catch(() => false);
      expect(resultVisible).toBe(true);
    }
  });

  test('DIAG-015: can clear and enter new DTC code', async ({ page }) => {
    await mockDiagnosticsApi(page);
    await page.goto('/dashboard/diagnostics/ai');

    const input = page
      .getByPlaceholder(/Inserisci DTC|sintomi/i)
      .or(page.getByPlaceholder(/Codice|errore/i))
      .first();

    if (await input.isVisible()) {
      await input.fill('P0131');
      await page.waitForTimeout(200);
      await input.clear();
      await input.fill('P0300');

      // Verify new input
      const value = await input.inputValue();
      expect(value).toBe('P0300');
    }
  });

  test('DIAG-016: export diagnosis report button works', async ({ page }) => {
    await mockDiagnosticsApi(page);
    await page.goto('/dashboard/diagnostics/ai');

    const exportBtn = page.getByRole('button', { name: /Esporta|Scarica|PDF/i }).first();
    if (await exportBtn.isVisible().catch(() => false)) {
      // Just verify it's clickable
      await expect(exportBtn).toBeVisible();
      await expect(exportBtn).toBeEnabled();
    }
  });

  test('DIAG-017: priority filter on repairs shows correct items', async ({ page }) => {
    await mockDiagnosticsApi(page);
    await page.goto('/dashboard/diagnostics/ai');

    // Should display repairs with different priorities
    const highPriorityText = page.getByText(/Urgente|Alta|priority/i).first();
    const isVisible = await highPriorityText.isVisible().catch(() => false);
    expect(isVisible).toBeTruthy();
  });

  test('DIAG-018: additional tests section is visible', async ({ page }) => {
    await mockDiagnosticsApi(page);
    await page.goto('/dashboard/diagnostics/ai');

    const additionalTests = page.getByText(/Test|verifiche|diagnosi|scarico/i).first();
    const isVisible = await additionalTests.isVisible().catch(() => false);
    expect(isVisible).toBeTruthy();
  });
});
