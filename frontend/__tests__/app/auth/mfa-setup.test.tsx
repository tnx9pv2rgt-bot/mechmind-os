/**
 * Tests for MFA Setup Client (app/auth/mfa/setup/client.tsx)
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

jest.mock('next/image', () => {
  return ({ src, alt }: { src: string; alt: string }) =>
    require('react').createElement('img', { src, alt })
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

const mockClipboardWriteText = jest.fn().mockResolvedValue(undefined)
Object.assign(navigator, {
  clipboard: { writeText: mockClipboardWriteText },
})

const mockCreateObjectURL = jest.fn(() => 'blob:mock-url')
const mockRevokeObjectURL = jest.fn()
global.URL.createObjectURL = mockCreateObjectURL
global.URL.revokeObjectURL = mockRevokeObjectURL

const mockFetch = jest.fn()
global.fetch = mockFetch

import { MFASetupPageClient } from '@/app/auth/mfa/setup/client'

// =========================================================================
// Helpers
// =========================================================================

async function goToStep2(): Promise<void> {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: jest.fn().mockResolvedValueOnce({
      qrCode: 'data:image/png;base64,qr-data',
      secret: 'SECRET123',
    }),
  })
  render(<MFASetupPageClient />)
  await act(async () => { fireEvent.click(screen.getByText('Inizia configurazione')) })
  await waitFor(() => { expect(screen.getByText('Scansiona il QR Code')).toBeInTheDocument() })
}

async function goToStep3(backupCodes = ['CODE1', 'CODE2']): Promise<void> {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: jest.fn().mockResolvedValueOnce({ qrCode: 'data:image/png;base64,qr', secret: 'SEC' }),
  })
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: jest.fn().mockResolvedValueOnce({ verified: true, backupCodes }),
  })
  render(<MFASetupPageClient />)
  await act(async () => { fireEvent.click(screen.getByText('Inizia configurazione')) })
  await waitFor(() => { expect(screen.getByTestId('otp-input')).toBeInTheDocument() })
  await act(async () => {
    fireEvent.change(screen.getByTestId('otp-input'), { target: { value: '123456' } })
  })
  await waitFor(() => { expect(screen.getByText('2FA attivato!')).toBeInTheDocument() })
}

// =========================================================================
// Tests
// =========================================================================

describe('MFASetupPageClient', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockReset()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  // =========================================================================
  // Step 1 - Intro
  // =========================================================================
  describe('Step 1 — Intro', () => {
    it('renders the title and description', () => {
      render(<MFASetupPageClient />)
      expect(screen.getByText('Configura 2FA')).toBeInTheDocument()
      expect(screen.getByText(/Aggiungi un livello di sicurezza/i)).toBeInTheDocument()
    })

    it('renders authenticator app info', () => {
      render(<MFASetupPageClient />)
      expect(screen.getByText('App Authenticator')).toBeInTheDocument()
      expect(screen.getByText(/Google Authenticator, Authy o 1Password/i)).toBeInTheDocument()
    })

    it('renders the start configuration button', () => {
      render(<MFASetupPageClient />)
      expect(screen.getByText('Inizia configurazione')).toBeInTheDocument()
    })

    it('advances to step 2 on successful enroll', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ qrCode: 'data:image/png;base64,qr', secret: 'SEC' }),
      })
      render(<MFASetupPageClient />)
      await act(async () => { fireEvent.click(screen.getByText('Inizia configurazione')) })
      await waitFor(() => { expect(screen.getByText('Scansiona il QR Code')).toBeInTheDocument() })
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/mfa/enroll', { method: 'POST' })
    })

    it('uses manualEntryKey as secret when no secret field', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ qrCode: 'data:image/png;base64,qr', manualEntryKey: 'MANUAL_KEY' }),
      })
      render(<MFASetupPageClient />)
      await act(async () => { fireEvent.click(screen.getByText('Inizia configurazione')) })
      await waitFor(() => { expect(screen.getByText('MANUAL_KEY')).toBeInTheDocument() })
    })

    it('shows error from API when enroll returns non-ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValueOnce({ error: 'Configurazione non disponibile' }),
      })
      render(<MFASetupPageClient />)
      await act(async () => { fireEvent.click(screen.getByText('Inizia configurazione')) })
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Configurazione non disponibile')
      })
    })

    it('shows fallback error when enroll returns non-ok without error message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValueOnce({}),
      })
      render(<MFASetupPageClient />)
      await act(async () => { fireEvent.click(screen.getByText('Inizia configurazione')) })
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Errore durante la configurazione')
      })
    })

    it('shows network error when enroll throws', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network fail'))
      render(<MFASetupPageClient />)
      await act(async () => { fireEvent.click(screen.getByText('Inizia configurazione')) })
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Errore di rete. Riprova.')
      })
    })

    it('navigates to /dashboard on back from step 1', () => {
      render(<MFASetupPageClient />)
      fireEvent.click(screen.getByRole('button', { name: 'Indietro' }))
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  // =========================================================================
  // Step 2 — QR & Verify
  // =========================================================================
  describe('Step 2 — QR Code & Verification', () => {
    it('displays QR code image', async () => {
      await goToStep2()
      const img = screen.getByAltText('QR Code per configurazione MFA')
      expect(img).toHaveAttribute('src', 'data:image/png;base64,qr-data')
    })

    it('displays secret key', async () => {
      await goToStep2()
      expect(screen.getByText('SECRET123')).toBeInTheDocument()
    })

    it('shows Copia button initially', async () => {
      await goToStep2()
      expect(screen.getByLabelText('Copia codice segreto')).toHaveTextContent('Copia')
    })

    it('copies secret to clipboard and shows ✓', async () => {
      await goToStep2()
      await act(async () => {
        fireEvent.click(screen.getByLabelText('Copia codice segreto'))
      })
      expect(mockClipboardWriteText).toHaveBeenCalledWith('SECRET123')
      expect(screen.getByLabelText('Copia codice segreto')).toHaveTextContent('✓')
    })

    it('reverts copy button after 2 seconds', async () => {
      await goToStep2()
      await act(async () => {
        fireEvent.click(screen.getByLabelText('Copia codice segreto'))
      })
      expect(screen.getByLabelText('Copia codice segreto')).toHaveTextContent('✓')
      act(() => { jest.advanceTimersByTime(2000) })
      await waitFor(() => {
        expect(screen.getByLabelText('Copia codice segreto')).toHaveTextContent('Copia')
      })
    })

    it('verify button is disabled when code < 6 digits', async () => {
      await goToStep2()
      const verifyBtn = screen.getByRole('button', { name: 'Verifica' })
      expect(verifyBtn).toBeDisabled()
    })

    it('auto-verifies when 6 digits entered', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ qrCode: 'data:image/png;base64,qr', secret: 'SEC' }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ verified: true, backupCodes: ['BC1'] }),
      })
      render(<MFASetupPageClient />)
      await act(async () => { fireEvent.click(screen.getByText('Inizia configurazione')) })
      await waitFor(() => { expect(screen.getByTestId('otp-input')).toBeInTheDocument() })
      await act(async () => {
        fireEvent.change(screen.getByTestId('otp-input'), { target: { value: '123456' } })
      })
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/mfa/verify', expect.any(Object))
      })
    })

    it('shows error when verify fails with API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ qrCode: 'data:image/png;base64,qr', secret: 'SEC' }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValueOnce({ error: 'Codice non valido' }),
      })
      render(<MFASetupPageClient />)
      await act(async () => { fireEvent.click(screen.getByText('Inizia configurazione')) })
      await waitFor(() => { expect(screen.getByTestId('otp-input')).toBeInTheDocument() })
      await act(async () => {
        fireEvent.change(screen.getByTestId('otp-input'), { target: { value: '999999' } })
      })
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Codice non valido')
      })
    })

    it('shows fallback error when verify fails without error message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ qrCode: 'data:image/png;base64,qr', secret: 'SEC' }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValueOnce({}),
      })
      render(<MFASetupPageClient />)
      await act(async () => { fireEvent.click(screen.getByText('Inizia configurazione')) })
      await waitFor(() => { expect(screen.getByTestId('otp-input')).toBeInTheDocument() })
      await act(async () => {
        fireEvent.change(screen.getByTestId('otp-input'), { target: { value: '999999' } })
      })
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Codice non valido. Riprova.')
      })
    })

    it('shows network error when verify throws', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ qrCode: 'data:image/png;base64,qr', secret: 'SEC' }),
      })
      mockFetch.mockRejectedValueOnce(new Error('Network'))
      render(<MFASetupPageClient />)
      await act(async () => { fireEvent.click(screen.getByText('Inizia configurazione')) })
      await waitFor(() => { expect(screen.getByTestId('otp-input')).toBeInTheDocument() })
      await act(async () => {
        fireEvent.change(screen.getByTestId('otp-input'), { target: { value: '123456' } })
      })
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Errore di rete. Riprova.')
      })
    })

    it('navigates back to step 1 on back from step 2', async () => {
      await goToStep2()
      fireEvent.click(screen.getByRole('button', { name: 'Indietro' }))
      await waitFor(() => { expect(screen.getByText('Configura 2FA')).toBeInTheDocument() })
    })
  })

  // =========================================================================
  // Step 3 — Backup Codes
  // =========================================================================
  describe('Step 3 — Backup Codes', () => {
    it('shows 2FA attivato! on step 3', async () => {
      await goToStep3(['CODE-A', 'CODE-B', 'CODE-C'])
      expect(screen.getByText('2FA attivato!')).toBeInTheDocument()
    })

    it('shows backup codes list', async () => {
      await goToStep3(['ALPHA1', 'BRAVO2'])
      expect(screen.getByText('ALPHA1')).toBeInTheDocument()
      expect(screen.getByText('BRAVO2')).toBeInTheDocument()
    })

    it('shows download button', async () => {
      await goToStep3()
      expect(screen.getByText('Scarica codici di backup')).toBeInTheDocument()
    })

    it('triggers download on click', async () => {
      await goToStep3(['BACKUP1'])

      const mockClick = jest.fn()
      const mockA = { href: '', download: '', click: mockClick } as unknown as HTMLAnchorElement
      jest.spyOn(document, 'createElement').mockReturnValueOnce(mockA as HTMLAnchorElement)

      await act(async () => {
        fireEvent.click(screen.getByText('Scarica codici di backup'))
      })

      expect(mockCreateObjectURL).toHaveBeenCalled()
      expect(mockClick).toHaveBeenCalled()
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    })

    it('navigates to /dashboard via go to dashboard button', async () => {
      await goToStep3()
      await act(async () => {
        fireEvent.click(screen.getByText('Vai alla dashboard'))
      })
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })

    it('does not show back button on step 3', async () => {
      await goToStep3()
      expect(screen.queryByRole('button', { name: 'Indietro' })).not.toBeInTheDocument()
    })
  })
})
