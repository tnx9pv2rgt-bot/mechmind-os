'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import {
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  Clock,
  Shield,
  LogOut,
  Loader2,
  AlertCircle,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SessionInfo {
  id: string;
  deviceName: string;
  deviceType: string;
  browser: string | null;
  os: string | null;
  ipAddress: string | null;
  city: string | null;
  country: string | null;
  lastActiveAt: string;
  createdAt: string;
  isCurrent: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function DeviceIcon({ type }: { type: string }) {
  switch (type) {
    case 'phone':
      return <Smartphone className="h-8 w-8 text-apple-blue" />;
    case 'tablet':
      return <Tablet className="h-8 w-8 text-apple-purple" />;
    default:
      return <Monitor className="h-8 w-8 text-apple-gray dark:text-[var(--text-secondary)]" />;
  }
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return 'Attivo ora';
  if (diffMin < 60) return `${diffMin} min fa`;
  if (diffHours < 24) return `${diffHours} ore fa`;
  if (diffDays < 7) return `${diffDays} giorni fa`;
  return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Animations ──────────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
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

export default function SessionsPage() {
  const queryClient = useQueryClient();
  const [revoking, setRevoking] = useState<string | null>(null);

  const { data: sessions, isLoading, error } = useQuery<SessionInfo[]>({
    queryKey: ['sessions'],
    queryFn: async () => {
      const res = await api.get<SessionInfo[] | { data: SessionInfo[] }>('/auth/sessions');
      const raw = res.data;
      if (Array.isArray(raw)) return raw;
      if ('data' in raw && Array.isArray(raw.data)) return raw.data;
      return [];
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      await api.post('/auth/sessions/revoke', { sessionId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.success('Dispositivo disconnesso');
      setRevoking(null);
    },
    onError: () => {
      toast.error('Errore nella disconnessione del dispositivo');
      setRevoking(null);
    },
  });

  const revokeAllMutation = useMutation({
    mutationFn: async () => {
      const currentSession = sessions?.find(s => s.isCurrent);
      await api.post('/auth/sessions/revoke-others', {
        currentSessionId: currentSession?.id || '',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.success('Tutti gli altri dispositivi sono stati disconnessi');
    },
    onError: () => {
      toast.error('Errore nella disconnessione');
    },
  });

  const currentSession = sessions?.find(s => s.isCurrent);
  const otherSessions = sessions?.filter(s => !s.isCurrent) || [];

  return (
    <div>
      {/* Header */}
      <header className="">
        <div className="px-8 py-5">
          <h1 className="text-headline text-apple-dark dark:text-[var(--text-primary)]">Sessioni attive</h1>
          <p className="text-apple-gray dark:text-[var(--text-secondary)] text-body mt-1">
            Dispositivi collegati al tuo account
          </p>
        </div>
      </header>

      <motion.div
        className="p-8 max-w-3xl mx-auto space-y-6"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Security notice */}
        <motion.div variants={listItemVariants}>
          <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
            <Shield className="mt-0.5 h-5 w-5 shrink-0 text-apple-blue" />
            <p className="text-body text-blue-800 dark:text-blue-200">
              Se noti un dispositivo che non riconosci, disconnettilo immediatamente e cambia la password.
            </p>
          </div>
        </motion.div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-apple-blue" />
          </div>
        )}

        {/* Error state */}
        {error ? (
          <motion.div variants={listItemVariants}>
            <AppleCard hover={false}>
              <AppleCardContent>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-apple-red/40 mb-4" />
                  <p className="text-body text-apple-gray dark:text-[var(--text-secondary)]" role="alert">
                    Errore nel caricamento delle sessioni
                  </p>
                </div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        ) : null}

        {/* Current session */}
        {currentSession && (
          <motion.div variants={listItemVariants}>
            <h2 className="mb-3 text-footnote font-medium uppercase tracking-wider text-apple-gray dark:text-[var(--text-secondary)]">
              Sessione corrente
            </h2>
            <AppleCard hover={false} className="ring-2 ring-green-200 dark:ring-green-800">
              <AppleCardContent>
                <div className="flex items-center gap-4">
                  <DeviceIcon type={currentSession.deviceType} />
                  <div className="flex-1">
                    <p className="text-body font-medium text-apple-dark dark:text-[var(--text-primary)]">
                      {currentSession.deviceName}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-footnote text-apple-gray dark:text-[var(--text-secondary)]">
                      {currentSession.ipAddress && (
                        <span className="flex items-center gap-1">
                          <Globe className="h-3.5 w-3.5" />
                          {currentSession.ipAddress}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {timeAgo(currentSession.lastActiveAt)}
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold uppercase px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
                    Attiva
                  </span>
                </div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        )}

        {/* Other sessions */}
        {otherSessions.length > 0 && (
          <motion.div variants={listItemVariants}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-footnote font-medium uppercase tracking-wider text-apple-gray dark:text-[var(--text-secondary)]">
                Altri dispositivi ({otherSessions.length})
              </h2>
              <AppleButton
                variant="text"
                size="sm"
                onClick={() => revokeAllMutation.mutate()}
                disabled={revokeAllMutation.isPending}
                loading={revokeAllMutation.isPending}
                className="text-red-600 dark:text-red-400"
              >
                Disconnetti tutti
              </AppleButton>
            </div>

            <div className="space-y-3">
              {otherSessions.map(session => (
                <AppleCard key={session.id} hover={false}>
                  <AppleCardContent>
                    <div className="flex items-center gap-4">
                      <DeviceIcon type={session.deviceType} />
                      <div className="flex-1">
                        <p className="text-body font-medium text-apple-dark dark:text-[var(--text-primary)]">
                          {session.deviceName}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-footnote text-apple-gray dark:text-[var(--text-secondary)]">
                          {session.city && session.country && (
                            <span>{session.city}, {session.country}</span>
                          )}
                          {session.ipAddress && (
                            <span className="flex items-center gap-1">
                              <Globe className="h-3.5 w-3.5" />
                              {session.ipAddress}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {timeAgo(session.lastActiveAt)}
                          </span>
                        </div>
                      </div>
                      <AppleButton
                        variant="ghost"
                        size="sm"
                        icon={<LogOut className="h-4 w-4" />}
                        onClick={() => {
                          setRevoking(session.id);
                          revokeMutation.mutate(session.id);
                        }}
                        disabled={revoking === session.id}
                        loading={revoking === session.id}
                        className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-800"
                      >
                        Disconnetti
                      </AppleButton>
                    </div>
                  </AppleCardContent>
                </AppleCard>
              ))}
            </div>
          </motion.div>
        )}

        {/* Empty state */}
        {!isLoading && otherSessions.length === 0 && currentSession && (
          <motion.div variants={listItemVariants}>
            <AppleCard hover={false}>
              <AppleCardContent>
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Shield className="h-10 w-10 text-apple-green mb-3" />
                  <p className="text-body font-medium text-apple-dark dark:text-[var(--text-primary)]">
                    Nessun altro dispositivo collegato
                  </p>
                  <p className="text-footnote text-apple-gray dark:text-[var(--text-secondary)] mt-1">
                    Il tuo account e attivo solo su questo dispositivo
                  </p>
                </div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
