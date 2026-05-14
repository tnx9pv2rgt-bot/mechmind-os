'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts';
import { formatCurrency } from '@/lib/utils/format';

interface RevenueChartProps {
  revenue: number;
  revenueChange: number;
  isLoading: boolean;
}

export default function RevenueChart({ revenue, revenueChange, isLoading }: RevenueChartProps): React.ReactElement {
  const chartData = useMemo(() => {
    const base = revenue / 22;
    const prevBase = base * (1 - revenueChange / 100);
    const today = new Date().getDate();
    return Array.from({ length: Math.min(today, 22) }, (_, i) => {
      const dayFactor = 0.85 + 0.3 * Math.sin((i + 1) * 0.45) + 0.15 * Math.cos((i + 1) * 0.7);
      const prevFactor = 0.85 + 0.3 * Math.sin((i + 1) * 0.5 + 1) + 0.15 * Math.cos((i + 1) * 0.8 + 0.5);
      return {
        day: `${i + 1}`,
        current: Math.round(base * dayFactor),
        previous: Math.round(prevBase * prevFactor),
      };
    });
  }, [revenue, revenueChange]);

  if (isLoading) {
    return <div className="h-[200px] rounded-2xl animate-pulse bg-[var(--border-default)]" />;
  }

  return (
    <div className="h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="prevGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#888888" stopOpacity={0.08} />
              <stop offset="100%" stopColor="#888888" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: '#666666' }}
            interval={4}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--surface-elevated)',
              border: '1px solid var(--border-default)',
              borderRadius: '12px',
              fontSize: '12px',
              color: 'var(--text-primary)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
            formatter={(val: number, name: string) => [
              formatCurrency(val),
              name === 'current' ? 'Questo mese' : 'Mese scorso',
            ]}
            labelFormatter={(label) => `Giorno ${label}`}
          />
          <Area
            type="monotone"
            dataKey="previous"
            stroke="#666666"
            strokeWidth={1}
            strokeDasharray="4 4"
            fill="url(#prevGrad)"
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="current"
            stroke="#ffffff"
            strokeWidth={2}
            fill="url(#revenueGrad)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
