'use client';

import { useState, useRef, useEffect } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import {
  Euro,
  Users,
  ClipboardList,
  TrendingUp,
  Percent,
  Loader2,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { useDashboardPrefs } from '@/components/analytics/dashboard-customizer';
import { useAnalyticsKeyboard } from '@/components/analytics/keyboard-nav';

const ChartSkeleton = ({ className }: { className?: string }) => (
  <div className={`rounded-2xl animate-pulse bg-[var(--border-default)] ${className ?? 'h-64'}`} />
);

const WorkloadHeatmap = dynamic(
  () => import('@/components/analytics/workload-heatmap').then(m => ({ default: m.WorkloadHeatmap })),
  { ssr: false, loading: () => <ChartSkeleton className='h-64' /> }
);
const ConversionFunnel = dynamic(
  () => import('@/components/analytics/conversion-funnel').then(m => ({ default: m.ConversionFunnel })),
  { ssr: false, loading: () => <ChartSkeleton className='h-64' /> }
);
const EfficiencyGauges = dynamic(
  () => import('@/components/analytics/efficiency-gauges').then(m => ({ default: m.EfficiencyGauges })),
  { ssr: false, loading: () => <ChartSkeleton className='h-48' /> }
);
const RevenueSankey = dynamic(
  () => import('@/components/analytics/revenue-sankey').then(m => ({ default: m.RevenueSankey })),
  { ssr: false, loading: () => <ChartSkeleton className='h-80' /> }
);
const RevenueTreemap = dynamic(
  () => import('@/components/analytics/revenue-treemap').then(m => ({ default: m.RevenueTreemap })),
  { ssr: false, loading: () => <ChartSkeleton className='h-64' /> }
);
const KpiBulletChart = dynamic(
  () => import('@/components/analytics/kpi-bullet-chart').then(m => ({ default: m.KpiBulletChart })),
  { ssr: false, loading: () => <ChartSkeleton className='h-64' /> }
);
const LiveKpiTicker = dynamic(
  () => import('@/components/analytics/live-kpi-ticker').then(m => ({ default: m.LiveKpiTicker })),
  { ssr: false, loading: () => <ChartSkeleton className='h-12' /> }
);
const AnomalyAlerts = dynamic(
  () => import('@/components/analytics/anomaly-alerts').then(m => ({ default: m.AnomalyAlerts })),
  { ssr: false, loading: () => <ChartSkeleton className='h-32' /> }
);
const BigBoardToggle = dynamic(
  () => import('@/components/analytics/big-board-toggle').then(m => ({ default: m.BigBoardToggle })),
  { ssr: false }
);
const RealtimeActivityFeed = dynamic(
  () => import('@/components/analytics/realtime-activity-feed').then(m => ({ default: m.RealtimeActivityFeed })),
  { ssr: false, loading: () => <ChartSkeleton className='h-48' /> }
);
const ExportMenu = dynamic(
  () => import('@/components/analytics/export-menu').then(m => ({ default: m.ExportMenu })),
  { ssr: false }
);
const DashboardCustomizer = dynamic(
  () => import('@/components/analytics/dashboard-customizer').then(m => ({ default: m.DashboardCustomizer })),
  { ssr: false }
);
const PeriodComparison = dynamic(
  () => import('@/components/analytics/period-comparison').then(m => ({ default: m.PeriodComparison })),
  { ssr: false, loading: () => <ChartSkeleton className='h-64' /> }
);
const KeyboardShortcutsOverlay = dynamic(
  () => import('@/components/analytics/keyboard-nav').then(m => ({ default: m.KeyboardShortcutsOverlay })),
  { ssr: false }
);
import { AppleButton } from '@/components/ui/apple-button';
import { AppleCard, AppleCardHeader, AppleCardContent } from '@/components/ui/apple-card';

interface AnalyticsKPIs {
  revenue: number;
  completedOrders: number;
  newCustomers: number;
  avgTicket: number;
  conversionRate: number;
}

interface RevenueData {
  period: string;
  revenue: number;
}

interface WorkOrderStatusData {
  status: string;
  count: number;
}

interface TopService {
  name: string;
  count: number;
}

interface CustomerTrend {
  period: string;
  newCustomers: number;
  returningCustomers: number;
}

interface CapacityData {
  period: string;
  utilization: number;
}

interface TechnicianRevenue {
  name: string;
  revenue: number;
}

interface AnalyticsResponse {
  kpis: AnalyticsKPIs;
  revenueChart: RevenueData[];
  workOrdersByStatus: WorkOrderStatusData[];
  topServices: TopService[];
  customerTrends: CustomerTrend[];
  capacityUtilization: CapacityData[];
  revenueByTechnician: TechnicianRevenue[];
}

const AnalyticsChartsGrid = dynamic(
  () => import('@/components/analytics/analytics-charts-grid'),
  {
    ssr: false,
    loading: () => (
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className='h-[340px] rounded-2xl animate-pulse bg-[var(--border-default)]' />
        ))}
      </div>
    ),
  }
);

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Oggi' },
  { value: 'week', label: 'Settimana' },
  { value: 'month', label: 'Mese' },
  { value: 'quarter', label: 'Trimestre' },
  { value: 'year', label: 'Anno' },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};

const statsCardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const listItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const SECTION_IDS = ['kpi', 'charts', 'gauges', 'heatmap', 'funnel', 'sankey', 'treemap', 'bullet', 'control-center'] as const;

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showCustomRange, setShowCustomRange] = useState(false);
  const { prefs } = useDashboardPrefs();
  const { showShortcuts, setShowShortcuts } = useAnalyticsKeyboard([...SECTION_IDS]);

  const queryParams = new URLSearchParams({ period });
  if (showCustomRange && customFrom) queryParams.set('from', customFrom);
  if (showCustomRange && customTo) queryParams.set('to', customTo);

  const { data: rawData, error, isLoading, mutate } = useSWR<{ data?: AnalyticsResponse } | AnalyticsResponse>(
    `/api/dashboard/analytics?${queryParams.toString()}`,
    fetcher
  );

  const analytics: AnalyticsResponse | null = (() => {
    if (!rawData) return null;
    return (rawData as { data?: AnalyticsResponse }).data || (rawData as AnalyticsResponse);
  })();

  const kpis = analytics?.kpis || { revenue: 0, completedOrders: 0, newCustomers: 0, avgTicket: 0, conversionRate: 0 };
  const revenueChart = analytics?.revenueChart || [];
  const workOrdersByStatus = analytics?.workOrdersByStatus || [];
  const topServices = analytics?.topServices || [];
  const customerTrends = analytics?.customerTrends || [];
  const capacityUtilization = analytics?.capacityUtilization || [];
  const revenueByTechnician = analytics?.revenueByTechnician || [];

  const kpiCards = [
    { label: 'Fatturato', value: formatCurrency(kpis.revenue), icon: Euro, color: 'bg-[var(--status-success)]' },
    { label: 'OdL Completati', value: String(kpis.completedOrders), icon: ClipboardList, color: 'bg-[var(--brand)]' },
    { label: 'Clienti Nuovi', value: String(kpis.newCustomers), icon: Users, color: 'bg-[var(--brand)]' },
    { label: 'Ticket Medio', value: formatCurrency(kpis.avgTicket), icon: TrendingUp, color: 'bg-[var(--status-warning)]' },
    { label: 'Tasso Conversione', value: `${kpis.conversionRate.toFixed(1)}%`, icon: Percent, color: 'bg-[var(--status-error)]' },
  ];

  return (
    <div>
      {/* Header */}
      <header>
        <div className='px-4 sm:px-8 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
          <div>
            <h1 className='text-headline text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Analytics</h1>
            <p className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] text-body mt-1'>
              Analisi complete dell&apos;attivita della tua officina
            </p>
          </div>
          <div className='flex items-center gap-3'>
            <ExportMenu />
            <DashboardCustomizer />
          </div>
        </div>
      </header>

      <motion.div className='p-6 lg:p-8 space-y-6' initial={false} animate='visible' variants={containerVariants}>
        {/* Live KPI Ticker */}
        <motion.div variants={listItemVariants}>
          <LiveKpiTicker />
        </motion.div>

        {/* Period Selector */}
        <motion.div variants={listItemVariants}>
          <AppleCard hover={false}>
            <AppleCardContent>
              <div className='flex flex-wrap items-center justify-center gap-2'>
                <Calendar className='h-4 w-4 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]' />
                {PERIOD_OPTIONS.map(p => (
                  <AppleButton
                    key={p.value}
                    variant={period === p.value && !showCustomRange ? 'primary' : 'ghost'}
                    size='sm'
                    onClick={() => { setPeriod(p.value); setShowCustomRange(false); }}
                  >
                    {p.label}
                  </AppleButton>
                ))}
                <AppleButton
                  variant={showCustomRange ? 'primary' : 'ghost'}
                  size='sm'
                  onClick={() => setShowCustomRange(!showCustomRange)}
                >
                  Personalizzato
                </AppleButton>
                {showCustomRange && (
                  <div className='flex items-center gap-2'>
                    <input
                      type='date'
                      value={customFrom}
                      onChange={e => setCustomFrom(e.target.value)}
                      className='h-10 px-3 rounded-xl text-body focus:outline-none focus:ring-2 focus:ring-apple-blue bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] border border-[var(--border-default)] dark:border-[var(--border-default)] text-[var(--text-primary)] dark:text-[var(--text-primary)]'
                    />
                    <span className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>-</span>
                    <input
                      type='date'
                      value={customTo}
                      onChange={e => setCustomTo(e.target.value)}
                      className='h-10 px-3 rounded-xl text-body focus:outline-none focus:ring-2 focus:ring-apple-blue bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] border border-[var(--border-default)] dark:border-[var(--border-default)] text-[var(--text-primary)] dark:text-[var(--text-primary)]'
                    />
                  </div>
                )}
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Error */}
        {error && (
          <motion.div variants={listItemVariants}>
            <AppleCard hover={false}>
              <AppleCardContent>
                <div role='alert' className='flex flex-col items-center justify-center py-12 text-center'>
                  <AlertCircle className='h-12 w-12 text-[var(--status-error)]/40 mb-4' />
                  <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                    Impossibile caricare i dati analytics. Verifica la connessione e riprova.
                  </p>
                  <AppleButton variant='ghost' className='mt-4' onClick={() => mutate()}>
                    Riprova
                  </AppleButton>
                </div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className='flex items-center justify-center py-12'>
            <Loader2 className='h-8 w-8 animate-spin text-[var(--brand)]' />
          </div>
        )}

        {/* KPI Row */}
        {!isLoading && (
          <motion.div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-bento' variants={containerVariants}>
            {kpiCards.map(kpi => (
              <motion.div key={kpi.label} variants={statsCardVariants}>
                <AppleCard hover={false}>
                  <AppleCardContent>
                    <div className='flex items-center justify-between mb-3'>
                      <div
                        className={`w-10 h-10 rounded-xl ${kpi.color} flex items-center justify-center`}
                      >
                        <kpi.icon className='h-5 w-5 text-[var(--text-on-brand)]' />
                      </div>
                    </div>
                    <p className='text-title-1 font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      {kpi.value}
                    </p>
                    <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>{kpi.label}</p>
                  </AppleCardContent>
                </AppleCard>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Charts Grid */}
        {!isLoading && (
          <AnalyticsChartsGrid
            revenueChart={revenueChart}
            workOrdersByStatus={workOrdersByStatus}
            topServices={topServices}
            customerTrends={customerTrends}
            capacityUtilization={capacityUtilization}
            revenueByTechnician={revenueByTechnician}
          />
        )}

        {/* Advanced Analytics */}
        {!isLoading && (
          <div className='mt-8 space-y-6'>
            <EfficiencyGauges />
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
              <WorkloadHeatmap />
              <ConversionFunnel />
            </div>
            <RevenueSankey />
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
              <RevenueTreemap />
              <KpiBulletChart />
            </div>
          </div>
        )}

        {/* Centro Controllo */}
        {!isLoading && (
          <div className='mt-8 space-y-6'>
            <motion.div variants={listItemVariants}>
              <h2 className='text-title-2 font-semibold flex items-center gap-2 text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                <span className='inline-block h-2 w-2 rounded-full animate-pulse bg-[var(--status-success)]' />
                Centro Controllo
              </h2>
            </motion.div>
            <motion.div variants={listItemVariants}>
              <AnomalyAlerts />
            </motion.div>
            <motion.div variants={listItemVariants}>
              <RealtimeActivityFeed />
            </motion.div>
          </div>
        )}

        {/* Confronto Periodi */}
        {!isLoading && (
          <motion.div variants={listItemVariants} className='mt-8'>
            <PeriodComparison />
          </motion.div>
        )}

        {/* Big Board Toggle */}
        <BigBoardToggle />
      </motion.div>

      {/* Keyboard Shortcuts Overlay */}
      <KeyboardShortcutsOverlay open={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  );
}
