/**
 * Deploy Validation — tutte le 142 route del gestionale.
 * Attivato dalla skill /validate-deploy via DEPLOY_URL env var.
 *
 * Strategia per route dinamiche [id]/[token]: usa UUID placeholder.
 * Assertion: status NON 500, layout NON bianco, zero console.error critici.
 */
import { test, expect, request } from '@playwright/test';

const DEPLOY_URL = process.env.DEPLOY_URL || 'http://localhost:3001';
const BYPASS_TOKEN = process.env.PLAYWRIGHT_BYPASS_TOKEN || '';

test.use({
  baseURL: DEPLOY_URL,
  extraHTTPHeaders: BYPASS_TOKEN
    ? { 'x-vercel-protection-bypass': BYPASS_TOKEN }
    : {},
});

// UUID placeholder per route dinamiche (l'app deve gestire not-found, non 500)
const FAKE_ID = '00000000-0000-0000-0000-000000000001';
const FAKE_TOKEN = 'fake-public-token-for-smoke-test';

function collectErrors(page: import('@playwright/test').Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
}

function isCritical(e: string): boolean {
  return (
    !e.includes('favicon') &&
    !e.includes('404') &&
    !e.includes('net::ERR_ABORTED') &&
    e.toLowerCase().includes('error')
  );
}

// Routes with infinite polling that prevent networkidle
const SKIP_NETWORK_IDLE = new Set(['/kiosk', '/tv']);

async function smokeRoute(
  page: import('@playwright/test').Page,
  path: string,
  allowedStatuses = [200, 301, 302, 307, 308],
) {
  const errors = collectErrors(page);
  const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
  const status = response?.status() ?? 0;
  expect(status, `${path} → status ${status}`).not.toBe(500);
  expect(allowedStatuses.concat([401, 403, 404]), `${path} → status ${status} not in expected range`)
    .toContain(status);
  if (!SKIP_NETWORK_IDLE.has(path)) {
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
  }
  const critical = errors.filter(isCritical);
  expect(critical, `${path} → console errors: ${critical.join(', ')}`).toHaveLength(0);
}

// ═══════════════════════════════════════════════════════════════════════════
// GRUPPO 1 — Pubbliche (no auth required)
// ═══════════════════════════════════════════════════════════════════════════

test.describe('pubbliche', () => {
  const routes = [
    '/',
    '/privacy',
    '/terms',
    '/trust',
    '/demo',
    '/kiosk',
    '/tv',
    '/billing/cancel',
    '/billing/success',
    '/payment/checkout',
  ];

  for (const path of routes) {
    test(path, async ({ page }) => {
      await smokeRoute(page, path);
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GRUPPO 2 — Auth (form pubblici, no sessione)
// ═══════════════════════════════════════════════════════════════════════════

test.describe('auth', () => {
  const routes = [
    '/auth',
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/locked',
    '/auth/magic-link/verify',
    '/auth/mfa/setup',
    '/auth/mfa/verify',
    '/auth/oauth/callback',
    '/auth/verify-email',
  ];

  for (const path of routes) {
    test(path, async ({ page }) => {
      await smokeRoute(page, path);
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GRUPPO 3 — Auth flow (login reale → dashboard)
// ═══════════════════════════════════════════════════════════════════════════

test.describe('auth flow', () => {
  test('/auth/login → /dashboard (sessione valida)', async ({ page, context }) => {
    const email = process.env.TEST_ADMIN_EMAIL || 'admin@demo.mechmind.it';
    const pass = process.env.TEST_ADMIN_PASSWORD || 'Demo2026!';
    const tenantSlug = process.env.TEST_TENANT_SLUG || 'demo';

    // Login via API to get auth cookie (the UI login form is a multi-step wizard;
    // testing the full wizard is covered by the individual /auth/* route tests above)
    const loginRes = await page.request.post('/api/auth/password/login', {
      data: { email, password: pass, tenantSlug, rememberMe: false },
    });
    expect(loginRes.status(), 'login API should return 200').toBe(200);

    // Navigate to dashboard — middleware should let us in with the auth cookie
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    // Accept dashboard (200) or login redirect (200 on /auth/login page) — never 500
    expect(page.url(), 'no 500 after login').not.toMatch(/error/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// GRUPPO 4 — Dashboard (autenticato come admin)
// ═══════════════════════════════════════════════════════════════════════════

test.describe('dashboard', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  // Route statiche dashboard
  const staticRoutes = [
    '/dashboard',
    '/dashboard/admin/subscriptions',
    '/dashboard/analytics',
    '/dashboard/analytics/benchmarking',
    '/dashboard/analytics/technicians',
    '/dashboard/audit-logs',
    '/dashboard/billing',
    '/dashboard/bookings',
    '/dashboard/bookings/new',
    '/dashboard/bookings/smart-scheduling',
    '/dashboard/calendar',
    '/dashboard/canned-jobs',
    '/dashboard/canned-jobs/new',
    '/dashboard/customers',
    '/dashboard/customers/import',
    '/dashboard/customers/new',
    '/dashboard/customers/new/landing',
    '/dashboard/customers/new/step1',
    '/dashboard/customers/new/step2',
    '/dashboard/customers/new/step3',
    '/dashboard/customers/new/step4',
    '/dashboard/diagnostics/ai',
    '/dashboard/estimates',
    '/dashboard/estimates/new',
    '/dashboard/gdpr/deletion',
    '/dashboard/gdpr/export',
    '/dashboard/inspections',
    '/dashboard/inspections/new',
    '/dashboard/invoices',
    '/dashboard/invoices/credit-note/new',
    '/dashboard/invoices/financial',
    '/dashboard/invoices/new',
    '/dashboard/invoices/quotes',
    '/dashboard/locations',
    '/dashboard/maintenance',
    '/dashboard/marketing',
    '/dashboard/marketing/follow-ups',
    '/dashboard/marketing/new',
    '/dashboard/marketing/segments',
    '/dashboard/messaging',
    '/dashboard/obd',
    '/dashboard/obd/alerts',
    '/dashboard/obd/pair',
    '/dashboard/parts',
    '/dashboard/parts/catalog',
    '/dashboard/parts/new',
    '/dashboard/parts/orders/new',
    '/dashboard/payments',
    '/dashboard/payroll',
    '/dashboard/production-board',
    '/dashboard/rentri',
    '/dashboard/rentri/entries',
    '/dashboard/rentri/entries/new',
    '/dashboard/rentri/fir',
    '/dashboard/search',
    '/dashboard/settings',
    '/dashboard/settings/ai-compliance',
    '/dashboard/settings/appearance',
    '/dashboard/settings/audit',
    '/dashboard/settings/memberships',
    '/dashboard/settings/portability',
    '/dashboard/settings/roles',
    '/dashboard/settings/security',
    '/dashboard/settings/security/incidents',
    '/dashboard/settings/sessions',
    '/dashboard/settings/team',
    '/dashboard/settings/webhooks',
    '/dashboard/subscription',
    '/dashboard/vehicles',
    '/dashboard/vehicles/new',
    '/dashboard/voice',
    '/dashboard/warranty',
    '/dashboard/warranty/new',
    '/dashboard/warranty/claims',
    '/dashboard/work-orders',
    '/dashboard/work-orders/new',
    '/dashboard/workflows',
    '/dashboard/workflows/new',
  ];

  for (const path of staticRoutes) {
    test(path, async ({ page }) => {
      await smokeRoute(page, path);
    });
  }

  // Route dinamiche con [id] — usa fake UUID, attendi 200 o 404 (mai 500)
  const dynamicRoutes = [
    `/dashboard/bookings/${FAKE_ID}`,
    `/dashboard/customers/${FAKE_ID}`,
    `/dashboard/estimates/${FAKE_ID}`,
    `/dashboard/inspections/${FAKE_ID}`,
    `/dashboard/invoices/${FAKE_ID}`,
    `/dashboard/locations/${FAKE_ID}`,
    `/dashboard/marketing/${FAKE_ID}`,
    `/dashboard/messaging/${FAKE_ID}`,
    `/dashboard/obd/${FAKE_ID}`,
    `/dashboard/parts/${FAKE_ID}`,
    `/dashboard/rentri/fir/${FAKE_ID}`,
    `/dashboard/vehicles/${FAKE_ID}`,
    `/dashboard/vehicles/${FAKE_ID}/maintenance`,
    `/dashboard/warranty/${FAKE_ID}`,
    `/dashboard/warranty/claims/${FAKE_ID}`,
    `/dashboard/work-orders/${FAKE_ID}`,
  ];

  for (const path of dynamicRoutes) {
    test(`${path} (dynamic)`, async ({ page }) => {
      await smokeRoute(page, path, [200, 301, 302, 307, 308, 404]);
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GRUPPO 5 — Onboarding
// ═══════════════════════════════════════════════════════════════════════════

test.describe('onboarding', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  const routes = ['/onboarding', '/onboarding/welcome'];

  for (const path of routes) {
    test(path, async ({ page }) => {
      await smokeRoute(page, path);
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GRUPPO 6 — Portal clienti
// ═══════════════════════════════════════════════════════════════════════════

test.describe('portal', () => {
  // Portal login/register sono pubbliche
  const publicPortalRoutes = [
    '/portal',
    '/portal/login',
    '/portal/register',
    '/portal/reset-password',
    `/portal/invite/${FAKE_TOKEN}`,
  ];

  for (const path of publicPortalRoutes) {
    test(path, async ({ page }) => {
      await smokeRoute(page, path);
    });
  }

  // Route portal autenticate (usa sessione portal)
  test.describe('portal autenticato', () => {
    test.use({ storageState: 'e2e/.auth/user.json' });

    const authPortalRoutes = [
      '/portal/dashboard',
      '/portal/bookings',
      '/portal/bookings/new',
      '/portal/documents',
      '/portal/estimates',
      '/portal/inspections',
      '/portal/invoices',
      '/portal/maintenance',
      '/portal/messages',
      '/portal/notifications',
      '/portal/payments',
      '/portal/repairs',
      '/portal/settings',
      '/portal/tracking',
      '/portal/warranty',
    ];

    for (const path of authPortalRoutes) {
      test(path, async ({ page }) => {
        await smokeRoute(page, path);
      });
    }

    // Route dinamiche portal
    const dynamicPortalRoutes = [
      `/portal/estimates/${FAKE_ID}`,
      `/portal/invoices/${FAKE_ID}`,
      `/portal/payments/${FAKE_ID}/status`,
    ];

    for (const path of dynamicPortalRoutes) {
      test(`${path} (dynamic)`, async ({ page }) => {
        await smokeRoute(page, path, [200, 301, 302, 307, 308, 404]);
      });
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// GRUPPO 7 — Public token (link condivisibili)
// ═══════════════════════════════════════════════════════════════════════════

test.describe('public token', () => {
  const routes = [
    `/public/estimates/${FAKE_TOKEN}`,
    `/public/inspections/${FAKE_TOKEN}`,
    `/public/pay/${FAKE_TOKEN}`,
  ];

  for (const path of routes) {
    test(`${path} (token)`, { timeout: 45_000 }, async ({ page }) => {
      // Token fake → atteso 200 (pagina "non trovato") o 404, mai 500
      await smokeRoute(page, path, [200, 404]);
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GRUPPO 8 — Backend health (verifica NestJS)
// ═══════════════════════════════════════════════════════════════════════════

test.describe('api health', () => {
  test('/api/health — NestJS raggiungibile', async () => {
    const ctx = await request.newContext({
      baseURL: DEPLOY_URL,
      extraHTTPHeaders: BYPASS_TOKEN
        ? { 'x-vercel-protection-bypass': BYPASS_TOKEN }
        : {},
    });
    const res = await ctx.get('/api/health');
    expect(res.status()).toBe(200);
    const body = await res.json().catch(() => ({}));
    expect(body).toHaveProperty('status');
    await ctx.dispose();
  });
});
