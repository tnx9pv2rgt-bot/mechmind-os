'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Eye, EyeOff, Loader2,
  CheckCircle2, AlertCircle, Fingerprint,
} from 'lucide-react';
import Script from 'next/script';
import { browserSupportsWebAuthn, startAuthentication, startRegistration } from '@simplewebauthn/browser';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

function extractErrorMessage(
  data: Record<string, unknown>,
  fallback: string,
): string {
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
      className="flex w-full items-center justify-center rounded-full bg-[#0d0d0d] dark:bg-[#ececec] text-white dark:text-[#0d0d0d] h-[56px] text-[15px] font-semibold hover:bg-[#2f2f2f] dark:hover:bg-[#d9d9d9] active:bg-[#424242] dark:active:bg-[#c0c0c0] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
    >
      {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : children}
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
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  autoFocus?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;
  const hasValue = value.length > 0;
  const isFloating = focused || hasValue;

  return (
    <div className="w-full">
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
          {label}
        </label>
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoFocus={autoFocus}
          className={`w-full bg-transparent rounded-2xl px-4 pt-6 pb-2 text-[15px] text-[#0d0d0d] dark:text-[#ececec] focus:outline-none ${
            isPassword ? 'pr-12' : ''
          }`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#636366] hover:text-[#0d0d0d] dark:hover:text-[#ececec] transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        )}
      </div>
      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-2 flex items-center gap-1.5 text-[13px] text-red-600 dark:text-red-400"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
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
    (window as unknown as Record<string, unknown>).__handleGoogleSignIn = (response: { credential: string }) => {
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
    return () => { console.error = originalError; };
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
    } catch { setGsiError(true); }
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
  const router = useRouter();

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
      if (res.ok && data.success) router.push('/dashboard');
      else setError(extractErrorMessage(data, "Account non trovato. Contatta l'amministratore."));
    } catch { setError('Errore di rete. Riprova.'); }
    finally { setIsLoading(false); }
  }, [router]);

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
        const d = (await optionsRes.json().catch(() => ({}))) as { error?: string | { message?: string } };
        const msg = typeof d.error === 'string' ? d.error : d.error?.message;
        setError(msg || 'Nessuna passkey registrata.');
        return;
      }
      const options = await optionsRes.json();
      const { startAuthentication } = await import('@simplewebauthn/browser');
      const assertion = await startAuthentication(options as Parameters<typeof startAuthentication>[0]);
      const verifyRes = await fetch('/api/auth/passkey/authenticate-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assertion, sessionId: (options as Record<string, unknown>).sessionId }),
      });
      const data = (await verifyRes.json()) as { success?: boolean; error?: string };
      if (verifyRes.ok && data.success) router.push('/dashboard');
      else setError(data.error || 'Autenticazione fallita.');
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'NotAllowedError') setError('Autenticazione annullata.');
      else setError('Nessuna passkey trovata su questo dispositivo.');
    } finally { setIsLoading(false); }
  }, [router]);

  // --- Email continue ---
  const handleEmailContinue = () => {
    if (!tenantSlug.trim()) { setError("Inserisci lo slug dell'officina"); return; }
    if (!email.trim()) { setError('Inserisci la tua email'); return; }
    setError('');
    setStep('password');
  };

  // --- Password submit ---
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) { setError('Inserisci la password'); return; }
    setIsLoading(true);
    setError('');
    setColdStartHint(false);
    const timer = setTimeout(() => setColdStartHint(true), 5000);
    try {
      const res = await fetch('/api/auth/password/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, tenantSlug }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (res.ok) {
        if (data.requiresMFA) router.push('/auth/mfa/verify?token=' + (data.tempToken as string));
        else if (typeof window !== 'undefined' && browserSupportsWebAuthn()) setStep('passkey-prompt');
        else router.push('/dashboard');
      } else {
        setError(extractErrorMessage(data, 'Email o password non corretta'));
      }
    } catch { setError('Errore di rete. Riprova.'); }
    finally { clearTimeout(timer); setColdStartHint(false); setIsLoading(false); }
  };

  // --- Magic link ---
  const handleMagicLink = async () => {
    if (!tenantSlug.trim()) { setError("Inserisci lo slug dell'officina"); return; }
    if (!email.trim()) { setError('Inserisci la tua email'); return; }
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
    } catch { setError('Errore di rete. Riprova.'); }
    finally { clearTimeout(timer); setColdStartHint(false); setIsLoading(false); }
  };

  // --- Passkey registration ---
  const handleRegisterPasskey = async () => {
    setIsRegisteringPasskey(true);
    try {
      const optionsRes = await fetch('/api/auth/passkey/register-options', { method: 'POST' });
      if (!optionsRes.ok) { router.push('/dashboard'); return; }
      const optionsData = (await optionsRes.json()) as { options: Parameters<typeof startRegistration>[0]; sessionId: string };
      const attestation = await startRegistration(optionsData.options);
      await fetch('/api/auth/passkey/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attestation, sessionId: optionsData.sessionId,
          deviceName: navigator.userAgent.includes('iPhone') ? 'iPhone' :
                      navigator.userAgent.includes('iPad') ? 'iPad' :
                      navigator.userAgent.includes('Mac') ? 'Mac' : 'Dispositivo',
        }),
      });
      router.push('/dashboard');
    } catch { router.push('/dashboard'); }
    finally { setIsRegisteringPasskey(false); }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#f4f4f4] dark:bg-[#212121] overflow-hidden">
      <GoogleOneTap onSuccess={handleGoogleLogin} />

      {/* ===== iOS Expand Overlay ===== */}
      <AnimatePresence>
        {expanding && expandRect && (
          <motion.div
            className="fixed z-50 bg-[#f4f4f4] dark:bg-[#212121]"
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
      <header className="relative flex items-center justify-center px-6 pt-6 pb-2">
        {step !== 'methods' && step !== 'magic-sent' && step !== 'passkey-prompt' && (
          <button onClick={handleBack} className="absolute left-6 text-[15px] font-medium text-[#0d0d0d] dark:text-[#ececec] hover:opacity-50 transition-opacity">
            &larr; Indietro
          </button>
        )}
        <span className="text-[15px] font-semibold text-[#0d0d0d] dark:text-[#ececec]">MechMind OS</span>
      </header>

      {/* Content */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-12">
        <div className="w-full max-w-[440px]">
          <AnimatePresence mode="wait">

            {/* ============ STEP: Methods ============ */}
            {step === 'methods' && (
              <motion.div
                key="methods"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: showContent ? 1 : 0, scale: showContent ? 1 : 0.96 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                {/* Title */}
                <div className="text-center mb-8">
                  <h1 className="text-[28px] font-bold text-[#0d0d0d] dark:text-[#ececec] tracking-tight">
                    Benvenuto in MechMind
                  </h1>
                  <p className="mt-2 text-[15px] text-[#636366] dark:text-[#636366] leading-relaxed">
                    Gestisci la tua officina in modo semplice e veloce.
                  </p>
                </div>

                {/* Method buttons */}
                <div className="space-y-3">
                  <button
                    ref={(el) => { buttonRefs.current['accedi'] = el; }}
                    onClick={() => handleMethodClick('accedi', 'email')}
                    className="flex w-3/4 mx-auto items-center justify-center rounded-full border border-[#e5e5e5] dark:border-[#424242] bg-white dark:bg-[#2f2f2f] px-5 h-[50px] text-[15px] font-medium text-[#0d0d0d] dark:text-[#ececec] hover:bg-[#ebebeb] dark:hover:bg-[#3a3a3a] active:scale-[0.97] transition-all"
                  >
                    Accedi
                  </button>

                  <button
                    ref={(el) => { buttonRefs.current['registrati'] = el; }}
                    onClick={() => handleMethodClick('registrati', 'register')}
                    className="flex w-3/4 mx-auto items-center justify-center rounded-full border border-[#e5e5e5] dark:border-[#424242] bg-white dark:bg-[#2f2f2f] px-5 h-[50px] text-[15px] font-medium text-[#0d0d0d] dark:text-[#ececec] hover:bg-[#ebebeb] dark:hover:bg-[#3a3a3a] active:scale-[0.97] transition-all"
                  >
                    Registrati
                  </button>

                  <button
                    type="button"
                    className="w-full text-center text-[14px] font-medium text-[#636366] dark:text-[#636366] hover:text-[#0d0d0d] dark:hover:text-[#ececec] transition-colors pt-2"
                    onClick={async () => {
                      localStorage.setItem('mechmind_demo', 'true');
                      localStorage.setItem('mechmind_demo_clicks', '0');
                      try {
                        await fetch('/api/auth/demo-session', { method: 'POST', credentials: 'include' });
                      } catch { /* ignore */ }
                      router.push('/demo');
                    }}
                  >
                    Prima provalo
                  </button>
                </div>

                {/* Error */}
                {error && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-[13px] text-red-600 dark:text-red-400">
                    {error}
                  </motion.p>
                )}
              </motion.div>
            )}

            {/* ============ STEP: Email ============ */}
            {step === 'email' && (
              <motion.div
                key="email"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: showContent ? 1 : 0, scale: showContent ? 1 : 0.96 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.3, delay: 0.05 }}
                className="space-y-5"
              >
                <div className="text-center mb-6">
                  <h1 className="text-[28px] font-bold text-[#0d0d0d] dark:text-[#ececec] tracking-tight">
                    Inserisci le tue credenziali
                  </h1>
                </div>

                <div className="space-y-4">
                  <FloatingInput
                    label="Slug officina"
                    value={tenantSlug}
                    onChange={setTenantSlug}
                    autoFocus
                  />
                  <FloatingInput
                    label="Indirizzo e-mail"
                    type="email"
                    value={email}
                    onChange={setEmail}
                    error={error}
                  />
                </div>

                <PrimaryButton onClick={handleEmailContinue}>
                  Continua
                </PrimaryButton>

                <div className="text-center">
                  <button
                    onClick={handleMagicLink}
                    disabled={isLoading}
                    className="text-[14px] font-medium text-[#636366] dark:text-[#636366] hover:text-[#0d0d0d] dark:hover:text-[#ececec] transition-colors"
                  >
                    {isLoading ? 'Invio...' : 'Invia magic link invece'}
                  </button>
                </div>

                {coldStartHint && (
                  <p className="text-center text-[12px] text-[#6b6b6b] dark:text-[#6e6e6e]">
                    Il server si sta avviando...
                  </p>
                )}
              </motion.div>
            )}

            {/* ============ STEP: Password ============ */}
            {step === 'password' && (
              <motion.div
                key="password"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <form onSubmit={handlePasswordSubmit} className="space-y-5">
                  <div className="text-center mb-6">
                    <h1 className="text-[28px] font-bold text-[#0d0d0d] dark:text-[#ececec] tracking-tight">
                      Inserisci la password
                    </h1>
                    <p className="mt-2 text-[15px] text-[#636366] dark:text-[#636366]">
                      {email}
                    </p>
                  </div>

                  <FloatingInput
                    label="Password"
                    type="password"
                    value={password}
                    onChange={setPassword}
                    error={error}
                    autoFocus
                  />

                  <PrimaryButton type="submit" isLoading={isLoading}>
                    {isLoading ? 'Accesso...' : 'Continua'}
                  </PrimaryButton>

                  <div className="text-center">
                    <Link
                      href="/auth/forgot-password"
                      className="text-[14px] font-medium text-[#636366] dark:text-[#636366] hover:text-[#0d0d0d] dark:hover:text-[#ececec] transition-colors"
                    >
                      Password dimenticata?
                    </Link>
                  </div>

                  {coldStartHint && (
                    <p className="text-center text-[12px] text-[#6b6b6b] dark:text-[#6e6e6e]">
                      Il server si sta avviando...
                    </p>
                  )}
                </form>
              </motion.div>
            )}

            {/* ============ STEP: Magic Link Sent ============ */}
            {step === 'magic-sent' && (
              <motion.div
                key="magic-sent"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="text-center space-y-5"
              >
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#0d0d0d] dark:bg-[#ececec]">
                  <CheckCircle2 className="h-7 w-7 text-white dark:text-[#0d0d0d]" />
                </div>
                <h1 className="text-[28px] font-bold text-[#0d0d0d] dark:text-[#ececec] tracking-tight">
                  Controlla la tua email
                </h1>
                <p className="text-[15px] text-[#636366] dark:text-[#636366] leading-relaxed max-w-[320px] mx-auto">
                  Abbiamo inviato un link di accesso a <strong className="text-[#0d0d0d] dark:text-[#ececec]">{email}</strong>
                </p>
                <button
                  onClick={() => { setStep('methods'); setError(''); }}
                  className="text-[14px] font-medium text-[#636366] dark:text-[#636366] hover:text-[#0d0d0d] dark:hover:text-[#ececec] transition-colors"
                >
                  Torna al login
                </button>
              </motion.div>
            )}

            {/* ============ STEP: Passkey Registration Prompt ============ */}
            {step === 'passkey-prompt' && (
              <motion.div
                key="passkey-prompt"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="text-center space-y-5"
              >
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#0d0d0d] dark:bg-[#ececec]">
                  <Fingerprint className="h-7 w-7 text-white dark:text-[#0d0d0d]" />
                </div>
                <h1 className="text-[28px] font-bold text-[#0d0d0d] dark:text-[#ececec] tracking-tight">
                  Attiva accesso rapido
                </h1>
                <p className="text-[15px] text-[#636366] dark:text-[#636366] leading-relaxed max-w-[320px] mx-auto">
                  {`Vuoi attivare Face ID / Touch ID per accedere pi\u00F9 velocemente?`}
                </p>
                <PrimaryButton onClick={handleRegisterPasskey} isLoading={isRegisteringPasskey}>
                  <Fingerprint className="h-5 w-5 mr-2" /> Attiva
                </PrimaryButton>
                <button
                  onClick={() => router.push('/dashboard')}
                  disabled={isRegisteringPasskey}
                  className="text-[14px] font-medium text-[#636366] dark:text-[#636366] hover:text-[#0d0d0d] dark:hover:text-[#ececec] transition-colors"
                >
                  Forse dopo
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="flex items-center justify-center gap-3 px-6 pb-6 pt-2">
        <Link href="/terms" className="text-[13px] text-[#6b6b6b] dark:text-[#6e6e6e] hover:text-[#0d0d0d] dark:hover:text-[#ececec] transition-colors">
          Condizioni d&apos;uso
        </Link>
        <span className="text-[#d9d9d9] dark:text-[#424242]">|</span>
        <Link href="/privacy" className="text-[13px] text-[#6b6b6b] dark:text-[#6e6e6e] hover:text-[#0d0d0d] dark:hover:text-[#ececec] transition-colors">
          Informativa sulla privacy
        </Link>
      </footer>
    </div>
  );
}
