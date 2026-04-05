'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { AuthSplitLayout } from '@/components/auth/auth-split-layout';
import { btnPrimary } from '@/components/auth/auth-styles';

const LOCKOUT_DURATION_SECONDS = 30 * 60; // 30 minutes

function useCountdown(durationSeconds: number): { minutes: number; seconds: number; isExpired: boolean } {
  const [remaining, setRemaining] = useState(durationSeconds);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('lockout_start');
      if (stored) {
        const elapsed = Math.floor((Date.now() - parseInt(stored, 10)) / 1000);
        const left = Math.max(0, durationSeconds - elapsed);
        setRemaining(left);
      } else {
        sessionStorage.setItem('lockout_start', Date.now().toString());
      }
    }
  }, [durationSeconds]);

  useEffect(() => {
    if (remaining <= 0) return;

    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [remaining]);

  return {
    minutes: Math.floor(remaining / 60),
    seconds: remaining % 60,
    isExpired: remaining <= 0,
  };
}

export default function LockedPage(): React.ReactElement {
  const { minutes, seconds, isExpired } = useCountdown(LOCKOUT_DURATION_SECONDS);

  const formatTime = useCallback((m: number, s: number): string => {
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, []);

  return (
    <AuthSplitLayout>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="text-center space-y-6"
      >
        {/* Lock icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
          <span className="text-3xl text-[var(--text-secondary)]">⚠</span>
        </div>

        <div className="space-y-3">
          <h1 className="text-[28px] font-normal text-white tracking-tight">
            Account bloccato
          </h1>
          <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed max-w-[340px] mx-auto" role="alert">
            Il tuo account è stato temporaneamente bloccato dopo troppi tentativi di accesso
            non riusciti.
          </p>
        </div>

        {/* Countdown */}
        {!isExpired && (
          <div className="space-y-2">
            <p className="text-[13px] text-[var(--text-tertiary)]">Riprova tra</p>
            <motion.div
              key={`${minutes}:${seconds}`}
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="inline-flex items-center justify-center rounded-2xl border border-[var(--border-strong)] px-8 py-4"
            >
              <span className="text-[32px] font-semibold font-mono text-white tabular-nums">
                {formatTime(minutes, seconds)}
              </span>
            </motion.div>
          </div>
        )}

        {isExpired && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <p className="text-[15px] text-[var(--text-secondary)] font-medium">
              Il blocco è scaduto. Puoi riprovare ad accedere.
            </p>
            <Link href="/auth" className={btnPrimary}>
              Torna al login
            </Link>
          </motion.div>
        )}

        {!isExpired && (
          <div className="space-y-3 pt-2">
            <p className="text-[13px] text-[var(--text-tertiary)] leading-relaxed">
              Se pensi che si tratti di un errore, contatta il supporto tecnico o attendi che
              il blocco si esaurisca.
            </p>
            <Link
              href="/auth"
              className="inline-flex items-center gap-1 min-h-[44px] text-[14px] font-medium text-[var(--text-tertiary)] hover:text-white transition-colors"
            >
              &larr; Torna al login
            </Link>
          </div>
        )}
      </motion.div>
    </AuthSplitLayout>
  );
}
