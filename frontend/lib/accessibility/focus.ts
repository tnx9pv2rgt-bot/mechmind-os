/**
 * Focus Management Utilities
 * WCAG 2.1 - Criterion 2.4.3: Focus Order
 * WCAG 2.1 - Criterion 2.4.7: Focus Visible
 * WCAG 2.1 - Criterion 2.4.11: Focus Not Obscured
 */

/**
 * Scrolla elemento in vista quando riceve focus
 */
export function scrollIntoView(element: HTMLElement, behavior: ScrollBehavior = 'smooth'): void {
  const rect = element.getBoundingClientRect();
  const isInViewport = (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= window.innerHeight &&
    rect.right <= window.innerWidth
  );

  if (!isInViewport) {
    element.scrollIntoView({ behavior, block: 'center', inline: 'nearest' });
  }
}

/**
 * Focus indicator personalizzato
 */
export interface FocusIndicatorOptions {
  color?: string;
  width?: string;
  style?: string;
  offset?: string;
  outline?: boolean;
  boxShadow?: boolean;
}

export function buildFocusStyle(options: FocusIndicatorOptions = {}): string {
  const {
    color = '#3b82f6',
    width = '2px',
    style = 'solid',
    offset = '2px',
    outline = true,
    boxShadow = false,
  } = options;

  const styles: string[] = [];

  if (outline) {
    styles.push(`outline: ${width} ${style} ${color}`);
    styles.push(`outline-offset: ${offset}`);
  }

  if (boxShadow) {
    styles.push(`box-shadow: 0 0 0 ${offset} ${color}`);
  }

  return styles.join('; ');
}

/**
 * Gestisce focus visible (solo da tastiera, non mouse)
 */
export function setupFocusVisible(): () => void {
  const className = 'focus-visible';
  let hadKeyboardEvent = false;
  let hadFocusVisibleRecently = false;
  let hadFocusVisibleRecentlyTimeout: number;

  const isValidFocusTarget = (el: EventTarget | null): el is Element => {
    return el !== null &&
      (el as Element).nodeType === Node.ELEMENT_NODE &&
      !(el as Element).hasAttribute('data-focus-guard');
  };

  // Traccia eventi tastiera
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.metaKey || event.altKey || event.ctrlKey) return;
    hadKeyboardEvent = true;
  };

  const handlePointerDown = () => {
    hadKeyboardEvent = false;
  };

  // Gestisce focus
  const handleFocus = (event: FocusEvent) => {
    if (!isValidFocusTarget(event.target)) return;

    if (hadKeyboardEvent || hadFocusVisibleRecently) {
      (event.target as Element).classList.add(className);
    }
  };

  const handleBlur = (event: FocusEvent) => {
    if (!isValidFocusTarget(event.target)) return;

    hadFocusVisibleRecently = true;
    window.clearTimeout(hadFocusVisibleRecentlyTimeout);
    hadFocusVisibleRecentlyTimeout = window.setTimeout(() => {
      hadFocusVisibleRecently = false;
    }, 100);

    (event.target as Element).classList.remove(className);
  };

  // Aggiungi listeners
  document.addEventListener('keydown', handleKeyDown, true);
  document.addEventListener('mousedown', handlePointerDown, true);
  document.addEventListener('pointerdown', handlePointerDown, true);
  document.addEventListener('touchstart', handlePointerDown, true);
  document.addEventListener('focus', handleFocus, true);
  document.addEventListener('blur', handleBlur, true);

  // Cleanup
  return () => {
    document.removeEventListener('keydown', handleKeyDown, true);
    document.removeEventListener('mousedown', handlePointerDown, true);
    document.removeEventListener('pointerdown', handlePointerDown, true);
    document.removeEventListener('touchstart', handlePointerDown, true);
    document.removeEventListener('focus', handleFocus, true);
    document.removeEventListener('blur', handleBlur, true);
  };
}

/**
 * Verifica se elemento è visibile
 */
export function isVisible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.visibility !== 'hidden' &&
    style.display !== 'none' &&
    style.opacity !== '0'
  );
}

/**
 * Verifica se elemento è completamente visibile (non coperto)
 */
export function isFullyVisible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  
  // Verifica viewport
  if (
    rect.top < 0 ||
    rect.left < 0 ||
    rect.bottom > window.innerHeight ||
    rect.right > window.innerWidth
  ) {
    return false;
  }

  // Verifica elementi sovrapposti
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  
  const topElement = document.elementFromPoint(centerX, centerY);
  
  return topElement === element || element.contains(topElement);
}

/**
 * Focus guard - elementi invisibili per gestire focus in modali
 */
export function createFocusGuards(container: HTMLElement): {
  first: HTMLSpanElement;
  last: HTMLSpanElement;
  cleanup: () => void;
} {
  const firstGuard = document.createElement('span');
  const lastGuard = document.createElement('span');

  [firstGuard, lastGuard].forEach((guard) => {
    guard.setAttribute('data-focus-guard', 'true');
    guard.setAttribute('tabindex', '0');
    guard.setAttribute('aria-hidden', 'true');
    guard.style.cssText = `
      width: 1px;
      height: 0;
      padding: 0;
      margin: 0;
      overflow: hidden;
      position: fixed;
      top: 0;
      left: 0;
    `;
  });

  // Inserisci guards
  container.insertBefore(firstGuard, container.firstChild);
  container.appendChild(lastGuard);

  // Gestione focus su guards
  const handleFirstGuardFocus = () => {
    const focusableElements = getFocusableElements(container).filter(
      (el) => el !== firstGuard && el !== lastGuard
    );
    const lastElement = focusableElements[focusableElements.length - 1];
    lastElement?.focus();
  };

  const handleLastGuardFocus = () => {
    const focusableElements = getFocusableElements(container).filter(
      (el) => el !== firstGuard && el !== lastGuard
    );
    const firstElement = focusableElements[0];
    firstElement?.focus();
  };

  firstGuard.addEventListener('focus', handleFirstGuardFocus);
  lastGuard.addEventListener('focus', handleLastGuardFocus);

  return {
    first: firstGuard,
    last: lastGuard,
    cleanup: () => {
      firstGuard.removeEventListener('focus', handleFirstGuardFocus);
      lastGuard.removeEventListener('focus', handleLastGuardFocus);
      firstGuard.remove();
      lastGuard.remove();
    },
  };
}

/**
 * Ottieni elementi focusabili
 */
export function getFocusableElements(
  container: HTMLElement = document.body
): HTMLElement[] {
  const selector = [
    'button:not([disabled]):not([tabindex="-1"]):not([aria-hidden="true"])',
    'a[href]:not([tabindex="-1"]):not([aria-hidden="true"])',
    'input:not([disabled]):not([tabindex="-1"]):not([type="hidden"]):not([aria-hidden="true"])',
    'select:not([disabled]):not([tabindex="-1"]):not([aria-hidden="true"])',
    'textarea:not([disabled]):not([tabindex="-1"]):not([aria-hidden="true"])',
    '[tabindex]:not([tabindex="-1"]):not([disabled]):not([aria-hidden="true"])',
    '[contenteditable]:not([tabindex="-1"]):not([aria-hidden="true"])',
  ].join(', ');

  const elements = Array.from(container.querySelectorAll<HTMLElement>(selector));

  return elements.filter((el) => {
    const style = window.getComputedStyle(el);
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      el.offsetParent !== null
    );
  });
}

/**
 * Salva e ripristina focus
 */
export class FocusManager {
  private savedElement: HTMLElement | null = null;
  private savedScrollPosition: { x: number; y: number } = { x: 0, y: 0 };

  save(): void {
    this.savedElement = document.activeElement as HTMLElement;
    this.savedScrollPosition = {
      x: window.scrollX,
      y: window.scrollY,
    };
  }

  restore(): void {
    if (this.savedElement && document.contains(this.savedElement)) {
      this.savedElement.focus();
      window.scrollTo(this.savedScrollPosition.x, this.savedScrollPosition.y);
    }
  }

  clear(): void {
    this.savedElement = null;
  }
}

/**
 * Focus ring polyfill per browser che non supportano :focus-visible
 */
export function setupFocusRingPolyfill(): void {
  // CSS per focus visible
  const css = `
    :focus {
      outline: none;
    }
    
    .focus-visible,
    :focus-visible {
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
    }
    
    /* High contrast mode support */
    @media (prefers-contrast: high) {
      .focus-visible,
      :focus-visible {
        outline: 3px solid currentColor;
        outline-offset: 0;
      }
    }
    
    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
      .focus-visible,
      :focus-visible {
        transition: none;
      }
    }
  `;

  // Aggiungi stile solo se non esiste già
  if (!document.getElementById('focus-ring-styles')) {
    const style = document.createElement('style');
    style.id = 'focus-ring-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }
}

export default {
  scrollIntoView,
  buildFocusStyle,
  setupFocusVisible,
  isVisible,
  isFullyVisible,
  createFocusGuards,
  getFocusableElements,
  FocusManager,
  setupFocusRingPolyfill,
};
