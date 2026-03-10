/**
 * Accessibility Library
 * Utility e funzioni per accessibilità WCAG 2.1 AA
 */

// ARIA utilities
export * from './aria-utils';

// Validation utilities
export * from './validation';

// Color contrast utilities
export * from './contrast';

// Keyboard utilities (re-export excluding isFocusable which conflicts with aria-utils)
export {
  type KeyHandler,
  type KeyCombo,
  matchesKeyCombo,
  createShortcutHandler,
  COMMON_SHORTCUTS,
  trapFocus,
  makeClickable,
  formatShortcut,
  findNextFocusable,
  setInitialFocus,
  createFocusManager,
} from './keyboard';

// Focus management (re-export excluding getFocusableElements which conflicts with aria-utils)
export {
  scrollIntoView,
  type FocusIndicatorOptions,
  buildFocusStyle,
  setupFocusVisible,
  isVisible,
  isFullyVisible,
  createFocusGuards,
  FocusManager,
  setupFocusRingPolyfill,
} from './focus';
