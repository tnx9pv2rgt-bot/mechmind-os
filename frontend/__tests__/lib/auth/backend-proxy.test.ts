/**
 * Tests for backend-proxy.ts
 *
 * @module __tests__/lib/auth/backend-proxy.test
 */

// Mock NextResponse before importing the module under test
const mockCookiesSet = jest.fn()
const mockNextResponseJson = jest.fn()

jest.mock('next/server', () => ({
  NextResponse: {
    json: (...args: unknown[]) => {
      const body = args[0]
      const init = (args[1] as { status?: number }) || {}
      const response = {
        body,
        status: init.status || 200,
        cookies: { set: mockCookiesSet },
      }
      mockNextResponseJson(body, init)
      return response
    },
  },
}))

// We need to mock global fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

import { proxyToBackend, proxyAuthToBackend } from '@/lib/auth/backend-proxy'

describe('backend-proxy', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCookiesSet.mockClear()
    mockNextResponseJson.mockClear()
    mockFetch.mockReset()
  })

  // =========================================================================
  // proxyToBackend
  // =========================================================================
  describe('proxyToBackend', () => {
    it('should proxy a successful GET request to the backend', async () => {
      const responseData = { success: true, data: { id: '123' } }
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValueOnce(responseData),
      })

      const result = await proxyToBackend('auth/me', { method: 'GET' })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toContain('auth/me')
      expect(options.method).toBe('GET')
      expect(options.headers).toEqual(
        expect.objectContaining({ 'Content-Type': 'application/json' })
      )
      expect(result.body).toEqual(responseData)
      expect(result.status).toBe(200)
    })

    it('should proxy a POST request with body', async () => {
      const requestBody = { email: 'test@example.com', password: 'secret' }
      const responseData = { success: true }
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValueOnce(responseData),
      })

      await proxyToBackend('auth/login', {
        method: 'POST',
        body: requestBody,
      })

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(options.body).toBe(JSON.stringify(requestBody))
    })

    it('should forward backend error status codes', async () => {
      const errorData = { error: 'Unauthorized' }
      mockFetch.mockResolvedValueOnce({
        status: 401,
        json: jest.fn().mockResolvedValueOnce(errorData),
      })

      const result = await proxyToBackend('auth/login', { method: 'POST' })

      expect(result.status).toBe(401)
      expect(result.body).toEqual(errorData)
    })

    it('should return 502 on network error', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'))

      const result = await proxyToBackend('auth/login', { method: 'POST' })

      expect(result.status).toBe(502)
      expect(result.body).toEqual({
        error: {
          code: 'BACKEND_UNAVAILABLE',
          message: expect.any(String),
        },
      })
    })

    it('should return 503 on timeout (AbortError)', async () => {
      const abortError = new DOMException('The operation was aborted', 'AbortError')
      mockFetch.mockRejectedValueOnce(abortError)

      const result = await proxyToBackend('auth/login', { method: 'POST' })

      expect(result.status).toBe(503)
      expect(result.body).toEqual({
        error: {
          code: 'BACKEND_COLD_START',
          message: expect.any(String),
        },
      })
    })

    it('should forward custom headers', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValueOnce({}),
      })

      await proxyToBackend('auth/me', {
        method: 'GET',
        headers: { Authorization: 'Bearer token123' },
      })

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect((options.headers as Record<string, string>)['Authorization']).toBe(
        'Bearer token123'
      )
    })

    it('should not include body for GET requests without body', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValueOnce({}),
      })

      await proxyToBackend('auth/me', { method: 'GET' })

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(options.body).toBeUndefined()
    })
  })

  // =========================================================================
  // proxyAuthToBackend
  // =========================================================================
  describe('proxyAuthToBackend', () => {
    it('should set auth cookies on successful login with tokens', async () => {
      const tokenData = {
        accessToken: 'access-jwt-token',
        refreshToken: 'refresh-jwt-token',
        expiresIn: 3600,
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValueOnce(tokenData),
      })

      const result = await proxyAuthToBackend('auth/login', {
        method: 'POST',
        body: { email: 'test@example.com', password: 'pass' },
      })

      expect(result.body).toEqual({
        success: true,
        expiresIn: 3600,
        requiresMFA: false,
      })

      expect(mockCookiesSet).toHaveBeenCalledTimes(2)
      expect(mockCookiesSet).toHaveBeenCalledWith(
        'auth_token',
        'access-jwt-token',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
        })
      )
      expect(mockCookiesSet).toHaveBeenCalledWith(
        'refresh_token',
        'refresh-jwt-token',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 24 * 60 * 60,
        })
      )
    })

    it('should return MFA required response when tempToken is present', async () => {
      const mfaData = {
        tempToken: 'temp-mfa-token',
        methods: ['totp', 'backup'],
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValueOnce(mfaData),
      })

      const result = await proxyAuthToBackend('auth/login', {
        method: 'POST',
        body: { email: 'test@example.com', password: 'pass' },
      })

      expect(result.body).toEqual({
        requiresMFA: true,
        tempToken: 'temp-mfa-token',
        methods: ['totp', 'backup'],
      })
      expect(mockCookiesSet).not.toHaveBeenCalled()
    })

    it('should forward error response when backend returns non-ok status', async () => {
      const errorData = { error: 'Invalid credentials' }
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: jest.fn().mockResolvedValueOnce(errorData),
      })

      const result = await proxyAuthToBackend('auth/login', {
        method: 'POST',
        body: { email: 'test@example.com', password: 'wrong' },
      })

      expect(result.status).toBe(401)
      expect(result.body).toEqual(errorData)
    })

    it('should return 502 on network error', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'))

      const result = await proxyAuthToBackend('auth/login', {
        method: 'POST',
        body: { email: 'test@example.com' },
      })

      expect(result.status).toBe(502)
      expect(result.body).toEqual({
        error: {
          code: 'BACKEND_UNAVAILABLE',
          message: expect.any(String),
        },
      })
    })

    it('should return 503 on timeout (AbortError)', async () => {
      const abortError = new DOMException('The operation was aborted', 'AbortError')
      mockFetch.mockRejectedValueOnce(abortError)

      const result = await proxyAuthToBackend('auth/login', {
        method: 'POST',
        body: { email: 'test@example.com' },
      })

      expect(result.status).toBe(503)
      expect(result.body).toEqual({
        error: {
          code: 'BACKEND_COLD_START',
          message: expect.any(String),
        },
      })
    })

    it('should forward generic data when neither accessToken nor tempToken', async () => {
      const genericData = { message: 'some other response' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValueOnce(genericData),
      })

      const result = await proxyAuthToBackend('auth/some-endpoint', {
        method: 'POST',
      })

      expect(result.body).toEqual(genericData)
      expect(result.status).toBe(200)
    })

    it('should use default expiresIn of 86400 when not provided', async () => {
      const tokenData = {
        accessToken: 'access-jwt-token',
        refreshToken: 'refresh-jwt-token',
        // no expiresIn
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValueOnce(tokenData),
      })

      await proxyAuthToBackend('auth/login', {
        method: 'POST',
        body: { email: 'test@example.com', password: 'pass' },
      })

      // auth_token should use default maxAge 86400
      expect(mockCookiesSet).toHaveBeenCalledWith(
        'auth_token',
        'access-jwt-token',
        expect.objectContaining({
          maxAge: 86400,
        })
      )
    })
  })
})
