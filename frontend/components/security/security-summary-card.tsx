'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, LogIn, AlertTriangle, Monitor } from 'lucide-react';

interface SecuritySummary {
  totalLogins: number;
  failedAttempts: number;
  activeDevices: number;
  periodDays: number;
}

interface SecuritySummaryCardProps {
  summary: SecuritySummary | null;
  isLoading: boolean;
}

export function SecuritySummaryCard({
  summary,
  isLoading,
}: SecuritySummaryCardProps): React.ReactElement {
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-4"
          >
            <div className="h-8 w-8 rounded-full bg-[var(--border-strong)]" />
            <div className="mt-2 h-6 w-12 rounded bg-[var(--border-strong)]" />
            <div className="mt-1 h-3 w-20 rounded bg-[var(--border-strong)]" />
          </div>
        ))}
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-6 text-[var(--text-tertiary)]">
        <Shield className="h-5 w-5" />
        <p className="text-sm">Nessun riepilogo disponibile</p>
      </div>
    );
  }

  const stats = [
    {
      icon: <LogIn className="h-4 w-4" />,
      value: summary.totalLogins,
      label: 'Accessi',
      colorClass: 'text-[var(--status-success)] bg-[var(--status-success-subtle)]0/10',
    },
    {
      icon: <AlertTriangle className="h-4 w-4" />,
      value: summary.failedAttempts,
      label: 'Tentativi falliti',
      colorClass: summary.failedAttempts > 0
        ? 'text-[var(--status-error)] bg-[var(--status-error-subtle)]0/10'
        : 'text-[var(--text-tertiary)] bg-[var(--border-strong)]/50',
    },
    {
      icon: <Monitor className="h-4 w-4" />,
      value: summary.activeDevices,
      label: 'Dispositivi',
      colorClass: 'text-[var(--status-info)] bg-[var(--status-info-subtle)]0/10',
    },
  ];

  return (
    <div>
      <p className="mb-3 text-xs text-[var(--text-tertiary)]">
        Riepilogo ultimi {summary.periodDays} giorni
      </p>
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-4"
          >
            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${stat.colorClass}`}>
              {stat.icon}
            </div>
            <p className="mt-2 text-2xl font-semibold text-[var(--text-on-brand)]">{stat.value}</p>
            <p className="text-xs text-[var(--text-tertiary)]">{stat.label}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
