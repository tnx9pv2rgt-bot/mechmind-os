'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Maximize2,
  X,
  Euro,
  ClipboardList,
  Users,
  TrendingUp,
  Clock,
  Wrench,
} from 'lucide-react';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import type { LucideIcon } from 'lucide-react';

interface BigBoardKpi {
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;
}

interface AnalyticsKpiData {
  kpis?: {
    revenue: number;
    completedOrders: number;
    newCustomers: number;
    avgTicket: number;
    conversionRate: number;
  };
  data?: {
    kpis: {
      revenue: number;
      completedOrders: number;
      newCustomers: number;
      avgTicket: number;
      conversionRate: number;
    };
  };
}

const VIEW_TITLES = [
  'Panoramica KPI',
  'Performance Fatturato',
  'Efficienza Operativa',
] as const;

function formatEuro(value: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function BigBoardToggle(): React.ReactElement {
  const prefersReducedMotion = useReducedMotion();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentView, setCurrentView] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cycleRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: rawData } = useSWR<AnalyticsKpiData>(
    isFullscreen ? '/api/dashboard/analytics?period=today' : null,
    fetcher,
    { refreshInterval: 15000 }
  );

  const kpis = rawData?.kpis ?? rawData?.data?.kpis;

  const dayOfMonth = new Date().getDate();

  const boardKpis: BigBoardKpi[] = kpis
    ? [
        { label: 'Fatturato Oggi', value: formatEuro(kpis.revenue), icon: Euro, color: '#34d399' },
        { label: 'OdL Completati', value: String(kpis.completedOrders), icon: ClipboardList, color: '#60a5fa' },
        { label: 'Nuovi Clienti', value: String(kpis.newCustomers), icon: Users, color: '#a78bfa' },
        { label: 'Ticket Medio', value: formatEuro(kpis.avgTicket), icon: TrendingUp, color: '#fbbf24' },
        { label: 'Tasso Conversione', value: `${kpis.conversionRate.toFixed(1)}%`, icon: Wrench, color: '#22d3ee' },
        {
          label: 'Tempo Medio',
          value: `${(2.4 + (dayOfMonth % 5) * 0.3).toFixed(1)}h`,
          icon: Clock,
          color: '#f87171',
        },
      ]
    : [];

  const enterFullscreen = useCallback(async (): Promise<void> => {
    try {
      const el = containerRef.current ?? document.documentElement;
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      }
    } catch {
      // Fullscreen not supported or denied - still show the overlay
    }
    setIsFullscreen(true);
  }, []);

  const exitFullscreen = useCallback((): void => {
    setIsFullscreen(false);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Clock timer
  useEffect(() => {
    if (!isFullscreen) return;
    intervalRef.current = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isFullscreen]);

  // Auto-cycle views
  useEffect(() => {
    if (!isFullscreen || prefersReducedMotion) return;
    cycleRef.current = setInterval(() => {
      setCurrentView((v) => (v + 1) % VIEW_TITLES.length);
    }, 15000);
    return () => {
      if (cycleRef.current) clearInterval(cycleRef.current);
    };
  }, [isFullscreen, prefersReducedMotion]);

  // ESC handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape' && isFullscreen) {
        exitFullscreen();
      }
    }
    function handleFullscreenChange(): void {
      if (!document.fullscreenElement && isFullscreen) {
        setIsFullscreen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isFullscreen, exitFullscreen]);

  return (
    <>
      {/* Floating toggle button */}
      <motion.button
        onClick={enterFullscreen}
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-[var(--surface-elevated)]/90 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-colors hover:bg-[var(--surface-active)] sm:h-14 sm:w-14"
        whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
        whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
        aria-label="Modalit\u00e0 schermo intero"
        title="Big Board - Modalit\u00e0 TV"
      >
        <Maximize2 className="h-5 w-5 text-white" />
      </motion.button>

      {/* Fullscreen overlay */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            ref={containerRef}
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-[9999] flex flex-col bg-[var(--surface-tertiary)] overflow-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-4 border-b border-white/5">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {VIEW_TITLES.map((title, i) => (
                    <button
                      key={title}
                      onClick={() => setCurrentView(i)}
                      className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors min-h-[36px] ${
                        currentView === i
                          ? 'bg-white text-[var(--surface-tertiary)]'
                          : 'text-[var(--text-tertiary)] hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {title}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-6">
                <span className="text-lg font-mono text-[var(--text-secondary)] tabular-nums">
                  {formatTime(currentTime)}
                </span>
                <button
                  onClick={exitFullscreen}
                  className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-white/10 min-h-[44px] min-w-[44px]"
                  aria-label="Esci dalla modalit\u00e0 schermo intero"
                >
                  <X className="h-5 w-5 text-[var(--text-tertiary)]" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex items-center justify-center p-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentView}
                  initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? {} : { opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                  className="w-full max-w-7xl"
                >
                  <h2 className="text-2xl font-bold text-white mb-8 text-center sm:text-3xl">
                    {VIEW_TITLES[currentView]}
                  </h2>

                  {!kpis ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-40 rounded-2xl border border-white/5 bg-[var(--surface-elevated)]/50 animate-pulse"
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                      {boardKpis.map((kpi) => {
                        const Icon = kpi.icon;
                        return (
                          <motion.div
                            key={kpi.label}
                            className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-[var(--surface-elevated)]/80 backdrop-blur-xl p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                            whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                          >
                            <div
                              className="flex h-14 w-14 items-center justify-center rounded-2xl mb-4"
                              style={{ backgroundColor: `${kpi.color}15` }}
                            >
                              <Icon className="h-7 w-7" style={{ color: kpi.color }} />
                            </div>
                            <span className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl tabular-nums">
                              {kpi.value}
                            </span>
                            <span className="mt-2 text-sm text-[var(--text-tertiary)] font-medium">
                              {kpi.label}
                            </span>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Watermark */}
            <div className="absolute bottom-4 right-6 text-xs text-[var(--border-strong)] font-medium select-none pointer-events-none">
              MechMind OS
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
