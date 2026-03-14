'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import type { UseNotificationsReturn } from '@/hooks/useNotifications';

// Extended context type with toast integration
interface NotificationContextType extends UseNotificationsReturn {
  showToasts: boolean;
  setShowToasts: (show: boolean) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
  apiUrl?: string;
  enableToasts?: boolean;
  userOnly?: boolean;
  autoReconnect?: boolean;
  enableRealtime?: boolean;
}

/**
 * Notification Provider - no-op until user is authenticated.
 * Real notification fetching happens in authenticated dashboard pages.
 */
export function NotificationProvider({
  children,
  enableToasts = false,
}: NotificationProviderProps) {
  const [showToasts, setShowToasts] = React.useState(enableToasts);

  const value: NotificationContextType = {
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    error: null,
    isRealtimeConnected: false,
    markAsRead: async () => {},
    markAllAsRead: async () => {},
    deleteNotification: async () => {},
    refetch: async () => ({ data: undefined, error: null, isError: false, isLoading: false, isSuccess: true, status: 'success' } as never),
    showToasts,
    setShowToasts,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
}

export default NotificationContext;
