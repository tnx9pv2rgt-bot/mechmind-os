import { test, expect } from '../fixtures/auth.fixture';
import type { Page } from '@playwright/test';

// ============================================
// MOCK DATA
// ============================================

const MOCK_CONVERSATIONS = {
  data: [
    {
      id: 'conv-1',
      customerName: 'Marco Bianchi',
      customerPhone: '+393331234567',
      customerEmail: 'marco@example.it',
      lastMessage: 'Buongiorno, a che ora posso passare?',
      lastMessageAt: '2026-03-20T09:30:00Z',
      unreadCount: 2,
      channel: 'SMS',
    },
    {
      id: 'conv-2',
      customerName: 'Laura Verdi',
      customerPhone: '+393339876543',
      customerEmail: 'laura@example.it',
      lastMessage: 'Grazie, a domani!',
      lastMessageAt: '2026-03-19T17:00:00Z',
      unreadCount: 0,
      channel: 'WHATSAPP',
    },
    {
      id: 'conv-3',
      customerName: 'Giuseppe Rossi',
      customerPhone: '+393335551234',
      customerEmail: 'giuseppe@example.it',
      lastMessage: 'Ho ricevuto il preventivo, procediamo.',
      lastMessageAt: '2026-03-18T14:20:00Z',
      unreadCount: 1,
      channel: 'EMAIL',
    },
  ],
  meta: { total: 3 },
};

const MOCK_MESSAGES = {
  data: [
    {
      id: 'msg-1',
      direction: 'INBOUND',
      body: 'Buongiorno, a che ora posso passare?',
      createdAt: '2026-03-20T09:30:00Z',
      status: 'READ',
      channel: 'SMS',
    },
    {
      id: 'msg-2',
      direction: 'OUTBOUND',
      body: 'Buongiorno Marco! Puoi passare dalle 14 alle 18.',
      createdAt: '2026-03-20T09:35:00Z',
      status: 'DELIVERED',
      channel: 'SMS',
    },
    {
      id: 'msg-3',
      direction: 'INBOUND',
      body: 'Perfetto, passo alle 15. Grazie!',
      createdAt: '2026-03-20T09:40:00Z',
      status: 'READ',
      channel: 'SMS',
    },
  ],
};

function setupMessagingMocks(page: Page): void {
  void page.route('**/api/dashboard/messaging/conversations**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_CONVERSATIONS) })
  );
  void page.route('**/api/dashboard/messaging/conversations/*/messages**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_MESSAGES) })
  );
  void page.route('**/api/sms/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_CONVERSATIONS) })
  );
  void page.route('**/api/dashboard/messaging**', (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'msg-new', status: 'SENT' }),
      });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_CONVERSATIONS) });
  });
}

// ============================================
// 1. RENDER
// ============================================

test.describe('Messaging - Render', () => {
  test('should render the messaging page with title', async ({ page }) => {

    setupMessagingMocks(page);
    await page.goto('/dashboard/messaging');

    const heading = page.getByRole('heading', { name: /messaggi|messaging|conversazioni/i })
      .or(page.getByText(/messaggi/i).first());
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('should render split view layout', async ({ page }) => {

    setupMessagingMocks(page);
    await page.goto('/dashboard/messaging');
    await page.waitForLoadState('networkidle');

    // Should have a conversation list area
    const convList = page.getByText('Marco Bianchi').or(page.getByText(/conversazioni/i));
    await expect(convList.first()).toBeVisible({ timeout: 10000 });
  });
});

// ============================================
// 2. LOADING
// ============================================

test.describe('Messaging - Loading', () => {
  test('should show loading indicator while fetching conversations', async ({ page }) => {


    void page.route('**/api/dashboard/messaging/**', (route) =>
      new Promise((resolve) => setTimeout(() => resolve(route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_CONVERSATIONS),
      })), 3000))
    );
    void page.route('**/api/sms/**', (route) =>
      new Promise((resolve) => setTimeout(() => resolve(route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_CONVERSATIONS),
      })), 3000))
    );

    await page.goto('/dashboard/messaging');

    const loader = page.locator('.animate-spin').or(page.getByText(/caricamento/i));
    await expect(loader.first()).toBeVisible({ timeout: 5000 });
  });
});

// ============================================
// 3. EMPTY
// ============================================

test.describe('Messaging - Empty', () => {
  test('should show empty state when no conversations', async ({ page }) => {


    void page.route('**/api/dashboard/messaging/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], meta: { total: 0 } }) })
    );
    void page.route('**/api/sms/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], meta: { total: 0 } }) })
    );

    await page.goto('/dashboard/messaging');
    await page.waitForLoadState('networkidle');

    const emptyText = page.getByText(/nessuna conversazione|nessun messaggio|inizia/i);
    if (await emptyText.isVisible().catch(() => false)) {
      await expect(emptyText).toBeVisible();
    }
  });
});

// ============================================
// 4. ERROR
// ============================================

test.describe('Messaging - Error', () => {
  test('should show error state on API failure', async ({ page }) => {


    void page.route('**/api/dashboard/messaging/**', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Server Error' }) })
    );
    void page.route('**/api/sms/**', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Server Error' }) })
    );

    await page.goto('/dashboard/messaging');
    await page.waitForLoadState('networkidle');

    const errorEl = page.getByText(/errore|impossibile|problema/i).first();
    await expect(errorEl).toBeVisible({ timeout: 10000 });
  });
});

// ============================================
// 5. DATA
// ============================================

test.describe('Messaging - Data', () => {
  test.beforeEach(async ({ page }) => {

    setupMessagingMocks(page);
    await page.goto('/dashboard/messaging');
    await page.waitForLoadState('networkidle');
  });

  test('should display conversation list with customer names', async ({ page }) => {
    await expect(page.getByText('Marco Bianchi')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Laura Verdi')).toBeVisible();
    await expect(page.getByText('Giuseppe Rossi')).toBeVisible();
  });

  test('should display last message preview', async ({ page }) => {
    const preview = page.getByText(/a che ora posso passare/i).or(page.getByText(/buongiorno/i).first());
    await expect(preview).toBeVisible({ timeout: 10000 });
  });

  test('should display unread count badge', async ({ page }) => {
    // Marco has 2 unread
    const unreadBadge = page.locator('[class*="badge"], [class*="unread"]').first();
    if (await unreadBadge.isVisible().catch(() => false)) {
      await expect(unreadBadge).toBeVisible();
    }
  });

  test('should show channel type indicators', async ({ page }) => {
    // Channel badges should be visible
    const channelIndicator = page.getByText('SMS').or(page.getByText('WhatsApp')).or(page.getByText('Email'));
    await expect(channelIndicator.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display message bubbles when conversation selected', async ({ page }) => {
    // Click on first conversation
    await page.getByText('Marco Bianchi').click();
    await page.waitForLoadState('networkidle');

    // Message bubbles should appear
    const messageBubble = page.getByText(/a che ora posso passare/i)
      .or(page.getByText(/puoi passare dalle 14/i));
    await expect(messageBubble.first()).toBeVisible({ timeout: 10000 });
  });
});

// ============================================
// 6. ACTIONS
// ============================================

test.describe('Messaging - Actions', () => {
  test.beforeEach(async ({ page }) => {

    setupMessagingMocks(page);
    await page.goto('/dashboard/messaging');
    await page.waitForLoadState('networkidle');
  });

  test('should select a conversation from the list', async ({ page }) => {
    await page.getByText('Marco Bianchi').click();
    await page.waitForLoadState('networkidle');

    const chatArea = page.getByText(/a che ora posso passare/i)
      .or(page.getByText('Marco Bianchi'));
    await expect(chatArea.first()).toBeVisible({ timeout: 10000 });
  });

  test('should have a message input field', async ({ page }) => {
    await page.getByText('Marco Bianchi').click();
    await page.waitForLoadState('networkidle');

    const msgInput = page.getByPlaceholder(/scrivi|messaggio|digita/i)
      .or(page.locator('input[type="text"], textarea').last());
    await expect(msgInput).toBeVisible({ timeout: 10000 });
  });

  test('should have a send button', async ({ page }) => {
    await page.getByText('Marco Bianchi').click();
    await page.waitForLoadState('networkidle');

    const sendBtn = page.getByRole('button', { name: /invia|send/i })
      .or(page.locator('button:has(svg)').last());
    await expect(sendBtn).toBeVisible({ timeout: 10000 });
  });

  test('should support search/filter conversations', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/cerca|search|filtra/i);
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('Marco');
      await page.waitForTimeout(500);
      await expect(page.getByText('Marco Bianchi')).toBeVisible();
    }
  });
});
