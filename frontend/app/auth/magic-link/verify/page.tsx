'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { AuthSplitLayout } from '@/components/auth/auth-split-layout';
import { btnPrimary } from '@/components/auth/auth-styles';

function MagicLinkVerifyContent(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('Token mancante. Richiedi un nuovo link.');
      return;
    }

    const verify = async (): Promise<void> => {
      try {
        const res = await fetch('/api/auth/magic-link/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = (await res.json()) as { success?: boolean; error?: string };

        if (res.ok && data.success) {
          setStatus('success');
          setTimeout(() => {
            router.push('/dashboard');
          }, 1500);
        } else {
          setStatus('error');
          setError(data.error || 'Link non valido o scaduto');
        }
      } catch {
        setStatus('error');
        setError('Errore di rete. Riprova.');
      }
    };

    verify();
  }, [token, router]);

  return (
    <div className="text-center space-y-5">
      {status === 'verifying' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white border-t-transparent" />
          <h1 className="text-[28px] font-normal text-white tracking-tight">
            Verifica in corso...
          </h1>
          <p className="text-[15px] text-[#b4b4b4] leading-relaxed">
            Stiamo verificando il tuo link di accesso
          </p>
        </motion.div>
      )}

      {status === 'success' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-4"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
            <span className="text-2xl text-white">✓</span>
          </div>
          <h1 className="text-[28px] font-normal text-white tracking-tight">
            Accesso effettuato!
          </h1>
          <p className="text-[15px] text-[#b4b4b4] leading-relaxed">
            Reindirizzamento alla dashboard...
          </p>
        </motion.div>
      )}

      {status === 'error' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-5"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
            <span className="text-2xl text-[#b4b4b4]">✕</span>
          </div>
          <h1 className="text-[28px] font-normal text-white tracking-tight">
            Link non valido
          </h1>
          <p className="text-[15px] text-[#b4b4b4] leading-relaxed" role="alert">{error}</p>
          <button
            onClick={() => router.push('/auth')}
            className={btnPrimary}
          >
            Richiedi nuovo link
          </button>
          <Link
            href="/auth"
            className="inline-flex items-center min-h-[44px] text-[14px] font-medium text-[#888] hover:text-white transition-colors"
          >
            Torna al login
          </Link>
        </motion.div>
      )}
    </div>
  );
}

export default function MagicLinkVerifyPage(): React.ReactElement {
  return (
    <AuthSplitLayout>
      <Suspense
        fallback={
          <div className="text-center space-y-4">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white border-t-transparent" />
            <p className="text-[15px] text-[#b4b4b4]">Caricamento...</p>
          </div>
        }
      >
        <MagicLinkVerifyContent />
      </Suspense>
    </AuthSplitLayout>
  );
}
