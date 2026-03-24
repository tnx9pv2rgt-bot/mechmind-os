'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Monitor,
  Smartphone,
  Tablet,
  Shield,
  ShieldOff,
  AlertTriangle,
  Loader2,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface Device {
  id: string;
  deviceName: string;
  browser: string;
  os: string;
  location: string;
  lastActivity: string;
  isTrusted: boolean;
  trustedUntil: string | null;
  isCurrent: boolean;
}

interface DeviceListProps {
  devices: Device[];
  isLoading: boolean;
  onTrust: (deviceId: string) => Promise<void>;
  onUntrust: (deviceId: string) => Promise<void>;
  onUntrustAll: () => Promise<void>;
  onRefresh: () => void;
}

function getDeviceIcon(deviceName: string): React.ReactElement {
  const name = deviceName.toLowerCase();
  if (name.includes('iphone') || name.includes('android') || name.includes('phone')) {
    return <Smartphone className="h-5 w-5" />;
  }
  if (name.includes('ipad') || name.includes('tablet')) {
    return <Tablet className="h-5 w-5" />;
  }
  return <Monitor className="h-5 w-5" />;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'oggi';
  if (diffDays === 1) return 'ieri';
  if (diffDays < 7) return `${diffDays} giorni fa`;
  return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTrustedUntil(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function DeviceList({
  devices,
  isLoading,
  onTrust,
  onUntrust,
  onUntrustAll,
  onRefresh,
}: DeviceListProps): React.ReactElement {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmUntrust, setConfirmUntrust] = useState<string | null>(null);
  const [confirmUntrustAll, setConfirmUntrustAll] = useState(false);
  const [confirmCompromised, setConfirmCompromised] = useState<string | null>(null);

  const handleTrust = async (deviceId: string): Promise<void> => {
    setActionLoading(deviceId);
    try {
      await onTrust(deviceId);
      toast.success('Dispositivo aggiunto ai fidati');
      onRefresh();
    } catch {
      toast.error('Errore nel rendere il dispositivo fidato');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUntrust = async (deviceId: string): Promise<void> => {
    setActionLoading(deviceId);
    try {
      await onUntrust(deviceId);
      toast.success('Fiducia revocata');
      onRefresh();
    } catch {
      toast.error('Errore nella revoca della fiducia');
    } finally {
      setActionLoading(null);
      setConfirmUntrust(null);
    }
  };

  const handleUntrustAll = async (): Promise<void> => {
    setActionLoading('all');
    try {
      await onUntrustAll();
      toast.success('Fiducia revocata da tutti i dispositivi');
      onRefresh();
    } catch {
      toast.error('Errore nella revoca globale');
    } finally {
      setActionLoading(null);
      setConfirmUntrustAll(false);
    }
  };

  const handleCompromised = async (deviceId: string): Promise<void> => {
    setActionLoading(deviceId);
    try {
      await onUntrust(deviceId);
      toast.success('Dispositivo segnalato e fiducia revocata');
      onRefresh();
    } catch {
      toast.error('Errore nella segnalazione');
    } finally {
      setActionLoading(null);
      setConfirmCompromised(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-2xl border border-[#4e4e4e] bg-[#2f2f2f] p-4"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-[#4e4e4e]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 rounded bg-[#4e4e4e]" />
                <div className="h-3 w-60 rounded bg-[#4e4e4e]" />
                <div className="h-3 w-32 rounded bg-[#4e4e4e]" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-[#888]">
        <Monitor className="h-10 w-10" />
        <p className="text-sm">Nessun dispositivo registrato</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {devices.map((device, index) => (
          <motion.div
            key={device.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: index * 0.05 }}
            className={`rounded-2xl border p-4 transition-colors ${
              device.isCurrent
                ? 'border-white/20 bg-[#2f2f2f]'
                : 'border-[#4e4e4e] bg-[#2f2f2f]'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                device.isTrusted ? 'bg-green-500/10 text-green-400' : 'bg-[#4e4e4e]/50 text-[#b4b4b4]'
              }`}>
                {getDeviceIcon(device.deviceName)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-white">
                    {device.deviceName}
                  </p>
                  <span className="text-xs text-[#888]">
                    {device.browser}
                  </span>
                  {device.isCurrent && (
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white">
                      Questo dispositivo
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-[#888]">
                  {device.location} &middot; Ultimo accesso: {formatDate(device.lastActivity)}
                </p>
                {device.isTrusted && device.trustedUntil ? (
                  <p className="mt-1 flex items-center gap-1 text-xs text-green-400">
                    <Shield className="h-3 w-3" />
                    Fidato fino al: {formatTrustedUntil(device.trustedUntil)}
                  </p>
                ) : (
                  <p className="mt-1 flex items-center gap-1 text-xs text-[#888]">
                    <ShieldOff className="h-3 w-3" />
                    Non fidato
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  {device.isTrusted ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setConfirmUntrust(device.id)}
                        disabled={actionLoading === device.id}
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#4e4e4e] px-4 py-2 text-xs font-medium text-[#b4b4b4] transition-colors hover:border-white/30 hover:text-white disabled:opacity-50"
                      >
                        {actionLoading === device.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <ShieldOff className="h-3 w-3" />
                        )}
                        Revoca fiducia
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmCompromised(device.id)}
                        disabled={actionLoading === device.id}
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-red-500/30 px-4 py-2 text-xs font-medium text-red-400 transition-colors hover:border-red-500/50 hover:bg-red-500/5 disabled:opacity-50"
                      >
                        <AlertTriangle className="h-3 w-3" />
                        Segnala compromesso
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleTrust(device.id)}
                      disabled={actionLoading === device.id}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#4e4e4e] px-4 py-2 text-xs font-medium text-[#b4b4b4] transition-colors hover:border-green-500/30 hover:text-green-400 disabled:opacity-50"
                    >
                      {actionLoading === device.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Shield className="h-3 w-3" />
                      )}
                      Fidati per 30 giorni
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {devices.some((d) => d.isTrusted) && (
        <button
          type="button"
          onClick={() => setConfirmUntrustAll(true)}
          disabled={actionLoading === 'all'}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-red-500/30 px-4 py-3 text-sm font-medium text-red-400 transition-colors hover:border-red-500/50 hover:bg-red-500/5 disabled:opacity-50"
        >
          {actionLoading === 'all' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          Revoca tutti i dispositivi
        </button>
      )}

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={confirmUntrust !== null}
        onOpenChange={(open) => !open && setConfirmUntrust(null)}
        title="Revoca fiducia dispositivo"
        description="Questo dispositivo richiederà nuovamente la verifica 2FA al prossimo accesso. Vuoi continuare?"
        confirmLabel="Revoca fiducia"
        variant="danger"
        onConfirm={() => confirmUntrust && handleUntrust(confirmUntrust)}
        loading={actionLoading !== null}
      />

      <ConfirmDialog
        open={confirmUntrustAll}
        onOpenChange={setConfirmUntrustAll}
        title="Revoca tutti i dispositivi"
        description="Tutti i dispositivi richiederanno la verifica 2FA al prossimo accesso. Questa azione non può essere annullata."
        confirmLabel="Revoca tutti"
        variant="danger"
        onConfirm={handleUntrustAll}
        loading={actionLoading === 'all'}
      />

      <ConfirmDialog
        open={confirmCompromised !== null}
        onOpenChange={(open) => !open && setConfirmCompromised(null)}
        title="Segnala dispositivo compromesso"
        description="Il dispositivo verrà rimosso dai fidati e la sessione invalidata. Ti consigliamo di cambiare la password immediatamente. Vuoi procedere?"
        confirmLabel="Segnala e revoca"
        variant="danger"
        onConfirm={() => confirmCompromised && handleCompromised(confirmCompromised)}
        loading={actionLoading !== null}
      />
    </div>
  );
}
