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
        <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
          Errore nel pagamento
        </h2>
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          Si è verificato un errore durante l&#39;operazione di pagamento. Riprova.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Riprova
          </button>
          <a
            href="/dashboard"
            className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Torna alla dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
