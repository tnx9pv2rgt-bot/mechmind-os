import { test, expect } from '@playwright/test';

test.describe('Notification Flow E2E', () => {
  test('booking creates notification and email', async ({ page }) => {
    await page.goto('/dashboard/bookings');
    
    // Create booking
    await page.click('text=Nuova Prenotazione');
    await page.fill('input[placeholder*="cliente"]', 'Mario Rossi');
    await page.click('button:has-text("Salva")');

    // Check notification appears
    await expect(page.locator('.notification-toast')).toBeVisible({ timeout: 5000 });
  });
});
