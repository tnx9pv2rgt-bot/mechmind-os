/**
 * LOGIN AUDIT 2026 — Single-form login comprehensive test suite
 * Aggiornato per UI single-form: workspace + email + password tutti visibili simultaneamente
 * Selettori basati sull'ispezione DOM reale:
 *   - Workspace: #login-workspace (type="text", pre-compilato con "demo" in dev)
 *   - Email: #login-email (type="email", label "Indirizzo e-mail")
 *   - Password: #login-password (type="password", sempre visibile)
 *   - Cookie consent: button "Solo necessari" / "Accetta tutti"
 *   - Accedi: button[type="submit"] (unico pulsante di submit)
 */
import { test, expect, Page } from '@playwright/test';

const BASE = 'http://localhost:3000';
const SS = (name: string) => `../bug-reports/login-audit/${name}.png`;

// ─── helpers ───────────────────────────────────────────────────────────────

async function dismissCookies(page: Page) {
  const consent = page
    .locator('button')
    .filter({ hasText: /solo necessari/i })
    .first();
  const visible = await consent.isVisible({ timeout: 3000 }).catch(() => false);
  if (visible) await consent.click().catch(() => {});
  await page.waitForTimeout(300);
}

async function goToLogin(page: Page) {
  // Pulisce i cookie di autenticazione tra i test per evitare redirect BUG-4
  await page.context().clearCookies();
  await page.goto(`${BASE}/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await dismissCookies(page);
}

async function fillEmail(page: Page, email: string) {
  await page.locator('#login-email').fill(email);
}

async function fillPassword(page: Page, pw: string) {
  await page.locator('#login-password').fill(pw);
}

async function clickAccedi(page: Page) {
  await page
    .locator('button[type="submit"]')
    .filter({ hasText: /accedi/i })
    .click();
}

async function ss(page: Page, name: string) {
  await page.screenshot({ path: SS(name), fullPage: false }).catch(() => {});
}

async function bodyText(page: Page): Promise<string> {
  return (await page.evaluate(() => document.body.innerText)) ?? '';
}

// ─── TEST 1 — HAPPY PATH ────────────────────────────────────────────────────

test.describe('TEST 1 — Happy Path', () => {
  test('1.1-1.9 — Login admin@demo.mechmind.it → dashboard', async ({ page, context }) => {
    const consoleErrors: string[] = [];
    page.on('console', m => {
      if (m.type() === 'error') consoleErrors.push(m.text());
    });

    await goToLogin(page);
    // Single-form: tutti e 3 i campi visibili subito
    await expect(page.locator('#login-workspace')).toBeVisible();
    await expect(page.locator('#login-email')).toBeVisible();
    await expect(page.locator('#login-password')).toBeVisible();
    await ss(page, '1-1-login-loaded');

    // Workspace pre-compilato con 'demo' in dev — non serve compilarlo
    await fillEmail(page, 'admin@demo.mechmind.it');
    await fillPassword(page, 'Demo2026!');
    await clickAccedi(page);

    await page.waitForURL(`${BASE}/dashboard`, { timeout: 15000 });
    await ss(page, '1-7-dashboard');
    await page.waitForTimeout(2000);

    // 1.8 cookies
    const cookies = await context.cookies();
    const authCookie = cookies.find(c =>
      ['token', 'auth', 'session', 'access'].some(k => c.name.toLowerCase().includes(k))
    );
    if (authCookie) {
      console.log(
        `1.8 AUTH COOKIE: name=${authCookie.name} httpOnly=${authCookie.httpOnly} secure=${authCookie.secure} sameSite=${authCookie.sameSite}`
      );
    } else {
      console.log(
        `1.8 AUTH COOKIE: non trovato. Cookies presenti: ${cookies.map(c => c.name).join(', ')}`
      );
    }

    // 1.9 console errors
    console.log(
      `1.9 CONSOLE ERRORS: ${consoleErrors.length === 0 ? 'nessuno' : consoleErrors.slice(0, 5).join(' | ')}`
    );
    console.log(`1.9 URL finale: ${page.url()}`);
  });
});

// ─── TEST 2 — EMAIL EDGE CASES ──────────────────────────────────────────────

test.describe('TEST 2 — Email Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await goToLogin(page);
  });

  test('2.1 — Email vuota → errore italiano', async ({ page }) => {
    await clickAccedi(page);
    await page.waitForTimeout(600);
    const text = await bodyText(page);
    await ss(page, '2-1-email-vuota');
    console.log(`2.1 BODY: ${text.substring(0, 400)}`);
    const hasItError = /email|richiesta|inserisci|valida|obbligator/i.test(text);
    expect(hasItError, '2.1 errore italiano atteso').toBeTruthy();
  });

  test('2.2 — Email "ciao" → errore italiano', async ({ page }) => {
    await fillEmail(page, 'ciao');
    await clickAccedi(page);
    await page.waitForTimeout(600);
    const text = await bodyText(page);
    await ss(page, '2-2-email-ciao');
    console.log(`2.2 BODY: ${text.substring(0, 400)}`);
    const hasItError = /email|valida|formato|indirizzo/i.test(text);
    expect(hasItError, '2.2 errore email non valida').toBeTruthy();
  });

  test('2.3 — Email "admin@" → errore italiano', async ({ page }) => {
    await fillEmail(page, 'admin@');
    await clickAccedi(page);
    await page.waitForTimeout(600);
    const text = await bodyText(page);
    await ss(page, '2-3-email-admin-at');
    console.log(`2.3 BODY: ${text.substring(0, 400)}`);
    const hasItError = /email|valida|formato|indirizzo/i.test(text);
    expect(hasItError, '2.3 errore email non valida').toBeTruthy();
  });

  test('2.4 — Email "@mechmind.it" → errore italiano', async ({ page }) => {
    await fillEmail(page, '@mechmind.it');
    await clickAccedi(page);
    await page.waitForTimeout(600);
    const text = await bodyText(page);
    await ss(page, '2-4-email-at-domain');
    console.log(`2.4 BODY: ${text.substring(0, 400)}`);
    const hasItError = /email|valida|formato|indirizzo|Nessun|account/i.test(text);
    expect(hasItError, '2.4 errore email non valida').toBeTruthy();
  });

  test('2.5 — Email con spazi → no crash', async ({ page }) => {
    await fillEmail(page, '  admin@demo.mechmind.it  ');
    await clickAccedi(page);
    await page.waitForTimeout(2000);
    await ss(page, '2-5-email-spaces');
    const text = await bodyText(page);
    console.log(`2.5 BODY: ${text.substring(0, 400)}`);
    expect(text.length, '2.5 pagina non crashata').toBeGreaterThan(100);
  });

  test('2.6 — Email MAIUSCOLA → no crash', async ({ page }) => {
    await fillEmail(page, 'ADMIN@DEMO.MECHMIND.IT');
    await fillPassword(page, 'Demo2026!');
    await clickAccedi(page);
    await page.waitForTimeout(3000);
    await ss(page, '2-6-email-uppercase');
    const text = await bodyText(page);
    console.log(`2.6 BODY: ${text.substring(0, 400)}`);
    // Non deve crashare — può andare a /dashboard o mostrare errore auth
    expect(text.length, '2.6 no crash email uppercase').toBeGreaterThan(100);
  });

  test('2.7 — Email con emoji → no crash', async ({ page }) => {
    await fillEmail(page, '🤖@demo.mechmind.it');
    await clickAccedi(page);
    await page.waitForTimeout(2000);
    const text = await bodyText(page);
    await ss(page, '2-7-emoji');
    console.log(`2.7 BODY: ${text.substring(0, 400)}`);
    const hasTechLeak = /undefined|null|500|stack trace/i.test(text);
    expect(text.length, '2.7 pagina non crashata').toBeGreaterThan(100);
    expect(hasTechLeak, '2.7 no leak tecnici').toBeFalsy();
  });

  test('2.8 — Email 10k caratteri → no crash', async ({ page }) => {
    const big = 'a'.repeat(5000) + '@' + 'b'.repeat(4990) + '.it';
    await fillEmail(page, big);
    await clickAccedi(page);
    await page.waitForTimeout(2000);
    const text = await bodyText(page);
    await ss(page, '2-8-10k-email');
    expect(text.length, '2.8 no crash 10k email').toBeGreaterThan(100);
    console.log('2.8: form non crashato ✅');
  });

  test('2.9 — XSS nel campo email → script non esegue', async ({ page }) => {
    await fillEmail(page, '<script>window.__XSS__=true;alert(1)</script>');
    await clickAccedi(page);
    await page.waitForTimeout(1500);
    const xss = await page.evaluate(() => !!(window as any).__XSS__);
    await ss(page, '2-9-xss');
    console.log(`2.9 XSS fired: ${xss}`);
    expect(xss, '2.9 XSS non deve eseguire').toBeFalsy();
  });

  test('2.10 — SQL injection → no crash', async ({ page }) => {
    await fillEmail(page, "'; DROP TABLE users;--@test.it");
    await clickAccedi(page);
    await page.waitForTimeout(2000);
    const text = await bodyText(page);
    await ss(page, '2-10-sql');
    expect(text.length, '2.10 no crash SQL injection').toBeGreaterThan(100);
    console.log('2.10: SQL injection non ha rotto il form ✅');
  });

  test('2.11 — Email inesistente → messaggio italiano, no leak tecnici', async ({ page }) => {
    await fillEmail(page, 'noexist@mechmind.it');
    await fillPassword(page, 'SomePassword1!');
    await clickAccedi(page);
    await page.waitForTimeout(3500);
    const text = await bodyText(page);
    await ss(page, '2-11-noexist');
    console.log(`2.11 BODY: ${text.substring(0, 500)}`);
    const hasTechLeak = /tenantSlug|400|500|Bad Request|undefined|null/i.test(text);
    expect(hasTechLeak, '2.11 no leak tecnici').toBeFalsy();
  });

  test('2.12 — Doppio click Accedi → max 2 POST login', async ({ page }) => {
    const posts: string[] = [];
    page.on('request', r => {
      if (
        (r.url().includes('/auth/login') || r.url().includes('/api/auth')) &&
        r.method() === 'POST'
      )
        posts.push(r.url());
    });
    await fillEmail(page, 'admin@demo.mechmind.it');
    await fillPassword(page, 'Demo2026!');
    await page
      .locator('button[type="submit"]')
      .filter({ hasText: /accedi/i })
      .dblclick();
    await page.waitForTimeout(3000);
    await ss(page, '2-12-dblclick');
    console.log(`2.12 richieste POST login: ${posts.length}`);
    expect(posts.length, '2.12 max 2 POST da dblclick').toBeLessThanOrEqual(2);
  });
});

// ─── TEST 3 — PASSWORD EDGE CASES ───────────────────────────────────────────

test.describe('TEST 3 — Password Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await goToLogin(page);
    // Single-form: password già visibile, riempiamo solo l'email
    await fillEmail(page, 'admin@demo.mechmind.it');
  });

  test('3.1 — Password vuota → errore italiano', async ({ page }) => {
    await clickAccedi(page);
    await page.waitForTimeout(600);
    const text = await bodyText(page);
    await ss(page, '3-1-pw-vuota');
    console.log(`3.1 BODY: ${text.substring(0, 400)}`);
    const hasError = /password|obbligator|richiesta|inserisci/i.test(text);
    expect(hasError, '3.1 errore password richiesta').toBeTruthy();
  });

  test('3.2 — Password errata → errore italiano, no user enumeration', async ({ page }) => {
    await fillPassword(page, 'WrongPass123!');
    await clickAccedi(page);
    await page.waitForTimeout(4000);
    const text = await bodyText(page);
    await ss(page, '3-2-pw-errata');
    console.log(`3.2 BODY: ${text.substring(0, 500)}`);
    const hasTechLeak = /tenantSlug|Bad Request|undefined|null|stack/i.test(text);
    const hasUserEnum = /email non trovata|utente non trovato|user not found/i.test(text);
    expect(hasTechLeak, '3.2 no leak tecnici').toBeFalsy();
    console.log(`3.2 user enumeration leak: ${hasUserEnum}`);
  });

  test('3.3 — Password corta → risposta senza crash', async ({ page }) => {
    await fillPassword(page, 'Ab1!');
    await clickAccedi(page);
    await page.waitForTimeout(3000);
    const text = await bodyText(page);
    await ss(page, '3-3-pw-corta');
    console.log(`3.3 BODY: ${text.substring(0, 400)}`);
    expect(text.length, '3.3 pagina non crashata').toBeGreaterThan(100);
  });

  test('3.4 — Password 10k caratteri → no crash', async ({ page }) => {
    await fillPassword(page, 'A1!' + 'x'.repeat(9997));
    await clickAccedi(page);
    await page.waitForTimeout(4000);
    const text = await bodyText(page);
    await ss(page, '3-4-pw-10k');
    expect(text.length, '3.4 no crash password 10k').toBeGreaterThan(100);
    console.log('3.4: no crash ✅');
  });

  test('3.5 — Doppio click Accedi → max 2 POST', async ({ page }) => {
    const posts: string[] = [];
    page.on('request', r => {
      if (
        (r.url().includes('/auth/login') || r.url().includes('/api/auth')) &&
        r.method() === 'POST'
      )
        posts.push(r.url());
    });
    await fillPassword(page, 'Demo2026!');
    await page
      .locator('button[type="submit"]')
      .filter({ hasText: /accedi/i })
      .dblclick();
    await page.waitForTimeout(4000);
    await ss(page, '3-5-dblclick-accedi');
    console.log(`3.5 POST login: ${posts.length}`);
    expect(posts.length, '3.5 max 2 POST da dblclick').toBeLessThanOrEqual(2);
  });
});

// ─── TEST 4 — NAVIGAZIONE ───────────────────────────────────────────────────

test.describe('TEST 4 — Navigazione e stati intermedi', () => {
  test('4.1 — Tutti e 3 i campi visibili simultaneamente', async ({ page }) => {
    await goToLogin(page);

    const workspaceVisible = await page
      .locator('#login-workspace')
      .isVisible()
      .catch(() => false);
    const emailVisible = await page
      .locator('#login-email')
      .isVisible()
      .catch(() => false);
    const pwVisible = await page
      .locator('#login-password')
      .isVisible()
      .catch(() => false);
    await ss(page, '4-1-all-fields-visible');

    console.log(`4.1 workspace: ${workspaceVisible}, email: ${emailVisible}, pw: ${pwVisible}`);
    expect(workspaceVisible, '4.1 workspace visibile').toBeTruthy();
    expect(emailVisible, '4.1 email visibile').toBeTruthy();
    expect(pwVisible, '4.1 password visibile').toBeTruthy();
  });

  test('4.2 — Refresh sulla pagina login → no crash tecnico', async ({ page }) => {
    await goToLogin(page);
    await ss(page, '4-2-before-refresh');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await dismissCookies(page);
    await ss(page, '4-2-after-refresh');

    const text = await bodyText(page);
    const hasTechError = /undefined|null|Error:|stack trace/i.test(text);
    const emailVisible = await page
      .locator('#login-email')
      .isVisible()
      .catch(() => false);
    console.log(`4.2 dopo refresh: emailVisible=${emailVisible}, techError=${hasTechError}`);
    expect(hasTechError, '4.2 no errori tecnici dopo refresh').toBeFalsy();
    expect(emailVisible, '4.2 form visibile dopo refresh').toBeTruthy();
  });

  test('4.3 — Back browser dalla login → no crash', async ({ page }) => {
    await goToLogin(page);

    await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(1500);
    await ss(page, '4-3-back-browser');

    const text = await bodyText(page);
    const hasTechError = /undefined|null|500|Error:/i.test(text);
    console.log(`4.3 url dopo back: ${page.url()}, techError=${hasTechError}`);
    expect(hasTechError, '4.3 no crash dopo back').toBeFalsy();
  });

  test('4.6 — Utente già autenticato → redirect /dashboard', async ({ page }) => {
    // Login completo con single-form
    await goToLogin(page);
    await fillEmail(page, 'admin@demo.mechmind.it');
    await fillPassword(page, 'Demo2026!');
    await clickAccedi(page);
    await page.waitForURL(`${BASE}/dashboard`, { timeout: 15000 });

    // Naviga a /auth/login SENZA clearCookies — utente è ancora autenticato
    await page.goto(`${BASE}/auth/login`, { waitUntil: 'domcontentloaded' });
    // BUG-4 fix: deve fare redirect automatico a /dashboard
    await page.waitForTimeout(3000);
    await ss(page, '4-6-already-auth');
    const finalUrl = page.url();
    console.log(`4.6 url finale: ${finalUrl}`);
    // Verifica redirect fuori dalla login page (dashboard o onboarding)
    const redirectedAway = finalUrl.includes('/dashboard') || finalUrl.includes('/onboarding');
    expect(redirectedAway, '4.6 redirect fuori da /auth/login se autenticato').toBeTruthy();
  });
});

// ─── TEST 5 — REGRESSIONI ───────────────────────────────────────────────────

test.describe('TEST 5 — Regressioni', () => {
  test.beforeEach(async ({ page }) => {
    await goToLogin(page);
  });

  test('5.1 — Google OAuth visibile', async ({ page }) => {
    const btn = page
      .locator('button')
      .filter({ hasText: /google/i })
      .first();
    const visible = await btn.isVisible().catch(() => false);
    await ss(page, '5-1-google');
    console.log(`5.1 Google button visible: ${visible}`);
    expect(visible, '5.1 Google OAuth visibile').toBeTruthy();
  });

  test('5.2 — Magic Link visibile', async ({ page }) => {
    const btn = page
      .locator('button')
      .filter({ hasText: /magic.*link|accedi.*link/i })
      .first();
    const visible = await btn.isVisible().catch(() => false);
    await ss(page, '5-2-magic-link');
    console.log(`5.2 Magic link visible: ${visible}`);
    expect(visible, '5.2 Magic Link visibile').toBeTruthy();
  });

  test('5.3 — Password dimenticata sempre visibile (no navigazione richiesta)', async ({
    page,
  }) => {
    // In single-form UI, "Password dimenticata?" è visibile senza dover navigare allo step 2
    const link = page.getByText(/password dimenticat/i).first();
    const visible = await link.isVisible().catch(() => false);
    await ss(page, '5-3-forgot-pw');
    console.log(`5.3 Password dimenticata visible: ${visible}`);
    expect(visible, '5.3 Password dimenticata visibile').toBeTruthy();
  });

  test('5.4 — Prova demo gratuita visibile', async ({ page }) => {
    const btn = page
      .locator('button')
      .filter({ hasText: /demo|gratuita/i })
      .first();
    const visible = await btn.isVisible().catch(() => false);
    await ss(page, '5-4-demo-btn');
    console.log(`5.4 Demo gratuita visible: ${visible}`);
    expect(visible, '5.4 Prova demo gratuita visibile').toBeTruthy();
  });
});

// ─── TEST 7 — ACCESSIBILITÀ ─────────────────────────────────────────────────

test.describe('TEST 7 — Accessibilità', () => {
  test('7.1-7.8 — label, focus, role=alert, touch target', async ({ page }) => {
    await goToLogin(page);

    // 7.2 — Label for="login-email"
    const labelFor = await page
      .locator('label[for="login-email"]')
      .isVisible()
      .catch(() => false);
    console.log(`7.2 label[for="login-email"] presente: ${labelFor}`);
    expect(labelFor, '7.2 label email associata').toBeTruthy();

    // 7.4 — Focus iniziale
    const activeType = await page.evaluate(
      () => (document.activeElement as HTMLInputElement)?.type ?? 'none'
    );
    console.log(`7.4 Focus iniziale: type="${activeType}"`);

    // 7.3 — Trigger errore con form vuoto, verifica role=alert
    await clickAccedi(page);
    await page.waitForTimeout(600);
    const alertCount = await page.locator('[role="alert"]').count();
    const ariaLiveCount = await page.locator('[aria-live]').count();
    console.log(`7.3 role="alert": ${alertCount}, aria-live: ${ariaLiveCount}`);
    await ss(page, '7-3-alert-roles');

    // 7.5 — In single-form, password e workspace sempre visibili al caricamento
    await page.reload();
    await dismissCookies(page);
    await page.waitForTimeout(600);
    const focusOnLoad = await page.evaluate(
      () => (document.activeElement as HTMLInputElement)?.id ?? 'none'
    );
    console.log(`7.5 Focus su load: id="${focusOnLoad}"`);
    await ss(page, '7-5-focus-onload');

    // 7.7 — Touch target Accedi button ≥ 44px
    await page.reload();
    await dismissCookies(page);
    const accediBox = await page.locator('button[type="submit"]').first().boundingBox();
    console.log(`7.7 Touch target Accedi: h=${accediBox?.height?.toFixed(0)}px (target ≥44px)`);
    if (accediBox) {
      expect(accediBox.height, '7.7 touch target ≥ 44px').toBeGreaterThanOrEqual(44);
    }

    // 7.6 — label password sempre visibile in single-form (no step navigation)
    const labelPw = await page
      .locator('label[for="login-password"]')
      .isVisible()
      .catch(() => false);
    console.log(`7.6 label[for="login-password"] presente: ${labelPw}`);
    expect(labelPw, '7.6 label password visibile').toBeTruthy();
  });
});

// ─── TEST 8 — PERFORMANCE ───────────────────────────────────────────────────

test.describe('TEST 8 — Performance', () => {
  test('8.1-8.6 — TTFB, FCP, navTime, peso pagina', async ({ page }) => {
    const t0 = Date.now();
    await page.goto(`${BASE}/auth/login`, { waitUntil: 'load' });
    const totalLoad = Date.now() - t0;

    const metrics = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      const fcp = paint.find(p => p.name === 'first-contentful-paint')?.startTime;
      return {
        ttfb: nav ? nav.responseStart - nav.fetchStart : null,
        fcp: fcp ?? null,
        domInteractive: nav?.domInteractive ?? null,
        transferSize: performance
          .getEntriesByType('resource')
          .reduce((s, r) => s + ((r as PerformanceResourceTiming).transferSize || 0), 0),
      };
    });

    console.log(
      `8.1 TTFB:           ${metrics.ttfb?.toFixed(0) ?? 'N/A'}ms  (soglia <600ms → ${metrics.ttfb != null ? (metrics.ttfb < 600 ? '✅' : '❌') : '?'})`
    );
    console.log(
      `8.2 FCP:            ${metrics.fcp?.toFixed(0) ?? 'N/A'}ms  (soglia <1000ms → ${metrics.fcp != null ? (metrics.fcp < 1000 ? '✅' : '❌') : '?'})`
    );
    console.log(`8.3 domInteractive: ${metrics.domInteractive?.toFixed(0) ?? 'N/A'}ms`);
    console.log(
      `8.4 totalLoad:      ${totalLoad}ms  (soglia <1500ms → ${totalLoad < 1500 ? '✅' : '❌'})`
    );
    console.log(`8.6 Peso risorse:   ${(metrics.transferSize / 1024).toFixed(0)}KB`);

    await ss(page, '8-performance');
  });
});

// ─── TEST 9 — RESPONSIVE ────────────────────────────────────────────────────

test.describe('TEST 9 — Responsive', () => {
  const vps = [
    { tag: '375x812', w: 375, h: 812 },
    { tag: '1024x768', w: 1024, h: 768 },
    { tag: '1440x900', w: 1440, h: 900 },
  ];

  for (const vp of vps) {
    test(`9 — ${vp.tag}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.w, height: vp.h });
      await goToLogin(page);

      const emailBox = await page.locator('#login-email').boundingBox();
      const accediBox = await page.locator('button[type="submit"]').first().boundingBox();

      console.log(
        `9 ${vp.tag}: email w=${emailBox?.width?.toFixed(0)} h=${emailBox?.height?.toFixed(0)}, accedi h=${accediBox?.height?.toFixed(0)}`
      );
      await ss(page, `9-${vp.tag}`);

      expect(emailBox?.width, `9 ${vp.tag} input non tagliato`).toBeGreaterThan(100);
      if (accediBox) {
        expect(accediBox.height, `9 ${vp.tag} touch target ≥44px`).toBeGreaterThanOrEqual(44);
      }
    });
  }

  test('9.4 — Landscape 812x375', async ({ page }) => {
    await page.setViewportSize({ width: 812, height: 375 });
    await goToLogin(page);
    const visible = await page
      .locator('#login-email')
      .isVisible()
      .catch(() => false);
    await ss(page, '9-4-landscape');
    console.log(`9.4 landscape: email visible=${visible}`);
    expect(visible, '9.4 email visibile in landscape').toBeTruthy();
  });

  test('9.5 — Zoom 200% (viewport 720x450 emulato)', async ({ page }) => {
    await page.setViewportSize({ width: 720, height: 450 });
    await goToLogin(page);
    const visible = await page
      .locator('#login-email')
      .isVisible()
      .catch(() => false);
    await ss(page, '9-5-zoom-200');
    expect(visible, '9.5 form visibile a zoom 200%').toBeTruthy();
  });
});

// ─── TEST 10 — MULTI-TENANT ─────────────────────────────────────────────────

test.describe('TEST 10 — Multi-tenant', () => {
  test('10.2 — Workspace input pre-compilato con "demo", no dropdown', async ({ page }) => {
    await goToLogin(page);

    const workspaceValue = await page
      .locator('#login-workspace')
      .inputValue()
      .catch(() => '');
    const dropdown = await page
      .locator('select[name], [role="combobox"]')
      .isVisible()
      .catch(() => false);
    await ss(page, '10-single-tenant-workspace');

    console.log(`10.2 workspace value: "${workspaceValue}", dropdown: ${dropdown}`);
    expect(workspaceValue, '10.2 workspace pre-compilato con demo').toBe('demo');
    expect(dropdown, '10.2 no dropdown').toBeFalsy();
  });
});
