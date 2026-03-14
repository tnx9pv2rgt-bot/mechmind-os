/**
 * Tests for Auth Page (app/auth/page.tsx)
 *
 * The auth page uses a step-based flow:
 *   'methods' -> 'email' -> 'password' -> 'passkey-prompt' | dashboard
 *   'email' -> 'magic-sent' (via magic link)
 *
 * IMPORTANT: React 18 controlled inputs inside the framer-motion mock context
 * get replaced on re-render. Always re-query the DOM for fresh element
 * references after each input fill.
 *
 * @module __tests__/app/auth/page.test
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

// =========================================================================
// Mocks
// =========================================================================

const mockPush = jest.fn()
const mockRouter = { push: mockPush, replace: jest.fn(), back: jest.fn(), prefetch: jest.fn(), refresh: jest.fn() }

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => new URLSearchParams(),
}))

// Mock framer-motion: render children directly and fire onAnimationComplete
jest.mock('framer-motion', () => {
  const React = require('react')
  return {
    motion: new Proxy(
      {},
      {
        get: (_target: unknown, prop: string) => {
          return React.forwardRef(
            ({ children, onAnimationComplete, ...rest }: { children?: React.ReactNode; onAnimationComplete?: () => void; [key: string]: unknown }, ref: React.Ref<HTMLElement>) => {
              React.useEffect(() => {
                if (onAnimationComplete) {
                  onAnimationComplete()
                }
              }, [onAnimationComplete])

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

const mockBrowserSupportsWebAuthn = jest.fn()
jest.mock('@simplewebauthn/browser', () => ({
  browserSupportsWebAuthn: () => mockBrowserSupportsWebAuthn(),
  startAuthentication: jest.fn(),
  startRegistration: jest.fn(),
}))

jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return React.createElement('a', { href }, children)
  }
})

jest.mock('next/script', () => {
  return () => null
})

const mockFetch = jest.fn()
global.fetch = mockFetch

import AuthPage from '@/app/auth/page'

/**
 * Fill a controlled React input by CSS selector. Each fill triggers a
 * re-render which may replace DOM elements, so we always query fresh
 * from the document. Uses fireEvent.input which reliably triggers
 * React's onChange handler.
 */
function fillBySelector(selector: string, value: string): void {
  const el = document.querySelector(selector) as HTMLInputElement
  fireEvent.input(el, { target: { value } })
}

describe('AuthPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockReset()
    mockBrowserSupportsWebAuthn.mockReturnValue(false)
  })

  /**
   * Navigate to the email step by clicking "Accedi".
   */
  async function goToEmailStep(): Promise<void> {
    fireEvent.click(screen.getByText('Accedi'))
    await waitFor(() => {
      expect(screen.getByText('Inserisci le tue credenziali')).toBeInTheDocument()
    })
  }

  /**
   * Navigate to the password step by filling slug + email and clicking Continua.
   */
  async function goToPasswordStep(): Promise<void> {
    await goToEmailStep()
    fillBySelector('input[type="text"]', 'my-garage')
    fillBySelector('input[type="email"]', 'user@test.com')
    fireEvent.click(screen.getByText('Continua'))
    await waitFor(() => {
      expect(screen.getByText('Inserisci la password')).toBeInTheDocument()
    })
  }

  describe('rendering', () => {
    it('should render the login page with title', () => {
      render(<AuthPage />)
      expect(screen.getByText('MechMind OS')).toBeInTheDocument()
      expect(screen.getByText('Benvenuto in MechMind')).toBeInTheDocument()
    })

    it('should render the method selector tabs', () => {
      render(<AuthPage />)
      expect(screen.getByText('Accedi')).toBeInTheDocument()
      expect(screen.getByText('Registrati')).toBeInTheDocument()
    })

    it('should render footer links', () => {
      render(<AuthPage />)
      expect(screen.getByText("Condizioni d'uso")).toBeInTheDocument()
      expect(screen.getByText('Informativa sulla privacy')).toBeInTheDocument()
    })

    it('should render signup link', () => {
      render(<AuthPage />)
      expect(screen.getByText('Prima provalo')).toBeInTheDocument()
    })
  })

  describe('Email step', () => {
    it('should render slug and email inputs', async () => {
      render(<AuthPage />)
      await goToEmailStep()

      expect(screen.getByText('Slug officina')).toBeInTheDocument()
      expect(screen.getByText('Indirizzo e-mail')).toBeInTheDocument()
    })

    it('should show validation error when slug is empty', async () => {
      render(<AuthPage />)
      await goToEmailStep()

      fireEvent.click(screen.getByText('Continua'))

      await waitFor(() => {
        expect(screen.getByText(/Inserisci lo slug/i)).toBeInTheDocument()
      })
    })

    it('should show validation error when email is empty', async () => {
      render(<AuthPage />)
      await goToEmailStep()

      fillBySelector('input[type="text"]', 'test-garage')
      fireEvent.click(screen.getByText('Continua'))

      await waitFor(() => {
        expect(screen.getByText(/Inserisci la tua email/i)).toBeInTheDocument()
      })
    })

    it('should send magic link successfully and show success message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ success: true }),
      })

      render(<AuthPage />)
      await goToEmailStep()

      fillBySelector('input[type="text"]', 'test-garage')
      fillBySelector('input[type="email"]', 'test@example.com')

      fireEvent.click(screen.getByText('Invia magic link invece'))

      await waitFor(() => {
        expect(screen.getByText('Controlla la tua email')).toBeInTheDocument()
      })
    })

    it('should handle error response from magic link API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValueOnce({ message: 'Utente non trovato' }),
      })

      render(<AuthPage />)
      await goToEmailStep()

      fillBySelector('input[type="text"]', 'test-garage')
      fillBySelector('input[type="email"]', 'test@example.com')

      fireEvent.click(screen.getByText('Invia magic link invece'))

      await waitFor(() => {
        expect(screen.getByText('Utente non trovato')).toBeInTheDocument()
      })
    })

    it('should handle network error on magic link', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(<AuthPage />)
      await goToEmailStep()

      fillBySelector('input[type="text"]', 'test-garage')
      fillBySelector('input[type="email"]', 'test@example.com')

      fireEvent.click(screen.getByText('Invia magic link invece'))

      await waitFor(() => {
        expect(screen.getByText(/Errore di rete/i)).toBeInTheDocument()
      })
    })
  })

  describe('Password step', () => {
    it('should render all password form inputs', async () => {
      render(<AuthPage />)
      await goToPasswordStep()

      expect(screen.getByText('Inserisci la password')).toBeInTheDocument()
      expect(screen.getByText('user@test.com')).toBeInTheDocument()
    })

    it('should render forgot password link', async () => {
      render(<AuthPage />)
      await goToPasswordStep()

      expect(screen.getByText('Password dimenticata?')).toBeInTheDocument()
      const forgotLink = screen.getByText('Password dimenticata?')
      expect(forgotLink.closest('a')).toHaveAttribute('href', '/auth/forgot-password')
    })

    it('should submit credentials and redirect to dashboard on success', async () => {
      mockBrowserSupportsWebAuthn.mockReturnValue(false)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ success: true }),
      })

      render(<AuthPage />)
      await goToPasswordStep()

      fillBySelector('input[type="password"]', 'mypassword')

      const form = document.querySelector('form') as HTMLFormElement
      await act(async () => {
        fireEvent.submit(form)
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
      await goToPasswordStep()

      fillBySelector('input[type="password"]', 'mypassword')

      const form = document.querySelector('form') as HTMLFormElement
      await act(async () => {
        fireEvent.submit(form)
      })

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth/mfa/verify?token=temp-token-123')
      })
    })

    it('should show error on invalid credentials', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValueOnce({ message: 'Credenziali non valide' }),
      })

      render(<AuthPage />)
      await goToPasswordStep()

      fillBySelector('input[type="password"]', 'wrong')

      const form = document.querySelector('form') as HTMLFormElement
      await act(async () => {
        fireEvent.submit(form)
      })

      await waitFor(() => {
        expect(screen.getByText('Credenziali non valide')).toBeInTheDocument()
      })
    })

    it('should show network error on fetch failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(<AuthPage />)
      await goToPasswordStep()

      fillBySelector('input[type="password"]', 'test123')

      const form = document.querySelector('form') as HTMLFormElement
      await act(async () => {
        fireEvent.submit(form)
      })

      await waitFor(() => {
        expect(screen.getByText(/Errore di rete/i)).toBeInTheDocument()
      })
    })
  })

  describe('navigation', () => {
    it('should navigate from methods to email step when Accedi is clicked', async () => {
      render(<AuthPage />)
      await goToEmailStep()
      expect(screen.getByText('Inserisci le tue credenziali')).toBeInTheDocument()
    })

    it('should show back button in email step', async () => {
      render(<AuthPage />)
      await goToEmailStep()
      expect(screen.getByText(/Indietro/i)).toBeInTheDocument()
    })
  })
})
