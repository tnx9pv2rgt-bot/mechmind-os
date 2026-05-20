'use client';

import { motion } from 'framer-motion';
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
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { BarChart3, PieChart as PieChartIcon, Wrench, TrendingUp, Users } from 'lucide-react';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';

interface RevenueData { period: string; revenue: number }
interface WorkOrderStatusData { status: string; count: number }
interface TopService { name: string; count: number }
interface CustomerTrend { period: string; newCustomers: number; returningCustomers: number }
interface CapacityData { period: string; utilization: number }
interface TechnicianRevenue { name: string; revenue: number }

interface Props {
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
  info: 'var(--status-info)',
  purple: '#a78bfa',
};

const PIE_COLORS = [CHART_COLORS.info, CHART_COLORS.success, CHART_COLORS.warning, CHART_COLORS.purple, 'var(--status-error)', '#5ac8fa', '#ffcc00'];

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Bozza', OPEN: 'Aperto', IN_PROGRESS: 'In Lavorazione',
  QC: 'Controllo Qualità', COMPLETED: 'Completato', DELIVERED: 'Consegnato', CANCELLED: 'Annullato',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
}

const listItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const empty = (Icon: React.ElementType) => (
  <div className='flex flex-col items-center justify-center py-12 text-center'>
    <Icon className='h-12 w-12 text-[var(--text-tertiary)]/40 mb-4' />
    <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Nessun dato disponibile</p>
  </div>
);

export default function AnalyticsChartsGrid({
  revenueChart, workOrdersByStatus, topServices,
  customerTrends, capacityUtilization, revenueByTechnician,
}: Props): React.ReactElement {
  return (
    <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
      {/* Revenue Bar Chart */}
      <motion.div variants={listItemVariants}>
        <AppleCard hover={false}>
          <AppleCardHeader className='flex items-center gap-2'>
            <BarChart3 className='h-5 w-5 text-[var(--status-success)]' />
            <h3 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Fatturato</h3>
          </AppleCardHeader>
          <AppleCardContent>
            {revenueChart.length === 0 ? empty(BarChart3) : (
              <div className='h-72'>
                <ResponsiveContainer width='100%' height='100%'>
                  <BarChart data={revenueChart}>
                    <CartesianGrid strokeDasharray='3 3' stroke={CHART_COLORS.border} />
                    <XAxis dataKey='period' tick={{ fontSize: 11, fill: CHART_COLORS.textTertiary }} stroke={CHART_COLORS.border} />
                    <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.textTertiary }} stroke={CHART_COLORS.border} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => [formatCurrency(value), 'Fatturato']} contentStyle={{ backgroundColor: CHART_COLORS.surface, border: `1px solid ${CHART_COLORS.border}`, borderRadius: 12, color: '#ffffff' }} labelStyle={{ color: '#b4b4b4' }} />
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
            {workOrdersByStatus.length === 0 ? empty(PieChartIcon) : (
              <div className='h-72'>
                <ResponsiveContainer width='100%' height='100%'>
                  <PieChart>
                    <Pie
                      data={workOrdersByStatus.map(d => ({ ...d, name: STATUS_LABELS[d.status] || d.status }))}
                      cx='50%' cy='50%' outerRadius={100} innerRadius={50} paddingAngle={2}
                      dataKey='count' nameKey='name'
                      label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {workOrdersByStatus.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: CHART_COLORS.surface, border: `1px solid ${CHART_COLORS.border}`, borderRadius: 12, color: '#ffffff' }} />
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
            {topServices.length === 0 ? empty(Wrench) : (
              <div className='h-72'>
                <ResponsiveContainer width='100%' height='100%'>
                  <BarChart data={topServices} layout='vertical'>
                    <CartesianGrid strokeDasharray='3 3' stroke={CHART_COLORS.border} />
                    <XAxis type='number' tick={{ fontSize: 11, fill: CHART_COLORS.textTertiary }} stroke={CHART_COLORS.border} />
                    <YAxis dataKey='name' type='category' tick={{ fontSize: 11, fill: CHART_COLORS.textTertiary }} stroke={CHART_COLORS.border} width={120} />
                    <Tooltip contentStyle={{ backgroundColor: CHART_COLORS.surface, border: `1px solid ${CHART_COLORS.border}`, borderRadius: 12, color: '#ffffff' }} />
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
            {customerTrends.length === 0 ? empty(Users) : (
              <div className='h-72'>
                <ResponsiveContainer width='100%' height='100%'>
                  <LineChart data={customerTrends}>
                    <CartesianGrid strokeDasharray='3 3' stroke={CHART_COLORS.border} />
                    <XAxis dataKey='period' tick={{ fontSize: 11, fill: CHART_COLORS.textTertiary }} stroke={CHART_COLORS.border} />
                    <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.textTertiary }} stroke={CHART_COLORS.border} />
                    <Tooltip contentStyle={{ backgroundColor: CHART_COLORS.surface, border: `1px solid ${CHART_COLORS.border}`, borderRadius: 12, color: '#ffffff' }} />
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
            {capacityUtilization.length === 0 ? empty(TrendingUp) : (
              <div className='h-72'>
                <ResponsiveContainer width='100%' height='100%'>
                  <AreaChart data={capacityUtilization}>
                    <CartesianGrid strokeDasharray='3 3' stroke={CHART_COLORS.border} />
                    <XAxis dataKey='period' tick={{ fontSize: 11, fill: CHART_COLORS.textTertiary }} stroke={CHART_COLORS.border} />
                    <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.textTertiary }} stroke={CHART_COLORS.border} unit='%' domain={[0, 100]} />
                    <Tooltip formatter={(value: number) => [`${value}%`, 'Occupazione']} contentStyle={{ backgroundColor: CHART_COLORS.surface, border: `1px solid ${CHART_COLORS.border}`, borderRadius: 12, color: '#ffffff' }} />
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
            {revenueByTechnician.length === 0 ? empty(Wrench) : (
              <div className='h-72'>
                <ResponsiveContainer width='100%' height='100%'>
                  <BarChart data={revenueByTechnician}>
                    <CartesianGrid strokeDasharray='3 3' stroke={CHART_COLORS.border} />
                    <XAxis dataKey='name' tick={{ fontSize: 11, fill: CHART_COLORS.textTertiary }} stroke={CHART_COLORS.border} />
                    <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.textTertiary }} stroke={CHART_COLORS.border} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => [formatCurrency(value), 'Fatturato']} contentStyle={{ backgroundColor: CHART_COLORS.surface, border: `1px solid ${CHART_COLORS.border}`, borderRadius: 12, color: '#ffffff' }} />
                    <Bar dataKey='revenue' fill={CHART_COLORS.info} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </AppleCardContent>
        </AppleCard>
      </motion.div>
    </div>
  );
}
