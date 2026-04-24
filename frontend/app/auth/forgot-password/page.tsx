'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { AuthSplitLayout } from '@/components/auth/auth-split-layout';
import { btnPrimary, btnSpinner, inputStyle } from '@/components/auth/auth-styles';

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Inserisci la tua email')
    .email("Inserisci un'email valida"),
});

export default function ForgotPasswordPage(): React.ReactElement {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');

    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error("Errore durante l'invio");
      }

      setIsSuccess(true);
    } catch {
      setError("Non siamo riusciti a inviare l'email. Riprova più tardi.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <AuthSplitLayout>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="text-center space-y-5"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--surface-secondary)]/10">
            <span className="text-2xl text-[var(--text-on-brand)]">✓</span>
          </div>
          <h1 className="text-[28px] font-normal text-[var(--text-on-brand)] tracking-tight">
            Controlla la tua email
          </h1>
          <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed max-w-[320px] mx-auto">
            Se esiste un account con l&apos;email{' '}
            <strong className="text-[var(--text-on-brand)]">{email}</strong>, riceverai un link di reset.
          </p>
          <p className="text-[13px] text-[var(--text-tertiary)]">
            Se non trovi l&apos;email, controlla anche nella cartella spam.
          </p>
          <Link
            href="/auth"
            className="inline-block text-[14px] font-medium text-[var(--text-tertiary)] hover:text-[var(--text-on-brand)] transition-colors min-h-[44px] leading-[44px]"
          >
            Torna al login
          </Link>
        </motion.div>
      </AuthSplitLayout>
    );
  }

  return (
    <AuthSplitLayout showBack onBack={() => router.push('/auth')}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="space-y-5"
      >
        <div className="mb-4">
          <h1 className="text-[28px] font-normal text-[var(--text-on-brand)] tracking-tight">
            Password dimenticata?
          </h1>
          <p className="mt-2 text-[15px] text-[var(--text-secondary)] leading-relaxed">
            Inserisci la tua email e ti invieremo un link per reimpostare la password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="forgot-email" className="sr-only">Email aziendale</label>
            <input
              id="forgot-email"
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoFocus
              placeholder="Email aziendale"
              aria-describedby={error ? 'forgot-error' : undefined}
              className={`${inputStyle} ${error ? 'border-[var(--text-tertiary)]' : ''}`}
            />
            {error && (
              <motion.p
                id="forgot-error"
                role="alert"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-2 pl-5 text-[13px] text-[var(--text-secondary)]"
              >
                {error}
              </motion.p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !email}
            className={btnPrimary}
          >
            {isLoading ? <span className={btnSpinner} /> : 'Invia link di reset'}
          </button>
        </form>

        <div className="text-center">
          <p className="text-[13px] text-[var(--text-tertiary)]">
            Ricordi la password?{' '}
            <Link
              href="/auth"
              className="font-medium text-[var(--text-on-brand)] underline decoration-[var(--text-tertiary)] underline-offset-2 hover:decoration-white min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
            >
              Accedi
            </Link>
          </p>
        </div>
      </motion.div>
    </AuthSplitLayout>
  );
}
