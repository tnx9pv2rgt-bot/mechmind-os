/**
 * Tests for MFA Setup Page (app/auth/mfa/setup/client.tsx)
 *
 * @module __tests__/app/auth/mfa-setup.test
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

// =========================================================================
// Mocks
// =========================================================================

const mockPush = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
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
                'maxLength', 'checked', 'aria-label', 'htmlFor', 'variant',
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

// Mock @/lib/utils
jest.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

// Mock @/components/ui/button
jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    className,
    variant,
    type,
  }: {
    children: React.ReactNode
    onClick?: () => void
    disabled?: boolean
    className?: string
    variant?: string
    type?: string
  }) => {
    return React.createElement(
      'button',
      { onClick, disabled, className, type: type || 'button', 'data-variant': variant },
      children
    )
  },
}))

// Mock @/components/ui/input
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

// Mock clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
})

// Mock URL.createObjectURL & revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url')

import { MFASetupPageClient } from '@/app/auth/mfa/setup/client'

describe('MFASetupPageClient', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockReset()
  })

  // =========================================================================
  // Step 1 - Intro
  // =========================================================================
  describe('Step 1 - Intro', () => {
    it('should render the setup intro with title', () => {
      render(<MFASetupPageClient />)
      expect(screen.getByText('Configura 2FA')).toBeInTheDocument()
      expect(
        screen.getByText(/Aggiungi un livello di sicurezza/i)
      ).toBeInTheDocument()
    })

    it('should display authenticator app info', () => {
      render(<MFASetupPageClient />)
      expect(screen.getByText('App Authenticator')).toBeInTheDocument()
      expect(
        screen.getByText(/Google Authenticator, Authy, o 1Password/i)
      ).toBeInTheDocument()
    })

    it('should render the start configuration button', () => {
      render(<MFASetupPageClient />)
      expect(screen.getByText('Inizia Configurazione')).toBeInTheDocument()
    })

    it('should call enroll API and advance to step 2 on success', async () => {
      mockFetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce({
          qrCode: 'data:image/png;base64,qrcode-data',
          secret: 'ABCDEF123456',
        }),
      })

      render(<MFASetupPageClient />)

      await act(async () => {
        fireEvent.click(screen.getByText('Inizia Configurazione'))
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/mfa/enroll', {
          method: 'POST',
        })
        expect(screen.getByText('Scansiona il QR Code')).toBeInTheDocument()
      })
    })

    it('should show error on enroll failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Failed'))

      render(<MFASetupPageClient />)

      await act(async () => {
        fireEvent.click(screen.getByText('Inizia Configurazione'))
      })

      await waitFor(() => {
        expect(
          screen.getByText('Errore durante la configurazione')
        ).toBeInTheDocument()
      })
    })
  })

  // =========================================================================
  // Step 2 - QR Code & Verification
  // =========================================================================
  describe('Step 2 - QR Code & Verification', () => {
    async function goToStep2(): Promise<void> {
      mockFetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce({
          qrCode: 'data:image/png;base64,qr-data',
          secret: 'SECRET123',
        }),
      })

      render(<MFASetupPageClient />)

      await act(async () => {
        fireEvent.click(screen.getByText('Inizia Configurazione'))
      })

      await waitFor(() => {
        expect(screen.getByText('Scansiona il QR Code')).toBeInTheDocument()
      })
    }

    it('should display QR code image', async () => {
      await goToStep2()
      const img = screen.getByAltText('QR Code')
      expect(img).toBeInTheDocument()
      expect(img).toHaveAttribute('src', 'data:image/png;base64,qr-data')
    })

    it('should display the secret key', async () => {
      await goToStep2()
      expect(screen.getByText('SECRET123')).toBeInTheDocument()
    })

    it('should copy secret to clipboard', async () => {
      await goToStep2()

      // Find the copy button (it's next to the secret)
      const copyButtons = screen.getAllByRole('button')
      const copyButton = copyButtons.find(
        (btn) =>
          !btn.textContent?.includes('Verifica') &&
          !btn.textContent?.includes('Inizia')
      )
      expect(copyButton).toBeTruthy()

      await act(async () => {
        fireEvent.click(copyButton!)
      })

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('SECRET123')
    })

    it('should have verify button disabled when code is not 6 digits', async () => {
      await goToStep2()
      const verifyButton = screen.getByText('Verifica')
      expect(verifyButton.closest('button')).toBeDisabled()
    })

    it('should verify code and advance to step 3 on success', async () => {
      await goToStep2()

      mockFetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce({
          verified: true,
          backupCodes: ['CODE1', 'CODE2', 'CODE3', 'CODE4'],
        }),
      })

      const codeInput = screen.getByPlaceholderText('Codice a 6 cifre')
      fireEvent.change(codeInput, { target: { value: '123456' } })

      await act(async () => {
        fireEvent.click(screen.getByText('Verifica'))
      })

      await waitFor(() => {
        expect(screen.getByText('2FA Attivato!')).toBeInTheDocument()
      })
    })

    it('should show error on invalid verification code', async () => {
      await goToStep2()

      mockFetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce({ verified: false }),
      })

      const codeInput = screen.getByPlaceholderText('Codice a 6 cifre')
      fireEvent.change(codeInput, { target: { value: '000000' } })

      await act(async () => {
        fireEvent.click(screen.getByText('Verifica'))
      })

      await waitFor(() => {
        expect(screen.getByText('Codice non valido')).toBeInTheDocument()
      })
    })

    it('should show error on verification API failure', async () => {
      await goToStep2()

      mockFetch.mockRejectedValueOnce(new Error('Server error'))

      const codeInput = screen.getByPlaceholderText('Codice a 6 cifre')
      fireEvent.change(codeInput, { target: { value: '123456' } })

      await act(async () => {
        fireEvent.click(screen.getByText('Verifica'))
      })

      await waitFor(() => {
        expect(screen.getByText('Errore di verifica')).toBeInTheDocument()
      })
    })
  })

  // =========================================================================
  // Step 3 - Backup Codes
  // =========================================================================
  describe('Step 3 - Backup Codes', () => {
    async function goToStep3(): Promise<void> {
      // Step 1 -> Step 2
      mockFetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce({
          qrCode: 'data:image/png;base64,qr',
          secret: 'SECRET',
        }),
      })

      render(<MFASetupPageClient />)

      await act(async () => {
        fireEvent.click(screen.getByText('Inizia Configurazione'))
      })

      await waitFor(() => {
        expect(screen.getByText('Scansiona il QR Code')).toBeInTheDocument()
      })

      // Step 2 -> Step 3
      mockFetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce({
          verified: true,
          backupCodes: ['AAAA-BBBB', 'CCCC-DDDD', 'EEEE-FFFF', 'GGGG-HHHH'],
        }),
      })

      const codeInput = screen.getByPlaceholderText('Codice a 6 cifre')
      fireEvent.change(codeInput, { target: { value: '123456' } })

      await act(async () => {
        fireEvent.click(screen.getByText('Verifica'))
      })

      await waitFor(() => {
        expect(screen.getByText('2FA Attivato!')).toBeInTheDocument()
      })
    }

    it('should display backup codes', async () => {
      await goToStep3()
      expect(screen.getByText('AAAA-BBBB')).toBeInTheDocument()
      expect(screen.getByText('CCCC-DDDD')).toBeInTheDocument()
      expect(screen.getByText('EEEE-FFFF')).toBeInTheDocument()
      expect(screen.getByText('GGGG-HHHH')).toBeInTheDocument()
    })

    it('should show download button for backup codes', async () => {
      await goToStep3()
      expect(screen.getByText('Scarica codici')).toBeInTheDocument()
    })

    it('should show warning about saving backup codes', async () => {
      await goToStep3()
      expect(screen.getByText('Codici di backup')).toBeInTheDocument()
      expect(
        screen.getByText(/Salva questi codici in un posto sicuro/i)
      ).toBeInTheDocument()
    })

    it('should navigate to dashboard on "Vai alla Dashboard" click', async () => {
      await goToStep3()

      await act(async () => {
        fireEvent.click(screen.getByText('Vai alla Dashboard'))
      })

      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })
})
