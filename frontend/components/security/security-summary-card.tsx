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
            className="animate-pulse rounded-2xl border border-[#4e4e4e] bg-[#2f2f2f] p-4"
          >
            <div className="h-8 w-8 rounded-full bg-[#4e4e4e]" />
            <div className="mt-2 h-6 w-12 rounded bg-[#4e4e4e]" />
            <div className="mt-1 h-3 w-20 rounded bg-[#4e4e4e]" />
          </div>
        ))}
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-[#4e4e4e] bg-[#2f2f2f] p-6 text-[#888]">
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
      colorClass: 'text-green-400 bg-green-500/10',
    },
    {
      icon: <AlertTriangle className="h-4 w-4" />,
      value: summary.failedAttempts,
      label: 'Tentativi falliti',
      colorClass: summary.failedAttempts > 0
        ? 'text-red-400 bg-red-500/10'
        : 'text-[#888] bg-[#4e4e4e]/50',
    },
    {
      icon: <Monitor className="h-4 w-4" />,
      value: summary.activeDevices,
      label: 'Dispositivi',
      colorClass: 'text-blue-400 bg-blue-500/10',
    },
  ];

  return (
    <div>
      <p className="mb-3 text-xs text-[#888]">
        Riepilogo ultimi {summary.periodDays} giorni
      </p>
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="rounded-2xl border border-[#4e4e4e] bg-[#2f2f2f] p-4"
          >
            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${stat.colorClass}`}>
              {stat.icon}
            </div>
            <p className="mt-2 text-2xl font-semibold text-white">{stat.value}</p>
            <p className="text-xs text-[#888]">{stat.label}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
