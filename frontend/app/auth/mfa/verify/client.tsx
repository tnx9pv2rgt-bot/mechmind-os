'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Key, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

// Background animato stile Apple
function AnimatedBackground() {
  return (
    <div className='fixed inset-0 overflow-hidden -z-10'>
      <div className='absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-[#212121] dark:via-[#212121] dark:to-[#212121]' />
      <motion.div
        className='absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-blue-200/40 to-purple-200/40 blur-[100px]'
        animate={{
          x: [0, 50, 0],
          y: [0, 30, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className='absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-indigo-200/30 to-pink-200/30 blur-[90px]'
        animate={{
          x: [0, -30, 0],
          y: [0, -50, 0],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <div className='absolute inset-0 backdrop-blur-[1px]' />
    </div>
  );
}

// Liquid Glass Card
function LiquidGlassCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
        duration: 0.5,
      }}
      className={cn(
        'relative w-full max-w-md overflow-hidden rounded-3xl',
        'bg-white/70 dark:bg-[#2f2f2f]/70 backdrop-blur-3xl',
        'border border-white/50 dark:border-[#424242]/50',
        'shadow-2xl shadow-black/5',
        'ring-1 ring-white/50 dark:ring-[#424242]/50',
        className
      )}
    >
      <div className='absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-white/30 pointer-events-none' />
      <div className='relative z-10 p-8 sm:p-10'>{children}</div>
    </motion.div>
  );
}

export function MFAVerifyPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    setIsLoading(true);
    setError('');

    try {
      const tempToken = searchParams.get('token');
      const res = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken, token: code }),
      });

      const data = (await res.json()) as {
        success?: boolean;
        error?: string | { code?: string; message?: string };
      };

      if (data.success) {
        router.push('/dashboard');
      } else {
        const errMsg = typeof data.error === 'string' ? data.error : data.error?.message;
        setError(errMsg || 'Codice non valido. Riprova.');
      }
    } catch (e) {
      setError('Errore di connessione. Riprova.');
    }

    setIsLoading(false);
  };

  return (
    <div className='min-h-screen flex flex-col items-center justify-center p-4 relative'>
      <AnimatedBackground />

      <LiquidGlassCard>
        <div className='space-y-6'>
          <div className='text-center space-y-2'>
            <div className='inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 mb-4'>
              <Shield className='h-8 w-8 text-white' />
            </div>
            <h1 className='text-2xl font-semibold text-gray-900 dark:text-[#ececec]'>
              Verifica 2FA
            </h1>
            <p className='text-gray-500 dark:text-[#636366]'>
              Inserisci il codice generato dalla tua app authenticator
            </p>
          </div>

          <div className='flex items-center gap-4 p-4 rounded-2xl bg-white/40 dark:bg-[#353535]/40 border border-white/60 dark:border-[#424242]/60'>
            <div className='w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center'>
              <Key className='h-6 w-6 text-blue-600' />
            </div>
            <div>
              <p className='font-medium text-gray-900 dark:text-[#ececec]'>Codice di verifica</p>
              <p className='text-sm text-gray-500 dark:text-[#636366]'>
                Apri l&apos;app authenticator e inserisci il codice
              </p>
            </div>
          </div>

          <div className='relative'>
            <Input
              placeholder='000000'
              value={code}
              onChange={e => setCode(e.target.value)}
              maxLength={6}
              className={cn(
                'h-16 w-full rounded-2xl border-0 bg-white/60 dark:bg-[#353535]/60 text-center',
                'text-3xl font-semibold tracking-[0.5em] text-gray-900 dark:text-[#ececec]',
                'placeholder:text-gray-300 dark:placeholder:text-[#6e6e6e] placeholder:tracking-normal',
                'focus:bg-white dark:focus:bg-[#2f2f2f] focus:ring-2 focus:ring-blue-500/20',
                'transition-all duration-200',
                'shadow-sm'
              )}
            />
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className='text-red-500 text-sm text-center'
            >
              {error}
            </motion.p>
          )}

          <Button
            onClick={handleVerify}
            disabled={isLoading || code.length !== 6}
            className='w-full h-14 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium shadow-lg shadow-blue-500/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {isLoading ? 'Verifica...' : 'Verifica'}
          </Button>

          <Button
            variant='ghost'
            onClick={() => router.push('/auth')}
            className='w-full rounded-xl text-gray-500 dark:text-[#636366] hover:text-gray-700 dark:hover:text-[#ececec] hover:bg-white/40 dark:bg-[#353535]/40'
          >
            <ArrowLeft className='h-4 w-4 mr-2' />
            Torna al login
          </Button>
        </div>
      </LiquidGlassCard>
    </div>
  );
}
