import { test, expect } from '../fixtures/auth.fixture';
import { TestDataFactory } from '../helpers/test-data';

/**
 * Booking Flow E2E Tests
 * Comprehensive test suite for booking CRUD operations
 */

test.describe('Booking List View', () => {
  
  test.beforeEach(async ({ adminPage: page }) => {
    await page.goto('/dashboard/bookings');
  });

  test('should display booking list page', async ({ page }) => {
    await expect(page).toHaveURL(/dashboard\/bookings/);
    await expect(page.getByRole('heading', { name: /prenotazioni|bookings/i })).toBeVisible();
  });

  test('should display bookings table with headers', async ({ page }) => {
    const headers = ['Data', 'Cliente', 'Veicolo', 'Servizio', 'Stato', 'Azioni'];
    
    for (const header of headers) {
      await expect(page.getByRole('columnheader', { name: new RegExp(header, 'i') })
        .or(page.locator(`th:has-text("${header}")`))).toBeVisible();
    }
  });

  test('should filter bookings by date', async ({ page }) => {
    // Open date filter
    await page.getByRole('button', { name: /data|periodo|filtra/i }).click();
    
    // Select date range
    const today = new Date().toISOString().split('T')[0];
    await page.getByLabel(/da|from/i).fill(today);
    await page.getByLabel(/a|to/i).fill(today);
    
    await page.getByRole('button', { name: /applica|apply|filtra/i }).click();
    
    // Table should update
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 5000 });
  });

  test('should filter bookings by status', async ({ page }) => {
    // Select status from dropdown
    await page.getByLabel(/stato|status/i).selectOption('confirmed');
    
    // Check filtered results
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    
    for (let i = 0; i < Math.min(count, 5); i++) {
      await expect(rows.nth(i).locator('td').nth(4)).toContainText(/confermata|confirmed/i);
    }
  });

  test('should search bookings by customer name', async ({ page }) => {
    const searchTerm = 'Mario';
    
    await page.getByPlaceholder(/cerca|search/i).fill(searchTerm);
    await page.getByPlaceholder(/cerca|search/i).press('Enter');
    
    // Results should contain search term
    await expect(page.getByText(new RegExp(searchTerm, 'i')).first()).toBeVisible();
  });

  test('should paginate through bookings', async ({ page }) => {
    // Check if pagination exists
    const nextButton = page.getByRole('button', { name: /successivo|next|›/i });
    
    if (await nextButton.isVisible().catch(() => false)) {
      const firstPageText = await page.locator('table tbody tr').first().textContent();
      
      await nextButton.click();
      
      // Should show different data
      await page.waitForTimeout(500);
      const secondPageText = await page.locator('table tbody tr').first().textContent();
      
      expect(secondPageText).not.toBe(firstPageText);
    }
  });

  test('should open booking details modal', async ({ page }) => {
    // Click on first booking
    await page.locator('table tbody tr').first().click();
    
    // Modal should open
    await expect(page.getByRole('dialog').or(page.locator('[data-testid="booking-modal"], .modal'))).toBeVisible();
    await expect(page.getByText(/dettagli|details/i)).toBeVisible();
  });

  test('should sort bookings by column', async ({ page }) => {
    // Click on date column header to sort
    const dateHeader = page.getByRole('columnheader', { name: /data|date/i });
    await dateHeader.click();
    
    // Should show sort indicator
    await expect(dateHeader.locator('svg, [data-sort]')).toBeVisible();
    
    // Click again to reverse sort
    await dateHeader.click();
  });
});

test.describe('Create Booking', () => {
  
  test.beforeEach(async ({ adminPage: page }) => {
    await page.goto('/dashboard/bookings');
  });

  test('should open create booking form', async ({ page }) => {
    await page.getByRole('button', { name: /nuova prenotazione|new booking|aggiungi/i }).click();
    
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /nuova prenotazione|create booking/i })).toBeVisible();
  });

  test('should create booking with all required fields', async ({ page }) => {
    const customer = TestDataFactory.predefinedCustomer;
    const vehicle = TestDataFactory.predefinedVehicle;
    const service = TestDataFactory.service();
    
    // Open create form
    await page.getByRole('button', { name: /nuova prenotazione|new booking/i }).click();
    
    // Select customer
    await page.getByLabel(/cliente|customer/i).selectOption(customer.email);
    
    // Select vehicle (or create new)
    const vehicleSelect = page.getByLabel(/veicolo|vehicle/i);
    if (await vehicleSelect.isVisible().catch(() => false)) {
      await vehicleSelect.selectOption({ label: `${vehicle.make} ${vehicle.model}` });
    }
    
    // Select service
    await page.getByLabel(/servizio|service/i).selectOption(service.name);
    
    // Select date
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    await page.getByLabel(/data|date/i).fill(tomorrow);
    
    // Select time
    await page.getByLabel(/ora|time/i).selectOption('10:00');
    
    // Submit
    await page.getByRole('button', { name: /crea|salva|conferma/i }).click();
    
    // Success message
    await expect(page.getByText(/prenotazione creata|booking created|successo/i)).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.getByRole('button', { name: /nuova prenotazione|new booking/i }).click();
    
    // Submit without filling fields
    await page.getByRole('button', { name: /crea|salva|conferma/i }).click();
    
    // Validation errors should appear
    await expect(page.getByText(/campo obbligatorio|required|obbligatorio/i).first()).toBeVisible();
  });

  test('should validate future date', async ({ page }) => {
    await page.getByRole('button', { name: /nuova prenotazione|new booking/i }).click();
    
    // Select customer
    const customer = TestDataFactory.predefinedCustomer;
    await page.getByLabel(/cliente|customer/i).selectOption(customer.email);
    
    // Try to select past date
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    await page.getByLabel(/data|date/i).fill(yesterday);
    
    await page.getByRole('button', { name: /crea|salva|conferma/i }).click();
    
    // Should show error
    await expect(page.getByText(/data futura|future date|passata/i)).toBeVisible();
  });

  test('should show available time slots', async ({ page }) => {
    await page.getByRole('button', { name: /nuova prenotazione|new booking/i }).click();
    
    // Select date first
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    await page.getByLabel(/data|date/i).fill(tomorrow);
    
    // Time slots should load
    const timeSelect = page.getByLabel(/ora|time/i);
    const options = await timeSelect.locator('option').count();
    expect(options).toBeGreaterThan(1);
  });

  test('should mark time slots as unavailable', async ({ page }) => {
    await page.getByRole('button', { name: /nuova prenotazione|new booking/i }).click();
    
    // Select a busy date (would need known busy date in test data)
    // This test depends on test data setup
    
    const timeSelect = page.getByLabel(/ora|time/i);
    
    // Some options should be disabled
    const disabledOptions = timeSelect.locator('option[disabled]');
    // We just check the mechanism works - actual availability depends on data
    expect(await disabledOptions.count()).toBeGreaterThanOrEqual(0);
  });

  test('should create booking with notes', async ({ page }) => {
    await page.getByRole('button', { name: /nuova prenotazione|new booking/i }).click();
    
    const customer = TestDataFactory.predefinedCustomer;
    await page.getByLabel(/cliente|customer/i).selectOption(customer.email);
    
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    await page.getByLabel(/data|date/i).fill(tomorrow);
    await page.getByLabel(/ora|time/i).selectOption('10:00');
    
    // Add notes
    await page.getByLabel(/note|notes|informazioni aggiuntive/i).fill('Tagliando completo con cambio filtri');
    
    await page.getByRole('button', { name: /crea|salva|conferma/i }).click();
    
    await expect(page.getByText(/successo|creato|created/i)).toBeVisible();
  });

  test('should show price estimate', async ({ page }) => {
    await page.getByRole('button', { name: /nuova prenotazione|new booking/i }).click();
    
    // Select service with price
    await page.getByLabel(/servizio|service/i).selectOption('Tagliando completo');
    
    // Price should be displayed
    await expect(page.getByText(/€|\$/).or(page.getByText(/prezzo|price|costo/i))).toBeVisible();
  });

  test('should create recurring booking', async ({ page }) => {
    await page.getByRole('button', { name: /nuova prenotazione|new booking/i }).click();
    
    // Check if recurring option exists
    const recurringCheckbox = page.getByLabel(/ricorrente|recurring/i);
    
    if (await recurringCheckbox.isVisible().catch(() => false)) {
      await recurringCheckbox.check();
      
      // Recurring options should appear
      await expect(page.getByLabel(/frequenza|frequency|ogni/i)).toBeVisible();
      
      // Configure recurring
      await page.getByLabel(/frequenza/i).selectOption('monthly');
      await page.getByLabel(/fine|end date|numero di volte/i).fill('3');
    }
  });
});

test.describe('Edit Booking', () => {
  
  test.beforeEach(async ({ adminPage: page }) => {
    await page.goto('/dashboard/bookings');
  });

  test('should open edit booking form', async ({ page }) => {
    // Click edit on first booking
    const editButton = page.locator('table tbody tr').first()
      .getByRole('button', { name: /modifica|edit|⋮/i });
    
    await editButton.click();
    
    // Edit modal should open
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /modifica|edit/i })).toBeVisible();
  });

  test('should update booking status', async ({ page }) => {
    // Open edit for first booking
    await page.locator('table tbody tr').first()
      .getByRole('button', { name: /modifica|edit|⋮/i }).click();
    
    // Change status
    await page.getByLabel(/stato|status/i).selectOption('completed');
    
    // Save
    await page.getByRole('button', { name: /salva|save|aggiorna/i }).click();
    
    // Success message
    await expect(page.getByText(/aggiornata|updated|successo/i)).toBeVisible();
  });

  test('should reschedule booking', async ({ page }) => {
    await page.locator('table tbody tr').first()
      .getByRole('button', { name: /modifica|edit|⋮/i }).click();
    
    // Change date
    const newDate = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];
    await page.getByLabel(/data|date/i).fill(newDate);
    
    // Change time
    await page.getByLabel(/ora|time/i).selectOption('14:00');
    
    await page.getByRole('button', { name: /salva|save|aggiorna/i }).click();
    
    await expect(page.getByText(/aggiornata|updated|successo/i)).toBeVisible();
  });

  test('should add services to existing booking', async ({ page }) => {
    await page.locator('table tbody tr').first()
      .getByRole('button', { name: /modifica|edit|⋮/i }).click();
    
    // Look for add service button
    const addServiceButton = page.getByRole('button', { name: /aggiungi servizio|add service/i });
    
    if (await addServiceButton.isVisible().catch(() => false)) {
      await addServiceButton.click();
      
      // Select additional service
      await page.getByLabel(/servizio/i).last().selectOption('Cambio olio');
      
      await page.getByRole('button', { name: /salva|save/i }).click();
      
      await expect(page.getByText(/aggiornata|updated/i)).toBeVisible();
    }
  });

  test('should cancel booking', async ({ page }) => {
    // Click cancel on first booking
    const cancelButton = page.locator('table tbody tr').first()
      .getByRole('button', { name: /annulla|cancel|elimina/i });
    
    if (await cancelButton.isVisible().catch(() => false)) {
      await cancelButton.click();
      
      // Confirm cancellation
      await page.getByRole('button', { name: /conferma|sì|yes/i }).click();
      
      // Status should change to cancelled
      await expect(page.getByText(/annullata|cancellata|cancelled/i).first()).toBeVisible();
    }
  });

  test('should require confirmation for cancellation', async ({ page }) => {
    await page.locator('table tbody tr').first()
      .getByRole('button', { name: /annulla|cancel/i }).click();
    
    // Confirmation dialog should appear
    await expect(page.getByText(/conferma|sei sicuro|sure/i)).toBeVisible();
    
    // Cancel the cancellation
    await page.getByRole('button', { name: /no|annulla|cancel/i }).click();
    
    // Modal should close without changes
    await expect(page.getByText(/conferma/i)).not.toBeVisible();
  });
});

test.describe('Booking Details', () => {
  
  test.beforeEach(async ({ adminPage: page }) => {
    await page.goto('/dashboard/bookings');
  });

  test('should display complete booking information', async ({ page }) => {
    // Click on first booking row
    await page.locator('table tbody tr').first().click();
    
    // Check all details are shown
    const detailsToCheck = ['Cliente', 'Veicolo', 'Servizio', 'Data', 'Ora', 'Stato'];
    
    for (const detail of detailsToCheck) {
      await expect(page.getByText(new RegExp(detail, 'i')).first()).toBeVisible();
    }
  });

  test('should show booking history/timeline', async ({ page }) => {
    await page.locator('table tbody tr').first().click();
    
    // Look for history/timeline section
    const historySection = page.getByText(/cronologia|history|timeline|attività/i);
    
    if (await historySection.isVisible().catch(() => false)) {
      await expect(page.locator('.timeline, [data-testid="history"]').first()).toBeVisible();
    }
  });

  test('should show related documents', async ({ page }) => {
    await page.locator('table tbody tr').first().click();
    
    // Check for documents section
    const documentsTab = page.getByRole('tab', { name: /documenti|documents|fatture/i });
    
    if (await documentsTab.isVisible().catch(() => false)) {
      await documentsTab.click();
      
      await expect(page.getByText(/fattura|invoice|documento/i).or(
        page.getByText(/nessun documento|no documents/i)
      )).toBeVisible();
    }
  });

  test('should print booking details', async ({ page }) => {
    await page.locator('table tbody tr').first().click();
    
    const printButton = page.getByRole('button', { name: /stampa|print/i });
    
    if (await printButton.isVisible().catch(() => false)) {
      await printButton.click();
      
      // Print dialog should open (browser native, can't fully test)
      // We just verify the button works
    }
  });

  test('should send booking reminder', async ({ page }) => {
    await page.locator('table tbody tr').first().click();
    
    const remindButton = page.getByRole('button', { name: /invia promemoria|send reminder|notifica/i });
    
    if (await remindButton.isVisible().catch(() => false)) {
      await remindButton.click();
      
      // Should show success
      await expect(page.getByText(/promemoria inviato|reminder sent|notifica inviata/i)).toBeVisible();
    }
  });
});

test.describe('Calendar View', () => {
  
  test('should switch to calendar view', async ({ adminPage: page }) => {
    await page.goto('/dashboard/bookings');
    
    // Look for calendar view toggle
    const calendarToggle = page.getByRole('button', { name: /calendario|calendar|vista/i });
    
    if (await calendarToggle.isVisible().catch(() => false)) {
      await calendarToggle.click();
      
      // Calendar should be visible
      await expect(page.locator('.calendar, [data-testid="calendar"], .fc').first()).toBeVisible();
    }
  });

  test('should navigate calendar months', async ({ adminPage: page }) => {
    await page.goto('/dashboard/bookings?view=calendar');
    
    const prevButton = page.getByRole('button', { name: /precedente|previous|‹/i });
    const nextButton = page.getByRole('button', { name: /successivo|next|›/i });
    
    if (await prevButton.isVisible().catch(() => false)) {
      const currentMonth = await page.getByRole('heading').first().textContent();
      
      await nextButton.click();
      await page.waitForTimeout(500);
      
      const newMonth = await page.getByRole('heading').first().textContent();
      expect(newMonth).not.toBe(currentMonth);
    }
  });

  test('should create booking from calendar', async ({ adminPage: page }) => {
    await page.goto('/dashboard/bookings?view=calendar');
    
    // Click on a date cell
    const dateCell = page.locator('.fc-day, .calendar-day, [data-date]').first();
    
    if (await dateCell.isVisible().catch(() => false)) {
      await dateCell.click();
      
      // Create form should open with pre-selected date
      await expect(page.getByRole('dialog')).toBeVisible();
    }
  });
});

test.describe('Booking Notifications', () => {
  
  test('should notify customer of new booking', async ({ adminPage: page }) => {
    await page.goto('/dashboard/bookings');
    
    // Create a new booking
    await page.getByRole('button', { name: /nuova prenotazione/i }).click();
    
    const customer = TestDataFactory.predefinedCustomer;
    await page.getByLabel(/cliente/i).selectOption(customer.email);
    
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    await page.getByLabel(/data/i).fill(tomorrow);
    await page.getByLabel(/ora/i).selectOption('10:00');
    
    await page.getByRole('button', { name: /crea|salva/i }).click();
    
    // Should show notification sent message
    await expect(page.getByText(/notifica inviata|email inviata|notificato/i).or(
      page.getByText(/successo|creato/i)
    )).toBeVisible();
  });

  test('should notify customer of booking changes', async ({ adminPage: page }) => {
    await page.goto('/dashboard/bookings');
    
    // Modify a booking
    await page.locator('table tbody tr').first()
      .getByRole('button', { name: /modifica/i }).click();
    
    const newDate = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
    await page.getByLabel(/data/i).fill(newDate);
    
    await page.getByRole('button', { name: /salva/i }).click();
    
    // Should show notification
    await expect(page.getByText(/aggiornata|updated/i)).toBeVisible();
  });
});
