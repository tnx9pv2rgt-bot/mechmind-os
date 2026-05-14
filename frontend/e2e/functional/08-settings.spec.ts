/**
 * SETTINGS — Impostazioni: tutte le sezioni
 */
import { test, expect } from '@playwright/test';
import { bug, screenshot, goto, waitForContent, collectConsoleErrors } from './helpers';

const SETTINGS_PAGES = [
  { path: '/dashboard/settings', name: 'Impostazioni principale' },
  { path: '/dashboard/settings/appearance', name: 'Aspetto' },
  { path: '/dashboard/settings/team', name: 'Team' },
  { path: '/dashboard/settings/roles', name: 'Ruoli' },
  { path: '/dashboard/settings/security', name: 'Sicurezza' },
  { path: '/dashboard/settings/security/incidents', name: 'Incidenti sicurezza' },
  { path: '/dashboard/settings/sessions', name: 'Sessioni attive' },
  { path: '/dashboard/settings/webhooks', name: 'Webhooks' },
  { path: '/dashboard/settings/audit', name: 'Audit' },
  { path: '/dashboard/settings/memberships', name: 'Abbonamenti' },
  { path: '/dashboard/settings/portability', name: 'Portabilità dati' },
  { path: '/dashboard/settings/ai-compliance', name: 'AI Compliance' },
];

test.describe('SETTINGS — Impostazioni', () => {
  for (const { path, name } of SETTINGS_PAGES) {
    test(`SET-LOAD: ${name} (${path})`, async ({ page }) => {
      const errors = collectConsoleErrors(page);
      await goto(page, path);
      await waitForContent(page);

      const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
      if (has500) {
        bug({ module: `Settings/${name}`, url: path, action: 'Load pagina impostazioni', expected: 'Pagina caricata', observed: '500', severity: 'CRITICO', reproSteps: [`Vai a ${path}`] });
        await screenshot(page, `bug-settings-500-${path.replace(/\//g, '-')}`);
      }

      const critErrors = errors.filter(e => e.includes('TypeError') || e.includes('ReferenceError'));
      if (critErrors.length > 0) {
        bug({ module: `Settings/${name}`, url: path, action: 'JS errors', expected: 'Nessun TypeError', observed: critErrors[0].substring(0, 200), severity: 'ALTO', reproSteps: [`Vai a ${path}`, 'Apri console'] });
      }
    });
  }

  test('SET-01: Impostazioni team — lista membri', async ({ page }) => {
    await goto(page, '/dashboard/settings/team');
    await waitForContent(page);

    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;

    const hasContent = await page.locator('table, [role="grid"], [data-testid*="member"], [data-testid*="team"]').first().isVisible().catch(() => false);
    const hasEmpty = await page.locator('text=Nessun membro, text=No members, text=Invita').first().isVisible().catch(() => false);
    if (!hasContent && !hasEmpty) {
      bug({ module: 'Settings/Team', url: '/dashboard/settings/team', action: 'Lista team', expected: 'Lista membri o stato vuoto', observed: 'Nessun contenuto', severity: 'MEDIO', reproSteps: ['Vai a /dashboard/settings/team'] });
    }
  });

  test('SET-02: Webhook — lista webhook', async ({ page }) => {
    await goto(page, '/dashboard/settings/webhooks');
    await waitForContent(page);

    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;

    const addBtn = page.locator('button:has-text("Aggiungi"), button:has-text("Nuovo"), button:has-text("Add"), a[href*="webhooks/new"]').first();
    if (!(await addBtn.isVisible().catch(() => false))) {
      bug({ module: 'Settings/Webhooks', url: '/dashboard/settings/webhooks', action: 'Pulsante aggiungi webhook', expected: 'Pulsante visibile', observed: 'Non trovato', severity: 'BASSO', reproSteps: ['Vai a /dashboard/settings/webhooks'] });
    }
  });

  test('SET-03: Ruoli — lista ruoli', async ({ page }) => {
    await goto(page, '/dashboard/settings/roles');
    await waitForContent(page);

    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;

    const hasRoles = await page.locator('table, [role="grid"], [data-testid*="role"]').first().isVisible().catch(() => false);
    if (!hasRoles) {
      const hasEmpty = await page.locator('text=Nessun ruolo, text=No roles').first().isVisible().catch(() => false);
      if (!hasEmpty) {
        bug({ module: 'Settings/Roles', url: '/dashboard/settings/roles', action: 'Lista ruoli', expected: 'Lista ruoli o stato vuoto', observed: 'Nessun contenuto', severity: 'MEDIO', reproSteps: ['Vai a /dashboard/settings/roles'] });
      }
    }
  });

  test('SET-04: Sessioni attive — lista sessioni', async ({ page }) => {
    await goto(page, '/dashboard/settings/sessions');
    await waitForContent(page);

    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) {
      bug({ module: 'Settings/Sessions', url: '/dashboard/settings/sessions', action: 'Lista sessioni attive', expected: 'Lista sessioni', observed: '500', severity: 'ALTO', reproSteps: ['Vai a /dashboard/settings/sessions'] });
      await screenshot(page, 'bug-settings-sessions-500');
    }
  });

  test('SET-05: Impostazioni aspetto — toggle dark mode', async ({ page }) => {
    await goto(page, '/dashboard/settings/appearance');
    await waitForContent(page);

    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;

    const themeToggle = page.locator('button:has-text("Dark"), button:has-text("Light"), button:has-text("Sistema"), [role="radio"][value*="dark"]').first();
    if (await themeToggle.isVisible().catch(() => false)) {
      await themeToggle.click().catch(() => {});
      await page.waitForTimeout(500);

      const crashed = await page.locator('text=500, text=Uncaught').first().isVisible().catch(() => false);
      if (crashed) {
        bug({ module: 'Settings/Appearance', url: '/dashboard/settings/appearance', action: 'Toggle tema', expected: 'Tema cambiato', observed: 'Crash dopo click', severity: 'ALTO', reproSteps: ['Vai a /dashboard/settings/appearance', 'Click toggle tema'] });
        await screenshot(page, 'bug-settings-theme-crash');
      }
    }
  });
});
