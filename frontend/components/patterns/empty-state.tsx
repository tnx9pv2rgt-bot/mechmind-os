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
                ? 'bg-blue-50 dark:bg-blue-950/40'
                : 'bg-gray-100 dark:bg-gray-800'
            )}
          >
            <DisplayIcon
              className={cn(
                'h-10 w-10',
                variant === 'first-time'
                  ? 'text-apple-blue'
                  : 'text-gray-400 dark:text-gray-500'
              )}
              strokeWidth={1.5}
            />
          </div>
        )}
      </div>

      {/* Text area */}
      <div className="max-w-md">
        <h3 className="text-title-3 font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h3>
        <p className="mt-2 text-body text-gray-500 dark:text-gray-400">
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
