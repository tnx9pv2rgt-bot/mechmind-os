'use client';

import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Send, MessageSquare, Phone, Mail, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { renderTemplate, calculateSmsSegments, estimateSmsCost } from '@/lib/notifications/templates';

type NotificationChannel = 'SMS' | 'WHATSAPP' | 'EMAIL';
type NotificationType = 
  | 'BOOKING_REMINDER'
  | 'BOOKING_CONFIRMATION'
  | 'STATUS_UPDATE'
  | 'INVOICE_READY'
  | 'MAINTENANCE_DUE'
  | 'INSPECTION_COMPLETE'
  | 'PAYMENT_REMINDER';

interface SendNotificationButtonProps {
  customerId: string;
  customerName?: string;
  defaultType?: NotificationType;
  defaultChannel?: NotificationChannel;
  metadata?: Record<string, any>;
  onSuccess?: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const channelIcons = {
  SMS: Phone,
  WHATSAPP: MessageSquare,
  EMAIL: Mail,
};

const typeLabels: Record<NotificationType, string> = {
  BOOKING_REMINDER: 'Promemoria Appuntamento',
  BOOKING_CONFIRMATION: 'Conferma Prenotazione',
  STATUS_UPDATE: 'Aggiornamento Stato',
  INVOICE_READY: 'Fattura Pronta',
  MAINTENANCE_DUE: 'Manutenzione Dovuta',
  INSPECTION_COMPLETE: 'Ispezione Completata',
  PAYMENT_REMINDER: 'Promemoria Pagamento',
};

const channelLabels: Record<NotificationChannel, string> = {
  SMS: 'SMS',
  WHATSAPP: 'WhatsApp',
  EMAIL: 'Email',
};

export function SendNotificationButton({
  customerId,
  customerName = 'Cliente',
  defaultType = 'STATUS_UPDATE',
  defaultChannel = 'SMS',
  metadata = {},
  onSuccess,
  variant = 'default',
  size = 'default',
}: SendNotificationButtonProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<NotificationChannel>(defaultChannel);
  const [type, setType] = useState<NotificationType>(defaultType);
  const [customMessage, setCustomMessage] = useState('');
  const [useCustomMessage, setUseCustomMessage] = useState(false);
  const [variables, setVariables] = useState<Record<string, string>>({
    customerName,
    date: new Date().toLocaleDateString('it-IT'),
    time: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
    ...metadata,
  });

  // Fetch templates
  const { data: templatesData } = useQuery({
    queryKey: ['notification-templates'],
    queryFn: async () => {
      const response = await fetch('/api/notifications/templates');
      if (!response.ok) throw new Error('Failed to fetch templates');
      return response.json();
    },
    enabled: open,
  });

  // Send mutation
  const sendMutation = useMutation({
    mutationFn: async () => {
      const message = useCustomMessage ? customMessage : undefined;
      
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          type,
          channel,
          message,
          metadata,
          variables,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send notification');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Successo', description: 'Notifica inviata con successo' });
      setOpen(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Errore', 
        description: error.message || 'Impossibile inviare la notifica', 
        variant: 'destructive' 
      });
    },
  });

  // Preview message
  const previewMessage = useCustomMessage
    ? customMessage
    : renderTemplate(type, 'it', {
        customerName: variables.customerName || customerName,
        date: variables.date,
        time: variables.time,
        location: variables.location,
        status: variables.status,
        amount: variables.amount,
        link: variables.link,
        service: variables.service,
        days: variables.days ? parseInt(variables.days) : undefined,
        score: variables.score,
        bookingCode: variables.bookingCode,
        workshopName: variables.workshopName,
        invoiceNumber: variables.invoiceNumber,
        vehiclePlate: variables.vehiclePlate,
      });

  // Calculate SMS info
  const smsInfo = calculateSmsSegments(previewMessage);
  const costInfo = estimateSmsCost(previewMessage);

  const ChannelIcon = channelIcons[channel];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <Send className="h-4 w-4 mr-2" />
          Invia Notifica
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Invia Notifica</DialogTitle>
          <DialogDescription>
            Invia una notifica al cliente {customerName}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="template" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="template" onClick={() => setUseCustomMessage(false)}>
              Template
            </TabsTrigger>
            <TabsTrigger value="custom" onClick={() => setUseCustomMessage(true)}>
              Personalizzato
            </TabsTrigger>
          </TabsList>

          <TabsContent value="template" className="space-y-4">
            {/* Channel Selection */}
            <div className="space-y-2">
              <Label>Canale</Label>
              <div className="flex gap-2">
                {(Object.keys(channelIcons) as NotificationChannel[]).map((ch) => {
                  const Icon = channelIcons[ch];
                  return (
                    <Button
                      key={ch}
                      type="button"
                      variant={channel === ch ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setChannel(ch)}
                      className="flex-1"
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {channelLabels[ch]}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Type Selection */}
            <div className="space-y-2">
              <Label>Tipo Notifica</Label>
              <Select value={type} onValueChange={(v) => setType(v as NotificationType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(typeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Variables */}
            <div className="space-y-2">
              <Label>Variabili</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Nome cliente"
                  value={variables.customerName}
                  onChange={(e) => setVariables(v => ({ ...v, customerName: e.target.value }))}
                />
                <Input
                  placeholder="Data (gg/mm/aaaa)"
                  value={variables.date}
                  onChange={(e) => setVariables(v => ({ ...v, date: e.target.value }))}
                />
                <Input
                  placeholder="Ora (HH:mm)"
                  value={variables.time}
                  onChange={(e) => setVariables(v => ({ ...v, time: e.target.value }))}
                />
                <Input
                  placeholder="Servizio"
                  value={variables.service}
                  onChange={(e) => setVariables(v => ({ ...v, service: e.target.value }))}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            {/* Channel Selection */}
            <div className="space-y-2">
              <Label>Canale</Label>
              <div className="flex gap-2">
                {(Object.keys(channelIcons) as NotificationChannel[]).map((ch) => {
                  const Icon = channelIcons[ch];
                  return (
                    <Button
                      key={ch}
                      type="button"
                      variant={channel === ch ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setChannel(ch)}
                      className="flex-1"
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {channelLabels[ch]}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Messaggio Personalizzato</Label>
              <Textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Scrivi il tuo messaggio..."
                rows={4}
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Preview */}
        <div className="space-y-2">
          <Label>Anteprima</Label>
          <div className="p-3 bg-gray-50 rounded-lg border">
            <p className="text-sm whitespace-pre-wrap">{previewMessage}</p>
          </div>
          
          {/* SMS Info */}
          {(channel === 'SMS' || channel === 'WHATSAPP') && (
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>{previewMessage.length} caratteri</span>
              <span>•</span>
              <span>{smsInfo.segments} segmento{smsInfo.segments > 1 ? 'i' : ''}</span>
              <span>•</span>
              <span>Circa ${costInfo.totalCost.toFixed(3)}</span>
              {smsInfo.encoding === 'UCS-2' && (
                <>
                  <span>•</span>
                  <Badge variant="outline" className="text-xs">Unicode</Badge>
                </>
              )}
            </div>
          )}
        </div>

        {/* Alerts */}
        {previewMessage.length > 160 && channel === 'SMS' && (
          <Alert variant="default" className="bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700 text-sm">
              Il messaggio supera 160 caratteri e verrà inviato come SMS concatenato.
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annulla
          </Button>
          <Button
            onClick={() => sendMutation.mutate()}
            disabled={sendMutation.isPending || !previewMessage.trim()}
          >
            {sendMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Invio...
              </>
            ) : (
              <>
                <ChannelIcon className="h-4 w-4 mr-2" />
                Invia {channelLabels[channel]}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
