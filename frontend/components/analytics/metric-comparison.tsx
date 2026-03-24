'use client';

import { useMemo } from 'react';
import { GlassCard } from './glass-card';
import { AnimatedCounter } from './animated-counter';
import { SparklineMini } from './sparkline-mini';

type MetricFormat = 'currency' | 'percent' | 'number';

interface MetricComparisonProps {
  label: string;
  current: number;
  previous: number;
  format?: MetricFormat;
  trendData?: number[];
}

function getFormatProps(format: MetricFormat, value: number): {
  prefix: string;
  suffix: string;
  decimals: number;
  displayValue: number;
} {
  switch (format) {
    case 'currency':
      return { prefix: '\u20AC ', suffix: '', decimals: 2, displayValue: value };
    case 'percent':
      return { prefix: '', suffix: '%', decimals: 1, displayValue: value };
    case 'number':
    default:
      return { prefix: '', suffix: '', decimals: 0, displayValue: value };
  }
}

function computeDelta(current: number, previous: number): {
  percentage: number;
  isPositive: boolean;
  isNeutral: boolean;
} {
  if (previous === 0) {
    return { percentage: current > 0 ? 100 : 0, isPositive: current >= 0, isNeutral: current === 0 };
  }
  const percentage = ((current - previous) / Math.abs(previous)) * 100;
  return {
    percentage: Math.abs(percentage),
    isPositive: percentage >= 0,
    isNeutral: Math.abs(percentage) < 0.1,
  };
}

export function MetricComparison({
  label,
  current,
  previous,
  format = 'number',
  trendData,
}: MetricComparisonProps): React.ReactElement {
  const delta = useMemo(() => computeDelta(current, previous), [current, previous]);
  const formatProps = useMemo(() => getFormatProps(format, current), [format, current]);

  const deltaColor = delta.isNeutral
    ? 'text-[#888888]'
    : delta.isPositive
      ? 'text-[#34d399]'
      : 'text-[#f87171]';

  const sparklineColor = delta.isNeutral
    ? '#888888'
    : delta.isPositive
      ? '#34d399'
      : '#f87171';

  // Generate synthetic trend data if none provided
  const sparkData = useMemo(() => {
    if (trendData && trendData.length >= 2) return trendData;
    const steps = 7;
    const diff = current - previous;
    return Array.from({ length: steps }, (_, i) => {
      const progress = i / (steps - 1);
      const noise = (Math.sin(i * 2.5) * 0.1 * Math.abs(diff || 1));
      return previous + diff * progress + noise;
    });
  }, [trendData, current, previous]);

  return (
    <GlassCard title={label} size="compact">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <AnimatedCounter
            value={formatProps.displayValue}
            prefix={formatProps.prefix}
            suffix={formatProps.suffix}
            decimals={formatProps.decimals}
            className="text-2xl font-bold text-white sm:text-3xl"
          />
          <div className={`mt-1 flex items-center gap-1.5 text-sm font-medium ${deltaColor}`}>
            {!delta.isNeutral && (
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden="true"
                className={delta.isPositive ? '' : 'rotate-180'}
              >
                <path
                  d="M6 2L10 7H2L6 2Z"
                  fill="currentColor"
                />
              </svg>
            )}
            <span>{delta.percentage.toFixed(1)}%</span>
            <span className="text-[#888888]">vs periodo prec.</span>
          </div>
        </div>

        <div className="flex-shrink-0">
          <SparklineMini
            data={sparkData}
            color={sparklineColor}
            width={80}
            height={32}
            showDot
            showArea
          />
        </div>
      </div>
    </GlassCard>
  );
}
