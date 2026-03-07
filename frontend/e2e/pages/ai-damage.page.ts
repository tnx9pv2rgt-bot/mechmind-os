import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for AI Damage Detection
 * Handles AI-powered damage analysis features
 */

export interface DamageAnalysisResult {
  damageCount: number;
  overallConfidence: number;
  totalCost: number;
  damages: Array<{
    type: string;
    severity: 'minor' | 'moderate' | 'severe';
    confidence: number;
    estimatedCost: number;
  }>;
}

export class AIDamagePage {
  readonly page: Page;
  
  // Image upload and display
  readonly uploadInput: Locator;
  readonly imageContainer: Locator;
  readonly analyzeButton: Locator;
  readonly reanalyzeButton: Locator;
  
  // Bounding boxes
  readonly boundingBoxes: Locator;
  readonly damageBoundingBox: Locator;
  
  // Controls
  readonly zoomInButton: Locator;
  readonly zoomOutButton: Locator;
  readonly showHideBoxesButton: Locator;
  readonly confidenceSlider: Locator;
  readonly zoomLevel: Locator;
  
  // Analysis results
  readonly analysisPanel: Locator;
  readonly damageCount: Locator;
  readonly overallConfidence: Locator;
  readonly totalCost: Locator;
  readonly urgencyScore: Locator;
  
  // Damage list
  readonly damageList: Locator;
  readonly damageItem: Locator;
  
  // Loading state
  readonly loadingSpinner: Locator;
  readonly analysisProgress: Locator;
  
  // Tire analysis
  readonly tireWearVisualization: Locator;
  readonly treadDepthBars: Locator;
  readonly tireCondition: Locator;
  
  // Legend
  readonly legend: Locator;
  readonly damageTypeLegend: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Upload
    this.uploadInput = page.locator('input[type="file"][accept*="image"]').first();
    this.imageContainer = page.locator('[data-testid="image-container"], .image-container, .damage-analyzer-image').first();
    this.analyzeButton = page.getByRole('button', { name: /analyze|analizza|scan/i });
    this.reanalyzeButton = page.getByRole('button', { name: /reanalyze|rianalizza|refresh/i });
    
    // Bounding boxes
    this.boundingBoxes = page.locator('[data-testid="bounding-box"], .damage-bounding-box, .bounding-box');
    this.damageBoundingBox = page.locator('[data-testid="damage-box"], .damage-area').first();
    
    // Controls
    this.zoomInButton = page.getByRole('button', { name: /zoom in|ingrandisci/i });
    this.zoomOutButton = page.getByRole('button', { name: /zoom out|rimpicciolisci/i });
    this.showHideBoxesButton = page.getByRole('button', { name: /show|hide|mostra|nascondi/i });
    this.confidenceSlider = page.locator('[data-testid="confidence-slider"] input, input[type="range"]').first();
    this.zoomLevel = page.locator('[data-testid="zoom-level"], .zoom-percentage').first();
    
    // Results
    this.analysisPanel = page.locator('[data-testid="analysis-panel"], .analysis-results').first();
    this.damageCount = page.locator('[data-testid="damage-count"], .damage-count').first();
    this.overallConfidence = page.locator('[data-testid="confidence-score"], .confidence-score').first();
    this.totalCost = page.locator('[data-testid="total-cost"], .total-cost, .estimated-cost').first();
    this.urgencyScore = page.locator('[data-testid="urgency-score"], .urgency-score').first();
    
    // Damage list
    this.damageList = page.locator('[data-testid="damage-list"], .damage-list').first();
    this.damageItem = page.locator('[data-testid="damage-item"], .damage-item');
    
    // Loading
    this.loadingSpinner = page.locator('[data-testid="loading"], .loading-spinner, .analyzing').first();
    this.analysisProgress = page.locator('[data-testid="analysis-progress"], .analysis-progress').first();
    
    // Tire analysis
    this.tireWearVisualization = page.locator('[data-testid="tire-wear"], .tire-wear-chart').first();
    this.treadDepthBars = page.locator('[data-testid="tread-depth"] .bar, .tread-depth-bar');
    this.tireCondition = page.locator('[data-testid="tire-condition"], .tire-condition').first();
    
    // Legend
    this.legend = page.locator('[data-testid="legend"], .damage-legend').first();
    this.damageTypeLegend = page.locator('[data-testid="damage-type"], .legend-item');
  }

  /**
   * Navigate to AI damage analysis page
   */
  async gotoAIDamageAnalysis(): Promise<void> {
    await this.page.goto('/dashboard/inspections/ai-damage');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to damage analyzer for a specific inspection
   */
  async gotoInspectionDamageAnalysis(inspectionId: string): Promise<void> {
    await this.page.goto(`/dashboard/inspections/${inspectionId}/damage`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Upload a photo for AI analysis
   */
  async uploadPhoto(filePath: string): Promise<void> {
    await this.uploadInput.setInputFiles(filePath);
    await this.page.waitForTimeout(1000);
  }

  /**
   * Trigger AI analysis
   */
  async analyzeImage(): Promise<void> {
    await this.analyzeButton.click();
    
    // Wait for analysis to complete
    await this.page.waitForSelector('[data-testid="analysis-complete"], .analysis-complete, [data-testid="damage-count"]', {
      timeout: 30000,
    });
  }

  /**
   * Wait for AI analysis to complete
   */
  async waitForAnalysisComplete(timeout = 30000): Promise<void> {
    // Wait for loading to disappear
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout });
    
    // Wait for results to appear
    await this.analysisPanel.waitFor({ state: 'visible', timeout });
  }

  /**
   * Get analysis results
   */
  async getAnalysisResults(): Promise<DamageAnalysisResult> {
    const countText = await this.damageCount.textContent() || '0';
    const confidenceText = await this.overallConfidence.textContent() || '0%';
    const costText = await this.totalCost.textContent() || '€0';
    
    // Parse damage items
    const damages = await this.damageItem.evaluateAll((items) => {
      return items.map((item) => {
        const typeEl = item.querySelector('[data-testid="damage-type"], .damage-type');
        const severityEl = item.querySelector('[data-testid="severity"], .severity');
        const confidenceEl = item.querySelector('[data-testid="confidence"], .confidence');
        const costEl = item.querySelector('[data-testid="estimated-cost"], .cost');
        
        return {
          type: typeEl?.textContent || 'unknown',
          severity: (severityEl?.textContent?.toLowerCase() as 'minor' | 'moderate' | 'severe') || 'minor',
          confidence: parseInt(confidenceEl?.textContent?.replace('%', '') || '0', 10) / 100,
          estimatedCost: parseFloat(costEl?.textContent?.replace(/[^0-9.,]/g, '').replace(',', '.') || '0'),
        };
      });
    });
    
    return {
      damageCount: parseInt(countText, 10),
      overallConfidence: parseInt(confidenceText.replace('%', ''), 10) / 100,
      totalCost: parseFloat(costText.replace(/[^0-9.,]/g, '').replace(',', '.')),
      damages,
    };
  }

  /**
   * Get bounding box count
   */
  async getBoundingBoxCount(): Promise<number> {
    return await this.boundingBoxes.count();
  }

  /**
   * Click on a bounding box
   */
  async clickBoundingBox(index: number): Promise<void> {
    await this.boundingBoxes.nth(index).click();
  }

  /**
   * Set confidence threshold
   */
  async setConfidenceThreshold(percentage: number): Promise<void> {
    // Get slider bounds
    const slider = this.confidenceSlider;
    const box = await slider.boundingBox();
    
    if (box) {
      const x = box.x + (box.width * (percentage / 100));
      const y = box.y + box.height / 2;
      await this.page.mouse.click(x, y);
    }
    
    await this.page.waitForTimeout(500);
  }

  /**
   * Zoom in on image
   */
  async zoomIn(): Promise<void> {
    await this.zoomInButton.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Zoom out on image
   */
  async zoomOut(): Promise<void> {
    await this.zoomOutButton.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Toggle bounding box visibility
   */
  async toggleBoundingBoxes(): Promise<void> {
    await this.showHideBoxesButton.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Check if bounding boxes are visible
   */
  async areBoundingBoxesVisible(): Promise<boolean> {
    const count = await this.boundingBoxes.count();
    if (count === 0) return false;
    
    return await this.boundingBoxes.first().isVisible();
  }

  /**
   * Click on damage item in list
   */
  async clickDamageItem(index: number): Promise<void> {
    await this.damageItem.nth(index).click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Get tire analysis results
   */
  async getTireAnalysisResults(): Promise<{
    condition: string;
    averageWearPercent: number;
    sections: Array<{
      section: string;
      wearPercent: number;
      treadDepthMm: number;
    }>;
  } | null> {
    if (!(await this.tireWearVisualization.isVisible())) {
      return null;
    }
    
    const condition = await this.tireCondition.textContent() || '';
    
    const bars = await this.treadDepthBars.evaluateAll((elements) => {
      return elements.map((el, index) => {
        const sectionNames = ['inner', 'middle', 'outer'];
        const height = el.querySelector('.bar-fill')?.getAttribute('style') || '';
        const wearMatch = height.match(/height:\s*(\d+)%/);
        
        return {
          section: sectionNames[index] || 'unknown',
          wearPercent: 100 - parseInt(wearMatch?.[1] || '0', 10),
          treadDepthMm: parseFloat(el.querySelector('.depth-value')?.textContent || '0'),
        };
      });
    });
    
    const avgWear = bars.reduce((sum, b) => sum + b.wearPercent, 0) / bars.length;
    
    return {
      condition: condition.toLowerCase(),
      averageWearPercent: Math.round(avgWear),
      sections: bars,
    };
  }

  /**
   * Expect analysis to show damages
   */
  async expectDamagesDetected(minCount: number = 1): Promise<void> {
    const count = await this.getBoundingBoxCount();
    expect(count).toBeGreaterThanOrEqual(minCount);
    
    const results = await this.getAnalysisResults();
    expect(results.damageCount).toBeGreaterThanOrEqual(minCount);
  }

  /**
   * Expect cost estimation to be present
   */
  async expectCostEstimationPresent(): Promise<void> {
    const costText = await this.totalCost.textContent();
    expect(costText).toMatch(/[€$£]?\s*[\d.,]+/);
  }

  /**
   * Wait for bounding boxes to appear
   */
  async waitForBoundingBoxes(timeout = 10000): Promise<void> {
    await this.page.waitForSelector('[data-testid="bounding-box"], .damage-bounding-box', {
      state: 'visible',
      timeout,
    });
  }
}

export default AIDamagePage;
