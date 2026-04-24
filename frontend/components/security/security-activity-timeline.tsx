'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Shield,
  Key,
  Smartphone,
  Loader2,
  ChevronDown,
} from 'lucide-react';

interface SecurityEvent {
  id: string;
  type: 'login_success' | 'login_failed' | 'mfa_verified' | 'password_changed' | 'device_trusted' | 'device_untrusted' | 'recovery_phone_set' | 'logout' | string;
  timestamp: string;
  location: string;
  os: string;
  browser: string;
  isTrustedDevice: boolean;
  details: string | null;
}

interface SecurityActivityTimelineProps {
  events: SecurityEvent[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  isLoadingMore: boolean;
}

function getEventConfig(type: string): {
  icon: React.ReactElement;
  label: string;
  colorClass: string;
} {
  switch (type) {
    case 'login_success':
      return {
        icon: <CheckCircle className="h-4 w-4" />,
        label: 'Accesso riuscito',
        colorClass: 'text-[var(--status-success)] bg-[var(--status-success-subtle)]0/10',
      };
    case 'login_failed':
      return {
        icon: <XCircle className="h-4 w-4" />,
        label: 'Tentativo di accesso fallito',
        colorClass: 'text-[var(--status-error)] bg-[var(--status-error-subtle)]0/10',
      };
    case 'mfa_verified':
      return {
        icon: <Shield className="h-4 w-4" />,
        label: 'Verifica 2FA completata',
        colorClass: 'text-[var(--status-info)] bg-[var(--status-info-subtle)]0/10',
      };
    case 'password_changed':
      return {
        icon: <Key className="h-4 w-4" />,
        label: 'Password cambiata',
        colorClass: 'text-[var(--status-warning)] bg-[var(--status-warning)]/100/10',
      };
    case 'device_trusted':
      return {
        icon: <Shield className="h-4 w-4" />,
        label: 'Dispositivo fidato',
        colorClass: 'text-[var(--status-success)] bg-[var(--status-success-subtle)]0/10',
      };
    case 'device_untrusted':
      return {
        icon: <AlertTriangle className="h-4 w-4" />,
        label: 'Fiducia revocata',
        colorClass: 'text-[var(--status-warning)] bg-[var(--status-warning)]/50/10',
      };
    case 'recovery_phone_set':
      return {
        icon: <Smartphone className="h-4 w-4" />,
        label: 'Telefono di recupero impostato',
        colorClass: 'text-[var(--status-info)] bg-[var(--status-info-subtle)]0/10',
      };
    case 'logout':
      return {
        icon: <CheckCircle className="h-4 w-4" />,
        label: 'Disconnessione',
        colorClass: 'text-[var(--text-tertiary)] bg-[var(--border-strong)]/50',
      };
    default:
      return {
        icon: <Shield className="h-4 w-4" />,
        label: type.replace(/_/g, ' '),
        colorClass: 'text-[var(--text-tertiary)] bg-[var(--border-strong)]/50',
      };
  }
}

function formatEventDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }) + ', ' + date.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SecurityActivityTimeline({
  events,
  isLoading,
  hasMore,
  onLoadMore,
  isLoadingMore,
}: SecurityActivityTimelineProps): React.ReactElement {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-4"
          >
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-[var(--border-strong)]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 rounded bg-[var(--border-strong)]" />
                <div className="h-3 w-32 rounded bg-[var(--border-strong)]" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-[var(--text-tertiary)]">
        <Shield className="h-10 w-10" />
        <p className="text-sm">Nessuna attività di sicurezza registrata</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((event, index) => {
        const config = getEventConfig(event.type);
        const isExpanded = expandedId === event.id;

        return (
          <motion.button
            key={event.id}
            type="button"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            onClick={() => setExpandedId(isExpanded ? null : event.id)}
            className="w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-4 text-left transition-colors hover:border-[var(--border-default)]/20"
          >
            <div className="flex items-start gap-3">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${config.colorClass}`}>
                {config.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-[var(--text-on-brand)]">{config.label}</p>
                  <ChevronDown className={`h-3.5 w-3.5 text-[var(--text-tertiary)] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
                <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                  {formatEventDate(event.timestamp)}
                </p>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 space-y-1 border-t border-[var(--border-strong)] pt-3"
                  >
                    <p className="text-xs text-[var(--text-secondary)]">
                      {event.location} | {event.os} | {event.browser}
                    </p>
                    {event.isTrustedDevice && (
                      <p className="flex items-center gap-1 text-xs text-[var(--status-success)]">
                        <Shield className="h-3 w-3" />
                        Dispositivo fidato
                      </p>
                    )}
                    {event.details && (
                      <p className="text-xs text-[var(--text-tertiary)]">
                        {event.type === 'login_failed' ? 'Motivo: ' : ''}{event.details}
                      </p>
                    )}
                  </motion.div>
                )}
              </div>
            </div>
          </motion.button>
        );
      })}

      {hasMore && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={isLoadingMore}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-[var(--border-strong)] px-4 py-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-default)]/30 hover:text-[var(--text-on-brand)] disabled:opacity-50"
        >
          {isLoadingMore ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Carica altri'
          )}
        </button>
      )}
    </div>
  );
}
