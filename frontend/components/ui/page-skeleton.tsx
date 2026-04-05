'use client';

import { cn } from '@/lib/utils';

function Bone({ className, style }: { className?: string; style?: React.CSSProperties }): React.ReactElement {
  return <div className={cn('bg-gray-200 dark:bg-[var(--surface-hover)] rounded animate-pulse', className)} style={style} />;
}

/** Skeleton for a list/table page */
export function TablePageSkeleton(): React.ReactElement {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Bone className="h-7 w-48" />
          <Bone className="h-4 w-64" />
        </div>
        <Bone className="h-10 w-32 rounded-lg" />
      </div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[var(--border-default)] dark:border-[var(--border-default)] p-5 space-y-3">
            <Bone className="h-4 w-20" />
            <Bone className="h-8 w-28" />
            <Bone className="h-3 w-16" />
          </div>
        ))}
      </div>
      {/* Search bar */}
      <Bone className="h-10 w-full max-w-sm rounded-lg" />
      {/* Table */}
      <div className="rounded-xl border border-[var(--border-default)] dark:border-[var(--border-default)] overflow-hidden">
        <div className="bg-white/50 dark:bg-[var(--surface-primary)]/50 px-4 py-3 border-b border-[var(--border-default)] dark:border-[var(--border-default)]">
          <div className="flex gap-8">
            {Array.from({ length: 5 }).map((_, i) => (
              <Bone key={i} className="h-4 w-20" />
            ))}
          </div>
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="px-4 py-3.5 border-b border-[var(--border-default)] dark:border-[var(--border-default)]/50 flex gap-8">
            {Array.from({ length: 5 }).map((__, j) => (
              <Bone key={j} className="h-4" style={{ width: `${50 + Math.random() * 40}%` }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Skeleton for a detail page */
export function DetailPageSkeleton(): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bone className="h-8 w-8 rounded-lg" />
        <div className="space-y-2">
          <Bone className="h-7 w-56" />
          <Bone className="h-4 w-40" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-xl border border-[var(--border-default)] dark:border-[var(--border-default)] p-6 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <Bone className="h-4 w-24" />
                <Bone className="h-4 w-40" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--border-default)] dark:border-[var(--border-default)] p-6 space-y-3">
            <Bone className="h-5 w-32 mb-4" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Bone key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Skeleton for a form page */
export function FormPageSkeleton(): React.ReactElement {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-2">
        <Bone className="h-7 w-48" />
        <Bone className="h-4 w-72" />
      </div>
      <div className="rounded-xl border border-[var(--border-default)] dark:border-[var(--border-default)] p-6 space-y-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Bone className="h-4 w-24" />
            <Bone className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-3">
        <Bone className="h-10 w-24 rounded-lg" />
        <Bone className="h-10 w-32 rounded-lg" />
      </div>
    </div>
  );
}
