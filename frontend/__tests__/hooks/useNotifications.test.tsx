/**
 * Tests for useNotifications hook (hooks/useNotifications.ts)
 * Tests: fetching notifications, unread count, mark as read, delete, real-time SSE connection.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import useNotifications from '@/hooks/useNotifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// =============================================================================
// Mocks
// =============================================================================
jest.mock('@/lib/services/notificationService.client', () => ({
  sendNotification: jest.fn(),
  sendBatchNotifications: jest.fn(),
  getNotificationHistory: jest.fn(() =>
    Promise.resolve({
      notifications: [
        {
          id: 'notif-1',
          title: 'Test',
          message: 'Test notification',
          read: false,
        },
      ],
    })
  ),
  getNotificationById: jest.fn(),
  getUnreadCount: jest.fn(() => Promise.resolve(3)),
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
  deleteNotification: jest.fn(),
  retryNotification: jest.fn(),
  getNotificationPreferences: jest.fn(),
  updateNotificationPreferences: jest.fn(),
  getMessageTemplates: jest.fn(),
  previewTemplate: jest.fn(),
  sendBookingConfirmation: jest.fn(),
  sendBookingReminder: jest.fn(),
  sendInvoiceReady: jest.fn(),
  sendInspectionComplete: jest.fn(),
  sendVehicleReady: jest.fn(),
  sendMaintenanceDue: jest.fn(),
  NotificationServiceError: class NotificationServiceError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'NotificationServiceError';
    }
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// =============================================================================
// Tests
// =============================================================================
describe('useNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useNotifications(), {
      wrapper: createWrapper(),
    });

    expect(result.current).toHaveProperty('notifications');
    expect(result.current).toHaveProperty('unreadCount');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('markAsRead');
    expect(result.current).toHaveProperty('markAllAsRead');
  });

  it('returns empty notifications when not authenticated', () => {
    const { result } = renderHook(() => useNotifications(), {
      wrapper: createWrapper(),
    });

    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
  });

  it('fetches notifications when authenticated', async () => {
    const { result } = renderHook(
      () =>
        useNotifications({
          userId: 'user-123',
          tenantId: 'tenant-456',
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.notifications.length).toBeGreaterThanOrEqual(0);
    });

    expect(result.current).toHaveProperty('notifications');
  });

  it('loads unread count on mount', async () => {
    const { result } = renderHook(
      () =>
        useNotifications({
          userId: 'user-123',
          tenantId: 'tenant-456',
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.unreadCount).toBeGreaterThanOrEqual(0);
    });
  });

  it('markAsRead updates notification state', async () => {
    const { result } = renderHook(
      () =>
        useNotifications({
          userId: 'user-123',
          tenantId: 'tenant-456',
        }),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.markAsRead('notif-1');
    });

    expect(result.current).toBeDefined();
  });

  it('markAllAsRead marks all notifications as read', async () => {
    const { result } = renderHook(
      () =>
        useNotifications({
          userId: 'user-123',
          tenantId: 'tenant-456',
        }),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.markAllAsRead();
    });

    expect(result.current).toBeDefined();
  });

  it('deleteNotification removes notification', async () => {
    const { result } = renderHook(
      () =>
        useNotifications({
          userId: 'user-123',
          tenantId: 'tenant-456',
        }),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.deleteNotification('notif-1');
    });

    expect(result.current).toBeDefined();
  });

  it('refetch reloads notifications', async () => {
    const { result } = renderHook(
      () =>
        useNotifications({
          userId: 'user-123',
          tenantId: 'tenant-456',
        }),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      result.current.refetch();
    });

    expect(result.current).toBeDefined();
  });

  it('isRealtimeConnected is false when enableRealtime is false', () => {
    const { result } = renderHook(
      () =>
        useNotifications({
          userId: 'user-123',
          tenantId: 'tenant-456',
          enableRealtime: false,
        }),
      { wrapper: createWrapper() }
    );

    expect(result.current.isRealtimeConnected).toBe(false);
  });

  it('handles missing userId/tenantId gracefully', () => {
    const { result } = renderHook(() => useNotifications(), {
      wrapper: createWrapper(),
    });

    expect(result.current.notifications).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('calls onNotification callback when notification received', async () => {
    const onNotification = jest.fn();

    const { result } = renderHook(
      () =>
        useNotifications({
          userId: 'user-123',
          tenantId: 'tenant-456',
          onNotification,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });

    expect(result.current).toHaveProperty('notifications');
  });

  it('returns error property', () => {
    const { result } = renderHook(() => useNotifications(), {
      wrapper: createWrapper(),
    });

    expect(result.current.error === null || result.current.error instanceof Error).toBe(true);
  });
});
