'use client';

import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Wrench,
  Calendar,
  Clock,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart,
  Activity,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatCard } from '@/components/ui/stat-card';

// ─── Types ──────────────────────────────────────────────────────────
interface FunnelStep {
  label: string;
  count: number;
  conversion: number;
}

interface ServiceRevenue {
  name: string;
  revenue: number;
  count: number;
  margin: number;
}

interface CeoMetrics {
  revenue: { current: number; previous: number; change: number };
  customers: { total: number; new: number; returning: number; churnRate: number };
  workOrders: { completed: number; avgTime: number; avgValue: number };
  bookings: { today: number; week: number; noShowRate: number };
  funnel: FunnelStep[];
  topServices: ServiceRevenue[];
  utilizationRate: number;
  cashFlow: { in: number; out: number; net: number };
}

// ─── Component ──────────────────────────────────────────────────────
interface CeoDashboardProps {
  metrics?: CeoMetrics;
  isLoading?: boolean;
}

export function CeoDashboard({ metrics, isLoading = false }: CeoDashboardProps): React.ReactElement {
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  // Default empty metrics for skeleton
  const m = metrics ?? {
    revenue: { current: 0, previous: 0, change: 0 },
    customers: { total: 0, new: 0, returning: 0, churnRate: 0 },
    workOrders: { completed: 0, avgTime: 0, avgValue: 0 },
    bookings: { today: 0, week: 0, noShowRate: 0 },
    funnel: [],
    topServices: [],
    utilizationRate: 0,
    cashFlow: { in: 0, out: 0, net: 0 },
  };

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
          Performance Overview
        </h2>
        <div className="flex items-center bg-[var(--surface-hover)] dark:bg-[var(--surface-elevated)] rounded-lg p-0.5">
          {(['week', 'month', 'quarter', 'year'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                period === p
                  ? 'bg-[var(--surface-secondary)] dark:bg-[var(--surface-hover)] text-[var(--text-primary)] dark:text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-tertiary)]'
              )}
            >
              {p === 'week' ? 'Settimana' : p === 'month' ? 'Mese' : p === 'quarter' ? 'Trimestre' : 'Anno'}
            </button>
          ))}
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Fatturato"
          value={m.revenue.current}
          format="currency"
          change={m.revenue.change}
          changeLabel="vs periodo prec."
          icon={DollarSign}
          iconColor="text-[var(--status-success)]"
          loading={isLoading}
        />
        <StatCard
          title="Clienti Totali"
          value={m.customers.total}
          format="number"
          change={m.customers.new > 0 ? (m.customers.new / Math.max(m.customers.total - m.customers.new, 1)) * 100 : 0}
          changeLabel={`${m.customers.new} nuovi`}
          icon={Users}
          iconColor="text-[var(--brand)]"
          loading={isLoading}
        />
        <StatCard
          title="Ordini Completati"
          value={m.workOrders.completed}
          format="number"
          icon={Wrench}
          iconColor="text-[var(--brand)]"
          loading={isLoading}
        />
        <StatCard
          title="Prenotazioni Oggi"
          value={m.bookings.today}
          format="number"
          icon={Calendar}
          iconColor="text-[var(--status-warning)]"
          loading={isLoading}
        />
      </div>

      {/* Secondary Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Cash Flow */}
        <div className="rounded-xl border border-[var(--border-default)] dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">Cash Flow</h3>
            <Activity className="h-4 w-4 text-[var(--text-tertiary)]" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-[var(--status-success)]" />
                <span className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-tertiary)]">Entrate</span>
              </div>
              <span className="text-sm font-semibold text-[var(--status-success)] dark:text-[var(--status-success)]">
                {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(m.cashFlow.in)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowDownRight className="h-4 w-4 text-[var(--status-error)]" />
                <span className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-tertiary)]">Uscite</span>
              </div>
              <span className="text-sm font-semibold text-[var(--status-error)] dark:text-[var(--status-error)]">
                {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(m.cashFlow.out)}
              </span>
            </div>
            <div className="border-t border-[var(--border-default)] dark:border-[var(--border-default)] pt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">Netto</span>
                <span className={cn(
                  'text-sm font-bold',
                  m.cashFlow.net >= 0 ? 'text-[var(--status-success)] dark:text-[var(--status-success)]' : 'text-[var(--status-error)] dark:text-[var(--status-error)]'
                )}>
                  {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(m.cashFlow.net)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Funnel */}
        <div className="rounded-xl border border-[var(--border-default)] dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">Funnel Conversione</h3>
            <BarChart3 className="h-4 w-4 text-[var(--text-tertiary)]" />
          </div>
          <div className="space-y-2.5">
            {(m.funnel.length > 0 ? m.funnel : [
              { label: 'Prenotazioni', count: 0, conversion: 100 },
              { label: 'Preventivi', count: 0, conversion: 0 },
              { label: 'Ordini Lavoro', count: 0, conversion: 0 },
              { label: 'Fatture', count: 0, conversion: 0 },
            ]).map((step, i) => (
              <div key={step.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-tertiary)]">{step.label}</span>
                  <span className="text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                    {step.count} ({step.conversion}%)
                  </span>
                </div>
                <div className="h-2 bg-[var(--surface-hover)] dark:bg-[var(--surface-elevated)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[var(--status-info)] to-[var(--brand)] rounded-full transition-all duration-500"
                    style={{ width: `${step.conversion}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Efficiency Metrics */}
        <div className="rounded-xl border border-[var(--border-default)] dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">Efficienza</h3>
            <Zap className="h-4 w-4 text-[var(--text-tertiary)]" />
          </div>
          <div className="space-y-4">
            {/* Utilization Rate */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-tertiary)]">Utilizzo Ponte</span>
                <span className="text-xs font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                  {m.utilizationRate}%
                </span>
              </div>
              <div className="h-3 bg-[var(--surface-hover)] dark:bg-[var(--surface-elevated)] rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    m.utilizationRate > 80 ? 'bg-[var(--status-success)]' : m.utilizationRate > 50 ? 'bg-[var(--status-warning)]' : 'bg-[var(--status-error)]'
                  )}
                  style={{ width: `${m.utilizationRate}%` }}
                />
              </div>
            </div>

            {/* Avg Order Value */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-[var(--text-tertiary)]" />
                <span className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-tertiary)]">Valore Medio OdL</span>
              </div>
              <span className="text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(m.workOrders.avgValue)}
              </span>
            </div>

            {/* Avg Time */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[var(--text-tertiary)]" />
                <span className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-tertiary)]">Tempo Medio</span>
              </div>
              <span className="text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                {m.workOrders.avgTime}h
              </span>
            </div>

            {/* No-show Rate */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[var(--text-tertiary)]" />
                <span className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-tertiary)]">No-show Rate</span>
              </div>
              <span className={cn(
                'text-sm font-semibold',
                m.bookings.noShowRate > 10 ? 'text-[var(--status-error)] dark:text-[var(--status-error)]' : 'text-[var(--status-success)] dark:text-[var(--status-success)]'
              )}>
                {m.bookings.noShowRate}%
              </span>
            </div>

            {/* Churn Rate */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-[var(--text-tertiary)]" />
                <span className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-tertiary)]">Churn Rate</span>
              </div>
              <span className={cn(
                'text-sm font-semibold',
                m.customers.churnRate > 15 ? 'text-[var(--status-error)] dark:text-[var(--status-error)]' : 'text-[var(--status-success)] dark:text-[var(--status-success)]'
              )}>
                {m.customers.churnRate}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Services */}
      <div className="rounded-xl border border-[var(--border-default)] dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-default)] dark:border-[var(--border-default)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">Servizi Top per Ricavo</h3>
          <PieChart className="h-4 w-4 text-[var(--text-tertiary)]" />
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {(m.topServices.length > 0 ? m.topServices : [
            { name: 'Caricamento...', revenue: 0, count: 0, margin: 0 },
          ]).map((service, i) => (
            <div key={service.name} className="flex items-center justify-between px-5 py-3 hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-hover)]/50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-[var(--text-tertiary)] w-5">{i + 1}</span>
                <span className="text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)]">{service.name}</span>
              </div>
              <div className="flex items-center gap-6">
                <span className="text-xs text-[var(--text-secondary)]">{service.count} ordini</span>
                <span className="text-xs text-[var(--text-secondary)]">
                  Margine: <span className={service.margin > 40 ? 'text-[var(--status-success)] font-medium' : 'text-[var(--text-secondary)]'}>{service.margin}%</span>
                </span>
                <span className="text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] w-24 text-right">
                  {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(service.revenue)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
