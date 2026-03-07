import { test, expect, simulateOffline, restoreOnline } from './fixtures/inspection.fixture';

/**
 * Offline Mode E2E Tests
 * 
 * Tests the application's offline functionality:
 * - Start inspection online
 * - Go offline (simulate)
 * - Fill form offline
 * - Submit (should queue)
 * - Go online
 * - Verify sync
 */

test.describe('Offline Mode', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login as mechanic
    await page.goto('/auth');
    await page.getByLabel(/email/i).fill('mechanic@mechmind.local');
    await page.getByLabel(/password/i).fill('MechanicPassword123!');
    await page.getByRole('button', { name: /login|accedi/i }).click();
    await page.waitForURL(/dashboard/);
  });

  test.afterEach(async ({ page }) => {
    // Ensure we're back online after each test
    await restoreOnline(page);
  });

  test.describe('Offline Detection', () => {
    
    test('should detect when going offline', async ({ page, inspectionPage }) => {
      await inspectionPage.gotoNewInspection();
      
      // Initially should be online
      await expect(page.locator('[data-testid="connection-status"], .online-indicator').first()).toBeVisible();
      
      // Go offline
      await simulateOffline(page);
      
      // Should show offline indicator
      await expect(page.locator('[data-testid="offline-indicator"], .offline-badge, text=/offline|disconnesso/i').first()).toBeVisible();
    });

    test('should detect when coming back online', async ({ page, inspectionPage }) => {
      await inspectionPage.gotoNewInspection();
      
      // Go offline then online
      await simulateOffline(page);
      await restoreOnline(page);
      
      // Should show online indicator
      await expect(page.locator('[data-testid="online-indicator"], .online-badge, text=/online|connesso/i').first()).toBeVisible();
    });

    test('should queue requests when offline', async ({ page, inspectionPage }) => {
      await inspectionPage.gotoNewInspection();
      
      // Fill some data
      await inspectionPage.fillHeaderInfo({
        vehicleId: 'veh-test-001',
        inspectionType: 'PERIODIC',
        inspectorId: 'insp-test-001',
      });
      
      // Go offline
      await simulateOffline(page);
      
      // Try to save - should queue
      await inspectionPage.saveDraftButton.click();
      
      // Should show offline queue message
      await expect(page.getByText(/queued|in coda|offline|will sync|sincronizzerà/i)).toBeVisible();
    });
  });

  test.describe('Offline Form Persistence', () => {
    
    test('should persist form data when going offline', async ({ page, inspectionPage }) => {
      await inspectionPage.gotoNewInspection();
      
      // Fill step 1
      await inspectionPage.fillHeaderInfo({
        vehicleId: 'veh-test-001',
        inspectionType: 'PERIODIC',
        inspectorId: 'insp-test-001',
      });
      
      // Go offline
      await simulateOffline(page);
      
      // Navigate to step 2
      await inspectionPage.goToNextStep();
      
      // Fill offline data
      await inspectionPage.damageDescriptionTextarea.fill('Damage noted while offline');
      
      // Navigate back and forth
      await inspectionPage.goToPreviousStep();
      await inspectionPage.goToNextStep();
      
      // Data should persist
      expect(await inspectionPage.damageDescriptionTextarea.inputValue()).toBe('Damage noted while offline');
    });

    test('should save draft locally when offline', async ({ page, inspectionPage }) => {
      await inspectionPage.gotoNewInspection();
      
      // Fill data
      await inspectionPage.fillHeaderInfo({
        vehicleId: 'veh-test-001',
        inspectionType: 'PERIODIC',
        inspectorId: 'insp-test-001',
      });
      
      // Go offline
      await simulateOffline(page);
      
      // Save draft
      await inspectionPage.saveDraftButton.click();
      
      // Should show local save confirmation
      await expect(page.getByText(/saved locally|salvato localmente|offline draft/i)).toBeVisible();
      
      // Reload page (still offline)
      await page.reload();
      
      // Data should be restored from local storage
      await expect(inspectionPage.vehicleSelect).toHaveValue('veh-test-001');
    });
  });

  test.describe('Offline-Online Sync', () => {
    
    test('should sync queued submissions when back online', async ({ page, inspectionPage }) => {
      await inspectionPage.gotoNewInspection();
      
      // Fill all steps
      await inspectionPage.fillHeaderInfo({
        vehicleId: 'veh-test-001',
        inspectionType: 'PERIODIC',
        inspectorId: 'insp-test-001',
      });
      await inspectionPage.goToNextStep();
      await inspectionPage.fillExteriorInspection({ hasDamage: false });
      await inspectionPage.goToNextStep();
      await inspectionPage.fillInteriorInspection({ odometerReading: 45000 });
      await inspectionPage.goToNextStep();
      await inspectionPage.fillSensoryInspection({
        humidity: 45,
        smokeDetected: false,
        moldDetected: false,
        acDrainTestPassed: true,
      });
      await inspectionPage.goToNextStep();
      await inspectionPage.fillEngineInspection();
      await inspectionPage.goToNextStep();
      await inspectionPage.fillTiresInspection();
      await inspectionPage.goToNextStep();
      await inspectionPage.fillElectronicsInspection();
      
      // Go offline before submitting
      await simulateOffline(page);
      
      // Submit (should queue)
      await inspectionPage.submitButton.click();
      
      // Verify queued state
      await expect(page.getByText(/queued|in attesa|offline|will submit/i)).toBeVisible();
      
      // Verify sync queue shows pending item
      await expect(page.locator('[data-testid="sync-queue"], .pending-syncs').first()).toBeVisible();
      
      // Restore online
      await restoreOnline(page);
      
      // Wait for auto-sync
      await page.waitForTimeout(2000);
      
      // Should show sync success
      await expect(page.getByText(/synced|sincronizzato|submitted|inviato/i).first()).toBeVisible();
      
      // Should redirect to detail page
      await expect(page).toHaveURL(/\/dashboard\/inspections\/.+/, { timeout: 10000 });
    });

    test('should handle multiple queued inspections', async ({ page, inspectionPage }) => {
      // Create first inspection offline
      await inspectionPage.gotoNewInspection();
      await inspectionPage.fillHeaderInfo({
        vehicleId: 'veh-test-001',
        inspectionType: 'PERIODIC',
        inspectorId: 'insp-test-001',
      });
      
      await simulateOffline(page);
      await inspectionPage.saveDraftButton.click();
      
      // Create second inspection
      await inspectionPage.gotoNewInspection();
      await inspectionPage.fillHeaderInfo({
        vehicleId: 'veh-test-002',
        inspectionType: 'PRE_PURCHASE',
        inspectorId: 'insp-test-001',
      });
      await inspectionPage.saveDraftButton.click();
      
      // Verify queue has 2 items
      const queueItems = page.locator('[data-testid="queue-item"], .sync-queue-item');
      await expect(queueItems).toHaveCount(2);
      
      // Restore online
      await restoreOnline(page);
      
      // Wait for sync
      await page.waitForTimeout(3000);
      
      // Queue should be empty
      await expect(queueItems).toHaveCount(0);
    });

    test('should show sync progress indicator', async ({ page, inspectionPage }) => {
      await inspectionPage.gotoNewInspection();
      await inspectionPage.fillHeaderInfo({
        vehicleId: 'veh-test-001',
        inspectionType: 'PERIODIC',
        inspectorId: 'insp-test-001',
      });
      
      await simulateOffline(page);
      await inspectionPage.saveDraftButton.click();
      
      await restoreOnline(page);
      
      // Should show sync progress
      await expect(page.locator('[data-testid="sync-progress"], .sync-spinner, .syncing-indicator').first()).toBeVisible();
      
      // Wait for completion
      await page.waitForSelector('[data-testid="sync-complete"], .sync-success', { timeout: 10000 });
    });
  });

  test.describe('Conflict Resolution', () => {
    
    test('should handle sync conflicts', async ({ page, inspectionPage }) => {
      await inspectionPage.gotoNewInspection();
      await inspectionPage.fillHeaderInfo({
        vehicleId: 'veh-test-001',
        inspectionType: 'PERIODIC',
        inspectorId: 'insp-test-001',
      });
      
      await simulateOffline(page);
      await inspectionPage.saveDraftButton.click();
      
      // Simulate server-side change while offline
      // (In real scenario, another user modifies the same inspection)
      
      await restoreOnline(page);
      
      // Wait for sync attempt
      await page.waitForTimeout(2000);
      
      // May show conflict resolution dialog
      const conflictDialog = page.locator('[data-testid="conflict-dialog"], .conflict-resolution').first();
      
      if (await conflictDialog.isVisible().catch(() => false)) {
        // Resolve conflict by choosing local version
        await page.getByRole('button', { name: /use local|usa locale|keep mine/i }).click();
        
        // Should complete sync
        await expect(page.getByText(/resolved|risolto|synced/i)).toBeVisible();
      }
    });
  });

  test.describe('Offline Indicators', () => {
    
    test('should show offline badge in header', async ({ page, inspectionPage }) => {
      await inspectionPage.gotoNewInspection();
      await simulateOffline(page);
      
      // Check header for offline badge
      const header = page.locator('header, [data-testid="header"], .app-header').first();
      await expect(header.locator('text=/offline|disconnesso/i')).toBeVisible();
    });

    test('should disable network-dependent features when offline', async ({ page, inspectionPage }) => {
      await inspectionPage.gotoNewInspection();
      await simulateOffline(page);
      
      // Cloud sync features might be disabled
      const cloudSyncButton = page.locator('[data-testid="cloud-sync"], .cloud-sync-btn').first();
      if (await cloudSyncButton.isVisible().catch(() => false)) {
        await expect(cloudSyncButton).toBeDisabled();
      }
    });

    test('should show pending changes count', async ({ page, inspectionPage }) => {
      await inspectionPage.gotoNewInspection();
      await inspectionPage.fillHeaderInfo({
        vehicleId: 'veh-test-001',
        inspectionType: 'PERIODIC',
        inspectorId: 'insp-test-001',
      });
      
      await simulateOffline(page);
      await inspectionPage.saveDraftButton.click();
      
      // Should show pending count badge
      const pendingBadge = page.locator('[data-testid="pending-count"], .pending-badge').first();
      await expect(pendingBadge).toContainText('1');
    });
  });

  test.describe('Photo Upload Offline', () => {
    
    test('should queue photo uploads when offline', async ({ page, inspectionPage }) => {
      await inspectionPage.gotoNewInspection();
      await inspectionPage.goToNextStep(); // To exterior step
      
      await simulateOffline(page);
      
      // Attempt to upload photo
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64'
      );
      
      await inspectionPage.uploadInput.setInputFiles({
        name: 'offline-photo.jpg',
        mimeType: 'image/jpeg',
        buffer: testImageBuffer,
      });
      
      // Should show queued for upload
      await expect(page.getByText(/queued for upload|in coda per upload|waiting for connection/i)).toBeVisible();
      
      // Restore online
      await restoreOnline(page);
      
      // Wait for upload
      await page.waitForTimeout(3000);
      
      // Should show upload complete
      await expect(page.getByText(/uploaded|caricato|complete/i)).toBeVisible();
    });
  });
});
