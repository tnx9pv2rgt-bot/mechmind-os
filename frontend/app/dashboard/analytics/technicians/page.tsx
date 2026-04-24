'use client';

import { useState, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { motion } from 'framer-motion';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import {
  AlertCircle,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Euro,
  Clock,
  Wrench,
  Target,
  BarChart3,
  Trophy,
  RefreshCw,
} from 'lucide-react';

// =============================================================================
// Animations
// =============================================================================
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants = {
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
// Types
// =============================================================================
interface TechnicianMetrics {
  id: string;
  name: string;
  efficiencyPercent: number;
  revenue: number;
  jobsCompleted: number;
  hoursBilled: number;
  hoursWorked: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  goalTarget?: number;
  goalCurrent?: number;
}

interface TechnicianKPIs {
  avgEfficiency: number;
  totalRevenue: number;
  totalHoursBilled: number;
  totalJobsCompleted: number;
}

interface TechnicianResponse {
  data: TechnicianMetrics[];
  kpis?: TechnicianKPIs;
}

// =============================================================================
// Helpers
// =============================================================================
function getEfficiencyColor(pct: number): string {
  if (pct >= 90) return 'text-[var(--status-success)]';
  if (pct >= 70) return 'text-[var(--status-warning)]';
  return 'text-[var(--status-error)]';
}

function getEfficiencyBg(pct: number): string {
  if (pct >= 90) return 'bg-[var(--status-success)]';
  if (pct >= 70) return 'bg-[var(--status-warning)]';
  return 'bg-[var(--status-error)]';
}

function getTrendIcon(trend: string): React.ComponentType<{ className?: string }> {
  if (trend === 'UP') return TrendingUp;
  if (trend === 'DOWN') return TrendingDown;
  return Minus;
}

function getTrendColor(trend: string): string {
  if (trend === 'UP') return 'text-[var(--status-success)]';
  if (trend === 'DOWN') return 'text-[var(--status-error)]';
  return 'text-[var(--text-tertiary)]';
}

// =============================================================================
// Date range options
// =============================================================================
const periodOptions = [
  { value: 'week', label: 'Settimana' },
  { value: 'month', label: 'Mese' },
  { value: 'quarter', label: 'Trimestre' },
];

// =============================================================================
// Main Page
// =============================================================================
export default function TechnicianEfficiencyPage(): React.ReactElement {
  const [period, setPeriod] = useState('month');

  const { data, error, isLoading } = useSWR<TechnicianResponse>(
    `/api/analytics/technicians?period=${period}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const technicians = data?.data ?? [];
  const kpis = data?.kpis ?? { avgEfficiency: 0, totalRevenue: 0, totalHoursBilled: 0, totalJobsCompleted: 0 };

  const sorted = useMemo(
    () => [...technicians].sort((a, b) => b.efficiencyPercent - a.efficiencyPercent),
    [technicians]
  );

  const maxHours = useMemo(
    () => Math.max(...technicians.map(t => Math.max(t.hoursBilled, t.hoursWorked)), 1),
    [technicians]
  );

  const statCards = [
    {
      label: 'Efficienza media',
      value: `${kpis.avgEfficiency.toFixed(1)}%`,
      icon: Target,
      color: getEfficiencyBg(kpis.avgEfficiency),
    },
    {
      label: 'Revenue totale',
      value: new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(kpis.totalRevenue),
      icon: Euro,
      color: 'bg-[var(--status-success)]',
    },
    {
      label: 'Ore fatturate',
      value: kpis.totalHoursBilled.toFixed(0),
      icon: Clock,
      color: 'bg-[var(--brand)]',
    },
    {
      label: 'Lavori completati',
      value: String(kpis.totalJobsCompleted),
      icon: Wrench,
      color: 'bg-[var(--brand)]',
    },
  ];

  return (
    <div>
      {/* Header */}
      <header>
        <div className="px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-headline text-[var(--text-primary)] dark:text-[var(--text-primary)]">Efficienza Tecnici</h1>
            <p className="text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] text-body mt-1">
              Metriche di performance e produttivita
            </p>
          </div>
          <div className="flex items-center gap-2">
            {periodOptions.map(opt => (
              <AppleButton
                key={opt.value}
                variant={period === opt.value ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setPeriod(opt.value)}
              >
                {opt.label}
              </AppleButton>
            ))}
          </div>
        </div>
      </header>

      <motion.div
        className="p-8 space-y-6"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--brand)]" />
          </div>
        ) : error ? (
          <motion.div variants={listItemVariants}>
            <AppleCard hover={false}>
              <AppleCardContent>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-[var(--status-error)]/40 mb-4" />
                  <p className="text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                    Errore nel caricamento dei dati
                  </p>
                  <AppleButton
                    variant="ghost"
                    className="mt-4"
                    icon={<RefreshCw className="h-4 w-4" />}
                    onClick={() => mutate(`/api/analytics/technicians?period=${period}`)}
                  >
                    Riprova
                  </AppleButton>
                </div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        ) : technicians.length === 0 ? (
          <motion.div variants={listItemVariants}>
            <AppleCard hover={false}>
              <AppleCardContent>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="h-12 w-12 text-[var(--text-tertiary)]/40 mb-4" />
                  <p className="text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                    Nessun dato tecnico disponibile
                  </p>
                  <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mt-1">
                    I dati appariranno quando ci saranno lavori completati
                  </p>
                </div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        ) : (
          <>
            {/* KPI Cards */}
            <motion.div
              className="grid grid-cols-2 lg:grid-cols-4 gap-bento"
              variants={containerVariants}
            >
              {statCards.map(stat => (
                <motion.div key={stat.label} variants={itemVariants}>
                  <AppleCard hover={false}>
                    <AppleCardContent>
                      <div className="flex items-center justify-between mb-3">
                        <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center`}>
                          <stat.icon className="h-5 w-5 text-[var(--text-on-brand)]" />
                        </div>
                      </div>
                      <p className="text-title-1 font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                        {stat.value}
                      </p>
                      <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">{stat.label}</p>
                    </AppleCardContent>
                  </AppleCard>
                </motion.div>
              ))}
            </motion.div>

            {/* Bar Chart: Ore fatturate vs Ore lavorate */}
            <motion.div variants={listItemVariants}>
              <AppleCard hover={false}>
                <AppleCardHeader>
                  <h2 className="text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                    <BarChart3 className="w-4 h-4 inline mr-2 text-[var(--brand)]" />
                    Ore fatturate vs Ore lavorate
                  </h2>
                </AppleCardHeader>
                <AppleCardContent>
                  <div className="space-y-4">
                    {technicians.map(tech => (
                      <div key={tech.id} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">{tech.name}</span>
                          <span className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                            {tech.hoursBilled}h / {tech.hoursWorked}h
                          </span>
                        </div>
                        <div className="relative h-6 rounded-md overflow-hidden bg-[var(--surface-secondary)]/30 dark:bg-[var(--surface-hover)]">
                          {/* Hours worked (background bar) */}
                          <div
                            className="absolute inset-y-0 left-0 rounded-md transition-all duration-500 bg-[var(--text-tertiary)]/20"
                            style={{ width: `${(tech.hoursWorked / maxHours) * 100}%` }}
                          />
                          {/* Hours billed (foreground bar) */}
                          <div
                            className="absolute inset-y-0 left-0 rounded-md transition-all duration-500 bg-[var(--brand)]"
                            style={{ width: `${(tech.hoursBilled / maxHours) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-6 mt-4 pt-3 border-t border-[var(--border-default)]/20 dark:border-[var(--border-default)]/50">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-[var(--brand)]" />
                      <span className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">Ore fatturate</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-[var(--text-tertiary)]/20" />
                      <span className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">Ore lavorate</span>
                    </div>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>

            {/* Leaderboard Table */}
            <motion.div variants={listItemVariants}>
              <AppleCard hover={false}>
                <AppleCardHeader>
                  <h2 className="text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                    <Trophy className="w-4 h-4 inline mr-2 text-[var(--status-warning)]" />
                    Classifica Tecnici
                  </h2>
                </AppleCardHeader>
                <AppleCardContent>
                  {/* Desktop */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[var(--border-default)]/20 dark:border-[var(--border-default)]/50">
                          <th className="px-5 py-3 text-center text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] w-12">#</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">Tecnico</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">Efficienza</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">Revenue</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">Lavori</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">Ore fatturate</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">Trend</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">Obiettivo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((tech, idx) => {
                          const TrendIcon = getTrendIcon(tech.trend);
                          const trendColor = getTrendColor(tech.trend);
                          const effColor = getEfficiencyColor(tech.efficiencyPercent);
                          const goalPct = tech.goalTarget && tech.goalTarget > 0
                            ? Math.min(((tech.goalCurrent ?? 0) / tech.goalTarget) * 100, 100)
                            : null;
                          return (
                            <tr
                              key={tech.id}
                              className="border-b border-[var(--border-default)]/10 dark:border-[var(--border-default)]/30 hover:bg-[var(--surface-secondary)]/30 dark:hover:bg-[var(--surface-hover)] transition-colors"
                            >
                              <td className="px-5 py-3 text-center">
                                <span
                                  className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-footnote font-bold ${
                                    idx === 0 ? 'bg-[var(--status-warning)]/20 dark:bg-[var(--status-warning)]/40/30 text-[var(--status-warning)] dark:text-[var(--status-warning)]'
                                    : idx === 1 ? 'bg-[var(--surface-secondary)] dark:bg-[var(--surface-hover)] text-[var(--text-primary)] dark:text-[var(--text-secondary)]'
                                    : idx === 2 ? 'bg-[var(--status-warning)]/10 dark:bg-[var(--status-warning)]/40/30 text-[var(--status-warning)] dark:text-[var(--status-warning)]'
                                    : 'bg-[var(--surface-secondary)]/50 dark:bg-[var(--surface-hover)] text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'
                                  }`}
                                >
                                  {idx + 1}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-body font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">{tech.name}</span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`text-body font-bold ${effColor}`}>
                                  {tech.efficiencyPercent.toFixed(1)}%
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="text-body text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                                  {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(tech.revenue)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">{tech.jobsCompleted}</span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">{tech.hoursBilled}h</span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <TrendIcon className={`w-4 h-4 inline ${trendColor}`} />
                              </td>
                              <td className="px-4 py-3">
                                {goalPct !== null ? (
                                  <div className="w-24 mx-auto">
                                    <div className="flex items-center justify-between text-footnote mb-1">
                                      <span className="text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">{goalPct.toFixed(0)}%</span>
                                    </div>
                                    <div className="h-2 rounded-full overflow-hidden bg-[var(--surface-secondary)]/50 dark:bg-[var(--surface-hover)]">
                                      <div
                                        className={`h-full rounded-full transition-all duration-500 ${
                                          goalPct >= 90 ? 'bg-[var(--status-success)]' : goalPct >= 70 ? 'bg-[var(--status-warning)]' : 'bg-[var(--status-error)]'
                                        }`}
                                        style={{ width: `${goalPct}%` }}
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">N/D</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="lg:hidden space-y-3">
                    {sorted.map((tech, idx) => {
                      const TrendIcon = getTrendIcon(tech.trend);
                      const trendColor = getTrendColor(tech.trend);
                      const effColor = getEfficiencyColor(tech.efficiencyPercent);
                      const goalPct = tech.goalTarget && tech.goalTarget > 0
                        ? Math.min(((tech.goalCurrent ?? 0) / tech.goalTarget) * 100, 100)
                        : null;
                      return (
                        <div
                          key={tech.id}
                          className="p-4 rounded-2xl bg-[var(--surface-secondary)]/30 dark:bg-[var(--surface-hover)] space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-footnote font-bold ${
                                  idx === 0 ? 'bg-[var(--status-warning)]/20 dark:bg-[var(--status-warning)]/40/30 text-[var(--status-warning)] dark:text-[var(--status-warning)]'
                                  : 'bg-[var(--surface-secondary)]/50 dark:bg-[var(--surface-hover)] text-[var(--text-tertiary)]'
                                }`}
                              >
                                {idx + 1}
                              </span>
                              <span className="text-body font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">{tech.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-body font-bold ${effColor}`}>{tech.efficiencyPercent.toFixed(1)}%</span>
                              <TrendIcon className={`w-3.5 h-3.5 ${trendColor}`} />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">Revenue</p>
                              <p className="text-footnote text-[var(--text-primary)] dark:text-[var(--text-primary)]">{new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(tech.revenue)}</p>
                            </div>
                            <div>
                              <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">Lavori</p>
                              <p className="text-footnote text-[var(--text-primary)] dark:text-[var(--text-primary)]">{tech.jobsCompleted}</p>
                            </div>
                            <div>
                              <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">Ore fatt.</p>
                              <p className="text-footnote text-[var(--text-primary)] dark:text-[var(--text-primary)]">{tech.hoursBilled}h</p>
                            </div>
                          </div>
                          {goalPct !== null && (
                            <div>
                              <div className="flex items-center justify-between text-footnote mb-1">
                                <span className="text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">Obiettivo</span>
                                <span className="text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">{goalPct.toFixed(0)}%</span>
                              </div>
                              <div className="h-2 rounded-full overflow-hidden bg-[var(--surface-secondary)]/50 dark:bg-[var(--surface-hover)]">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    goalPct >= 90 ? 'bg-[var(--status-success)]' : goalPct >= 70 ? 'bg-[var(--status-warning)]' : 'bg-[var(--status-error)]'
                                  }`}
                                  style={{ width: `${goalPct}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          </>
        )}
      </motion.div>
    </div>
  );
}
