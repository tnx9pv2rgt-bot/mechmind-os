/**
 * Tests for useAuth hook (hooks/useAuth.tsx)
 */

import React from 'react'
import { render, screen, act, waitFor } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import { AuthProvider, useAuth } from '@/hooks/useAuth'

// =========================================================================
// Mocks
// =========================================================================

const mockFetch = jest.fn()
global.fetch = mockFetch

// jsdom 28 makes window.location non-configurable; delete + reassign is the workaround
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (global as any).location
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(global as any).location = { href: '', assign: jest.fn(), replace: jest.fn(), reload: jest.fn() }

// =========================================================================
// Helper wrapper
// =========================================================================

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}

// =========================================================================
// Tests
// =========================================================================

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockReset()
  })

  describe('initial state', () => {
    it('should render children', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false })
      render(
        <AuthProvider>
          <div>test content</div>
        </AuthProvider>
      )
      expect(screen.getByText('test content')).toBeInTheDocument()
    })

    it('should start with isLoading=true then false', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false })
      const { result } = renderHook(() => useAuth(), { wrapper })
      expect(result.current.isLoading).toBe(true)
      await waitFor(() => expect(result.current.isLoading).toBe(false))
    })

    it('should start with user=null and isAuthenticated=false', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false })
      const { result } = renderHook(() => useAuth(), { wrapper })
      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })
  })

  describe('checkAuth on mount', () => {
    it('should set user when /api/auth/me responds ok', async () => {
      const user = { id: '1', email: 'test@example.com', name: 'Test', role: 'admin' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ user }),
      })
      const { result } = renderHook(() => useAuth(), { wrapper })
      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.user).toEqual(user)
      expect(result.current.isAuthenticated).toBe(true)
    })

    it('should leave user null when /api/auth/me returns non-ok', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false })
      const { result } = renderHook(() => useAuth(), { wrapper })
      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.user).toBeNull()
    })

    it('should handle fetch error gracefully and set isLoading=false', async () => {
      mockFetch.mockRejectedValueOnce(new Error('network error'))
      const { result } = renderHook(() => useAuth(), { wrapper })
      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.user).toBeNull()
    })
  })

  describe('login', () => {
    it('should call checkAuth after login', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false })
      const { result } = renderHook(() => useAuth(), { wrapper })
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      const user = { id: '2', email: 'u@example.com', name: 'U', role: 'user' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ user }),
      })

      await act(async () => {
        result.current.login('jwt-token', 'refresh-token')
      })

      await waitFor(() => expect(result.current.user).toEqual(user))
    })
  })

  describe('logout', () => {
    it('should call POST /api/auth/logout and clear user', async () => {
      const user = { id: '1', email: 'u@example.com', name: 'U', role: 'admin' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ user }),
      })
      const { result } = renderHook(() => useAuth(), { wrapper })
      await waitFor(() => expect(result.current.user).toEqual(user))

      mockFetch.mockResolvedValueOnce({ ok: true })
      await act(async () => {
        await result.current.logout()
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST' })
      expect(result.current.user).toBeNull()
      // window.location.href navigation is not reliably testable in jsdom 28
    })
  })

  describe('refresh', () => {
    it('should call checkAuth when refresh succeeds', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false })
      const { result } = renderHook(() => useAuth(), { wrapper })
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      const user = { id: '3', email: 'r@example.com', name: 'R', role: 'user' }
      mockFetch.mockResolvedValueOnce({ ok: true })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ user }),
      })

      await act(async () => {
        await result.current.refresh()
      })

      await waitFor(() => expect(result.current.user).toEqual(user))
    })

    it('should call logout when refresh returns non-ok', async () => {
      const user = { id: '1', email: 'u@example.com', name: 'U', role: 'admin' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ user }),
      })
      const { result } = renderHook(() => useAuth(), { wrapper })
      await waitFor(() => expect(result.current.user).toEqual(user))

      mockFetch.mockResolvedValueOnce({ ok: false })
      mockFetch.mockResolvedValueOnce({ ok: true })

      await act(async () => {
        await result.current.refresh()
      })

      expect(result.current.user).toBeNull()
    })

    it('should call logout when refresh throws an error', async () => {
      const user = { id: '1', email: 'u@example.com', name: 'U', role: 'admin' }
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValueOnce({ user }),
        })
        .mockRejectedValueOnce(new Error('network'))
        .mockResolvedValueOnce({ ok: true })

      const { result } = renderHook(() => useAuth(), { wrapper })
      await waitFor(() => expect(result.current.user).toEqual(user))

      await act(async () => {
        await result.current.refresh()
      })

      expect(result.current.user).toBeNull()
    })
  })
})

describe('useAuth', () => {
  it('should throw when used outside AuthProvider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() => {
      renderHook(() => useAuth())
    }).toThrow('useAuth must be used within AuthProvider')
    consoleError.mockRestore()
  })
})
