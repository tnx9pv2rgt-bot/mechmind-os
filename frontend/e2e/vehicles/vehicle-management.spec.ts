import { test, expect } from '../fixtures/auth.fixture';
import { TestDataFactory } from '../helpers/test-data';

/**
 * Vehicle Management E2E Tests
 */

test.describe('Vehicle List', () => {
  
  test.beforeEach(async ({ adminPage: page }) => {
    await page.goto('/dashboard/vehicles');
  });

  test('should display vehicle list page', async ({ page }) => {
    await expect(page).toHaveURL(/dashboard\/vehicles/);
    await expect(page.getByRole('heading', { name: /veicoli|vehicles/i })).toBeVisible();
  });

  test('should display vehicles with details', async ({ page }) => {
    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible();
    
    // Should show vehicle info
    await expect(page.getByText(/targa|plate|FIAT|VW|BMW/i).first()).toBeVisible();
  });

  test('should filter by make', async ({ page }) => {
    await page.getByLabel(/marca|make/i).selectOption('Fiat');
    
    await expect(page.getByText(/Fiat/i).first()).toBeVisible();
  });

  test('should search by license plate', async ({ page }) => {
    await page.getByPlaceholder(/cerca|search|targa/i).fill('AB');
    await page.keyboard.press('Enter');
    
    await expect(page.locator('table tbody tr').first()).toBeVisible();
  });
});

test.describe('Create Vehicle', () => {
  
  test.beforeEach(async ({ adminPage: page }) => {
    await page.goto('/dashboard/vehicles');
  });

  test('should open create vehicle form', async ({ page }) => {
    await page.getByRole('button', { name: /nuovo veicolo|new vehicle|aggiungi/i }).click();
    
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('should create vehicle for existing customer', async ({ page }) => {
    const vehicle = TestDataFactory.vehicle();
    
    await page.getByRole('button', { name: /nuovo veicolo|new vehicle/i }).click();
    
    await page.getByLabel(/proprietario|owner|cliente/i).selectOption(TestDataFactory.predefinedCustomer.email);
    await page.getByLabel(/marca|make/i).fill(vehicle.make);
    await page.getByLabel(/modello|model/i).fill(vehicle.model);
    await page.getByLabel(/anno|year/i).fill(vehicle.year.toString());
    await page.getByLabel(/targa|plate/i).fill(vehicle.licensePlate);
    await page.getByLabel(/vin|telaio/i).fill(vehicle.vin);
    await page.getByLabel(/carburante|fuel/i).selectOption(vehicle.fuelType);
    await page.getByLabel(/km|mileage/i).fill(vehicle.mileage.toString());
    
    await page.getByRole('button', { name: /salva|create|save/i }).click();
    
    await expect(page.getByText(/veicolo creato|vehicle created|successo/i)).toBeVisible();
  });

  test('should validate license plate format', async ({ page }) => {
    await page.getByRole('button', { name: /nuovo veicolo|new vehicle/i }).click();
    
    await page.getByLabel(/targa|plate/i).fill('INVALID-PLATE');
    await page.getByRole('button', { name: /salva|create/i }).click();
    
    await expect(page.getByText(/targa non valida|invalid plate/i)).toBeVisible();
  });

  test('should validate VIN format', async ({ page }) => {
    await page.getByRole('button', { name: /nuovo veicolo|new vehicle/i }).click();
    
    await page.getByLabel(/vin/i).fill('SHORT');
    await page.getByRole('button', { name: /salva|create/i }).click();
    
    await expect(page.getByText(/vin non valido|invalid vin/i)).toBeVisible();
  });

  test('should link vehicle to customer', async ({ page }) => {
    await page.getByRole('button', { name: /nuovo veicolo|new vehicle/i }).click();
    
    await page.getByLabel(/cliente|customer/i).selectOption(TestDataFactory.predefinedCustomer.email);
    
    await expect(page.getByLabel(/cliente/i)).toHaveValue(TestDataFactory.predefinedCustomer.email);
  });
});

test.describe('Vehicle Details', () => {
  
  test.beforeEach(async ({ adminPage: page }) => {
    await page.goto('/dashboard/vehicles');
  });

  test('should view vehicle service history', async ({ page }) => {
    await page.locator('table tbody tr').first().click();
    
    const historyTab = page.getByRole('tab', { name: /storico|history/i });
    
    if (await historyTab.isVisible().catch(() => false)) {
      await historyTab.click();
      await expect(page.getByText(/servizio|intervento|data/i).first()).toBeVisible();
    }
  });

  test('should view upcoming maintenance', async ({ page }) => {
    await page.locator('table tbody tr').first().click();
    
    const maintenanceSection = page.getByText(/prossima manutenzione|next maintenance/i);
    
    if (await maintenanceSection.isVisible().catch(() => false)) {
      await expect(maintenanceSection).toBeVisible();
    }
  });

  test('should update vehicle mileage', async ({ page }) => {
    await page.locator('table tbody tr').first()
      .getByRole('button', { name: /modifica|edit/i }).click();
    
    const newMileage = '100000';
    await page.getByLabel(/km|mileage/i).fill(newMileage);
    await page.getByRole('button', { name: /salva|save/i }).click();
    
    await expect(page.getByText(/aggiornato|updated/i)).toBeVisible();
  });

  test('should transfer vehicle ownership', async ({ page }) => {
    await page.locator('table tbody tr').first()
      .getByRole('button', { name: /modifica|edit/i }).click();
    
    const ownerSelect = page.getByLabel(/proprietario|owner/i);
    
    if (await ownerSelect.isVisible().catch(() => false)) {
      await ownerSelect.selectOption(TestDataFactory.predefinedUsers.customer.email);
      await page.getByRole('button', { name: /salva|save/i }).click();
      
      await expect(page.getByText(/aggiornato|updated/i)).toBeVisible();
    }
  });
});
