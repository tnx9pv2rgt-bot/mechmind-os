'use client';

import type { ReactNode, ReactElement } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';

interface AnalyticsEmptyStateAction {
  label: string;
  onClick: () => void;
}

interface AnalyticsEmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: AnalyticsEmptyStateAction;
  className?: string;
}

function FloatingCircle({
  size,
  color,
  delay,
  x,
  y,
}: {
  size: number;
  color: string;
  delay: number;
  x: number;
  y: number;
}): ReactElement {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className="absolute rounded-full opacity-20"
      style={{
        width: size,
        height: size,
        background: color,
        left: `calc(50% + ${x}px)`,
        top: `calc(50% + ${y}px)`,
      }}
      animate={
        reducedMotion
          ? {}
          : {
              y: [0, -12, 0],
              x: [0, 6, 0],
              scale: [1, 1.1, 1],
            }
      }
      transition={{
        duration: 4,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      aria-hidden="true"
    />
  );
}

const CIRCLES = [
  { size: 40, color: '#60a5fa', delay: 0, x: -60, y: -30 },
  { size: 28, color: '#a78bfa', delay: 1.2, x: 50, y: -10 },
  { size: 20, color: '#34d399', delay: 2.4, x: -20, y: 40 },
] as const;

export function AnalyticsEmptyState({
  title,
  description,
  icon,
  action,
  className = '',
}: AnalyticsEmptyStateProps): ReactElement {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={`flex flex-col items-center justify-center py-16 text-center ${className}`}
    >
      {/* Floating circles illustration */}
      <div className="relative mb-6 h-24 w-40">
        {CIRCLES.map((circle, i) => (
          <FloatingCircle key={i} {...circle} />
        ))}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          {icon ?? (
            <BarChart3
              className="h-10 w-10 text-[#666666]"
              aria-hidden="true"
            />
          )}
        </div>
      </div>

      <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>
      <p className="mb-6 max-w-sm text-sm leading-relaxed text-[#888888]">
        {description}
      </p>

      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="inline-flex h-11 items-center justify-center rounded-full bg-white px-6 text-sm font-medium text-[#0d0d0d] transition-colors duration-200 hover:bg-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1a1a]"
          style={{ minHeight: 44 }}
        >
          {action.label}
        </button>
      )}
    </motion.div>
  );
}
