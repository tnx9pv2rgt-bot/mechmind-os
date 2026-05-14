/**
 * AUTH TESTS — Login, Logout, Forgot Password, Validation
 */
import { test, expect } from '@playwright/test';
import { bug, screenshot, goto, waitForContent, collectConsoleErrors } from './helpers';

test.use({ storageState: { cookies: [], origins: [] } }); // No auth for these tests

test.describe('AUTH — Autenticazione', () => {
  test('AUTH-01: Login page carica correttamente', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/auth/login');
    await waitForContent(page);

    const url = page.url();
    if (!url.includes('/auth/login') && !url.includes('/dashboard')) {
      bug({
        module: 'Auth',
        url: '/auth/login',
        action: 'Navigate to /auth/login',
        expected: 'Redirect a /auth/login o /dashboard se già loggato',
        observed: `URL inatteso: ${url}`,
        severity: 'MEDIO',
        reproSteps: ['Vai a /auth/login senza sessione'],
      });
    }

    // Check form elements
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitBtn = page.locator('button[type="submit"], button:has-text("Accedi"), button:has-text("Login")').first();

    if (!(await emailInput.isVisible().catch(() => false))) {
      bug({ module: 'Auth', url: '/auth/login', action: 'Check campo email', expected: 'Campo email visibile', observed: 'Campo email non trovato', severity: 'CRITICO', reproSteps: ['Apri /auth/login', 'Cerca campo email'] });
    }
    if (!(await passwordInput.isVisible().catch(() => false))) {
      bug({ module: 'Auth', url: '/auth/login', action: 'Check campo password', expected: 'Campo password visibile', observed: 'Campo password non trovato', severity: 'CRITICO', reproSteps: ['Apri /auth/login', 'Cerca campo password'] });
    }

    if (errors.length > 0) {
      bug({ module: 'Auth', url: '/auth/login', action: 'Console errors on load', expected: 'Nessun errore JS', observed: errors.slice(0, 2).join('; '), severity: 'ALTO', reproSteps: ['Apri /auth/login', 'Controlla console'] });
    }
  });

  test('AUTH-02: Submit form vuoto → validazione', async ({ page }) => {
    await goto(page, '/auth/login');
    await waitForContent(page);

    const submitBtn = page.locator('button[type="submit"], button:has-text("Accedi"), button:has-text("Login"), button:has-text("Entra")').first();
    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(1000);

      // Should show validation errors, not crash
      const hasError = await page.locator('[class*="error"], [class*="invalid"], [role="alert"], [data-invalid]').first().isVisible().catch(() => false);
      const url = page.url();
      if (url.includes('/dashboard')) {
        bug({ module: 'Auth', url: '/auth/login', action: 'Submit form vuoto', expected: 'Errore di validazione (email/password richiesti)', observed: 'Redirect a dashboard con credenziali vuote — accesso non autorizzato', severity: 'CRITICO', reproSteps: ['Vai a /auth/login', 'Click submit senza compilare', 'Osserva redirect a dashboard'] });
      }
    }
  });

  test('AUTH-03: Credenziali errate → errore', async ({ page }) => {
    await goto(page, '/auth/login');
    await waitForContent(page);

    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    if (await emailInput.isVisible().catch(() => false) && await passwordInput.isVisible().catch(() => false)) {
      await emailInput.fill('wrong@example.com');
      await passwordInput.fill('WrongPass123!');
      await submitBtn.click();
      await page.waitForTimeout(2000);

      const url = page.url();
      if (url.includes('/dashboard')) {
        bug({ module: 'Auth', url: '/auth/login', action: 'Login con credenziali errate', expected: 'Messaggio errore, rimane su login', observed: 'Accesso consentito con credenziali errate — VULNERABILITÀ CRITICA', severity: 'CRITICO', reproSteps: ['Vai a /auth/login', 'Email: wrong@example.com', 'Password: WrongPass123!', 'Click submit'] });
        await screenshot(page, 'bug-auth-wrong-creds-bypass');
      }
      // Check for error message
      const hasErrorMsg = await page.locator('[role="alert"], [class*="error"], [class*="toast"], .sonner-toast').first().isVisible().catch(() => false);
      if (!hasErrorMsg && !url.includes('/dashboard')) {
        bug({ module: 'Auth', url: '/auth/login', action: 'Login con credenziali errate — messaggio errore', expected: 'Messaggio errore visibile all\'utente', observed: 'Nessun messaggio di errore visibile dopo credenziali errate', severity: 'MEDIO', reproSteps: ['Inserisci credenziali errate', 'Submit', 'Nessun feedback visibile'] });
        await screenshot(page, 'bug-auth-no-error-message');
      }
    }
  });

  test('AUTH-04: Login valido → redirect dashboard', async ({ page }) => {
    await goto(page, '/auth/login');
    await waitForContent(page);

    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    if (await emailInput.isVisible().catch(() => false)) {
      await emailInput.fill('admin@demo.mechmind.it');
      await passwordInput.fill('Demo2026!');
      await submitBtn.click();
      await page.waitForURL(/dashboard|onboarding/, { timeout: 15000 }).catch(() => {});
      const url = page.url();
      if (!url.includes('/dashboard') && !url.includes('/onboarding')) {
        bug({ module: 'Auth', url: '/auth/login', action: 'Login valido', expected: 'Redirect a /dashboard', observed: `URL dopo login: ${url}`, severity: 'CRITICO', reproSteps: ['Inserisci credenziali corrette', 'Submit', 'Verifica redirect'] });
        await screenshot(page, 'bug-auth-no-redirect-after-login');
      }
    }
  });

  test('AUTH-05: Forgot password page', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/auth/forgot-password');
    await waitForContent(page);

    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    if (!(await emailInput.isVisible().catch(() => false))) {
      bug({ module: 'Auth', url: '/auth/forgot-password', action: 'Verifica form forgot password', expected: 'Campo email presente', observed: 'Campo email non trovato', severity: 'ALTO', reproSteps: ['Vai a /auth/forgot-password'] });
      await screenshot(page, 'bug-auth-forgot-no-form');
    }

    if (errors.length > 0) {
      bug({ module: 'Auth', url: '/auth/forgot-password', action: 'Console errors', expected: 'Nessun errore JS', observed: errors[0].substring(0, 200), severity: 'ALTO', reproSteps: ['Apri /auth/forgot-password'] });
    }
  });

  test('AUTH-06: Forgot password — submit email valida', async ({ page }) => {
    await goto(page, '/auth/forgot-password');
    await waitForContent(page);

    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    if (await emailInput.isVisible().catch(() => false)) {
      // Test empty submit
      await submitBtn.click().catch(() => {});
      await page.waitForTimeout(500);

      // Test valid email
      await emailInput.fill('admin@demo.mechmind.it');
      await submitBtn.click().catch(() => {});
      await page.waitForTimeout(2000);

      // Should show success or stay on page (not crash)
      const crashed = await page.locator('text=500, text=Error, text=Errore critico').first().isVisible().catch(() => false);
      if (crashed) {
        bug({ module: 'Auth', url: '/auth/forgot-password', action: 'Submit email per reset password', expected: 'Messaggio di successo o conferma invio', observed: 'Errore 500 o crash', severity: 'CRITICO', reproSteps: ['Vai a /auth/forgot-password', 'Inserisci email valida', 'Submit'] });
        await screenshot(page, 'bug-auth-forgot-crash');
      }
    }
  });

  test('AUTH-07: Register page carica', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/auth/register');
    await waitForContent(page);

    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'Auth', url: '/auth/register', action: 'Load /auth/register', expected: 'Pagina registrazione carica', observed: 'HTTP 500', severity: 'CRITICO', reproSteps: ['Vai a /auth/register'] });
      await screenshot(page, 'bug-auth-register-500');
    }
  });

  test('AUTH-08: MFA setup page', async ({ page }) => {
    await goto(page, '/auth/mfa/setup');
    await waitForContent(page);
    const status = await page.locator('text=500').first().isVisible().catch(() => false);
    if (status) {
      bug({ module: 'Auth', url: '/auth/mfa/setup', action: 'Load MFA setup', expected: 'Pagina o redirect', observed: '500 error', severity: 'ALTO', reproSteps: ['Vai a /auth/mfa/setup'] });
    }
  });
});
