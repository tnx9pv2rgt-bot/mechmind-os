'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { AuthSplitLayout } from '@/components/auth/auth-split-layout';
import { btnPrimary, btnSpinner, inputStyle } from '@/components/auth/auth-styles';
import { OTPInput } from '@/components/auth/otp-input';

export function MFAVerifyPageClient(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tempToken = searchParams.get('token') || '';

  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState('');

  const getToken = useCallback((): string => {
    if (tempToken) return tempToken;
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('mfa_temp_token') || '';
    }
    return '';
  }, [tempToken]);

  useEffect(() => {
    if (tempToken && typeof window !== 'undefined') {
      sessionStorage.setItem('mfa_temp_token', tempToken);
    }
  }, [tempToken]);

  const handleVerify = async (): Promise<void> => {
    const token = getToken();
    if (!token) {
      setError('Sessione scaduta. Torna al login.');
      return;
    }

    const codeToVerify = useBackupCode ? backupCode.trim() : code;
    if (!useBackupCode && codeToVerify.length !== 6) return;
    if (useBackupCode && !codeToVerify) return;

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/mfa/verify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tempToken: token,
          token: codeToVerify,
          isBackupCode: useBackupCode,
        }),
      });

      const data = (await res.json()) as {
        success?: boolean;
        error?: string | { code?: string; message?: string };
        remainingAttempts?: number;
      };

      if (res.ok && data.success) {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('mfa_temp_token');
        }
        router.push('/dashboard');
      } else {
        const errMsg = typeof data.error === 'string' ? data.error : (data.error as { message?: string })?.message;
        setError(errMsg || 'Codice non valido. Riprova.');
        if (data.remainingAttempts !== undefined) {
          setRemainingAttempts(data.remainingAttempts);
        }
        setCode('');
        setBackupCode('');
      }
    } catch {
      setError('Errore di connessione. Riprova.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!useBackupCode && code.length === 6 && !isLoading) {
      handleVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <AuthSplitLayout showBack onBack={() => router.push('/auth')}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-6"
      >
        <div className="text-center mb-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/10 mb-4">
            <span className="text-2xl text-white">🛡</span>
          </div>
          <h1 className="text-[28px] font-normal text-white tracking-tight">
            Verifica a due fattori
          </h1>
          <p className="mt-2 text-[15px] text-[var(--text-secondary)] leading-relaxed">
            {useBackupCode
              ? 'Inserisci uno dei tuoi codici di backup'
              : 'Inserisci il codice a 6 cifre dalla tua app authenticator'}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {useBackupCode ? (
            <motion.div
              key="backup"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <label htmlFor="mfa-v-backup" className="sr-only">Codice di backup</label>
              <input
                id="mfa-v-backup"
                type="text"
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value)}
                placeholder="Codice di backup"
                autoFocus
                className={inputStyle}
              />
            </motion.div>
          ) : (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <OTPInput length={6} value={code} onChange={setCode} disabled={isLoading} />
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <motion.p
            role="alert"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-[13px] text-[var(--text-secondary)]"
          >
            {error}
          </motion.p>
        )}

        {remainingAttempts !== null && remainingAttempts > 0 && (
          <p className="text-center text-[12px] text-[var(--text-tertiary)]">
            Tentativi rimanenti: {remainingAttempts}
          </p>
        )}

        {remainingAttempts === 0 && (
          <p className="text-center text-[13px] text-[var(--text-secondary)]" role="alert">
            Troppi tentativi.{' '}
            <Link href="/auth/locked" className="underline">
              Account bloccato
            </Link>
          </p>
        )}

        <button
          onClick={handleVerify}
          disabled={
            isLoading ||
            (!useBackupCode && code.length !== 6) ||
            (useBackupCode && !backupCode.trim())
          }
          className={btnPrimary}
        >
          {isLoading ? <span className={btnSpinner} /> : 'Verifica'}
        </button>

        <div className="text-center">
          <button
            onClick={() => {
              setUseBackupCode(!useBackupCode);
              setError('');
              setCode('');
              setBackupCode('');
            }}
            className="text-[14px] font-medium text-[var(--text-tertiary)] hover:text-white transition-colors min-h-[44px]"
          >
            {useBackupCode ? 'Usa codice authenticator' : 'Usa codice di backup'}
          </button>
        </div>
      </motion.div>
    </AuthSplitLayout>
  );
}
