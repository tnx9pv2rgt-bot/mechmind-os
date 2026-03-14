/**
 * API Error Classes - MechMind OS Frontend
 *
 * Standardized error types for REST API communication.
 * Extracted from the former tRPC client layer.
 *
 * @module lib/api-errors
 */

/**
 * Base API error class
 */
export class ApiClientError extends Error {
  statusCode?: number
  code: string
  data?: unknown
  path?: string

  constructor(message: string, code: string, statusCode?: number, data?: unknown, path?: string) {
    super(message)
    this.name = 'ApiClientError'
    this.code = code
    this.statusCode = statusCode
    this.data = data
    this.path = path
  }
}

/**
 * Network error - indicates connectivity issues
 */
export class NetworkError extends ApiClientError {
  constructor(message = 'Network error occurred') {
    super(message, 'NETWORK_ERROR', 0)
    this.name = 'NetworkError'
  }
}

/**
 * Authentication error - indicates invalid or expired token
 */
export class AuthError extends ApiClientError {
  constructor(message = 'Authentication failed') {
    super(message, 'UNAUTHORIZED', 401)
    this.name = 'AuthError'
  }
}

/**
 * Server error - indicates backend issues
 */
export class ServerError extends ApiClientError {
  constructor(message = 'Server error occurred', statusCode = 500) {
    super(message, 'INTERNAL_SERVER_ERROR', statusCode)
    this.name = 'ServerError'
  }
}

// Legacy aliases for backward compatibility during migration
export { ApiClientError as TRPCClientError }
