/**
 * Tests for RegisterPage (app/auth/register/page.tsx)
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

// =========================================================================
// Mocks
// =========================================================================

const mockPush = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
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
              const allowed = ['className', 'style', 'onClick', 'onSubmit', 'role', 'id', 'disabled']
              for (const k of Object.keys(rest)) {
                if (allowed.includes(k) || k.startsWith('data-') || k.startsWith('aria-')) {
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
  AuthSplitLayout: ({ children, showBack, onBack }: { children: React.ReactNode; showBack?: boolean; onBack?: () => void }) => {
    const R = require('react')
    return R.createElement(
      'div',
      null,
      showBack && onBack && R.createElement('button', { onClick: onBack, 'aria-label': 'Indietro' }, '←'),
      children
    )
  },
}))

jest.mock('@/components/auth/auth-styles', () => ({
  btnPrimary: 'btn-primary',
  btnSecondaryOutline: 'btn-secondary-outline',
  btnSpinner: 'btn-spinner',
  inputStyle: 'input-style',
}))

jest.mock('@/components/auth/password-strength', () => ({
  PasswordStrength: ({ password }: { password: string }) =>
    require('react').createElement('div', { 'data-testid': 'password-strength', 'data-password': password }),
}))

const mockFetch = jest.fn()
global.fetch = mockFetch

import RegisterPage from '@/app/auth/register/page'

// =========================================================================
// Helpers
// =========================================================================

function fillForm({
  shopName = 'Officina Test',
  firstName = 'Mario',
  lastName = 'Rossi',
  email = 'mario@example.com',
  password = 'SecurePass1!',
  acceptTerms = true,
}: {
  shopName?: string
  firstName?: string
  lastName?: string
  email?: string
  password?: string
  acceptTerms?: boolean
} = {}) {
  if (shopName) {
    fireEvent.change(screen.getByPlaceholderText('Nome officina'), { target: { value: shopName } })
  }
  if (firstName) {
    fireEvent.change(screen.getByPlaceholderText('Nome'), { target: { value: firstName } })
  }
  if (lastName) {
    fireEvent.change(screen.getByPlaceholderText('Cognome'), { target: { value: lastName } })
  }
  if (email) {
    fireEvent.change(screen.getByPlaceholderText('Email aziendale'), { target: { value: email } })
  }
  if (password) {
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: password } })
  }
  if (acceptTerms) {
    fireEvent.click(screen.getByLabelText('Accetto i termini e le condizioni'))
  }
}

// =========================================================================
// Tests
// =========================================================================

describe('RegisterPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockReset()
  })

  describe('rendering', () => {
    it('should render the registration form title', () => {
      render(<RegisterPage />)
      expect(screen.getByText('Crea il tuo account')).toBeInTheDocument()
    })

    it('should render shop name input', () => {
      render(<RegisterPage />)
      expect(screen.getByPlaceholderText('Nome officina')).toBeInTheDocument()
    })

    it('should render first name input', () => {
      render(<RegisterPage />)
      expect(screen.getByPlaceholderText('Nome')).toBeInTheDocument()
    })

    it('should render last name input', () => {
      render(<RegisterPage />)
      expect(screen.getByPlaceholderText('Cognome')).toBeInTheDocument()
    })

    it('should render email input', () => {
      render(<RegisterPage />)
      expect(screen.getByPlaceholderText('Email aziendale')).toBeInTheDocument()
    })

    it('should render password input', () => {
      render(<RegisterPage />)
      expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
    })

    it('should render submit button', () => {
      render(<RegisterPage />)
      expect(screen.getByText('Crea account gratis')).toBeInTheDocument()
    })

    it('should render login link', () => {
      render(<RegisterPage />)
      const link = screen.getByRole('link', { name: 'Accedi' })
      expect(link).toHaveAttribute('href', '/auth')
    })

    it('should render password strength component', () => {
      render(<RegisterPage />)
      expect(screen.getByTestId('password-strength')).toBeInTheDocument()
    })
  })

  describe('slug generation', () => {
    it('should auto-generate slug from shop name', async () => {
      render(<RegisterPage />)
      fireEvent.change(screen.getByPlaceholderText('Nome officina'), {
        target: { value: 'Officina Rossi' },
      })
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Nome breve (es. officina-rossi)')).toHaveValue('officina-rossi')
      })
    })

    it('should allow manual slug override', async () => {
      mockFetch.mockResolvedValue({ ok: false })
      render(<RegisterPage />)
      fireEvent.change(screen.getByPlaceholderText('Nome breve (es. officina-rossi)'), { target: { value: 'myslug' } })
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Nome breve (es. officina-rossi)')).toHaveValue('myslug')
      })
    })

    it('should not auto-update slug after manual override', async () => {
      mockFetch.mockResolvedValue({ ok: false })
      render(<RegisterPage />)
      fireEvent.change(screen.getByPlaceholderText('Nome breve (es. officina-rossi)'), { target: { value: 'mycustom' } })
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Nome breve (es. officina-rossi)')).toHaveValue('mycustom')
      })
      // slugManual is now true; changing shopName must not update slug
      fireEvent.change(screen.getByPlaceholderText('Nome officina'), { target: { value: 'New Name' } })
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Nome breve (es. officina-rossi)')).toHaveValue('mycustom')
      })
    })

    it('should show slug preview', async () => {
      render(<RegisterPage />)
      fireEvent.change(screen.getByPlaceholderText('Nome officina'), {
        target: { value: 'My Shop' },
      })
      await waitFor(() => {
        expect(screen.getByText(/mechmind\.it\//i)).toBeInTheDocument()
      })
    })

    describe('slug availability check', () => {
      beforeEach(() => jest.useFakeTimers())
      afterEach(() => jest.useRealTimers())

    it('should check slug availability via API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ available: true }),
      })

      render(<RegisterPage />)
      fireEvent.change(screen.getByPlaceholderText('Nome officina'), {
        target: { value: 'Available Shop' },
      })

      await act(async () => { jest.advanceTimersByTime(600) })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/auth/check-slug?slug=')
        )
      })
    })

    it('should show available indicator (✓) when slug is available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ available: true }),
      })

      render(<RegisterPage />)
      fireEvent.change(screen.getByPlaceholderText('Nome officina'), {
        target: { value: 'Available Shop' },
      })

      await act(async () => { jest.advanceTimersByTime(600) })

      await waitFor(() => {
        expect(screen.getByText('✓')).toBeInTheDocument()
      })
    })

    it('should show unavailable indicator (✕) when slug is taken', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ available: false }),
      })

      render(<RegisterPage />)
      fireEvent.change(screen.getByPlaceholderText('Nome officina'), {
        target: { value: 'Taken Shop' },
      })

      await act(async () => { jest.advanceTimersByTime(600) })

      await waitFor(() => {
        expect(screen.getAllByText('✕').length).toBeGreaterThan(0)
      })
    })

    it('should show "Nome già in uso" when slug is unavailable', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ available: false }),
      })

      render(<RegisterPage />)
      fireEvent.change(screen.getByPlaceholderText('Nome officina'), {
        target: { value: 'Taken Shop' },
      })

      await act(async () => { jest.advanceTimersByTime(600) })

      await waitFor(() => {
        expect(screen.getByText('Nome già in uso')).toBeInTheDocument()
      })
    })

    it('should default to available=true on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network'))

      render(<RegisterPage />)
      fireEvent.change(screen.getByPlaceholderText('Nome officina'), {
        target: { value: 'Error Shop' },
      })

      await act(async () => { jest.advanceTimersByTime(600) })

      await waitFor(() => {
        expect(screen.getByText('✓')).toBeInTheDocument()
      })
    })

    it('should default to available=true on non-ok API response', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false })

      render(<RegisterPage />)
      fireEvent.change(screen.getByPlaceholderText('Nome officina'), {
        target: { value: 'Bad Api Shop' },
      })

      await act(async () => { jest.advanceTimersByTime(600) })

      await waitFor(() => {
        expect(screen.getByText('✓')).toBeInTheDocument()
      })
    })

    it('should default to true when available is undefined in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({}),
      })

      render(<RegisterPage />)
      fireEvent.change(screen.getByPlaceholderText('Nome officina'), {
        target: { value: 'Undefined Shop' },
      })

      await act(async () => { jest.advanceTimersByTime(600) })

      await waitFor(() => {
        expect(screen.getByText('✓')).toBeInTheDocument()
      })
    })

    it('should not check slug when slug is shorter than 3 chars', async () => {
      render(<RegisterPage />)
      fireEvent.change(screen.getByPlaceholderText('Nome officina'), {
        target: { value: 'Ab' },
      })

      await act(async () => { jest.advanceTimersByTime(600) })
      expect(mockFetch).not.toHaveBeenCalled()
    })
    }) // end slug availability check
  })

  describe('password visibility toggle', () => {
    it('should toggle password visibility', async () => {
      render(<RegisterPage />)
      expect(screen.getByPlaceholderText('Password')).toHaveAttribute('type', 'password')

      fireEvent.click(screen.getByLabelText('Mostra password'))
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Password')).toHaveAttribute('type', 'text')
      })

      fireEvent.click(screen.getByLabelText('Nascondi password'))
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Password')).toHaveAttribute('type', 'password')
      })
    })
  })

  describe('field clearing on change', () => {
    it('should clear shopName error when user types', async () => {
      render(<RegisterPage />)
      const form = document.querySelector('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(screen.getByText('Inserisci il nome della tua officina')).toBeInTheDocument()
      })

      fireEvent.change(screen.getByPlaceholderText('Nome officina'), {
        target: { value: 'New Shop' },
      })

      await waitFor(() => {
        expect(screen.queryByText('Inserisci il nome della tua officina')).not.toBeInTheDocument()
      })
    })

    it('should clear firstName error when user types', async () => {
      render(<RegisterPage />)
      fireEvent.submit(document.querySelector('form')!)

      await waitFor(() => {
        expect(screen.getByText('Inserisci il tuo nome')).toBeInTheDocument()
      })

      fireEvent.change(screen.getByPlaceholderText('Nome'), { target: { value: 'Mario' } })
      await waitFor(() => {
        expect(screen.queryByText('Inserisci il tuo nome')).not.toBeInTheDocument()
      })
    })

    it('should clear lastName error when user types', async () => {
      render(<RegisterPage />)
      fireEvent.submit(document.querySelector('form')!)

      await waitFor(() => {
        expect(screen.getByText('Inserisci il tuo cognome')).toBeInTheDocument()
      })

      fireEvent.change(screen.getByPlaceholderText('Cognome'), { target: { value: 'Rossi' } })
      await waitFor(() => {
        expect(screen.queryByText('Inserisci il tuo cognome')).not.toBeInTheDocument()
      })
    })

    it('should clear email error when user types', async () => {
      render(<RegisterPage />)
      fireEvent.change(screen.getByPlaceholderText('Nome officina'), { target: { value: 'Shop' } })
      fireEvent.change(screen.getByPlaceholderText('Nome'), { target: { value: 'Mario' } })
      fireEvent.change(screen.getByPlaceholderText('Cognome'), { target: { value: 'Rossi' } })
      fireEvent.submit(document.querySelector('form')!)

      await waitFor(() => {
        expect(screen.getByText('Inserisci la tua email')).toBeInTheDocument()
      })

      fireEvent.change(screen.getByPlaceholderText('Email aziendale'), {
        target: { value: 'test@example.com' },
      })
      await waitFor(() => {
        expect(screen.queryByText('Inserisci la tua email')).not.toBeInTheDocument()
      })
    })

    it('should clear password error when user types', async () => {
      render(<RegisterPage />)
      fireEvent.change(screen.getByPlaceholderText('Nome officina'), { target: { value: 'Shop' } })
      fireEvent.change(screen.getByPlaceholderText('Nome'), { target: { value: 'Mario' } })
      fireEvent.change(screen.getByPlaceholderText('Cognome'), { target: { value: 'Rossi' } })
      fireEvent.change(screen.getByPlaceholderText('Email aziendale'), { target: { value: 'a@b.com' } })
      fireEvent.submit(document.querySelector('form')!)

      await waitFor(() => {
        expect(screen.getByText('Inserisci una password')).toBeInTheDocument()
      })

      fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'Pass1!' } })
      await waitFor(() => {
        expect(screen.queryByText('Inserisci una password')).not.toBeInTheDocument()
      })
    })

    it('should clear acceptTerms error when user checks', async () => {
      render(<RegisterPage />)
      fillForm({ acceptTerms: false })
      fireEvent.submit(document.querySelector('form')!)

      await waitFor(() => {
        expect(screen.getByText('Devi accettare i termini e le condizioni')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByLabelText('Accetto i termini e le condizioni'))
      await waitFor(() => {
        expect(screen.queryByText('Devi accettare i termini e le condizioni')).not.toBeInTheDocument()
      })
    })
  })

  describe('validation', () => {
    it('should show validation error for empty shop name', async () => {
      render(<RegisterPage />)
      fireEvent.submit(document.querySelector('form')!)

      await waitFor(() => {
        expect(screen.getByText('Inserisci il nome della tua officina')).toBeInTheDocument()
      })
    })

    it('should show validation error for invalid email', async () => {
      render(<RegisterPage />)
      fillForm({ email: 'not-an-email', acceptTerms: false })
      fireEvent.submit(document.querySelector('form')!)

      await waitFor(() => {
        expect(screen.getByText('Email non valida')).toBeInTheDocument()
      })
    })

    it('should show validation error for short password', async () => {
      render(<RegisterPage />)
      fillForm({ password: 'abc', acceptTerms: false })
      fireEvent.submit(document.querySelector('form')!)

      await waitFor(() => {
        expect(screen.getByText('Minimo 8 caratteri')).toBeInTheDocument()
      })
    })

    it('should show error when terms not accepted', async () => {
      render(<RegisterPage />)
      fillForm({ acceptTerms: false })
      fireEvent.submit(document.querySelector('form')!)

      await waitFor(() => {
        expect(screen.getByText('Devi accettare i termini e le condizioni')).toBeInTheDocument()
      })
    })
  })

  describe('form submission', () => {
    it('should submit form with correct data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ success: true, tenantSlug: 'officina-test' }),
      })

      render(<RegisterPage />)
      fillForm()
      fireEvent.submit(document.querySelector('form')!)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/register', expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }))
      })
    })

    it('should show success screen after registration', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ success: true, tenantSlug: 'officina-test' }),
      })

      render(<RegisterPage />)
      fillForm()

      await act(async () => {
        fireEvent.submit(document.querySelector('form')!)
      })

      await waitFor(() => {
        expect(screen.getByText('Officina creata!')).toBeInTheDocument()
      })
    })

    it('should show created slug in success screen', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ success: true, tenantSlug: 'officina-test' }),
      })

      render(<RegisterPage />)
      fillForm()

      await act(async () => {
        fireEvent.submit(document.querySelector('form')!)
      })

      await waitFor(() => {
        expect(screen.getByText(/officina-test/i)).toBeInTheDocument()
      })
    })

    it('should use effectiveSlug as fallback when tenantSlug is missing in success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ success: true }),
      })

      render(<RegisterPage />)
      fillForm({ shopName: 'My Shop' })

      await act(async () => {
        fireEvent.submit(document.querySelector('form')!)
      })

      await waitFor(() => {
        expect(screen.getByText(/my-shop/i)).toBeInTheDocument()
      })
    })

    it('should show error message when registration fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValueOnce({ error: 'Email già in uso' }),
      })

      render(<RegisterPage />)
      fillForm()

      await act(async () => {
        fireEvent.submit(document.querySelector('form')!)
      })

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Email già in uso')
      })
    })

    it('should show fallback error when API provides none', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValueOnce({}),
      })

      render(<RegisterPage />)
      fillForm()

      await act(async () => {
        fireEvent.submit(document.querySelector('form')!)
      })

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Errore durante la registrazione')
      })
    })

    it('should show network error on fetch failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(<RegisterPage />)
      fillForm()

      await act(async () => {
        fireEvent.submit(document.querySelector('form')!)
      })

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Errore di rete')
      })
    })
  })

  describe('success screen navigation', () => {
    async function renderSuccessScreen() {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ success: true, tenantSlug: 'test-slug' }),
      })

      render(<RegisterPage />)
      fillForm()

      await act(async () => {
        fireEvent.submit(document.querySelector('form')!)
      })

      await waitFor(() => {
        expect(screen.getByText('Officina creata!')).toBeInTheDocument()
      })
    }

    it('should navigate to onboarding on configure button click', async () => {
      await renderSuccessScreen()
      fireEvent.click(screen.getByText('Configura la tua officina'))
      expect(mockPush).toHaveBeenCalledWith('/onboarding')
    })

    it('should navigate to dashboard on dashboard button click', async () => {
      await renderSuccessScreen()
      fireEvent.click(screen.getByText('Vai alla dashboard'))
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  describe('back navigation', () => {
    it('should navigate back to /auth when back button is clicked', () => {
      render(<RegisterPage />)
      const backButton = screen.getByLabelText('Indietro')
      fireEvent.click(backButton)
      expect(mockPush).toHaveBeenCalledWith('/auth')
    })
  })
})
