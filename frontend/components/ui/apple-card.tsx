'use client';

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface AppleCardProps {
  children: ReactNode;
  className?: string;
  featured?: boolean;
  hover?: boolean;
  onClick?: () => void;
  'data-testid'?: string;
  role?: string;
  'aria-label'?: string;
}

export function AppleCard({
  children,
  className,
  featured = false,
  hover = true,
  onClick,
  ...rest
}: AppleCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-[var(--surface-elevated)] border border-[var(--border-default)] overflow-hidden transition-all duration-300 ease-apple',
        featured
          ? 'rounded-2xl shadow-[var(--shadow-lg)]'
          : 'rounded-2xl shadow-[var(--shadow-card)]',
        hover && 'hover:bg-[var(--surface-hover)] hover:-translate-y-0.5 cursor-pointer',
        onClick && 'cursor-pointer',
        className
      )}
      data-testid={rest['data-testid']}
      role={rest.role}
      aria-label={rest['aria-label']}
    >
      {children}
    </div>
  );
}

interface AppleCardHeaderProps {
  children?: ReactNode;
  title?: string;
  className?: string;
}

export function AppleCardHeader({ children, title, className }: AppleCardHeaderProps) {
  return (
    <div className={cn('px-6 py-5 border-b border-[var(--border-default)]', className)}>
      {title ? <h3 className='font-semibold text-base'>{title}</h3> : children}
    </div>
  );
}

interface AppleCardContentProps {
  children: ReactNode;
  className?: string;
}

export function AppleCardContent({ children, className }: AppleCardContentProps) {
  return <div className={cn('p-6', className)}>{children}</div>;
}

interface AppleCardFooterProps {
  children: ReactNode;
  className?: string;
}

export function AppleCardFooter({ children, className }: AppleCardFooterProps) {
  return (
    <div
      className={cn(
        'px-6 py-4 border-t border-[var(--border-default)] bg-[var(--surface-hover)]',
        className
      )}
    >
      {children}
    </div>
  );
}
