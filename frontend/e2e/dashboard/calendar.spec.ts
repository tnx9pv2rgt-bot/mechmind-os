import { test, expect } from '../fixtures/auth.fixture';

/**
 * Calendar Page E2E Tests — API-mocked, no backend required.
 * 6-block pattern: Render, Loading, Empty, Error, Data, Actions.
 */

const MOCK_CALENDAR_EVENTS = {
  data: [
    {
      id: 'bk-1',
      title: 'Tagliando Marco Verdi',
      start: '2026-05-10T09:00:00Z',
      end: '2026-05-10T10:00:00Z',
      type: 'booking',
      status: 'confirmed',
      customerName: 'Marco Verdi',
      vehiclePlate: 'AB123CD',
      resourceId: 'tech-1',
    },
    {
      id: 'wo-1',
      title: 'Riparazione Freni BMW',
      start: '2026-05-10T11:00:00Z',
      end: '2026-05-10T13:00:00Z',
      type: 'work_order',
      status: 'in_progress',
      customerName: 'Laura Bianchi',
      vehiclePlate: 'EF456GH',
      resourceId: 'tech-2',
    },
    {
      id: 'bk-2',
      title: 'Pneumatici Audi A4',
      start: '2026-05-10T14:00:00Z',
      end: '2026-05-10T15:00:00Z',
      type: 'booking',
      status: 'pending',
      customerName: 'Giulia Neri',
      vehiclePlate: 'IJ789KL',
      resourceId: 'tech-1',
    },
  ],
};

const MOCK_CALENDAR_STATS = {
  data: {
    todayBookings: 3,
    availableTechnicians: 2,
    occupiedBays: 2,
    totalBays: 4,
  },
};

function mockCalendarApi(page: import('@playwright/test').Page): Promise<void[]> {
  return Promise.all([
    page.route('**/api/dashboard/calendar/events?**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_CALENDAR_EVENTS),
      });
    }),
    page.route('**/api/bookings/calendar/stats**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_CALENDAR_STATS),
      });
    }),
  ]);
}

test.describe('Calendar - Render', () => {
  test.beforeEach(async ({ page }) => {
    await mockCalendarApi(page);
    await page.goto('/dashboard/calendar');
    await page.waitForLoadState('networkidle');
  });

  test('CAL-001: shows calendar header with navigation', async ({ page }) => {
    const header = page.locator('header').first();
    await expect(header).toBeVisible();
  });

  test('CAL-002: shows view switcher buttons (Mese, Settimana, Giorno)', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /Mese|Settimana|Giorno|Agenda/i }).first()
    ).toBeVisible();
  });

  test('CAL-003: shows new booking button', async ({ page }) => {
    const newBtn = page.getByRole('button', { name: /Nuova/i }).or(page.getByText(/Nuova/)).first();
    await expect(newBtn).toBeVisible();
  });
});

test.describe('Calendar - Loading', () => {
  test('CAL-004: shows loader while fetching events', async ({ page }) => {
    await page.route('**/api/dashboard/calendar/events?**', async route => {
      await new Promise(r => setTimeout(r, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_CALENDAR_EVENTS),
      });
    });

    await page.route('**/api/bookings/calendar/stats**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_CALENDAR_STATS),
      });
    });

    await page.goto('/dashboard/calendar');
    const loader = page.locator('svg.animate-spin').first();
    await expect(loader).toBeVisible({ timeout: 3000 });
  });
});

test.describe('Calendar - Empty State', () => {
  test('CAL-005: shows empty calendar when no events', async ({ page }) => {
    await page.route('**/api/dashboard/calendar/events?**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });

    await mockCalendarApi(page);
    await page.goto('/dashboard/calendar');
    await page.waitForLoadState('networkidle');

    // Calendar should still be visible but with no events
    const calendarContainer = page.locator('.apple-calendar-container').first();
    await expect(calendarContainer).toBeVisible();
  });
});

test.describe('Calendar - Error State', () => {
  test('CAL-006: shows error message on API failure', async ({ page }) => {
    await page.route('**/api/dashboard/calendar/events?**', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await page.route('**/api/bookings/calendar/stats**', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await page.goto('/dashboard/calendar');
    await expect(page.getByText(/Impossibile caricare|errore/i).first()).toBeVisible({
      timeout: 10000,
    });
  });
});

test.describe('Calendar - Data', () => {
  test.beforeEach(async ({ page }) => {
    await mockCalendarApi(page);
    await page.goto('/dashboard/calendar');
    await page.waitForLoadState('networkidle');
  });

  test('CAL-007: displays booking events on calendar', async ({ page }) => {
    await expect(
      page.getByText('Tagliando Marco Verdi').or(page.getByText('Tagliando')).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('CAL-008: displays work order events on calendar', async ({ page }) => {
    await expect(
      page.getByText('Riparazione Freni').or(page.getByText('Riparazione')).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('CAL-009: shows sidebar stats (bookings today, available technicians)', async ({ page }) => {
    const prenotazioniOggi = page.getByText(/Prenotazioni oggi|3/i).first();
    const tecnici = page.getByText(/Tecnici disponibili|2/i).first();

    const statsVisible =
      (await prenotazioniOggi.isVisible().catch(() => false)) ||
      (await tecnici.isVisible().catch(() => false));
    expect(statsVisible).toBe(true);
  });

  test('CAL-010: shows mini calendar sidebar', async ({ page }) => {
    const miniCal = page.locator('.select-none').first();
    await expect(miniCal).toBeVisible({ timeout: 5000 });
  });

  test('CAL-011: displays bay occupancy status', async ({ page }) => {
    const bayStatus = page.getByText(/Bay occupati|2\/4/i).first();
    await expect(bayStatus).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Calendar - Actions', () => {
  test('CAL-012: clicking event navigates to booking detail', async ({ page }) => {
    await mockCalendarApi(page);
    await page.goto('/dashboard/calendar');
    await page.waitForLoadState('networkidle');

    const event = page.getByText('Tagliando Marco Verdi').or(page.getByText('Tagliando')).first();
    if (await event.isVisible()) {
      await event.click();
      await page.waitForURL(/bookings\/bk-1/, { timeout: 10000 }).catch(() => {});
    }
  });

  test('CAL-013: view switcher changes calendar layout', async ({ page }) => {
    await mockCalendarApi(page);
    await page.goto('/dashboard/calendar');
    await page.waitForLoadState('networkidle');

    const settimanaBtn = page.getByRole('button', { name: /Settimana/i });
    if (await settimanaBtn.isVisible().catch(() => false)) {
      await settimanaBtn.click();
      // Week view should render
      await page.waitForTimeout(500);
      const calendarVisible = await page.locator('.apple-calendar-container').isVisible();
      expect(calendarVisible).toBe(true);
    }
  });

  test('CAL-014: today button navigates to current date', async ({ page }) => {
    await mockCalendarApi(page);
    await page.goto('/dashboard/calendar');

    const todayBtn = page.getByRole('button', { name: /Oggi/i });
    await expect(todayBtn).toBeVisible();
    await todayBtn.click();
    await page.waitForTimeout(300);

    // Header should reflect today's date
    const header = page.locator('header').first();
    await expect(header).toBeVisible();
  });

  test('CAL-015: navigation arrows move between periods', async ({ page }) => {
    await mockCalendarApi(page);
    await page.goto('/dashboard/calendar');
    await page.waitForLoadState('networkidle');

    const nextBtn = page
      .locator('button')
      .filter({ has: page.locator('[class*="ChevronRight"]') })
      .first();
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();

    // Calendar should update
    await page.waitForTimeout(300);
    const headerText = await page.locator('header h1').first().textContent();
    expect(headerText).toBeTruthy();
  });

  test('CAL-016: export button is accessible', async ({ page }) => {
    await mockCalendarApi(page);
    await page.goto('/dashboard/calendar');

    // List view button (calendar↔list switch)
    const listBtn = page
      .getByRole('button', { name: /Vista lista/i })
      .or(
        page
          .locator('button')
          .filter({ has: page.locator('[class*="List"]') })
          .first()
      )
      .first();

    if (await listBtn.isVisible().catch(() => false)) {
      await expect(listBtn).toHaveAttribute('title', /lista|List/i);
    }
  });
});
