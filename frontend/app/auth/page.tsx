'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser';
import { z } from 'zod';
import { AuthSplitLayout } from '@/components/auth/auth-split-layout';
import { btnPrimary, btnSecondaryOutline, btnSpinner, inputStyle, slideVariants } from '@/components/auth/auth-styles';
import { SocialButtons } from '@/components/auth/social-buttons';
import { MagicLinkSent } from '@/components/auth/magic-link-sent';
import { PasskeyPrompt } from '@/components/auth/passkey-prompt';
import { OTPInput } from '@/components/auth/otp-input';
import { createDemoSession } from '@/lib/auth/demo-session';
import { useConditionalPasskey } from '@/hooks/usePasskey';

// =============================================================================
// Schemas
// =============================================================================
const emailSchema = z.object({
  email: z.string().min(1, 'Inserisci la tua email').email('Inserisci un indirizzo email valido'),
});

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
type Step = 'main' | 'passkey-auth' | 'password' | 'magic-sent' | 'mfa' | 'passkey-prompt';

// =============================================================================
// Google One Tap
// =============================================================================
function GoogleOneTap({ onSuccess }: { onSuccess: (credential: string) => void }): React.ReactElement | null {
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

    // Watch for Google-injected images without alt attributes (accessibility fix)
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            node.querySelectorAll('img:not([alt])').forEach((img) => {
              img.setAttribute('alt', '');
            });
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
      src="https://accounts.google.com/gsi/client"
      strategy="afterInteractive"
      onLoad={() => setGsiReady(true)}
      onError={() => setGsiError(true)}
    />
  );
}

// =============================================================================
// Passkey Auth Step — auto-triggers biometric, like Google/Microsoft
// =============================================================================
function PasskeyAuthStep({
  email,
  isLoading,
  error,
  onAuthenticate,
  onUsePassword,
}: {
  email: string;
  isLoading: boolean;
  error: string;
  onAuthenticate: () => Promise<void>;
  onUsePassword: () => void;
}): React.ReactElement {
  const hasTriggered = useRef(false);

  // Auto-trigger biometric on mount (like Google does)
  useEffect(() => {
    if (!hasTriggered.current) {
      hasTriggered.current = true;
      onAuthenticate();
    }
  }, [onAuthenticate]);

  return (
    <div className="flex flex-col items-stretch gap-5">
      {/* User avatar + email */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface-secondary)]/10">
          <span className="text-2xl font-medium text-[var(--text-on-brand)]">
            {email.charAt(0).toUpperCase()}
          </span>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">{email}</p>
      </div>

      <h2 className="text-center text-3xl font-normal text-[var(--text-on-brand)]">
        Conferma la tua identità
      </h2>
      <p className="mb-2 px-4 text-center text-base text-[var(--text-secondary)]">
        Usa la biometria del tuo dispositivo per accedere in modo sicuro.
      </p>

      {/* Biometric animation indicator */}
      {isLoading && (
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="relative flex h-20 w-20 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--surface-secondary)]/10" />
            <span className="relative text-4xl">🔐</span>
          </div>
          <p className="text-sm text-[var(--text-tertiary)]">In attesa della biometria...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <motion.p
          role="alert"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-[13px] text-[var(--text-secondary)]"
        >
          {error}
        </motion.p>
      )}

      {/* Retry biometric */}
      <button
        type="button"
        onClick={onAuthenticate}
        disabled={isLoading}
        className={btnPrimary}
      >
        {isLoading ? <span className={btnSpinner} /> : 'Riprova con biometria'}
      </button>

      {/* Divider */}
      <div className="my-1 grid grid-cols-[1fr_max-content_1fr] items-center">
        <div className="h-px bg-[var(--border-strong)]" />
        <div className="mx-6 text-[13px] font-medium uppercase text-[var(--text-tertiary)]">Oppure</div>
        <div className="h-px bg-[var(--border-strong)]" />
      </div>

      {/* Fallback to password */}
      <button
        type="button"
        onClick={onUsePassword}
        className={btnSecondaryOutline}
      >
        Usa la password
      </button>
    </div>
  );
}

// =============================================================================
// Main Page
// =============================================================================
export default function AuthPage(): React.ReactElement {
  const [step, setStep] = useState<Step>('main');
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
  const [emailShake, setEmailShake] = useState(false);
  const router = useRouter();
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Conditional Passkey UI — starts listening on mount.
  // When user focuses the email input, browser shows passkeys in autofill dropdown.
  const { isAvailable: isPasskeyAutofillAvailable } = useConditionalPasskey(
    useCallback(() => {
      router.push(getRedirectTo());
    }, [router])
  );

  const getRedirectTo = (): string => {
    if (typeof window === 'undefined') return '/dashboard';
    const params = new URLSearchParams(window.location.search);
    return params.get('redirect') || '/dashboard';
  };

  // Handle URL error params (e.g. Google OAuth not configured redirect)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const urlError = params.get('error');
    if (urlError === 'google_not_configured') {
      setError('Accesso con Google non ancora configurato. Usa email e password.');
      setLoadingButton(null);
      // Clean URL
      window.history.replaceState({}, '', '/auth');
    }
  }, []);

  const goTo = (nextStep: Step, dir: number = 1): void => {
    setError('');
    setDirection(dir);
    setStep(nextStep);
  };

  // --- Demo session ---
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

  // --- Email continue (Google/Microsoft pattern: check passkey BEFORE password) ---
  const handleEmailContinue = async (e?: React.FormEvent): Promise<void> => {
    if (e) e.preventDefault();
    const result = emailSchema.safeParse({ email });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    // Check if user has a passkey enrolled — if so, try biometric first
    if (typeof window !== 'undefined' && browserSupportsWebAuthn()) {
      try {
        setIsLoading(true);
        const optionsRes = await fetch('/api/auth/passkey/authenticate-options');
        if (optionsRes.ok) {
          // User has passkeys — show passkey-auth step (like Google does)
          goTo('passkey-auth');
          setIsLoading(false);
          return;
        }
      } catch {
        // Passkey check failed silently — fall through to password
      } finally {
        setIsLoading(false);
      }
    }

    goTo('password');
  };

  // --- Magic link ---
  const handleMagicLink = async (): Promise<void> => {
    const result = emailSchema.safeParse({ email });
    if (!result.success) {
      setError(result.error.errors[0].message);
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

  // --- Resend magic link ---
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

  // --- Password submit ---
  const handlePasswordSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!password.trim()) {
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
        body: JSON.stringify({ email, password, rememberMe }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (res.ok) {
        if (data.requiresMFA) {
          setMfaTempToken(data.tempToken as string);
          if (data.riskLevel) setLoginRiskLevel(data.riskLevel as string);
          if (data.deviceId) setDeviceId(data.deviceId as string);
          goTo('mfa');
        } else if (
          typeof window !== 'undefined' &&
          browserSupportsWebAuthn() &&
          localStorage.getItem('mechmind_skip_passkey') !== 'true'
        ) {
          goTo('passkey-prompt');
        } else {
          router.push(getRedirectTo());
        }
      } else if (res.status === 429) {
        setError('Troppi tentativi. Riprova tra 60 secondi.');
      } else {
        // Detect specific error messages from backend (blockLogin, account locked, etc.)
        const msg = extractErrorMessage(data, '');
        if (msg.includes('sospetta') || msg.includes('bloccato')) {
          setError('Accesso bloccato per attività sospetta. Contatta il supporto.');
        } else if (msg.includes('locked') || msg.includes('Account locked')) {
          setError('Account temporaneamente bloccato. Riprova più tardi.');
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

  // --- Trust device after MFA ---
  const trustCurrentDevice = async (): Promise<void> => {
    if (!trustDevice || !deviceId) return;
    try {
      await fetch(`/api/auth/devices/${deviceId}/trust`, { method: 'POST' });
    } catch {
      // silently fail — trust is best-effort
    }
  };

  // --- Post-MFA redirect (trust device, then passkey or redirect) ---
  const postMfaRedirect = async (): Promise<void> => {
    await trustCurrentDevice();
    if (
      typeof window !== 'undefined' &&
      browserSupportsWebAuthn() &&
      localStorage.getItem('mechmind_skip_passkey') !== 'true'
    ) {
      goTo('passkey-prompt');
    } else {
      router.push(getRedirectTo());
    }
  };

  // --- MFA verify ---
  const handleMFAVerify = async (codeToVerify?: string): Promise<void> => {
    const code = codeToVerify || (useBackupCode ? backupCode.trim() : mfaCode);
    if (!useBackupCode && code.length !== 6) return;
    if (useBackupCode && !code) return;

    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/mfa/verify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tempToken: mfaTempToken,
          token: code,
          isBackupCode: useBackupCode,
        }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        error?: string | { message?: string };
        remainingAttempts?: number;
        deviceId?: string;
      };
      if (res.ok && data.success) {
        if (data.deviceId) setDeviceId(data.deviceId);
        await postMfaRedirect();
      } else {
        const errMsg = typeof data.error === 'string' ? data.error : (data.error as { message?: string })?.message;
        setError(errMsg || 'Codice non valido. Riprova.');
        if (data.remainingAttempts !== undefined) setRemainingAttempts(data.remainingAttempts);
        setMfaCode('');
        setBackupCode('');
      }
    } catch {
      setError('Errore di connessione. Riprova.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- SMS OTP send ---
  const handleSendSmsOtp = async (): Promise<void> => {
    setIsSendingSms(true);
    setError('');
    try {
      const res = await fetch('/api/auth/sms-otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken: mfaTempToken }),
      });
      if (res.ok) {
        setSmsSent(true);
        setUseSmsOtp(true);
        setUseBackupCode(false);
        setSmsOtpCode('');
      } else {
        const data = (await res.json()) as Record<string, unknown>;
        setError(extractErrorMessage(data, 'Impossibile inviare SMS. Verifica il telefono di recupero.'));
      }
    } catch {
      setError('Errore di rete. Riprova.');
    } finally {
      setIsSendingSms(false);
    }
  };

  // --- SMS OTP verify ---
  const handleSmsOtpVerify = async (codeToVerify?: string): Promise<void> => {
    const code = codeToVerify || smsOtpCode;
    if (code.length !== 6) return;

    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/sms-otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken: mfaTempToken, code }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        error?: string | { message?: string };
        remainingAttempts?: number;
        deviceId?: string;
      };
      if (res.ok && data.success) {
        if (data.deviceId) setDeviceId(data.deviceId);
        await postMfaRedirect();
      } else {
        const errMsg = typeof data.error === 'string' ? data.error : (data.error as { message?: string })?.message;
        setError(errMsg || 'Codice SMS non valido. Riprova.');
        if (data.remainingAttempts !== undefined) setRemainingAttempts(data.remainingAttempts);
        setSmsOtpCode('');
      }
    } catch {
      setError('Errore di connessione. Riprova.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Auto-submit MFA on 6 digits ---
  useEffect(() => {
    if (!useBackupCode && !useSmsOtp && mfaCode.length === 6 && !isLoading && step === 'mfa') {
      handleMFAVerify(mfaCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mfaCode]);

  // --- Auto-submit SMS OTP on 6 digits ---
  useEffect(() => {
    if (useSmsOtp && smsOtpCode.length === 6 && !isLoading && step === 'mfa') {
      handleSmsOtpVerify(smsOtpCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [smsOtpCode]);

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

  // --- Passkey registration (post-login) ---
  const handleRegisterPasskey = async (): Promise<void> => {
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

  // --- Back behavior ---
  const showBack = step !== 'main' && step !== 'passkey-prompt';
  const handleBack = (): void => {
    if (step === 'password') goTo('main', -1);
    else if (step === 'passkey-auth') goTo('main', -1);
    else if (step === 'magic-sent') goTo('main', -1);
    else if (step === 'mfa') goTo('password', -1);
  };

  return (
    <AuthSplitLayout showBack={showBack} onBack={handleBack}>
      <GoogleOneTap onSuccess={handleGoogleLogin} />

      <AnimatePresence mode="wait" custom={direction}>
        {/* ============ STEP: Main ============ */}
        {step === 'main' && (
          <motion.div
            key="main"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            <div className="flex flex-col items-stretch gap-5">
              {/* Title */}
              <h2 className="text-center text-3xl font-normal text-[var(--text-on-brand)]">
                Accedi o registrati
              </h2>

              {/* Subtitle */}
              <p className="mb-4 px-4 text-center text-base text-[var(--text-secondary)]">
                Gestisci officina, fatture e prenotazioni da un unico pannello.
              </p>

              {/* Form */}
              <form
                className="flex flex-col gap-4"
                autoComplete="on"
                noValidate
                onSubmit={handleEmailContinue}
              >
                {/* Social buttons */}
                <SocialButtons
                  isLoading={isLoading}
                  loadingButton={loadingButton}
                  emailMissing={emailShake}
                  onGoogleClick={() => {
                    setLoadingButton('google');
                    setError('');
                    window.location.href = '/api/auth/oauth/google';
                  }}
                  onMagicLinkClick={() => {
                    if (!email.trim()) {
                      setError('Inserisci la tua email per ricevere il magic link');
                      setEmailShake(true);
                      emailInputRef.current?.focus();
                      setTimeout(() => setEmailShake(false), 500);
                      return;
                    }
                    setLoadingButton('magiclink');
                    handleMagicLink().finally(() => setLoadingButton(null));
                  }}
                />

                {/* Divider */}
                <div className="my-2 grid grid-cols-[1fr_max-content_1fr] items-center">
                  <div className="h-px bg-[var(--border-strong)]" />
                  <div className="mx-6 text-[13px] font-medium uppercase text-[var(--text-tertiary)]">
                    Oppure
                  </div>
                  <div className="h-px bg-[var(--border-strong)]" />
                </div>

                {/* Email input */}
                <div className={`relative ${emailShake ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}>
                  <label htmlFor="login-email" className="sr-only">Indirizzo e-mail</label>
                  <input
                    id="login-email"
                    ref={emailInputRef}
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(''); }}
                    placeholder="Indirizzo e-mail"
                    name="email"
                    autoComplete="username webauthn"
                    aria-describedby={error ? 'login-error' : undefined}
                    className={`${inputStyle} ${error ? 'border-[var(--text-tertiary)]' : ''}`}
                  />
                </div>

                {/* Continue button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`mt-1.5 ${btnPrimary}`}
                >
                  Continua
                </button>
              </form>

              {/* Error */}
              {error && (
                <motion.p
                  id="login-error"
                  role="alert"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-[13px] text-[var(--text-secondary)]"
                >
                  {error}
                </motion.p>
              )}

              {coldStartHint && (
                <p className="text-center text-[12px] text-[var(--text-tertiary)]">
                  Il server si sta avviando...
                </p>
              )}

              {/* Register + Demo — compact */}
              <div className="flex flex-col items-center gap-0">
                <p className="text-center text-[13px] text-[var(--text-tertiary)]">
                  Non hai un account?{' '}
                  <Link
                    href="/auth/register"
                    className="min-h-[44px] inline-flex items-center font-medium text-[var(--text-on-brand)] underline decoration-[var(--text-tertiary)] underline-offset-2 hover:decoration-white"
                  >
                    Registrati
                  </Link>
                </p>
                <button
                  type="button"
                  onClick={handleDemo}
                  disabled={isDemoLoading}
                  className="text-[13px] font-medium text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-on-brand)] min-h-[44px]"
                >
                  {isDemoLoading ? 'Caricamento demo...' : 'Prova la demo gratuita'}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ============ STEP: Passkey Auth (biometric before password — Google/Microsoft pattern) ============ */}
        {step === 'passkey-auth' && (
          <motion.div
            key="passkey-auth"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            <PasskeyAuthStep
              email={email}
              isLoading={isLoading}
              error={error}
              onAuthenticate={handlePasskeyLogin}
              onUsePassword={() => goTo('password')}
            />
          </motion.div>
        )}

        {/* ============ STEP: Password ============ */}
        {step === 'password' && (
          <motion.div
            key="password"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            <div className="flex flex-col items-stretch gap-5">
              <h2 className="text-center text-3xl font-normal text-[var(--text-on-brand)]">
                Inserisci la password
              </h2>
              <p className="mb-4 px-4 text-center text-base text-[var(--text-secondary)]">
                Per <span className="font-medium text-[var(--text-on-brand)]">{email}</span>
              </p>

              <form
                onSubmit={handlePasswordSubmit}
                className="flex flex-col gap-4"
                autoComplete="on"
              >
                {/* Hidden email field — browser needs both email+password in same form to trigger "Save password?" prompt */}
                <input
                  type="hidden"
                  name="email"
                  value={email}
                  autoComplete="username"
                />

                {/* Password input */}
                <div className="relative">
                  <label htmlFor="login-password" className="sr-only">Password</label>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Password"
                    autoFocus
                    name="password"
                    autoComplete="current-password"
                    aria-describedby={error ? 'password-error' : undefined}
                    className={`${inputStyle} pr-20 ${error ? 'border-[var(--text-tertiary)]' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-on-brand)] transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
                  >
                    {showPassword ? 'Nascondi' : 'Mostra'}
                  </button>
                </div>

                {/* Remember me */}
                <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="rounded border-[var(--border-strong)] w-4 h-4 accent-white"
                    aria-label="Ricordami su questo dispositivo"
                  />
                  <span>Ricordami su questo dispositivo</span>
                </label>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className={btnPrimary}
                >
                  {isLoading ? <span className={btnSpinner} /> : 'Accedi'}
                </button>

                {/* Divider */}
                <div className="my-2 grid grid-cols-[1fr_max-content_1fr] items-center">
                  <div className="h-px bg-[var(--border-strong)]" />
                  <div className="mx-6 text-[13px] font-medium uppercase text-[var(--text-tertiary)]">Oppure</div>
                  <div className="h-px bg-[var(--border-strong)]" />
                </div>

                {/* Magic link */}
                <button
                  type="button"
                  onClick={handleMagicLink}
                  disabled={isLoading}
                  className={btnSecondaryOutline}
                >
                  Accedi con magic link
                </button>

                {/* Forgot password */}
                <div className="text-center">
                  <Link
                    href="/auth/forgot-password"
                    className="text-[14px] font-medium text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-on-brand)] min-h-[44px] inline-flex items-center"
                  >
                    Password dimenticata?
                  </Link>
                </div>
              </form>

              {/* Error */}
              {error && (
                <motion.p
                  id="password-error"
                  role="alert"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-[13px] text-[var(--text-secondary)]"
                >
                  {error}
                </motion.p>
              )}

              {coldStartHint && (
                <p className="text-center text-[12px] text-[var(--text-tertiary)]">
                  Il server si sta avviando...
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* ============ STEP: Magic Link Sent ============ */}
        {step === 'magic-sent' && (
          <motion.div
            key="magic-sent"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            <MagicLinkSent
              email={email}
              onResend={handleResendMagicLink}
              onBackToPassword={() => goTo('password', -1)}
              isResending={isResendingMagicLink}
            />
          </motion.div>
        )}

        {/* ============ STEP: MFA ============ */}
        {step === 'mfa' && (
          <motion.div
            key="mfa"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            <div className="flex flex-col items-stretch gap-5">
              <h2 className="text-center text-3xl font-normal text-[var(--text-on-brand)]">
                Verifica in due passaggi
              </h2>
              {loginRiskLevel && loginRiskLevel !== 'low' && (
                <div className={`mx-auto flex max-w-sm items-center gap-2 rounded-lg px-4 py-2.5 text-sm ${
                  loginRiskLevel === 'critical' || loginRiskLevel === 'high'
                    ? 'bg-[var(--status-error-subtle)]0/10 text-[var(--status-error)]'
                    : 'bg-[var(--status-warning)]/100/10 text-[var(--status-warning)]'
                }`}>
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span>
                    {loginRiskLevel === 'critical' || loginRiskLevel === 'high'
                      ? 'Accesso da posizione o dispositivo insolito. Verifica la tua identità.'
                      : 'Nuovo dispositivo rilevato. Conferma la tua identità.'}
                  </span>
                </div>
              )}
              <p className="mb-4 px-4 text-center text-base text-[var(--text-secondary)]">
                {useSmsOtp
                  ? 'Inserisci il codice a 6 cifre ricevuto via SMS.'
                  : useBackupCode
                    ? 'Inserisci uno dei tuoi codici di recupero'
                    : 'Inserisci il codice a 6 cifre dalla tua app di autenticazione.'}
              </p>

              <AnimatePresence mode="wait">
                {useSmsOtp ? (
                  <motion.div
                    key="sms-otp"
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
                    key="backup"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <label htmlFor="mfa-backup" className="sr-only">Codice di recupero</label>
                    <input
                      id="mfa-backup"
                      type="text"
                      value={backupCode}
                      onChange={e => setBackupCode(e.target.value)}
                      placeholder="Codice di recupero"
                      autoFocus
                      className={inputStyle}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="otp"
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
                  role="alert"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-[13px] text-[var(--text-secondary)]"
                >
                  {error}
                </motion.p>
              )}

              {remainingAttempts !== null && remainingAttempts > 0 && (
                <p className="text-center text-[12px] text-[var(--text-tertiary)]">
                  Tentativi rimasti: {remainingAttempts}
                </p>
              )}

              {remainingAttempts === 0 && (
                <p className="text-center text-[13px] text-[var(--text-secondary)]">
                  Troppi tentativi.{' '}
                  <Link href="/auth/locked" className="underline">
                    Account bloccato
                  </Link>
                </p>
              )}

              {/* Trust device checkbox */}
              <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer min-h-[44px]">
                <input
                  type="checkbox"
                  checked={trustDevice}
                  onChange={e => setTrustDevice(e.target.checked)}
                  className="rounded border-[var(--border-strong)] w-4 h-4 accent-white"
                  aria-label="Fidati di questo dispositivo per 30 giorni"
                />
                <span>Fidati di questo dispositivo per 30 giorni</span>
              </label>

              {/* Verify button */}
              <button
                type="button"
                onClick={() => useSmsOtp ? handleSmsOtpVerify() : handleMFAVerify()}
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

              {/* MFA method switchers */}
              <div className="flex flex-col items-center gap-1">
                {!useSmsOtp && (
                  <button
                    type="button"
                    onClick={() => {
                      setUseBackupCode(!useBackupCode);
                      setUseSmsOtp(false);
                      setError('');
                      setMfaCode('');
                      setBackupCode('');
                    }}
                    className="text-[14px] font-medium text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-on-brand)] min-h-[44px]"
                  >
                    {useBackupCode ? 'Usa codice authenticator' : 'Usa codice di recupero'}
                  </button>
                )}

                {useSmsOtp ? (
                  <button
                    type="button"
                    onClick={() => {
                      setUseSmsOtp(false);
                      setSmsOtpCode('');
                      setError('');
                    }}
                    className="text-[14px] font-medium text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-on-brand)] min-h-[44px]"
                  >
                    Usa codice authenticator
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendSmsOtp}
                    disabled={isSendingSms}
                    className="text-[14px] font-medium text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-on-brand)] min-h-[44px] flex items-center gap-1.5"
                  >
                    {isSendingSms ? (
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border border-[var(--text-tertiary)] border-t-transparent" />
                    ) : null}
                    {smsSent ? 'Rinvia codice via SMS' : 'Ricevi codice via SMS'}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ============ STEP: Passkey Registration Prompt ============ */}
        {step === 'passkey-prompt' && (
          <motion.div
            key="passkey-prompt"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            <PasskeyPrompt
              onRegister={handleRegisterPasskey}
              onSkip={() => router.push(getRedirectTo())}
              isRegistering={isRegisteringPasskey}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </AuthSplitLayout>
  );
}
