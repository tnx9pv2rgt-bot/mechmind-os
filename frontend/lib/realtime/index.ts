/**
 * Realtime Library
 * 
 * Client Supabase e utility per il sistema di salvataggio real-time.
 * 
 * @example
 * ```typescript
 * import { supabase, withRetry, checkSupabaseConnection } from '@/lib/realtime'
 * 
 * // Check connection
 * const isConnected = await checkSupabaseConnection()
 * 
 * // Query with retry
 * const data = await withRetry(async () => {
 *   const { data, error } = await supabase.from('customers').select('*')
 *   if (error) throw error
 *   return data
 * })
 * ```
 */

// Client
export { 
  supabase, 
  checkSupabaseConnection,
  onConnectionChange,
  getCurrentUser,
  getCurrentSession,
  type ConnectionStatus,
} from './supabaseClient'

// Retry utility
export { 
  withRetry, 
  parseSupabaseError,
  type SupabaseError,
  type SupabaseErrorCode,
  type RetryOptions,
} from './supabaseClient'

// Default export
export { supabase as default } from './supabaseClient'
