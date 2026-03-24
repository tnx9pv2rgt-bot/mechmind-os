'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import {
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  Clock,
  Shield,
  LogOut,
  ChevronLeft,
} from 'lucide-react';
import Link from 'next/link';

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

function DeviceIcon({ type }: { type: string }) {
  switch (type) {
    case 'phone':
      return <Smartphone className="h-8 w-8 text-blue-500 dark:text-blue-400" />;
    case 'tablet':
      return <Tablet className="h-8 w-8 text-purple-500 dark:text-purple-400" />;
    default:
      return <Monitor className="h-8 w-8 text-gray-600 dark:text-gray-300" />;
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
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/settings"
          className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Sessioni attive
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Dispositivi collegati al tuo account
          </p>
        </div>
      </div>

      {/* Security notice */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <Shield className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
        <p className="text-sm text-blue-800 dark:text-blue-200">
          Se noti un dispositivo che non riconosci, disconnettilo immediatamente e cambia la password.
        </p>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      )}

      {/* Error state */}
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-800 dark:text-red-200" role="alert">
            Errore nel caricamento delle sessioni
          </p>
        </div>
      ) : null}

      {/* Current session */}
      {currentSession && (
        <div>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Sessione corrente
          </h2>
          <div className="rounded-xl border-2 border-green-200 bg-white p-5 dark:border-green-800 dark:bg-gray-900">
            <div className="flex items-center gap-4">
              <DeviceIcon type={currentSession.deviceType} />
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">
                  {currentSession.deviceName}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
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
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
                Attiva
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Other sessions */}
      {otherSessions.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Altri dispositivi ({otherSessions.length})
            </h2>
            <button
              onClick={() => revokeAllMutation.mutate()}
              disabled={revokeAllMutation.isPending}
              className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50 dark:text-red-400"
            >
              {revokeAllMutation.isPending ? 'Disconnettendo...' : 'Disconnetti tutti'}
            </button>
          </div>

          <div className="space-y-3">
            {otherSessions.map(session => (
              <div
                key={session.id}
                className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900"
              >
                <DeviceIcon type={session.deviceType} />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {session.deviceName}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
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
                <button
                  onClick={() => {
                    setRevoking(session.id);
                    revokeMutation.mutate(session.id);
                  }}
                  disabled={revoking === session.id}
                  className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <LogOut className="h-4 w-4" />
                  {revoking === session.id ? 'Disconnetto...' : 'Disconnetti'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && otherSessions.length === 0 && currentSession && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800">
          <Shield className="mx-auto h-10 w-10 text-green-500" />
          <p className="mt-3 font-medium text-gray-900 dark:text-white">
            Nessun altro dispositivo collegato
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Il tuo account è attivo solo su questo dispositivo
          </p>
        </div>
      )}
    </div>
  );
}
