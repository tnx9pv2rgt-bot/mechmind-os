import { test, expect } from '../fixtures/auth.fixture';
import type { Page } from '@playwright/test';

const MOCK_CANNED_JOBS = [
  {
    id: 'cj-001',
    name: 'Tagliando 30.000 km',
    description: 'Tagliando completo con cambio olio, filtri e controllo freni',
    category: 'Manutenzione ordinaria',
    totalPrice: 189.0,
    lines: [
      { id: 'line-001', type: 'LABOR', description: 'Manodopera tagliando', quantity: 1, unitPrice: 80, laborHours: 1.5 },
      { id: 'line-002', type: 'PART', description: 'Olio motore 5W30 4L', quantity: 1, unitPrice: 45, laborHours: 0 },
      { id: 'line-003', type: 'PART', description: 'Filtro olio', quantity: 1, unitPrice: 12, laborHours: 0 },
    ],
  },
  {
    id: 'cj-002',
    name: 'Sostituzione Pastiglie Freno Anteriori',
    description: 'Sostituzione pastiglie e controllo dischi',
    category: 'Manutenzione straordinaria',
    totalPrice: 250.0,
    lines: [
      { id: 'line-004', type: 'LABOR', description: 'Manodopera sostituzione', quantity: 1, unitPrice: 100, laborHours: 2 },
      { id: 'line-005', type: 'PART', description: 'Pastiglie freno anteriori', quantity: 1, unitPrice: 75, laborHours: 0 },
    ],
  },
  {
    id: 'cj-003',
    name: 'Ricarica Climatizzatore',
    description: 'Ricarica gas R134a con controllo perdite',
    category: 'Climatizzazione',
    totalPrice: 120.0,
    lines: [
      { id: 'line-006', type: 'LABOR', description: 'Ricarica e diagnosi', quantity: 1, unitPrice: 60, laborHours: 1 },
      { id: 'line-007', type: 'PART', description: 'Gas R134a', quantity: 1, unitPrice: 60, laborHours: 0 },
    ],
  },
];

function mockCannedJobsApi(page: Page, data: unknown[] = MOCK_CANNED_JOBS): Promise<void> {
  return page.route('**/api/canned-jobs*', (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
    } else {
      route.continue();
    }
  });
}

test.describe('Template Lavoro - Render', () => {
  test('la pagina si carica con il titolo visibile e zero errori console', async ({ page }) => {

    await mockCannedJobsApi(page);

    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/dashboard/canned-jobs');

    await expect(page.getByRole('heading', { name: 'Template Lavoro' })).toBeVisible();
    await expect(page.getByText('Modelli predefiniti per velocizzare preventivi e ordini di lavoro')).toBeVisible();
    expect(errors).toHaveLength(0);
  });
});

test.describe('Template Lavoro - Loading', () => {
  test('mostra spinner durante il caricamento', async ({ page }) => {


    await page.route('**/api/canned-jobs*', (route) =>
      setTimeout(() => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }), 3000),
    );

    await page.goto('/dashboard/canned-jobs');

    await expect(page.locator('.animate-spin').first()).toBeVisible({ timeout: 2000 });
  });
});

test.describe('Template Lavoro - Empty State', () => {
  test('mostra messaggio vuoto con CTA', async ({ page }) => {

    await mockCannedJobsApi(page, []);

    await page.goto('/dashboard/canned-jobs');

    await expect(page.getByText('Nessun template. Crea il primo template per velocizzare i preventivi.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Crea il primo template' })).toBeVisible();
  });
});

test.describe('Template Lavoro - Error State', () => {
  test('mostra errore e bottone Riprova quando API restituisce 500', async ({ page }) => {


    await page.route('**/api/canned-jobs*', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Internal Server Error' }) }),
    );

    await page.goto('/dashboard/canned-jobs');

    await expect(page.getByText('Impossibile caricare i template di lavoro')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Riprova' })).toBeVisible();
  });

  test('il bottone Riprova ricarica i dati', async ({ page }) => {

    let callCount = 0;

    await page.route('**/api/canned-jobs*', (route) => {
      callCount++;
      if (callCount <= 1) {
        route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'fail' }) });
      } else {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_CANNED_JOBS) });
      }
    });

    await page.goto('/dashboard/canned-jobs');
    await expect(page.getByText('Impossibile caricare i template di lavoro')).toBeVisible();

    await page.getByRole('button', { name: 'Riprova' }).click();
    await expect(page.getByText('Tagliando 30.000 km')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Template Lavoro - Data', () => {
  test('visualizza i template raggruppati per categoria', async ({ page }) => {

    await mockCannedJobsApi(page);

    await page.goto('/dashboard/canned-jobs');

    // Verify category headers
    await expect(page.getByText('Manutenzione ordinaria').first()).toBeVisible();
    await expect(page.getByText('Manutenzione straordinaria').first()).toBeVisible();
    await expect(page.getByText('Climatizzazione').first()).toBeVisible();

    // Verify template names
    await expect(page.getByText('Tagliando 30.000 km')).toBeVisible();
    await expect(page.getByText('Sostituzione Pastiglie Freno Anteriori')).toBeVisible();
    await expect(page.getByText('Ricarica Climatizzatore')).toBeVisible();
  });

  test('mostra il numero di righe e il prezzo totale', async ({ page }) => {

    await mockCannedJobsApi(page);

    await page.goto('/dashboard/canned-jobs');

    await expect(page.getByText('3 righe').first()).toBeVisible();
    await expect(page.getByText('2 righe').first()).toBeVisible();
  });

  test('la ricerca funziona', async ({ page }) => {

    await mockCannedJobsApi(page);

    await page.goto('/dashboard/canned-jobs');

    await page.getByLabel('Cerca template').fill('Tagliando');

    await expect(page.getByText('Tagliando 30.000 km')).toBeVisible();
    await expect(page.getByText('Sostituzione Pastiglie Freno Anteriori')).not.toBeVisible();
    await expect(page.getByText('Ricarica Climatizzatore')).not.toBeVisible();
  });

  test('il filtro per categoria funziona', async ({ page }) => {

    await mockCannedJobsApi(page);

    await page.goto('/dashboard/canned-jobs');

    await page.locator('select').selectOption('Climatizzazione');

    await expect(page.getByText('Ricarica Climatizzatore')).toBeVisible();
    await expect(page.getByText('Tagliando 30.000 km')).not.toBeVisible();
  });
});

test.describe('Template Lavoro - Actions', () => {
  test('"Nuovo Template" apre il modal di creazione', async ({ page }) => {

    await mockCannedJobsApi(page);

    await page.goto('/dashboard/canned-jobs');

    await page.getByRole('button', { name: 'Nuovo Template' }).click();

    await expect(page.getByText('Nuovo Template')).toBeVisible();
    await expect(page.getByLabelText('Nome *')).toBeVisible();
    await expect(page.getByText('Crea Template')).toBeVisible();
  });

  test('il form valida i campi obbligatori', async ({ page }) => {

    await mockCannedJobsApi(page);

    await page.goto('/dashboard/canned-jobs');
    await page.getByRole('button', { name: 'Nuovo Template' }).click();

    // Clear the name field and submit
    await page.locator('#job-name').fill('');
    // Clear the description in the first line
    await page.getByRole('button', { name: 'Crea Template' }).click();

    await expect(page.getByText('Il nome del template è obbligatorio')).toBeVisible();
  });

  test('il form con righe funziona - aggiungi riga', async ({ page }) => {

    await mockCannedJobsApi(page);

    await page.goto('/dashboard/canned-jobs');
    await page.getByRole('button', { name: 'Nuovo Template' }).click();

    // Initially 1 line
    const linesBefore = await page.locator('[aria-label^="Tipo riga"]').count();
    expect(linesBefore).toBe(1);

    // Add a line
    await page.getByRole('button', { name: 'Aggiungi riga' }).click();

    const linesAfter = await page.locator('[aria-label^="Tipo riga"]').count();
    expect(linesAfter).toBe(2);
  });

  test('il bottone Modifica apre il modal con i dati', async ({ page }) => {

    await mockCannedJobsApi(page);

    await page.goto('/dashboard/canned-jobs');

    await page.getByRole('button', { name: 'Modifica' }).first().click();

    await expect(page.getByText('Modifica Template')).toBeVisible();
    await expect(page.locator('#job-name')).toHaveValue('Tagliando 30.000 km');
    await expect(page.getByRole('button', { name: 'Salva Modifiche' })).toBeVisible();
  });

  test('il bottone Elimina apre il dialog di conferma', async ({ page }) => {

    await mockCannedJobsApi(page);

    await page.goto('/dashboard/canned-jobs');

    // Click the delete button (trash icon, no text)
    await page.locator('button:has(svg.text-red-500)').first().click();

    await expect(page.getByText('Elimina Template')).toBeVisible();
    await expect(page.getByText("Sei sicuro di voler eliminare questo template?")).toBeVisible();
    await expect(page.getByRole('button', { name: 'Elimina' })).toBeVisible();
  });

  test('eliminazione chiama API e mostra toast', async ({ page }) => {

    await mockCannedJobsApi(page);

    await page.route('**/api/canned-jobs/cj-001', (route) => {
      if (route.request().method() === 'DELETE') {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
      } else {
        route.continue();
      }
    });

    await page.goto('/dashboard/canned-jobs');
    await page.locator('button:has(svg.text-red-500)').first().click();
    await page.getByRole('button', { name: 'Elimina' }).click();

    await expect(page.getByText('Template eliminato')).toBeVisible({ timeout: 5000 });
  });

  test('il bottone Applica apre il modal di applicazione', async ({ page }) => {

    await mockCannedJobsApi(page);

    await page.goto('/dashboard/canned-jobs');

    await page.getByRole('button', { name: 'Applica' }).first().click();

    await expect(page.getByText('Applica Template')).toBeVisible();
    await expect(page.getByText('Seleziona dove applicare il template:')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Applica a un Preventivo' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Applica a un Ordine di Lavoro' })).toBeVisible();
  });

  test('il salvataggio di un nuovo template chiama API e mostra toast', async ({ page }) => {

    await mockCannedJobsApi(page);

    let postCalled = false;
    await page.route('**/api/canned-jobs', (route) => {
      if (route.request().method() === 'POST') {
        postCalled = true;
        route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'cj-new' }) });
      } else {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_CANNED_JOBS) });
      }
    });

    await page.goto('/dashboard/canned-jobs');
    await page.getByRole('button', { name: 'Nuovo Template' }).click();

    await page.locator('#job-name').fill('Test Template');
    await page.locator('#job-description').fill('Descrizione test');

    // Fill in line item
    await page.locator('input[placeholder="Descrizione"]').first().fill('Riga di test');

    await page.getByRole('button', { name: 'Crea Template' }).click();

    await expect(page.getByText('Template creato con successo')).toBeVisible({ timeout: 5000 });
    expect(postCalled).toBe(true);
  });
});
