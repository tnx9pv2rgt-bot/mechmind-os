/**
 * Shared auth page styles — single source of truth.
 * Used by all auth pages (login, register, forgot-password, MFA, etc.)
 */

export const btnPrimary = [
  'flex h-[52px] w-full items-center justify-center rounded-full',
  'bg-white text-base font-normal text-[var(--surface-tertiary)]',
  'transition-colors hover:bg-[var(--surface-active)]',
  'disabled:opacity-30',
].join(' ');

export const btnSecondaryOutline = [
  'flex h-[52px] w-full items-center justify-center rounded-full',
  'border border-[var(--border-strong)] bg-transparent',
  'text-base font-normal text-white',
  'transition-colors hover:bg-white/5',
  'disabled:opacity-30',
].join(' ');

export const inputStyle = [
  'block h-[52px] w-full rounded-full border border-[var(--border-strong)] bg-[var(--surface-elevated)]',
  'px-5 py-3 text-base text-white placeholder-[var(--text-tertiary)]',
  'outline-none transition-colors',
].join(' ');

/** Framer Motion slide variants for step transitions */
export const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
    transition: { duration: 0.2, ease: 'easeIn' },
  }),
};

/** Spinner element for loading states inside buttons */
export const btnSpinner =
  'inline-block h-5 w-5 animate-spin rounded-full border-2 border-[var(--surface-tertiary)] border-t-transparent';
