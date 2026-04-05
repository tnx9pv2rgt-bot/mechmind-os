'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import {
  Recycle,
  Package,
  FileText,
  AlertTriangle,
  Plus,
  ChevronRight,
  Loader2,
  AlertCircle,
  ClipboardList,
  Truck,
  ArrowRight,
} from 'lucide-react';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { AppleButton } from '@/components/ui/apple-button';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';

// =============================================================================
// Types
// =============================================================================
interface RentriDashboard {
  totalStoredKg: number;
  monthlyEntries: number;
  activeFir: number;
  activeAlerts: number;
  recentEntries: WasteEntry[];
}

interface WasteEntry {
  id: string;
  entryNumber: number;
  date: string;
  type: 'CARICO' | 'SCARICO';
  cerCode: string;
  cerDescription: string;
  quantity: number;
  unit: string;
  hazardous: boolean;
  origin?: string;
  destination?: string;
}

interface RentriAlert {
  id: string;
  type: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  createdAt: string;
}

// =============================================================================
// Animation Variants
// =============================================================================
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
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

// =============================================================================
// Alert Severity Config
// =============================================================================
function getAlertConfig(severity: string): { colorClass: string; bgClass: string } {
  switch (severity) {
    case 'error':
      return { colorClass: 'text-red-400', bgClass: 'bg-red-400/10' };
    case 'warning':
      return { colorClass: 'text-yellow-400', bgClass: 'bg-yellow-400/10' };
    default:
      return { colorClass: 'text-blue-400', bgClass: 'bg-blue-400/10' };
  }
}

// =============================================================================
// Main Page
// =============================================================================
export default function RentriDashboardPage() {
  const router = useRouter();

  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError } = useSWR<RentriDashboard>(
    '/api/rentri/dashboard',
    fetcher,
  );

  const { data: alertsData, isLoading: alertsLoading, error: alertsError } = useSWR<{ data?: RentriAlert[] } | RentriAlert[]>(
    '/api/rentri/alerts',
    fetcher,
  );

  const dashboard = dashboardData || null;
  const alerts: RentriAlert[] = (() => {
    if (!alertsData) return [];
    if (Array.isArray(alertsData)) return alertsData;
    if (Array.isArray((alertsData as { data?: RentriAlert[] }).data)) return (alertsData as { data: RentriAlert[] }).data;
    return [];
  })();

  const recentEntries: WasteEntry[] = dashboard?.recentEntries || [];
  const isLoading = dashboardLoading || alertsLoading;
  const hasError = dashboardError || alertsError;

  const statCards = [
    {
      label: 'Totale Rifiuti Stoccati',
      value: dashboard?.totalStoredKg != null ? `${dashboard.totalStoredKg.toLocaleString('it-IT')} kg` : '...',
      icon: Package,
      color: 'bg-apple-blue',
    },
    {
      label: 'Registrazioni Mese',
      value: dashboard?.monthlyEntries != null ? dashboard.monthlyEntries.toString() : '...',
      icon: ClipboardList,
      color: 'bg-apple-green',
    },
    {
      label: 'FIR Attivi',
      value: dashboard?.activeFir != null ? dashboard.activeFir.toString() : '...',
      icon: Truck,
      color: 'bg-apple-orange',
    },
    {
      label: 'Alert Attivi',
      value: dashboard?.activeAlerts != null ? dashboard.activeAlerts.toString() : '...',
      icon: AlertTriangle,
      color: dashboard?.activeAlerts && dashboard.activeAlerts > 0 ? 'bg-apple-red' : 'bg-apple-green',
    },
  ];

  return (
    <div>
      {/* Header */}
      <header>
        <div className='px-4 sm:px-8 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
          <div>
            <Breadcrumb
              items={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Rifiuti (RENTRI)' },
              ]}
            />
            <h1 className='text-headline text-apple-dark dark:text-[var(--text-primary)]'>
              Gestione Rifiuti (RENTRI)
            </h1>
            <p className='text-apple-gray dark:text-[var(--text-secondary)] text-body mt-1'>
              Registro carico/scarico, FIR e dichiarazione MUD
            </p>
          </div>
          <div className='flex items-center gap-3'>
            <AppleButton
              variant="ghost"
              onClick={() => router.push('/dashboard/rentri/fir')}
              icon={<FileText className="h-4 w-4" />}
              className="hidden sm:inline-flex"
            >
              Nuovo FIR
            </AppleButton>
            <AppleButton
              variant="primary"
              onClick={() => router.push('/dashboard/rentri/entries/new')}
              icon={<Plus className="h-4 w-4" />}
            >
              Nuovo Carico
            </AppleButton>
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
        <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-bento" variants={containerVariants}>
          {statCards.map(stat => (
            <motion.div key={stat.label} variants={statsCardVariants}>
              <AppleCard hover={false}>
                <AppleCardContent>
                  <div className='flex items-center justify-between mb-3'>
                    <div
                      className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center`}
                    >
                      <stat.icon className='h-5 w-5 text-white' />
                    </div>
                  </div>
                  <p className='text-title-1 font-bold text-apple-dark dark:text-[var(--text-primary)]'>
                    {isLoading ? '...' : stat.value}
                  </p>
                  <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>{stat.label}</p>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          ))}
        </motion.div>

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <motion.div variants={listItemVariants}>
            <AppleCard hover={false}>
              <AppleCardHeader>
                <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                  Avvisi di conformita
                </h2>
              </AppleCardHeader>
              <AppleCardContent>
                <div className="space-y-3">
                  {alerts.map((alert) => {
                    const config = getAlertConfig(alert.severity);
                    return (
                      <div
                        key={alert.id}
                        className={`rounded-2xl border px-5 py-4 flex items-start gap-3 ${config.bgClass} border-apple-border/20 dark:border-[var(--border-default)]`}
                      >
                        <AlertTriangle className={`h-5 w-5 mt-0.5 flex-shrink-0 ${config.colorClass}`} />
                        <div className="flex-1">
                          <p className="text-body font-medium text-apple-dark dark:text-[var(--text-primary)]">
                            {alert.message}
                          </p>
                          <p className="text-footnote mt-0.5 text-apple-gray dark:text-[var(--text-secondary)]">
                            {new Date(alert.createdAt).toLocaleDateString('it-IT', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div variants={listItemVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                Azioni rapide
              </h2>
            </AppleCardHeader>
            <AppleCardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  {
                    label: 'Nuovo Carico',
                    description: 'Registra un nuovo carico rifiuti',
                    href: '/dashboard/rentri/entries/new',
                    icon: Plus,
                    color: 'bg-apple-green',
                  },
                  {
                    label: 'Nuovo FIR',
                    description: 'Crea un formulario di trasporto',
                    href: '/dashboard/rentri/fir',
                    icon: FileText,
                    color: 'bg-apple-blue',
                  },
                  {
                    label: 'Registro Completo',
                    description: 'Visualizza tutte le registrazioni',
                    href: '/dashboard/rentri/entries',
                    icon: ClipboardList,
                    color: 'bg-apple-orange',
                  },
                ].map((action) => (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="rounded-2xl bg-apple-light-gray/30 dark:bg-[var(--surface-hover)] hover:bg-white dark:hover:bg-[var(--surface-active)] hover:shadow-apple px-5 py-4 flex items-center gap-4 transition-all duration-300 group cursor-pointer"
                  >
                    <div className={`w-10 h-10 rounded-xl ${action.color} flex items-center justify-center flex-shrink-0`}>
                      <action.icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-body font-semibold text-apple-dark dark:text-[var(--text-primary)]">
                        {action.label}
                      </p>
                      <p className="text-footnote text-apple-gray dark:text-[var(--text-secondary)]">
                        {action.description}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-apple-gray dark:text-[var(--text-secondary)]" />
                  </Link>
                ))}
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Recent Entries Table */}
        <motion.div variants={listItemVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <div className="flex items-center justify-between">
                <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                  Ultime registrazioni
                </h2>
                <Link
                  href="/dashboard/rentri/entries"
                  className="text-footnote flex items-center gap-1 transition-colors hover:opacity-80 text-apple-gray dark:text-[var(--text-secondary)]"
                >
                  Vedi tutto
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </AppleCardHeader>
            <AppleCardContent>
              {hasError ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-apple-red/40 mb-4" />
                  <p className="text-body text-apple-gray dark:text-[var(--text-secondary)]">
                    Impossibile caricare i dati
                  </p>
                  <AppleButton variant="ghost" className="mt-4" onClick={() => window.location.reload()}>
                    Riprova
                  </AppleButton>
                </div>
              ) : isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-apple-blue" />
                </div>
              ) : recentEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Recycle className="h-12 w-12 text-apple-gray/40 mb-4" />
                  <p className="text-body text-apple-gray dark:text-[var(--text-secondary)]">
                    Nessuna registrazione trovata
                  </p>
                  <AppleButton
                    variant="ghost"
                    className="mt-4"
                    onClick={() => router.push('/dashboard/rentri/entries/new')}
                  >
                    Registra il primo carico
                  </AppleButton>
                </div>
              ) : (
                <motion.div
                  className="space-y-3"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {/* Table Header */}
                  <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-apple-dark dark:text-[var(--text-primary)]">
                    <div className="col-span-1">N.</div>
                    <div className="col-span-2">Data</div>
                    <div className="col-span-1">Tipo</div>
                    <div className="col-span-2">CER</div>
                    <div className="col-span-3">Descrizione</div>
                    <div className="col-span-2">Quantita</div>
                    <div className="col-span-1" />
                  </div>

                  {recentEntries.map((entry, index) => (
                    <motion.div
                      key={entry.id}
                      className="flex items-center justify-between p-4 rounded-2xl bg-apple-light-gray/30 dark:bg-[var(--surface-hover)] hover:bg-white dark:hover:bg-[var(--surface-active)] hover:shadow-apple transition-all duration-300 cursor-pointer"
                      variants={listItemVariants}
                      custom={index}
                      whileHover={{ scale: 1.005, x: 4 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => router.push(`/dashboard/rentri/entries/${entry.id}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') router.push(`/dashboard/rentri/entries/${entry.id}`);
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl ${entry.type === 'CARICO' ? 'bg-apple-green/10' : 'bg-apple-red/10'} flex items-center justify-center`}>
                          <Recycle className={`h-6 w-6 ${entry.type === 'CARICO' ? 'text-apple-green' : 'text-apple-red'}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-body font-semibold text-apple-dark dark:text-[var(--text-primary)]">
                              {entry.cerCode}
                            </p>
                            <span
                              className={`text-footnote font-semibold px-2.5 py-1 rounded-full ${
                                entry.type === 'CARICO'
                                  ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                                  : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                              }`}
                            >
                              {entry.type}
                            </span>
                            {entry.hazardous && (
                              <AlertTriangle className="h-3.5 w-3.5 text-yellow-400" />
                            )}
                          </div>
                          <p className="text-footnote text-apple-gray dark:text-[var(--text-secondary)]">
                            {entry.cerDescription}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="text-body font-semibold text-apple-dark dark:text-[var(--text-primary)] min-w-[80px] text-right tabular-nums">
                          {entry.quantity.toLocaleString('it-IT')} {entry.unit || 'kg'}
                        </p>
                        <p className="text-footnote text-apple-gray dark:text-[var(--text-secondary)] min-w-[80px] text-right">
                          {new Date(entry.date).toLocaleDateString('it-IT')}
                        </p>
                        <ChevronRight className="h-4 w-4 text-apple-gray dark:text-[var(--text-secondary)]" />
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AppleCardContent>
          </AppleCard>
        </motion.div>
      </motion.div>
    </div>
  );
}
