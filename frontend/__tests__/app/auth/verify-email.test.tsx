/**
 * Tests for VerifyEmailPage (app/auth/verify-email/page.tsx)
 */

import React from 'react'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'

// =========================================================================
// Mocks
// =========================================================================

const mockPush = jest.fn()
let mockSearchParamsValues: Record<string, string | null> = {}

// Stable reference prevents useEffect([token, router]) re-runs on every render
const stableRouter = { push: mockPush }

jest.mock('next/navigation', () => ({
  useRouter: () => stableRouter,
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
                if (['className', 'style', 'onClick', 'disabled', 'role', 'id'].includes(k) || k.startsWith('data-') || k.startsWith('aria-')) {
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
  btnSpinner: 'btn-spinner',
}))

const mockFetch = jest.fn()
global.fetch = mockFetch

import VerifyEmailPage from '@/app/auth/verify-email/page'

// =========================================================================
// Tests
// =========================================================================

describe('VerifyEmailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockReset()
    mockSearchParamsValues = {}
  })

  describe('missing token', () => {
    it('should show error when token is missing', async () => {
      mockSearchParamsValues = {}
      render(<VerifyEmailPage />)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Token di verifica mancante')
      })
    })

    it('should show error title when token missing', async () => {
      mockSearchParamsValues = {}
      render(<VerifyEmailPage />)

      await waitFor(() => {
        expect(screen.getByText('Verifica non riuscita')).toBeInTheDocument()
      })
    })
  })

  describe('verifying state', () => {
    it('should show verifying state initially when token is present', () => {
      mockSearchParamsValues = { token: 'valid-token' }
      mockFetch.mockImplementationOnce(() => new Promise(() => undefined))

      render(<VerifyEmailPage />)
      expect(screen.getByText('Verifica in corso...')).toBeInTheDocument()
    })

    it('should show verifying description', () => {
      mockSearchParamsValues = { token: 'valid-token' }
      mockFetch.mockImplementationOnce(() => new Promise(() => undefined))

      render(<VerifyEmailPage />)
      expect(screen.getByText(/Stiamo verificando il tuo indirizzo email/i)).toBeInTheDocument()
    })

    it('should call /api/auth/verify-email with the token', async () => {
      mockSearchParamsValues = { token: 'my-token-123' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ success: true }),
      })

      render(<VerifyEmailPage />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: 'my-token-123' }),
        })
      })
    })
  })

  describe('success state', () => {
    it('should show success message after verification', async () => {
      mockSearchParamsValues = { token: 'valid-token' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ success: true }),
      })

      render(<VerifyEmailPage />)

      await waitFor(() => {
        expect(screen.getByText('Email verificata!')).toBeInTheDocument()
      })
    })

    it('should show success description', async () => {
      mockSearchParamsValues = { token: 'valid-token' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ success: true }),
      })

      render(<VerifyEmailPage />)

      await waitFor(() => {
        expect(screen.getByText(/verificato con successo/i)).toBeInTheDocument()
      })
    })

    it('should show checkmark icon on success', async () => {
      mockSearchParamsValues = { token: 'valid-token' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ success: true }),
      })

      render(<VerifyEmailPage />)

      await waitFor(() => {
        expect(screen.getByText('✓')).toBeInTheDocument()
      })
    })

    it('should redirect to /auth after 3 seconds on success', async () => {
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout')
      mockSearchParamsValues = { token: 'valid-token' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ success: true }),
      })

      render(<VerifyEmailPage />)

      await waitFor(() => {
        expect(screen.getByText('Email verificata!')).toBeInTheDocument()
      })

      const redirectCall = setTimeoutSpy.mock.calls.find((args) => args[1] === 3000)
      act(() => { (redirectCall![0] as () => void)() })
      expect(mockPush).toHaveBeenCalledWith('/auth')
      setTimeoutSpy.mockRestore()
    })

    it('should show login link on success', async () => {
      mockSearchParamsValues = { token: 'valid-token' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ success: true }),
      })

      render(<VerifyEmailPage />)

      await waitFor(() => {
        const link = screen.getByRole('link', { name: 'Vai al login' })
        expect(link).toHaveAttribute('href', '/auth')
      })
    })

    it('should store email from API response', async () => {
      mockSearchParamsValues = { token: 'valid-token' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ success: true, email: 'user@example.com' }),
      })

      render(<VerifyEmailPage />)

      await waitFor(() => {
        expect(screen.getByText('Email verificata!')).toBeInTheDocument()
      })
    })
  })

  describe('error state', () => {
    it('should show error when verification fails', async () => {
      mockSearchParamsValues = { token: 'invalid-token' }
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValueOnce({ error: 'Token scaduto' }),
      })

      render(<VerifyEmailPage />)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Token scaduto')
      })
    })

    it('should show fallback error when API provides none', async () => {
      mockSearchParamsValues = { token: 'invalid-token' }
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValueOnce({}),
      })

      render(<VerifyEmailPage />)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Link di verifica non valido o scaduto')
      })
    })

    it('should show network error on fetch failure', async () => {
      mockSearchParamsValues = { token: 'valid-token' }
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(<VerifyEmailPage />)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Errore di rete')
      })
    })

    it('should show error title', async () => {
      mockSearchParamsValues = { token: 'invalid-token' }
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValueOnce({ error: 'Not found' }),
      })

      render(<VerifyEmailPage />)

      await waitFor(() => {
        expect(screen.getByText('Verifica non riuscita')).toBeInTheDocument()
      })
    })

    it('should show resend button on error', async () => {
      mockSearchParamsValues = { token: 'invalid-token' }
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValueOnce({ error: 'Expired' }),
      })

      render(<VerifyEmailPage />)

      await waitFor(() => {
        expect(screen.getByText('Reinvia email di verifica')).toBeInTheDocument()
      })
    })

    it('should show back to login link on error', async () => {
      mockSearchParamsValues = { token: 'invalid-token' }
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValueOnce({ error: 'Expired' }),
      })

      render(<VerifyEmailPage />)

      await waitFor(() => {
        const link = screen.getByRole('link', { name: 'Torna al login' })
        expect(link).toHaveAttribute('href', '/auth')
      })
    })
  })

  describe('resend email', () => {
    async function renderErrorState() {
      mockSearchParamsValues = { token: 'invalid-token' }
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValueOnce({ error: 'Expired' }),
      })
      render(<VerifyEmailPage />)
      await waitFor(() => {
        expect(screen.getByText('Reinvia email di verifica')).toBeInTheDocument()
      })
    }

    it('should show success message when resend succeeds', async () => {
      await renderErrorState()

      mockFetch.mockResolvedValueOnce({ ok: true })

      await act(async () => {
        fireEvent.click(screen.getByText('Reinvia email di verifica'))
      })

      await waitFor(() => {
        expect(screen.getByText('Email di verifica reinviata con successo!')).toBeInTheDocument()
      })
    })

    it('should call resend-verification endpoint', async () => {
      await renderErrorState()

      mockFetch.mockResolvedValueOnce({ ok: true })

      await act(async () => {
        fireEvent.click(screen.getByText('Reinvia email di verifica'))
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/resend-verification', expect.any(Object))
      })
    })

    it('should show error when resend fails with non-ok response', async () => {
      await renderErrorState()

      mockFetch.mockResolvedValueOnce({ ok: false })

      await act(async () => {
        fireEvent.click(screen.getByText('Reinvia email di verifica'))
      })

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Impossibile reinviare')
      })
    })

    it('should show error when resend throws network error', async () => {
      await renderErrorState()

      mockFetch.mockRejectedValueOnce(new Error('network'))

      await act(async () => {
        fireEvent.click(screen.getByText('Reinvia email di verifica'))
      })

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Errore di rete')
      })
    })
  })
})
