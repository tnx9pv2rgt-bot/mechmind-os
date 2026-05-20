import { test, expect } from '@playwright/test';

test('login page renders', async ({ page }) => {
  await page.goto('/auth/login');
  await expect(page.getByRole('heading')).toBeVisible();
});

test('bookings page renders', async ({ page }) => {
  await page.goto('/dashboard/bookings');
  await expect(page.getByRole('heading')).toBeVisible();
});

test('invoices page renders', async ({ page }) => {
  await page.goto('/dashboard/invoices');
  await expect(page.getByRole('heading')).toBeVisible();
});

test('billing success page renders', async ({ page }) => {
  await page.goto('/billing/success');
  const body = page.locator('body');
  await expect(body).toBeVisible();
});

test('gdpr export page renders', async ({ page }) => {
  await page.goto('/dashboard/gdpr/export');
  await expect(page.getByRole('heading')).toBeVisible();
});
