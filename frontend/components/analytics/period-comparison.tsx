'use client';

import type { ReactElement } from 'react';
import { motion, useReducedMotion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { GlassCard } from './glass-card';

interface ComparisonMetric {
  label: string;
  currentValue: number;
  previousValue: number;
  format: 'currency' | 'number';
  color: string;
}

interface PeriodComparisonProps {
  /** Override the default metrics data */
  data?: ComparisonMetric[];
  currentPeriodLabel?: string;
  previousPeriodLabel?: string;
  className?: string;
}

function formatCurrencyIT(value: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumberIT(value: number): string {
  return new Intl.NumberFormat('it-IT').format(value);
}

function formatValue(value: number, format: 'currency' | 'number'): string {
  return format === 'currency' ? formatCurrencyIT(value) : formatNumberIT(value);
}

function calculateChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

const FALLBACK_METRICS: ComparisonMetric[] = [
  {
    label: 'Fatturato',
    currentValue: 45280,
    previousValue: 40150,
    format: 'currency',
    color: '#34d399',
  },
  {
    label: 'OdL Completati',
    currentValue: 128,
    previousValue: 115,
    format: 'number',
    color: '#60a5fa',
  },
  {
    label: 'Clienti Nuovi',
    currentValue: 34,
    previousValue: 29,
    format: 'number',
    color: '#a78bfa',
  },
  {
    label: 'Ticket Medio',
    currentValue: 354,
    previousValue: 349,
    format: 'currency',
    color: '#fbbf24',
  },
];

interface MetricBarProps {
  metric: ComparisonMetric;
  index: number;
  currentPeriodLabel: string;
  previousPeriodLabel: string;
}

function MetricBar({
  metric,
  index,
  currentPeriodLabel,
  previousPeriodLabel,
}: MetricBarProps): ReactElement {
  const reducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  const change = calculateChange(metric.currentValue, metric.previousValue);
  const maxValue = Math.max(metric.currentValue, metric.previousValue);
  const currentPercent = maxValue > 0 ? (metric.currentValue / maxValue) * 100 : 0;
  const previousPercent = maxValue > 0 ? (metric.previousValue / maxValue) * 100 : 0;

  const isPositive = change > 0;
  const isNeutral = Math.abs(change) < 0.5;

  return (
    <div ref={ref} className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white">{metric.label}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">
            {formatValue(metric.currentValue, metric.format)}
          </span>
          {/* Change badge */}
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
              isNeutral
                ? 'bg-[#383838] text-[#888888]'
                : isPositive
                  ? 'bg-[#34d399]/15 text-[#34d399]'
                  : 'bg-[#f87171]/15 text-[#f87171]'
            }`}
            aria-label={`Variazione ${change >= 0 ? '+' : ''}${change.toFixed(1)} percento`}
          >
            {isNeutral ? (
              <Minus className="h-3 w-3" />
            ) : isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {change >= 0 ? '+' : ''}
            {change.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Bars */}
      <div className="relative space-y-1">
        {/* Previous period bar (translucent) */}
        <div className="flex items-center gap-2">
          <span className="w-16 text-right text-[10px] text-[#666666]">{previousPeriodLabel}</span>
          <div className="relative h-5 flex-1 overflow-hidden rounded-full bg-[#1a1a1a]">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ backgroundColor: metric.color, opacity: 0.25 }}
              initial={{ width: '0%' }}
              animate={isInView ? { width: `${previousPercent}%` } : { width: '0%' }}
              transition={
                reducedMotion
                  ? { duration: 0 }
                  : { duration: 0.8, delay: index * 0.1, ease: 'easeOut' }
              }
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#666666]">
              {formatValue(metric.previousValue, metric.format)}
            </span>
          </div>
        </div>

        {/* Current period bar (solid) */}
        <div className="flex items-center gap-2">
          <span className="w-16 text-right text-[10px] text-[#b4b4b4]">{currentPeriodLabel}</span>
          <div className="relative h-5 flex-1 overflow-hidden rounded-full bg-[#1a1a1a]">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ backgroundColor: metric.color }}
              initial={{ width: '0%' }}
              animate={isInView ? { width: `${currentPercent}%` } : { width: '0%' }}
              transition={
                reducedMotion
                  ? { duration: 0 }
                  : { duration: 0.8, delay: index * 0.1 + 0.15, ease: 'easeOut' }
              }
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-white">
              {formatValue(metric.currentValue, metric.format)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PeriodComparison({
  data,
  currentPeriodLabel = 'Questo mese',
  previousPeriodLabel = 'Mese prec.',
  className = '',
}: PeriodComparisonProps): ReactElement {
  const metrics = data ?? FALLBACK_METRICS;

  return (
    <GlassCard
      title="Confronto Periodo"
      subtitle={`${currentPeriodLabel} vs ${previousPeriodLabel}`}
      className={className}
      glowColor="rgba(96,165,250,0.06)"
    >
      <div className="space-y-6">
        {metrics.map((metric, i) => (
          <MetricBar
            key={metric.label}
            metric={metric}
            index={i}
            currentPeriodLabel={currentPeriodLabel}
            previousPeriodLabel={previousPeriodLabel}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-6 border-t border-[#3a3a3a] pt-4">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-5 rounded-full bg-[#60a5fa]" />
          <span className="text-xs text-[#b4b4b4]">{currentPeriodLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-5 rounded-full bg-[#60a5fa]/25" />
          <span className="text-xs text-[#b4b4b4]">{previousPeriodLabel}</span>
        </div>
      </div>
    </GlassCard>
  );
}
