'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react'

type Step = 'form' | 'success'

function FloatingInput({
  label,
  type = 'text',
  value,
  onChange,
  error,
  autoFocus,
  hint,
}: {
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  error?: string
  autoFocus?: boolean
  hint?: string
}) {
  const [focused, setFocused] = useState(false)
  const hasValue = value.length > 0
  const isFloating = focused || hasValue

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
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoFocus={autoFocus}
          className="w-full bg-transparent rounded-2xl px-4 pt-6 pb-2 text-[15px] text-[#0d0d0d] dark:text-[#ececec] focus:outline-none"
        />
      </div>
      {hint && !error && (
        <p className="mt-1.5 text-[12px] text-[#636366]">{hint}</p>
      )}
      {error && (
        <p className="mt-1.5 flex items-center gap-1 text-[12px] text-red-600 dark:text-red-400">
          <AlertCircle className="h-3 w-3 shrink-0" /> {error}
        </p>
      )}
    </div>
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('form')
  const [shopName, setShopName] = useState('')
  const [slug, setSlug] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [createdSlug, setCreatedSlug] = useState('')

  const autoSlug = shopName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  const validate = (): boolean => {
    const errors: Record<string, string> = {}
    if (!shopName.trim()) errors.shopName = 'Inserisci il nome della tua officina'
    if (!name.trim()) errors.name = 'Inserisci il tuo nome'
    if (!email.trim()) errors.email = 'Inserisci la tua email'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Email non valida'
    if (!password) errors.password = 'Inserisci una password'
    else if (password.length < 8) errors.password = 'Minimo 8 caratteri'
    if (password !== confirmPassword) errors.confirmPassword = 'Le password non coincidono'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!validate()) return

    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopName: shopName.trim(),
          slug: slug.trim() || autoSlug,
          name: name.trim(),
          email: email.trim(),
          password,
        }),
      })

      const data = (await res.json()) as Record<string, unknown>

      if (res.ok && data.success) {
        setCreatedSlug((data.tenantSlug as string) || autoSlug)
        // Se il cookie auth è stato settato, possiamo andare direttamente alla dashboard
        setStep('success')
      } else {
        setError((data.error as string) || 'Errore durante la registrazione')
      }
    } catch {
      setError('Errore di rete. Riprova.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#f4f4f4] dark:bg-[#212121] overflow-hidden">
      {/* Header */}
      <header className="relative flex items-center justify-center px-6 pt-6 pb-2">
        <button
          onClick={() => router.push('/auth')}
          className="absolute left-6 text-[15px] font-medium text-[#0d0d0d] dark:text-[#ececec] hover:opacity-50 transition-opacity flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" /> Indietro
        </button>
        <span className="text-[15px] font-semibold text-[#0d0d0d] dark:text-[#ececec]">
          MechMind OS
        </span>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-12">
        <div className="w-full max-w-[440px]">
          {step === 'form' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="text-center mb-6">
                  <h1 className="text-[28px] font-bold text-[#0d0d0d] dark:text-[#ececec] tracking-tight">
                    Crea la tua officina
                  </h1>
                  <p className="mt-2 text-[15px] text-[#636366] leading-relaxed">
                    Registrati gratuitamente in 30 secondi.
                  </p>
                </div>

                <div className="space-y-4">
                  <FloatingInput
                    label="Nome officina"
                    value={shopName}
                    onChange={(v) => { setShopName(v); setFieldErrors((p) => ({ ...p, shopName: '' })) }}
                    error={fieldErrors.shopName}
                    autoFocus
                  />

                  <FloatingInput
                    label="Slug (URL)"
                    value={slug || autoSlug}
                    onChange={(v) => { setSlug(v); setFieldErrors((p) => ({ ...p, slug: '' })) }}
                    error={fieldErrors.slug}
                    hint={slug || autoSlug ? `mechmind.it/${slug || autoSlug}` : undefined}
                  />

                  <FloatingInput
                    label="Nome completo"
                    value={name}
                    onChange={(v) => { setName(v); setFieldErrors((p) => ({ ...p, name: '' })) }}
                    error={fieldErrors.name}
                  />

                  <FloatingInput
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(v) => { setEmail(v); setFieldErrors((p) => ({ ...p, email: '' })) }}
                    error={fieldErrors.email}
                  />

                  <FloatingInput
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(v) => { setPassword(v); setFieldErrors((p) => ({ ...p, password: '' })) }}
                    error={fieldErrors.password}
                    hint="Minimo 8 caratteri"
                  />

                  <FloatingInput
                    label="Conferma password"
                    type="password"
                    value={confirmPassword}
                    onChange={(v) => { setConfirmPassword(v); setFieldErrors((p) => ({ ...p, confirmPassword: '' })) }}
                    error={fieldErrors.confirmPassword}
                  />
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-1.5 text-[13px] text-red-600 dark:text-red-400"
                  >
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
                  </motion.p>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex w-full items-center justify-center rounded-full bg-[#0d0d0d] dark:bg-[#ececec] text-white dark:text-[#0d0d0d] h-[56px] text-[15px] font-semibold hover:bg-[#2f2f2f] dark:hover:bg-[#d9d9d9] active:bg-[#424242] dark:active:bg-[#c0c0c0] transition-colors disabled:opacity-30"
                >
                  {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Crea officina'}
                </button>

                <p className="text-center text-[13px] text-[#636366]">
                  Hai già un account?{' '}
                  <Link href="/auth" className="font-medium text-[#0d0d0d] dark:text-[#ececec] hover:underline">
                    Accedi
                  </Link>
                </p>
              </form>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="text-center space-y-5"
            >
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#0d0d0d] dark:bg-[#ececec]">
                <CheckCircle2 className="h-7 w-7 text-white dark:text-[#0d0d0d]" />
              </div>
              <h1 className="text-[28px] font-bold text-[#0d0d0d] dark:text-[#ececec] tracking-tight">
                Officina creata!
              </h1>
              <p className="text-[15px] text-[#636366] leading-relaxed max-w-[320px] mx-auto">
                Il tuo slug è <strong className="text-[#0d0d0d] dark:text-[#ececec]">{createdSlug}</strong>.
                Usalo per accedere.
              </p>
              <button
                onClick={() => router.push('/dashboard')}
                className="flex w-full items-center justify-center rounded-full bg-[#0d0d0d] dark:bg-[#ececec] text-white dark:text-[#0d0d0d] h-[56px] text-[15px] font-semibold hover:bg-[#2f2f2f] dark:hover:bg-[#d9d9d9] transition-colors"
              >
                Vai alla dashboard
              </button>
              <button
                onClick={() => router.push('/auth')}
                className="flex w-full items-center justify-center rounded-full border border-[#e5e5e5] dark:border-[#424242] text-[#0d0d0d] dark:text-[#ececec] h-[48px] text-[14px] font-medium hover:bg-[#e5e5e5]/50 dark:hover:bg-[#424242]/50 transition-colors"
              >
                Vai al login
              </button>
            </motion.div>
          )}
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
  )
}
