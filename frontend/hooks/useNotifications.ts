/**
 * useNotifications Hook
 * React Query hooks for notification operations
 */

import * as React from 'react';
import { useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import {
  Notification,
  NotificationHistory,
  NotificationHistoryParams,
  NotificationPreferences,
  SendNotificationRequest,
  BatchNotificationRequest,
  UpdatePreferencesRequest,
  NotificationTemplate,
  PreviewTemplateRequest,
  NotificationType,
  NotificationChannel,
} from '@/types/notifications';
import {
  sendNotification,
  sendBatchNotifications,
  getNotificationHistory,
  getNotificationById,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  retryNotification,
  getNotificationPreferences,
  updateNotificationPreferences,
  getMessageTemplates,
  previewTemplate,
  sendBookingConfirmation,
  sendBookingReminder,
  sendInvoiceReady,
  sendInspectionComplete,
  sendVehicleReady,
  sendMaintenanceDue,
  NotificationServiceError,
} from '@/lib/services/notificationService.client';

// Safe window check helper
const isBrowser = typeof window !== 'undefined';

// Query keys
export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (params: NotificationHistoryParams) => [...notificationKeys.lists(), params] as const,
  details: () => [...notificationKeys.all, 'detail'] as const,
  detail: (id: string) => [...notificationKeys.details(), id] as const,
  unread: () => [...notificationKeys.all, 'unread'] as const,
  preferences: (customerId: string) =>
    [...notificationKeys.all, 'preferences', customerId] as const,
  templates: () => [...notificationKeys.all, 'templates'] as const,
};

// ==========================================
// QUERY HOOKS
// ==========================================

/**
 * Hook to fetch notification history
 */
export function useNotificationHistory(
  params: NotificationHistoryParams = {},
  options?: Omit<
    UseQueryOptions<NotificationHistory, NotificationServiceError>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery(
    notificationKeys.list(params),
    () => getNotificationHistory(params as unknown as Parameters<typeof getNotificationHistory>[0]),
    options as Record<string, unknown>
  );
}

/**
 * Hook to fetch a single notification
 */
export function useNotification(
  id: string,
  options?: Omit<UseQueryOptions<Notification, NotificationServiceError>, 'queryKey' | 'queryFn'>
) {
  return useQuery(notificationKeys.detail(id), () => getNotificationById(id), {
    enabled: !!id,
    ...(options as Record<string, unknown>),
  });
}

/**
 * Hook to fetch unread count
 */
export function useUnreadCount(
  options?: Omit<UseQueryOptions<number, NotificationServiceError>, 'queryKey' | 'queryFn'>
) {
  return useQuery(
    notificationKeys.unread(),
    () => getUnreadCount(),
    options as Record<string, unknown>
  );
}

/**
 * Hook to fetch notification preferences
 */
export function useNotificationPreferences(
  customerId: string,
  options?: Omit<
    UseQueryOptions<NotificationPreferences, NotificationServiceError>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery(
    notificationKeys.preferences(customerId),
    () => getNotificationPreferences(customerId),
    {
      enabled: !!customerId,
      ...(options as Record<string, unknown>),
    }
  );
}

/**
 * Hook to fetch message templates
 */
export function useMessageTemplates(
  options?: Omit<
    UseQueryOptions<NotificationTemplate[], NotificationServiceError>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery(
    notificationKeys.templates(),
    () => getMessageTemplates(),
    options as Record<string, unknown>
  );
}

// ==========================================
// MUTATION HOOKS
// ==========================================

/**
 * Hook to send a notification
 */
export function useSendNotification() {
  const queryClient = useQueryClient();

  return useMutation(sendNotification, {
    onSuccess: () => {
      queryClient.invalidateQueries(notificationKeys.lists());
      queryClient.invalidateQueries(notificationKeys.unread());
    },
  });
}

/**
 * Hook to send batch notifications
 */
export function useSendBatchNotifications() {
  const queryClient = useQueryClient();

  return useMutation(sendBatchNotifications, {
    onSuccess: () => {
      queryClient.invalidateQueries(notificationKeys.lists());
      queryClient.invalidateQueries(notificationKeys.unread());
    },
  });
}

/**
 * Hook to mark notification as read
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation(markAsRead, {
    onSuccess: () => {
      queryClient.invalidateQueries(notificationKeys.lists());
      queryClient.invalidateQueries(notificationKeys.unread());
    },
  });
}

/**
 * Hook to mark all notifications as read
 */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation(markAllAsRead, {
    onSuccess: () => {
      queryClient.invalidateQueries(notificationKeys.lists());
      queryClient.invalidateQueries(notificationKeys.unread());
    },
  });
}

/**
 * Hook to delete a notification
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation(deleteNotification, {
    onSuccess: () => {
      queryClient.invalidateQueries(notificationKeys.lists());
      queryClient.invalidateQueries(notificationKeys.unread());
    },
  });
}

/**
 * Hook to retry a failed notification
 */
export function useRetryNotification() {
  const queryClient = useQueryClient();

  return useMutation(retryNotification, {
    onSuccess: () => {
      queryClient.invalidateQueries(notificationKeys.lists());
    },
  });
}

/**
 * Hook to update notification preferences
 */
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation(updateNotificationPreferences, {
    onSuccess: (_, variables: { customerId: string }) => {
      queryClient.invalidateQueries(notificationKeys.preferences(variables.customerId));
    },
  });
}

// ==========================================
// INTEGRATION HOOKS (Auto-send triggers)
// ==========================================

/**
 * Hook for booking-related notifications
 */
export function useBookingNotifications() {
  const queryClient = useQueryClient();

  const sendConfirmation = useMutation(
    ({
      customerId,
      data,
      channel,
    }: {
      customerId: string;
      data: Parameters<typeof sendBookingConfirmation>[1];
      channel?: NotificationChannel;
    }) => sendBookingConfirmation(customerId, data, channel),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(notificationKeys.lists());
      },
    }
  );

  const sendReminder = useMutation(
    ({
      customerId,
      data,
      channel,
    }: {
      customerId: string;
      data: Parameters<typeof sendBookingReminder>[1];
      channel?: NotificationChannel;
    }) => sendBookingReminder(customerId, data, channel),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(notificationKeys.lists());
      },
    }
  );

  return {
    sendConfirmation,
    sendReminder,
  };
}

/**
 * Hook for invoice notifications
 */
export function useInvoiceNotifications() {
  const queryClient = useQueryClient();

  return useMutation(
    ({
      customerId,
      data,
      channel,
    }: {
      customerId: string;
      data: Parameters<typeof sendInvoiceReady>[1];
      channel?: NotificationChannel;
    }) => sendInvoiceReady(customerId, data, channel),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(notificationKeys.lists());
      },
    }
  );
}

/**
 * Hook for inspection notifications
 */
export function useInspectionNotifications() {
  const queryClient = useQueryClient();

  return useMutation(
    ({
      customerId,
      data,
      channel,
    }: {
      customerId: string;
      data: Parameters<typeof sendInspectionComplete>[1];
      channel?: NotificationChannel;
    }) => sendInspectionComplete(customerId, data, channel),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(notificationKeys.lists());
      },
    }
  );
}

/**
 * Hook for vehicle ready notifications
 */
export function useVehicleReadyNotifications() {
  const queryClient = useQueryClient();

  return useMutation(
    ({
      customerId,
      data,
      channel,
    }: {
      customerId: string;
      data: Parameters<typeof sendVehicleReady>[1];
      channel?: NotificationChannel;
    }) => sendVehicleReady(customerId, data, channel),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(notificationKeys.lists());
      },
    }
  );
}

/**
 * Hook for maintenance notifications
 */
export function useMaintenanceNotifications() {
  const queryClient = useQueryClient();

  return useMutation(
    ({
      customerId,
      data,
      channel,
    }: {
      customerId: string;
      data: Parameters<typeof sendMaintenanceDue>[1];
      channel?: NotificationChannel;
    }) => sendMaintenanceDue(customerId, data, channel),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(notificationKeys.lists());
      },
    }
  );
}

// ==========================================
// REAL-TIME HOOKS
// ==========================================

/**
 * Hook for SSE real-time notifications
 * Only runs on client-side to prevent hydration errors
 */
export function useRealtimeNotifications(onNotification?: (notification: Notification) => void) {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Connect to SSE endpoint - only in browser
  const connect = useCallback(
    (userId: string, tenantId: string) => {
      // Guard: Only run in browser environment
      if (!isBrowser) {
        return () => {};
      }

      // Close existing connection if any
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      // Clear any pending reconnect
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      try {
        const eventSource = new EventSource(
          `/api/notifications/sse?userId=${encodeURIComponent(userId)}&tenantId=${encodeURIComponent(tenantId)}`
        );

        eventSourceRef.current = eventSource;

        eventSource.onmessage = event => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'notification:new') {
              // Invalidate queries to refresh data
              queryClient.invalidateQueries(notificationKeys.lists());
              queryClient.invalidateQueries(notificationKeys.unread());

              // Call callback if provided
              onNotification?.(data);
            }
          } catch (error) {
            console.error('Error parsing SSE message:', error);
          }
        };

        eventSource.onerror = error => {
          console.error('SSE error:', error);
          eventSource.close();
          eventSourceRef.current = null;

          // Attempt to reconnect after 5 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isBrowser) {
              connect(userId, tenantId);
            }
          }, 5000);
        };

        eventSource.onopen = () => {
          // SSE connected successfully
        };

        return () => {
          eventSource.close();
          eventSourceRef.current = null;
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
        };
      } catch (error) {
        console.error('Failed to create EventSource:', error);
        return () => {};
      }
    },
    [queryClient, onNotification]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return { connect };
}

// ==========================================
// UTILITIES
// ==========================================

/**
 * Hook to prefetch notification data
 */
export function usePrefetchNotifications() {
  const queryClient = useQueryClient();

  const prefetchNotification = async (id: string) => {
    await queryClient.prefetchQuery(notificationKeys.detail(id), () => getNotificationById(id));
  };

  const prefetchHistory = async (params: NotificationHistoryParams = {}) => {
    await queryClient.prefetchQuery(notificationKeys.list(params), () =>
      getNotificationHistory(params as unknown as Parameters<typeof getNotificationHistory>[0])
    );
  };

  return {
    prefetchNotification,
    prefetchHistory,
  };
}

// ==========================================
// MAIN useNotifications HOOK
// ==========================================

export interface UseNotificationsOptions {
  apiUrl?: string;
  userOnly?: boolean;
  autoReconnect?: boolean;
  onNotification?: (notification: Notification) => void;
  userId?: string;
  tenantId?: string;
  enableRealtime?: boolean;
}

export interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: Error | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  refetch: () => void;
  isRealtimeConnected: boolean;
}

/**
 * Main notifications hook that combines all notification functionality
 * Safe for SSR - all client-side effects are guarded
 */
function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsReturn {
  const { userOnly = false, onNotification, userId, tenantId, enableRealtime = false } = options;

  const [isRealtimeConnected, setIsRealtimeConnected] = React.useState(false);

  // Only fetch notifications if user is authenticated (has userId/tenantId)
  const isAuthenticated = !!userId && !!tenantId;

  // Get notification history
  const {
    data: historyData,
    isLoading,
    error,
    refetch,
  } = useNotificationHistory(
    {},
    {
      enabled: isAuthenticated,
    }
  );

  // Get unread count
  const { data: unreadCountData } = useUnreadCount({
    enabled: isAuthenticated,
  });

  // Get mutations
  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();
  const deleteNotificationMutation = useDeleteNotification();

  // Setup real-time notifications
  const { connect } = useRealtimeNotifications(onNotification);

  // Connect to SSE on mount (client-side only) - with proper guards
  useEffect(() => {
    // Only connect if explicitly enabled and we have required IDs
    if (!enableRealtime || !userId || !tenantId) {
      return;
    }

    // Additional guard: ensure we're in browser
    if (!isBrowser) {
      return;
    }

    setIsRealtimeConnected(true);
    const disconnect = connect(userId, tenantId);

    return () => {
      disconnect();
      setIsRealtimeConnected(false);
    };
  }, [connect, userId, tenantId, enableRealtime]);

  const historyRecord = historyData as unknown as Record<string, unknown> | undefined;
  const notifications = (historyRecord?.notifications || []) as unknown as Notification[];
  const unreadCount = (unreadCountData as number) || 0;

  return {
    notifications,
    unreadCount,
    isLoading,
    error: (error as Error) || null,
    markAsRead: async (id: string) => {
      await markAsReadMutation.mutateAsync(id);
    },
    markAllAsRead: async () => {
      await markAllAsReadMutation.mutateAsync(undefined);
    },
    deleteNotification: async (id: string) => {
      await deleteNotificationMutation.mutateAsync(id);
    },
    refetch,
    isRealtimeConnected,
  };
}

export default useNotifications;
