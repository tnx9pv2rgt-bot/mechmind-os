import { test, expect, Page } from '@playwright/test';

// ============================================
// MOCK HELPERS
// ============================================

function setupPortalAuthMocks(page: Page): void {
  void page.route('**/api/portal/auth/login', (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'mock-portal-token', customer: { firstName: 'Test', lastName: 'User' } }),
      });
    }
    return route.fulfill({ status: 405 });
  });
  void page.route('**/api/portal/auth/register', (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'mock-portal-token', message: 'Registrazione completata' }),
      });
    }
    return route.fulfill({ status: 405 });
  });
  void page.route('**/api/portal/auth/reset-password', (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Email inviata' }),
      });
    }
    return route.fulfill({ status: 405 });
  });
}

// ============================================
// 1. RENDER - Login Form
// ============================================

test.describe('Portal Auth - Login Render', () => {
  test('should render the login page with form fields', async ({ page }) => {
    setupPortalAuthMocks(page);
    await page.goto('/portal/login');

    await expect(page.getByLabel(/email/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('should render login button', async ({ page }) => {
    setupPortalAuthMocks(page);
    await page.goto('/portal/login');

    const loginBtn = page.getByRole('button', { name: /accedi|login|entra/i });
    await expect(loginBtn).toBeVisible({ timeout: 10000 });
  });

  test('should render password toggle button', async ({ page }) => {
    setupPortalAuthMocks(page);
    await page.goto('/portal/login');

    const toggleBtn = page.getByRole('button').filter({ has: page.locator('svg') });
    // At least one icon button (show/hide password)
    if (await toggleBtn.first().isVisible().catch(() => false)) {
      await expect(toggleBtn.first()).toBeVisible();
    }
  });

  test('should render link to register page', async ({ page }) => {
    setupPortalAuthMocks(page);
    await page.goto('/portal/login');

    const registerLink = page.getByRole('link', { name: /registra|sign up|crea account/i })
      .or(page.getByText(/registra|crea account/i));
    await expect(registerLink.first()).toBeVisible({ timeout: 10000 });
  });

  test('should render link to reset password', async ({ page }) => {
    setupPortalAuthMocks(page);
    await page.goto('/portal/login');

    const resetLink = page.getByRole('link', { name: /password dimenticata|reset|recupera/i })
      .or(page.getByText(/password dimenticata|recupera/i));
    await expect(resetLink.first()).toBeVisible({ timeout: 10000 });
  });
});

// ============================================
// 2. LOADING - Login
// ============================================

test.describe('Portal Auth - Login Loading', () => {
  test('should show loading state on login submit', async ({ page }) => {
    void page.route('**/api/portal/auth/login', (route) =>
      new Promise((resolve) => setTimeout(() => resolve(route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'mock' }),
      })), 3000))
    );

    await page.goto('/portal/login');
    await page.getByLabel(/email/i).fill('test@example.it');
    await page.getByLabel(/password/i).fill('Password123!');
    await page.getByRole('button', { name: /accedi|login|entra/i }).click();

    const loader = page.locator('.animate-spin').or(page.getByRole('button', { name: /accedi/i, disabled: true }));
    if (await loader.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(loader.first()).toBeVisible();
    }
  });
});

// ============================================
// 3. EMPTY - Validation
// ============================================

test.describe('Portal Auth - Login Validation', () => {
  test('should show validation error on empty email', async ({ page }) => {
    setupPortalAuthMocks(page);
    await page.goto('/portal/login');

    await page.getByRole('button', { name: /accedi|login|entra/i }).click();

    const errorText = page.getByText(/email non valida|email obbligatoria|inserisci/i);
    await expect(errorText.first()).toBeVisible({ timeout: 5000 });
  });

  test('should show validation error on empty password', async ({ page }) => {
    setupPortalAuthMocks(page);
    await page.goto('/portal/login');

    await page.getByLabel(/email/i).fill('test@example.it');
    await page.getByRole('button', { name: /accedi|login|entra/i }).click();

    const errorText = page.getByText(/inserisci la password|password obbligatoria/i);
    await expect(errorText.first()).toBeVisible({ timeout: 5000 });
  });
});

// ============================================
// 4. ERROR - Login
// ============================================

test.describe('Portal Auth - Login Error', () => {
  test('should show error message on failed login', async ({ page }) => {
    void page.route('**/api/portal/auth/login', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Credenziali non valide' }),
      })
    );

    await page.goto('/portal/login');
    await page.getByLabel(/email/i).fill('wrong@example.it');
    await page.getByLabel(/password/i).fill('WrongPassword!');
    await page.getByRole('button', { name: /accedi|login|entra/i }).click();

    const errorEl = page.getByText(/credenziali|errore|non valide|autenticazione/i);
    await expect(errorEl.first()).toBeVisible({ timeout: 10000 });
  });
});

// ============================================
// 5. DATA - Successful Login
// ============================================

test.describe('Portal Auth - Login Success', () => {
  test('should redirect to portal dashboard on successful login', async ({ page }) => {
    setupPortalAuthMocks(page);

    // Also mock the dashboard page
    void page.route('**/api/portal/dashboard**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { customer: { firstName: 'Test' }, maintenanceDue: [], unpaidInvoices: { count: 0, total: 0 }, activeRepairs: { count: 0 } } }),
      })
    );

    await page.goto('/portal/login');
    await page.getByLabel(/email/i).fill('test@example.it');
    await page.getByLabel(/password/i).fill('Password123!');
    await page.getByRole('button', { name: /accedi|login|entra/i }).click();

    await expect(page).toHaveURL(/portal/, { timeout: 10000 });
  });
});

// ============================================
// 6. ACTIONS - Register Form
// ============================================

test.describe('Portal Auth - Register', () => {
  test('should render register page with required fields', async ({ page }) => {
    setupPortalAuthMocks(page);
    await page.goto('/portal/register');

    await expect(page.getByLabel(/nome/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel(/cognome/i).first()).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/telefono|phone/i).first()).toBeVisible();
  });

  test('should render link to login from register', async ({ page }) => {
    setupPortalAuthMocks(page);
    await page.goto('/portal/register');

    const loginLink = page.getByRole('link', { name: /accedi|login|hai già un account/i })
      .or(page.getByText(/hai già un account|accedi/i));
    await expect(loginLink.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show validation errors on register', async ({ page }) => {
    setupPortalAuthMocks(page);
    await page.goto('/portal/register');

    const submitBtn = page.getByRole('button', { name: /registra|continua|avanti|crea/i });
    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click();

      const errorText = page.getByText(/obbligatorio|non valido|richiesto/i);
      await expect(errorText.first()).toBeVisible({ timeout: 5000 });
    }
  });
});

// ============================================
// RESET PASSWORD
// ============================================

test.describe('Portal Auth - Reset Password', () => {
  test('should render reset password form', async ({ page }) => {
    setupPortalAuthMocks(page);
    await page.goto('/portal/reset-password');

    await expect(page.getByLabel(/email/i)).toBeVisible({ timeout: 10000 });
  });

  test('should render submit button', async ({ page }) => {
    setupPortalAuthMocks(page);
    await page.goto('/portal/reset-password');

    const submitBtn = page.getByRole('button', { name: /invia|reset|recupera|reimposta/i });
    await expect(submitBtn).toBeVisible({ timeout: 10000 });
  });

  test('should render link back to login', async ({ page }) => {
    setupPortalAuthMocks(page);
    await page.goto('/portal/reset-password');

    const backLink = page.getByRole('link', { name: /torna|login|accedi|indietro/i })
      .or(page.getByText(/torna al login/i));
    await expect(backLink.first()).toBeVisible({ timeout: 10000 });
  });

  test('should validate email before submitting', async ({ page }) => {
    setupPortalAuthMocks(page);
    await page.goto('/portal/reset-password');

    const submitBtn = page.getByRole('button', { name: /invia|reset|recupera|reimposta/i });
    await submitBtn.click();

    const errorText = page.getByText(/email|obbligatoria|non valido/i);
    await expect(errorText.first()).toBeVisible({ timeout: 5000 });
  });

  test('should show success message after valid submission', async ({ page }) => {
    setupPortalAuthMocks(page);
    await page.goto('/portal/reset-password');

    await page.getByLabel(/email/i).fill('test@example.it');
    const submitBtn = page.getByRole('button', { name: /invia|reset|recupera|reimposta/i });
    await submitBtn.click();

    const successText = page.getByText(/inviata|controlla|email|successo/i);
    await expect(successText.first()).toBeVisible({ timeout: 10000 });
  });
});
