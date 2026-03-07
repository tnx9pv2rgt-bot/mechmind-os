'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  MessageSquare, 
  Phone, 
  Mail, 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw,
  Trash2,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  Send
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';

interface Notification {
  id: string;
  customerId: string;
  type: string;
  channel: 'SMS' | 'WHATSAPP' | 'EMAIL';
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'READ';
  message: string;
  messageId?: string;
  sentAt?: string;
  deliveredAt?: string;
  failedAt?: string;
  error?: string;
  retries: number;
  maxRetries: number;
  metadata?: Record<string, any>;
  createdAt: string;
}

interface NotificationHistoryProps {
  customerId?: string;
  limit?: number;
}

const channelIcons = {
  SMS: Phone,
  WHATSAPP: MessageSquare,
  EMAIL: Mail,
};

const statusConfig = {
  PENDING: { color: 'bg-yellow-500', icon: Clock, label: 'In attesa' },
  SENT: { color: 'bg-blue-500', icon: Send, label: 'Inviato' },
  DELIVERED: { color: 'bg-green-500', icon: CheckCircle, label: 'Consegnato' },
  FAILED: { color: 'bg-red-500', icon: XCircle, label: 'Fallito' },
  READ: { color: 'bg-purple-500', icon: CheckCircle, label: 'Letto' },
};

const typeLabels: Record<string, string> = {
  BOOKING_REMINDER: 'Promemoria',
  BOOKING_CONFIRMATION: 'Conferma',
  STATUS_UPDATE: 'Aggiornamento',
  INVOICE_READY: 'Fattura',
  MAINTENANCE_DUE: 'Manutenzione',
  INSPECTION_COMPLETE: 'Ispezione',
  PAYMENT_REMINDER: 'Pagamento',
};

export function NotificationHistory({ customerId, limit = 50 }: NotificationHistoryProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);

  // Fetch notifications
  const { data, isLoading, error } = useQuery({
    queryKey: ['notifications', customerId, filterType, filterStatus, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (customerId) params.append('customerId', customerId);
      if (filterType) params.append('type', filterType);
      if (filterStatus) params.append('status', filterStatus);
      params.append('limit', limit.toString());
      params.append('offset', (page * limit).toString());

      const response = await fetch(`/api/notifications?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch notifications');
      return response.json();
    },
  });

  // Retry mutation
  const retryMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry' }),
      });
      if (!response.ok) throw new Error('Failed to retry notification');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({ title: 'Successo', description: 'Notifica reinviata' });
    },
    onError: () => {
      toast({ title: 'Errore', description: 'Impossibile reinviare la notifica', variant: 'destructive' });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete notification');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({ title: 'Successo', description: 'Notifica eliminata' });
    },
    onError: () => {
      toast({ title: 'Errore', description: 'Impossibile eliminare la notifica', variant: 'destructive' });
    },
  });

  const notifications = data?.notifications || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const filteredNotifications = notifications.filter((n: Notification) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        n.message.toLowerCase().includes(query) ||
        n.type.toLowerCase().includes(query) ||
        n.status.toLowerCase().includes(query)
      );
    }
    return true;
  });

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-500">
            Errore nel caricamento delle notifiche
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Cronologia Notifiche</span>
          <Badge variant="secondary">{total} totali</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cerca notifiche..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tutti i tipi</SelectItem>
              {Object.entries(typeLabels).map(([type, label]) => (
                <SelectItem key={type} value={type}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Stato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tutti gli stati</SelectItem>
              <SelectItem value="PENDING">In attesa</SelectItem>
              <SelectItem value="SENT">Inviato</SelectItem>
              <SelectItem value="DELIVERED">Consegnato</SelectItem>
              <SelectItem value="FAILED">Fallito</SelectItem>
              <SelectItem value="READ">Letto</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Notifications List */}
        <div className="space-y-2">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              Caricamento...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nessuna notifica trovata
            </div>
          ) : (
            filteredNotifications.map((notification: Notification) => {
              const ChannelIcon = channelIcons[notification.channel];
              const statusConfigItem = statusConfig[notification.status];
              const StatusIcon = statusConfigItem.icon;

              return (
                <div
                  key={notification.id}
                  className="flex items-start gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedNotification(notification)}
                >
                  <div className="flex flex-col items-center gap-1">
                    <ChannelIcon className="h-5 w-5 text-gray-500" />
                    <StatusIcon className={`h-4 w-4 ${statusConfigItem.color.replace('bg-', 'text-')}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {typeLabels[notification.type] || notification.type}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {format(parseISO(notification.createdAt), 'dd/MM/yyyy HH:mm', { locale: it })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 truncate">
                      {notification.message}
                    </p>
                    {notification.error && (
                      <p className="text-xs text-red-500 mt-1">
                        Errore: {notification.error}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {notification.status === 'FAILED' && notification.retries < notification.maxRetries && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          retryMutation.mutate(notification.id);
                        }}
                        disabled={retryMutation.isPending}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMutation.mutate(notification.id);
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Precedente
            </Button>
            <span className="text-sm text-gray-500">
              Pagina {page + 1} di {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Successiva
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>

      {/* Detail Dialog */}
      <Dialog open={!!selectedNotification} onOpenChange={() => setSelectedNotification(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Dettaglio Notifica</DialogTitle>
            <DialogDescription>
              Informazioni complete sulla notifica inviata
            </DialogDescription>
          </DialogHeader>
          {selectedNotification && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">ID:</span>
                  <p className="font-mono">{selectedNotification.id}</p>
                </div>
                <div>
                  <span className="text-gray-500">Tipo:</span>
                  <p>{typeLabels[selectedNotification.type] || selectedNotification.type}</p>
                </div>
                <div>
                  <span className="text-gray-500">Canale:</span>
                  <p className="flex items-center gap-1">
                    {React.createElement(channelIcons[selectedNotification.channel], { className: 'h-4 w-4' })}
                    {selectedNotification.channel}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Stato:</span>
                  <Badge className={statusConfig[selectedNotification.status].color}>
                    {statusConfig[selectedNotification.status].label}
                  </Badge>
                </div>
                <div>
                  <span className="text-gray-500">Tentativi:</span>
                  <p>{selectedNotification.retries} / {selectedNotification.maxRetries}</p>
                </div>
                {selectedNotification.messageId && (
                  <div>
                    <span className="text-gray-500">Message ID:</span>
                    <p className="font-mono text-xs">{selectedNotification.messageId}</p>
                  </div>
                )}
              </div>
              <div>
                <span className="text-gray-500">Messaggio:</span>
                <p className="mt-1 p-3 bg-gray-50 rounded text-sm whitespace-pre-wrap">
                  {selectedNotification.message}
                </p>
              </div>
              {selectedNotification.metadata && Object.keys(selectedNotification.metadata).length > 0 && (
                <div>
                  <span className="text-gray-500">Metadati:</span>
                  <pre className="mt-1 p-3 bg-gray-50 rounded text-xs overflow-auto">
                    {JSON.stringify(selectedNotification.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
