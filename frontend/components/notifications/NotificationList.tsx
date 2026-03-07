/**
 * NotificationList Component
 * List component with filters and pagination
 */

'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Search,
  Inbox,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Notification,
  NotificationType,
  NotificationStatus,
  NotificationChannel,
  NotificationFilters,
} from '@/types/notifications';
import {
  getNotificationHistory,
  deleteNotification,
  retryNotification,
} from '@/lib/services/notificationService';
import { NotificationItem } from './NotificationItem';

// Props interface
interface NotificationListProps {
  customerId?: string;
  title?: string;
  showFilters?: boolean;
  compact?: boolean;
  pageSize?: number;
}

// Filter options
const typeOptions = [
  { value: 'all', label: 'Tutti i tipi' },
  { value: NotificationType.BOOKING_CONFIRMATION, label: 'Conferma Appuntamento' },
  { value: NotificationType.BOOKING_REMINDER, label: 'Promemoria' },
  { value: NotificationType.INVOICE_READY, label: 'Fattura' },
  { value: NotificationType.INSPECTION_COMPLETE, label: 'Ispezione' },
  { value: NotificationType.VEHICLE_READY, label: 'Veicolo Pronto' },
  { value: NotificationType.MAINTENANCE_DUE, label: 'Manutenzione' },
];

const statusOptions = [
  { value: 'all', label: 'Tutti gli stati' },
  { value: NotificationStatus.PENDING, label: 'In attesa' },
  { value: NotificationStatus.SENT, label: 'Inviato' },
  { value: NotificationStatus.DELIVERED, label: 'Consegnato' },
  { value: NotificationStatus.FAILED, label: 'Fallito' },
];

const channelOptions = [
  { value: 'all', label: 'Tutti i canali' },
  { value: NotificationChannel.SMS, label: 'SMS' },
  { value: NotificationChannel.WHATSAPP, label: 'WhatsApp' },
  { value: NotificationChannel.EMAIL, label: 'Email' },
];

export function NotificationList({
  customerId,
  title = 'Notifiche',
  showFilters = true,
  compact = false,
  pageSize = 10,
}: NotificationListProps) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<NotificationFilters>({});
  const [searchQuery, setSearchQuery] = useState('');

  // Build query params
  const queryParams = {
    customerId,
    page,
    limit: pageSize,
    type: filters.type?.[0],
    status: filters.status?.[0],
    channel: filters.channel?.[0],
  };

  // Fetch notifications
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['notifications', queryParams],
    queryFn: () => getNotificationHistory(queryParams),
    enabled: !customerId || !!customerId,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Retry mutation
  const retryMutation = useMutation({
    mutationFn: retryNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Handle filter change
  const handleFilterChange = useCallback(
    (key: keyof NotificationFilters, value: string | string[]) => {
      setPage(1);
      setFilters((prev) => ({
        ...prev,
        [key]: value === 'all' ? undefined : Array.isArray(value) ? value : [value],
      }));
    },
    []
  );

  // Handle search
  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
    setPage(1);
  }, []);

  // Filter notifications by search query
  const filteredNotifications =
    data?.notifications.filter((notification) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        notification.message.toLowerCase().includes(query) ||
        notification.type.toLowerCase().includes(query)
      );
    }) || [];

  // Pagination
  const totalPages = data?.pagination.totalPages || 1;
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {title && <h2 className="text-lg font-semibold text-gray-900">{title}</h2>}
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-24 bg-gray-100 animate-pulse rounded-xl"
            />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Errore nel caricamento
        </h3>
        <p className="text-gray-600 mb-4">
          Impossibile caricare le notifiche. Riprova più tardi.
        </p>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Riprova
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => refetch()}
          className="h-8 w-8"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Cerca notifiche..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={filters.type?.[0] || 'all'}
            onValueChange={(value) => handleFilterChange('type', value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.status?.[0] || 'all'}
            onValueChange={(value) => handleFilterChange('status', value)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Stato" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.channel?.[0] || 'all'}
            onValueChange={(value) => handleFilterChange('channel', value)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Canale" />
            </SelectTrigger>
            <SelectContent>
              {channelOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Notification List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onDelete={deleteMutation.mutate}
                onRetry={retryMutation.mutate}
                compact={compact}
              />
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                Nessuna notifica
              </h3>
              <p className="text-gray-500">
                Non ci sono notifiche da visualizzare.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-gray-500">
            Pagina {page} di {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={!hasPrevPage}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Precedente
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasNextPage}
            >
              Successiva
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationList;
