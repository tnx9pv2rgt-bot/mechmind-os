'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { AuthSplitLayout } from '@/components/auth/auth-split-layout';
import { btnPrimary } from '@/components/auth/auth-styles';

function decodeErrorMessage(error: string): string {
  const messages: Record<string, string> = {
    access_denied: 'Accesso negato. Hai annullato il processo di autenticazione.',
    invalid_scope: 'Permessi richiesti non validi.',
    server_error: 'Errore del server di autenticazione.',
    temporarily_unavailable: 'Il servizio è temporaneamente non disponibile.',
  };
  return messages[error] || `Errore durante l'autenticazione: ${error}`;
}

function OAuthCallbackContent(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const provider = searchParams.get('provider') || 'oauth';
  const errorParam = searchParams.get('error');

  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    if (errorParam) {
      setStatus('error');
      setError(decodeErrorMessage(errorParam));
      return;
    }

    if (!code) {
      setStatus('error');
      setError('Codice di autorizzazione mancante.');
      return;
    }

    const exchange = async (): Promise<void> => {
      try {
        const res = await fetch('/api/auth/oauth/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, state, provider }),
        });

        const data = (await res.json()) as { success?: boolean; error?: string };

        if (res.ok && data.success) {
          router.push('/dashboard');
        } else {
          setStatus('error');
          setError(data.error || 'Errore durante il completamento dell\'accesso.');
        }
      } catch {
        setStatus('error');
        setError('Errore di rete. Riprova.');
      }
    };

    exchange();
  }, [code, state, provider, errorParam, router]);

  return (
    <div className="text-center space-y-5">
      {status === 'loading' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[var(--border-default)] border-t-transparent" />
          <h1 className="text-[28px] font-normal text-[var(--text-on-brand)] tracking-tight">
            Completamento accesso...
          </h1>
          <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed">
            Stiamo completando il tuo accesso. Un momento...
          </p>
        </motion.div>
      )}

      {status === 'error' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-5"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--surface-secondary)]/10">
            <span className="text-2xl text-[var(--text-secondary)]">✕</span>
          </div>
          <h1 className="text-[28px] font-normal text-[var(--text-on-brand)] tracking-tight">
            Accesso non riuscito
          </h1>
          <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed max-w-[320px] mx-auto" role="alert">
            {error}
          </p>
          <Link href="/auth" className={btnPrimary}>
            Torna al login
          </Link>
        </motion.div>
      )}
    </div>
  );
}

export default function OAuthCallbackPage(): React.ReactElement {
  return (
    <AuthSplitLayout>
      <Suspense
        fallback={
          <div className="text-center space-y-4">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[var(--border-default)] border-t-transparent" />
            <p className="text-[15px] text-[var(--text-secondary)]">Caricamento...</p>
          </div>
        }
      >
        <OAuthCallbackContent />
      </Suspense>
    </AuthSplitLayout>
  );
}
