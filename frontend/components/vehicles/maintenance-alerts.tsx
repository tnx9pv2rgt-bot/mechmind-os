'use client';

import { useMemo } from 'react';
import { AlertTriangle, Clock, Calendar, Gauge, CheckCircle2, Bell } from 'lucide-react';
import { formatDate, cn } from '@/lib/utils';
import { AppleCard, AppleCardContent } from '@/components/ui/apple-card';

interface VehicleMaintenanceData {
  mileage?: number | null;
  revisionExpiry?: string | null;
  insuranceExpiry?: string | null;
  taxExpiry?: string | null;
  lastServiceDate?: string | null;
  nextServiceDueKm?: number | null;
}

type AlertSeverity = 'critical' | 'high' | 'medium' | 'ok';

interface DerivedAlert {
  id: string;
  title: string;
  subtitle: string;
  severity: AlertSeverity;
  icon: React.ElementType;
  progressPercent?: number;
}

function severityConfig(severity: AlertSeverity) {
  const map = {
    critical: {
      border: 'border-red-400/50 dark:border-red-500/30',
      bg: 'bg-red-50 dark:bg-red-900/10',
      badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
      label: 'Scaduto',
      dot: 'bg-red-500',
    },
    high: {
      border: 'border-orange-400/50 dark:border-orange-500/30',
      bg: 'bg-orange-50 dark:bg-orange-900/10',
      badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
      label: 'In scadenza',
      dot: 'bg-orange-500',
    },
    medium: {
      border: 'border-yellow-400/50 dark:border-yellow-500/30',
      bg: 'bg-yellow-50 dark:bg-yellow-900/10',
      badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
      label: 'Attenzione',
      dot: 'bg-yellow-500',
    },
    ok: {
      border: 'border-green-400/30 dark:border-green-500/20',
      bg: 'bg-green-50/50 dark:bg-green-900/5',
      badge: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
      label: 'Ok',
      dot: 'bg-green-500',
    },
  };
  return map[severity];
}

function AlertCard({ alert }: { alert: DerivedAlert }) {
  const config = severityConfig(alert.severity);
  const Icon = alert.icon;

  return (
    <div className={cn('rounded-xl border p-4 transition-shadow', config.border, config.bg)}>
      <div className="flex items-start gap-3">
        <div className={cn('mt-0.5 h-2.5 w-2.5 rounded-full flex-shrink-0', config.dot)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Icon className="h-4 w-4 text-apple-gray dark:text-[var(--text-secondary)]" />
            <span className="text-body font-semibold text-apple-dark dark:text-[var(--text-primary)]">{alert.title}</span>
            <span className={cn('text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full', config.badge)}>
              {config.label}
            </span>
          </div>
          <p className="text-footnote text-apple-gray dark:text-[var(--text-secondary)] mt-1">{alert.subtitle}</p>

          {alert.progressPercent != null && (
            <div className="mt-2">
              <div className="flex justify-between text-[11px] text-apple-gray dark:text-[var(--text-secondary)] mb-1">
                <span>Km percorsi verso prossimo tagliando</span>
                <span>{Math.min(alert.progressPercent, 100).toFixed(0)}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-apple-border/30 dark:bg-[var(--border-default)]">
                <div
                  className={cn('h-full rounded-full transition-all', config.dot)}
                  style={{ width: `${Math.min(alert.progressPercent, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function dateSeverity(days: number): AlertSeverity {
  if (days < 0) return 'critical';
  if (days <= 30) return 'high';
  if (days <= 60) return 'medium';
  return 'ok';
}

interface MaintenanceAlertsProps {
  vehicle: VehicleMaintenanceData;
}

export function MaintenanceAlerts({ vehicle }: MaintenanceAlertsProps) {
  const alerts = useMemo<DerivedAlert[]>(() => {
    const result: DerivedAlert[] = [];

    if (vehicle.revisionExpiry) {
      const days = daysUntil(vehicle.revisionExpiry);
      result.push({
        id: 'revision',
        title: 'Revisione periodica',
        subtitle: days < 0
          ? `Scaduta da ${Math.abs(days)} giorni (${formatDate(vehicle.revisionExpiry)})`
          : `Scade il ${formatDate(vehicle.revisionExpiry)} (tra ${days} giorni)`,
        severity: dateSeverity(days),
        icon: Calendar,
      });
    }

    if (vehicle.insuranceExpiry) {
      const days = daysUntil(vehicle.insuranceExpiry);
      result.push({
        id: 'insurance',
        title: 'Assicurazione RCA',
        subtitle: days < 0
          ? `Scaduta da ${Math.abs(days)} giorni (${formatDate(vehicle.insuranceExpiry)})`
          : `Scade il ${formatDate(vehicle.insuranceExpiry)} (tra ${days} giorni)`,
        severity: dateSeverity(days),
        icon: AlertTriangle,
      });
    }

    if (vehicle.taxExpiry) {
      const days = daysUntil(vehicle.taxExpiry);
      result.push({
        id: 'tax',
        title: 'Bollo auto',
        subtitle: days < 0
          ? `Scaduto da ${Math.abs(days)} giorni (${formatDate(vehicle.taxExpiry)})`
          : `Scade il ${formatDate(vehicle.taxExpiry)} (tra ${days} giorni)`,
        severity: dateSeverity(days),
        icon: Clock,
      });
    }

    if (vehicle.nextServiceDueKm != null && vehicle.mileage != null) {
      const remaining = vehicle.nextServiceDueKm - vehicle.mileage;
      const progressPercent = (vehicle.mileage / vehicle.nextServiceDueKm) * 100;
      const severity: AlertSeverity = remaining < 0 ? 'critical' : remaining <= 500 ? 'high' : remaining <= 1500 ? 'medium' : 'ok';
      result.push({
        id: 'service-km',
        title: 'Prossimo tagliando',
        subtitle: remaining < 0
          ? `Scaduto da ${Math.abs(remaining).toLocaleString('it-IT')} km (limite: ${vehicle.nextServiceDueKm.toLocaleString('it-IT')} km)`
          : `${remaining.toLocaleString('it-IT')} km al prossimo tagliando (${vehicle.nextServiceDueKm.toLocaleString('it-IT')} km)`,
        severity,
        icon: Gauge,
        progressPercent,
      });
    }

    return result.sort((a, b) => {
      const order: Record<AlertSeverity, number> = { critical: 0, high: 1, medium: 2, ok: 3 };
      return order[a.severity] - order[b.severity];
    });
  }, [vehicle]);

  const stats = useMemo(() => ({
    critical: alerts.filter(a => a.severity === 'critical').length,
    high: alerts.filter(a => a.severity === 'high').length,
    ok: alerts.filter(a => a.severity === 'ok').length,
    total: alerts.length,
  }), [alerts]);

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CheckCircle2 className="h-12 w-12 text-apple-green/40 mb-4" />
        <p className="text-body font-medium text-apple-dark dark:text-[var(--text-primary)]">Tutto in ordine</p>
        <p className="text-footnote text-apple-gray dark:text-[var(--text-secondary)] mt-1">
          Inserisci le date di scadenza nel veicolo per monitorarle qui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <AppleCard hover={false}>
          <AppleCardContent>
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-apple-gray" />
              <span className="text-footnote text-apple-gray dark:text-[var(--text-secondary)]">Alert attivi</span>
            </div>
            <p className="text-title-2 font-bold text-apple-dark dark:text-[var(--text-primary)] mt-1">{stats.total}</p>
          </AppleCardContent>
        </AppleCard>
        <AppleCard hover={false}>
          <AppleCardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-footnote text-apple-gray dark:text-[var(--text-secondary)]">Scaduti</span>
            </div>
            <p className="text-title-2 font-bold text-red-500 mt-1">{stats.critical}</p>
          </AppleCardContent>
        </AppleCard>
        <AppleCard hover={false}>
          <AppleCardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-apple-green" />
              <span className="text-footnote text-apple-gray dark:text-[var(--text-secondary)]">In ordine</span>
            </div>
            <p className="text-title-2 font-bold text-apple-green mt-1">{stats.ok}</p>
          </AppleCardContent>
        </AppleCard>
      </div>

      {/* Alert list */}
      <div className="space-y-3">
        {alerts.map((alert) => (
          <AlertCard key={alert.id} alert={alert} />
        ))}
      </div>
    </div>
  );
}
