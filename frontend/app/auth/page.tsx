'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, Fingerprint } from 'lucide-react';
import Script from 'next/script';
import {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

function extractErrorMessage(data: Record<string, unknown>, fallback: string): string {
  if (typeof data.message === 'string' && data.message) return data.message;
  if (data.error && typeof data.error === 'object' && 'message' in data.error) {
    const msg = (data.error as { message?: string }).message;
    if (msg) return msg;
  }
  return fallback;
}

// =============================================================================
// Types
// =============================================================================
type Step = 'methods' | 'email' | 'password' | 'magic-sent' | 'passkey-prompt';

interface ExpandRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

// =============================================================================
// iOS spring curve — fast out, gentle settle
// =============================================================================
const iosSpring = { type: 'spring' as const, damping: 28, stiffness: 300, mass: 0.8 };

// =============================================================================
// Primary Button — black pill
// =============================================================================
function PrimaryButton({
  children,
  onClick,
  isLoading,
  disabled,
  type = 'button',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className='flex w-full items-center justify-center rounded-full bg-[#0d0d0d] dark:bg-[#ececec] text-white dark:text-[#0d0d0d] h-[40px] text-[15px] font-semibold hover:bg-[#2f2f2f] dark:hover:bg-[#d9d9d9] active:bg-[#424242] dark:active:bg-[#c0c0c0] transition-colors disabled:opacity-30 disabled:cursor-not-allowed'
    >
      {isLoading ? <Loader2 className='h-5 w-5 animate-spin' /> : children}
    </button>
  );
}

// =============================================================================
// Input — outlined, floating label style
// =============================================================================
function FloatingInput({
  label,
  type = 'text',
  value,
  onChange,
  error,
  autoFocus,
  name,
  autoComplete,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  autoFocus?: boolean;
  name?: string;
  autoComplete?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;
  const hasValue = value.length > 0;
  const isFloating = focused || hasValue;

  return (
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
          className={`absolute left-4 transition-all duration-200 pointer-events-none ${
            isFloating ? 'top-2 text-[11px] font-medium' : 'top-1/2 -translate-y-1/2 text-[15px]'
          } ${
            error
              ? 'text-red-500 dark:text-red-400'
              : focused
                ? 'text-[#0d0d0d] dark:text-[#ececec]'
                : 'text-[#636366] dark:text-[#636366]'
          }`}
        >
          {label}
        </label>
        <input
          type={inputType}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoFocus={autoFocus}
          name={name}
          autoComplete={autoComplete}
          className={`w-full h-[40px] bg-transparent rounded-2xl px-4 pt-4 pb-1 text-[15px] text-[#0d0d0d] dark:text-[#ececec] focus:outline-none ${
            isPassword ? 'pr-12' : ''
          }`}
        />
        {isPassword && (
          <button
            type='button'
            onClick={() => setShowPassword(!showPassword)}
            className='absolute right-4 top-1/2 -translate-y-1/2 text-[#636366] hover:text-[#0d0d0d] dark:hover:text-[#ececec] transition-colors'
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className='h-5 w-5' /> : <Eye className='h-5 w-5' />}
          </button>
        )}
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
  );
}

// =============================================================================
// Google One Tap handler
// =============================================================================
function GoogleOneTap({ onSuccess }: { onSuccess: (credential: string) => void }) {
  const [gsiReady, setGsiReady] = useState(false);
  const [gsiError, setGsiError] = useState(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || typeof window === 'undefined') return;
    (window as unknown as Record<string, unknown>).__handleGoogleSignIn = (response: {
      credential: string;
    }) => {
      onSuccess(response.credential);
    };
    const originalError = console.error;
    const gsiErrorHandler = (...args: unknown[]) => {
      const msg = args.map(String).join(' ');
      if (msg.includes('GSI_LOGGER') && msg.includes('origin is not allowed')) setGsiError(true);
      originalError.apply(console, args);
    };
    console.error = gsiErrorHandler;
    if ((window as unknown as Record<string, unknown>).google) setGsiReady(true);
    return () => {
      console.error = originalError;
    };
  }, [onSuccess]);

  useEffect(() => {
    if (!gsiReady || !GOOGLE_CLIENT_ID || gsiError) return;
    try {
      const google = (window as unknown as Record<string, unknown>).google as {
        accounts: { id: { initialize: (c: Record<string, unknown>) => void; prompt: () => void } };
      };
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (window as unknown as Record<string, unknown>).__handleGoogleSignIn,
        auto_select: false,
      });
    } catch {
      setGsiError(true);
    }
  }, [gsiReady, gsiError]);

  if (!GOOGLE_CLIENT_ID || gsiError) return null;

  return (
    <Script
      src='https://accounts.google.com/gsi/client'
      strategy='afterInteractive'
      onLoad={() => setGsiReady(true)}
      onError={() => setGsiError(true)}
    />
  );
}

// =============================================================================
// Main Page
// =============================================================================
export default function AuthPage() {
  const [step, setStep] = useState<Step>('methods');
  const [tenantSlug, setTenantSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [coldStartHint, setColdStartHint] = useState(false);
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();

  // Redirect target from query param
  const getRedirectTo = (): string => {
    if (typeof window === 'undefined') return '/dashboard';
    const params = new URLSearchParams(window.location.search);
    return params.get('redirect') || '/dashboard';
  };

  // --- Expand animation state ---
  const [expandRect, setExpandRect] = useState<ExpandRect | null>(null);
  const [expanding, setExpanding] = useState(false);
  const [showContent, setShowContent] = useState(true);
  const [pendingStep, setPendingStep] = useState<Step | null>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // --- iOS-style expand transition ---
  const handleMethodClick = (key: string, nextStep: Step | 'register' | 'demo') => {
    const btn = buttonRefs.current[key];
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    setExpandRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    setShowContent(false);
    setExpanding(true);

    if (nextStep === 'register') {
      setTimeout(() => router.push('/auth/register'), 450);
    } else if (nextStep === 'demo') {
      setTimeout(() => router.push('/demo'), 450);
    } else {
      setPendingStep(nextStep);
    }
  };

  const handleExpandComplete = () => {
    if (!pendingStep) return;
    setError('');
    setStep(pendingStep);
    setPendingStep(null);
    // Small delay then reveal content and hide overlay
    setTimeout(() => {
      setShowContent(true);
      setExpanding(false);
      setExpandRect(null);
    }, 50);
  };

  // --- Back with reverse animation ---
  const handleBack = () => {
    setError('');
    if (step === 'password') setStep('email');
    else if (step === 'email') {
      setShowContent(false);
      setTimeout(() => {
        setStep('methods');
        setTimeout(() => setShowContent(true), 50);
      }, 200);
    }
  };

  // --- Google login ---
  const handleGoogleLogin = useCallback(
    async (credential: string) => {
      setIsLoading(true);
      setError('');
      try {
        const res = await fetch('/api/auth/oauth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential }),
        });
        const data = (await res.json()) as Record<string, unknown>;
        if (res.ok && data.success) router.push(getRedirectTo());
        else setError(extractErrorMessage(data, "Account non trovato. Contatta l'amministratore."));
      } catch {
        setError('Errore di rete. Riprova.');
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  // --- Passkey login ---
  const handlePasskeyLogin = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const optionsRes = await fetch('/api/auth/passkey/authenticate-options');
      if (optionsRes.status === 502 || optionsRes.status === 503) {
        setError('Il server si sta avviando. Riprova tra qualche secondo.');
        return;
      }
      if (!optionsRes.ok) {
        const d = (await optionsRes.json().catch(() => ({}))) as {
          error?: string | { message?: string };
        };
        const msg = typeof d.error === 'string' ? d.error : d.error?.message;
        setError(msg || 'Nessuna passkey registrata.');
        return;
      }
      const options = await optionsRes.json();
      const { startAuthentication } = await import('@simplewebauthn/browser');
      const assertion = await startAuthentication(
        options as Parameters<typeof startAuthentication>[0]
      );
      const verifyRes = await fetch('/api/auth/passkey/authenticate-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assertion,
          sessionId: (options as Record<string, unknown>).sessionId,
        }),
      });
      const data = (await verifyRes.json()) as { success?: boolean; error?: string };
      if (verifyRes.ok && data.success) router.push(getRedirectTo());
      else setError(data.error || 'Autenticazione fallita.');
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'NotAllowedError')
        setError('Autenticazione annullata.');
      else setError('Nessuna passkey trovata su questo dispositivo.');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  // --- Email continue ---
  const handleEmailContinue = () => {
    if (!tenantSlug.trim()) {
      setError("Inserisci lo slug dell'officina");
      return;
    }
    if (!email.trim()) {
      setError('Inserisci la tua email');
      return;
    }
    setError('');
    setStep('password');
  };

  // --- Password submit ---
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Inserisci la password');
      return;
    }
    setIsLoading(true);
    setError('');
    setColdStartHint(false);
    const timer = setTimeout(() => setColdStartHint(true), 5000);
    try {
      const res = await fetch('/api/auth/password/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, tenantSlug, rememberMe }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (res.ok) {
        if (data.requiresMFA) router.push('/auth/mfa/verify?token=' + (data.tempToken as string));
        else if (typeof window !== 'undefined' && browserSupportsWebAuthn())
          setStep('passkey-prompt');
        else router.push(getRedirectTo());
      } else if (res.status === 429) {
        setError('Troppi tentativi. Riprova tra 60 secondi.');
      } else {
        setError(extractErrorMessage(data, 'Email o password non corretta'));
      }
    } catch {
      setError('Errore di rete. Riprova.');
    } finally {
      clearTimeout(timer);
      setColdStartHint(false);
      setIsLoading(false);
    }
  };

  // --- Magic link ---
  const handleMagicLink = async () => {
    if (!tenantSlug.trim()) {
      setError("Inserisci lo slug dell'officina");
      return;
    }
    if (!email.trim()) {
      setError('Inserisci la tua email');
      return;
    }
    setIsLoading(true);
    setError('');
    setColdStartHint(false);
    const timer = setTimeout(() => setColdStartHint(true), 5000);
    try {
      const res = await fetch('/api/auth/magic-link/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, tenantSlug }),
      });
      if (res.ok) setStep('magic-sent');
      else {
        const data = (await res.json()) as Record<string, unknown>;
        setError(extractErrorMessage(data, "Errore durante l'invio"));
      }
    } catch {
      setError('Errore di rete. Riprova.');
    } finally {
      clearTimeout(timer);
      setColdStartHint(false);
      setIsLoading(false);
    }
  };

  // --- Passkey registration ---
  const handleRegisterPasskey = async () => {
    setIsRegisteringPasskey(true);
    try {
      const optionsRes = await fetch('/api/auth/passkey/register-options', { method: 'POST' });
      if (!optionsRes.ok) {
        router.push(getRedirectTo());
        return;
      }
      const optionsData = (await optionsRes.json()) as {
        options: Parameters<typeof startRegistration>[0];
        sessionId: string;
      };
      const attestation = await startRegistration(optionsData.options);
      await fetch('/api/auth/passkey/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attestation,
          sessionId: optionsData.sessionId,
          deviceName: navigator.userAgent.includes('iPhone')
            ? 'iPhone'
            : navigator.userAgent.includes('iPad')
              ? 'iPad'
              : navigator.userAgent.includes('Mac')
                ? 'Mac'
                : 'Dispositivo',
        }),
      });
      router.push(getRedirectTo());
    } catch {
      router.push(getRedirectTo());
    } finally {
      setIsRegisteringPasskey(false);
    }
  };

  return (
    <div className='flex min-h-screen w-full flex-col bg-[#f4f4f4] dark:bg-[#212121] overflow-hidden'>
      <GoogleOneTap onSuccess={handleGoogleLogin} />

      {/* ===== iOS Expand Overlay ===== */}
      <AnimatePresence>
        {expanding && expandRect && (
          <motion.div
            className='fixed z-50 bg-[#f4f4f4] dark:bg-[#212121]'
            style={{ position: 'fixed' }}
            initial={{
              top: expandRect.top,
              left: expandRect.left,
              width: expandRect.width,
              height: expandRect.height,
              borderRadius: 28,
              opacity: 1,
            }}
            animate={{
              top: 0,
              left: 0,
              width: typeof window !== 'undefined' ? window.innerWidth : 0,
              height: typeof window !== 'undefined' ? window.innerHeight : 0,
              borderRadius: 0,
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            transition={iosSpring}
            onAnimationComplete={handleExpandComplete}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <header className='relative flex items-center justify-center px-6 pt-6 pb-2'>
        {step !== 'methods' && step !== 'magic-sent' && step !== 'passkey-prompt' && (
          <button
            onClick={handleBack}
            className='absolute left-6 text-[15px] font-medium text-[#0d0d0d] dark:text-[#ececec] hover:opacity-50 transition-opacity'
          >
            &larr; Indietro
          </button>
        )}
        <span className='text-[15px] font-semibold text-[#0d0d0d] dark:text-[#ececec]'>
          MechMind OS
        </span>
      </header>

      {/* Content */}
      <main className='flex flex-1 flex-col items-center justify-center px-6 pb-12'>
        <div className='w-full max-w-[440px]'>
          <AnimatePresence mode='wait'>
            {/* ============ STEP: Methods ============ */}
            {step === 'methods' && (
              <motion.div
                key='methods'
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: showContent ? 1 : 0, scale: showContent ? 1 : 0.96 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25 }}
                className='space-y-5'
              >
                {/* Title */}
                <div className='text-center mb-8'>
                  <h1 className='text-[28px] font-bold text-[#0d0d0d] dark:text-[#ececec] tracking-tight'>
                    Benvenuto in MechMind
                  </h1>
                  <p className='mt-2 text-[15px] text-[#636366] dark:text-[#636366] leading-relaxed'>
                    Gestisci la tua officina in modo semplice e veloce.
                  </p>
                </div>

                {/* All login buttons — equal spacing */}
                <div className='space-y-3'>
                  <button
                    ref={el => {
                      buttonRefs.current['accedi'] = el;
                    }}
                    onClick={() => handleMethodClick('accedi', 'email')}
                    className='flex w-3/4 mx-auto items-center justify-center rounded-full border border-[#e5e5e5] dark:border-[#424242] bg-white dark:bg-[#2f2f2f] px-5 h-[40px] text-[15px] font-medium text-[#0d0d0d] dark:text-[#ececec] hover:bg-[#ebebeb] dark:hover:bg-[#3a3a3a] active:scale-[0.97] transition-all'
                  >
                    Accedi
                  </button>

                  <button
                    ref={el => {
                      buttonRefs.current['registrati'] = el;
                    }}
                    onClick={() => handleMethodClick('registrati', 'register')}
                    className='flex w-3/4 mx-auto items-center justify-center rounded-full border border-[#e5e5e5] dark:border-[#424242] bg-white dark:bg-[#2f2f2f] px-5 h-[40px] text-[15px] font-medium text-[#0d0d0d] dark:text-[#ececec] hover:bg-[#ebebeb] dark:hover:bg-[#3a3a3a] active:scale-[0.97] transition-all'
                  >
                    Registrati
                  </button>

                  {/* APPLE — disabled, coming soon */}
                  <button
                    disabled={true}
                    aria-label='Apple Sign In — Non disponibile'
                    aria-disabled='true'
                    title='Disponibile prossimamente'
                    className='flex w-3/4 mx-auto items-center justify-center gap-2 rounded-full border border-[#e5e5e5] dark:border-[#424242] bg-white dark:bg-[#2f2f2f] px-5 h-[40px] text-[15px] font-medium text-[#0d0d0d] dark:text-[#ececec] opacity-40 cursor-not-allowed select-none transition-all'
                  >
                    <svg width='21' height='21' viewBox='0 0 814 1000' fill='currentColor'>
                      <path d='M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 612 0 486.2 0 367.1c0-154.4 100.5-236.2 199.1-236.2 52.6 0 96.5 34.6 129.4 34.6 31.8 0 81.3-36.8 140.8-36.8 21.8 0 108.2 1.9 160.8 83z' />
                    </svg>
                    Apple — Non disponibile
                  </button>

                  {/* GOOGLE */}
                  <button
                    onClick={() => (window.location.href = '/api/auth/oauth/google')}
                    disabled={isLoading}
                    aria-label='Accedi con Google'
                    className='flex w-3/4 mx-auto items-center justify-center gap-2 rounded-full border border-[#e5e5e5] dark:border-[#424242] bg-white dark:bg-[#2f2f2f] px-5 h-[40px] text-[15px] font-medium text-[#0d0d0d] dark:text-[#ececec] hover:bg-[#ebebeb] dark:hover:bg-[#3a3a3a] active:scale-[0.97] transition-all'
                  >
                    <svg width='21' height='21' viewBox='0 0 24 24'>
                      <path
                        fill='#4285F4'
                        d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
                      />
                      <path
                        fill='#34A853'
                        d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
                      />
                      <path
                        fill='#FBBC05'
                        d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
                      />
                      <path
                        fill='#EA4335'
                        d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
                      />
                    </svg>
                    Continua con Google
                  </button>

                  {/* FACEBOOK */}
                  <button
                    onClick={() => (window.location.href = '/api/auth/oauth/facebook')}
                    disabled={isLoading}
                    aria-label='Accedi con Facebook'
                    className='flex w-3/4 mx-auto items-center justify-center gap-2 rounded-full border border-[#e5e5e5] dark:border-[#424242] bg-white dark:bg-[#2f2f2f] px-5 h-[40px] text-[15px] font-medium text-[#0d0d0d] dark:text-[#ececec] hover:bg-[#ebebeb] dark:hover:bg-[#3a3a3a] active:scale-[0.97] transition-all'
                  >
                    <svg width='21' height='21' viewBox='0 0 24 24' fill='#1877F2'>
                      <path d='M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' />
                    </svg>
                    Continua con Facebook
                  </button>

                  {/* MICROSOFT */}
                  <button
                    onClick={() => (window.location.href = '/api/auth/oauth/microsoft')}
                    disabled={isLoading}
                    aria-label='Accedi con Microsoft'
                    className='flex w-3/4 mx-auto items-center justify-center gap-2 rounded-full border border-[#e5e5e5] dark:border-[#424242] bg-white dark:bg-[#2f2f2f] px-5 h-[40px] text-[15px] font-medium text-[#0d0d0d] dark:text-[#ececec] hover:bg-[#ebebeb] dark:hover:bg-[#3a3a3a] active:scale-[0.97] transition-all'
                  >
                    <svg width='21' height='21' viewBox='0 0 21 21'>
                      <rect x='1' y='1' width='9' height='9' fill='#f25022' />
                      <rect x='11' y='1' width='9' height='9' fill='#7fba00' />
                      <rect x='1' y='11' width='9' height='9' fill='#00a4ef' />
                      <rect x='11' y='11' width='9' height='9' fill='#ffb900' />
                    </svg>
                    Accedi con Microsoft
                  </button>
                </div>

                {/* Demo & free trial */}
                <div className='space-y-2 pt-2'>
                  <div className='relative my-2'>
                    <div className='absolute inset-0 flex items-center'>
                      <span className='w-full border-t border-[#e5e5e5] dark:border-[#424242]' />
                    </div>
                    <div className='relative flex justify-center text-xs'>
                      <span className='bg-[#f4f4f4] dark:bg-[#212121] px-2 text-[#636366]'>
                        oppure
                      </span>
                    </div>
                  </div>

                  <button
                    type='button'
                    className='w-full text-center text-[14px] font-medium text-[#636366] dark:text-[#636366] hover:text-[#0d0d0d] dark:hover:text-[#ececec] transition-colors pt-1'
                    onClick={async () => {
                      setIsLoading(true);
                      try {
                        const res = await fetch('/api/auth/demo-session', {
                          method: 'POST',
                          credentials: 'include',
                        });
                        const data = (await res.json()) as { success?: boolean };
                        if (res.ok && data.success) {
                          localStorage.setItem('mechmind_demo', 'true');
                          sessionStorage.setItem('demo_start', Date.now().toString());
                          window.location.href = '/dashboard';
                        } else {
                          setError('Demo non disponibile. Riprova.');
                        }
                      } catch {
                        setError('Errore di rete. Riprova.');
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Caricamento...' : 'Prima provalo'}
                  </button>

                  <button
                    type='button'
                    className='w-full text-center text-[13px] font-medium text-[#0d0d0d] dark:text-[#ececec] hover:opacity-50 transition-opacity'
                    onClick={() => router.push('/auth/register')}
                  >
                    Inizia gratis — 7 giorni
                  </button>
                </div>

                {/* Error */}
                {error && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className='text-center text-[13px] text-red-600 dark:text-red-400'
                  >
                    {error}
                  </motion.p>
                )}
              </motion.div>
            )}

            {/* ============ STEP: Email ============ */}
            {step === 'email' && (
              <motion.div
                key='email'
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: showContent ? 1 : 0, scale: showContent ? 1 : 0.96 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.3, delay: 0.05 }}
                className='space-y-5'
              >
                <div className='text-center mb-6'>
                  <h1 className='text-[28px] font-bold text-[#0d0d0d] dark:text-[#ececec] tracking-tight'>
                    Inserisci le tue credenziali
                  </h1>
                </div>

                <div className='space-y-4'>
                  <FloatingInput
                    label='Slug officina'
                    value={tenantSlug}
                    onChange={setTenantSlug}
                    autoFocus
                    name='tenant'
                    autoComplete='organization'
                  />
                  <FloatingInput
                    label='Indirizzo e-mail'
                    type='email'
                    value={email}
                    onChange={setEmail}
                    error={error}
                    name='email'
                    autoComplete='email'
                  />
                </div>

                <PrimaryButton onClick={handleEmailContinue}>Continua</PrimaryButton>

                <div className='text-center'>
                  <button
                    onClick={handleMagicLink}
                    disabled={isLoading}
                    className='text-[14px] font-medium text-[#636366] dark:text-[#636366] hover:text-[#0d0d0d] dark:hover:text-[#ececec] transition-colors'
                  >
                    {isLoading ? 'Invio...' : 'Invia magic link invece'}
                  </button>
                </div>

                {coldStartHint && (
                  <p className='text-center text-[12px] text-[#6b6b6b] dark:text-[#6e6e6e]'>
                    Il server si sta avviando...
                  </p>
                )}
              </motion.div>
            )}

            {/* ============ STEP: Password ============ */}
            {step === 'password' && (
              <motion.div
                key='password'
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <form onSubmit={handlePasswordSubmit} className='space-y-5'>
                  <div className='text-center mb-6'>
                    <h1 className='text-[28px] font-bold text-[#0d0d0d] dark:text-[#ececec] tracking-tight'>
                      Inserisci la password
                    </h1>
                    <p className='mt-2 text-[15px] text-[#636366] dark:text-[#636366]'>{email}</p>
                  </div>

                  <FloatingInput
                    label='Password'
                    type='password'
                    value={password}
                    onChange={setPassword}
                    error={error}
                    autoFocus
                    name='password'
                    autoComplete='current-password'
                  />

                  <label className='flex items-center gap-2 text-sm text-[#636366] cursor-pointer'>
                    <input
                      type='checkbox'
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      className='rounded border-[#e5e5e5] dark:border-[#424242] w-4 h-4'
                      aria-label='Ricordami per 30 giorni'
                    />
                    <span>Ricordami per 30 giorni</span>
                  </label>

                  <PrimaryButton type='submit' isLoading={isLoading}>
                    {isLoading ? 'Accesso...' : 'Continua'}
                  </PrimaryButton>

                  <div className='text-center'>
                    <Link
                      href='/auth/forgot-password'
                      className='text-[14px] font-medium text-[#636366] dark:text-[#636366] hover:text-[#0d0d0d] dark:hover:text-[#ececec] transition-colors'
                    >
                      Password dimenticata?
                    </Link>
                  </div>

                  {coldStartHint && (
                    <p className='text-center text-[12px] text-[#6b6b6b] dark:text-[#6e6e6e]'>
                      Il server si sta avviando...
                    </p>
                  )}
                </form>
              </motion.div>
            )}

            {/* ============ STEP: Magic Link Sent ============ */}
            {step === 'magic-sent' && (
              <motion.div
                key='magic-sent'
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
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
                  Abbiamo inviato un link di accesso a{' '}
                  <strong className='text-[#0d0d0d] dark:text-[#ececec]'>{email}</strong>
                </p>
                <button
                  onClick={() => {
                    setStep('methods');
                    setError('');
                  }}
                  className='text-[14px] font-medium text-[#636366] dark:text-[#636366] hover:text-[#0d0d0d] dark:hover:text-[#ececec] transition-colors'
                >
                  Torna al login
                </button>
              </motion.div>
            )}

            {/* ============ STEP: Passkey Registration Prompt ============ */}
            {step === 'passkey-prompt' && (
              <motion.div
                key='passkey-prompt'
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className='text-center space-y-5'
              >
                <div className='inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#0d0d0d] dark:bg-[#ececec]'>
                  <Fingerprint className='h-7 w-7 text-white dark:text-[#0d0d0d]' />
                </div>
                <h1 className='text-[28px] font-bold text-[#0d0d0d] dark:text-[#ececec] tracking-tight'>
                  Attiva accesso rapido
                </h1>
                <p className='text-[15px] text-[#636366] dark:text-[#636366] leading-relaxed max-w-[320px] mx-auto'>
                  {`Vuoi attivare Face ID / Touch ID per accedere pi\u00F9 velocemente?`}
                </p>
                <PrimaryButton onClick={handleRegisterPasskey} isLoading={isRegisteringPasskey}>
                  <Fingerprint className='h-5 w-5 mr-2' /> Attiva
                </PrimaryButton>
                <button
                  onClick={() => router.push(getRedirectTo())}
                  disabled={isRegisteringPasskey}
                  className='text-[14px] font-medium text-[#636366] dark:text-[#636366] hover:text-[#0d0d0d] dark:hover:text-[#ececec] transition-colors'
                >
                  Forse dopo
                </button>
              </motion.div>
            )}
          </AnimatePresence>
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
