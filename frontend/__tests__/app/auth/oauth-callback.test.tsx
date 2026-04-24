/**
 * Tests for OAuthCallbackPage (app/auth/oauth/callback/page.tsx)
 */

import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'

// =========================================================================
// Mocks
// =========================================================================

const mockPush = jest.fn()
let mockSearchParamsValues: Record<string, string | null> = {}

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({
    get: (key: string) => mockSearchParamsValues[key] ?? null,
  }),
}))

jest.mock('framer-motion', () => {
  const R = require('react')
  return {
    motion: new Proxy(
      {},
      {
        get: (_: unknown, prop: string) =>
          R.forwardRef(
            ({ children, ...rest }: { children?: React.ReactNode; [k: string]: unknown }, ref: React.Ref<HTMLElement>) => {
              const safe: Record<string, unknown> = {}
              for (const k of Object.keys(rest)) {
                if (['className', 'style', 'onClick', 'role', 'id'].includes(k) || k.startsWith('data-') || k.startsWith('aria-')) {
                  safe[k] = rest[k]
                }
              }
              return R.createElement(prop, { ...safe, ref }, children)
            }
          ),
      }
    ),
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      R.createElement(R.Fragment, null, children),
  }
})

jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) =>
    require('react').createElement('a', { href }, children)
})

jest.mock('@/components/auth/auth-split-layout', () => ({
  AuthSplitLayout: ({ children }: { children: React.ReactNode }) =>
    require('react').createElement('div', null, children),
}))

jest.mock('@/components/auth/auth-styles', () => ({
  btnPrimary: 'btn-primary',
}))

const mockFetch = jest.fn()
global.fetch = mockFetch

import OAuthCallbackPage from '@/app/auth/oauth/callback/page'

// =========================================================================
// Tests
// =========================================================================

describe('OAuthCallbackPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockReset()
    mockSearchParamsValues = {}
  })

  describe('loading state', () => {
    it('should show loading state while exchanging code', async () => {
      mockSearchParamsValues = { code: 'auth-code-123', state: 'state-abc', provider: 'google' }
      mockFetch.mockImplementationOnce(() => new Promise(() => undefined)) // never resolves

      render(<OAuthCallbackPage />)
      expect(screen.getByText('Completamento accesso...')).toBeInTheDocument()
    })

    it('should show loading spinner during exchange', () => {
      mockSearchParamsValues = { code: 'auth-code-123' }
      mockFetch.mockImplementationOnce(() => new Promise(() => undefined))

      render(<OAuthCallbackPage />)
      expect(screen.getByText(/Stiamo completando il tuo accesso/i)).toBeInTheDocument()
    })
  })

  describe('error state — errorParam', () => {
    it('should show error for access_denied', async () => {
      mockSearchParamsValues = { error: 'access_denied' }
      render(<OAuthCallbackPage />)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Accesso negato')
      })
    })

    it('should show error for invalid_scope', async () => {
      mockSearchParamsValues = { error: 'invalid_scope' }
      render(<OAuthCallbackPage />)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Permessi richiesti non validi')
      })
    })

    it('should show error for server_error', async () => {
      mockSearchParamsValues = { error: 'server_error' }
      render(<OAuthCallbackPage />)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Errore del server')
      })
    })

    it('should show error for temporarily_unavailable', async () => {
      mockSearchParamsValues = { error: 'temporarily_unavailable' }
      render(<OAuthCallbackPage />)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('temporaneamente non disponibile')
      })
    })

    it('should show generic error for unknown error codes', async () => {
      mockSearchParamsValues = { error: 'unknown_error' }
      render(<OAuthCallbackPage />)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent("Errore durante l'autenticazione: unknown_error")
      })
    })

    it('should show Accesso non riuscito title on error', async () => {
      mockSearchParamsValues = { error: 'access_denied' }
      render(<OAuthCallbackPage />)

      await waitFor(() => {
        expect(screen.getByText('Accesso non riuscito')).toBeInTheDocument()
      })
    })

    it('should show login link on error', async () => {
      mockSearchParamsValues = { error: 'access_denied' }
      render(<OAuthCallbackPage />)

      await waitFor(() => {
        const link = screen.getByRole('link', { name: 'Torna al login' })
        expect(link).toHaveAttribute('href', '/auth')
      })
    })
  })

  describe('error state — missing code', () => {
    it('should show error when code is missing', async () => {
      mockSearchParamsValues = {}
      render(<OAuthCallbackPage />)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Codice di autorizzazione mancante')
      })
    })
  })

  describe('success state', () => {
    it('should redirect to dashboard on success', async () => {
      mockSearchParamsValues = { code: 'valid-code', state: 'state-xyz', provider: 'google' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ success: true }),
      })

      render(<OAuthCallbackPage />)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('should call /api/auth/oauth/callback with correct params', async () => {
      mockSearchParamsValues = { code: 'code-abc', state: 'state-xyz', provider: 'microsoft' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ success: true }),
      })

      render(<OAuthCallbackPage />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/oauth/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: 'code-abc', state: 'state-xyz', provider: 'microsoft' }),
        })
      })
    })

    it('should use "oauth" as default provider when not specified', async () => {
      mockSearchParamsValues = { code: 'code-abc' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ success: true }),
      })

      render(<OAuthCallbackPage />)

      await waitFor(() => {
        const callBody = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string)
        expect(callBody.provider).toBe('oauth')
      })
    })
  })

  describe('API error state', () => {
    it('should show error when API returns success=false', async () => {
      mockSearchParamsValues = { code: 'code-abc' }
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValueOnce({ error: 'Account non trovato' }),
      })

      render(<OAuthCallbackPage />)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Account non trovato')
      })
    })

    it('should show fallback error message when API provides none', async () => {
      mockSearchParamsValues = { code: 'code-abc' }
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValueOnce({}),
      })

      render(<OAuthCallbackPage />)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent("Errore durante il completamento dell'accesso")
      })
    })

    it('should show network error on fetch failure', async () => {
      mockSearchParamsValues = { code: 'code-abc' }
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(<OAuthCallbackPage />)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Errore di rete')
      })
    })
  })
})
