/**
 * Real-Time Save Types
 * 
 * Type definitions per il sistema di salvataggio real-time.
 */

import type { RealtimeChannel, User } from '@supabase/supabase-js'

// ============================================================================
// ENUMS
// ============================================================================

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline' | 'conflict'

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error'

export type SupabaseErrorCode = 
  | 'auth/not-authenticated'
  | 'auth/session-expired'
  | 'db/connection-error'
  | 'db/timeout'
  | 'db/conflict'
  | 'db/not-found'
  | 'db/permission-denied'
  | 'realtime/subscription-error'
  | 'unknown'

// ============================================================================
// INTERFACES
// ============================================================================

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

export interface SupabaseError {
  code: SupabaseErrorCode
  message: string
  originalError?: Error
}

export interface UseRealtimeSaveOptions {
  formId: string
  formType: string
  data: Record<string, unknown>
  debounceMs?: number
  maxRetries?: number
  enableRealtime?: boolean
  onConflict?: (conflict: ConflictData) => void
  onSave?: (draft: FormDraft) => void
  onError?: (error: SupabaseError) => void
  onConnectionChange?: (isOnline: boolean) => void
  deviceInfo?: string
}

export interface UseRealtimeSaveReturn {
  saveStatus: SaveStatus
  lastSaved: Date | null
  lastSavedText: string
  pendingChanges: number
  isOnline: boolean
  version: number
  hasConflict: boolean
  conflictData: ConflictData | null
  forceSave: () => Promise<void>
  resolveConflict: (useRemote: boolean) => Promise<void>
  loadDraft: () => Promise<FormDraft | null>
  deleteDraft: () => Promise<void>
  retry: () => Promise<void>
}

export interface RetryOptions {
  maxRetries?: number
  baseDelay?: number
  maxDelay?: number
  shouldRetry?: (error: SupabaseError) => boolean
}

export interface QueuedChange {
  id: string
  formId: string
  formType: string
  data: Record<string, unknown>
  version: number
  timestamp: number
  retries: number
}

// ============================================================================
// COMPONENT PROPS
// ============================================================================

export interface SaveStatusIndicatorProps {
  status: SaveStatus
  lastSaved?: Date | null
  lastSavedText?: string
  pendingChanges?: number
  showIcon?: boolean
  compact?: boolean
  onRetry?: () => void
  onResolve?: () => void
  className?: string
  hideDelay?: number
}

export interface FixedSaveStatusIndicatorProps extends SaveStatusIndicatorProps {
  bottom?: number
  left?: number
  showBackground?: boolean
}

export interface FormHeaderSaveIndicatorProps extends SaveStatusIndicatorProps {
  title?: string
  showBorder?: boolean
}

export interface ConflictResolutionDialogProps {
  isOpen: boolean
  conflictData: ConflictData | null
  onResolve: (useRemote: boolean) => void
  onCancel?: () => void
}

export interface RealtimeFormWrapperProps extends Omit<UseRealtimeSaveOptions, 'onConflict'> {
  children: (props: UseRealtimeSaveReturn) => React.ReactNode
  onDraftLoaded?: (draft: FormDraft) => void
  showFixedIndicator?: boolean
  showConflictDialog?: boolean
  onConflict?: (conflict: ConflictData) => void
  className?: string
  title?: string
  showHeader?: boolean
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type FormType = 
  | 'customer'
  | 'booking'
  | 'vehicle'
  | 'invoice'
  | 'inspection'
  | 'part'
  | string

export interface PersistedFormData {
  data: Record<string, unknown>
  currentStep: number
  timestamp: number
  formId: string
  version: number
}
