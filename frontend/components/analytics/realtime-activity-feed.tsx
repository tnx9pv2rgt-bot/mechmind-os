'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  ClipboardList,
  FileText,
  FileCheck,
  Car,
  CreditCard,
  Wrench,
  UserPlus,
  Package,
  CalendarCheck,
  MessageSquare,
} from 'lucide-react';
import { GlassCard } from '@/components/analytics/glass-card';
import type { LucideIcon } from 'lucide-react';

interface ActivityItem {
  id: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  description: string;
  timestamp: Date;
}

interface ActivityTemplate {
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  descriptions: string[];
}

const ACTIVITY_TEMPLATES: ActivityTemplate[] = [
  {
    icon: ClipboardList,
    iconColor: '#60a5fa',
    iconBg: 'rgba(96,165,250,0.1)',
    descriptions: [
      'Nuovo OdL #1042 creato per tagliando completo',
      'Nuovo OdL #1043 creato per sostituzione freni',
      'Nuovo OdL #1044 creato per revisione annuale',
    ],
  },
  {
    icon: FileText,
    iconColor: '#34d399',
    iconBg: 'rgba(52,211,153,0.1)',
    descriptions: [
      'Fattura #F-2026-0891 emessa (\u20ac 485,00)',
      'Fattura #F-2026-0892 emessa (\u20ac 1.250,00)',
      'Fattura #F-2026-0893 emessa (\u20ac 320,00)',
    ],
  },
  {
    icon: FileCheck,
    iconColor: '#a78bfa',
    iconBg: 'rgba(167,139,250,0.1)',
    descriptions: [
      'Preventivo #P-0455 approvato dal cliente',
      'Preventivo #P-0456 confermato via portale',
      'Preventivo #P-0457 accettato telefonicamente',
    ],
  },
  {
    icon: Car,
    iconColor: '#22d3ee',
    iconBg: 'rgba(34,211,238,0.1)',
    descriptions: [
      'Check-in veicolo: Fiat Punto (AB 123 CD)',
      'Check-in veicolo: BMW Serie 3 (EF 456 GH)',
      'Check-in veicolo: VW Golf (LM 789 NP)',
    ],
  },
  {
    icon: CreditCard,
    iconColor: '#34d399',
    iconBg: 'rgba(52,211,153,0.1)',
    descriptions: [
      'Pagamento ricevuto: \u20ac 485,00 (carta)',
      'Pagamento ricevuto: \u20ac 1.250,00 (bonifico)',
      'Pagamento ricevuto: \u20ac 320,00 (contanti)',
    ],
  },
  {
    icon: Wrench,
    iconColor: '#fbbf24',
    iconBg: 'rgba(251,191,36,0.1)',
    descriptions: [
      'Lavorazione completata: sostituzione olio motore',
      'Lavorazione completata: allineamento ruote',
      'Lavorazione completata: sostituzione pastiglie',
    ],
  },
  {
    icon: UserPlus,
    iconColor: '#a78bfa',
    iconBg: 'rgba(167,139,250,0.1)',
    descriptions: [
      'Nuovo cliente registrato via portale',
      'Nuovo cliente aggiunto manualmente',
      'Cliente importato da file CSV',
    ],
  },
  {
    icon: Package,
    iconColor: '#f87171',
    iconBg: 'rgba(248,113,113,0.1)',
    descriptions: [
      'Ricambio ordinato: filtro olio (x3)',
      'Ricambio arrivato: kit freni anteriore',
      'Scorta aggiornata: candele NGK (+20)',
    ],
  },
  {
    icon: CalendarCheck,
    iconColor: '#60a5fa',
    iconBg: 'rgba(96,165,250,0.1)',
    descriptions: [
      'Appuntamento confermato per domani ore 9:00',
      'Prenotazione online ricevuta per gioved\u00ec',
      'Promemoria inviato per appuntamento di luned\u00ec',
    ],
  },
  {
    icon: MessageSquare,
    iconColor: '#22d3ee',
    iconBg: 'rgba(34,211,238,0.1)',
    descriptions: [
      'SMS di stato inviato al cliente',
      'Notifica push: veicolo pronto per ritiro',
      'Email di follow-up inviata automaticamente',
    ],
  },
] as const;

function generateActivities(count: number): ActivityItem[] {
  const now = new Date();
  const dayOfMonth = now.getDate();
  const hour = now.getHours();
  const minute = now.getMinutes();

  const activities: ActivityItem[] = [];
  let seed = dayOfMonth * 1440 + hour * 60 + Math.floor(minute / 5) * 5;

  for (let i = 0; i < count; i++) {
    const templateIdx = seed % ACTIVITY_TEMPLATES.length;
    const template = ACTIVITY_TEMPLATES[templateIdx];
    const descIdx = ((seed * 3 + 7) % template.descriptions.length);
    const minutesAgo = i * 6 + (seed % 4) + 1;

    activities.push({
      id: `act-${seed}-${i}`,
      icon: template.icon,
      iconColor: template.iconColor,
      iconBg: template.iconBg,
      description: template.descriptions[descIdx],
      timestamp: new Date(now.getTime() - minutesAgo * 60 * 1000),
    });

    seed = (seed * 11 + 23) % 997;
  }

  return activities;
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

export function RealtimeActivityFeed(): React.ReactElement {
  const prefersReducedMotion = useReducedMotion();
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activities = useMemo(() => generateActivities(10), []);

  // Auto-scroll when not paused
  useEffect(() => {
    if (isPaused || prefersReducedMotion) return;
    const el = scrollRef.current;
    if (!el) return;

    const timer = setInterval(() => {
      if (el.scrollTop < el.scrollHeight - el.clientHeight) {
        el.scrollTop += 1;
      } else {
        el.scrollTop = 0;
      }
    }, 80);

    return () => clearInterval(timer);
  }, [isPaused, prefersReducedMotion]);

  return (
    <GlassCard
      title="Attivit\u00e0 in Tempo Reale"
      subtitle="Ultimi eventi dell'officina"
    >
      <div
        ref={scrollRef}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocus={() => setIsPaused(true)}
        onBlur={() => setIsPaused(false)}
        className="max-h-[400px] overflow-y-auto space-y-1 scrollbar-hide"
        role="log"
        aria-label="Feed attivit\u00e0 recenti"
        aria-live="polite"
      >
        <AnimatePresence>
          {activities.map((activity, index) => {
            const Icon = activity.icon;

            return (
              <motion.div
                key={activity.id}
                initial={
                  prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -10 }
                }
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  delay: prefersReducedMotion ? 0 : index * 0.04,
                }}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/5"
              >
                <div
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: activity.iconBg }}
                >
                  <Icon
                    className="h-4 w-4"
                    style={{ color: activity.iconColor }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">
                    {activity.description}
                  </p>
                </div>
                <span className="flex-shrink-0 text-[11px] text-[#666666] tabular-nums">
                  {formatRelativeTime(activity.timestamp)}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {isPaused && (
        <div className="mt-2 text-center">
          <span className="text-[10px] text-[#666666] uppercase tracking-wider">
            Scorrimento in pausa
          </span>
        </div>
      )}
    </GlassCard>
  );
}
