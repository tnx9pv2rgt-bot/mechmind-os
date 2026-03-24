'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Webhook,
  Plus,
  Loader2,
  AlertTriangle,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  ToggleLeft,
  ToggleRight,
  Copy,
} from 'lucide-react';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface WebhookEntry {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  secret: string;
  lastDeliveryAt: string | null;
  lastDeliveryStatus: number | null;
  failureCount: number;
  createdAt: string;
}

interface WebhookDetailResponse {
  data?: WebhookEntry & { deliveryLog?: DeliveryLog[] };
}

interface DeliveryLog {
  id: string;
  timestamp: string;
  event: string;
  statusCode: number;
  responseTime: number;
  success: boolean;
}

interface WebhooksResponse {
  data?: WebhookEntry[];
  webhooks?: WebhookEntry[];
}

const EVENTS = [
  { value: 'booking.created', label: 'Prenotazione creata' },
  { value: 'booking.updated', label: 'Prenotazione aggiornata' },
  { value: 'booking.cancelled', label: 'Prenotazione cancellata' },
  { value: 'work-order.created', label: 'OdL creato' },
  { value: 'work-order.updated', label: 'OdL aggiornato' },
  { value: 'work-order.completed', label: 'OdL completato' },
  { value: 'invoice.created', label: 'Fattura creata' },
  { value: 'invoice.paid', label: 'Fattura pagata' },
  { value: 'customer.created', label: 'Cliente creato' },
  { value: 'customer.updated', label: 'Cliente aggiornato' },
  { value: 'inspection.completed', label: 'Ispezione completata' },
];

const webhookSchema = z.object({
  url: z.string().url('URL non valido'),
  events: z.array(z.string()).min(1, 'Seleziona almeno un evento'),
  secret: z.string().optional(),
});

type WebhookForm = z.infer<typeof webhookSchema>;

const fetcher = (url: string): Promise<WebhookEntry[]> =>
  fetch(url).then(async (res) => {
    if (!res.ok) throw new Error('Errore caricamento');
    const json: WebhooksResponse = await res.json();
    const list = json.data || json.webhooks;
    return Array.isArray(list) ? list : [];
  });

export default function WebhooksPage() {
  const { data: webhooks, isLoading, error, mutate } = useSWR<WebhookEntry[]>(
    '/api/dashboard/settings/webhooks',
    fetcher,
    { onError: () => toast.error('Errore caricamento webhook') }
  );

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookEntry | null>(null);
  const [deliveryLog, setDeliveryLog] = useState<DeliveryLog[]>([]);
  const [processing, setProcessing] = useState(false);

  const form = useForm<WebhookForm>({
    resolver: zodResolver(webhookSchema),
    defaultValues: { url: '', events: [], secret: '' },
  });

  const selectedEvents = form.watch('events');

  const toggleEvent = (event: string) => {
    const current = form.getValues('events');
    if (current.includes(event)) {
      form.setValue('events', current.filter((e) => e !== event), { shouldValidate: true });
    } else {
      form.setValue('events', [...current, event], { shouldValidate: true });
    }
  };

  const handleCreate = async (data: WebhookForm) => {
    setProcessing(true);
    try {
      const res = await fetch('/api/dashboard/settings/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Errore creazione');
      toast.success('Webhook creato con successo');
      form.reset();
      setShowCreateDialog(false);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore creazione webhook');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedWebhook) return;
    setProcessing(true);
    try {
      const res = await fetch(`/api/dashboard/settings/webhooks/${selectedWebhook.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Errore eliminazione');
      toast.success('Webhook eliminato');
      setShowDeleteDialog(false);
      setSelectedWebhook(null);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore eliminazione');
    } finally {
      setProcessing(false);
    }
  };

  const handleViewDetail = async (webhook: WebhookEntry) => {
    setSelectedWebhook(webhook);
    setShowDetailDialog(true);
    try {
      const res = await fetch(`/api/dashboard/settings/webhooks/${webhook.id}`);
      if (res.ok) {
        const json: WebhookDetailResponse = await res.json();
        const detail = json.data;
        if (detail?.deliveryLog) {
          setDeliveryLog(detail.deliveryLog);
        }
      }
    } catch {
      // detail loading is best-effort
    }
  };

  // Loading
  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <Loader2 className='w-8 h-8 animate-spin text-apple-blue' />
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className='min-h-screen flex items-center justify-center p-8'>
        <AppleCard className='max-w-md w-full'>
          <AppleCardContent className='text-center py-12'>
            <AlertTriangle className='w-12 h-12 text-red-400 mx-auto mb-4' />
            <h3 className='text-title-2 font-semibold text-apple-dark dark:text-[#ececec] mb-2'>
              Errore di caricamento
            </h3>
            <p className='text-body text-apple-gray dark:text-[#636366]'>
              Impossibile caricare i webhook.
            </p>
          </AppleCardContent>
        </AppleCard>
      </div>
    );
  }

  return (
    <div className='min-h-screen'>
      <header className='bg-white/80 dark:bg-[#212121]/80 backdrop-blur-apple border-b border-apple-border/20 dark:border-[#424242]/50'>
        <div className='px-4 sm:px-8 py-5'>
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
            <div>
              <h1 className='text-headline text-apple-dark dark:text-[#ececec]'>Webhook</h1>
              <p className='text-apple-gray dark:text-[#636366] text-body mt-1'>
                Configura i webhook per ricevere notifiche in tempo reale
              </p>
            </div>
            <AppleButton onClick={() => setShowCreateDialog(true)}>
              <Plus className='w-4 h-4 mr-2' />
              Nuovo Webhook
            </AppleButton>
          </div>
        </div>
      </header>

      <div className='p-4 sm:p-8 max-w-5xl mx-auto'>
        <AppleCard>
          <AppleCardHeader>
            <div className='flex items-center gap-3'>
              <Webhook className='h-5 w-5 text-apple-blue' />
              <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[#ececec]'>
                Webhook configurati ({webhooks?.length || 0})
              </h2>
            </div>
          </AppleCardHeader>
          <AppleCardContent>
            {webhooks && webhooks.length > 0 ? (
              <div className='space-y-3'>
                {webhooks.map((webhook, index) => (
                  <motion.div
                    key={webhook.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className='p-4 rounded-xl border border-apple-border/30 dark:border-[#424242] hover:border-apple-blue/30 transition-all'
                  >
                    <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center gap-2 mb-1'>
                          {webhook.active ? (
                            <ToggleRight className='w-4 h-4 text-green-500 flex-shrink-0' />
                          ) : (
                            <ToggleLeft className='w-4 h-4 text-gray-400 flex-shrink-0' />
                          )}
                          <p className='text-body font-medium text-apple-dark dark:text-[#ececec] truncate'>
                            {webhook.url}
                          </p>
                          <Badge className={`border-0 ${webhook.active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}`}>
                            {webhook.active ? 'Attivo' : 'Inattivo'}
                          </Badge>
                        </div>
                        <div className='flex flex-wrap gap-1 mt-2'>
                          {webhook.events.slice(0, 3).map((e) => (
                            <Badge key={e} variant='outline' className='text-xs'>
                              {EVENTS.find((ev) => ev.value === e)?.label || e}
                            </Badge>
                          ))}
                          {webhook.events.length > 3 && (
                            <Badge variant='outline' className='text-xs'>
                              +{webhook.events.length - 3}
                            </Badge>
                          )}
                        </div>
                        <div className='flex items-center gap-4 mt-2 text-footnote text-apple-gray dark:text-[#636366]'>
                          {webhook.lastDeliveryAt && (
                            <span className='flex items-center gap-1'>
                              <Clock className='w-3 h-3' />
                              Ultimo invio: {new Date(webhook.lastDeliveryAt).toLocaleString('it-IT')}
                            </span>
                          )}
                          {webhook.failureCount > 0 && (
                            <span className='flex items-center gap-1 text-red-500'>
                              <XCircle className='w-3 h-3' />
                              {webhook.failureCount} errori
                            </span>
                          )}
                        </div>
                      </div>
                      <div className='flex items-center gap-1 flex-shrink-0'>
                        <AppleButton
                          variant='ghost'
                          size='sm'
                          className='min-w-[44px] min-h-[44px]'
                          onClick={() => handleViewDetail(webhook)}
                        >
                          <Eye className='w-4 h-4' />
                        </AppleButton>
                        <AppleButton
                          variant='ghost'
                          size='sm'
                          className='min-w-[44px] min-h-[44px] text-red-500'
                          onClick={() => {
                            setSelectedWebhook(webhook);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className='w-4 h-4' />
                        </AppleButton>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className='text-center py-12'>
                <Webhook className='w-12 h-12 text-apple-gray/30 mx-auto mb-4' />
                <h3 className='text-body font-medium text-apple-dark dark:text-[#ececec] mb-1'>
                  Nessun webhook configurato
                </h3>
                <p className='text-footnote text-apple-gray dark:text-[#636366]'>
                  Crea il primo webhook per ricevere notifiche in tempo reale.
                </p>
              </div>
            )}
          </AppleCardContent>
        </AppleCard>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle>Nuovo Webhook</DialogTitle>
            <DialogDescription>
              Configura un endpoint per ricevere notifiche sugli eventi.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleCreate)} className='space-y-4 py-4'>
            <div className='space-y-2'>
              <label htmlFor='webhook-url' className='text-sm font-medium text-apple-dark dark:text-[#ececec]'>
                URL Endpoint
              </label>
              <Input
                id='webhook-url'
                type='url'
                placeholder='https://esempio.it/webhook'
                {...form.register('url')}
                className='h-11 rounded-xl'
              />
              {form.formState.errors.url && (
                <p className='text-xs text-red-500'>{form.formState.errors.url.message}</p>
              )}
            </div>

            <div className='space-y-2'>
              <label htmlFor='webhook-secret' className='text-sm font-medium text-apple-dark dark:text-[#ececec]'>
                Secret (opzionale)
              </label>
              <Input
                id='webhook-secret'
                placeholder='Chiave segreta per la firma HMAC'
                {...form.register('secret')}
                className='h-11 rounded-xl'
              />
            </div>

            <div className='space-y-2'>
              <p className='text-sm font-medium text-apple-dark dark:text-[#ececec]'>Eventi</p>
              {form.formState.errors.events && (
                <p className='text-xs text-red-500'>{form.formState.errors.events.message}</p>
              )}
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto'>
                {EVENTS.map((event) => (
                  <label
                    key={event.value}
                    className='flex items-center gap-2 p-2 rounded-lg hover:bg-apple-light-gray/50 dark:hover:bg-[#353535] cursor-pointer min-h-[44px]'
                  >
                    <input
                      type='checkbox'
                      checked={selectedEvents.includes(event.value)}
                      onChange={() => toggleEvent(event.value)}
                      className='w-4 h-4 rounded border-apple-border text-apple-blue focus:ring-apple-blue'
                    />
                    <span className='text-sm text-apple-dark dark:text-[#ececec]'>{event.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <DialogFooter>
              <AppleButton variant='secondary' type='button' onClick={() => setShowCreateDialog(false)}>
                Annulla
              </AppleButton>
              <AppleButton type='submit' disabled={processing}>
                {processing ? <Loader2 className='w-4 h-4 animate-spin mr-2' /> : <Plus className='w-4 h-4 mr-2' />}
                Crea Webhook
              </AppleButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle>Dettagli Webhook</DialogTitle>
          </DialogHeader>
          {selectedWebhook && (
            <div className='space-y-4 py-4'>
              <div className='space-y-2'>
                <p className='text-footnote text-apple-gray uppercase tracking-wider'>URL</p>
                <div className='flex items-center gap-2'>
                  <p className='text-body text-apple-dark dark:text-[#ececec] font-mono text-sm break-all'>
                    {selectedWebhook.url}
                  </p>
                  <button
                    onClick={() => { navigator.clipboard.writeText(selectedWebhook.url); toast.success('URL copiato'); }}
                    className='p-1 hover:bg-apple-light-gray rounded min-w-[44px] min-h-[44px] flex items-center justify-center'
                  >
                    <Copy className='w-3 h-3' />
                  </button>
                </div>
              </div>

              <div className='space-y-2'>
                <p className='text-footnote text-apple-gray uppercase tracking-wider'>Eventi</p>
                <div className='flex flex-wrap gap-1'>
                  {selectedWebhook.events.map((e) => (
                    <Badge key={e} variant='outline' className='text-xs'>
                      {EVENTS.find((ev) => ev.value === e)?.label || e}
                    </Badge>
                  ))}
                </div>
              </div>

              {deliveryLog.length > 0 && (
                <div className='space-y-2'>
                  <p className='text-footnote text-apple-gray uppercase tracking-wider'>Ultimi invii</p>
                  <div className='space-y-2 max-h-60 overflow-y-auto'>
                    {deliveryLog.map((log) => (
                      <div
                        key={log.id}
                        className='flex items-center justify-between p-3 bg-apple-light-gray/50 dark:bg-[#353535] rounded-lg'
                      >
                        <div className='flex items-center gap-2'>
                          {log.success ? (
                            <CheckCircle className='w-4 h-4 text-green-500' />
                          ) : (
                            <XCircle className='w-4 h-4 text-red-500' />
                          )}
                          <div>
                            <p className='text-sm text-apple-dark dark:text-[#ececec]'>{log.event}</p>
                            <p className='text-xs text-apple-gray'>
                              {new Date(log.timestamp).toLocaleString('it-IT')}
                            </p>
                          </div>
                        </div>
                        <div className='text-right'>
                          <Badge variant='outline' className={`text-xs ${log.success ? 'text-green-600' : 'text-red-600'}`}>
                            {log.statusCode}
                          </Badge>
                          <p className='text-xs text-apple-gray mt-1'>{log.responseTime}ms</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className='max-w-sm'>
          <DialogHeader>
            <DialogTitle>Elimina Webhook</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare questo webhook? Questa azione non pu&ograve; essere annullata.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <AppleButton variant='secondary' onClick={() => setShowDeleteDialog(false)}>
              Annulla
            </AppleButton>
            <AppleButton
              onClick={handleDelete}
              className='bg-red-600 hover:bg-red-700'
              disabled={processing}
            >
              {processing ? <Loader2 className='w-4 h-4 animate-spin' /> : 'Elimina'}
            </AppleButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
