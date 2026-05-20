'use client';

import { type LucideIcon, Inbox } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: EmptyStateProps): React.ReactElement {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4', className)}>
      <div className="w-14 h-14 rounded-2xl bg-[var(--surface-hover)] dark:bg-[var(--surface-elevated)] flex items-center justify-center mb-4">
        <Icon className="h-7 w-7 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]-light" />
      </div>
      <h3 className="text-base font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] text-center max-w-sm mb-4">
          {description}
        </p>
      )}
      {actionLabel && (
        <Button
          size="sm"
          onClick={() => {
            if (actionHref) {
              window.location.href = actionHref;
            } else {
              onAction?.();
            }
          }}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
