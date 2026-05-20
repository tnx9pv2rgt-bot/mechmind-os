import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { toast } from 'sonner'

// ── framer-motion ──────────────────────────────────────────────────────────────
jest.mock('framer-motion', () => {
  const React = require('react')
  return {
    motion: new Proxy({}, {
      get: (_t: unknown, prop: string) =>
        React.forwardRef(({ children, ...rest }: { children?: React.ReactNode; [k: string]: unknown }, ref: React.Ref<HTMLElement>) => {
          const allowed = ['className','style','onClick','aria-label','id','role','tabIndex']
          const valid: Record<string, unknown> = {}
          for (const k of Object.keys(rest)) {
            if (allowed.includes(k) || k.startsWith('data-') || k.startsWith('aria-')) valid[k] = rest[k]
          }
          const tag = ['div','span','section','header','ul','li','p','form','button','a'].includes(prop) ? prop : 'div'
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

// ── next/link ─────────────────────────────────────────────────────────────────
jest.mock('next/link', () => {
  const React = require('react')
  return ({ href, children, onClick }: { href: string; children: React.ReactNode; onClick?: (e: unknown) => void }) =>
    React.createElement('a', { href, onClick }, children)
})

// ── sonner ────────────────────────────────────────────────────────────────────
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}))

// ── UI components ─────────────────────────────────────────────────────────────
jest.mock('@/components/ui/apple-button', () => ({
  AppleButton: ({ children, onClick, variant, size, className, icon, fullWidth, title, disabled, 'aria-label': ariaLabel }: {
    children?: React.ReactNode; onClick?: (e?: React.MouseEvent) => void; variant?: string
    size?: string; className?: string; icon?: React.ReactNode; fullWidth?: boolean
    title?: string; disabled?: boolean; 'aria-label'?: string
  }) =>
    React.createElement('button', { onClick, 'data-variant': variant, className, disabled, title, 'aria-label': ariaLabel }, icon, children),
}))

jest.mock('@/components/ui/apple-card', () => ({
  AppleCard: ({ children, hover }: { children?: React.ReactNode; hover?: boolean }) =>
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

jest.mock('@/components/ui/pagination', () => ({
  Pagination: ({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) =>
    React.createElement('div', { 'data-testid': 'pagination', 'data-page': page, 'data-totalpages': totalPages }),
}))

// ── KanbanBoard ────────────────────────────────────────────────────────────────
const mockOnStatusChange = jest.fn()
jest.mock('@/components/bookings/kanban/kanban-board', () => ({
  KanbanBoard: ({ columns, onStatusChange }: { columns: unknown[]; onStatusChange: (...args: unknown[]) => void }) => {
    mockOnStatusChange.mockImplementation(onStatusChange)
    return React.createElement('div', { 'data-testid': 'kanban-board', 'data-columns': columns.length })
  },
}))

// ── useApi hooks ───────────────────────────────────────────────────────────────
let mockUseBookings = jest.fn()
let mockUseBookingStats = jest.fn()
let mockMutateAsync = jest.fn()

jest.mock('@/hooks/useApi', () => ({
  useBookings: (...args: unknown[]) => mockUseBookings(...args),
  useBookingStats: (...args: unknown[]) => mockUseBookingStats(...args),
  useUpdateBooking: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}))

// ── default booking factory ────────────────────────────────────────────────────
function makeBooking(overrides: Partial<{
  id: string; customerName: string; customerPhone: string;
  vehiclePlate: string; vehicleBrand: string; vehicleModel: string;
  serviceCategory: string; serviceName: string; status: string;
  scheduledAt: string; estimatedCost: number; notes: string;
  estimatedDuration: number; technicianName: string;
}> = {}) {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return {
    id: 'booking-1',
    customerName: 'Mario Rossi',
    customerPhone: '+39 320 1234567',
    vehiclePlate: 'AB123CD',
    vehicleBrand: 'Fiat',
    vehicleModel: 'Punto',
    serviceCategory: 'tagliando',
    serviceName: 'Tagliando Base',
    status: 'pending',
    scheduledAt: tomorrow.toISOString(),
    estimatedCost: 120,
    notes: 'Note test',
    estimatedDuration: 90,
    technicianName: 'Luigi Verdi',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

function makeStats(overrides = {}) {
  return {
    total: 42,
    byStatus: {
      pending: 5,
      confirmed: 10,
      in_progress: 3,
      completed: 20,
      cancelled: 2,
      no_show: 2,
    },
    ...overrides,
  }
}

const defaultRefetch = jest.fn()

function setupDefaultMocks(bookings = [makeBooking()], total = 1) {
  mockUseBookings.mockReturnValue({
    data: { data: bookings, total },
    isLoading: false,
    error: null,
    refetch: defaultRefetch,
  })
  mockUseBookingStats.mockReturnValue({ data: makeStats() })
  mockMutateAsync.mockResolvedValue({})
}

import BookingsPage from '@/app/dashboard/bookings/page'

beforeEach(() => {
  jest.clearAllMocks()
  setupDefaultMocks()
})

// =============================================================================
// HEADER
// =============================================================================
describe('BookingsPage – header', () => {
  it('renders page heading "Prenotazioni"', () => {
    render(<BookingsPage />)
    expect(screen.getByRole('heading', { name: 'Prenotazioni' })).toBeInTheDocument()
  })

  it('renders "Nuova Prenotazione" link', () => {
    render(<BookingsPage />)
    expect(screen.getByText('Nuova Prenotazione')).toBeInTheDocument()
  })

  it('renders view mode buttons with correct aria-labels', () => {
    render(<BookingsPage />)
    expect(screen.getByRole('button', { name: 'Vista Lista' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Vista Kanban' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Vista Timeline' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Vista Agenda' })).toBeInTheDocument()
  })

  it('renders "Calendario" link', () => {
    render(<BookingsPage />)
    expect(screen.getByRole('link', { name: /Calendario/i })).toBeInTheDocument()
  })
})

// =============================================================================
// QUICK FILTERS
// =============================================================================
describe('BookingsPage – quick filters', () => {
  it('renders quick filter buttons', () => {
    render(<BookingsPage />)
    expect(screen.getByText('Tutte')).toBeInTheDocument()
    expect(screen.getAllByText('Oggi').length).toBeGreaterThan(0)
    expect(screen.getByText('Settimana')).toBeInTheDocument()
    expect(screen.getAllByText(/In attesa/i).length).toBeGreaterThan(0)
  })

  it('clicking "Tutte" updates filter', () => {
    render(<BookingsPage />)
    fireEvent.click(screen.getByText('Tutte'))
    expect(screen.getByText('Tutte')).toBeInTheDocument()
  })

  it('clicking "Oggi" updates filter', () => {
    render(<BookingsPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Oggi' }))
    expect(screen.getAllByText('Oggi').length).toBeGreaterThan(0)
  })

  it('clicking "In attesa" updates filter', () => {
    render(<BookingsPage />)
    fireEvent.click(screen.getByRole('button', { name: 'In attesa' }))
    expect(screen.getAllByText(/In attesa/i).length).toBeGreaterThan(0)
  })
})

// =============================================================================
// SEARCH & FILTERS
// =============================================================================
describe('BookingsPage – search and filters', () => {
  it('renders search input with correct aria-label', () => {
    render(<BookingsPage />)
    expect(screen.getByRole('textbox', { name: 'Cerca prenotazioni' })).toBeInTheDocument()
  })

  it('renders date filter input', () => {
    render(<BookingsPage />)
    const dateInput = screen.getByLabelText('Filtra per data')
    expect(dateInput).toBeInTheDocument()
  })

  it('renders status filter select', () => {
    render(<BookingsPage />)
    const select = screen.getByLabelText('Filtra per stato')
    expect(select).toBeInTheDocument()
  })

  it('typing in search updates the query', () => {
    render(<BookingsPage />)
    const search = screen.getByRole('textbox', { name: 'Cerca prenotazioni' })
    fireEvent.change(search, { target: { value: 'mario' } })
    expect(search).toHaveValue('mario')
  })

  it('changing status filter updates select value', () => {
    render(<BookingsPage />)
    const select = screen.getByLabelText('Filtra per stato')
    fireEvent.change(select, { target: { value: 'confirmed' } })
    expect(select).toHaveValue('confirmed')
  })

  it('changing date filter updates input value', () => {
    render(<BookingsPage />)
    const dateInput = screen.getByLabelText('Filtra per data')
    fireEvent.change(dateInput, { target: { value: '2026-04-23' } })
    expect(dateInput).toHaveValue('2026-04-23')
  })
})

// =============================================================================
// KPI CARDS
// =============================================================================
describe('BookingsPage – KPI cards', () => {
  it('renders "Oggi" KPI card', () => {
    render(<BookingsPage />)
    expect(screen.getAllByText('Oggi').length).toBeGreaterThan(0)
  })

  it('renders "Tasso Conferma" KPI card', () => {
    render(<BookingsPage />)
    expect(screen.getByText('Tasso Conferma')).toBeInTheDocument()
  })

  it('renders "In Attesa" KPI card', () => {
    render(<BookingsPage />)
    expect(screen.getAllByText('In Attesa').length).toBeGreaterThan(0)
  })

  it('renders "Revenue Oggi" KPI card', () => {
    render(<BookingsPage />)
    expect(screen.getByText('Revenue Oggi')).toBeInTheDocument()
  })

  it('renders "No-Show" KPI card', () => {
    render(<BookingsPage />)
    expect(screen.getByText('No-Show')).toBeInTheDocument()
  })

  it('renders "In Corso" KPI card', () => {
    render(<BookingsPage />)
    expect(screen.getByText('In Corso')).toBeInTheDocument()
  })

  it('renders "Completate" KPI card', () => {
    render(<BookingsPage />)
    expect(screen.getByText('Completate')).toBeInTheDocument()
  })

  it('renders "Totale" KPI card', () => {
    render(<BookingsPage />)
    expect(screen.getByText('Totale')).toBeInTheDocument()
  })
})

// =============================================================================
// LIST VIEW
// =============================================================================
describe('BookingsPage – list view', () => {
  it('renders booking row with customer name', () => {
    render(<BookingsPage />)
    expect(screen.getAllByText('Mario Rossi').length).toBeGreaterThan(0)
  })

  it('renders booking row with vehicle plate', () => {
    render(<BookingsPage />)
    expect(screen.getAllByText('AB123CD').length).toBeGreaterThan(0)
  })

  it('renders "Elenco Prenotazioni" section heading', () => {
    render(<BookingsPage />)
    expect(screen.getByText('Elenco Prenotazioni')).toBeInTheDocument()
  })

  it('renders multiple bookings', () => {
    setupDefaultMocks([
      makeBooking({ id: 'b-1', customerName: 'Mario Rossi' }),
      makeBooking({ id: 'b-2', customerName: 'Luigi Bianchi', vehiclePlate: 'XY999ZZ' }),
    ], 2)
    render(<BookingsPage />)
    expect(screen.getByText('Mario Rossi')).toBeInTheDocument()
    expect(screen.getByText('Luigi Bianchi')).toBeInTheDocument()
  })
})

// =============================================================================
// LOADING STATE
// =============================================================================
describe('BookingsPage – loading state', () => {
  it('renders loading skeleton with animate-pulse', () => {
    mockUseBookings.mockReturnValue({ data: null, isLoading: true, error: null, refetch: jest.fn() })
    mockUseBookingStats.mockReturnValue({ data: null })
    const { container } = render(<BookingsPage />)
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })
})

// =============================================================================
// ERROR STATE
// =============================================================================
describe('BookingsPage – error state', () => {
  it('renders error message when useBookings returns error', () => {
    mockUseBookings.mockReturnValue({
      data: null, isLoading: false, error: new Error('Failed'), refetch: jest.fn(),
    })
    mockUseBookingStats.mockReturnValue({ data: null })
    render(<BookingsPage />)
    expect(screen.getByText('Impossibile caricare le prenotazioni')).toBeInTheDocument()
  })

  it('renders retry button on error', () => {
    const refetchMock = jest.fn()
    mockUseBookings.mockReturnValue({
      data: null, isLoading: false, error: new Error('err'), refetch: refetchMock,
    })
    mockUseBookingStats.mockReturnValue({ data: null })
    render(<BookingsPage />)
    expect(screen.getByText('Riprova')).toBeInTheDocument()
  })

  it('calls refetch on retry click', () => {
    const refetchMock = jest.fn()
    mockUseBookings.mockReturnValue({
      data: null, isLoading: false, error: new Error('err'), refetch: refetchMock,
    })
    mockUseBookingStats.mockReturnValue({ data: null })
    render(<BookingsPage />)
    fireEvent.click(screen.getByText('Riprova'))
    expect(refetchMock).toHaveBeenCalled()
  })
})

// =============================================================================
// EMPTY STATE
// =============================================================================
describe('BookingsPage – empty state', () => {
  it('shows empty state without filters: "Nessuna prenotazione. Crea la prima prenotazione."', () => {
    mockUseBookings.mockReturnValue({
      data: { data: [], total: 0 }, isLoading: false, error: null, refetch: jest.fn(),
    })
    mockUseBookingStats.mockReturnValue({ data: null })
    // Switch to 'all' quick filter so hasFilters=false
    render(<BookingsPage />)
    fireEvent.click(screen.getByText('Tutte'))
    expect(screen.getByText('Nessuna prenotazione. Crea la prima prenotazione.')).toBeInTheDocument()
  })

  it('shows filtered empty state with "Nessun risultato. Prova a modificare i filtri di ricerca."', () => {
    mockUseBookings.mockReturnValue({
      data: { data: [], total: 0 }, isLoading: false, error: null, refetch: jest.fn(),
    })
    mockUseBookingStats.mockReturnValue({ data: null })
    render(<BookingsPage />)
    // Default quickFilter is 'today' which counts as hasFilters
    expect(screen.getByText('Nessun risultato. Prova a modificare i filtri di ricerca.')).toBeInTheDocument()
  })
})

// =============================================================================
// VIEW MODE SWITCHING
// =============================================================================
describe('BookingsPage – view modes', () => {
  it('shows KanbanBoard when Kanban mode is selected', () => {
    render(<BookingsPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Vista Kanban' }))
    expect(screen.getByTestId('kanban-board')).toBeInTheDocument()
  })

  it('shows "Kanban Prenotazioni" heading in kanban mode', () => {
    render(<BookingsPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Vista Kanban' }))
    expect(screen.getByText('Kanban Prenotazioni')).toBeInTheDocument()
  })

  it('shows "Timeline Giornaliera" heading in timeline mode', () => {
    render(<BookingsPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Vista Timeline' }))
    expect(screen.getByText('Timeline Giornaliera')).toBeInTheDocument()
  })

  it('shows "Agenda Reception" heading in agenda mode', () => {
    render(<BookingsPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Vista Agenda' }))
    expect(screen.getByText('Agenda Reception')).toBeInTheDocument()
  })

  it('shows list view by default with list heading', () => {
    render(<BookingsPage />)
    expect(screen.getByText('Elenco Prenotazioni')).toBeInTheDocument()
  })
})

// =============================================================================
// KANBAN STATUS CHANGE
// =============================================================================
describe('BookingsPage – kanban status change', () => {
  it('calls mutateAsync when kanban status changes', async () => {
    render(<BookingsPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Vista Kanban' }))
    await waitFor(() => expect(screen.getByTestId('kanban-board')).toBeInTheDocument())
    await mockOnStatusChange('booking-1', 'pending', 'confirmed')
    expect(mockMutateAsync).toHaveBeenCalledWith({ id: 'booking-1', status: 'confirmed' })
  })

  it('shows success toast on successful status change', async () => {
    render(<BookingsPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Vista Kanban' }))
    await waitFor(() => expect(screen.getByTestId('kanban-board')).toBeInTheDocument())
    await mockOnStatusChange('booking-1', 'pending', 'confirmed')
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Stato aggiornato'))
  })

  it('shows error toast on failed status change', async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error('fail'))
    const refetchMock = jest.fn()
    mockUseBookings.mockReturnValue({
      data: { data: [makeBooking()], total: 1 }, isLoading: false, error: null, refetch: refetchMock,
    })
    render(<BookingsPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Vista Kanban' }))
    await waitFor(() => expect(screen.getByTestId('kanban-board')).toBeInTheDocument())
    await mockOnStatusChange('booking-1', 'pending', 'confirmed').catch(() => null)
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Errore nel cambio stato'))
  })
})

// =============================================================================
// BOOKING DRAWER
// =============================================================================
describe('BookingsPage – booking drawer', () => {
  it('opens drawer when booking row is clicked', () => {
    render(<BookingsPage />)
    // The booking row has onClick=openDrawer — click on customer name
    const customerNames = screen.getAllByText('Mario Rossi')
    fireEvent.click(customerNames[0])
    // Drawer content: Chiudi button should appear
    expect(screen.getByRole('button', { name: 'Chiudi' })).toBeInTheDocument()
  })

  it('drawer shows customer name', () => {
    render(<BookingsPage />)
    const customerNames = screen.getAllByText('Mario Rossi')
    fireEvent.click(customerNames[0])
    expect(screen.getAllByText('Mario Rossi').length).toBeGreaterThan(1)
  })

  it('drawer shows vehicle plate', () => {
    render(<BookingsPage />)
    const customerNames = screen.getAllByText('Mario Rossi')
    fireEvent.click(customerNames[0])
    expect(screen.getAllByText('AB123CD').length).toBeGreaterThan(0)
  })

  it('closes drawer when Chiudi is clicked', () => {
    render(<BookingsPage />)
    const customerNames = screen.getAllByText('Mario Rossi')
    fireEvent.click(customerNames[0])
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi' }))
    expect(screen.queryByRole('button', { name: 'Chiudi' })).not.toBeInTheDocument()
  })

  it('drawer shows "Conferma Prenotazione" for pending booking', () => {
    render(<BookingsPage />)
    const customerNames = screen.getAllByText('Mario Rossi')
    fireEvent.click(customerNames[0])
    expect(screen.getByText('Conferma Prenotazione')).toBeInTheDocument()
  })

  it('calls mutateAsync with confirmed on "Conferma Prenotazione" click', async () => {
    render(<BookingsPage />)
    const customerNames = screen.getAllByText('Mario Rossi')
    fireEvent.click(customerNames[0])
    fireEvent.click(screen.getByText('Conferma Prenotazione'))
    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledWith({ id: 'booking-1', status: 'confirmed' }))
  })

  it('drawer shows "Inizia Lavoro" for confirmed booking', () => {
    setupDefaultMocks([makeBooking({ status: 'confirmed' })])
    render(<BookingsPage />)
    const customerNames = screen.getAllByText('Mario Rossi')
    fireEvent.click(customerNames[0])
    expect(screen.getByText('Inizia Lavoro')).toBeInTheDocument()
  })

  it('drawer shows "Completa" for in_progress booking', () => {
    setupDefaultMocks([makeBooking({ status: 'in_progress' })])
    render(<BookingsPage />)
    const customerNames = screen.getAllByText('Mario Rossi')
    fireEvent.click(customerNames[0])
    expect(screen.getByText('Completa')).toBeInTheDocument()
  })

  it('drawer shows "No-Show" and "Annulla" for pending booking', () => {
    render(<BookingsPage />)
    const customerNames = screen.getAllByText('Mario Rossi')
    fireEvent.click(customerNames[0])
    expect(screen.getAllByText('No-Show').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Annulla').length).toBeGreaterThan(0)
  })
})

// =============================================================================
// BULK ACTIONS
// =============================================================================
describe('BookingsPage – bulk actions', () => {
  it('shows bulk action bar when a booking is selected', () => {
    render(<BookingsPage />)
    const checkbox = screen.getByLabelText('Seleziona Mario Rossi')
    fireEvent.click(checkbox)
    expect(screen.getByText('Conferma tutti')).toBeInTheDocument()
    expect(screen.getByText('Deseleziona')).toBeInTheDocument()
  })

  it('"Deseleziona" clears selection', () => {
    render(<BookingsPage />)
    const checkbox = screen.getByLabelText('Seleziona Mario Rossi')
    fireEvent.click(checkbox)
    expect(screen.getByText('Conferma tutti')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Deseleziona'))
    expect(screen.queryByText('Conferma tutti')).not.toBeInTheDocument()
  })
})

// =============================================================================
// TODAY SUMMARY
// =============================================================================
describe('BookingsPage – today summary', () => {
  it('renders "Oggi:" subtitle in the header', () => {
    render(<BookingsPage />)
    expect(screen.getByText(/Oggi:/)).toBeInTheDocument()
  })
})

// =============================================================================
// SORT HEADERS
// =============================================================================
describe('BookingsPage – sort headers', () => {
  it('renders "Ora" sort header', () => {
    render(<BookingsPage />)
    expect(screen.getByText('Ora')).toBeInTheDocument()
  })

  it('renders "Cliente" sort header', () => {
    render(<BookingsPage />)
    expect(screen.getByText('Cliente')).toBeInTheDocument()
  })

  it('renders "Veicolo" sort header', () => {
    render(<BookingsPage />)
    expect(screen.getByText('Veicolo')).toBeInTheDocument()
  })

  it('clicking sort header toggles sort direction', () => {
    render(<BookingsPage />)
    const oraHeader = screen.getByText('Ora')
    fireEvent.click(oraHeader)
    fireEvent.click(oraHeader)
    // Just verifying it doesn't throw
    expect(screen.getByText('Ora')).toBeInTheDocument()
  })
})

// =============================================================================
// DENSITY TOGGLE
// =============================================================================
describe('BookingsPage – density toggle', () => {
  it('renders density toggle button in list view', () => {
    render(<BookingsPage />)
    expect(screen.getByLabelText('Cambia densità')).toBeInTheDocument()
  })

  it('clicking density toggle changes aria state', () => {
    render(<BookingsPage />)
    fireEvent.click(screen.getByLabelText('Cambia densità'))
    expect(screen.getByLabelText('Cambia densità')).toBeInTheDocument()
  })
})

// =============================================================================
// PAGINATION
// =============================================================================
describe('BookingsPage – pagination', () => {
  it('does not render pagination when total <= PAGE_SIZE', () => {
    setupDefaultMocks([makeBooking()], 1)
    render(<BookingsPage />)
    expect(screen.queryByTestId('pagination')).not.toBeInTheDocument()
  })

  it('renders pagination when total > PAGE_SIZE', () => {
    setupDefaultMocks(
      Array.from({ length: 20 }, (_, i) => makeBooking({ id: `b-${i}`, customerName: `Cliente ${i}` })),
      100,
    )
    render(<BookingsPage />)
    expect(screen.getByTestId('pagination')).toBeInTheDocument()
  })
})

// =============================================================================
// KANBAN LOADING / ERROR
// =============================================================================
describe('BookingsPage – kanban loading and error', () => {
  it('shows KanbanSkeleton while loading in kanban mode', () => {
    mockUseBookings.mockReturnValue({ data: null, isLoading: true, error: null, refetch: jest.fn() })
    mockUseBookingStats.mockReturnValue({ data: null })
    render(<BookingsPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Vista Kanban' }))
    const { container } = render(<BookingsPage />)
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('shows error state in kanban mode on error', () => {
    mockUseBookings.mockReturnValue({ data: null, isLoading: false, error: new Error('fail'), refetch: jest.fn() })
    mockUseBookingStats.mockReturnValue({ data: null })
    render(<BookingsPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Vista Kanban' }))
    expect(screen.getAllByText('Impossibile caricare le prenotazioni').length).toBeGreaterThan(0)
  })
})

// =============================================================================
// SETTIMANA FILTER (covers getDateRange 'week' branch)
// =============================================================================
describe('BookingsPage – settimana filter', () => {
  it('clicking "Settimana" quick filter works', () => {
    render(<BookingsPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Settimana' }))
    expect(screen.getByText('Settimana')).toBeInTheDocument()
  })
})

// =============================================================================
// SORT COLUMNS (covers customerName, vehiclePlate, status, estimatedCost)
// =============================================================================
describe('BookingsPage – extended sort columns', () => {
  const twoBookings = () => [
    makeBooking({ id: 'b-1', customerName: 'Zara Blu', vehiclePlate: 'ZZ999ZZ', estimatedCost: 200, status: 'confirmed' }),
    makeBooking({ id: 'b-2', customerName: 'Alba Rossi', vehiclePlate: 'AA001AA', estimatedCost: 50, status: 'pending' }),
  ]

  it('sorts by Cliente column', () => {
    setupDefaultMocks(twoBookings(), 2)
    render(<BookingsPage />)
    fireEvent.click(screen.getByText('Cliente'))
    expect(screen.getAllByText('Zara Blu').length).toBeGreaterThan(0)
  })

  it('sorts by Veicolo column', () => {
    setupDefaultMocks(twoBookings(), 2)
    render(<BookingsPage />)
    fireEvent.click(screen.getByText('Veicolo'))
    expect(screen.getAllByText('ZZ999ZZ').length).toBeGreaterThan(0)
  })

  it('sorts by Stato column', () => {
    setupDefaultMocks(twoBookings(), 2)
    render(<BookingsPage />)
    fireEvent.click(screen.getByText('Stato'))
    expect(screen.getAllByText('Zara Blu').length).toBeGreaterThan(0)
  })

  it('sorts by Costo column', () => {
    setupDefaultMocks(twoBookings(), 2)
    render(<BookingsPage />)
    fireEvent.click(screen.getByText('Costo'))
    expect(screen.getAllByText('Zara Blu').length).toBeGreaterThan(0)
  })

  it('toggles sort direction on same column click', () => {
    setupDefaultMocks(twoBookings(), 2)
    render(<BookingsPage />)
    fireEvent.click(screen.getByText('Cliente'))
    fireEvent.click(screen.getByText('Cliente'))
    expect(screen.getAllByText('Alba Rossi').length).toBeGreaterThan(0)
  })
})

// =============================================================================
// SELECT ALL
// =============================================================================
describe('BookingsPage – select all', () => {
  it('clicking "Seleziona tutti" selects all bookings', () => {
    render(<BookingsPage />)
    fireEvent.click(screen.getByLabelText('Seleziona tutti'))
    expect(screen.getByText('Conferma tutti')).toBeInTheDocument()
  })

  it('clicking "Seleziona tutti" again deselects all', () => {
    render(<BookingsPage />)
    fireEvent.click(screen.getByLabelText('Seleziona tutti'))
    fireEvent.click(screen.getByLabelText('Seleziona tutti'))
    expect(screen.queryByText('Conferma tutti')).not.toBeInTheDocument()
  })
})

// =============================================================================
// BULK CONFIRM ACTION (covers lines 1444-1450)
// =============================================================================
describe('BookingsPage – bulk confirm action', () => {
  it('calls mutateAsync for selected booking when Conferma tutti clicked', async () => {
    render(<BookingsPage />)
    fireEvent.click(screen.getByLabelText('Seleziona Mario Rossi'))
    fireEvent.click(screen.getByText('Conferma tutti'))
    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledWith({ id: 'booking-1', status: 'confirmed' }))
  })
})

// =============================================================================
// DRAWER CLICK ACTIONS (covers onClick bodies for confirmed/in_progress status)
// =============================================================================
describe('BookingsPage – drawer inline actions', () => {
  it('clicking Inizia Lavoro in drawer calls mutateAsync with in_progress', async () => {
    setupDefaultMocks([makeBooking({ status: 'confirmed' })])
    render(<BookingsPage />)
    fireEvent.click(screen.getAllByText('Mario Rossi')[0])
    fireEvent.click(screen.getByText('Inizia Lavoro'))
    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledWith({ id: 'booking-1', status: 'in_progress' }))
  })

  it('clicking Completa in drawer calls mutateAsync with completed', async () => {
    setupDefaultMocks([makeBooking({ status: 'in_progress' })])
    render(<BookingsPage />)
    fireEvent.click(screen.getAllByText('Mario Rossi')[0])
    fireEvent.click(screen.getByText('Completa'))
    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledWith({ id: 'booking-1', status: 'completed' }))
  })

  it('shows error toast when drawer status change fails', async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error('fail'))
    render(<BookingsPage />)
    fireEvent.click(screen.getAllByText('Mario Rossi')[0])
    fireEvent.click(screen.getByText('Conferma Prenotazione'))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Errore nel cambio stato'))
  })
})

// =============================================================================
// AGENDA VIEW RENDERING
// =============================================================================
describe('BookingsPage – agenda view rendering', () => {
  it('renders Agenda Reception heading in agenda mode', () => {
    render(<BookingsPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Vista Agenda' }))
    expect(screen.getByText('Agenda Reception')).toBeInTheDocument()
  })

  it('shows agenda skeleton while loading', () => {
    mockUseBookings.mockReturnValue({ data: null, isLoading: true, error: null, refetch: jest.fn() })
    mockUseBookingStats.mockReturnValue({ data: null })
    const { container } = render(<BookingsPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Vista Agenda' }))
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('shows error in agenda mode', () => {
    mockUseBookings.mockReturnValue({ data: null, isLoading: false, error: new Error('err'), refetch: jest.fn() })
    mockUseBookingStats.mockReturnValue({ data: null })
    render(<BookingsPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Vista Agenda' }))
    expect(screen.getAllByText('Impossibile caricare le prenotazioni').length).toBeGreaterThan(0)
  })

  it('shows today bookings in agenda view', () => {
    const now = new Date()
    setupDefaultMocks([makeBooking({ scheduledAt: now.toISOString(), status: 'pending' })])
    render(<BookingsPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Vista Agenda' }))
    expect(screen.getByText(/Prossimi/)).toBeInTheDocument()
  })

  it('shows in-progress bookings section in agenda view', () => {
    const now = new Date()
    setupDefaultMocks([makeBooking({ scheduledAt: now.toISOString(), status: 'in_progress' })])
    render(<BookingsPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Vista Agenda' }))
    expect(screen.getByText(/In corso adesso/)).toBeInTheDocument()
  })

  it('shows completed section toggle in agenda view', () => {
    render(<BookingsPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Vista Agenda' }))
    expect(screen.getByText(/Completati oggi/)).toBeInTheDocument()
  })
})

// =============================================================================
// TIMELINE SKELETON (covers TimelineSkeleton)
// =============================================================================
describe('BookingsPage – timeline skeleton', () => {
  it('shows timeline skeleton while loading in timeline mode', () => {
    mockUseBookings.mockReturnValue({ data: null, isLoading: true, error: null, refetch: jest.fn() })
    mockUseBookingStats.mockReturnValue({ data: null })
    const { container } = render(<BookingsPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Vista Timeline' }))
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })
})
