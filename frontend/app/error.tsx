'use client';

import * as React from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps): React.ReactElement {
  React.useEffect(() => {
    // Log to error tracking (Sentry, etc.)
    console.error('App error:', error);
  }, [error]);

  const isDev = process.env.NODE_ENV === 'development';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--surface-tertiary)] px-6 dark:bg-[var(--surface-primary)]">
      <div className="mx-auto max-w-md text-center">
        {/* Icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/40">
          <AlertTriangle className="h-10 w-10 text-red-500" strokeWidth={1.5} />
        </div>

        <h1 className="mt-6 text-title-2 font-semibold text-gray-900 dark:text-gray-100">
          Si è verificato un errore
        </h1>
        <p className="mt-2 text-body text-gray-500 dark:text-gray-400">
          Qualcosa è andato storto. Riprova o torna alla dashboard.
        </p>

        {/* Error details in dev only */}
        {isDev && error.message && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-left dark:border-red-800 dark:bg-red-950/30">
            <p className="font-mono text-footnote text-red-700 dark:text-red-400">
              {error.message}
            </p>
          </div>
        )}

        {/* Error code */}
        {error.digest && (
          <p className="mt-3 font-mono text-caption text-gray-400 dark:text-gray-500">
            Codice: {error.digest}
          </p>
        )}

        {/* Actions */}
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-apple-blue px-6 py-3 text-subhead font-medium text-white transition-all hover:bg-apple-blue-hover hover:shadow-apple active:scale-[0.98]"
          >
            <RefreshCw className="h-4 w-4" />
            Riprova
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-6 py-3 text-subhead font-medium text-gray-700 transition-all hover:bg-gray-50 active:scale-[0.98] dark:border-gray-600 dark:bg-[var(--surface-elevated)] dark:text-gray-300 dark:hover:bg-[var(--surface-hover)]"
          >
            <Home className="h-4 w-4" />
            Torna alla Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
