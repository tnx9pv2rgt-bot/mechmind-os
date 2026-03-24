import { test, expect } from '@playwright/test';

/**
 * Registration Page E2E Tests — API-mocked, no backend required.
 */

test.describe('Register - Render', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/register');
  });

  test('shows "Crea la tua officina" heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Crea la tua officina/i })).toBeVisible();
  });

  test('shows subtitle', async ({ page }) => {
    await expect(page.getByText(/Registrati gratuitamente in 30 secondi/i)).toBeVisible();
  });

  test('shows all form fields', async ({ page }) => {
    await expect(page.locator('input[name="shopName"]')).toBeVisible();
    await expect(page.locator('input[name="slug"]')).toBeVisible();
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="new-password"]')).toBeVisible();
    await expect(page.locator('input[name="confirm-password"]')).toBeVisible();
  });

  test('shows terms checkbox', async ({ page }) => {
    await expect(page.getByText(/Termini e Condizioni/i)).toBeVisible();
    await expect(page.getByText(/Informativa sulla Privacy/i)).toBeVisible();
  });

  test('shows submit button "Crea officina"', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Crea officina/i })).toBeVisible();
  });

  test('shows "Hai gia un account? Accedi" link', async ({ page }) => {
    await expect(page.getByRole('link', { name: /Accedi/i })).toBeVisible();
  });

  test('shows Indietro button that links to /auth', async ({ page }) => {
    const backBtn = page.getByRole('button', { name: /Indietro/i });
    await expect(backBtn).toBeVisible();
  });

  test('shows MechMind OS header', async ({ page }) => {
    await expect(page.getByText('MechMind OS')).toBeVisible();
  });
});

test.describe('Register - Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/register');
  });

  test('empty form shows field errors on submit', async ({ page }) => {
    await page.getByRole('button', { name: /Crea officina/i }).click();
    await expect(page.getByText(/Inserisci il nome della tua officina/i)).toBeVisible();
  });

  test('invalid email shows error', async ({ page }) => {
    await page.locator('input[name="shopName"]').fill('Test Shop');
    await page.locator('input[name="name"]').fill('Mario Rossi');
    await page.locator('input[name="email"]').fill('not-valid');
    await page.locator('input[name="new-password"]').fill('StrongPass1!');
    await page.locator('input[name="confirm-password"]').fill('StrongPass1!');
    // Check the terms checkbox
    await page.locator('input[type="checkbox"]').check();
    await page.getByRole('button', { name: /Crea officina/i }).click();
    await expect(page.getByText(/Email non valida/i)).toBeVisible();
  });

  test('password strength indicator appears when typing', async ({ page }) => {
    await page.locator('input[name="new-password"]').fill('a');
    await expect(page.getByText(/Molto debole/i)).toBeVisible();
  });

  test('strong password shows "Forte" indicator', async ({ page }) => {
    await page.locator('input[name="new-password"]').fill('StrongPass1!');
    await expect(page.getByText(/Forte/i)).toBeVisible();
  });

  test('password checklist shows all requirements', async ({ page }) => {
    await page.locator('input[name="new-password"]').fill('a');
    await expect(page.getByText(/Almeno 8 caratteri/i)).toBeVisible();
    await expect(page.getByText(/Una lettera maiuscola/i)).toBeVisible();
    await expect(page.getByText(/Una lettera minuscola/i)).toBeVisible();
    await expect(page.getByText(/Un numero/i)).toBeVisible();
    await expect(page.getByText(/Un carattere speciale/i)).toBeVisible();
  });

  test('mismatched passwords show error', async ({ page }) => {
    await page.locator('input[name="shopName"]').fill('Test Shop');
    await page.locator('input[name="name"]').fill('Mario Rossi');
    await page.locator('input[name="email"]').fill('mario@test.com');
    await page.locator('input[name="new-password"]').fill('StrongPass1!');
    await page.locator('input[name="confirm-password"]').fill('Different1!');
    await page.locator('input[type="checkbox"]').check();
    await page.getByRole('button', { name: /Crea officina/i }).click();
    await expect(page.getByText(/Le password non coincidono/i)).toBeVisible();
  });

  test('unchecked terms shows error', async ({ page }) => {
    await page.locator('input[name="shopName"]').fill('Test Shop');
    await page.locator('input[name="name"]').fill('Mario Rossi');
    await page.locator('input[name="email"]').fill('mario@test.com');
    await page.locator('input[name="new-password"]').fill('StrongPass1!');
    await page.locator('input[name="confirm-password"]').fill('StrongPass1!');
    // Do NOT check the terms checkbox
    await page.getByRole('button', { name: /Crea officina/i }).click();
    await expect(page.getByText(/Devi accettare i termini/i)).toBeVisible();
  });

  test('auto-generates slug from shop name', async ({ page }) => {
    await page.locator('input[name="shopName"]').fill('La Mia Officina');
    const slugInput = page.locator('input[name="slug"]');
    await expect(slugInput).toHaveValue('la-mia-officina');
  });
});

test.describe('Register - Successful Submission', () => {
  test('successful registration shows success screen', async ({ page }) => {
    await page.route('**/api/auth/register', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, tenantSlug: 'test-shop' }),
      });
    });

    await page.goto('/auth/register');
    await page.locator('input[name="shopName"]').fill('Test Shop');
    await page.locator('input[name="name"]').fill('Mario Rossi');
    await page.locator('input[name="email"]').fill('mario@test.com');
    await page.locator('input[name="new-password"]').fill('StrongPass1!');
    await page.locator('input[name="confirm-password"]').fill('StrongPass1!');
    await page.locator('input[type="checkbox"]').check();
    await page.getByRole('button', { name: /Crea officina/i }).click();

    await expect(page.getByRole('heading', { name: /Officina creata/i })).toBeVisible();
    await expect(page.getByText('test-shop')).toBeVisible();
    await expect(page.getByText(/Controlla la tua email/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Vai alla dashboard/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Vai al login/i })).toBeVisible();
  });

  test('failed registration shows error', async ({ page }) => {
    await page.route('**/api/auth/register', async (route) => {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Slug già in uso' }),
      });
    });

    await page.goto('/auth/register');
    await page.locator('input[name="shopName"]').fill('Test Shop');
    await page.locator('input[name="name"]').fill('Mario Rossi');
    await page.locator('input[name="email"]').fill('mario@test.com');
    await page.locator('input[name="new-password"]').fill('StrongPass1!');
    await page.locator('input[name="confirm-password"]').fill('StrongPass1!');
    await page.locator('input[type="checkbox"]').check();
    await page.getByRole('button', { name: /Crea officina/i }).click();

    await expect(page.getByText(/Slug già in uso/i)).toBeVisible();
  });
});
