import { test as setup, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const AUTH_FILE = path.join(__dirname, '.auth/admin.json');

setup('authenticate as admin', async ({ page }) => {
  // Login via API
  const resp = await page.request.post('/api/auth/password/login', {
    data: { email: 'admin@demo.mechmind.it', password: 'Demo2026!', tenantSlug: 'demo' },
  });
  expect(resp.ok(), `Login failed: ${resp.status()} ${await resp.text()}`).toBeTruthy();

  // Navigate to dashboard to ensure cookies are set
  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded');

  // Save state
  await page.context().storageState({ path: AUTH_FILE });
  console.log('✔ Auth state saved');
});
