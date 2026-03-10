/**
 * SendNotificationDialog Component
 * Dialog for manually sending notifications
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import {
  Send,
  X,
  Smartphone,
  Mail,
  MessageSquare,
  User,
  FileText,
  AlertCircle,
  Check,
  Loader2,
  Eye,
  Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  NotificationType,
  NotificationChannel,
} from '@/types/notifications';
import {
  sendNotification,
  previewTemplate,
} from '@/lib/services/notificationService';

// Props interface
interface SendNotificationDialogProps {
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

// Template options
const templateOptions = [
  { value: NotificationType.BOOKING_CONFIRMATION, label: 'Conferma Appuntamento' },
  { value: NotificationType.BOOKING_REMINDER, label: 'Promemoria Appuntamento' },
  { value: NotificationType.BOOKING_CANCELLED, label: 'Cancellazione Appuntamento' },
  { value: NotificationType.INVOICE_READY, label: 'Fattura Pronta' },
  { value: NotificationType.INSPECTION_COMPLETE, label: 'Ispezione Completata' },
  { value: NotificationType.VEHICLE_READY, label: 'Veicolo Pronto' },
  { value: NotificationType.MAINTENANCE_DUE, label: 'Manutenzione Dovuta' },
  { value: NotificationType.CUSTOM, label: 'Messaggio Personalizzato' },
];

// Channel options
const channelOptions = [
  { value: NotificationChannel.AUTO, label: 'Automatico', icon: Bell },
  { value: NotificationChannel.SMS, label: 'SMS', icon: Smartphone },
  { value: NotificationChannel.WHATSAPP, label: 'WhatsApp', icon: MessageSquare },
  { value: NotificationChannel.EMAIL, label: 'Email', icon: Mail },
];

// Variable suggestions by type
const variableSuggestions: Record<NotificationType, string[]> = {
  [NotificationType.BOOKING_CONFIRMATION]: ['customerName', 'date', 'time', 'vehicle', 'bookingCode', 'workshopName'],
  [NotificationType.BOOKING_REMINDER]: ['customerName', 'date', 'time', 'service', 'vehicle', 'location'],
  [NotificationType.BOOKING_CANCELLED]: ['customerName', 'date', 'time'],
  [NotificationType.INVOICE_READY]: ['customerName', 'invoiceNumber', 'amount', 'downloadUrl'],
  [NotificationType.INSPECTION_COMPLETE]: ['customerName', 'score', 'reportUrl'],
  [NotificationType.VEHICLE_READY]: ['customerName', 'vehicle', 'pickupTime', 'totalAmount'],
  [NotificationType.MAINTENANCE_DUE]: ['customerName', 'service', 'days'],
  [NotificationType.STATUS_UPDATE]: ['customerName', 'status'],
  [NotificationType.PAYMENT_REMINDER]: ['customerName', 'amount'],
  [NotificationType.WELCOME]: ['customerName'],
  [NotificationType.PASSWORD_RESET]: ['customerName', 'link'],
  [NotificationType.CUSTOM]: ['customerName', 'message'],
  [NotificationType.GDPR_EXPORT_READY]: ['customerName', 'link'],
};

export function SendNotificationDialog({
  customerId: initialCustomerId,
  customerName: initialCustomerName,
  customerPhone,
  customerEmail,
  trigger,
  onSuccess,
}: SendNotificationDialogProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('template');
  const [selectedType, setSelectedType] = useState<NotificationType>(NotificationType.CUSTOM);
  const [selectedChannel, setSelectedChannel] = useState<NotificationChannel>(NotificationChannel.AUTO);
  const [customMessage, setCustomMessage] = useState('');
  const [preview, setPreview] = useState('');
  const [variables, setVariables] = useState<Record<string, string>>({
    customerName: initialCustomerName || 'Cliente',
  });
  const [recipient, setRecipient] = useState({
    customerId: initialCustomerId || '',
    phone: customerPhone || '',
    email: customerEmail || '',
  });

  // Send mutation
  const sendMutation = useMutation(
    (data: Parameters<typeof sendNotification>[0]) => sendNotification(data),
    {
      onSuccess: () => {
        setOpen(false);
        onSuccess?.();
        resetForm();
      },
    }
  );

  // Preview mutation
  const previewMutation = useMutation(
    (data: unknown) => previewTemplate(data),
    {
      onSuccess: (result) => {
        setPreview((result as { preview: string }).preview);
      },
    }
  );

  // Reset form
  const resetForm = () => {
    setSelectedType(NotificationType.CUSTOM);
    setSelectedChannel(NotificationChannel.AUTO);
    setCustomMessage('');
    setPreview('');
    setVariables({ customerName: initialCustomerName || 'Cliente' });
    setRecipient({
      customerId: initialCustomerId || '',
      phone: customerPhone || '',
      email: customerEmail || '',
    });
  };

  // Handle preview
  const handlePreview = async () => {
    if (selectedType === NotificationType.CUSTOM) {
      setPreview(customMessage);
      return;
    }

    await previewMutation.mutateAsync({
      type: selectedType,
      language: 'it',
      variables,
    });
  };

  // Handle send
  const handleSend = async () => {
    if (!recipient.customerId) return;

    const message = selectedType === NotificationType.CUSTOM 
      ? customMessage 
      : preview;

    await sendMutation.mutateAsync({
      customerId: recipient.customerId,
      tenantId: 'tenant-001', // Get from context
      type: selectedType as string,
      channel: selectedChannel as string,
      message,
      metadata: variables,
    } as unknown as Parameters<typeof sendNotification>[0]);
  };

  // Handle variable change
  const handleVariableChange = (key: string, value: string) => {
    setVariables((prev) => ({ ...prev, [key]: value }));
  };

  // Add variable
  const addVariable = (key: string) => {
    if (!(key in variables)) {
      setVariables((prev) => ({ ...prev, [key]: '' }));
    }
  };

  const isCustom = selectedType === NotificationType.CUSTOM;
  const canSend = recipient.customerId && (isCustom ? customMessage : preview);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Send className="w-4 h-4 mr-2" />
            Invia Notifica
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Invia Notifica
          </DialogTitle>
          <DialogDescription>
            Invia una notifica manuale al cliente
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="template">Template</TabsTrigger>
            <TabsTrigger value="preview">Anteprima</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 my-4">
            <TabsContent value="template" className="mt-0 space-y-4">
              {/* Recipient */}
              <div className="space-y-2">
                <Label>Destinatario</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">ID Cliente</Label>
                    <Input
                      value={recipient.customerId}
                      onChange={(e) =>
                        setRecipient((prev) => ({ ...prev, customerId: e.target.value }))
                      }
                      placeholder="ID Cliente"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">Nome</Label>
                    <Input
                      value={variables.customerName}
                      onChange={(e) => handleVariableChange('customerName', e.target.value)}
                      placeholder="Nome cliente"
                    />
                  </div>
                </div>
              </div>

              {/* Template Type */}
              <div className="space-y-2">
                <Label>Tipo di Notifica</Label>
                <Select
                  value={selectedType}
                  onValueChange={(value) => setSelectedType(value as NotificationType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {templateOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Channel */}
              <div className="space-y-2">
                <Label>Canale</Label>
                <div className="grid grid-cols-4 gap-2">
                  {channelOptions.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setSelectedChannel(value as NotificationChannel)}
                      className={cn(
                        'flex flex-col items-center gap-2 p-3 rounded-lg border transition-all',
                        selectedChannel === value
                          ? 'border-blue-500 bg-blue-50 text-blue-600'
                          : 'border-gray-200 hover:bg-gray-50'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Variables */}
              {!isCustom && (
                <div className="space-y-2">
                  <Label>Variabili Template</Label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {variableSuggestions[selectedType]?.map((varName) => (
                      <button
                        key={varName}
                        onClick={() => addVariable(varName)}
                        className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                      >
                        + {varName}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(variables).map(([key, value]) => (
                      <div key={key} className="space-y-1">
                        <Label className="text-xs text-gray-500">{key}</Label>
                        <Input
                          value={value}
                          onChange={(e) => handleVariableChange(key, e.target.value)}
                          placeholder={key}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Message */}
              {isCustom && (
                <div className="space-y-2">
                  <Label>Messaggio Personalizzato</Label>
                  <Textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Scrivi il tuo messaggio..."
                    rows={4}
                  />
                  <p className="text-xs text-gray-500">
                    Usa {'{customerName}'} per inserire il nome del cliente
                  </p>
                </div>
              )}

              {/* Preview Button */}
              {!isCustom && (
                <Button
                  variant="outline"
                  onClick={handlePreview}
                  disabled={previewMutation.isPending}
                  className="w-full"
                >
                  {previewMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Eye className="w-4 h-4 mr-2" />
                  )}
                  Genera Anteprima
                </Button>
              )}
            </TabsContent>

            <TabsContent value="preview" className="mt-0 space-y-4">
              {/* Preview Card */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  Anteprima Messaggio
                </h4>
                <div className="bg-white rounded-2xl rounded-tl-sm p-4 shadow-sm border max-w-sm">
                  <p className="text-gray-800 whitespace-pre-wrap">
                    {preview || 'Clicca "Genera Anteprima" per vedere il messaggio'}
                  </p>
                </div>
              </div>

              {/* Message Info */}
              {preview && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">Tipo</span>
                    <span className="font-medium">
                      {templateOptions.find((t) => t.value === selectedType)?.label}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">Canale</span>
                    <span className="font-medium">
                      {channelOptions.find((c) => c.value === selectedChannel)?.label}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">Destinatario</span>
                    <span className="font-medium">{variables.customerName}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-500">Lunghezza</span>
                    <span className="font-medium">{preview.length} caratteri</span>
                  </div>
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annulla
          </Button>
          <Button
            onClick={handleSend}
            disabled={!canSend || sendMutation.isPending}
          >
            {sendMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Invio...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Invia Notifica
              </>
            )}
          </Button>
        </DialogFooter>

        {/* Error Message */}
        <AnimatePresence>
          {sendMutation.isError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center gap-2 text-sm"
            >
              <AlertCircle className="w-4 h-4" />
              Errore durante l'invio. Riprova.
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

export default SendNotificationDialog;
