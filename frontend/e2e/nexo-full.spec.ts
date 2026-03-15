import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3001';

// Helper: login via API and set cookies
async function apiLogin(page: import('@playwright/test').Page): Promise<void> {
  await page.request.post(BASE + '/api/auth/login', {
    data: { email: 'admin@demo.mechmind.it', password: 'Demo2026!', tenantSlug: 'demo' },
  });
}

test('1 - login e dashboard', async ({ page }) => {
  await apiLogin(page);
  await page.goto(BASE + '/dashboard');
  await page.waitForLoadState('networkidle');
  expect(page.url()).toContain('dashboard');
  await page.screenshot({ path: 'e2e-screenshots/01-dashboard.png' });
});

test('2 - pagina prenotazioni', async ({ page }) => {
  await apiLogin(page);
  await page.goto(BASE + '/dashboard/bookings');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'e2e-screenshots/02-bookings.png' });
  expect(page.url()).toContain('bookings');
});

test('3 - form nuova prenotazione', async ({ page }) => {
  await apiLogin(page);
  await page.goto(BASE + '/dashboard/bookings/new');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'e2e-screenshots/03-booking-new.png' });
  expect(page.url()).toContain('bookings/new');
});

test('4 - pagina fatture', async ({ page }) => {
  await apiLogin(page);
  await page.goto(BASE + '/dashboard/invoices');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'e2e-screenshots/04-invoices.png' });
  expect(page.url()).toContain('invoices');
});

test('5 - pagina work orders', async ({ page }) => {
  await apiLogin(page);
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
  await apiLogin(page);
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
  await apiLogin(page);
  await page.goto(BASE + '/dashboard');
  await page.waitForLoadState('networkidle');

  // Clear auth cookies
  await page.context().clearCookies();
  await page.goto(BASE + '/dashboard');
  await page.waitForURL('**/auth**', { timeout: 10000 });
  expect(page.url()).toContain('auth');
  await page.screenshot({ path: 'e2e-screenshots/08-logout.png' });
});
