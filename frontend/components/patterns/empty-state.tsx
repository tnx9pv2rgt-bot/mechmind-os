'use client';

import * as React from 'react';
import Link from 'next/link';
import { type LucideIcon, SearchX, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface EmptyStateCTAProps {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  cta?: EmptyStateCTAProps;
  illustration?: React.ReactNode;
  variant?: 'first-time' | 'no-results';
  onClearFilters?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  cta,
  illustration,
  variant = 'first-time',
  onClearFilters,
  className,
}: EmptyStateProps): React.ReactElement {
  const DefaultIcon = variant === 'first-time' ? Sparkles : SearchX;
  const DisplayIcon = Icon ?? DefaultIcon;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-6 py-16 text-center',
        'md:flex-row md:text-left md:gap-12',
        className
      )}
    >
      {/* Illustration / Icon area */}
      <div className="mb-6 md:mb-0 flex-shrink-0">
        {illustration ?? (
          <div
            className={cn(
              'mx-auto flex h-20 w-20 items-center justify-center rounded-2xl',
              variant === 'first-time'
                ? 'bg-[var(--status-info-subtle)] dark:bg-[var(--status-info-subtle)]'
                : 'bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)]'
            )}
          >
            <DisplayIcon
              className={cn(
                'h-10 w-10',
                variant === 'first-time'
                  ? 'text-[var(--brand)]'
                  : 'text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'
              )}
              strokeWidth={1.5}
            />
          </div>
        )}
      </div>

      {/* Text area */}
      <div className="max-w-md">
        <h3 className="text-title-3 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
          {title}
        </h3>
        <p className="mt-2 text-body text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
          {description}
        </p>

        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row md:items-start">
          {cta && (
            cta.href ? (
              <Link href={cta.href}>
                <Button variant="default" size="lg">
                  {cta.label}
                </Button>
              </Link>
            ) : (
              <Button variant="default" size="lg" onClick={cta.onClick}>
                {cta.label}
              </Button>
            )
          )}

          {variant === 'no-results' && onClearFilters && (
            <Button variant="outline" size="lg" onClick={onClearFilters}>
              Cancella filtri
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
