'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import {
  Wrench,
  Clock,
  CheckCircle2,
  Euro,
  Car,
  User,
  Timer,
  Loader2,
  Calendar,
  AlertCircle,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface TvBay {
  id: string;
  name: string;
  status: 'available' | 'occupied' | 'maintenance';
  vehiclePlate?: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  serviceDescription?: string;
  technician?: string;
  progressPercent?: number;
  startedAt?: string;
  estimatedMinutes?: number;
}

interface TvAppointment {
  id: string;
  time: string;
  customerName: string;
  vehiclePlate: string;
  serviceDescription: string;
}

interface TvData {
  bays: TvBay[];
  kpis: {
    completed: number;
    revenueToday: number;
    queueCount: number;
  };
  nextAppointments: TvAppointment[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function TvDashboardPage() {
  const [currentTime, setCurrentTime] = useState(new Date());

  const { data, error, isLoading } = useSWR<TvData>(
    '/api/production-board?view=tv',
    fetcher,
    { refreshInterval: 15_000, revalidateOnFocus: false }
  );

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--surface-tertiary)] flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[var(--brand)]" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Error
  // ---------------------------------------------------------------------------
  if (error || !data) {
    return (
      <div className="min-h-screen bg-[var(--surface-tertiary)] flex flex-col items-center justify-center gap-4">
        <AlertCircle className="w-16 h-16 text-[var(--status-error)]" />
        <p className="text-2xl text-[var(--text-on-brand)] font-medium">Errore di connessione</p>
        <p className="text-[var(--text-tertiary)]">Il sistema si riconnettera automaticamente...</p>
      </div>
    );
  }

  const { bays, kpis, nextAppointments } = data;

  // ---------------------------------------------------------------------------
  // Main TV Layout
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[var(--surface-tertiary)] text-[var(--text-on-brand)] p-6 flex flex-col gap-6">
      {/* Top Bar: Branding + Time + KPIs */}
      <div className="flex items-center justify-between">
        {/* Branding */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--status-info)] to-[var(--brand)] flex items-center justify-center">
            <Wrench className="w-5 h-5 text-[var(--text-on-brand)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">MechMind OS</h1>
            <p className="text-xs text-[var(--text-tertiary)]">Production Dashboard</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="flex items-center gap-8">
          <TvKpi
            icon={<CheckCircle2 className="w-5 h-5 text-[var(--status-success)]" />}
            label="Completati"
            value={kpis.completed.toString()}
          />
          <TvKpi
            icon={<Euro className="w-5 h-5 text-[var(--status-success)]" />}
            label="Revenue"
            value={formatCurrency(kpis.revenueToday)}
          />
          <TvKpi
            icon={<Clock className="w-5 h-5 text-[var(--status-warning)]" />}
            label="In coda"
            value={kpis.queueCount.toString()}
          />
        </div>

        {/* Clock */}
        <div className="text-right">
          <p className="text-3xl font-mono font-bold tracking-wider">
            {currentTime.toLocaleTimeString('it-IT', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </p>
          <p className="text-sm text-[var(--text-tertiary)]">
            {currentTime.toLocaleDateString('it-IT', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
            })}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Bay Grid */}
        <div className="flex-1 grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 auto-rows-min">
          {bays.map(bay => (
            <TvBayCard key={bay.id} bay={bay} />
          ))}
        </div>

        {/* Right Sidebar: Next Appointments */}
        <div className="w-80 flex-shrink-0 bg-[var(--surface-tertiary)] rounded-2xl border border-[var(--border-default)] p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-[var(--brand)]" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Prossimi appuntamenti
            </h2>
          </div>
          <div className="flex-1 space-y-3 overflow-hidden">
            {nextAppointments.length === 0 ? (
              <p className="text-[var(--text-secondary)] text-sm text-center py-8">
                Nessun appuntamento in programma
              </p>
            ) : (
              nextAppointments.slice(0, 5).map(appt => (
                <div
                  key={appt.id}
                  className="rounded-xl bg-[var(--surface-primary)] border border-[var(--border-default)] p-3 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-[var(--text-on-brand)]">
                      {new Date(appt.time).toLocaleTimeString('it-IT', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className="text-sm font-mono text-[var(--brand)]">{appt.vehiclePlate}</span>
                  </div>
                  <p className="text-xs text-[var(--text-tertiary)] truncate">{appt.serviceDescription}</p>
                  <p className="text-xs text-[var(--text-secondary)] truncate">{appt.customerName}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function TvKpi({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">{label}</p>
        <p className="text-lg font-bold">{value}</p>
      </div>
    </div>
  );
}

function TvBayCard({ bay }: { bay: TvBay }) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    if (!bay.startedAt) return;

    function updateElapsed(): void {
      if (!bay.startedAt) return;
      const start = new Date(bay.startedAt).getTime();
      const now = Date.now();
      const diffMin = Math.floor((now - start) / 60_000);
      const hours = Math.floor(diffMin / 60);
      const mins = diffMin % 60;
      setElapsed(hours > 0 ? `${hours}h ${mins}m` : `${mins}m`);
    }

    updateElapsed();
    const interval = setInterval(updateElapsed, 30_000);
    return () => clearInterval(interval);
  }, [bay.startedAt]);

  const isOverdue =
    bay.estimatedMinutes &&
    bay.startedAt &&
    Date.now() - new Date(bay.startedAt).getTime() > bay.estimatedMinutes * 60_000;

  const bayColor = bay.status === 'available'
    ? 'border-[var(--status-success)]/60'
    : bay.status === 'maintenance'
      ? 'border-[var(--border-strong)]'
      : isOverdue
        ? 'border-[var(--status-error)]/60'
        : 'border-[var(--status-info)]/60';

  const progressColor = isOverdue ? 'bg-[var(--status-error)]' : 'bg-[var(--brand)]';

  return (
    <div className={`rounded-2xl bg-[var(--surface-tertiary)] border-2 ${bayColor} p-4 space-y-3 transition-colors`}>
      {/* Bay name */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold">{bay.name}</h3>
        <span
          className={`w-3 h-3 rounded-full ${
            bay.status === 'available'
              ? 'bg-[var(--status-success)]'
              : bay.status === 'maintenance'
                ? 'bg-[var(--surface-secondary)]0'
                : isOverdue
                  ? 'bg-[var(--status-error)] animate-pulse'
                  : 'bg-[var(--status-info)]'
          }`}
        />
      </div>

      {bay.status === 'available' ? (
        <div className="flex flex-col items-center justify-center py-6 text-[var(--text-secondary)]">
          <Wrench className="w-8 h-8 mb-2 opacity-30" />
          <p className="text-sm">Libera</p>
        </div>
      ) : bay.status === 'maintenance' ? (
        <div className="flex flex-col items-center justify-center py-6 text-[var(--text-secondary)]">
          <Wrench className="w-8 h-8 mb-2 opacity-30" />
          <p className="text-sm">In manutenzione</p>
        </div>
      ) : (
        <>
          {/* Vehicle */}
          <div className="flex items-center gap-2">
            <Car className="w-4 h-4 text-[var(--text-tertiary)]" />
            <span className="text-lg font-mono font-bold text-[var(--text-on-brand)]">{bay.vehiclePlate}</span>
          </div>
          {(bay.vehicleBrand || bay.vehicleModel) && (
            <p className="text-xs text-[var(--text-tertiary)]">
              {bay.vehicleBrand} {bay.vehicleModel}
            </p>
          )}

          {/* Service */}
          <p className="text-sm text-[var(--text-tertiary)] truncate">{bay.serviceDescription}</p>

          {/* Progress bar */}
          {bay.progressPercent != null && (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-[var(--text-secondary)]">
                <span>Progresso</span>
                <span>{bay.progressPercent}%</span>
              </div>
              <div className="h-2 rounded-full bg-[var(--border-default)] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                  style={{ width: `${Math.min(bay.progressPercent, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Technician + Time */}
          <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)]">
            {bay.technician && (
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>{bay.technician}</span>
              </div>
            )}
            {elapsed && (
              <div className={`flex items-center gap-1 font-medium ${isOverdue ? 'text-[var(--status-error)]' : 'text-[var(--brand)]'}`}>
                <Timer className="w-3 h-3" />
                <span>{elapsed}</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}
