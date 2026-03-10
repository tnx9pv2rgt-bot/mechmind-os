/**
 * tRPC Client Configuration - MechMind OS Frontend
 * 
 * Initializes and configures the tRPC client for communication with the
 * MechMind OS Lambda backend. Includes error handling, auth token injection,
 * and retry logic for resilient API communication.
 * 
 * @module lib/trpc-client
 * @version 1.0.0
 * @requires @trpc/client
 * @requires @tanstack/react-query
 */

import { createTRPCProxyClient, httpBatchLink, TRPCLink } from '@trpc/client'
import { observable } from '@trpc/server/observable'
import Cookies from 'js-cookie'
import type { AppRouter } from './trpc-router-types'

// =============================================================================
// Configuration
// =============================================================================

/**
 * Backend API URL from environment variables
 * Falls back to localhost for development
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/trpc'

/**
 * Maximum number of retry attempts for failed requests
 */
const MAX_RETRIES = 3

/**
 * Initial retry delay in milliseconds (exponential backoff)
 */
const INITIAL_RETRY_DELAY = 1000

// =============================================================================
// Error Types
// =============================================================================

/**
 * Custom error class for tRPC client errors
 */
export class TRPCClientError extends Error {
  /** HTTP status code */
  statusCode?: number
  /** tRPC error code */
  code: string
  /** Original error data */
  data?: unknown
  /** Request path */
  path?: string

  constructor(message: string, code: string, statusCode?: number, data?: unknown, path?: string) {
    super(message)
    this.name = 'TRPCClientError'
    this.code = code
    this.statusCode = statusCode
    this.data = data
    this.path = path
  }
}

/**
 * Network error - indicates connectivity issues
 */
export class NetworkError extends TRPCClientError {
  constructor(message = 'Network error occurred') {
    super(message, 'NETWORK_ERROR', 0)
    this.name = 'NetworkError'
  }
}

/**
 * Authentication error - indicates invalid or expired token
 */
export class AuthError extends TRPCClientError {
  constructor(message = 'Authentication failed') {
    super(message, 'UNAUTHORIZED', 401)
    this.name = 'AuthError'
  }
}

/**
 * Server error - indicates backend issues
 */
export class ServerError extends TRPCClientError {
  constructor(message = 'Server error occurred', statusCode = 500) {
    super(message, 'INTERNAL_SERVER_ERROR', statusCode)
    this.name = 'ServerError'
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Retrieves the JWT authentication token from cookies
 * 
 * @returns The JWT token or undefined if not present
 */
function getAuthToken(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }
  return Cookies.get('auth_token')
}

/**
 * Clears authentication data (used on logout or token expiration)
 */
export function clearAuth(): void {
  if (typeof window !== 'undefined') {
    Cookies.remove('auth_token')
    Cookies.remove('refresh_token')
  }
}

/**
 * Determines if a request should be retried based on error type
 * 
 * @param error - The error object
 * @param attemptNumber - Current retry attempt number
 * @returns Whether to retry the request
 */
function shouldRetry(error: TRPCClientError, attemptNumber: number): boolean {
  // Don't retry auth errors or client errors (4xx except 429)
  if (error.statusCode === 401 || error.statusCode === 403) {
    return false
  }
  
  if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429) {
    return false
  }
  
  return attemptNumber < MAX_RETRIES
}

/**
 * Calculates delay for retry using exponential backoff with jitter
 * 
 * @param attemptNumber - Current retry attempt number
 * @returns Delay in milliseconds
 */
function getRetryDelay(attemptNumber: number): number {
  const exponentialDelay = INITIAL_RETRY_DELAY * Math.pow(2, attemptNumber - 1)
  // Add random jitter (±25%) to prevent thundering herd
  const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1)
  return Math.min(exponentialDelay + jitter, 30000) // Cap at 30 seconds
}

// =============================================================================
// tRPC Links
// =============================================================================

/**
 * Error handling link that intercepts responses and transforms errors
 * into standardized TRPCClientError instances
 */
const errorHandlingLink: TRPCLink<AppRouter> = () => {
  return ({ next, op }) => {
    return observable((observer) => {
      const unsubscribe = next(op).subscribe({
        next: (value) => {
          observer.next(value)
        },
        error: (err) => {
          // Transform error into standardized format
          let error: TRPCClientError
          const errData = (err as unknown as { data?: { httpStatus?: number; code?: string } }).data
          const errCode = errData?.code || (err as unknown as { code?: string }).code

          if (errCode === 'TIMEOUT_ERROR' || err.message?.includes('fetch failed')) {
            error = new NetworkError('Connection to server failed. Please check your internet connection.')
          } else if (errData?.httpStatus === 401) {
            error = new AuthError('Your session has expired. Please log in again.')
            // Clear auth on 401
            clearAuth()
            // Redirect to login on client
            if (typeof window !== 'undefined') {
              window.location.href = '/auth/login?expired=true'
            }
          } else if ((errData?.httpStatus ?? 0) >= 500) {
            error = new ServerError(
              'Server error occurred. Please try again later.',
              errData?.httpStatus ?? 500
            )
          } else {
            error = new TRPCClientError(
              err.message || 'An unexpected error occurred',
              errCode || 'UNKNOWN_ERROR',
              errData?.httpStatus,
              errData,
              op.path
            )
          }

          observer.error(error as unknown as typeof err)
        },
        complete: () => {
          observer.complete()
        },
      })

      return unsubscribe
    })
  }
}

/**
 * Authentication link that injects JWT token into request headers
 */
const authLink: TRPCLink<AppRouter> = () => {
  return ({ next, op }) => {
    return observable((observer) => {
      // Get auth token
      const token = getAuthToken()
      
      // Add headers to the operation context
      const context = {
        ...op.context,
        headers: {
          ...(op.context.headers as Record<string, string> || {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }

      const unsubscribe = next({ ...op, context }).subscribe(observer)
      return unsubscribe
    })
  }
}

/**
 * Retry link that implements exponential backoff for failed requests
 */
const retryLink: TRPCLink<AppRouter> = () => {
  return ({ next, op }) => {
    return observable((observer) => {
      let attemptNumber = 0
      let unsubscribe: { unsubscribe(): void }

      const tryRequest = () => {
        attemptNumber++
        
        unsubscribe = next(op).subscribe({
          next: (value) => {
            observer.next(value)
          },
          error: (err) => {
            const errData = (err as unknown as { data?: { httpStatus?: number; code?: string } }).data
            const errCode = errData?.code || (err as unknown as { code?: string }).code
            const error = err instanceof TRPCClientError
              ? err
              : new TRPCClientError(
                  err.message || 'Request failed',
                  errCode || 'UNKNOWN_ERROR',
                  errData?.httpStatus,
                  errData,
                  op.path
                )

            if (shouldRetry(error, attemptNumber)) {
              const delay = getRetryDelay(attemptNumber)

              // Log retry attempt in development
              if (process.env.NODE_ENV === 'development') {
                console.warn(
                  `[tRPC] Retrying ${op.path} (attempt ${attemptNumber}/${MAX_RETRIES}) after ${delay}ms`
                )
              }

              setTimeout(tryRequest, delay)
            } else {
              observer.error(error as unknown as typeof err)
            }
          },
          complete: () => {
            observer.complete()
          },
        })
      }

      tryRequest()

      return () => {
        unsubscribe?.unsubscribe()
      }
    })
  }
}

/**
 * Logging link for development debugging
 */
const loggingLink: TRPCLink<AppRouter> = () => {
  return ({ next, op }) => {
    return observable((observer) => {
      const startTime = Date.now()
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[tRPC] → ${op.type} ${op.path}`, op.input)
      }

      const unsubscribe = next(op).subscribe({
        next: (value) => {
          if (process.env.NODE_ENV === 'development') {
            const duration = Date.now() - startTime
            console.log(`[tRPC] ← ${op.path} (${duration}ms)`, value)
          }
          observer.next(value)
        },
        error: (err) => {
          if (process.env.NODE_ENV === 'development') {
            const duration = Date.now() - startTime
            console.error(`[tRPC] ✖ ${op.path} (${duration}ms)`, err)
          }
          observer.error(err)
        },
        complete: () => {
          observer.complete()
        },
      })

      return unsubscribe
    })
  }
}

// =============================================================================
// tRPC Client Instance
// =============================================================================

/**
 * Main tRPC proxy client instance
 * 
 * This client is used for direct tRPC calls outside of React components.
 * For React components, use the hooks from @trpc/react-query via the provider.
 * 
 * @example
 * ```typescript
 * // Direct client usage (outside React components)
 * const vehicles = await trpc.vehicle.list.query({ page: 1, limit: 10 })
 * 
 * // Create a new booking
 * const booking = await trpc.booking.create.mutate({
 *   customerId: 'cust-123',
 *   vehicleId: 'veh-456',
 *   serviceCategory: 'maintenance',
 *   // ...
 * })
 * ```
 */
export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    // Order matters: logging -> error handling -> auth -> retry -> batch -> HTTP
    ...(process.env.NODE_ENV === 'development' ? [loggingLink] : []),
    errorHandlingLink,
    authLink,
    retryLink,
    httpBatchLink({
      url: API_URL,
      // Maximum URL length before splitting batches
      maxURLLength: 2083,
      headers: () => {
        return {
          'Content-Type': 'application/json',
          'x-client-version': '10.0.0',
        }
      },
    }),
  ],
})

// =============================================================================
// Type Exports
// =============================================================================

/**
 * Type helper for inferring tRPC router types
 * Used for creating type-safe hooks and utilities
 */
export type RouterOutput = typeof trpc

/**
 * Type helper for query procedures
 */
export type QueryProcedure<TPath extends keyof AppRouter> = 
  AppRouter[TPath] extends { query: infer TQuery } ? TQuery : never

/**
 * Type helper for mutation procedures
 */
export type MutationProcedure<TPath extends keyof AppRouter> = 
  AppRouter[TPath] extends { mutate: infer TMutation } ? TMutation : never
