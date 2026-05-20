import { test, expect } from '@playwright/test';

/**
 * Forgot Password Page E2E Tests — API-mocked, no backend required.
 */

test.describe('Forgot Password - Render', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/forgot-password');
  });

  test('shows "Password dimenticata?" heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Password dimenticata/i })).toBeVisible();
  });

  test('shows description text', async ({ page }) => {
    await expect(page.getByText(/Inserisci la tua email e ti invieremo un link/i)).toBeVisible();
  });

  test('shows email input', async ({ page }) => {
    await expect(page.locator('input[name="email"]')).toBeVisible();
  });

  test('shows "Invia link di reset" button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Invia link di reset/i })).toBeVisible();
  });

  test('shows "Ricordi la password? Accedi" link', async ({ page }) => {
    await expect(page.getByRole('link', { name: /Accedi/i })).toBeVisible();
  });

  test('shows Indietro link to /auth', async ({ page }) => {
    await expect(page.getByRole('link', { name: /Indietro/i })).toBeVisible();
  });

  test('submit button is disabled when email is empty', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Invia link di reset/i })).toBeDisabled();
  });

  test('shows MechMind OS header', async ({ page }) => {
    await expect(page.getByText('MechMind OS')).toBeVisible();
  });
});

test.describe('Forgot Password - Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/forgot-password');
  });

  test('invalid email shows error on submit', async ({ page }) => {
    await page.locator('input[name="email"]').fill('not-valid');
    await page.getByRole('button', { name: /Invia link di reset/i }).click();
    await expect(page.getByText(/email valida/i)).toBeVisible();
  });
});

test.describe('Forgot Password - Success', () => {
  test('successful submit shows confirmation', async ({ page }) => {
    await page.route('**/api/auth/forgot-password', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto('/auth/forgot-password');
    await page.locator('input[name="email"]').fill('mario@test.com');
    await page.getByRole('button', { name: /Invia link di reset/i }).click();

    await expect(page.getByRole('heading', { name: /Controlla la tua email/i })).toBeVisible();
    await expect(page.getByText('mario@test.com')).toBeVisible();
    await expect(page.getByText(/cartella spam/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /Torna al login/i })).toBeVisible();
  });
});

test.describe('Forgot Password - Error', () => {
  test('API failure shows error message', async ({ page }) => {
    await page.route('**/api/auth/forgot-password', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' }),
      });
    });

    await page.goto('/auth/forgot-password');
    await page.locator('input[name="email"]').fill('mario@test.com');
    await page.getByRole('button', { name: /Invia link di reset/i }).click();

    await expect(page.getByText(/Non siamo riusciti a inviare/i)).toBeVisible();
  });
});
