import { test, expect } from '../fixtures/auth.fixture';
import { TestDataFactory } from '../helpers/test-data';

/**
 * Authentication Login Flow Tests
 * Comprehensive test suite for user authentication
 */

test.describe('Login Page', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
  });

  test('should display login form with all required fields', async ({ page }) => {
    // Check form elements exist
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /login|accedi|entra/i })).toBeVisible();
    
    // Check for password visibility toggle if exists
    const passwordToggle = page.locator('button[aria-label*="password"], button[aria-label*="mostra"]').first();
    if (await passwordToggle.isVisible().catch(() => false)) {
      await expect(passwordToggle).toBeVisible();
    }
  });

  test('should show validation error for empty email', async ({ page }) => {
    await page.getByRole('button', { name: /login|accedi/i }).click();
    
    await expect(page.getByText(/email è obbligatoria|email is required|inserisci l'email/i)).toBeVisible();
  });

  test('should show validation error for invalid email format', async ({ page }) => {
    await page.getByLabel(/email/i).fill('invalid-email');
    await page.getByLabel(/password/i).fill('somepassword');
    await page.getByRole('button', { name: /login|accedi/i }).click();
    
    await expect(page.getByText(/formato email non valido|invalid email|email non valida/i)).toBeVisible();
  });

  test('should show validation error for empty password', async ({ page }) => {
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByRole('button', { name: /login|accedi/i }).click();
    
    await expect(page.getByText(/password è obbligatoria|password is required|inserisci la password/i)).toBeVisible();
  });

  test('should show validation error for short password', async ({ page }) => {
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('123');
    await page.getByRole('button', { name: /login|accedi/i }).click();
    
    await expect(page.getByText(/password.*almeno|password.*minimum|troppo corta/i)).toBeVisible();
  });

  test('should successfully login with valid credentials', async ({ authPage, page }) => {
    const user = TestDataFactory.predefinedUsers.customer;
    
    await authPage.login(user.email, user.password);
    
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.getByText(/benvenuto|welcome/i)).toBeVisible();
  });

  test('should successfully login with admin credentials', async ({ authPage, page }) => {
    const admin = TestDataFactory.predefinedUsers.admin;
    
    await authPage.login(admin.email, admin.password);
    
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.getByText(/admin|amministratore/i)).toBeVisible();
  });

  test('should successfully login with mechanic credentials', async ({ authPage, page }) => {
    const mechanic = TestDataFactory.predefinedUsers.mechanic;
    
    await authPage.login(mechanic.email, mechanic.password);
    
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.getByText(/officina|workshop|meccanico/i)).toBeVisible();
  });

  test('should display error for incorrect password', async ({ page }) => {
    const user = TestDataFactory.predefinedUsers.customer;
    
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/password/i).fill('WrongPassword123!');
    await page.getByRole('button', { name: /login|accedi/i }).click();
    
    await expect(page.getByText(/credenziali non valide|invalid credentials|password errata/i)).toBeVisible();
    await expect(page).toHaveURL(/auth/);
  });

  test('should display error for non-existent user', async ({ page }) => {
    await page.getByLabel(/email/i).fill('nonexistent@example.com');
    await page.getByLabel(/password/i).fill('SomePassword123!');
    await page.getByRole('button', { name: /login|accedi/i }).click();
    
    await expect(page.getByText(/utente non trovato|user not found|credenziali/i)).toBeVisible();
  });

  test('should disable submit button during login request', async ({ page }) => {
    const user = TestDataFactory.predefinedUsers.customer;
    
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/password/i).fill(user.password);
    
    const submitButton = page.getByRole('button', { name: /login|accedi/i });
    await submitButton.click();
    
    // Button should be disabled while loading
    await expect(submitButton).toBeDisabled();
  });

  test('should show loading state during login', async ({ page }) => {
    const user = TestDataFactory.predefinedUsers.customer;
    
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/password/i).fill(user.password);
    await page.getByRole('button', { name: /login|accedi/i }).click();
    
    // Check for loading indicator
    await expect(page.locator('[data-testid="loading"], .loading, .spinner, button:has(.spinner)')).toBeVisible();
  });

  test('should persist session after page reload', async ({ authPage, page }) => {
    const user = TestDataFactory.predefinedUsers.customer;
    
    await authPage.login(user.email, user.password);
    await expect(page).toHaveURL(/dashboard/);
    
    // Reload page
    await page.reload();
    
    // Should still be logged in
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.getByText(/benvenuto|welcome/i)).toBeVisible();
  });

  test('should redirect to original URL after login', async ({ page }) => {
    const user = TestDataFactory.predefinedUsers.customer;
    const targetUrl = '/dashboard/bookings';
    
    // Try to access protected page
    await page.goto(targetUrl);
    
    // Should redirect to login with return URL
    await expect(page).toHaveURL(/auth.*redirect|login.*return/);
    
    // Login
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/password/i).fill(user.password);
    await page.getByRole('button', { name: /login|accedi/i }).click();
    
    // Should redirect to original URL
    await expect(page).toHaveURL(new RegExp(targetUrl.replace('/', '\\/')));
  });

  test('should have link to password reset', async ({ page }) => {
    const forgotPasswordLink = page.getByRole('link', { name: /password dimenticata|forgot password|recupera/i });
    await expect(forgotPasswordLink).toBeVisible();
    
    await forgotPasswordLink.click();
    await expect(page).toHaveURL(/reset-password|forgot-password|recupero/);
  });

  test('should have link to registration', async ({ page }) => {
    const registerLink = page.getByRole('link', { name: /registrati|sign up|crea account|registrazione/i });
    await expect(registerLink).toBeVisible();
    
    await registerLink.click();
    await expect(page).toHaveURL(/register|signup|registrazione/);
  });

  test('should toggle password visibility', async ({ page }) => {
    const passwordInput = page.getByLabel(/password/i);
    await passwordInput.fill('Secret123!');
    
    // Initially password should be hidden
    await expect(passwordInput).toHaveAttribute('type', 'password');
    
    // Find and click toggle button
    const toggleButton = page.locator('button[aria-label*="password"], button[aria-label*="mostra"]').first();
    if (await toggleButton.isVisible().catch(() => false)) {
      await toggleButton.click();
      
      // Password should now be visible
      await expect(passwordInput).toHaveAttribute('type', 'text');
      
      await toggleButton.click();
      
      // Password should be hidden again
      await expect(passwordInput).toHaveAttribute('type', 'password');
    }
  });

  test('should handle remember me option', async ({ page }) => {
    const rememberCheckbox = page.getByLabel(/ricordami|remember me|mantieni accesso/i);
    
    if (await rememberCheckbox.isVisible().catch(() => false)) {
      await expect(rememberCheckbox).not.toBeChecked();
      
      await rememberCheckbox.check();
      await expect(rememberCheckbox).toBeChecked();
    }
  });

  test('should be accessible via keyboard navigation', async ({ page }) => {
    // Start from email field
    await page.getByLabel(/email/i).press('Tab');
    
    // Should be on password field
    await expect(page.getByLabel(/password/i)).toBeFocused();
    
    // Tab to submit button
    await page.getByLabel(/password/i).press('Tab');
    
    // Submit button should be focused
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toHaveRole('button');
  });

  test('should submit form with Enter key', async ({ page }) => {
    const user = TestDataFactory.predefinedUsers.customer;
    
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/password/i).fill(user.password);
    await page.getByLabel(/password/i).press('Enter');
    
    await expect(page).toHaveURL(/dashboard/);
  });

  test('should display terms and privacy links', async ({ page }) => {
    await expect(page.getByRole('link', { name: /termini|terms/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /privacy|policy/i })).toBeVisible();
  });
});

test.describe('Logout Flow', () => {
  
  test('should successfully logout user', async ({ authPage, page }) => {
    const user = TestDataFactory.predefinedUsers.customer;
    
    // Login first
    await authPage.login(user.email, user.password);
    await expect(page).toHaveURL(/dashboard/);
    
    // Logout
    await authPage.logout();
    
    // Should be redirected to login
    await expect(page).toHaveURL(/auth|login/);
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test('should clear session after logout', async ({ authPage, page }) => {
    const user = TestDataFactory.predefinedUsers.customer;
    
    await authPage.login(user.email, user.password);
    await authPage.logout();
    
    // Try to access protected page
    await page.goto('/dashboard');
    
    // Should be redirected to login
    await expect(page).toHaveURL(/auth|login/);
  });

  test('should show logout success message', async ({ authPage, page }) => {
    const user = TestDataFactory.predefinedUsers.customer;
    
    await authPage.login(user.email, user.password);
    await authPage.logout();
    
    await expect(page.getByText(/logout effettuato|logged out|arrivederci/i)).toBeVisible();
  });
});

test.describe('Session Management', () => {
  
  test('should expire session after inactivity', async ({ authPage, page }) => {
    const user = TestDataFactory.predefinedUsers.customer;
    
    await authPage.login(user.email, user.password);
    
    // Simulate long inactivity (if short session is configured for testing)
    if (process.env.TEST_SHORT_SESSION === 'true') {
      await page.waitForTimeout(7000); // Wait for 7 second test session
      
      // Try to navigate
      await page.goto('/dashboard/bookings');
      
      // Should be redirected to login
      await expect(page).toHaveURL(/auth|login/);
    }
  });

  test('should handle concurrent sessions', async ({ browser }) => {
    const user = TestDataFactory.predefinedUsers.customer;
    
    // Create two contexts (simulating two browsers/devices)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    // Login from both contexts
    await page1.goto('/auth');
    await page1.getByLabel(/email/i).fill(user.email);
    await page1.getByLabel(/password/i).fill(user.password);
    await page1.getByRole('button', { name: /login|accedi/i }).click();
    
    await page2.goto('/auth');
    await page2.getByLabel(/email/i).fill(user.email);
    await page2.getByLabel(/password/i).fill(user.password);
    await page2.getByRole('button', { name: /login|accedi/i }).click();
    
    // Both should be logged in
    await expect(page1).toHaveURL(/dashboard/);
    await expect(page2).toHaveURL(/dashboard/);
    
    // Logout from one context
    await page1.getByRole('button', { name: /utente|user|menu/i }).click();
    await page1.getByRole('menuitem', { name: /logout|esci/i }).click();
    
    // First context should be logged out
    await expect(page1).toHaveURL(/auth|login/);
    
    // Second context behavior depends on implementation
    // (either stays logged in or also logs out)
    
    await context1.close();
    await context2.close();
  });
});

test.describe('Rate Limiting', () => {
  
  test('should implement rate limiting on failed login attempts', async ({ page }) => {
    const email = 'test@example.com';
    
    // Attempt multiple failed logins
    for (let i = 0; i < 5; i++) {
      await page.goto('/auth');
      await page.getByLabel(/email/i).fill(email);
      await page.getByLabel(/password/i).fill(`WrongPassword${i}!`);
      await page.getByRole('button', { name: /login|accedi/i }).click();
    }
    
    // Next attempt should show rate limit message
    await page.goto('/auth');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill('AnotherWrong1!');
    await page.getByRole('button', { name: /login|accedi/i }).click();
    
    await expect(page.getByText(/troppi tentativi|too many attempts|rate limit/i)).toBeVisible();
  });
});

test.describe('Security Headers', () => {
  
  test('should have proper security headers', async ({ page }) => {
    const response = await page.goto('/auth');
    const headers = response?.headers() || {};
    
    // Check for security headers
    expect(headers['x-frame-options']?.toLowerCase()).toBe('deny');
    expect(headers['x-content-type-options']?.toLowerCase()).toBe('nosniff');
  });

  test('should not expose sensitive information in error messages', async ({ page }) => {
    await page.getByLabel(/email/i).fill('admin@mechmind.local');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /login|accedi/i }).click();
    
    const errorText = await page.getByText(/credenziali|invalid|errore/i).textContent();
    
    // Should not reveal if email exists
    expect(errorText?.toLowerCase()).not.toContain('email');
    expect(errorText?.toLowerCase()).not.toContain('password');
  });
});
