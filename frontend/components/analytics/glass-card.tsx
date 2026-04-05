'use client';

import { type ReactNode } from 'react';

type GlassCardSize = 'default' | 'compact' | 'large';

interface GlassCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
  glowColor?: string;
  size?: GlassCardSize;
}

const SIZE_CLASSES: Record<GlassCardSize, string> = {
  compact: 'p-3 sm:p-4',
  default: 'p-5 sm:p-6',
  large: 'p-6 sm:p-8',
};

const TITLE_CLASSES: Record<GlassCardSize, string> = {
  compact: 'text-sm font-semibold text-white sm:text-base',
  default: 'text-base font-semibold text-white sm:text-lg',
  large: 'text-lg font-semibold text-white sm:text-xl',
};

export function GlassCard({
  title,
  subtitle,
  children,
  className = '',
  action,
  glowColor = 'rgba(255,255,255,0.03)',
  size = 'default',
}: GlassCardProps): React.ReactElement {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-[var(--surface-elevated)]/80 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-colors duration-300 hover:border-white/20 ${SIZE_CLASSES[size]} ${className}`}
    >
      {/* Ambient radial glow */}
      <div
        className="pointer-events-none absolute -left-20 -top-20 h-60 w-60 rounded-full blur-3xl"
        style={{
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
        }}
        aria-hidden="true"
      />
      <div className={`relative ${size === 'compact' ? 'mb-2' : 'mb-4'} flex items-start justify-between`}>
        <div>
          <h3 className={TITLE_CLASSES[size]}>
            {title}
          </h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-[var(--text-tertiary)] sm:text-sm">
              {subtitle}
            </p>
          )}
        </div>
        {action && <div className="ml-4 flex-shrink-0">{action}</div>}
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}
