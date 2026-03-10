'use client'

import { useEffect } from 'react'

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Portal error:', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
      <div className="mx-auto max-w-md text-center">
        <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
          Errore nel portale
        </h2>
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          Si è verificato un errore. Riprova o torna alla pagina principale.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Riprova
          </button>
          <a
            href="/portal"
            className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Torna al portale
          </a>
        </div>
      </div>
    </div>
  )
}
