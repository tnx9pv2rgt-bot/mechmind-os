import { Page, expect } from '@playwright/test';

/**
 * Test Helper Utilities
 * Common functions for E2E tests
 */

/**
 * Wait for element to be stable (not animating)
 */
export async function waitForElementStable(page: Page, selector: string, timeout = 5000): Promise<void> {
  await page.waitForSelector(selector, { state: 'visible', timeout });
  await page.waitForTimeout(300); // Small delay for animations
}

/**
 * Clear and fill input field
 */
export async function clearAndFill(page: Page, selector: string, value: string): Promise<void> {
  const input = page.locator(selector).first();
  await input.click();
  await input.fill('');
  await input.fill(value);
}

/**
 * Select option by visible text
 */
export async function selectByVisibleText(page: Page, selector: string, text: string): Promise<void> {
  const select = page.locator(selector).first();
  await select.selectOption({ label: text });
}

/**
 * Check if element exists
 */
export async function elementExists(page: Page, selector: string): Promise<boolean> {
  const count = await page.locator(selector).count();
  return count > 0;
}

/**
 * Wait for toast/notification to appear and disappear
 */
export async function waitForToast(page: Page, text?: string, timeout = 5000): Promise<void> {
  const toastSelector = '[data-testid="toast"], .toast, .notification, [role="alert"]';
  
  if (text) {
    await expect(page.locator(toastSelector).filter({ hasText: new RegExp(text, 'i') })).toBeVisible({ timeout });
  } else {
    await expect(page.locator(toastSelector).first()).toBeVisible({ timeout });
  }
  
  // Wait for it to disappear
  await page.locator(toastSelector).first().waitFor({ state: 'hidden', timeout: 10000 });
}

/**
 * Take screenshot with timestamp
 */
export async function takeScreenshot(page: Page, name: string): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({ path: `./test-results/screenshots/${name}-${timestamp}.png` });
}

/**
 * Generate random inspection ID
 */
export function generateInspectionId(): string {
  return `INS-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
}

/**
 * Generate random VIN
 */
export function generateVIN(): string {
  const chars = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
  let vin = '';
  for (let i = 0; i < 17; i++) {
    vin += chars[Math.floor(Math.random() * chars.length)];
  }
  return vin;
}

/**
 * Generate Italian license plate
 */
export function generateLicensePlate(): string {
  const letters = 'ABCDEFGHJKLMNPRSTVWXYZ';
  const numbers = '0123456789';
  
  let plate = '';
  plate += letters[Math.floor(Math.random() * letters.length)];
  plate += letters[Math.floor(Math.random() * letters.length)];
  plate += numbers[Math.floor(Math.random() * 10)];
  plate += numbers[Math.floor(Math.random() * 10)];
  plate += numbers[Math.floor(Math.random() * 10)];
  plate += letters[Math.floor(Math.random() * letters.length)];
  plate += letters[Math.floor(Math.random() * letters.length)];
  
  return plate;
}

/**
 * Mock geolocation
 */
export async function mockGeolocation(page: Page, latitude: number, longitude: number): Promise<void> {
  await page.context().grantPermissions(['geolocation']);
  await page.evaluate((lat, lng) => {
    navigator.geolocation.getCurrentPosition = (success) => {
      success({
        coords: {
          latitude: lat,
          longitude: lng,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      } as GeolocationPosition);
    };
  }, latitude, longitude);
}

/**
 * Mock file upload with base64 data
 */
export async function mockFileUpload(
  page: Page,
  selector: string,
  filename: string,
  mimeType: string,
  base64Data: string
): Promise<void> {
  const buffer = Buffer.from(base64Data, 'base64');
  await page.locator(selector).setInputFiles({
    name: filename,
    mimeType,
    buffer,
  });
}

/**
 * Get text content of element safely
 */
export async function getTextContent(page: Page, selector: string): Promise<string> {
  const element = page.locator(selector).first();
  if (!(await element.isVisible().catch(() => false))) {
    return '';
  }
  return (await element.textContent()) || '';
}

/**
 * Scroll to element
 */
export async function scrollToElement(page: Page, selector: string): Promise<void> {
  await page.locator(selector).first().scrollIntoViewIfNeeded();
}

/**
 * Wait for network idle with fallback
 */
export async function waitForNetworkIdle(page: Page, timeout = 5000): Promise<void> {
  try {
    await page.waitForLoadState('networkidle', { timeout });
  } catch {
    // Ignore timeout, continue anyway
  }
}

/**
 * Retry action with exponential backoff
 */
export async function retry<T>(
  action: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await action();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }
  
  throw lastError;
}

/**
 * Format currency for assertions
 */
export function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Parse currency string to number
 */
export function parseCurrency(currencyString: string): number {
  return parseFloat(currencyString.replace(/[^0-9.,]/g, '').replace(',', '.'));
}

/**
 * Create a test image blob (1x1 pixel transparent PNG)
 */
export function createTestImageBlob(): Buffer {
  // Minimal valid PNG: 1x1 transparent pixel
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );
}

/**
 * Create test file object for upload
 */
export function createTestFile(name: string, mimeType: string = 'image/jpeg'): { name: string; mimeType: string; buffer: Buffer } {
  return {
    name,
    mimeType,
    buffer: createTestImageBlob(),
  };
}

/**
 * Type definitions for test data
 */
export interface TestVehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  plate: string;
  vin: string;
  mileage: number;
}

export interface TestCustomer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  taxCode: string;
}

export interface TestInspection {
  id: string;
  vehicleId: string;
  customerId: string;
  type: string;
  status: string;
  createdAt: Date;
}
