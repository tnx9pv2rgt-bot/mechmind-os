import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for Warranty pages
 * Handles warranty dashboard and claim filing
 */

export interface WarrantyClaimData {
  amount: number;
  description: string;
  evidenceFiles?: string[];
}

export class WarrantyPage {
  readonly page: Page;
  
  // Dashboard elements
  readonly warrantyStatusCard: Locator;
  readonly countdownTimer: Locator;
  readonly progressBar: Locator;
  readonly remainingCoverage: Locator;
  readonly warrantyTypeBadge: Locator;
  
  // Claim actions
  readonly newClaimButton: Locator;
  readonly claimHistorySection: Locator;
  readonly claimList: Locator;
  
  // New Claim Modal
  readonly claimAmountInput: Locator;
  readonly claimDescriptionTextarea: Locator;
  readonly evidenceUploadInput: Locator;
  readonly submitClaimButton: Locator;
  readonly cancelClaimButton: Locator;
  
  // Blockchain verification
  readonly verifyBlockchainButton: Locator;
  readonly blockchainAddress: Locator;
  readonly qrCode: Locator;
  readonly viewOnExplorerButton: Locator;
  
  // Alert settings
  readonly emailAlertsSwitch: Locator;
  readonly smsAlertsSwitch: Locator;
  readonly daysBeforeInput: Locator;
  readonly saveSettingsButton: Locator;
  
  // Tabs
  readonly upcomingExpirationsTab: Locator;
  readonly claimHistoryTab: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Dashboard
    this.warrantyStatusCard = page.locator('[data-testid="warranty-status"], .warranty-status-card').first();
    this.countdownTimer = page.locator('[data-testid="countdown"], .countdown-timer').first();
    this.progressBar = page.locator('[data-testid="warranty-progress"], .warranty-progress').first();
    this.remainingCoverage = page.locator('[data-testid="remaining-coverage"], .remaining-coverage').first();
    this.warrantyTypeBadge = page.locator('[data-testid="warranty-type"], .warranty-type-badge').first();
    
    // Claims
    this.newClaimButton = page.getByRole('button', { name: /new claim|nuovo reclamo|file claim/i });
    this.claimHistorySection = page.locator('[data-testid="claim-history"], .claim-history').first();
    this.claimList = page.locator('[data-testid="claim-list"] > *, .claim-item');
    
    // Modal
    this.claimAmountInput = page.locator('input[type="number"][name*="amount"], [data-testid="claim-amount"]').first();
    this.claimDescriptionTextarea = page.locator('textarea[name*="description"], [data-testid="claim-description"]').first();
    this.evidenceUploadInput = page.locator('input[type="file"][accept*="image"]').first();
    this.submitClaimButton = page.getByRole('button', { name: /submit claim|invia reclamo/i });
    this.cancelClaimButton = page.getByRole('button', { name: /cancel|annulla/i });
    
    // Blockchain
    this.verifyBlockchainButton = page.getByRole('button', { name: /verify|verifica.*blockchain/i });
    this.blockchainAddress = page.locator('[data-testid="contract-address"], .contract-address').first();
    this.qrCode = page.locator('[data-testid="qr-code"], img[alt*="QR"]').first();
    this.viewOnExplorerButton = page.getByRole('button', { name: /view on explorer|explorer/i });
    
    // Settings
    this.emailAlertsSwitch = page.locator('input[name*="email"][type="checkbox"], [data-testid="email-alerts"]').first();
    this.smsAlertsSwitch = page.locator('input[name*="sms"][type="checkbox"], [data-testid="sms-alerts"]').first();
    this.daysBeforeInput = page.locator('input[name*="daysBefore"], [data-testid="days-before"]').first();
    this.saveSettingsButton = page.getByRole('button', { name: /save settings|salva impostazioni/i });
    
    // Tabs
    this.upcomingExpirationsTab = page.getByRole('tab', { name: /upcoming|in scadenza/i });
    this.claimHistoryTab = page.getByRole('tab', { name: /history|storico|claims/i });
  }

  /**
   * Navigate to warranty dashboard
   */
  async gotoWarrantyDashboard(warrantyId: string): Promise<void> {
    await this.page.goto(`/dashboard/warranties/${warrantyId}`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to warranty page for an inspection
   */
  async gotoInspectionWarranty(inspectionId: string): Promise<void> {
    await this.page.goto(`/dashboard/inspections/${inspectionId}/warranty`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * File a new warranty claim
   */
  async fileClaim(data: WarrantyClaimData): Promise<void> {
    // Open new claim modal
    await this.newClaimButton.click();
    
    // Wait for modal to appear
    await this.claimAmountInput.waitFor({ state: 'visible' });
    
    // Fill amount
    await this.claimAmountInput.fill(data.amount.toString());
    
    // Fill description
    await this.claimDescriptionTextarea.fill(data.description);
    
    // Upload evidence if provided
    if (data.evidenceFiles && data.evidenceFiles.length > 0) {
      await this.evidenceUploadInput.setInputFiles(data.evidenceFiles);
      await this.page.waitForTimeout(1000);
    }
    
    // Submit
    await this.submitClaimButton.click();
    
    // Wait for success toast or modal to close
    await this.page.waitForSelector('[data-testid="toast-success"], .toast-success', { timeout: 5000 });
  }

  /**
   * Get remaining coverage amount
   */
  async getRemainingCoverage(): Promise<string> {
    const text = await this.remainingCoverage.textContent();
    return text || '';
  }

  /**
   * Get warranty status
   */
  async getWarrantyStatus(): Promise<string> {
    const badge = this.warrantyStatusCard.locator('[data-testid="status-badge"], .badge, .status').first();
    const text = await badge.textContent();
    return text || '';
  }

  /**
   * Verify blockchain
   */
  async verifyOnBlockchain(): Promise<void> {
    await this.verifyBlockchainButton.click();
    
    // Wait for verification to complete
    await this.page.waitForSelector('[data-testid="verified-badge"], .verified', { timeout: 10000 });
  }

  /**
   * Update alert settings
   */
  async updateAlertSettings(settings: {
    email?: boolean;
    sms?: boolean;
    daysBefore?: number;
  }): Promise<void> {
    if (settings.email !== undefined) {
      const isChecked = await this.emailAlertsSwitch.isChecked();
      if (isChecked !== settings.email) {
        await this.emailAlertsSwitch.click();
      }
    }
    
    if (settings.sms !== undefined) {
      const isChecked = await this.smsAlertsSwitch.isChecked();
      if (isChecked !== settings.sms) {
        await this.smsAlertsSwitch.click();
      }
    }
    
    if (settings.daysBefore !== undefined) {
      await this.daysBeforeInput.fill(settings.daysBefore.toString());
    }
    
    await this.saveSettingsButton.click();
    await this.page.waitForSelector('[data-testid="toast-success"], .toast-success', { timeout: 5000 });
  }

  /**
   * Get claim count
   */
  async getClaimCount(): Promise<number> {
    const claims = await this.claimList.count();
    return claims;
  }

  /**
   * Get claim by index
   */
  async getClaimByIndex(index: number): Promise<{
    amount: string;
    status: string;
    description: string;
  } | null> {
    const claim = this.claimList.nth(index);
    if (!(await claim.isVisible())) {
      return null;
    }
    
    return {
      amount: await claim.locator('[data-testid="claim-amount"], .amount').first().textContent() || '',
      status: await claim.locator('[data-testid="claim-status"], .status, .badge').first().textContent() || '',
      description: await claim.locator('[data-testid="claim-description"], .description').first().textContent() || '',
    };
  }

  /**
   * Click on claim to view details
   */
  async viewClaimDetails(index: number): Promise<void> {
    await this.claimList.nth(index).click();
    await this.page.waitForSelector('[data-testid="claim-detail"], .claim-detail-modal', { timeout: 5000 });
  }

  /**
   * Expect warranty dashboard to be loaded
   */
  async expectWarrantyDashboardLoaded(): Promise<void> {
    await expect(this.warrantyStatusCard).toBeVisible();
    await expect(this.countdownTimer).toBeVisible();
    await expect(this.progressBar).toBeVisible();
  }

  /**
   * Wait for claim to appear in list
   */
  async waitForClaimToAppear(description: string, timeout = 10000): Promise<void> {
    await this.page.waitForSelector(
      `text=/.*${description}.*/i`,
      { timeout }
    );
  }
}

export default WarrantyPage;
