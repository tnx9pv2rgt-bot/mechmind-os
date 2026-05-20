'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, CheckCircle, XCircle, CreditCard, ShieldAlert, X, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToastNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  isRead?: boolean;
}

interface NotificationToastProps {
  notification: ToastNotification;
  onClose: () => void;
  duration?: number;
}

interface ToastContainerProps {
  notifications: ToastNotification[];
  onDismiss: (id: string) => void;
  maxVisible?: number;
}

// Icon mapping for notification types
const notificationIcons: Record<string, React.ElementType> = {
  booking_created: Calendar,
  booking_confirmed: CheckCircle,
  booking_cancelled: XCircle,
  invoice_paid: CreditCard,
  gdpr_deletion_scheduled: ShieldAlert,
  connected: Bell,
  heartbeat: Bell,
};

// Color mapping for notification types
const notificationColors: Record<string, string> = {
  booking_created: 'bg-[var(--status-info)]',
  booking_confirmed: 'bg-[var(--status-success)]',
  booking_cancelled: 'bg-[var(--status-error)]',
  invoice_paid: 'bg-[var(--status-success)]',
  gdpr_deletion_scheduled: 'bg-[var(--status-warning)]',
  connected: 'bg-[var(--surface-secondary)]0',
  heartbeat: 'bg-[var(--surface-secondary)]0',
};

// Border color mapping
const notificationBorderColors: Record<string, string> = {
  booking_created: 'border-[var(--status-info-subtle)]',
  booking_confirmed: 'border-[var(--status-success-subtle)]',
  booking_cancelled: 'border-[var(--status-error-subtle)]',
  invoice_paid: 'border-[var(--status-success)]/20',
  gdpr_deletion_scheduled: 'border-[var(--status-warning-subtle)]',
  connected: 'border-[var(--border-default)]',
  heartbeat: 'border-[var(--border-default)]',
};

// Background color mapping
const notificationBgColors: Record<string, string> = {
  booking_created: 'bg-[var(--status-info-subtle)]',
  booking_confirmed: 'bg-[var(--status-success-subtle)]',
  booking_cancelled: 'bg-[var(--status-error-subtle)]',
  invoice_paid: 'bg-[var(--status-success)]/5',
  gdpr_deletion_scheduled: 'bg-[var(--status-warning-subtle)]',
  connected: 'bg-[var(--surface-secondary)]',
  heartbeat: 'bg-[var(--surface-secondary)]',
};

/**
 * Single notification toast component with Framer Motion animations
 */
export function NotificationToast({
  notification,
  onClose,
  duration = 5000,
}: NotificationToastProps) {
  const [progress, setProgress] = useState(100);
  const Icon = notificationIcons[notification.type] || Bell;
  const colorClass = notificationColors[notification.type] || 'bg-[var(--surface-secondary)]0';
  const borderClass = notificationBorderColors[notification.type] || 'border-[var(--border-default)]';
  const bgClass = notificationBgColors[notification.type] || 'bg-[var(--surface-secondary)]';

  useEffect(() => {
    if (duration <= 0) return;

    const startTime = Date.now();
    const endTime = startTime + duration;

    const updateProgress = () => {
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);
      const percentage = (remaining / duration) * 100;

      setProgress(percentage);

      if (remaining > 0) {
        requestAnimationFrame(updateProgress);
      } else {
        onClose();
      }
    };

    const animationFrame = requestAnimationFrame(updateProgress);

    return () => cancelAnimationFrame(animationFrame);
  }, [duration, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 30,
      }}
      className={cn(
        'relative w-full max-w-sm overflow-hidden rounded-xl shadow-lg',
        'border-2 backdrop-blur-sm',
        bgClass,
        borderClass
      )}
    >
      {/* Progress bar */}
      <div className='absolute bottom-0 left-0 right-0 h-1 bg-[var(--border-default)]'>
        <motion.div
          className={cn('h-full', colorClass)}
          initial={{ width: '100%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.1, ease: 'linear' }}
        />
      </div>

      <div className='p-4'>
        <div className='flex items-start gap-3'>
          {/* Icon */}
          <div
            className={cn(
              'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
              colorClass,
              'text-[var(--text-on-brand)] shadow-md'
            )}
          >
            <Icon className='w-5 h-5' />
          </div>

          {/* Content */}
          <div className='flex-1 min-w-0'>
            <h4 className='text-sm font-semibold text-[var(--text-primary)] truncate'>{notification.title}</h4>
            <p className='text-sm text-[var(--text-secondary)] mt-0.5 line-clamp-2'>{notification.message}</p>
            <p className='text-xs text-[var(--text-tertiary)] mt-1'>
              {new Date(notification.timestamp).toLocaleTimeString('it-IT', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className='flex-shrink-0 p-1 rounded-full hover:bg-[var(--surface-primary)]/5 transition-colors'
            aria-label='Chiudi notifica'
          >
            <X className='w-4 h-4 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]' />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Toast container component that manages multiple notifications
 */
export function ToastContainer({ notifications, onDismiss, maxVisible = 5 }: ToastContainerProps) {
  // Only show unread notifications as toasts
  const visibleNotifications = notifications.filter(n => !n.isRead).slice(0, maxVisible);

  return (
    <div className='fixed bottom-4 right-4 z-50 flex flex-col gap-3 pointer-events-none'>
      <AnimatePresence mode='popLayout'>
        {visibleNotifications.map(notification => (
          <div key={notification.id} className='pointer-events-auto'>
            <NotificationToast
              notification={notification}
              onClose={() => onDismiss(notification.id)}
              duration={5000}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/**
 * Hook to manage toast notifications
 */
export function useToastNotifications(
  notifications: ToastNotification[],
  onMarkAsRead: (id: string) => void
) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Filter out dismissed notifications
  const activeToasts = notifications.filter(n => !n.isRead && !dismissedIds.has(n.id));

  const dismissToast = (id: string) => {
    setDismissedIds(prev => new Set(prev).add(id));
    onMarkAsRead(id);
  };

  const clearAllToasts = () => {
    activeToasts.forEach(toast => {
      setDismissedIds(prev => new Set(prev).add(toast.id));
      onMarkAsRead(toast.id);
    });
  };

  return {
    activeToasts,
    dismissToast,
    clearAllToasts,
  };
}

export default NotificationToast;
