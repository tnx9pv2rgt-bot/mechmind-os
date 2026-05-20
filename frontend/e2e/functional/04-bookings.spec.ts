/**
 * BOOKINGS — Prenotazioni: form, stato macchina, calendario
 */
import { test, expect } from '@playwright/test';
import { bug, screenshot, goto, waitForContent, collectConsoleErrors } from './helpers';

test.describe('BOOKINGS — Prenotazioni', () => {
  test('BOOK-01: Lista prenotazioni', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard/bookings');
    await waitForContent(page);

    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'Bookings', url: '/dashboard/bookings', action: 'Load lista', expected: 'Lista prenotazioni', observed: '500', severity: 'CRITICO', reproSteps: ['Vai a /dashboard/bookings'] });
      await screenshot(page, 'bug-book-list-500');
    }

    // Check for new booking button
    const newBtn = page.locator('a[href*="bookings/new"], button:has-text("Nuova"), button:has-text("Prenota")').first();
    if (!(await newBtn.isVisible().catch(() => false))) {
      bug({ module: 'Bookings', url: '/dashboard/bookings', action: 'Pulsante nuova prenotazione', expected: 'Pulsante "Nuova prenotazione" visibile', observed: 'Non trovato', severity: 'MEDIO', reproSteps: ['Vai a /dashboard/bookings', 'Cerca pulsante'] });
    }
  });

  test('BOOK-02: Form nuova prenotazione — carica', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard/bookings/new');
    await waitForContent(page);

    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'Bookings', url: '/dashboard/bookings/new', action: 'Load form prenotazione', expected: 'Form prenotazione', observed: '500', severity: 'CRITICO', reproSteps: ['Vai a /dashboard/bookings/new'] });
      await screenshot(page, 'bug-book-new-500');
    }

    const critErrors = errors.filter(e => e.includes('TypeError'));
    if (critErrors.length > 0) {
      bug({ module: 'Bookings', url: '/dashboard/bookings/new', action: 'JS errors on load', expected: 'Nessun TypeError', observed: critErrors[0].substring(0, 200), severity: 'ALTO', reproSteps: ['Vai a /dashboard/bookings/new', 'Apri console'] });
    }
  });

  test('BOOK-03: Form nuova prenotazione — submit vuoto → validazione', async ({ page }) => {
    await goto(page, '/dashboard/bookings/new');
    await waitForContent(page);

    const submitBtn = page.locator('button[type="submit"], button:has-text("Salva"), button:has-text("Prenota"), button:has-text("Conferma")').first();
    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(1000);
      // Should stay on form and show errors
      const url = page.url();
      if (!url.includes('/bookings/new') && !url.includes('/bookings')) {
        bug({ module: 'Bookings', url: '/dashboard/bookings/new', action: 'Submit form vuoto', expected: 'Validazione errori, rimane su form', observed: `Redirect inatteso a: ${url}`, severity: 'ALTO', reproSteps: ['Vai a /dashboard/bookings/new', 'Submit senza dati', 'Osserva redirect'] });
      }
    }
  });

  test('BOOK-04: Smart scheduling page', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard/bookings/smart-scheduling');
    await waitForContent(page);

    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'Bookings', url: '/dashboard/bookings/smart-scheduling', action: 'Load smart scheduling', expected: 'Pagina smart scheduling', observed: '500', severity: 'ALTO', reproSteps: ['Vai a /dashboard/bookings/smart-scheduling'] });
      await screenshot(page, 'bug-book-scheduling-500');
    }
  });

  test('BOOK-05: Calendario', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard/calendar');
    await waitForContent(page);

    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'Bookings/Calendar', url: '/dashboard/calendar', action: 'Load calendario', expected: 'Calendario prenotazioni', observed: '500', severity: 'CRITICO', reproSteps: ['Vai a /dashboard/calendar'] });
      await screenshot(page, 'bug-calendar-500');
    }

    // Calendar should have navigation buttons (prev/next month)
    const navBtn = page.locator('button[aria-label*="previous" i], button[aria-label*="next" i], button[aria-label*="prev" i], button[aria-label*="oggi" i]').first();
    const hasCalContent = await page.locator('[class*="calendar"], [class*="fc-"], [role="grid"]').first().isVisible().catch(() => false);
    if (!has500 && !hasCalContent) {
      bug({ module: 'Bookings/Calendar', url: '/dashboard/calendar', action: 'Componente calendario visibile', expected: 'Griglia calendario renderizzata', observed: 'Nessun componente calendario trovato', severity: 'ALTO', reproSteps: ['Vai a /dashboard/calendar', 'Attendi 5 secondi', 'Nessuna griglia'] });
      await screenshot(page, 'bug-calendar-no-component');
    }
  });
});
