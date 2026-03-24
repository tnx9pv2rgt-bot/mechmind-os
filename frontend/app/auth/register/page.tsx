'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { AuthSplitLayout } from '@/components/auth/auth-split-layout';
import { btnPrimary, btnSecondaryOutline, btnSpinner, inputStyle } from '@/components/auth/auth-styles';
import { PasswordStrength } from '@/components/auth/password-strength';

// =============================================================================
// Schema
// =============================================================================
const registerSchema = z.object({
  shopName: z.string().min(1, 'Inserisci il nome della tua officina'),
  firstName: z.string().min(1, 'Inserisci il tuo nome'),
  lastName: z.string().min(1, 'Inserisci il tuo cognome'),
  email: z.string().min(1, 'Inserisci la tua email').email('Email non valida'),
  password: z.string().min(1, 'Inserisci una password').min(8, 'Minimo 8 caratteri'),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: 'Devi accettare i termini e le condizioni' }),
  }),
});

// =============================================================================
// Slug generation
// =============================================================================
function generateSlug(shopName: string): string {
  return shopName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// =============================================================================
// Main Component
// =============================================================================
export default function RegisterPage(): React.ReactElement {
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'success'>('form');

  // Form fields
  const [shopName, setShopName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugChecking, setSlugChecking] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [createdSlug, setCreatedSlug] = useState('');

  const autoSlug = generateSlug(shopName);
  const effectiveSlug = slugManual ? slug : autoSlug;
  const slugCheckTimeout = useRef<NodeJS.Timeout>();

  // Debounced slug availability check
  useEffect(() => {
    if (!effectiveSlug || effectiveSlug.length < 3) {
      setSlugAvailable(null);
      return;
    }

    setSlugChecking(true);
    if (slugCheckTimeout.current) clearTimeout(slugCheckTimeout.current);

    slugCheckTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-slug?slug=${encodeURIComponent(effectiveSlug)}`);
        if (res.ok) {
          const data = (await res.json()) as { available?: boolean };
          setSlugAvailable(data.available ?? true);
        } else {
          setSlugAvailable(true);
        }
      } catch {
        setSlugAvailable(true);
      } finally {
        setSlugChecking(false);
      }
    }, 500);

    return () => {
      if (slugCheckTimeout.current) clearTimeout(slugCheckTimeout.current);
    };
  }, [effectiveSlug]);

  const validate = (): boolean => {
    const result = registerSchema.safeParse({
      shopName,
      firstName,
      lastName,
      email,
      password,
      acceptTerms,
    });
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.errors) {
        const key = issue.path[0] as string;
        if (!errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return false;
    }
    setFieldErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError('');
    if (!validate()) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopName: shopName.trim(),
          slug: effectiveSlug,
          name: `${firstName.trim()} ${lastName.trim()}`,
          email: email.trim(),
          password,
        }),
      });

      const data = (await res.json()) as Record<string, unknown>;

      if (res.ok && data.success) {
        setCreatedSlug((data.tenantSlug as string) || effectiveSlug);
        setStep('success');
      } else {
        setError((data.error as string) || 'Errore durante la registrazione');
      }
    } catch {
      setError('Errore di rete. Riprova.');
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Success screen
  // ---------------------------------------------------------------------------
  if (step === 'success') {
    return (
      <AuthSplitLayout>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="text-center space-y-5"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
            <span className="text-2xl text-white">✓</span>
          </div>
          <h1 className="text-[28px] font-normal text-white tracking-tight">
            Officina creata!
          </h1>
          <p className="text-[15px] text-[#b4b4b4] leading-relaxed max-w-[320px] mx-auto">
            La tua officina sarà raggiungibile su{' '}
            <strong className="text-white">mechmind.it/{createdSlug}</strong>.
            Controlla la tua email per verificare l&apos;account.
          </p>
          <button
            onClick={() => router.push('/onboarding')}
            className={btnPrimary}
          >
            Configura la tua officina
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className={btnSecondaryOutline}
          >
            Vai alla dashboard
          </button>
        </motion.div>
      </AuthSplitLayout>
    );
  }

  // ---------------------------------------------------------------------------
  // Registration form
  // ---------------------------------------------------------------------------
  return (
    <AuthSplitLayout showBack onBack={() => router.push('/auth')}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="mb-2">
            <h1 className="text-[28px] font-normal text-white tracking-tight">
              Crea il tuo account
            </h1>
            <p className="mt-1 text-[15px] text-[#b4b4b4] leading-relaxed">
              Registrati gratuitamente in 30 secondi.
            </p>
          </div>

          {/* Shop name */}
          <div>
            <label htmlFor="reg-shop" className="sr-only">Nome officina</label>
            <input
              id="reg-shop"
              type="text"
              value={shopName}
              onChange={e => {
                setShopName(e.target.value);
                setFieldErrors(p => ({ ...p, shopName: '' }));
                if (!slugManual) setSlug('');
              }}
              placeholder="Nome officina"
              autoFocus
              name="shopName"
              autoComplete="organization"
              aria-describedby={fieldErrors.shopName ? 'err-shop' : undefined}
              className={`${inputStyle} ${fieldErrors.shopName ? 'border-[#888]' : ''}`}
            />
            {fieldErrors.shopName && (
              <p id="err-shop" role="alert" className="mt-1 pl-5 text-[12px] text-[#b4b4b4]">{fieldErrors.shopName}</p>
            )}
          </div>

          {/* Slug */}
          <div>
            <div className="relative">
              <label htmlFor="reg-slug" className="sr-only">Nome breve officina</label>
              <input
                id="reg-slug"
                type="text"
                value={slugManual ? slug : autoSlug}
                onChange={e => {
                  setSlugManual(true);
                  setSlug(generateSlug(e.target.value));
                }}
                placeholder="Nome breve (es. officina-rossi)"
                name="slug"
                className={`${inputStyle} pr-12`}
              />
              <div className="absolute right-5 top-1/2 -translate-y-1/2 text-sm">
                {slugChecking && (
                  <span className="text-[#888]">...</span>
                )}
                {!slugChecking && slugAvailable === true && effectiveSlug.length >= 3 && (
                  <span className="text-white">✓</span>
                )}
                {!slugChecking && slugAvailable === false && (
                  <span className="text-[#b4b4b4]">✕</span>
                )}
              </div>
            </div>
            {effectiveSlug && (
              <p className="mt-1 pl-5 text-[12px] text-[#888]">
                mechmind.it/<span className="font-medium text-[#b4b4b4]">{effectiveSlug}</span>
                {slugAvailable === false && (
                  <span className="text-[#b4b4b4] ml-2">Nome già in uso</span>
                )}
              </p>
            )}
          </div>

          {/* Name fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="reg-first" className="sr-only">Nome</label>
              <input
                id="reg-first"
                type="text"
                value={firstName}
                onChange={e => {
                  setFirstName(e.target.value);
                  setFieldErrors(p => ({ ...p, firstName: '' }));
                }}
                placeholder="Nome"
                name="firstName"
                autoComplete="given-name"
                aria-describedby={fieldErrors.firstName ? 'err-first' : undefined}
                className={`${inputStyle} ${fieldErrors.firstName ? 'border-[#888]' : ''}`}
              />
              {fieldErrors.firstName && (
                <p id="err-first" role="alert" className="mt-1 pl-5 text-[12px] text-[#b4b4b4]">{fieldErrors.firstName}</p>
              )}
            </div>
            <div>
              <label htmlFor="reg-last" className="sr-only">Cognome</label>
              <input
                id="reg-last"
                type="text"
                value={lastName}
                onChange={e => {
                  setLastName(e.target.value);
                  setFieldErrors(p => ({ ...p, lastName: '' }));
                }}
                placeholder="Cognome"
                name="lastName"
                autoComplete="family-name"
                aria-describedby={fieldErrors.lastName ? 'err-last' : undefined}
                className={`${inputStyle} ${fieldErrors.lastName ? 'border-[#888]' : ''}`}
              />
              {fieldErrors.lastName && (
                <p id="err-last" role="alert" className="mt-1 pl-5 text-[12px] text-[#b4b4b4]">{fieldErrors.lastName}</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="reg-email" className="sr-only">Email aziendale</label>
            <input
              id="reg-email"
              type="email"
              value={email}
              onChange={e => {
                setEmail(e.target.value);
                setFieldErrors(p => ({ ...p, email: '' }));
              }}
              placeholder="Email aziendale"
              name="email"
              autoComplete="email"
              aria-describedby={fieldErrors.email ? 'err-email' : undefined}
              className={`${inputStyle} ${fieldErrors.email ? 'border-[#888]' : ''}`}
            />
            {fieldErrors.email && (
              <p id="err-email" role="alert" className="mt-1 pl-5 text-[12px] text-[#b4b4b4]">{fieldErrors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="relative">
              <label htmlFor="reg-password" className="sr-only">Password</label>
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  setFieldErrors(p => ({ ...p, password: '' }));
                }}
                placeholder="Password"
                name="password"
                autoComplete="new-password"
                aria-describedby={fieldErrors.password ? 'err-password' : undefined}
                className={`${inputStyle} pr-20 ${fieldErrors.password ? 'border-[#888]' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-[13px] font-medium text-[#b4b4b4] transition-colors hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center"
                tabIndex={-1}
                aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
              >
                {showPassword ? 'Nascondi' : 'Mostra'}
              </button>
            </div>
            {fieldErrors.password && (
              <p id="err-password" role="alert" className="mt-1 pl-5 text-[12px] text-[#b4b4b4]">{fieldErrors.password}</p>
            )}
          </div>

          {/* Password strength */}
          <PasswordStrength password={password} />

          {/* Terms */}
          <label className="flex items-start gap-3 cursor-pointer min-h-[44px]">
            <span className="relative flex items-center justify-center min-w-[44px] min-h-[44px]">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={e => {
                  setAcceptTerms(e.target.checked);
                  setFieldErrors(p => ({ ...p, acceptTerms: '' }));
                }}
                aria-label="Accetto i termini e le condizioni"
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0 peer"
              />
              <span className="flex h-5 w-5 items-center justify-center rounded border border-[#4e4e4e] bg-[#2f2f2f] peer-checked:bg-white peer-checked:border-white peer-focus-visible:ring-2 peer-focus-visible:ring-white/50 transition-colors pointer-events-none" aria-hidden="true">
                {acceptTerms && (
                  <svg className="h-3.5 w-3.5 text-[#0d0d0d]" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z" />
                  </svg>
                )}
              </span>
            </span>
            <span className="text-[13px] text-[#b4b4b4] leading-relaxed">
              Accetto i{' '}
              <Link href="/terms" className="font-medium text-white underline decoration-[#888] underline-offset-2 hover:decoration-white min-h-[44px] inline-flex items-center">
                Termini e Condizioni
              </Link>{' '}
              e l&apos;
              <Link href="/privacy" className="font-medium text-white underline decoration-[#888] underline-offset-2 hover:decoration-white min-h-[44px] inline-flex items-center">
                Informativa sulla Privacy
              </Link>
            </span>
          </label>
          {fieldErrors.acceptTerms && (
            <p role="alert" className="pl-5 text-[12px] text-[#b4b4b4]">{fieldErrors.acceptTerms}</p>
          )}

          {/* Error */}
          {error && (
            <motion.p
              role="alert"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[13px] text-[#b4b4b4] pl-5"
            >
              {error}
            </motion.p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className={btnPrimary}
          >
            {isLoading ? <span className={btnSpinner} /> : 'Crea account gratis'}
          </button>

          {/* Login link */}
          <p className="text-center text-[13px] text-[#888]">
            Hai già un account?{' '}
            <Link href="/auth" className="font-medium text-white underline decoration-[#888] underline-offset-2 hover:decoration-white min-h-[44px] min-w-[44px] justify-center inline-flex items-center">
              Accedi
            </Link>
          </p>
        </form>
      </motion.div>
    </AuthSplitLayout>
  );
}
