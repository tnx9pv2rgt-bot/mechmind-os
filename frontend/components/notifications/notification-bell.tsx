'use client';

import { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, Wifi, WifiOff } from 'lucide-react';
import { useNotificationContext } from '@/lib/notification-context';
import { AppleCard } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { cn } from '@/lib/utils';
// Icon mapping for notification types (emoji fallback)
const notificationTypeEmojis: Record<string, string> = {
  booking_created: '📅',
  booking_confirmed: '✅',
  booking_cancelled: '❌',
  invoice_paid: '💳',
  gdpr_deletion_scheduled: '🛡️',
  connected: '🔌',
  heartbeat: '💓',
};

// Color mapping for notification types
const notificationTypeColors: Record<string, string> = {
  booking_created: 'text-[var(--status-info)] bg-[var(--status-info-subtle)]',
  booking_confirmed: 'text-[var(--status-success)] bg-[var(--status-success-subtle)]',
  booking_cancelled: 'text-[var(--status-error)] bg-[var(--status-error-subtle)]',
  invoice_paid: 'text-[var(--status-success)] bg-[var(--status-success)]/5',
  gdpr_deletion_scheduled: 'text-[var(--status-warning)] bg-[var(--status-warning)]/5',
  connected: 'text-[var(--text-secondary)] bg-[var(--surface-secondary)]',
  heartbeat: 'text-[var(--text-secondary)] bg-[var(--surface-secondary)]',
};

interface BellNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}

export function NotificationBell() {
  const ctx = useNotificationContext();
  const notifications = ctx.notifications as unknown as BellNotification[];
  const unreadCount = ctx.unreadCount;
  const markAsRead = ctx.markAsRead;
  const markAllAsRead = ctx.markAllAsRead;
  const ctxRecord = ctx as unknown as Record<string, unknown>;
  const isConnected = (ctxRecord.isConnected as boolean) ?? ctx.isRealtimeConnected ?? false;
  const reconnectAttempt = (ctxRecord.reconnectAttempt as number) ?? 0;
  const reconnect = (ctxRecord.reconnect as () => void) ?? ctx.refetch;

  const [isOpen, setIsOpen] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.notification-bell-container')) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Format relative time
  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ora';
    if (diffMins < 60) return `${diffMins}m fa`;
    if (diffHours < 24) return `${diffHours}h fa`;
    if (diffDays < 7) return `${diffDays}g fa`;
    return date.toLocaleDateString('it-IT');
  };

  return (
    <div className='notification-bell-container relative'>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'relative p-2.5 rounded-full transition-all duration-300',
          'hover:bg-[var(--surface-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-apple-blue/50',
          isOpen && 'bg-[var(--surface-secondary)]'
        )}
        aria-label='Notifiche'
      >
        <Bell
          className={cn(
            'h-5 w-5 transition-colors',
            isConnected ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'
          )}
        />

        {/* Connection status dot */}
        <span
          className={cn(
            'absolute top-1 right-1 w-2 h-2 rounded-full',
            isConnected
              ? 'bg-[var(--status-success)]'
              : reconnectAttempt > 0
                ? 'bg-[var(--status-warning)]'
                : 'bg-[var(--status-error)]'
          )}
        />

        {/* Unread count badge */}
        {unreadCount > 0 && (
          <span className='absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-[var(--status-error)] text-[var(--text-on-brand)] text-[10px] font-bold rounded-full px-1 animate-in zoom-in'>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <AppleCard className='absolute right-0 top-full mt-2 w-96 z-50 shadow-apple-lg animate-in fade-in slide-in-from-top-2'>
          {/* Header */}
          <div className='p-4 border-b border-[var(--border-default)]/30 flex items-center justify-between'>
            <div>
              <h3 className='text-body font-semibold text-[var(--text-primary)]'>Notifiche</h3>
              <div className='flex items-center gap-2 mt-0.5'>
                {isConnected ? (
                  <>
                    <Wifi className='h-3 w-3 text-[var(--status-success)]' />
                    <p className='text-footnote text-[var(--text-tertiary)]'>Connessione attiva</p>
                  </>
                ) : (
                  <>
                    <WifiOff className='h-3 w-3 text-[var(--status-error)]' />
                    <p className='text-footnote text-[var(--status-error)]'>
                      {reconnectAttempt > 0
                        ? `Riconnessione... (${reconnectAttempt})`
                        : 'Disconnesso'}
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className='flex items-center gap-1'>
              {!isConnected && (
                <AppleButton
                  variant='ghost'
                  size='sm'
                  onClick={reconnect}
                  className='text-[var(--brand)]'
                >
                  Riconnetti
                </AppleButton>
              )}
              {unreadCount > 0 && (
                <AppleButton variant='ghost' size='sm' onClick={markAllAsRead}>
                  <CheckCheck className='h-4 w-4 mr-1' />
                  Tutte
                </AppleButton>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className='max-h-[400px] overflow-y-auto'>
            {notifications.length === 0 ? (
              <div className='p-8 text-center'>
                <Bell className='h-12 w-12 text-[var(--text-tertiary)]/30 mx-auto mb-3' />
                <p className='text-body text-[var(--text-tertiary)]'>Nessuna notifica</p>
                <p className='text-footnote text-[var(--text-tertiary)]/70 mt-1'>
                  Le notifiche appariranno qui in tempo reale
                </p>
              </div>
            ) : (
              <div className='divide-y divide-apple-border/30'>
                {notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={cn(
                      'p-4 hover:bg-[var(--surface-secondary)]/30 transition-colors cursor-pointer',
                      !notification.isRead && 'bg-[var(--brand)]/5'
                    )}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className='flex items-start gap-3'>
                      {/* Type Icon */}
                      <span
                        className={cn(
                          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-lg',
                          notificationTypeColors[notification.type] || 'text-[var(--text-secondary)] bg-[var(--surface-secondary)]'
                        )}
                      >
                        {notificationTypeEmojis[notification.type] || '🔔'}
                      </span>

                      {/* Content */}
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-start justify-between gap-2'>
                          <p
                            className={cn(
                              'text-body font-medium truncate',
                              !notification.isRead && 'font-semibold text-[var(--text-primary)]'
                            )}
                          >
                            {notification.title}
                          </p>
                          <span className='text-footnote text-[var(--text-tertiary)] flex-shrink-0'>
                            {formatTime(notification.timestamp)}
                          </span>
                        </div>
                        <p className='text-footnote text-[var(--text-tertiary)] mt-0.5 line-clamp-2'>
                          {notification.message}
                        </p>
                      </div>

                      {/* Mark as read button */}
                      {!notification.isRead && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          className='flex-shrink-0 p-1.5 rounded-full hover:bg-[var(--surface-secondary)] transition-colors'
                          title='Segna come letta'
                          aria-label='Segna come letta'
                        >
                          <Check className='h-4 w-4 text-[var(--text-tertiary)]' />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className='p-3 border-t border-[var(--border-default)]/30 text-center'>
              <p className='text-footnote text-[var(--text-tertiary)]'>
                {notifications.length} notifiche totali
              </p>
            </div>
          )}
        </AppleCard>
      )}
    </div>
  );
}

export default NotificationBell;
