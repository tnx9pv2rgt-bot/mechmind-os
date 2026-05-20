/**
 * Tests for critical logic bug fixes in MechMind OS frontend.
 *
 * These are source-verification tests that ensure the code patterns are correct.
 * They read source files and assert the presence/absence of specific patterns
 * to prevent regressions of the fixed bugs.
 *
 * 2A - Cancel booking must call backend API before mutating SWR cache
 * 2B - Portal settings notification save must call handleSaveNotifications
 * 2C - Estimates catch block must show toast error (not swallow silently)
 * 2D - Invoice "Paga ora" must handle null paymentUrl (no '#' link)
 * 2E - Dashboard settings "Elimina account" must call GDPR delete API
 * 2F - Dashboard settings notification checkboxes must be controlled
 */

import * as fs from 'fs';
import * as path from 'path';

function readSource(relativePath: string): string {
  const fullPath = path.resolve(__dirname, '../../', relativePath);
  return fs.readFileSync(fullPath, 'utf-8');
}

// ──────────────────────────────────────────────────
// 2A: Portal Bookings — cancel must call backend
// ──────────────────────────────────────────────────

describe('2A: Portal Bookings — cancel calls backend API', () => {
  const content = readSource('app/portal/bookings/page.tsx');

  it('should call fetch with PATCH method and CANCELLED status', () => {
    expect(content).toContain("method: 'PATCH'");
    expect(content).toContain("status: 'CANCELLED'");
    expect(content).toContain('/api/bookings/');
  });

  it('confirmCancel must be async (calls API before mutating SWR)', () => {
    expect(content).toMatch(/const confirmCancel\s*=\s*async/);
  });

  it('should show error toast on failure', () => {
    expect(content).toContain('Errore durante la cancellazione della prenotazione');
  });

  it('should have cancelLoading state', () => {
    expect(content).toContain('cancelLoading');
    expect(content).toContain('setCancelLoading');
  });

  it('SWR mutate must happen AFTER the fetch call', () => {
    const fetchIdx = content.indexOf("fetch(`/api/bookings/");
    const mutateIdx = content.indexOf('await mutate(');
    expect(fetchIdx).toBeGreaterThan(-1);
    expect(mutateIdx).toBeGreaterThan(-1);
    expect(mutateIdx).toBeGreaterThan(fetchIdx);
  });

  it('should pass cancelLoading to ConfirmDialog', () => {
    expect(content).toContain('loading={cancelLoading}');
  });
});

// ──────────────────────────────────────────────────
// 2B: Portal settings — notification save handler
// ──────────────────────────────────────────────────

describe('2B: Portal settings — notification save uses correct handler', () => {
  const content = readSource('app/portal/settings/page.tsx');

  it('should have handleSaveNotifications function', () => {
    expect(content).toContain('handleSaveNotifications');
  });

  it('should call the portal preferences API', () => {
    expect(content).toContain("'/api/portal/preferences'");
  });

  it('Salva Preferenze button must call handleSaveNotifications, not handleSaveProfile', () => {
    const idx = content.indexOf('Salva Preferenze');
    expect(idx).toBeGreaterThan(-1);
    const nearbyCode = content.slice(Math.max(0, idx - 200), idx + 50);
    expect(nearbyCode).toContain('handleSaveNotifications');
    expect(nearbyCode).not.toContain('handleSaveProfile');
  });

  it('notification checkboxes should be controlled (checked + onChange)', () => {
    // The portal settings uses Switch components which are already controlled
    // Verify the notifications state is used
    expect(content).toContain('notifications.email.enabled');
    expect(content).toContain('setNotifications');
  });
});

// ──────────────────────────────────────────────────
// 2C: Estimates catch block must show toast
// ──────────────────────────────────────────────────

describe('2C: Estimates — catch block shows toast.error', () => {
  const content = readSource('app/portal/estimates/[id]/page.tsx');

  it('should NOT have silent catch', () => {
    expect(content).not.toContain('// silent');
  });

  it('should import toast from sonner', () => {
    expect(content).toContain("from 'sonner'");
  });

  it('should call toast.error in catch block', () => {
    expect(content).toContain("toast.error('Errore durante l\\'operazione. Riprova.')");
  });
});

// ──────────────────────────────────────────────────
// 2D: Invoice — payment button handles null paymentUrl
// ──────────────────────────────────────────────────

describe('2D: Invoice — Paga ora handles null paymentUrl', () => {
  const content = readSource('app/portal/invoices/[id]/page.tsx');

  it('should NOT link to # when paymentUrl is null', () => {
    expect(content).not.toContain("paymentUrl || '#'");
  });

  it('should show tooltip when paymentUrl is null', () => {
    expect(content).toContain('Link di pagamento non disponibile');
  });

  it('should use window.open for valid paymentUrl', () => {
    expect(content).toContain('window.open');
  });

  it('should import Tooltip components', () => {
    expect(content).toContain('TooltipProvider');
  });

  it('should conditionally render based on paymentUrl', () => {
    expect(content).toContain('invoice.paymentUrl ?');
  });

  it('should disable button when paymentUrl is null', () => {
    // Find the TooltipTrigger usage in the render (not import)
    const tooltipUsageIdx = content.indexOf('<TooltipProvider>');
    expect(tooltipUsageIdx).toBeGreaterThan(-1);
    const nullBranch = content.slice(tooltipUsageIdx, tooltipUsageIdx + 500);
    expect(nullBranch).toContain('disabled');
  });
});

// ──────────────────────────────────────────────────
// 2E: Dashboard settings — delete account calls GDPR API
// ──────────────────────────────────────────────────

describe('2E: Dashboard settings — delete account calls GDPR API', () => {
  const content = readSource('app/dashboard/settings/page.tsx');

  it('should have GDPR delete-account API route file', () => {
    const routeContent = readSource('app/api/gdpr/delete-account/route.ts');
    expect(routeContent).toContain('proxyToNestJS');
    expect(routeContent).toContain('gdpr/requests');
    expect(routeContent).toContain('ERASURE');
  });

  it('should NOT call logout() directly in onClick', () => {
    // Old bug: onClick={() => logout()} on the delete button
    expect(content).not.toMatch(/onClick=\{\(\)\s*=>\s*logout\(\)\}/);
  });

  it('should call handleDeleteAccount on delete button click', () => {
    expect(content).toContain('handleDeleteAccount');
  });

  it('should call the GDPR delete endpoint', () => {
    expect(content).toContain('/api/gdpr/delete-account');
  });

  it('should have isDeleting loading state in DangerZone', () => {
    // Find the DangerZone function
    const dangerZoneStart = content.indexOf('function DangerZone');
    const dangerZoneContent = content.slice(dangerZoneStart, dangerZoneStart + 2000);
    expect(dangerZoneContent).toContain('isDeleting');
    expect(dangerZoneContent).toContain('setIsDeleting');
  });

  it('should only logout AFTER successful API call', () => {
    const dangerZoneStart = content.indexOf('function DangerZone');
    const dangerZoneContent = content.slice(dangerZoneStart, dangerZoneStart + 2000);
    const fetchIdx = dangerZoneContent.indexOf('/api/gdpr/delete-account');
    const logoutIdx = dangerZoneContent.indexOf('await logout()');
    expect(fetchIdx).toBeGreaterThan(-1);
    expect(logoutIdx).toBeGreaterThan(-1);
    expect(logoutIdx).toBeGreaterThan(fetchIdx);
  });
});

// ──────────────────────────────────────────────────
// 2F: Dashboard settings — notification checkboxes controlled
// ──────────────────────────────────────────────────

describe('2F: Dashboard settings — notification checkboxes controlled', () => {
  const content = readSource('app/dashboard/settings/page.tsx');

  it('should NOT use defaultChecked in notification checkboxes', () => {
    // Find notification tab content
    const notifTabStart = content.indexOf("value='notifications'");
    const notifTabEnd = content.indexOf("value='billing'");
    const notifSection = content.slice(notifTabStart, notifTabEnd);
    expect(notifSection).not.toContain('defaultChecked');
  });

  it('should use controlled checkboxes with checked and onChange', () => {
    expect(content).toContain('checked={notifPrefs[item.key]}');
    expect(content).toContain('setNotifPrefs');
  });

  it('should have a save handler for notifications', () => {
    expect(content).toContain('handleSaveNotifications');
    expect(content).toContain('Salva Preferenze Notifiche');
  });

  it('should have notifPrefs state with all notification keys', () => {
    expect(content).toContain('newBookings');
    expect(content).toContain('appointmentReminders');
    expect(content).toContain('lowStockParts');
    expect(content).toContain('paymentsReceived');
    expect(content).toContain('customerReviews');
  });
});
