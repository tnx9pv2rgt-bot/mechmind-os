'use client'

import { useEffect } from 'react'

export default function BillingError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Billing error:', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="mx-auto max-w-md text-center">
        <h2 className="mb-4 text-xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
          Errore nel pagamento
        </h2>
        <p className="mb-6 text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
          Si è verificato un errore durante l&#39;operazione di pagamento. Riprova.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="rounded-lg bg-[var(--status-info)] px-6 py-2.5 text-sm font-medium text-[var(--text-on-brand)] hover:bg-[var(--status-info)] focus:outline-none focus:ring-2 focus:ring-[var(--status-info)]"
          >
            Riprova
          </button>
          <a
            href="/dashboard"
            className="rounded-lg border border-[var(--border-default)] px-6 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] dark:border-[var(--border-default)] dark:text-[var(--text-primary)] dark:hover:bg-[var(--surface-hover)]"
          >
            Torna alla dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
