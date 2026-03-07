import { test as base, expect, type Page, type Locator } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Types for auth fixture
export interface AuthPage {
  page: Page;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  expectLoggedIn(): Promise<void>;
  expectLoggedOut(): Promise<void>;
}

/**
 * AuthPage helper class for authentication operations
 */
export class AuthPageHelper implements AuthPage {
  constructor(public page: Page) {}

  /**
   * Login with credentials
   */
  async login(email: string, password: string): Promise<void> {
    await this.page.goto('/auth');
    await this.page.getByLabel(/email/i).fill(email);
    await this.page.getByLabel(/password/i).fill(password);
    await this.page.getByRole('button', { name: /login|accedi|entra/i }).click();
    await this.page.waitForURL(/dashboard|mfa|2fa/);
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    // Try different logout patterns
    const userMenu = this.page.locator('[data-testid="user-menu"], button:has-text("Utente"), .user-avatar').first();
    
    if (await userMenu.isVisible().catch(() => false)) {
      await userMenu.click();
      await this.page.getByRole('menuitem', { name: /logout|esci|sign out/i }).click();
    } else {
      // Direct logout via URL
      await this.page.goto('/api/auth/signout');
    }
    
    await this.page.waitForURL(/auth|login/);
  }

  /**
   * Assert user is logged in
   */
  async expectLoggedIn(): Promise<void> {
    await expect(this.page).toHaveURL(/dashboard|app/);
    await expect(this.page.getByText(/dashboard|benvenuto|welcome/i)).toBeVisible();
  }

  /**
   * Assert user is logged out
   */
  async expectLoggedOut(): Promise<void> {
    await expect(this.page).toHaveURL(/auth|login/);
    await expect(this.page.getByLabel(/email/i)).toBeVisible();
  }
}

/**
 * Page Object for MFA flow
 */
export class MFAPage {
  constructor(private page: Page) {}

  async enterTOTPCode(code: string): Promise<void> {
    const inputs = this.page.locator('input[type="text"], input[type="number"], [data-testid="totp-input"]');
    
    // Handle single input or multiple digit inputs
    const count = await inputs.count();
    if (count === 1) {
      await inputs.first().fill(code);
    } else {
      // Multiple digit inputs
      for (let i = 0; i < code.length; i++) {
        await inputs.nth(i).fill(code[i]);
      }
    }
    
    await this.page.getByRole('button', { name: /verifica|verify|conferma/i }).click();
  }

  async selectRecoveryCode(): Promise<void> {
    await this.page.getByText(/codice di recupero|recovery code|backup code/i).click();
  }

  async enterRecoveryCode(code: string): Promise<void> {
    await this.page.getByLabel(/codice di recupero|recovery code/i).fill(code);
    await this.page.getByRole('button', { name: /verifica|verify/i }).click();
  }

  async expectMFARequired(): Promise<void> {
    await expect(this.page).toHaveURL(/mfa|2fa|two-factor/);
    await expect(this.page.getByText(/verifica a due fattori|two.factor|2fa/i)).toBeVisible();
  }

  async expectMFASetup(): Promise<void> {
    await expect(this.page.getByText(/configura 2fa|setup mfa|configurazione/i)).toBeVisible();
    await expect(this.page.locator('img[alt*="QR"], canvas, svg')).toBeVisible();
  }
}

/**
 * Page Object for Dashboard
 */
export class DashboardPage {
  constructor(private page: Page) {}

  async navigateTo(section: string): Promise<void> {
    const sectionMap: Record<string, string> = {
      'bookings': 'Prenotazioni',
      'customers': 'Clienti',
      'vehicles': 'Veicoli',
      'inventory': 'Magazzino',
      'invoices': 'Fatture',
      'reports': 'Report',
      'settings': 'Impostazioni',
    };

    const label = sectionMap[section] || section;
    await this.page.click(`nav a:has-text("${label}"), [data-testid="nav-${section}"]`);
    await this.page.waitForURL(new RegExp(section));
  }

  async expectOnDashboard(): Promise<void> {
    await expect(this.page).toHaveURL(/dashboard/);
    await expect(this.page.getByRole('heading', { name: /dashboard|panoramica/i })).toBeVisible();
  }

  async getNotification(): Promise<Locator> {
    return this.page.locator('[data-testid="toast"], .toast, .notification').first();
  }

  async dismissAllNotifications(): Promise<void> {
    const dismissButtons = this.page.locator('[data-testid="toast-dismiss"], .toast-close');
    const count = await dismissButtons.count();
    for (let i = 0; i < count; i++) {
      await dismissButtons.nth(i).click().catch(() => {});
    }
  }
}

/**
 * Extended test fixture with auth helpers
 */
export type TestFixtures = {
  authPage: AuthPage;
  mfaPage: MFAPage;
  dashboardPage: DashboardPage;
  adminPage: Page;
  userPage: Page;
  mechanicPage: Page;
};

export const test = base.extend<TestFixtures>({
  // Auth page helper
  authPage: async ({ page }, use) => {
    const authPage = new AuthPageHelper(page);
    await use(authPage);
  },

  // MFA page helper
  mfaPage: async ({ page }, use) => {
    const mfaPage = new MFAPage(page);
    await use(mfaPage);
  },

  // Dashboard page helper
  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPage(page);
    await use(dashboardPage);
  },

  // Pre-authenticated admin page
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: path.join(__dirname, '../.auth/admin.json'),
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  // Pre-authenticated user page
  userPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: path.join(__dirname, '../.auth/user.json'),
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  // Pre-authenticated mechanic page
  mechanicPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: path.join(__dirname, '../.auth/mechanic.json'),
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect };
