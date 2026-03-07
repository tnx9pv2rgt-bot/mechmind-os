/**
 * Keyboard Accessibility Utilities
 * WCAG 2.1 - Criterion 2.1.1: Keyboard
 * WCAG 2.1 - Criterion 2.1.2: No Keyboard Trap
 */

export type KeyHandler = (event: KeyboardEvent) => void;

export interface KeyCombo {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
}

/**
 * Verifica se una combinazione di tasti corrisponde all'evento
 */
export function matchesKeyCombo(event: KeyboardEvent, combo: KeyCombo): boolean {
  return (
    event.key === combo.key &&
    !!event.ctrlKey === !!combo.ctrl &&
    !!event.altKey === !!combo.alt &&
    !!event.shiftKey === !!combo.shift &&
    !!event.metaKey === !!combo.meta
  );
}

/**
 * Crea handler per shortcut da tastiera
 */
export function createShortcutHandler(
  shortcuts: Record<string, KeyHandler>
): KeyHandler {
  return (event: KeyboardEvent) => {
    for (const [combo, handler] of Object.entries(shortcuts)) {
      const keys = combo.toLowerCase().split('+');
      const comboObj: KeyCombo = {
        key: keys.find(k => !['ctrl', 'alt', 'shift', 'meta'].includes(k)) || '',
        ctrl: keys.includes('ctrl'),
        alt: keys.includes('alt'),
        shift: keys.includes('shift'),
        meta: keys.includes('meta'),
      };

      if (matchesKeyCombo(event, comboObj)) {
        event.preventDefault();
        handler(event);
        return;
      }
    }
  };
}

/**
 * Common keyboard shortcuts
 */
export const COMMON_SHORTCUTS = {
  // Navigation
  focusSearch: { key: '/', ctrl: false, alt: false, shift: false },
  focusMenu: { key: 'm', ctrl: false, alt: true, shift: false },
  goBack: { key: 'ArrowLeft', ctrl: true, alt: false, shift: false },
  goForward: { key: 'ArrowRight', ctrl: true, alt: false, shift: false },
  
  // Form
  submitForm: { key: 'Enter', ctrl: true, alt: false, shift: false },
  cancelForm: { key: 'Escape', ctrl: false, alt: false, shift: false },
  saveDraft: { key: 's', ctrl: true, alt: false, shift: false },
  
  // Modal
  closeModal: { key: 'Escape', ctrl: false, alt: false, shift: false },
  confirmModal: { key: 'Enter', ctrl: false, alt: false, shift: false },
  
  // Help
  showHelp: { key: '?', ctrl: false, alt: false, shift: true },
  showShortcuts: { key: '?', ctrl: true, alt: false, shift: true },
} as const;

/**
 * Gestisce focus trap all'interno di un elemento
 */
export function trapFocus(
  container: HTMLElement,
  options: {
    escapeCloses?: boolean;
    onEscape?: () => void;
    returnFocus?: boolean;
  } = {}
): () => void {
  const { escapeCloses = true, onEscape, returnFocus = true } = options;
  
  const previousActiveElement = document.activeElement as HTMLElement;
  
  const focusableElements = container.querySelectorAll<HTMLElement>(
    'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') {
      if (escapeCloses && event.key === 'Escape' && onEscape) {
        event.preventDefault();
        onEscape();
      }
      return;
    }

    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    }
  };

  container.addEventListener('keydown', handleKeyDown);
  firstElement?.focus();

  return () => {
    container.removeEventListener('keydown', handleKeyDown);
    if (returnFocus && previousActiveElement) {
      previousActiveElement.focus();
    }
  };
}

/**
 * Simula click su elemento al press di Enter o Space
 * Per elementi non nativamente cliccabili
 */
export function makeClickable(element: HTMLElement): () => void {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      element.click();
    }
  };

  element.setAttribute('tabindex', '0');
  element.setAttribute('role', 'button');
  element.addEventListener('keydown', handleKeyDown);

  return () => {
    element.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Ottieni descrizione leggibile di una shortcut
 */
export function formatShortcut(combo: KeyCombo, platform?: 'mac' | 'win' | 'linux'): string {
  const isMac = platform === 'mac' || (!platform && navigator.platform.includes('Mac'));
  
  const parts: string[] = [];
  
  if (combo.meta || combo.ctrl) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }
  if (combo.alt) {
    parts.push(isMac ? '⌥' : 'Alt');
  }
  if (combo.shift) {
    parts.push(isMac ? '⇧' : 'Shift');
  }
  
  // Formatta tasto speciale
  let key = combo.key;
  if (key === 'ArrowUp') key = '↑';
  else if (key === 'ArrowDown') key = '↓';
  else if (key === 'ArrowLeft') key = '←';
  else if (key === 'ArrowRight') key = '→';
  else if (key === 'Enter') key = isMac ? '⏎' : 'Enter';
  else if (key === 'Escape') key = 'Esc';
  
  parts.push(key);
  
  return parts.join(isMac ? '' : '+');
}

/**
 * Verifica se un elemento è attualmente focusabile
 */
export function isFocusable(element: Element): boolean {
  const htmlElement = element as HTMLElement;
  
  // Verifica attributi
  if (htmlElement.disabled) return false;
  if (htmlElement.getAttribute('tabindex') === '-1') return false;
  if (htmlElement.getAttribute('aria-hidden') === 'true') return false;
  
  // Verifica visibilità
  const style = window.getComputedStyle(htmlElement);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  
  // Verifica se è un elemento focusabile
  const focusableTags = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'];
  const isFocusableTag = focusableTags.includes(element.tagName);
  const hasTabIndex = htmlElement.hasAttribute('tabindex');
  const hasHref = element.tagName === 'A' && htmlElement.hasAttribute('href');
  
  return isFocusableTag && (element.tagName !== 'A' || hasHref) || hasTabIndex;
}

/**
 * Trova prossimo elemento focusabile
 */
export function findNextFocusable(
  container: HTMLElement,
  currentElement: HTMLElement,
  direction: 'next' | 'previous' = 'next'
): HTMLElement | null {
  const focusableElements = Array.from(
    container.querySelectorAll<HTMLElement>(
      'button, a[href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  ).filter(isFocusable);

  const currentIndex = focusableElements.indexOf(currentElement);
  
  if (currentIndex === -1) return null;
  
  if (direction === 'next') {
    return focusableElements[currentIndex + 1] || focusableElements[0] || null;
  } else {
    return focusableElements[currentIndex - 1] || 
           focusableElements[focusableElements.length - 1] || null;
  }
}

/**
 * Imposta focus iniziale per una pagina/modale
 */
export function setInitialFocus(
  container: HTMLElement,
  selector?: string
): boolean {
  const target = selector 
    ? container.querySelector<HTMLElement>(selector)
    : container.querySelector<HTMLElement>(
        'input:not([type="hidden"]), select, textarea, button, a[href]'
      );
  
  if (target && isFocusable(target)) {
    target.focus();
    return true;
  }
  
  return false;
}

/**
 * Salva e ripristina focus
 */
export function createFocusManager() {
  let savedFocus: HTMLElement | null = null;

  return {
    save: () => {
      savedFocus = document.activeElement as HTMLElement;
    },
    restore: () => {
      if (savedFocus && document.contains(savedFocus)) {
        savedFocus.focus();
      }
    },
    clear: () => {
      savedFocus = null;
    },
  };
}

export default {
  matchesKeyCombo,
  createShortcutHandler,
  COMMON_SHORTCUTS,
  trapFocus,
  makeClickable,
  formatShortcut,
  isFocusable,
  findNextFocusable,
  setInitialFocus,
  createFocusManager,
};
