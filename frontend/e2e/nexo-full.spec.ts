import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import path from 'path';

const BASE = 'http://localhost:3001';
const STORAGE_STATE = path.join(__dirname, '..', 'e2e-screenshots', '.auth-state.json');

// Login once and save auth state
async function loginAndSaveState(page: Page, context: BrowserContext): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'PublicKeyCredential', { value: undefined, writable: false });
  });

  await page.goto(BASE + '/auth');
  await page.waitForLoadState('networkidle');

  // Step 0: Click "Accedi"
  await page.getByRole('button', { name: /accedi/i }).click();

  // Step 1: Fill slug + email
  const slugInput = page.locator('input').first();
  await slugInput.waitFor({ timeout: 10000 });
  await slugInput.fill('demo');
  await page.locator('input').nth(1).fill('admin@demo.mechmind.it');
  await page.getByRole('button', { name: /continua/i }).click();

  // Step 2: Fill password
  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.waitFor({ timeout: 10000 });
  await passwordInput.fill('Demo2026!');
  await page.getByRole('button', { name: /continua/i }).click();

  // Step 3: Wait for dashboard
  await page.waitForURL('**/dashboard**', { timeout: 15000 });

  // Save state for reuse
  await context.storageState({ path: STORAGE_STATE });
}

// Reuse auth state - just go to dashboard
async function loginWithState(page: Page): Promise<void> {
  await page.goto(BASE + '/dashboard');
  await page.waitForURL('**/dashboard**', { timeout: 10000 });
}

// First test: login fresh and save state
test('1 - login e dashboard', async ({ page, context }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'PublicKeyCredential', { value: undefined, writable: false });
  });

  await page.goto(BASE + '/auth');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /accedi/i }).click();

  const slugInput = page.locator('input').first();
  await slugInput.waitFor({ timeout: 10000 });
  await slugInput.fill('demo');
  await page.locator('input').nth(1).fill('admin@demo.mechmind.it');
  await page.getByRole('button', { name: /continua/i }).click();

  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.waitFor({ timeout: 10000 });
  await passwordInput.fill('Demo2026!');
  await page.getByRole('button', { name: /continua/i }).click();

  await page.waitForURL('**/dashboard**', { timeout: 15000 });
  expect(page.url()).toContain('dashboard');
  await page.screenshot({ path: 'e2e-screenshots/01-dashboard.png' });

  // Save state
  await context.storageState({ path: STORAGE_STATE });
});

// Remaining tests: set cookies directly via API login
test('2 - pagina prenotazioni', async ({ page }) => {
  // Login via API to avoid rate limiting
  const resp = await page.request.post(BASE + '/api/auth/password/login', {
    data: { email: 'admin@demo.mechmind.it', password: 'Demo2026!', tenantSlug: 'demo' },
  });
  await page.goto(BASE + '/dashboard/bookings');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'e2e-screenshots/02-bookings.png' });
  expect(page.url()).toContain('bookings');
});

test('3 - form nuova prenotazione', async ({ page }) => {
  await page.request.post(BASE + '/api/auth/password/login', {
    data: { email: 'admin@demo.mechmind.it', password: 'Demo2026!', tenantSlug: 'demo' },
  });
  await page.goto(BASE + '/dashboard/bookings/new');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'e2e-screenshots/03-booking-new.png' });
  expect(page.url()).toContain('bookings/new');
});

test('4 - pagina fatture', async ({ page }) => {
  await page.request.post(BASE + '/api/auth/password/login', {
    data: { email: 'admin@demo.mechmind.it', password: 'Demo2026!', tenantSlug: 'demo' },
  });
  await page.goto(BASE + '/dashboard/invoices');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'e2e-screenshots/04-invoices.png' });
  expect(page.url()).toContain('invoices');
});

test('5 - pagina work orders', async ({ page }) => {
  await page.request.post(BASE + '/api/auth/password/login', {
    data: { email: 'admin@demo.mechmind.it', password: 'Demo2026!', tenantSlug: 'demo' },
  });
  await page.goto(BASE + '/dashboard/work-orders');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'e2e-screenshots/05-work-orders.png' });
  expect(page.url()).toContain('work-orders');
});

test('6 - portale clienti', async ({ page }) => {
  await page.goto(BASE + '/portal');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'e2e-screenshots/06-portal.png' });
  expect(page.url()).toContain('portal');
});

test('7 - zero console errors su dashboard', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  await page.request.post(BASE + '/api/auth/password/login', {
    data: { email: 'admin@demo.mechmind.it', password: 'Demo2026!', tenantSlug: 'demo' },
  });
  await page.goto(BASE + '/dashboard');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  const critical = errors.filter(
    e =>
      !e.includes('Warning:') &&
      !e.includes('hydrat') &&
      !e.includes('favicon') &&
      !e.includes('ERR_CONNECTION_REFUSED') &&
      !e.includes('Failed to load resource')
  );
  console.log('Console errors found:', critical.length, critical);
  expect(critical.length).toBe(0);
});

test('8 - logout protegge dashboard', async ({ page }) => {
  await page.request.post(BASE + '/api/auth/password/login', {
    data: { email: 'admin@demo.mechmind.it', password: 'Demo2026!', tenantSlug: 'demo' },
  });
  await page.goto(BASE + '/dashboard');
  await page.waitForLoadState('networkidle');

  // Clear auth cookies
  await page.context().clearCookies();
  await page.goto(BASE + '/dashboard');
  await page.waitForURL('**/auth**', { timeout: 10000 });
  expect(page.url()).toContain('auth');
  await page.screenshot({ path: 'e2e-screenshots/08-logout.png' });
});
