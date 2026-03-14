'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import styles from '@/app/auth/auth.module.css';

import { LiquidGlassCard, AuthCard } from './LiquidGlassCard';
import { PasskeyButton, AuthMethodSelector, PasskeyRegistrationButton } from './passkey-button';
import { SignInWithApple } from './SignInWithApple';
import { usePasskey } from '@/hooks/usePasskey';

// ============================================
// TYPES
// ============================================

type AuthStep = 'method' | 'credentials' | 'passkey-setup' | 'mfa';
type AuthMethod = 'passkey' | 'password' | null;

interface ClientAuthFlowProps {
  onSuccess?: (user: unknown) => void;
  onError?: (error: string) => void;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ClientAuthFlow({ onSuccess, onError }: ClientAuthFlowProps) {
  const [step, setStep] = useState<AuthStep>('method');
  const [method, setMethod] = useState<AuthMethod>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Passkey hook per autenticazione
  const {
    isSupported: isPasskeySupported,
    isPlatformAvailable,
    authenticate,
  } = usePasskey({
    onSuccess: data => {
      onSuccess?.(data.user);
    },
    onError: err => {
      setError(err);
      onError?.(err);
    },
  });

  // ============================================
  // HANDLERS
  // ============================================

  const handleMethodSelect = (selectedMethod: AuthMethod) => {
    setMethod(selectedMethod);
    setError(null);

    if (selectedMethod === 'passkey') {
      // Prova passkey direttamente
      tryPasskeyAuth();
    } else {
      setStep('credentials');
    }
  };

  const tryPasskeyAuth = async () => {
    setIsLoading(true);
    try {
      const success = await authenticate();
      if (!success) {
        // Fallback a password
        setMethod('password');
        setStep('credentials');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Simula chiamata API
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Successo - mostra setup passkey (opzionale)
      if (isPasskeySupported) {
        setStep('passkey-setup');
      } else {
        onSuccess?.({ email });
      }
    } catch (err) {
      setError('Credenziali non valide');
      onError?.('Credenziali non valide');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasskeySetupComplete = () => {
    onSuccess?.({ email });
  };

  const handleSkipPasskeySetup = () => {
    onSuccess?.({ email });
  };

  // ============================================
  // RENDER STEPS
  // ============================================

  const renderStep = () => {
    switch (step) {
      case 'method':
        return (
          <AuthMethodSelector
            title='Come vuoi accedere?'
            subtitle='Scegli il metodo più comodo per te'
            onPasswordSelect={() => handleMethodSelect('password')}
            onPasskeySelect={() => handleMethodSelect('passkey')}
            onSuccess={data => onSuccess?.(data.user)}
            onError={err => {
              setError(err);
              // Fallback a password
              setMethod('password');
              setStep('credentials');
            }}
          />
        );

      case 'credentials':
        return (
          <motion.form
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onSubmit={handlePasswordSubmit}
            className='space-y-5'
          >
            {/* Back button */}
            <button
              type='button'
              onClick={() => setStep('method')}
              className='text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4'
            >
              ← Torna indietro
            </button>

            {/* Email */}
            <div className={styles.formGroup}>
              <label className='sr-only' htmlFor='email'>
                Email
              </label>
              <div className={styles.inputWrapper}>
                <Mail className={cn(styles.inputIcon, 'left-4')} />
                <input
                  id='email'
                  type='email'
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder='nome@esempio.com'
                  required
                  autoComplete='email'
                  className={cn(styles.input, styles.inputWithIcon)}
                />
              </div>
            </div>

            {/* Password */}
            <div className={styles.formGroup}>
              <label className='sr-only' htmlFor='password'>
                Password
              </label>
              <div className={styles.inputWrapper}>
                <Lock className={cn(styles.inputIcon, 'left-4')} />
                <input
                  id='password'
                  type='password'
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder='La tua password'
                  required
                  autoComplete='current-password'
                  className={cn(styles.input, styles.inputWithIcon)}
                />
              </div>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className='p-3 rounded-xl bg-red-50 text-red-600 text-sm text-center'
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.button
              type='submit'
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                styles.button,
                styles.buttonFull,
                'flex items-center justify-center gap-2'
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className='w-5 h-5 animate-spin' />
                  <span>Accesso...</span>
                </>
              ) : (
                <>
                  <span>Accedi</span>
                  <ArrowRight className='w-5 h-5' />
                </>
              )}
            </motion.button>

            {/* Divider */}
            <div className={styles.divider}>
              <span>o</span>
            </div>

            {/* Apple Sign In */}
            <SignInWithApple
              onClick={() => window.location.assign('/api/auth/oauth/apple')}
              className={styles.buttonFull}
            />

            {/* Passkey fallback (se disponibile) */}
            {isPasskeySupported && (
              <PasskeyButton
                variant='secondary'
                fullWidth
                onSuccess={data => onSuccess?.(data.user)}
                onError={err => console.error('Passkey error:', err)}
              />
            )}
          </motion.form>
        );

      case 'passkey-setup':
        return (
          <PasskeyRegistrationButton
            userId={email}
            email={email}
            onSkip={handleSkipPasskeySetup}
            onRegisterSuccess={handlePasskeySetupComplete}
          />
        );

      default:
        return null;
    }
  };

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <div className={styles.authContainer}>
      {/* Animated background */}
      <div className='absolute inset-0 overflow-hidden'>
        <div className='absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse' />
        <div
          className='absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-cyan-400/20 to-blue-400/20 rounded-full blur-3xl animate-pulse'
          style={{ animationDelay: '1s' }}
        />
      </div>

      {/* Main Card */}
      <AuthCard className='relative z-10 w-full max-w-[420px]'>
        {/* Logo/Header */}
        <div className='text-center mb-8'>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
            className='w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25'
          >
            <svg
              viewBox='0 0 24 24'
              className='w-8 h-8 text-white'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
            >
              <path d='M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' />
            </svg>
          </motion.div>
          <h1 className={styles.authTitle}>MechMind</h1>
          <p className={styles.authSubtitle}>Gestionale officina intelligente</p>
        </div>

        {/* Step Content */}
        <AnimatePresence mode='wait'>
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <div className='mt-8 text-center'>
          <p className='text-xs text-gray-400'>Protetto da crittografia end-to-end</p>
        </div>
      </AuthCard>
    </div>
  );
}

// ============================================
// SIMPLIFIED CLIENT LOGIN COMPONENT
// ============================================

export function ClientLoginForm({ onSuccess }: { onSuccess?: (user: unknown) => void }) {
  const [isPasskeyFallback, setIsPasskeyFallback] = useState(false);

  return (
    <div className={styles.authContainer}>
      <AuthCard className='w-full max-w-[420px]'>
        {/* Header */}
        <div className='text-center mb-8'>
          <h1 className={styles.authTitle}>Bentornato</h1>
          <p className={styles.authSubtitle}>Accedi al tuo account</p>
        </div>

        {/* Passkey First */}
        {!isPasskeyFallback ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className='space-y-4'>
            <PasskeyButton
              fullWidth
              label='Accedi con biometria'
              onSuccess={data => onSuccess?.(data.user)}
              onError={() => setIsPasskeyFallback(true)}
              onUnsupported={() => setIsPasskeyFallback(true)}
            />

            <button
              onClick={() => setIsPasskeyFallback(true)}
              className='w-full text-sm text-gray-500 hover:text-gray-700 py-2'
            >
              Usa email e password
            </button>
          </motion.div>
        ) : (
          <motion.form initial={{ opacity: 0 }} animate={{ opacity: 1 }} className='space-y-4'>
            {/* Email/Password form qui */}
            <p className='text-sm text-gray-600 text-center'>Inserisci le tue credenziali</p>

            <button
              type='button'
              onClick={() => setIsPasskeyFallback(false)}
              className='w-full text-sm text-blue-500 hover:text-blue-700'
            >
              ← Torna ai passkey
            </button>
          </motion.form>
        )}
      </AuthCard>
    </div>
  );
}

// ============================================
// EXPORTS
// ============================================

export default ClientAuthFlow;
