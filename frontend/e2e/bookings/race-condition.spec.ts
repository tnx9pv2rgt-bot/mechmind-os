import { test, expect } from '../fixtures/auth.fixture';
import { TestDataFactory } from '../helpers/test-data';

/**
 * Race Condition Tests
 * Tests to ensure the system prevents double-booking and handles concurrent operations correctly
 */

test.describe('Double Booking Prevention', () => {
  
  test('should prevent double booking of same time slot', async ({ browser }) => {
    // Create two browser contexts (simulating two users)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    const user1 = TestDataFactory.predefinedUsers.customer;
    const user2 = TestDataFactory.predefinedUsers.mechanic;
    
    try {
      // Login both users
      await page1.goto('/auth');
      await page1.getByLabel(/email/i).fill(user1.email);
      await page1.getByLabel(/password/i).fill(user1.password);
      await page1.getByRole('button', { name: /login|accedi/i }).click();
      await page1.waitForURL(/dashboard/);
      
      await page2.goto('/auth');
      await page2.getByLabel(/email/i).fill(user2.email);
      await page2.getByLabel(/password/i).fill(user2.password);
      await page2.getByRole('button', { name: /login|accedi/i }).click();
      await page2.waitForURL(/dashboard/);
      
      // Navigate to bookings
      await page1.goto('/dashboard/bookings');
      await page2.goto('/dashboard/bookings');
      
      // Both open create booking form
      await page1.getByRole('button', { name: /nuova prenotazione|new booking/i }).click();
      await page2.getByRole('button', { name: /nuova prenotazione|new booking/i }).click();
      
      // Select same slot for both
      const sameDate = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      const sameTime = '14:00';
      
      await page1.getByLabel(/data|date/i).fill(sameDate);
      await page1.getByLabel(/ora|time/i).selectOption(sameTime);
      
      await page2.getByLabel(/data|date/i).fill(sameDate);
      await page2.getByLabel(/ora|time/i).selectOption(sameTime);
      
      // Fill other required fields
      const customer = TestDataFactory.predefinedCustomer;
      
      await page1.getByLabel(/cliente|customer/i).selectOption(customer.email);
      await page2.getByLabel(/cliente|customer/i).selectOption(customer.email);
      
      // Submit both simultaneously
      const [response1, response2] = await Promise.allSettled([
        page1.getByRole('button', { name: /crea|salva|conferma/i }).click(),
        page2.getByRole('button', { name: /crea|salva|conferma/i }).click(),
      ]);
      
      // Wait for responses
      await Promise.race([
        page1.waitForResponse(resp => resp.url().includes('/bookings') && resp.status() === 201),
        page1.waitForTimeout(5000),
      ]);
      
      await Promise.race([
        page2.waitForResponse(resp => resp.url().includes('/bookings') && resp.status() === 201),
        page2.waitForTimeout(5000),
      ]);
      
      // Get results
      const success1 = await page1.getByText(/successo|creato|success/i).isVisible().catch(() => false);
      const error1 = await page1.getByText(/non disponibile|già prenotato|unavailable|already booked/i).isVisible().catch(() => false);
      
      const success2 = await page2.getByText(/successo|creato|success/i).isVisible().catch(() => false);
      const error2 = await page2.getByText(/non disponibile|già prenotato|unavailable|already booked/i).isVisible().catch(() => false);
      
      // One should succeed, one should fail
      expect(success1 || success2).toBe(true);
      expect(success1 && success2).toBe(false);
      expect(error1 || error2).toBe(true);
      
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('should handle race condition in booking modification', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    const admin = TestDataFactory.predefinedUsers.admin;
    
    try {
      // Login as admin in both contexts
      for (const page of [page1, page2]) {
        await page.goto('/auth');
        await page.getByLabel(/email/i).fill(admin.email);
        await page.getByLabel(/password/i).fill(admin.password);
        await page.getByRole('button', { name: /login|accedi/i }).click();
        await page.waitForURL(/dashboard/);
      }
      
      // Navigate to same booking
      await page1.goto('/dashboard/bookings');
      await page2.goto('/dashboard/bookings');
      
      // Open edit for the same booking in both
      await page1.locator('table tbody tr').first()
        .getByRole('button', { name: /modifica|edit/i }).click();
      await page2.locator('table tbody tr').first()
        .getByRole('button', { name: /modifica|edit/i }).click();
      
      // Both make different changes
      await page1.getByLabel(/note|notes/i).fill('Update from user 1');
      await page2.getByLabel(/note|notes/i).fill('Update from user 2');
      
      // Save both simultaneously
      await Promise.allSettled([
        page1.getByRole('button', { name: /salva|save/i }).click(),
        page2.getByRole('button', { name: /salva|save/i }).click(),
      ]);
      
      // At least one should succeed
      const success1 = await page1.getByText(/successo|updated|success/i).isVisible().catch(() => false);
      const success2 = await page2.getByText(/successo|updated|success/i).isVisible().catch(() => false);
      
      expect(success1 || success2).toBe(true);
      
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('should prevent simultaneous cancellation and modification', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    const admin = TestDataFactory.predefinedUsers.admin;
    
    try {
      // Login
      for (const page of [page1, page2]) {
        await page.goto('/auth');
        await page.getByLabel(/email/i).fill(admin.email);
        await page.getByLabel(/password/i).fill(admin.password);
        await page.getByRole('button', { name: /login|accedi/i }).click();
        await page.waitForURL(/dashboard/);
      }
      
      await page1.goto('/dashboard/bookings');
      await page2.goto('/dashboard/bookings');
      
      // User 1 opens edit, User 2 cancels
      await page1.locator('table tbody tr').first()
        .getByRole('button', { name: /modifica|edit/i }).click();
      await page2.locator('table tbody tr').first()
        .getByRole('button', { name: /annulla|cancel/i }).click();
      
      // Confirm cancellation
      await page2.getByRole('button', { name: /conferma|yes/i }).click();
      
      // User 1 tries to save changes
      await page1.getByLabel(/note/i).fill('Trying to update cancelled booking');
      await page1.getByRole('button', { name: /salva|save/i }).click();
      
      // Should show error - booking no longer exists or is cancelled
      const error = await page1.getByText(/non trovata|not found|cancellata|cancelled|già annullata/i)
        .isVisible().catch(() => false);
      
      expect(error).toBe(true);
      
    } finally {
      await context1.close();
      await context2.close();
    }
  });
});

test.describe('Inventory Race Conditions', () => {
  
  test('should prevent overselling inventory items', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    const mechanic = TestDataFactory.predefinedUsers.mechanic;
    
    try {
      // Login
      for (const page of [page1, page2]) {
        await page.goto('/auth');
        await page.getByLabel(/email/i).fill(mechanic.email);
        await page.getByLabel(/password/i).fill(mechanic.password);
        await page.getByRole('button', { name: /login|accedi/i }).click();
        await page.waitForURL(/dashboard/);
      }
      
      // Navigate to inventory
      await page1.goto('/dashboard/inventory');
      await page2.goto('/dashboard/inventory');
      
      // Find an item with low stock
      const lowStockRow = page1.locator('table tbody tr').filter({
        hasText: /\b([0-2])\b/ // Stock of 0, 1, or 2
      }).first();
      
      if (await lowStockRow.isVisible().catch(() => false)) {
        // Try to allocate from both contexts simultaneously
        await lowStockRow.click();
        
        // Get item identifier
        const itemName = await lowStockRow.locator('td').first().textContent();
        
        // Both try to allocate the remaining stock
        await page1.getByRole('button', { name: /alloca|allocate|utilizza/i }).click();
        await page2.locator(`text=${itemName}`).first().click();
        await page2.getByRole('button', { name: /alloca|allocate|utilizza/i }).click();
        
        // Set quantity to remaining stock
        await page1.getByLabel(/quantità|quantity/i).fill('2');
        await page2.getByLabel(/quantità|quantity/i).fill('2');
        
        // Submit simultaneously
        const [result1, result2] = await Promise.allSettled([
          page1.getByRole('button', { name: /conferma|confirm/i }).click(),
          page2.getByRole('button', { name: /conferma|confirm/i }).click(),
        ]);
        
        // One should fail due to insufficient stock
        const error1 = await page1.getByText(/stock insufficiente|out of stock|non disponibile/i)
          .isVisible().catch(() => false);
        const error2 = await page2.getByText(/stock insufficiente|out of stock|non disponibile/i)
          .isVisible().catch(() => false);
        
        expect(error1 || error2).toBe(true);
      }
      
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('should handle concurrent inventory updates correctly', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const admin = TestDataFactory.predefinedUsers.admin;
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    try {
      // Login
      for (const page of [page1, page2]) {
        await page.goto('/auth');
        await page.getByLabel(/email/i).fill(admin.email);
        await page.getByLabel(/password/i).fill(admin.password);
        await page.getByRole('button', { name: /login|accedi/i }).click();
        await page.waitForURL(/dashboard/);
      }
      
      await page1.goto('/dashboard/inventory');
      await page2.goto('/dashboard/inventory');
      
      // Open same item in both
      const itemRow = page1.locator('table tbody tr').first();
      const itemName = await itemRow.locator('td').first().textContent();
      
      await itemRow.click();
      await page2.getByText(itemName || '').first().click();
      
      // Both update quantity
      await page1.getByLabel(/quantità|quantity|stock/i).fill('50');
      await page2.getByLabel(/quantità|quantity|stock/i).fill('75');
      
      // Save both
      await Promise.allSettled([
        page1.getByRole('button', { name: /salva|save/i }).click(),
        page2.getByRole('button', { name: /salva|save/i }).click(),
      ]);
      
      // Wait for updates
      await page1.waitForTimeout(1000);
      
      // Refresh and check - should show one of the values (last write wins) or conflict
      await page1.reload();
      
      const quantity = await page1.getByText(/\b(50|75)\b/).first().isVisible().catch(() => false);
      expect(quantity).toBe(true);
      
    } finally {
      await context1.close();
      await context2.close();
    }
  });
});

test.describe('Optimistic Locking', () => {
  
  test('should detect stale data with version/timestamp', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    const admin = TestDataFactory.predefinedUsers.admin;
    
    try {
      // Login
      for (const page of [page1, page2]) {
        await page.goto('/auth');
        await page.getByLabel(/email/i).fill(admin.email);
        await page.getByLabel(/password/i).fill(admin.password);
        await page.getByRole('button', { name: /login|accedi/i }).click();
        await page.waitForURL(/dashboard/);
      }
      
      await page1.goto('/dashboard/bookings');
      await page2.goto('/dashboard/bookings');
      
      // Open same booking in both
      const bookingRow = page1.locator('table tbody tr').first();
      await bookingRow.getByRole('button', { name: /modifica|edit/i }).click();
      
      const bookingId = await bookingRow.getAttribute('data-id') || '';
      await page2.goto(`/dashboard/bookings/${bookingId}/edit`);
      
      // User 1 saves
      await page1.getByLabel(/note/i).fill('First update');
      await page1.getByRole('button', { name: /salva|save/i }).click();
      await page1.waitForTimeout(500);
      
      // User 2 tries to save (with stale data)
      await page2.getByLabel(/note/i).fill('Second update');
      await page2.getByRole('button', { name: /salva|save/i }).click();
      
      // Should show conflict warning
      const conflictError = await page2.getByText(
        /modificato da un altro utente|modified by another|conflitto|conflict/i
      ).isVisible().catch(() => false);
      
      expect(conflictError).toBe(true);
      
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('should allow refreshing data on conflict', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    const admin = TestDataFactory.predefinedUsers.admin;
    
    try {
      // Login
      for (const page of [page1, page2]) {
        await page.goto('/auth');
        await page.getByLabel(/email/i).fill(admin.email);
        await page.getByLabel(/password/i).fill(admin.password);
        await page.getByRole('button', { name: /login|accedi/i }).click();
        await page.waitForURL(/dashboard/);
      }
      
      await page1.goto('/dashboard/bookings');
      await page2.goto('/dashboard/bookings');
      
      // Open same booking
      await page1.locator('table tbody tr').first()
        .getByRole('button', { name: /modifica|edit/i }).click();
      await page2.locator('table tbody tr').first()
        .getByRole('button', { name: /modifica|edit/i }).click();
      
      // User 1 saves
      await page1.getByLabel(/note/i).fill('User 1 changes');
      await page1.getByRole('button', { name: /salva|save/i }).click();
      
      // User 2 tries to save and gets conflict
      await page2.getByLabel(/note/i).fill('User 2 changes');
      await page2.getByRole('button', { name: /salva|save/i }).click();
      
      // Refresh option should be available
      const refreshButton = page2.getByRole('button', { name: /ricarica|refresh|aggiorna/i });
      
      if (await refreshButton.isVisible().catch(() => false)) {
        await refreshButton.click();
        
        // Should load updated data
        await expect(page2.getByLabel(/note/i)).toHaveValue(/User 1 changes|User 2 changes/);
      }
      
    } finally {
      await context1.close();
      await context2.close();
    }
  });
});

test.describe('Sequential Operations', () => {
  
  test('should handle rapid sequential bookings', async ({ adminPage: page }) => {
    await page.goto('/dashboard/bookings');
    
    const customer = TestDataFactory.predefinedCustomer;
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    
    // Create multiple bookings rapidly
    const bookings = [];
    const times = ['09:00', '10:00', '11:00', '14:00', '15:00'];
    
    for (let i = 0; i < times.length; i++) {
      await page.getByRole('button', { name: /nuova prenotazione/i }).click();
      
      await page.getByLabel(/cliente/i).selectOption(customer.email);
      await page.getByLabel(/data/i).fill(tomorrow);
      await page.getByLabel(/ora/i).selectOption(times[i]);
      
      await page.getByRole('button', { name: /crea|salva/i }).click();
      
      // Wait for success
      await page.waitForSelector('text=/successo|creato|success/', { timeout: 5000 });
      
      bookings.push({ date: tomorrow, time: times[i] });
      
      // Close modal if needed
      const closeButton = page.getByRole('button', { name: /chiudi|close|×/i });
      if (await closeButton.isVisible().catch(() => false)) {
        await closeButton.click();
      }
    }
    
    // Verify all bookings created
    expect(bookings).toHaveLength(times.length);
  });

  test('should maintain consistency during bulk operations', async ({ adminPage: page }) => {
    await page.goto('/dashboard/bookings');
    
    // Select multiple bookings
    const checkboxes = page.locator('table tbody tr input[type="checkbox"]');
    const count = await checkboxes.count();
    
    if (count >= 2) {
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();
      
      // Bulk action - cancel
      await page.getByRole('button', { name: /azioni|actions/i }).click();
      await page.getByRole('menuitem', { name: /cancella|delete|annulla/i }).click();
      
      // Confirm
      await page.getByRole('button', { name: /conferma|yes/i }).click();
      
      // Both should be cancelled
      await expect(page.getByText(/2.*annullate|2.*cancelled/i).or(
        page.getByText(/successo|success/i)
      )).toBeVisible();
    }
  });
});

test.describe('Database Constraint Validation', () => {
  
  test('should enforce unique constraint on booking reference', async ({ adminPage: page }) => {
    // This test verifies the database unique constraint
    // Create booking with specific reference
    await page.goto('/dashboard/bookings');
    
    await page.getByRole('button', { name: /nuova prenotazione/i }).click();
    
    // If reference field exists and is editable
    const refField = page.getByLabel(/riferimento|reference|codice/i);
    
    if (await refField.isVisible().catch(() => false) && await refField.isEnabled()) {
      const fixedRef = 'TEST-REF-12345';
      
      // Try to create two bookings with same reference
      await refField.fill(fixedRef);
      await page.getByLabel(/cliente/i).selectOption(TestDataFactory.predefinedCustomer.email);
      await page.getByLabel(/data/i).fill(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
      await page.getByLabel(/ora/i).selectOption('10:00');
      await page.getByRole('button', { name: /crea|salva/i }).click();
      
      // First should succeed
      await page.waitForTimeout(500);
      
      // Try second with same reference
      await page.getByRole('button', { name: /nuova prenotazione/i }).click();
      await refField.fill(fixedRef);
      await page.getByLabel(/cliente/i).selectOption(TestDataFactory.predefinedCustomer.email);
      await page.getByLabel(/data/i).fill(new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0]);
      await page.getByLabel(/ora/i).selectOption('11:00');
      await page.getByRole('button', { name: /crea|salva/i }).click();
      
      // Should show unique constraint error
      await expect(page.getByText(/già esiste|already exists|unico|unique/i)).toBeVisible();
    }
  });

  test('should enforce foreign key constraints', async ({ adminPage: page }) => {
    await page.goto('/dashboard/bookings');
    
    await page.getByRole('button', { name: /nuova prenotazione/i }).click();
    
    // Try to create booking without customer
    const customerSelect = page.getByLabel(/cliente/i);
    await customerSelect.selectOption('');
    
    await page.getByLabel(/data/i).fill(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
    await page.getByLabel(/ora/i).selectOption('10:00');
    
    await page.getByRole('button', { name: /crea|salva/i }).click();
    
    // Should show validation error
    await expect(page.getByText(/cliente obbligatorio|customer required/i).or(
      page.getByText(/campo obbligatorio|required field/i)
    )).toBeVisible();
  });
});
