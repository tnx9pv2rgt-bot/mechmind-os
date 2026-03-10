/**
 * NotificationPreferences Component
 * Toggle SMS/WhatsApp/Email preferences
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Smartphone,
  Mail,
  MessageSquare,
  Bell,
  Save,
  Loader2,
  Check,
  AlertCircle,
  Clock,
  Globe,
  Moon,
  Sun,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  NotificationChannel,
  NotificationType,
  NotificationPreferences as NotificationPreferencesType,
} from '@/types/notifications';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '@/lib/services/notificationService';

// Props interface
interface NotificationPreferencesProps {
  customerId: string;
}

// Channel configuration
const channelConfig = [
  {
    channel: NotificationChannel.SMS,
    label: 'SMS',
    description: 'Ricevi notifiche via SMS',
    icon: Smartphone,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  {
    channel: NotificationChannel.WHATSAPP,
    label: 'WhatsApp',
    description: 'Ricevi notifiche via WhatsApp',
    icon: MessageSquare,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  {
    channel: NotificationChannel.EMAIL,
    label: 'Email',
    description: 'Ricevi notifiche via Email',
    icon: Mail,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
];

// Notification type configuration
const typeConfig = [
  {
    type: NotificationType.BOOKING_CONFIRMATION,
    label: 'Conferma Appuntamento',
    description: 'Quando una prenotazione viene confermata',
  },
  {
    type: NotificationType.BOOKING_REMINDER,
    label: 'Promemoria Appuntamento',
    description: '24 ore prima dell\'appuntamento',
  },
  {
    type: NotificationType.INVOICE_READY,
    label: 'Fattura Pronta',
    description: 'Quando una fattura è disponibile',
  },
  {
    type: NotificationType.INSPECTION_COMPLETE,
    label: 'Ispezione Completata',
    description: 'Risultati dell\'ispezione digitale',
  },
  {
    type: NotificationType.VEHICLE_READY,
    label: 'Veicolo Pronto',
    description: 'Quando il veicolo è pronto per il ritiro',
  },
  {
    type: NotificationType.MAINTENANCE_DUE,
    label: 'Manutenzione Dovuta',
    description: 'Promemoria manutenzione periodica',
  },
];

export function NotificationPreferences({
  customerId,
}: NotificationPreferencesProps) {
  const queryClient = useQueryClient();
  const [localPrefs, setLocalPrefs] = useState<NotificationPreferencesType | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch preferences
  const { data: preferences, isLoading } = useQuery(
    ['notification-preferences', customerId],
    async () => {
      const data = await getNotificationPreferences(customerId);
      return data as unknown as NotificationPreferencesType;
    },
    { enabled: !!customerId }
  );

  // Update mutation
  const updateMutation = useMutation(
    (data: unknown) => updateNotificationPreferences(data),
    {
      onSuccess: () => {
        void queryClient.invalidateQueries(['notification-preferences', customerId]);
        setHasChanges(false);
      },
    }
  );

  // Initialize local state
  useEffect(() => {
    if (preferences && !localPrefs) {
      setLocalPrefs(preferences);
    }
  }, [preferences, localPrefs]);

  // Handle channel toggle
  const handleChannelToggle = (channel: NotificationChannel, enabled: boolean) => {
    if (!localPrefs) return;

    setLocalPrefs({
      ...localPrefs,
      channels: localPrefs.channels.map((c) =>
        c.channel === channel ? { ...c, enabled } : c
      ),
    });
    setHasChanges(true);
  };

  // Handle type toggle
  const handleTypeToggle = (type: NotificationType, enabled: boolean) => {
    if (!localPrefs) return;

    setLocalPrefs({
      ...localPrefs,
      types: localPrefs.types.map((t) =>
        t.type === type ? { ...t, enabled } : t
      ),
    });
    setHasChanges(true);
  };

  // Handle preferred channel change
  const handlePreferredChannelChange = (channel: NotificationChannel) => {
    if (!localPrefs) return;

    setLocalPrefs({
      ...localPrefs,
      preferredChannel: channel,
    });
    setHasChanges(true);
  };

  // Handle language change
  const handleLanguageChange = (language: string) => {
    if (!localPrefs) return;

    setLocalPrefs({
      ...localPrefs,
      language,
    });
    setHasChanges(true);
  };

  // Handle quiet hours change
  const handleQuietHoursChange = (field: 'quietHoursStart' | 'quietHoursEnd', value: string) => {
    if (!localPrefs) return;

    setLocalPrefs({
      ...localPrefs,
      [field]: value,
    });
    setHasChanges(true);
  };

  // Handle save
  const handleSave = async () => {
    if (!localPrefs) return;

    // Save all channel preferences
    for (const channelPref of localPrefs.channels) {
      await updateMutation.mutateAsync({
        customerId,
        channel: channelPref.channel,
        enabled: channelPref.enabled,
      });
    }

    // Save other preferences
    await updateMutation.mutateAsync({
      customerId,
      preferredChannel: localPrefs.preferredChannel,
      language: localPrefs.language,
      quietHoursStart: localPrefs.quietHoursStart,
      quietHoursEnd: localPrefs.quietHoursEnd,
    });
  };

  // Get channel enabled state
  const isChannelEnabled = (channel: NotificationChannel) => {
    return (
      localPrefs?.channels.find((c) => c.channel === channel)?.enabled ?? true
    );
  };

  // Get type enabled state
  const isTypeEnabled = (type: NotificationType) => {
    return localPrefs?.types.find((t) => t.type === type)?.enabled ?? true;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Channel Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Canali di Notifica
          </CardTitle>
          <CardDescription>
            Scegli come preferisci ricevere le notifiche
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {channelConfig.map(({ channel, label, description, icon: Icon, color, bgColor }) => (
            <div
              key={channel}
              className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={cn('p-2 rounded-lg', bgColor)}>
                  <Icon className={cn('w-5 h-5', color)} />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{label}</h4>
                  <p className="text-sm text-gray-500">{description}</p>
                </div>
              </div>
              <Switch
                checked={isChannelEnabled(channel)}
                onCheckedChange={(checked) => handleChannelToggle(channel, checked)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Preferred Channel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Canale Preferito
          </CardTitle>
          <CardDescription>
            Seleziona il canale predefinito per le notifiche
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={localPrefs?.preferredChannel || NotificationChannel.AUTO}
            onValueChange={handlePreferredChannelChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleziona canale preferito" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NotificationChannel.AUTO}>
                Automatico (consigliato)
              </SelectItem>
              <SelectItem value={NotificationChannel.SMS}>SMS</SelectItem>
              <SelectItem value={NotificationChannel.WHATSAPP}>
                WhatsApp
              </SelectItem>
              <SelectItem value={NotificationChannel.EMAIL}>Email</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Tipi di Notifica
          </CardTitle>
          <CardDescription>
            Scegli quali notifiche ricevere
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {typeConfig.map(({ type, label, description }) => (
            <div
              key={type}
              className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors"
            >
              <div>
                <h4 className="font-medium text-gray-900">{label}</h4>
                <p className="text-sm text-gray-500">{description}</p>
              </div>
              <Switch
                checked={isTypeEnabled(type)}
                onCheckedChange={(checked) => handleTypeToggle(type, checked)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Language & Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Lingua e Orari
          </CardTitle>
          <CardDescription>
            Personalizza la lingua e gli orari di ricezione
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Language */}
          <div className="space-y-2">
            <Label>Lingua</Label>
            <Select
              value={localPrefs?.language || 'it'}
              onValueChange={handleLanguageChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleziona lingua" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="it">Italiano</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Quiet Hours */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Moon className="w-5 h-5 text-indigo-600" />
              <Label>Orario di Quietazione</Label>
            </div>
            <p className="text-sm text-gray-500">
              Durante queste ore non riceverai notifiche non urgenti
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-gray-500">Dalle</Label>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <input
                    type="time"
                    value={localPrefs?.quietHoursStart || ''}
                    onChange={(e) => handleQuietHoursChange('quietHoursStart', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-gray-500">Alle</Label>
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-gray-400" />
                  <input
                    type="time"
                    value={localPrefs?.quietHoursEnd || ''}
                    onChange={(e) => handleQuietHoursChange('quietHoursEnd', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <AnimatePresence>
        {hasChanges && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="shadow-lg"
              size="lg"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salva Preferenze
                </>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      <AnimatePresence>
        {updateMutation.isError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2"
          >
            <AlertCircle className="w-5 h-5" />
            Errore durante il salvataggio. Riprova.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Message */}
      <AnimatePresence>
        {updateMutation.isSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-green-50 text-green-600 p-4 rounded-lg flex items-center gap-2"
          >
            <Check className="w-5 h-5" />
            Preferenze salvate con successo!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default NotificationPreferences;
