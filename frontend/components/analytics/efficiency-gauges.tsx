'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import useSWR from 'swr';
import { GlassCard } from './glass-card';

const COLORS = {
  blue: 'var(--status-info)',
  green: 'var(--status-success)',
  amber: 'var(--status-warning)',
  red: 'var(--status-error)',
  purple: '#a78bfa',
  cyan: '#22d3ee',
} as const;

interface GaugeMetric {
  label: string;
  value: number;
  target: number;
  accent: string;
}

const DEFAULT_METRICS: GaugeMetric[] = [
  { label: 'Efficienza Tecnici', value: 87, target: 90, accent: COLORS.blue },
  { label: 'Utilizzo Baie', value: 72, target: 80, accent: COLORS.purple },
  { label: 'Tasso Completamento', value: 94, target: 95, accent: COLORS.cyan },
  { label: 'First-Time Fix', value: 68, target: 75, accent: COLORS.amber },
];

function getStatusColor(value: number, target: number): string {
  const ratio = value / target;
  if (ratio >= 1) return COLORS.green;
  if (ratio >= 0.9) return COLORS.amber;
  return COLORS.red;
}

interface RadialGaugeProps {
  metric: GaugeMetric;
  index: number;
  isInView: boolean;
}

function RadialGauge({ metric, index, isInView }: RadialGaugeProps): React.ReactElement {
  const { label, value, target, accent } = metric;
  const statusColor = getStatusColor(value, target);

  const radius = 70;
  const strokeWidth = 10;
  const cx = 90;
  const cy = 90;
  const circumference = 2 * Math.PI * radius;

  // Arc spans 270 degrees (3/4 of circle), starting from 135 degrees
  const arcLength = circumference * 0.75;
  const filledLength = arcLength * (value / 100);
  const targetAngle = 135 + (270 * (target / 100));
  const targetRad = (targetAngle * Math.PI) / 180;
  const targetX = cx + radius * Math.cos(targetRad);
  const targetY = cy + radius * Math.sin(targetRad);

  const gradientId = `gauge-gradient-${index}`;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 180 160" className="w-full max-w-[200px]">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={accent} />
            <stop offset="100%" stopColor={statusColor} />
          </linearGradient>
        </defs>

        {/* Track background */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#3a3a3a"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={0}
          transform={`rotate(135 ${cx} ${cy})`}
        />

        {/* Animated filled arc */}
        <motion.circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={arcLength - filledLength}
          transform={`rotate(135 ${cx} ${cy})`}
          initial={{ strokeDashoffset: arcLength }}
          animate={isInView ? { strokeDashoffset: arcLength - filledLength } : { strokeDashoffset: arcLength }}
          transition={{ duration: 1.2, delay: index * 0.15, ease: 'easeOut' }}
        />

        {/* Target marker dot */}
        <motion.circle
          cx={targetX}
          cy={targetY}
          r={5}
          fill="#ffffff"
          stroke={statusColor}
          strokeWidth={2}
          initial={{ opacity: 0, scale: 0 }}
          animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
          transition={{ duration: 0.4, delay: index * 0.15 + 1 }}
        />

        {/* Value text */}
        <motion.text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          dominantBaseline="central"
          className="text-3xl font-bold"
          fill="#ffffff"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6, delay: index * 0.15 + 0.5 }}
        >
          {value}%
        </motion.text>

        {/* Target label */}
        <motion.text
          x={cx}
          y={cy + 20}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#888888"
          fontSize={11}
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6, delay: index * 0.15 + 0.7 }}
        >
          Obiettivo: {target}%
        </motion.text>
      </svg>

      <p className="mt-1 text-center text-xs font-medium text-[var(--text-secondary)] sm:text-sm">
        {label}
      </p>
    </div>
  );
}

interface DashboardStats {
  efficiency?: number;
  conversion?: number;
  bayUtilization?: number;
  completionRate?: number;
  firstTimeFix?: number;
}

interface DashboardResponse {
  stats?: DashboardStats;
}

const fetcher = (url: string): Promise<DashboardResponse> =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error(`Errore ${res.status}`);
    return res.json() as Promise<DashboardResponse>;
  });

export function EfficiencyGauges(): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: '-50px' });

  const { data } = useSWR<DashboardResponse>('/api/dashboard', fetcher, {
    revalidateOnFocus: false,
  });

  const stats = data?.stats;

  const metrics: GaugeMetric[] = [
    {
      label: 'Efficienza Tecnici',
      value: stats?.efficiency ?? DEFAULT_METRICS[0].value,
      target: DEFAULT_METRICS[0].target,
      accent: DEFAULT_METRICS[0].accent,
    },
    {
      label: 'Utilizzo Baie',
      value: stats?.bayUtilization ?? DEFAULT_METRICS[1].value,
      target: DEFAULT_METRICS[1].target,
      accent: DEFAULT_METRICS[1].accent,
    },
    {
      label: 'Tasso Completamento',
      value: stats?.completionRate ?? DEFAULT_METRICS[2].value,
      target: DEFAULT_METRICS[2].target,
      accent: DEFAULT_METRICS[2].accent,
    },
    {
      label: 'First-Time Fix',
      value: stats?.firstTimeFix ?? DEFAULT_METRICS[3].value,
      target: DEFAULT_METRICS[3].target,
      accent: DEFAULT_METRICS[3].accent,
    },
  ];

  return (
    <GlassCard
      title="Efficienza Operativa"
      subtitle="Metriche di performance in tempo reale"
    >
      <div ref={containerRef} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map((metric, i) => (
          <RadialGauge key={metric.label} metric={metric} index={i} isInView={isInView} />
        ))}
      </div>
    </GlassCard>
  );
}
