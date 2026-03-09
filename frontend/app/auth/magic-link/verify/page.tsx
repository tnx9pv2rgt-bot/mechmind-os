'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Loader2, Shield, Mail } from 'lucide-react';
import Link from 'next/link';

export default function MagicLinkVerifyPage() {
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

    const verify = async () => {
      try {
        const res = await fetch('/api/auth/magic-link/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50/50 via-white to-purple-50/30 p-8">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full max-w-[420px]"
      >
        <div className="relative overflow-hidden rounded-[32px] bg-white/70 p-10 shadow-2xl backdrop-blur-3xl ring-1 ring-white/50">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-transparent" />

          <div className="relative text-center">
            {/* Logo */}
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30">
              <Shield className="h-8 w-8" />
            </div>

            {status === 'verifying' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-blue-500" />
                <h2 className="mb-2 text-xl font-semibold text-gray-900">Verifica in corso...</h2>
                <p className="text-sm text-gray-500">Stiamo verificando il tuo link di accesso</p>
              </motion.div>
            )}

            {status === 'success' && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-green-500" />
                <h2 className="mb-2 text-xl font-semibold text-gray-900">Accesso effettuato!</h2>
                <p className="text-sm text-gray-500">Reindirizzamento alla dashboard...</p>
              </motion.div>
            )}

            {status === 'error' && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
                <h2 className="mb-2 text-xl font-semibold text-gray-900">Link non valido</h2>
                <p className="mb-6 text-sm text-gray-500">{error}</p>
                <Link
                  href="/auth"
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-500 px-6 py-3 font-medium text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-600"
                >
                  <Mail className="h-5 w-5" />
                  Richiedi nuovo link
                </Link>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
