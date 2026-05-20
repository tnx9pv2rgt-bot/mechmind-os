import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

jest.mock('lucide-react', () => {
  const React = require('react')
  return new Proxy({}, {
    get: (_t: unknown, name: string) => {
      if (typeof name !== 'string') return undefined
      return ({ className }: { className?: string }) =>
        React.createElement('span', { className, 'data-icon': name })
    },
  })
})

jest.mock('framer-motion', () => {
  const React = require('react')
  const filterMotionProps = ({
    children, variants, initial, animate, exit, whileHover, whileTap, custom, transition, layout, layoutId,
    ...rest
  }: Record<string, unknown>) => ({ ...rest, children })
  const cache: Record<string, (props: Record<string, unknown>) => unknown> = {}
  return {
    motion: new Proxy({}, {
      get(_t: unknown, tag: string) {
        if (typeof tag !== 'string') return undefined
        if (!cache[tag]) {
          cache[tag] = (props: Record<string, unknown>) =>
            React.createElement(tag as string, filterMotionProps(props))
        }
        return cache[tag]
      },
    }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  }
})

const mockRouterPush = jest.fn()
const mockSearchParamsGet = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
  useSearchParams: () => ({ get: mockSearchParamsGet }),
}))

jest.mock('@/components/ui/apple-card', () => ({
  AppleCard: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  AppleCardContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  AppleCardHeader: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}))

jest.mock('@/components/ui/apple-button', () => ({
  AppleButton: ({
    children,
    onClick,
    variant,
    className,
  }: {
    children?: React.ReactNode
    onClick?: () => void
    variant?: string
    className?: string
  }) =>
    React.createElement('button', { onClick, 'data-variant': variant, className }, children),
}))

const mockFetch = jest.fn()
global.fetch = mockFetch

import BillingSuccessPage from '@/app/billing/success/page'

describe('BillingSuccessPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSearchParamsGet.mockReturnValue(null)
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ status: 'complete' }) })
  })

  // --- Loading state ---

  it('mostra stato verifica in corso mentre fetch è pending', () => {
    mockSearchParamsGet.mockReturnValue('sess_123')
    mockFetch.mockImplementation(() => new Promise(() => {}))
    render(<BillingSuccessPage />)
    expect(screen.getByText('Verifica in corso...')).toBeInTheDocument()
  })

  it('mostra spinner durante verifica', () => {
    mockSearchParamsGet.mockReturnValue('sess_123')
    mockFetch.mockImplementation(() => new Promise(() => {}))
    render(<BillingSuccessPage />)
    expect(document.querySelector('[data-icon="Loader2"]')).toBeTruthy()
  })

  // --- Missing session_id ---

  it('mostra errore Session ID mancante quando session_id null', async () => {
    mockSearchParamsGet.mockReturnValue(null)
    render(<BillingSuccessPage />)
    await waitFor(() =>
      expect(screen.getByText('Session ID mancante')).toBeInTheDocument(),
    )
  })

  it('click Torna alla Fatturazione nel blocco errore naviga', async () => {
    mockSearchParamsGet.mockReturnValue(null)
    render(<BillingSuccessPage />)
    await waitFor(() => screen.getByText('Session ID mancante'))
    fireEvent.click(screen.getByText('Torna alla Fatturazione'))
    expect(mockRouterPush).toHaveBeenCalledWith('/dashboard/billing')
  })

  // --- Success state ---

  it('mostra Abbonamento Attivato dopo verifica ok', async () => {
    mockSearchParamsGet.mockReturnValue('sess_123')
    render(<BillingSuccessPage />)
    await waitFor(() =>
      expect(screen.getByText('Abbonamento Attivato!')).toBeInTheDocument(),
    )
  })

  it('mostra sezione Cosa succede ora dopo verifica ok', async () => {
    mockSearchParamsGet.mockReturnValue('sess_123')
    render(<BillingSuccessPage />)
    await waitFor(() => screen.getByText('Abbonamento Attivato!'))
    expect(screen.getByText('Cosa succede ora?')).toBeInTheDocument()
  })

  it('click Vai alla Dashboard naviga a /dashboard', async () => {
    mockSearchParamsGet.mockReturnValue('sess_123')
    render(<BillingSuccessPage />)
    await waitFor(() => screen.getByText('Vai alla Dashboard'))
    fireEvent.click(screen.getByText('Vai alla Dashboard'))
    expect(mockRouterPush).toHaveBeenCalledWith('/dashboard')
  })

  it('click Gestisci Abbonamento naviga a /dashboard/billing', async () => {
    mockSearchParamsGet.mockReturnValue('sess_123')
    render(<BillingSuccessPage />)
    await waitFor(() => screen.getByText('Gestisci Abbonamento'))
    fireEvent.click(screen.getByText('Gestisci Abbonamento'))
    expect(mockRouterPush).toHaveBeenCalledWith('/dashboard/billing')
  })

  // --- Pagamento in attesa ---

  it('mostra errore Pagamento in attesa quando status non è complete', async () => {
    mockSearchParamsGet.mockReturnValue('sess_123')
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'open' }),
    })
    render(<BillingSuccessPage />)
    await waitFor(() =>
      expect(screen.getByText('Pagamento in attesa o incompleto')).toBeInTheDocument(),
    )
  })

  // --- Fetch error (network) ---

  it('fetch che lancia eccezione non causa crash', async () => {
    mockSearchParamsGet.mockReturnValue('sess_123')
    mockFetch.mockRejectedValue(new Error('network'))
    render(<BillingSuccessPage />)
    await waitFor(() =>
      expect(screen.queryByText('Verifica in corso...')).not.toBeInTheDocument(),
    )
  })

  it('fetch non ok lancia errore e mostra loading false', async () => {
    mockSearchParamsGet.mockReturnValue('sess_123')
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    })
    render(<BillingSuccessPage />)
    await waitFor(() =>
      expect(screen.queryByText('Verifica in corso...')).not.toBeInTheDocument(),
    )
  })
})
