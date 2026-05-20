import { test, expect } from '@playwright/test';

/**
 * Login Page E2E Tests — API-mocked, no backend required.
 *
 * The auth page is a multi-step flow:
 *   1. "methods" — choose login method (Accedi, Registrati, Google, etc.)
 *   2. "email"   — enter tenant slug + email
 *   3. "password" — enter password + submit
 */

test.describe('Login - Render', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
  });

  test('shows "Benvenuto in MechMind" heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Benvenuto in MechMind/i })).toBeVisible();
  });

  test('shows Accedi button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /^Accedi$/i })).toBeVisible();
  });

  test('shows Registrati button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /^Registrati$/i })).toBeVisible();
  });

  test('shows Google login button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Accedi con Google/i })).toBeVisible();
  });

  test('shows Facebook login button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Accedi con Facebook/i })).toBeVisible();
  });

  test('shows Microsoft login button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Accedi con Microsoft/i })).toBeVisible();
  });

  test('shows "Prima provalo" demo button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Prima provalo/i })).toBeVisible();
  });

  test('shows "Inizia gratis" free trial link', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Inizia gratis/i })).toBeVisible();
  });

  test('shows footer links (Condizioni d\'uso, Informativa)', async ({ page }) => {
    await expect(page.getByRole('link', { name: /Condizioni d'uso/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Informativa sulla privacy/i })).toBeVisible();
  });

  test('Apple button is disabled', async ({ page }) => {
    const appleBtn = page.getByRole('button', { name: /Apple/i });
    await expect(appleBtn).toBeDisabled();
  });
});

test.describe('Login - Email Step', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.getByRole('button', { name: /^Accedi$/i }).click();
    // Wait for the email step heading (timer-based transition ~400ms)
    await expect(page.getByRole('heading', { name: /Inserisci le tue credenziali/i })).toBeVisible({ timeout: 10000 });
  });

  test('shows slug and email inputs', async ({ page }) => {
    await expect(page.locator('input[name="tenant"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
  });

  test('shows Continua button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /^Continua$/i })).toBeVisible();
  });

  test('shows magic link option', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Invia magic link invece/i })).toBeVisible();
  });

  test('shows Indietro button', async ({ page }) => {
    await expect(page.getByText(/Indietro/i)).toBeVisible();
  });

  test('validation: empty slug shows error', async ({ page }) => {
    await page.locator('input[name="email"]').fill('user@example.com');
    await page.getByRole('button', { name: /^Continua$/i }).click();
    await expect(page.getByText(/Inserisci lo slug/i)).toBeVisible();
  });

  test('validation: empty email shows error', async ({ page }) => {
    await page.locator('input[name="tenant"]').fill('demo');
    await page.getByRole('button', { name: /^Continua$/i }).click();
    await expect(page.getByText(/Inserisci la tua email/i)).toBeVisible();
  });

  test('validation: invalid email shows error', async ({ page }) => {
    await page.locator('input[name="tenant"]').fill('demo');
    await page.locator('input[name="email"]').fill('not-an-email');
    await page.getByRole('button', { name: /^Continua$/i }).click();
    await expect(page.getByText(/email valido/i)).toBeVisible();
  });

  test('back button returns to methods step', async ({ page }) => {
    await page.getByText(/Indietro/i).click();
    await expect(page.getByRole('heading', { name: /Benvenuto in MechMind/i })).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Login - Password Step', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.getByRole('button', { name: /^Accedi$/i }).click();
    await expect(page.getByRole('heading', { name: /Inserisci le tue credenziali/i })).toBeVisible({ timeout: 10000 });
    await page.locator('input[name="tenant"]').fill('demo');
    await page.locator('input[name="email"]').fill('user@example.com');
    await page.getByRole('button', { name: /^Continua$/i }).click();
    await expect(page.getByRole('heading', { name: /Inserisci la password/i })).toBeVisible({ timeout: 10000 });
  });

  test('shows password input and submit button', async ({ page }) => {
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Continua$/i })).toBeVisible();
  });

  test('shows "Ricordami per 30 giorni" checkbox', async ({ page }) => {
    await expect(page.getByText(/Ricordami per 30 giorni/i)).toBeVisible();
  });

  test('shows "Password dimenticata?" link', async ({ page }) => {
    await expect(page.getByRole('link', { name: /Password dimenticata/i })).toBeVisible();
  });

  test('displays the email used', async ({ page }) => {
    await expect(page.getByText('user@example.com')).toBeVisible();
  });

  test('validation: empty password shows error', async ({ page }) => {
    await page.getByRole('button', { name: /^Continua$/i }).click();
    // Error message appears in red text (not the heading which also contains "Inserisci la password")
    await expect(page.locator('.text-red-600, .dark\\:text-red-400').filter({ hasText: /Inserisci la password/i })).toBeVisible();
  });
});

test.describe('Login - Successful Login', () => {
  test('successful login proceeds past password step', async ({ page }) => {
    // Mock the login API to return success
    await page.route('**/api/auth/password/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto('/auth');
    await page.getByRole('button', { name: /^Accedi$/i }).click();
    await expect(page.getByRole('heading', { name: /Inserisci le tue credenziali/i })).toBeVisible({ timeout: 10000 });
    await page.locator('input[name="tenant"]').fill('demo');
    await page.locator('input[name="email"]').fill('admin@demo.it');
    await page.getByRole('button', { name: /^Continua$/i }).click();
    await expect(page.getByRole('heading', { name: /Inserisci la password/i })).toBeVisible({ timeout: 10000 });
    await page.locator('input[name="password"]').fill('SecurePassword123!');
    await page.getByRole('button', { name: /^Continua$/i }).click();

    // After successful login, the password step should disappear
    // (either passkey-prompt shows, or router navigates to /dashboard)
    await expect(page.getByRole('heading', { name: /Inserisci la password/i })).not.toBeVisible({ timeout: 15000 });
  });

  test('failed login shows error message', async ({ page }) => {
    await page.route('**/api/auth/password/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Email o password non corretta' }),
      });
    });

    await page.goto('/auth');
    await page.getByRole('button', { name: /^Accedi$/i }).click();
    await expect(page.getByRole('heading', { name: /Inserisci le tue credenziali/i })).toBeVisible({ timeout: 10000 });
    await page.locator('input[name="tenant"]').fill('demo');
    await page.locator('input[name="email"]').fill('admin@demo.it');
    await page.getByRole('button', { name: /^Continua$/i }).click();
    await expect(page.getByRole('heading', { name: /Inserisci la password/i })).toBeVisible({ timeout: 10000 });
    await page.locator('input[name="password"]').fill('wrongpassword');
    await page.getByRole('button', { name: /^Continua$/i }).click();

    await expect(page.getByText(/Email o password non corretta/i)).toBeVisible({ timeout: 10000 });
  });

  test('rate limited login shows throttle message', async ({ page }) => {
    await page.route('**/api/auth/password/login', async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Too many requests' }),
      });
    });

    await page.goto('/auth');
    await page.getByRole('button', { name: /^Accedi$/i }).click();
    await expect(page.getByRole('heading', { name: /Inserisci le tue credenziali/i })).toBeVisible({ timeout: 10000 });
    await page.locator('input[name="tenant"]').fill('demo');
    await page.locator('input[name="email"]').fill('admin@demo.it');
    await page.getByRole('button', { name: /^Continua$/i }).click();
    await expect(page.getByRole('heading', { name: /Inserisci la password/i })).toBeVisible({ timeout: 10000 });
    await page.locator('input[name="password"]').fill('whatever');
    await page.getByRole('button', { name: /^Continua$/i }).click();

    await expect(page.getByText(/Troppi tentativi/i)).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Login - Demo Session', () => {
  test('"Prima provalo" triggers demo session API', async ({ page }) => {
    let demoCalled = false;
    await page.route('**/api/auth/demo-session', async (route) => {
      demoCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    // Set auth cookies so middleware allows /dashboard access after redirect
    await page.context().addCookies([
      { name: 'auth_token', value: 'demo-jwt-token', url: 'http://localhost:3001' },
      { name: 'tenant_slug', value: 'demo', url: 'http://localhost:3001' },
      { name: 'tenant_id', value: 'demo-tenant', url: 'http://localhost:3001' },
      { name: 'demo_session', value: '1', url: 'http://localhost:3001' },
    ]);

    await page.goto('/auth');
    await page.getByRole('button', { name: /Prima provalo/i }).click();

    // Wait for redirect to dashboard
    await page.waitForURL(/dashboard/, { timeout: 15000 });
    expect(demoCalled).toBe(true);
  });

  test('"Prima provalo" shows error on API failure', async ({ page }) => {
    await page.route('**/api/auth/demo-session', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false }),
      });
    });

    await page.goto('/auth');
    await page.getByRole('button', { name: /Prima provalo/i }).click();

    await expect(page.getByText(/Demo non disponibile/i)).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Login - Magic Link', () => {
  test('magic link sent shows success message', async ({ page }) => {
    await page.route('**/api/auth/magic-link/send', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto('/auth');
    await page.getByRole('button', { name: /^Accedi$/i }).click();
    await expect(page.getByRole('heading', { name: /Inserisci le tue credenziali/i })).toBeVisible({ timeout: 10000 });
    await page.locator('input[name="tenant"]').fill('demo');
    await page.locator('input[name="email"]').fill('user@example.com');
    await page.getByRole('button', { name: /Invia magic link invece/i }).click();

    await expect(page.getByRole('heading', { name: /Controlla la tua email/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('user@example.com')).toBeVisible();
  });
});
