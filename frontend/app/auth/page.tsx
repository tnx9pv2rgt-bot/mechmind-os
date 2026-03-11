'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Mail, Lock, Eye, EyeOff, ArrowRight, Loader2,
  CheckCircle2, AlertCircle, Fingerprint, Shield,
  KeyRound, Car, Wrench, Users, BarChart3, Clock, ShieldCheck,
  Building2
} from 'lucide-react';
import Script from 'next/script';
import { browserSupportsWebAuthn, startAuthentication, startRegistration } from '@simplewebauthn/browser';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Google Client ID from env
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

// Utility
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } },
};

// iOS Input Component
interface IOSInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  error?: string;
}

function IOSInput({ label, icon, error, className, type = 'text', ...props }: IOSInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="w-full">
      {label && (
        <label className="mb-2 block text-sm font-medium text-foreground/80">{label}</label>
      )}
      <div className={cn(
        'group relative flex items-center overflow-hidden rounded-2xl bg-white/50 backdrop-blur-sm transition-all duration-300',
        'border border-white/30 shadow-sm',
        'focus-within:border-apple-blue/50 focus-within:bg-white/80 focus-within:shadow-md',
        'hover:bg-white/60',
        error && 'border-apple-red/50',
        className
      )}>
        {icon && (
          <div className="pointer-events-none absolute left-4 flex items-center justify-center text-foreground/40 transition-colors group-focus-within:text-apple-blue">
            {icon}
          </div>
        )}
        <input
          type={inputType}
          className={cn(
            'h-14 w-full bg-transparent px-4 text-body text-foreground placeholder:text-foreground/40',
            'focus:outline-none',
            icon && 'pl-12',
            isPassword && 'pr-12'
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 flex h-8 w-8 items-center justify-center rounded-full text-foreground/40 hover:bg-foreground/5"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        )}
      </div>
      {error && (
        <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-2 flex items-center gap-1.5 text-sm text-apple-red">
          <AlertCircle className="h-4 w-4" /> {error}
        </motion.p>
      )}
    </div>
  );
}

// Apple Button
interface AppleButtonProps {
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'passkey';
  size?: 'default' | 'lg' | 'xl';
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

function AppleButton({ children, variant = 'primary', size = 'default', isLoading, disabled, className, onClick, type }: AppleButtonProps) {
  const variants = {
    primary: 'bg-apple-blue text-white hover:bg-apple-blue-hover shadow-lg shadow-apple-blue/25',
    secondary: 'bg-white/80 text-apple-dark hover:bg-white shadow-md backdrop-blur-sm',
    outline: 'bg-transparent text-apple-dark border border-foreground/20 hover:bg-foreground/5',
    passkey: 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/25',
  };

  const sizes = {
    default: 'h-12 px-6 text-base',
    lg: 'h-14 px-8 text-lg',
    xl: 'h-16 px-10 text-lg',
  };

  return (
    <motion.button
      whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
      className={cn(
        'relative inline-flex items-center justify-center rounded-2xl font-medium transition-all duration-300',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-apple-blue',
        variants[variant as keyof typeof variants],
        sizes[size as keyof typeof sizes],
        (disabled || isLoading) && 'opacity-50 cursor-not-allowed',
        className
      )}
      disabled={disabled || isLoading}
      onClick={onClick}
      type={type}
    >
      {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : children}
    </motion.button>
  );
}

// Passkey Button (56px - dirty hands friendly)
function PasskeyButton({ onClick, isLoading, loadingText }: { onClick: () => void; isLoading: boolean; loadingText?: string }) {
  const [supportsPasskey, setSupportsPasskey] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Check passkey support only on client
    if (typeof window !== 'undefined') {
      import('@simplewebauthn/browser').then(({ browserSupportsWebAuthn }) => {
        setSupportsPasskey(browserSupportsWebAuthn());
        setChecked(true);
      });
    }
  }, []);

  // Show skeleton while checking support
  if (!checked) {
    return (
      <div className="h-16 w-full animate-pulse rounded-2xl bg-blue-100/50" />
    );
  }

  if (!supportsPasskey) {
    return (
      <div className="rounded-2xl bg-amber-50 p-4 text-center text-sm text-amber-700">
        <AlertCircle className="mx-auto mb-2 h-5 w-5" />
        Il tuo dispositivo non supporta l&apos;accesso biometrico
      </div>
    );
  }

  return (
    <AppleButton
      onClick={onClick}
      disabled={isLoading}
      variant="passkey"
      size="xl"
      className="w-full gap-3"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">{loadingText || 'Caricamento...'}</span>
        </>
      ) : (
        <>
          <Fingerprint className="h-6 w-6" />
          <div className="flex flex-col items-start">
            <span className="text-base font-semibold">Accedi con FaceID / TouchID</span>
            <span className="text-xs opacity-80">Il modo più sicuro e veloce</span>
          </div>
        </>
      )}
    </AppleButton>
  );
}

// Google Sign-In Button
function GoogleSignInButton({ onSuccess, isLoading }: { onSuccess: (credential: string) => void; isLoading: boolean }) {
  const [gsiReady, setGsiReady] = useState(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || typeof window === 'undefined') return;

    // Define the callback globally
    (window as unknown as Record<string, unknown>).__handleGoogleSignIn = (response: { credential: string }) => {
      onSuccess(response.credential);
    };

    // Check if GSI is already loaded
    if ((window as unknown as Record<string, unknown>).google) {
      setGsiReady(true);
    }
  }, [onSuccess]);

  useEffect(() => {
    if (!gsiReady || !GOOGLE_CLIENT_ID) return;

    const google = (window as unknown as Record<string, unknown>).google as {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (element: HTMLElement, config: Record<string, unknown>) => void;
        };
      };
    };

    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (window as unknown as Record<string, unknown>).__handleGoogleSignIn,
      auto_select: false,
      itp_support: true,
    });

    const buttonEl = document.getElementById('google-signin-btn');
    if (buttonEl) {
      google.accounts.id.renderButton(buttonEl, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        width: 380,
        logo_alignment: 'left',
        locale: 'it',
      });
    }
  }, [gsiReady]);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setGsiReady(true)}
      />
      <div className="w-full">
        {isLoading ? (
          <div className="flex h-11 w-full items-center justify-center rounded-full border border-foreground/10 bg-white">
            <Loader2 className="h-5 w-5 animate-spin text-apple-gray" />
          </div>
        ) : (
          <div id="google-signin-btn" className="flex justify-center [&>div]:w-full" />
        )}
      </div>
    </>
  );
}

// OAuth Buttons Section (Google only)
function OAuthButtons({ onGoogleLogin, isLoadingGoogle }: {
  onGoogleLogin: (credential: string) => void;
  isLoadingGoogle: boolean;
}) {
  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div className="space-y-3">
      <GoogleSignInButton onSuccess={onGoogleLogin} isLoading={isLoadingGoogle} />
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-foreground/10" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white/70 px-3 text-apple-gray">oppure</span>
        </div>
      </div>
    </div>
  );
}

// Magic Link Form
function MagicLinkForm() {
  const [email, setEmail] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState('');
  const [coldStartHint, setColdStartHint] = useState(false);

  const handleSend = async () => {
    if (!email) {
      setError('Inserisci la tua email');
      return;
    }
    if (!tenantSlug) {
      setError('Inserisci lo slug dell\'officina');
      return;
    }

    setIsLoading(true);
    setError('');
    setColdStartHint(false);

    // Show cold start hint after 5 seconds
    const coldStartTimer = setTimeout(() => setColdStartHint(true), 5000);

    try {
      const res = await fetch('/api/auth/magic-link/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, tenantSlug }),
      });

      if (res.ok) {
        setIsSent(true);
      } else {
        const data = (await res.json()) as { error?: string | { code?: string; message?: string } };
        const errMsg = typeof data.error === 'string' ? data.error : data.error?.message;
        setError(errMsg || 'Errore durante l\'invio');
      }
    } catch (err) {
      setError('Errore di rete. Riprova.');
    } finally {
      clearTimeout(coldStartTimer);
      setColdStartHint(false);
      setIsLoading(false);
    }
  };

  if (isSent) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
        <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-green-500" />
        <h3 className="mb-2 text-lg font-semibold">Email inviata!</h3>
        <p className="text-sm text-apple-gray">Controlla la tua casella di posta e clicca il link per accedere.</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <IOSInput
        label="Slug officina"
        type="text"
        placeholder="garage-roma"
        icon={<Building2 className="h-5 w-5" />}
        value={tenantSlug}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTenantSlug(e.target.value)}
      />
      <IOSInput
        label="Email"
        type="email"
        placeholder="tu@officina.it"
        icon={<Mail className="h-5 w-5" />}
        value={email}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
        error={error}
      />
      <AppleButton onClick={handleSend} isLoading={isLoading} disabled={!email || !tenantSlug} className="w-full">
        Invia link di accesso <ArrowRight className="ml-2 h-5 w-5" />
      </AppleButton>
      {coldStartHint && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-xs text-apple-gray">
          Il server si sta avviando...
        </motion.p>
      )}
    </div>
  );
}

// Passkey Registration Prompt (shown after successful password login)
function PasskeyRegistrationPrompt({
  onRegister,
  onSkip,
  isRegistering
}: {
  onRegister: () => void;
  onSkip: () => void;
  isRegistering: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-4"
    >
      <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-green-400 to-green-600 text-white shadow-lg shadow-green-500/30">
        <Fingerprint className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-semibold text-apple-dark">
        Attiva accesso rapido
      </h3>
      <p className="text-sm text-apple-gray leading-relaxed">
        Vuoi attivare Touch ID / Face ID per accedere più velocemente la prossima volta?
      </p>
      <div className="space-y-3 pt-2">
        <AppleButton
          onClick={onRegister}
          isLoading={isRegistering}
          variant="passkey"
          size="lg"
          className="w-full gap-2"
        >
          <Fingerprint className="h-5 w-5" />
          Attiva Touch ID / Face ID
        </AppleButton>
        <button
          onClick={onSkip}
          disabled={isRegistering}
          className="w-full text-sm text-apple-gray hover:text-apple-dark transition-colors py-2"
        >
          Forse dopo
        </button>
      </div>
    </motion.div>
  );
}

// Password Form
function PasswordForm() {
  const [tenantSlug, setTenantSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [coldStartHint, setColdStartHint] = useState(false);
  const [showPasskeyPrompt, setShowPasskeyPrompt] = useState(false);
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false);
  const [supportsPasskey, setSupportsPasskey] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSupportsPasskey(browserSupportsWebAuthn());
    }
  }, []);

  const handleRegisterPasskey = async () => {
    setIsRegisteringPasskey(true);
    try {
      // Get registration options (requires auth cookie set from login)
      const optionsRes = await fetch('/api/auth/passkey/register-options', {
        method: 'POST',
      });
      if (!optionsRes.ok) {
        // Skip silently - user can register later from settings
        router.push('/dashboard');
        return;
      }
      const optionsData = (await optionsRes.json()) as { options: Parameters<typeof startRegistration>[0]; sessionId: string };

      // Trigger biometric enrollment
      const attestation = await startRegistration(optionsData.options);

      // Verify and save
      const verifyRes = await fetch('/api/auth/passkey/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attestation,
          sessionId: optionsData.sessionId,
          deviceName: navigator.userAgent.includes('iPhone') ? 'iPhone' :
                      navigator.userAgent.includes('iPad') ? 'iPad' :
                      navigator.userAgent.includes('Mac') ? 'Mac' : 'Dispositivo',
        }),
      });

      if (verifyRes.ok) {
        // Passkey registered - go to dashboard
        router.push('/dashboard');
      } else {
        // Registration failed - just go to dashboard
        router.push('/dashboard');
      }
    } catch {
      // User cancelled or error - just go to dashboard
      router.push('/dashboard');
    } finally {
      setIsRegisteringPasskey(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setColdStartHint(false);

    // Show cold start hint after 5 seconds
    const coldStartTimer = setTimeout(() => setColdStartHint(true), 5000);

    try {
      const res = await fetch('/api/auth/password/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, tenantSlug }),
      });

      const data = (await res.json()) as { requiresMFA?: boolean; tempToken?: string; error?: string | { code?: string; message?: string } };

      if (res.ok) {
        if (data.requiresMFA) {
          router.push('/auth/mfa/verify?token=' + data.tempToken);
        } else if (supportsPasskey) {
          // Show passkey registration prompt before redirecting
          setShowPasskeyPrompt(true);
        } else {
          router.push('/dashboard');
        }
      } else {
        const errMsg = typeof data.error === 'string' ? data.error : data.error?.message;
        setError(errMsg || 'Credenziali non valide');
      }
    } catch (err) {
      setError('Errore di rete. Riprova.');
    } finally {
      clearTimeout(coldStartTimer);
      setColdStartHint(false);
      setIsLoading(false);
    }
  };

  if (showPasskeyPrompt) {
    return (
      <PasskeyRegistrationPrompt
        onRegister={handleRegisterPasskey}
        onSkip={() => router.push('/dashboard')}
        isRegistering={isRegisteringPasskey}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <IOSInput
        label="Slug officina"
        type="text"
        placeholder="garage-roma"
        icon={<Building2 className="h-5 w-5" />}
        value={tenantSlug}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTenantSlug(e.target.value)}
      />
      <IOSInput
        label="Email"
        type="email"
        placeholder="tu@officina.it"
        icon={<Mail className="h-5 w-5" />}
        value={email}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
      />
      <IOSInput
        label="Password"
        type="password"
        placeholder="••••••••"
        icon={<Lock className="h-5 w-5" />}
        value={password}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
      />
      
      <div className="flex items-center justify-between">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded border-foreground/20"
          />
          <span className="text-sm text-apple-gray">Ricordami</span>
        </label>
        <Link href="/auth/forgot-password" className="text-sm font-medium text-apple-blue hover:underline">
          Password dimenticata?
        </Link>
      </div>

      {error && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-sm text-apple-red">
          <AlertCircle className="h-4 w-4" /> {error}
        </motion.p>
      )}

      <AppleButton type="submit" size="lg" isLoading={isLoading} className="w-full">
        {isLoading ? 'Accesso in corso...' : 'Accedi con password'}
      </AppleButton>
      {coldStartHint && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-xs text-apple-gray">
          Il server si sta avviando...
        </motion.p>
      )}
    </form>
  );
}

// Desktop Preview Component (Right Side) - Client Only
function DesktopPreview() {
  const features = [
    { icon: Car, text: 'Gestione veicoli completa' },
    { icon: Wrench, text: 'Ordini di riparazione digitali' },
    { icon: Users, text: 'CRM clienti integrato' },
    { icon: BarChart3, text: 'Reportistica avanzata' },
    { icon: Clock, text: 'Appuntamenti e scadenze' },
    { icon: ShieldCheck, text: 'Conformità GDPR' },
  ];

  return (
    <div className="hidden lg:flex w-1/2 bg-zinc-950 flex-col justify-center items-center relative overflow-hidden">
      {/* Background gradient - Apple style subtle */}
      <div className="absolute inset-0 bg-black" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/5 rounded-full blur-[150px]" />
      
      <div className="relative z-10 flex flex-col items-center text-center max-w-lg px-12">
        {/* Logo - Apple minimal */}
        <div className="mb-16">
          <h2 className="text-2xl font-semibold text-white tracking-tight">MechMind OS</h2>
        </div>

        {/* Headline - Apple style large typography */}
        <h1 className="text-5xl xl:text-6xl font-semibold text-white leading-[1.1] tracking-tight mb-6">
          Il tuo lavoro.
          <br />
          <span className="text-zinc-500">Semplice.</span>
        </h1>
        
        <p className="text-xl text-zinc-400 mb-16 font-light leading-relaxed max-w-md">
          Tutto ciò di cui hai bisogno per gestire veicoli, clienti e ordini. In un unico posto.
        </p>

        {/* Dashboard Mockup - Apple style clean */}
        <div className="relative mb-16 rounded-3xl overflow-hidden bg-zinc-900/80 border border-zinc-800/50 shadow-2xl shadow-black/50 w-full">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-zinc-800/50">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-zinc-700" />
              <div className="w-3 h-3 rounded-full bg-zinc-700" />
              <div className="w-3 h-3 rounded-full bg-zinc-700" />
            </div>
          </div>
          <div className="p-6 grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-3">
              <div className="h-20 rounded-2xl bg-zinc-800/50 p-4 text-left">
                <div className="text-xs text-zinc-500 mb-1 font-medium tracking-wide uppercase">In officina</div>
                <div className="text-3xl font-semibold text-white">24</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="h-16 rounded-2xl bg-zinc-800/50 p-3 text-left">
                  <div className="text-xs text-zinc-500 mb-1">Ordini</div>
                  <div className="text-xl font-semibold text-white">12</div>
                </div>
                <div className="h-16 rounded-2xl bg-zinc-800/50 p-3 text-left">
                  <div className="text-xs text-zinc-500 mb-1">Clienti</div>
                  <div className="text-xl font-semibold text-white">156</div>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-12 rounded-xl bg-zinc-800/30 flex items-center gap-2 px-3">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Car className="h-3 w-3 text-blue-400" />
                </div>
                <div className="text-xs text-zinc-300">Fiat 500</div>
              </div>
              <div className="h-12 rounded-xl bg-zinc-800/30 flex items-center gap-2 px-3">
                <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Car className="h-3 w-3 text-purple-400" />
                </div>
                <div className="text-xs text-zinc-300">BMW X5</div>
              </div>
              <div className="h-12 rounded-xl bg-zinc-800/30 flex items-center gap-2 px-3">
                <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Car className="h-3 w-3 text-green-400" />
                </div>
                <div className="text-xs text-zinc-300">Audi A3</div>
              </div>
            </div>
          </div>
        </div>

        {/* Features - Apple style centered list */}
        <div className="flex flex-col items-center gap-3">
          {features.map((feature, i) => (
            <div key={i} className="flex items-center justify-center gap-3 text-zinc-300">
              <feature.icon className="h-4 w-4 text-zinc-500" />
              <span className="text-sm font-medium">{feature.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ClientOnly wrapper to prevent hydration mismatches
function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    // Return a placeholder that matches SSR
    return <div className="hidden lg:flex w-1/2 bg-zinc-950" />;
  }
  
  return <>{children}</>;
}

// Auth Form Component - Purely client-side
interface AuthFormProps {
  activeMethod: 'passkey' | 'magic' | 'password';
  setActiveMethod: (method: 'passkey' | 'magic' | 'password') => void;
  isLoadingPasskey: boolean;
  passkeyLoadingText: string;
  passkeyError: string;
  handlePasskeyLogin: () => void;
  handleGoogleLogin: (credential: string) => void;
  isLoadingGoogle: boolean;
  oauthError: string;
}

function AuthForm({
  activeMethod,
  setActiveMethod,
  isLoadingPasskey,
  passkeyLoadingText,
  passkeyError,
  handlePasskeyLogin,
  handleGoogleLogin,
  isLoadingGoogle,
  oauthError,
}: AuthFormProps) {
  return (
    <motion.div variants={cardVariants} initial="hidden" animate="visible" className="w-full max-w-[420px]">
      <div className="relative overflow-hidden rounded-[32px] bg-white/70 p-8 shadow-2xl shadow-apple-dark/5 backdrop-blur-3xl ring-1 ring-white/50 sm:p-10">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-transparent" />
        <div className="pointer-events-none absolute inset-0 rounded-[32px] ring-1 ring-inset ring-white/60" />

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="relative">
          {/* Header */}
          <motion.div variants={itemVariants} className="mb-8 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-apple-blue to-blue-600 text-white shadow-lg shadow-blue-500/30">
              <Shield className="h-8 w-8" />
            </div>
            <h1 className="text-title-1 font-semibold tracking-tight text-apple-dark">MechMind OS</h1>
            <p className="mt-2 text-body text-apple-gray">Accedi al tuo gestionale</p>
          </motion.div>

          {/* Google Sign-In (primary) */}
          <motion.div variants={itemVariants} className="mb-6">
            <OAuthButtons
              onGoogleLogin={handleGoogleLogin}
              isLoadingGoogle={isLoadingGoogle}
            />
            {oauthError && (
              <p className="mt-2 text-center text-sm text-apple-red">{oauthError}</p>
            )}
          </motion.div>

          {/* Method Selector */}
          <motion.div variants={itemVariants} className="mb-6">
            <div className="flex rounded-xl bg-white/40 p-1 backdrop-blur-sm">
              {[
                { id: 'magic', label: 'Magic Link', icon: Mail },
                { id: 'password', label: 'Password', icon: KeyRound },
              ].map((method) => (
                <button
                  key={method.id}
                  onClick={() => setActiveMethod(method.id as 'magic' | 'password')}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all',
                    activeMethod === method.id
                      ? 'bg-white text-apple-dark shadow-sm'
                      : 'text-apple-gray hover:text-apple-dark'
                  )}
                >
                  <method.icon className="h-4 w-4" />
                  {method.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Form Area */}
          <motion.div variants={itemVariants}>
            <AnimatePresence mode="wait">
              {activeMethod === 'magic' && (
                <motion.div key="magic" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <MagicLinkForm />
                </motion.div>
              )}
              {activeMethod === 'password' && (
                <motion.div key="password" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <PasswordForm />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Footer */}
          <motion.div variants={itemVariants} className="mt-8 text-center">
            <p className="text-sm text-apple-gray">
              Non hai un account?{' '}
              <Link href="/auth/signup" className="font-medium text-apple-blue hover:underline">
                Registrati ora
              </Link>
            </p>
            
            <div className="mt-6 flex items-center justify-center gap-4 text-xs text-apple-gray/60">
              <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> ISO 27001</span>
              <span>•</span>
              <span>GDPR Compliant</span>
              <span>•</span>
              <span>99.9% Uptime</span>
            </div>
            
            <div className="mt-4 text-xs text-apple-gray/40">
              📱 Problemi?{' '}
              <a href="https://wa.me/391234567890" className="text-apple-blue hover:underline">Scrivi su WhatsApp</a>
              {' '}•{' '}
              <a href="tel:0212345678" className="text-apple-blue hover:underline">02-1234-5678</a>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}

// Main Component
export default function AuthPage() {
  const [activeMethod, setActiveMethod] = useState<'passkey' | 'magic' | 'password'>('passkey');
  const [isLoadingPasskey, setIsLoadingPasskey] = useState(false);
  const [passkeyLoadingText, setPasskeyLoadingText] = useState('');
  const [passkeyError, setPasskeyError] = useState('');
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [oauthError, setOauthError] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleGoogleLogin = useCallback(async (credential: string) => {
    setIsLoadingGoogle(true);
    setOauthError('');
    try {
      const res = await fetch('/api/auth/oauth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string | { message?: string } };
      if (res.ok && data.success) {
        router.push('/dashboard');
      } else {
        const errMsg = typeof data.error === 'string' ? data.error : (data.error as { message?: string })?.message;
        setOauthError(errMsg || 'Account non trovato. Contatta l\'amministratore.');
      }
    } catch {
      setOauthError('Errore di rete. Riprova.');
    } finally {
      setIsLoadingGoogle(false);
    }
  }, [router]);


  const attemptPasskeyLogin = useCallback(async (isRetry: boolean): Promise<boolean> => {
    setPasskeyLoadingText('Connessione al server...');

    // Get authentication options
    const optionsRes = await fetch('/api/auth/passkey/authenticate-options');

    if (optionsRes.status === 502 || optionsRes.status === 503) {
      if (!isRetry) {
        // Auto-retry once after 3 seconds on backend unavailable
        setPasskeyLoadingText('Il server si sta avviando. Nuovo tentativo...');
        await new Promise((resolve) => setTimeout(resolve, 3000));
        return attemptPasskeyLogin(true);
      }
      setPasskeyError('Il server si sta avviando. Riprova tra qualche secondo.');
      return false;
    }

    if (!optionsRes.ok) {
      const optionsData = (await optionsRes.json().catch(() => ({}))) as { error?: string | { message?: string } };
      const errMsg = typeof optionsData.error === 'string' ? optionsData.error : optionsData.error?.message;
      if (errMsg && errMsg.toLowerCase().includes('no passkey')) {
        setPasskeyError('Nessuna passkey registrata. Accedi con un altro metodo e registra una passkey dalle impostazioni.');
      } else {
        setPasskeyError(errMsg || 'Impossibile avviare l\'autenticazione.');
      }
      return false;
    }

    const options = await optionsRes.json();

    // Start authentication (triggers FaceID/TouchID)
    setPasskeyLoadingText('Attivazione biometrica...');
    const { startAuthentication } = await import('@simplewebauthn/browser');
    const assertion = await startAuthentication(options as Parameters<typeof startAuthentication>[0]);

    // Verify
    setPasskeyLoadingText('Verifica in corso...');
    const verifyRes = await fetch('/api/auth/passkey/authenticate-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assertion, sessionId: (options as Record<string, unknown>).sessionId }),
    });

    const data = (await verifyRes.json()) as { success?: boolean; error?: string };

    if (verifyRes.ok && data.success) {
      router.push('/dashboard');
      return true;
    }

    setPasskeyError(data.error || 'Autenticazione fallita');
    return false;
  }, [router]);

  const handlePasskeyLogin = useCallback(async () => {
    setIsLoadingPasskey(true);
    setPasskeyError('');

    try {
      await attemptPasskeyLogin(false);
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setPasskeyError('Autenticazione annullata. Riprova.');
        } else if (
          err.name === 'AbortError' ||
          err.message?.includes('No credentials') ||
          err.message?.includes('not found') ||
          err.message?.includes('no matching') ||
          err.message?.includes('empty') ||
          err.name === 'InvalidStateError'
        ) {
          setPasskeyError(
            'Nessuna passkey trovata su questo dispositivo. Accedi con email e password, poi potrai attivare Touch ID / Face ID dalle impostazioni.'
          );
        } else {
          setPasskeyError(
            'Nessuna passkey registrata per questo dispositivo. Accedi con password e attiva Touch ID / Face ID.'
          );
        }
      } else {
        setPasskeyError('Errore durante l\'accesso. Riprova.');
      }
    } finally {
      setIsLoadingPasskey(false);
      setPasskeyLoadingText('');
    }
  }, [attemptPasskeyLogin]);

  // During SSR and initial hydration, render a consistent layout
  // that doesn't depend on window dimensions
  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Left Side - Auth Form (always visible) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-apple-light-gray relative">
        {/* Subtle background for left side */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-white to-purple-50/30" />
        <div className="absolute top-0 left-0 w-full h-full opacity-[0.02]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }} />
        
        <div className="relative z-10 w-full max-w-md">
          <AuthForm
            activeMethod={activeMethod}
            setActiveMethod={setActiveMethod}
            isLoadingPasskey={isLoadingPasskey}
            passkeyLoadingText={passkeyLoadingText}
            passkeyError={passkeyError}
            handlePasskeyLogin={handlePasskeyLogin}
            handleGoogleLogin={handleGoogleLogin}
            isLoadingGoogle={isLoadingGoogle}
            oauthError={oauthError}
          />
        </div>
      </div>

      {/* Right Side - Preview (client-only to prevent hydration mismatch) */}
      <ClientOnly>
        <DesktopPreview />
      </ClientOnly>
    </div>
  );
}
