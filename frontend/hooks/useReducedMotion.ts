/**
 * useReducedMotion Hook
 * Rileva e gestisce la preferenza utente per animazioni ridotte
 * WCAG 2.1 - Criterion 2.2.2: Pause, Stop, Hide
 * WCAG 2.1 - Criterion 2.3.3: Animation from Interactions
 */

import { useEffect, useState, useCallback } from 'react';

// Storage key per persistenza preferenza
const STORAGE_KEY = 'a11y_reduced_motion';

export interface ReducedMotionOptions {
  /** Persisti la preferenza in localStorage */
  persist?: boolean;
  /** Valore di default se non rilevato */
  defaultValue?: boolean;
}

export interface ReducedMotionReturn {
  /** Se l'utente preferisce motion ridotta */
  prefersReducedMotion: boolean;
  /** Se l'utente ha scelto manualmente */
  isManuallySet: boolean;
  /** Attiva motion ridotta */
  enable: () => void;
  /** Disattiva motion ridotta */
  disable: () => void;
  /** Toggle motion ridotta */
  toggle: () => void;
  /** Reset alla preferenza di sistema */
  reset: () => void;
  /** Classe CSS da applicare per stili condizionali */
  motionClass: string;
  /** Stili inline per motion ridotta */
  reducedMotionStyles: React.CSSProperties;
}

// Stili per motion ridotta
const REDUCED_MOTION_STYLES: React.CSSProperties = {
  animationDuration: '0.01ms !important',
  animationIterationCount: '1 !important',
  transitionDuration: '0.01ms !important',
  scrollBehavior: 'auto !important',
};

export function useReducedMotion(
  options: ReducedMotionOptions = {}
): ReducedMotionReturn {
  const { persist = true, defaultValue = false } = options;

  // Stato per preferenza di sistema
  const [systemPrefersReducedMotion, setSystemPrefersReducedMotion] = useState(defaultValue);
  // Stato per preferenza manuale
  const [manualOverride, setManualOverride] = useState<boolean | null>(null);
  // Stato per persistenza caricata
  const [isLoaded, setIsLoaded] = useState(false);

  // Carica preferenza salvata
  useEffect(() => {
    if (!persist || typeof window === 'undefined') {
      setIsLoaded(true);
      return;
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        setManualOverride(saved === 'true');
      }
    } catch (e) {
      console.warn('Failed to load reduced motion preference:', e);
    }
    setIsLoaded(true);
  }, [persist]);

  // Rileva preferenza di sistema
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setSystemPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setSystemPrefersReducedMotion(event.matches);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      // Safari < 14
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  // Calcola valore finale
  const prefersReducedMotion = manualOverride !== null 
    ? manualOverride 
    : systemPrefersReducedMotion;

  // Salva preferenza
  const savePreference = useCallback((value: boolean | null) => {
    if (!persist || typeof window === 'undefined') return;

    try {
      if (value === null) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, String(value));
      }
    } catch (e) {
      console.warn('Failed to save reduced motion preference:', e);
    }
  }, [persist]);

  // Azioni
  const enable = useCallback(() => {
    setManualOverride(true);
    savePreference(true);
  }, [savePreference]);

  const disable = useCallback(() => {
    setManualOverride(false);
    savePreference(false);
  }, [savePreference]);

  const toggle = useCallback(() => {
    const newValue = !prefersReducedMotion;
    setManualOverride(newValue);
    savePreference(newValue);
  }, [prefersReducedMotion, savePreference]);

  const reset = useCallback(() => {
    setManualOverride(null);
    savePreference(null);
  }, [savePreference]);

  // Applica attributo al documento per CSS
  useEffect(() => {
    if (!isLoaded || typeof document === 'undefined') return;

    if (prefersReducedMotion) {
      document.documentElement.setAttribute('data-reduced-motion', 'true');
    } else {
      document.documentElement.removeAttribute('data-reduced-motion');
    }
  }, [prefersReducedMotion, isLoaded]);

  // Classe CSS condizionale
  const motionClass = prefersReducedMotion 
    ? 'motion-reduce' 
    : 'motion-safe';

  return {
    prefersReducedMotion,
    isManuallySet: manualOverride !== null,
    enable,
    disable,
    toggle,
    reset,
    motionClass,
    reducedMotionStyles: prefersReducedMotion ? REDUCED_MOTION_STYLES : {},
  };
}

// Hook per animazioni condizionali
export function useConditionalAnimation<T extends Record<string, unknown>>(
  animationConfig: T,
  options: ReducedMotionOptions = {}
): T | Record<string, unknown> {
  const { prefersReducedMotion } = useReducedMotion(options);

  if (prefersReducedMotion) {
    return {
      ...animationConfig,
      duration: 0,
      transition: { duration: 0 },
      animate: {},
    };
  }

  return animationConfig;
}

// Hook per transizioni condizionali
export function useConditionalTransition(
  transitionDuration: number = 300,
  options: ReducedMotionOptions = {}
): { duration: number; easing: string } {
  const { prefersReducedMotion } = useReducedMotion(options);

  return {
    duration: prefersReducedMotion ? 0 : transitionDuration,
    easing: 'ease-out',
  };
}

export default useReducedMotion;
