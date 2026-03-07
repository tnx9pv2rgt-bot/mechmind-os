/**
 * Utility functions for Conditional Form Flow
 */

import { FormAnswers, FormFlowEvents } from './types';

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Verifica se il dispositivo è mobile
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    window.innerWidth < 768 ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )
  );
}

/**
 * Ottiene l'ID dello step ottimizzato per il dispositivo
 */
export function getOptimizedStepId(stepId: string): string {
  if (isMobileDevice()) {
    // Mappa step complessi a versioni semplificate
    const mobileMap: Record<string, string> = {
      businessData: 'businessDataSimplified',
    };
    return mobileMap[stepId] || stepId;
  }
  return stepId;
}

/**
 * Formatta il tempo stimato in formato leggibile
 */
export function formatEstimatedTime(minutes: number): string {
  if (minutes < 1) {
    const seconds = Math.round(minutes * 60);
    return `${seconds} sec`;
  }
  
  if (minutes < 60) {
    const wholeMinutes = Math.floor(minutes);
    const remainingSeconds = Math.round((minutes - wholeMinutes) * 60);
    
    if (remainingSeconds === 0) {
      return `${wholeMinutes} min`;
    }
    
    return `${wholeMinutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}min`;
}

/**
 * Crea un event emitter tipizzato per il form flow
 */
export function createFormFlowEvents(): {
  on: <K extends keyof FormFlowEvents>(
    event: K,
    handler: (data: FormFlowEvents[K]) => void
  ) => void;
  off: <K extends keyof FormFlowEvents>(
    event: K,
    handler: (data: FormFlowEvents[K]) => void
  ) => void;
  emit: <K extends keyof FormFlowEvents>(event: K, data: FormFlowEvents[K]) => void;
} {
  const handlers: { [K in keyof FormFlowEvents]?: Set<(data: FormFlowEvents[K]) => void> } = {};
  
  return {
    on: <K extends keyof FormFlowEvents>(
      event: K,
      handler: (data: FormFlowEvents[K]) => void
    ) => {
      if (!handlers[event]) {
        handlers[event] = new Set();
      }
      handlers[event]!.add(handler);
    },
    
    off: <K extends keyof FormFlowEvents>(
      event: K,
      handler: (data: FormFlowEvents[K]) => void
    ) => {
      handlers[event]?.delete(handler);
    },
    
    emit: <K extends keyof FormFlowEvents>(event: K, data: FormFlowEvents[K]) => {
      handlers[event]?.forEach((handler) => handler(data));
    },
  };
}

/**
 * Deep merge di risposte
 */
export function mergeAnswers(
  existing: FormAnswers,
  updates: Partial<FormAnswers>
): FormAnswers {
  return {
    ...existing,
    ...updates,
    // Merge nested objects
    ...Object.entries(updates).reduce((acc, [key, value]) => {
      if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        typeof existing[key] === 'object' &&
        existing[key] !== null
      ) {
        acc[key] = { ...existing[key], ...value };
      }
      return acc;
    }, {} as FormAnswers),
  };
}

/**
 * Verifica se due risposte sono diverse
 */
export function haveAnswersChanged(
  prev: FormAnswers,
  current: FormAnswers
): boolean {
  return JSON.stringify(prev) !== JSON.stringify(current);
}

/**
 * Estrae i campi cambiati tra due set di risposte
 */
export function getChangedFields(
  prev: FormAnswers,
  current: FormAnswers
): string[] {
  const changed: string[] = [];
  const allKeys = new Set([...Object.keys(prev), ...Object.keys(current)]);
  
  allKeys.forEach((key) => {
    if (JSON.stringify(prev[key]) !== JSON.stringify(current[key])) {
      changed.push(key);
    }
  });
  
  return changed;
}

/**
 * Valida un indirizzo email
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Valida una partita IVA italiana
 */
export function isValidVAT(vat: string): boolean {
  // Formato: IT + 11 cifre
  return /^IT\d{11}$/i.test(vat.replace(/\s/g, ''));
}

/**
 * Valida un codice fiscale italiano
 */
export function isValidCodiceFiscale(cf: string): boolean {
  // Formato base: 16 caratteri alfanumerici
  return /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/i.test(cf.replace(/\s/g, ''));
}

/**
 * Genera un ID univoco per la sessione del form
 */
export function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Salva lo stato del form in sessionStorage
 */
export function saveFormState(
  sessionId: string,
  state: { stepIndex: number; answers: FormAnswers }
): void {
  if (typeof sessionStorage === 'undefined') return;
  
  try {
    sessionStorage.setItem(
      `formFlow_${sessionId}`,
      JSON.stringify({
        ...state,
        savedAt: Date.now(),
      })
    );
  } catch {
    // Ignora errori di storage
  }
}

/**
 * Carica lo stato del form da sessionStorage
 */
export function loadFormState(
  sessionId: string
): { stepIndex: number; answers: FormAnswers; savedAt: number } | null {
  if (typeof sessionStorage === 'undefined') return null;
  
  try {
    const data = sessionStorage.getItem(`formFlow_${sessionId}`);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

/**
 * Pulisce lo stato salvato
 */
export function clearFormState(sessionId: string): void {
  if (typeof sessionStorage === 'undefined') return;
  
  try {
    sessionStorage.removeItem(`formFlow_${sessionId}`);
  } catch {
    // Ignora errori
  }
}
