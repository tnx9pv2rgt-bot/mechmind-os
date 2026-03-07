/**
 * useA11yAnnouncer Hook
 * Gestisce annunci per screen reader
 * WCAG 2.1 - Criterion 4.1.3: Status Messages
 */

import { useCallback, useRef, useState } from 'react';

export type AnnouncePriority = 'polite' | 'assertive' | 'off';

export interface AnnounceOptions {
  /** Priorità dell'annuncio */
  priority?: AnnouncePriority;
  /** Timeout prima di pulire l'annuncio */
  clearAfter?: number;
  /** ID univoco per evitare duplicati */
  id?: string;
}

export interface Announcement {
  id: string;
  message: string;
  priority: AnnouncePriority;
  timestamp: number;
}

export interface A11yAnnouncerReturn {
  /** Lista annunci attivi */
  announcements: Announcement[];
  /** Annuncia un messaggio */
  announce: (message: string, options?: AnnounceOptions) => void;
  /** Annuncia immediatamente (assertive) */
  announceImmediately: (message: string, options?: Omit<AnnounceOptions, 'priority'>) => void;
  /** Annuncia errore */
  announceError: (message: string, options?: Omit<AnnounceOptions, 'priority'>) => void;
  /** Annuncia successo */
  announceSuccess: (message: string, options?: Omit<AnnounceOptions, 'priority'>) => void;
  /** Annuncia caricamento */
  announceLoading: (message: string, options?: Omit<AnnounceOptions, 'priority'>) => void;
  /** Pulisce tutti gli annunci */
  clear: () => void;
  /** Pulisce un annuncio specifico */
  clearAnnouncement: (id: string) => void;
}

// Genera ID univoco
const generateId = (): string => {
  return `announce-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export function useA11yAnnouncer(): A11yAnnouncerReturn {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const timeoutsRef = useRef<Map<string, number>>(new Map());

  // Pulisce timeout per un annuncio
  const clearTimeoutForId = useCallback((id: string) => {
    const timeoutId = timeoutsRef.current.get(id);
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      timeoutsRef.current.delete(id);
    }
  }, []);

  // Annuncia messaggio
  const announce = useCallback((
    message: string,
    options: AnnounceOptions = {}
  ) => {
    const {
      priority = 'polite',
      clearAfter = 1000,
      id = generateId(),
    } = options;

    // Pulisci timeout precedente per questo ID
    clearTimeoutForId(id);

    // Crea nuovo annuncio
    const announcement: Announcement = {
      id,
      message,
      priority,
      timestamp: Date.now(),
    };

    setAnnouncements((prev) => {
      // Rimuovi annuncio con stesso ID se esiste
      const filtered = prev.filter((a) => a.id !== id);
      return [...filtered, announcement];
    });

    // Programma pulizia
    if (clearAfter > 0) {
      const timeoutId = window.setTimeout(() => {
        setAnnouncements((prev) => prev.filter((a) => a.id !== id));
        timeoutsRef.current.delete(id);
      }, clearAfter);
      timeoutsRef.current.set(id, timeoutId);
    }

    return id;
  }, [clearTimeoutForId]);

  // Annuncio immediato (assertive)
  const announceImmediately = useCallback((
    message: string,
    options: Omit<AnnounceOptions, 'priority'> = {}
  ) => {
    return announce(message, { ...options, priority: 'assertive' });
  }, [announce]);

  // Annuncio errore
  const announceError = useCallback((
    message: string,
    options: Omit<AnnounceOptions, 'priority'> = {}
  ) => {
    return announceImmediately(`Errore: ${message}`, options);
  }, [announceImmediately]);

  // Annuncio successo
  const announceSuccess = useCallback((
    message: string,
    options: Omit<AnnounceOptions, 'priority'> = {}
  ) => {
    return announce(`Successo: ${message}`, options);
  }, [announce]);

  // Annuncio caricamento
  const announceLoading = useCallback((
    message: string,
    options: Omit<AnnounceOptions, 'priority'> = {}
  ) => {
    return announce(message, { ...options, priority: 'assertive', clearAfter: 0 });
  }, [announce]);

  // Pulisce tutti gli annunci
  const clear = useCallback(() => {
    // Pulisci tutti i timeout
    timeoutsRef.current.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    timeoutsRef.current.clear();
    setAnnouncements([]);
  }, []);

  // Pulisce un annuncio specifico
  const clearAnnouncement = useCallback((id: string) => {
    clearTimeoutForId(id);
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  }, [clearTimeoutForId]);

  return {
    announcements,
    announce,
    announceImmediately,
    announceError,
    announceSuccess,
    announceLoading,
    clear,
    clearAnnouncement,
  };
}

// Hook specifico per form
export interface FormAnnouncerOptions {
  formName?: string;
  totalSteps?: number;
}

export function useFormAnnouncer(options: FormAnnouncerOptions = {}) {
  const { formName = 'form', totalSteps } = options;
  const { announce, announceError, announceSuccess } = useA11yAnnouncer();

  const announceFieldError = useCallback((
    fieldName: string,
    error: string
  ) => {
    announceError(`Nel campo ${fieldName}: ${error}`, { clearAfter: 5000 });
  }, [announceError]);

  const announceFieldSuccess = useCallback((
    fieldName: string
  ) => {
    announceSuccess(`Campo ${fieldName} compilato correttamente`, { clearAfter: 1000 });
  }, [announceSuccess]);

  const announceStepChange = useCallback((
    currentStep: number,
    stepTitle?: string
  ) => {
    const stepInfo = totalSteps 
      ? `Step ${currentStep} di ${totalSteps}` 
      : `Step ${currentStep}`;
    const message = stepTitle 
      ? `${stepInfo}, ${stepTitle}` 
      : stepInfo;
    announce(message, { priority: 'polite', clearAfter: 2000 });
  }, [announce, totalSteps]);

  const announceFormSubmit = useCallback(() => {
    announce('Invio modulo in corso...', { priority: 'assertive' });
  }, [announce]);

  const announceFormSuccess = useCallback(() => {
    announceSuccess('Modulo inviato con successo', { clearAfter: 3000 });
  }, [announceSuccess]);

  const announceFormError = useCallback((errorMessage?: string) => {
    const message = errorMessage || 'Errore nella compilazione del modulo';
    announceError(message, { clearAfter: 5000 });
  }, [announceError]);

  const announceRequiredField = useCallback((fieldName: string) => {
    announce(`Campo obbligatorio: ${fieldName}`, { priority: 'polite' });
  }, [announce]);

  return {
    announceFieldError,
    announceFieldSuccess,
    announceStepChange,
    announceFormSubmit,
    announceFormSuccess,
    announceFormError,
    announceRequiredField,
  };
}

export default useA11yAnnouncer;
