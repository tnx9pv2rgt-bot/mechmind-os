'use client';

/**
 * NotificationItem Component
 * Single notification display component
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  Bell,
  Calendar,
  FileText,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  MessageSquare,
  Smartphone,
  Mail,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Notification,
  NotificationType,
  NotificationStatus,
  NotificationChannel,
} from '@/types/notifications';
import { Button } from '@/components/ui/button';

// Props interface
interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead?: (id: string) => void;
  onDelete?: (id: string) => void;
  onRetry?: (id: string) => void;
  showActions?: boolean;
  compact?: boolean;
}

// Type icon mapping
const typeIcons: Record<NotificationType, React.ReactNode> = {
  [NotificationType.BOOKING_CONFIRMATION]: <Calendar className='w-5 h-5' />,
  [NotificationType.BOOKING_REMINDER]: <Clock className='w-5 h-5' />,
  [NotificationType.BOOKING_CANCELLED]: <XCircle className='w-5 h-5' />,
  [NotificationType.INVOICE_READY]: <FileText className='w-5 h-5' />,
  [NotificationType.INSPECTION_COMPLETE]: <CheckCircle className='w-5 h-5' />,
  [NotificationType.MAINTENANCE_DUE]: <AlertCircle className='w-5 h-5' />,
  [NotificationType.VEHICLE_READY]: <CheckCircle className='w-5 h-5' />,
  [NotificationType.STATUS_UPDATE]: <Bell className='w-5 h-5' />,
  [NotificationType.PAYMENT_REMINDER]: <AlertCircle className='w-5 h-5' />,
  [NotificationType.WELCOME]: <Bell className='w-5 h-5' />,
  [NotificationType.PASSWORD_RESET]: <Mail className='w-5 h-5' />,
  [NotificationType.CUSTOM]: <MessageSquare className='w-5 h-5' />,
  [NotificationType.GDPR_EXPORT_READY]: <FileText className='w-5 h-5' />,
};

// Channel icon mapping
const channelIcons: Record<NotificationChannel, React.ReactNode> = {
  [NotificationChannel.SMS]: <Smartphone className='w-4 h-4' />,
  [NotificationChannel.WHATSAPP]: <MessageSquare className='w-4 h-4' />,
  [NotificationChannel.EMAIL]: <Mail className='w-4 h-4' />,
  [NotificationChannel.BOTH]: (
    <div className='flex -space-x-1'>
      <Smartphone className='w-4 h-4' />
      <Mail className='w-4 h-4' />
    </div>
  ),
  [NotificationChannel.AUTO]: <Bell className='w-4 h-4' />,
};

// Type colors
const typeColors: Record<NotificationType, string> = {
  [NotificationType.BOOKING_CONFIRMATION]: 'bg-[var(--status-info-subtle)] text-[var(--status-info)]',
  [NotificationType.BOOKING_REMINDER]: 'bg-[var(--status-warning)]/10 text-[var(--status-warning)]',
  [NotificationType.BOOKING_CANCELLED]: 'bg-[var(--status-error-subtle)] text-[var(--status-error)]',
  [NotificationType.INVOICE_READY]: 'bg-[var(--status-success-subtle)] text-[var(--status-success)]',
  [NotificationType.INSPECTION_COMPLETE]: 'bg-[var(--status-success)]/10 text-[var(--status-success)]',
  [NotificationType.MAINTENANCE_DUE]: 'bg-[var(--status-warning)]/10 text-[var(--status-warning)]',
  [NotificationType.VEHICLE_READY]: 'bg-[var(--status-success)]/10 text-[var(--status-success)]',
  [NotificationType.STATUS_UPDATE]: 'bg-[var(--surface-secondary)] text-[var(--text-secondary)]',
  [NotificationType.PAYMENT_REMINDER]: 'bg-[var(--status-warning)]/20 text-[var(--status-warning)]',
  [NotificationType.WELCOME]: 'bg-[var(--brand)]/10 text-[var(--brand)]',
  [NotificationType.PASSWORD_RESET]: 'bg-[var(--brand)]/10 text-[var(--brand)]',
  [NotificationType.CUSTOM]: 'bg-[var(--surface-secondary)] text-[var(--text-secondary)]',
  [NotificationType.GDPR_EXPORT_READY]: 'bg-[var(--status-info)]/10 text-[var(--status-info)]',
};

// Status colors
const statusColors: Record<NotificationStatus, string> = {
  [NotificationStatus.PENDING]: 'bg-[var(--status-warning-subtle)] text-[var(--status-warning)] border-[var(--status-warning)]/30',
  [NotificationStatus.SENT]: 'bg-[var(--status-info-subtle)] text-[var(--status-info)] border-[var(--status-info)]/30',
  [NotificationStatus.DELIVERED]: 'bg-[var(--status-success-subtle)] text-[var(--status-success)] border-[var(--status-success)]/30',
  [NotificationStatus.FAILED]: 'bg-[var(--status-error-subtle)] text-[var(--status-error)] border-[var(--status-error)]/30',
  [NotificationStatus.CANCELLED]: 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] border-[var(--border-default)]',
};

// Status labels
const statusLabels: Record<NotificationStatus, string> = {
  [NotificationStatus.PENDING]: 'In attesa',
  [NotificationStatus.SENT]: 'Inviato',
  [NotificationStatus.DELIVERED]: 'Consegnato',
  [NotificationStatus.FAILED]: 'Fallito',
  [NotificationStatus.CANCELLED]: 'Annullato',
};

// Type labels
const typeLabels: Record<NotificationType, string> = {
  [NotificationType.BOOKING_CONFIRMATION]: 'Conferma Appuntamento',
  [NotificationType.BOOKING_REMINDER]: 'Promemoria',
  [NotificationType.BOOKING_CANCELLED]: 'Cancellazione',
  [NotificationType.INVOICE_READY]: 'Fattura Pronta',
  [NotificationType.INSPECTION_COMPLETE]: 'Ispezione Completata',
  [NotificationType.MAINTENANCE_DUE]: 'Manutenzione Dovuta',
  [NotificationType.VEHICLE_READY]: 'Veicolo Pronto',
  [NotificationType.STATUS_UPDATE]: 'Aggiornamento',
  [NotificationType.PAYMENT_REMINDER]: 'Promemoria Pagamento',
  [NotificationType.WELCOME]: 'Benvenuto',
  [NotificationType.PASSWORD_RESET]: 'Reset Password',
  [NotificationType.CUSTOM]: 'Personalizzato',
  [NotificationType.GDPR_EXPORT_READY]: 'Dati Pronti',
};

// Channel labels
const channelLabels: Record<NotificationChannel, string> = {
  [NotificationChannel.SMS]: 'SMS',
  [NotificationChannel.WHATSAPP]: 'WhatsApp',
  [NotificationChannel.EMAIL]: 'Email',
  [NotificationChannel.BOTH]: 'SMS + Email',
  [NotificationChannel.AUTO]: 'Auto',
};

export function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  onRetry,
  showActions = true,
  compact = false,
}: NotificationItemProps) {
  const {
    id,
    type,
    channel,
    status,
    message,
    sentAt,
    deliveredAt,
    error,
    retries,
    maxRetries,
    createdAt,
  } = notification;

  const isPending = status === NotificationStatus.PENDING;
  const isFailed = status === NotificationStatus.FAILED;
  const isDelivered = status === NotificationStatus.DELIVERED;

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      return format(new Date(dateString), 'dd MMM yyyy HH:mm', { locale: it });
    } catch {
      return dateString;
    }
  };

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'flex items-start gap-3 p-3 rounded-lg border transition-colors',
          'hover:bg-[var(--surface-secondary)]',
          isPending && 'bg-[var(--status-warning)]/10/50',
          isFailed && 'bg-[var(--status-error-subtle)]/50'
        )}
      >
        <div
          className={cn(
            'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
            typeColors[type]
          )}
        >
          {typeIcons[type]}
        </div>

        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-2'>
            <span className='font-medium text-sm text-[var(--text-primary)] truncate'>{typeLabels[type]}</span>
            <span className={cn('text-xs px-2 py-0.5 rounded-full border', statusColors[status])}>
              {statusLabels[status]}
            </span>
          </div>
          <p className='text-sm text-[var(--text-secondary)] mt-1 line-clamp-2'>{message}</p>
          <div className='flex items-center gap-3 mt-1 text-xs text-[var(--text-tertiary)]'>
            <span className='flex items-center gap-1'>
              {channelIcons[channel]}
              {channelLabels[channel]}
            </span>
            <span>{formatDate(sentAt || createdAt)}</span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex items-start gap-4 p-4 rounded-xl border transition-all',
        'hover:shadow-md hover:border-[var(--border-default)]',
        isPending && 'bg-[var(--status-warning)]/10/30 border-[var(--status-warning)]/30',
        isFailed && 'bg-[var(--status-error-subtle)]/30 border-[var(--status-error)]/30',
        isDelivered && 'bg-[var(--status-success-subtle)]/30 border-[var(--status-success)]/30'
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center',
          typeColors[type]
        )}
      >
        {typeIcons[type]}
      </div>

      {/* Content */}
      <div className='flex-1 min-w-0'>
        {/* Header */}
        <div className='flex items-start justify-between gap-2'>
          <div className='flex items-center gap-2 flex-wrap'>
            <h3 className='font-semibold text-[var(--text-primary)]'>{typeLabels[type]}</h3>
            <span className={cn('text-xs px-2 py-0.5 rounded-full border', statusColors[status])}>
              {statusLabels[status]}
            </span>
          </div>
          {showActions && (
            <div className='flex items-center gap-1'>
              {isFailed && onRetry && (
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => onRetry(id)}
                  className='h-8 w-8 text-[var(--status-warning)] hover:text-[var(--status-warning)] hover:bg-[var(--status-warning)]/10'
                  title='Riprova'
                  aria-label='Riprova invio'
                >
                  <RotateCcw className='w-4 h-4' />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => onDelete(id)}
                  className='h-8 w-8 text-[var(--status-error)] hover:text-[var(--status-error)] hover:bg-[var(--status-error-subtle)]'
                  title='Elimina'
                  aria-label='Elimina notifica'
                >
                  <Trash2 className='w-4 h-4' />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Message */}
        <p className='text-[var(--text-secondary)] mt-2 leading-relaxed'>{message}</p>

        {/* Metadata */}
        <div className='flex flex-wrap items-center gap-4 mt-3 text-sm text-[var(--text-tertiary)]'>
          <span className='flex items-center gap-1.5'>
            {channelIcons[channel]}
            {channelLabels[channel]}
          </span>
          {sentAt && (
            <span className='flex items-center gap-1.5'>
              <Clock className='w-4 h-4' />
              Inviato: {formatDate(sentAt)}
            </span>
          )}
          {deliveredAt && (
            <span className='flex items-center gap-1.5 text-[var(--status-success)]'>
              <CheckCircle className='w-4 h-4' />
              Consegnato: {formatDate(deliveredAt)}
            </span>
          )}
          {error && (
            <span className='flex items-center gap-1.5 text-[var(--status-error)]'>
              <AlertCircle className='w-4 h-4' />
              Errore: {error}
            </span>
          )}
          {retries > 0 && (
            <span className='text-[var(--status-warning)]'>
              Tentativi: {retries}/{maxRetries}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default NotificationItem;
