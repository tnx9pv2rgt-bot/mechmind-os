import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for Inspection pages
 * Handles all interactions with the inspection workflow
 */

export interface InspectionStepData {
  vehicleId?: string;
  inspectionType?: string;
  inspectorId?: string;
  odometerReading?: number;
  hasDamage?: boolean;
  damageDescription?: string;
  humidity?: number;
  smokeDetected?: boolean;
  moldDetected?: boolean;
  acDrainTestPassed?: boolean;
}

export class InspectionPage {
  readonly page: Page;
  
  // Navigation
  readonly newInspectionButton: Locator;
  readonly submitButton: Locator;
  readonly nextButton: Locator;
  readonly backButton: Locator;
  readonly saveDraftButton: Locator;
  
  // Progress indicators
  readonly progressBar: Locator;
  readonly stepIndicator: Locator;
  
  // Step 1: Header Info
  readonly vehicleSearchInput: Locator;
  readonly vehicleSelect: Locator;
  readonly inspectionTypeSelect: Locator;
  readonly inspectorSelect: Locator;
  readonly captureLocationButton: Locator;
  
  // Step 2: Exterior
  readonly photoUploadInput: Locator;
  readonly photoUploadButton: Locator;
  readonly startVideoButton: Locator;
  readonly hasDamageCheckbox: Locator;
  readonly damageDescriptionTextarea: Locator;
  
  // Step 3: Interior
  readonly odometerInput: Locator;
  readonly seatConditionSelect: Locator;
  readonly dashboardConditionSelect: Locator;
  readonly infotainmentCheckbox: Locator;
  
  // Step 4: Sensory
  readonly humiditySlider: Locator;
  readonly smokeDetectedCheckbox: Locator;
  readonly moldDetectedCheckbox: Locator;
  readonly petSmellCheckbox: Locator;
  readonly mustySmellCheckbox: Locator;
  readonly acDrainTestCheckbox: Locator;
  readonly moldRiskBadge: Locator;
  
  // Step 5: Engine
  readonly engineOilSelect: Locator;
  readonly coolantSelect: Locator;
  readonly brakeFluidSelect: Locator;
  readonly beltConditionSelect: Locator;
  readonly batteryVoltageInput: Locator;
  
  // Step 6: Tires
  readonly frontLeftTreadInput: Locator;
  readonly frontRightTreadInput: Locator;
  readonly rearLeftTreadInput: Locator;
  readonly rearRightTreadInput: Locator;
  readonly suspensionConditionSelect: Locator;
  
  // Step 7: Electronics
  readonly lightsWorkingCheckbox: Locator;
  readonly windowsWorkingCheckbox: Locator;
  readonly locksWorkingCheckbox: Locator;
  readonly acWorkingCheckbox: Locator;
  readonly addObdCodeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Navigation
    this.newInspectionButton = page.getByRole('button', { name: /nuova ispezione|new inspection/i });
    this.submitButton = page.getByRole('button', { name: /submit inspection|invia ispezione/i });
    this.nextButton = page.getByRole('button', { name: /next|avanti|procedi/i });
    this.backButton = page.getByRole('button', { name: /back|indietro/i });
    this.saveDraftButton = page.getByRole('button', { name: /save draft|salva bozza/i });
    
    // Progress
    this.progressBar = page.locator('[role="progressbar"], .progress, [data-testid="progress"]').first();
    this.stepIndicator = page.locator('[data-testid="step-indicator"], .step-indicator').first();
    
    // Step 1: Header
    this.vehicleSearchInput = page.getByPlaceholder(/search vin|targa|cerca/i);
    this.vehicleSelect = page.locator('select[name="header.vehicleId"], [data-testid="vehicle-select"]').first();
    this.inspectionTypeSelect = page.locator('select[name="header.inspectionType"], [data-testid="inspection-type"]').first();
    this.inspectorSelect = page.locator('select[name="header.inspectorId"], [data-testid="inspector-select"]').first();
    this.captureLocationButton = page.getByRole('button', { name: /capture location|cattura posizione/i });
    
    // Step 2: Exterior
    this.photoUploadInput = page.locator('input[type="file"][accept*="image"]').first();
    this.photoUploadButton = page.getByRole('button', { name: /select photos|seleziona foto|carica foto/i });
    this.startVideoButton = page.getByRole('button', { name: /start.*recording|inizia.*registrazione|360/i });
    this.hasDamageCheckbox = page.locator('input[name="exterior.hasDamage"], [data-testid="damage-checkbox"]').first();
    this.damageDescriptionTextarea = page.locator('textarea[name="exterior.damageDescription"], [data-testid="damage-description"]').first();
    
    // Step 3: Interior
    this.odometerInput = page.locator('input[name="interior.odometerReading"], [data-testid="odometer-input"]').first();
    this.seatConditionSelect = page.locator('select[name="interior.seatCondition"]').first();
    this.dashboardConditionSelect = page.locator('select[name="interior.dashboardCondition"]').first();
    this.infotainmentCheckbox = page.locator('input[name="interior.infotainmentWorking"]').first();
    
    // Step 4: Sensory
    this.humiditySlider = page.locator('[data-testid="humidity-slider"], input[type="range"]').first();
    this.smokeDetectedCheckbox = page.locator('input[name="sensory.odors.smokeDetected"], [data-testid="smoke-checkbox"]').first();
    this.moldDetectedCheckbox = page.locator('input[name="sensory.odors.moldDetected"], [data-testid="mold-checkbox"]').first();
    this.petSmellCheckbox = page.locator('input[name="sensory.odors.petSmell"]').first();
    this.mustySmellCheckbox = page.locator('input[name="sensory.odors.mustySmell"]').first();
    this.acDrainTestCheckbox = page.locator('input[name="sensory.acDrainTestPassed"]').first();
    this.moldRiskBadge = page.locator('[data-testid="mold-risk"], .mold-risk-badge').first();
    
    // Step 5: Engine
    this.engineOilSelect = page.locator('select[name="engine.fluidLevels.engineOil"]').first();
    this.coolantSelect = page.locator('select[name="engine.fluidLevels.coolant"]').first();
    this.brakeFluidSelect = page.locator('select[name="engine.fluidLevels.brakeFluid"]').first();
    this.beltConditionSelect = page.locator('select[name="engine.beltCondition"]').first();
    this.batteryVoltageInput = page.locator('input[name="engine.batteryTestResult.voltage"]').first();
    
    // Step 6: Tires
    this.frontLeftTreadInput = page.locator('input[name="tiresSuspension.tires.frontLeft.treadDepth"]').first();
    this.frontRightTreadInput = page.locator('input[name="tiresSuspension.tires.frontRight.treadDepth"]').first();
    this.rearLeftTreadInput = page.locator('input[name="tiresSuspension.tires.rearLeft.treadDepth"]').first();
    this.rearRightTreadInput = page.locator('input[name="tiresSuspension.tires.rearRight.treadDepth"]').first();
    this.suspensionConditionSelect = page.locator('select[name="tiresSuspension.suspension.frontShocks"]').first();
    
    // Step 7: Electronics
    this.lightsWorkingCheckbox = page.locator('input[name="electronics.electronicsCheck.lightsWorking"]').first();
    this.windowsWorkingCheckbox = page.locator('input[name="electronics.electronicsCheck.windowsWorking"]').first();
    this.locksWorkingCheckbox = page.locator('input[name="electronics.electronicsCheck.locksWorking"]').first();
    this.acWorkingCheckbox = page.locator('input[name="electronics.electronicsCheck.acWorking"]').first();
    this.addObdCodeButton = page.getByRole('button', { name: /add code|aggiungi codice|obd/i });
  }

  /**
   * Navigate to new inspection page
   */
  async gotoNewInspection(): Promise<void> {
    await this.page.goto('/dashboard/inspections/new');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to inspections list
   */
  async gotoInspectionsList(): Promise<void> {
    await this.page.goto('/dashboard/inspections');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get current step number from progress indicator
   */
  async getCurrentStep(): Promise<number> {
    const stepText = await this.page.locator('text=/step \\d+ of \\d+/i').textContent();
    const match = stepText?.match(/step (\d+) of/i);
    return match ? parseInt(match[1], 10) : 1;
  }

  /**
   * Fill Step 1: Header Info
   */
  async fillHeaderInfo(data: InspectionStepData): Promise<void> {
    if (data.vehicleId) {
      await this.vehicleSelect.selectOption(data.vehicleId);
    }
    if (data.inspectionType) {
      await this.inspectionTypeSelect.selectOption(data.inspectionType);
    }
    if (data.inspectorId) {
      await this.inspectorSelect.selectOption(data.inspectorId);
    }
  }

  /**
   * Fill Step 2: Exterior Inspection
   */
  async fillExteriorInspection(data: InspectionStepData): Promise<void> {
    if (data.hasDamage !== undefined) {
      if (data.hasDamage) {
        await this.hasDamageCheckbox.check();
        if (data.damageDescription) {
          await this.damageDescriptionTextarea.fill(data.damageDescription);
        }
      } else {
        await this.hasDamageCheckbox.uncheck();
      }
    }
  }

  /**
   * Upload photo for exterior inspection
   */
  async uploadPhoto(filePath: string): Promise<void> {
    await this.photoUploadInput.setInputFiles(filePath);
    // Wait for upload to complete
    await this.page.waitForTimeout(1000);
  }

  /**
   * Fill Step 3: Interior Inspection
   */
  async fillInteriorInspection(data: InspectionStepData): Promise<void> {
    if (data.odometerReading) {
      await this.odometerInput.fill(data.odometerReading.toString());
    }
  }

  /**
   * Fill Step 4: Sensory Inspection
   */
  async fillSensoryInspection(data: InspectionStepData): Promise<void> {
    if (data.smokeDetected !== undefined) {
      if (data.smokeDetected) {
        await this.smokeDetectedCheckbox.check();
      } else {
        await this.smokeDetectedCheckbox.uncheck();
      }
    }
    
    if (data.moldDetected !== undefined) {
      if (data.moldDetected) {
        await this.moldDetectedCheckbox.check();
      } else {
        await this.moldDetectedCheckbox.uncheck();
      }
    }
    
    if (data.acDrainTestPassed !== undefined) {
      if (data.acDrainTestPassed) {
        await this.acDrainTestCheckbox.check();
      } else {
        await this.acDrainTestCheckbox.uncheck();
      }
    }
  }

  /**
   * Fill Step 5: Engine & Mechanical
   */
  async fillEngineInspection(): Promise<void> {
    await this.engineOilSelect.selectOption('ok');
    await this.coolantSelect.selectOption('ok');
    await this.brakeFluidSelect.selectOption('ok');
    await this.beltConditionSelect.selectOption('good');
  }

  /**
   * Fill Step 6: Tires & Suspension
   */
  async fillTiresInspection(): Promise<void> {
    await this.frontLeftTreadInput.fill('6');
    await this.frontRightTreadInput.fill('6');
    await this.rearLeftTreadInput.fill('5');
    await this.rearRightTreadInput.fill('5');
    await this.suspensionConditionSelect.selectOption('good');
  }

  /**
   * Fill Step 7: Electronics & OBD
   */
  async fillElectronicsInspection(): Promise<void> {
    await this.lightsWorkingCheckbox.check();
    await this.windowsWorkingCheckbox.check();
    await this.locksWorkingCheckbox.check();
    await this.acWorkingCheckbox.check();
  }

  /**
   * Navigate to next step
   */
  async goToNextStep(): Promise<void> {
    await this.nextButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Navigate to previous step
   */
  async goToPreviousStep(): Promise<void> {
    await this.backButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Submit the inspection
   */
  async submitInspection(): Promise<void> {
    await this.submitButton.click();
    await this.page.waitForURL(/\/dashboard\/inspections\/.+/, { timeout: 10000 });
  }

  /**
   * Save draft
   */
  async saveDraft(): Promise<void> {
    await this.saveDraftButton.click();
    await this.page.waitForSelector('[data-testid="toast-success"], .toast-success', { timeout: 5000 });
  }

  /**
   * Complete full 7-step inspection workflow
   */
  async completeFullInspection(data: InspectionStepData): Promise<void> {
    // Step 1: Header Info
    await this.fillHeaderInfo(data);
    await this.goToNextStep();
    
    // Step 2: Exterior
    await this.fillExteriorInspection(data);
    await this.goToNextStep();
    
    // Step 3: Interior
    await this.fillInteriorInspection(data);
    await this.goToNextStep();
    
    // Step 4: Sensory
    await this.fillSensoryInspection(data);
    await this.goToNextStep();
    
    // Step 5: Engine
    await this.fillEngineInspection();
    await this.goToNextStep();
    
    // Step 6: Tires
    await this.fillTiresInspection();
    await this.goToNextStep();
    
    // Step 7: Electronics
    await this.fillElectronicsInspection();
    
    // Submit
    await this.submitInspection();
  }

  /**
   * Verify inspection detail page is loaded
   */
  async expectInspectionDetailPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/dashboard\/inspections\/.+/);
    await expect(this.page.locator('text=/inspection|ispezione/i').first()).toBeVisible();
  }

  /**
   * Get inspection ID from URL
   */
  getInspectionIdFromUrl(): string | null {
    const url = this.page.url();
    const match = url.match(/\/inspections\/([^\/]+)/);
    return match ? match[1] : null;
  }
}

export default InspectionPage;
