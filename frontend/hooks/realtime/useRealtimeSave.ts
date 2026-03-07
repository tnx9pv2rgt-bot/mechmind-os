/**
 * useRealtimeSave Hook
 * 
 * Hook per il salvataggio real-time dei form su Supabase con:
 * - Debounced auto-save (500ms)
 * - Optimistic UI updates
 * - Retry automatico con backoff esponenziale
 * - Offline queue con localStorage backup
 * - Conflict resolution con versioning
 * - Realtime subscriptions per sync multi-device
 * 
 * @example
 * ```typescript
 * function CustomerForm() {
 *   const [formData, setFormData] = useState({ name: '', email: '' })
 *   
 *   const { saveStatus, lastSaved, pendingChanges, isOnline } = useRealtimeSave({
 *     formId: 'customer-new-123',
 *     formType: 'customer',
 *     data: formData,
 *     debounceMs: 500,
 *     enableRealtime: true,
 *     onConflict: (remote, local) => {
 *       // Handle conflict
 *     }
 *   })
 *   
 *   return (
 *     <form>
 *       <SaveStatusIndicator status={saveStatus} lastSaved={lastSaved} />
 *       <input 
 *         value={formData.name} 
 *         onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
 *       />
 *     </form>
 *   )
 * }
 * ```
 */

'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useDebounce } from 'use-debounce'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'
import { 
  supabase, 
  withRetry, 
  parseSupabaseError, 
  type SupabaseError,
  getCurrentUser,
  onConnectionChange,
  type ConnectionStatus 
} from '@/lib/realtime/supabaseClient'
import type { RealtimeChannel, User } from '@supabase/supabase-js'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline' | 'conflict'

export interface FormDraft {
  id: string
  user_id: string
  form_type: string
  form_id: string
  data: Record<string, unknown>
  version: number
  created_at: string
  updated_at: string
  device_info?: string
}

export interface ConflictData {
  remote: FormDraft
  local: Record<string, unknown>
  timestamp: Date
}

export interface UseRealtimeSaveOptions {
  /** ID univoco del form (es: 'customer-new-uuid') */
  formId: string
  /** Tipo di form (es: 'customer', 'booking', 'vehicle') */
  formType: string
  /** Dati del form da salvare */
  data: Record<string, unknown>
  /** Debounce in millisecondi (default: 500) */
  debounceMs?: number
  /** Numero massimo di retry (default: 3) */
  maxRetries?: number
  /** Abilita realtime subscription (default: true) */
  enableRealtime?: boolean
  /** Callback quando c'è un conflitto */
  onConflict?: (conflict: ConflictData) => void
  /** Callback quando il salvataggio ha successo */
  onSave?: (draft: FormDraft) => void
  /** Callback su errore */
  onError?: (error: SupabaseError) => void
  /** Callback quando cambia lo stato della connessione */
  onConnectionChange?: (isOnline: boolean) => void
  /** Informazioni sul dispositivo */
  deviceInfo?: string
}

export interface UseRealtimeSaveReturn {
  /** Stato corrente del salvataggio */
  saveStatus: SaveStatus
  /** Timestamp dell'ultimo salvataggio */
  lastSaved: Date | null
  /** Testo formattato dell'ultimo salvataggio */
  lastSavedText: string
  /** Numero di modifiche in attesa (offline) */
  pendingChanges: number
  /** Se è online */
  isOnline: boolean
  /** Versione corrente del draft */
  version: number
  /** Se c'è un conflitto non risolto */
  hasConflict: boolean
  /** Dati del conflitto */
  conflictData: ConflictData | null
  /** Forza un salvataggio immediato */
  forceSave: () => Promise<void>
  /** Risolve un conflitto */
  resolveConflict: (useRemote: boolean) => Promise<void>
  /** Carica il draft esistente */
  loadDraft: () => Promise<FormDraft | null>
  /** Cancella il draft */
  deleteDraft: () => Promise<void>
  /** Riprova il salvataggio */
  retry: () => Promise<void>
}

// ============================================================================
// CONSTANTS
// ============================================================================

const OFFLINE_QUEUE_KEY = 'realtime_save_queue'
const DRAFT_CACHE_KEY = 'realtime_draft_cache'

// ============================================================================
// OFFLINE QUEUE UTILITIES
// ============================================================================

interface QueuedChange {
  id: string
  formId: string
  formType: string
  data: Record<string, unknown>
  version: number
  timestamp: number
  retries: number
}

function getOfflineQueue(): QueuedChange[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(OFFLINE_QUEUE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function addToOfflineQueue(change: Omit<QueuedChange, 'timestamp' | 'retries'>): void {
  if (typeof window === 'undefined') return
  const queue = getOfflineQueue()
  queue.push({
    ...change,
    timestamp: Date.now(),
    retries: 0,
  })
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue))
}

function removeFromOfflineQueue(id: string): void {
  if (typeof window === 'undefined') return
  const queue = getOfflineQueue()
  const filtered = queue.filter(item => item.id !== id)
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(filtered))
}

function clearOfflineQueue(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(OFFLINE_QUEUE_KEY)
}

function cacheDraft(formId: string, data: FormDraft): void {
  if (typeof window === 'undefined') return
  try {
    const cache = JSON.parse(localStorage.getItem(DRAFT_CACHE_KEY) || '{}')
    cache[formId] = { data, timestamp: Date.now() }
    localStorage.setItem(DRAFT_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // Ignore cache errors
  }
}

function getCachedDraft(formId: string): FormDraft | null {
  if (typeof window === 'undefined') return null
  try {
    const cache = JSON.parse(localStorage.getItem(DRAFT_CACHE_KEY) || '{}')
    const entry = cache[formId]
    if (entry && Date.now() - entry.timestamp < 24 * 60 * 60 * 1000) {
      return entry.data
    }
    return null
  } catch {
    return null
  }
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useRealtimeSave(options: UseRealtimeSaveOptions): UseRealtimeSaveReturn {
  const {
    formId,
    formType,
    data,
    debounceMs = 500,
    maxRetries = 3,
    enableRealtime = true,
    onConflict,
    onSave,
    onError,
    onConnectionChange: connectionCallback,
    deviceInfo = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
  } = options

  // State
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [lastSavedText, setLastSavedText] = useState<string>('')
  const [pendingChanges, setPendingChanges] = useState(0)
  const [isOnline, setIsOnline] = useState(true)
  const [version, setVersion] = useState(1)
  const [hasConflict, setHasConflict] = useState(false)
  const [conflictData, setConflictData] = useState<ConflictData | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  // Refs
  const channelRef = useRef<RealtimeChannel | null>(null)
  const saveInProgressRef = useRef(false)
  const lastDataRef = useRef(data)
  const expectedVersionRef = useRef(1)

  // Debounced data
  const [debouncedData] = useDebounce(data, debounceMs)

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================

  useEffect(() => {
    const unsubscribe = onConnectionChange((status: ConnectionStatus) => {
      const online = status === 'connected'
      setIsOnline(online)
      connectionCallback?.(online)

      if (online) {
        processOfflineQueue()
      } else {
        setSaveStatus('offline')
      }
    })

    return unsubscribe
  }, [connectionCallback])

  // ============================================================================
  // USER AUTHENTICATION
  // ============================================================================

  useEffect(() => {
    getCurrentUser()
      .then(user => setCurrentUser(user))
      .catch(() => setCurrentUser(null))
  }, [saveStatus])

  // ============================================================================
  // REALTIME SUBSCRIPTION
  // ============================================================================

  useEffect(() => {
    if (!enableRealtime || !formId) return

    const channel = supabase
      .channel(`form_drafts:${formId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'form_drafts',
          filter: `form_id=eq.${formId}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const draft = payload.new as FormDraft
            
            // Verifica se il cambiamento è da un altro dispositivo
            if (draft.user_id !== currentUser?.id) {
              handleExternalChange(draft)
            }
          }
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [enableRealtime, formId, currentUser?.id])

  // ============================================================================
  // SAVE FUNCTION
  // ============================================================================

  const performSave = useCallback(async (
    formData: Record<string, unknown>,
    expectedVersion: number
  ): Promise<void> => {
    if (!currentUser) {
      throw new Error('User not authenticated')
    }

    const draftId = `${currentUser.id}_${formType}_${formId}`

    await withRetry(async () => {
      // Check for existing draft (for conflict detection)
      const { data: existing } = await supabase
        .from('form_drafts')
        .select('version, updated_at, data')
        .eq('id', draftId)
        .single()

      if (existing && existing.version !== expectedVersion) {
        // Conflict detected!
        setHasConflict(true)
        setConflictData({
          remote: existing as FormDraft,
          local: formData,
          timestamp: new Date(),
        })
        setSaveStatus('conflict')
        onConflict?.({
          remote: existing as FormDraft,
          local: formData,
          timestamp: new Date(),
        })
        throw new Error('Conflict detected')
      }

      // Perform upsert
      const { error } = await supabase
        .from('form_drafts')
        .upsert({
          id: draftId,
          user_id: currentUser.id,
          form_type: formType,
          form_id: formId,
          data: formData,
          version: expectedVersion,
          updated_at: new Date().toISOString(),
          device_info: deviceInfo,
        }, {
          onConflict: 'id',
        })

      if (error) throw error

      // Update local state
      setVersion(expectedVersion)
      setLastSaved(new Date())
      setSaveStatus('saved')
      expectedVersionRef.current = expectedVersion + 1

      // Cache locally
      cacheDraft(formId, {
        id: draftId,
        user_id: currentUser.id,
        form_type: formType,
        form_id: formId,
        data: formData,
        version: expectedVersion,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        device_info: deviceInfo,
      })

      // Notify callback
      onSave?.({
        id: draftId,
        user_id: currentUser.id,
        form_type: formType,
        form_id: formId,
        data: formData,
        version: expectedVersion,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        device_info: deviceInfo,
      })

      // Reset status after delay
      setTimeout(() => {
        setSaveStatus(prev => prev === 'saved' ? 'idle' : prev)
      }, 2000)
    }, { maxRetries })
  }, [currentUser, formId, formType, deviceInfo, maxRetries, onSave, onConflict])

  // ============================================================================
  // AUTO-SAVE EFFECT
  // ============================================================================

  useEffect(() => {
    // Skip if data hasn't changed
    if (JSON.stringify(debouncedData) === JSON.stringify(lastDataRef.current)) {
      return
    }

    lastDataRef.current = debouncedData

    if (!isOnline) {
      // Queue for later
      addToOfflineQueue({
        id: `${formId}_${Date.now()}`,
        formId,
        formType,
        data: debouncedData,
        version: expectedVersionRef.current,
      })
      setPendingChanges(prev => prev + 1)
      setSaveStatus('offline')
      return
    }

    if (!currentUser) return

    const save = async () => {
      if (saveInProgressRef.current) return
      
      saveInProgressRef.current = true
      setSaveStatus('saving')

      try {
        await performSave(debouncedData, expectedVersionRef.current)
      } catch (error) {
        const parsedError = parseSupabaseError(error)
        
        if (parsedError.code !== 'db/conflict') {
          setSaveStatus('error')
          onError?.(parsedError)
          
          // Add to offline queue for retry
          addToOfflineQueue({
            id: `${formId}_${Date.now()}`,
            formId,
            formType,
            data: debouncedData,
            version: expectedVersionRef.current,
          })
        }
      } finally {
        saveInProgressRef.current = false
      }
    }

    save()
  }, [debouncedData, isOnline, currentUser, formId, formType, performSave, onError])

  // ============================================================================
  // LAST SAVED TEXT UPDATE
  // ============================================================================

  useEffect(() => {
    if (!lastSaved) {
      setLastSavedText('')
      return
    }

    setLastSavedText(formatDistanceToNow(lastSaved, { addSuffix: true, locale: it }))

    const interval = setInterval(() => {
      if (lastSaved) {
        setLastSavedText(formatDistanceToNow(lastSaved, { addSuffix: true, locale: it }))
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [lastSaved])

  // ============================================================================
  // EXTERNAL CHANGE HANDLER
  // ============================================================================

  const handleExternalChange = useCallback((draft: FormDraft) => {
    // Se stiamo modificando, verifica conflitto
    const currentDataHash = JSON.stringify(lastDataRef.current)
    const remoteDataHash = JSON.stringify(draft.data)

    if (currentDataHash !== remoteDataHash) {
      setHasConflict(true)
      setConflictData({
        remote: draft,
        local: lastDataRef.current,
        timestamp: new Date(),
      })
      setSaveStatus('conflict')
      onConflict?.({
        remote: draft,
        local: lastDataRef.current,
        timestamp: new Date(),
      })
    }
  }, [onConflict])

  // ============================================================================
  // OFFLINE QUEUE PROCESSING
  // ============================================================================

  const processOfflineQueue = useCallback(async () => {
    const queue = getOfflineQueue()
    if (queue.length === 0) return

    const processed: string[] = []

    for (const item of queue) {
      if (item.retries >= maxRetries) continue

      try {
        await performSave(item.data, item.version)
        processed.push(item.id)
      } catch (error) {
        // Increment retry count
        item.retries++
      }
    }

    // Remove processed items
    const remaining = queue.filter(item => !processed.includes(item.id))
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining))
    setPendingChanges(remaining.length)
  }, [maxRetries, performSave])

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  const forceSave = useCallback(async (): Promise<void> => {
    if (!currentUser || !isOnline) {
      addToOfflineQueue({
        id: `${formId}_${Date.now()}`,
        formId,
        formType,
        data: lastDataRef.current,
        version: expectedVersionRef.current,
      })
      setPendingChanges(prev => prev + 1)
      return
    }

    setSaveStatus('saving')
    
    try {
      await performSave(lastDataRef.current, expectedVersionRef.current)
    } catch (error) {
      const parsedError = parseSupabaseError(error)
      setSaveStatus('error')
      onError?.(parsedError)
      throw error
    }
  }, [currentUser, isOnline, formId, formType, performSave, onError])

  const resolveConflict = useCallback(async (useRemote: boolean): Promise<void> => {
    if (!conflictData) return

    setHasConflict(false)
    setConflictData(null)

    if (useRemote) {
      // Use remote version - increment version
      expectedVersionRef.current = conflictData.remote.version + 1
      lastDataRef.current = conflictData.remote.data
      setVersion(conflictData.remote.version)
    } else {
      // Use local version - force save
      await forceSave()
    }

    setSaveStatus('idle')
  }, [conflictData, forceSave])

  const loadDraft = useCallback(async (): Promise<FormDraft | null> => {
    if (!currentUser) {
      // Try to get from cache
      return getCachedDraft(formId)
    }

    const draftId = `${currentUser.id}_${formType}_${formId}`

    try {
      const { data: draft, error } = await supabase
        .from('form_drafts')
        .select('*')
        .eq('id', draftId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found, try cache
          return getCachedDraft(formId)
        }
        throw error
      }

      if (draft) {
        setVersion(draft.version)
        expectedVersionRef.current = draft.version + 1
        lastDataRef.current = draft.data as Record<string, unknown>
        cacheDraft(formId, draft as FormDraft)
        return draft as FormDraft
      }

      return null
    } catch {
      // Fallback to cache
      return getCachedDraft(formId)
    }
  }, [currentUser, formId, formType])

  const deleteDraft = useCallback(async (): Promise<void> => {
    if (!currentUser) {
      // Just clear cache
      const cache = JSON.parse(localStorage.getItem(DRAFT_CACHE_KEY) || '{}')
      delete cache[formId]
      localStorage.setItem(DRAFT_CACHE_KEY, JSON.stringify(cache))
      return
    }

    const draftId = `${currentUser.id}_${formType}_${formId}`

    try {
      await supabase.from('form_drafts').delete().eq('id', draftId)
    } finally {
      // Always clear cache
      const cache = JSON.parse(localStorage.getItem(DRAFT_CACHE_KEY) || '{}')
      delete cache[formId]
      localStorage.setItem(DRAFT_CACHE_KEY, JSON.stringify(cache))
      
      setLastSaved(null)
      setVersion(1)
      expectedVersionRef.current = 1
    }
  }, [currentUser, formId, formType])

  const retry = useCallback(async (): Promise<void> => {
    setSaveStatus('saving')
    
    try {
      await performSave(lastDataRef.current, expectedVersionRef.current)
    } catch (error) {
      const parsedError = parseSupabaseError(error)
      setSaveStatus('error')
      onError?.(parsedError)
    }
  }, [performSave, onError])

  // ============================================================================
  // INITIAL LOAD
  // ============================================================================

  useEffect(() => {
    loadDraft()
  }, [loadDraft])

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    saveStatus,
    lastSaved,
    lastSavedText,
    pendingChanges,
    isOnline,
    version,
    hasConflict,
    conflictData,
    forceSave,
    resolveConflict,
    loadDraft,
    deleteDraft,
    retry,
  }
}

export default useRealtimeSave
