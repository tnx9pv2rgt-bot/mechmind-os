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
  [NotificationType.BOOKING_CONFIRMATION]: <Calendar className="w-5 h-5" />,
  [NotificationType.BOOKING_REMINDER]: <Clock className="w-5 h-5" />,
  [NotificationType.BOOKING_CANCELLED]: <XCircle className="w-5 h-5" />,
  [NotificationType.INVOICE_READY]: <FileText className="w-5 h-5" />,
  [NotificationType.INSPECTION_COMPLETE]: <CheckCircle className="w-5 h-5" />,
  [NotificationType.MAINTENANCE_DUE]: <AlertCircle className="w-5 h-5" />,
  [NotificationType.VEHICLE_READY]: <CheckCircle className="w-5 h-5" />,
  [NotificationType.STATUS_UPDATE]: <Bell className="w-5 h-5" />,
  [NotificationType.PAYMENT_REMINDER]: <AlertCircle className="w-5 h-5" />,
  [NotificationType.WELCOME]: <Bell className="w-5 h-5" />,
  [NotificationType.PASSWORD_RESET]: <Mail className="w-5 h-5" />,
  [NotificationType.CUSTOM]: <MessageSquare className="w-5 h-5" />,
  [NotificationType.GDPR_EXPORT_READY]: <FileText className="w-5 h-5" />,
};

// Channel icon mapping
const channelIcons: Record<NotificationChannel, React.ReactNode> = {
  [NotificationChannel.SMS]: <Smartphone className="w-4 h-4" />,
  [NotificationChannel.WHATSAPP]: <MessageSquare className="w-4 h-4" />,
  [NotificationChannel.EMAIL]: <Mail className="w-4 h-4" />,
  [NotificationChannel.BOTH]: (
    <div className="flex -space-x-1">
      <Smartphone className="w-4 h-4" />
      <Mail className="w-4 h-4" />
    </div>
  ),
  [NotificationChannel.AUTO]: <Bell className="w-4 h-4" />,
};

// Type colors
const typeColors: Record<NotificationType, string> = {
  [NotificationType.BOOKING_CONFIRMATION]: 'bg-blue-100 text-blue-600',
  [NotificationType.BOOKING_REMINDER]: 'bg-amber-100 text-amber-600',
  [NotificationType.BOOKING_CANCELLED]: 'bg-red-100 text-red-600',
  [NotificationType.INVOICE_READY]: 'bg-green-100 text-green-600',
  [NotificationType.INSPECTION_COMPLETE]: 'bg-emerald-100 text-emerald-600',
  [NotificationType.MAINTENANCE_DUE]: 'bg-orange-100 text-orange-600',
  [NotificationType.VEHICLE_READY]: 'bg-teal-100 text-teal-600',
  [NotificationType.STATUS_UPDATE]: 'bg-gray-100 text-gray-600',
  [NotificationType.PAYMENT_REMINDER]: 'bg-yellow-100 text-yellow-600',
  [NotificationType.WELCOME]: 'bg-purple-100 text-purple-600',
  [NotificationType.PASSWORD_RESET]: 'bg-indigo-100 text-indigo-600',
  [NotificationType.CUSTOM]: 'bg-slate-100 text-slate-600',
  [NotificationType.GDPR_EXPORT_READY]: 'bg-cyan-100 text-cyan-600',
};

// Status colors
const statusColors: Record<NotificationStatus, string> = {
  [NotificationStatus.PENDING]: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  [NotificationStatus.SENT]: 'bg-blue-100 text-blue-700 border-blue-200',
  [NotificationStatus.DELIVERED]: 'bg-green-100 text-green-700 border-green-200',
  [NotificationStatus.FAILED]: 'bg-red-100 text-red-700 border-red-200',
  [NotificationStatus.CANCELLED]: 'bg-gray-100 text-gray-700 border-gray-200',
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
          'hover:bg-gray-50',
          isPending && 'bg-yellow-50/50',
          isFailed && 'bg-red-50/50'
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

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-gray-900 truncate">
              {typeLabels[type]}
            </span>
            <span
              className={cn(
                'text-xs px-2 py-0.5 rounded-full border',
                statusColors[status]
              )}
            >
              {statusLabels[status]}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{message}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
            <span className="flex items-center gap-1">
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
        'hover:shadow-md hover:border-gray-300',
        isPending && 'bg-yellow-50/30 border-yellow-200',
        isFailed && 'bg-red-50/30 border-red-200',
        isDelivered && 'bg-green-50/30 border-green-200'
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
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900">{typeLabels[type]}</h3>
            <span
              className={cn(
                'text-xs px-2 py-0.5 rounded-full border',
                statusColors[status]
              )}
            >
              {statusLabels[status]}
            </span>
          </div>
          {showActions && (
            <div className="flex items-center gap-1">
              {isFailed && onRetry && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRetry(id)}
                  className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-100"
                  title="Riprova"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(id)}
                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100"
                  title="Elimina"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Message */}
        <p className="text-gray-700 mt-2 leading-relaxed">{message}</p>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
          <span className="flex items-center gap-1.5">
            {channelIcons[channel]}
            {channelLabels[channel]}
          </span>
          {sentAt && (
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              Inviato: {formatDate(sentAt)}
            </span>
          )}
          {deliveredAt && (
            <span className="flex items-center gap-1.5 text-green-600">
              <CheckCircle className="w-4 h-4" />
              Consegnato: {formatDate(deliveredAt)}
            </span>
          )}
          {error && (
            <span className="flex items-center gap-1.5 text-red-600">
              <AlertCircle className="w-4 h-4" />
              Errore: {error}
            </span>
          )}
          {retries > 0 && (
            <span className="text-amber-600">
              Tentativi: {retries}/{maxRetries}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default NotificationItem;
