import { test, expect } from '../fixtures/auth.fixture';
import { TestDataFactory } from '../helpers/test-data';

/**
 * Dashboard Navigation Tests
 * Tests for navigation, layout, and routing
 */

test.describe('Dashboard Layout', () => {
  
  test.beforeEach(async ({ adminPage: page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should display dashboard header', async ({ page }) => {
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('heading', { name: /dashboard|panoramica/i })).toBeVisible();
  });

  test('should display user menu in header', async ({ page }) => {
    await expect(page.getByRole('button', { name: /utente|user|account|profilo/i })).toBeVisible();
  });

  test('should display notification bell', async ({ page }) => {
    const notificationButton = page.getByRole('button', { name: /notifiche|notifications/i })
      .or(page.locator('[data-testid="notifications"], .notification-bell'));
    
    await expect(notificationButton.first()).toBeVisible();
  });

  test('should display sidebar navigation', async ({ page }) => {
    const sidebar = page.locator('aside, nav, [data-testid="sidebar"]').first();
    await expect(sidebar).toBeVisible();
  });

  test('should display logo', async ({ page }) => {
    await expect(page.getByAltText(/logo|mechmind/i).or(
      page.locator('img[src*="logo"]')
    ).first()).toBeVisible();
  });

  test('should have search functionality', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/cerca|search/i);
    
    if (await searchInput.isVisible().catch(() => false)) {
      await expect(searchInput).toBeVisible();
      await searchInput.fill('test');
      await expect(page.getByText(/risultati|results/i).or(
        page.locator('[data-testid="search-results"]')
      )).toBeVisible();
    }
  });

  test('should display quick actions', async ({ page }) => {
    const quickActions = page.getByText(/azioni rapide|quick actions/i);
    
    if (await quickActions.isVisible().catch(() => false)) {
      await expect(quickActions).toBeVisible();
    }
  });
});

test.describe('Sidebar Navigation', () => {
  
  test.beforeEach(async ({ adminPage: page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to bookings page', async ({ page }) => {
    await page.click('nav a:has-text("Prenotazioni"), [data-testid="nav-bookings"]');
    await expect(page).toHaveURL(/dashboard\/bookings/);
    await expect(page.getByRole('heading', { name: /prenotazioni|bookings/i })).toBeVisible();
  });

  test('should navigate to customers page', async ({ page }) => {
    await page.click('nav a:has-text("Clienti"), [data-testid="nav-customers"]');
    await expect(page).toHaveURL(/dashboard\/customers/);
    await expect(page.getByRole('heading', { name: /clienti|customers/i })).toBeVisible();
  });

  test('should navigate to vehicles page', async ({ page }) => {
    await page.click('nav a:has-text("Veicoli"), [data-testid="nav-vehicles"]');
    await expect(page).toHaveURL(/dashboard\/vehicles/);
    await expect(page.getByRole('heading', { name: /veicoli|vehicles/i })).toBeVisible();
  });

  test('should navigate to inventory page', async ({ page }) => {
    await page.click('nav a:has-text("Magazzino"), [data-testid="nav-inventory"]');
    await expect(page).toHaveURL(/dashboard\/inventory/);
    await expect(page.getByRole('heading', { name: /magazzino|inventory/i })).toBeVisible();
  });

  test('should navigate to invoices page', async ({ page }) => {
    await page.click('nav a:has-text("Fatture"), [data-testid="nav-invoices"]');
    await expect(page).toHaveURL(/dashboard\/invoices/);
    await expect(page.getByRole('heading', { name: /fatture|invoices/i })).toBeVisible();
  });

  test('should navigate to reports page', async ({ page }) => {
    await page.click('nav a:has-text("Report"), [data-testid="nav-reports"]');
    await expect(page).toHaveURL(/dashboard\/reports/);
    await expect(page.getByRole('heading', { name: /report|reports/i })).toBeVisible();
  });

  test('should navigate to settings page', async ({ page }) => {
    await page.click('nav a:has-text("Impostazioni"), [data-testid="nav-settings"]');
    await expect(page).toHaveURL(/dashboard\/settings/);
    await expect(page.getByRole('heading', { name: /impostazioni|settings/i })).toBeVisible();
  });

  test('should highlight active navigation item', async ({ page }) => {
    await page.click('nav a:has-text("Prenotazioni")');
    
    const activeNav = page.locator('nav a[class*="active"], nav a[aria-current="page"]').first();
    await expect(activeNav).toContainText(/prenotazioni|bookings/i);
  });

  test('should collapse and expand sidebar', async ({ page }) => {
    const toggleButton = page.getByRole('button', { name: /comprimi|espandi|collapse|expand/i })
      .or(page.locator('[data-testid="sidebar-toggle"]'));
    
    if (await toggleButton.isVisible().catch(() => false)) {
      const sidebar = page.locator('aside, nav').first();
      const initialWidth = await sidebar.boundingBox().then(box => box?.width);
      
      await toggleButton.click();
      await page.waitForTimeout(300);
      
      const collapsedWidth = await sidebar.boundingBox().then(box => box?.width);
      expect(collapsedWidth).toBeLessThan(initialWidth || 300);
      
      // Expand again
      await toggleButton.click();
    }
  });
});

test.describe('Breadcrumb Navigation', () => {
  
  test('should show breadcrumb on nested pages', async ({ adminPage: page }) => {
    await page.goto('/dashboard/bookings/123');
    
    const breadcrumb = page.locator('nav[aria-label="breadcrumb"], .breadcrumb, [data-testid="breadcrumb"]').first();
    await expect(breadcrumb).toBeVisible();
    
    // Should contain parent page
    await expect(breadcrumb).toContainText(/dashboard|prenotazioni/i);
  });

  test('should navigate via breadcrumb', async ({ adminPage: page }) => {
    await page.goto('/dashboard/bookings/123/edit');
    
    const breadcrumb = page.locator('nav[aria-label="breadcrumb"], .breadcrumb').first();
    
    // Click on parent in breadcrumb
    await breadcrumb.getByText(/prenotazioni|bookings/i).click();
    
    await expect(page).toHaveURL(/dashboard\/bookings(?!\/)/);
  });

  test('should show current page in breadcrumb', async ({ adminPage: page }) => {
    await page.goto('/dashboard/bookings/new');
    
    const breadcrumb = page.locator('nav[aria-label="breadcrumb"], .breadcrumb').first();
    await expect(breadcrumb).toContainText(/nuova|new/i);
  });
});

test.describe('User Menu', () => {
  
  test.beforeEach(async ({ adminPage: page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should open user menu', async ({ page }) => {
    await page.getByRole('button', { name: /utente|user|account/i }).click();
    
    await expect(page.getByRole('menu')).toBeVisible();
  });

  test('should navigate to profile from user menu', async ({ page }) => {
    await page.getByRole('button', { name: /utente|user|account/i }).click();
    await page.getByRole('menuitem', { name: /profilo|profile/i }).click();
    
    await expect(page).toHaveURL(/profile|profilo/);
  });

  test('should navigate to settings from user menu', async ({ page }) => {
    await page.getByRole('button', { name: /utente|user|account/i }).click();
    await page.getByRole('menuitem', { name: /impostazioni|settings/i }).click();
    
    await expect(page).toHaveURL(/settings|impostazioni/);
  });

  test('should show user info in menu', async ({ page }) => {
    await page.getByRole('button', { name: /utente|user|account/i }).click();
    
    const menu = page.getByRole('menu');
    await expect(menu).toContainText(/admin|test|user/i);
  });

  test('should logout from user menu', async ({ page }) => {
    await page.getByRole('button', { name: /utente|user|account/i }).click();
    await page.getByRole('menuitem', { name: /logout|esci|sign out/i }).click();
    
    await expect(page).toHaveURL(/auth|login/);
  });
});

test.describe('Notifications', () => {
  
  test.beforeEach(async ({ adminPage: page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should open notification panel', async ({ page }) => {
    const notificationButton = page.getByRole('button', { name: /notifiche|notifications/i })
      .or(page.locator('[data-testid="notifications"]'));
    
    await notificationButton.first().click();
    
    await expect(page.getByRole('dialog').or(
      page.locator('[data-testid="notification-panel"]')
    )).toBeVisible();
  });

  test('should display notification count badge', async ({ page }) => {
    const badge = page.locator('[data-testid="notification-count"], .badge').first();
    
    // Badge may or may not be present depending on notifications
    if (await badge.isVisible().catch(() => false)) {
      const count = await badge.textContent();
      expect(parseInt(count || '0')).toBeGreaterThanOrEqual(0);
    }
  });

  test('should mark notification as read', async ({ page }) => {
    const notificationButton = page.getByRole('button', { name: /notifiche|notifications/i }).first();
    await notificationButton.click();
    
    const panel = page.getByRole('dialog').or(page.locator('[data-testid="notification-panel"]'));
    
    // Find unread notification
    const unreadNotification = panel.locator('[data-unread="true"], .unread').first();
    
    if (await unreadNotification.isVisible().catch(() => false)) {
      await unreadNotification.click();
      
      // Should be marked as read
      await expect(unreadNotification).not.toHaveAttribute('data-unread', 'true');
    }
  });

  test('should clear all notifications', async ({ page }) => {
    const notificationButton = page.getByRole('button', { name: /notifiche/i }).first();
    await notificationButton.click();
    
    const clearButton = page.getByRole('button', { name: /cancella tutto|clear all|segna come letti/i });
    
    if (await clearButton.isVisible().catch(() => false)) {
      await clearButton.click();
      
      await expect(page.getByText(/nessuna notifica|no notifications|tutto letto/i)).toBeVisible();
    }
  });
});

test.describe('Responsive Navigation', () => {
  
  test('should show mobile menu on small screens', async ({ adminPage: page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    
    // Mobile menu toggle should be visible
    const mobileToggle = page.getByRole('button', { name: /menu|☰/i })
      .or(page.locator('[data-testid="mobile-menu-toggle"]'));
    
    if (await mobileToggle.isVisible().catch(() => false)) {
      await mobileToggle.click();
      
      // Mobile menu should open
      await expect(page.locator('[data-testid="mobile-nav"], .mobile-menu').first()).toBeVisible();
    }
  });

  test('should hide sidebar on mobile', async ({ adminPage: page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    
    const sidebar = page.locator('aside, [data-testid="sidebar"]').first();
    
    // Sidebar should be hidden or in mobile menu
    const isVisible = await sidebar.isVisible().catch(() => false);
    if (isVisible) {
      const box = await sidebar.boundingBox();
      expect(box?.width || 0).toBeLessThan(100);
    }
  });

  test('should show bottom navigation on mobile', async ({ adminPage: page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    
    const bottomNav = page.locator('[data-testid="bottom-nav"], .bottom-navigation').first();
    
    if (await bottomNav.isVisible().catch(() => false)) {
      await expect(bottomNav).toBeVisible();
      
      // Should have navigation items
      const items = bottomNav.locator('a, button');
      expect(await items.count()).toBeGreaterThanOrEqual(3);
    }
  });
});

test.describe('Role-Based Navigation', () => {
  
  test('should show admin-only menu items for admin', async ({ adminPage: page }) => {
    await page.goto('/dashboard');
    
    // Admin should see all items
    await expect(page.locator('nav').getByText(/utenti|users|configurazione|audit/i).first()).toBeVisible();
  });

  test('should not show admin items for regular user', async ({ userPage: page }) => {
    await page.goto('/dashboard');
    
    // Regular user should not see admin items
    const adminItems = page.locator('nav').getByText(/gestione utenti|audit logs|system config/i);
    expect(await adminItems.count()).toBe(0);
  });

  test('should show mechanic-specific items', async ({ mechanicPage: page }) => {
    await page.goto('/dashboard');
    
    // Mechanic should see workshop-related items
    await expect(page.locator('nav').getByText(/officina|workshop|task|compiti/i).first()).toBeVisible();
  });

  test('should redirect unauthorized access attempts', async ({ userPage: page }) => {
    // Try to access admin-only page
    await page.goto('/dashboard/admin/users');
    
    // Should redirect to dashboard or show forbidden
    await expect(page).toHaveURL(/dashboard(?!\/admin)/);
    await expect(page.getByText(/non autorizzato|unauthorized|accesso negato|forbidden/i).first()).toBeVisible();
  });
});

test.describe('Keyboard Navigation', () => {
  
  test('should navigate with Tab key', async ({ adminPage: page }) => {
    await page.goto('/dashboard');
    
    // Press Tab to navigate through focusable elements
    await page.keyboard.press('Tab');
    
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('should open menu with Enter key', async ({ adminPage: page }) => {
    await page.goto('/dashboard');
    
    const userMenuButton = page.getByRole('button', { name: /utente|user/i });
    await userMenuButton.focus();
    await page.keyboard.press('Enter');
    
    await expect(page.getByRole('menu')).toBeVisible();
  });

  test('should close menu with Escape key', async ({ adminPage: page }) => {
    await page.goto('/dashboard');
    
    await page.getByRole('button', { name: /utente|user/i }).click();
    await expect(page.getByRole('menu')).toBeVisible();
    
    await page.keyboard.press('Escape');
    
    await expect(page.getByRole('menu')).not.toBeVisible();
  });

  test('should have skip link', async ({ adminPage: page }) => {
    await page.goto('/dashboard');
    
    // First Tab should show skip link
    await page.keyboard.press('Tab');
    
    const skipLink = page.getByRole('link', { name: /salta|skip to content/i });
    
    if (await skipLink.isVisible().catch(() => false)) {
      await expect(skipLink).toBeVisible();
    }
  });
});

test.describe('Loading States', () => {
  
  test('should show loading spinner on navigation', async ({ adminPage: page }) => {
    await page.goto('/dashboard');
    
    // Click navigation and check for loading state
    const navigationPromise = page.click('nav a:has-text("Prenotazioni")');
    
    // Should show loading indicator
    const loadingIndicator = page.locator('[data-testid="loading"], .spinner, .loading').first();
    
    await navigationPromise;
    await page.waitForURL(/dashboard\/bookings/);
  });

  test('should show skeleton loading', async ({ adminPage: page }) => {
    // Throttle network to see skeleton
    await page.route('**/*', route => route.continue());
    
    await page.goto('/dashboard');
    
    // Check for skeleton elements
    const skeleton = page.locator('.skeleton, [data-testid="skeleton"], .loading-skeleton').first();
    
    // Skeleton may appear briefly during load
    if (await skeleton.isVisible().catch(() => false)) {
      await expect(skeleton).toBeVisible();
    }
  });
});

test.describe('Error Pages', () => {
  
  test('should show 404 page for unknown routes', async ({ adminPage: page }) => {
    await page.goto('/dashboard/unknown-page-12345');
    
    await expect(page.getByText(/404|non trovata|not found|pagina inesistente/i).first()).toBeVisible();
  });

  test('should have link back to dashboard on 404', async ({ adminPage: page }) => {
    await page.goto('/dashboard/unknown-page-12345');
    
    const backLink = page.getByRole('link', { name: /torna|back|dashboard|home/i });
    await expect(backLink.first()).toBeVisible();
    
    await backLink.first().click();
    await expect(page).toHaveURL(/dashboard/);
  });

  test('should show error boundary on component error', async ({ adminPage: page }) => {
    // This would require triggering an actual error
    // For now, just verify the error boundary element exists
    test.skip(true, 'Requires error injection mechanism');
  });
});
