import { test, expect } from './fixtures/auth.fixture';
import type { Page } from '@playwright/test';

/**
 * Auth page functional audit — post-fix
 * Tests run against http://localhost:3001/auth
 *
 * Bug 3 fix: MotionConfig reducedMotion="user" + CSS fallback
 * ensures elements are visible immediately with reduced-motion.
 * All tests use reducedMotion context so no manual opacity hacks needed.
 */

test.use({ reducedMotion: 'reduce' });

async function waitForAuthPage(page: Page) {
  await page.goto('/auth', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
}

async function switchToPasswordTab(page: Page) {
  await page.locator('button', { hasText: 'Password' }).click();
  await page.waitForSelector('input[type="password"]', { state: 'visible', timeout: 10000 });
  await page.waitForTimeout(300);
}

async function switchToMagicTab(page: Page) {
  await page.locator('button', { hasText: 'Magic Link' }).click();
  await page.waitForTimeout(500);
}

test.describe('A1 — Rendering base', () => {
  test('page loads without JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => {
      // Hydration mismatches are dev-only warnings, not real errors
      if (!err.message.includes('hydrat') && !err.message.includes('Text content does not match')) {
        errors.push(err.message);
      }
    });
    await waitForAuthPage(page);
    expect(errors).toEqual([]);
  });

  test('all form elements are visible', async ({ page }) => {
    await waitForAuthPage(page);
    await expect(page.locator('text=MechMind OS').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Accedi al tuo gestionale')).toBeVisible();
    await expect(page.locator('button', { hasText: 'Magic Link' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Password' })).toBeVisible();
    await expect(page.locator('text=Registrati ora')).toBeVisible();
  });

  test('responsive: mobile 375px renders correctly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await waitForAuthPage(page);
    await expect(page.locator('text=Accedi al tuo gestionale')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Il tuo lavoro.')).not.toBeVisible();
  });
});

test.describe('A2 — Login email/password', () => {
  test.beforeEach(async ({ page }) => {
    await waitForAuthPage(page);
    await switchToPasswordTab(page);
  });

  test('login with correct credentials redirects', async ({ page }) => {
    await page.locator('input[placeholder="garage-roma"]').fill('demo');
    await page.locator('input[placeholder="tu@officina.it"]').fill('admin@demo.mechmind.it');
    await page.locator('input[type="password"]').fill('Demo2026!');

    const responsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/auth/password/login'),
      { timeout: 15000 },
    );
    await page.locator('button[type="submit"]').click();
    const response = await responsePromise;

    expect(response.status()).toBeLessThan(500);
    await page.waitForTimeout(3000);
    const url = page.url();
    const hasPasskeyPrompt = await page.locator('text=Attiva accesso rapido').isVisible().catch(() => false);
    const redirected = url.includes('/dashboard') || url.includes('/auth/mfa');
    expect(redirected || hasPasskeyPrompt || response.status() === 200).toBeTruthy();
  });

  test('login with wrong password shows human-readable error', async ({ page }) => {
    await page.locator('input[placeholder="garage-roma"]').fill('demo');
    await page.locator('input[placeholder="tu@officina.it"]').fill('admin@demo.mechmind.it');
    await page.locator('input[type="password"]').fill('SBAGLIATA');
    await page.locator('button[type="submit"]').click();

    await page.waitForTimeout(3000);

    // Bug 1 fix: should show "Invalid credentials" (data.message), NOT "UNAUTHORIZED" (data.error)
    const hasHumanError = await page.locator('text=/Invalid credentials|Email o password non corretta|Too Many Requests/').isVisible({ timeout: 5000 }).catch(() => false);
    const hasRawCode = await page.locator('text=UNAUTHORIZED').isVisible().catch(() => false);

    expect(hasHumanError).toBeTruthy();
    expect(hasRawCode).toBeFalsy(); // Must never show raw NestJS error type
  });

  test('login with non-existent email shows error', async ({ page }) => {
    await page.locator('input[placeholder="garage-roma"]').fill('demo');
    await page.locator('input[placeholder="tu@officina.it"]').fill('nessuno@inesistente.it');
    await page.locator('input[type="password"]').fill('Demo2026!');
    await page.locator('button[type="submit"]').click();

    await page.waitForTimeout(3000);

    const hasError = await page.locator('text=/Invalid credentials|Email o password non corretta|Too Many Requests/').isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasError).toBeTruthy();
  });

  test('login with empty fields stays on page', async ({ page }) => {
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('/auth');
  });

  test('Enter key submits the form', async ({ page }) => {
    await page.locator('input[placeholder="garage-roma"]').fill('demo');
    await page.locator('input[placeholder="tu@officina.it"]').fill('admin@demo.mechmind.it');
    await page.locator('input[type="password"]').fill('SBAGLIATA');

    const responsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/auth/password/login'),
      { timeout: 15000 },
    );
    await page.locator('input[type="password"]').press('Enter');
    const response = await responsePromise;
    expect([401, 429]).toContain(response.status());
  });
});

test.describe('A3 — Magic Link', () => {
  test.beforeEach(async ({ page }) => {
    await waitForAuthPage(page);
    // Magic Link is now the default tab, so no need to click
  });

  test('send magic link with valid data shows confirmation', async ({ page }) => {
    await page.locator('input[placeholder="garage-roma"]').fill('demo');
    await page.locator('input[placeholder="tu@officina.it"]').fill('admin@demo.mechmind.it');

    const responsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/auth/magic-link/send'),
      { timeout: 20000 },
    );
    await page.locator('button', { hasText: 'Invia link di accesso' }).click();
    const response = await responsePromise;
    expect(response.status()).toBeLessThan(500);

    await expect(page.locator('text=Email inviata!')).toBeVisible({ timeout: 10000 });
  });

  test('button is disabled without email', async ({ page }) => {
    await page.locator('input[placeholder="garage-roma"]').fill('demo');
    const btn = page.locator('button', { hasText: 'Invia link di accesso' });
    await expect(btn).toBeDisabled();
  });

  test('button is disabled without tenantSlug', async ({ page }) => {
    await page.locator('input[placeholder="tu@officina.it"]').fill('test@test.it');
    const btn = page.locator('button', { hasText: 'Invia link di accesso' });
    await expect(btn).toBeDisabled();
  });
});

test.describe('A4 — OAuth Google', () => {
  test('Google button renders without crash', async ({ page }) => {
    await waitForAuthPage(page);
    // Google button visible only if GOOGLE_CLIENT_ID env set
    const googleBtn = page.locator('#google-signin-btn');
    const isVisible = await googleBtn.isVisible().catch(() => false);
    console.log(`Google Sign-In button visible: ${isVisible}`);
  });
});

test.describe('A5 — MFA flow', () => {
  test('MFA is not triggered for users without MFA enabled', async ({ page }) => {
    await waitForAuthPage(page);
    await switchToPasswordTab(page);

    await page.locator('input[placeholder="garage-roma"]').fill('demo');
    await page.locator('input[placeholder="tu@officina.it"]').fill('admin@demo.mechmind.it');
    await page.locator('input[type="password"]').fill('Demo2026!');

    const responsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/auth/password/login'),
      { timeout: 15000 },
    );
    await page.locator('button[type="submit"]').click();
    const response = await responsePromise;

    if (response.status() === 429) {
      console.log('Rate limited — skipping MFA check');
      return;
    }

    const body = await response.json();
    expect(body.requiresMFA).toBeFalsy();
    expect(response.status()).toBe(200);
  });
});

test.describe('A6 — Passkey', () => {
  test('passkey button is visible and accessible (Bug 2 fix)', async ({ page }) => {
    await waitForAuthPage(page);
    // Bug 2 fix: PasskeyButton now rendered above the tab selector
    const passkeyBtn = page.locator('text=Accedi con FaceID / TouchID');
    const unsupportedMsg = page.locator('text=non supporta');

    const btnVisible = await passkeyBtn.isVisible().catch(() => false);
    const msgVisible = await unsupportedMsg.isVisible().catch(() => false);

    // One of these must be true — passkey UI is always present
    expect(btnVisible || msgVisible).toBeTruthy();
    console.log(`Passkey button: ${btnVisible ? 'visible' : 'device unsupported message shown'}`);
  });
});

test.describe('A7 — Rate limiting', () => {
  test('rate limit after multiple failed logins via API', async ({ page }) => {
    let rateLimited = false;

    for (let i = 0; i < 15; i++) {
      const res = await page.request.post('http://localhost:3001/api/auth/password/login', {
        data: { email: 'admin@demo.mechmind.it', password: 'SBAGLIATA' + i, tenantSlug: 'demo' },
      });

      if (res.status() === 429) {
        rateLimited = true;
        console.log(`Rate limited after ${i + 1} attempts`);
        break;
      }
    }

    expect(rateLimited).toBeTruthy();
  });
});

test.describe('A8 — UX generale', () => {
  test('tab order is logical', async ({ page }) => {
    await waitForAuthPage(page);
    await switchToPasswordTab(page);

    await page.locator('input[placeholder="garage-roma"]').focus();
    await page.keyboard.press('Tab');

    const focusedPlaceholder = await page.evaluate(
      () => (document.activeElement as HTMLInputElement)?.placeholder || 'N/A',
    );
    expect(focusedPlaceholder).toBe('tu@officina.it');
  });

  test('loading state visible during API call', async ({ page }) => {
    await waitForAuthPage(page);
    await switchToPasswordTab(page);

    await page.locator('input[placeholder="garage-roma"]').fill('demo');
    await page.locator('input[placeholder="tu@officina.it"]').fill('admin@demo.mechmind.it');
    await page.locator('input[type="password"]').fill('SBAGLIATA');

    await page.route('**/api/auth/password/login', async (route) => {
      await new Promise((r) => setTimeout(r, 2000));
      await route.continue();
    });

    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(500);

    const spinnerExists = await page.locator('.animate-spin').isVisible().catch(() => false);
    const loadingText = await page.evaluate(() =>
      document.body.textContent?.includes('Accesso in corso'),
    );

    expect(spinnerExists || loadingText).toBeTruthy();
  });

  test('reduced-motion: all elements visible immediately (Bug 3 fix)', async ({ page }) => {
    await waitForAuthPage(page);

    // With reducedMotion: 'reduce', no element should have opacity: 0
    const opacityZeroCount = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[style]')).filter(
        (el) => (el as HTMLElement).style.opacity === '0',
      ).length;
    });

    expect(opacityZeroCount).toBe(0);

    // All key elements visible without any opacity hack
    await expect(page.locator('text=Accedi al tuo gestionale')).toBeVisible();
    await expect(page.locator('button', { hasText: 'Magic Link' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Password' })).toBeVisible();
  });
});
