'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Car, Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { z } from 'zod';
import { AppleCard, AppleCardContent } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const resetPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email obbligatoria')
    .email('Inserisci un indirizzo email valido'),
});

export default function PortalResetPasswordPage(): React.ReactElement {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);

    const result = resetPasswordSchema.safeParse({ email });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/portal/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        throw new Error(data?.error?.message || 'Errore durante la richiesta');
      }

      setSuccess(true);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Errore durante la richiesta. Riprova.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-[var(--surface-tertiary)] dark:bg-[var(--surface-primary)] flex items-center justify-center p-4'>
      <div className='w-full max-w-md'>
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className='text-center mb-8'
        >
          <div className='w-20 h-20 rounded-3xl bg-gradient-to-br from-[var(--brand)] to-[var(--status-info)] flex items-center justify-center mx-auto mb-4'>
            <Car className='h-10 w-10 text-[var(--text-on-brand)]' />
          </div>
          <h1 className='text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Recupera Password</h1>
          <p className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mt-1'>
            Inserisci la tua email per ricevere il link di recupero
          </p>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <AppleCard>
            <AppleCardContent className='p-6 sm:p-8'>
              {success ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className='text-center py-4'
                >
                  <CheckCircle className='h-12 w-12 text-[var(--status-success)] mx-auto mb-4' />
                  <h2 className='text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-2'>
                    Email inviata
                  </h2>
                  <p className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] text-sm mb-6'>
                    Se l&apos;indirizzo email corrisponde a un account esistente, riceverai un link per
                    reimpostare la password.
                  </p>
                  <Link
                    href='/portal/login'
                    className='text-[var(--brand)] font-medium hover:underline text-sm'
                  >
                    Torna al login
                  </Link>
                </motion.div>
              ) : (
                <>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className='mb-6 p-4 bg-[var(--status-error-subtle)] dark:bg-[var(--status-error-subtle)] border border-[var(--status-error)]/30 dark:border-[var(--status-error)]/50 rounded-xl flex items-center gap-3'
                    >
                      <AlertCircle className='h-5 w-5 text-[var(--status-error)] flex-shrink-0' />
                      <p className='text-sm text-[var(--status-error)]'>{error}</p>
                    </motion.div>
                  )}

                  <form onSubmit={handleSubmit} className='space-y-5'>
                    <div className='space-y-2'>
                      <Label htmlFor='email' className='text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                        Email
                      </Label>
                      <div className='relative'>
                        <Mail className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-tertiary)]' />
                        <Input
                          id='email'
                          type='email'
                          placeholder='nome@email.com'
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          autoComplete='email'
                          className='pl-12 h-12 rounded-xl border-[var(--border-default)] dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] text-[var(--text-primary)] dark:text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--brand)] focus:ring-apple-blue/20'
                        />
                      </div>
                    </div>

                    <AppleButton type='submit' fullWidth loading={isLoading} className='h-12'>
                      Invia link di recupero
                    </AppleButton>
                  </form>
                </>
              )}
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Back to Login */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className='text-center mt-6'
        >
          <Link
            href='/portal/login'
            className='text-sm text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:hover:text-[var(--text-primary)] transition-colors inline-flex items-center gap-1 min-h-[44px]'
          >
            <ArrowLeft className='h-4 w-4' />
            Torna al login
          </Link>
        </motion.p>
      </div>
    </div>
  );
}
