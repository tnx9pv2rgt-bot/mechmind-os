/**
 * DASHBOARD CORE — Caricamento pagine, navigazione, UI elements
 */
import { test, expect } from '@playwright/test';
import { bug, screenshot, goto, waitForContent, collectConsoleErrors, hasElement } from './helpers';

// All dashboard pages to check for load + no crash
const DASHBOARD_PAGES = [
  { path: '/dashboard', name: 'Dashboard principale' },
  { path: '/dashboard/analytics', name: 'Analytics' },
  { path: '/dashboard/analytics/benchmarking', name: 'Analytics Benchmarking' },
  { path: '/dashboard/analytics/technicians', name: 'Analytics Tecnici' },
  { path: '/dashboard/audit-logs', name: 'Audit Logs' },
  { path: '/dashboard/billing', name: 'Billing' },
  { path: '/dashboard/bookings', name: 'Prenotazioni' },
  { path: '/dashboard/bookings/new', name: 'Nuova Prenotazione' },
  { path: '/dashboard/bookings/smart-scheduling', name: 'Smart Scheduling' },
  { path: '/dashboard/calendar', name: 'Calendario' },
  { path: '/dashboard/canned-jobs', name: 'Canned Jobs' },
  { path: '/dashboard/canned-jobs/new', name: 'Nuovo Canned Job' },
  { path: '/dashboard/customers', name: 'Clienti' },
  { path: '/dashboard/customers/new', name: 'Nuovo Cliente' },
  { path: '/dashboard/customers/import', name: 'Import Clienti' },
  { path: '/dashboard/diagnostics/ai', name: 'Diagnostics AI' },
  { path: '/dashboard/estimates', name: 'Preventivi' },
  { path: '/dashboard/estimates/new', name: 'Nuovo Preventivo' },
  { path: '/dashboard/gdpr/deletion', name: 'GDPR Cancellazione' },
  { path: '/dashboard/gdpr/export', name: 'GDPR Export' },
  { path: '/dashboard/inspections', name: 'Ispezioni' },
  { path: '/dashboard/inspections/new', name: 'Nuova Ispezione' },
  { path: '/dashboard/invoices', name: 'Fatture' },
  { path: '/dashboard/invoices/new', name: 'Nuova Fattura' },
  { path: '/dashboard/invoices/credit-note/new', name: 'Nuova Nota di Credito' },
  { path: '/dashboard/maintenance', name: 'Manutenzione' },
  { path: '/dashboard/marketing', name: 'Marketing' },
  { path: '/dashboard/marketing/follow-ups', name: 'Marketing Follow-ups' },
  { path: '/dashboard/marketing/new', name: 'Nuovo Marketing' },
  { path: '/dashboard/marketing/segments', name: 'Segmenti Marketing' },
  { path: '/dashboard/messaging', name: 'Messaggistica' },
  { path: '/dashboard/obd', name: 'OBD' },
  { path: '/dashboard/obd/alerts', name: 'OBD Alerts' },
  { path: '/dashboard/obd/pair', name: 'OBD Pair' },
  { path: '/dashboard/parts', name: 'Ricambi' },
  { path: '/dashboard/parts/catalog', name: 'Catalogo Ricambi' },
  { path: '/dashboard/parts/new', name: 'Nuovo Ricambio' },
  { path: '/dashboard/parts/orders/new', name: 'Nuovo Ordine Ricambi' },
  { path: '/dashboard/payments', name: 'Pagamenti' },
  { path: '/dashboard/payroll', name: 'Paghe' },
  { path: '/dashboard/production-board', name: 'Production Board' },
  { path: '/dashboard/rentri', name: 'RENTRI' },
  { path: '/dashboard/rentri/entries', name: 'RENTRI Voci' },
  { path: '/dashboard/rentri/entries/new', name: 'RENTRI Nuova Voce' },
  { path: '/dashboard/rentri/fir', name: 'RENTRI FIR' },
  { path: '/dashboard/search', name: 'Ricerca' },
  { path: '/dashboard/settings', name: 'Impostazioni' },
  { path: '/dashboard/settings/ai-compliance', name: 'Impostazioni AI Compliance' },
  { path: '/dashboard/settings/appearance', name: 'Impostazioni Aspetto' },
  { path: '/dashboard/settings/audit', name: 'Impostazioni Audit' },
  { path: '/dashboard/settings/memberships', name: 'Impostazioni Abbonamenti' },
  { path: '/dashboard/settings/portability', name: 'Impostazioni Portabilità' },
  { path: '/dashboard/settings/roles', name: 'Impostazioni Ruoli' },
  { path: '/dashboard/settings/security', name: 'Impostazioni Sicurezza' },
  { path: '/dashboard/settings/security/incidents', name: 'Incidenti Sicurezza' },
  { path: '/dashboard/settings/sessions', name: 'Sessioni Attive' },
  { path: '/dashboard/settings/team', name: 'Team' },
  { path: '/dashboard/settings/webhooks', name: 'Webhooks' },
  { path: '/dashboard/subscription', name: 'Abbonamento' },
  { path: '/dashboard/vehicles', name: 'Veicoli' },
  { path: '/dashboard/vehicles/new', name: 'Nuovo Veicolo' },
  { path: '/dashboard/voice', name: 'Voice AI' },
  { path: '/dashboard/warranty', name: 'Garanzia' },
  { path: '/dashboard/warranty/new', name: 'Nuova Garanzia' },
  { path: '/dashboard/warranty/claims', name: 'Reclami Garanzia' },
  { path: '/dashboard/work-orders', name: 'Ordini di Lavoro' },
  { path: '/dashboard/work-orders/new', name: 'Nuovo Ordine di Lavoro' },
  { path: '/dashboard/workflows', name: 'Workflow' },
  { path: '/dashboard/workflows/new', name: 'Nuovo Workflow' },
  { path: '/dashboard/admin/subscriptions', name: 'Admin Abbonamenti' },
];

test.describe('DASHBOARD — Caricamento pagine', () => {
  for (const { path, name } of DASHBOARD_PAGES) {
    test(`DASH-LOAD: ${name} (${path})`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error' && !msg.text().includes('favicon')) {
          consoleErrors.push(msg.text());
        }
      });
      page.on('pageerror', err => consoleErrors.push(`JS: ${err.message}`));

      const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
      const status = resp?.status() ?? 0;

      // Check for HTTP 500
      if (status === 500) {
        const scrFile = await screenshot(page, `bug-dash-500-${path.replace(/\//g, '-')}`);
        bug({
          module: `Dashboard/${name}`,
          url: path,
          action: 'Navigate to page',
          expected: 'HTTP 200 — pagina carica normalmente',
          observed: `HTTP 500 — Server error`,
          severity: 'CRITICO',
          screenshot: scrFile,
          reproSteps: [`Naviga a ${path}`, 'Osserva HTTP 500'],
        });
        return;
      }

      // Wait for content to stabilize
      await page.waitForTimeout(2000);

      // Check for visible 500 error on page
      const page500 = await page.locator('text=500, h1:has-text("Errore"), h1:has-text("Error"), main:has-text("Internal Server Error")').first().isVisible().catch(() => false);
      if (page500) {
        const scrFile = await screenshot(page, `bug-dash-page500-${path.replace(/\//g, '-')}`);
        bug({
          module: `Dashboard/${name}`,
          url: path,
          action: 'Navigate to page — check visible 500',
          expected: 'Contenuto pagina normale',
          observed: 'Testo "500" o "Internal Server Error" visibile sulla pagina',
          severity: 'CRITICO',
          screenshot: scrFile,
          reproSteps: [`Naviga a ${path}`, 'Osserva testo di errore'],
        });
        return;
      }

      // Check for critical JS errors (TypeError, ReferenceError on properties)
      const criticalErrors = consoleErrors.filter(e =>
        e.includes('TypeError') ||
        e.includes('ReferenceError') ||
        e.includes('Cannot read properties of undefined') ||
        e.includes('is not a function') ||
        e.includes('Uncaught')
      );
      if (criticalErrors.length > 0) {
        const scrFile = await screenshot(page, `bug-dash-jserror-${path.replace(/\//g, '-')}`);
        bug({
          module: `Dashboard/${name}`,
          url: path,
          action: 'Navigate to page — check JS errors',
          expected: 'Nessun errore JS critico in console',
          observed: criticalErrors[0].substring(0, 300),
          severity: 'ALTO',
          screenshot: scrFile,
          reproSteps: [`Naviga a ${path}`, 'Apri DevTools console', 'Osserva TypeError/ReferenceError'],
        });
      }

      // Check for infinite skeleton/spinner (page stuck loading)
      await page.waitForTimeout(3000);
      const skeletonCount = await page.locator('[class*="skeleton"], [class*="Skeleton"], [class*="shimmer"]').count();
      const spinnerCount = await page.locator('[class*="spinner"], [class*="loading"], [aria-busy="true"]').count();
      if (skeletonCount > 5 || spinnerCount > 3) {
        // Only flag if no real content alongside
        const hasContent = await page.locator('table, [role="grid"], [role="list"], h1, h2').first().isVisible().catch(() => false);
        if (!hasContent) {
          bug({
            module: `Dashboard/${name}`,
            url: path,
            action: 'Wait for page content',
            expected: 'Contenuto caricato (tabella, lista, form)',
            observed: `Skeleton infinito: ${skeletonCount} skeleton, ${spinnerCount} spinner, nessun contenuto reale`,
            severity: 'ALTO',
            reproSteps: [`Naviga a ${path}`, 'Attendi 5 secondi', 'Osserva skeleton ancora visibile'],
          });
        }
      }
    });
  }
});
