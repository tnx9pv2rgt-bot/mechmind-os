import Link from 'next/link';
import { Home } from 'lucide-react';

export default function NotFound(): React.ReactElement {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--surface-tertiary)] px-6 dark:bg-[var(--surface-primary)]">
      <div className="text-center">
        {/* Big 404 */}
        <p className="text-[120px] font-bold leading-none tracking-tighter text-[var(--text-tertiary)] sm:text-[180px] dark:text-[var(--text-primary)]">
          404
        </p>

        <h1 className="mt-2 text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
          Pagina non trovata
        </h1>
        <p className="mt-2 max-w-md text-body text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
          La pagina che stai cercando non esiste o è stata spostata.
        </p>

        <Link
          href="/dashboard"
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-[var(--brand)] px-6 py-3 text-subhead font-medium text-[var(--text-on-brand)] transition-all hover:bg-[var(--brand)]-hover hover:shadow-apple active:scale-[0.98]"
        >
          <Home className="h-4 w-4" />
          Torna alla Dashboard
        </Link>
      </div>
    </div>
  );
}
