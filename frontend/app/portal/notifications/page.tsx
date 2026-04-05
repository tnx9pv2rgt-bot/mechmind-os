'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { toast } from 'sonner';
import {
  Bell,
  BellOff,
  Calendar,
  Wrench,
  FileText,
  Shield,
  AlertCircle,
  CheckCircle,
  MessageCircle,
  CreditCard,
  Clock,
} from 'lucide-react';
import { AppleCard, AppleCardContent } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';

interface PortalNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
  entityType: string | null;
  entityId: string | null;
  link: string | null;
}

const typeIcons: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
  booking: { icon: Calendar, color: 'text-apple-blue', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  repair: { icon: Wrench, color: 'text-apple-orange', bg: 'bg-orange-50 dark:bg-orange-900/20' },
  invoice: { icon: CreditCard, color: 'text-apple-green', bg: 'bg-green-50 dark:bg-green-900/20' },
  estimate: { icon: FileText, color: 'text-apple-purple', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  warranty: { icon: Shield, color: 'text-apple-blue', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  maintenance: { icon: Clock, color: 'text-apple-red', bg: 'bg-red-50 dark:bg-red-900/20' },
  message: { icon: MessageCircle, color: 'text-apple-blue', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  system: { icon: Bell, color: 'text-apple-gray', bg: 'bg-gray-100 dark:bg-[var(--surface-hover)]' },
};

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Adesso';
  if (diffMins < 60) return `${diffMins} min fa`;
  if (diffHours < 24) return `${diffHours} or${diffHours === 1 ? 'a' : 'e'} fa`;
  if (diffDays < 7) return `${diffDays} giorn${diffDays === 1 ? 'o' : 'i'} fa`;
  return date.toLocaleDateString('it-IT');
}

export default function PortalNotificationsPage(): React.ReactElement {
  const router = useRouter();
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const {
    data: rawData,
    error: swrError,
    isLoading,
    mutate,
  } = useSWR<{ data: PortalNotification[] }>('/api/portal/notifications', fetcher, {
    refreshInterval: 30000,
  });

  const notifications = rawData?.data || [];
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const handleMarkAllRead = async (): Promise<void> => {
    setIsMarkingAll(true);
    try {
      const res = await fetch('/api/portal/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      if (!res.ok) throw new Error('Errore');
      await mutate();
      toast.success('Tutte le notifiche segnate come lette');
    } catch {
      toast.error('Errore nell\'aggiornamento delle notifiche');
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleClick = async (notification: PortalNotification): Promise<void> => {
    // Mark as read
    if (!notification.readAt) {
      try {
        await fetch('/api/portal/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notificationIds: [notification.id] }),
        });
        await mutate();
      } catch {
        // silent fail
      }
    }

    // Navigate to linked entity
    if (notification.link) {
      router.push(notification.link);
    } else if (notification.entityType && notification.entityId) {
      const routes: Record<string, string> = {
        booking: '/portal/bookings',
        repair: '/portal/repairs',
        invoice: `/portal/invoices/${notification.entityId}`,
        estimate: `/portal/estimates/${notification.entityId}`,
        warranty: '/portal/warranty',
        maintenance: '/portal/maintenance',
        message: '/portal/messages',
      };
      const route = routes[notification.entityType];
      if (route) router.push(route);
    }
  };

  if (isLoading) {
    return (
      <div className='space-y-6'>
        <div>
          <h1 className='text-2xl font-bold text-apple-dark dark:text-[var(--text-primary)]'>Notifiche</h1>
          <p className='text-apple-gray dark:text-[var(--text-secondary)] mt-1'>
            Le tue notifiche e aggiornamenti
          </p>
        </div>
        <div className='flex items-center justify-center h-64'>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className='w-8 h-8 border-2 border-apple-blue border-t-transparent rounded-full'
          />
        </div>
      </div>
    );
  }

  if (swrError) {
    return (
      <div className='space-y-6'>
        <div>
          <h1 className='text-2xl font-bold text-apple-dark dark:text-[var(--text-primary)]'>Notifiche</h1>
        </div>
        <div className='text-center py-16'>
          <AlertCircle className='h-12 w-12 text-apple-red/40 mx-auto mb-4' />
          <p className='text-apple-gray dark:text-[var(--text-secondary)] mb-4'>
            Impossibile caricare le notifiche
          </p>
          <button onClick={() => mutate()} className='text-apple-blue hover:underline'>
            Riprova
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-bold text-apple-dark dark:text-[var(--text-primary)]'>Notifiche</h1>
          <p className='text-apple-gray dark:text-[var(--text-secondary)] mt-1'>
            {unreadCount > 0
              ? `${unreadCount} notific${unreadCount === 1 ? 'a' : 'he'} non lett${unreadCount === 1 ? 'a' : 'e'}`
              : 'Tutte le notifiche lette'}
          </p>
        </div>
        {unreadCount > 0 && (
          <AppleButton
            variant='secondary'
            size='sm'
            onClick={handleMarkAllRead}
            loading={isMarkingAll}
            icon={<CheckCircle className='h-4 w-4' />}
          >
            Segna tutte come lette
          </AppleButton>
        )}
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <AppleCard>
          <AppleCardContent className='text-center py-16'>
            <BellOff className='h-16 w-16 text-apple-gray/30 mx-auto mb-4' />
            <h3 className='text-lg font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2'>
              Nessuna notifica
            </h3>
            <p className='text-apple-gray dark:text-[var(--text-secondary)]'>
              Le notifiche relative a prenotazioni, riparazioni e fatture appariranno qui.
            </p>
          </AppleCardContent>
        </AppleCard>
      ) : (
        <div className='space-y-2'>
          {notifications.map((notification) => {
            const typeConfig = typeIcons[notification.type] || typeIcons.system;
            const Icon = typeConfig.icon;
            const isUnread = !notification.readAt;

            return (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.005 }}
                onClick={() => handleClick(notification)}
                className='cursor-pointer'
              >
                <AppleCard
                  className={`transition-all ${
                    isUnread
                      ? 'border-l-4 border-l-apple-blue bg-blue-50/30 dark:bg-blue-900/10'
                      : ''
                  }`}
                >
                  <AppleCardContent className='p-4'>
                    <div className='flex items-start gap-4'>
                      {/* Icon */}
                      <div
                        className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center ${typeConfig.bg}`}
                      >
                        <Icon className={`h-5 w-5 ${typeConfig.color}`} />
                      </div>

                      {/* Content */}
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-start justify-between gap-2'>
                          <p
                            className={`text-sm ${
                              isUnread
                                ? 'font-semibold text-apple-dark dark:text-[var(--text-primary)]'
                                : 'font-medium text-apple-gray dark:text-[var(--text-secondary)]'
                            }`}
                          >
                            {notification.title}
                          </p>
                          <span className='text-[11px] text-apple-gray dark:text-[var(--text-secondary)] flex-shrink-0'>
                            {getTimeAgo(notification.createdAt)}
                          </span>
                        </div>
                        <p className='text-sm text-apple-gray dark:text-[var(--text-secondary)] mt-0.5 line-clamp-2'>
                          {notification.message}
                        </p>
                      </div>

                      {/* Unread dot */}
                      {isUnread && (
                        <div className='w-2.5 h-2.5 rounded-full bg-apple-blue flex-shrink-0 mt-1.5' />
                      )}
                    </div>
                  </AppleCardContent>
                </AppleCard>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
