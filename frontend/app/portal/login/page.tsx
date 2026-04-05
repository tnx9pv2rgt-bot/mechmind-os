'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Car, Eye, EyeOff, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { AppleCard, AppleCardContent } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PortalAuthService } from '@/lib/auth/portal-auth-client';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().min(1, 'Email non valida').email('Email non valida'),
  password: z.string().min(1, 'Inserisci la password'),
});

type LoginErrors = Partial<Record<keyof z.infer<typeof loginSchema>, string>>;

// ============================================
// MAIN COMPONENT
// ============================================

export default function PortalLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<LoginErrors>({});

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/portal/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const errs: LoginErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof LoginErrors;
        if (!errs[key]) errs[key] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/portal/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message || 'Credenziali non valide');
        return;
      }
      const auth = PortalAuthService.getInstance();
      auth.setAuth(data.token, data.customer);
      router.push(redirectTo);
    } catch {
      setError('Errore durante il login. Riprova.');
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
          <div className='w-20 h-20 rounded-3xl bg-gradient-to-br from-apple-blue to-apple-purple flex items-center justify-center mx-auto mb-4'>
            <Car className='h-10 w-10 text-white' />
          </div>
          <h1 className='text-2xl font-bold text-apple-dark dark:text-[var(--text-primary)]'>
            MechMind Portal
          </h1>
          <p className='text-apple-gray dark:text-[var(--text-secondary)] mt-1'>Accedi al tuo account cliente</p>
        </motion.div>

        {/* Login Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <AppleCard>
            <AppleCardContent className='p-6 sm:p-8'>
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
                {/* Email */}
                <div className='space-y-2'>
                  <Label htmlFor='email' className='text-apple-dark dark:text-[var(--text-primary)]'>
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
                      className='pl-12 h-12 rounded-xl border-apple-border dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-elevated)] text-apple-dark dark:text-[var(--text-primary)] placeholder:text-apple-gray focus:border-apple-blue focus:ring-apple-blue/20'
                    />
                  </div>
                  {fieldErrors.email && (
                    <p className='text-xs text-apple-red mt-1'>{fieldErrors.email}</p>
                  )}
                </div>

                {/* Password */}
                <div className='space-y-2'>
                  <Label htmlFor='password' className='text-apple-dark dark:text-[var(--text-primary)]'>
                    Password
                  </Label>
                  <div className='relative'>
                    <Lock className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-apple-gray' />
                    <Input
                      id='password'
                      type={showPassword ? 'text' : 'password'}
                      placeholder='••••••••'
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      autoComplete='current-password'
                      className='pl-12 pr-12 h-12 rounded-xl border-apple-border dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-elevated)] text-apple-dark dark:text-[var(--text-primary)] placeholder:text-apple-gray focus:border-apple-blue focus:ring-apple-blue/20'
                    />
                    <button
                      type='button'
                      onClick={() => setShowPassword(!showPassword)}
                      className='absolute right-4 top-1/2 -translate-y-1/2 text-apple-gray hover:text-apple-dark transition-colors p-1 min-w-[24px] min-h-[24px] flex items-center justify-center'
                      aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
                    >
                      {showPassword ? <EyeOff className='h-5 w-5' /> : <Eye className='h-5 w-5' />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className='text-xs text-apple-red mt-1'>{fieldErrors.password}</p>
                  )}
                </div>

                {/* Forgot Password */}
                <div className='flex items-center justify-between text-sm'>
                  <label className='flex items-center gap-2 cursor-pointer'>
                    <input type='checkbox' className='rounded border-apple-border' />
                    <span className='text-apple-gray dark:text-[var(--text-secondary)]'>Ricordami</span>
                  </label>
                  <Link href='/portal/reset-password' className='text-apple-blue hover:underline'>
                    Password dimenticata?
                  </Link>
                </div>

                {/* Submit Button */}
                <AppleButton
                  type='submit'
                  fullWidth
                  loading={isLoading}
                  icon={<ArrowRight className='h-4 w-4' />}
                  iconPosition='right'
                  className='h-12'
                >
                  Accedi
                </AppleButton>
              </form>

              {/* Register Link */}
              <div className='mt-6 pt-6 border-t border-apple-border/30 dark:border-[var(--border-default)]/30 text-center'>
                <p className='text-apple-gray dark:text-[var(--text-secondary)] text-sm'>
                  Non hai un account?{' '}
                  <Link
                    href='/portal/register'
                    className='text-apple-blue font-medium hover:underline'
                  >
                    Registrati
                  </Link>
                </p>
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Back to Main Site */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className='text-center mt-6'
        >
          <Link
            href='/'
            className='text-sm text-apple-gray dark:text-[var(--text-secondary)] hover:text-apple-dark dark:hover:text-[var(--text-primary)] transition-colors'
          >
            ← Torna al sito principale
          </Link>
        </motion.p>
      </div>
    </div>
  );
}
