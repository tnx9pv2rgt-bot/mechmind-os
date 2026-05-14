/**
 * SECURITY — Headers, cookie flags, XSS, IDOR, CSP
 */
import { test, expect } from '@playwright/test';
import { bug, screenshot, goto, waitForContent } from './helpers';
import {
  checkSecurityHeaders,
  checkCookieFlags,
  testXssReflection,
  XSS_PAYLOADS,
  SQLI_PAYLOADS,
} from './nasa-helpers';

// ─── Security Headers ─────────────────────────────────────────────────────────

test.describe('SEC-HEADERS — Header di sicurezza HTTP', () => {
  const PAGES_TO_CHECK_HEADERS = [
    '/dashboard',
    '/dashboard/customers',
    '/dashboard/bookings/new',
    '/dashboard/invoices',
  ];

  for (const path of PAGES_TO_CHECK_HEADERS) {
    test(`SEC-HEADERS: ${path}`, async ({ page }) => {
      const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
      if (!response) return;

      const headers = response.headers() as Record<string, string>;
      checkSecurityHeaders(path, headers, 'Security/Headers');
    });
  }

  test('SEC-HEADERS-API: Header sicurezza su risposta API', async ({ page }) => {
    let apiHeaders: Record<string, string> = {};

    page.on('response', response => {
      if (response.url().includes('/api/') && response.url().includes('/customers')) {
        apiHeaders = response.headers() as Record<string, string>;
      }
    });

    await goto(page, '/dashboard/customers');
    await waitForContent(page);

    if (Object.keys(apiHeaders).length > 0) {
      // API routes should have basic security headers
      const missingCors = !apiHeaders['access-control-allow-origin'];
      // Note: API responses don't always need X-Frame-Options
      // but they should have content-type to prevent sniffing
      if (!apiHeaders['x-content-type-options']) {
        bug({
          module: 'Security/API-Headers',
          url: '/api/customers',
          action: 'X-Content-Type-Options su API',
          expected: 'X-Content-Type-Options: nosniff',
          observed: 'Header assente sulla risposta API',
          severity: 'MEDIO',
          reproSteps: ['curl -I /api/customers', 'Verifica X-Content-Type-Options'],
        });
      }
    }
  });
});

// ─── Cookie Security ──────────────────────────────────────────────────────────

test.describe('SEC-COOKIES — Flag sicurezza cookie', () => {
  test('SEC-COOKIES-01: auth_token cookie flags', async ({ page }) => {
    await goto(page, '/dashboard');
    await waitForContent(page);

    const cookies = await page.context().cookies();
    checkCookieFlags('/dashboard', cookies, 'Security/Cookies');

    // Additional manual check for auth_token
    const authCookie = cookies.find(c => c.name === 'auth_token');
    if (authCookie) {
      if (!authCookie.httpOnly) {
        bug({
          module: 'Security/Cookies',
          url: '/dashboard',
          action: 'auth_token httpOnly',
          expected: 'auth_token httpOnly=true',
          observed: 'auth_token httpOnly=false (accessibile via JS)',
          severity: 'CRITICO',
          reproSteps: ['Login', 'Verifica cookie auth_token', 'document.cookie'],
        });
      }
      if (!authCookie.secure && !page.url().startsWith('http://localhost')) {
        bug({
          module: 'Security/Cookies',
          url: '/dashboard',
          action: 'auth_token Secure',
          expected: 'auth_token Secure=true',
          observed: 'auth_token non ha flag Secure',
          severity: 'ALTO',
          reproSteps: ['Login su prod', 'Verifica cookie Secure flag'],
        });
      }
      if (!authCookie.sameSite || authCookie.sameSite === 'None') {
        bug({
          module: 'Security/Cookies',
          url: '/dashboard',
          action: 'auth_token SameSite',
          expected: 'SameSite=Strict o Lax',
          observed: `SameSite=${authCookie.sameSite ?? 'missing'} (CSRF risk)`,
          severity: 'ALTO',
          reproSteps: ['Login', 'Verifica SameSite cookie'],
        });
      }
    }
  });

  test('SEC-COOKIES-02: Nessun cookie sensibile leggibile da JS', async ({ page }) => {
    await goto(page, '/dashboard');
    await waitForContent(page);

    const accessibleCookies = await page.evaluate(() => {
      return document.cookie;
    });

    // If auth_token is accessible via JS, that's a security issue
    if (accessibleCookies.includes('auth_token')) {
      bug({
        module: 'Security/Cookies',
        url: '/dashboard',
        action: 'auth_token leggibile via JS',
        expected: 'auth_token con httpOnly=true (non visibile via document.cookie)',
        observed: `auth_token trovato in document.cookie: "${accessibleCookies.substring(0, 80)}"`,
        severity: 'CRITICO',
        reproSteps: ['Login', 'Apri console', 'Esegui: document.cookie', 'Cerca auth_token'],
      });
    }

    if (accessibleCookies.includes('refresh_token')) {
      bug({
        module: 'Security/Cookies',
        url: '/dashboard',
        action: 'refresh_token leggibile via JS',
        expected: 'refresh_token con httpOnly=true',
        observed: 'refresh_token trovato in document.cookie',
        severity: 'CRITICO',
        reproSteps: ['Login', 'Console: document.cookie'],
      });
    }
  });
});

// ─── XSS Prevention ───────────────────────────────────────────────────────────

test.describe('SEC-XSS — Prevenzione Cross-Site Scripting', () => {
  const XSS_INPUTS = [
    {
      path: '/dashboard/customers/new',
      selector: 'input[name*="name" i], input[name*="nome" i]',
      module: 'Customers/XSS',
    },
    {
      path: '/dashboard/bookings/new',
      selector: 'textarea, input[name*="note" i]',
      module: 'Bookings/XSS',
    },
    {
      path: '/dashboard/work-orders/new',
      selector: 'textarea, input[name*="description" i]',
      module: 'WorkOrders/XSS',
    },
    {
      path: '/dashboard/vehicles/new',
      selector: 'input[name*="plate" i], input[name*="targa" i]',
      module: 'Vehicles/XSS',
    },
  ];

  for (const { path, selector, module } of XSS_INPUTS) {
    test(`SEC-XSS-${module}: XSS reflection (${path})`, async ({ page }) => {
      await goto(page, path);
      await waitForContent(page);
      const has500 = await page
        .locator('text=500')
        .first()
        .isVisible()
        .catch(() => false);
      if (has500) return;

      const triggered = await testXssReflection(page, path, selector, module);
      if (triggered) {
        await screenshot(page, `bug-security-xss-${module.toLowerCase().replace(/\//g, '-')}`);
      }
    });
  }

  test('SEC-XSS-SEARCH: XSS in barra di ricerca globale', async ({ page }) => {
    await goto(page, '/dashboard/customers');
    await waitForContent(page);
    const has500 = await page
      .locator('text=500')
      .first()
      .isVisible()
      .catch(() => false);
    if (has500) return;

    const triggered = await testXssReflection(
      page,
      '/dashboard/customers',
      'input[type="search"], input[placeholder*="cerca" i]',
      'Customers/Search/XSS'
    );
    if (triggered) await screenshot(page, 'bug-security-xss-search');
  });
});

// ─── IDOR Prevention ──────────────────────────────────────────────────────────

test.describe('SEC-IDOR — Insecure Direct Object Reference', () => {
  test('SEC-IDOR-01: Accesso risorsa altro tenant → 403 non 200', async ({ page }) => {
    // Attempt to access a resource with a UUID that would belong to another tenant
    // Using a well-known "other tenant" UUID pattern
    const OTHER_TENANT_UUID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

    const response = await page.goto(`/dashboard/customers/${OTHER_TENANT_UUID}`, {
      waitUntil: 'domcontentloaded',
    });
    await waitForContent(page);

    // Should either 404, redirect, or show not-found — NEVER show data
    const has500 = await page
      .locator('text=500')
      .first()
      .isVisible()
      .catch(() => false);
    if (has500) {
      bug({
        module: 'Security/IDOR',
        url: `/dashboard/customers/${OTHER_TENANT_UUID}`,
        action: 'Accesso risorsa altro tenant',
        expected: '404 o redirect a lista',
        observed: '500 su UUID non-del-tenant',
        severity: 'ALTO',
        reproSteps: [`Vai a /dashboard/customers/${OTHER_TENANT_UUID}`, 'Verifica risposta'],
      });
    }

    // If we see actual customer data, that would be IDOR
    const hasCustomerData = await page
      .locator('[data-testid*="customer-detail"], [class*="customer-name"]')
      .first()
      .isVisible()
      .catch(() => false);
    if (hasCustomerData) {
      bug({
        module: 'Security/IDOR',
        url: `/dashboard/customers/${OTHER_TENANT_UUID}`,
        action: 'IDOR: dati cliente altro tenant visibili',
        expected: '404 o accesso negato',
        observed: 'Dati cliente visibili (possibile data leak cross-tenant)',
        severity: 'CRITICO',
        reproSteps: [
          `Accedi a /dashboard/customers/${OTHER_TENANT_UUID}`,
          'Verifica se dati di altri tenant appaiono',
        ],
      });
      await screenshot(page, 'bug-security-idor-customer');
    }
  });

  test('SEC-IDOR-02: API diretta altro tenant → 403/404', async ({ page }) => {
    const OTHER_UUID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
    let apiResponseStatus = 0;

    // Intercept the API response
    page.on('response', response => {
      if (response.url().includes(`/api/customers/${OTHER_UUID}`)) {
        apiResponseStatus = response.status();
      }
    });

    await page.goto(`/dashboard/customers/${OTHER_UUID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    if (apiResponseStatus === 200) {
      bug({
        module: 'Security/IDOR',
        url: `/api/customers/${OTHER_UUID}`,
        action: 'API IDOR: risposta 200 su UUID estraneo',
        expected: '404 o 403 per risorsa non del tenant',
        observed: `HTTP 200 per UUID ${OTHER_UUID} (possibile cross-tenant leak)`,
        severity: 'CRITICO',
        reproSteps: [`curl /api/customers/${OTHER_UUID} con auth del tenant demo`],
      });
    }
  });
});

// ─── CSP Validation ───────────────────────────────────────────────────────────

test.describe('SEC-CSP — Content Security Policy', () => {
  test('SEC-CSP-01: CSP header presente sulla dashboard', async ({ page }) => {
    const response = await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    if (!response) return;

    const headers = response.headers();
    const csp = headers['content-security-policy'] || headers['x-content-security-policy'];

    if (!csp) {
      bug({
        module: 'Security/CSP',
        url: '/dashboard',
        action: 'Content-Security-Policy header',
        expected: 'CSP header presente nella risposta',
        observed: 'CSP header assente',
        severity: 'ALTO',
        reproSteps: ['curl -I http://localhost:3000/dashboard', 'Cerca Content-Security-Policy'],
      });
    } else {
      // Check for unsafe-eval and unsafe-inline
      if (csp.includes("'unsafe-eval'")) {
        bug({
          module: 'Security/CSP',
          url: '/dashboard',
          action: 'CSP unsafe-eval',
          expected: "CSP senza 'unsafe-eval'",
          observed: "CSP contiene 'unsafe-eval' (permette eval() — XSS risk)",
          severity: 'MEDIO',
          reproSteps: ['Verifica Content-Security-Policy header', "Cerca 'unsafe-eval'"],
        });
      }
    }
  });

  test('SEC-CSP-02: No inline scripts senza nonce (strict-dynamic verified)', async ({ page }) => {
    const response = await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    if (!response) return;

    // First, verify CSP header contains strict-dynamic
    const headers = response.headers();
    const csp = headers['content-security-policy'] || headers['x-content-security-policy'] || '';

    const hasStrictDynamic = csp.includes("'strict-dynamic'");
    if (!hasStrictDynamic && csp.length > 0) {
      bug({
        module: 'Security/CSP',
        url: '/dashboard',
        action: "CSP missing 'strict-dynamic'",
        expected: "CSP should contain 'strict-dynamic' to enforce nonce on inline scripts",
        observed: `CSP header present but missing 'strict-dynamic': ${csp.substring(0, 100)}...`,
        severity: 'MEDIO',
        reproSteps: [
          'curl -I http://localhost:3000/dashboard',
          "Verifica Content-Security-Policy contiene 'strict-dynamic'",
        ],
      });
    }

    await waitForContent(page);

    // Count inline scripts without nonce
    const inlineScriptDetails = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script:not([src])'));
      const withoutNonce = scripts.filter(s => {
        const content = s.textContent?.trim() ?? '';
        const nonce = s.getAttribute('nonce');
        // Ignore empty scripts and scripts with nonce
        return content.length > 0 && !nonce;
      });
      return {
        total: scripts.length,
        nonceCount: scripts.filter(s => s.getAttribute('nonce')).length,
        withoutNonce: withoutNonce.length,
      };
    });

    // Next.js adds some inline scripts for hydration — tolerate < 5
    if (inlineScriptDetails.withoutNonce > 5) {
      bug({
        module: 'Security/CSP',
        url: '/dashboard',
        action: 'Inline scripts senza nonce',
        expected: 'Script inline < 5 senza nonce (o tutti con nonce se strict-dynamic)',
        observed: `${inlineScriptDetails.withoutNonce} inline scripts senza nonce su ${inlineScriptDetails.total} totali`,
        severity: 'BASSO',
        reproSteps: [
          'Vai a /dashboard',
          "document.querySelectorAll('script:not([src]):not([nonce])')",
          'Verifica che nonce sia presente su script inline dinamici',
        ],
      });
    }
  });
});

// ─── Rate Limiting Verification ───────────────────────────────────────────────

test.describe('SEC-RATE — Rate limiting', () => {
  test('SEC-RATE-01: Richieste rapide → 429 su API pubblica', async ({ page }) => {
    let got429 = false;
    let attempts = 0;

    // Make rapid requests to a public-ish endpoint
    for (let i = 0; i < 20; i++) {
      attempts++;
      const resp = await page.request.get('/api/health').catch(() => null);
      if (resp?.status() === 429) {
        got429 = true;
        break;
      }
      await page.waitForTimeout(50);
    }

    if (!got429 && attempts >= 20) {
      // Note: health endpoint might be exempted from rate limiting — that's OK
      console.log(
        'SEC-RATE: Health endpoint non ha risposto 429 dopo 20 richieste (può essere escluso da rate limit)'
      );
    }
  });

  test('SEC-RATE-02: Login bruteforce → 429 o lockout', async ({ page }) => {
    let got429orLocked = false;

    for (let i = 0; i < 5; i++) {
      const resp = await page.request
        .post('/api/auth/password/login', {
          data: { email: 'admin@demo.nexo', password: 'WrongPassword123!', tenantSlug: 'demo' },
        })
        .catch(() => null);

      if (resp?.status() === 429 || resp?.status() === 423) {
        got429orLocked = true;
        break;
      }
      await page.waitForTimeout(200);
    }

    if (!got429orLocked) {
      bug({
        module: 'Security/RateLimit',
        url: '/api/auth/password/login',
        action: 'Bruteforce protezione login',
        expected: 'HTTP 429 o account lockout dopo 5 tentativi falliti',
        observed: 'Nessun rate limiting/lockout dopo 5 tentativi',
        severity: 'ALTO',
        reproSteps: [
          'POST /api/auth/password/login 5 volte con password errata',
          'Verifica risposta',
        ],
      });
    }
  });
});
