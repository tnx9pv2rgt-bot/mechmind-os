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
      border: 'border-[var(--status-error)]/40/50 dark:border-[var(--status-error)]/30',
      bg: 'bg-[var(--status-error-subtle)] dark:bg-[var(--status-error)]/40/10',
      badge: 'bg-[var(--status-error-subtle)] text-[var(--status-error)] dark:bg-[var(--status-error-subtle)] dark:text-[var(--status-error)]',
      label: 'Scaduto',
      dot: 'bg-[var(--status-error)]',
    },
    high: {
      border: 'border-[var(--status-warning)]/40/50 dark:border-[var(--status-warning)]/30',
      bg: 'bg-[var(--status-warning)]/5 dark:bg-[var(--status-warning)]/40/10',
      badge: 'bg-[var(--status-warning)]/10 text-[var(--status-warning)] dark:bg-[var(--status-warning-subtle)] dark:text-[var(--status-warning)]',
      label: 'In scadenza',
      dot: 'bg-[var(--status-warning)]',
    },
    medium: {
      border: 'border-[var(--status-warning)]/40/50 dark:border-[var(--status-warning)]/30',
      bg: 'bg-[var(--status-warning)]/10 dark:bg-[var(--status-warning)]/40/10',
      badge: 'bg-[var(--status-warning-subtle)] text-[var(--status-warning)] dark:bg-[var(--status-warning-subtle)] dark:text-[var(--status-warning)]',
      label: 'Attenzione',
      dot: 'bg-[var(--status-warning)]',
    },
    ok: {
      border: 'border-[var(--status-success)]/40/30 dark:border-[var(--status-success)]/20',
      bg: 'bg-[var(--status-success-subtle)]/50 dark:bg-[var(--status-success)]/40/5',
      badge: 'bg-[var(--status-success-subtle)] text-[var(--status-success)] dark:bg-[var(--status-success-subtle)] dark:text-[var(--status-success)]',
      label: 'Ok',
      dot: 'bg-[var(--status-success)]',
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
            <Icon className="h-4 w-4 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]" />
            <span className="text-body font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">{alert.title}</span>
            <span className={cn('text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full', config.badge)}>
              {config.label}
            </span>
          </div>
          <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mt-1">{alert.subtitle}</p>

          {alert.progressPercent != null && (
            <div className="mt-2">
              <div className="flex justify-between text-[11px] text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mb-1">
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
        <CheckCircle2 className="h-12 w-12 text-[var(--status-success)]/40 mb-4" />
        <p className="text-body font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">Tutto in ordine</p>
        <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mt-1">
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
              <Bell className="h-4 w-4 text-[var(--text-tertiary)]" />
              <span className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">Alert attivi</span>
            </div>
            <p className="text-title-2 font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] mt-1">{stats.total}</p>
          </AppleCardContent>
        </AppleCard>
        <AppleCard hover={false}>
          <AppleCardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[var(--status-error)]" />
              <span className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">Scaduti</span>
            </div>
            <p className="text-title-2 font-bold text-[var(--status-error)] mt-1">{stats.critical}</p>
          </AppleCardContent>
        </AppleCard>
        <AppleCard hover={false}>
          <AppleCardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[var(--status-success)]" />
              <span className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">In ordine</span>
            </div>
            <p className="text-title-2 font-bold text-[var(--status-success)] mt-1">{stats.ok}</p>
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
