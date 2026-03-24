'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Euro,
  Users,
  ClipboardList,
  TrendingUp,
  Percent,
  Loader2,
  AlertCircle,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  Wrench,
  ArrowLeft,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import { WorkloadHeatmap } from '@/components/analytics/workload-heatmap';
import { ConversionFunnel } from '@/components/analytics/conversion-funnel';
import { EfficiencyGauges } from '@/components/analytics/efficiency-gauges';
import { RevenueSankey } from '@/components/analytics/revenue-sankey';
import { RevenueTreemap } from '@/components/analytics/revenue-treemap';
import { KpiBulletChart } from '@/components/analytics/kpi-bullet-chart';
import { LiveKpiTicker } from '@/components/analytics/live-kpi-ticker';
import { AnomalyAlerts } from '@/components/analytics/anomaly-alerts';
import { BigBoardToggle } from '@/components/analytics/big-board-toggle';
import { RealtimeActivityFeed } from '@/components/analytics/realtime-activity-feed';
import { ExportMenu } from '@/components/analytics/export-menu';
import { DashboardCustomizer, useDashboardPrefs } from '@/components/analytics/dashboard-customizer';
import { PeriodComparison } from '@/components/analytics/period-comparison';
import { useAnalyticsKeyboard, KeyboardShortcutsOverlay } from '@/components/analytics/keyboard-nav';

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

const colors = {
  bg: '#1a1a1a',
  surface: '#2f2f2f',
  surfaceHover: '#383838',
  border: '#4e4e4e',
  borderSubtle: '#3a3a3a',
  textPrimary: '#ffffff',
  textSecondary: '#b4b4b4',
  textTertiary: '#888888',
  textMuted: '#666666',
  accent: '#ffffff',
  success: '#34d399',
  warning: '#fbbf24',
  error: '#f87171',
  info: '#60a5fa',
  purple: '#a78bfa',
  glow: 'rgba(255,255,255,0.03)',
  glowStrong: 'rgba(255,255,255,0.06)',
};

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Oggi' },
  { value: 'week', label: 'Settimana' },
  { value: 'month', label: 'Mese' },
  { value: 'quarter', label: 'Trimestre' },
  { value: 'year', label: 'Anno' },
];

const PIE_COLORS = [colors.info, colors.success, colors.warning, colors.purple, colors.error, '#5ac8fa', '#ffcc00'];

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Bozza',
  OPEN: 'Aperto',
  IN_PROGRESS: 'In Lavorazione',
  QC: 'Controllo Qualità',
  COMPLETED: 'Completato',
  DELIVERED: 'Consegnato',
  CANCELLED: 'Annullato',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const SECTION_IDS = ['kpi', 'charts', 'gauges', 'heatmap', 'funnel', 'sankey', 'treemap', 'bullet', 'control-center'] as const;

const kpiIconColors: Record<string, string> = {
  Fatturato: colors.success,
  'OdL Completati': colors.info,
  'Clienti Nuovi': colors.purple,
  'Ticket Medio': colors.warning,
  'Tasso Conversione': colors.error,
};

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
    { label: 'Fatturato', value: formatCurrency(kpis.revenue), icon: Euro },
    { label: 'OdL Completati', value: String(kpis.completedOrders), icon: ClipboardList },
    { label: 'Clienti Nuovi', value: String(kpis.newCustomers), icon: Users },
    { label: 'Ticket Medio', value: formatCurrency(kpis.avgTicket), icon: TrendingUp },
    { label: 'Tasso Conversione', value: `${kpis.conversionRate.toFixed(1)}%`, icon: Percent },
  ];

  return (
    <div className='min-h-screen' style={{ backgroundColor: colors.bg }}>
      {/* Header */}
      <header
        className='sticky top-0 z-30 backdrop-blur-xl border-b'
        style={{ backgroundColor: `${colors.bg}cc`, borderColor: colors.borderSubtle }}
      >
        <div className='px-6 lg:px-8 py-5 flex items-center justify-between'>
          <div className='flex items-center gap-4'>
            <Link
              href='/dashboard'
              className='flex items-center justify-center w-10 h-10 rounded-xl transition-colors'
              style={{ color: colors.textSecondary }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <ArrowLeft className='h-5 w-5' />
            </Link>
            <div>
              <h1 className='text-[28px] font-light' style={{ color: colors.textPrimary }}>
                Analytics
              </h1>
              <p className='text-[13px] mt-0.5' style={{ color: colors.textTertiary }}>
                Analisi complete dell&apos;attivita della tua officina
              </p>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <ExportMenu />
            <DashboardCustomizer />
          </div>
        </div>
      </header>

      <motion.div className='p-6 lg:p-8 space-y-6' initial='hidden' animate='visible' variants={containerVariants}>
        {/* Live KPI Ticker */}
        <motion.div variants={itemVariants}>
          <LiveKpiTicker />
        </motion.div>

        {/* Period Selector */}
        <motion.div variants={itemVariants}>
          <div className='flex flex-wrap items-center justify-center gap-2'>
            <Calendar className='h-4 w-4' style={{ color: colors.textTertiary }} />
            {PERIOD_OPTIONS.map(p => (
              <button
                key={p.value}
                onClick={() => { setPeriod(p.value); setShowCustomRange(false); }}
                className='h-10 px-4 rounded-full text-sm font-medium transition-all'
                style={
                  period === p.value && !showCustomRange
                    ? { backgroundColor: colors.textPrimary, color: colors.bg }
                    : { backgroundColor: 'transparent', color: colors.textSecondary, border: `1px solid ${colors.borderSubtle}` }
                }
              >
                {p.label}
              </button>
            ))}
            <button
              onClick={() => setShowCustomRange(!showCustomRange)}
              className='h-10 px-4 rounded-full text-sm font-medium transition-all'
              style={
                showCustomRange
                  ? { backgroundColor: colors.textPrimary, color: colors.bg }
                  : { backgroundColor: 'transparent', color: colors.textSecondary, border: `1px solid ${colors.borderSubtle}` }
              }
            >
              Personalizzato
            </button>
            {showCustomRange && (
              <div className='flex items-center gap-2'>
                <input
                  type='date'
                  value={customFrom}
                  onChange={e => setCustomFrom(e.target.value)}
                  className='text-sm px-3 py-2 rounded-xl border focus:outline-none focus:border-white/30'
                  style={{
                    backgroundColor: colors.glowStrong,
                    borderColor: colors.borderSubtle,
                    color: colors.textPrimary,
                  }}
                />
                <span style={{ color: colors.textTertiary }}>-</span>
                <input
                  type='date'
                  value={customTo}
                  onChange={e => setCustomTo(e.target.value)}
                  className='text-sm px-3 py-2 rounded-xl border focus:outline-none focus:border-white/30'
                  style={{
                    backgroundColor: colors.glowStrong,
                    borderColor: colors.borderSubtle,
                    color: colors.textPrimary,
                  }}
                />
              </div>
            )}
          </div>
        </motion.div>

        {/* Error */}
        {error && (
          <motion.div variants={itemVariants}>
            <div
              className='rounded-2xl border p-4 flex items-center justify-between'
              style={{ backgroundColor: colors.surface, borderColor: colors.error + '33' }}
            >
              <div className='flex items-center gap-3'>
                <AlertCircle className='h-5 w-5' style={{ color: colors.error }} />
                <p className='text-[13px]' style={{ color: colors.textSecondary }}>
                  Impossibile caricare i dati analytics. Verifica la connessione e riprova.
                </p>
              </div>
              <button
                onClick={() => mutate()}
                className='px-4 py-2 rounded-xl text-sm font-medium transition-colors'
                style={{ border: `1px solid ${colors.borderSubtle}`, color: colors.textSecondary }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                Riprova
              </button>
            </div>
          </motion.div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className='flex items-center justify-center py-12'>
            <Loader2 className='h-8 w-8 animate-spin' style={{ color: colors.textTertiary }} />
          </div>
        )}

        {/* KPI Row */}
        {!isLoading && (
          <motion.div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4' variants={containerVariants}>
            {kpiCards.map(kpi => (
              <motion.div
                key={kpi.label}
                variants={itemVariants}
                className='rounded-2xl border h-[120px] flex flex-col justify-center px-5'
                style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
              >
                <div className='flex items-center gap-2 mb-2'>
                  <kpi.icon className='h-4 w-4' style={{ color: kpiIconColors[kpi.label] || colors.textTertiary }} />
                  <p className='text-[12px] font-medium uppercase tracking-wider' style={{ color: colors.textTertiary }}>
                    {kpi.label}
                  </p>
                </div>
                <p
                  className='text-[22px] font-semibold'
                  style={{ color: colors.textPrimary, fontVariantNumeric: 'tabular-nums' }}
                >
                  {kpi.value}
                </p>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Charts Grid */}
        {!isLoading && (
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            {/* Revenue Bar Chart */}
            <motion.div variants={itemVariants}>
              <div
                className='rounded-2xl border overflow-hidden'
                style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
              >
                <div className='px-5 py-4 border-b flex items-center gap-2' style={{ borderColor: colors.borderSubtle }}>
                  <BarChart3 className='h-5 w-5' style={{ color: colors.success }} />
                  <h3 className='text-[15px] font-semibold' style={{ color: colors.textPrimary }}>Fatturato</h3>
                </div>
                <div className='p-5'>
                  {revenueChart.length === 0 ? (
                    <div className='text-center py-12'>
                      <BarChart3 className='h-8 w-8 mx-auto mb-3' style={{ color: colors.borderSubtle }} />
                      <p className='text-[13px]' style={{ color: colors.textTertiary }}>Nessun dato disponibile</p>
                    </div>
                  ) : (
                    <div className='h-72'>
                      <ResponsiveContainer width='100%' height='100%'>
                        <BarChart data={revenueChart}>
                          <CartesianGrid strokeDasharray='3 3' stroke={colors.borderSubtle} />
                          <XAxis dataKey='period' tick={{ fontSize: 11, fill: colors.textTertiary }} stroke={colors.borderSubtle} />
                          <YAxis tick={{ fontSize: 11, fill: colors.textTertiary }} stroke={colors.borderSubtle} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                          <Tooltip
                            formatter={(value: number) => [formatCurrency(value), 'Fatturato']}
                            contentStyle={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, color: colors.textPrimary }}
                            labelStyle={{ color: colors.textSecondary }}
                          />
                          <Bar dataKey='revenue' fill={colors.success} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Work Orders by Status - Pie Chart */}
            <motion.div variants={itemVariants}>
              <div
                className='rounded-2xl border overflow-hidden'
                style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
              >
                <div className='px-5 py-4 border-b flex items-center gap-2' style={{ borderColor: colors.borderSubtle }}>
                  <PieChartIcon className='h-5 w-5' style={{ color: colors.info }} />
                  <h3 className='text-[15px] font-semibold' style={{ color: colors.textPrimary }}>OdL per Stato</h3>
                </div>
                <div className='p-5'>
                  {workOrdersByStatus.length === 0 ? (
                    <div className='text-center py-12'>
                      <PieChartIcon className='h-8 w-8 mx-auto mb-3' style={{ color: colors.borderSubtle }} />
                      <p className='text-[13px]' style={{ color: colors.textTertiary }}>Nessun dato disponibile</p>
                    </div>
                  ) : (
                    <div className='h-72'>
                      <ResponsiveContainer width='100%' height='100%'>
                        <PieChart>
                          <Pie
                            data={workOrdersByStatus.map(d => ({ ...d, name: STATUS_LABELS[d.status] || d.status }))}
                            cx='50%'
                            cy='50%'
                            outerRadius={100}
                            innerRadius={50}
                            paddingAngle={2}
                            dataKey='count'
                            nameKey='name'
                            label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {workOrdersByStatus.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, color: colors.textPrimary }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Top Services - Horizontal Bar */}
            <motion.div variants={itemVariants}>
              <div
                className='rounded-2xl border overflow-hidden'
                style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
              >
                <div className='px-5 py-4 border-b flex items-center gap-2' style={{ borderColor: colors.borderSubtle }}>
                  <Wrench className='h-5 w-5' style={{ color: colors.warning }} />
                  <h3 className='text-[15px] font-semibold' style={{ color: colors.textPrimary }}>Top Servizi</h3>
                </div>
                <div className='p-5'>
                  {topServices.length === 0 ? (
                    <div className='text-center py-12'>
                      <Wrench className='h-8 w-8 mx-auto mb-3' style={{ color: colors.borderSubtle }} />
                      <p className='text-[13px]' style={{ color: colors.textTertiary }}>Nessun dato disponibile</p>
                    </div>
                  ) : (
                    <div className='h-72'>
                      <ResponsiveContainer width='100%' height='100%'>
                        <BarChart data={topServices} layout='vertical'>
                          <CartesianGrid strokeDasharray='3 3' stroke={colors.borderSubtle} />
                          <XAxis type='number' tick={{ fontSize: 11, fill: colors.textTertiary }} stroke={colors.borderSubtle} />
                          <YAxis dataKey='name' type='category' tick={{ fontSize: 11, fill: colors.textTertiary }} stroke={colors.borderSubtle} width={120} />
                          <Tooltip
                            contentStyle={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, color: colors.textPrimary }}
                          />
                          <Bar dataKey='count' fill={colors.warning} radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Customer Trends - Line Chart */}
            <motion.div variants={itemVariants}>
              <div
                className='rounded-2xl border overflow-hidden'
                style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
              >
                <div className='px-5 py-4 border-b flex items-center gap-2' style={{ borderColor: colors.borderSubtle }}>
                  <Users className='h-5 w-5' style={{ color: colors.purple }} />
                  <h3 className='text-[15px] font-semibold' style={{ color: colors.textPrimary }}>Andamento Clienti</h3>
                </div>
                <div className='p-5'>
                  {customerTrends.length === 0 ? (
                    <div className='text-center py-12'>
                      <Users className='h-8 w-8 mx-auto mb-3' style={{ color: colors.borderSubtle }} />
                      <p className='text-[13px]' style={{ color: colors.textTertiary }}>Nessun dato disponibile</p>
                    </div>
                  ) : (
                    <div className='h-72'>
                      <ResponsiveContainer width='100%' height='100%'>
                        <LineChart data={customerTrends}>
                          <CartesianGrid strokeDasharray='3 3' stroke={colors.borderSubtle} />
                          <XAxis dataKey='period' tick={{ fontSize: 11, fill: colors.textTertiary }} stroke={colors.borderSubtle} />
                          <YAxis tick={{ fontSize: 11, fill: colors.textTertiary }} stroke={colors.borderSubtle} />
                          <Tooltip
                            contentStyle={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, color: colors.textPrimary }}
                          />
                          <Legend wrapperStyle={{ color: colors.textSecondary }} />
                          <Line type='monotone' dataKey='newCustomers' name='Nuovi' stroke={colors.purple} strokeWidth={2} dot={false} />
                          <Line type='monotone' dataKey='returningCustomers' name='Ritorno' stroke={colors.info} strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Capacity Utilization - Area Chart */}
            <motion.div variants={itemVariants}>
              <div
                className='rounded-2xl border overflow-hidden'
                style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
              >
                <div className='px-5 py-4 border-b flex items-center gap-2' style={{ borderColor: colors.borderSubtle }}>
                  <TrendingUp className='h-5 w-5' style={{ color: colors.success }} />
                  <h3 className='text-[15px] font-semibold' style={{ color: colors.textPrimary }}>Tasso Occupazione</h3>
                </div>
                <div className='p-5'>
                  {capacityUtilization.length === 0 ? (
                    <div className='text-center py-12'>
                      <TrendingUp className='h-8 w-8 mx-auto mb-3' style={{ color: colors.borderSubtle }} />
                      <p className='text-[13px]' style={{ color: colors.textTertiary }}>Nessun dato disponibile</p>
                    </div>
                  ) : (
                    <div className='h-72'>
                      <ResponsiveContainer width='100%' height='100%'>
                        <AreaChart data={capacityUtilization}>
                          <CartesianGrid strokeDasharray='3 3' stroke={colors.borderSubtle} />
                          <XAxis dataKey='period' tick={{ fontSize: 11, fill: colors.textTertiary }} stroke={colors.borderSubtle} />
                          <YAxis tick={{ fontSize: 11, fill: colors.textTertiary }} stroke={colors.borderSubtle} unit='%' domain={[0, 100]} />
                          <Tooltip
                            formatter={(value: number) => [`${value}%`, 'Occupazione']}
                            contentStyle={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, color: colors.textPrimary }}
                          />
                          <Area type='monotone' dataKey='utilization' stroke={colors.success} fill={colors.success} fillOpacity={0.2} strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Revenue per Technician - Bar Chart */}
            <motion.div variants={itemVariants}>
              <div
                className='rounded-2xl border overflow-hidden'
                style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
              >
                <div className='px-5 py-4 border-b flex items-center gap-2' style={{ borderColor: colors.borderSubtle }}>
                  <Wrench className='h-5 w-5' style={{ color: colors.info }} />
                  <h3 className='text-[15px] font-semibold' style={{ color: colors.textPrimary }}>Fatturato per Tecnico</h3>
                </div>
                <div className='p-5'>
                  {revenueByTechnician.length === 0 ? (
                    <div className='text-center py-12'>
                      <Wrench className='h-8 w-8 mx-auto mb-3' style={{ color: colors.borderSubtle }} />
                      <p className='text-[13px]' style={{ color: colors.textTertiary }}>Nessun dato disponibile</p>
                    </div>
                  ) : (
                    <div className='h-72'>
                      <ResponsiveContainer width='100%' height='100%'>
                        <BarChart data={revenueByTechnician}>
                          <CartesianGrid strokeDasharray='3 3' stroke={colors.borderSubtle} />
                          <XAxis dataKey='name' tick={{ fontSize: 11, fill: colors.textTertiary }} stroke={colors.borderSubtle} />
                          <YAxis tick={{ fontSize: 11, fill: colors.textTertiary }} stroke={colors.borderSubtle} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                          <Tooltip
                            formatter={(value: number) => [formatCurrency(value), 'Fatturato']}
                            contentStyle={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, color: colors.textPrimary }}
                          />
                          <Bar dataKey='revenue' fill={colors.info} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
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
            <motion.div variants={itemVariants}>
              <h2 className='text-xl font-semibold flex items-center gap-2' style={{ color: colors.textPrimary }}>
                <span className='inline-block h-2 w-2 rounded-full animate-pulse' style={{ backgroundColor: colors.success }} />
                Centro Controllo
              </h2>
            </motion.div>
            <motion.div variants={itemVariants}>
              <AnomalyAlerts />
            </motion.div>
            <motion.div variants={itemVariants}>
              <RealtimeActivityFeed />
            </motion.div>
          </div>
        )}

        {/* Confronto Periodi */}
        {!isLoading && (
          <motion.div variants={itemVariants} className='mt-8'>
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
