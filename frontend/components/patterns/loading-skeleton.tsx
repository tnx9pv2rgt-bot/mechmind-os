'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/* ─── Base Skeleton ─── */

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return (
    <div
      className={cn('animate-pulse rounded-xl bg-[var(--border-default)] dark:bg-[var(--border-default)]', className)}
      {...props}
    />
  );
}

/* ─── Table Skeleton ─── */

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function TableSkeleton({ rows = 5, columns = 4, className }: TableSkeletonProps): React.ReactElement {
  return (
    <div className={cn('w-full overflow-hidden rounded-xl border border-[var(--border-default)] dark:border-[var(--border-strong)]', className)}>
      {/* Header */}
      <div className="flex gap-4 border-b border-[var(--border-default)] bg-[var(--surface-secondary)] px-6 py-4 dark:border-[var(--border-strong)] dark:bg-[var(--surface-primary)]">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`head-${i}`} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={`row-${rowIdx}`}
          className="flex gap-4 border-b border-[var(--border-default)] px-6 py-4 last:border-b-0 dark:border-[var(--border-strong)]"
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton
              key={`cell-${rowIdx}-${colIdx}`}
              className={cn('h-4 flex-1', colIdx === 0 && 'max-w-[180px]')}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ─── Card Grid Skeleton ─── */

interface CardGridSkeletonProps {
  count?: number;
  className?: string;
}

export function CardGridSkeleton({ count = 6, className }: CardGridSkeletonProps): React.ReactElement {
  return (
    <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={`card-${i}`}
          className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] p-6 dark:border-[var(--border-strong)] dark:bg-[var(--surface-primary)]"
        >
          <Skeleton className="mb-4 h-5 w-2/3" />
          <Skeleton className="mb-2 h-4 w-full" />
          <Skeleton className="mb-2 h-4 w-5/6" />
          <Skeleton className="mt-4 h-8 w-1/3 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

/* ─── Detail Skeleton ─── */

interface DetailSkeletonProps {
  className?: string;
}

export function DetailSkeleton({ className }: DetailSkeletonProps): React.ReactElement {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-1/4" />
        </div>
      </div>
      {/* Content blocks */}
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] p-6 dark:border-[var(--border-strong)] dark:bg-[var(--surface-primary)]">
        <Skeleton className="mb-4 h-5 w-1/4" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={`detail-${i}`} className="space-y-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-full" />
            </div>
          ))}
        </div>
      </div>
      {/* Secondary block */}
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] p-6 dark:border-[var(--border-strong)] dark:bg-[var(--surface-primary)]">
        <Skeleton className="mb-4 h-5 w-1/3" />
        <Skeleton className="mb-2 h-4 w-full" />
        <Skeleton className="mb-2 h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    </div>
  );
}

/* ─── Form Skeleton ─── */

interface FormSkeletonProps {
  fields?: number;
  className?: string;
}

export function FormSkeleton({ fields = 4, className }: FormSkeletonProps): React.ReactElement {
  return (
    <div className={cn('space-y-6', className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={`field-${i}`} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      ))}
      <Skeleton className="mt-4 h-11 w-32 rounded-xl" />
    </div>
  );
}

/* ─── KPI Skeleton ─── */

interface KPISkeletonProps {
  count?: number;
  className?: string;
}

export function KPISkeleton({ count = 4, className }: KPISkeletonProps): React.ReactElement {
  return (
    <div className={cn('grid grid-cols-2 gap-4 lg:grid-cols-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={`kpi-${i}`}
          className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] p-5 dark:border-[var(--border-strong)] dark:bg-[var(--surface-primary)]"
        >
          <Skeleton className="mb-3 h-3 w-20" />
          <Skeleton className="mb-2 h-8 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}
