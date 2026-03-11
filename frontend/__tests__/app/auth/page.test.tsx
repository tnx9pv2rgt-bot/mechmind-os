/**
 * Tests for Auth Page (app/auth/page.tsx)
 *
 * @module __tests__/app/auth/page.test
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// =========================================================================
// Mocks
// =========================================================================

const mockPush = jest.fn()
const mockRouter = { push: mockPush, replace: jest.fn(), back: jest.fn(), prefetch: jest.fn(), refresh: jest.fn() }

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => new URLSearchParams(),
}))

// Mock framer-motion to render children directly
jest.mock('framer-motion', () => {
  const React = require('react')
  return {
    motion: new Proxy(
      {},
      {
        get: (_target: unknown, prop: string) => {
          return React.forwardRef(
            ({ children, ...rest }: { children?: React.ReactNode; [key: string]: unknown }, ref: React.Ref<HTMLElement>) => {
              // Filter out framer-motion specific props
              const validProps: Record<string, unknown> = {}
              const htmlProps = [
                'className', 'style', 'onClick', 'onSubmit', 'type', 'disabled',
                'id', 'role', 'tabIndex', 'href', 'target', 'rel', 'value',
                'onChange', 'placeholder', 'name', 'autoFocus', 'autoComplete',
                'maxLength', 'checked', 'aria-label', 'htmlFor',
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
    useMotionValue: () => ({ set: jest.fn(), get: jest.fn() }),
    useTransform: () => ({ set: jest.fn(), get: jest.fn() }),
    useAnimation: () => ({ start: jest.fn(), stop: jest.fn() }),
  }
})

// Mock @simplewebauthn/browser
const mockBrowserSupportsWebAuthn = jest.fn()
const mockStartAuthentication = jest.fn()

jest.mock('@simplewebauthn/browser', () => ({
  browserSupportsWebAuthn: () => mockBrowserSupportsWebAuthn(),
  startAuthentication: (...args: unknown[]) => mockStartAuthentication(...args),
}))

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href, ...rest }: { children: React.ReactNode; href: string; [key: string]: unknown }) => {
    return React.createElement('a', { href, ...rest }, children)
  }
})

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

import AuthPage from '@/app/auth/page'

describe('AuthPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockReset()
    mockBrowserSupportsWebAuthn.mockReturnValue(false)
  })

  // =========================================================================
  // Rendering
  // =========================================================================
  describe('rendering', () => {
    it('should render the login page with title', () => {
      render(<AuthPage />)
      // Multiple MechMind OS text nodes exist (header + desktop preview)
      const titles = screen.getAllByText('MechMind OS')
      expect(titles.length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('Accedi al tuo gestionale')).toBeInTheDocument()
    })

    it('should render the method selector tabs', () => {
      render(<AuthPage />)
      expect(screen.getByText('Magic Link')).toBeInTheDocument()
      expect(screen.getByText('Password')).toBeInTheDocument()
    })

    it('should render footer links', () => {
      render(<AuthPage />)
      expect(screen.getByText('Registrati ora')).toBeInTheDocument()
      expect(screen.getByText('GDPR Compliant')).toBeInTheDocument()
      expect(screen.getByText('99.9% Uptime')).toBeInTheDocument()
    })

    it('should render signup link', () => {
      render(<AuthPage />)
      const signupLink = screen.getByText('Registrati ora')
      expect(signupLink.closest('a')).toHaveAttribute('href', '/auth/signup')
    })
  })

  // =========================================================================
  // PasskeyButton
  // =========================================================================
  describe('PasskeyButton', () => {
    it('should show "not supported" message when WebAuthn is not supported', async () => {
      mockBrowserSupportsWebAuthn.mockReturnValue(false)
      render(<AuthPage />)

      await waitFor(() => {
        expect(
          screen.getByText(/non supporta l'accesso biometrico/i)
        ).toBeInTheDocument()
      })
    })

    it('should show passkey button when WebAuthn is supported', async () => {
      mockBrowserSupportsWebAuthn.mockReturnValue(true)
      render(<AuthPage />)

      await waitFor(() => {
        expect(
          screen.getByText(/Accedi con FaceID/i)
        ).toBeInTheDocument()
      })
    })

    it('should trigger authentication flow on click', async () => {
      mockBrowserSupportsWebAuthn.mockReturnValue(true)

      const optionsResponse = { challenge: 'test-challenge', sessionId: 'session-1' }
      const assertion = { id: 'cred-1', response: {} }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValueOnce(optionsResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValueOnce({ success: true }),
        })

      mockStartAuthentication.mockResolvedValueOnce(assertion)

      render(<AuthPage />)

      await waitFor(() => {
        expect(screen.getByText(/Accedi con FaceID/i)).toBeInTheDocument()
      })

      await act(async () => {
        fireEvent.click(screen.getByText(/Accedi con FaceID/i))
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/passkey/authenticate-options')
        expect(mockStartAuthentication).toHaveBeenCalledWith(optionsResponse)
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('should handle user cancellation (NotAllowedError)', async () => {
      mockBrowserSupportsWebAuthn.mockReturnValue(true)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ challenge: 'test' }),
      })

      const notAllowedError = new Error('User cancelled')
      notAllowedError.name = 'NotAllowedError'
      mockStartAuthentication.mockRejectedValueOnce(notAllowedError)

      render(<AuthPage />)

      await waitFor(() => {
        expect(screen.getByText(/Accedi con FaceID/i)).toBeInTheDocument()
      })

      await act(async () => {
        fireEvent.click(screen.getByText(/Accedi con FaceID/i))
      })

      await waitFor(() => {
        expect(screen.getByText(/Autenticazione annullata/i)).toBeInTheDocument()
      })
    })

    it('should handle backend error during passkey flow', async () => {
      mockBrowserSupportsWebAuthn.mockReturnValue(true)

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValueOnce({}),
      })

      render(<AuthPage />)

      await waitFor(() => {
        expect(screen.getByText(/Accedi con FaceID/i)).toBeInTheDocument()
      })

      await act(async () => {
        fireEvent.click(screen.getByText(/Accedi con FaceID/i))
      })

      await waitFor(() => {
        // The error message is set from the catch block in handlePasskeyLogin
        const errorElement = screen.getByText((content) => {
          return content.includes('Errore') || content.includes('Impossibile') || content.includes('autenticazione')
        })
        expect(errorElement).toBeInTheDocument()
      })
    })
  })

  // =========================================================================
  // MagicLinkForm
  // =========================================================================
  describe('MagicLinkForm', () => {
    const switchToMagicLink = () => {
      fireEvent.click(screen.getByText('Magic Link'))
    }

    it('should render slug and email inputs', () => {
      render(<AuthPage />)
      switchToMagicLink()

      expect(screen.getByPlaceholderText('garage-roma')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('tu@officina.it')).toBeInTheDocument()
    })

    it('should validate required email field', async () => {
      render(<AuthPage />)
      switchToMagicLink()

      // Set slug but not email, then click send
      const slugInput = screen.getByPlaceholderText('garage-roma')
      await userEvent.type(slugInput, 'test-garage')

      // The button should be disabled when email is empty
      const sendButton = screen.getByText(/Invia link di accesso/i)
      expect(sendButton.closest('button')).toBeDisabled()
    })

    it('should validate required slug field', async () => {
      render(<AuthPage />)
      switchToMagicLink()

      // Set email but not slug
      const emailInput = screen.getByPlaceholderText('tu@officina.it')
      await userEvent.type(emailInput, 'test@example.com')

      // The button should be disabled when slug is empty
      const sendButton = screen.getByText(/Invia link di accesso/i)
      expect(sendButton.closest('button')).toBeDisabled()
    })

    it('should send magic link successfully and show success message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ success: true }),
      })

      render(<AuthPage />)
      switchToMagicLink()

      const slugInput = screen.getByPlaceholderText('garage-roma')
      const emailInput = screen.getByPlaceholderText('tu@officina.it')

      await userEvent.type(slugInput, 'test-garage')
      await userEvent.type(emailInput, 'test@example.com')

      const sendButton = screen.getByText(/Invia link di accesso/i)
      await act(async () => {
        fireEvent.click(sendButton)
      })

      await waitFor(() => {
        expect(screen.getByText('Email inviata!')).toBeInTheDocument()
        expect(
          screen.getByText(/Controlla la tua casella di posta/i)
        ).toBeInTheDocument()
      })
    })

    it('should handle error response from API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValueOnce({ error: 'Utente non trovato' }),
      })

      render(<AuthPage />)
      switchToMagicLink()

      const slugInput = screen.getByPlaceholderText('garage-roma')
      const emailInput = screen.getByPlaceholderText('tu@officina.it')

      await userEvent.type(slugInput, 'test-garage')
      await userEvent.type(emailInput, 'test@example.com')

      await act(async () => {
        fireEvent.click(screen.getByText(/Invia link di accesso/i))
      })

      await waitFor(() => {
        expect(screen.getByText('Utente non trovato')).toBeInTheDocument()
      })
    })

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(<AuthPage />)
      switchToMagicLink()

      const slugInput = screen.getByPlaceholderText('garage-roma')
      const emailInput = screen.getByPlaceholderText('tu@officina.it')

      await userEvent.type(slugInput, 'test-garage')
      await userEvent.type(emailInput, 'test@example.com')

      await act(async () => {
        fireEvent.click(screen.getByText(/Invia link di accesso/i))
      })

      await waitFor(() => {
        expect(screen.getByText(/Errore di rete/i)).toBeInTheDocument()
      })
    })
  })

  // =========================================================================
  // PasswordForm
  // =========================================================================
  describe('PasswordForm', () => {
    const switchToPassword = () => {
      fireEvent.click(screen.getByText('Password'))
    }

    it('should render all password form inputs', () => {
      render(<AuthPage />)
      switchToPassword()

      expect(screen.getByPlaceholderText('garage-roma')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('tu@officina.it')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
    })

    it('should render remember me checkbox and forgot password link', () => {
      render(<AuthPage />)
      switchToPassword()

      expect(screen.getByText('Ricordami')).toBeInTheDocument()
      expect(screen.getByText('Password dimenticata?')).toBeInTheDocument()

      const forgotLink = screen.getByText('Password dimenticata?')
      expect(forgotLink.closest('a')).toHaveAttribute(
        'href',
        '/auth/forgot-password'
      )
    })

    it('should submit credentials and redirect to dashboard on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ success: true }),
      })

      render(<AuthPage />)
      switchToPassword()

      await userEvent.type(screen.getByPlaceholderText('garage-roma'), 'my-garage')
      await userEvent.type(screen.getByPlaceholderText('tu@officina.it'), 'user@test.com')
      await userEvent.type(screen.getByPlaceholderText('••••••••'), 'mypassword')

      await act(async () => {
        fireEvent.submit(screen.getByPlaceholderText('••••••••').closest('form')!)
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/password/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'user@test.com',
            password: 'mypassword',
            tenantSlug: 'my-garage',
          }),
        })
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('should redirect to MFA verification when required', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({
          requiresMFA: true,
          tempToken: 'temp-token-123',
        }),
      })

      render(<AuthPage />)
      switchToPassword()

      await userEvent.type(screen.getByPlaceholderText('garage-roma'), 'my-garage')
      await userEvent.type(screen.getByPlaceholderText('tu@officina.it'), 'user@test.com')
      await userEvent.type(screen.getByPlaceholderText('••••••••'), 'mypassword')

      await act(async () => {
        fireEvent.submit(screen.getByPlaceholderText('••••••••').closest('form')!)
      })

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          '/auth/mfa/verify?token=temp-token-123'
        )
      })
    })

    it('should show error on invalid credentials', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValueOnce({ error: 'Credenziali non valide' }),
      })

      render(<AuthPage />)
      switchToPassword()

      await userEvent.type(screen.getByPlaceholderText('garage-roma'), 'my-garage')
      await userEvent.type(screen.getByPlaceholderText('tu@officina.it'), 'user@test.com')
      await userEvent.type(screen.getByPlaceholderText('••••••••'), 'wrong')

      await act(async () => {
        fireEvent.submit(screen.getByPlaceholderText('••••••••').closest('form')!)
      })

      await waitFor(() => {
        expect(screen.getByText('Credenziali non valide')).toBeInTheDocument()
      })
    })

    it('should show network error on fetch failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(<AuthPage />)
      switchToPassword()

      await userEvent.type(screen.getByPlaceholderText('garage-roma'), 'my-garage')
      await userEvent.type(screen.getByPlaceholderText('tu@officina.it'), 'user@test.com')
      await userEvent.type(screen.getByPlaceholderText('••••••••'), 'test123')

      await act(async () => {
        fireEvent.submit(screen.getByPlaceholderText('••••••••').closest('form')!)
      })

      await waitFor(() => {
        expect(screen.getByText(/Errore di rete/i)).toBeInTheDocument()
      })
    })
  })

  // =========================================================================
  // Method Selector
  // =========================================================================
  describe('method selector', () => {
    it('should switch between magic link and password tabs', async () => {
      render(<AuthPage />)

      // Switch to magic link
      fireEvent.click(screen.getByText('Magic Link'))
      expect(screen.getByPlaceholderText('tu@officina.it')).toBeInTheDocument()
      expect(screen.getByText(/Invia link di accesso/i)).toBeInTheDocument()

      // Switch to password
      fireEvent.click(screen.getByText('Password'))
      expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
      expect(screen.getByText(/Accedi con password/i)).toBeInTheDocument()
    })
  })
})
