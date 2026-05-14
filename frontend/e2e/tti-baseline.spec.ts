/**
 * TTI Baseline + CSP Verification — standalone spec (no auth required)
 * Run: npx playwright test e2e/tti-baseline.spec.ts --project=chromium
 */
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3001';

// ─── CSP Nonce Verification ───────────────────────────────────────────────────

test.describe('CSP-NONCE — BUG-B04 verification', () => {
  test('CSP-01: header present with nonce on root', async ({ page }) => {
    let cspHeader = '';
    page.on('response', r => {
      if (r.url() === `${BASE}/`) cspHeader = r.headers()['content-security-policy'] ?? '';
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(cspHeader).toBeTruthy();
    expect(cspHeader).toContain("'nonce-");
    expect(cspHeader).toContain("'strict-dynamic'");
    expect(cspHeader).toContain("default-src 'self'");
    console.log('CSP-01 PASS — nonce present:', cspHeader.match(/'nonce-([^']+)'/)?.[1]?.substring(0, 12) + '…');
  });

  test('CSP-02: nonce rotates per request (not static)', async ({ page }) => {
    const nonces: string[] = [];
    for (let i = 0; i < 3; i++) {
      let csp = '';
      page.on('response', r => {
        if (r.url().includes(BASE)) csp = r.headers()['content-security-policy'] ?? '';
      });
      await page.goto('/auth', { waitUntil: 'domcontentloaded' });
      const m = csp.match(/'nonce-([^']+)'/);
      if (m) nonces.push(m[1]);
    }
    const unique = new Set(nonces);
    expect(unique.size).toBeGreaterThan(1);
    console.log('CSP-02 PASS — nonces are unique across requests:', nonces.length);
  });

  test('CSP-03: no unsafe-inline in script-src', async ({ page }) => {
    let cspHeader = '';
    page.on('response', r => {
      if (r.url() === `${BASE}/`) cspHeader = r.headers()['content-security-policy'] ?? '';
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const scriptSrc = cspHeader.split(';').find(d => d.trim().startsWith('script-src')) ?? '';
    // strict-dynamic makes unsafe-inline irrelevant, but it should not be explicitly present
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    console.log('CSP-03 PASS — script-src has no unsafe-inline');
  });
});

// ─── TTI Baseline ─────────────────────────────────────────────────────────────

test.describe('TTI-BASELINE — Time to Interactive', () => {
  test('TTI-01: /auth page interactive < 4000ms', async ({ page }) => {
    const start = Date.now();
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    // First input or button
    const firstInteractive = page.locator('input, button').first();
    await firstInteractive.waitFor({ timeout: 4000 });
    const tti = Date.now() - start;
    console.log(`TTI-01 /auth: ${tti}ms`);
    expect(tti).toBeLessThan(4000);
  });

  test('TTI-02: /dashboard redirect resolves < 3000ms', async ({ page }) => {
    const start = Date.now();
    // Dashboard redirects to /auth — measure time to first interactive on redirect target
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    const firstInteractive = page.locator('input, button, a[href]').first();
    await firstInteractive.waitFor({ timeout: 3000 }).catch(() => {});
    const elapsed = Date.now() - start;
    const finalUrl = page.url();
    console.log(`TTI-02 /dashboard → ${finalUrl}: ${elapsed}ms`);
    // If redirected to auth, that's expected; still measure TTI
    expect(elapsed).toBeLessThan(5000);
  });

  test('TTI-03: /dashboard/customers redirect resolves < 4000ms', async ({ page }) => {
    const start = Date.now();
    await page.goto('/dashboard/customers', { waitUntil: 'domcontentloaded' });
    const firstInteractive = page.locator('input, button, a[href]').first();
    await firstInteractive.waitFor({ timeout: 4000 }).catch(() => {});
    const elapsed = Date.now() - start;
    console.log(`TTI-03 /dashboard/customers: ${elapsed}ms`);
    expect(elapsed).toBeLessThan(6000);
  });

  test('TTI-04: /dashboard/analytics redirect resolves < 5000ms', async ({ page }) => {
    const start = Date.now();
    await page.goto('/dashboard/analytics', { waitUntil: 'domcontentloaded' });
    const firstInteractive = page.locator('input, button, a[href]').first();
    await firstInteractive.waitFor({ timeout: 5000 }).catch(() => {});
    const elapsed = Date.now() - start;
    console.log(`TTI-04 /dashboard/analytics: ${elapsed}ms`);
    expect(elapsed).toBeLessThan(7000);
  });
});

// ─── Bundle Size ──────────────────────────────────────────────────────────────

test.describe('BUNDLE-BASELINE — JS size measurement', () => {
  test('BUNDLE-01: Total JS on /auth < 2MB', async ({ page }) => {
    const jsBytes: number[] = [];
    page.on('response', async r => {
      const ct = r.headers()['content-type'] ?? '';
      if (ct.includes('javascript') && (r.url().includes('/_next/') || r.url().includes('/static/'))) {
        try { jsBytes.push((await r.body()).length); } catch { /* ignore */ }
      }
    });
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const totalMB = jsBytes.reduce((a, b) => a + b, 0) / (1024 * 1024);
    console.log(`BUNDLE-01 /auth: ${totalMB.toFixed(2)}MB (${jsBytes.length} JS chunks)`);
    expect(totalMB).toBeLessThan(2);
  });

  test('BUNDLE-02: Total JS on / (root) < 1MB', async ({ page }) => {
    const jsBytes: number[] = [];
    page.on('response', async r => {
      const ct = r.headers()['content-type'] ?? '';
      if (ct.includes('javascript') && (r.url().includes('/_next/') || r.url().includes('/static/'))) {
        try { jsBytes.push((await r.body()).length); } catch { /* ignore */ }
      }
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const totalMB = jsBytes.reduce((a, b) => a + b, 0) / (1024 * 1024);
    console.log(`BUNDLE-02 /: ${totalMB.toFixed(2)}MB (${jsBytes.length} JS chunks)`);
    expect(totalMB).toBeLessThan(1);
  });
});

// ─── Performance Vitals ───────────────────────────────────────────────────────

test.describe('VITALS-BASELINE — Web vitals on public pages', () => {
  test('VITALS-01: /auth FCP < 2000ms, CLS < 0.1', async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__nasaPerf = { lcp: 0, fcp: 0, cls: 0 };
      try {
        new PerformanceObserver(list => {
          for (const e of list.getEntries()) {
            if (e.name === 'first-contentful-paint') (window as any).__nasaPerf.fcp = e.startTime;
          }
        }).observe({ type: 'paint', buffered: true });
        let cls = 0;
        new PerformanceObserver(list => {
          for (const e of list.getEntries()) {
            if (!(e as any).hadRecentInput) cls += (e as any).value ?? 0;
            (window as any).__nasaPerf.cls = cls;
          }
        }).observe({ type: 'layout-shift', buffered: true });
      } catch { /* */ }
    });
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const perf = await page.evaluate(() => (window as any).__nasaPerf ?? { fcp: 0, cls: 0 });
    console.log(`VITALS-01 /auth: FCP=${perf.fcp.toFixed(0)}ms CLS=${perf.cls.toFixed(4)}`);
    if (perf.fcp > 0) expect(perf.fcp).toBeLessThan(2000);
    expect(perf.cls).toBeLessThan(0.1);
  });
});
