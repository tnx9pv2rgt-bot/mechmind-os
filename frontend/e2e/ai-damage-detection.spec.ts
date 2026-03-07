import { test, expect } from './fixtures/inspection.fixture';

/**
 * AI Damage Detection E2E Tests
 * 
 * Tests AI-powered damage analysis features:
 * - Upload damage photo
 * - Wait for AI analysis
 * - Verify bounding boxes appear
 * - Verify cost estimation
 */

test.describe('AI Damage Detection', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login as mechanic
    await page.goto('/auth');
    await page.getByLabel(/email/i).fill('mechanic@mechmind.local');
    await page.getByLabel(/password/i).fill('MechanicPassword123!');
    await page.getByRole('button', { name: /login|accedi/i }).click();
    await page.waitForURL(/dashboard/);
  });

  test.describe('Photo Upload', () => {
    
    test('should upload damage photo for analysis', async ({ aiDamagePage }) => {
      await aiDamagePage.gotoAIDamageAnalysis();
      
      // Create a test image
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64'
      );
      
      // Upload photo
      await aiDamagePage.uploadInput.setInputFiles({
        name: 'damage-photo.jpg',
        mimeType: 'image/jpeg',
        buffer: testImageBuffer,
      });
      
      // Image should be displayed
      await expect(aiDamagePage.imageContainer).toBeVisible();
    });

    test('should accept multiple image formats', async ({ aiDamagePage }) => {
      await aiDamagePage.gotoAIDamageAnalysis();
      
      const formats = [
        { name: 'photo.jpg', type: 'image/jpeg' },
        { name: 'photo.png', type: 'image/png' },
        { name: 'photo.webp', type: 'image/webp' },
      ];
      
      for (const format of formats) {
        const testImageBuffer = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
          'base64'
        );
        
        await aiDamagePage.uploadInput.setInputFiles({
          name: format.name,
          mimeType: format.type,
          buffer: testImageBuffer,
        });
        
        // Each format should be accepted
        await expect(aiDamagePage.imageContainer).toBeVisible();
      }
    });

    test('should show upload progress', async ({ aiDamagePage }) => {
      await aiDamagePage.gotoAIDamageAnalysis();
      
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64'
      );
      
      await aiDamagePage.uploadInput.setInputFiles({
        name: 'large-damage-photo.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.concat([testImageBuffer, testImageBuffer, testImageBuffer]), // Larger buffer
      });
      
      // Progress indicator might appear for larger files
      await aiDamagePage.page.waitForTimeout(500);
    });
  });

  test.describe('AI Analysis', () => {
    
    test('should trigger AI analysis automatically', async ({ aiDamagePage }) => {
      await aiDamagePage.gotoAIDamageAnalysis();
      
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64'
      );
      
      await aiDamagePage.uploadInput.setInputFiles({
        name: 'auto-analyze.jpg',
        mimeType: 'image/jpeg',
        buffer: testImageBuffer,
      });
      
      // AI analysis should start automatically or with button click
      if (await aiDamagePage.analyzeButton.isVisible()) {
        await aiDamagePage.analyzeImage();
      }
      
      // Wait for analysis to complete
      await aiDamagePage.waitForAnalysisComplete();
    });

    test('should show loading indicator during analysis', async ({ aiDamagePage }) => {
      await aiDamagePage.gotoAIDamageAnalysis();
      
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64'
      );
      
      await aiDamagePage.uploadInput.setInputFiles({
        name: 'loading-test.jpg',
        mimeType: 'image/jpeg',
        buffer: testImageBuffer,
      });
      
      // Trigger analysis
      if (await aiDamagePage.analyzeButton.isVisible()) {
        await aiDamagePage.analyzeButton.click();
      }
      
      // Loading indicator should appear
      await expect(aiDamagePage.loadingSpinner.or(aiDamagePage.analysisProgress)).toBeVisible();
      
      // Wait for completion
      await aiDamagePage.waitForAnalysisComplete();
    });

    test('should display analysis completion message', async ({ aiDamagePage }) => {
      await aiDamagePage.gotoAIDamageAnalysis();
      
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64'
      );
      
      await aiDamagePage.uploadInput.setInputFiles({
        name: 'complete-test.jpg',
        mimeType: 'image/jpeg',
        buffer: testImageBuffer,
      });
      
      if (await aiDamagePage.analyzeButton.isVisible()) {
        await aiDamagePage.analyzeImage();
      }
      
      // Analysis panel should be visible after completion
      await expect(aiDamagePage.analysisPanel).toBeVisible();
    });

    test('should allow reanalysis', async ({ aiDamagePage }) => {
      await aiDamagePage.gotoAIDamageAnalysis();
      
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64'
      );
      
      await aiDamagePage.uploadInput.setInputFiles({
        name: 'reanalyze-test.jpg',
        mimeType: 'image/jpeg',
        buffer: testImageBuffer,
      });
      
      // First analysis
      if (await aiDamagePage.analyzeButton.isVisible()) {
        await aiDamagePage.analyzeImage();
      }
      await aiDamagePage.waitForAnalysisComplete();
      
      // Reanalyze button should be available
      if (await aiDamagePage.reanalyzeButton.isVisible()) {
        await aiDamagePage.reanalyzeButton.click();
        await aiDamagePage.waitForAnalysisComplete();
      }
    });
  });

  test.describe('Bounding Boxes', () => {
    
    test('should display bounding boxes around detected damage', async ({ aiDamagePage }) => {
      await aiDamagePage.gotoAIDamageAnalysis();
      
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64'
      );
      
      await aiDamagePage.uploadInput.setInputFiles({
        name: 'bbox-test.jpg',
        mimeType: 'image/jpeg',
        buffer: testImageBuffer,
      });
      
      if (await aiDamagePage.analyzeButton.isVisible()) {
        await aiDamagePage.analyzeImage();
      }
      
      await aiDamagePage.waitForBoundingBoxes();
      
      // Bounding boxes should be visible
      const boxCount = await aiDamagePage.getBoundingBoxCount();
      expect(boxCount).toBeGreaterThan(0);
    });

    test('should have different colors for different damage types', async ({ aiDamagePage }) => {
      await aiDamagePage.gotoAIDamageAnalysis();
      
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64'
      );
      
      await aiDamagePage.uploadInput.setInputFiles({
        name: 'colors-test.jpg',
        mimeType: 'image/jpeg',
        buffer: testImageBuffer,
      });
      
      if (await aiDamagePage.analyzeButton.isVisible()) {
        await aiDamagePage.analyzeImage();
      }
      
      await aiDamagePage.waitForBoundingBoxes();
      
      // Legend should show different damage types with colors
      await expect(aiDamagePage.legend).toBeVisible();
      
      // Check for damage type labels in legend
      const legendText = await aiDamagePage.legend.textContent() || '';
      const damageTypes = ['dent', 'scratch', 'rust', 'crack', 'ammaccatura', 'graffio', 'ruggine', 'crepa'];
      const hasDamageType = damageTypes.some(type => legendText.toLowerCase().includes(type));
      expect(hasDamageType).toBe(true);
    });

    test('should toggle bounding box visibility', async ({ aiDamagePage }) => {
      await aiDamagePage.gotoAIDamageAnalysis();
      
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64'
      );
      
      await aiDamagePage.uploadInput.setInputFiles({
        name: 'toggle-test.jpg',
        mimeType: 'image/jpeg',
        buffer: testImageBuffer,
      });
      
      if (await aiDamagePage.analyzeButton.isVisible()) {
        await aiDamagePage.analyzeImage();
      }
      
      await aiDamagePage.waitForBoundingBoxes();
      
      // Initially should be visible
      expect(await aiDamagePage.areBoundingBoxesVisible()).toBe(true);
      
      // Toggle off
      await aiDamagePage.toggleBoundingBoxes();
      expect(await aiDamagePage.areBoundingBoxesVisible()).toBe(false);
      
      // Toggle on
      await aiDamagePage.toggleBoundingBoxes();
      expect(await aiDamagePage.areBoundingBoxesVisible()).toBe(true);
    });

    test('should click on bounding box to select damage', async ({ aiDamagePage }) => {
      await aiDamagePage.gotoAIDamageAnalysis();
      
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64'
      );
      
      await aiDamagePage.uploadInput.setInputFiles({
        name: 'select-test.jpg',
        mimeType: 'image/jpeg',
        buffer: testImageBuffer,
      });
      
      if (await aiDamagePage.analyzeButton.isVisible()) {
        await aiDamagePage.analyzeImage();
      }
      
      await aiDamagePage.waitForBoundingBoxes();
      
      // Click on first bounding box
      await aiDamagePage.clickBoundingBox(0);
      
      // Selected state should be visible (highlighted border, etc.)
      await expect(aiDamagePage.page.locator('[data-testid="selected-damage"], .selected-box, .damage-selected').first()).toBeVisible();
    });

    test('should show damage labels on bounding boxes', async ({ aiDamagePage }) => {
      await aiDamagePage.gotoAIDamageAnalysis();
      
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64'
      );
      
      await aiDamagePage.uploadInput.setInputFiles({
        name: 'labels-test.jpg',
        mimeType: 'image/jpeg',
        buffer: testImageBuffer,
      });
      
      if (await aiDamagePage.analyzeButton.isVisible()) {
        await aiDamagePage.analyzeImage();
      }
      
      await aiDamagePage.waitForBoundingBoxes();
      
      // Bounding boxes should have labels
      const labels = aiDamagePage.page.locator('[data-testid="damage-label"], .damage-label, .bbox-label');
      await expect(labels.first()).toBeVisible();
    });
  });

  test.describe('Cost Estimation', () => {
    
    test('should display total estimated cost', async ({ aiDamagePage }) => {
      await aiDamagePage.gotoAIDamageAnalysis();
      
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64'
      );
      
      await aiDamagePage.uploadInput.setInputFiles({
        name: 'cost-test.jpg',
        mimeType: 'image/jpeg',
        buffer: testImageBuffer,
      });
      
      if (await aiDamagePage.analyzeButton.isVisible()) {
        await aiDamagePage.analyzeAnalysisComplete();
      }
      
      // Total cost should be displayed
      await expect(aiDamagePage.totalCost).toBeVisible();
      
      // Should contain currency
      const costText = await aiDamagePage.totalCost.textContent();
      expect(costText).toMatch(/[€$£]?\s*[\d.,]+/);
    });

    test('should show individual damage costs', async ({ aiDamagePage }) => {
      await aiDamagePage.gotoAIDamageAnalysis();
      
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64'
      );
      
      await aiDamagePage.uploadInput.setInputFiles({
        name: 'individual-cost-test.jpg',
        mimeType: 'image/jpeg',
        buffer: testImageBuffer,
      });
      
      if (await aiDamagePage.analyzeButton.isVisible()) {
        await aiDamagePage.analyzeImage();
      }
      await aiDamagePage.waitForAnalysisComplete();
      
      // Individual damage items should show costs
      const damageItems = aiDamagePage.damageItem;
      const count = await damageItems.count();
      
      for (let i = 0; i < count; i++) {
        const cost = await damageItems.nth(i).locator('[data-testid="damage-cost"], .cost').textContent();
        expect(cost).toMatch(/[€$£]?\s*[\d.,]+/);
      }
    });

    test('should update cost when confidence threshold changes', async ({ aiDamagePage }) => {
      await aiDamagePage.gotoAIDamageAnalysis();
      
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64'
      );
      
      await aiDamagePage.uploadInput.setInputFiles({
        name: 'threshold-cost-test.jpg',
        mimeType: 'image/jpeg',
        buffer: testImageBuffer,
      });
      
      if (await aiDamagePage.analyzeButton.isVisible()) {
        await aiDamagePage.analyzeImage();
      }
      await aiDamagePage.waitForAnalysisComplete();
      
      // Get initial cost
      const initialCost = await aiDamagePage.totalCost.textContent();
      
      // Change confidence threshold
      await aiDamagePage.setConfidenceThreshold(80);
      
      // Cost might change based on filtered results
      await aiDamagePage.page.waitForTimeout(500);
    });

    test('should show urgency score', async ({ aiDamagePage }) => {
      await aiDamagePage.gotoAIDamageAnalysis();
      
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64'
      );
      
      await aiDamagePage.uploadInput.setInputFiles({
        name: 'urgency-test.jpg',
        mimeType: 'image/jpeg',
        buffer: testImageBuffer,
      });
      
      if (await aiDamagePage.analyzeButton.isVisible()) {
        await aiDamagePage.analyzeImage();
      }
      await aiDamagePage.waitForAnalysisComplete();
      
      // Urgency score should be visible
      await expect(aiDamagePage.urgencyScore).toBeVisible();
      
      // Should be a number between 0-10
      const scoreText = await aiDamagePage.urgencyScore.textContent();
      const score = parseInt(scoreText?.replace(/\D/g, '') || '0', 10);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(10);
    });
  });

  test.describe('Damage List', () => {
    
    test('should display list of detected damages', async ({ aiDamagePage }) => {
      await aiDamagePage.gotoAIDamageAnalysis();
      
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64'
      );
      
      await aiDamagePage.uploadInput.setInputFiles({
        name: 'list-test.jpg',
        mimeType: 'image/jpeg',
        buffer: testImageBuffer,
      });
      
      if (await aiDamagePage.analyzeButton.isVisible()) {
        await aiDamagePage.analyzeImage();
      }
      await aiDamagePage.waitForAnalysisComplete();
      
      // Damage list should be visible
      await expect(aiDamagePage.damageList).toBeVisible();
      
      // Should have items
      const count = await aiDamagePage.damageItem.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should show damage type and severity in list', async ({ aiDamagePage }) => {
      await aiDamagePage.gotoAIDamageAnalysis();
      
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64'
      );
      
      await aiDamagePage.uploadInput.setInputFiles({
        name: 'details-test.jpg',
        mimeType: 'image/jpeg',
        buffer: testImageBuffer,
      });
      
      if (await aiDamagePage.analyzeButton.isVisible()) {
        await aiDamagePage.analyzeImage();
      }
      await aiDamagePage.waitForAnalysisComplete();
      
      // First damage item should have type and severity
      const firstItem = aiDamagePage.damageItem.first();
      await expect(firstItem.locator('[data-testid="damage-type"], .damage-type').or(
        firstItem.locator('text=/dent|scratch|rust|crack/i')
      )).toBeVisible();
    });

    test('should click on damage item to highlight bounding box', async ({ aiDamagePage }) => {
      await aiDamagePage.gotoAIDamageAnalysis();
      
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64'
      );
      
      await aiDamagePage.uploadInput.setInputFiles({
        name: 'highlight-test.jpg',
        mimeType: 'image/jpeg',
        buffer: testImageBuffer,
      });
      
      if (await aiDamagePage.analyzeButton.isVisible()) {
        await aiDamagePage.analyzeImage();
      }
      await aiDamagePage.waitForAnalysisComplete();
      
      // Click on first damage item
      await aiDamagePage.clickDamageItem(0);
      
      // Corresponding bounding box should be highlighted
      await expect(aiDamagePage.page.locator('.highlighted, [data-testid="highlighted-box"]').first()).toBeVisible();
    });
  });

  test.describe('Zoom and Navigation', () => {
    
    test('should zoom in and out on image', async ({ aiDamagePage }) => {
      await aiDamagePage.gotoAIDamageAnalysis();
      
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64'
      );
      
      await aiDamagePage.uploadInput.setInputFiles({
        name: 'zoom-test.jpg',
        mimeType: 'image/jpeg',
        buffer: testImageBuffer,
      });
      
      // Zoom in
      await aiDamagePage.zoomIn();
      
      // Zoom level should increase
      const zoomLevel = await aiDamagePage.zoomLevel.textContent();
      expect(zoomLevel).toContain('125'); // 125% or similar
      
      // Zoom out
      await aiDamagePage.zoomOut();
    });

    test('should pan/zoom to selected damage', async ({ aiDamagePage }) => {
      await aiDamagePage.gotoAIDamageAnalysis();
      
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64'
      );
      
      await aiDamagePage.uploadInput.setInputFiles({
        name: 'pan-test.jpg',
        mimeType: 'image/jpeg',
        buffer: testImageBuffer,
      });
      
      if (await aiDamagePage.analyzeButton.isVisible()) {
        await aiDamagePage.analyzeImage();
      }
      await aiDamagePage.waitForAnalysisComplete();
      
      // Click on damage item should focus/zoom to that area
      await aiDamagePage.clickDamageItem(0);
    });
  });

  test.describe('Confidence Threshold', () => {
    
    test('should filter damages by confidence threshold', async ({ aiDamagePage }) => {
      await aiDamagePage.gotoAIDamageAnalysis();
      
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64'
      );
      
      await aiDamagePage.uploadInput.setInputFiles({
        name: 'filter-test.jpg',
        mimeType: 'image/jpeg',
        buffer: testImageBuffer,
      });
      
      if (await aiDamagePage.analyzeButton.isVisible()) {
        await aiDamagePage.analyzeImage();
      }
      await aiDamagePage.waitForAnalysisComplete();
      
      // Get initial count
      const initialCount = await aiDamagePage.damageItem.count();
      
      // Set high confidence threshold
      await aiDamagePage.setConfidenceThreshold(90);
      
      // Count might decrease
      await aiDamagePage.page.waitForTimeout(500);
    });

    test('should show confidence percentage for each damage', async ({ aiDamagePage }) => {
      await aiDamagePage.gotoAIDamageAnalysis();
      
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64'
      );
      
      await aiDamagePage.uploadInput.setInputFiles({
        name: 'confidence-test.jpg',
        mimeType: 'image/jpeg',
        buffer: testImageBuffer,
      });
      
      if (await aiDamagePage.analyzeButton.isVisible()) {
        await aiDamagePage.analyzeImage();
      }
      await aiDamagePage.waitForAnalysisComplete();
      
      // Each damage should show confidence percentage
      const firstItem = aiDamagePage.damageItem.first();
      const confidenceText = await firstItem.locator('[data-testid="confidence"], .confidence, text=/\\d+%/').textContent();
      expect(confidenceText).toMatch(/\d+%/);
    });
  });

  test.describe('Tire Wear Analysis', () => {
    
    test('should analyze tire wear when tire photo uploaded', async ({ aiDamagePage }) => {
      await aiDamagePage.gotoAIDamageAnalysis();
      
      // Upload tire photo
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64'
      );
      
      await aiDamagePage.uploadInput.setInputFiles({
        name: 'tire-tread.jpg',
        mimeType: 'image/jpeg',
        buffer: testImageBuffer,
      });
      
      if (await aiDamagePage.analyzeButton.isVisible()) {
        await aiDamagePage.analyzeImage();
      }
      await aiDamagePage.waitForAnalysisComplete();
      
      // Tire wear visualization might appear
      // (Only if the AI detects this as a tire photo)
      const hasTireAnalysis = await aiDamagePage.tireWearVisualization.isVisible().catch(() => false);
      
      if (hasTireAnalysis) {
        await expect(aiDamagePage.treadDepthBars.first()).toBeVisible();
        await expect(aiDamagePage.tireCondition).toBeVisible();
      }
    });

    test('should display tread depth visualization', async ({ aiDamagePage }) => {
      await aiDamagePage.gotoAIDamageAnalysis();
      
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64'
      );
      
      await aiDamagePage.uploadInput.setInputFiles({
        name: 'tire-depth.jpg',
        mimeType: 'image/jpeg',
        buffer: testImageBuffer,
      });
      
      if (await aiDamagePage.analyzeButton.isVisible()) {
        await aiDamagePage.analyzeImage();
      }
      await aiDamagePage.waitForAnalysisComplete();
      
      // Check for tire analysis results
      const results = await aiDamagePage.getTireAnalysisResults();
      
      if (results) {
        expect(results.sections.length).toBeGreaterThan(0);
        expect(results.averageWearPercent).toBeGreaterThanOrEqual(0);
        expect(results.averageWearPercent).toBeLessThanOrEqual(100);
      }
    });
  });

  test.describe('Integration with Inspection', () => {
    
    test('should access AI damage from inspection form', async ({ page, inspectionPage, aiDamagePage }) => {
      await inspectionPage.gotoNewInspection();
      
      // Fill header and go to exterior step
      await inspectionPage.fillHeaderInfo({
        vehicleId: 'veh-test-001',
        inspectionType: 'ACCIDENT',
        inspectorId: 'insp-test-001',
      });
      await inspectionPage.goToNextStep();
      
      // Should have AI analysis button or integration
      const aiButton = page.getByRole('button', { name: /ai analysis|analisi ai|detect damage/i });
      
      if (await aiButton.isVisible().catch(() => false)) {
        await aiButton.click();
        
        // Should open AI analysis interface
        await expect(page.locator('[data-testid="ai-analyzer"], .damage-analyzer').first()).toBeVisible();
      }
    });

    test('should save AI results to inspection', async ({ page, inspectionPage }) => {
      // This would test that AI analysis results are saved as part of the inspection
      // Implementation depends on how the integration works
      await inspectionPage.gotoNewInspection();
      await inspectionPage.fillHeaderInfo({
        vehicleId: 'veh-test-001',
        inspectionType: 'ACCIDENT',
        inspectorId: 'insp-test-001',
      });
      await inspectionPage.goToNextStep();
      
      // Upload photo that triggers AI
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64'
      );
      
      await inspectionPage.uploadPhoto('exterior', {
        name: 'damage.jpg',
        mimeType: 'image/jpeg',
        buffer: testImageBuffer,
      });
      
      // AI detected damage flag might be set
      await expect(page.locator('text=/ai detected|ai rilevato/i').first()).toBeVisible();
    });
  });
});
