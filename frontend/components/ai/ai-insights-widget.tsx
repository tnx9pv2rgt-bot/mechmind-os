'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Users,
  Calendar,
  Receipt,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────
interface AiInsight {
  id: string;
  type: 'opportunity' | 'warning' | 'trend' | 'action';
  title: string;
  description: string;
  metric?: string;
  actionLabel?: string;
  actionHref?: string;
  priority: 'high' | 'medium' | 'low';
}

const INSIGHT_ICONS = {
  opportunity: TrendingUp,
  warning: AlertTriangle,
  trend: TrendingDown,
  action: Calendar,
};

const INSIGHT_COLORS = {
  opportunity: 'text-[var(--status-success)] dark:text-[var(--status-success)] bg-[var(--status-success-subtle)] dark:bg-[var(--status-success)]/40/30',
  warning: 'text-[var(--status-warning)] dark:text-[var(--status-warning)] bg-[var(--status-warning)]/10 dark:bg-[var(--status-warning)]/40/30',
  trend: 'text-[var(--brand)] dark:text-[var(--brand)] bg-[var(--brand)]/10 dark:bg-[var(--status-info)]/40/30',
  action: 'text-[var(--brand)] dark:text-[var(--brand)] bg-[var(--brand)]/10 dark:bg-[var(--brand)]/40/30',
};

// ─── Component ──────────────────────────────────────────────────────
export function AiInsightsWidget({ className }: { className?: string }): React.ReactElement {
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchInsights = async (): Promise<void> => {
    try {
      const res = await fetch('/api/ai/insights', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setInsights(data.insights ?? []);
      }
    } catch {
      // Silently fail — insights are non-critical
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const handleRefresh = (): void => {
    setIsRefreshing(true);
    fetchInsights();
  };

  if (isLoading) {
    return (
      <div className={cn('rounded-xl border border-[var(--border-default)] dark:border-[var(--border-default)] p-5', className)}>
        <div className="flex items-center gap-2 mb-4">
          <div className="h-5 w-5 bg-[var(--border-default)] dark:bg-[var(--surface-hover)] rounded animate-pulse" />
          <div className="h-4 w-32 bg-[var(--border-default)] dark:bg-[var(--surface-hover)] rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-[var(--surface-hover)] dark:bg-[var(--surface-elevated)] rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border border-[var(--border-default)] dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)] overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-default)] dark:border-[var(--border-default)]">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[var(--brand)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">AI Insights</h3>
          {insights.length > 0 && (
            <span className="text-xs bg-[var(--brand)]/10 dark:bg-[var(--brand)]/40/30 text-[var(--brand)] dark:text-[var(--brand)] px-1.5 py-0.5 rounded-full font-medium">
              {insights.length}
            </span>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-1 rounded-md hover:bg-[var(--surface-hover)] dark:hover:bg-[var(--surface-hover)] transition-colors"
          aria-label="Aggiorna insights"
        >
          <RefreshCw className={cn('h-3.5 w-3.5 text-[var(--text-tertiary)]', isRefreshing && 'animate-spin')} />
        </button>
      </div>

      {/* Insights List */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {insights.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <Sparkles className="h-8 w-8 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]-light mx-auto mb-2" />
            <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-tertiary)]">
              Nessun insight disponibile al momento.
            </p>
            <p className="text-xs text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]-light mt-1">
              Gli insights vengono generati analizzando i dati della tua officina.
            </p>
          </div>
        ) : (
          insights.slice(0, 5).map((insight, index) => {
            const Icon = INSIGHT_ICONS[insight.type];
            const colors = INSIGHT_COLORS[insight.type];
            return (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="px-5 py-3.5 hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-hover)]/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className={cn('p-1.5 rounded-lg shrink-0 mt-0.5', colors)}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] truncate">
                        {insight.title}
                      </p>
                      {insight.metric && (
                        <span className="text-xs font-semibold text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] shrink-0">
                          {insight.metric}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] mt-0.5 line-clamp-2">
                      {insight.description}
                    </p>
                    {insight.actionLabel && insight.actionHref && (
                      <a
                        href={insight.actionHref}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[var(--brand)] dark:text-[var(--brand)] hover:text-[var(--brand)] dark:hover:text-[var(--brand)] mt-1.5"
                      >
                        {insight.actionLabel}
                        <ChevronRight className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
