/**
 * QA Full-Stack Audit — MechMind OS
 * Opera CDP + Puppeteer — login, all pages, console errors, screenshots.
 */
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = path.join(__dirname, 'qa-screenshots');
const REPORT_FILE = path.join(__dirname, 'qa-report.json');

const BASE = 'http://localhost:3001';
const CDP_URL = 'http://localhost:9222';
const CREDS = { email: 'admin@demo.mechmind.it', password: 'Demo2026!', tenant: 'demo' };

const PAGES = [
  { path: '/auth', name: 'auth-login', noAuth: true },
  { path: '/auth/forgot-password', name: 'auth-forgot', noAuth: true },
  { path: '/dashboard', name: 'dashboard-home' },
  { path: '/dashboard/analytics', name: 'dashboard-analytics' },
  { path: '/dashboard/billing', name: 'dashboard-billing' },
  { path: '/dashboard/bookings', name: 'dashboard-bookings' },
  { path: '/dashboard/customers', name: 'dashboard-customers' },
  { path: '/dashboard/customers/new/landing', name: 'customers-new-landing' },
  { path: '/dashboard/customers/new/step1', name: 'customers-new-step1' },
  { path: '/dashboard/customers/new/step2', name: 'customers-new-step2' },
  { path: '/dashboard/customers/new/step3', name: 'customers-new-step3' },
  { path: '/dashboard/customers/new/step4', name: 'customers-new-step4' },
  { path: '/dashboard/inspections', name: 'dashboard-inspections' },
  { path: '/dashboard/inspections/new', name: 'inspections-new' },
  { path: '/dashboard/invoices', name: 'dashboard-invoices' },
  { path: '/dashboard/invoices/quotes', name: 'dashboard-quotes' },
  { path: '/dashboard/locations', name: 'dashboard-locations' },
  { path: '/dashboard/obd', name: 'dashboard-obd' },
  { path: '/dashboard/parts', name: 'dashboard-parts' },
  { path: '/dashboard/settings', name: 'dashboard-settings' },
  { path: '/dashboard/subscription', name: 'dashboard-subscription' },
  { path: '/dashboard/vehicles', name: 'dashboard-vehicles' },
  { path: '/dashboard/warranty', name: 'dashboard-warranty' },
  { path: '/dashboard/warranty/claims', name: 'warranty-claims' },
  { path: '/dashboard/admin/subscriptions', name: 'admin-subscriptions' },
  { path: '/portal/login', name: 'portal-login', noAuth: true },
  { path: '/portal/register', name: 'portal-register', noAuth: true },
  { path: '/portal/dashboard', name: 'portal-dashboard', noAuth: true },
  { path: '/portal/bookings', name: 'portal-bookings', noAuth: true },
  { path: '/billing/success', name: 'billing-success', noAuth: true },
  { path: '/billing/cancel', name: 'billing-cancel', noAuth: true },
  { path: '/demo', name: 'demo-entry', noAuth: true },
];

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function isNoise(msg) {
  if (!msg) return true;
  const noise = [
    'favicon.ico', 'Download the React DevTools', 'third-party cookie',
    'Permissions-Policy', 'chrome-extension://', 'opera://',
    '[Fast Refresh]', 'webpack-hmr', 'ERR_BLOCKED_BY_CLIENT',
    'manifest.json', 'mockServiceWorker', 'GSI_LOGGER',
    'sw.js', 'workbox', 'service-worker',
    'hot-update', '_rsc=', // dev mode HMR + RSC noise
    'ERR_ABORTED', 'net::ERR_ABORTED', // navigation cancellation (page navigates before request completes)
    'Failed to fetch RSC payload', // Next.js client-side navigation fallback (non-error)
  ];
  return noise.some(n => msg.includes(n));
}

async function main() {
  if (fs.existsSync(SCREENSHOT_DIR)) fs.rmSync(SCREENSHOT_DIR, { recursive: true });
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  console.log('🔌 Connecting to Opera via CDP...');
  const response = await fetch(`${CDP_URL}/json/version`);
  const { webSocketDebuggerUrl } = await response.json();

  const browser = await puppeteer.connect({
    browserWSEndpoint: webSocketDebuggerUrl,
    defaultViewport: DESKTOP,
  });

  const page = (await browser.pages()).find(p => p.url().includes('localhost:3001')) || await browser.newPage();
  await page.setViewport(DESKTOP);

  // Console error collection
  const allErrors = {};
  let currentPage = '';

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!isNoise(text)) {
        if (!allErrors[currentPage]) allErrors[currentPage] = [];
        allErrors[currentPage].push({ type: 'console', text: text.slice(0, 200) });
      }
    }
  });

  page.on('pageerror', err => {
    const text = err.message;
    if (!isNoise(text)) {
      if (!allErrors[currentPage]) allErrors[currentPage] = [];
      allErrors[currentPage].push({ type: 'pageerror', text: text.slice(0, 200) });
    }
  });

  page.on('requestfailed', req => {
    const url = req.url();
    const errorText = req.failure()?.errorText || '';
    if (isNoise(url) || isNoise(errorText)) return;
    if (!allErrors[currentPage]) allErrors[currentPage] = [];
    allErrors[currentPage].push({ type: 'network', text: `${errorText} → ${url.slice(0, 150)}` });
  });

  // ═══════════════════════════════════════════════════════════════════
  // STEP 1: LOGIN — First try real login, then demo-session fallback
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n📋 STEP 1 — Login reale (multi-step)');
  currentPage = '/auth';
  let loggedIn = false;

  await page.goto(`${BASE}/auth`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(2000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-auth-methods.png'), fullPage: true });

  try {
    // Step 1a: Click "Accedi"
    console.log('   → Click "Accedi"...');
    await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')];
      const btn = btns.find(b => b.textContent.trim() === 'Accedi');
      if (btn) btn.click();
    });
    await sleep(1500);

    // Step 1b: Fill tenant + email
    console.log('   → Fill credentials...');
    const inputs = await page.$$('input');
    if (inputs.length >= 2) {
      await inputs[0].click({ clickCount: 3 });
      await inputs[0].type('demo', { delay: 30 });
      await inputs[1].click({ clickCount: 3 });
      await inputs[1].type('admin@demo.mechmind.it', { delay: 20 });
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-auth-email.png'), fullPage: true });

    // Step 1c: Click Continua → password step
    console.log('   → Click "Continua"...');
    await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')];
      const btn = btns.find(b => /continua/i.test(b.textContent));
      if (btn) btn.click();
    });
    await sleep(1500);

    // Step 1d: Fill password
    console.log('   → Fill password...');
    const pwInput = await page.$('input[type="password"]');
    if (pwInput) {
      await pwInput.click();
      await pwInput.type('Demo2026!', { delay: 30 });
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-auth-password.png'), fullPage: true });

    // Step 1e: Submit
    console.log('   → Submit...');

    // Intercept the login API response
    const loginResponsePromise = page.waitForResponse(
      res => res.url().includes('/api/auth/password/login'),
      { timeout: 15000 }
    ).catch(() => null);

    await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')];
      const btn = btns.find(b => /continua/i.test(b.textContent));
      if (btn) btn.click();
    });

    const loginResponse = await loginResponsePromise;
    if (loginResponse) {
      const status = loginResponse.status();
      console.log(`   → Login API: ${status}`);
      if (status === 200) {
        loggedIn = true;
        console.log('   ✅ Auth cookies set');
      } else {
        const body = await loginResponse.text().catch(() => '');
        console.log(`   ❌ Login failed: ${body.slice(0, 100)}`);
      }
    }

    await sleep(3000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-after-login.png'), fullPage: true });

    // Handle passkey prompt — click "Forse dopo" if visible
    const currentUrl = page.url();
    if (currentUrl.includes('/auth')) {
      const pageText = await page.evaluate(() => document.body.innerText);
      if (pageText.includes('Face ID') || pageText.includes('Touch ID') || pageText.includes('passkey') || pageText.includes('Attiva')) {
        console.log('   → Skipping passkey prompt...');
        await page.evaluate(() => {
          const btns = [...document.querySelectorAll('button')];
          const skip = btns.find(b => /forse dopo|skip|salta/i.test(b.textContent));
          if (skip) skip.click();
        });
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
        await sleep(2000);
      }
    }

    console.log(`   → After login: ${page.url()}`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-final-state.png'), fullPage: true });

  } catch (err) {
    console.log(`   ❌ Login error: ${err.message}`);
  }

  // Fallback: if login didn't work, use demo session
  if (!loggedIn) {
    console.log('\n   ⚠️  Trying demo session fallback...');
    try {
      await page.goto(`${BASE}/auth`, { waitUntil: 'networkidle2', timeout: 15000 });
      await sleep(1000);
      // Click "Prima provalo" — sets demo_session cookie via POST /api/auth/demo-session
      await page.evaluate(() => {
        const btns = [...document.querySelectorAll('button')];
        const demo = btns.find(b => /prima provalo/i.test(b.textContent));
        if (demo) demo.click();
      });
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
      await sleep(3000);
      const demoUrl = page.url();
      console.log(`   → Demo session: ${demoUrl}`);
      if (demoUrl.includes('/dashboard') || demoUrl.includes('/demo')) {
        loggedIn = true;
        console.log('   ✅ Demo session active');
      }
    } catch (e) {
      console.log(`   ❌ Demo session failed: ${e.message}`);
    }
  }

  // Verify session works
  if (loggedIn) {
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle2', timeout: 15000 });
    await sleep(2000);
    const dashUrl = page.url();
    if (dashUrl.includes('/dashboard')) {
      console.log(`   ✅ Dashboard accessible: ${dashUrl}`);
    } else {
      console.log(`   ❌ Dashboard redirected: ${dashUrl}`);
      loggedIn = false;
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-dashboard-check.png'), fullPage: true });
  }

  // ═══════════════════════════════════════════════════════════════════
  // STEP 2: TEST ALL PAGES
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n📋 STEP 2 — Testing all pages');

  const results = [];

  for (const pg of PAGES) {
    currentPage = pg.path;
    const prefix = pg.name.replace(/[^a-z0-9-]/g, '_');
    process.stdout.write(`   ${pg.path.padEnd(45)} `);

    try {
      await page.setViewport(DESKTOP);
      const resp = await page.goto(`${BASE}${pg.path}`, { waitUntil: 'networkidle2', timeout: 60000 });
      await sleep(1500);

      const status = resp?.status() || 0;
      const finalUrl = page.url();
      const redirected = !finalUrl.includes(pg.path) && pg.path !== '/';

      // Desktop screenshot
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${prefix}-desktop.png`), fullPage: true });

      // Mobile screenshot
      await page.setViewport(MOBILE);
      await sleep(800);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${prefix}-mobile.png`), fullPage: true });
      await page.setViewport(DESKTOP);

      // Page analysis
      const pageCheck = await page.evaluate(() => {
        const body = document.body?.innerText || '';
        const is500 = body.includes('500') && body.includes('Internal Server Error');
        const is404 = body.includes('404') && body.includes('non trovata');
        const hasVisibleError = is500 || is404;
        const skeletonCount = document.querySelectorAll('[class*="skeleton"], [class*="animate-pulse"]').length;
        return { hasVisibleError, is500, is404, skeletonCount, bodyLen: body.length };
      });

      const errors = allErrors[pg.path] || [];
      // Expected redirects: auth guard, portal login, form guards, demo→dashboard
      const isExpectedRedirect =
        (!loggedIn && redirected && (finalUrl.includes('/auth') || finalUrl.includes('/login'))) ||
        (pg.path === '/demo' && redirected && finalUrl.includes('/dashboard')) ||
        (pg.path.includes('/new/step') && redirected && finalUrl.includes('/step1')) ||
        (redirected && finalUrl.includes('/portal/login'));
      const pass = status < 400 && !pageCheck.hasVisibleError && errors.length === 0 && (!redirected || isExpectedRedirect);

      results.push({
        page: pg.path,
        name: pg.name,
        status,
        redirected,
        finalUrl: redirected ? finalUrl : undefined,
        consoleErrors: errors.length,
        pageCheck,
        pass,
        expectedRedirect: isExpectedRedirect,
      });

      const icon = pass ? '✅' : '❌';
      const details = [];
      if (status >= 400) details.push(`HTTP ${status}`);
      if (errors.length > 0) details.push(`${errors.length} err`);
      if (redirected && !isExpectedRedirect) details.push(`→ ${finalUrl.replace(BASE, '')}`);
      if (isExpectedRedirect) details.push('auth-redirect (expected)');
      if (pageCheck.is500) details.push('500 page');
      console.log(`${icon}${details.length ? ' (' + details.join(', ') + ')' : ''}`);
    } catch (err) {
      results.push({ page: pg.path, name: pg.name, status: 0, error: err.message, pass: false });
      console.log(`❌ CRASH: ${err.message.slice(0, 80)}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // STEP 3: CRITICAL FLOWS
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n📋 STEP 3 — Critical flows');

  // Flow: Settings tabs
  try {
    process.stdout.write('   Settings tabs ... ');
    await page.goto(`${BASE}/dashboard/settings`, { waitUntil: 'networkidle2', timeout: 15000 });
    await sleep(2000);
    if (page.url().includes('/settings')) {
      const tabCount = await page.evaluate(() => {
        const tabs = [...document.querySelectorAll('[role="tab"], [data-state], button')];
        const tabButtons = tabs.filter(t => {
          const text = t.textContent.trim().toLowerCase();
          return ['profilo', 'sicurezza', 'notifiche', 'gdpr', 'officina', 'profile', 'security'].some(k => text.includes(k));
        });
        tabButtons.forEach((tab, i) => setTimeout(() => tab.click(), i * 500));
        return tabButtons.length;
      });
      await sleep(3000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'flow-settings-tabs.png'), fullPage: true });
      console.log(`✅ (${tabCount} tabs)`);
    } else {
      console.log(`⚠️  Redirected to ${page.url().replace(BASE, '')}`);
    }
  } catch (err) { console.log(`❌ ${err.message.slice(0, 60)}`); }

  // Flow: Demo mode
  try {
    process.stdout.write('   Demo mode ... ');
    const demoPage = await browser.newPage();
    await demoPage.setViewport(DESKTOP);
    await demoPage.goto(`${BASE}/auth`, { waitUntil: 'networkidle2', timeout: 15000 });
    await sleep(2000);
    const demoClicked = await demoPage.evaluate(() => {
      const btns = [...document.querySelectorAll('button')];
      const demo = btns.find(b => /prima provalo/i.test(b.textContent));
      if (demo) { demo.click(); return true; }
      return false;
    });
    if (demoClicked) {
      await demoPage.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
      await sleep(3000);
      const demoUrl = demoPage.url();
      await demoPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'flow-demo-mode.png'), fullPage: true });

      // Navigate to a few dashboard pages in demo mode
      if (demoUrl.includes('/dashboard') || demoUrl.includes('/demo')) {
        for (const demoRoute of ['/dashboard/bookings', '/dashboard/customers', '/dashboard/parts']) {
          await demoPage.goto(`${BASE}${demoRoute}`, { waitUntil: 'networkidle2', timeout: 10000 });
          await sleep(1500);
        }
        await demoPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'flow-demo-navigation.png'), fullPage: true });
      }
      console.log(`✅ → ${demoUrl}`);
    } else {
      console.log('⚠️  Demo button not found');
    }
    await demoPage.close();
  } catch (err) { console.log(`❌ ${err.message.slice(0, 60)}`); }

  // ═══════════════════════════════════════════════════════════════════
  // REPORT
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(65));
  console.log('📊 QA REPORT — MechMind OS');
  console.log('═'.repeat(65));

  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  const total = results.length;
  const authRedirects = results.filter(r => r.expectedRedirect).length;

  console.log(`\n🔐 Auth status: ${loggedIn ? '✅ Logged in' : '❌ Not logged in'}`);
  console.log(`📄 Pages tested: ${total}`);
  console.log(`   ✅ PASS: ${passed}/${total}`);
  console.log(`   ❌ FAIL: ${failed}/${total}`);
  if (authRedirects > 0) {
    console.log(`   🔒 Auth redirects (expected): ${authRedirects}`);
  }

  if (failed > 0) {
    console.log('\n❌ FAILED PAGES:');
    results.filter(r => !r.pass && !r.expectedRedirect).forEach(r => {
      console.log(`   ${r.page}`);
      if (r.status >= 400) console.log(`     → HTTP ${r.status}`);
      if (r.redirected) console.log(`     → Redirected: ${r.finalUrl}`);
      if (r.consoleErrors > 0) console.log(`     → ${r.consoleErrors} console error(s)`);
      if (r.pageCheck?.is500) console.log(`     → 500 page`);
      if (r.error) console.log(`     → ${r.error}`);
    });
  }

  const totalErrors = Object.values(allErrors).flat();
  console.log(`\n🔴 Console errors: ${totalErrors.length}`);
  if (totalErrors.length > 0) {
    for (const [pg, errs] of Object.entries(allErrors)) {
      if (errs.length === 0) continue;
      console.log(`   ${pg || '(initial)'}:`);
      const unique = [...new Set(errs.map(e => `[${e.type}] ${e.text}`))];
      unique.forEach(e => console.log(`     ${e.slice(0, 120)}`));
    }
  }

  const screenshotCount = fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png')).length;
  console.log(`\n📸 Screenshots: ${screenshotCount} saved`);

  fs.writeFileSync(REPORT_FILE, JSON.stringify({
    auth: loggedIn,
    results,
    errors: allErrors,
    timestamp: new Date().toISOString()
  }, null, 2));
  console.log(`📋 Report: scripts/qa-report.json`);
  console.log('═'.repeat(65));
}

main().catch(err => {
  console.error('💥 Crashed:', err);
  process.exit(1);
});
