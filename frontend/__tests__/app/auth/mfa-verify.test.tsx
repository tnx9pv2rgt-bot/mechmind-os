/**
 * Tests for MFA Verify Client (app/auth/mfa/verify/client.tsx)
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

// =========================================================================
// Mocks
// =========================================================================

const mockPush = jest.fn()
let mockSearchParamsMap: Record<string, string> = {}

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({
    get: (key: string) => mockSearchParamsMap[key] || null,
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
  AuthSplitLayout: ({
    children,
    onBack,
    showBack,
  }: {
    children: React.ReactNode
    onBack?: () => void
    showBack?: boolean
  }) => {
    const R = require('react')
    return R.createElement(
      'div',
      null,
      showBack && onBack
        ? R.createElement('button', { onClick: onBack, 'aria-label': 'Indietro' }, '←')
        : null,
      children
    )
  },
}))

jest.mock('@/components/auth/auth-styles', () => ({
  btnPrimary: 'btn-primary',
  btnSpinner: 'btn-spinner',
  inputStyle: 'input-style',
}))

jest.mock('@/components/auth/otp-input', () => ({
  OTPInput: ({
    onChange,
    value,
    disabled,
  }: {
    onChange: (val: string) => void
    value: string
    disabled?: boolean
  }) => {
    return require('react').createElement('input', {
      'data-testid': 'otp-input',
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
      disabled,
      role: 'group',
      'aria-label': 'Codice OTP',
    })
  },
}))

const mockFetch = jest.fn()
global.fetch = mockFetch

// SessionStorage mock
const sessionStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock, writable: true })

import { MFAVerifyPageClient } from '@/app/auth/mfa/verify/client'

// =========================================================================
// Tests
// =========================================================================

describe('MFAVerifyPageClient', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockReset()
    mockSearchParamsMap = { token: 'temp-token-abc' }
    sessionStorageMock.clear()
  })

  // =========================================================================
  // Rendering
  // =========================================================================
  describe('rendering', () => {
    it('renders the verify title', () => {
      render(<MFAVerifyPageClient />)
      expect(screen.getByText('Verifica a due fattori')).toBeInTheDocument()
    })

    it('renders OTP description by default', () => {
      render(<MFAVerifyPageClient />)
      expect(screen.getByText(/Inserisci il codice a 6 cifre dalla tua app authenticator/i)).toBeInTheDocument()
    })

    it('renders OTP input', () => {
      render(<MFAVerifyPageClient />)
      expect(screen.getByTestId('otp-input')).toBeInTheDocument()
    })

    it('renders verify button disabled initially', () => {
      render(<MFAVerifyPageClient />)
      expect(screen.getByRole('button', { name: 'Verifica' })).toBeDisabled()
    })

    it('renders backup code toggle button', () => {
      render(<MFAVerifyPageClient />)
      expect(screen.getByText('Usa codice di backup')).toBeInTheDocument()
    })

    it('renders back button', () => {
      render(<MFAVerifyPageClient />)
      expect(screen.getByRole('button', { name: 'Indietro' })).toBeInTheDocument()
    })
  })

  // =========================================================================
  // Token handling
  // =========================================================================
  describe('token handling', () => {
    it('saves tempToken to sessionStorage on mount', () => {
      render(<MFAVerifyPageClient />)
      expect(sessionStorageMock.getItem('mfa_temp_token')).toBe('temp-token-abc')
    })

    it('reads token from sessionStorage when URL param is absent', async () => {
      mockSearchParamsMap = {}
      sessionStorageMock.setItem('mfa_temp_token', 'session-token-xyz')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ success: true }),
      })

      render(<MFAVerifyPageClient />)
      await act(async () => {
        fireEvent.change(screen.getByTestId('otp-input'), { target: { value: '123456' } })
      })

      await waitFor(() => {
        const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string)
        expect(body.tempToken).toBe('session-token-xyz')
      })
    })

    it('shows session expired error when no token available', async () => {
      mockSearchParamsMap = {}
      sessionStorageMock.clear()
      render(<MFAVerifyPageClient />)

      fireEvent.click(screen.getByText('Usa codice di backup'))

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Codice di backup')).toBeInTheDocument()
      })

      fireEvent.change(screen.getByPlaceholderText('Codice di backup'), {
        target: { value: 'BACKUP123' },
      })

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Verifica' }))
      })

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Sessione scaduta. Torna al login.')
      })
    })
  })

  // =========================================================================
  // OTP auto-verify
  // =========================================================================
  describe('OTP auto-verify', () => {
    it('auto-verifies when 6-digit OTP is entered', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ success: true }),
      })

      render(<MFAVerifyPageClient />)
      await act(async () => {
        fireEvent.change(screen.getByTestId('otp-input'), { target: { value: '123456' } })
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/mfa/verify-login', expect.any(Object))
      })
    })

    it('calls verify with correct OTP payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ success: true }),
      })

      render(<MFAVerifyPageClient />)
      await act(async () => {
        fireEvent.change(screen.getByTestId('otp-input'), { target: { value: '654321' } })
      })

      await waitFor(() => {
        const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string)
        expect(body).toEqual({
          tempToken: 'temp-token-abc',
          token: '654321',
          isBackupCode: false,
        })
      })
    })

    it('redirects to /dashboard on successful OTP verify', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ success: true }),
      })

      render(<MFAVerifyPageClient />)
      await act(async () => {
        fireEvent.change(screen.getByTestId('otp-input'), { target: { value: '123456' } })
      })

      await waitFor(() => { expect(mockPush).toHaveBeenCalledWith('/dashboard') })
    })

    it('removes sessionStorage token on success', async () => {
      sessionStorageMock.setItem('mfa_temp_token', 'temp-token-abc')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ success: true }),
      })

      render(<MFAVerifyPageClient />)
      await act(async () => {
        fireEvent.change(screen.getByTestId('otp-input'), { target: { value: '123456' } })
      })

      await waitFor(() => { expect(mockPush).toHaveBeenCalledWith('/dashboard') })
      expect(sessionStorageMock.getItem('mfa_temp_token')).toBeNull()
    })

    it('does not auto-verify when fewer than 6 digits entered', async () => {
      render(<MFAVerifyPageClient />)
      fireEvent.change(screen.getByTestId('otp-input'), { target: { value: '12345' } })
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  // =========================================================================
  // OTP error handling
  // =========================================================================
  describe('OTP error handling', () => {
    it('shows string error message from API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValueOnce({ error: 'Codice errato' }),
      })

      render(<MFAVerifyPageClient />)
      await act(async () => {
        fireEvent.change(screen.getByTestId('otp-input'), { target: { value: '000000' } })
      })

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Codice errato')
      })
    })

    it('shows object error message from API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValueOnce({ error: { message: 'Token scaduto' } }),
      })

      render(<MFAVerifyPageClient />)
      await act(async () => {
        fireEvent.change(screen.getByTestId('otp-input'), { target: { value: '000000' } })
      })

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Token scaduto')
      })
    })

    it('shows fallback error when API provides none', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValueOnce({}),
      })

      render(<MFAVerifyPageClient />)
      await act(async () => {
        fireEvent.change(screen.getByTestId('otp-input'), { target: { value: '000000' } })
      })

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Codice non valido. Riprova.')
      })
    })

    it('shows remaining attempts when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValueOnce({ error: 'Wrong', remainingAttempts: 2 }),
      })

      render(<MFAVerifyPageClient />)
      await act(async () => {
        fireEvent.change(screen.getByTestId('otp-input'), { target: { value: '000000' } })
      })

      await waitFor(() => {
        expect(screen.getByText(/Tentativi rimanenti: 2/i)).toBeInTheDocument()
      })
    })

    it('shows account locked link when remainingAttempts is 0', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValueOnce({ error: 'Locked', remainingAttempts: 0 }),
      })

      render(<MFAVerifyPageClient />)
      await act(async () => {
        fireEvent.change(screen.getByTestId('otp-input'), { target: { value: '000000' } })
      })

      await waitFor(() => {
        const link = screen.getByRole('link', { name: 'Account bloccato' })
        expect(link).toHaveAttribute('href', '/auth/locked')
      })
    })

    it('shows connection error on fetch failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network'))

      render(<MFAVerifyPageClient />)
      await act(async () => {
        fireEvent.change(screen.getByTestId('otp-input'), { target: { value: '123456' } })
      })

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Errore di connessione. Riprova.')
      })
    })
  })

  // =========================================================================
  // Backup code mode
  // =========================================================================
  describe('backup code mode', () => {
    it('switches to backup code mode when toggle is clicked', () => {
      render(<MFAVerifyPageClient />)
      fireEvent.click(screen.getByText('Usa codice di backup'))
      expect(screen.getByText(/Inserisci uno dei tuoi codici di backup/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Codice di backup')).toBeInTheDocument()
    })

    it('shows authenticator toggle text when in backup mode', () => {
      render(<MFAVerifyPageClient />)
      fireEvent.click(screen.getByText('Usa codice di backup'))
      expect(screen.getByText('Usa codice authenticator')).toBeInTheDocument()
    })

    it('switches back to OTP mode when toggle is clicked again', () => {
      render(<MFAVerifyPageClient />)
      fireEvent.click(screen.getByText('Usa codice di backup'))
      fireEvent.click(screen.getByText('Usa codice authenticator'))
      expect(screen.getByTestId('otp-input')).toBeInTheDocument()
    })

    it('verifies with backup code', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ success: true }),
      })

      render(<MFAVerifyPageClient />)
      fireEvent.click(screen.getByText('Usa codice di backup'))

      fireEvent.change(screen.getByPlaceholderText('Codice di backup'), {
        target: { value: 'BACKUP-CODE-123' },
      })

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Verifica' }))
      })

      await waitFor(() => {
        const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string)
        expect(body.isBackupCode).toBe(true)
        expect(body.token).toBe('BACKUP-CODE-123')
      })
    })

    it('backup verify button disabled when backup code is empty', () => {
      render(<MFAVerifyPageClient />)
      fireEvent.click(screen.getByText('Usa codice di backup'))
      expect(screen.getByRole('button', { name: 'Verifica' })).toBeDisabled()
    })

    it('redirects to /dashboard on successful backup code verify', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ success: true }),
      })

      render(<MFAVerifyPageClient />)
      fireEvent.click(screen.getByText('Usa codice di backup'))
      fireEvent.change(screen.getByPlaceholderText('Codice di backup'), {
        target: { value: 'VALID-BACKUP' },
      })

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Verifica' }))
      })

      await waitFor(() => { expect(mockPush).toHaveBeenCalledWith('/dashboard') })
    })
  })

  // =========================================================================
  // Navigation
  // =========================================================================
  describe('navigation', () => {
    it('calls router.push("/auth") on back button click', () => {
      render(<MFAVerifyPageClient />)
      fireEvent.click(screen.getByRole('button', { name: 'Indietro' }))
      expect(mockPush).toHaveBeenCalledWith('/auth')
    })
  })
})
