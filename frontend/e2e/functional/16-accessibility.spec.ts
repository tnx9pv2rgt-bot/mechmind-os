/**
 * ACCESSIBILITY — WCAG 2.2 AA via axe-core, focus, keyboard nav, screen reader
 */
import { test, expect } from '@playwright/test';
import { bug, screenshot, goto, waitForContent } from './helpers';
import { runAxeCheck } from './nasa-helpers';

const A11Y_PAGES = [
  { path: '/dashboard', module: 'Dashboard' },
  { path: '/dashboard/customers', module: 'Customers' },
  { path: '/dashboard/customers/new', module: 'Customers/New' },
  { path: '/dashboard/vehicles', module: 'Vehicles' },
  { path: '/dashboard/work-orders', module: 'WorkOrders' },
  { path: '/dashboard/bookings', module: 'Bookings' },
  { path: '/dashboard/bookings/new', module: 'Bookings/New' },
  { path: '/dashboard/invoices', module: 'Invoices' },
  { path: '/dashboard/invoices/new', module: 'Invoices/New' },
  { path: '/dashboard/analytics', module: 'Analytics' },
  { path: '/dashboard/settings', module: 'Settings' },
  { path: '/dashboard/settings/team', module: 'Settings/Team' },
  { path: '/dashboard/gdpr/export', module: 'GDPR/Export' },
];

// ─── axe-core WCAG 2.2 AA ─────────────────────────────────────────────────────

test.describe('A11Y-AXE — WCAG 2.2 AA via axe-core', () => {
  for (const { path, module } of A11Y_PAGES) {
    test(`A11Y-AXE-${module}: axe-core scan (${path})`, async ({ page }) => {
      await goto(page, path);
      await waitForContent(page);

      const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
      if (has500) return;

      // Wait for content to fully render
      await page.waitForTimeout(1000);

      try {
        const entry = await runAxeCheck(page, path, module);

        if (entry.critical > 0) {
          await screenshot(page, `bug-a11y-critical-${module.toLowerCase().replace(/\//g, '-')}`);
        }

        // Violations are already logged by runAxeCheck into nasa-report.json
      } catch (err) {
        // axe-core may fail on some pages; log but don't fail test
        bug({
          module: `A11Y/${module}`,
          url: path,
          action: 'axe-core scan',
          expected: 'Scan completato',
          observed: `axe-core error: ${String(err).substring(0, 100)}`,
          severity: 'BASSO',
          reproSteps: [`Esegui axe-core su ${path}`],
        });
      }
    });
  }
});

// ─── Keyboard Navigation ──────────────────────────────────────────────────────

test.describe('A11Y-KEY — Navigazione da tastiera', () => {
  test('A11Y-KEY-01: Tab order logico su form clienti', async ({ page }) => {
    await goto(page, '/dashboard/customers/new');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;

    // Tab through form elements
    await page.keyboard.press('Tab');
    const focused1 = await page.evaluate(() => document.activeElement?.tagName ?? 'NONE');

    await page.keyboard.press('Tab');
    const focused2 = await page.evaluate(() => document.activeElement?.tagName ?? 'NONE');

    const validTags = ['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA', 'A'];
    if (!validTags.includes(focused1) && !validTags.includes(focused2)) {
      bug({
        module: 'Customers/Form/A11Y',
        url: '/dashboard/customers/new',
        action: 'Tab navigation',
        expected: 'Focus su input/button/select',
        observed: `Focus su ${focused1} poi ${focused2}`,
        severity: 'MEDIO',
        reproSteps: ['Vai a /dashboard/customers/new', 'Tab dal primo elemento'],
      });
    }
  });

  test('A11Y-KEY-02: Skip link su dashboard', async ({ page }) => {
    await goto(page, '/dashboard');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;

    await page.keyboard.press('Tab');
    const firstFocused = await page.evaluate(() => ({
      tag: document.activeElement?.tagName,
      text: document.activeElement?.textContent?.trim().substring(0, 50),
      href: (document.activeElement as HTMLAnchorElement)?.href,
    }));

    const isSkipLink = firstFocused.text?.toLowerCase().includes('skip') ||
      firstFocused.text?.toLowerCase().includes('salta') ||
      firstFocused.href?.includes('#main') ||
      firstFocused.href?.includes('#content');

    if (!isSkipLink) {
      bug({
        module: 'Dashboard/A11Y',
        url: '/dashboard',
        action: 'Skip link',
        expected: 'Primo Tab focus su skip link "Salta al contenuto"',
        observed: `Primo focus: <${firstFocused.tag}> "${firstFocused.text}"`,
        severity: 'MEDIO',
        reproSteps: ['Vai a /dashboard', 'Premi Tab una volta', 'Dovrebbe apparire skip link'],
      });
    }
  });

  test('A11Y-KEY-03: Enter/Space attivano pulsanti', async ({ page }) => {
    await goto(page, '/dashboard/customers');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;

    // Find first button and try activating with Enter
    const firstBtn = page.locator('button:not([disabled])').first();
    if (!(await firstBtn.isVisible().catch(() => false))) return;

    await firstBtn.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    const crashed = await page.locator('text=500').first().isVisible().catch(() => false);
    if (crashed) {
      bug({ module: 'Customers/A11Y', url: '/dashboard/customers', action: 'Enter su button', expected: 'Azione eseguita', observed: 'Crash', severity: 'ALTO', reproSteps: ['Focus su primo pulsante', 'Premi Enter'] });
    }
  });
});

// ─── Focus Indicators ─────────────────────────────────────────────────────────

test.describe('A11Y-FOCUS — Indicatori di focus', () => {
  test('A11Y-FOCUS-01: Focus visibile su input form', async ({ page }) => {
    await goto(page, '/dashboard/customers/new');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;

    const input = page.locator('input:not([type="hidden"])').first();
    if (!(await input.isVisible().catch(() => false))) return;

    await input.focus();
    await page.waitForTimeout(200);

    const hasFocusStyle = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement;
      if (!active) return false;
      const style = window.getComputedStyle(active);
      const outline = style.outline;
      const boxShadow = style.boxShadow;
      const ring = style.getPropertyValue('--tw-ring-shadow');
      return outline !== 'none' || boxShadow !== 'none' || ring !== '';
    });

    if (!hasFocusStyle) {
      bug({
        module: 'Customers/Form/A11Y',
        url: '/dashboard/customers/new',
        action: 'Focus indicator su input',
        expected: 'Outline o box-shadow visibile su focus',
        observed: 'Nessun indicatore visibile (outline: none, no box-shadow)',
        severity: 'MEDIO',
        reproSteps: ['Vai a /dashboard/customers/new', 'Focus su input', 'Verifica outline CSS'],
      });
    }
  });

  test('A11Y-FOCUS-02: Focus visibile su pulsanti', async ({ page }) => {
    await goto(page, '/dashboard/customers');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;

    const btn = page.locator('button:not([disabled])').first();
    if (!(await btn.isVisible().catch(() => false))) return;

    await btn.focus();
    await page.waitForTimeout(200);

    const hasFocusStyle = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement;
      if (!active) return false;
      const style = window.getComputedStyle(active);
      return style.outline !== 'none' || style.boxShadow !== 'none';
    });

    if (!hasFocusStyle) {
      bug({
        module: 'Customers/A11Y',
        url: '/dashboard/customers',
        action: 'Focus indicator su button',
        expected: 'Outline visibile su focus pulsante',
        observed: 'Nessun outline su pulsante focused',
        severity: 'MEDIO',
        reproSteps: ['Vai a /dashboard/customers', 'Focus su pulsante (Tab)', 'Verifica outline'],
      });
    }
  });
});

// ─── ARIA & Semantic HTML ─────────────────────────────────────────────────────

test.describe('A11Y-ARIA — ARIA e HTML semantico', () => {
  test('A11Y-ARIA-01: Heading hierarchy su dashboard', async ({ page }) => {
    await goto(page, '/dashboard');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;

    const headings = await page.evaluate(() => {
      const tags = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      return tags.map(h => h.tagName);
    });

    const hasH1 = headings.includes('H1');
    if (!hasH1) {
      bug({
        module: 'Dashboard/A11Y',
        url: '/dashboard',
        action: 'Heading h1',
        expected: 'Almeno un <h1> su ogni pagina',
        observed: `Headings trovati: ${headings.join(', ') || 'nessuno'}`,
        severity: 'MEDIO',
        reproSteps: ['Vai a /dashboard', 'Verifica presenza <h1>'],
      });
    }

    // Check for heading level skip (h1 → h3 without h2)
    let prevLevel = 0;
    for (const tag of headings) {
      const level = parseInt(tag.charAt(1));
      if (level > prevLevel + 1 && prevLevel > 0) {
        bug({
          module: 'Dashboard/A11Y',
          url: '/dashboard',
          action: 'Heading hierarchy skip',
          expected: 'Headings sequenziali (h1 → h2 → h3)',
          observed: `Salto da h${prevLevel} a h${level}`,
          severity: 'BASSO',
          reproSteps: ['Vai a /dashboard', 'Analizza struttura heading'],
        });
        break;
      }
      prevLevel = level;
    }
  });

  test('A11Y-ARIA-02: Immagini hanno alt text', async ({ page }) => {
    await goto(page, '/dashboard');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;

    const imgsWithoutAlt = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs.filter(img => !img.alt && !img.getAttribute('aria-hidden')).length;
    });

    if (imgsWithoutAlt > 0) {
      bug({
        module: 'Dashboard/A11Y',
        url: '/dashboard',
        action: 'Alt text immagini',
        expected: 'Tutte le immagini significative con alt text',
        observed: `${imgsWithoutAlt} immagini senza alt e senza aria-hidden`,
        severity: 'MEDIO',
        reproSteps: ['Vai a /dashboard', 'Controlla img senza alt'],
      });
    }
  });

  test('A11Y-ARIA-03: Buttons hanno label accessibili', async ({ page }) => {
    await goto(page, '/dashboard/customers');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;

    const unlabeledBtns = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.filter(btn => {
        const text = btn.textContent?.trim();
        const label = btn.getAttribute('aria-label');
        const labelledBy = btn.getAttribute('aria-labelledby');
        const title = btn.title;
        return !text && !label && !labelledBy && !title;
      }).length;
    });

    if (unlabeledBtns > 0) {
      bug({
        module: 'Customers/A11Y',
        url: '/dashboard/customers',
        action: 'Button labels',
        expected: 'Tutti i pulsanti con testo o aria-label',
        observed: `${unlabeledBtns} pulsanti senza testo/aria-label/title`,
        severity: 'ALTO',
        reproSteps: ['Vai a /dashboard/customers', 'Controlla button senza label'],
      });
    }
  });

  test('A11Y-ARIA-04: Form inputs hanno labels', async ({ page }) => {
    await goto(page, '/dashboard/customers/new');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;

    const unlabeledInputs = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"])'));
      return inputs.filter(input => {
        const el = input as HTMLInputElement;
        const id = el.id;
        const labelFor = id ? document.querySelector(`label[for="${id}"]`) : null;
        const ariaLabel = el.getAttribute('aria-label');
        const ariaLabelledBy = el.getAttribute('aria-labelledby');
        const placeholder = el.placeholder; // not ideal but acceptable
        return !labelFor && !ariaLabel && !ariaLabelledBy && !placeholder;
      }).length;
    });

    if (unlabeledInputs > 0) {
      bug({
        module: 'Customers/Form/A11Y',
        url: '/dashboard/customers/new',
        action: 'Input labels',
        expected: 'Tutti i campi con label o aria-label',
        observed: `${unlabeledInputs} input senza nessun tipo di label`,
        severity: 'ALTO',
        reproSteps: ['Vai a /dashboard/customers/new', 'Controlla input senza label'],
      });
    }
  });
});

// ─── Color Contrast (via axe) ─────────────────────────────────────────────────

test.describe('A11Y-CONTRAST — Contrasto colori', () => {
  test('A11Y-CONTRAST-01: Contrasto testo su pagina principale', async ({ page }) => {
    await goto(page, '/dashboard');
    await waitForContent(page);
    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;

    // Check via axe with color-contrast specific rule
    try {
      const AxeBuilder = (await import('@axe-core/playwright')).default;
      const results = await new AxeBuilder({ page })
        .withRules(['color-contrast'])
        .analyze();

      if (results.violations.length > 0) {
        const totalNodes = results.violations.reduce((acc, v) => acc + v.nodes.length, 0);
        bug({
          module: 'Dashboard/A11Y',
          url: '/dashboard',
          action: 'Contrasto colore',
          expected: 'Contrasto 4.5:1 per testo normale, 3:1 per testo grande (WCAG AA)',
          observed: `${results.violations.length} violazioni contrasto, ${totalNodes} nodi`,
          severity: 'MEDIO',
          reproSteps: ['Vai a /dashboard', 'Esegui axe-core rule color-contrast'],
        });
      }
    } catch (err) {
      // axe color-contrast check failed — non-critical
    }
  });
});
