/**
 * REST API Client - MechMind OS Frontend
 *
 * Provides type-safe fetch wrapper for calling Next.js API proxy routes.
 * The proxy routes read the HttpOnly auth_token cookie and forward
 * requests to the NestJS backend with Bearer authorization.
 * In demo mode, the proxy returns mock data (see api-proxy.ts).
 *
 * Browser → /api/* (Next.js route handler) → NestJS /v1/*
 */

const API_BASE = '/api'

interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  params?: Record<string, string | number | boolean | undefined>
  signal?: AbortSignal
}

interface ApiResponse<T> {
  data: T
  status: number
  ok: boolean
}

export class ApiError extends Error {
  status: number
  code: string
  details?: unknown

  constructor(message: string, status: number, code: string = 'API_ERROR', details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

/**
 * Core fetch wrapper. Calls Next.js API routes which proxy to NestJS.
 * Credentials are included automatically (HttpOnly cookies).
 */
export async function apiClient<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, params, signal } = options

  let url = `${API_BASE}${path}`

  if (params) {
    const searchParams = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        searchParams.set(key, String(value))
      }
    }
    const qs = searchParams.toString()
    if (qs) url += `?${qs}`
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-client-version': '10.0.0',
  }

  // Attach CSRF token on mutating requests (double-submit cookie pattern)
  if (method !== 'GET' && typeof document !== 'undefined') {
    const csrfMatch = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/)
    if (csrfMatch?.[1]) {
      headers['X-CSRF-Token'] = decodeURIComponent(csrfMatch[1])
    }
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
    signal,
  })

  if (res.status === 401) {
    // Session expired — redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/auth?expired=true'
    }
    throw new ApiError('Sessione scaduta', 401, 'UNAUTHORIZED')
  }

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    const errorData = data as { error?: { code?: string; message?: string } } | null
    throw new ApiError(
      errorData?.error?.message || `Errore ${res.status}`,
      res.status,
      errorData?.error?.code || 'API_ERROR',
      data,
    )
  }

  return { data: data as T, status: res.status, ok: true }
}

// Convenience methods
export const api = {
  get: <T>(path: string, params?: Record<string, string | number | boolean | undefined>, signal?: AbortSignal) =>
    apiClient<T>(path, { method: 'GET', params, signal }),

  post: <T>(path: string, body?: unknown) =>
    apiClient<T>(path, { method: 'POST', body }),

  put: <T>(path: string, body?: unknown) =>
    apiClient<T>(path, { method: 'PUT', body }),

  patch: <T>(path: string, body?: unknown) =>
    apiClient<T>(path, { method: 'PATCH', body }),

  delete: <T>(path: string, body?: unknown) =>
    apiClient<T>(path, { method: 'DELETE', body }),
}
