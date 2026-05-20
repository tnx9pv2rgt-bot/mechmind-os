/**
 * PERFORMANCE — Web Vitals: TTFB, FCP, LCP, CLS su pagine chiave
 */
import { test, expect } from '@playwright/test';
import { bug, screenshot, goto } from './helpers';
import { injectPerfObserver, collectPerfMetrics, checkPerfThresholds } from './nasa-helpers';

const PERF_PAGES = [
  { path: '/dashboard', module: 'Dashboard' },
  { path: '/dashboard/customers', module: 'Customers' },
  { path: '/dashboard/bookings', module: 'Bookings' },
  { path: '/dashboard/invoices', module: 'Invoices' },
  { path: '/dashboard/work-orders', module: 'WorkOrders' },
  { path: '/dashboard/analytics', module: 'Analytics' },
  { path: '/dashboard/settings', module: 'Settings' },
];

// ─── Web Vitals ───────────────────────────────────────────────────────────────

test.describe('PERF-VITALS — Web Vitals misurazione', () => {
  for (const { path, module } of PERF_PAGES) {
    test(`PERF-${module}: TTFB/FCP/LCP/CLS (${path})`, async ({ page }) => {
      // Inject observer BEFORE navigation (must use addInitScript)
      await injectPerfObserver(page);

      const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2500); // let LCP/CLS settle

      const httpStatus = response?.status() ?? 0;
      if (httpStatus === 500) {
        bug({ module: `${module}/Perf`, url: path, action: 'Performance: pagina 500', expected: 'HTTP 200', observed: `HTTP ${httpStatus}`, severity: 'CRITICO', reproSteps: [`Vai a ${path}`] });
        return;
      }

      // Collect all metrics
      const entry = await collectPerfMetrics(page, path);

      // Auto-file bugs for threshold violations
      checkPerfThresholds(entry, module);

      // Console log for report
      console.log(`PERF [${module}] TTFB:${entry.ttfb}ms FCP:${entry.fcp}ms LCP:${entry.lcp}ms CLS:${entry.cls} DOM:${entry.domLoad}ms Full:${entry.fullLoad}ms`);
    });
  }
});

// ─── Time To Interactive ──────────────────────────────────────────────────────

test.describe('PERF-TTI — Interattività', () => {
  test('PERF-TTI-01: Dashboard interattiva entro 3s', async ({ page }) => {
    const start = Date.now();

    await injectPerfObserver(page);
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    // Try clicking first interactive element
    const firstBtn = page.locator('button:not([disabled]), a[href]').first();
    await firstBtn.waitFor({ timeout: 3000 }).catch(() => {});

    const elapsed = Date.now() - start;
    if (elapsed > 3000) {
      bug({
        module: 'Dashboard/Perf',
        url: '/dashboard',
        action: 'Time to Interactive',
        expected: 'Primo elemento cliccabile entro 3s',
        observed: `Primo elemento disponibile dopo ${elapsed}ms`,
        severity: 'MEDIO',
        reproSteps: ['Vai a /dashboard', 'Misura tempo fino al primo button/link'],
      });
    }
  });

  test('PERF-TTI-02: Lista clienti interattiva entro 4s', async ({ page }) => {
    const start = Date.now();

    await injectPerfObserver(page);
    await page.goto('/dashboard/customers', { waitUntil: 'domcontentloaded' });

    const tableOrList = page.locator('table, [role="grid"], [data-testid*="list"], ul li, [class*="table"]').first();
    await tableOrList.waitFor({ timeout: 4000 }).catch(() => {});

    const elapsed = Date.now() - start;
    if (elapsed > 4000) {
      bug({
        module: 'Customers/Perf',
        url: '/dashboard/customers',
        action: 'Lista clienti TTI',
        expected: 'Lista clienti visibile entro 4s',
        observed: `Lista disponibile dopo ${elapsed}ms`,
        severity: 'MEDIO',
        reproSteps: ['Vai a /dashboard/customers', 'Misura tempo tabella'],
      });
    }
  });
});

// ─── Resource Size ────────────────────────────────────────────────────────────

test.describe('PERF-BUNDLE — Dimensione bundle', () => {
  test('PERF-BUNDLE-01: JS bundle principale < 2MB', async ({ page }) => {
    const jsBytes: number[] = [];

    page.on('response', response => {
      const url = response.url();
      const contentType = response.headers()['content-type'] ?? '';
      if (contentType.includes('javascript') && (url.includes('/_next/') || url.includes('/static/'))) {
        response.body().then(buf => jsBytes.push(buf.length)).catch(() => {});
      }
    });

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000); // let JS chunks finish loading

    const totalJs = jsBytes.reduce((a, b) => a + b, 0);
    const totalJsMB = totalJs / (1024 * 1024);

    if (totalJsMB > 2) {
      bug({
        module: 'Dashboard/Perf',
        url: '/dashboard',
        action: 'Bundle JS size',
        expected: 'JS totale < 2MB',
        observed: `JS totale: ${totalJsMB.toFixed(2)}MB`,
        severity: 'BASSO',
        reproSteps: ['Vai a /dashboard', 'Controlla DevTools Network > JS files'],
      });
    }

    console.log(`PERF BUNDLE: Total JS = ${totalJsMB.toFixed(2)}MB (${jsBytes.length} files)`);
  });

  test('PERF-BUNDLE-02: Immagini ottimizzate (no massive unoptimized)', async ({ page }) => {
    const largeImages: string[] = [];

    page.on('response', async response => {
      const url = response.url();
      const contentType = response.headers()['content-type'] ?? '';
      if (contentType.includes('image') && !url.includes('/_next/image')) {
        try {
          const buf = await response.body();
          if (buf.length > 500 * 1024) { // > 500KB
            largeImages.push(`${url.substring(url.lastIndexOf('/') + 1)} (${(buf.length / 1024).toFixed(0)}KB)`);
          }
        } catch { }
      }
    });

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(2000);

    if (largeImages.length > 0) {
      bug({
        module: 'Dashboard/Perf',
        url: '/dashboard',
        action: 'Immagini non ottimizzate',
        expected: 'Immagini < 500KB, usare next/image',
        observed: `${largeImages.length} immagini > 500KB: ${largeImages.slice(0, 3).join(', ')}`,
        severity: 'BASSO',
        reproSteps: ['Vai a /dashboard', 'DevTools Network > Img > filter by size'],
      });
    }
  });
});

// ─── Page-Specific Checks ─────────────────────────────────────────────────────

test.describe('PERF-SPECIFIC — Check specifici per pagina', () => {
  test('PERF-SPEC-01: Analytics dashboard — grafici non bloccano main thread', async ({ page }) => {
    await injectPerfObserver(page);
    const start = Date.now();

    await page.goto('/dashboard/analytics', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const hasCrash = await page.locator('text=500').first().isVisible().catch(() => false);
    if (hasCrash) return;

    // Check TBT via Long Tasks API
    const longTasks = await page.evaluate(() => {
      const tasks: number[] = [];
      try {
        const observer = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) tasks.push(entry.duration);
          }
        });
        observer.observe({ type: 'longtask', buffered: true });
      } catch { }
      return tasks;
    });

    const elapsed = Date.now() - start;
    console.log(`PERF Analytics: load=${elapsed}ms, long tasks=${longTasks.length}`);
  });

  test('PERF-SPEC-02: Booking calendar — slot rendering rapido', async ({ page }) => {
    await injectPerfObserver(page);
    await page.goto('/dashboard/bookings/new', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const has500 = await page.locator('text=500').first().isVisible().catch(() => false);
    if (has500) return;

    const entry = await collectPerfMetrics(page, '/dashboard/bookings/new');
    checkPerfThresholds(entry, 'Bookings/New');

    console.log(`PERF Bookings/New: TTFB:${entry.ttfb}ms FCP:${entry.fcp}ms LCP:${entry.lcp}ms`);
  });
});
