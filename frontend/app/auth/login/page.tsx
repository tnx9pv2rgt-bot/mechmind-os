'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Script from 'next/script';
import { startRegistration, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { z } from 'zod';
import { AuthSplitLayout } from '@/components/auth/auth-split-layout';
import {
  btnPrimary,
  btnSecondaryOutline,
  btnSpinner,
  inputStyle,
  slideVariants,
} from '@/components/auth/auth-styles';
import { SocialButtons } from '@/components/auth/social-buttons';
import { MagicLinkSent } from '@/components/auth/magic-link-sent';
import { PasskeyPrompt } from '@/components/auth/passkey-prompt';
import { OTPInput } from '@/components/auth/otp-input';
import { createDemoSession, clearDemoSession } from '@/lib/auth/demo-session';
import { SkipLink } from '@/components/ui/skip-link';

const emailSchema = z
  .string()
  .min(1, 'Inserisci la tua email')
  .email('Inserisci un indirizzo email valido');

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Inserisci la password'),
});

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

function extractErrorMessage(data: Record<string, unknown>, fallback: string): string {
  if (typeof data.message === 'string' && data.message) return data.message;
  if (typeof data.error === 'string' && data.error) return data.error;
  if (data.error && typeof data.error === 'object' && 'message' in data.error) {
    const msg = (data.error as { message?: string }).message;
    if (msg) return msg;
  }
  return fallback;
}

type Step = 'email' | 'magic-sent' | 'mfa' | 'passkey-prompt';

// =============================================================================
// Google One Tap
// =============================================================================
function GoogleOneTap({
  onSuccess,
}: {
  onSuccess: (credential: string) => void;
}): React.ReactElement | null {
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
    const gsiErrorHandler = (...args: unknown[]): void => {
      const msg = args.map(String).join(' ');
      if (msg.includes('GSI_LOGGER') && msg.includes('origin is not allowed')) setGsiError(true);
      originalError.apply(console, args);
    };
    console.error = gsiErrorHandler;
    if ((window as unknown as Record<string, unknown>).google) setGsiReady(true);

    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node instanceof HTMLElement) {
            node.querySelectorAll('img:not([alt])').forEach(img => img.setAttribute('alt', ''));
          }
          if (node instanceof HTMLImageElement && !node.hasAttribute('alt')) {
            node.setAttribute('alt', '');
          }
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      console.error = originalError;
      observer.disconnect();
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
export default function AuthPage(): React.ReactElement {
  const [step, setStep] = useState<Step>('email');
  const [direction, setDirection] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [coldStartHint, setColdStartHint] = useState(false);
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [mfaTempToken, setMfaTempToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [useSmsOtp, setUseSmsOtp] = useState(false);
  const [smsOtpCode, setSmsOtpCode] = useState('');
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [smsSent, setSmsSent] = useState(false);
  const [trustDevice, setTrustDevice] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [backupCode, setBackupCode] = useState('');
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [loginRiskLevel, setLoginRiskLevel] = useState<string | null>(null);
  const [isResendingMagicLink, setIsResendingMagicLink] = useState(false);
  const [loadingButton, setLoadingButton] = useState<'google' | 'magiclink' | null>(null);

  const [tenantSlug, setTenantSlug] = useState('');

  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const getRedirectTo = (): string => {
    if (typeof window === 'undefined') return '/dashboard';
    const params = new URLSearchParams(window.location.search);
    return params.get('redirect') || '/dashboard';
  };

  // Pre-fill tenant from URL param; in dev default to "demo"
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const urlTenant = params.get('tenant');
    if (urlTenant) {
      setTenantSlug(urlTenant);
    } else {
      const isDev =
        window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isDev) setTenantSlug('demo');
    }

    const urlError = params.get('error');
    if (urlError === 'google_not_configured') {
      setError('Accesso con Google non ancora configurato. Usa email e password.');
      setLoadingButton(null);
      window.history.replaceState({}, '', '/auth');
    }
  }, []);

  // BUG-4: redirect utente già autenticato a /dashboard
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.json())
      .then((data: { user: unknown }) => {
        if (data.user) {
          clearDemoSession();
          window.location.href = '/dashboard';
        }
      })
      .catch(() => {});
  }, []);

  // Sync Safari autofill — autofill does NOT trigger React onChange
  useEffect(() => {
    const el = passwordInputRef.current;
    if (!el) return;
    const id = setInterval(() => {
      if (el.value !== password) setPassword(el.value);
    }, 100);
    return () => clearInterval(id);
  }, [password]);

  // BUG-2: rifocalizza l'email dopo il dismiss del cookie consent
  useEffect(() => {
    const onConsent = (): void => {
      if (step === 'email') setTimeout(() => emailInputRef.current?.focus(), 80);
    };
    window.addEventListener('mechmind-consent-update', onConsent);
    return () => window.removeEventListener('mechmind-consent-update', onConsent);
  }, [step]);

  const goTo = (nextStep: Step, dir: number = 1): void => {
    setError('');
    setDirection(dir);
    setStep(nextStep);
  };

  // --- Demo ---
  const handleDemo = async (): Promise<void> => {
    setIsDemoLoading(true);
    setError('');
    try {
      const result = await createDemoSession();
      if (result.success) {
        window.location.href = '/dashboard';
      } else {
        setError(result.error || 'Demo non disponibile. Riprova.');
      }
    } catch {
      setError('Errore di rete. Riprova.');
    } finally {
      setIsDemoLoading(false);
    }
  };

  // --- Google ---
  const handleGoogleLogin = useCallback(async (credential: string) => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/oauth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (res.ok && data.success) {
        clearDemoSession();
        window.location.href = getRedirectTo();
      } else setError(extractErrorMessage(data, "Account non trovato. Contatta l'amministratore."));
    } catch {
      setError('Errore di rete. Riprova.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // --- Magic link ---
  const handleMagicLink = async (): Promise<void> => {
    const emailResult = z.string().email().safeParse(email);
    if (!emailResult.success) {
      setError('Inserisci un indirizzo email valido per ricevere il magic link');
      emailInputRef.current?.focus();
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
        body: JSON.stringify({ email }),
      });
      if (res.ok) goTo('magic-sent');
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

  const handleResendMagicLink = async (): Promise<void> => {
    setIsResendingMagicLink(true);
    try {
      await fetch('/api/auth/magic-link/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } catch {
      // silent
    } finally {
      setIsResendingMagicLink(false);
    }
  };

  // --- Login ---
  const handleLoginSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }
    if (!tenantSlug) {
      setError('Inserisci il nome del workspace per continuare');
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
        body: JSON.stringify({ email, password, rememberMe, tenantSlug }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (res.ok) {
        if (data.requiresMFA) {
          setMfaTempToken(data.tempToken as string);
          if (data.riskLevel) setLoginRiskLevel(data.riskLevel as string);
          if (data.deviceId) setDeviceId(data.deviceId as string);
          goTo('mfa');
        } else {
          clearDemoSession();
          if (browserSupportsWebAuthn() && !localStorage.getItem('skip-passkey-prompt')) {
            goTo('passkey-prompt');
          } else {
            window.location.href = getRedirectTo();
          }
        }
      } else if (res.status === 429) {
        setError('Troppi tentativi. Riprova tra 60 secondi.');
      } else {
        const msg = extractErrorMessage(data, '');
        if (msg.includes('sospetta') || msg.includes('bloccato')) {
          setError('Accesso bloccato per attività sospetta. Contatta il supporto.');
        } else if (msg.includes('locked') || msg.includes('Account locked')) {
          setError('Account temporaneamente bloccato. Riprova più tardi.');
        } else if (
          msg.toLowerCase().includes('tenantslug') ||
          msg.toLowerCase().includes('workspace')
        ) {
          setError('Workspace non valido. Verifica il nome e riprova.');
        } else if (
          msg.toLowerCase().includes('invalid credentials') ||
          msg.toLowerCase().includes('invalid password') ||
          msg.toLowerCase().includes('unauthorized') ||
          msg.toLowerCase().includes('wrong password')
        ) {
          setError('Email o password non corretta');
        } else {
          setError(msg || 'Email o password non corretta');
        }
      }
    } catch {
      setError('Errore di rete. Riprova.');
    } finally {
      clearTimeout(timer);
      setColdStartHint(false);
      setIsLoading(false);
    }
  };

  // --- MFA ---
  const handleMFAVerify = async (): Promise<void> => {
    const code = useBackupCode ? backupCode.trim() : mfaCode;
    if (!code) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/mfa/verify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tempToken: mfaTempToken,
          code,
          isBackupCode: useBackupCode,
          trustDevice,
          deviceId,
        }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (res.ok) {
        clearDemoSession();
        if (browserSupportsWebAuthn() && !localStorage.getItem('skip-passkey-prompt')) {
          goTo('passkey-prompt');
        } else {
          window.location.href = getRedirectTo();
        }
      } else {
        if (data.remainingAttempts !== undefined) {
          setRemainingAttempts(data.remainingAttempts as number);
        }
        setError(extractErrorMessage(data, 'Codice non valido'));
      }
    } catch {
      setError('Errore di connessione. Riprova.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendSmsOtp = async (): Promise<void> => {
    setIsSendingSms(true);
    try {
      const res = await fetch('/api/auth/sms-otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken: mfaTempToken }),
      });
      if (res.ok) {
        setSmsSent(true);
        setUseSmsOtp(true);
      } else {
        const data = (await res.json()) as Record<string, unknown>;
        setError(extractErrorMessage(data, 'Errore invio SMS'));
      }
    } catch {
      setError('Errore di rete. Riprova.');
    } finally {
      setIsSendingSms(false);
    }
  };

  const handleSmsOtpVerify = async (): Promise<void> => {
    if (smsOtpCode.length !== 6) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/sms-otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken: mfaTempToken, code: smsOtpCode, trustDevice, deviceId }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (res.ok) {
        clearDemoSession();
        window.location.href = getRedirectTo();
      } else {
        if (data.remainingAttempts !== undefined) {
          setRemainingAttempts(data.remainingAttempts as number);
        }
        setError(extractErrorMessage(data, 'Codice SMS non valido'));
      }
    } catch {
      setError('Errore di connessione. Riprova.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (useSmsOtp && smsOtpCode.length === 6 && !isLoading && step === 'mfa') {
      handleSmsOtpVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [smsOtpCode]);

  useEffect(() => {
    if (!useSmsOtp && !useBackupCode && mfaCode.length === 6 && !isLoading && step === 'mfa') {
      handleMFAVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mfaCode]);

  // --- Passkey registration (optional, after login) ---
  const handleRegisterPasskey = async (): Promise<void> => {
    setIsRegisteringPasskey(true);
    try {
      const optionsRes = await fetch('/api/auth/passkey/register-options', { method: 'POST' });
      if (!optionsRes.ok) {
        clearDemoSession();
        window.location.href = getRedirectTo();
        return;
      }
      const options = await optionsRes.json();
      const registration = await startRegistration(
        options as Parameters<typeof startRegistration>[0]
      );
      await fetch('/api/auth/passkey/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registration }),
      });
      clearDemoSession();
      window.location.href = getRedirectTo();
    } catch {
      clearDemoSession();
      window.location.href = getRedirectTo();
    } finally {
      setIsRegisteringPasskey(false);
    }
  };

  const showBack = step === 'mfa' || step === 'magic-sent';
  const handleBack = (): void => {
    if (step === 'mfa' || step === 'magic-sent') {
      goTo('email', -1);
    }
  };

  return (
    <AuthSplitLayout showBack={showBack} onBack={handleBack}>
      <SkipLink targetId='login-form' />
      <GoogleOneTap onSuccess={handleGoogleLogin} />

      <AnimatePresence mode='wait' custom={direction}>
        {/* ============ STEP: Login (workspace + email + password) ============ */}
        {step === 'email' && (
          <motion.div
            key='email'
            custom={direction}
            variants={slideVariants}
            initial='enter'
            animate='center'
            exit='exit'
          >
            <div className='flex flex-col items-stretch gap-5'>
              <h2 className='text-center text-3xl font-normal text-[var(--text-primary)]'>
                Accedi
              </h2>
              <p className='mb-2 px-4 text-center text-base text-[var(--text-secondary)]'>
                Gestisci officina, fatture e prenotazioni da un unico pannello.
              </p>

              {/* Social */}
              <SocialButtons
                isLoading={isLoading}
                loadingButton={loadingButton}
                emailMissing={false}
                onGoogleClick={() => {
                  setLoadingButton('google');
                  setError('');
                  window.location.href = '/api/auth/oauth/google';
                }}
                onMagicLinkClick={() => {
                  setLoadingButton('magiclink');
                  handleMagicLink().finally(() => setLoadingButton(null));
                }}
              />

              {/* Divider */}
              <div className='my-1 grid grid-cols-[1fr_max-content_1fr] items-center'>
                <div className='h-px bg-[var(--border-strong)]' />
                <div className='mx-6 text-[13px] font-medium uppercase text-[var(--text-tertiary)]'>
                  Oppure
                </div>
                <div className='h-px bg-[var(--border-strong)]' />
              </div>

              {/* Login form: workspace + email + password */}
              <form
                id='login-form'
                className='flex flex-col gap-4'
                autoComplete='on'
                noValidate
                onSubmit={handleLoginSubmit}
              >
                {/* Workspace */}
                <div>
                  <label htmlFor='login-workspace' className='sr-only'>
                    Workspace
                  </label>
                  <input
                    id='login-workspace'
                    type='text'
                    value={tenantSlug}
                    onChange={e => {
                      setTenantSlug(e.target.value.toLowerCase().trim());
                      setError('');
                    }}
                    placeholder='Workspace (es. demo)'
                    autoComplete='organization'
                    className={inputStyle}
                  />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor='login-email' className='sr-only'>
                    Indirizzo e-mail
                  </label>
                  <input
                    id='login-email'
                    ref={emailInputRef}
                    type='email'
                    value={email}
                    onChange={e => {
                      setEmail(e.target.value);
                      setError('');
                    }}
                    placeholder='Indirizzo e-mail'
                    name='email'
                    autoComplete='username'
                    aria-describedby={error ? 'login-error' : undefined}
                    className={`${inputStyle} ${error ? 'border-[var(--text-tertiary)]' : ''}`}
                  />
                </div>

                {/* Password */}
                <div className='relative'>
                  <label htmlFor='login-password' className='sr-only'>
                    Password
                  </label>
                  <input
                    id='login-password'
                    ref={passwordInputRef}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    onInput={e => {
                      setPassword(e.currentTarget.value);
                      setError('');
                    }}
                    placeholder='Password'
                    name='password'
                    autoComplete='current-password'
                    aria-describedby={error ? 'login-error' : undefined}
                    data-lpignore='true'
                    data-1p-ignore
                    className={`${inputStyle} pr-20 ${error ? 'border-[var(--text-tertiary)]' : ''}`}
                  />
                  <button
                    type='button'
                    onMouseDown={e => {
                      e.preventDefault();
                      setShowPassword(v => !v);
                    }}
                    className='absolute inset-y-0 right-0 z-20 flex min-w-[60px] items-center justify-center px-3 text-[13px] text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-on-brand)]'
                    aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
                  >
                    <span style={{ pointerEvents: 'none' }}>
                      {showPassword ? 'Nascondi' : 'Mostra'}
                    </span>
                  </button>
                </div>

                {/* Remember me + forgot password */}
                <div className='flex items-center justify-between'>
                  <label className='flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer min-h-[44px]'>
                    <input
                      type='checkbox'
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      className='rounded border-[var(--border-strong)] w-4 h-4 accent-white'
                      aria-label='Ricordami'
                    />
                    <span>Ricordami</span>
                  </label>
                  <Link
                    href='/auth/forgot-password'
                    className='text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-on-brand)] transition-colors min-h-[44px] inline-flex items-center'
                  >
                    Password dimenticata?
                  </Link>
                </div>

                {error && (
                  <motion.p
                    id='login-error'
                    role='alert'
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className='text-center text-[13px] text-[var(--text-secondary)]'
                  >
                    {error}
                  </motion.p>
                )}

                {coldStartHint && (
                  <p className='text-center text-[12px] text-[var(--text-tertiary)]'>
                    Il server si sta avviando...
                  </p>
                )}

                <button type='submit' disabled={isLoading} className={`mt-1 ${btnPrimary}`}>
                  {isLoading ? <span className={btnSpinner} /> : 'Accedi'}
                </button>
              </form>

              {/* Register + Demo */}
              <div className='flex flex-col items-center gap-0'>
                <p className='text-center text-[13px] text-[var(--text-tertiary)]'>
                  Non hai un account?{' '}
                  <Link
                    href='/auth/register'
                    className='min-h-[44px] inline-flex items-center font-medium text-[var(--text-primary)] underline decoration-[var(--text-tertiary)] underline-offset-2 hover:decoration-[var(--text-primary)]'
                  >
                    Registrati
                  </Link>
                </p>
                <button
                  type='button'
                  onClick={handleDemo}
                  disabled={isDemoLoading}
                  className='text-[13px] font-medium text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-on-brand)] min-h-[44px]'
                >
                  {isDemoLoading ? 'Caricamento demo...' : 'Prova la demo gratuita'}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ============ STEP: Magic Link Sent ============ */}
        {step === 'magic-sent' && (
          <motion.div
            key='magic-sent'
            custom={direction}
            variants={slideVariants}
            initial='enter'
            animate='center'
            exit='exit'
          >
            <MagicLinkSent
              email={email}
              onResend={handleResendMagicLink}
              onBackToPassword={() => goTo('email', -1)}
              isResending={isResendingMagicLink}
            />
          </motion.div>
        )}

        {/* ============ STEP: MFA ============ */}
        {step === 'mfa' && (
          <motion.div
            key='mfa'
            custom={direction}
            variants={slideVariants}
            initial='enter'
            animate='center'
            exit='exit'
          >
            <div className='flex flex-col items-stretch gap-5'>
              <h2 className='text-center text-3xl font-normal text-[var(--text-primary)]'>
                Verifica in due passaggi
              </h2>
              {loginRiskLevel && loginRiskLevel !== 'low' && (
                <div
                  className={`mx-auto flex max-w-sm items-center gap-2 rounded-lg px-4 py-2.5 text-sm ${
                    loginRiskLevel === 'critical' || loginRiskLevel === 'high'
                      ? 'text-[var(--status-error)]'
                      : 'text-[var(--status-warning)]'
                  }`}
                >
                  <span>
                    {loginRiskLevel === 'critical' || loginRiskLevel === 'high'
                      ? 'Accesso da posizione o dispositivo insolito. Verifica la tua identità.'
                      : 'Nuovo dispositivo rilevato. Conferma la tua identità.'}
                  </span>
                </div>
              )}
              <p className='mb-4 px-4 text-center text-base text-[var(--text-secondary)]'>
                {useSmsOtp
                  ? 'Inserisci il codice a 6 cifre ricevuto via SMS.'
                  : useBackupCode
                    ? 'Inserisci uno dei tuoi codici di recupero'
                    : 'Inserisci il codice a 6 cifre dalla tua app di autenticazione.'}
              </p>

              <AnimatePresence mode='wait'>
                {useSmsOtp ? (
                  <motion.div
                    key='sms-otp'
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <OTPInput
                      length={6}
                      value={smsOtpCode}
                      onChange={setSmsOtpCode}
                      disabled={isLoading}
                      onComplete={handleSmsOtpVerify}
                    />
                  </motion.div>
                ) : useBackupCode ? (
                  <motion.div
                    key='backup'
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <label htmlFor='mfa-backup' className='sr-only'>
                      Codice di recupero
                    </label>
                    <input
                      id='mfa-backup'
                      type='text'
                      value={backupCode}
                      onChange={e => setBackupCode(e.target.value)}
                      placeholder='Codice di recupero'
                      autoFocus
                      className={inputStyle}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key='otp'
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <OTPInput
                      length={6}
                      value={mfaCode}
                      onChange={setMfaCode}
                      disabled={isLoading}
                      onComplete={handleMFAVerify}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {error && (
                <motion.p
                  role='alert'
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className='text-center text-[13px] text-[var(--text-secondary)]'
                >
                  {error}
                </motion.p>
              )}

              {remainingAttempts !== null && remainingAttempts > 0 && (
                <p className='text-center text-[12px] text-[var(--text-tertiary)]'>
                  Tentativi rimasti: {remainingAttempts}
                </p>
              )}

              {remainingAttempts === 0 && (
                <p className='text-center text-[13px] text-[var(--text-secondary)]'>
                  Troppi tentativi.{' '}
                  <Link href='/auth/locked' className='underline'>
                    Account bloccato
                  </Link>
                </p>
              )}

              <label className='flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer min-h-[44px]'>
                <input
                  type='checkbox'
                  checked={trustDevice}
                  onChange={e => setTrustDevice(e.target.checked)}
                  className='rounded border-[var(--border-strong)] w-4 h-4 accent-white'
                  aria-label='Fidati di questo dispositivo per 30 giorni'
                />
                <span>Fidati di questo dispositivo per 30 giorni</span>
              </label>

              <button
                type='button'
                onClick={() => (useSmsOtp ? handleSmsOtpVerify() : handleMFAVerify())}
                disabled={
                  isLoading ||
                  (useSmsOtp && smsOtpCode.length !== 6) ||
                  (!useSmsOtp && !useBackupCode && mfaCode.length !== 6) ||
                  (!useSmsOtp && useBackupCode && !backupCode.trim())
                }
                className={btnPrimary}
              >
                {isLoading ? <span className={btnSpinner} /> : 'Verifica'}
              </button>

              <div className='flex flex-col items-center gap-1'>
                {!useSmsOtp && (
                  <button
                    type='button'
                    onClick={() => {
                      setUseBackupCode(!useBackupCode);
                      setUseSmsOtp(false);
                      setError('');
                      setMfaCode('');
                      setBackupCode('');
                    }}
                    className='text-[14px] font-medium text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-on-brand)] min-h-[44px]'
                  >
                    {useBackupCode ? 'Usa codice authenticator' : 'Usa codice di recupero'}
                  </button>
                )}
                {useSmsOtp ? (
                  <button
                    type='button'
                    onClick={() => {
                      setUseSmsOtp(false);
                      setSmsOtpCode('');
                      setError('');
                    }}
                    className='text-[14px] font-medium text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-on-brand)] min-h-[44px]'
                  >
                    Usa codice authenticator
                  </button>
                ) : (
                  <button
                    type='button'
                    onClick={handleSendSmsOtp}
                    disabled={isSendingSms}
                    className='text-[14px] font-medium text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-on-brand)] min-h-[44px] flex items-center gap-1.5'
                  >
                    {isSendingSms ? (
                      <span className='inline-block h-3 w-3 animate-spin rounded-full border border-[var(--text-tertiary)] border-t-transparent' />
                    ) : null}
                    {smsSent ? 'Rinvia codice via SMS' : 'Ricevi codice via SMS'}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ============ STEP: Passkey Registration Prompt (optional, post-login) ============ */}
        {step === 'passkey-prompt' && (
          <motion.div
            key='passkey-prompt'
            custom={direction}
            variants={slideVariants}
            initial='enter'
            animate='center'
            exit='exit'
          >
            <PasskeyPrompt
              onRegister={handleRegisterPasskey}
              onSkip={() => {
                clearDemoSession();
                window.location.href = getRedirectTo();
              }}
              isRegistering={isRegisteringPasskey}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </AuthSplitLayout>
  );
}
