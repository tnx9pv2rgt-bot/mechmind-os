/**
 * Tests for LockedPage (app/auth/locked/page.tsx)
 */

import React from 'react'
import { render, screen, act, waitFor } from '@testing-library/react'

// =========================================================================
// Mocks
// =========================================================================

jest.mock('framer-motion', () => {
  const R = require('react')
  return {
    motion: new Proxy(
      {},
      {
        get: (_: unknown, prop: string) =>
          R.forwardRef(
            ({ children, ...rest }: { children?: React.ReactNode; [key: string]: unknown }, ref: React.Ref<HTMLElement>) => {
              const safe: Record<string, unknown> = {}
              for (const k of Object.keys(rest)) {
                if (['className', 'style', 'onClick', 'role', 'id'].includes(k) || k.startsWith('data-') || k.startsWith('aria-')) {
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
}))

// =========================================================================
// SessionStorage mock helpers
// =========================================================================

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

import LockedPage from '@/app/auth/locked/page'

describe('LockedPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    sessionStorageMock.clear()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('rendering', () => {
    it('should render the locked title', () => {
      render(<LockedPage />)
      expect(screen.getByText('Account bloccato')).toBeInTheDocument()
    })

    it('should render the warning icon', () => {
      render(<LockedPage />)
      expect(screen.getByText('⚠')).toBeInTheDocument()
    })

    it('should render the lockout description', () => {
      render(<LockedPage />)
      expect(screen.getByText(/temporaneamente bloccato/i)).toBeInTheDocument()
    })

    it('should show countdown when lockout has not expired', () => {
      render(<LockedPage />)
      expect(screen.getByText('Riprova tra')).toBeInTheDocument()
    })

    it('should show formatted time in countdown', () => {
      render(<LockedPage />)
      expect(screen.getByText('30:00')).toBeInTheDocument()
    })

    it('should show back to login link during lockout', () => {
      render(<LockedPage />)
      const links = screen.getAllByRole('link')
      const loginLinks = links.filter(l => l.getAttribute('href') === '/auth')
      expect(loginLinks.length).toBeGreaterThan(0)
    })

    it('should show support message during lockout', () => {
      render(<LockedPage />)
      expect(screen.getByText(/contatta il supporto tecnico/i)).toBeInTheDocument()
    })
  })

  describe('countdown timer', () => {
    it('should read existing lockout_start from sessionStorage and compute remaining time', () => {
      const past = Date.now() - 29 * 60 * 1000 // 29 minutes ago → 1 minute left
      sessionStorageMock.setItem('lockout_start', past.toString())
      render(<LockedPage />)
      // Remaining time should be around 1 minute
      // Since useEffect fires asynchronously, after advancing timers
      act(() => { jest.advanceTimersByTime(0) })
      const display = screen.getByRole('heading', { name: /Account bloccato/i })
      expect(display).toBeInTheDocument()
    })

    it('should set lockout_start in sessionStorage when not present', () => {
      render(<LockedPage />)
      act(() => { jest.advanceTimersByTime(0) })
      expect(sessionStorageMock.getItem('lockout_start')).not.toBeNull()
    })

    it('should decrement the countdown each second', async () => {
      render(<LockedPage />)
      act(() => { jest.advanceTimersByTime(0) })
      expect(screen.getByText('30:00')).toBeInTheDocument()

      await act(async () => { jest.advanceTimersByTime(1000) })
      expect(screen.getByText('29:59')).toBeInTheDocument()
    })

    it('should stop at 00:00 and show expired state', async () => {
      // Set lockout_start to near-expiry (29 min 59 sec ago → 1 sec left)
      const past = Date.now() - (30 * 60 - 1) * 1000
      sessionStorageMock.setItem('lockout_start', past.toString())
      render(<LockedPage />)

      // Advance past the remaining second
      await act(async () => { jest.advanceTimersByTime(2000) })

      await waitFor(() => {
        expect(screen.getByText(/blocco è scaduto/i)).toBeInTheDocument()
      })
    })

    it('should show "Torna al login" link after expiry', async () => {
      const past = Date.now() - (30 * 60 - 1) * 1000
      sessionStorageMock.setItem('lockout_start', past.toString())
      render(<LockedPage />)

      await act(async () => { jest.advanceTimersByTime(2000) })

      await waitFor(() => {
        const link = screen.getByRole('link', { name: /Torna al login/i })
        expect(link).toHaveAttribute('href', '/auth')
      })
    })

    it('should handle already-expired lockout (elapsed > duration)', async () => {
      // Set lockout_start to 31 minutes ago → should show expired immediately
      const past = Date.now() - 31 * 60 * 1000
      sessionStorageMock.setItem('lockout_start', past.toString())
      render(<LockedPage />)

      await act(async () => { jest.advanceTimersByTime(0) })

      await waitFor(() => {
        expect(screen.getByText(/blocco è scaduto/i)).toBeInTheDocument()
      })
    })
  })

  describe('formatTime', () => {
    it('should format single-digit minutes and seconds with leading zeros', async () => {
      // 1 second remaining: 00:01
      const past = Date.now() - (30 * 60 - 1) * 1000
      sessionStorageMock.setItem('lockout_start', past.toString())
      render(<LockedPage />)
      act(() => { jest.advanceTimersByTime(0) })
      await waitFor(() => {
        expect(screen.getByText('00:01')).toBeInTheDocument()
      })
    })
  })
})
