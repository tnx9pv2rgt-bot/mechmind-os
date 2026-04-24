'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { motion } from 'framer-motion';
import {
  AppleCard,
  AppleCardContent,
  AppleCardHeader,
} from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import {
  Euro,
  Clock,
  AlertTriangle,
  CheckCircle,
  Loader2,
  AlertCircle,
  Download,
  TrendingUp,
} from 'lucide-react';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { toast } from 'sonner';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';

interface FinancialData {
  kpi: {
    fatturato: number;
    daIncassare: number;
    scaduto: number;
    incassato: number;
  };
  revenueTrend: { month: string; revenue: number }[];
  agingReport: { range: string; amount: number }[];
  paymentMethodDistribution: { method: string; amount: number }[];
  cashFlow: { month: string; entrate: number; uscite: number }[];
  topCustomers: { name: string; revenue: number; invoiceCount: number }[];
}

type Period = 'month' | 'quarter' | 'year';

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'month', label: 'Mese' },
  { value: 'quarter', label: 'Trimestre' },
  { value: 'year', label: 'Anno' },
];

const PIE_COLORS = ['#0071e3', '#34c759', '#ff9500', '#af52de', '#ff3b30', '#5856d6'];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
}

function formatCurrencyShort(amount: number): string {
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}k`;
  return amount.toFixed(0);
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

export default function FinancialDashboardPage() {
  const [period, setPeriod] = useState<Period>('month');

  const { data: rawData, error, isLoading, mutate } = useSWR(
    `/api/invoices/financial?period=${period}`,
    fetcher,
  );

  const financial: FinancialData | null = (() => {
    if (!rawData) return null;
    return (rawData as { data?: FinancialData }).data || (rawData as FinancialData);
  })();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--brand)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <AlertCircle className="h-12 w-12 text-[var(--status-error)]/40 mb-4" />
        <p className="text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mb-4">
          Impossibile caricare i dati finanziari
        </p>
        <AppleButton variant="ghost" onClick={() => mutate()}>
          Riprova
        </AppleButton>
      </div>
    );
  }

  const kpi = financial?.kpi || { fatturato: 0, daIncassare: 0, scaduto: 0, incassato: 0 };
  const revenueTrend = financial?.revenueTrend || [];
  const agingReport = financial?.agingReport || [];
  const paymentMethodDistribution = financial?.paymentMethodDistribution || [];
  const cashFlow = financial?.cashFlow || [];
  const topCustomers = financial?.topCustomers || [];

  const kpiCards = [
    { label: 'Fatturato', value: kpi.fatturato, icon: Euro, color: 'bg-[var(--brand)]' },
    { label: 'Da Incassare', value: kpi.daIncassare, icon: Clock, color: 'bg-[var(--status-warning)]' },
    { label: 'Scaduto', value: kpi.scaduto, icon: AlertTriangle, color: 'bg-[var(--status-error)]' },
    { label: 'Incassato', value: kpi.incassato, icon: CheckCircle, color: 'bg-[var(--status-success)]' },
  ];

  return (
    <div>
      {/* Header */}
      <header>
        <div className="px-4 sm:px-8 py-5">
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Fatture', href: '/dashboard/invoices' },
              { label: 'Report Finanziario' },
            ]}
          />
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2">
            <div>
              <h1 className="text-headline text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                Report Finanziario
              </h1>
              <p className="text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] text-body mt-1">
                Panoramica delle entrate e dei pagamenti
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex bg-[var(--surface-hover)] rounded-xl p-1">
                {PERIOD_OPTIONS.map(opt => (
                  <AppleButton
                    key={opt.value}
                    variant="ghost"
                    size="sm"
                    onClick={() => setPeriod(opt.value)}
                    className={`rounded-lg transition-all ${
                      period === opt.value
                        ? 'bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] shadow-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'
                        : 'text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {opt.label}
                  </AppleButton>
                ))}
              </div>
              <AppleButton
                variant="secondary"
                size="sm"
                icon={<Download className="h-4 w-4" />}
                onClick={() => toast.success('Report esportato')}
              >
                Esporta Report
              </AppleButton>
            </div>
          </div>
        </div>
      </header>

      <motion.div
        className="p-4 sm:p-8 space-y-6"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* KPI Cards */}
        <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-4" variants={containerVariants}>
          {kpiCards.map(card => (
            <motion.div key={card.label} variants={itemVariants}>
              <AppleCard hover={false}>
                <AppleCardContent>
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className={`w-10 h-10 rounded-xl ${card.color} flex items-center justify-center`}
                    >
                      <card.icon className="h-5 w-5 text-[var(--text-on-brand)]" />
                    </div>
                  </div>
                  <p className="text-title-1 font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                    {formatCurrency(card.value)}
                  </p>
                  <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">{card.label}</p>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          ))}
        </motion.div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div variants={itemVariants}>
            <AppleCard hover={false}>
              <AppleCardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[var(--text-tertiary)]" />
                  <h2 className="text-title-3 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                    Andamento Fatturato
                  </h2>
                </div>
              </AppleCardHeader>
              <AppleCardContent>
                <div className="h-64">
                  {revenueTrend.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] text-body">
                      Nessun dato disponibile
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={formatCurrencyShort} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value: number) => [formatCurrency(value), 'Fatturato']} />
                        <Bar dataKey="revenue" fill="#0071e3" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>

          <motion.div variants={itemVariants}>
            <AppleCard hover={false}>
              <AppleCardHeader>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[var(--text-tertiary)]" />
                  <h2 className="text-title-3 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                    Scadenziario (Aging Report)
                  </h2>
                </div>
              </AppleCardHeader>
              <AppleCardContent>
                <div className="h-64">
                  {agingReport.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] text-body">
                      Nessun dato disponibile
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={agingReport} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis type="number" tickFormatter={formatCurrencyShort} tick={{ fontSize: 12 }} />
                        <YAxis type="category" dataKey="range" tick={{ fontSize: 12 }} width={80} />
                        <Tooltip formatter={(value: number) => [formatCurrency(value), 'Importo']} />
                        <Bar dataKey="amount" fill="#ff9500" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div variants={itemVariants}>
            <AppleCard hover={false}>
              <AppleCardHeader>
                <div className="flex items-center gap-2">
                  <Euro className="h-4 w-4 text-[var(--text-tertiary)]" />
                  <h2 className="text-title-3 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                    Distribuzione Metodi di Pagamento
                  </h2>
                </div>
              </AppleCardHeader>
              <AppleCardContent>
                <div className="h-64">
                  {paymentMethodDistribution.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] text-body">
                      Nessun dato disponibile
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={paymentMethodDistribution}
                          dataKey="amount"
                          nameKey="method"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          label={({ method, percent }: { method: string; percent: number }) =>
                            `${method} ${(percent * 100).toFixed(0)}%`
                          }
                        >
                          {paymentMethodDistribution.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>

          <motion.div variants={itemVariants}>
            <AppleCard hover={false}>
              <AppleCardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[var(--text-tertiary)]" />
                  <h2 className="text-title-3 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                    Cash Flow
                  </h2>
                </div>
              </AppleCardHeader>
              <AppleCardContent>
                <div className="h-64">
                  {cashFlow.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] text-body">
                      Nessun dato disponibile
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={cashFlow}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={formatCurrencyShort} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend />
                        <Line type="monotone" dataKey="entrate" stroke="#34c759" strokeWidth={2} name="Entrate" />
                        <Line type="monotone" dataKey="uscite" stroke="#ff3b30" strokeWidth={2} name="Uscite" />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        </div>

        {/* Top Customers */}
        <motion.div variants={itemVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <h2 className="text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                Migliori Clienti per Fatturato
              </h2>
            </AppleCardHeader>
            <AppleCardContent>
              {topCustomers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Euro className="h-12 w-12 text-[var(--text-tertiary)]/40 mb-4" />
                  <p className="text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                    Nessun dato disponibile
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--border-default)]/30 dark:border-[var(--border-default)]">
                        <th className="text-left py-3 px-4 text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                          Cliente
                        </th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                          Fatture
                        </th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                          Fatturato
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {topCustomers.map((customer, i) => (
                        <tr
                          key={i}
                          className="border-b border-[var(--border-default)]/10 dark:border-[var(--border-default)]/50 hover:bg-[var(--surface-secondary)]/30 dark:hover:bg-[var(--surface-hover)] transition-colors"
                        >
                          <td className="py-3 px-4 text-body font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                            {customer.name}
                          </td>
                          <td className="py-3 px-4 text-body text-right text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                            {customer.invoiceCount}
                          </td>
                          <td className="py-3 px-4 text-body text-right font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                            {formatCurrency(customer.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </AppleCardContent>
          </AppleCard>
        </motion.div>
      </motion.div>
    </div>
  );
}
