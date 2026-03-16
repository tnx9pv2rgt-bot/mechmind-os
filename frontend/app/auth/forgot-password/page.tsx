'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [focused, setFocused] = useState(false);

  const hasValue = email.length > 0;
  const isFloating = focused || hasValue;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!email) {
      setError('Inserisci la tua email');
      setIsLoading(false);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Inserisci un'email valida");
      setIsLoading(false);
      return;
    }

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

  return (
    <div className='flex min-h-screen w-full flex-col bg-[#f4f4f4] dark:bg-[#212121] overflow-hidden'>
      {/* Header */}
      <header className='relative flex items-center justify-center px-6 pt-6 pb-2'>
        <Link
          href='/auth'
          className='absolute left-6 text-[15px] font-medium text-[#0d0d0d] dark:text-[#ececec] hover:opacity-50 transition-opacity'
        >
          &larr; Indietro
        </Link>
        <span className='text-[15px] font-semibold text-[#0d0d0d] dark:text-[#ececec]'>
          MechMind OS
        </span>
      </header>

      {/* Content */}
      <main className='flex flex-1 flex-col items-center justify-center px-6 pb-12'>
        <div className='w-full max-w-[440px]'>
          {isSuccess ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className='text-center space-y-5'
            >
              <div className='inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#0d0d0d] dark:bg-[#ececec]'>
                <CheckCircle2 className='h-7 w-7 text-white dark:text-[#0d0d0d]' />
              </div>
              <h1 className='text-[28px] font-bold text-[#0d0d0d] dark:text-[#ececec] tracking-tight'>
                Controlla la tua email
              </h1>
              <p className='text-[15px] text-[#636366] dark:text-[#636366] leading-relaxed max-w-[320px] mx-auto'>
                Abbiamo inviato un link di reset a{' '}
                <strong className='text-[#0d0d0d] dark:text-[#ececec]'>{email}</strong>
              </p>
              <p className='text-[13px] text-[#636366]'>
                Se non trovi l&apos;email, controlla anche nella cartella spam.
              </p>
              <Link
                href='/auth'
                className='inline-block text-[14px] font-medium text-[#636366] dark:text-[#636366] hover:text-[#0d0d0d] dark:hover:text-[#ececec] transition-colors'
              >
                Torna al login
              </Link>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className='space-y-5'
            >
              <div className='text-center mb-6'>
                <h1 className='text-[28px] font-bold text-[#0d0d0d] dark:text-[#ececec] tracking-tight'>
                  Password dimenticata?
                </h1>
                <p className='mt-2 text-[15px] text-[#636366] dark:text-[#636366] leading-relaxed'>
                  Inserisci la tua email e ti invieremo un link per reimpostare la password.
                </p>
              </div>

              <form onSubmit={handleSubmit} className='space-y-5'>
                {/* Email input — same FloatingInput style as login */}
                <div className='w-full'>
                  <div
                    className={`relative rounded-2xl border transition-colors duration-200 ${
                      error
                        ? 'border-red-500 dark:border-red-400'
                        : focused
                          ? 'border-[#0d0d0d] dark:border-[#ececec]'
                          : 'border-[#e5e5e5] dark:border-[#424242]'
                    }`}
                  >
                    <label
                      htmlFor='forgotPasswordEmail'
                      className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        isFloating
                          ? 'top-2 text-[11px] font-medium'
                          : 'top-1/2 -translate-y-1/2 text-[15px]'
                      } ${
                        error
                          ? 'text-red-500 dark:text-red-400'
                          : focused
                            ? 'text-[#0d0d0d] dark:text-[#ececec]'
                            : 'text-[#636366] dark:text-[#636366]'
                      }`}
                    >
                      Indirizzo e-mail
                    </label>
                    <input
                      id='forgotPasswordEmail'
                      type='email'
                      name='email'
                      autoComplete='email'
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      onFocus={() => setFocused(true)}
                      onBlur={() => setFocused(false)}
                      autoFocus
                      className='w-full bg-transparent rounded-2xl px-4 pt-6 pb-2 text-[15px] text-[#0d0d0d] dark:text-[#ececec] focus:outline-none'
                    />
                  </div>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className='mt-2 flex items-center gap-1.5 text-[13px] text-red-600 dark:text-red-400'
                    >
                      <AlertCircle className='h-3.5 w-3.5 shrink-0' /> {error}
                    </motion.p>
                  )}
                </div>

                <button
                  type='submit'
                  disabled={isLoading || !email}
                  className='flex w-full items-center justify-center rounded-full bg-[#0d0d0d] dark:bg-[#ececec] text-white dark:text-[#0d0d0d] h-[56px] text-[15px] font-semibold hover:bg-[#2f2f2f] dark:hover:bg-[#d9d9d9] active:bg-[#424242] dark:active:bg-[#c0c0c0] transition-colors disabled:opacity-30 disabled:cursor-not-allowed'
                >
                  {isLoading ? <Loader2 className='h-5 w-5 animate-spin' /> : 'Invia link di reset'}
                </button>
              </form>

              <div className='text-center'>
                <p className='text-[13px] text-[#636366]'>
                  Ricordi la password?{' '}
                  <Link
                    href='/auth'
                    className='font-medium text-[#0d0d0d] dark:text-[#ececec] hover:opacity-50 transition-opacity'
                  >
                    Accedi
                  </Link>
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className='flex items-center justify-center gap-3 px-6 pb-6 pt-2'>
        <Link
          href='/terms'
          className='text-[13px] text-[#6b6b6b] dark:text-[#6e6e6e] hover:text-[#0d0d0d] dark:hover:text-[#ececec] transition-colors'
        >
          Condizioni d&apos;uso
        </Link>
        <span className='text-[#d9d9d9] dark:text-[#424242]'>|</span>
        <Link
          href='/privacy'
          className='text-[13px] text-[#6b6b6b] dark:text-[#6e6e6e] hover:text-[#0d0d0d] dark:hover:text-[#ececec] transition-colors'
        >
          Informativa sulla privacy
        </Link>
      </footer>
    </div>
  );
}
