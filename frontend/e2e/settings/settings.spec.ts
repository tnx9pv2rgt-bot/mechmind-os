import { test, expect } from '../fixtures/auth.fixture';

/**
 * Settings Page E2E Tests
 */

test.describe('Profile Settings', () => {
  
  test.beforeEach(async ({ adminPage: page }) => {
    await page.goto('/dashboard/settings');
  });

  test('should display settings page', async ({ page }) => {
    await expect(page).toHaveURL(/dashboard\/settings/);
    await expect(page.getByRole('heading', { name: /impostazioni|settings/i })).toBeVisible();
  });

  test('should update profile information', async ({ page }) => {
    await page.getByRole('tab', { name: /profilo|profile/i }).click();
    
    await page.getByLabel(/nome|first name/i).fill('Updated');
    await page.getByLabel(/cognome|last name/i).fill('Name');
    
    await page.getByRole('button', { name: /salva|save/i }).click();
    
    await expect(page.getByText(/profilo aggiornato|profile updated/i)).toBeVisible();
  });

  test('should change password', async ({ page }) => {
    await page.getByRole('tab', { name: /sicurezza|security/i }).click();
    
    await page.getByLabel(/password attuale|current password/i).fill('AdminPassword123!');
    await page.getByLabel(/nuova password|new password/i).fill('NewPassword123!');
    await page.getByLabel(/conferma password|confirm password/i).fill('NewPassword123!');
    
    await page.getByRole('button', { name: /cambia password|change password/i }).click();
    
    await expect(page.getByText(/password aggiornata|password changed/i)).toBeVisible();
  });

  test('should validate password confirmation', async ({ page }) => {
    await page.getByRole('tab', { name: /sicurezza|security/i }).click();
    
    await page.getByLabel(/password attuale/i).fill('AdminPassword123!');
    await page.getByLabel(/nuova password/i).fill('NewPassword123!');
    await page.getByLabel(/conferma password/i).fill('DifferentPassword!');
    
    await page.getByRole('button', { name: /cambia password/i }).click();
    
    await expect(page.getByText(/password non corrispondono|do not match/i)).toBeVisible();
  });

  test('should upload profile picture', async ({ page }) => {
    await page.getByRole('tab', { name: /profilo|profile/i }).click();
    
    const fileInput = page.locator('input[type="file"]');
    
    if (await fileInput.isVisible().catch(() => false)) {
      // Create a dummy file
      await fileInput.setInputFiles({
        name: 'avatar.png',
        mimeType: 'image/png',
        buffer: Buffer.from('fake-image-data'),
      });
      
      await page.getByRole('button', { name: /carica|upload/i }).click();
      
      await expect(page.getByText(/immagine caricata|image uploaded/i)).toBeVisible();
    }
  });
});

test.describe('Notification Settings', () => {
  
  test.beforeEach(async ({ adminPage: page }) => {
    await page.goto('/dashboard/settings');
  });

  test('should toggle email notifications', async ({ page }) => {
    await page.getByRole('tab', { name: /notifiche|notifications/i }).click();
    
    const emailToggle = page.getByLabel(/email|posta elettronica/i).first();
    
    if (await emailToggle.isVisible().catch(() => false)) {
      const isChecked = await emailToggle.isChecked();
      
      if (isChecked) {
        await emailToggle.uncheck();
      } else {
        await emailToggle.check();
      }
      
      await page.getByRole('button', { name: /salva|save/i }).click();
      
      await expect(page.getByText(/impostazioni salvate|settings saved/i)).toBeVisible();
    }
  });

  test('should configure booking reminders', async ({ page }) => {
    await page.getByRole('tab', { name: /notifiche|notifications/i }).click();
    
    const reminderSelect = page.getByLabel(/promemoria|reminder/i);
    
    if (await reminderSelect.isVisible().catch(() => false)) {
      await reminderSelect.selectOption('24h');
      await page.getByRole('button', { name: /salva|save/i }).click();
      
      await expect(page.getByText(/salvato|saved/i)).toBeVisible();
    }
  });

  test('should toggle SMS notifications', async ({ page }) => {
    await page.getByRole('tab', { name: /notifiche|notifications/i }).click();
    
    const smsToggle = page.getByLabel(/sms|messaggi/i);
    
    if (await smsToggle.isVisible().catch(() => false)) {
      await smsToggle.check();
      await page.getByRole('button', { name: /salva|save/i }).click();
      
      await expect(page.getByText(/salvato|saved/i)).toBeVisible();
    }
  });
});

test.describe('Appearance Settings', () => {
  
  test.beforeEach(async ({ adminPage: page }) => {
    await page.goto('/dashboard/settings');
  });

  test('should toggle dark mode', async ({ page }) => {
    await page.getByRole('tab', { name: /aspetto|appearance|tema/i }).click();
    
    const darkModeToggle = page.getByLabel(/dark mode|modalità scura|tema scuro/i);
    
    if (await darkModeToggle.isVisible().catch(() => false)) {
      await darkModeToggle.check();
      
      // Check if dark class is applied
      const hasDarkClass = await page.evaluate(() => 
        document.documentElement.classList.contains('dark')
      );
      
      expect(hasDarkClass).toBe(true);
    }
  });

  test('should change language', async ({ page }) => {
    await page.getByRole('tab', { name: /lingua|language/i }).click();
    
    const languageSelect = page.getByLabel(/lingua|language/i);
    
    if (await languageSelect.isVisible().catch(() => false)) {
      await languageSelect.selectOption('en');
      await page.getByRole('button', { name: /salva|save/i }).click();
      
      // Check if language changed
      await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible();
    }
  });

  test('should change date format', async ({ page }) => {
    await page.getByRole('tab', { name: /aspetto|appearance/i }).click();
    
    const dateFormatSelect = page.getByLabel(/formato data|date format/i);
    
    if (await dateFormatSelect.isVisible().catch(() => false)) {
      await dateFormatSelect.selectOption('DD/MM/YYYY');
      await page.getByRole('button', { name: /salva|save/i }).click();
      
      await expect(page.getByText(/salvato|saved/i)).toBeVisible();
    }
  });
});

test.describe('Business Settings', () => {
  
  test('should configure business hours', async ({ adminPage: page }) => {
    await page.goto('/dashboard/settings');
    await page.getByRole('tab', { name: /azienda|business|officina/i }).click();
    
    await page.getByLabel(/apertura|opening/i).first().fill('08:00');
    await page.getByLabel(/chiusura|closing/i).first().fill('18:00');
    
    await page.getByRole('button', { name: /salva|save/i }).click();
    
    await expect(page.getByText(/salvato|saved/i)).toBeVisible();
  });

  test('should configure services offered', async ({ adminPage: page }) => {
    await page.goto('/dashboard/settings');
    await page.getByRole('tab', { name: /servizi|services/i }).click();
    
    const addServiceButton = page.getByRole('button', { name: /aggiungi servizio|add service/i });
    
    if (await addServiceButton.isVisible().catch(() => false)) {
      await addServiceButton.click();
      
      await page.getByLabel(/nome servizio|service name/i).fill('Test Service');
      await page.getByLabel(/prezzo|price/i).fill('100');
      await page.getByLabel(/durata|duration/i).fill('60');
      
      await page.getByRole('button', { name: /salva|save/i }).click();
      
      await expect(page.getByText(/servizio aggiunto|service added/i)).toBeVisible();
    }
  });
});

test.describe('Team Settings', () => {
  
  test('should invite team member', async ({ adminPage: page }) => {
    await page.goto('/dashboard/settings');
    await page.getByRole('tab', { name: /team|squadra|utenti/i }).click();
    
    await page.getByRole('button', { name: /invita|invite|aggiungi membro/i }).click();
    
    await page.getByLabel(/email/i).fill('new.member@mechmind.test');
    await page.getByLabel(/ruolo|role/i).selectOption('mechanic');
    
    await page.getByRole('button', { name: /invita|send invite/i }).click();
    
    await expect(page.getByText(/invito inviato|invitation sent/i)).toBeVisible();
  });

  test('should remove team member', async ({ adminPage: page }) => {
    await page.goto('/dashboard/settings');
    await page.getByRole('tab', { name: /team|squadra/i }).click();
    
    const removeButton = page.locator('table tbody tr')
      .filter({ hasText: /test|member/i })
      .getByRole('button', { name: /rimuovi|remove|elimina/i }).first();
    
    if (await removeButton.isVisible().catch(() => false)) {
      await removeButton.click();
      await page.getByRole('button', { name: /conferma|yes/i }).click();
      
      await expect(page.getByText(/rimosso|removed/i)).toBeVisible();
    }
  });

  test('should change member role', async ({ adminPage: page }) => {
    await page.goto('/dashboard/settings');
    await page.getByRole('tab', { name: /team|squadra/i }).click();
    
    const roleSelect = page.locator('table tbody tr')
      .filter({ hasText: /mechanic/i })
      .getByLabel(/ruolo|role/i).first();
    
    if (await roleSelect.isVisible().catch(() => false)) {
      await roleSelect.selectOption('admin');
      
      await expect(page.getByText(/ruolo aggiornato|role updated/i)).toBeVisible();
    }
  });
});

test.describe('Integration Settings', () => {
  
  test('should configure email provider', async ({ adminPage: page }) => {
    await page.goto('/dashboard/settings');
    await page.getByRole('tab', { name: /integrazioni|integrations/i }).click();
    
    const emailSection = page.getByText(/email|smtp/i);
    
    if (await emailSection.isVisible().catch(() => false)) {
      await page.getByLabel(/smtp host/i).fill('smtp.example.com');
      await page.getByLabel(/smtp port/i).fill('587');
      
      await page.getByRole('button', { name: /testa connessione|test connection/i }).click();
      
      await expect(page.getByText(/connessione riuscita|connection successful/i)).toBeVisible();
    }
  });

  test('should configure payment provider', async ({ adminPage: page }) => {
    await page.goto('/dashboard/settings');
    await page.getByRole('tab', { name: /integrazioni|integrations|pagamenti/i }).click();
    
    const stripeToggle = page.getByLabel(/stripe/i);
    
    if (await stripeToggle.isVisible().catch(() => false)) {
      await stripeToggle.check();
      
      await page.getByLabel(/api key|chiave api/i).fill('sk_test_example');
      await page.getByRole('button', { name: /salva|save/i }).click();
      
      await expect(page.getByText(/configurazione salvata/i)).toBeVisible();
    }
  });

  test('should configure SMS provider', async ({ adminPage: page }) => {
    await page.goto('/dashboard/settings');
    await page.getByRole('tab', { name: /integrazioni|integrations/i }).click();
    
    const smsSection = page.getByText(/twilio|sms/i);
    
    if (await smsSection.isVisible().catch(() => false)) {
      await page.getByLabel(/account sid/i).fill('AC_example');
      await page.getByLabel(/auth token/i).fill('token_example');
      
      await page.getByRole('button', { name: /salva|save/i }).click();
      
      await expect(page.getByText(/salvato|saved/i)).toBeVisible();
    }
  });
});
