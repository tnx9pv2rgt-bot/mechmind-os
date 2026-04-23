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
  const filterMotionProps = ({ children, variants, initial, animate, exit, whileHover, whileTap, custom, transition, layout, layoutId, ...rest }: Record<string, unknown>) =>
    ({ ...rest, children })
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
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
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

jest.mock('@/components/ui/input', () => {
  const React = require('react')
  const Input = React.forwardRef(
    (props: React.InputHTMLAttributes<HTMLInputElement>, ref: React.Ref<HTMLInputElement>) =>
      React.createElement('input', { ...props, ref }),
  )
  Input.displayName = 'Input'
  return { Input }
})

jest.mock('@/components/ui/pagination', () => ({
  Pagination: ({
    page,
    totalPages,
    onPageChange,
  }: {
    page: number
    totalPages: number
    onPageChange: (p: number) => void
  }) =>
    React.createElement(
      'div',
      { 'data-testid': 'pagination' },
      React.createElement('span', null, `${page}/${totalPages}`),
      totalPages > 1
        ? React.createElement('button', { onClick: () => onPageChange(page + 1) }, 'Pagina successiva')
        : null,
    ),
}))

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

jest.mock('@/lib/swr-fetcher', () => ({ fetcher: jest.fn() }))

const mockMutateEstimates = jest.fn()
const mockMutateStats = jest.fn()
const mockUseSWR = jest.fn()

jest.mock('swr', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockUseSWR(...args),
}))

import EstimatesPage from '@/app/dashboard/estimates/page'
import { toast } from 'sonner'

const baseEstimate = {
  id: 'est-1',
  number: 'PRE-001',
  customerName: 'Mario Rossi',
  vehiclePlate: 'AA123BB',
  vehicleBrand: 'Fiat',
  vehicleModel: 'Punto',
  total: 500,
  status: 'DRAFT',
  createdAt: '2026-01-01T10:00:00Z',
  expiresAt: '2026-02-01T10:00:00Z',
}

const baseStats = { total: 10, pending: 3, accepted: 5, conversionRate: 50 }

function setupSWR(
  estimates: object | null = { data: [baseEstimate] },
  stats: object | null = { data: baseStats },
  estimatesError?: Error,
  statsError?: Error,
  loading = false,
) {
  mockUseSWR.mockImplementation((key: string) => {
    if (key === '/api/estimates') {
      return {
        data: estimates ?? undefined,
        error: estimatesError,
        isLoading: loading,
        mutate: mockMutateEstimates,
      }
    }
    if (key === '/api/estimates/stats') {
      return {
        data: stats ?? undefined,
        error: statsError,
        isLoading: loading,
        mutate: mockMutateStats,
      }
    }
    return { data: undefined, error: undefined, isLoading: false, mutate: jest.fn() }
  })
}

describe('EstimatesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setupSWR()
  })

  // --- Header ---

  it('renderizza titolo Preventivi', () => {
    render(<EstimatesPage />)
    expect(screen.getByText('Preventivi')).toBeInTheDocument()
  })

  it('Nuovo Preventivo naviga a /dashboard/estimates/new', () => {
    render(<EstimatesPage />)
    fireEvent.click(screen.getByText('Nuovo Preventivo'))
    expect(mockRouterPush).toHaveBeenCalledWith('/dashboard/estimates/new')
  })

  // --- Stats ---

  it('mostra valori nelle stats card', () => {
    render(<EstimatesPage />)
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('mostra etichette stats card', () => {
    render(<EstimatesPage />)
    expect(screen.getByText('Totale Preventivi')).toBeInTheDocument()
    expect(screen.getByText('In Attesa')).toBeInTheDocument()
    expect(screen.getByText('Accettati')).toBeInTheDocument()
    expect(screen.getByText('Tasso Conversione')).toBeInTheDocument()
  })

  it('mostra "..." durante il caricamento', () => {
    setupSWR(null, null, undefined, undefined, true)
    render(<EstimatesPage />)
    const dots = screen.getAllByText('...')
    expect(dots.length).toBeGreaterThanOrEqual(4)
  })

  // --- Error state ---

  it('mostra error state quando estimatesError', () => {
    setupSWR(null, { data: baseStats }, new Error('network'))
    render(<EstimatesPage />)
    expect(screen.getByText('Impossibile caricare i preventivi')).toBeInTheDocument()
  })

  it('mostra error state quando statsError', () => {
    setupSWR({ data: [] }, null, undefined, new Error('network'))
    render(<EstimatesPage />)
    expect(screen.getByText('Impossibile caricare i preventivi')).toBeInTheDocument()
  })

  it('Riprova in error state chiama entrambe le mutate', () => {
    setupSWR(null, null, new Error('err'))
    render(<EstimatesPage />)
    fireEvent.click(screen.getByText('Riprova'))
    expect(mockMutateEstimates).toHaveBeenCalled()
    expect(mockMutateStats).toHaveBeenCalled()
  })

  // --- Loading spinner in list ---

  it('mostra spinner durante il caricamento della lista', () => {
    setupSWR(null, null, undefined, undefined, true)
    render(<EstimatesPage />)
    expect(document.querySelector('[data-icon="Loader2"]')).toBeTruthy()
  })

  // --- Empty state ---

  it('mostra empty state quando nessun preventivo', () => {
    setupSWR({ data: [] })
    render(<EstimatesPage />)
    expect(screen.getByText('Nessun preventivo. Crea il primo preventivo.')).toBeInTheDocument()
  })

  it('Crea il primo preventivo naviga a new', () => {
    setupSWR({ data: [] })
    render(<EstimatesPage />)
    fireEvent.click(screen.getByText('Crea il primo preventivo'))
    expect(mockRouterPush).toHaveBeenCalledWith('/dashboard/estimates/new')
  })

  // --- List rendering ---

  it('renderizza stima nella lista con numero e cliente', () => {
    render(<EstimatesPage />)
    expect(screen.getByText('PRE-001')).toBeInTheDocument()
    expect(screen.getByText(/Mario Rossi/)).toBeInTheDocument()
  })

  it('mostra badge status DRAFT', () => {
    render(<EstimatesPage />)
    expect(screen.getAllByText('Bozza').length).toBeGreaterThanOrEqual(1)
  })

  it('mostra badge status SENT', () => {
    setupSWR({ data: [{ ...baseEstimate, status: 'SENT' }] })
    render(<EstimatesPage />)
    expect(screen.getAllByText('Inviato').length).toBeGreaterThanOrEqual(1)
  })

  it('mostra badge status ACCEPTED', () => {
    setupSWR({ data: [{ ...baseEstimate, status: 'ACCEPTED' }] })
    render(<EstimatesPage />)
    expect(screen.getAllByText('Accettato').length).toBeGreaterThanOrEqual(1)
  })

  it('mostra badge status REJECTED', () => {
    setupSWR({ data: [{ ...baseEstimate, status: 'REJECTED' }] })
    render(<EstimatesPage />)
    expect(screen.getAllByText('Rifiutato').length).toBeGreaterThanOrEqual(1)
  })

  it('mostra badge status EXPIRED', () => {
    setupSWR({ data: [{ ...baseEstimate, status: 'EXPIRED' }] })
    render(<EstimatesPage />)
    expect(screen.getAllByText('Scaduto').length).toBeGreaterThanOrEqual(1)
  })

  it('mostra badge status CONVERTED', () => {
    setupSWR({ data: [{ ...baseEstimate, status: 'CONVERTED' }] })
    render(<EstimatesPage />)
    expect(screen.getAllByText('Convertito').length).toBeGreaterThanOrEqual(1)
  })

  it('Visualizza naviga alla pagina di dettaglio', () => {
    render(<EstimatesPage />)
    fireEvent.click(screen.getByText('Visualizza'))
    expect(mockRouterPush).toHaveBeenCalledWith('/dashboard/estimates/est-1')
  })

  it('DRAFT mostra pulsante Invia', () => {
    render(<EstimatesPage />)
    expect(screen.getByText('Invia')).toBeInTheDocument()
  })

  it('SENT non mostra pulsante Invia', () => {
    setupSWR({ data: [{ ...baseEstimate, status: 'SENT' }] })
    render(<EstimatesPage />)
    expect(screen.queryByText('Invia')).not.toBeInTheDocument()
  })

  it('mostra Pagination quando ci sono risultati', () => {
    render(<EstimatesPage />)
    expect(screen.getByTestId('pagination')).toBeInTheDocument()
  })

  // --- handleSend ---

  it('handleSend success chiama mutate e toast.success', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true })
    render(<EstimatesPage />)
    fireEvent.click(screen.getByText('Invia'))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Preventivo inviato con successo'))
    expect(mockMutateEstimates).toHaveBeenCalled()
    expect(mockMutateStats).toHaveBeenCalled()
  })

  it('handleSend error mostra toast.error', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false })
    render(<EstimatesPage />)
    fireEvent.click(screen.getByText('Invia'))
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
  })

  // --- Filters ---

  it('ricerca per numero filtra la lista', () => {
    setupSWR({
      data: [
        { ...baseEstimate, id: 'e1', number: 'PRE-001', customerName: 'Mario Rossi' },
        { ...baseEstimate, id: 'e2', number: 'PRE-002', customerName: 'Luigi Verdi' },
      ],
    })
    render(<EstimatesPage />)
    fireEvent.change(screen.getByPlaceholderText('Cerca per numero o cliente...'), {
      target: { value: 'PRE-001' },
    })
    expect(screen.getByText('PRE-001')).toBeInTheDocument()
    expect(screen.queryByText('PRE-002')).not.toBeInTheDocument()
  })

  it('ricerca per nome cliente filtra la lista', () => {
    setupSWR({
      data: [
        { ...baseEstimate, id: 'e1', number: 'PRE-001', customerName: 'Mario Rossi' },
        { ...baseEstimate, id: 'e2', number: 'PRE-002', customerName: 'Luigi Verdi' },
      ],
    })
    render(<EstimatesPage />)
    fireEvent.change(screen.getByPlaceholderText('Cerca per numero o cliente...'), {
      target: { value: 'Luigi' },
    })
    expect(screen.queryByText('PRE-001')).not.toBeInTheDocument()
    expect(screen.getByText('PRE-002')).toBeInTheDocument()
  })

  it('filtro per status ACCEPTED mostra solo accettati', () => {
    setupSWR({
      data: [
        { ...baseEstimate, id: 'e1', number: 'PRE-001', status: 'DRAFT' },
        { ...baseEstimate, id: 'e2', number: 'PRE-002', status: 'ACCEPTED' },
      ],
    })
    render(<EstimatesPage />)
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'ACCEPTED' } })
    expect(screen.queryByText('PRE-001')).not.toBeInTheDocument()
    expect(screen.getByText('PRE-002')).toBeInTheDocument()
  })

  it('filtro ALL mostra tutte le stime', () => {
    setupSWR({
      data: [
        { ...baseEstimate, id: 'e1', number: 'PRE-001', status: 'DRAFT' },
        { ...baseEstimate, id: 'e2', number: 'PRE-002', status: 'SENT' },
      ],
    })
    render(<EstimatesPage />)
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'DRAFT' } })
    expect(screen.queryByText('PRE-002')).not.toBeInTheDocument()
    fireEvent.change(select, { target: { value: 'ALL' } })
    expect(screen.getByText('PRE-001')).toBeInTheDocument()
    expect(screen.getByText('PRE-002')).toBeInTheDocument()
  })

  it('mostra id troncato quando number è assente', () => {
    setupSWR({ data: [{ ...baseEstimate, number: '' }] })
    render(<EstimatesPage />)
    expect(screen.getByText('#est-1'.slice(0, 9))).toBeInTheDocument()
  })
})
