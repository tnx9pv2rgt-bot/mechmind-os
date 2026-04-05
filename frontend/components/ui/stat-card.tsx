'use client';

import { type LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: LucideIcon;
  iconColor?: string;
  loading?: boolean;
  className?: string;
  format?: 'currency' | 'number' | 'percent' | 'none';
}

function formatValue(value: string | number, format: StatCardProps['format']): string {
  if (typeof value === 'string') return value;
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
    case 'percent':
      return `${value.toFixed(1)}%`;
    case 'number':
      return new Intl.NumberFormat('it-IT').format(value);
    default:
      return String(value);
  }
}

export function StatCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  iconColor = 'text-[var(--brand)]',
  loading = false,
  className,
  format = 'none',
}: StatCardProps): React.ReactElement {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;
  const isNeutral = change === undefined || change === 0;

  if (loading) {
    return (
      <div className={cn('rounded-xl border border-[var(--border-default)] dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-primary)] p-5', className)}>
        <div className="h-4 w-24 bg-gray-200 dark:bg-[var(--surface-hover)] rounded animate-pulse mb-3" />
        <div className="h-8 w-32 bg-gray-200 dark:bg-[var(--surface-hover)] rounded animate-pulse mb-2" />
        <div className="h-3 w-20 bg-gray-200 dark:bg-[var(--surface-hover)] rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className={cn(
      'rounded-xl border border-[var(--border-default)] dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-primary)] p-5 transition-shadow hover:shadow-md',
      className
    )}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-tertiary)]">{title}</span>
        {Icon && (
          <div className={cn('p-1.5 rounded-lg bg-white dark:bg-[var(--surface-primary)]', iconColor)}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-[var(--text-primary)] dark:text-gray-50 tracking-tight">
        {formatValue(value, format)}
      </p>
      {change !== undefined && (
        <div className="flex items-center gap-1.5 mt-2">
          {isPositive && <TrendingUp className="h-3.5 w-3.5 text-green-500" />}
          {isNegative && <TrendingDown className="h-3.5 w-3.5 text-red-500" />}
          {isNeutral && <Minus className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />}
          <span className={cn(
            'text-xs font-medium',
            isPositive && 'text-green-600 dark:text-green-400',
            isNegative && 'text-red-600 dark:text-red-400',
            isNeutral && 'text-[var(--text-secondary)]',
          )}>
            {isPositive ? '+' : ''}{change.toFixed(1)}%
          </span>
          {changeLabel && (
            <span className="text-xs text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]-light">{changeLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
