import { test, expect } from './fixtures/inspection.fixture';
import { TestDataFactory } from './helpers/test-data';

/**
 * Inspection Workflow E2E Tests
 * 
 * Tests the complete 7-step vehicle inspection workflow:
 * 1. Header Info (Vehicle, Type, Inspector, Location)
 * 2. Exterior Inspection (Photos, 360° video, Damage annotation)
 * 3. Interior Inspection (Photos, Odometer, Infotainment)
 * 4. Sensory Inspection (Humidity, Odors, Mold risk)
 * 5. Engine & Mechanical (Fluids, Belts, Battery)
 * 6. Tires & Suspension (Tire wear, Pressure, Suspension)
 * 7. Electronics & OBD (Error codes, Electronics check)
 */

test.describe('Inspection Workflow', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login as mechanic before each test
    await page.goto('/auth');
    await page.getByLabel(/email/i).fill('mechanic@mechmind.local');
    await page.getByLabel(/password/i).fill('MechanicPassword123!');
    await page.getByRole('button', { name: /login|accedi/i }).click();
    await page.waitForURL(/dashboard/);
  });

  test.describe('Step 1: Header Information', () => {
    
    test('should display all required fields on header step', async ({ inspectionPage }) => {
      await inspectionPage.gotoNewInspection();
      
      // Verify we're on step 1
      expect(await inspectionPage.getCurrentStep()).toBe(1);
      
      // Verify all required fields are visible
      await expect(inspectionPage.vehicleSearchInput).toBeVisible();
      await expect(inspectionPage.inspectionTypeSelect).toBeVisible();
      await expect(inspectionPage.inspectorSelect).toBeVisible();
      await expect(inspectionPage.captureLocationButton).toBeVisible();
      
      // Verify progress indicator
      await expect(inspectionPage.progressBar).toBeVisible();
    });

    test('should search and select vehicle', async ({ inspectionPage, testVehicle }) => {
      await inspectionPage.gotoNewInspection();
      
      // Search for vehicle
      await inspectionPage.vehicleSearchInput.fill(testVehicle.plate);
      
      // Select vehicle from dropdown (mock behavior)
      await inspectionPage.fillHeaderInfo({
        vehicleId: testVehicle.id,
        inspectionType: 'PERIODIC',
        inspectorId: 'insp-test-001',
      });
      
      // Verify vehicle is selected
      const selectedValue = await inspectionPage.vehicleSelect.inputValue();
      expect(selectedValue).toBe(testVehicle.id);
    });

    test('should capture GPS location', async ({ inspectionPage }) => {
      await inspectionPage.gotoNewInspection();
      
      // Grant geolocation permission and mock position
      await inspectionPage.page.context().grantPermissions(['geolocation']);
      await inspectionPage.page.evaluate(() => {
        navigator.geolocation.getCurrentPosition = (success) => {
          success({
            coords: {
              latitude: 45.4642,
              longitude: 9.1900,
              accuracy: 10,
            },
            timestamp: Date.now(),
          } as GeolocationPosition);
        };
      });
      
      // Click capture location
      await inspectionPage.captureLocationButton.click();
      
      // Verify location was captured (should show address or coordinates)
      await expect(inspectionPage.page.locator('text=/45.4642|9.1900|Location captured/i')).toBeVisible();
    });

    test('should validate required fields before proceeding', async ({ inspectionPage }) => {
      await inspectionPage.gotoNewInspection();
      
      // Try to proceed without filling required fields
      await inspectionPage.goToNextStep();
      
      // Should show validation errors
      await expect(inspectionPage.page.getByText(/required|obbligatorio|campo richiesto/i)).toBeVisible();
      
      // Should still be on step 1
      expect(await inspectionPage.getCurrentStep()).toBe(1);
    });
  });

  test.describe('Step 2: Exterior Inspection', () => {
    
    test.beforeEach(async ({ inspectionPage }) => {
      await inspectionPage.gotoNewInspection();
      // Fill step 1 and proceed
      await inspectionPage.fillHeaderInfo({
        vehicleId: 'veh-test-001',
        inspectionType: 'PERIODIC',
        inspectorId: 'insp-test-001',
      });
      await inspectionPage.goToNextStep();
    });

    test('should upload exterior photos', async ({ inspectionPage }) => {
      // Create a test image file
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64'
      );
      
      // Upload photo
      await inspectionPage.uploadInput.setInputFiles({
        name: 'exterior-photo.jpg',
        mimeType: 'image/jpeg',
        buffer: testImageBuffer,
      });
      
      // Verify photo appears in preview
      await expect(inspectionPage.page.locator('img[alt*="Preview"], .photo-preview')).toBeVisible();
    });

    test('should handle damage detection checkbox', async ({ inspectionPage }) => {
      // Check damage detected
      await inspectionPage.hasDamageCheckbox.check();
      
      // Damage description should appear
      await expect(inspectionPage.damageDescriptionTextarea).toBeVisible();
      
      // Fill damage description
      await inspectionPage.damageDescriptionTextarea.fill('Scratch on front bumper');
      
      // Uncheck damage
      await inspectionPage.hasDamageCheckbox.uncheck();
      
      // Description should be hidden or optional
      await expect(inspectionPage.damageDescriptionTextarea).not.toBeVisible();
    });

    test('should start 360° video recording', async ({ inspectionPage }) => {
      // Click start recording
      await inspectionPage.startVideoButton.click();
      
      // Should show recording indicator
      await expect(inspectionPage.page.locator('text=/recording|registrazione|REC/i')).toBeVisible();
      
      // Click again to stop
      await inspectionPage.startVideoButton.click();
      
      // Recording indicator should disappear
      await expect(inspectionPage.page.locator('text=/recording|registrazione|REC/i')).not.toBeVisible();
    });
  });

  test.describe('Step 3: Interior Inspection', () => {
    
    test.beforeEach(async ({ inspectionPage }) => {
      await inspectionPage.gotoNewInspection();
      // Fill steps 1-2 and proceed
      await inspectionPage.fillHeaderInfo({
        vehicleId: 'veh-test-001',
        inspectionType: 'PERIODIC',
        inspectorId: 'insp-test-001',
      });
      await inspectionPage.goToNextStep(); // To step 2
      await inspectionPage.goToNextStep(); // To step 3
    });

    test('should record odometer reading', async ({ inspectionPage }) => {
      await inspectionPage.odometerInput.fill('45000');
      
      // Verify value is set
      expect(await inspectionPage.odometerInput.inputValue()).toBe('45000');
    });

    test('should select interior conditions', async ({ inspectionPage }) => {
      // Select seat condition
      await inspectionPage.seatConditionSelect.selectOption('good');
      
      // Select dashboard condition
      await inspectionPage.dashboardConditionSelect.selectOption('excellent');
      
      // Verify selections
      expect(await inspectionPage.seatConditionSelect.inputValue()).toBe('good');
      expect(await inspectionPage.dashboardConditionSelect.inputValue()).toBe('excellent');
    });
  });

  test.describe('Step 4: Sensory Inspection', () => {
    
    test.beforeEach(async ({ inspectionPage }) => {
      await inspectionPage.gotoNewInspection();
      // Fill steps 1-3 and proceed
      await inspectionPage.fillHeaderInfo({
        vehicleId: 'veh-test-001',
        inspectionType: 'PERIODIC',
        inspectorId: 'insp-test-001',
      });
      await inspectionPage.fillInteriorInspection({ odometerReading: 45000 });
      await inspectionPage.goToNextStep(); // To step 2
      await inspectionPage.goToNextStep(); // To step 3
      await inspectionPage.goToNextStep(); // To step 4
    });

    test('should detect high mold risk conditions', async ({ inspectionPage }) => {
      // Set high humidity
      await inspectionPage.humiditySlider.fill('85');
      
      // Check mold detected
      await inspectionPage.moldDetectedCheckbox.check();
      
      // Check musty smell
      await inspectionPage.mustySmellCheckbox.check();
      
      // Should show high mold risk badge
      await expect(inspectionPage.moldRiskBadge).toBeVisible();
      const riskText = await inspectionPage.moldRiskBadge.textContent();
      expect(riskText?.toLowerCase()).toMatch(/high|alto|critical|critico/);
    });

    test('should handle odor detection', async ({ inspectionPage }) => {
      // Enable smoke detection
      await inspectionPage.smokeDetectedCheckbox.check();
      
      // Should show smoke intensity options
      await expect(inspectionPage.page.locator('text=/intensity|intensità/i')).toBeVisible();
      
      // Check pet smell
      await inspectionPage.petSmellCheckbox.check();
    });
  });

  test.describe('Step 5-7: Complete Inspection', () => {
    
    test.beforeEach(async ({ inspectionPage }) => {
      await inspectionPage.gotoNewInspection();
    });

    test('should complete full 7-step inspection', async ({ inspectionPage }) => {
      // Step 1: Header Info
      await inspectionPage.fillHeaderInfo({
        vehicleId: 'veh-test-001',
        inspectionType: 'PERIODIC',
        inspectorId: 'insp-test-001',
      });
      await inspectionPage.goToNextStep();
      
      // Step 2: Exterior
      await inspectionPage.fillExteriorInspection({ hasDamage: false });
      await inspectionPage.goToNextStep();
      
      // Step 3: Interior
      await inspectionPage.fillInteriorInspection({ odometerReading: 45000 });
      await inspectionPage.goToNextStep();
      
      // Step 4: Sensory
      await inspectionPage.fillSensoryInspection({
        humidity: 45,
        smokeDetected: false,
        moldDetected: false,
        acDrainTestPassed: true,
      });
      await inspectionPage.goToNextStep();
      
      // Step 5: Engine
      await inspectionPage.fillEngineInspection();
      await inspectionPage.goToNextStep();
      
      // Step 6: Tires
      await inspectionPage.fillTiresInspection();
      await inspectionPage.goToNextStep();
      
      // Step 7: Electronics
      await inspectionPage.fillElectronicsInspection();
      
      // Submit inspection
      await inspectionPage.submitInspection();
      
      // Verify redirect to inspection detail
      await inspectionPage.expectInspectionDetailPage();
      
      // Verify inspection ID in URL
      const inspectionId = inspectionPage.getInspectionIdFromUrl();
      expect(inspectionId).toBeTruthy();
    });

    test('should save draft and resume later', async ({ inspectionPage }) => {
      // Fill partial data (step 1 only)
      await inspectionPage.fillHeaderInfo({
        vehicleId: 'veh-test-001',
        inspectionType: 'PERIODIC',
        inspectorId: 'insp-test-001',
      });
      
      // Save draft
      await inspectionPage.saveDraft();
      
      // Should show success message
      await expect(inspectionPage.page.getByText(/saved|salvato|draft|bozza/i)).toBeVisible();
      
      // Navigate away and back
      await inspectionPage.page.goto('/dashboard');
      await inspectionPage.gotoNewInspection();
      
      // Draft should be restored (vehicle still selected)
      const selectedVehicle = await inspectionPage.vehicleSelect.inputValue();
      expect(selectedVehicle).toBe('veh-test-001');
    });
  });

  test.describe('Navigation', () => {
    
    test.beforeEach(async ({ inspectionPage }) => {
      await inspectionPage.gotoNewInspection();
      // Fill step 1
      await inspectionPage.fillHeaderInfo({
        vehicleId: 'veh-test-001',
        inspectionType: 'PERIODIC',
        inspectorId: 'insp-test-001',
      });
    });

    test('should navigate between steps', async ({ inspectionPage }) => {
      // Go to step 2
      await inspectionPage.goToNextStep();
      expect(await inspectionPage.getCurrentStep()).toBe(2);
      
      // Go back to step 1
      await inspectionPage.goToPreviousStep();
      expect(await inspectionPage.getCurrentStep()).toBe(1);
      
      // Data should be preserved
      expect(await inspectionPage.vehicleSelect.inputValue()).toBe('veh-test-001');
    });

    test('should show step labels in progress bar', async ({ inspectionPage }) => {
      const stepLabels = ['Header Info', 'Exterior', 'Interior', 'Sensory', 'Engine', 'Tires', 'Electronics'];
      
      for (const label of stepLabels) {
        await expect(inspectionPage.page.getByText(label, { exact: false })).toBeVisible();
      }
    });
  });

  test.describe('Inspection Detail Page', () => {
    
    test('should display completed inspection details', async ({ page, inspectionPage }) => {
      // First create an inspection via API or UI
      await inspectionPage.gotoNewInspection();
      await inspectionPage.completeFullInspection({
        vehicleId: 'veh-test-001',
        inspectionType: 'PERIODIC',
        inspectorId: 'insp-test-001',
        odometerReading: 45000,
        hasDamage: false,
      });
      
      // Verify detail page elements
      await expect(page.getByText(/inspection|ispezione/i).first()).toBeVisible();
      await expect(page.getByText(/status|stato/i)).toBeVisible();
      await expect(page.getByText(/completed|completata/i)).toBeVisible();
      
      // Verify summary information
      await expect(page.getByText(/odometer|chilometraggio/i)).toBeVisible();
      await expect(page.getByText('45000')).toBeVisible();
    });
  });
});
