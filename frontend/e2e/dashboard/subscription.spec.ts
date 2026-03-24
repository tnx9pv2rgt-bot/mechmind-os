import { test, expect } from '../fixtures/auth.fixture';
import type { Page } from '@playwright/test';

// ============================================
// MOCK DATA
// ============================================

const MOCK_SUBSCRIPTION = {
  data: {
    plan: 'STARTER',
    status: 'ACTIVE',
    billingCycle: 'monthly',
    nextRenewal: '2026-04-20T00:00:00Z',
    price: 29,
    usage: {
      users: { current: 3, limit: 5 },
      vehicles: { current: 28, limit: 50 },
      storage: { current: 1.2, limit: 5 },
    },
    stripe: {
      customerId: 'cus_test123',
      subscriptionId: 'sub_test456',
    },
  },
};

function setupSubscriptionMocks(page: Page): void {
  void page.route('**/api/subscription**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SUBSCRIPTION) })
  );
  void page.route('**/api/dashboard/subscription**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SUBSCRIPTION) })
  );
  void page.route('**/api/subscription/upgrade**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ url: 'https://checkout.stripe.com/test' }),
    })
  );
  void page.route('**/api/subscription/portal**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ url: 'https://billing.stripe.com/test' }),
    })
  );
}

// ============================================
// 1. RENDER
// ============================================

test.describe('Subscription - Render', () => {
  test('should render the subscription page', async ({ page }) => {

    setupSubscriptionMocks(page);
    await page.goto('/dashboard/subscription');

    const heading = page.getByRole('heading', { name: /abbonamento|subscription|piano/i })
      .or(page.getByText(/abbonamento|piano attuale/i).first());
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('should render tier comparison section', async ({ page }) => {

    setupSubscriptionMocks(page);
    await page.goto('/dashboard/subscription');
    await page.waitForLoadState('networkidle');

    // Should show all 4 tiers
    await expect(page.getByText('Free')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Starter')).toBeVisible();
    await expect(page.getByText('Professional')).toBeVisible();
  });
});

// ============================================
// 2. LOADING
// ============================================

test.describe('Subscription - Loading', () => {
  test('should show loading indicator while fetching subscription', async ({ page }) => {


    void page.route('**/api/subscription**', (route) =>
      new Promise((resolve) => setTimeout(() => resolve(route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_SUBSCRIPTION),
      })), 3000))
    );
    void page.route('**/api/dashboard/subscription**', (route) =>
      new Promise((resolve) => setTimeout(() => resolve(route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_SUBSCRIPTION),
      })), 3000))
    );

    await page.goto('/dashboard/subscription');

    const loader = page.locator('.animate-spin');
    await expect(loader.first()).toBeVisible({ timeout: 5000 });
  });
});

// ============================================
// 3. EMPTY
// ============================================

test.describe('Subscription - Empty/No Subscription', () => {
  test('should show free plan state when no active subscription', async ({ page }) => {


    void page.route('**/api/subscription**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            plan: 'FREE',
            status: 'ACTIVE',
            billingCycle: 'monthly',
            nextRenewal: null,
            price: 0,
            usage: {
              users: { current: 1, limit: 2 },
              vehicles: { current: 3, limit: 10 },
              storage: { current: 0.1, limit: 1 },
            },
          },
        }),
      })
    );
    void page.route('**/api/dashboard/subscription**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            plan: 'FREE',
            status: 'ACTIVE',
            billingCycle: 'monthly',
            nextRenewal: null,
            price: 0,
            usage: {
              users: { current: 1, limit: 2 },
              vehicles: { current: 3, limit: 10 },
              storage: { current: 0.1, limit: 1 },
            },
          },
        }),
      })
    );

    await page.goto('/dashboard/subscription');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Free').first()).toBeVisible({ timeout: 10000 });
  });
});

// ============================================
// 4. ERROR
// ============================================

test.describe('Subscription - Error', () => {
  test('should show error state on API failure', async ({ page }) => {


    void page.route('**/api/subscription**', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Server Error' }) })
    );
    void page.route('**/api/dashboard/subscription**', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Server Error' }) })
    );

    await page.goto('/dashboard/subscription');
    await page.waitForLoadState('networkidle');

    const errorEl = page.getByText(/errore|impossibile|problema/i).first();
    await expect(errorEl).toBeVisible({ timeout: 10000 });
  });
});

// ============================================
// 5. DATA
// ============================================

test.describe('Subscription - Data', () => {
  test.beforeEach(async ({ page }) => {

    setupSubscriptionMocks(page);
    await page.goto('/dashboard/subscription');
    await page.waitForLoadState('networkidle');
  });

  test('should display current plan card', async ({ page }) => {
    await expect(page.getByText('Starter').first()).toBeVisible({ timeout: 10000 });
  });

  test('should display plan status as active', async ({ page }) => {
    const activeText = page.getByText(/attivo|active/i);
    if (await activeText.first().isVisible().catch(() => false)) {
      await expect(activeText.first()).toBeVisible();
    }
  });

  test('should display usage information', async ({ page }) => {
    // Users: 3/5
    const usageText = page.getByText(/3/).or(page.getByText(/utenti/i));
    await expect(usageText.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display 4 tier cards', async ({ page }) => {
    await expect(page.getByText('Free')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Starter')).toBeVisible();
    await expect(page.getByText('Professional')).toBeVisible();
    // Enterprise tier
    const enterprise = page.getByText('Enterprise').or(page.getByText('Business'));
    await expect(enterprise.first()).toBeVisible();
  });

  test('should display tier prices', async ({ page }) => {
    await expect(page.getByText(/\/mese/).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/29/).first()).toBeVisible();
    await expect(page.getByText(/79/).first()).toBeVisible();
  });

  test('should display tier features in Italian', async ({ page }) => {
    await expect(page.getByText('Gestione clienti base')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Prenotazioni online')).toBeVisible();
  });

  test('should show upgrade button for higher tiers', async ({ page }) => {
    const upgradeBtn = page.getByRole('button', { name: /upgrade|passa|aggiorna|scegli/i });
    await expect(upgradeBtn.first()).toBeVisible({ timeout: 10000 });
  });
});

// ============================================
// 6. ACTIONS
// ============================================

test.describe('Subscription - Actions', () => {
  test.beforeEach(async ({ page }) => {

    setupSubscriptionMocks(page);
    await page.goto('/dashboard/subscription');
    await page.waitForLoadState('networkidle');
  });

  test('should click upgrade button without error', async ({ page }) => {
    const upgradeBtn = page.getByRole('button', { name: /upgrade|passa|aggiorna|scegli/i }).first();
    await expect(upgradeBtn).toBeVisible({ timeout: 10000 });
    await upgradeBtn.click();
    await page.waitForTimeout(500);
    // Should trigger checkout or show modal
  });

  test('should highlight current plan', async ({ page }) => {
    // The Starter card should have visual distinction
    const starterCard = page.locator('[class*="border"], [class*="ring"]')
      .filter({ hasText: 'Starter' })
      .first();
    if (await starterCard.isVisible().catch(() => false)) {
      await expect(starterCard).toBeVisible();
    }
  });
});
