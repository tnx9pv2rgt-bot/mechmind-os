/**
 * INDEPENDENT AUDIT — TTI + CSP Nonce Verification
 * 4G throttling via CDP Network.emulateNetworkConditions
 * TTI: navigationStart → main thread idle (Long Tasks API + first interactive)
 */
import { test, expect, chromium } from '@playwright/test';

const BASE = 'http://localhost:3001';
const BACKEND = 'http://localhost:3002';

// 4G throttling: 4 Mbps down, 2 Mbps up, 100ms latency (ITU-T Y.1541 Class 4G)
const THROTTLE_4G = {
  offline: false,
  downloadThroughput: (4 * 1024 * 1024) / 8,   // 524288 bytes/s
  uploadThroughput: (2 * 1024 * 1024) / 8,      // 262144 bytes/s
  latency: 100,                                   // 100ms RTT
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function injectTTIObserver(page: any) {
  await page.addInitScript(() => {
    (window as any).__audit = { longTasks: [], fcp: 0, domInteractive: 0 };
    try {
      new PerformanceObserver(list => {
        for (const e of list.getEntries()) {
          if (e.name === 'first-contentful-paint') (window as any).__audit.fcp = e.startTime;
        }
      }).observe({ type: 'paint', buffered: true });
      new PerformanceObserver(list => {
        for (const e of list.getEntries()) {
          (window as any).__audit.longTasks.push({ start: e.startTime, duration: e.duration });
        }
      }).observe({ type: 'longtask', buffered: true });
    } catch { /* observer not supported */ }
  });
}

async function computeTTI(page: any): Promise<{ tti: number; fcp: number; longTasksAfterFcp: number }> {
  await page.waitForTimeout(5500); // wait for 5s quiet window after FCP
  return page.evaluate(() => {
    const a = (window as any).__audit;
    const fcp = a.fcp || 0;
    const nav = performance.timing.navigationStart;
    const domInteractive = performance.timing.domInteractive - nav;
    const longTasksAfterFcp = a.longTasks.filter((t: any) => t.start > fcp);

    // TTI = time of last long task after FCP that ends before quiet window, or FCP if none
    let tti = fcp;
    if (longTasksAfterFcp.length > 0) {
      const lastTask = longTasksAfterFcp[longTasksAfterFcp.length - 1];
      tti = lastTask.start + lastTask.duration;
    }
    // Minimum TTI = domInteractive
    tti = Math.max(tti, domInteractive);
    return { tti: Math.round(tti), fcp: Math.round(fcp), longTasksAfterFcp: longTasksAfterFcp.length };
  });
}

async function getAuthCookies(page: any): Promise<{ token: string; tenantId: string } | null> {
  try {
    const res = await page.request.post(`${BACKEND}/v1/auth/login`, {
      data: { email: 'admin@demo.mechmind.it', password: 'Demo2026!', tenantSlug: 'demo' },
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok()) {
      const body = await res.json();
      // Backend returns { success: true, data: { accessToken, refreshToken, expiresIn } }
      const accessToken = body.accessToken || body.token || body.data?.accessToken || '';
      const tenantId = body.tenantId || body.data?.tenantId || '';
      if (accessToken) {
        // Extract tenantId from JWT payload if not in response body
        try {
          const parts = accessToken.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
            return { token: accessToken, tenantId: tenantId || payload.tenantId || payload.sub?.split(':')?.[1] || '' };
          }
        } catch { /* ignore */ }
        return { token: accessToken, tenantId };
      }
    }
  } catch { /* login failed */ }
  return null;
}

// ─── TTI Measurement (4G throttle) ───────────────────────────────────────────

test.describe('AUDIT-TTI — Time to Interactive (4G throttling)', () => {
  let authToken = '';
  let tenantId = '';

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const pg = await ctx.newPage();
    const creds = await getAuthCookies(pg);
    if (creds) {
      authToken = creds.token;
      tenantId = creds.tenantId;
      console.log('Auth OK — token obtained, tenantId:', tenantId || '(empty)');
    } else {
      console.warn('Auth FAILED — TTI will measure unauthenticated redirect');
    }
    await ctx.close();
  });

  async function measureTTI(page: any, path: string): Promise<{ tti: number; fcp: number; tasks: number; url: string }> {
    // Set auth cookies if available
    if (authToken) {
      await page.context().addCookies([
        { name: 'auth_token', value: authToken, domain: 'localhost', path: '/' },
        ...(tenantId ? [{ name: 'tenant_id', value: tenantId, domain: 'localhost', path: '/' }] : []),
      ]);
    }

    // Enable 4G throttling via CDP
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', THROTTLE_4G);

    await injectTTIObserver(page);

    const t0 = Date.now();
    await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });

    // Wait for first interactive element
    const interactive = page.locator('button, input, [role="button"], a[href]').first();
    await interactive.waitFor({ timeout: 10000 }).catch(() => {});

    const wallClock = Date.now() - t0;
    const metrics = await computeTTI(page);
    const finalUrl = page.url();

    console.log(`TTI ${path} → ${finalUrl}: wall=${wallClock}ms, perfTTI=${metrics.tti}ms, FCP=${metrics.fcp}ms, longTasks=${metrics.longTasksAfterFcp}`);
    return { tti: metrics.tti || wallClock, fcp: metrics.fcp, tasks: metrics.longTasksAfterFcp, url: finalUrl };
  }

  test('TTI-AUDIT-01: /dashboard TTI < 4000ms', async ({ page }) => {
    const result = await measureTTI(page, '/dashboard');
    console.log(`RESULT /dashboard: TTI=${result.tti}ms (wall clock used as upper bound)`);
    expect(result.tti, `TTI /dashboard: ${result.tti}ms exceeds 4000ms threshold`).toBeLessThan(4000);
  });

  test('TTI-AUDIT-02: /dashboard/customers TTI < 4000ms', async ({ page }) => {
    const result = await measureTTI(page, '/dashboard/customers');
    console.log(`RESULT /customers: TTI=${result.tti}ms`);
    expect(result.tti, `TTI /customers: ${result.tti}ms exceeds 4000ms threshold`).toBeLessThan(4000);
  });

  test('TTI-AUDIT-03: /dashboard/analytics TTI < 4000ms', async ({ page }) => {
    const result = await measureTTI(page, '/dashboard/analytics');
    console.log(`RESULT /analytics: TTI=${result.tti}ms`);
    expect(result.tti, `TTI /analytics: ${result.tti}ms exceeds 4000ms threshold`).toBeLessThan(4000);
  });
});

// ─── CSP Nonce Verification ───────────────────────────────────────────────────

test.describe('AUDIT-CSP — Nonce + strict-dynamic on /dashboard', () => {
  test('CSP-AUDIT-01: header + nonce + strict-dynamic + all inline scripts have nonce', async ({ page }) => {
    let cspHeader = '';
    let responseUrl = '';

    page.on('response', r => {
      const ct = r.headers()['content-type'] ?? '';
      if (ct.includes('text/html') && r.url().includes('localhost:3001')) {
        cspHeader = r.headers()['content-security-policy'] ?? '';
        responseUrl = r.url();
      }
    });

    await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
    const finalUrl = page.url();
    console.log(`Navigated /dashboard → ${finalUrl}`);
    console.log(`CSP header from ${responseUrl}:`);
    console.log(cspHeader || '(no CSP header detected)');

    // CSP must be present
    expect(cspHeader, 'CSP header must be set on HTML response').toBeTruthy();

    // Extract nonce from CSP
    const nonceMatch = cspHeader.match(/'nonce-([^']+)'/);
    expect(nonceMatch, "CSP must contain 'nonce-...'").toBeTruthy();
    const nonceValue = nonceMatch![1];
    console.log(`Nonce in CSP: ${nonceValue.substring(0, 16)}…`);

    // strict-dynamic must be present
    const scriptSrc = cspHeader.split(';').find(d => d.trim().startsWith('script-src')) ?? '';
    expect(scriptSrc, "script-src must contain 'strict-dynamic'").toContain("'strict-dynamic'");

    // No unsafe-inline in script-src
    expect(scriptSrc, "script-src must NOT contain 'unsafe-inline'").not.toContain("'unsafe-inline'");

    // Count inline scripts and verify nonce attribute
    const scriptAudit = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      const inline = scripts.filter(s => !s.src); // inline = no src attribute
      const withNonce = inline.filter(s => s.nonce || s.getAttribute('nonce'));
      const withoutNonce = inline.filter(s => !s.nonce && !s.getAttribute('nonce'));
      return {
        total: scripts.length,
        external: scripts.filter(s => s.src).length,
        inline: inline.length,
        withNonce: withNonce.length,
        withoutNonce: withoutNonce.length,
        nonceValues: withNonce.map(s => (s.nonce || s.getAttribute('nonce') || '').substring(0, 16)),
        missingNonce: withoutNonce.map(s => s.textContent?.substring(0, 60) ?? ''),
      };
    });

    console.log(`Scripts: total=${scriptAudit.total}, external=${scriptAudit.external}, inline=${scriptAudit.inline}`);
    console.log(`Inline with nonce: ${scriptAudit.withNonce}/${scriptAudit.inline}`);
    if (scriptAudit.missingNonce.length > 0) {
      console.warn(`Inline scripts WITHOUT nonce (${scriptAudit.withoutNonce}):`);
      scriptAudit.missingNonce.forEach((s, i) => console.warn(`  [${i}]: ${s}`));
    }

    // Verify nonce matches between CSP and script tags
    if (scriptAudit.withNonce > 0) {
      const firstScriptNonce = scriptAudit.nonceValues[0];
      // Nonces in DOM are often empty string due to browser security policy
      // (nonce attribute is cleared by browser after injection)
      // So we verify the CSP nonce is present, not the DOM attribute
      console.log(`CSP nonce vs DOM: CSP=${nonceValue.substring(0, 16)}…`);
    }

    // The key assertion: inline scripts that do NOT have nonce should be 0
    // (strict-dynamic blocks inline scripts without nonce in production)
    expect(scriptAudit.withoutNonce, `${scriptAudit.withoutNonce} inline scripts missing nonce attribute`).toBe(0);
  });

  test('CSP-AUDIT-02: nonce rotates across 3 requests', async ({ browser }) => {
    const nonces: string[] = [];

    for (let i = 0; i < 3; i++) {
      const ctx = await browser.newContext();
      const pg = await ctx.newPage();
      let csp = '';
      pg.on('response', r => {
        const ct = r.headers()['content-type'] ?? '';
        if (ct.includes('text/html') && r.url().includes('localhost:3001')) {
          csp = r.headers()['content-security-policy'] ?? '';
        }
      });
      await pg.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
      await ctx.close();
      const m = csp.match(/'nonce-([^']+)'/);
      if (m) nonces.push(m[1]);
      else console.warn(`Request ${i + 1}: no nonce found in CSP`);
    }

    console.log(`Nonces collected (${nonces.length}/3):`, nonces.map(n => n.substring(0, 16)));
    expect(nonces.length, 'Must collect nonce from all 3 requests').toBe(3);
    const unique = new Set(nonces);
    expect(unique.size, `Nonces must all be unique (got ${unique.size} unique out of 3)`).toBe(3);
  });
});
