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
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--status-error-subtle)] dark:bg-[var(--status-error-subtle)]">
          <AlertTriangle className="h-10 w-10 text-[var(--status-error)]" strokeWidth={1.5} />
        </div>

        <h1 className="mt-6 text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
          Si è verificato un errore
        </h1>
        <p className="mt-2 text-body text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
          Qualcosa è andato storto. Riprova o torna alla dashboard.
        </p>

        {/* Error details in dev only */}
        {isDev && error.message && (
          <div className="mt-4 rounded-xl border border-[var(--status-error)]/30 bg-[var(--status-error-subtle)] p-4 text-left dark:border-[var(--status-error)] dark:bg-[var(--status-error)]/40/30">
            <p className="font-mono text-footnote text-[var(--status-error)] dark:text-[var(--status-error)]">
              {error.message}
            </p>
          </div>
        )}

        {/* Error code */}
        {error.digest && (
          <p className="mt-3 font-mono text-caption text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
            Codice: {error.digest}
          </p>
        )}

        {/* Actions */}
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--brand)] px-6 py-3 text-subhead font-medium text-[var(--text-on-brand)] transition-all hover:bg-[var(--brand)]-hover hover:shadow-apple active:scale-[0.98]"
          >
            <RefreshCw className="h-4 w-4" />
            Riprova
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--surface-secondary)] px-6 py-3 text-subhead font-medium text-[var(--text-secondary)] transition-all hover:bg-[var(--surface-secondary)] active:scale-[0.98] dark:border-[var(--border-default)] dark:bg-[var(--surface-elevated)] dark:text-[var(--text-primary)] dark:hover:bg-[var(--surface-hover)]"
          >
            <Home className="h-4 w-4" />
            Torna alla Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
