import { test, expect, createInspectionViaAPI } from './fixtures/inspection.fixture';
import { TestDataFactory } from './helpers/test-data';

/**
 * Warranty Claim E2E Tests
 * 
 * Tests the warranty workflow:
 * - Create inspection with warranty
 * - File a claim
 * - Verify claim appears in dashboard
 * - Check blockchain verification
 */

test.describe('Warranty Claim Workflow', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login as mechanic
    await page.goto('/auth');
    await page.getByLabel(/email/i).fill('mechanic@mechmind.local');
    await page.getByLabel(/password/i).fill('MechanicPassword123!');
    await page.getByRole('button', { name: /login|accedi/i }).click();
    await page.waitForURL(/dashboard/);
  });

  test.describe('Warranty Dashboard', () => {
    
    test('should display warranty information', async ({ page, warrantyPage, inspectionPage }) => {
      // Create inspection with warranty
      const inspection = await createInspectionViaAPI(page, {
        vehicleId: 'veh-test-001',
        inspectionType: 'WARRANTY',
        inspectorId: 'insp-test-001',
        hasWarranty: true,
      });
      
      // Navigate to warranty dashboard
      await warrantyPage.gotoInspectionWarranty(inspection.id);
      
      // Verify warranty card is displayed
      await warrantyPage.expectWarrantyDashboardLoaded();
      
      // Verify status is active
      const status = await warrantyPage.getWarrantyStatus();
      expect(status.toLowerCase()).toMatch(/active|attivo/);
    });

    test('should show countdown timer', async ({ page, warrantyPage }) => {
      const inspection = await createInspectionViaAPI(page, {
        vehicleId: 'veh-test-001',
        inspectionType: 'WARRANTY',
        inspectorId: 'insp-test-001',
        hasWarranty: true,
      });
      
      await warrantyPage.gotoInspectionWarranty(inspection.id);
      
      // Countdown timer should be visible
      await expect(warrantyPage.countdownTimer).toBeVisible();
      
      // Should show days, hours, minutes
      await expect(warrantyPage.page.getByText(/days|giorni/i)).toBeVisible();
      await expect(warrantyPage.page.getByText(/hours|ore/i)).toBeVisible();
    });

    test('should display remaining coverage amount', async ({ page, warrantyPage }) => {
      const inspection = await createInspectionViaAPI(page, {
        vehicleId: 'veh-test-001',
        inspectionType: 'WARRANTY',
        inspectorId: 'insp-test-001',
        hasWarranty: true,
      });
      
      await warrantyPage.gotoInspectionWarranty(inspection.id);
      
      // Get remaining coverage
      const coverage = await warrantyPage.getRemainingCoverage();
      
      // Should contain currency symbol and amount
      expect(coverage).toMatch(/[€$£]?\s*[\d.,]+/);
    });

    test('should show warranty type badge', async ({ page, warrantyPage }) => {
      const inspection = await createInspectionViaAPI(page, {
        vehicleId: 'veh-test-001',
        inspectionType: 'WARRANTY',
        inspectorId: 'insp-test-001',
        hasWarranty: true,
      });
      
      await warrantyPage.gotoInspectionWarranty(inspection.id);
      
      // Type badge should be visible
      await expect(warrantyPage.warrantyTypeBadge).toBeVisible();
    });
  });

  test.describe('Filing a Claim', () => {
    
    test('should open new claim modal', async ({ page, warrantyPage }) => {
      const inspection = await createInspectionViaAPI(page, {
        vehicleId: 'veh-test-001',
        inspectionType: 'WARRANTY',
        inspectorId: 'insp-test-001',
        hasWarranty: true,
      });
      
      await warrantyPage.gotoInspectionWarranty(inspection.id);
      
      // Click new claim button
      await warrantyPage.newClaimButton.click();
      
      // Modal should appear with form fields
      await expect(warrantyPage.claimAmountInput).toBeVisible();
      await expect(warrantyPage.claimDescriptionTextarea).toBeVisible();
      await expect(warrantyPage.evidenceUploadInput).toBeVisible();
    });

    test('should validate claim amount is required', async ({ page, warrantyPage }) => {
      const inspection = await createInspectionViaAPI(page, {
        vehicleId: 'veh-test-001',
        inspectionType: 'WARRANTY',
        inspectorId: 'insp-test-001',
        hasWarranty: true,
      });
      
      await warrantyPage.gotoInspectionWarranty(inspection.id);
      await warrantyPage.newClaimButton.click();
      
      // Try to submit without amount
      await warrantyPage.claimDescriptionTextarea.fill('Test claim description');
      await warrantyPage.submitClaimButton.click();
      
      // Should show validation error
      await expect(page.getByText(/required|obbligatorio|inserisci/i)).toBeVisible();
    });

    test('should file a claim successfully', async ({ page, warrantyPage }) => {
      const inspection = await createInspectionViaAPI(page, {
        vehicleId: 'veh-test-001',
        inspectionType: 'WARRANTY',
        inspectorId: 'insp-test-001',
        hasWarranty: true,
      });
      
      await warrantyPage.gotoInspectionWarranty(inspection.id);
      
      // File claim
      await warrantyPage.fileClaim({
        amount: 500,
        description: 'Engine oil leak repair needed',
      });
      
      // Success message should appear
      await expect(page.getByText(/submitted|inviato|success|successo/i)).toBeVisible();
      
      // Claim should appear in history
      await warrantyPage.waitForClaimToAppear('Engine oil leak repair needed');
      
      // Verify claim count increased
      const claimCount = await warrantyPage.getClaimCount();
      expect(claimCount).toBeGreaterThan(0);
    });

    test('should upload evidence photos with claim', async ({ page, warrantyPage }) => {
      const inspection = await createInspectionViaAPI(page, {
        vehicleId: 'veh-test-001',
        inspectionType: 'WARRANTY',
        inspectorId: 'insp-test-001',
        hasWarranty: true,
      });
      
      await warrantyPage.gotoInspectionWarranty(inspection.id);
      await warrantyPage.newClaimButton.click();
      
      // Fill claim details
      await warrantyPage.claimAmountInput.fill('750');
      await warrantyPage.claimDescriptionTextarea.fill('Brake pad replacement with photos');
      
      // Upload evidence
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64'
      );
      
      await warrantyPage.evidenceUploadInput.setInputFiles({
        name: 'evidence-photo.jpg',
        mimeType: 'image/jpeg',
        buffer: testImageBuffer,
      });
      
      // Wait for upload indicator
      await expect(page.getByText(/uploaded|selected|file/i)).toBeVisible();
      
      // Submit claim
      await warrantyPage.submitClaimButton.click();
      
      // Success message
      await expect(page.getByText(/submitted|success/i)).toBeVisible();
    });

    test('should show claim in pending status', async ({ page, warrantyPage }) => {
      const inspection = await createInspectionViaAPI(page, {
        vehicleId: 'veh-test-001',
        inspectionType: 'WARRANTY',
        inspectorId: 'insp-test-001',
        hasWarranty: true,
      });
      
      await warrantyPage.gotoInspectionWarranty(inspection.id);
      
      await warrantyPage.fileClaim({
        amount: 300,
        description: 'AC compressor repair',
      });
      
      // Get first claim
      const claim = await warrantyPage.getClaimByIndex(0);
      
      // Status should be pending
      expect(claim?.status.toLowerCase()).toMatch(/pending|in attesa/);
    });
  });

  test.describe('Claim History', () => {
    
    test('should display list of filed claims', async ({ page, warrantyPage }) => {
      const inspection = await createInspectionViaAPI(page, {
        vehicleId: 'veh-test-001',
        inspectionType: 'WARRANTY',
        inspectorId: 'insp-test-001',
        hasWarranty: true,
      });
      
      await warrantyPage.gotoInspectionWarranty(inspection.id);
      
      // File multiple claims
      await warrantyPage.fileClaim({
        amount: 200,
        description: 'First claim - tire replacement',
      });
      
      await warrantyPage.fileClaim({
        amount: 350,
        description: 'Second claim - brake service',
      });
      
      // Claim history should show both
      const claimCount = await warrantyPage.getClaimCount();
      expect(claimCount).toBeGreaterThanOrEqual(2);
    });

    test('should show claim details on click', async ({ page, warrantyPage }) => {
      const inspection = await createInspectionViaAPI(page, {
        vehicleId: 'veh-test-001',
        inspectionType: 'WARRANTY',
        inspectorId: 'insp-test-001',
        hasWarranty: true,
      });
      
      await warrantyPage.gotoInspectionWarranty(inspection.id);
      
      await warrantyPage.fileClaim({
        amount: 450,
        description: 'Detailed claim for testing',
      });
      
      // Click on claim
      await warrantyPage.viewClaimDetails(0);
      
      // Detail modal should show
      await expect(page.getByText(/claim details|dettaglio reclamo/i)).toBeVisible();
      await expect(page.getByText('Detailed claim for testing')).toBeVisible();
      await expect(page.getByText(/€450|\$450/)).toBeVisible();
    });

    test('should update remaining coverage after claim', async ({ page, warrantyPage }) => {
      const inspection = await createInspectionViaAPI(page, {
        vehicleId: 'veh-test-001',
        inspectionType: 'WARRANTY',
        inspectorId: 'insp-test-001',
        hasWarranty: true,
      });
      
      await warrantyPage.gotoInspectionWarranty(inspection.id);
      
      // Get initial coverage
      const initialCoverage = await warrantyPage.getRemainingCoverage();
      const initialAmount = parseFloat(initialCoverage.replace(/[^0-9.,]/g, '').replace(',', '.'));
      
      // File claim
      await warrantyPage.fileClaim({
        amount: 500,
        description: 'Test coverage reduction',
      });
      
      // Refresh page to get updated coverage
      await page.reload();
      
      // Get updated coverage
      const updatedCoverage = await warrantyPage.getRemainingCoverage();
      const updatedAmount = parseFloat(updatedCoverage.replace(/[^0-9.,]/g, '').replace(',', '.'));
      
      // Coverage should be reduced (approximately by claim amount)
      expect(updatedAmount).toBeLessThan(initialAmount);
    });
  });

  test.describe('Blockchain Verification', () => {
    
    test('should display blockchain verification section', async ({ page, warrantyPage }) => {
      const inspection = await createInspectionViaAPI(page, {
        vehicleId: 'veh-test-001',
        inspectionType: 'WARRANTY',
        inspectorId: 'insp-test-001',
        hasWarranty: true,
      });
      
      await warrantyPage.gotoInspectionWarranty(inspection.id);
      
      // Blockchain section should be visible
      await expect(warrantyPage.qrCode).toBeVisible();
      await expect(warrantyPage.blockchainAddress).toBeVisible();
      await expect(warrantyPage.verifyBlockchainButton).toBeVisible();
      await expect(warrantyPage.viewOnExplorerButton).toBeVisible();
    });

    test('should verify warranty on blockchain', async ({ page, warrantyPage }) => {
      const inspection = await createInspectionViaAPI(page, {
        vehicleId: 'veh-test-001',
        inspectionType: 'WARRANTY',
        inspectorId: 'insp-test-001',
        hasWarranty: true,
      });
      
      await warrantyPage.gotoInspectionWarranty(inspection.id);
      
      // Click verify
      await warrantyPage.verifyBlockchainButton.click();
      
      // Wait for verification
      await page.waitForTimeout(3000);
      
      // Should show verified status
      await expect(page.getByText(/verified|verificato/i)).toBeVisible();
    });

    test('should open blockchain explorer', async ({ page, warrantyPage }) => {
      const inspection = await createInspectionViaAPI(page, {
        vehicleId: 'veh-test-001',
        inspectionType: 'WARRANTY',
        inspectorId: 'insp-test-001',
        hasWarranty: true,
      });
      
      await warrantyPage.gotoInspectionWarranty(inspection.id);
      
      // Click view on explorer
      const [newPage] = await Promise.all([
        page.waitForEvent('popup'),
        warrantyPage.viewOnExplorerButton.click(),
      ]);
      
      // New page should have explorer URL
      expect(newPage.url()).toMatch(/polygonscan|etherscan|explorer/i);
      
      await newPage.close();
    });
  });

  test.describe('Alert Settings', () => {
    
    test('should update email alert settings', async ({ page, warrantyPage }) => {
      const inspection = await createInspectionViaAPI(page, {
        vehicleId: 'veh-test-001',
        inspectionType: 'WARRANTY',
        inspectorId: 'insp-test-001',
        hasWarranty: true,
      });
      
      await warrantyPage.gotoInspectionWarranty(inspection.id);
      
      // Toggle email alerts
      await warrantyPage.updateAlertSettings({
        email: true,
        sms: false,
        daysBefore: 45,
      });
      
      // Success message
      await expect(page.getByText(/settings updated|impostazioni salvate/i)).toBeVisible();
    });

    test('should update days before expiry alert', async ({ page, warrantyPage }) => {
      const inspection = await createInspectionViaAPI(page, {
        vehicleId: 'veh-test-001',
        inspectionType: 'WARRANTY',
        inspectorId: 'insp-test-001',
        hasWarranty: true,
      });
      
      await warrantyPage.gotoInspectionWarranty(inspection.id);
      
      // Change days before
      await warrantyPage.daysBeforeInput.fill('60');
      await warrantyPage.saveSettingsButton.click();
      
      // Success message
      await expect(page.getByText(/saved|salvato/i)).toBeVisible();
      
      // Verify value persisted
      await page.reload();
      expect(await warrantyPage.daysBeforeInput.inputValue()).toBe('60');
    });
  });

  test.describe('Upcoming Expirations', () => {
    
    test('should display upcoming expirations section', async ({ page, warrantyPage }) => {
      const inspection = await createInspectionViaAPI(page, {
        vehicleId: 'veh-test-001',
        inspectionType: 'WARRANTY',
        inspectorId: 'insp-test-001',
        hasWarranty: true,
      });
      
      await warrantyPage.gotoInspectionWarranty(inspection.id);
      
      // Upcoming expirations section should be visible
      await expect(warrantyPage.upcomingExpirationsTab).toBeVisible();
      
      // Should have tabs for 30, 60, 90 days
      await expect(page.getByRole('tab', { name: /30d|30/i })).toBeVisible();
      await expect(page.getByRole('tab', { name: /60d|60/i })).toBeVisible();
      await expect(page.getByRole('tab', { name: /90d|90/i })).toBeVisible();
    });
  });

  test.describe('Claim Status Transitions', () => {
    
    test('should show claim status lifecycle', async ({ page, warrantyPage }) => {
      const inspection = await createInspectionViaAPI(page, {
        vehicleId: 'veh-test-001',
        inspectionType: 'WARRANTY',
        inspectorId: 'insp-test-001',
        hasWarranty: true,
      });
      
      await warrantyPage.gotoInspectionWarranty(inspection.id);
      
      // File claim
      await warrantyPage.fileClaim({
        amount: 250,
        description: 'Status test claim',
      });
      
      // Initially pending
      let claim = await warrantyPage.getClaimByIndex(0);
      expect(claim?.status.toLowerCase()).toMatch(/pending|in attesa/);
      
      // In a real scenario, an admin would approve/reject
      // For testing, we verify the status display exists
      await expect(page.locator('[data-testid="claim-status"], .claim-status, .badge').first()).toBeVisible();
    });
  });
});
