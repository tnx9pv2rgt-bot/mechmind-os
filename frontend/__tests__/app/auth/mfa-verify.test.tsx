/**
 * Tests for MFA Verify Page (app/auth/mfa/verify/client.tsx)
 *
 * @module __tests__/app/auth/mfa-verify.test
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

// =========================================================================
// Mocks
// =========================================================================

const mockPush = jest.fn()
let mockSearchParamsMap: Record<string, string> = {}

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => ({
    get: (key: string) => mockSearchParamsMap[key] || null,
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
                'className', 'style', 'onClick', 'onSubmit', 'type', 'disabled',
                'id', 'role', 'tabIndex', 'href', 'target', 'rel', 'value',
                'onChange', 'placeholder', 'name', 'maxLength',
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

jest.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    className,
    variant,
  }: {
    children: React.ReactNode
    onClick?: () => void
    disabled?: boolean
    className?: string
    variant?: string
  }) => {
    return React.createElement(
      'button',
      { onClick, disabled, className, 'data-variant': variant },
      children
    )
  },
}))

jest.mock('@/components/ui/input', () => {
  const R = require('react')
  return {
    Input: R.forwardRef(
      (props: Record<string, unknown>, ref: unknown) => {
        return R.createElement('input', { ...props, ref })
      }
    ),
  }
})

const mockFetch = jest.fn()
global.fetch = mockFetch

import { MFAVerifyPageClient } from '@/app/auth/mfa/verify/client'

describe('MFAVerifyPageClient', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockReset()
    mockSearchParamsMap = { token: 'temp-mfa-token-123' }
  })

  // =========================================================================
  // Rendering
  // =========================================================================
  describe('rendering', () => {
    it('should render the 2FA verify title', () => {
      render(<MFAVerifyPageClient />)
      expect(screen.getByText('Verifica 2FA')).toBeInTheDocument()
    })

    it('should render the description', () => {
      render(<MFAVerifyPageClient />)
      expect(
        screen.getByText(/Inserisci il codice generato dalla tua app authenticator/i)
      ).toBeInTheDocument()
    })

    it('should render 6-digit input with placeholder', () => {
      render(<MFAVerifyPageClient />)
      const input = screen.getByPlaceholderText('000000')
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('maxLength', '6')
    })

    it('should render verify button (disabled by default)', () => {
      render(<MFAVerifyPageClient />)
      const verifyButton = screen.getByText('Verifica')
      expect(verifyButton.closest('button')).toBeDisabled()
    })

    it('should render "Torna al login" button', () => {
      render(<MFAVerifyPageClient />)
      expect(screen.getByText('Torna al login')).toBeInTheDocument()
    })
  })

  // =========================================================================
  // Code Input
  // =========================================================================
  describe('code input', () => {
    it('should enable verify button when 6 digits are entered', async () => {
      render(<MFAVerifyPageClient />)

      const input = screen.getByPlaceholderText('000000')
      fireEvent.change(input, { target: { value: '123456' } })

      const verifyButton = screen.getByText('Verifica')
      expect(verifyButton.closest('button')).not.toBeDisabled()
    })

    it('should keep verify button disabled with fewer than 6 digits', async () => {
      render(<MFAVerifyPageClient />)

      const input = screen.getByPlaceholderText('000000')
      fireEvent.change(input, { target: { value: '12345' } })

      const verifyButton = screen.getByText('Verifica')
      expect(verifyButton.closest('button')).toBeDisabled()
    })
  })

  // =========================================================================
  // Verification
  // =========================================================================
  describe('verification', () => {
    it('should call verify API with code and userId', async () => {
      mockFetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce({ success: true }),
      })

      render(<MFAVerifyPageClient />)

      const input = screen.getByPlaceholderText('000000')
      fireEvent.change(input, { target: { value: '123456' } })

      await act(async () => {
        fireEvent.click(screen.getByText('Verifica'))
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/mfa/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tempToken: 'temp-mfa-token-123', token: '123456' }),
        })
      })
    })

    it('should redirect to dashboard on successful verification', async () => {
      mockFetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce({ success: true }),
      })

      render(<MFAVerifyPageClient />)

      const input = screen.getByPlaceholderText('000000')
      fireEvent.change(input, { target: { value: '654321' } })

      await act(async () => {
        fireEvent.click(screen.getByText('Verifica'))
      })

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('should show error on invalid code', async () => {
      mockFetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce({ success: false }),
      })

      render(<MFAVerifyPageClient />)

      const input = screen.getByPlaceholderText('000000')
      fireEvent.change(input, { target: { value: '000000' } })

      await act(async () => {
        fireEvent.click(screen.getByText('Verifica'))
      })

      await waitFor(() => {
        expect(
          screen.getByText(/Codice non valido/i)
        ).toBeInTheDocument()
      })
    })

    it('should show connection error on fetch failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(<MFAVerifyPageClient />)

      const input = screen.getByPlaceholderText('000000')
      fireEvent.change(input, { target: { value: '123456' } })

      await act(async () => {
        fireEvent.click(screen.getByText('Verifica'))
      })

      await waitFor(() => {
        expect(
          screen.getByText(/Errore di connessione/i)
        ).toBeInTheDocument()
      })
    })
  })

  // =========================================================================
  // Navigation
  // =========================================================================
  describe('navigation', () => {
    it('should navigate back to login on "Torna al login" click', async () => {
      render(<MFAVerifyPageClient />)

      await act(async () => {
        fireEvent.click(screen.getByText('Torna al login'))
      })

      expect(mockPush).toHaveBeenCalledWith('/auth')
    })
  })
})
