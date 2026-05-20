import { test, expect } from '../fixtures/auth.fixture';

/**
 * Billing Dashboard E2E Tests — API-mocked, no backend required.
 * Modulo: Fatturazione abbonamento (metodo pagamento + storico fatture Stripe)
 * Pattern: Render | Loading | Error | Data | Actions
 */

// =============================================================================
// Mock data
// =============================================================================
const MOCK_PAYMENT_METHOD = {
  brand: 'visa',
  last4: '4242',
  expMonth: 12,
  expYear: 2028,
};

const MOCK_INVOICES = [
  {
    id: 'inv-stripe-1',
    number: 'INV-2026-001',
    date: '2026-05-01T00:00:00Z',
    amount: 9900,
    currency: 'eur',
    status: 'paid',
    pdfUrl: 'https://example.com/invoice1.pdf',
  },
  {
    id: 'inv-stripe-2',
    number: 'INV-2026-002',
    date: '2026-04-01T00:00:00Z',
    amount: 9900,
    currency: 'eur',
    status: 'open',
    pdfUrl: null,
  },
  {
    id: 'inv-stripe-3',
    number: 'INV-2026-003',
    date: '2026-03-01T00:00:00Z',
    amount: 9900,
    currency: 'eur',
    status: 'uncollectible',
    pdfUrl: null,
  },
];

// =============================================================================
// Helpers
// =============================================================================
function mockBillingApi(
  page: import('@playwright/test').Page,
  pm: typeof MOCK_PAYMENT_METHOD | null = MOCK_PAYMENT_METHOD,
  invoices: typeof MOCK_INVOICES = MOCK_INVOICES
): Promise<void[]> {
  return Promise.all([
    page.route('**/api/dashboard/billing/payment-method**', async route => {
      if (pm === null) {
        await route.fulfill({ status: 404, body: JSON.stringify({ error: 'Not found' }) });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(pm),
        });
      }
    }),
    page.route('**/api/dashboard/billing/invoices**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: invoices }),
      });
    }),
    page.route('**/api/stripe/portal**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: 'https://billing.stripe.com/session/test' }),
      });
    }),
  ]);
}

// =============================================================================
// RENDER — struttura base della pagina
// =============================================================================
test.describe('Billing - Render', () => {
  test.beforeEach(async ({ page }) => {
    await mockBillingApi(page);
    await page.goto('/dashboard/billing');
    await page.waitForLoadState('networkidle');
  });

  test('BILL-R01: mostra titolo pagina Fatturazione', async ({ page }) => {
    await expect(
      page
        .getByRole('heading', { name: /Fatturazione/i })
        .or(page.getByText(/Fatturazione/i).first())
    ).toBeVisible();
  });

  test('BILL-R02: mostra sezione metodo di pagamento', async ({ page }) => {
    await expect(
      page
        .getByText(/Metodo di pagamento/i)
        .or(page.getByText(/Metodo Pagamento/i))
        .first()
    ).toBeVisible();
  });

  test('BILL-R03: mostra sezione storico fatture', async ({ page }) => {
    await expect(
      page.getByText(/Storico Fatture/i).or(page.getByText(/Fatture/i).first())
    ).toBeVisible();
  });

  test('BILL-R04: mostra bottone gestione pagamento', async ({ page }) => {
    await expect(
      page
        .getByRole('button', { name: /Gestisci/i })
        .or(page.getByRole('button', { name: /Pagamento/i }))
        .first()
    ).toBeVisible();
  });
});

// =============================================================================
// ERROR — errore API fatture
// =============================================================================
test.describe('Billing - Error', () => {
  test('BILL-ERR01: mostra messaggio errore se fatture API fallisce', async ({ page }) => {
    await page.route('**/api/dashboard/billing/payment-method**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_PAYMENT_METHOD),
      });
    });
    await page.route('**/api/dashboard/billing/invoices**', async route => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });
    await page.route('**/api/stripe/portal**', async route => {
      await route.fulfill({ status: 200, body: JSON.stringify({ url: '' }) });
    });
    await page.goto('/dashboard/billing');
    await page.waitForLoadState('networkidle');

    await expect(
      page
        .getByText(/Errore/i)
        .or(page.getByText(/Impossibile/i))
        .first()
    ).toBeVisible();
  });

  test('BILL-ERR02: mostra toast se portale Stripe fallisce', async ({ page }) => {
    await mockBillingApi(page);
    await page.route('**/api/stripe/portal**', async route => {
      await route.fulfill({ status: 500, body: JSON.stringify({ error: 'Stripe error' }) });
    });
    await page.goto('/dashboard/billing');
    await page.waitForLoadState('networkidle');

    await page
      .getByRole('button', { name: /Gestisci/i })
      .or(page.getByRole('button', { name: /Pagamento/i }))
      .first()
      .click();

    await expect(
      page
        .getByText(/Errore apertura portale/i)
        .or(page.getByText(/Errore/i))
        .first()
    ).toBeVisible({ timeout: 5000 });
  });
});

// =============================================================================
// DATA — dati presenti
// =============================================================================
test.describe('Billing - Data', () => {
  test.beforeEach(async ({ page }) => {
    await mockBillingApi(page);
    await page.goto('/dashboard/billing');
    await page.waitForLoadState('networkidle');
  });

  test('BILL-D01: mostra ultime 4 cifre carta (4242)', async ({ page }) => {
    await expect(page.getByText(/4242/)).toBeVisible();
  });

  test('BILL-D02: mostra brand carta (Visa)', async ({ page }) => {
    await expect(page.getByText(/visa/i).or(page.getByText(/Visa/i))).toBeVisible();
  });

  test('BILL-D03: mostra fattura con stato Pagata', async ({ page }) => {
    await expect(page.getByText(/Pagata/i).first()).toBeVisible();
  });

  test('BILL-D04: mostra fattura con stato In Attesa', async ({ page }) => {
    await expect(page.getByText(/In Attesa/i).first()).toBeVisible();
  });

  test('BILL-D05: mostra fattura con stato Fallita o Annullata', async ({ page }) => {
    await expect(page.getByText(/Fallita/i).or(page.getByText(/Annullata/i))).toBeVisible();
  });

  test('BILL-D06: mostra numero fattura', async ({ page }) => {
    await expect(page.getByText('INV-2026-001')).toBeVisible();
  });

  test('BILL-D07: mostra importo in EUR', async ({ page }) => {
    await expect(page.getByText(/99/)).toBeVisible();
  });
});

// =============================================================================
// ACTIONS — interazioni
// =============================================================================
test.describe('Billing - Actions', () => {
  test.beforeEach(async ({ page }) => {
    await mockBillingApi(page);
    await page.goto('/dashboard/billing');
    await page.waitForLoadState('networkidle');
  });

  test('BILL-A01: bottone download PDF visibile per fattura con pdfUrl', async ({ page }) => {
    await expect(
      page
        .getByRole('link', { name: /Scarica/i })
        .or(
          page
            .getByRole('button', { name: /Scarica/i })
            .or(page.locator('[aria-label*="download" i], [aria-label*="scarica" i]'))
        )
        .first()
    ).toBeVisible();
  });

  test('BILL-A02: click Gestisci pagamento chiama API Stripe portal', async ({ page }) => {
    const portalRequested = page.waitForRequest(req => req.url().includes('/api/stripe/portal'));

    await page
      .getByRole('button', { name: /Gestisci/i })
      .or(page.getByRole('button', { name: /Pagamento/i }))
      .first()
      .click();

    const portalReq = await portalRequested;
    expect(portalReq.method()).toBe('POST');
  });
});
