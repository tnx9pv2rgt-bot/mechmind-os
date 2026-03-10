'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { UseFormReturn, FieldValues } from 'react-hook-form';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface PersistedFormData {
  data: Record<string, unknown>;
  currentStep: number;
  timestamp: number;
  formId: string;
  version: number;
}

export interface UseFormPersistenceOptions {
  /** Form ID univoco per identificare il form */
  formId: string;
  /** Versione dello schema (per invalidare dati obsoleti) */
  version?: number;
  /** Durata in giorni prima che i dati scadano */
  expirationDays?: number;
  /** Intervallo di auto-save in millisecondi (default: 30000) */
  autoSaveInterval?: number;
  /** Abilita save on blur */
  saveOnBlur?: boolean;
  /** Callback quando i dati vengono ripristinati */
  onRestore?: (data: PersistedFormData) => void;
  /** Callback quando i dati vengono salvati */
  onSave?: (data: PersistedFormData) => void;
  /** Callback quando i dati scadono */
  onExpire?: () => void;
  /** Funzione per crittografare i dati (opzionale) */
  encrypt?: (data: string) => string;
  /** Funzione per decrittografare i dati (opzionale) */
  decrypt?: (data: string) => string;
}

export interface UseFormPersistenceReturn {
  /** Timestamp dell'ultimo salvataggio */
  lastSaved: Date | null;
  /** Testo formattato del tempo trascorso */
  lastSavedText: string;
  /** Se c'è un ripristino disponibile */
  hasRestorableData: boolean;
  /** Se mostrare il modal di ripristino */
  showRestoreModal: boolean;
  /** Se i dati sono scaduti */
  isExpired: boolean;
  /** Quanti giorni fa sono stati salvati i dati */
  daysSinceSave: number;
  /** Salva manualmente i dati */
  saveForm: () => void;
  /** Ripristina i dati salvati */
  restoreForm: () => void;
  /** Cancella i dati salvati */
  clearSavedData: () => void;
  /** Chiudi il modal di ripristino */
  dismissRestoreModal: () => void;
  /** Forza un save immediato */
  forceSave: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_PREFIX = 'form_persistence_';
const DEFAULT_EXPIRATION_DAYS = 7;
const DEFAULT_AUTO_SAVE_INTERVAL = 30000; // 30 secondi
const DAYS_IN_MS = 24 * 60 * 60 * 1000;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Genera la chiave per localStorage
 */
function getStorageKey(formId: string): string {
  return `${STORAGE_PREFIX}${formId}`;
}

/**
 * Formatta il tempo trascorso in formato leggibile
 */
function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / DAYS_IN_MS);
  
  if (minutes < 1) return 'Salvato ora';
  if (minutes < 60) return `Salvato ${minutes} minut${minutes === 1 ? 'o' : 'i'} fa`;
  if (hours < 24) return `Salvato ${hours} or${hours === 1 ? 'a' : 'e'} fa`;
  if (days < 7) return `Salvato ${days} giorn${days === 1 ? 'o' : 'i'} fa`;
  return 'Salvato più di una settimana fa';
}

/**
 * Debounce function
 */
function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// ============================================================================
// HOOK
// ============================================================================

export function useFormPersistence<TFieldValues extends FieldValues = FieldValues>(
  form: UseFormReturn<TFieldValues>,
  options: UseFormPersistenceOptions
): UseFormPersistenceReturn {
  const {
    formId,
    version = 1,
    expirationDays = DEFAULT_EXPIRATION_DAYS,
    autoSaveInterval = DEFAULT_AUTO_SAVE_INTERVAL,
    saveOnBlur = true,
    onRestore,
    onSave,
    onExpire,
    encrypt,
    decrypt,
  } = options;

  const { watch, setValue, getValues } = form;
  
  // Refs
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(false);
  const currentStepRef = useRef(1);
  
  // State
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasRestorableData, setHasRestorableData] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [daysSinceSave, setDaysSinceSave] = useState(0);
  const [lastSavedText, setLastSavedText] = useState('');

  // ============================================================================
  // STORAGE OPERATIONS
  // ============================================================================

  const saveToStorage = useCallback((data: PersistedFormData): void => {
    try {
      let serialized = JSON.stringify(data);
      
      // Encrypt if encryption function provided
      if (encrypt) {
        serialized = encrypt(serialized);
      }
      
      localStorage.setItem(getStorageKey(formId), serialized);
      setLastSaved(new Date());
      onSave?.(data);
    } catch (error) {
      console.error('[useFormPersistence] Error saving to localStorage:', error);
    }
  }, [formId, encrypt, onSave]);

  const loadFromStorage = useCallback((): PersistedFormData | null => {
    try {
      const stored = localStorage.getItem(getStorageKey(formId));
      if (!stored) return null;

      let data: string = stored;
      
      // Decrypt if decryption function provided
      if (decrypt) {
        data = decrypt(stored);
      }
      
      const parsed = JSON.parse(data) as PersistedFormData;
      
      // Validate structure
      if (!parsed.data || !parsed.timestamp || !parsed.formId) {
        return null;
      }
      
      return parsed;
    } catch (error) {
      console.error('[useFormPersistence] Error loading from localStorage:', error);
      return null;
    }
  }, [formId, decrypt]);

  const clearStorage = useCallback((): void => {
    try {
      localStorage.removeItem(getStorageKey(formId));
    } catch (error) {
      console.error('[useFormPersistence] Error clearing localStorage:', error);
    }
  }, [formId]);

  // ============================================================================
  // SAVE OPERATIONS
  // ============================================================================

  const saveFormData = useCallback((force: boolean = false): void => {
    const formData = getValues();
    
    const dataToSave: PersistedFormData = {
      data: formData as Record<string, unknown>,
      currentStep: currentStepRef.current,
      timestamp: Date.now(),
      formId,
      version,
    };

    saveToStorage(dataToSave);
    
    if (force) {
      setLastSaved(new Date());
    }
  }, [getValues, formId, version, saveToStorage]);

  const debouncedSave = useCallback(
    debounce(() => saveFormData(false), 500),
    [saveFormData]
  );

  const forceSave = useCallback((): void => {
    saveFormData(true);
  }, [saveFormData]);

  const saveForm = useCallback((): void => {
    saveFormData(true);
  }, [saveFormData]);

  // ============================================================================
  // RESTORE OPERATIONS
  // ============================================================================

  const checkForRestorableData = useCallback((): void => {
    const stored = loadFromStorage();
    
    if (!stored) {
      setHasRestorableData(false);
      return;
    }

    const now = Date.now();
    const expirationTime = expirationDays * DAYS_IN_MS;
    const isDataExpired = now - stored.timestamp > expirationTime;
    const daysAgo = Math.floor((now - stored.timestamp) / DAYS_IN_MS);

    setIsExpired(isDataExpired);
    setDaysSinceSave(daysAgo);
    setLastSaved(new Date(stored.timestamp));

    if (isDataExpired) {
      setHasRestorableData(false);
      clearStorage();
      onExpire?.();
    } else {
      setHasRestorableData(true);
      // Mostra modal solo se i dati non sono troppo recenti (evita flash all'avvio)
      if (daysAgo >= 1) {
        setShowRestoreModal(true);
      }
    }
  }, [loadFromStorage, clearStorage, expirationDays, onExpire]);

  const restoreForm = useCallback((): void => {
    const stored = loadFromStorage();
    
    if (!stored) return;

    // Check version compatibility
    if (stored.version !== version) {
      console.warn(`[useFormPersistence] Version mismatch: stored=${stored.version}, current=${version}`);
    }

    // Restore form data
    Object.entries(stored.data).forEach(([key, value]) => {
      setValue(key as unknown as Parameters<typeof setValue>[0], value as Parameters<typeof setValue>[1], {
        shouldDirty: true,
        shouldTouch: true,
      });
    });

    setLastSaved(new Date(stored.timestamp));
    setShowRestoreModal(false);
    onRestore?.(stored);
  }, [loadFromStorage, setValue, version, onRestore]);

  const clearSavedData = useCallback((): void => {
    clearStorage();
    setHasRestorableData(false);
    setShowRestoreModal(false);
    setLastSaved(null);
  }, [clearStorage]);

  const dismissRestoreModal = useCallback((): void => {
    setShowRestoreModal(false);
  }, []);

  // ============================================================================
  // CURRENT STEP MANAGEMENT
  // ============================================================================

  const setCurrentStep = useCallback((step: number): void => {
    currentStepRef.current = step;
    // Save immediately when step changes
    saveFormData(false);
  }, [saveFormData]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Check for restorable data on mount
  useEffect(() => {
    checkForRestorableData();
    isMountedRef.current = true;
  }, [checkForRestorableData]);

  // Auto-save interval
  useEffect(() => {
    if (!isMountedRef.current) return;

    saveTimeoutRef.current = setInterval(() => {
      saveFormData(false);
    }, autoSaveInterval);

    return () => {
      if (saveTimeoutRef.current) {
        clearInterval(saveTimeoutRef.current);
      }
    };
  }, [autoSaveInterval, saveFormData]);

  // Save on visibility change (tab switch, etc.)
  useEffect(() => {
    const handleVisibilityChange = (): void => {
      if (document.visibilityState === 'hidden') {
        saveFormData(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [saveFormData]);

  // Save on beforeunload
  useEffect(() => {
    const handleBeforeUnload = (): void => {
      saveFormData(true);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveFormData]);

  // Save on pagehide (mobile browsers)
  useEffect(() => {
    const handlePageHide = (): void => {
      saveFormData(true);
    };

    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
  }, [saveFormData]);

  // Watch form changes for debounced save
  useEffect(() => {
    if (!isMountedRef.current) return;

    const subscription = watch(() => {
      debouncedSave();
    });

    return () => subscription.unsubscribe();
  }, [watch, debouncedSave]);

  // Update last saved text
  useEffect(() => {
    if (!lastSaved) {
      setLastSavedText('');
      return;
    }

    setLastSavedText(formatTimeAgo(lastSaved.getTime()));

    // Update every minute
    const interval = setInterval(() => {
      if (lastSaved) {
        setLastSavedText(formatTimeAgo(lastSaved.getTime()));
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [lastSaved]);

  // Expose setCurrentStep globally per questo hook instance
  useEffect(() => {
    // @ts-expect-error - Aggiungiamo un metodo interno
    form.__setPersistenceStep = setCurrentStep;
    return () => {
      // @ts-expect-error - Cleanup
      delete form.__setPersistenceStep;
    };
  }, [form, setCurrentStep]);

  return {
    lastSaved,
    lastSavedText,
    hasRestorableData,
    showRestoreModal,
    isExpired,
    daysSinceSave,
    saveForm,
    restoreForm,
    clearSavedData,
    dismissRestoreModal,
    forceSave,
  };
}

export default useFormPersistence;
