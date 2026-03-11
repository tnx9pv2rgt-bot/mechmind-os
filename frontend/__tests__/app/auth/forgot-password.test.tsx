/**
 * Tests for Forgot Password Page (app/auth/forgot-password/page.tsx)
 *
 * @module __tests__/app/auth/forgot-password.test
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

// =========================================================================
// Mocks
// =========================================================================

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
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
                'className', 'style', 'onClick', 'onSubmit', 'type', 'disabled',
                'id', 'role', 'tabIndex', 'href', 'target', 'rel', 'value',
                'onChange', 'placeholder', 'name', 'autoFocus', 'autoComplete',
                'maxLength', 'checked', 'aria-label', 'htmlFor', 'required',
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

import ForgotPasswordPage from '@/app/auth/forgot-password/page'

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockReset()
  })

  // =========================================================================
  // Rendering
  // =========================================================================
  describe('rendering', () => {
    it('should render the forgot password title', () => {
      render(<ForgotPasswordPage />)
      expect(screen.getByText('Password dimenticata?')).toBeInTheDocument()
    })

    it('should render email input', () => {
      render(<ForgotPasswordPage />)
      expect(screen.getByPlaceholderText('nome@officina.it')).toBeInTheDocument()
    })

    it('should render back to login link', () => {
      render(<ForgotPasswordPage />)
      expect(screen.getByText('Torna al login')).toBeInTheDocument()
      expect(screen.getByText('Torna al login').closest('a')).toHaveAttribute(
        'href',
        '/auth'
      )
    })

    it('should render the submit button', () => {
      render(<ForgotPasswordPage />)
      expect(screen.getByText(/Invia link di reset/i)).toBeInTheDocument()
    })

    it('should render the support link', () => {
      render(<ForgotPasswordPage />)
      expect(screen.getByText('Contatta il supporto')).toBeInTheDocument()
    })

    it('should have submit button disabled when email is empty', () => {
      render(<ForgotPasswordPage />)
      const button = screen.getByText(/Invia link di reset/i).closest('button')
      expect(button).toBeDisabled()
    })
  })

  // =========================================================================
  // Validation
  // =========================================================================
  describe('validation', () => {
    it('should have submit button disabled when email is empty', () => {
      render(<ForgotPasswordPage />)
      const button = screen.getByText(/Invia link di reset/i).closest('button')
      expect(button).toBeDisabled()
    })

    it('should show error for invalid email format on submit', async () => {
      const { container } = render(<ForgotPasswordPage />)

      const emailInput = screen.getByPlaceholderText('nome@officina.it')
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } })

      const form = container.querySelector('form')!
      await act(async () => {
        fireEvent.submit(form)
      })

      await waitFor(() => {
        expect(screen.getByText(/Inserisci un'email valida/i)).toBeInTheDocument()
      })
    })
  })

  // =========================================================================
  // Submission
  // =========================================================================
  describe('submission', () => {
    it('should submit and show success message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ success: true }),
      })

      const { container } = render(<ForgotPasswordPage />)

      const emailInput = screen.getByPlaceholderText('nome@officina.it')
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } })

      const form = container.querySelector('form')!
      await act(async () => {
        fireEvent.submit(form)
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'user@example.com' }),
        })
      })

      await waitFor(() => {
        expect(screen.getByText('Email inviata!')).toBeInTheDocument()
        expect(
          screen.getByText(/Controlla la tua casella di posta/i)
        ).toBeInTheDocument()
      })
    })

    it('should show error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValueOnce({ error: 'Internal error' }),
      })

      const { container } = render(<ForgotPasswordPage />)

      const emailInput = screen.getByPlaceholderText('nome@officina.it')
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } })

      const form = container.querySelector('form')!
      await act(async () => {
        fireEvent.submit(form)
      })

      await waitFor(() => {
        expect(
          screen.getByText(/Non siamo riusciti a inviare l'email/i)
        ).toBeInTheDocument()
      })
    })

    it('should show error on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { container } = render(<ForgotPasswordPage />)

      const emailInput = screen.getByPlaceholderText('nome@officina.it')
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } })

      const form = container.querySelector('form')!
      await act(async () => {
        fireEvent.submit(form)
      })

      await waitFor(() => {
        expect(
          screen.getByText(/Non siamo riusciti a inviare l'email/i)
        ).toBeInTheDocument()
      })
    })

    it('should show "Torna al login" button in success state', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ success: true }),
      })

      const { container } = render(<ForgotPasswordPage />)

      const emailInput = screen.getByPlaceholderText('nome@officina.it')
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } })

      const form = container.querySelector('form')!
      await act(async () => {
        fireEvent.submit(form)
      })

      await waitFor(() => {
        // In success state, the "Torna al login" button should be visible
        const links = screen.getAllByText('Torna al login')
        const loginLink = links.find(
          (el) => el.closest('a')?.getAttribute('href') === '/auth'
        )
        expect(loginLink).toBeTruthy()
      })
    })
  })
})
