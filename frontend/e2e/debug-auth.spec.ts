import { test, expect } from '@playwright/test';

test('debug login flow', async ({ page }) => {
  // Capture console messages
  page.on('console', msg => console.log(`[${msg.type()}]`, msg.text()));
  page.on('response', resp => {
    if (resp.url().includes('/auth') || resp.url().includes('/login')) {
      console.log(`[RESPONSE] ${resp.status()} ${resp.url()}`);
    }
  });

  await page.goto('http://localhost:3001/auth');
  await page.waitForLoadState('networkidle');

  // Click Accedi
  await page.getByRole('button', { name: /accedi/i }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'e2e-screenshots/debug-step1.png' });

  // Fill slug
  const slugInput = page.locator('input').first();
  await slugInput.waitFor({ timeout: 5000 });
  await slugInput.fill('demo');

  // Fill email
  const emailInput = page.locator('input').nth(1);
  await emailInput.fill('admin@demo.mechmind.it');

  await page.screenshot({ path: 'e2e-screenshots/debug-step2-filled.png' });

  // Click Continua
  await page.getByRole('button', { name: /continua/i }).click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'e2e-screenshots/debug-step3-after-continue.png' });

  // Check what's on screen
  const inputs = await page.locator('input').all();
  console.log('Inputs after step 1:', inputs.length);
  for (const input of inputs) {
    const type = await input.getAttribute('type');
    const visible = await input.isVisible();
    console.log(`  input type=${type} visible=${visible}`);
  }

  // Try password
  const pwInput = page.locator('input[type="password"]');
  const pwVisible = await pwInput.isVisible().catch(() => false);
  console.log('Password input visible:', pwVisible);

  if (pwVisible) {
    await pwInput.fill('Demo2026!');
    await page.screenshot({ path: 'e2e-screenshots/debug-step4-password.png' });
    await page.getByRole('button', { name: /continua/i }).click();
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'e2e-screenshots/debug-step5-after-login.png' });
    console.log('Final URL:', page.url());
  } else {
    console.log('Password input NOT visible. Current page:');
    const bodyText = await page.locator('body').textContent();
    console.log(bodyText?.substring(0, 500));
  }
});
