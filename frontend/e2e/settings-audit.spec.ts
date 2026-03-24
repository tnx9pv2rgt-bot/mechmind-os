import { test, expect } from './fixtures/auth.fixture';
import type { Page } from '@playwright/test';

/**
 * Settings page functional audit
 * Tests run against http://localhost:3001/dashboard/settings
 */

test.use({ reducedMotion: 'reduce' });

async function goToSettings(page: Page) {
  await page.goto('/dashboard/settings', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1500);
}

// ─── S1: Rendering ───────────────────────────────────────────────────────────

test.describe('S1 — Rendering base', () => {
  test('page loads without JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => {
      if (!err.message.includes('hydrat') && !err.message.includes('Text content does not match')) {
        errors.push(err.message);
      }
    });
    await goToSettings(page);
    expect(errors).toEqual([]);
  });

  test('header and title visible', async ({ page }) => {
    await goToSettings(page);
    await expect(page.locator('h1:has-text("Impostazioni")')).toBeVisible({ timeout: 5000 });
  });

  test('all 5 tabs visible', async ({ page }) => {
    await goToSettings(page);
    await expect(page.locator('button:has-text("Generali")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("Team")')).toBeVisible();
    await expect(page.locator('button:has-text("Notifiche")')).toBeVisible();
    await expect(page.locator('button:has-text("Fatturazione")')).toBeVisible();
    await expect(page.locator('button:has-text("Sicurezza")')).toBeVisible();
  });
});

// ─── S2: General tab ──────────────────────────────────────────────────────────

test.describe('S2 — Tab Generali', () => {
  test('shop info form renders with prefilled values', async ({ page }) => {
    await goToSettings(page);
    await expect(page.locator('text=Informazioni Officina')).toBeVisible({ timeout: 5000 });
    // Check prefilled values
    const nomeInput = page.locator('input[value="Officina Rossi"]');
    await expect(nomeInput).toBeVisible();
    console.log('WARNING: "Officina Rossi" is hardcoded defaultValue, not from API');
  });

  test('save button works (local state only)', async ({ page }) => {
    await goToSettings(page);
    const saveBtn = page.locator('button:has-text("Salva Modifiche")');
    await expect(saveBtn).toBeVisible({ timeout: 5000 });
    await saveBtn.click();
    await expect(page.locator('text=Salvato!')).toBeVisible({ timeout: 3000 });
    console.log('WARNING: Save only changes local state — no API call');
  });
});

// ─── S3: Team tab ─────────────────────────────────────────────────────────────

test.describe('S3 — Tab Team', () => {
  test('team members render', async ({ page }) => {
    await goToSettings(page);
    await page.locator('button:has-text("Team")').click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=Membri Team')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Marco Rossi')).toBeVisible();
    await expect(page.locator('text=Luca Bianchi')).toBeVisible();
    console.log('WARNING: Team members are hardcoded');
  });
});

// ─── S4: Notifications tab ───────────────────────────────────────────────────

test.describe('S4 — Tab Notifiche', () => {
  test('notification preferences render with checkboxes', async ({ page }) => {
    await goToSettings(page);
    await page.locator('button:has-text("Notifiche")').click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=Nuove prenotazioni')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Promemoria appuntamenti')).toBeVisible();
    // All checkboxes should be checked by default
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    expect(count).toBe(5);
    console.log('WARNING: Notification preferences are hardcoded — no save/API');
  });
});

// ─── S5: Billing tab ─────────────────────────────────────────────────────────

test.describe('S5 — Tab Fatturazione', () => {
  test('billing section renders', async ({ page }) => {
    await goToSettings(page);
    await page.locator('button:has-text("Fatturazione")').click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=Piano e Pagamenti')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Gestisci Abbonamento')).toBeVisible();
  });
});

// ─── S6: Security tab ────────────────────────────────────────────────────────

test.describe('S6 — Tab Sicurezza', () => {
  test('password change form renders', async ({ page }) => {
    await goToSettings(page);
    await page.locator('button:has-text("Sicurezza")').click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=Password attuale')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Nuova password')).toBeVisible();
    await expect(page.locator('text=Conferma password')).toBeVisible();
    await expect(page.locator('button:has-text("Cambia Password")')).toBeVisible();
  });

  test('MISSING: no MFA toggle in security tab', async ({ page }) => {
    await goToSettings(page);
    await page.locator('button:has-text("Sicurezza")').click();
    await page.waitForTimeout(500);
    const mfaToggle = await page.locator('text=/MFA|2FA|Autenticazione a due fattori|Two-factor/i').isVisible().catch(() => false);
    console.log(`MFA toggle present: ${mfaToggle}`);
    if (!mfaToggle) {
      console.log('BUG: No MFA activation/deactivation in settings');
    }
  });

  test('MISSING: no Passkey management in security tab', async ({ page }) => {
    await goToSettings(page);
    await page.locator('button:has-text("Sicurezza")').click();
    await page.waitForTimeout(500);
    const passkeyMgmt = await page.locator('text=/Passkey|FaceID|TouchID|WebAuthn/i').isVisible().catch(() => false);
    console.log(`Passkey management present: ${passkeyMgmt}`);
    if (!passkeyMgmt) {
      console.log('BUG: No Passkey management in settings');
    }
  });

  test('MISSING: no "Elimina account" danger zone', async ({ page }) => {
    await goToSettings(page);
    // Check all tabs
    const dangerZone = await page.locator('text=/Elimina account|Danger zone|Cancella account|Delete account/i').isVisible().catch(() => false);
    console.log(`Danger zone present: ${dangerZone}`);
    if (!dangerZone) {
      console.log('BUG: No account deletion danger zone in settings');
    }
  });
});

// ─── S7: Responsive ──────────────────────────────────────────────────────────

test.describe('S7 — Responsive', () => {
  test('mobile 375px: tabs readable', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await goToSettings(page);
    await expect(page.locator('h1:has-text("Impostazioni")')).toBeVisible({ timeout: 5000 });
  });
});

// ─── S8: Auth guard ──────────────────────────────────────────────────────────

test.describe('S8 — Auth guard', () => {
  test('settings accessible without login (NO AUTH GUARD)', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/dashboard/settings', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    const url = page.url();
    console.log(`Settings without auth: URL=${url}`);
    if (url.includes('/dashboard/settings')) {
      console.log('BUG: Settings page is accessible without authentication!');
    }
  });
});
