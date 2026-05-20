import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

// ── framer-motion ──────────────────────────────────────────────────────────────
jest.mock('framer-motion', () => {
  const React = require('react')
  return {
    motion: new Proxy({}, {
      get: (_t: unknown, prop: string) =>
        React.forwardRef(({ children, ...rest }: { children?: React.ReactNode; [k: string]: unknown }, ref: React.Ref<HTMLElement>) => {
          const allowed = ['className', 'style', 'onClick', 'id', 'role']
          const valid: Record<string, unknown> = {}
          for (const k of Object.keys(rest)) {
            if (allowed.includes(k) || k.startsWith('data-') || k.startsWith('aria-')) valid[k] = rest[k]
          }
          const tag = ['div', 'span', 'section', 'header', 'ul', 'li', 'p'].includes(prop) ? prop : 'div'
          return React.createElement(tag, { ...valid, ref }, children)
        }),
    }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  }
})

// ── lucide-react ───────────────────────────────────────────────────────────────
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

// ── next/navigation ────────────────────────────────────────────────────────────
const mockPush = jest.fn()
let mockSearchParamsStr = ''
jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'wo-123' }),
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(mockSearchParamsStr),
}))

// ── next/link ─────────────────────────────────────────────────────────────────
jest.mock('next/link', () => {
  const React = require('react')
  return ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href }, children)
})

// ── sonner ────────────────────────────────────────────────────────────────────
jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

// ── swr-fetcher ────────────────────────────────────────────────────────────────
jest.mock('@/lib/swr-fetcher', () => ({ fetcher: jest.fn() }))

// ── UI components ──────────────────────────────────────────────────────────────
jest.mock('@/components/ui/apple-button', () => ({
  AppleButton: ({ children, onClick, variant, size, icon, loading, disabled, 'aria-label': ariaLabel }: {
    children?: React.ReactNode; onClick?: () => void; variant?: string
    size?: string; icon?: React.ReactNode; loading?: boolean; disabled?: boolean
    'aria-label'?: string
  }) =>
    React.createElement('button', { onClick, 'data-variant': variant, 'data-loading': loading, disabled, 'aria-label': ariaLabel }, icon, children),
}))

jest.mock('@/components/ui/apple-card', () => ({
  AppleCard: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'apple-card' }, children),
  AppleCardContent: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'apple-card-content' }, children),
  AppleCardHeader: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'apple-card-header' }, children),
}))

jest.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) =>
    React.createElement('input', props),
}))

jest.mock('@/components/ui/breadcrumb', () => ({
  Breadcrumb: ({ items }: { items: { label: string; href?: string }[] }) =>
    React.createElement('nav', {}, items.map((i, idx) =>
      React.createElement('span', { key: idx }, i.label)
    )),
}))

jest.mock('@/components/ui/confirm-dialog', () => ({
  ConfirmDialog: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'confirm-dialog' }, children),
}))

jest.mock('@/components/patterns/error-state', () => ({
  ErrorState: ({ title, onRetry, variant }: { title: string; onRetry?: () => void; variant?: string }) =>
    React.createElement('div', { 'data-testid': 'error-state' },
      React.createElement('span', {}, title),
      onRetry && React.createElement('button', { onClick: onRetry }, 'Riprova'),
    ),
}))

jest.mock('@/components/patterns/loading-skeleton', () => ({
  DetailSkeleton: () => React.createElement('div', { 'data-testid': 'detail-skeleton' }),
}))

jest.mock('@/components/patterns/empty-state', () => ({
  EmptyState: ({ title, description }: { title: string; description?: string }) =>
    React.createElement('div', { 'data-testid': 'empty-state' },
      React.createElement('span', {}, title),
    ),
}))

// ── utils ──────────────────────────────────────────────────────────────────────
jest.mock('@/lib/utils/format', () => ({
  formatCurrency: (n: number) => `€${n.toFixed(2)}`,
  formatDate: (d: string) => d,
  formatDateTime: (d: string) => d,
  formatPlate: (p: string) => p,
}))

// ── swr ───────────────────────────────────────────────────────────────────────
let mockSWRData: unknown = undefined
let mockSWRError: unknown = undefined
let mockSWRLoading = false
const mockMutate = jest.fn()

jest.mock('swr', () => ({
  __esModule: true,
  default: (_key: unknown, _fetcher: unknown) => ({
    data: mockSWRData,
    error: mockSWRError,
    isLoading: mockSWRLoading,
    mutate: mockMutate,
  }),
}))

import WorkOrderDetailPage from '@/app/dashboard/work-orders/[id]/page'
import { toast } from 'sonner'

const MOCK_WO = {
  id: 'wo-123',
  woNumber: 'WO-001',
  status: 'OPEN',
  priority: 'NORMAL',
  vehicleId: 'v-1',
  vehicleMake: 'Fiat',
  vehicleModel: '500',
  vehiclePlate: 'AB123CD',
  vehicleYear: 2020,
  vehicleVin: 'WF0XXXGCE3HG30831',
  customerId: 'c-1',
  customerName: 'Mario Rossi',
  customerPhone: '+39 333 1234567',
  customerEmail: 'mario@example.com',
  technicianName: 'Luca Bianchi',
  diagnosis: 'Pastiglie consumate',
  customerRequest: 'Rumore freni',
  notes: 'Controllare anche olio',
  estimatedHours: 2,
  actualHours: 1.5,
  mileageIn: 125000,
  mileageOut: undefined,
  totalCost: 250,
  laborItems: [
    { id: 'l-1', description: 'Sostituzione pastiglie', hours: 1, costPerHour: 80 },
  ],
  partItems: [
    { id: 'p-1', name: 'Pastiglie freno', quantity: 2, unitCost: 45 },
  ],
  photos: [],
  timeEntries: [],
  auditLog: [],
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
}

beforeEach(() => {
  jest.clearAllMocks()
  mockSWRData = undefined
  mockSWRError = undefined
  mockSWRLoading = false
  mockSearchParamsStr = ''
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({}),
  }) as jest.Mock
})

describe('WorkOrderDetailPage', () => {
  describe('loading state', () => {
    it('renders loading skeleton when loading', () => {
      mockSWRLoading = true
      const { container } = render(<WorkOrderDetailPage />)
      expect(container.querySelector('[data-icon="Loader2"]')).toBeInTheDocument()
    })
  })

  describe('error state', () => {
    it('renders error state when SWR fails', () => {
      mockSWRError = new Error('Not found')
      render(<WorkOrderDetailPage />)
      expect(screen.getByTestId('error-state')).toBeInTheDocument()
    })

    it('renders error state when no data', () => {
      mockSWRData = null
      render(<WorkOrderDetailPage />)
      expect(screen.getByTestId('error-state')).toBeInTheDocument()
    })

    it('shows not found message', () => {
      mockSWRError = new Error('Not found')
      render(<WorkOrderDetailPage />)
      expect(screen.getByText('Ordine di lavoro non trovato')).toBeInTheDocument()
    })

    it('calls mutate when retry clicked', () => {
      mockSWRError = new Error('Not found')
      render(<WorkOrderDetailPage />)
      fireEvent.click(screen.getByText('Riprova'))
      expect(mockMutate).toHaveBeenCalled()
    })
  })

  describe('detail view', () => {
    beforeEach(() => {
      mockSWRData = MOCK_WO
    })

    it('renders OdL number in header', () => {
      render(<WorkOrderDetailPage />)
      expect(screen.getAllByText(/WO-001/).length).toBeGreaterThan(0)
    })

    it('renders status badge', () => {
      render(<WorkOrderDetailPage />)
      expect(screen.getAllByText('Aperto').length).toBeGreaterThan(0)
    })

    it('renders priority label', () => {
      render(<WorkOrderDetailPage />)
      expect(screen.getAllByText('Normale').length).toBeGreaterThan(0)
    })

    it('renders customer name in sidebar', () => {
      render(<WorkOrderDetailPage />)
      expect(screen.getAllByText('Mario Rossi').length).toBeGreaterThan(0)
    })

    it('renders vehicle plate', () => {
      render(<WorkOrderDetailPage />)
      expect(screen.getAllByText(/AB123CD/).length).toBeGreaterThan(0)
    })

    it('renders Riepilogo Costi', () => {
      render(<WorkOrderDetailPage />)
      expect(screen.getByText('Riepilogo Costi')).toBeInTheDocument()
    })

    it('renders breadcrumb with OdL path', () => {
      render(<WorkOrderDetailPage />)
      expect(screen.getByText('OdL')).toBeInTheDocument()
    })

    it('shows Avanza button for OPEN status', () => {
      render(<WorkOrderDetailPage />)
      expect(screen.getByText(/Avanza a/)).toBeInTheDocument()
    })

    it('shows Check-in button when mileageIn is null', () => {
      mockSWRData = { ...MOCK_WO, mileageIn: undefined }
      render(<WorkOrderDetailPage />)
      expect(screen.getByText('Check-in')).toBeInTheDocument()
    })

    it('shows PDF button', () => {
      render(<WorkOrderDetailPage />)
      expect(screen.getByText('PDF')).toBeInTheDocument()
    })

    it('opens PDF in new tab when PDF clicked', () => {
      const mockOpen = jest.fn()
      global.open = mockOpen
      render(<WorkOrderDetailPage />)
      fireEvent.click(screen.getByText('PDF'))
      expect(mockOpen).toHaveBeenCalledWith('/api/dashboard/work-orders/wo-123/pdf', '_blank')
    })

    it('renders tab navigation', () => {
      render(<WorkOrderDetailPage />)
      expect(screen.getByText('Dettagli')).toBeInTheDocument()
      expect(screen.getByText('Lavorazioni')).toBeInTheDocument()
      expect(screen.getAllByText('Ricambi').length).toBeGreaterThan(0)
    })

    it('renders state machine stepper steps', () => {
      render(<WorkOrderDetailPage />)
      expect(screen.getAllByText('Bozza').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Completato').length).toBeGreaterThan(0)
    })
  })

  describe('with wrapped data response', () => {
    it('handles { data: workOrder } format', () => {
      mockSWRData = { data: MOCK_WO }
      render(<WorkOrderDetailPage />)
      expect(screen.getAllByText(/WO-001/).length).toBeGreaterThan(0)
    })
  })

  describe('dettagli tab', () => {
    beforeEach(() => {
      mockSWRData = MOCK_WO
    })

    it('renders diagnosis section', () => {
      render(<WorkOrderDetailPage />)
      expect(screen.getByText('Diagnosi e Richiesta')).toBeInTheDocument()
    })

    it('renders diagnosis content', () => {
      render(<WorkOrderDetailPage />)
      expect(screen.getByText('Pastiglie consumate')).toBeInTheDocument()
    })

    it('renders customer request', () => {
      render(<WorkOrderDetailPage />)
      expect(screen.getByText('Rumore freni')).toBeInTheDocument()
    })

    it('renders notes when present', () => {
      render(<WorkOrderDetailPage />)
      expect(screen.getByText('Controllare anche olio')).toBeInTheDocument()
    })

    it('renders Assegnazione section', () => {
      render(<WorkOrderDetailPage />)
      expect(screen.getByText('Assegnazione')).toBeInTheDocument()
    })

    it('shows estimated hours', () => {
      render(<WorkOrderDetailPage />)
      expect(screen.getByText('2 h')).toBeInTheDocument()
    })

    it('shows customer phone', () => {
      render(<WorkOrderDetailPage />)
      expect(screen.getByText('+39 333 1234567')).toBeInTheDocument()
    })

    it('shows mileage in km', () => {
      render(<WorkOrderDetailPage />)
      expect(screen.getByText(/125\.000|125,000|125000/)).toBeInTheDocument()
    })
  })

  describe('tab switching', () => {
    beforeEach(() => {
      mockSWRData = MOCK_WO
    })

    it('switches to lavorazioni tab', () => {
      render(<WorkOrderDetailPage />)
      const tab = screen.getByText('Lavorazioni')
      fireEvent.click(tab)
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('tab=lavorazioni'))
    })

    it('switches to ricambi tab', () => {
      render(<WorkOrderDetailPage />)
      const ricambiButtons = screen.getAllByText('Ricambi')
      const tabButton = ricambiButtons.find(el => el.closest('button'))
      fireEvent.click(tabButton!.closest('button')!)
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('tab=ricambi'))
    })

    it('switches to timer tab', () => {
      render(<WorkOrderDetailPage />)
      fireEvent.click(screen.getByText('Timer'))
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('tab=timer'))
    })
  })

  describe('lavorazioni tab', () => {
    beforeEach(() => {
      mockSearchParamsStr = 'tab=lavorazioni'
      mockSWRData = MOCK_WO
    })

    it('renders labor items when tab is lavorazioni', () => {
      render(<WorkOrderDetailPage />)
      expect(screen.getByDisplayValue('Sostituzione pastiglie')).toBeInTheDocument()
    })
  })

  describe('transition', () => {
    beforeEach(() => {
      mockSWRData = MOCK_WO
    })

    it('calls transition API when advance button clicked', async () => {
      render(<WorkOrderDetailPage />)
      const advanceBtn = screen.getByText(/Avanza a/)
      await act(async () => { fireEvent.click(advanceBtn) })
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/dashboard/work-orders/wo-123/transition',
        expect.objectContaining({ method: 'PATCH' })
      )
    })

    it('shows success toast after transition', async () => {
      render(<WorkOrderDetailPage />)
      const advanceBtn = screen.getByText(/Avanza a/)
      await act(async () => { fireEvent.click(advanceBtn) })
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled()
      })
    })

    it('shows error toast when transition fails', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Transizione non consentita' }),
      })
      render(<WorkOrderDetailPage />)
      const advanceBtn = screen.getByText(/Avanza a/)
      await act(async () => { fireEvent.click(advanceBtn) })
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Transizione non consentita')
      })
    })
  })

  describe('generate invoice', () => {
    it('shows Genera Fattura button for COMPLETED status', () => {
      mockSWRData = { ...MOCK_WO, status: 'COMPLETED' }
      render(<WorkOrderDetailPage />)
      expect(screen.getByText('Genera Fattura')).toBeInTheDocument()
    })

    it('calls invoice API when button clicked', async () => {
      mockSWRData = { ...MOCK_WO, status: 'COMPLETED' }
      render(<WorkOrderDetailPage />)
      await act(async () => { fireEvent.click(screen.getByText('Genera Fattura')) })
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/dashboard/work-orders/wo-123/invoice',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  describe('check-in modal', () => {
    beforeEach(() => {
      mockSWRData = { ...MOCK_WO, mileageIn: undefined }
    })

    it('opens check-in modal when button clicked', () => {
      render(<WorkOrderDetailPage />)
      fireEvent.click(screen.getByText('Check-in'))
      expect(screen.getByText('Check-in Veicolo')).toBeInTheDocument()
    })

    it('closes check-in modal when Annulla clicked', () => {
      render(<WorkOrderDetailPage />)
      fireEvent.click(screen.getByText('Check-in'))
      fireEvent.click(screen.getByText('Annulla'))
      expect(screen.queryByText('Check-in Veicolo')).not.toBeInTheDocument()
    })

    it('shows validation error when mileageIn is missing', async () => {
      render(<WorkOrderDetailPage />)
      fireEvent.click(screen.getByText('Check-in'))
      await act(async () => {
        fireEvent.click(screen.getByText('Conferma Check-in'))
      })
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Chilometraggio obbligatorio')
      })
    })

    it('submits check-in with mileageIn', async () => {
      render(<WorkOrderDetailPage />)
      fireEvent.click(screen.getByText('Check-in'))
      const mileageInput = screen.getByPlaceholderText('es. 125000')
      fireEvent.change(mileageInput, { target: { value: '130000' } })
      await act(async () => {
        fireEvent.click(screen.getByText('Conferma Check-in'))
      })
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/dashboard/work-orders/wo-123/check-in',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  describe('check-out modal', () => {
    beforeEach(() => {
      mockSWRData = { ...MOCK_WO, status: 'COMPLETED', mileageIn: 125000, mileageOut: undefined }
    })

    it('opens check-out modal when button clicked', () => {
      render(<WorkOrderDetailPage />)
      expect(screen.getByText('Check-out')).toBeInTheDocument()
      fireEvent.click(screen.getByText('Check-out'))
      expect(screen.getByText('Check-out Veicolo')).toBeInTheDocument()
    })

    it('validates mileageOut required', async () => {
      render(<WorkOrderDetailPage />)
      fireEvent.click(screen.getByText('Check-out'))
      await act(async () => {
        fireEvent.click(screen.getByText('Conferma Check-out'))
      })
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Chilometraggio obbligatorio')
      })
    })
  })

  describe('cost summary', () => {
    it('computes labor total', () => {
      mockSWRData = MOCK_WO
      render(<WorkOrderDetailPage />)
      expect(screen.getByText('Manodopera')).toBeInTheDocument()
    })

    it('computes parts total', () => {
      mockSWRData = MOCK_WO
      render(<WorkOrderDetailPage />)
      expect(screen.getAllByText('Ricambi').length).toBeGreaterThan(0)
    })

    it('shows grand total', () => {
      mockSWRData = MOCK_WO
      render(<WorkOrderDetailPage />)
      expect(screen.getByText('Totale')).toBeInTheDocument()
    })
  })

  describe('no customer/vehicle', () => {
    it('renders without customer sidebar when no customerName', () => {
      mockSWRData = { ...MOCK_WO, customerName: undefined }
      render(<WorkOrderDetailPage />)
      expect(screen.queryByText('Cliente')).not.toBeInTheDocument()
    })

    it('renders without vehicle sidebar when no vehiclePlate', () => {
      mockSWRData = { ...MOCK_WO, vehiclePlate: undefined }
      render(<WorkOrderDetailPage />)
      expect(screen.queryByText('Veicolo')).not.toBeInTheDocument()
    })
  })

  describe('status variants', () => {
    it('shows DELIVERED status', () => {
      mockSWRData = { ...MOCK_WO, status: 'DELIVERED' }
      render(<WorkOrderDetailPage />)
      expect(screen.getAllByText('Consegnato').length).toBeGreaterThan(0)
    })

    it('shows CANCELLED status', () => {
      mockSWRData = { ...MOCK_WO, status: 'CANCELLED' }
      render(<WorkOrderDetailPage />)
      expect(screen.getAllByText('Annullato').length).toBeGreaterThan(0)
    })

    it('does not show advance button for DELIVERED', () => {
      mockSWRData = { ...MOCK_WO, status: 'DELIVERED' }
      render(<WorkOrderDetailPage />)
      expect(screen.queryByText(/Avanza a/)).not.toBeInTheDocument()
    })
  })
})

describe('LaborTab (tab=lavorazioni)', () => {
  beforeEach(() => {
    mockSearchParamsStr = 'tab=lavorazioni'
    mockSWRData = { ...MOCK_WO, laborItems: [] }
  })

  it('shows empty labor state', () => {
    render(<WorkOrderDetailPage />)
    expect(screen.getByText('Nessuna voce di manodopera')).toBeInTheDocument()
  })

  it('shows Aggiungi lavorazione button', () => {
    render(<WorkOrderDetailPage />)
    expect(screen.getByText('Aggiungi lavorazione')).toBeInTheDocument()
  })

  it('adds a labor row when button clicked', async () => {
    render(<WorkOrderDetailPage />)
    fireEvent.click(screen.getByText('Aggiungi lavorazione'))
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Descrizione')).toBeInTheDocument()
    })
  })

  it('shows existing labor items', () => {
    mockSWRData = MOCK_WO
    render(<WorkOrderDetailPage />)
    expect(screen.getByDisplayValue('Sostituzione pastiglie')).toBeInTheDocument()
  })

  it('updates labor item description', () => {
    mockSWRData = MOCK_WO
    render(<WorkOrderDetailPage />)
    const descInput = screen.getByDisplayValue('Sostituzione pastiglie')
    fireEvent.change(descInput, { target: { value: 'Cambio olio' } })
    expect(screen.getByDisplayValue('Cambio olio')).toBeInTheDocument()
  })

  it('updates labor item hours', () => {
    mockSWRData = MOCK_WO
    render(<WorkOrderDetailPage />)
    const hrsInput = screen.getByPlaceholderText('Ore')
    fireEvent.change(hrsInput, { target: { value: '3' } })
    expect((hrsInput as HTMLInputElement).value).toBe('3')
  })

  it('removes a labor item', () => {
    mockSWRData = MOCK_WO
    render(<WorkOrderDetailPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Rimuovi' }))
    expect(screen.queryByDisplayValue('Sostituzione pastiglie')).not.toBeInTheDocument()
  })

  it('shows Totale Manodopera', () => {
    mockSWRData = MOCK_WO
    render(<WorkOrderDetailPage />)
    expect(screen.getByText(/Totale Manodopera/)).toBeInTheDocument()
  })

  it('saves labor items on Salva click', async () => {
    mockSWRData = MOCK_WO
    render(<WorkOrderDetailPage />)
    await act(async () => { fireEvent.click(screen.getByText('Salva')) })
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/dashboard/work-orders/wo-123',
      expect.objectContaining({ method: 'PATCH' })
    )
  })

  it('shows success toast on labor save', async () => {
    mockSWRData = MOCK_WO
    render(<WorkOrderDetailPage />)
    await act(async () => { fireEvent.click(screen.getByText('Salva')) })
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Lavorazioni salvate'))
  })

  it('shows error toast on labor save failure', async () => {
    mockSWRData = MOCK_WO
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({}) })
    render(<WorkOrderDetailPage />)
    await act(async () => { fireEvent.click(screen.getByText('Salva')) })
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Errore durante il salvataggio delle lavorazioni'))
  })

  it('updates labor item costPerHour', () => {
    mockSWRData = MOCK_WO
    render(<WorkOrderDetailPage />)
    const rateInput = screen.getByPlaceholderText('EUR/h')
    fireEvent.change(rateInput, { target: { value: '100' } })
    expect((rateInput as HTMLInputElement).value).toBe('100')
  })
})

describe('PartsTab (tab=ricambi)', () => {
  beforeEach(() => {
    mockSearchParamsStr = 'tab=ricambi'
    mockSWRData = { ...MOCK_WO, partItems: [] }
  })

  it('shows empty parts state', () => {
    render(<WorkOrderDetailPage />)
    expect(screen.getByText('Nessun ricambio inserito')).toBeInTheDocument()
  })

  it('shows Aggiungi ricambio button', () => {
    render(<WorkOrderDetailPage />)
    expect(screen.getByText('Aggiungi ricambio')).toBeInTheDocument()
  })

  it('adds a part row when button clicked', async () => {
    render(<WorkOrderDetailPage />)
    fireEvent.click(screen.getByText('Aggiungi ricambio'))
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Nome ricambio')).toBeInTheDocument()
    })
  })

  it('shows existing part items', () => {
    mockSWRData = MOCK_WO
    render(<WorkOrderDetailPage />)
    expect(screen.getByDisplayValue('Pastiglie freno')).toBeInTheDocument()
  })

  it('updates part item name', () => {
    mockSWRData = MOCK_WO
    render(<WorkOrderDetailPage />)
    const nameInput = screen.getByDisplayValue('Pastiglie freno')
    fireEvent.change(nameInput, { target: { value: 'Filtro olio' } })
    expect(screen.getByDisplayValue('Filtro olio')).toBeInTheDocument()
  })

  it('updates part item quantity', () => {
    mockSWRData = MOCK_WO
    render(<WorkOrderDetailPage />)
    const qtyInput = screen.getByPlaceholderText('Qta')
    fireEvent.change(qtyInput, { target: { value: '4' } })
    expect((qtyInput as HTMLInputElement).value).toBe('4')
  })

  it('removes a part item', () => {
    mockSWRData = MOCK_WO
    render(<WorkOrderDetailPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Rimuovi' }))
    expect(screen.queryByDisplayValue('Pastiglie freno')).not.toBeInTheDocument()
  })

  it('shows Totale Ricambi', () => {
    mockSWRData = MOCK_WO
    render(<WorkOrderDetailPage />)
    expect(screen.getByText(/Totale Ricambi/)).toBeInTheDocument()
  })

  it('saves parts on Salva click', async () => {
    mockSWRData = MOCK_WO
    render(<WorkOrderDetailPage />)
    await act(async () => { fireEvent.click(screen.getByText('Salva')) })
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/dashboard/work-orders/wo-123',
      expect.objectContaining({ method: 'PATCH' })
    )
  })

  it('shows success toast on parts save', async () => {
    mockSWRData = MOCK_WO
    render(<WorkOrderDetailPage />)
    await act(async () => { fireEvent.click(screen.getByText('Salva')) })
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Ricambi salvati'))
  })

  it('shows error toast on parts save failure', async () => {
    mockSWRData = MOCK_WO
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({}) })
    render(<WorkOrderDetailPage />)
    await act(async () => { fireEvent.click(screen.getByText('Salva')) })
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Errore durante il salvataggio dei ricambi'))
  })

  it('updates part item unitCost', () => {
    mockSWRData = MOCK_WO
    render(<WorkOrderDetailPage />)
    const costInput = screen.getByPlaceholderText('EUR')
    fireEvent.change(costInput, { target: { value: '50' } })
    expect((costInput as HTMLInputElement).value).toBe('50')
  })
})

describe('TimerTab (tab=timer)', () => {
  beforeEach(() => {
    mockSearchParamsStr = 'tab=timer'
    mockSWRData = { ...MOCK_WO, timeEntries: [] }
  })

  it('shows timer display 00:00:00', () => {
    render(<WorkOrderDetailPage />)
    expect(screen.getByText('00:00:00')).toBeInTheDocument()
  })

  it('shows Avvia button when not running', () => {
    render(<WorkOrderDetailPage />)
    expect(screen.getByText('Avvia')).toBeInTheDocument()
  })

  it('calls timer API start when Avvia clicked', async () => {
    render(<WorkOrderDetailPage />)
    await act(async () => { fireEvent.click(screen.getByText('Avvia')) })
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/dashboard/work-orders/wo-123/timer',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('shows success toast when timer started', async () => {
    render(<WorkOrderDetailPage />)
    await act(async () => { fireEvent.click(screen.getByText('Avvia')) })
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Timer avviato'))
  })

  it('shows Ferma when timer is running (active entry)', () => {
    mockSWRData = {
      ...MOCK_WO,
      timeEntries: [{ id: 'te-1', start: new Date().toISOString() }],
    }
    render(<WorkOrderDetailPage />)
    expect(screen.getByText('Ferma')).toBeInTheDocument()
  })

  it('calls timer stop API when Ferma clicked', async () => {
    mockSWRData = {
      ...MOCK_WO,
      timeEntries: [{ id: 'te-1', start: new Date().toISOString() }],
    }
    render(<WorkOrderDetailPage />)
    await act(async () => { fireEvent.click(screen.getByText('Ferma')) })
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/dashboard/work-orders/wo-123/timer',
      expect.objectContaining({ method: 'POST', body: expect.stringContaining('"stop"') })
    )
  })

  it('shows success toast when timer stopped', async () => {
    mockSWRData = {
      ...MOCK_WO,
      timeEntries: [{ id: 'te-1', start: new Date().toISOString() }],
    }
    render(<WorkOrderDetailPage />)
    await act(async () => { fireEvent.click(screen.getByText('Ferma')) })
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Timer fermato'))
  })

  it('shows Registro Tempi when entries with end exist', () => {
    mockSWRData = {
      ...MOCK_WO,
      timeEntries: [
        { id: 'te-1', start: '2024-01-15T10:00:00Z', end: '2024-01-15T11:00:00Z', duration: 60, technicianName: 'Luca Bianchi' },
      ],
    }
    render(<WorkOrderDetailPage />)
    expect(screen.getByText('Registro Tempi')).toBeInTheDocument()
  })

  it('shows technician name in time entry', () => {
    mockSWRData = {
      ...MOCK_WO,
      timeEntries: [
        { id: 'te-1', start: '2024-01-15T10:00:00Z', end: '2024-01-15T11:00:00Z', duration: 60, technicianName: 'Luca Bianchi' },
      ],
    }
    render(<WorkOrderDetailPage />)
    expect(screen.getAllByText('Luca Bianchi').length).toBeGreaterThan(0)
  })

  it('shows error toast when timer action fails', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({}) })
    render(<WorkOrderDetailPage />)
    await act(async () => { fireEvent.click(screen.getByText('Avvia')) })
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Errore timer'))
  })
})

describe('PhotosTab (tab=foto)', () => {
  beforeEach(() => {
    mockSearchParamsStr = 'tab=foto'
  })

  it('shows empty state when no photos', () => {
    mockSWRData = { ...MOCK_WO, photos: [] }
    render(<WorkOrderDetailPage />)
    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
  })

  it('shows Nessuna foto in empty state', () => {
    mockSWRData = { ...MOCK_WO, photos: [] }
    render(<WorkOrderDetailPage />)
    expect(screen.getByText('Nessuna foto')).toBeInTheDocument()
  })

  it('renders photo grid when photos present', () => {
    mockSWRData = {
      ...MOCK_WO,
      photos: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
    }
    render(<WorkOrderDetailPage />)
    expect(document.querySelectorAll('img').length).toBe(2)
  })

  it('renders alt text for photos', () => {
    mockSWRData = {
      ...MOCK_WO,
      photos: ['https://example.com/photo1.jpg'],
    }
    render(<WorkOrderDetailPage />)
    expect(document.querySelector('img[alt="Foto 1"]')).toBeInTheDocument()
  })
})

describe('AuditTab (tab=storico)', () => {
  beforeEach(() => {
    mockSearchParamsStr = 'tab=storico'
  })

  it('shows empty state when no audit entries', () => {
    mockSWRData = { ...MOCK_WO, auditLog: [] }
    render(<WorkOrderDetailPage />)
    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
  })

  it('shows Nessuna attivita in empty state', () => {
    mockSWRData = { ...MOCK_WO, auditLog: [] }
    render(<WorkOrderDetailPage />)
    expect(screen.getByText(/Nessuna attivit/)).toBeInTheDocument()
  })

  it('shows Storico Attivita heading when entries exist', () => {
    mockSWRData = {
      ...MOCK_WO,
      auditLog: [
        { id: 'a-1', action: 'Stato aggiornato', createdAt: '2024-01-15T10:00:00Z' },
      ],
    }
    render(<WorkOrderDetailPage />)
    expect(screen.getByText('Storico Attivita')).toBeInTheDocument()
  })

  it('shows audit entry action', () => {
    mockSWRData = {
      ...MOCK_WO,
      auditLog: [
        { id: 'a-1', action: 'Stato aggiornato', createdAt: '2024-01-15T10:00:00Z' },
      ],
    }
    render(<WorkOrderDetailPage />)
    expect(screen.getByText('Stato aggiornato')).toBeInTheDocument()
  })

  it('shows status transition labels', () => {
    mockSWRData = {
      ...MOCK_WO,
      auditLog: [
        { id: 'a-1', action: 'Stato aggiornato', fromStatus: 'OPEN', toStatus: 'IN_PROGRESS', createdAt: '2024-01-15T10:00:00Z' },
      ],
    }
    render(<WorkOrderDetailPage />)
    expect(screen.getByText('Stato aggiornato')).toBeInTheDocument()
  })

  it('shows user name in audit entry', () => {
    mockSWRData = {
      ...MOCK_WO,
      auditLog: [
        { id: 'a-1', action: 'Stato aggiornato', createdAt: '2024-01-15T10:00:00Z', userName: 'Admin' },
      ],
    }
    render(<WorkOrderDetailPage />)
    expect(screen.getByText(/Admin/)).toBeInTheDocument()
  })
})

describe('generate invoice error path', () => {
  it('shows error toast when invoice API fails', async () => {
    mockSWRData = { ...MOCK_WO, status: 'COMPLETED' }
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({}),
    })
    render(<WorkOrderDetailPage />)
    await act(async () => { fireEvent.click(screen.getByText('Genera Fattura')) })
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Errore generazione fattura'))
  })
})

describe('check-in modal advanced', () => {
  beforeEach(() => {
    mockSWRData = { ...MOCK_WO, mileageIn: undefined }
  })

  it('closes check-in modal when X button clicked', () => {
    render(<WorkOrderDetailPage />)
    fireEvent.click(screen.getByText('Check-in'))
    const xBtn = document.querySelector('[data-icon="X"]')?.closest('button')
    fireEvent.click(xBtn!)
    expect(screen.queryByText('Check-in Veicolo')).not.toBeInTheDocument()
  })

  it('updates fuel level select in check-in form', () => {
    render(<WorkOrderDetailPage />)
    fireEvent.click(screen.getByText('Check-in'))
    const fuelSelect = document.querySelector('select') as HTMLSelectElement
    fireEvent.change(fuelSelect, { target: { value: 'FULL' } })
    expect(fuelSelect.value).toBe('FULL')
  })

  it('updates damage notes textarea in check-in form', () => {
    render(<WorkOrderDetailPage />)
    fireEvent.click(screen.getByText('Check-in'))
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: 'Graffio paraurti' } })
    expect(textarea.value).toBe('Graffio paraurti')
  })

  it('updates items in car input in check-in form', () => {
    render(<WorkOrderDetailPage />)
    fireEvent.click(screen.getByText('Check-in'))
    const itemsInput = screen.getByPlaceholderText('es. Seggiolino bambino, ombrello')
    fireEvent.change(itemsInput, { target: { value: 'Ombrello' } })
    expect((itemsInput as HTMLInputElement).value).toBe('Ombrello')
  })

  it('shows API error message on check-in failure', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ message: 'Check-in non consentito' }),
    })
    render(<WorkOrderDetailPage />)
    fireEvent.click(screen.getByText('Check-in'))
    const mileageInput = screen.getByPlaceholderText('es. 125000')
    fireEvent.change(mileageInput, { target: { value: '130000' } })
    await act(async () => { fireEvent.click(screen.getByText('Conferma Check-in')) })
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Check-in non consentito'))
  })

  it('includes fuelLevel and damageNotes in check-in body when provided', async () => {
    render(<WorkOrderDetailPage />)
    fireEvent.click(screen.getByText('Check-in'))
    const mileageInput = screen.getByPlaceholderText('es. 125000')
    fireEvent.change(mileageInput, { target: { value: '130000' } })
    const fuelSelect = document.querySelector('select') as HTMLSelectElement
    fireEvent.change(fuelSelect, { target: { value: 'FULL' } })
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: 'Graffio' } })
    await act(async () => { fireEvent.click(screen.getByText('Conferma Check-in')) })
    const callArgs = (global.fetch as jest.Mock).mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('check-in')
    )
    if (callArgs) {
      const body = JSON.parse(callArgs[1].body as string)
      expect(body.fuelLevel).toBe('FULL')
      expect(body.damageNotes).toBe('Graffio')
    }
  })
})

describe('check-out modal advanced', () => {
  beforeEach(() => {
    mockSWRData = { ...MOCK_WO, status: 'COMPLETED', mileageIn: 125000, mileageOut: undefined }
  })

  it('closes check-out modal when X button clicked', () => {
    render(<WorkOrderDetailPage />)
    fireEvent.click(screen.getByText('Check-out'))
    const xBtn = document.querySelector('[data-icon="X"]')?.closest('button')
    fireEvent.click(xBtn!)
    expect(screen.queryByText('Check-out Veicolo')).not.toBeInTheDocument()
  })

  it('closes check-out modal when Annulla clicked', () => {
    render(<WorkOrderDetailPage />)
    fireEvent.click(screen.getByText('Check-out'))
    expect(screen.getByText('Check-out Veicolo')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Annulla'))
    expect(screen.queryByText('Check-out Veicolo')).not.toBeInTheDocument()
  })

  it('shows fuel level validation when mileageOut filled but fuelLevel missing', async () => {
    render(<WorkOrderDetailPage />)
    fireEvent.click(screen.getByText('Check-out'))
    const mileageInput = screen.getByPlaceholderText('125000')
    fireEvent.change(mileageInput, { target: { value: '126000' } })
    await act(async () => { fireEvent.click(screen.getByText('Conferma Check-out')) })
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Livello carburante obbligatorio'))
  })

  it('submits check-out with mileageOut and fuelLevel', async () => {
    render(<WorkOrderDetailPage />)
    fireEvent.click(screen.getByText('Check-out'))
    const mileageInput = screen.getByPlaceholderText('125000')
    fireEvent.change(mileageInput, { target: { value: '126000' } })
    const fuelSelect = document.querySelector('select') as HTMLSelectElement
    fireEvent.change(fuelSelect, { target: { value: 'FULL' } })
    await act(async () => { fireEvent.click(screen.getByText('Conferma Check-out')) })
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/dashboard/work-orders/wo-123/check-out',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('shows success toast on check-out', async () => {
    render(<WorkOrderDetailPage />)
    fireEvent.click(screen.getByText('Check-out'))
    const mileageInput = screen.getByPlaceholderText('125000')
    fireEvent.change(mileageInput, { target: { value: '126000' } })
    const fuelSelect = document.querySelector('select') as HTMLSelectElement
    fireEvent.change(fuelSelect, { target: { value: 'FULL' } })
    await act(async () => { fireEvent.click(screen.getByText('Conferma Check-out')) })
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Check-out effettuato'))
  })

  it('updates check-out notes textarea', () => {
    render(<WorkOrderDetailPage />)
    fireEvent.click(screen.getByText('Check-out'))
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: 'Veicolo lavato' } })
    expect(textarea.value).toBe('Veicolo lavato')
  })

  it('shows error toast when check-out API fails', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ message: 'Errore check-out server' }),
    })
    render(<WorkOrderDetailPage />)
    fireEvent.click(screen.getByText('Check-out'))
    const mileageInput = screen.getByPlaceholderText('125000')
    fireEvent.change(mileageInput, { target: { value: '126000' } })
    const fuelSelect = document.querySelector('select') as HTMLSelectElement
    fireEvent.change(fuelSelect, { target: { value: 'FULL' } })
    await act(async () => { fireEvent.click(screen.getByText('Conferma Check-out')) })
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Errore check-out server'))
  })
})

describe('LaborTab hours=0 branch', () => {
  it('renders empty string for labor item with hours=0', () => {
    mockSearchParamsStr = 'tab=lavorazioni'
    mockSWRData = {
      ...MOCK_WO,
      laborItems: [{ id: 'l-zero', description: 'Test zero', hours: 0, costPerHour: 80 }],
    }
    render(<WorkOrderDetailPage />)
    const hoursInput = screen.getByPlaceholderText('Ore')
    expect((hoursInput as HTMLInputElement).value).toBe('')
  })
})

describe('PartsTab quantity=0 branch', () => {
  it('renders empty string for part item with quantity=0', () => {
    mockSearchParamsStr = 'tab=ricambi'
    mockSWRData = {
      ...MOCK_WO,
      partItems: [{ id: 'p-zero', name: 'Test zero', quantity: 0, unitCost: 10 }],
    }
    render(<WorkOrderDetailPage />)
    const qtyInput = screen.getByPlaceholderText('Qta')
    expect((qtyInput as HTMLInputElement).value).toBe('')
  })
})
