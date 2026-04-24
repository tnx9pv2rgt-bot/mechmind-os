'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
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
  BarChart3,
  PieChart as PieChartIcon,
  Wrench,
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

const CHART_COLORS = {
  border: 'var(--border-default)',
  surface: 'var(--surface-elevated)',
  textTertiary: '#888888',
  success: 'var(--status-success)',
  warning: 'var(--status-warning)',
  error: 'var(--status-error)',
  info: 'var(--status-info)',
  purple: '#a78bfa',
};

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Oggi' },
  { value: 'week', label: 'Settimana' },
  { value: 'month', label: 'Mese' },
  { value: 'quarter', label: 'Trimestre' },
  { value: 'year', label: 'Anno' },
];

const PIE_COLORS = [CHART_COLORS.info, CHART_COLORS.success, CHART_COLORS.warning, CHART_COLORS.purple, CHART_COLORS.error, '#5ac8fa', '#ffcc00'];

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

      <motion.div className='p-6 lg:p-8 space-y-6' initial='hidden' animate='visible' variants={containerVariants}>
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
                <div className='flex flex-col items-center justify-center py-12 text-center'>
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
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            {/* Revenue Bar Chart */}
            <motion.div variants={listItemVariants}>
              <AppleCard hover={false}>
                <AppleCardHeader className='flex items-center gap-2'>
                  <BarChart3 className='h-5 w-5 text-[var(--status-success)]' />
                  <h3 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Fatturato</h3>
                </AppleCardHeader>
                <AppleCardContent>
                  {revenueChart.length === 0 ? (
                    <div className='flex flex-col items-center justify-center py-12 text-center'>
                      <BarChart3 className='h-12 w-12 text-[var(--text-tertiary)]/40 mb-4' />
                      <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Nessun dato disponibile</p>
                    </div>
                  ) : (
                    <div className='h-72'>
                      <ResponsiveContainer width='100%' height='100%'>
                        <BarChart data={revenueChart}>
                          <CartesianGrid strokeDasharray='3 3' stroke={CHART_COLORS.border} />
                          <XAxis dataKey='period' tick={{ fontSize: 11, fill: CHART_COLORS.textTertiary }} stroke={CHART_COLORS.border} />
                          <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.textTertiary }} stroke={CHART_COLORS.border} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                          <Tooltip
                            formatter={(value: number) => [formatCurrency(value), 'Fatturato']}
                            contentStyle={{ backgroundColor: CHART_COLORS.surface, border: `1px solid ${CHART_COLORS.border}`, borderRadius: 12, color: '#ffffff' }}
                            labelStyle={{ color: '#b4b4b4' }}
                          />
                          <Bar dataKey='revenue' fill={CHART_COLORS.success} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </AppleCardContent>
              </AppleCard>
            </motion.div>

            {/* Work Orders by Status - Pie Chart */}
            <motion.div variants={listItemVariants}>
              <AppleCard hover={false}>
                <AppleCardHeader className='flex items-center gap-2'>
                  <PieChartIcon className='h-5 w-5 text-[var(--brand)]' />
                  <h3 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>OdL per Stato</h3>
                </AppleCardHeader>
                <AppleCardContent>
                  {workOrdersByStatus.length === 0 ? (
                    <div className='flex flex-col items-center justify-center py-12 text-center'>
                      <PieChartIcon className='h-12 w-12 text-[var(--text-tertiary)]/40 mb-4' />
                      <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Nessun dato disponibile</p>
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
                            contentStyle={{ backgroundColor: CHART_COLORS.surface, border: `1px solid ${CHART_COLORS.border}`, borderRadius: 12, color: '#ffffff' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </AppleCardContent>
              </AppleCard>
            </motion.div>

            {/* Top Services - Horizontal Bar */}
            <motion.div variants={listItemVariants}>
              <AppleCard hover={false}>
                <AppleCardHeader className='flex items-center gap-2'>
                  <Wrench className='h-5 w-5 text-[var(--status-warning)]' />
                  <h3 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Top Servizi</h3>
                </AppleCardHeader>
                <AppleCardContent>
                  {topServices.length === 0 ? (
                    <div className='flex flex-col items-center justify-center py-12 text-center'>
                      <Wrench className='h-12 w-12 text-[var(--text-tertiary)]/40 mb-4' />
                      <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Nessun dato disponibile</p>
                    </div>
                  ) : (
                    <div className='h-72'>
                      <ResponsiveContainer width='100%' height='100%'>
                        <BarChart data={topServices} layout='vertical'>
                          <CartesianGrid strokeDasharray='3 3' stroke={CHART_COLORS.border} />
                          <XAxis type='number' tick={{ fontSize: 11, fill: CHART_COLORS.textTertiary }} stroke={CHART_COLORS.border} />
                          <YAxis dataKey='name' type='category' tick={{ fontSize: 11, fill: CHART_COLORS.textTertiary }} stroke={CHART_COLORS.border} width={120} />
                          <Tooltip
                            contentStyle={{ backgroundColor: CHART_COLORS.surface, border: `1px solid ${CHART_COLORS.border}`, borderRadius: 12, color: '#ffffff' }}
                          />
                          <Bar dataKey='count' fill={CHART_COLORS.warning} radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </AppleCardContent>
              </AppleCard>
            </motion.div>

            {/* Customer Trends - Line Chart */}
            <motion.div variants={listItemVariants}>
              <AppleCard hover={false}>
                <AppleCardHeader className='flex items-center gap-2'>
                  <Users className='h-5 w-5 text-[var(--brand)]' />
                  <h3 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Andamento Clienti</h3>
                </AppleCardHeader>
                <AppleCardContent>
                  {customerTrends.length === 0 ? (
                    <div className='flex flex-col items-center justify-center py-12 text-center'>
                      <Users className='h-12 w-12 text-[var(--text-tertiary)]/40 mb-4' />
                      <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Nessun dato disponibile</p>
                    </div>
                  ) : (
                    <div className='h-72'>
                      <ResponsiveContainer width='100%' height='100%'>
                        <LineChart data={customerTrends}>
                          <CartesianGrid strokeDasharray='3 3' stroke={CHART_COLORS.border} />
                          <XAxis dataKey='period' tick={{ fontSize: 11, fill: CHART_COLORS.textTertiary }} stroke={CHART_COLORS.border} />
                          <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.textTertiary }} stroke={CHART_COLORS.border} />
                          <Tooltip
                            contentStyle={{ backgroundColor: CHART_COLORS.surface, border: `1px solid ${CHART_COLORS.border}`, borderRadius: 12, color: '#ffffff' }}
                          />
                          <Legend wrapperStyle={{ color: '#b4b4b4' }} />
                          <Line type='monotone' dataKey='newCustomers' name='Nuovi' stroke={CHART_COLORS.purple} strokeWidth={2} dot={false} />
                          <Line type='monotone' dataKey='returningCustomers' name='Ritorno' stroke={CHART_COLORS.info} strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </AppleCardContent>
              </AppleCard>
            </motion.div>

            {/* Capacity Utilization - Area Chart */}
            <motion.div variants={listItemVariants}>
              <AppleCard hover={false}>
                <AppleCardHeader className='flex items-center gap-2'>
                  <TrendingUp className='h-5 w-5 text-[var(--status-success)]' />
                  <h3 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Tasso Occupazione</h3>
                </AppleCardHeader>
                <AppleCardContent>
                  {capacityUtilization.length === 0 ? (
                    <div className='flex flex-col items-center justify-center py-12 text-center'>
                      <TrendingUp className='h-12 w-12 text-[var(--text-tertiary)]/40 mb-4' />
                      <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Nessun dato disponibile</p>
                    </div>
                  ) : (
                    <div className='h-72'>
                      <ResponsiveContainer width='100%' height='100%'>
                        <AreaChart data={capacityUtilization}>
                          <CartesianGrid strokeDasharray='3 3' stroke={CHART_COLORS.border} />
                          <XAxis dataKey='period' tick={{ fontSize: 11, fill: CHART_COLORS.textTertiary }} stroke={CHART_COLORS.border} />
                          <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.textTertiary }} stroke={CHART_COLORS.border} unit='%' domain={[0, 100]} />
                          <Tooltip
                            formatter={(value: number) => [`${value}%`, 'Occupazione']}
                            contentStyle={{ backgroundColor: CHART_COLORS.surface, border: `1px solid ${CHART_COLORS.border}`, borderRadius: 12, color: '#ffffff' }}
                          />
                          <Area type='monotone' dataKey='utilization' stroke={CHART_COLORS.success} fill={CHART_COLORS.success} fillOpacity={0.2} strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </AppleCardContent>
              </AppleCard>
            </motion.div>

            {/* Revenue per Technician - Bar Chart */}
            <motion.div variants={listItemVariants}>
              <AppleCard hover={false}>
                <AppleCardHeader className='flex items-center gap-2'>
                  <Wrench className='h-5 w-5 text-[var(--brand)]' />
                  <h3 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Fatturato per Tecnico</h3>
                </AppleCardHeader>
                <AppleCardContent>
                  {revenueByTechnician.length === 0 ? (
                    <div className='flex flex-col items-center justify-center py-12 text-center'>
                      <Wrench className='h-12 w-12 text-[var(--text-tertiary)]/40 mb-4' />
                      <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Nessun dato disponibile</p>
                    </div>
                  ) : (
                    <div className='h-72'>
                      <ResponsiveContainer width='100%' height='100%'>
                        <BarChart data={revenueByTechnician}>
                          <CartesianGrid strokeDasharray='3 3' stroke={CHART_COLORS.border} />
                          <XAxis dataKey='name' tick={{ fontSize: 11, fill: CHART_COLORS.textTertiary }} stroke={CHART_COLORS.border} />
                          <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.textTertiary }} stroke={CHART_COLORS.border} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                          <Tooltip
                            formatter={(value: number) => [formatCurrency(value), 'Fatturato']}
                            contentStyle={{ backgroundColor: CHART_COLORS.surface, border: `1px solid ${CHART_COLORS.border}`, borderRadius: 12, color: '#ffffff' }}
                          />
                          <Bar dataKey='revenue' fill={CHART_COLORS.info} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </AppleCardContent>
              </AppleCard>
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
