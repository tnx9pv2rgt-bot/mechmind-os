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
    loading,
    disabled,
    variant,
    icon,
  }: {
    children?: React.ReactNode
    onClick?: () => void
    loading?: boolean
    disabled?: boolean
    variant?: string
    icon?: React.ReactNode
  }) =>
    React.createElement('button', { onClick, disabled: disabled || loading, 'data-variant': variant }, icon, children),
}))

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) =>
    React.createElement('span', { 'data-testid': 'badge' }, children),
}))

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

const mockUseSWR = jest.fn()
jest.mock('swr', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockUseSWR(...args),
}))

const mockFetch = jest.fn()
global.fetch = mockFetch

import BillingPage from '@/app/dashboard/billing/page'
import { toast } from 'sonner'

const basePaymentMethod = {
  brand: 'visa',
  last4: '4242',
  expMonth: 12,
  expYear: 2027,
}

const baseInvoice = {
  id: 'inv-1',
  number: 'INV-001',
  date: '2026-01-15T00:00:00.000Z',
  amount: 4900,
  currency: 'eur',
  status: 'paid',
  pdfUrl: 'https://stripe.com/invoice.pdf',
}

function setupSWR(
  paymentMethod: object | null = null,
  invoices: object[] = [],
  opts: { pmLoading?: boolean; invLoading?: boolean; invError?: Error } = {},
) {
  mockUseSWR.mockImplementation((key: string) => {
    if (key === '/api/dashboard/billing/payment-method') {
      return { data: paymentMethod ?? undefined, isLoading: opts.pmLoading ?? false }
    }
    if (key === '/api/dashboard/billing/invoices') {
      return {
        data: opts.invError ? undefined : invoices,
        isLoading: opts.invLoading ?? false,
        error: opts.invError,
      }
    }
    return { data: undefined, isLoading: false }
  })
}

describe('BillingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setupSWR()
  })

  // --- Loading state ---

  it('mostra spinner quando pmLoading è true', () => {
    setupSWR(null, [], { pmLoading: true })
    render(<BillingPage />)
    expect(document.querySelector('[data-icon="Loader2"]')).toBeTruthy()
  })

  it('mostra spinner quando invLoading è true', () => {
    setupSWR(null, [], { invLoading: true })
    render(<BillingPage />)
    expect(document.querySelector('[data-icon="Loader2"]')).toBeTruthy()
  })

  // --- Error state ---

  it('mostra errore di caricamento quando invError è presente', () => {
    setupSWR(null, [], { invError: new Error('network') })
    render(<BillingPage />)
    expect(screen.getByText('Errore di caricamento')).toBeInTheDocument()
  })

  it('mostra messaggio impossibile caricare fatture', () => {
    setupSWR(null, [], { invError: new Error('network') })
    render(<BillingPage />)
    expect(screen.getByText('Impossibile caricare lo storico fatture.')).toBeInTheDocument()
  })

  // --- Normal state header ---

  it('renderizza titolo Fatturazione', () => {
    render(<BillingPage />)
    expect(screen.getByText('Fatturazione')).toBeInTheDocument()
  })

  it('renderizza pulsante Gestisci Pagamenti', () => {
    render(<BillingPage />)
    expect(screen.getByText('Gestisci Pagamenti')).toBeInTheDocument()
  })

  it('renderizza sezione Metodo di Pagamento', () => {
    render(<BillingPage />)
    expect(screen.getByText('Metodo di Pagamento')).toBeInTheDocument()
  })

  it('renderizza sezione Storico Fatture', () => {
    render(<BillingPage />)
    expect(screen.getByText('Storico Fatture')).toBeInTheDocument()
  })

  // --- Payment method null ---

  it('mostra avviso nessun metodo di pagamento quando null', () => {
    render(<BillingPage />)
    expect(screen.getByText('Nessun metodo di pagamento configurato')).toBeInTheDocument()
  })

  it('mostra pulsante Aggiungi quando metodo di pagamento assente', () => {
    render(<BillingPage />)
    expect(screen.getByText('Aggiungi')).toBeInTheDocument()
  })

  // --- Payment method present ---

  it('mostra brand e last4 quando metodo di pagamento presente', () => {
    setupSWR(basePaymentMethod)
    render(<BillingPage />)
    expect(screen.getByText(/visa/)).toBeInTheDocument()
    expect(screen.getByText(/4242/)).toBeInTheDocument()
  })

  it('mostra data scadenza carta', () => {
    setupSWR(basePaymentMethod)
    render(<BillingPage />)
    expect(screen.getByText('Scade 12/2027')).toBeInTheDocument()
  })

  it('mostra pulsante Modifica quando metodo di pagamento presente', () => {
    setupSWR(basePaymentMethod)
    render(<BillingPage />)
    expect(screen.getByText('Modifica')).toBeInTheDocument()
  })

  // --- Invoice list empty ---

  it('mostra Nessuna fattura quando lista vuota', () => {
    render(<BillingPage />)
    expect(screen.getByText('Nessuna fattura')).toBeInTheDocument()
  })

  it('non mostra Scarica tutte quando lista vuota', () => {
    render(<BillingPage />)
    expect(screen.queryByText('Scarica tutte')).not.toBeInTheDocument()
  })

  // --- Invoice list populated ---

  it('mostra Scarica tutte quando ci sono fatture', () => {
    setupSWR(null, [baseInvoice])
    render(<BillingPage />)
    expect(screen.getByText('Scarica tutte')).toBeInTheDocument()
  })

  it('mostra numero fattura con hash', () => {
    setupSWR(null, [baseInvoice])
    render(<BillingPage />)
    expect(screen.getByText('#INV-001')).toBeInTheDocument()
  })

  it('mostra importo fattura formattato', () => {
    setupSWR(null, [baseInvoice])
    render(<BillingPage />)
    expect(screen.getByText('€49,00')).toBeInTheDocument()
  })

  it('mostra stato Pagata per status paid', () => {
    setupSWR(null, [baseInvoice])
    render(<BillingPage />)
    expect(screen.getByText('Pagata')).toBeInTheDocument()
  })

  it('mostra stato In Attesa per status open', () => {
    setupSWR(null, [{ ...baseInvoice, status: 'open' }])
    render(<BillingPage />)
    expect(screen.getByText('In Attesa')).toBeInTheDocument()
  })

  it('mostra stato Fallita per status uncollectible', () => {
    setupSWR(null, [{ ...baseInvoice, status: 'uncollectible' }])
    render(<BillingPage />)
    expect(screen.getByText('Fallita')).toBeInTheDocument()
  })

  it('mostra stato Annullata per status void', () => {
    setupSWR(null, [{ ...baseInvoice, status: 'void' }])
    render(<BillingPage />)
    expect(screen.getByText('Annullata')).toBeInTheDocument()
  })

  it('stato sconosciuto fallback a In Attesa', () => {
    setupSWR(null, [{ ...baseInvoice, status: 'unknown' }])
    render(<BillingPage />)
    expect(screen.getByText('In Attesa')).toBeInTheDocument()
  })

  it('mostra link PDF quando pdfUrl presente', () => {
    setupSWR(null, [baseInvoice])
    render(<BillingPage />)
    const link = document.querySelector('a[href="https://stripe.com/invoice.pdf"]')
    expect(link).toBeTruthy()
  })

  it('mostra trattino quando pdfUrl è null', () => {
    setupSWR(null, [{ ...baseInvoice, pdfUrl: null }])
    render(<BillingPage />)
    expect(screen.getByText('-')).toBeInTheDocument()
  })

  // --- Gestisci Pagamenti ---

  it('click Gestisci Pagamenti chiama fetch portal', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: 'https://billing.stripe.com/session/abc' }),
    })
    render(<BillingPage />)
    fireEvent.click(screen.getByText('Gestisci Pagamenti'))
    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/stripe/portal',
        expect.objectContaining({ method: 'POST' }),
      ),
    )
  })

  it('errore portal mostra toast.error', async () => {
    mockFetch.mockResolvedValue({ ok: false, json: () => Promise.resolve({}) })
    render(<BillingPage />)
    fireEvent.click(screen.getByText('Gestisci Pagamenti'))
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Errore apertura portale pagamenti'),
    )
  })

  it('fetch portal lancia eccezione mostra toast.error', async () => {
    mockFetch.mockRejectedValue(new Error('network'))
    render(<BillingPage />)
    fireEvent.click(screen.getByText('Gestisci Pagamenti'))
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Errore apertura portale pagamenti'),
    )
  })

  it('click Aggiungi chiama fetch portal', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: 'https://billing.stripe.com/session/abc' }),
    })
    render(<BillingPage />)
    fireEvent.click(screen.getByText('Aggiungi'))
    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith('/api/stripe/portal', expect.anything()),
    )
  })

  it('click Modifica chiama fetch portal', async () => {
    setupSWR(basePaymentMethod)
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: 'https://billing.stripe.com/session/abc' }),
    })
    render(<BillingPage />)
    fireEvent.click(screen.getByText('Modifica'))
    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith('/api/stripe/portal', expect.anything()),
    )
  })

  it('portal risponde senza url non naviga', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    })
    render(<BillingPage />)
    fireEvent.click(screen.getByText('Gestisci Pagamenti'))
    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith('/api/stripe/portal', expect.anything()),
    )
    expect(toast.error).not.toHaveBeenCalled()
  })

  // --- Table headers ---

  it('mostra intestazioni tabella fatture', () => {
    setupSWR(null, [baseInvoice])
    render(<BillingPage />)
    expect(screen.getByText('Data')).toBeInTheDocument()
    expect(screen.getByText('Numero')).toBeInTheDocument()
    expect(screen.getByText('Importo')).toBeInTheDocument()
    expect(screen.getByText('Stato')).toBeInTheDocument()
    expect(screen.getByText('PDF')).toBeInTheDocument()
  })

  it('mostra data fattura localizzata', () => {
    setupSWR(null, [baseInvoice])
    render(<BillingPage />)
    expect(screen.getByText('15/01/2026')).toBeInTheDocument()
  })

  // --- onError callbacks ---

  it('onError payment method chiama toast.error', () => {
    mockUseSWR.mockImplementation((key: string, _fetcher: unknown, opts: { onError?: (e: Error) => void }) => {
      if (key === '/api/dashboard/billing/payment-method') {
        opts?.onError?.(new Error('pm error'))
        return { data: undefined, isLoading: false }
      }
      return { data: [], isLoading: false, error: undefined }
    })
    render(<BillingPage />)
    expect(toast.error).toHaveBeenCalledWith('Errore caricamento metodo di pagamento')
  })

  it('onError invoices chiama toast.error', () => {
    mockUseSWR.mockImplementation((key: string, _fetcher: unknown, opts: { onError?: (e: Error) => void }) => {
      if (key === '/api/dashboard/billing/invoices') {
        opts?.onError?.(new Error('inv error'))
        return { data: undefined, isLoading: false, error: new Error('inv error') }
      }
      return { data: undefined, isLoading: false }
    })
    render(<BillingPage />)
    expect(toast.error).toHaveBeenCalledWith('Errore caricamento fatture')
  })

  // --- paymentFetcher / invoicesFetcher via captured args ---

  it('paymentFetcher con res.ok restituisce data', async () => {
    let capturedFetcher: ((url: string) => Promise<unknown>) | undefined
    mockUseSWR.mockImplementation((key: string, fetcher: (url: string) => Promise<unknown>) => {
      if (key === '/api/dashboard/billing/payment-method') capturedFetcher = fetcher
      return { data: undefined, isLoading: false }
    })
    render(<BillingPage />)
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: basePaymentMethod }),
    })
    const result = await capturedFetcher?.('/api/dashboard/billing/payment-method')
    expect(result).toEqual(basePaymentMethod)
  })

  it('paymentFetcher con res.ok e risposta piatta restituisce json', async () => {
    let capturedFetcher: ((url: string) => Promise<unknown>) | undefined
    mockUseSWR.mockImplementation((key: string, fetcher: (url: string) => Promise<unknown>) => {
      if (key === '/api/dashboard/billing/payment-method') capturedFetcher = fetcher
      return { data: undefined, isLoading: false }
    })
    render(<BillingPage />)
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(basePaymentMethod),
    })
    const result = await capturedFetcher?.('/api/dashboard/billing/payment-method')
    expect(result).toEqual(basePaymentMethod)
  })

  it('paymentFetcher con res non ok restituisce null', async () => {
    let capturedFetcher: ((url: string) => Promise<unknown>) | undefined
    mockUseSWR.mockImplementation((key: string, fetcher: (url: string) => Promise<unknown>) => {
      if (key === '/api/dashboard/billing/payment-method') capturedFetcher = fetcher
      return { data: undefined, isLoading: false }
    })
    render(<BillingPage />)
    mockFetch.mockResolvedValue({ ok: false })
    const result = await capturedFetcher?.('/api/dashboard/billing/payment-method')
    expect(result).toBeNull()
  })

  it('invoicesFetcher con res.ok e data array restituisce lista', async () => {
    let capturedFetcher: ((url: string) => Promise<unknown>) | undefined
    mockUseSWR.mockImplementation((key: string, fetcher: (url: string) => Promise<unknown>) => {
      if (key === '/api/dashboard/billing/invoices') capturedFetcher = fetcher
      return { data: undefined, isLoading: false }
    })
    render(<BillingPage />)
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [baseInvoice] }),
    })
    const result = await capturedFetcher?.('/api/dashboard/billing/invoices')
    expect(result).toEqual([baseInvoice])
  })

  it('invoicesFetcher con res.ok e invoices array restituisce lista', async () => {
    let capturedFetcher: ((url: string) => Promise<unknown>) | undefined
    mockUseSWR.mockImplementation((key: string, fetcher: (url: string) => Promise<unknown>) => {
      if (key === '/api/dashboard/billing/invoices') capturedFetcher = fetcher
      return { data: undefined, isLoading: false }
    })
    render(<BillingPage />)
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ invoices: [baseInvoice] }),
    })
    const result = await capturedFetcher?.('/api/dashboard/billing/invoices')
    expect(result).toEqual([baseInvoice])
  })

  it('invoicesFetcher con res.ok e lista non array restituisce array vuoto', async () => {
    let capturedFetcher: ((url: string) => Promise<unknown>) | undefined
    mockUseSWR.mockImplementation((key: string, fetcher: (url: string) => Promise<unknown>) => {
      if (key === '/api/dashboard/billing/invoices') capturedFetcher = fetcher
      return { data: undefined, isLoading: false }
    })
    render(<BillingPage />)
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ other: 'value' }),
    })
    const result = await capturedFetcher?.('/api/dashboard/billing/invoices')
    expect(result).toEqual([])
  })

  it('invoicesFetcher con res non ok restituisce array vuoto', async () => {
    let capturedFetcher: ((url: string) => Promise<unknown>) | undefined
    mockUseSWR.mockImplementation((key: string, fetcher: (url: string) => Promise<unknown>) => {
      if (key === '/api/dashboard/billing/invoices') capturedFetcher = fetcher
      return { data: undefined, isLoading: false }
    })
    render(<BillingPage />)
    mockFetch.mockResolvedValue({ ok: false })
    const result = await capturedFetcher?.('/api/dashboard/billing/invoices')
    expect(result).toEqual([])
  })
})
