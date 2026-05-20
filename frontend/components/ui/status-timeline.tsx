'use client';

import { Fragment } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────
export interface TimelineEvent {
  id: string;
  status: string;
  timestamp: string;
  actor?: string;
  note?: string;
}

export interface TimelineStepConfig {
  key: string;
  label: string;
  icon: LucideIcon;
}

interface StatusTimelineProps {
  currentStatus: string;
  events: TimelineEvent[];
  steps: TimelineStepConfig[];
  variant?: 'tracker' | 'history';
  showActor?: boolean;
  showNotes?: boolean;
  compact?: boolean;
  className?: string;
}

// ─── Helpers ──────────────────────────────────────────────────
function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Adesso';
  if (minutes < 60) return `${minutes} min fa`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ore fa`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Ieri';
  if (days < 7) return `${days} giorni fa`;
  return formatTimestamp(iso);
}

type StepState = 'completed' | 'current' | 'future' | 'error';

const DOT_STYLES: Record<StepState, string> = {
  completed: 'bg-[var(--status-success-subtle)]0 text-[var(--text-on-brand)]',
  current: 'bg-[var(--status-info-subtle)]0 text-[var(--text-on-brand)] ring-4 ring-[var(--status-info)]/20 dark:ring-[var(--status-info)]/30',
  future: 'bg-[var(--border-default)] dark:bg-[var(--surface-active)] text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]',
  error: 'bg-[var(--status-error-subtle)]0 text-[var(--text-on-brand)]',
};

const LINE_STYLES: Record<StepState, string> = {
  completed: 'bg-[var(--status-success)]',
  current: 'bg-[var(--border-default)] dark:bg-[var(--surface-active)]',
  future: 'bg-[var(--border-default)] dark:bg-[var(--surface-active)]',
  error: 'bg-[var(--status-error)]/30 dark:bg-[var(--status-error)]',
};

const TEXT_STYLES: Record<StepState, string> = {
  completed: 'text-[var(--text-primary)] dark:text-[var(--text-primary)]',
  current: 'text-[var(--text-primary)] dark:text-[var(--text-primary)] font-semibold',
  future: 'text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]',
  error: 'text-[var(--status-error)] dark:text-[var(--status-error)]',
};

const TERMINAL_STATUSES = new Set(['CANCELLED', 'cancelled', 'NO_SHOW']);

// ─── Component ────────────────────────────────────────────────
export function StatusTimeline({
  currentStatus,
  events,
  steps,
  variant = 'tracker',
  showActor = true,
  showNotes = true,
  compact = false,
  className,
}: StatusTimelineProps): JSX.Element {
  const currentIndex = steps.findIndex(s => s.key === currentStatus);

  const eventMap = new Map<string, TimelineEvent>();
  for (const event of events) {
    eventMap.set(event.status, event);
  }

  function getStepState(index: number, stepKey: string): StepState {
    if (TERMINAL_STATUSES.has(currentStatus) && stepKey === currentStatus) return 'error';
    if (index < currentIndex) return 'completed';
    if (index === currentIndex) return 'current';
    return 'future';
  }

  const visibleSteps =
    variant === 'history' ? steps.filter(s => eventMap.has(s.key)) : steps;

  const dotSize = compact ? 'w-8 h-8' : 'w-10 h-10';
  const iconSize = compact ? 'h-4 w-4' : 'h-5 w-5';
  const spacing = compact ? 'pb-5' : 'pb-8';

  return (
    <div className={cn('relative', className)}>
      {visibleSteps.map((step, index) => {
        const originalIndex = steps.indexOf(step);
        const state = getStepState(originalIndex, step.key);
        const event = eventMap.get(step.key);
        const isLast = index === visibleSteps.length - 1;
        const StepIcon = step.icon;

        return (
          <motion.div
            key={step.key}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.06, duration: 0.3 }}
            className='flex gap-4 relative'
          >
            {/* Connecting line */}
            {!isLast && (
              <div
                className={cn(
                  'absolute w-0.5',
                  compact ? 'left-4 top-8' : 'left-5 top-10',
                  'h-full',
                  LINE_STYLES[state]
                )}
              />
            )}

            {/* Dot */}
            <div
              className={cn(
                'relative z-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300',
                dotSize,
                DOT_STYLES[state]
              )}
            >
              {state === 'completed' ? (
                <CheckCircle className={iconSize} />
              ) : state === 'error' ? (
                <AlertCircle className={iconSize} />
              ) : (
                <StepIcon className={iconSize} />
              )}
            </div>

            {/* Content */}
            <div className={cn('flex-1', !isLast && spacing)}>
              <p className={cn('text-sm', TEXT_STYLES[state])}>{step.label}</p>

              {event && (
                <p className='text-xs text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mt-0.5'>
                  <span title={formatTimestamp(event.timestamp)}>
                    {formatRelativeTime(event.timestamp)}
                  </span>
                </p>
              )}

              {showActor && event?.actor && (
                <p className='flex items-center gap-1 text-xs text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mt-1'>
                  <User className='h-3 w-3' />
                  {event.actor}
                </p>
              )}

              {showNotes && event?.note && (
                <p className='text-xs text-[var(--text-primary)] dark:text-[var(--text-primary)] mt-1 bg-[var(--surface-secondary)] dark:bg-[var(--surface-hover)] rounded-md px-2 py-1 border-l-2 border-[var(--status-info)]/40'>
                  {event.note}
                </p>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
