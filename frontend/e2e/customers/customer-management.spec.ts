import { test, expect } from '../fixtures/auth.fixture';
import { TestDataFactory } from '../helpers/test-data';

/**
 * Customer Management E2E Tests
 */

test.describe('Customer List', () => {
  
  test.beforeEach(async ({ adminPage: page }) => {
    await page.goto('/dashboard/customers');
  });

  test('should display customer list page', async ({ page }) => {
    await expect(page).toHaveURL(/dashboard\/customers/);
    await expect(page.getByRole('heading', { name: /clienti|customers/i })).toBeVisible();
  });

  test('should display customers in table', async ({ page }) => {
    await expect(page.locator('table tbody tr').first()).toBeVisible();
  });

  test('should search customers by name', async ({ page }) => {
    await page.getByPlaceholder(/cerca|search/i).fill('Mario');
    await page.keyboard.press('Enter');
    
    await expect(page.getByText(/Mario/i).first()).toBeVisible();
  });

  test('should filter customers by type', async ({ page }) => {
    await page.getByLabel(/tipo|type/i).selectOption('business');
    
    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible();
  });

  test('should export customers', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /esporta|export/i });
    
    if (await exportButton.isVisible().catch(() => false)) {
      await exportButton.click();
      
      await expect(page.getByText(/esportazione|export/i)).toBeVisible();
    }
  });
});

test.describe('Create Customer', () => {
  
  test.beforeEach(async ({ adminPage: page }) => {
    await page.goto('/dashboard/customers');
  });

  test('should open create customer form', async ({ page }) => {
    await page.getByRole('button', { name: /nuovo cliente|new customer|aggiungi/i }).click();
    
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /nuovo cliente|create customer/i })).toBeVisible();
  });

  test('should create customer with all fields', async ({ page }) => {
    const customer = TestDataFactory.customer();
    
    await page.getByRole('button', { name: /nuovo cliente|new customer/i }).click();
    
    await page.getByLabel(/nome|first name/i).fill(customer.firstName);
    await page.getByLabel(/cognome|last name/i).fill(customer.lastName);
    await page.getByLabel(/email/i).fill(customer.email);
    await page.getByLabel(/telefono|phone/i).fill(customer.phone);
    await page.getByLabel(/indirizzo|address/i).fill(customer.address);
    await page.getByLabel(/città|city/i).fill(customer.city);
    await page.getByLabel(/cap|postal code/i).fill(customer.postalCode);
    await page.getByLabel(/codice fiscale|tax code/i).fill(customer.taxCode);
    
    await page.getByRole('button', { name: /salva|create|save/i }).click();
    
    await expect(page.getByText(/cliente creato|customer created|successo/i)).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.getByRole('button', { name: /nuovo cliente|new customer/i }).click();
    await page.getByRole('button', { name: /salva|create/i }).click();
    
    await expect(page.getByText(/obbligatorio|required/i).first()).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    await page.getByRole('button', { name: /nuovo cliente|new customer/i }).click();
    
    await page.getByLabel(/email/i).fill('invalid-email');
    await page.getByRole('button', { name: /salva|create/i }).click();
    
    await expect(page.getByText(/email non valida|invalid email/i)).toBeVisible();
  });

  test('should validate Italian tax code', async ({ page }) => {
    await page.getByRole('button', { name: /nuovo cliente|new customer/i }).click();
    
    await page.getByLabel(/codice fiscale/i).fill('INVALID');
    await page.getByRole('button', { name: /salva|create/i }).click();
    
    await expect(page.getByText(/codice fiscale non valido|invalid tax code/i)).toBeVisible();
  });

  test('should check for duplicate email', async ({ page }) => {
    const existingCustomer = TestDataFactory.predefinedCustomer;
    
    await page.getByRole('button', { name: /nuovo cliente|new customer/i }).click();
    
    await page.getByLabel(/email/i).fill(existingCustomer.email);
    await page.getByLabel(/nome/i).fill('Test');
    await page.getByLabel(/cognome/i).fill('User');
    await page.getByRole('button', { name: /salva|create/i }).click();
    
    await expect(page.getByText(/email già esistente|already exists/i)).toBeVisible();
  });
});

test.describe('Customer Details', () => {
  
  test.beforeEach(async ({ adminPage: page }) => {
    await page.goto('/dashboard/customers');
  });

  test('should view customer details', async ({ page }) => {
    await page.locator('table tbody tr').first().click();
    
    await expect(page.getByRole('dialog').or(page.locator('[data-testid="customer-details"]'))).toBeVisible();
    await expect(page.getByText(/dettagli|details/i)).toBeVisible();
  });

  test('should show customer vehicles', async ({ page }) => {
    await page.locator('table tbody tr').first().click();
    
    const vehiclesTab = page.getByRole('tab', { name: /veicoli|vehicles/i });
    
    if (await vehiclesTab.isVisible().catch(() => false)) {
      await vehiclesTab.click();
      await expect(page.getByText(/targa|plate|veicolo/i)).toBeVisible();
    }
  });

  test('should show customer bookings history', async ({ page }) => {
    await page.locator('table tbody tr').first().click();
    
    const bookingsTab = page.getByRole('tab', { name: /prenotazioni|bookings/i });
    
    if (await bookingsTab.isVisible().catch(() => false)) {
      await bookingsTab.click();
      await expect(page.getByText(/data|servizio|stato/i).first()).toBeVisible();
    }
  });

  test('should edit customer', async ({ page }) => {
    await page.locator('table tbody tr').first()
      .getByRole('button', { name: /modifica|edit/i }).click();
    
    await page.getByLabel(/telefono/i).fill('+39 333 9998888');
    await page.getByRole('button', { name: /salva|save/i }).click();
    
    await expect(page.getByText(/aggiornato|updated|successo/i)).toBeVisible();
  });

  test('should delete customer', async ({ page }) => {
    // Create a test customer first
    await page.getByRole('button', { name: /nuovo cliente/i }).click();
    await page.getByLabel(/nome/i).fill('Delete');
    await page.getByLabel(/cognome/i).fill('Me');
    await page.getByLabel(/email/i).fill('delete.me@mechmind.test');
    await page.getByRole('button', { name: /salva/i }).click();
    
    // Now delete it
    await page.locator('tr:has-text("delete.me@mechmind.test")')
      .getByRole('button', { name: /elimina|delete/i }).click();
    
    await page.getByRole('button', { name: /conferma|yes/i }).click();
    
    await expect(page.getByText(/eliminato|deleted/i)).toBeVisible();
  });
});
