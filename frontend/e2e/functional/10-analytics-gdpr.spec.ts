/**
 * ANALYTICS, GDPR, MARKETING, MISC modules
 */
import { test, expect } from '@playwright/test';
import { bug, screenshot, goto, waitForContent, collectConsoleErrors } from './helpers';

test.describe('ANALYTICS — Dashboard Analytics', () => {
  test('ANA-01: Analytics principale carica', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard/analytics');
    await waitForContent(page);

    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'Analytics', url: '/dashboard/analytics', action: 'Load analytics', expected: 'Dashboard analytics', observed: '500', severity: 'CRITICO', reproSteps: ['Vai a /dashboard/analytics'] });
      await screenshot(page, 'bug-analytics-500');
    }

    const critErrors = errors.filter(e => e.includes('TypeError'));
    if (critErrors.length > 0) {
      bug({ module: 'Analytics', url: '/dashboard/analytics', action: 'JS errors', expected: 'Nessun TypeError', observed: critErrors[0].substring(0, 200), severity: 'ALTO', reproSteps: ['Vai a /dashboard/analytics', 'Apri console'] });
    }
  });

  test('ANA-02: Analytics benchmarking carica', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard/analytics/benchmarking');
    await waitForContent(page);

    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'Analytics', url: '/dashboard/analytics/benchmarking', action: 'Load benchmarking', expected: 'Pagina benchmarking', observed: '500', severity: 'ALTO', reproSteps: ['Vai a /dashboard/analytics/benchmarking'] });
      await screenshot(page, 'bug-analytics-benchmarking-500');
    }
  });

  test('ANA-03: Analytics tecnici carica', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard/analytics/technicians');
    await waitForContent(page);

    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'Analytics', url: '/dashboard/analytics/technicians', action: 'Load analytics tecnici', expected: 'Statistiche tecnici', observed: '500', severity: 'ALTO', reproSteps: ['Vai a /dashboard/analytics/technicians'] });
      await screenshot(page, 'bug-analytics-technicians-500');
    }
  });
});

test.describe('GDPR — Privacy e Conformità', () => {
  test('GDPR-01: Pagina export GDPR carica', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard/gdpr/export');
    await waitForContent(page);

    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'GDPR', url: '/dashboard/gdpr/export', action: 'Load GDPR export', expected: 'Pagina export dati', observed: '500', severity: 'CRITICO', reproSteps: ['Vai a /dashboard/gdpr/export'] });
      await screenshot(page, 'bug-gdpr-export-500');
    }
  });

  test('GDPR-02: Pagina deletion GDPR carica', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard/gdpr/deletion');
    await waitForContent(page);

    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'GDPR', url: '/dashboard/gdpr/deletion', action: 'Load GDPR deletion', expected: 'Pagina cancellazione dati', observed: '500', severity: 'CRITICO', reproSteps: ['Vai a /dashboard/gdpr/deletion'] });
      await screenshot(page, 'bug-gdpr-deletion-500');
    }
  });

  test('GDPR-03: Export GDPR — form submit senza dati → validazione', async ({ page }) => {
    await goto(page, '/dashboard/gdpr/export');
    await waitForContent(page);

    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;

    const submitBtn = page.locator('button[type="submit"], button:has-text("Esporta"), button:has-text("Richiedi export")').first();
    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(1000);

      const crashed = await page.locator('text=500').first().isVisible().catch(() => false);
      if (crashed) {
        bug({ module: 'GDPR', url: '/dashboard/gdpr/export', action: 'Submit export senza dati', expected: 'Validazione o richiesta', observed: 'Crash 500', severity: 'ALTO', reproSteps: ['Vai a /dashboard/gdpr/export', 'Submit senza dati'] });
        await screenshot(page, 'bug-gdpr-export-submit-crash');
      }
    }
  });
});

test.describe('MARKETING — Comunicazioni', () => {
  test('MKT-01: Marketing lista carica', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard/marketing');
    await waitForContent(page);

    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'Marketing', url: '/dashboard/marketing', action: 'Load marketing', expected: 'Pagina marketing', observed: '500', severity: 'CRITICO', reproSteps: ['Vai a /dashboard/marketing'] });
      await screenshot(page, 'bug-marketing-500');
    }
  });

  test('MKT-02: Marketing segmenti carica', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard/marketing/segments');
    await waitForContent(page);

    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'Marketing', url: '/dashboard/marketing/segments', action: 'Load segmenti', expected: 'Lista segmenti', observed: '500', severity: 'ALTO', reproSteps: ['Vai a /dashboard/marketing/segments'] });
      await screenshot(page, 'bug-marketing-segments-500');
    }
  });

  test('MKT-03: Marketing follow-ups carica', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard/marketing/follow-ups');
    await waitForContent(page);

    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'Marketing', url: '/dashboard/marketing/follow-ups', action: 'Load follow-ups', expected: 'Lista follow-ups', observed: '500', severity: 'ALTO', reproSteps: ['Vai a /dashboard/marketing/follow-ups'] });
      await screenshot(page, 'bug-marketing-followups-500');
    }
  });
});

test.describe('MISC — Moduli vari', () => {
  test('MISC-01: Messaging carica', async ({ page }) => {
    await goto(page, '/dashboard/messaging');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'Messaging', url: '/dashboard/messaging', action: 'Load messaggistica', expected: 'Interfaccia messaggi', observed: '500', severity: 'CRITICO', reproSteps: ['Vai a /dashboard/messaging'] });
      await screenshot(page, 'bug-messaging-500');
    }
  });

  test('MISC-02: Voice AI carica', async ({ page }) => {
    await goto(page, '/dashboard/voice');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'Voice', url: '/dashboard/voice', action: 'Load Voice AI', expected: 'Dashboard Voice AI', observed: '500', severity: 'CRITICO', reproSteps: ['Vai a /dashboard/voice'] });
      await screenshot(page, 'bug-voice-500');
    }
  });

  test('MISC-03: AI Diagnostics carica', async ({ page }) => {
    await goto(page, '/dashboard/diagnostics/ai');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'Diagnostics', url: '/dashboard/diagnostics/ai', action: 'Load AI diagnostics', expected: 'Dashboard AI diagnostics', observed: '500', severity: 'ALTO', reproSteps: ['Vai a /dashboard/diagnostics/ai'] });
      await screenshot(page, 'bug-diagnostics-ai-500');
    }
  });

  test('MISC-04: RENTRI lista carica', async ({ page }) => {
    await goto(page, '/dashboard/rentri');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'RENTRI', url: '/dashboard/rentri', action: 'Load RENTRI', expected: 'RENTRI dashboard', observed: '500', severity: 'CRITICO', reproSteps: ['Vai a /dashboard/rentri'] });
      await screenshot(page, 'bug-rentri-500');
    }
  });

  test('MISC-05: Warranty lista carica', async ({ page }) => {
    await goto(page, '/dashboard/warranty');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'Warranty', url: '/dashboard/warranty', action: 'Load garanzie', expected: 'Lista garanzie', observed: '500', severity: 'CRITICO', reproSteps: ['Vai a /dashboard/warranty'] });
      await screenshot(page, 'bug-warranty-500');
    }
  });

  test('MISC-06: Payments carica', async ({ page }) => {
    await goto(page, '/dashboard/payments');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'Payments', url: '/dashboard/payments', action: 'Load pagamenti', expected: 'Lista pagamenti', observed: '500', severity: 'CRITICO', reproSteps: ['Vai a /dashboard/payments'] });
      await screenshot(page, 'bug-payments-500');
    }
  });

  test('MISC-07: Audit logs carica', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard/audit-logs');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'AuditLogs', url: '/dashboard/audit-logs', action: 'Load audit logs', expected: 'Lista audit logs', observed: '500', severity: 'ALTO', reproSteps: ['Vai a /dashboard/audit-logs'] });
      await screenshot(page, 'bug-auditlogs-500');
    }
  });

  test('MISC-08: Billing carica', async ({ page }) => {
    await goto(page, '/dashboard/billing');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'Billing', url: '/dashboard/billing', action: 'Load billing', expected: 'Pagina billing', observed: '500', severity: 'CRITICO', reproSteps: ['Vai a /dashboard/billing'] });
      await screenshot(page, 'bug-billing-500');
    }
  });

  test('MISC-09: Subscription carica', async ({ page }) => {
    await goto(page, '/dashboard/subscription');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'Subscription', url: '/dashboard/subscription', action: 'Load abbonamento', expected: 'Pagina abbonamento', observed: '500', severity: 'CRITICO', reproSteps: ['Vai a /dashboard/subscription'] });
      await screenshot(page, 'bug-subscription-500');
    }
  });

  test('MISC-10: Payroll carica', async ({ page }) => {
    await goto(page, '/dashboard/payroll');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'Payroll', url: '/dashboard/payroll', action: 'Load paghe', expected: 'Pagina paghe', observed: '500', severity: 'CRITICO', reproSteps: ['Vai a /dashboard/payroll'] });
      await screenshot(page, 'bug-payroll-500');
    }
  });

  test('MISC-11: Maintenance carica', async ({ page }) => {
    await goto(page, '/dashboard/maintenance');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'Maintenance', url: '/dashboard/maintenance', action: 'Load manutenzione', expected: 'Dashboard manutenzione', observed: '500', severity: 'CRITICO', reproSteps: ['Vai a /dashboard/maintenance'] });
      await screenshot(page, 'bug-maintenance-500');
    }
  });

  test('MISC-12: Search funziona', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goto(page, '/dashboard/search');
    await waitForContent(page);

    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'Search', url: '/dashboard/search', action: 'Load ricerca', expected: 'Pagina ricerca', observed: '500', severity: 'ALTO', reproSteps: ['Vai a /dashboard/search'] });
      await screenshot(page, 'bug-search-500');
      return;
    }

    const searchInput = page.locator('input[type="search"], input[placeholder*="cerca" i], input[placeholder*="search" i]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('test');
      await page.waitForTimeout(1500);

      const crashed = await page.locator('text=500, text=Uncaught TypeError').first().isVisible().catch(() => false);
      if (crashed) {
        bug({ module: 'Search', url: '/dashboard/search', action: 'Ricerca con termine', expected: 'Risultati o vuoto', observed: 'Crash', severity: 'ALTO', reproSteps: ['Vai a /dashboard/search', 'Cerca "test"'] });
        await screenshot(page, 'bug-search-crash');
      }
    }
  });
});
