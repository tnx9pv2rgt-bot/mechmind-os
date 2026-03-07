'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface UseExitIntentOptions {
  /** 
   * Threshold Y position (0-1) per triggerare l'exit intent.
   * Default: 0.1 (10% dall'alto)
   */
  threshold?: number;
  /** 
   * Delay in ms prima di attivare il detection.
   * Utile per non disturbare subito l'utente.
   * Default: 5000 (5 secondi)
   */
  activationDelay?: number;
  /** 
   * Cooldown in ms tra un trigger e l'altro.
   * Default: 10000 (10 secondi)
   */
  cooldown?: number;
  /** 
   * Numero max di volte che l'exit intent può triggerare.
   * Default: 1
   */
  maxTriggers?: number;
  /** 
   * Abilita detection su mobile.
   * Default: true
   */
  enableOnMobile?: boolean;
  /** 
   * Soglia di scroll su mobile per triggerare (in pixel).
   * Quando l'utente scrolla verso l'alto oltre questa soglia.
   * Default: 100
   */
  mobileScrollThreshold?: number;
  /** 
   * Disabilita su pagine specifiche (regex patterns).
   */
  disabledPaths?: RegExp[];
  /** 
   * Callback quando viene rilevato un exit intent.
   */
  onExitIntent?: () => void;
  /** 
   * Callback quando l'utente cambia tab (visibilitychange).
   */
  onTabChange?: () => void;
  /** 
   * Callback quando viene rilevato back gesture su mobile.
   */
  onBackGesture?: () => void;
}

export interface UseExitIntentReturn {
  /** Se l'exit intent è stato triggerato */
  isTriggered: boolean;
  /** Numero di volte che è stato triggerato */
  triggerCount: number;
  /** Se il detection è attivo */
  isActive: boolean;
  /** Manuale: triggera l'exit intent */
  trigger: () => void;
  /** Manuale: resetta lo stato */
  reset: () => void;
  /** Manuale: disattiva temporaneamente */
  deactivate: () => void;
  /** Manuale: riattiva */
  activate: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_THRESHOLD = 0.1;
const DEFAULT_ACTIVATION_DELAY = 5000;
const DEFAULT_COOLDOWN = 10000;
const DEFAULT_MAX_TRIGGERS = 1;
const DEFAULT_MOBILE_SCROLL_THRESHOLD = 100;

// ============================================================================
// DEVICE DETECTION
// ============================================================================

function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

function isMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useExitIntent(options: UseExitIntentOptions = {}): UseExitIntentReturn {
  const {
    threshold = DEFAULT_THRESHOLD,
    activationDelay = DEFAULT_ACTIVATION_DELAY,
    cooldown = DEFAULT_COOLDOWN,
    maxTriggers = DEFAULT_MAX_TRIGGERS,
    enableOnMobile = true,
    mobileScrollThreshold = DEFAULT_MOBILE_SCROLL_THRESHOLD,
    disabledPaths = [],
    onExitIntent,
    onTabChange,
    onBackGesture,
  } = options;

  // Refs
  const isActiveRef = useRef(false);
  const triggerCountRef = useRef(0);
  const lastTriggerRef = useRef(0);
  const scrollStartRef = useRef(0);
  const touchStartYRef = useRef(0);
  const activationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // State
  const [isTriggered, setIsTriggered] = useState(false);
  const [triggerCount, setTriggerCount] = useState(0);
  const [isActive, setIsActive] = useState(false);

  // ============================================================================
  // HELPERS
  // ============================================================================

  const isPathDisabled = useCallback((): boolean => {
    const currentPath = window.location.pathname;
    return disabledPaths.some(pattern => pattern.test(currentPath));
  }, [disabledPaths]);

  const canTrigger = useCallback((): boolean => {
    if (!isActiveRef.current) return false;
    if (isPathDisabled()) return false;
    if (triggerCountRef.current >= maxTriggers) return false;
    
    const now = Date.now();
    if (now - lastTriggerRef.current < cooldown) return false;
    
    return true;
  }, [cooldown, maxTriggers, isPathDisabled]);

  const triggerExitIntent = useCallback((): void => {
    if (!canTrigger()) return;

    triggerCountRef.current += 1;
    lastTriggerRef.current = Date.now();
    
    setTriggerCount(triggerCountRef.current);
    setIsTriggered(true);
    onExitIntent?.();
  }, [canTrigger, onExitIntent]);

  // ============================================================================
  // MOUSE EXIT DETECTION (Desktop)
  // ============================================================================

  useEffect(() => {
    if (isMobile() && !enableOnMobile) return;

    const handleMouseLeave = (e: MouseEvent): void => {
      // Trigger solo quando il mouse esce dalla parte superiore della pagina
      if (e.clientY < window.innerHeight * threshold && e.relatedTarget === null) {
        triggerExitIntent();
      }
    };

    // Aspetta il delay di attivazione
    activationTimeoutRef.current = setTimeout(() => {
      isActiveRef.current = true;
      setIsActive(true);
      document.addEventListener('mouseout', handleMouseLeave);
    }, activationDelay);

    return () => {
      if (activationTimeoutRef.current) {
        clearTimeout(activationTimeoutRef.current);
      }
      document.removeEventListener('mouseout', handleMouseLeave);
    };
  }, [threshold, activationDelay, enableOnMobile, triggerExitIntent]);

  // ============================================================================
  // MOBILE BACK GESTURE DETECTION
  // ============================================================================

  useEffect(() => {
    if (!enableOnMobile || !isMobile()) return;

    let touchStartX = 0;
    let touchStartY = 0;

    const handleTouchStart = (e: TouchEvent): void => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartYRef.current = touchStartY;
    };

    const handleTouchMove = (e: TouchEvent): void => {
      const touchX = e.touches[0].clientX;
      const touchY = e.touches[0].clientY;
      
      // Detect back gesture (swipe from left edge on Android, or edge swipe on iOS)
      const isBackGesture = touchStartX < 30 && touchX > touchStartX + 50;
      
      // Detect scroll up (pull to refresh gesture or trying to exit)
      const isScrollUp = touchY > touchStartYRef.current + mobileScrollThreshold && window.scrollY === 0;
      
      if (isBackGesture || isScrollUp) {
        triggerExitIntent();
        if (isBackGesture) {
          onBackGesture?.();
        }
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, [enableOnMobile, mobileScrollThreshold, triggerExitIntent, onBackGesture]);

  // ============================================================================
  // TAB CHANGE DETECTION
  // ============================================================================

  useEffect(() => {
    const handleVisibilityChange = (): void => {
      if (document.visibilityState === 'hidden') {
        // User sta lasciando la tab
        onTabChange?.();
        
        // Se torna dopo un po', potrebbe essere un exit intent
        const leaveTime = Date.now();
        
        const checkReturn = (): void => {
          if (document.visibilityState === 'visible') {
            const away = Date.now() - leaveTime;
            // Se è stato via più di 30 secondi, potrebbe essere un exit intent
            if (away > 30000 && canTrigger()) {
              triggerExitIntent();
            }
            document.removeEventListener('visibilitychange', checkReturn);
          }
        };
        
        // One-time listener per il ritorno
        const originalHandler = handleVisibilityChange;
        document.removeEventListener('visibilitychange', originalHandler);
        document.addEventListener('visibilitychange', checkReturn, { once: true });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [onTabChange, canTrigger, triggerExitIntent]);

  // ============================================================================
  // HISTORY API DETECTION (Back button)
  // ============================================================================

  useEffect(() => {
    // Aggiungi uno stato fittizio per rilevare il back button
    if (window.history.pushState) {
      window.history.pushState({ page: 'form' }, '', window.location.href);
    }

    const handlePopState = (): void => {
      if (canTrigger()) {
        triggerExitIntent();
        onBackGesture?.();
        
        // Previeni il vero back
        window.history.pushState({ page: 'form' }, '', window.location.href);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [canTrigger, triggerExitIntent, onBackGesture]);

  // ============================================================================
  // IDLE DETECTION
  // ============================================================================

  useEffect(() => {
    let idleTimeout: NodeJS.Timeout;
    const IDLE_TIME = 60000; // 1 minuto

    const resetIdleTimer = (): void => {
      clearTimeout(idleTimeout);
      idleTimeout = setTimeout(() => {
        // Utente inattivo per troppo tempo - potrebbe abbandonare
        if (canTrigger()) {
          triggerExitIntent();
        }
      }, IDLE_TIME);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, resetIdleTimer, { passive: true });
    });

    resetIdleTimer();

    return () => {
      clearTimeout(idleTimeout);
      events.forEach(event => {
        document.removeEventListener(event, resetIdleTimer);
      });
    };
  }, [canTrigger, triggerExitIntent]);

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  const trigger = useCallback((): void => {
    triggerExitIntent();
  }, [triggerExitIntent]);

  const reset = useCallback((): void => {
    triggerCountRef.current = 0;
    lastTriggerRef.current = 0;
    setTriggerCount(0);
    setIsTriggered(false);
  }, []);

  const deactivate = useCallback((): void => {
    isActiveRef.current = false;
    setIsActive(false);
  }, []);

  const activate = useCallback((): void => {
    isActiveRef.current = true;
    setIsActive(true);
  }, []);

  return {
    isTriggered,
    triggerCount,
    isActive,
    trigger,
    reset,
    deactivate,
    activate,
  };
}

export default useExitIntent;
