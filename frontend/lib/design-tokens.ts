/**
 * MechMind OS Design Tokens — Single Source of Truth
 *
 * 3-layer OKLCH token system (Linear/Vercel 2026 pattern).
 * All UI components reference these CSS variables.
 * Change via theme store → useThemeApplier → CSS vars → everywhere.
 */

export const tokens = {
  colors: {
    brand: {
      primary: 'var(--brand)',
      hover: 'var(--brand-hover)',
      active: 'var(--brand-active)',
      subtle: 'var(--brand-subtle)',
      muted: 'var(--brand-muted)',
      foreground: 'var(--brand-foreground)',
    },
    surface: {
      primary: 'var(--surface-primary)',
      secondary: 'var(--surface-secondary)',
      tertiary: 'var(--surface-tertiary)',
      elevated: 'var(--surface-elevated)',
      overlay: 'var(--surface-overlay)',
      hover: 'var(--surface-hover)',
      active: 'var(--surface-active)',
    },
    text: {
      primary: 'var(--text-primary)',
      secondary: 'var(--text-secondary)',
      tertiary: 'var(--text-tertiary)',
      onBrand: 'var(--text-on-brand)',
      onSurface: 'var(--text-on-surface)',
    },
    border: {
      default: 'var(--border-default)',
      subtle: 'var(--border-subtle)',
      strong: 'var(--border-strong)',
    },
    status: {
      success: 'var(--status-success)',
      error: 'var(--status-error)',
      warning: 'var(--status-warning)',
      info: 'var(--status-info)',
    },
    sidebar: {
      bg: 'var(--sidebar-bg)',
      text: 'var(--sidebar-text)',
      textSecondary: 'var(--sidebar-text-secondary)',
      hover: 'var(--sidebar-hover)',
      border: 'var(--sidebar-border)',
      active: 'var(--sidebar-active)',
    },
    // shadcn/ui compat
    ring: 'hsl(var(--ring))',
    input: 'hsl(var(--input))',
  },
  shadow: {
    sm: 'var(--shadow-sm)',
    md: 'var(--shadow-md)',
    lg: 'var(--shadow-lg)',
    xl: 'var(--shadow-xl)',
    card: 'var(--shadow-card)',
  },
  spacing: {
    xs: '0.375rem',
    sm: '0.75rem',
    md: '1.25rem',
    lg: '2.5rem',
    xl: '5rem',
    page: 'var(--density-page-padding)',
    card: 'var(--density-card-padding)',
    gap: 'var(--density-gap)',
  },
  radius: {
    sm: 'var(--radius-sm)',
    md: 'var(--radius-md)',
    lg: 'var(--radius-lg)',
    full: '9999px',
  },
  animation: {
    duration: 'var(--animation-duration)',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
  typography: {
    fontFamily: 'var(--font-custom)',
  },
} as const;

/**
 * Legacy darkColors compat — maps to CSS variables.
 * Prefer using CSS variables directly in Tailwind classes.
 */
export const darkColors = {
  bg: 'var(--surface-tertiary)',
  surface: 'var(--surface-elevated)',
  surfaceHover: 'var(--surface-hover)',
  border: 'var(--border-strong)',
  borderSubtle: 'var(--border-default)',
  textPrimary: 'var(--text-primary)',
  textSecondary: 'var(--text-secondary)',
  textTertiary: 'var(--text-tertiary)',
  textMuted: 'var(--text-tertiary)',
  accent: 'var(--brand)',
  success: 'var(--status-success)',
  warning: 'var(--status-warning)',
  error: 'var(--status-error)',
  info: 'var(--status-info)',
  purple: '#a78bfa',
  cyan: '#22d3ee',
  glow: 'rgba(255,255,255,0.03)',
  glowStrong: 'rgba(255,255,255,0.06)',
} as const;

/** Status color map for badges and indicators */
export const STATUS_COLORS = {
  pending: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
  confirmed: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500' },
  in_progress: { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-400', dot: 'bg-indigo-500' },
  completed: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', dot: 'bg-green-500' },
  cancelled: { bg: 'bg-gray-100 dark:bg-gray-800/50', text: 'text-gray-600 dark:text-gray-400', dot: 'bg-gray-400' },
  draft: { bg: 'bg-gray-100 dark:bg-gray-800/50', text: 'text-gray-600 dark:text-gray-400', dot: 'bg-gray-400' },
  sent: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500' },
  paid: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', dot: 'bg-green-500' },
  overdue: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' },
} as const;

export type StatusKey = keyof typeof STATUS_COLORS;

/** Get status styling for a given status string */
export function getStatusStyle(status: string): { bg: string; text: string; dot: string } {
  const normalized = status.toLowerCase().replace(/[\s-]/g, '_') as StatusKey;
  return STATUS_COLORS[normalized] ?? STATUS_COLORS.pending;
}
