'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { AuthSplitLayout } from '@/components/auth/auth-split-layout';
import { btnPrimary, btnSpinner } from '@/components/auth/auth-styles';

function VerifyEmailContent(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('Token di verifica mancante.');
      return;
    }

    const verify = async (): Promise<void> => {
      try {
        const res = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = (await res.json()) as { success?: boolean; error?: string; email?: string };

        if (res.ok && data.success) {
          setStatus('success');
          if (data.email) setEmail(data.email);
          setTimeout(() => {
            router.push('/auth');
          }, 3000);
        } else {
          setStatus('error');
          setError(data.error || 'Link di verifica non valido o scaduto.');
        }
      } catch {
        setStatus('error');
        setError('Errore di rete. Riprova.');
      }
    };

    verify();
  }, [token, router]);

  const handleResend = async (): Promise<void> => {
    setIsResending(true);
    setResendSuccess(false);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setResendSuccess(true);
      } else {
        setError('Impossibile reinviare l\'email. Riprova.');
      }
    } catch {
      setError('Errore di rete. Riprova.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="text-center space-y-5">
      {status === 'verifying' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white border-t-transparent" />
          <h1 className="text-[28px] font-normal text-white tracking-tight">
            Verifica in corso...
          </h1>
          <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed">
            Stiamo verificando il tuo indirizzo email
          </p>
        </motion.div>
      )}

      {status === 'success' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-5"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
            <span className="text-2xl text-white">✓</span>
          </div>
          <h1 className="text-[28px] font-normal text-white tracking-tight">
            Email verificata!
          </h1>
          <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed">
            Il tuo indirizzo email è stato verificato con successo.
            <br />
            Verrai reindirizzato al login...
          </p>
          <Link href="/auth" className={btnPrimary}>
            Vai al login
          </Link>
        </motion.div>
      )}

      {status === 'error' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-5"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
            <span className="text-2xl text-[var(--text-secondary)]">✕</span>
          </div>
          <h1 className="text-[28px] font-normal text-white tracking-tight">
            Verifica non riuscita
          </h1>
          <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed max-w-[320px] mx-auto" role="alert">
            {error}
          </p>

          {resendSuccess ? (
            <p className="text-[14px] text-[var(--text-secondary)] font-medium">
              Email di verifica reinviata con successo!
            </p>
          ) : (
            <button
              onClick={handleResend}
              disabled={isResending}
              className={btnPrimary}
            >
              {isResending ? <span className={btnSpinner} /> : 'Reinvia email di verifica'}
            </button>
          )}

          <Link
            href="/auth"
            className="inline-flex items-center min-h-[44px] text-[14px] font-medium text-[var(--text-tertiary)] hover:text-white transition-colors"
          >
            Torna al login
          </Link>
        </motion.div>
      )}
    </div>
  );
}

export default function VerifyEmailPage(): React.ReactElement {
  return (
    <AuthSplitLayout>
      <Suspense
        fallback={
          <div className="text-center space-y-4">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white border-t-transparent" />
            <p className="text-[15px] text-[var(--text-secondary)]">Caricamento...</p>
          </div>
        }
      >
        <VerifyEmailContent />
      </Suspense>
    </AuthSplitLayout>
  );
}
