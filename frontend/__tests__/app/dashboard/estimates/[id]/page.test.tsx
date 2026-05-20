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
    children,
    variants,
    initial,
    animate,
    exit,
    whileHover,
    whileTap,
    custom,
    transition,
    layout,
    layoutId,
    ...rest
  }: Record<string, unknown>) => ({ ...rest, children })
  return {
    motion: new Proxy({}, {
      get(_t: unknown, tag: string) {
        if (typeof tag !== 'string') return undefined
        return (props: Record<string, unknown>) =>
          React.createElement(tag as string, filterMotionProps(props))
      },
    }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  }
})

const mockRouterPush = jest.fn()
jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'est-1' }),
  useRouter: () => ({ push: mockRouterPush }),
}))

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href }, children),
}))

jest.mock('@/components/ui/apple-card', () => ({
  AppleCard: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  AppleCardContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  AppleCardHeader: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  AppleCardFooter: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}))

jest.mock('@/components/ui/apple-button', () => ({
  AppleButton: ({
    children,
    onClick,
    loading,
    disabled,
    className,
  }: {
    children?: React.ReactNode
    onClick?: () => void
    loading?: boolean
    disabled?: boolean
    className?: string
  }) =>
    React.createElement('button', { onClick, disabled: disabled || loading, className }, children),
}))

jest.mock('@/components/ui/breadcrumb', () => ({
  Breadcrumb: () => React.createElement('nav', { 'data-testid': 'breadcrumb' }),
}))

jest.mock('@/components/ui/confirm-dialog', () => ({
  ConfirmDialog: ({
    open,
    onConfirm,
    onOpenChange,
  }: {
    open: boolean
    onConfirm: () => void
    onOpenChange: (v: boolean) => void
  }) =>
    open
      ? React.createElement(
          'div',
          { 'data-testid': 'confirm-dialog' },
          React.createElement('button', { onClick: onConfirm }, 'Conferma eliminazione'),
          React.createElement('button', { onClick: () => onOpenChange(false) }, 'Annulla dialog'),
        )
      : null,
}))

jest.mock('@/components/print/printable-document', () => ({
  PrintableDocument: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  TenantPrintInfo: () => null,
}))

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

const mockFetch = jest.fn()
global.fetch = mockFetch

import EstimateDetailPage from '@/app/dashboard/estimates/[id]/page'
import { toast } from 'sonner'

const baseEstimate = {
  id: 'est-1',
  number: 'PRE-001',
  status: 'DRAFT',
  customerId: 'cust-1',
  customerName: 'Mario Rossi',
  customerEmail: 'mario@example.com',
  vehicleId: 'veh-1',
  vehiclePlate: 'AA123BB',
  vehicleMake: 'Fiat',
  vehicleModel: 'Punto',
  validUntil: '2026-12-31',
  discount: 0,
  subtotal: 400,
  taxAmount: 88,
  total: 488,
  notes: null,
  lines: [],
  workOrderId: null,
  createdAt: '2026-01-01T10:00:00Z',
}

function makeOkResponse(data: object) {
  return {
    ok: true,
    json: () => Promise.resolve({ data }),
  }
}

function makeErrResponse(message = 'Server error') {
  return {
    ok: false,
    json: () => Promise.resolve({ message }),
  }
}

describe('EstimateDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockResolvedValue(makeOkResponse(baseEstimate))
  })

  // --- Loading ---

  it('renderizza spinner in caricamento', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}))
    render(<EstimateDetailPage />)
    expect(document.querySelector('[data-icon="Loader2"]')).toBeTruthy()
  })

  // --- Error ---

  it('mostra error state quando fetch fallisce', async () => {
    mockFetch.mockRejectedValue(new Error('network'))
    render(<EstimateDetailPage />)
    await waitFor(() =>
      expect(screen.getByText('Torna ai Preventivi')).toBeInTheDocument(),
    )
    expect(document.querySelector('[data-icon="AlertCircle"]')).toBeTruthy()
  })

  it('mostra messaggio errore quando HTTP non ok', async () => {
    mockFetch.mockResolvedValue({ ok: false, json: () => Promise.resolve({}) })
    render(<EstimateDetailPage />)
    await waitFor(() =>
      expect(screen.getByText('Preventivo non trovato')).toBeInTheDocument(),
    )
  })

  it('Torna ai Preventivi chiama router.push', async () => {
    mockFetch.mockRejectedValue(new Error('err'))
    render(<EstimateDetailPage />)
    await waitFor(() => screen.getByText('Torna ai Preventivi'))
    fireEvent.click(screen.getByText('Torna ai Preventivi'))
    expect(mockRouterPush).toHaveBeenCalledWith('/dashboard/estimates')
  })

  // --- Detail render ---

  it('mostra numero preventivo', async () => {
    render(<EstimateDetailPage />)
    await waitFor(() => expect(screen.getByText('PRE-001')).toBeInTheDocument())
  })

  it('mostra nome cliente', async () => {
    render(<EstimateDetailPage />)
    await waitFor(() => expect(screen.getAllByText('Mario Rossi').length).toBeGreaterThan(0))
  })

  it('mostra email cliente', async () => {
    render(<EstimateDetailPage />)
    await waitFor(() => expect(screen.getByText('mario@example.com')).toBeInTheDocument())
  })

  it('non mostra email quando assente', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({ ...baseEstimate, customerEmail: null }))
    render(<EstimateDetailPage />)
    await waitFor(() => screen.getByText('Mario Rossi'))
    expect(screen.queryByText('@')).not.toBeInTheDocument()
  })

  it('mostra veicolo', async () => {
    render(<EstimateDetailPage />)
    await waitFor(() => expect(screen.getByText(/Fiat Punto/)).toBeInTheDocument())
  })

  it('mostra targa veicolo', async () => {
    render(<EstimateDetailPage />)
    await waitFor(() => expect(screen.getByText('AA123BB')).toBeInTheDocument())
  })

  it('mostra validUntil quando presente', async () => {
    render(<EstimateDetailPage />)
    await waitFor(() => expect(screen.getByText('Valido fino al')).toBeInTheDocument())
  })

  it('non mostra validUntil quando null', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({ ...baseEstimate, validUntil: null }))
    render(<EstimateDetailPage />)
    await waitFor(() => screen.getByText('PRE-001'))
    expect(screen.queryByText('Valido fino al')).not.toBeInTheDocument()
  })

  it('mostra note quando presenti', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({ ...baseEstimate, notes: 'Nota di test' }))
    render(<EstimateDetailPage />)
    await waitFor(() => expect(screen.getByText('Nota di test')).toBeInTheDocument())
  })

  it('non mostra sezione note quando null', async () => {
    render(<EstimateDetailPage />)
    await waitFor(() => screen.getByText('PRE-001'))
    expect(screen.queryByText('Note')).not.toBeInTheDocument()
  })

  it('mostra sconto quando > 0', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({ ...baseEstimate, discount: 50 }))
    render(<EstimateDetailPage />)
    await waitFor(() => expect(screen.getByText('Sconto')).toBeInTheDocument())
  })

  // --- Status badges ---

  it('mostra badge DRAFT', async () => {
    render(<EstimateDetailPage />)
    await waitFor(() => expect(screen.getByText('Bozza')).toBeInTheDocument())
  })

  it('mostra badge SENT', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({ ...baseEstimate, status: 'SENT' }))
    render(<EstimateDetailPage />)
    await waitFor(() => expect(screen.getByText('Inviato')).toBeInTheDocument())
  })

  it('mostra badge ACCEPTED', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({ ...baseEstimate, status: 'ACCEPTED' }))
    render(<EstimateDetailPage />)
    await waitFor(() => expect(screen.getByText('Accettato')).toBeInTheDocument())
  })

  it('mostra badge REJECTED', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({ ...baseEstimate, status: 'REJECTED' }))
    render(<EstimateDetailPage />)
    await waitFor(() => expect(screen.getByText('Rifiutato')).toBeInTheDocument())
  })

  it('mostra badge EXPIRED', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({ ...baseEstimate, status: 'EXPIRED' }))
    render(<EstimateDetailPage />)
    await waitFor(() => expect(screen.getByText('Scaduto')).toBeInTheDocument())
  })

  it('mostra badge CONVERTED', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({ ...baseEstimate, status: 'CONVERTED' }))
    render(<EstimateDetailPage />)
    await waitFor(() => expect(screen.getByText('Convertito')).toBeInTheDocument())
  })

  // --- Status-specific actions ---

  it('DRAFT mostra Invia al cliente e Elimina', async () => {
    render(<EstimateDetailPage />)
    await waitFor(() => expect(screen.getByText('Invia al cliente')).toBeInTheDocument())
    expect(screen.getByText('Elimina')).toBeInTheDocument()
  })

  it('SENT mostra Segna accettato e Segna rifiutato', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({ ...baseEstimate, status: 'SENT' }))
    render(<EstimateDetailPage />)
    await waitFor(() => expect(screen.getByText('Segna accettato')).toBeInTheDocument())
    expect(screen.getByText('Segna rifiutato')).toBeInTheDocument()
  })

  it('ACCEPTED mostra Converti in Ordine di Lavoro', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({ ...baseEstimate, status: 'ACCEPTED' }))
    render(<EstimateDetailPage />)
    await waitFor(() =>
      expect(screen.getByText('Converti in Ordine di Lavoro')).toBeInTheDocument(),
    )
  })

  it('CONVERTED con workOrderId mostra link a ordine di lavoro', async () => {
    mockFetch.mockResolvedValue(
      makeOkResponse({ ...baseEstimate, status: 'CONVERTED', workOrderId: 'wo-99' }),
    )
    render(<EstimateDetailPage />)
    await waitFor(() =>
      expect(screen.getByText("Vai all'Ordine di Lavoro")).toBeInTheDocument(),
    )
    expect(screen.getByRole('link')).toHaveAttribute('href', '/dashboard/work-orders/wo-99')
  })

  // --- performAction ---

  it('performAction send chiama toast.success', async () => {
    mockFetch
      .mockResolvedValueOnce(makeOkResponse(baseEstimate)) // initial fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) }) // POST send
      .mockResolvedValueOnce(makeOkResponse(baseEstimate)) // refetch
    render(<EstimateDetailPage />)
    await waitFor(() => screen.getByText('Invia al cliente'))
    fireEvent.click(screen.getByText('Invia al cliente'))
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Preventivo inviato al cliente'),
    )
  })

  it('performAction accept chiama toast.success', async () => {
    mockFetch
      .mockResolvedValueOnce(makeOkResponse({ ...baseEstimate, status: 'SENT' }))
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce(makeOkResponse({ ...baseEstimate, status: 'SENT' }))
    render(<EstimateDetailPage />)
    await waitFor(() => screen.getByText('Segna accettato'))
    fireEvent.click(screen.getByText('Segna accettato'))
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Preventivo segnato come accettato'),
    )
  })

  it('performAction reject chiama toast.success', async () => {
    mockFetch
      .mockResolvedValueOnce(makeOkResponse({ ...baseEstimate, status: 'SENT' }))
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce(makeOkResponse({ ...baseEstimate, status: 'SENT' }))
    render(<EstimateDetailPage />)
    await waitFor(() => screen.getByText('Segna rifiutato'))
    fireEvent.click(screen.getByText('Segna rifiutato'))
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Preventivo segnato come rifiutato'),
    )
  })

  it('performAction convert-to-work-order chiama toast.success', async () => {
    mockFetch
      .mockResolvedValueOnce(makeOkResponse({ ...baseEstimate, status: 'ACCEPTED' }))
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce(makeOkResponse({ ...baseEstimate, status: 'ACCEPTED' }))
    render(<EstimateDetailPage />)
    await waitFor(() => screen.getByText('Converti in Ordine di Lavoro'))
    fireEvent.click(screen.getByText('Converti in Ordine di Lavoro'))
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        'Preventivo convertito in ordine di lavoro',
      ),
    )
  })

  it('performAction error mostra actionError e toast.error', async () => {
    mockFetch
      .mockResolvedValueOnce(makeOkResponse(baseEstimate))
      .mockResolvedValueOnce(makeErrResponse('Operazione fallita'))
    render(<EstimateDetailPage />)
    await waitFor(() => screen.getByText('Invia al cliente'))
    fireEvent.click(screen.getByText('Invia al cliente'))
    await waitFor(() => expect(screen.getByText('Operazione fallita')).toBeInTheDocument())
    expect(toast.error).toHaveBeenCalledWith('Operazione fallita')
  })

  // --- handleDelete ---

  it('Elimina apre ConfirmDialog', async () => {
    render(<EstimateDetailPage />)
    await waitFor(() => screen.getByText('Elimina'))
    fireEvent.click(screen.getByText('Elimina'))
    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument()
  })

  it('Annulla dialog chiude il dialog', async () => {
    render(<EstimateDetailPage />)
    await waitFor(() => screen.getByText('Elimina'))
    fireEvent.click(screen.getByText('Elimina'))
    fireEvent.click(screen.getByText('Annulla dialog'))
    expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument()
  })

  it('handleDelete success chiama router.push', async () => {
    mockFetch
      .mockResolvedValueOnce(makeOkResponse(baseEstimate))
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
    render(<EstimateDetailPage />)
    await waitFor(() => screen.getByText('Elimina'))
    fireEvent.click(screen.getByText('Elimina'))
    fireEvent.click(screen.getByText('Conferma eliminazione'))
    await waitFor(() =>
      expect(mockRouterPush).toHaveBeenCalledWith('/dashboard/estimates'),
    )
    expect(toast.success).toHaveBeenCalledWith('Preventivo eliminato')
  })

  it('handleDelete error mostra toast.error', async () => {
    mockFetch
      .mockResolvedValueOnce(makeOkResponse(baseEstimate))
      .mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({}) })
    render(<EstimateDetailPage />)
    await waitFor(() => screen.getByText('Elimina'))
    fireEvent.click(screen.getByText('Elimina'))
    fireEvent.click(screen.getByText('Conferma eliminazione'))
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
  })

  // --- Lines ---

  it('renderizza righe tipo LABOR come LAV', async () => {
    mockFetch.mockResolvedValue(
      makeOkResponse({
        ...baseEstimate,
        lines: [
          { id: 'l1', type: 'LABOR', description: 'Cambio olio', quantity: 1, unitPrice: 100, taxRate: 22, total: 100 },
        ],
      }),
    )
    render(<EstimateDetailPage />)
    await waitFor(() => expect(screen.getByText('LAV')).toBeInTheDocument())
    expect(screen.getByText('Cambio olio')).toBeInTheDocument()
  })

  it('renderizza righe tipo PART come RIC', async () => {
    mockFetch.mockResolvedValue(
      makeOkResponse({
        ...baseEstimate,
        lines: [
          { id: 'l2', type: 'PART', description: 'Filtro olio', quantity: 2, unitPrice: 50, taxRate: 22, total: 100 },
        ],
      }),
    )
    render(<EstimateDetailPage />)
    await waitFor(() => expect(screen.getByText('RIC')).toBeInTheDocument())
  })

  // --- Breadcrumb & print ---

  it('renderizza breadcrumb', async () => {
    render(<EstimateDetailPage />)
    await waitFor(() => screen.getByText('PRE-001'))
    expect(screen.getByTestId('breadcrumb')).toBeInTheDocument()
  })

  it('Stampa chiama window.print', async () => {
    const mockPrint = jest.fn()
    window.print = mockPrint
    render(<EstimateDetailPage />)
    await waitFor(() => screen.getByText('Stampa'))
    fireEvent.click(screen.getByText('Stampa'))
    expect(mockPrint).toHaveBeenCalled()
  })
})
