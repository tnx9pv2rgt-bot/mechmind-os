/**
 * useOfflineQueue Hook
 * 
 * Gestisce la persistenza offline dei dati del form e la sincronizzazione
 * quando la connessione torna disponibile.
 * 
 * @module hooks/form-persistence/useOfflineQueue
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface OfflineQueueOptions {
  /** ID univoco del form */
  formId: string;
  /** Callback quando inizia la sincronizzazione */
  onSyncStart?: () => void;
  /** Callback quando la sincronizzazione è completata */
  onSyncComplete?: () => void;
  /** Callback quando la sincronizzazione fallisce */
  onSyncError?: (error: Error) => void;
  /** Endpoint API per la sincronizzazione */
  syncEndpoint?: string;
  /** Numero massimo di tentativi di sincronizzazione */
  maxRetries?: number;
}

interface QueuedSubmission {
  id: string;
  formId: string;
  data: Record<string, unknown>;
  timestamp: number;
  attempts: number;
  synced: boolean;
}

interface UseOfflineQueueReturn {
  /** Se il dispositivo è online */
  isOnline: boolean;
  /** Se c'è una sincronizzazione in corso */
  isSyncing: boolean;
  /** Numero di sottomissioni in attesa */
  pendingCount: number;
  /** Salva i dati offline */
  saveOffline: (data: Record<string, unknown>) => void;
  /** Forza la sincronizzazione */
  sync: () => Promise<void>;
  /** Ottiene tutte le sottomissioni in attesa */
  getPendingSubmissions: () => QueuedSubmission[];
  /** Cancella una sottomissione specifica */
  removeSubmission: (id: string) => void;
  /** Cancella tutte le sottomissioni */
  clearAll: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_KEY = 'offline_queue';
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_SYNC_ENDPOINT = '/api/customers';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Genera un ID univoco per la sottomissione
 */
function generateSubmissionId(): string {
  return `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Salva la coda nello storage locale
 */
function saveQueueToStorage(queue: QueuedSubmission[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('[useOfflineQueue] Error saving queue:', error);
  }
}

/**
 * Carica la coda dallo storage locale
 */
function loadQueueFromStorage(): QueuedSubmission[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('[useOfflineQueue] Error loading queue:', error);
  }
  return [];
}

/**
 * Filtra le sottomissioni per formId
 */
function filterSubmissionsByFormId(
  queue: QueuedSubmission[],
  formId: string
): QueuedSubmission[] {
  return queue.filter((sub) => sub.formId === formId);
}

// ============================================================================
// HOOK
// ============================================================================

export function useOfflineQueue(options: OfflineQueueOptions): UseOfflineQueueReturn {
  const {
    formId,
    onSyncStart,
    onSyncComplete,
    onSyncError,
    syncEndpoint = DEFAULT_SYNC_ENDPOINT,
    maxRetries = DEFAULT_MAX_RETRIES,
  } = options;

  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const queueRef = useRef<QueuedSubmission[]>([]);
  const syncInProgressRef = useRef(false);

  // Load queue on mount
  useEffect(() => {
    queueRef.current = loadQueueFromStorage();
    updatePendingCount();
  }, []);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      sync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update pending count
  const updatePendingCount = useCallback(() => {
    const pending = filterSubmissionsByFormId(queueRef.current, formId).filter(
      (sub) => !sub.synced
    ).length;
    setPendingCount(pending);
  }, [formId]);

  /**
   * Salva una sottomissione offline
   */
  const saveOffline = useCallback(
    (data: Record<string, unknown>) => {
      const submission: QueuedSubmission = {
        id: generateSubmissionId(),
        formId,
        data,
        timestamp: Date.now(),
        attempts: 0,
        synced: false,
      };

      queueRef.current = [...queueRef.current, submission];
      saveQueueToStorage(queueRef.current);
      updatePendingCount();

      // Try to sync immediately if online
      if (isOnline) {
        sync();
      }
    },
    [formId, isOnline, updatePendingCount]
  );

  /**
   * Sincronizza le sottomissioni pendenti
   */
  const sync = useCallback(async () => {
    // Prevent concurrent syncs
    if (syncInProgressRef.current || !isOnline) return;

    const pendingSubmissions = filterSubmissionsByFormId(
      queueRef.current,
      formId
    ).filter((sub) => !sub.synced && sub.attempts < maxRetries);

    if (pendingSubmissions.length === 0) return;

    syncInProgressRef.current = true;
    setIsSyncing(true);
    onSyncStart?.();

    try {
      for (const submission of pendingSubmissions) {
        try {
          // Attempt to sync
          const response = await fetch(syncEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(submission.data),
          });

          if (response.ok) {
            // Mark as synced
            submission.synced = true;
          } else {
            // Increment attempts
            submission.attempts++;
          }
        } catch (error) {
          // Increment attempts on network error
          submission.attempts++;
          console.error(
            `[useOfflineQueue] Sync failed for submission ${submission.id}:`,
            error
          );
        }
      }

      // Save updated queue
      queueRef.current = queueRef.current.map((sub) => {
        const updated = pendingSubmissions.find((p) => p.id === sub.id);
        return updated || sub;
      });
      
      // Remove successfully synced submissions after 7 days
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      queueRef.current = queueRef.current.filter(
        (sub) => !sub.synced || sub.timestamp > sevenDaysAgo
      );

      saveQueueToStorage(queueRef.current);
      updatePendingCount();
      onSyncComplete?.();
    } catch (error) {
      console.error('[useOfflineQueue] Sync error:', error);
      onSyncError?.(error as Error);
    } finally {
      syncInProgressRef.current = false;
      setIsSyncing(false);
    }
  }, [
    formId,
    isOnline,
    maxRetries,
    syncEndpoint,
    onSyncStart,
    onSyncComplete,
    onSyncError,
    updatePendingCount,
  ]);

  /**
   * Ottiene tutte le sottomissioni in attesa
   */
  const getPendingSubmissions = useCallback((): QueuedSubmission[] => {
    return filterSubmissionsByFormId(queueRef.current, formId).filter(
      (sub) => !sub.synced
    );
  }, [formId]);

  /**
   * Rimuove una sottomissione specifica
   */
  const removeSubmission = useCallback(
    (id: string) => {
      queueRef.current = queueRef.current.filter((sub) => sub.id !== id);
      saveQueueToStorage(queueRef.current);
      updatePendingCount();
    },
    [updatePendingCount]
  );

  /**
   * Cancella tutte le sottomissioni
   */
  const clearAll = useCallback(() => {
    queueRef.current = queueRef.current.filter((sub) => sub.formId !== formId);
    saveQueueToStorage(queueRef.current);
    updatePendingCount();
  }, [formId, updatePendingCount]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    saveOffline,
    sync,
    getPendingSubmissions,
    removeSubmission,
    clearAll,
  };
}

export default useOfflineQueue;
