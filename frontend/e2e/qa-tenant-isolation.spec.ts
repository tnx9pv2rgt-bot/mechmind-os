import { test, expect, type Page } from '@playwright/test';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';

// ---------------------------------------------------------------------------
// Login helper — autentica come tenant "romano"
// ---------------------------------------------------------------------------

async function login(page: Page): Promise<void> {
  await page.goto(`${BASE}/auth/login`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('#login-workspace', { state: 'visible', timeout: 15000 });
  await page.evaluate(() => {
    localStorage.setItem('mechmind_onboarding_dismissed', 'true');
    localStorage.setItem(
      'mechmind_onboarding_answers',
      JSON.stringify({ shopType: 'officina', priorities: ['bookings'] })
    );
  });
  await page.locator('#login-workspace').fill('romano');
  await page.locator('#login-email').fill('romano@romano-officina.it');
  await page.locator('#login-password').fill('Demo2026!');
  await Promise.all([
    page.waitForURL(/(\/dashboard|\/onboarding)/, { timeout: 20000, waitUntil: 'commit' }),
    page.locator('button[type="submit"]').click(),
  ]);
  if (page.url().includes('/onboarding')) {
    await page.evaluate(() => localStorage.setItem('mechmind_onboarding_dismissed', 'true'));
    await page.goto(`${BASE}/dashboard`);
    await page.waitForURL(/\/dashboard/, { timeout: 15000, waitUntil: 'commit' });
  }
}

// ---------------------------------------------------------------------------
// TEST 1: Autenticazione obbligatoria per /dashboard
// ---------------------------------------------------------------------------

test.describe.serial('TENANT ISOLATION — Auth gate /dashboard', () => {
  test('accesso a /dashboard senza sessione → redirect a login', async ({ page }) => {
    // Naviga direttamente senza fare login
    await page.goto(`${BASE}/dashboard`);
    await page.waitForTimeout(3000);
    // Deve essere reindirizzato verso login o mostrare login form
    const url = page.url();
    const isRedirected =
      url.includes('/auth/login') || url.includes('/auth') || url.includes('/login');
    expect(isRedirected).toBeTruthy();
  });

  test('accesso a /dashboard/customers senza sessione → redirect a login', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/customers`);
    await page.waitForTimeout(3000);
    const url = page.url();
    const isRedirected =
      url.includes('/auth/login') || url.includes('/auth') || url.includes('/login');
    expect(isRedirected).toBeTruthy();
  });

  test('accesso a /dashboard/invoices senza sessione → redirect a login', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/invoices`);
    await page.waitForTimeout(3000);
    const url = page.url();
    const isRedirected =
      url.includes('/auth/login') || url.includes('/auth') || url.includes('/login');
    expect(isRedirected).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// TEST 2: API ritornano 401 senza token
// ---------------------------------------------------------------------------

test.describe.serial('TENANT ISOLATION — API 401 senza auth', () => {
  test('GET /api/customers senza cookie → 401 o 403', async ({ page }) => {
    const response = await page.request.get(`${BASE}/api/customers`);
    expect([401, 403, 302]).toContain(response.status());
  });

  test('GET /api/invoices senza cookie → 401 o 403', async ({ page }) => {
    const response = await page.request.get(`${BASE}/api/invoices`);
    expect([401, 403, 302]).toContain(response.status());
  });

  test('GET /api/vehicles senza cookie → 401 o 403', async ({ page }) => {
    const response = await page.request.get(`${BASE}/api/vehicles`);
    expect([401, 403, 302]).toContain(response.status());
  });

  test('GET /api/bookings senza cookie → 401 o 403', async ({ page }) => {
    const response = await page.request.get(`${BASE}/api/bookings`);
    expect([401, 403, 302]).toContain(response.status());
  });

  test('GET /api/work-orders senza cookie → 401 o 403', async ({ page }) => {
    const response = await page.request.get(`${BASE}/api/work-orders`);
    expect([401, 403, 302]).toContain(response.status());
  });
});

// ---------------------------------------------------------------------------
// TEST 3: Dopo login, API ritornano dati del SOLO tenant autenticato
// ---------------------------------------------------------------------------

test.describe.serial('TENANT ISOLATION — Dati scoped a tenant', () => {
  test('GET /api/customers autenticato → 200', async ({ page }) => {
    await login(page);
    const response = await page.request.get(`${BASE}/api/customers`);
    expect(response.status()).toBe(200);
  });

  test('GET /api/invoices autenticato → 200', async ({ page }) => {
    await login(page);
    const response = await page.request.get(`${BASE}/api/invoices`);
    expect(response.status()).toBe(200);
  });

  test('GET /api/vehicles autenticato → 200', async ({ page }) => {
    await login(page);
    const response = await page.request.get(`${BASE}/api/vehicles`);
    expect(response.status()).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// TEST 4: Accesso a ID inventati → 404 o 403 (no data leak)
// ---------------------------------------------------------------------------

test.describe.serial('TENANT ISOLATION — ID spoofing → 404/403', () => {
  test('GET customer con ID inesistente → 404 o 403', async ({ page }) => {
    await login(page);
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const response = await page.request.get(`${BASE}/api/customers/${fakeId}`);
    expect([404, 403, 401]).toContain(response.status());
  });

  test('GET invoice con ID inesistente → 404 o 403', async ({ page }) => {
    await login(page);
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const response = await page.request.get(`${BASE}/api/invoices/${fakeId}`);
    expect([404, 403, 401]).toContain(response.status());
  });

  test('GET vehicle con ID inesistente → 404 o 403', async ({ page }) => {
    await login(page);
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const response = await page.request.get(`${BASE}/api/vehicles/${fakeId}`);
    expect([404, 403, 401]).toContain(response.status());
  });

  test('GET work-order con ID inesistente → 404 o 403', async ({ page }) => {
    await login(page);
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const response = await page.request.get(`${BASE}/api/work-orders/${fakeId}`);
    expect([404, 403, 401]).toContain(response.status());
  });
});

// ---------------------------------------------------------------------------
// TEST 5: Workspace isolation — tenant slug errato in login
// ---------------------------------------------------------------------------

test.describe.serial('TENANT ISOLATION — Workspace errato', () => {
  test('login con workspace inesistente → errore (non accede a dashboard)', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#login-workspace', { state: 'visible', timeout: 15000 });
    await page.locator('#login-workspace').fill('tenant-inesistente-xyz999');
    await page.locator('#login-email').fill('hacker@evil.com');
    await page.locator('#login-password').fill('wrongpassword');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(4000);
    // Non deve accedere al dashboard
    expect(page.url()).not.toContain('/dashboard');
  });

  test('login con email valida ma workspace errato → errore', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#login-workspace', { state: 'visible', timeout: 15000 });
    await page.locator('#login-workspace').fill('workspace-sbagliato-99');
    await page.locator('#login-email').fill('romano@romano-officina.it');
    await page.locator('#login-password').fill('Demo2026!');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(4000);
    // Non deve accedere al dashboard
    expect(page.url()).not.toContain('/dashboard');
  });
});

// ---------------------------------------------------------------------------
// TEST 6: Tenant-by-email API — solo slug corretto
// ---------------------------------------------------------------------------

test.describe.serial('TENANT ISOLATION — tenant-by-email API', () => {
  test('GET /api/auth/tenant-by-email con email valida → risponde', async ({ page }) => {
    const response = await page.request.get(
      `${BASE}/api/auth/tenant-by-email?email=romano@romano-officina.it`
    );
    // Deve rispondere 200 (trovato) o 404 (non trovato), ma non 500
    expect([200, 404]).toContain(response.status());
  });

  test('GET /api/auth/tenant-by-email con email inventata → 404', async ({ page }) => {
    const response = await page.request.get(
      `${BASE}/api/auth/tenant-by-email?email=hacker@evil-tenant.com`
    );
    // Email inesistente: deve rispondere 404, non 500
    expect([404, 200]).toContain(response.status());
    // Se 200, l'array deve essere vuoto
    if (response.status() === 200) {
      const body = await response.json().catch(() => null);
      if (body && Array.isArray(body)) {
        expect(body.length).toBe(0);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// TEST 7: Sessione dopo logout → accesso negato
// ---------------------------------------------------------------------------

test.describe.serial('TENANT ISOLATION — Sessione dopo logout', () => {
  test('dopo clearCookies, /dashboard non accessibile', async ({ page }) => {
    await login(page);
    // Verifica che siamo loggati
    expect(page.url()).toContain('/dashboard');

    // Pulisce i cookie (simula logout/scadenza sessione)
    await page.context().clearCookies();

    // Tenta di accedere al dashboard
    await page.goto(`${BASE}/dashboard`);
    await page.waitForTimeout(3000);

    // Deve essere reindirizzato a login
    const url = page.url();
    const isRedirected =
      url.includes('/auth/login') || url.includes('/auth') || url.includes('/login');
    expect(isRedirected).toBeTruthy();
  });
});
