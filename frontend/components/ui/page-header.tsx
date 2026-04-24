'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  backHref?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  backHref,
  actions,
  badge,
  className,
}: PageHeaderProps): React.ReactElement {
  const router = useRouter();

  return (
    <div className={cn('mb-6 space-y-1', className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-2">
          <ol className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] dark:text-[var(--text-tertiary)]">
            {breadcrumbs.map((item, i) => (
              <li key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]-light">/</span>}
                {item.href ? (
                  <button
                    onClick={() => router.push(item.href!)}
                    className="hover:text-[var(--text-primary)] dark:hover:text-[var(--text-tertiary)] transition-colors"
                  >
                    {item.label}
                  </button>
                ) : (
                  <span className="text-[var(--text-primary)] dark:text-[var(--text-primary)] font-medium">{item.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* Header Row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {backHref && (
            <button
              onClick={() => router.push(backHref)}
              className="shrink-0 p-1.5 rounded-lg hover:bg-[var(--surface-hover)] dark:hover:bg-[var(--surface-hover)] transition-colors"
              aria-label="Torna indietro"
            >
              <ArrowLeft className="h-5 w-5 text-[var(--text-secondary)] dark:text-[var(--text-tertiary)]" />
            </button>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] tracking-tight truncate">
                {title}
              </h1>
              {badge}
            </div>
            {description && (
              <p className="mt-0.5 text-sm text-[var(--text-secondary)] dark:text-[var(--text-tertiary)]">{description}</p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
