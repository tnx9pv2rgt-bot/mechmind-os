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
    <div className='min-h-screen bg-[#f5f5f7] dark:bg-[#212121] flex items-center justify-center p-4'>
      <div className='w-full max-w-md'>
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className='text-center mb-8'
        >
          <div className='w-20 h-20 rounded-3xl bg-gradient-to-br from-apple-blue to-apple-purple flex items-center justify-center mx-auto mb-4'>
            <Car className='h-10 w-10 text-white' />
          </div>
          <h1 className='text-2xl font-bold text-apple-dark dark:text-[#ececec]'>Recupera Password</h1>
          <p className='text-apple-gray dark:text-[#636366] mt-1'>
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
                  <CheckCircle className='h-12 w-12 text-green-500 mx-auto mb-4' />
                  <h2 className='text-lg font-semibold text-apple-dark dark:text-[#ececec] mb-2'>
                    Email inviata
                  </h2>
                  <p className='text-apple-gray dark:text-[#636366] text-sm mb-6'>
                    Se l&apos;indirizzo email corrisponde a un account esistente, riceverai un link per
                    reimpostare la password.
                  </p>
                  <Link
                    href='/portal/login'
                    className='text-apple-blue font-medium hover:underline text-sm'
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
                      className='mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl flex items-center gap-3'
                    >
                      <AlertCircle className='h-5 w-5 text-apple-red flex-shrink-0' />
                      <p className='text-sm text-apple-red'>{error}</p>
                    </motion.div>
                  )}

                  <form onSubmit={handleSubmit} className='space-y-5'>
                    <div className='space-y-2'>
                      <Label htmlFor='email' className='text-apple-dark dark:text-[#ececec]'>
                        Email
                      </Label>
                      <div className='relative'>
                        <Mail className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-apple-gray' />
                        <Input
                          id='email'
                          type='email'
                          placeholder='nome@email.com'
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          autoComplete='email'
                          className='pl-12 h-12 rounded-xl border-apple-border dark:border-[#424242] bg-white dark:bg-[#2f2f2f] text-apple-dark dark:text-[#ececec] placeholder:text-apple-gray focus:border-apple-blue focus:ring-apple-blue/20'
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
            className='text-sm text-apple-gray dark:text-[#636366] hover:text-apple-dark dark:hover:text-[#ececec] transition-colors inline-flex items-center gap-1 min-h-[44px]'
          >
            <ArrowLeft className='h-4 w-4' />
            Torna al login
          </Link>
        </motion.p>
      </div>
    </div>
  );
}
