'use client';

import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import useNotifications, { 
  Notification, 
  UseNotificationsOptions,
  UseNotificationsReturn 
} from '@/hooks/useNotifications';
import { useToast } from '@/components/ui/use-toast';

// Extended context type with toast integration
interface NotificationContextType extends UseNotificationsReturn {
  /** Show toast for new notifications */
  showToasts: boolean;
  /** Enable/disable toasts */
  setShowToasts: (show: boolean) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
  /** SSE API URL */
  apiUrl?: string;
  /** Enable toast notifications */
  enableToasts?: boolean;
  /** Filter to user-only notifications */
  userOnly?: boolean;
  /** Auto reconnect on connection loss - DISABLED for demo */
  autoReconnect?: boolean;
  /** Enable SSE real-time connection - DISABLED by default for demo */
  enableRealtime?: boolean;
}

/**
 * Notification Provider Component
 * 
 * Wraps the application to provide notifications.
 * SSE is disabled by default to prevent connection errors.
 * 
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <NotificationProvider enableToasts={false}>
 *       <AppContent />
 *     </NotificationProvider>
 *   );
 * }
 * ```
 */
export function NotificationProvider({
  children,
  apiUrl = '',
  enableToasts = false,  // Disabled by default
  userOnly = false,
  autoReconnect = false,  // Disabled for demo
  enableRealtime = false,  // Disabled for demo - prevents SSE errors
}: NotificationProviderProps) {
  const { toast } = useToast();
  const [showToasts, setShowToasts] = React.useState(enableToasts);

  // Handle new notifications with toast
  const handleNotification = useCallback((notification: Notification) => {
    if (!showToasts) return;

    // Map notification types to toast variants
    const variantMap: Record<string, 'default' | 'success' | 'error' | 'warning' | 'info'> = {
      booking_created: 'info',
      booking_confirmed: 'success',
      booking_cancelled: 'error',
      invoice_paid: 'success',
      gdpr_deletion_scheduled: 'warning',
    };

    toast({
      title: notification.title,
      description: notification.message,
      variant: variantMap[notification.type] || 'default',
    });
  }, [showToasts, toast]);

  const notificationOptions: UseNotificationsOptions = {
    apiUrl,
    userOnly,
    autoReconnect,
    enableRealtime,  // Disabled by default
    onNotification: handleNotification,
  };

  const notifications = useNotifications(notificationOptions);

  const value: NotificationContextType = {
    ...notifications,
    showToasts,
    setShowToasts,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

/**
 * Hook to access notification context
 * Must be used within a NotificationProvider
 * 
 * @example
 * ```tsx
 * function Header() {
 *   const { notifications, unreadCount, isConnected } = useNotificationContext();
 *   return <NotificationBell count={unreadCount} />;
 * }
 * ```
 */
export function useNotificationContext(): NotificationContextType {
  const context = useContext(NotificationContext);
  
  if (context === undefined) {
    throw new Error(
      'useNotificationContext must be used within a NotificationProvider'
    );
  }
  
  return context;
}

export default NotificationContext;
