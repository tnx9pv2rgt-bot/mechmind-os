/**
 * useFocusTrap Hook
 * Trappola il focus all'interno di un container (per modali, dialog, etc.)
 * WCAG 2.1 - Criterion 2.4.3: Focus Order
 * WCAG 2.1 - Criterion 2.4.7: Focus Visible
 */

import { useEffect, useRef, useCallback } from 'react';

export interface FocusTrapOptions {
  /** Se la trappola è attiva */
  isActive: boolean;
  /** Elemento a cui ritornare alla chiusura */
  returnFocusTo?: HTMLElement | null;
  /** Primo elemento da focusare */
  initialFocus?: HTMLElement | string | null;
  /** Selettore per elementi focusabili */
  focusableSelector?: string;
  /** Callback quando focus esce dal trap */
  onEscapeFocus?: () => void;
  /** Se auto-focusare il primo elemento */
  autoFocus?: boolean;
}

export interface FocusTrapReturn {
  /** Ref da assegnare al container */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Attiva manualmente il trap */
  activate: () => void;
  /** Disattiva manualmente il trap */
  deactivate: () => void;
  /** Se il trap è attivo */
  isTrapped: boolean;
}

// Selettore per elementi focusabili
const FOCUSABLE_SELECTOR = [
  'button:not([disabled]):not([tabindex="-1"])',
  'a[href]:not([tabindex="-1"])',
  'input:not([disabled]):not([tabindex="-1"]):not([type="hidden"])',
  'select:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"]):not([disabled])',
  '[contenteditable]:not([tabindex="-1"])',
  'audio[controls]:not([tabindex="-1"])',
  'video[controls]:not([tabindex="-1"])',
  'summary:not([tabindex="-1"])',
  'details:not([tabindex="-1"]) > summary:first-child',
  'iframe:not([tabindex="-1"])',
  'object:not([tabindex="-1"])',
  'embed:not([tabindex="-1"])',
].join(', ');

export function useFocusTrap(options: FocusTrapOptions): FocusTrapReturn {
  const {
    isActive,
    returnFocusTo,
    initialFocus,
    focusableSelector = FOCUSABLE_SELECTOR,
    onEscapeFocus,
    autoFocus = true,
  } = options;

  const containerRef = useRef<HTMLElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const isTrappedRef = useRef(false);
  const [isTrapped, setIsTrapped] = React.useState(false);

  // Ottieni elementi focusabili
  const getFocusableElements = useCallback((): HTMLElement[] => {
    const container = containerRef.current;
    if (!container) return [];

    return Array.from(container.querySelectorAll(focusableSelector))
      .filter((el): el is HTMLElement => {
        const htmlEl = el as HTMLElement;
        // Verifica visibilità
        const style = window.getComputedStyle(htmlEl);
        return (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          htmlEl.offsetParent !== null
        );
      })
      .sort((a, b) => {
        // Ordina per tabindex
        const aTabIndex = parseInt(a.getAttribute('tabindex') || '0', 10);
        const bTabIndex = parseInt(b.getAttribute('tabindex') || '0', 10);
        return aTabIndex - bTabIndex;
      });
  }, [focusableSelector]);

  // Focusa primo elemento
  const focusFirst = useCallback(() => {
    const elements = getFocusableElements();
    if (elements.length > 0) {
      elements[0].focus();
    }
  }, [getFocusableElements]);

  // Focusa ultimo elemento
  const focusLast = useCallback(() => {
    const elements = getFocusableElements();
    if (elements.length > 0) {
      elements[elements.length - 1].focus();
    }
  }, [getFocusableElements]);

  // Gestione Tab key
  const handleTabKey = useCallback(
    (event: KeyboardEvent) => {
      const elements = getFocusableElements();
      if (elements.length === 0) return;

      const firstElement = elements[0];
      const lastElement = elements[elements.length - 1];
      const activeElement = document.activeElement as HTMLElement;

      // Shift + Tab sul primo elemento -> vai all'ultimo
      if (event.shiftKey) {
        if (activeElement === firstElement || !containerRef.current?.contains(activeElement)) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab sull'ultimo elemento -> vai al primo
        if (activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    },
    [getFocusableElements]
  );

  // Gestione Escape key
  const handleEscapeKey = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onEscapeFocus?.();
      }
    },
    [onEscapeFocus]
  );

  // Attiva trap
  const activate = useCallback(() => {
    if (isTrappedRef.current) return;

    // Salva elemento precedente
    previousActiveElement.current = document.activeElement as HTMLElement;

    isTrappedRef.current = true;
    setIsTrapped(true);

    // Focus iniziale
    if (autoFocus) {
      setTimeout(() => {
        if (initialFocus) {
          if (typeof initialFocus === 'string') {
            const el = containerRef.current?.querySelector(initialFocus) as HTMLElement;
            el?.focus();
          } else {
            initialFocus.focus();
          }
        } else {
          focusFirst();
        }
      }, 0);
    }
  }, [autoFocus, initialFocus, focusFirst]);

  // Disattiva trap
  const deactivate = useCallback(() => {
    if (!isTrappedRef.current) return;

    isTrappedRef.current = false;
    setIsTrapped(false);

    // Ritorna focus all'elemento precedente
    const elementToFocus = returnFocusTo || previousActiveElement.current;
    if (elementToFocus && typeof elementToFocus.focus === 'function') {
      setTimeout(() => elementToFocus.focus(), 0);
    }
  }, [returnFocusTo]);

  // Event listeners
  useEffect(() => {
    if (!isActive) {
      if (isTrappedRef.current) {
        deactivate();
      }
      return;
    }

    activate();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        handleTabKey(event);
      } else if (event.key === 'Escape') {
        handleEscapeKey(event);
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      deactivate();
    };
  }, [isActive, activate, deactivate, handleTabKey, handleEscapeKey]);

  return {
    containerRef,
    activate,
    deactivate,
    isTrapped,
  };
}

// React import per useState
import React from 'react';

export default useFocusTrap;
