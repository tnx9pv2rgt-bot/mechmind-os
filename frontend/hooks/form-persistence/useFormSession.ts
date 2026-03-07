'use client';

import { useCallback, useEffect, useState } from 'react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface SessionData {
  sessionId: string;
  formId: string;
  deviceInfo: {
    userAgent: string;
    platform: string;
    screenSize: string;
  };
  timestamp: number;
  lastActivity: number;
  currentStep: number;
  progress: number;
}

export interface UseFormSessionOptions {
  /** Form ID univoco */
  formId: string;
  /** Durata sessione in minuti */
  sessionDuration?: number;
  /** Callback quando viene rilevata un'altra sessione */
  onOtherSessionDetected?: (session: SessionData) => void;
  /** Callback quando l'utente sceglie di continuare su questo dispositivo */
  onTakeover?: () => void;
  /** Callback quando l'utente sceglie di mantenere l'altra sessione */
  onKeepOther?: () => void;
  /** Abilita sincronizzazione cross-tab */
  enableCrossTabSync?: boolean;
  /** Abilita sincronizzazione cross-device (richiede backend) */
  enableCrossDeviceSync?: boolean;
  /** API endpoint per sincronizzazione */
  syncEndpoint?: string;
}

export interface UseFormSessionReturn {
  /** ID della sessione corrente */
  sessionId: string;
  /** Se c'è un'altra sessione attiva */
  hasOtherSession: boolean;
  /** Dati dell'altra sessione */
  otherSession: SessionData | null;
  /** Se mostrare il modal di takeover */
  showTakeoverModal: boolean;
  /** Aggiorna l'attività della sessione */
  updateActivity: () => void;
  /** Imposta il progresso corrente */
  setProgress: (step: number, totalSteps: number) => void;
  /** Prendi il controllo da un'altra sessione */
  takeOverSession: () => void;
  /** Mantieni l'altra sessione (chiudi questa) */
  keepOtherSession: () => void;
  /** Chiudi il modal senza azione */
  dismissTakeoverModal: () => void;
  /** Forza check altre sessioni */
  checkOtherSessions: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SESSION_COOKIE_NAME = 'form_session_id';
const SESSION_STORAGE_PREFIX = 'form_session_';
const DEFAULT_SESSION_DURATION = 60; // 60 minuti
const ACTIVITY_THROTTLE = 30000; // 30 secondi

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateSessionId(): string {
  return `sess-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getDeviceInfo() {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    screenSize: `${window.screen.width}x${window.screen.height}`,
  };
}

function setCookie(name: string, value: string, minutes: number): void {
  const expires = new Date(Date.now() + minutes * 60000).toUTCString();
  document.cookie = `${name}=${value};expires=${expires};path=/;SameSite=Strict`;
}

function getCookie(name: string): string | null {
  const cookies = document.cookie.split(';');
  const cookie = cookies.find(c => c.trim().startsWith(`${name}=`));
  return cookie ? cookie.split('=')[1] : null;
}

function deleteCookie(name: string): void {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
}

// ============================================================================
// HOOK
// ============================================================================

export function useFormSession(options: UseFormSessionOptions): UseFormSessionReturn {
  const {
    formId,
    sessionDuration = DEFAULT_SESSION_DURATION,
    onOtherSessionDetected,
    onTakeover,
    onKeepOther,
    enableCrossTabSync = true,
    enableCrossDeviceSync = false,
    syncEndpoint,
  } = options;

  // State
  const [sessionId, setSessionId] = useState<string>('');
  const [hasOtherSession, setHasOtherSession] = useState(false);
  const [otherSession, setOtherSession] = useState<SessionData | null>(null);
  const [showTakeoverModal, setShowTakeoverModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [progress, setProgressState] = useState(0);

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================

  const createSession = useCallback((): string => {
    const newSessionId = generateSessionId();
    setCookie(SESSION_COOKIE_NAME, newSessionId, sessionDuration);
    
    const sessionData: SessionData = {
      sessionId: newSessionId,
      formId,
      deviceInfo: getDeviceInfo(),
      timestamp: Date.now(),
      lastActivity: Date.now(),
      currentStep: 1,
      progress: 0,
    };

    localStorage.setItem(
      `${SESSION_STORAGE_PREFIX}${formId}`,
      JSON.stringify(sessionData)
    );

    return newSessionId;
  }, [formId, sessionDuration]);

  const updateSessionData = useCallback((updates: Partial<SessionData>): void => {
    const key = `${SESSION_STORAGE_PREFIX}${formId}`;
    const stored = localStorage.getItem(key);
    
    if (stored) {
      const data = JSON.parse(stored) as SessionData;
      const updated = { ...data, ...updates, lastActivity: Date.now() };
      localStorage.setItem(key, JSON.stringify(updated));
    }
  }, [formId]);

  // ============================================================================
  // CROSS-TAB SYNC
  // ============================================================================

  const checkOtherSessions = useCallback((): void => {
    // Controlla localStorage per altre sessioni
    const allKeys = Object.keys(localStorage);
    const sessionKeys = allKeys.filter(key => 
      key.startsWith(SESSION_STORAGE_PREFIX) && 
      !key.includes(sessionId)
    );

    for (const key of sessionKeys) {
      const stored = localStorage.getItem(key);
      if (stored) {
        const data = JSON.parse(stored) as SessionData;
        
        // Verifica se la sessione è ancora attiva
        const sessionAge = Date.now() - data.lastActivity;
        const sessionTimeout = sessionDuration * 60000;
        
        if (sessionAge < sessionTimeout && data.formId === formId) {
          // Trovata altra sessione attiva
          if (data.sessionId !== sessionId) {
            setHasOtherSession(true);
            setOtherSession(data);
            setShowTakeoverModal(true);
            onOtherSessionDetected?.(data);
            return;
          }
        }
      }
    }
  }, [formId, sessionId, sessionDuration, onOtherSessionDetected]);

  const syncWithBackend = useCallback(async (): Promise<void> => {
    if (!enableCrossDeviceSync || !syncEndpoint) return;

    try {
      const response = await fetch(`${syncEndpoint}/sessions/${formId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const sessions = await response.json() as SessionData[];
        const otherActiveSessions = sessions.filter(s => 
          s.sessionId !== sessionId && 
          Date.now() - s.lastActivity < sessionDuration * 60000
        );

        if (otherActiveSessions.length > 0) {
          setHasOtherSession(true);
          setOtherSession(otherActiveSessions[0]);
          setShowTakeoverModal(true);
          onOtherSessionDetected?.(otherActiveSessions[0]);
        }
      }
    } catch (error) {
      console.error('[useFormSession] Error syncing with backend:', error);
    }
  }, [formId, sessionId, sessionDuration, enableCrossDeviceSync, syncEndpoint, onOtherSessionDetected]);

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  const updateActivity = useCallback((): void => {
    updateSessionData({ lastActivity: Date.now() });
  }, [updateSessionData]);

  const setProgress = useCallback((step: number, totalSteps: number): void => {
    setCurrentStep(step);
    const progressPercent = Math.round((step / totalSteps) * 100);
    setProgressState(progressPercent);
    updateSessionData({ currentStep: step, progress: progressPercent });
  }, [updateSessionData]);

  const takeOverSession = useCallback((): void => {
    // Invalida l'altra sessione
    if (otherSession) {
      localStorage.removeItem(`${SESSION_STORAGE_PREFIX}${formId}`);
      
      // Notifica l'altra tab (se aperta)
      localStorage.setItem(
        `${SESSION_STORAGE_PREFIX}_invalidate`,
        JSON.stringify({ sessionId: otherSession.sessionId, timestamp: Date.now() })
      );
    }

    // Crea nuova sessione
    const newSessionId = createSession();
    setSessionId(newSessionId);
    
    setShowTakeoverModal(false);
    setHasOtherSession(false);
    setOtherSession(null);
    
    onTakeover?.();
  }, [otherSession, formId, createSession, onTakeover]);

  const keepOtherSession = useCallback((): void => {
    // Chiudi questa sessione
    deleteCookie(SESSION_COOKIE_NAME);
    setShowTakeoverModal(false);
    onKeepOther?.();
  }, [onKeepOther]);

  const dismissTakeoverModal = useCallback((): void => {
    setShowTakeoverModal(false);
  }, []);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Initialize session
  useEffect(() => {
    const existingSessionId = getCookie(SESSION_COOKIE_NAME);
    
    if (existingSessionId) {
      // Verifica se esiste nei dati locali
      const stored = localStorage.getItem(`${SESSION_STORAGE_PREFIX}${formId}`);
      if (stored) {
        const data = JSON.parse(stored) as SessionData;
        if (data.sessionId === existingSessionId) {
          setSessionId(existingSessionId);
          setCurrentStep(data.currentStep);
          setProgressState(data.progress);
        } else {
          // Sessione non corrisponde, crea nuova
          const newSessionId = createSession();
          setSessionId(newSessionId);
        }
      } else {
        // Nessun dato locale ma c'è il cookie, crea nuova
        const newSessionId = createSession();
        setSessionId(newSessionId);
      }
    } else {
      // Nessuna sessione, crea nuova
      const newSessionId = createSession();
      setSessionId(newSessionId);
    }
  }, [formId, createSession]);

  // Cross-tab sync via storage events
  useEffect(() => {
    if (!enableCrossTabSync) return;

    const handleStorageChange = (e: StorageEvent): void => {
      if (e.key === `${SESSION_STORAGE_PREFIX}${formId}`) {
        // Un'altra tab ha aggiornato la sessione
        checkOtherSessions();
      }
      
      if (e.key === `${SESSION_STORAGE_PREFIX}_invalidate`) {
        // Un'altra tab ha invalidato questa sessione
        const data = JSON.parse(e.newValue || '{}');
        if (data.sessionId === sessionId) {
          // Questa sessione è stata invalidata
          deleteCookie(SESSION_COOKIE_NAME);
          window.location.reload();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [formId, sessionId, enableCrossTabSync, checkOtherSessions]);

  // Activity tracking
  useEffect(() => {
    let lastActivity = Date.now();
    
    const handleActivity = (): void => {
      const now = Date.now();
      if (now - lastActivity > ACTIVITY_THROTTLE) {
        updateActivity();
        lastActivity = now;
      }
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [updateActivity]);

  // Periodic sync with backend
  useEffect(() => {
    if (!enableCrossDeviceSync) return;

    // Sync immediato
    syncWithBackend();

    // Periodic sync
    const interval = setInterval(() => {
      syncWithBackend();
    }, 60000); // Ogni minuto

    return () => clearInterval(interval);
  }, [enableCrossDeviceSync, syncWithBackend]);

  // Check other sessions on mount
  useEffect(() => {
    if (sessionId) {
      checkOtherSessions();
    }
  }, [sessionId, checkOtherSessions]);

  return {
    sessionId,
    hasOtherSession,
    otherSession,
    showTakeoverModal,
    updateActivity,
    setProgress,
    takeOverSession,
    keepOtherSession,
    dismissTakeoverModal,
    checkOtherSessions,
  };
}

export default useFormSession;
