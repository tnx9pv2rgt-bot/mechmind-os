'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { motion } from 'framer-motion';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Euro,
  Car,
  Clock,
  Percent,
  Users,
  Lightbulb,
  Loader2,
  Trophy,
  Filter,
  AlertCircle,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';

// ─── Types ───────────────────────────────────────────────────────────────────

interface BenchmarkMetric {
  key: string;
  label: string;
  yourValue: number;
  industryAvg: number;
  percentile: number;
  trend: 'up' | 'down' | 'flat';
  unit: 'currency' | 'number' | 'percent';
}

interface BenchmarkTip {
  area: string;
  suggestion: string;
  impact: 'high' | 'medium' | 'low';
}

interface BenchmarkResponse {
  metrics: BenchmarkMetric[];
  tips: BenchmarkTip[];
  period: string;
}

// ─── Metric Config ───────────────────────────────────────────────────────────

const metricIcons: Record<string, React.ReactElement> = {
  aro: <Euro className="h-5 w-5" />,
  carCount: <Car className="h-5 w-5" />,
  effectiveRate: <Clock className="h-5 w-5" />,
  partsMargin: <Percent className="h-5 w-5" />,
  techEfficiency: <Users className="h-5 w-5" />,
};

const metricLabels: Record<string, string> = {
  aro: 'Ordine medio di riparazione (ARO)',
  carCount: 'Veicoli al mese',
  effectiveRate: 'Tariffa oraria effettiva',
  partsMargin: 'Margine ricambi',
  techEfficiency: 'Efficienza tecnici',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMetricValue(value: number, unit: string): string {
  switch (unit) {
    case 'currency':
      return formatCurrency(value);
    case 'percent':
      return `${value.toFixed(1)}%`;
    default:
      return value.toLocaleString('it-IT');
  }
}

function getPercentileLabel(percentile: number): string {
  if (percentile >= 90) return 'Top 10%';
  if (percentile >= 75) return 'Top 25%';
  if (percentile >= 50) return 'Sopra la media';
  if (percentile >= 25) return 'Sotto la media';
  return 'Bottom 25%';
}

function getPercentileColor(percentile: number): {
  text: string;
  bg: string;
} {
  if (percentile >= 75)
    return {
      text: 'text-[var(--status-success)] dark:text-[var(--status-success)]',
      bg: 'bg-[var(--status-success-subtle)] dark:bg-[var(--status-success-subtle)]',
    };
  if (percentile >= 50)
    return {
      text: 'text-[var(--status-warning)] dark:text-[var(--status-warning)]',
      bg: 'bg-[var(--status-warning)]/20 dark:bg-[var(--status-warning-subtle)]',
    };
  return {
    text: 'text-[var(--status-error)] dark:text-[var(--status-error)]',
    bg: 'bg-[var(--status-error-subtle)] dark:bg-[var(--status-error-subtle)]',
  };
}

function getComparisonColor(yourValue: number, industryAvg: number): string {
  if (yourValue > industryAvg * 1.05) return 'text-[var(--status-success)]';
  if (yourValue < industryAvg * 0.95) return 'text-[var(--status-error)]';
  return 'text-[var(--status-warning)]';
}

// ─── Animations ──────────────────────────────────────────────────────────────

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

// ─── Component ───────────────────────────────────────────────────────────────

export default function BenchmarkingPage(): React.ReactElement {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
  );

  const { data, error, isLoading, mutate } = useSWR<{ data: BenchmarkResponse }>(
    `/api/benchmarking?period=${selectedMonth}`,
    fetcher,
  );

  const benchmarkData = data?.data;
  const metrics = benchmarkData?.metrics ?? [];
  const tips = benchmarkData?.tips ?? [];

  // Generate month options (last 12 months)
  const monthOptions: { value: string; label: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthOptions.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }),
    });
  }

  return (
    <div>
      {/* Header */}
      <header>
        <div className="px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-headline text-[var(--text-primary)] dark:text-[var(--text-primary)]">Benchmarking</h1>
            <p className="text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] text-body mt-1">
              Confronta le performance della tua officina con la media del settore
            </p>
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)] pointer-events-none" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-10 pl-10 pr-4 rounded-md border border-[var(--border-default)] dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] text-body text-[var(--text-primary)] dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-apple-blue appearance-none cursor-pointer"
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <motion.div
        className="p-8 space-y-6"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Content */}
        {error ? (
          <motion.div variants={listItemVariants}>
            <AppleCard hover={false}>
              <AppleCardContent>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-[var(--status-error)]/40 mb-4" />
                  <p className="text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                    Impossibile caricare i dati di benchmarking
                  </p>
                  <AppleButton
                    variant="ghost"
                    className="mt-4"
                    onClick={() => mutate()}
                  >
                    Riprova
                  </AppleButton>
                </div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--brand)]" />
          </div>
        ) : metrics.length === 0 ? (
          <motion.div variants={listItemVariants}>
            <AppleCard hover={false}>
              <AppleCardContent>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <BarChart3 className="h-12 w-12 text-[var(--text-tertiary)]/40 mb-4" />
                  <p className="text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                    Nessun dato disponibile per il periodo selezionato
                  </p>
                  <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mt-1">
                    I dati vengono elaborati mensilmente
                  </p>
                </div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        ) : (
          <>
            {/* Metric Cards */}
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-bento"
              variants={containerVariants}
            >
              {metrics.map((metric) => {
                const pColor = getPercentileColor(metric.percentile);
                const compColor = getComparisonColor(
                  metric.yourValue,
                  metric.industryAvg,
                );

                return (
                  <motion.div key={metric.key} variants={itemVariants}>
                    <AppleCard hover={false}>
                      <AppleCardContent>
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[var(--surface-secondary)]/50 dark:bg-[var(--surface-hover)] flex items-center justify-center text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                              {metricIcons[metric.key] ?? (
                                <BarChart3 className="h-5 w-5" />
                              )}
                            </div>
                            <p className="text-body font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                              {metricLabels[metric.key] ?? metric.label}
                            </p>
                          </div>
                          {metric.trend === 'up' ? (
                            <TrendingUp className="h-4 w-4 text-[var(--status-success)]" />
                          ) : metric.trend === 'down' ? (
                            <TrendingDown className="h-4 w-4 text-[var(--status-error)]" />
                          ) : (
                            <Minus className="h-4 w-4 text-[var(--text-tertiary)]" />
                          )}
                        </div>

                        {/* Values */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mb-0.5">
                              Il tuo valore
                            </p>
                            <p className={`text-title-2 font-bold ${compColor}`}>
                              {formatMetricValue(metric.yourValue, metric.unit)}
                            </p>
                          </div>
                          <div>
                            <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mb-0.5">
                              Media settore
                            </p>
                            <p className="text-title-2 font-bold text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                              {formatMetricValue(metric.industryAvg, metric.unit)}
                            </p>
                          </div>
                        </div>

                        {/* Percentile gauge */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                              Percentile
                            </span>
                            <span
                              className={`text-footnote font-semibold px-2.5 py-1 rounded-full ${pColor.bg} ${pColor.text}`}
                            >
                              {getPercentileLabel(metric.percentile)}
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-[var(--surface-secondary)]/50 dark:bg-[var(--surface-hover)] overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${
                                metric.percentile >= 75
                                  ? 'bg-[var(--status-success)]'
                                  : metric.percentile >= 50
                                    ? 'bg-[var(--status-warning)]'
                                    : 'bg-[var(--status-error)]'
                              }`}
                              style={{ width: `${metric.percentile}%` }}
                            />
                          </div>
                        </div>
                      </AppleCardContent>
                    </AppleCard>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Tips Section */}
            {tips.length > 0 && (
              <motion.div variants={listItemVariants}>
                <AppleCard hover={false}>
                  <AppleCardHeader>
                    <h2 className="text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                      <Lightbulb className="inline h-5 w-5 mr-2 text-[var(--status-warning)]" />
                      Suggerimenti per migliorare
                    </h2>
                  </AppleCardHeader>
                  <AppleCardContent>
                    <div className="space-y-3">
                      {tips.map((tip, i) => {
                        const impactColors: Record<string, string> = {
                          high: 'bg-[var(--status-error-subtle)] dark:bg-[var(--status-error-subtle)] text-[var(--status-error)] dark:text-[var(--status-error)] border-[var(--status-error)]/30 dark:border-[var(--status-error)]',
                          medium:
                            'bg-[var(--status-warning)]/20 dark:bg-[var(--status-warning)]/40/30 text-[var(--status-warning)] dark:text-[var(--status-warning)] border-[var(--status-warning)]/30 dark:border-[var(--status-warning)]',
                          low: 'bg-[var(--status-info-subtle)] dark:bg-[var(--status-info)]/40/30 text-[var(--status-info)] dark:text-[var(--status-info)] border-[var(--status-info)]/30 dark:border-[var(--status-info)]',
                        };
                        const impactLabels: Record<string, string> = {
                          high: 'Impatto alto',
                          medium: 'Impatto medio',
                          low: 'Impatto basso',
                        };

                        return (
                          <div
                            key={i}
                            className={`p-4 rounded-2xl border ${impactColors[tip.impact] ?? impactColors.low}`}
                          >
                            <div className="flex items-start gap-3">
                              <Lightbulb className="h-4 w-4 shrink-0 mt-0.5" />
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-body font-medium">
                                    {tip.area}
                                  </span>
                                  <span className="text-footnote font-medium opacity-75">
                                    {impactLabels[tip.impact] ?? 'Impatto'}
                                  </span>
                                </div>
                                <p className="text-body opacity-90">
                                  {tip.suggestion}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </AppleCardContent>
                </AppleCard>
              </motion.div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
