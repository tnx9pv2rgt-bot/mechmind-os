import { test as base, expect, type Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { InspectionPage } from '../pages/inspection.page';
import { WarrantyPage } from '../pages/warranty.page';
import { AIDamagePage } from '../pages/ai-damage.page';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Extended test fixtures for inspection testing
 */
export type InspectionFixtures = {
  inspectionPage: InspectionPage;
  warrantyPage: WarrantyPage;
  aiDamagePage: AIDamagePage;
  authenticatedInspectionPage: Page;
  testVehicle: {
    id: string;
    make: string;
    model: string;
    year: number;
    plate: string;
    vin: string;
  };
  testInspector: {
    id: string;
    name: string;
    role: string;
  };
  sampleDamagePhoto: string;
  sampleTirePhoto: string;
};

/**
 * Create test vehicle data
 */
function createTestVehicle() {
  return {
    id: 'veh-test-001',
    make: 'Fiat',
    model: 'Panda',
    year: 2020,
    plate: 'AB123CD',
    vin: 'ZFA3120000J123456',
  };
}

/**
 * Create test inspector data
 */
function createTestInspector() {
  return {
    id: 'insp-test-001',
    name: 'Mario Rossi',
    role: 'Senior Mechanic',
  };
}

/**
 * Extended test with inspection fixtures
 */
export const test = base.extend<InspectionFixtures>({
  // Inspection page helper
  inspectionPage: async ({ page }, use) => {
    const inspectionPage = new InspectionPage(page);
    await use(inspectionPage);
  },

  // Warranty page helper
  warrantyPage: async ({ page }, use) => {
    const warrantyPage = new WarrantyPage(page);
    await use(warrantyPage);
  },

  // AI Damage page helper
  aiDamagePage: async ({ page }, use) => {
    const aiDamagePage = new AIDamagePage(page);
    await use(aiDamagePage);
  },

  // Pre-authenticated page for inspection tests
  authenticatedInspectionPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: path.join(__dirname, '../.auth/mechanic.json'),
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  // Test vehicle data
  testVehicle: async ({}, use) => {
    await use(createTestVehicle());
  },

  // Test inspector data
  testInspector: async ({}, use) => {
    await use(createTestInspector());
  },

  // Sample damage photo path
  sampleDamagePhoto: async ({}, use) => {
    // Use a test fixture image or create a mock
    const photoPath = path.join(__dirname, '../fixtures/test-assets/damage-sample.jpg');
    await use(photoPath);
  },

  // Sample tire photo path
  sampleTirePhoto: async ({}, use) => {
    const photoPath = path.join(__dirname, '../fixtures/test-assets/tire-sample.jpg');
    await use(photoPath);
  },
});

/**
 * Helper to create a complete inspection through API
 */
export async function createInspectionViaAPI(
  page: Page,
  data: {
    vehicleId: string;
    inspectionType: string;
    inspectorId: string;
    hasWarranty?: boolean;
  }
): Promise<{ id: string; status: string }> {
  // Navigate to create inspection endpoint
  const response = await page.request.post('/api/inspections', {
    data: {
      vehicleId: data.vehicleId,
      inspectionType: data.inspectionType,
      inspectorId: data.inspectorId,
      status: 'DRAFT',
      header: {
        vehicleId: data.vehicleId,
        inspectionType: data.inspectionType,
        inspectorId: data.inspectorId,
      },
      exterior: {
        photos: [],
        annotations: [],
        hasDamage: false,
      },
      interior: {
        photos: [],
        odometerReading: 45000,
        infotainmentWorking: true,
        seatCondition: 'good',
        dashboardCondition: 'good',
      },
      sensory: {
        humidity: 45,
        odors: {
          smokeDetected: false,
          petSmell: false,
          moldDetected: false,
          mustySmell: false,
        },
        acDrainTestPassed: true,
        acBlockage: 'NONE',
        filterCondition: 'GOOD',
      },
      engine: {
        fluidLevels: {
          engineOil: 'ok',
          coolant: 'ok',
          brakeFluid: 'ok',
          powerSteering: 'ok',
          transmission: 'ok',
        },
        beltCondition: 'good',
        beltTension: 'proper',
        batteryTestResult: {
          voltage: 12.6,
          coldCrankingAmps: 600,
          health: 'good',
        },
      },
      tiresSuspension: {
        tires: {
          frontLeft: { treadDepth: 6, pressure: 32, condition: 'good', photos: [] },
          frontRight: { treadDepth: 6, pressure: 32, condition: 'good', photos: [] },
          rearLeft: { treadDepth: 5, pressure: 32, condition: 'good', photos: [] },
          rearRight: { treadDepth: 5, pressure: 32, condition: 'good', photos: [] },
        },
        suspension: {
          frontShocks: 'good',
          rearShocks: 'good',
          springs: 'good',
          alignment: 'good',
        },
      },
      electronics: {
        obdCodes: [],
        electronicsCheck: {
          lightsWorking: true,
          windowsWorking: true,
          locksWorking: true,
          acWorking: true,
        },
      },
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create inspection: ${await response.text()}`);
  }

  const result = await response.json();
  
  // If warranty is requested, create it
  if (data.hasWarranty) {
    await page.request.post(`/api/inspections/${result.id}/warranty`, {
      data: {
        type: 'extended',
        startDate: new Date().toISOString(),
        expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        maxCoverage: 5000,
        sendEmail: true,
        sendSMS: false,
        alertDaysBeforeExpiry: 30,
      },
    });
  }

  return { id: result.id, status: result.status };
}

/**
 * Helper to simulate offline mode
 */
export async function simulateOffline(page: Page): Promise<void> {
  await page.context().setOffline(true);
}

/**
 * Helper to restore online mode
 */
export async function restoreOnline(page: Page): Promise<void> {
  await page.context().setOffline(false);
}

/**
 * Helper to wait for network idle
 */
export async function waitForNetworkIdle(page: Page, timeout = 5000): Promise<void> {
  try {
    await page.waitForLoadState('networkidle', { timeout });
  } catch {
    // Ignore timeout, continue anyway
  }
}

export { expect };
