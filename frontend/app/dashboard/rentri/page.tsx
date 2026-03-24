'use client';

import { useState } from 'react';
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
  Calendar,
  ArrowRight,
} from 'lucide-react';
import { Breadcrumb } from '@/components/ui/breadcrumb';

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
// Design Tokens (matching existing codebase pattern)
// =============================================================================
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
  success: '#34d399',
  warning: '#fbbf24',
  error: '#f87171',
  info: '#60a5fa',
  amber: '#f59e0b',
  glowStrong: 'rgba(255,255,255,0.06)',
};

// =============================================================================
// Animation Variants
// =============================================================================
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
};

// =============================================================================
// Skeleton Components
// =============================================================================
function KpiSkeleton() {
  return (
    <div
      className="rounded-2xl border h-[120px] flex flex-col justify-center px-5 animate-pulse"
      style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
    >
      <div className="h-4 w-24 rounded mb-3" style={{ backgroundColor: colors.surfaceHover }} />
      <div className="h-8 w-16 rounded" style={{ backgroundColor: colors.surfaceHover }} />
    </div>
  );
}

function RowSkeleton() {
  return (
    <div
      className="flex items-center gap-4 p-5 animate-pulse"
      style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}
    >
      <div className="w-10 h-10 rounded-xl" style={{ backgroundColor: colors.surfaceHover }} />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-48 rounded" style={{ backgroundColor: colors.surfaceHover }} />
        <div className="h-3 w-32 rounded" style={{ backgroundColor: colors.surfaceHover }} />
      </div>
      <div className="h-6 w-16 rounded" style={{ backgroundColor: colors.surfaceHover }} />
    </div>
  );
}

// =============================================================================
// Alert Severity Config
// =============================================================================
function getAlertConfig(severity: string): { color: string; bg: string } {
  switch (severity) {
    case 'error':
      return { color: colors.error, bg: `${colors.error}20` };
    case 'warning':
      return { color: colors.warning, bg: `${colors.warning}20` };
    default:
      return { color: colors.info, bg: `${colors.info}20` };
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

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.bg }}>
      {/* Header */}
      <header
        className="sticky top-0 z-30 backdrop-blur-xl border-b"
        style={{
          backgroundColor: `${colors.bg}cc`,
          borderColor: colors.borderSubtle,
        }}
      >
        <div className="px-4 sm:px-8 py-5">
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Rifiuti (RENTRI)' },
            ]}
          />
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: colors.glowStrong }}
              >
                <Recycle className="h-5 w-5" style={{ color: colors.success }} />
              </div>
              <div>
                <h1 className="text-[28px] font-light" style={{ color: colors.textPrimary }}>
                  Gestione Rifiuti (RENTRI)
                </h1>
                <p className="text-[13px] mt-0.5" style={{ color: colors.textTertiary }}>
                  Registro carico/scarico, FIR e dichiarazione MUD
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/dashboard/rentri/fir')}
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-full transition-colors min-h-[44px] border hover:bg-white/5"
                style={{ borderColor: colors.border, color: colors.textSecondary }}
              >
                <FileText className="h-4 w-4" />
                Nuovo FIR
              </button>
              <button
                onClick={() => router.push('/dashboard/rentri/entries/new')}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-full transition-colors min-h-[44px]"
                style={{ backgroundColor: colors.textPrimary, color: colors.bg }}
              >
                <Plus className="h-4 w-4" />
                Nuovo Carico
              </button>
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
        <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" variants={containerVariants}>
          {dashboardLoading ? (
            <>
              <KpiSkeleton />
              <KpiSkeleton />
              <KpiSkeleton />
              <KpiSkeleton />
            </>
          ) : (
            [
              {
                label: 'Totale Rifiuti Stoccati',
                value: dashboard ? `${dashboard.totalStoredKg.toLocaleString('it-IT')} kg` : '—',
                icon: Package,
                iconColor: colors.info,
              },
              {
                label: 'Registrazioni Mese',
                value: dashboard ? dashboard.monthlyEntries.toString() : '—',
                icon: ClipboardList,
                iconColor: colors.success,
              },
              {
                label: 'FIR Attivi',
                value: dashboard ? dashboard.activeFir.toString() : '—',
                icon: Truck,
                iconColor: colors.amber,
              },
              {
                label: 'Alert Attivi',
                value: dashboard ? dashboard.activeAlerts.toString() : '—',
                icon: AlertTriangle,
                iconColor: dashboard && dashboard.activeAlerts > 0 ? colors.warning : colors.success,
              },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                className="rounded-2xl border h-[120px] flex flex-col justify-center px-5"
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.borderSubtle,
                }}
                variants={itemVariants}
              >
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className="h-4 w-4" style={{ color: stat.iconColor }} />
                  <span className="text-[13px]" style={{ color: colors.textTertiary }}>
                    {stat.label}
                  </span>
                </div>
                <span
                  className="text-[32px] font-light"
                  style={{ color: colors.textPrimary, fontVariantNumeric: 'tabular-nums' }}
                >
                  {stat.value}
                </span>
              </motion.div>
            ))
          )}
        </motion.div>

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <motion.div variants={itemVariants}>
            <h2 className="text-[18px] font-light mb-3" style={{ color: colors.textPrimary }}>
              Avvisi di conformita
            </h2>
            <div className="space-y-3">
              {alerts.map((alert) => {
                const config = getAlertConfig(alert.severity);
                return (
                  <div
                    key={alert.id}
                    className="rounded-2xl border px-5 py-4 flex items-start gap-3"
                    style={{
                      backgroundColor: config.bg,
                      borderColor: `${config.color}40`,
                    }}
                  >
                    <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: config.color }} />
                    <div className="flex-1">
                      <p className="text-[14px] font-medium" style={{ color: colors.textPrimary }}>
                        {alert.message}
                      </p>
                      <p className="text-[12px] mt-0.5" style={{ color: colors.textTertiary }}>
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
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div variants={itemVariants}>
          <h2 className="text-[18px] font-light mb-3" style={{ color: colors.textPrimary }}>
            Azioni rapide
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                label: 'Nuovo Carico',
                description: 'Registra un nuovo carico rifiuti',
                href: '/dashboard/rentri/entries/new',
                icon: Plus,
                iconColor: colors.success,
              },
              {
                label: 'Nuovo FIR',
                description: 'Crea un formulario di trasporto',
                href: '/dashboard/rentri/fir',
                icon: FileText,
                iconColor: colors.info,
              },
              {
                label: 'Registro Completo',
                description: 'Visualizza tutte le registrazioni',
                href: '/dashboard/rentri/entries',
                icon: ClipboardList,
                iconColor: colors.amber,
              },
            ].map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="rounded-2xl border px-5 py-4 flex items-center gap-4 transition-colors group cursor-pointer"
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.borderSubtle,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = colors.surfaceHover;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = colors.surface;
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: colors.glowStrong }}
                >
                  <action.icon className="h-5 w-5" style={{ color: action.iconColor }} />
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-medium" style={{ color: colors.textPrimary }}>
                    {action.label}
                  </p>
                  <p className="text-[12px]" style={{ color: colors.textTertiary }}>
                    {action.description}
                  </p>
                </div>
                <ArrowRight
                  className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: colors.textMuted }}
                />
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Recent Entries Table */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[18px] font-light" style={{ color: colors.textPrimary }}>
              Ultime registrazioni
            </h2>
            <Link
              href="/dashboard/rentri/entries"
              className="text-[13px] flex items-center gap-1 transition-colors hover:opacity-80"
              style={{ color: colors.textTertiary }}
            >
              Vedi tutto
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {hasError ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertCircle className="h-12 w-12 mb-4" style={{ color: colors.borderSubtle }} />
              <p className="text-[15px] mb-4" style={{ color: colors.textTertiary }}>
                Impossibile caricare i dati
              </p>
            </div>
          ) : isLoading ? (
            <div
              className="rounded-2xl border overflow-hidden"
              style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
            >
              {[1, 2, 3, 4, 5].map((i) => (
                <RowSkeleton key={i} />
              ))}
            </div>
          ) : recentEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Recycle className="h-12 w-12 mb-4" style={{ color: colors.borderSubtle }} />
              <p className="text-[15px] mb-1" style={{ color: colors.textPrimary }}>
                Nessuna registrazione trovata
              </p>
              <p className="text-[13px]" style={{ color: colors.textTertiary }}>
                Inizia registrando il primo carico rifiuti
              </p>
            </div>
          ) : (
            <div
              className="rounded-2xl border overflow-hidden"
              style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
            >
              {/* Table Header */}
              <div
                className="hidden sm:grid grid-cols-12 gap-4 px-5 py-3 text-[12px] uppercase font-semibold tracking-wider"
                style={{ color: colors.textMuted, borderBottom: `1px solid ${colors.borderSubtle}` }}
              >
                <div className="col-span-1">N.</div>
                <div className="col-span-2">Data</div>
                <div className="col-span-1">Tipo</div>
                <div className="col-span-2">CER</div>
                <div className="col-span-3">Descrizione</div>
                <div className="col-span-2">Quantita</div>
                <div className="col-span-1" />
              </div>

              {recentEntries.map((entry, idx) => (
                <div
                  key={entry.id}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 px-5 py-4 cursor-pointer transition-colors items-center"
                  style={{
                    borderBottom: idx < recentEntries.length - 1 ? `1px solid ${colors.borderSubtle}` : 'none',
                  }}
                  onClick={() => router.push(`/dashboard/rentri/entries/${entry.id}`)}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = colors.surfaceHover;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') router.push(`/dashboard/rentri/entries/${entry.id}`);
                  }}
                >
                  <div className="sm:col-span-1 text-[13px] font-mono" style={{ color: colors.textTertiary }}>
                    {entry.entryNumber}
                  </div>
                  <div className="sm:col-span-2 text-[13px]" style={{ color: colors.textSecondary }}>
                    {new Date(entry.date).toLocaleDateString('it-IT')}
                  </div>
                  <div className="sm:col-span-1">
                    <span
                      className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                      style={{
                        backgroundColor: entry.type === 'CARICO' ? `${colors.success}20` : `${colors.error}20`,
                        color: entry.type === 'CARICO' ? colors.success : colors.error,
                      }}
                    >
                      {entry.type}
                    </span>
                  </div>
                  <div className="sm:col-span-2 flex items-center gap-1">
                    <span className="text-[13px] font-mono" style={{ color: colors.textPrimary }}>
                      {entry.cerCode}
                    </span>
                    {entry.hazardous && (
                      <AlertTriangle className="h-3.5 w-3.5" style={{ color: colors.warning }} />
                    )}
                  </div>
                  <div
                    className="sm:col-span-3 text-[13px] truncate"
                    style={{ color: colors.textSecondary }}
                    title={entry.cerDescription}
                  >
                    {entry.cerDescription}
                  </div>
                  <div
                    className="sm:col-span-2 text-[13px] font-medium"
                    style={{ color: colors.textPrimary, fontVariantNumeric: 'tabular-nums' }}
                  >
                    {entry.quantity.toLocaleString('it-IT')} {entry.unit || 'kg'}
                  </div>
                  <div className="sm:col-span-1 flex justify-end">
                    <ChevronRight className="h-4 w-4" style={{ color: colors.textMuted }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
