'use client'

import { AuthSplitLayout } from '@/components/auth/auth-split-layout'
import { btnPrimary, btnSecondaryOutline } from '@/components/auth/auth-styles'

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}): React.ReactElement {
  // Log via structured logger only — no console.error in production
  void error;

  return (
    <AuthSplitLayout>
      <div className="text-center space-y-5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
          <span className="text-2xl text-white">⚠</span>
        </div>
        <h1 className="text-[28px] font-normal text-white tracking-tight">
          Errore di autenticazione
        </h1>
        <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed" role="alert">
          Si è verificato un errore durante l&apos;autenticazione. Riprova.
        </p>
        <div className="flex flex-col gap-3">
          <button onClick={reset} className={btnPrimary}>
            Riprova
          </button>
          <a href="/auth" className={btnSecondaryOutline}>
            Torna al login
          </a>
        </div>
      </div>
    </AuthSplitLayout>
  )
}
