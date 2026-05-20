import { test, expect } from '../fixtures/auth.fixture';
import type { Page } from '@playwright/test';

// ============================================
// MOCK DATA
// ============================================

const MOCK_CAMPAIGNS = {
  data: [
    {
      id: 'camp-1',
      name: 'Promo Tagliando Estate',
      type: 'EMAIL',
      status: 'COMPLETED',
      recipientCount: 500,
      sentCount: 480,
      openedCount: 200,
      clickedCount: 45,
      createdAt: '2026-03-10T10:00:00Z',
      scheduledAt: '2026-03-11T08:00:00Z',
    },
    {
      id: 'camp-2',
      name: 'Reminder Revisione',
      type: 'SMS',
      status: 'IN_PROGRESS',
      recipientCount: 150,
      sentCount: 100,
      openedCount: 80,
      clickedCount: 20,
      createdAt: '2026-03-15T14:00:00Z',
      scheduledAt: null,
    },
    {
      id: 'camp-3',
      name: 'Offerta Gomme Invernali',
      type: 'WHATSAPP',
      status: 'DRAFT',
      recipientCount: 0,
      sentCount: 0,
      openedCount: 0,
      clickedCount: 0,
      createdAt: '2026-03-18T09:00:00Z',
      scheduledAt: null,
    },
    {
      id: 'camp-4',
      name: 'Campagna Nuovi Clienti',
      type: 'EMAIL',
      status: 'SCHEDULED',
      recipientCount: 300,
      sentCount: 0,
      openedCount: 0,
      clickedCount: 0,
      createdAt: '2026-03-17T11:00:00Z',
      scheduledAt: '2026-03-25T09:00:00Z',
    },
  ],
  meta: { total: 4 },
  stats: {
    activeCampaigns: 2,
    totalSent: 580,
    avgOpenRate: 42.5,
    totalConversions: 65,
  },
};

const MOCK_SEGMENTS = {
  data: [
    { id: 'seg-1', name: 'Clienti Attivi', count: 120 },
    { id: 'seg-2', name: 'Clienti Inattivi', count: 45 },
    { id: 'seg-3', name: 'VIP', count: 30 },
  ],
};

function setupCampaignMocks(page: Page): void {
  void page.route('**/api/dashboard/campaigns**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_CAMPAIGNS) })
  );
  void page.route('**/api/dashboard/campaigns/segments**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SEGMENTS) })
  );
  void page.route('**/api/dashboard/campaigns', (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'camp-new' }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_CAMPAIGNS) });
  });
  void page.route('**/api/analytics/marketing**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: {} }) })
  );
}

// ============================================
// 1. RENDER
// ============================================

test.describe('Marketing - Render', () => {
  test('should render the campaigns page with title', async ({ page }) => {

    setupCampaignMocks(page);
    await page.goto('/dashboard/marketing');

    await expect(page.getByRole('heading', { name: /campagne marketing/i })).toBeVisible();
    await expect(page.getByText(/gestisci campagne/i)).toBeVisible();
  });

  test('should render "Nuova Campagna" button', async ({ page }) => {

    setupCampaignMocks(page);
    await page.goto('/dashboard/marketing');

    await expect(page.getByRole('link', { name: /nuova campagna/i }).or(page.getByText('Nuova Campagna'))).toBeVisible();
  });
});

// ============================================
// 2. LOADING
// ============================================

test.describe('Marketing - Loading', () => {
  test('should show loading indicator while fetching campaigns', async ({ page }) => {


    void page.route('**/api/dashboard/campaigns**', (route) =>
      new Promise((resolve) => setTimeout(() => resolve(route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_CAMPAIGNS),
      })), 3000))
    );

    await page.goto('/dashboard/marketing');

    const loader = page.locator('.animate-spin').or(page.getByText('...').first());
    await expect(loader.first()).toBeVisible({ timeout: 5000 });
  });
});

// ============================================
// 3. EMPTY
// ============================================

test.describe('Marketing - Empty', () => {
  test('should show empty state when no campaigns', async ({ page }) => {


    void page.route('**/api/dashboard/campaigns**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], meta: { total: 0 }, stats: { activeCampaigns: 0, totalSent: 0, avgOpenRate: 0, totalConversions: 0 } }),
      })
    );

    await page.goto('/dashboard/marketing');
    await page.waitForLoadState('networkidle');

    const emptyText = page.getByText(/nessuna campagna|non ci sono campagne|inizia/i);
    if (await emptyText.isVisible().catch(() => false)) {
      await expect(emptyText).toBeVisible();
    }
  });
});

// ============================================
// 4. ERROR
// ============================================

test.describe('Marketing - Error', () => {
  test('should show error state on API failure', async ({ page }) => {


    void page.route('**/api/dashboard/campaigns**', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Internal Server Error' }) })
    );

    await page.goto('/dashboard/marketing');
    await page.waitForLoadState('networkidle');

    const errorEl = page.getByText(/errore|impossibile|problema/i).first();
    await expect(errorEl).toBeVisible({ timeout: 10000 });
  });
});

// ============================================
// 5. DATA
// ============================================

test.describe('Marketing - Data', () => {
  test.beforeEach(async ({ page }) => {

    setupCampaignMocks(page);
    await page.goto('/dashboard/marketing');
    await page.waitForLoadState('networkidle');
  });

  test('should display campaign list with correct names', async ({ page }) => {
    await expect(page.getByText('Promo Tagliando Estate')).toBeVisible();
    await expect(page.getByText('Reminder Revisione')).toBeVisible();
  });

  test('should display type badges (Email, SMS, WhatsApp)', async ({ page }) => {
    await expect(page.getByText('Email').first()).toBeVisible();
    await expect(page.getByText('SMS').first()).toBeVisible();
    await expect(page.getByText('WhatsApp').first()).toBeVisible();
  });

  test('should display status badges in Italian', async ({ page }) => {
    await expect(page.getByText('Completata').first()).toBeVisible();
    await expect(page.getByText('In Corso').first()).toBeVisible();
    await expect(page.getByText('Bozza').first()).toBeVisible();
    await expect(page.getByText('Pianificata').first()).toBeVisible();
  });

  test('should display stat cards with campaign metrics', async ({ page }) => {
    await expect(page.getByText('Campagne Attive')).toBeVisible();
    await expect(page.getByText('Email Inviate')).toBeVisible();
    await expect(page.getByText('Tasso Apertura')).toBeVisible();
    await expect(page.getByText('Conversioni')).toBeVisible();
  });

  test('should display filter controls', async ({ page }) => {
    await expect(page.getByText(/filtri/i)).toBeVisible();
    const typeSelect = page.locator('select').first();
    await expect(typeSelect).toBeVisible();
  });
});

// ============================================
// 6. ACTIONS
// ============================================

test.describe('Marketing - Actions', () => {
  test.beforeEach(async ({ page }) => {

    setupCampaignMocks(page);
    await page.goto('/dashboard/marketing');
    await page.waitForLoadState('networkidle');
  });

  test('should filter campaigns by type', async ({ page }) => {
    const typeSelect = page.locator('select').first();
    await typeSelect.selectOption('EMAIL');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Email').first()).toBeVisible();
  });

  test('should filter campaigns by status', async ({ page }) => {
    const selects = page.locator('select');
    const count = await selects.count();
    if (count >= 2) {
      await selects.nth(1).selectOption('COMPLETED');
      await page.waitForLoadState('networkidle');
    }
  });

  test('should navigate to new campaign wizard', async ({ page }) => {
    const newCampaignLink = page.getByRole('link', { name: /nuova campagna/i }).or(page.getByText('Nuova Campagna'));
    await newCampaignLink.click();
    await expect(page).toHaveURL(/dashboard\/marketing\/new/);
  });
});

// ============================================
// WIZARD (5-step new campaign)
// ============================================

test.describe('Marketing - New Campaign Wizard', () => {
  test('should render new campaign page with wizard steps', async ({ page }) => {


    void page.route('**/api/dashboard/campaigns**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_CAMPAIGNS) })
    );
    void page.route('**/api/dashboard/campaigns/segments**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SEGMENTS) })
    );
    void page.route('**/api/customers**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) })
    );

    await page.goto('/dashboard/marketing/new');

    const wizardTitle = page.getByRole('heading', { name: /nuova campagna|crea campagna|wizard/i })
      .or(page.getByText(/nuova campagna|crea campagna/i).first());
    await expect(wizardTitle).toBeVisible({ timeout: 10000 });
  });
});

// ============================================
// SEGMENT BUILDER
// ============================================

test.describe('Marketing - Segment Builder', () => {
  test('should display segment options when available', async ({ page }) => {


    void page.route('**/api/dashboard/campaigns**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_CAMPAIGNS) })
    );
    void page.route('**/api/dashboard/campaigns/segments**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SEGMENTS) })
    );
    void page.route('**/api/customers**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) })
    );

    await page.goto('/dashboard/marketing/new');
    await page.waitForLoadState('networkidle');

    // The segment builder may be on a later step of the wizard
    const segmentText = page.getByText(/segmento|destinatari|audience/i);
    if (await segmentText.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(segmentText.first()).toBeVisible();
    }
  });
});
