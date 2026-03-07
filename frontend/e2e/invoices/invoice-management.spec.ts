import { test, expect } from '../fixtures/auth.fixture';
import { TestDataFactory } from '../helpers/test-data';

/**
 * Invoice Management E2E Tests
 */

test.describe('Invoice List', () => {
  
  test.beforeEach(async ({ adminPage: page }) => {
    await page.goto('/dashboard/invoices');
  });

  test('should display invoice list page', async ({ page }) => {
    await expect(page).toHaveURL(/dashboard\/invoices/);
    await expect(page.getByRole('heading', { name: /fatture|invoices/i })).toBeVisible();
  });

  test('should display invoices with status', async ({ page }) => {
    await expect(page.locator('table tbody tr').first()).toBeVisible();
    await expect(page.getByText(/pagata|paid|da pagare|unpaid|bozza|draft/i).first()).toBeVisible();
  });

  test('should filter by status', async ({ page }) => {
    await page.getByLabel(/stato|status/i).selectOption('unpaid');
    
    await expect(page.getByText(/da pagare|unpaid|in attesa/i).first()).toBeVisible();
  });

  test('should filter by date range', async ({ page }) => {
    const fromDate = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const toDate = new Date().toISOString().split('T')[0];
    
    await page.getByLabel(/da|from/i).fill(fromDate);
    await page.getByLabel(/a|to/i).fill(toDate);
    await page.getByRole('button', { name: /filtra|apply/i }).click();
    
    await expect(page.locator('table tbody tr').first()).toBeVisible();
  });

  test('should search by invoice number', async ({ page }) => {
    await page.getByPlaceholder(/cerca|search|numero/i).fill('2024');
    await page.keyboard.press('Enter');
    
    await expect(page.getByText(/2024/i).first()).toBeVisible();
  });

  test('should export invoices', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /esporta|export/i });
    
    if (await exportButton.isVisible().catch(() => false)) {
      await exportButton.click();
      
      // Select format
      await page.getByRole('menuitem', { name: /pdf|excel|csv/i }).click();
      
      await expect(page.getByText(/esportazione|export/i)).toBeVisible();
    }
  });
});

test.describe('Create Invoice', () => {
  
  test.beforeEach(async ({ adminPage: page }) => {
    await page.goto('/dashboard/invoices');
  });

  test('should open create invoice form', async ({ page }) => {
    await page.getByRole('button', { name: /nuova fattura|new invoice|crea/i }).click();
    
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /nuova fattura|create invoice/i })).toBeVisible();
  });

  test('should create invoice for customer', async ({ page }) => {
    const invoice = TestDataFactory.invoice(2);
    
    await page.getByRole('button', { name: /nuova fattura|new invoice/i }).click();
    
    await page.getByLabel(/cliente|customer/i).selectOption(TestDataFactory.predefinedCustomer.email);
    
    // Add items
    for (let i = 0; i < invoice.items.length; i++) {
      if (i > 0) {
        await page.getByRole('button', { name: /aggiungi riga|add item/i }).click();
      }
      
      await page.getByLabel(/descrizione/i).nth(i).fill(invoice.items[i].description);
      await page.getByLabel(/quantità|quantity/i).nth(i).fill(invoice.items[i].quantity.toString());
      await page.getByLabel(/prezzo|price/i).nth(i).fill(invoice.items[i].price.toString());
    }
    
    await page.getByRole('button', { name: /crea|salva|save/i }).click();
    
    await expect(page.getByText(/fattura creata|invoice created|successo/i)).toBeVisible();
  });

  test('should calculate totals correctly', async ({ page }) => {
    await page.getByRole('button', { name: /nuova fattura|new invoice/i }).click();
    
    await page.getByLabel(/quantità/i).first().fill('2');
    await page.getByLabel(/prezzo/i).first().fill('100');
    
    // Check subtotal
    await expect(page.getByText(/€200|200,00/)).toBeVisible();
  });

  test('should apply VAT correctly', async ({ page }) => {
    await page.getByRole('button', { name: /nuova fattura|new invoice/i }).click();
    
    await page.getByLabel(/prezzo/i).first().fill('100');
    await page.getByLabel(/iva|vat/i).selectOption('22');
    
    // Total should include 22% VAT
    await expect(page.getByText(/€122|122,00/)).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.getByRole('button', { name: /nuova fattura|new invoice/i }).click();
    await page.getByRole('button', { name: /crea|salva/i }).click();
    
    await expect(page.getByText(/obbligatorio|required/i).first()).toBeVisible();
  });
});

test.describe('Invoice Actions', () => {
  
  test.beforeEach(async ({ adminPage: page }) => {
    await page.goto('/dashboard/invoices');
  });

  test('should send invoice via email', async ({ page }) => {
    await page.locator('table tbody tr').filter({ hasText: /bozza|draft/i }).first()
      .getByRole('button', { name: /azioni|actions|⋮/i }).click();
    
    await page.getByRole('menuitem', { name: /invia|send/i }).click();
    
    await expect(page.getByText(/email inviata|email sent/i)).toBeVisible();
  });

  test('should mark invoice as paid', async ({ page }) => {
    await page.locator('table tbody tr').filter({ hasText: /da pagare|unpaid/i }).first()
      .getByRole('button', { name: /azioni|actions|⋮/i }).click();
    
    await page.getByRole('menuitem', { name: /segna come pagata|mark as paid/i }).click();
    
    await expect(page.getByText(/pagata|paid/i).first()).toBeVisible();
  });

  test('should download invoice PDF', async ({ page }) => {
    await page.locator('table tbody tr').first()
      .getByRole('button', { name: /scarica|download|pdf/i }).click();
    
    // Download started - verify by checking if dialog closes or success message appears
    await expect(page.getByText(/scaricamento|download started/i).or(
      page.locator('[data-testid="download-success"]')
    ).first()).toBeVisible();
  });

  test('should duplicate invoice', async ({ page }) => {
    await page.locator('table tbody tr').first()
      .getByRole('button', { name: /azioni|actions|⋮/i }).click();
    
    await page.getByRole('menuitem', { name: /duplica|duplicate/i }).click();
    
    await expect(page.getByText(/fattura duplicata|invoice duplicated/i)).toBeVisible();
  });

  test('should void invoice', async ({ page }) => {
    await page.locator('table tbody tr').filter({ hasText: /bozza|draft|da pagare/i }).first()
      .getByRole('button', { name: /azioni|actions|⋮/i }).click();
    
    await page.getByRole('menuitem', { name: /annulla|void|cancella/i }).click();
    
    await page.getByRole('button', { name: /conferma|yes/i }).click();
    
    await expect(page.getByText(/annullata|voided/i).first()).toBeVisible();
  });
});

test.describe('Invoice Details', () => {
  
  test.beforeEach(async ({ adminPage: page }) => {
    await page.goto('/dashboard/invoices');
  });

  test('should view invoice details', async ({ page }) => {
    await page.locator('table tbody tr').first().click();
    
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/dettagli fattura|invoice details/i)).toBeVisible();
  });

  test('should show payment history', async ({ page }) => {
    await page.locator('table tbody tr').filter({ hasText: /pagata|paid/i }).first().click();
    
    const paymentsTab = page.getByRole('tab', { name: /pagamenti|payments/i });
    
    if (await paymentsTab.isVisible().catch(() => false)) {
      await paymentsTab.click();
      await expect(page.getByText(/data pagamento|payment date/i)).toBeVisible();
    }
  });

  test('should record payment', async ({ page }) => {
    await page.locator('table tbody tr').filter({ hasText: /da pagare|unpaid/i }).first().click();
    
    await page.getByRole('button', { name: /registra pagamento|record payment/i }).click();
    
    await page.getByLabel(/importo|amount/i).fill('100');
    await page.getByLabel(/metodo|method/i).selectOption('bank_transfer');
    await page.getByLabel(/data|date/i).fill(new Date().toISOString().split('T')[0]);
    
    await page.getByRole('button', { name: /conferma|save/i }).click();
    
    await expect(page.getByText(/pagamento registrato|payment recorded/i)).toBeVisible();
  });

  test('should add note to invoice', async ({ page }) => {
    await page.locator('table tbody tr').first().click();
    
    const notesTab = page.getByRole('tab', { name: /note|notes/i });
    
    if (await notesTab.isVisible().catch(() => false)) {
      await notesTab.click();
      
      await page.getByLabel(/nuova nota|new note/i).fill('Test note');
      await page.getByRole('button', { name: /aggiungi|add/i }).click();
      
      await expect(page.getByText(/test note/i)).toBeVisible();
    }
  });
});

test.describe('Recurring Invoices', () => {
  
  test('should create recurring invoice', async ({ adminPage: page }) => {
    await page.goto('/dashboard/invoices');
    await page.getByRole('button', { name: /nuova fattura|new invoice/i }).click();
    
    await page.getByLabel(/cliente/i).selectOption(TestDataFactory.predefinedCustomer.email);
    await page.getByLabel(/descrizione/i).fill('Monthly service');
    await page.getByLabel(/prezzo/i).fill('200');
    
    // Enable recurring
    const recurringToggle = page.getByLabel(/ricorrente|recurring/i);
    
    if (await recurringToggle.isVisible().catch(() => false)) {
      await recurringToggle.check();
      
      await page.getByLabel(/frequenza|frequency/i).selectOption('monthly');
      await page.getByLabel(/fine|end date/i).fill(new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0]);
      
      await page.getByRole('button', { name: /crea|save/i }).click();
      
      await expect(page.getByText(/fattura ricorrente|recurring invoice/i)).toBeVisible();
    }
  });

  test('should list recurring invoice templates', async ({ adminPage: page }) => {
    await page.goto('/dashboard/invoices');
    
    const recurringTab = page.getByRole('tab', { name: /ricorrenti|recurring/i });
    
    if (await recurringTab.isVisible().catch(() => false)) {
      await recurringTab.click();
      
      await expect(page.getByText(/template|ricorrente/i)).toBeVisible();
    }
  });
});
