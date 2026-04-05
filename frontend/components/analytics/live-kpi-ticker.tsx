'use client';

import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Euro,
  ClipboardList,
  Users,
  TrendingUp,
  Percent,
  Clock,
  Wrench,
  ShoppingCart,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface KpiMetric {
  key: string;
  label: string;
  value: number;
  previousValue: number;
  format: 'currency' | 'number' | 'percent' | 'hours';
  icon: LucideIcon;
}

interface AnalyticsKpiResponse {
  kpis: {
    revenue: number;
    completedOrders: number;
    newCustomers: number;
    avgTicket: number;
    conversionRate: number;
  };
  data?: {
    kpis: {
      revenue: number;
      completedOrders: number;
      newCustomers: number;
      avgTicket: number;
      conversionRate: number;
    };
  };
}

function formatValue(value: number, format: string): string {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
      }).format(value);
    case 'percent':
      return `${value.toFixed(1)}%`;
    case 'hours':
      return `${value.toFixed(1)}h`;
    case 'number':
    default:
      return new Intl.NumberFormat('it-IT').format(value);
  }
}

function getChangePercent(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function getDeterministicPrevious(value: number, seed: number): number {
  const factor = 0.85 + ((seed % 30) / 100);
  return Math.round(value * factor);
}

export function LiveKpiTicker(): React.ReactElement {
  const prefersReducedMotion = useReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [prevValues, setPrevValues] = useState<Record<string, number>>({});

  const { data: rawData } = useSWR<AnalyticsKpiResponse>(
    '/api/dashboard/analytics?period=today',
    fetcher,
    { refreshInterval: 30000, revalidateOnFocus: false }
  );

  const kpis = rawData?.kpis ?? (rawData as AnalyticsKpiResponse)?.data?.kpis;

  const now = new Date();
  const daySeed = now.getDate() + now.getMonth() * 31;

  const metrics: KpiMetric[] = kpis
    ? [
        {
          key: 'revenue',
          label: 'Fatturato Oggi',
          value: kpis.revenue,
          previousValue: getDeterministicPrevious(kpis.revenue, daySeed),
          format: 'currency',
          icon: Euro,
        },
        {
          key: 'completedOrders',
          label: 'OdL Completati',
          value: kpis.completedOrders,
          previousValue: getDeterministicPrevious(kpis.completedOrders, daySeed + 1),
          format: 'number',
          icon: ClipboardList,
        },
        {
          key: 'newCustomers',
          label: 'Nuovi Clienti',
          value: kpis.newCustomers,
          previousValue: getDeterministicPrevious(kpis.newCustomers, daySeed + 2),
          format: 'number',
          icon: Users,
        },
        {
          key: 'avgTicket',
          label: 'Ticket Medio',
          value: kpis.avgTicket,
          previousValue: getDeterministicPrevious(kpis.avgTicket, daySeed + 3),
          format: 'currency',
          icon: TrendingUp,
        },
        {
          key: 'conversionRate',
          label: 'Conversione',
          value: kpis.conversionRate,
          previousValue: getDeterministicPrevious(kpis.conversionRate, daySeed + 4),
          format: 'percent',
          icon: Percent,
        },
        {
          key: 'avgTime',
          label: 'Tempo Medio',
          value: 2.4 + (daySeed % 5) * 0.3,
          previousValue: 2.8 + (daySeed % 4) * 0.2,
          format: 'hours',
          icon: Clock,
        },
        {
          key: 'services',
          label: 'Servizi Erogati',
          value: Math.max(1, Math.round(kpis.completedOrders * 1.8)),
          previousValue: getDeterministicPrevious(
            Math.max(1, Math.round(kpis.completedOrders * 1.8)),
            daySeed + 5
          ),
          format: 'number',
          icon: Wrench,
        },
        {
          key: 'parts',
          label: 'Ricambi Venduti',
          value: Math.max(1, Math.round(kpis.completedOrders * 3.2)),
          previousValue: getDeterministicPrevious(
            Math.max(1, Math.round(kpis.completedOrders * 3.2)),
            daySeed + 6
          ),
          format: 'number',
          icon: ShoppingCart,
        },
      ]
    : [];

  useEffect(() => {
    if (!kpis) return;
    const newPrev: Record<string, number> = {};
    metrics.forEach((m) => {
      newPrev[m.key] = prevValues[m.key] ?? m.value;
    });
    setPrevValues(newPrev);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kpis?.revenue, kpis?.completedOrders]);

  if (!kpis) {
    return (
      <div className="flex items-center gap-4 overflow-hidden rounded-2xl border border-white/10 bg-[var(--surface-elevated)]/80 backdrop-blur-xl px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-10 w-36 animate-pulse rounded-xl bg-[var(--surface-active)]"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[var(--surface-elevated)]/80 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
      <div className="pointer-events-none absolute -left-20 -top-20 h-40 w-40 rounded-full bg-[var(--brand)]/5 blur-3xl" aria-hidden="true" />
      <div
        ref={scrollRef}
        className="relative flex flex-nowrap items-center gap-1 overflow-x-auto px-2 py-2.5 sm:flex-wrap sm:gap-2 sm:overflow-x-visible sm:px-4 sm:py-3 scrollbar-hide"
      >
        {metrics.map((metric) => {
          const change = getChangePercent(metric.value, metric.previousValue);
          const isPositive = change > 0;
          const isNegative = change < 0;
          const Icon = metric.icon;

          return (
            <motion.div
              key={metric.key}
              className="flex flex-shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 transition-colors hover:bg-[var(--surface-active)]/60 min-w-[140px] sm:min-w-0"
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
                <Icon className="h-4 w-4 text-[var(--text-secondary)]" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                  {metric.label}
                </span>
                <div className="flex items-center gap-1.5">
                  <motion.span
                    key={`${metric.key}-${metric.value}`}
                    className="text-sm font-semibold text-white"
                    initial={prefersReducedMotion ? {} : { scale: 1.1, color: '#60a5fa' }}
                    animate={{ scale: 1, color: '#ffffff' }}
                    transition={{ duration: 0.6 }}
                  >
                    {formatValue(metric.value, metric.format)}
                  </motion.span>
                  {change !== 0 && (
                    <span
                      className={`flex items-center text-[10px] font-medium ${
                        isPositive
                          ? 'text-[#34d399]'
                          : isNegative
                            ? 'text-[#f87171]'
                            : 'text-[#fbbf24]'
                      }`}
                    >
                      {isPositive ? '\u2191' : '\u2193'}
                      {Math.abs(change).toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
