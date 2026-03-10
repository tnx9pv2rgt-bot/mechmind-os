/**
 * Supabase Client Configuration
 * 
 * Client Supabase configurato per Realtime subscriptions e operazioni CRUD.
 * Supporta retry automatico e gestione errori di connessione.
 * 
 * @requires @supabase/supabase-js
 * @see https://supabase.com/docs/reference/javascript/introduction
 */

import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'

// ============================================================================
// ENVIRONMENT CONFIGURATION
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Validazione configurazione
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] Missing environment variables. ' +
    'Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
  )
}

// ============================================================================
// CLIENT CONFIGURATION
// ============================================================================

/**
 * Opzioni di configurazione per il client Supabase
 */
const supabaseOptions = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  db: {
    schema: 'public',
  },
}

/**
 * Client Supabase singleton
 * 
 * @example
 * ```typescript
 * import { supabase } from '@/lib/realtime/supabaseClient'
 * 
 * // Query
 * const { data, error } = await supabase
 *   .from('customers')
 *   .select('*')
 * 
 * // Realtime subscription
 * const channel = supabase
 *   .channel('customers')
 *   .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, callback)
 *   .subscribe()
 * ```
 */
export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || '',
  supabaseOptions
)

// ============================================================================
// CONNECTION HEALTH CHECK
// ============================================================================

/**
 * Stato della connessione realtime
 */
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error'

/**
 * Verifica lo stato della connessione Supabase
 */
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('form_drafts').select('id', { count: 'exact', head: true })
    return !error
  } catch {
    return false
  }
}

/**
 * Sottoscrizione agli eventi di connessione
 */
export function onConnectionChange(
  callback: (status: ConnectionStatus) => void
): () => void {
  let channel: RealtimeChannel | null = null

  try {
    channel = supabase
      .channel('connection-check')
      .on('system', { event: '*' }, (payload) => {
        if (payload.event === 'connected') {
          callback('connected')
        } else if (payload.event === 'disconnected') {
          callback('disconnected')
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          callback('connected')
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          callback('error')
        } else {
          callback('connecting')
        }
      })
  } catch (error) {
    callback('error')
  }

  // Cleanup function
  return () => {
    if (channel) {
      supabase.removeChannel(channel)
    }
  }
}

// ============================================================================
// AUTH HELPERS
// ============================================================================

/**
 * Ottiene l'utente corrente
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  return user
}

/**
 * Ottiene la sessione corrente
 */
export async function getCurrentSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) throw error
  return session
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Tipi di errori Supabase
 */
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

export interface SupabaseError {
  code: SupabaseErrorCode
  message: string
  originalError?: Error
}

/**
 * Parser per errori Supabase
 */
export function parseSupabaseError(error: unknown): SupabaseError {
  if (!error) {
    return { code: 'unknown', message: 'Unknown error' }
  }

  const err = error as { code?: string; message?: string }

  // Auth errors
  if (err.code?.includes('auth')) {
    if (err.code === 'PGRST301' || err.message?.includes('JWT')) {
      return { code: 'auth/session-expired', message: 'Session expired', originalError: error as Error }
    }
    return { code: 'auth/not-authenticated', message: err.message || 'Not authenticated', originalError: error as Error }
  }

  // Database errors
  if (err.code?.includes('PGRST')) {
    if (err.code === 'PGRST116') {
      return { code: 'db/not-found', message: 'Record not found', originalError: error as Error }
    }
    if (err.code === 'PGRST204') {
      return { code: 'db/permission-denied', message: 'Permission denied', originalError: error as Error }
    }
    if (err.code === '23505') {
      return { code: 'db/conflict', message: 'Duplicate key violation', originalError: error as Error }
    }
    return { code: 'db/connection-error', message: err.message || 'Database error', originalError: error as Error }
  }

  // Realtime errors
  if (err.message?.includes('subscription')) {
    return { code: 'realtime/subscription-error', message: err.message, originalError: error as Error }
  }

  return { code: 'unknown', message: err.message || 'Unknown error', originalError: error as Error }
}

// ============================================================================
// RETRY UTILITY
// ============================================================================

export interface RetryOptions {
  maxRetries?: number
  baseDelay?: number
  maxDelay?: number
  shouldRetry?: (error: SupabaseError) => boolean
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  shouldRetry: (error) => {
    // Retry solo su errori di rete/connessione
    return ['db/connection-error', 'db/timeout', 'realtime/subscription-error'].includes(error.code)
  },
}

/**
 * Esegue una funzione con retry automatico
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options }
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      const parsedError = parseSupabaseError(error)

      // Non fare retry se non è necessario
      if (!opts.shouldRetry(parsedError)) {
        throw error
      }

      // Non aspettare dopo l'ultimo tentativo
      if (attempt < opts.maxRetries) {
        // Exponential backoff con jitter
        const delay = Math.min(
          opts.baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
          opts.maxDelay
        )
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

export default supabase
