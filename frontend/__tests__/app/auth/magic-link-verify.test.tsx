/**
 * Tests for Magic Link Verify Page (app/auth/magic-link/verify/page.tsx)
 *
 * @module __tests__/app/auth/magic-link-verify.test
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'

// =========================================================================
// Mocks
// =========================================================================

const mockPush = jest.fn()

let mockSearchParamsValue = ''

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => ({
    get: (key: string) => {
      if (key === 'token') return mockSearchParamsValue
      return null
    },
  }),
}))

jest.mock('framer-motion', () => {
  const React = require('react')
  return {
    motion: new Proxy(
      {},
      {
        get: (_target: unknown, prop: string) => {
          return React.forwardRef(
            ({ children, ...rest }: { children?: React.ReactNode; [key: string]: unknown }, ref: React.Ref<HTMLElement>) => {
              const validProps: Record<string, unknown> = {}
              const htmlProps = [
                'className', 'style', 'onClick', 'type', 'disabled', 'id',
                'role', 'tabIndex', 'href', 'target', 'rel',
              ]
              for (const key of Object.keys(rest)) {
                if (htmlProps.includes(key) || key.startsWith('data-') || key.startsWith('aria-')) {
                  validProps[key] = rest[key]
                }
              }
              return React.createElement(prop, { ...validProps, ref }, children)
            }
          )
        },
      }
    ),
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  }
})

jest.mock('next/link', () => {
  return ({ children, href, ...rest }: { children: React.ReactNode; href: string; [key: string]: unknown }) => {
    return React.createElement('a', { href, ...rest }, children)
  }
})

const mockFetch = jest.fn()
global.fetch = mockFetch

import MagicLinkVerifyPage from '@/app/auth/magic-link/verify/page'

describe('MagicLinkVerifyPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockReset()
    mockSearchParamsValue = ''
  })

  // =========================================================================
  // Verifying State
  // =========================================================================
  describe('verifying state', () => {
    it('should show verifying state initially when token is present', () => {
      mockSearchParamsValue = 'valid-token-123'
      mockFetch.mockReturnValue(new Promise(() => {})) // Never resolves

      render(<MagicLinkVerifyPage />)

      expect(screen.getByText('Verifica in corso...')).toBeInTheDocument()
      expect(
        screen.getByText(/Stiamo verificando il tuo link/i)
      ).toBeInTheDocument()
    })

    it('should call the verify API with the token', () => {
      mockSearchParamsValue = 'my-magic-token'
      mockFetch.mockReturnValue(new Promise(() => {}))

      render(<MagicLinkVerifyPage />)

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/magic-link/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'my-magic-token' }),
      })
    })
  })

  // =========================================================================
  // Success State
  // =========================================================================
  describe('success state', () => {
    it('should show success message after verification', async () => {
      mockSearchParamsValue = 'valid-token'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ success: true }),
      })

      render(<MagicLinkVerifyPage />)

      await waitFor(() => {
        expect(screen.getByText('Accesso effettuato!')).toBeInTheDocument()
        expect(
          screen.getByText(/Reindirizzamento alla dashboard/i)
        ).toBeInTheDocument()
      })

      // The component schedules a redirect via setTimeout(1500ms)
      // We verify the router.push will be called after the timeout
      await waitFor(
        () => {
          expect(mockPush).toHaveBeenCalledWith('/dashboard')
        },
        { timeout: 3000 }
      )
    })
  })

  // =========================================================================
  // Error States
  // =========================================================================
  describe('error states', () => {
    it('should show error when token is missing', async () => {
      mockSearchParamsValue = ''

      render(<MagicLinkVerifyPage />)

      await waitFor(() => {
        expect(screen.getByText('Link non valido')).toBeInTheDocument()
        expect(
          screen.getByText(/Token mancante/i)
        ).toBeInTheDocument()
      })
    })

    it('should show error when verification fails', async () => {
      mockSearchParamsValue = 'expired-token'
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: jest
          .fn()
          .mockResolvedValueOnce({ error: 'Link scaduto' }),
      })

      render(<MagicLinkVerifyPage />)

      await waitFor(() => {
        expect(screen.getByText('Link non valido')).toBeInTheDocument()
        expect(screen.getByText('Link scaduto')).toBeInTheDocument()
      })
    })

    it('should show error on network failure', async () => {
      mockSearchParamsValue = 'some-token'
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(<MagicLinkVerifyPage />)

      await waitFor(() => {
        expect(screen.getByText('Link non valido')).toBeInTheDocument()
        expect(screen.getByText(/Errore di rete/i)).toBeInTheDocument()
      })
    })

    it('should show retry link on error', async () => {
      mockSearchParamsValue = 'bad-token'
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: jest
          .fn()
          .mockResolvedValueOnce({ error: 'Token non valido' }),
      })

      render(<MagicLinkVerifyPage />)

      await waitFor(() => {
        const retryLink = screen.getByText('Richiedi nuovo link')
        expect(retryLink.closest('a')).toHaveAttribute('href', '/auth')
      })
    })

    it('should use default error message when API does not provide one', async () => {
      mockSearchParamsValue = 'bad-token'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ success: false }),
      })

      render(<MagicLinkVerifyPage />)

      await waitFor(() => {
        expect(
          screen.getByText(/Link non valido o scaduto/i)
        ).toBeInTheDocument()
      })
    })
  })
})
