'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  AlertTriangle,
  AlertOctagon,
  Info,
  X,
} from 'lucide-react';
import { GlassCard } from '@/components/analytics/glass-card';
import type { LucideIcon } from 'lucide-react';

type Severity = 'critical' | 'warning' | 'info';

interface AnomalyAlert {
  id: string;
  severity: Severity;
  title: string;
  description: string;
  timestamp: Date;
}

const SEVERITY_CONFIG: Record<
  Severity,
  { color: string; bgColor: string; borderColor: string; icon: LucideIcon }
> = {
  critical: {
    color: 'text-[#f87171]',
    bgColor: 'bg-[#f87171]/10',
    borderColor: 'border-[#f87171]/20',
    icon: AlertOctagon,
  },
  warning: {
    color: 'text-[#fbbf24]',
    bgColor: 'bg-[#fbbf24]/10',
    borderColor: 'border-[#fbbf24]/20',
    icon: AlertTriangle,
  },
  info: {
    color: 'text-[#60a5fa]',
    bgColor: 'bg-[#60a5fa]/10',
    borderColor: 'border-[#60a5fa]/20',
    icon: Info,
  },
} as const;

const ALERT_TEMPLATES = [
  {
    severity: 'critical' as Severity,
    title: 'Baia inattiva da 3+ ore',
    description: 'La baia 2 non ha lavorazioni assegnate da oltre 3 ore. Verificare pianificazione.',
  },
  {
    severity: 'warning' as Severity,
    title: 'Fatturato giornaliero sotto media',
    description: 'Il fatturato odierno \u00e8 del 25% inferiore alla media degli ultimi 30 giorni.',
  },
  {
    severity: 'warning' as Severity,
    title: 'OdL in ritardo',
    description: '3 ordini di lavoro hanno superato la data di consegna prevista.',
  },
  {
    severity: 'critical' as Severity,
    title: 'Scorte ricambi basse',
    description: '5 ricambi sotto la soglia minima di riordino. Verificare forniture.',
  },
  {
    severity: 'info' as Severity,
    title: 'NPS sotto soglia',
    description: 'Il punteggio NPS \u00e8 sceso a 6.8, sotto la soglia target di 7.5.',
  },
  {
    severity: 'warning' as Severity,
    title: 'Tempo medio riparazione elevato',
    description: 'Il tempo medio di riparazione oggi \u00e8 superiore del 40% rispetto alla media.',
  },
  {
    severity: 'info' as Severity,
    title: 'Preventivi non confermati',
    description: '8 preventivi in attesa di conferma da pi\u00f9 di 7 giorni.',
  },
] as const;

function generateAlerts(): AnomalyAlert[] {
  const now = new Date();
  const dayOfMonth = now.getDate();
  const hour = now.getHours();

  const seed = dayOfMonth * 24 + hour;
  const indices: number[] = [];
  let current = seed;

  while (indices.length < 5) {
    const idx = current % ALERT_TEMPLATES.length;
    if (!indices.includes(idx)) {
      indices.push(idx);
    }
    current = (current * 7 + 13) % 97;
  }

  return indices.map((templateIdx, i) => {
    const template = ALERT_TEMPLATES[templateIdx];
    const minutesAgo = (i + 1) * 12 + (dayOfMonth % 5) * (i + 1);
    const timestamp = new Date(now.getTime() - minutesAgo * 60 * 1000);

    return {
      id: `alert-${templateIdx}-${dayOfMonth}`,
      severity: template.severity,
      title: template.title,
      description: template.description,
      timestamp,
    };
  });
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'Adesso';
  if (diffMin < 60) return `${diffMin} min fa`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h fa`;
  return `${Math.floor(diffHours / 24)}g fa`;
}

export function AnomalyAlerts(): React.ReactElement {
  const prefersReducedMotion = useReducedMotion();
  const initialAlerts = useMemo(() => generateAlerts(), []);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const visibleAlerts = initialAlerts.filter((a) => !dismissedIds.has(a.id));

  function handleDismiss(id: string): void {
    setDismissedIds((prev) => new Set([...prev, id]));
  }

  if (visibleAlerts.length === 0) {
    return (
      <GlassCard title="Anomalie e Avvisi" subtitle="Nessun avviso attivo">
        <div className="flex flex-col items-center justify-center py-8">
          <Info className="h-8 w-8 text-[#666666] mb-2" />
          <p className="text-sm text-[#888888]">Nessuna anomalia rilevata</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard title="Anomalie e Avvisi" subtitle={`${visibleAlerts.length} avvisi attivi`}>
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {visibleAlerts.map((alert, index) => {
            const config = SEVERITY_CONFIG[alert.severity];
            const Icon = config.icon;

            return (
              <motion.div
                key={alert.id}
                layout
                initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 20, height: 0 }}
                transition={{
                  duration: 0.3,
                  delay: prefersReducedMotion ? 0 : index * 0.05,
                }}
                className={`flex items-start gap-3 rounded-xl border ${config.borderColor} ${config.bgColor} p-3 sm:p-4`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  <Icon className={`h-5 w-5 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-white truncate">
                      {alert.title}
                    </h4>
                    <span className="flex-shrink-0 text-[10px] text-[#666666]">
                      {formatRelativeTime(alert.timestamp)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-[#b4b4b4] leading-relaxed">
                    {alert.description}
                  </p>
                </div>
                <button
                  onClick={() => handleDismiss(alert.id)}
                  className="flex-shrink-0 rounded-full p-1.5 transition-colors hover:bg-white/10 min-w-[36px] min-h-[36px] flex items-center justify-center"
                  aria-label={`Chiudi avviso: ${alert.title}`}
                >
                  <X className="h-3.5 w-3.5 text-[#666666]" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </GlassCard>
  );
}
