import { test, expect } from '../fixtures/auth.fixture';
import { TestDataFactory } from '../helpers/test-data';

/**
 * Multi-Factor Authentication (MFA) Tests
 * Tests for 2FA/MFA flow including TOTP and recovery codes
 */

test.describe('MFA Setup', () => {
  
  test('should prompt MFA setup for new user with MFA enabled', async ({ page, mfaPage }) => {
    const user = TestDataFactory.predefinedUsers.mfaUser;
    
    await page.goto('/auth');
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/password/i).fill(user.password);
    await page.getByRole('button', { name: /login|accedi/i }).click();
    
    // Should be redirected to MFA setup
    await mfaPage.expectMFASetup();
  });

  test('should display QR code for MFA setup', async ({ page }) => {
    const user = TestDataFactory.predefinedUsers.mfaUser;
    
    await page.goto('/auth');
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/password/i).fill(user.password);
    await page.getByRole('button', { name: /login|accedi/i }).click();
    
    // QR code should be visible
    await expect(page.locator('img[alt*="QR"], canvas[data-testid*="qr"], svg.qr-code')).toBeVisible();
  });

  test('should display manual setup key', async ({ page }) => {
    const user = TestDataFactory.predefinedUsers.mfaUser;
    
    await page.goto('/auth');
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/password/i).fill(user.password);
    await page.getByRole('button', { name: /login|accedi/i }).click();
    
    // Manual key should be visible
    const manualKey = page.locator('[data-testid="manual-key"], .setup-key, code');
    await expect(manualKey).toBeVisible();
    
    // Key should be copyable
    const keyText = await manualKey.textContent();
    expect(keyText?.length).toBeGreaterThan(10);
  });

  test('should show recovery codes during setup', async ({ page }) => {
    const user = TestDataFactory.predefinedUsers.mfaUser;
    
    await page.goto('/auth');
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/password/i).fill(user.password);
    await page.getByRole('button', { name: /login|accedi/i }).click();
    
    // Recovery codes section should exist
    await expect(page.getByText(/codici di recupero|recovery codes|backup codes/i)).toBeVisible();
  });

  test('should require verification to complete MFA setup', async ({ page }) => {
    const user = TestDataFactory.predefinedUsers.mfaUser;
    
    await page.goto('/auth');
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/password/i).fill(user.password);
    await page.getByRole('button', { name: /login|accedi/i }).click();
    
    // Try to skip verification
    const skipButton = page.getByRole('button', { name: /salta|skip|più tardi|later/i });
    
    if (await skipButton.isVisible().catch(() => false)) {
      await skipButton.click();
      // Should stay on setup or show warning
      await expect(page.locator('body')).toContainText(/setup|configura|mfa|2fa/i);
    }
  });

  test('should validate TOTP code during setup', async ({ page, mfaPage }) => {
    const user = TestDataFactory.predefinedUsers.mfaUser;
    
    await page.goto('/auth');
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/password/i).fill(user.password);
    await page.getByRole('button', { name: /login|accedi/i }).click();
    
    // Enter invalid TOTP code
    await mfaPage.enterTOTPCode('000000');
    
    // Should show error
    await expect(page.getByText(/codice non valido|invalid code|codice errato/i)).toBeVisible();
  });

  test('should complete MFA setup with valid TOTP', async ({ page, mfaPage }) => {
    const user = TestDataFactory.predefinedUsers.mfaUser;
    
    await page.goto('/auth');
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/password/i).fill(user.password);
    await page.getByRole('button', { name: /login|accedi/i }).click();
    
    // Generate valid TOTP (would need authenticator library in real test)
    // For testing, we mock a valid code
    const validTOTP = process.env.TEST_MFA_CODE || '123456';
    await mfaPage.enterTOTPCode(validTOTP);
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.getByText(/mfa attivato|2fa enabled|configurazione completata/i)).toBeVisible();
  });

  test('should allow downloading recovery codes', async ({ page }) => {
    const user = TestDataFactory.predefinedUsers.mfaUser;
    
    await page.goto('/auth');
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/password/i).fill(user.password);
    await page.getByRole('button', { name: /login|accedi/i }).click();
    
    // Download button should exist
    const downloadButton = page.getByRole('button', { name: /scarica|download|salva/i });
    
    if (await downloadButton.isVisible().catch(() => false)) {
      // Setup download listener
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        downloadButton.click(),
      ]);
      
      expect(download.suggestedFilename()).toContain('.txt');
    }
  });
});

test.describe('MFA Login', () => {
  
  test('should require MFA code after valid credentials', async ({ page, mfaPage }) => {
    const user = TestDataFactory.predefinedUsers.mfaUser;
    
    await page.goto('/auth');
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/password/i).fill(user.password);
    await page.getByRole('button', { name: /login|accedi/i }).click();
    
    // Should be on MFA verification page
    await mfaPage.expectMFARequired();
  });

  test('should reject invalid MFA code', async ({ page, mfaPage }) => {
    const user = TestDataFactory.predefinedUsers.mfaUser;
    
    await page.goto('/auth');
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/password/i).fill(user.password);
    await page.getByRole('button', { name: /login|accedi/i }).click();
    
    await mfaPage.expectMFARequired();
    
    // Enter invalid code
    await mfaPage.enterTOTPCode('000000');
    
    // Should show error
    await expect(page.getByText(/codice non valido|invalid code|codice errato/i)).toBeVisible();
    await expect(page).toHaveURL(/mfa|2fa/);
  });

  test('should accept valid MFA code', async ({ page, mfaPage }) => {
    const user = TestDataFactory.predefinedUsers.mfaUser;
    
    await page.goto('/auth');
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/password/i).fill(user.password);
    await page.getByRole('button', { name: /login|accedi/i }).click();
    
    await mfaPage.expectMFARequired();
    
    // Enter valid TOTP
    const validTOTP = process.env.TEST_MFA_CODE || '123456';
    await mfaPage.enterTOTPCode(validTOTP);
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/dashboard/);
  });

  test('should have option to use recovery code', async ({ page, mfaPage }) => {
    const user = TestDataFactory.predefinedUsers.mfaUser;
    
    await page.goto('/auth');
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/password/i).fill(user.password);
    await page.getByRole('button', { name: /login|accedi/i }).click();
    
    await mfaPage.expectMFARequired();
    
    // Recovery code option should be available
    await mfaPage.selectRecoveryCode();
    
    await expect(page.getByLabel(/codice di recupero|recovery code/i)).toBeVisible();
  });

  test('should accept valid recovery code', async ({ page, mfaPage }) => {
    const user = TestDataFactory.predefinedUsers.mfaUser;
    
    await page.goto('/auth');
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/password/i).fill(user.password);
    await page.getByRole('button', { name: /login|accedi/i }).click();
    
    await mfaPage.expectMFARequired();
    await mfaPage.selectRecoveryCode();
    
    // Enter recovery code
    const recoveryCode = process.env.TEST_RECOVERY_CODE || 'ABCD-EFGH-IJKL-MNOP';
    await mfaPage.enterRecoveryCode(recoveryCode);
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/dashboard/);
  });

  test('should invalidate used recovery code', async ({ page, mfaPage }) => {
    const user = TestDataFactory.predefinedUsers.mfaUser;
    const recoveryCode = 'ABCD-EFGH-IJKL-MNOP';
    
    // First login with recovery code
    await page.goto('/auth');
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/password/i).fill(user.password);
    await page.getByRole('button', { name: /login|accedi/i }).click();
    
    await mfaPage.expectMFARequired();
    await mfaPage.selectRecoveryCode();
    await mfaPage.enterRecoveryCode(recoveryCode);
    
    // Logout
    await page.getByRole('button', { name: /utente|menu/i }).click();
    await page.getByRole('menuitem', { name: /logout|esci/i }).click();
    
    // Try to login again with same recovery code
    await page.goto('/auth');
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/password/i).fill(user.password);
    await page.getByRole('button', { name: /login|accedi/i }).click();
    
    await mfaPage.expectMFARequired();
    await mfaPage.selectRecoveryCode();
    await mfaPage.enterRecoveryCode(recoveryCode);
    
    // Should show error - code already used
    await expect(page.getByText(/codice già utilizzato|already used|non valido/i)).toBeVisible();
  });

  test('should have remember device option', async ({ page, mfaPage }) => {
    const user = TestDataFactory.predefinedUsers.mfaUser;
    
    await page.goto('/auth');
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/password/i).fill(user.password);
    await page.getByRole('button', { name: /login|accedi/i }).click();
    
    await mfaPage.expectMFARequired();
    
    // Remember device checkbox
    const rememberCheckbox = page.getByLabel(/ricorda dispositivo|remember device|fidati/i);
    if (await rememberCheckbox.isVisible().catch(() => false)) {
      await rememberCheckbox.check();
      await expect(rememberCheckbox).toBeChecked();
    }
  });

  test('should skip MFA on remembered device', async ({ page }) => {
    const user = TestDataFactory.predefinedUsers.mfaUser;
    
    // First login with remember device
    await page.goto('/auth');
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/password/i).fill(user.password);
    await page.getByRole('button', { name: /login|accedi/i }).click();
    
    // Check remember device if available
    const rememberCheckbox = page.getByLabel(/ricorda dispositivo|remember device/i);
    if (await rememberCheckbox.isVisible().catch(() => false)) {
      await rememberCheckbox.check();
    }
    
    // Complete MFA
    const validTOTP = process.env.TEST_MFA_CODE || '123456';
    await page.locator('input[type="text"]').first().fill(validTOTP);
    await page.getByRole('button', { name: /verifica|verify/i }).click();
    
    // Logout
    await page.getByRole('button', { name: /utente|menu/i }).click();
    await page.getByRole('menuitem', { name: /logout|esci/i }).click();
    
    // Login again (same browser context = same device)
    await page.goto('/auth');
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/password/i).fill(user.password);
    await page.getByRole('button', { name: /login|accedi/i }).click();
    
    // Should go directly to dashboard
    await expect(page).toHaveURL(/dashboard/);
  });
});

test.describe('MFA Management', () => {
  
  test('should access MFA settings from profile', async ({ adminPage: page }) => {
    await page.goto('/dashboard/settings');
    
    // Navigate to security/MFA section
    await page.getByRole('tab', { name: /sicurezza|security|mfa|2fa/i }).click();
    
    await expect(page.getByText(/autenticazione a due fattori|two.factor|mfa/i)).toBeVisible();
  });

  test('should disable MFA with password confirmation', async ({ adminPage: page }) => {
    await page.goto('/dashboard/settings/security');
    
    // Click disable MFA
    await page.getByRole('button', { name: /disabilita|disable|rimuovi/i }).click();
    
    // Should ask for password
    await expect(page.getByLabel(/password|conferma password/i)).toBeVisible();
    
    // Enter password
    await page.getByLabel(/password/i).fill(TestDataFactory.predefinedUsers.admin.password);
    await page.getByRole('button', { name: /conferma|confirm|disabilita/i }).click();
    
    // Should show success
    await expect(page.getByText(/mfa disabilitato|2fa disabled|disabilitata/i)).toBeVisible();
  });

  test('should regenerate recovery codes', async ({ adminPage: page }) => {
    await page.goto('/dashboard/settings/security');
    
    // Click regenerate codes
    await page.getByRole('button', { name: /rigenera|regenerate|nuovi codici/i }).click();
    
    // Enter password
    await page.getByLabel(/password/i).fill(TestDataFactory.predefinedUsers.admin.password);
    await page.getByRole('button', { name: /conferma|confirm/i }).click();
    
    // Should show new recovery codes
    await expect(page.getByText(/codici di recupero|recovery codes/i)).toBeVisible();
    await expect(page.locator('.recovery-code, [data-testid="recovery-code"]')).toHaveCount(8);
  });

  test('should change MFA method', async ({ adminPage: page }) => {
    await page.goto('/dashboard/settings/security');
    
    // Look for change method option
    const changeMethodButton = page.getByRole('button', { name: /cambia metodo|change method/i });
    
    if (await changeMethodButton.isVisible().catch(() => false)) {
      await changeMethodButton.click();
      
      // Should show available methods
      await expect(page.getByText(/app autenticatore|authenticator|sms|email/i)).toBeVisible();
    }
  });
});

test.describe('MFA Security', () => {
  
  test('should limit MFA code attempts', async ({ page, mfaPage }) => {
    const user = TestDataFactory.predefinedUsers.mfaUser;
    
    await page.goto('/auth');
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/password/i).fill(user.password);
    await page.getByRole('button', { name: /login|accedi/i }).click();
    
    await mfaPage.expectMFARequired();
    
    // Try multiple invalid codes
    for (let i = 0; i < 5; i++) {
      await mfaPage.enterTOTPCode('000000');
      await page.waitForTimeout(500);
    }
    
    // Should be rate limited
    await expect(page.getByText(/troppi tentativi|too many attempts|bloccato/i)).toBeVisible();
  });

  test('should require re-authentication for sensitive MFA operations', async ({ adminPage: page }) => {
    await page.goto('/dashboard/settings/security');
    
    // Try to disable MFA
    await page.getByRole('button', { name: /disabilita|disable/i }).click();
    
    // Should require fresh authentication
    await expect(page.getByText(/riautenticazione richiesta|re.authentication required/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('should invalidate all sessions when MFA is disabled', async ({ browser }) => {
    // This test would verify that disabling MFA logs out all devices
    // Implementation depends on specific backend behavior
    test.skip(true, 'Feature requires specific backend implementation');
  });
});

test.describe('Backup Methods', () => {
  
  test('should support SMS backup for MFA', async ({ page }) => {
    const user = TestDataFactory.predefinedUsers.mfaUser;
    
    await page.goto('/auth');
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/password/i).fill(user.password);
    await page.getByRole('button', { name: /login|accedi/i }).click();
    
    // Look for SMS option
    const smsOption = page.getByText(/sms|messaggio/i);
    
    if (await smsOption.isVisible().catch(() => false)) {
      await smsOption.click();
      
      // Should show phone input or code sent message
      await expect(page.getByText(/codice inviato|code sent/i)).toBeVisible();
    }
  });

  test('should support email backup for MFA', async ({ page }) => {
    const user = TestDataFactory.predefinedUsers.mfaUser;
    
    await page.goto('/auth');
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/password/i).fill(user.password);
    await page.getByRole('button', { name: /login|accedi/i }).click();
    
    // Look for email option
    const emailOption = page.getByText(/email|posta elettronica/i);
    
    if (await emailOption.isVisible().catch(() => false)) {
      await emailOption.click();
      
      // Should show code sent message
      await expect(page.getByText(/codice inviato|code sent/i)).toBeVisible();
    }
  });
});
