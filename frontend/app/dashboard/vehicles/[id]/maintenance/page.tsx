'use client';

import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { toast } from 'sonner';
import Link from 'next/link';
import { useState, useCallback } from 'react';
import {
  Wrench,
  Calendar,
  Gauge,
  AlertTriangle,
  CheckCircle,
  Clock,
  Bell,
  Loader2,
  ChevronRight,
  Car,
  Shield,
  Activity,
} from 'lucide-react';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { ErrorState } from '@/components/patterns/error-state';
import { EmptyState } from '@/components/patterns/empty-state';
import { formatDate, formatNumber } from '@/lib/utils/format';

// --- Types ---

interface VehicleInfo {
  id: string;
  licensePlate: string;
  make: string;
  model: string;
  year?: number;
  mileage?: number;
  customerId?: string;
}

interface PredictedMaintenance {
  id: string;
  serviceType: string;
  predictedDate: string;
  predictedMileage: number;
  confidence: number;
  status: 'overdue' | 'due_soon' | 'upcoming' | 'completed';
  description: string;
  lastPerformed?: string;
}

interface ManufacturerItem {
  service: string;
  recommendedInterval: string;
  lastDone?: string;
  isDone: boolean;
}

interface PredictiveMaintenanceResponse {
  vehicle: VehicleInfo;
  predictions: PredictedMaintenance[];
  manufacturerSchedule: ManufacturerItem[];
}

// --- Status Config ---

const statusConfig: Record<
  string,
  { label: string; color: string; bg: string; icon: React.ReactElement }
> = {
  overdue: {
    label: 'Scaduto',
    color: 'text-[var(--status-error)]',
    bg: 'bg-[var(--status-error-subtle)]/60 dark:bg-[var(--status-error-subtle)] border border-[var(--status-error)]/30/50 dark:border-[var(--status-error)]/30',
    icon: <AlertTriangle className="h-4 w-4 text-[var(--status-error)]" />,
  },
  due_soon: {
    label: 'In scadenza',
    color: 'text-[var(--status-warning)]',
    bg: 'bg-[var(--status-warning)]/10/60 dark:bg-[var(--status-warning)]/40/20 border border-[var(--status-warning)]/20/50 dark:border-[var(--status-warning)]/30',
    icon: <Clock className="h-4 w-4 text-[var(--status-warning)]" />,
  },
  upcoming: {
    label: 'Futuro',
    color: 'text-[var(--status-success)]',
    bg: 'bg-[var(--status-success-subtle)]/60 dark:bg-[var(--status-success-subtle)] border border-[var(--status-success)]/30/50 dark:border-[var(--status-success)]/30',
    icon: <Calendar className="h-4 w-4 text-[var(--status-success)]" />,
  },
  completed: {
    label: 'Completato',
    color: 'text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]',
    bg: 'bg-[var(--surface-secondary)]/30 dark:bg-[var(--surface-hover)] border border-[var(--border-default)]/20 dark:border-[var(--border-default)]/50',
    icon: <CheckCircle className="h-4 w-4 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]" />,
  },
};

// --- Component ---

export default function PredictiveMaintenancePage(): React.ReactElement {
  const { id: vehicleId } = useParams<{ id: string }>();
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

  const { data, error, isLoading } = useSWR<{
    data: PredictiveMaintenanceResponse;
  }>(
    vehicleId
      ? `/api/predictive-maintenance?vehicleId=${vehicleId}`
      : null,
    fetcher,
  );

  const vehicle = data?.data?.vehicle;
  const predictions = data?.data?.predictions ?? [];
  const manufacturerSchedule = data?.data?.manufacturerSchedule ?? [];

  const handleSendReminder = useCallback(
    async (predictionId: string) => {
      setSendingReminder(predictionId);
      try {
        const response = await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            type: 'maintenance-reminder',
            vehicleId,
            predictionId,
          }),
        });

        if (!response.ok) throw new Error(`Errore ${response.status}`);
        toast.success('Promemoria inviato al cliente');
      } catch {
        toast.error('Errore nell\'invio del promemoria');
      } finally {
        setSendingReminder(null);
      }
    },
    [vehicleId],
  );

  if (error) {
    return (
      <div>
        <header className="">
          <div className="px-8 py-5">
            <h1 className="text-headline text-[var(--text-primary)] dark:text-[var(--text-primary)]">Manutenzione Predittiva</h1>
          </div>
        </header>
        <div className="p-8">
          <ErrorState
            variant="server-error"
            onRetry={() => window.location.reload()}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <header className="">
        <div className="px-8 py-5">
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Veicoli', href: '/dashboard/vehicles' },
              {
                label: vehicle
                  ? `${vehicle.make} ${vehicle.model}`
                  : 'Veicolo',
                href: `/dashboard/vehicles/${vehicleId}`,
              },
              { label: 'Manutenzione predittiva' },
            ]}
          />
          <div className="flex items-center gap-3 mt-2">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center">
              <Activity className="h-5 w-5 text-[var(--brand)]" />
            </div>
            <div>
              <h1 className="text-headline text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                Manutenzione Predittiva
              </h1>
              {vehicle && (
                <p className="text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mt-1">
                  {vehicle.make} {vehicle.model} {vehicle.year ? `(${vehicle.year})` : ''} — Targa: {vehicle.licensePlate}
                  {vehicle.mileage ? ` | Km: ${formatNumber(vehicle.mileage)}` : ''}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="p-8 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--brand)]" />
          </div>
        ) : predictions.length === 0 && manufacturerSchedule.length === 0 ? (
          <EmptyState
            icon={Wrench}
            title="Nessuna previsione disponibile"
            description="Non ci sono dati sufficienti per generare previsioni di manutenzione per questo veicolo."
          />
        ) : (
          <div className="space-y-6">
            {/* Timeline */}
            {predictions.length > 0 && (
              <div>
                <h2 className="text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-[var(--brand)]" />
                  Manutenzioni previste
                </h2>
                <div className="space-y-4">
                  {predictions.map((pred) => {
                    const config = statusConfig[pred.status] ?? statusConfig.upcoming;

                    return (
                      <div
                        key={pred.id}
                        className={`rounded-2xl p-4 sm:p-6 ${config.bg} transition-shadow hover:shadow-apple`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                          {/* Status indicator */}
                          <div className="flex items-center gap-3 sm:gap-0 sm:flex-col sm:items-center sm:w-20 shrink-0">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-secondary)]/60 dark:bg-[var(--surface-elevated)]">
                              {config.icon}
                            </div>
                            <span className={`text-footnote font-medium ${config.color}`}>
                              {config.label}
                            </span>
                          </div>

                          {/* Content */}
                          <div className="flex-1">
                            <h3 className="text-body font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-1">
                              {pred.serviceType}
                            </h3>
                            <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mb-3">
                              {pred.description}
                            </p>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                              <div>
                                <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                                  Data prevista
                                </p>
                                <p className="text-body font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                                  {formatDate(pred.predictedDate)}
                                </p>
                              </div>
                              <div>
                                <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                                  Km previsti
                                </p>
                                <p className="text-body font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                                  {formatNumber(pred.predictedMileage)}
                                </p>
                              </div>
                              <div>
                                <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                                  Confidenza
                                </p>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-1.5 rounded-full bg-[var(--surface-secondary)] dark:bg-[var(--surface-hover)] overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        pred.confidence >= 80
                                          ? 'bg-[var(--status-success)]'
                                          : pred.confidence >= 60
                                            ? 'bg-[var(--status-warning)]'
                                            : 'bg-[var(--status-error)]'
                                      }`}
                                      style={{
                                        width: `${pred.confidence}%`,
                                      }}
                                    />
                                  </div>
                                  <span className="text-footnote font-medium text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                                    {pred.confidence}%
                                  </span>
                                </div>
                              </div>
                              {pred.lastPerformed && (
                                <div>
                                  <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                                    Ultimo intervento
                                  </p>
                                  <p className="text-body font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                                    {formatDate(pred.lastPerformed)}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-row sm:flex-col gap-2 shrink-0">
                            <Link
                              href={`/dashboard/bookings/new?vehicleId=${vehicleId}&service=${encodeURIComponent(pred.serviceType)}`}
                            >
                              <AppleButton
                                variant="secondary"
                                size="sm"
                                icon={<Calendar className="h-3.5 w-3.5" />}
                              >
                                Prenota
                              </AppleButton>
                            </Link>
                            <AppleButton
                              variant="ghost"
                              size="sm"
                              icon={sendingReminder === pred.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
                              onClick={() => handleSendReminder(pred.id)}
                              disabled={sendingReminder === pred.id}
                            >
                              Invia promemoria
                            </AppleButton>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Manufacturer Schedule */}
            {manufacturerSchedule.length > 0 && (
              <AppleCard hover={false}>
                <AppleCardHeader>
                  <h2 className="text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2">
                    <Shield className="h-5 w-5 text-[var(--brand)]" />
                    Piano manutenzione costruttore
                  </h2>
                </AppleCardHeader>
                <AppleCardContent>
                  <div className="space-y-2">
                    {manufacturerSchedule.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--surface-secondary)]/30 dark:hover:bg-[var(--surface-hover)] transition-colors"
                      >
                        <div
                          className={`flex h-6 w-6 items-center justify-center rounded-full shrink-0 ${
                            item.isDone
                              ? 'bg-[var(--status-success)]/10 dark:bg-[var(--status-success-subtle)]'
                              : 'bg-[var(--surface-secondary)] dark:bg-[var(--surface-hover)]'
                          }`}
                        >
                          {item.isDone ? (
                            <CheckCircle className="h-4 w-4 text-[var(--status-success)]" />
                          ) : (
                            <Clock className="h-4 w-4 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-body font-medium ${
                              item.isDone
                                ? 'text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] line-through'
                                : 'text-[var(--text-primary)] dark:text-[var(--text-primary)]'
                            }`}
                          >
                            {item.service}
                          </p>
                          <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                            Intervallo: {item.recommendedInterval}
                            {item.lastDone
                              ? ` | Ultimo: ${formatDate(item.lastDone)}`
                              : ''}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] shrink-0" />
                      </div>
                    ))}
                  </div>
                </AppleCardContent>
              </AppleCard>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
