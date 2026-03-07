/**
 * useKeyboardNavigation Hook
 * Gestisce la navigazione da tastiera completa per accessibilità WCAG 2.1 AA
 * 
 * Features:
 * - Tab order logico sequenziale
 * - Esc per chiudere modali/dropdown
 * - Enter per submit
 * - Arrow keys per select/radio
 * - Focus management
 * - Skip links
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface KeyboardNavigationOptions {
  /** Abilita navigazione con frecce per radio/select */
  arrowNavigation?: boolean;
  /** Abilita chiusura con Escape */
  escapeCloses?: boolean;
  /** Elemento da focusare al mount */
  initialFocus?: string | HTMLElement | null;
  /** Elemento a cui ritornare dopo unmount */
  returnFocus?: string | HTMLElement | null;
  /** Selettore per elementi focusabili */
  focusableSelector?: string;
  /** Callback quando premo Escape */
  onEscape?: () => void;
  /** Callback quando premo Enter */
  onEnter?: () => void;
  /** Callback per cambio focus */
  onFocusChange?: (element: HTMLElement) => void;
}

export interface KeyboardNavigationReturn {
  /** Ref da assegnare al container */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Focusa il primo elemento */
  focusFirst: () => void;
  /** Focusa l'ultimo elemento */
  focusLast: () => void;
  /** Focusa elemento successivo */
  focusNext: () => void;
  /** Focusa elemento precedente */
  focusPrevious: () => void;
  /** Elemento attualmente focusato */
  focusedElement: HTMLElement | null;
  /** Se il container ha focus */
  isFocused: boolean;
}

// Selettore default per elementi focusabili
const DEFAULT_FOCUSABLE_SELECTOR = [
  'button:not([disabled]):not([aria-hidden="true"])',
  'a[href]:not([aria-hidden="true"])',
  'input:not([disabled]):not([type="hidden"]):not([aria-hidden="true"])',
  'select:not([disabled]):not([aria-hidden="true"])',
  'textarea:not([disabled]):not([aria-hidden="true"])',
  '[tabindex]:not([tabindex="-1"]):not([disabled]):not([aria-hidden="true"])',
  '[contenteditable]:not([aria-hidden="true"])',
].join(', ');

export function useKeyboardNavigation(
  options: KeyboardNavigationOptions = {}
): KeyboardNavigationReturn {
  const {
    arrowNavigation = false,
    escapeCloses = true,
    initialFocus,
    returnFocus,
    focusableSelector = DEFAULT_FOCUSABLE_SELECTOR,
    onEscape,
    onEnter,
    onFocusChange,
  } = options;

  const containerRef = useRef<HTMLElement>(null);
  const [focusedElement, setFocusedElement] = useState<HTMLElement | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Ottieni tutti gli elementi focusabili
  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];
    return Array.from(
      containerRef.current.querySelectorAll(focusableSelector)
    ).filter((el): el is HTMLElement => {
      // Escludi elementi hidden o con visibility hidden
      const style = window.getComputedStyle(el as Element);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  }, [focusableSelector]);

  // Focusa un elemento specifico
  const focusElement = useCallback((element: HTMLElement | null) => {
    if (element && typeof element.focus === 'function') {
      element.focus();
      setFocusedElement(element);
      onFocusChange?.(element);
    }
  }, [onFocusChange]);

  // Focusa primo elemento
  const focusFirst = useCallback(() => {
    const elements = getFocusableElements();
    if (elements.length > 0) {
      focusElement(elements[0]);
    }
  }, [getFocusableElements, focusElement]);

  // Focusa ultimo elemento
  const focusLast = useCallback(() => {
    const elements = getFocusableElements();
    if (elements.length > 0) {
      focusElement(elements[elements.length - 1]);
    }
  }, [getFocusableElements, focusElement]);

  // Focusa elemento successivo
  const focusNext = useCallback(() => {
    const elements = getFocusableElements();
    const currentIndex = elements.findIndex((el) => el === document.activeElement);
    const nextIndex = currentIndex < elements.length - 1 ? currentIndex + 1 : 0;
    focusElement(elements[nextIndex]);
  }, [getFocusableElements, focusElement]);

  // Focusa elemento precedente
  const focusPrevious = useCallback(() => {
    const elements = getFocusableElements();
    const currentIndex = elements.findIndex((el) => el === document.activeElement);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : elements.length - 1;
    focusElement(elements[prevIndex]);
  }, [getFocusableElements, focusElement]);

  // Gestione eventi keyboard
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const { key, shiftKey, target } = event;
      const elements = getFocusableElements();
      const currentIndex = elements.findIndex((el) => el === target);

      switch (key) {
        case 'Tab': {
          // Gestione Tab circolare nel container
          if (shiftKey && currentIndex === 0) {
            event.preventDefault();
            focusLast();
          } else if (!shiftKey && currentIndex === elements.length - 1) {
            event.preventDefault();
            focusFirst();
          }
          break;
        }

        case 'Escape': {
          if (escapeCloses) {
            event.preventDefault();
            event.stopPropagation();
            onEscape?.();
          }
          break;
        }

        case 'Enter': {
          // Se non su textarea o button, trigger submit
          const targetElement = target as HTMLElement;
          const tagName = targetElement.tagName.toLowerCase();
          if (tagName !== 'textarea' && tagName !== 'button') {
            onEnter?.();
          }
          break;
        }

        case 'ArrowDown':
        case 'ArrowRight': {
          if (arrowNavigation) {
            event.preventDefault();
            focusNext();
          }
          break;
        }

        case 'ArrowUp':
        case 'ArrowLeft': {
          if (arrowNavigation) {
            event.preventDefault();
            focusPrevious();
          }
          break;
        }

        case 'Home': {
          if (arrowNavigation) {
            event.preventDefault();
            focusFirst();
          }
          break;
        }

        case 'End': {
          if (arrowNavigation) {
            event.preventDefault();
            focusLast();
          }
          break;
        }
      }
    };

    const handleFocus = () => {
      setIsFocused(true);
      setFocusedElement(document.activeElement as HTMLElement);
    };

    const handleBlur = () => {
      // Verifica se il focus è ancora nel container
      setTimeout(() => {
        if (!container.contains(document.activeElement)) {
          setIsFocused(false);
        }
      }, 0);
    };

    container.addEventListener('keydown', handleKeyDown);
    container.addEventListener('focusin', handleFocus);
    container.addEventListener('focusout', handleBlur);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      container.removeEventListener('focusin', handleFocus);
      container.removeEventListener('focusout', handleBlur);
    };
  }, [
    arrowNavigation,
    escapeCloses,
    getFocusableElements,
    focusFirst,
    focusLast,
    focusNext,
    focusPrevious,
    onEscape,
    onEnter,
  ]);

  // Initial focus
  useEffect(() => {
    if (initialFocus) {
      const element = typeof initialFocus === 'string'
        ? document.querySelector(initialFocus) as HTMLElement
        : initialFocus;
      focusElement(element);
    }

    // Salva elemento attivo precedente per return focus
    previousActiveElement.current = document.activeElement as HTMLElement;

    return () => {
      // Return focus quando unmount
      if (returnFocus) {
        const element = typeof returnFocus === 'string'
          ? document.querySelector(returnFocus) as HTMLElement
          : returnFocus;
        focusElement(element);
      } else if (previousActiveElement.current) {
        focusElement(previousActiveElement.current);
      }
    };
  }, [initialFocus, returnFocus, focusElement]);

  return {
    containerRef,
    focusFirst,
    focusLast,
    focusNext,
    focusPrevious,
    focusedElement,
    isFocused,
  };
}

// Hook specifico per form multi-step
export interface StepNavigationOptions {
  totalSteps: number;
  currentStep: number;
  onStepChange: (step: number) => void;
  validateStep?: (step: number) => boolean;
}

export function useStepKeyboardNavigation(options: StepNavigationOptions) {
  const { totalSteps, currentStep, onStepChange, validateStep } = options;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { key, ctrlKey } = event;

      // Ctrl + Freccia destra = step successivo
      if (ctrlKey && key === 'ArrowRight') {
        event.preventDefault();
        if (currentStep < totalSteps && (!validateStep || validateStep(currentStep))) {
          onStepChange(currentStep + 1);
        }
      }

      // Ctrl + Freccia sinistra = step precedente
      if (ctrlKey && key === 'ArrowLeft') {
        event.preventDefault();
        if (currentStep > 1) {
          onStepChange(currentStep - 1);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [totalSteps, currentStep, onStepChange, validateStep]);

  return {
    canGoNext: currentStep < totalSteps,
    canGoPrevious: currentStep > 1,
    goNext: () => {
      if (currentStep < totalSteps && (!validateStep || validateStep(currentStep))) {
        onStepChange(currentStep + 1);
      }
    },
    goPrevious: () => {
      if (currentStep > 1) {
        onStepChange(currentStep - 1);
      }
    },
  };
}

export default useKeyboardNavigation;
