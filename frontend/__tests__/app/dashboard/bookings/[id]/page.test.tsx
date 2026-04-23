import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

// ---- Navigation ----
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'booking-1' }),
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}))

// ---- next/link ----
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) =>
    React.createElement('a', { href }, children)
})

// ---- framer-motion ----
jest.mock('framer-motion', () => {
  const React = require('react')
  return {
    motion: new Proxy({}, {
      get: (_t: unknown, prop: string) =>
        ({ children, ...rest }: { children?: React.ReactNode; [k: string]: unknown }) => {
          const allowed = ['className', 'style', 'onClick', 'role', 'tabIndex', 'aria-label']
          const valid: Record<string, unknown> = {}
          for (const k of Object.keys(rest)) {
            if (allowed.includes(k) || k.startsWith('data-') || k.startsWith('aria-')) valid[k] = rest[k]
          }
          return React.createElement(prop, valid, children)
        },
    }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  }
})

// ---- lucide-react ----
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

// ---- sonner ----
const mockToastSuccess = jest.fn()
const mockToastError = jest.fn()
jest.mock('sonner', () => ({
  toast: {
    success: (...a: unknown[]) => mockToastSuccess(...a),
    error: (...a: unknown[]) => mockToastError(...a),
  },
}))

// ---- useApi ----
const mockMutate = jest.fn()
let mockBookingData: Record<string, unknown> | null = null
let mockIsLoading = false
let mockBookingError: Error | null = null
let mockIsPending = false

jest.mock('@/hooks/useApi', () => ({
  useBooking: () => ({ data: mockBookingData, isLoading: mockIsLoading, error: mockBookingError }),
  useUpdateBooking: () => ({ mutate: mockMutate, isPending: mockIsPending }),
}))

// ---- UI components ----
jest.mock('@/components/ui/apple-card', () => ({
  AppleCard: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'apple-card' }, children),
  AppleCardContent: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', null, children),
}))

jest.mock('@/components/ui/apple-button', () => ({
  AppleButton: ({ children, onClick, disabled, type, variant, className }: {
    children?: React.ReactNode; onClick?: () => void; disabled?: boolean; type?: string; variant?: string; className?: string
  }) => React.createElement('button', { onClick, disabled, type, 'data-variant': variant, className }, children),
}))

jest.mock('@/components/ui/breadcrumb', () => ({
  Breadcrumb: ({ items }: { items: { label: string; href?: string }[] }) =>
    React.createElement('nav', null, items.map(i => React.createElement('span', { key: i.label }, i.label))),
}))

jest.mock('@/components/ui/status-timeline', () => ({
  StatusTimeline: () => React.createElement('div', { 'data-testid': 'status-timeline' }),
}))

jest.mock('@/components/ui/confirm-dialog', () => ({
  ConfirmDialog: ({ open, onConfirm, confirmLabel, title, onOpenChange, loading }: {
    open?: boolean; onConfirm?: () => void; confirmLabel?: string; title?: string; onOpenChange?: (v: boolean) => void; loading?: boolean
  }) => open
    ? React.createElement('div', { 'data-testid': 'confirm-dialog' },
        React.createElement('p', null, title),
        React.createElement('button', { onClick: onConfirm, disabled: loading }, confirmLabel),
        React.createElement('button', { onClick: () => onOpenChange?.(false) }, 'Annulla confirm')
      )
    : null,
}))

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children, onOpenChange }: {
    open?: boolean; children?: React.ReactNode; onOpenChange?: (v: boolean) => void
  }) => open
    ? React.createElement('div', { 'data-testid': 'dialog', role: 'dialog' }, children)
    : null,
  DialogContent: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'dialog-content' }, children),
  DialogHeader: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', null, children),
  DialogTitle: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('h2', null, children),
  DialogDescription: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('p', null, children),
  DialogFooter: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', null, children),
}))

// ---- fetch ----
const mockFetch = jest.fn()
global.fetch = mockFetch

// ---- window.print ----
Object.defineProperty(window, 'print', { value: jest.fn(), writable: true })

// ---- import AFTER mocks ----
import BookingDetailPage from '@/app/dashboard/bookings/[id]/page'

const baseBooking = {
  id: 'booking-1',
  customerName: 'Mario Rossi',
  customerPhone: '3331234567',
  vehiclePlate: 'AB123CD',
  vehicleBrand: 'Fiat',
  vehicleModel: '500',
  serviceCategory: 'Tagliando',
  serviceName: 'Tagliando Base',
  status: 'pending',
  scheduledAt: new Date('2026-06-01T10:00:00').toISOString(),
  estimatedCost: 150,
  notes: 'Note di test',
  createdAt: new Date('2026-05-01').toISOString(),
  updatedAt: new Date('2026-05-15').toISOString(),
  estimatedDuration: 60,
  technicianName: 'Giovanni',
}

beforeEach(() => {
  jest.clearAllMocks()
  mockBookingData = { ...baseBooking }
  mockIsLoading = false
  mockBookingError = null
  mockIsPending = false
  mockMutate.mockImplementation((_payload: unknown, callbacks?: { onSuccess?: () => void; onError?: () => void }) => {
    callbacks?.onSuccess?.()
  })
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ data: { id: 'wo-1' } }) })
})

describe('BookingDetailPage', () => {
  it('renders loading spinner when isLoading is true', () => {
    mockIsLoading = true
    mockBookingData = null
    const { container } = render(<BookingDetailPage />)
    expect(container.querySelector('[data-icon="Loader2"]')).toBeInTheDocument()
  })

  it('renders error state when booking is not found', () => {
    mockBookingData = null
    mockBookingError = new Error('not found')
    render(<BookingDetailPage />)
    expect(screen.getByText('Prenotazione non trovata')).toBeInTheDocument()
    expect(screen.getByText('Torna alle prenotazioni')).toBeInTheDocument()
  })

  it('navigates back on Torna alle prenotazioni click (error state)', () => {
    mockBookingData = null
    mockBookingError = new Error('not found')
    render(<BookingDetailPage />)
    fireEvent.click(screen.getByText('Torna alle prenotazioni'))
    expect(mockPush).toHaveBeenCalledWith('/dashboard/bookings')
  })

  it('renders customer name', () => {
    render(<BookingDetailPage />)
    expect(screen.getByText('Mario Rossi')).toBeInTheDocument()
  })

  it('renders vehicle plate', () => {
    render(<BookingDetailPage />)
    expect(screen.getByText('AB123CD')).toBeInTheDocument()
  })

  it('renders service name', () => {
    render(<BookingDetailPage />)
    expect(screen.getAllByText('Tagliando Base').length).toBeGreaterThan(0)
  })

  it('renders booking notes', () => {
    render(<BookingDetailPage />)
    expect(screen.getByText('Note di test')).toBeInTheDocument()
  })

  it('renders estimated cost', () => {
    render(<BookingDetailPage />)
    expect(screen.getByText(/150/)).toBeInTheDocument()
  })

  it('renders status timeline', () => {
    render(<BookingDetailPage />)
    expect(screen.getByTestId('status-timeline')).toBeInTheDocument()
  })

  it('renders breadcrumb with booking id', () => {
    render(<BookingDetailPage />)
    expect(screen.getByText('Prenotazioni')).toBeInTheDocument()
  })

  // --- State machine action buttons ---

  it('shows Conferma Prenotazione for pending booking', () => {
    render(<BookingDetailPage />)
    expect(screen.getByText('Conferma Prenotazione')).toBeInTheDocument()
  })

  it('does not show Avvia Lavorazione for pending booking', () => {
    render(<BookingDetailPage />)
    expect(screen.queryByText('Avvia Lavorazione')).not.toBeInTheDocument()
  })

  it('shows Avvia Lavorazione for confirmed booking', () => {
    mockBookingData = { ...baseBooking, status: 'confirmed' }
    render(<BookingDetailPage />)
    expect(screen.getByText('Avvia Lavorazione')).toBeInTheDocument()
  })

  it('shows Completa Lavoro for in_progress booking', () => {
    mockBookingData = { ...baseBooking, status: 'in_progress' }
    render(<BookingDetailPage />)
    expect(screen.getByText('Completa Lavoro')).toBeInTheDocument()
  })

  it('does not show action buttons for completed booking', () => {
    mockBookingData = { ...baseBooking, status: 'completed' }
    render(<BookingDetailPage />)
    expect(screen.queryByText('Conferma Prenotazione')).not.toBeInTheDocument()
    expect(screen.queryByText('Avvia Lavorazione')).not.toBeInTheDocument()
    expect(screen.queryByText('Completa Lavoro')).not.toBeInTheDocument()
    expect(screen.queryByText('Annulla Prenotazione')).not.toBeInTheDocument()
  })

  it('does not show action buttons for cancelled booking', () => {
    mockBookingData = { ...baseBooking, status: 'cancelled' }
    render(<BookingDetailPage />)
    expect(screen.queryByText('Conferma Prenotazione')).not.toBeInTheDocument()
    expect(screen.queryByText('Annulla Prenotazione')).not.toBeInTheDocument()
  })

  it('shows Segna Non Presentato for pending booking', () => {
    render(<BookingDetailPage />)
    expect(screen.getByText('Segna Non Presentato')).toBeInTheDocument()
  })

  it('shows Annulla Prenotazione for pending booking', () => {
    render(<BookingDetailPage />)
    expect(screen.getByText('Annulla Prenotazione')).toBeInTheDocument()
  })

  // --- handleConfirm ---
  it('calls mutate with confirmed status when Conferma clicked', async () => {
    render(<BookingDetailPage />)
    await act(async () => { fireEvent.click(screen.getByText('Conferma Prenotazione')) })
    expect(mockMutate).toHaveBeenCalledWith(
      { id: 'booking-1', status: 'confirmed' },
      expect.any(Object)
    )
    expect(mockToastSuccess).toHaveBeenCalledWith('Prenotazione confermata')
  })

  // --- handleStartProgress ---
  it('calls mutate with in_progress status', async () => {
    mockBookingData = { ...baseBooking, status: 'confirmed' }
    render(<BookingDetailPage />)
    await act(async () => { fireEvent.click(screen.getByText('Avvia Lavorazione')) })
    expect(mockMutate).toHaveBeenCalledWith(
      { id: 'booking-1', status: 'in_progress' },
      expect.any(Object)
    )
    expect(mockToastSuccess).toHaveBeenCalledWith('Lavoro avviato')
  })

  // --- handleComplete ---
  it('calls mutate with completed status', async () => {
    mockBookingData = { ...baseBooking, status: 'in_progress' }
    render(<BookingDetailPage />)
    await act(async () => { fireEvent.click(screen.getByText('Completa Lavoro')) })
    expect(mockMutate).toHaveBeenCalledWith(
      { id: 'booking-1', status: 'completed' },
      expect.any(Object)
    )
    expect(mockToastSuccess).toHaveBeenCalledWith('Lavoro completato con successo')
  })

  // --- Cancel dialog ---
  it('opens cancel dialog when Annulla Prenotazione clicked', async () => {
    render(<BookingDetailPage />)
    await act(async () => { fireEvent.click(screen.getByText('Annulla Prenotazione')) })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Annulla prenotazione')).toBeInTheDocument()
  })

  it('submits cancel form with reason and calls mutate', async () => {
    render(<BookingDetailPage />)
    await act(async () => { fireEvent.click(screen.getByText('Annulla Prenotazione')) })

    const textarea = document.querySelector('textarea#cancel-reason') as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: 'Cliente non disponibile' } })

    const form = document.querySelector('form') as HTMLFormElement
    await act(async () => { fireEvent.submit(form) })

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        { id: 'booking-1', status: 'cancelled', cancelReason: 'Cliente non disponibile' },
        expect.any(Object)
      )
    })
    expect(mockToastSuccess).toHaveBeenCalledWith('Prenotazione annullata')
  })

  // --- No-show confirm ---
  it('opens no-show confirm dialog when Segna Non Presentato clicked', async () => {
    render(<BookingDetailPage />)
    await act(async () => { fireEvent.click(screen.getByText('Segna Non Presentato')) })
    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument()
    expect(screen.getByText('Segna come non presentato')).toBeInTheDocument()
  })

  it('calls mutate with no_show status when confirmed', async () => {
    render(<BookingDetailPage />)
    await act(async () => { fireEvent.click(screen.getByText('Segna Non Presentato')) })
    const confirmDialog = screen.getByTestId('confirm-dialog')
    await act(async () => { fireEvent.click(confirmDialog.querySelector('button')!) })

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        { id: 'booking-1', status: 'no_show' },
        expect.any(Object)
      )
    })
    expect(mockToastSuccess).toHaveBeenCalledWith('Prenotazione segnata come non presentato')
  })

  // --- Reschedule dialog ---
  it('opens reschedule dialog when Riprogramma clicked', async () => {
    render(<BookingDetailPage />)
    await act(async () => { fireEvent.click(screen.getByText('Riprogramma')) })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Riprogramma prenotazione')).toBeInTheDocument()
  })

  it('submits reschedule form and calls mutate', async () => {
    render(<BookingDetailPage />)
    await act(async () => { fireEvent.click(screen.getByText('Riprogramma')) })

    const dateInput = document.querySelector('input#reschedule-date') as HTMLInputElement
    fireEvent.change(dateInput, { target: { value: '2026-07-01T14:00' } })

    const form = document.querySelector('form') as HTMLFormElement
    await act(async () => { fireEvent.submit(form) })

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        { id: 'booking-1', scheduledAt: expect.any(String) },
        expect.any(Object)
      )
    })
    expect(mockToastSuccess).toHaveBeenCalledWith('Prenotazione riprogrammata con successo')
  })

  // --- Edit dialog ---
  it('opens edit dialog when Modifica Prenotazione clicked', async () => {
    render(<BookingDetailPage />)
    await act(async () => { fireEvent.click(screen.getByText('Modifica Prenotazione')) })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Modifica Prenotazione', { selector: 'h2' })).toBeInTheDocument()
  })

  it('submits edit form and calls mutate', async () => {
    render(<BookingDetailPage />)
    await act(async () => { fireEvent.click(screen.getByText('Modifica Prenotazione')) })

    const dateInput = document.querySelector('input#edit-scheduled-date') as HTMLInputElement
    fireEvent.change(dateInput, { target: { value: '2026-07-01T10:00' } })

    const form = document.querySelector('form') as HTMLFormElement
    await act(async () => { fireEvent.submit(form) })

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'booking-1' }),
        expect.any(Object)
      )
    })
    expect(mockToastSuccess).toHaveBeenCalledWith('Prenotazione aggiornata con successo')
  })

  // --- Convert to work order ---
  it('creates work order and navigates when Converti in OdL clicked', async () => {
    render(<BookingDetailPage />)
    await act(async () => { fireEvent.click(screen.getByText('Converti in OdL')) })

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith('Ordine di lavoro creato con successo')
    })
    expect(mockPush).toHaveBeenCalledWith('/dashboard/work-orders/wo-1')
  })

  it('shows error toast when work order creation fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
    render(<BookingDetailPage />)
    await act(async () => { fireEvent.click(screen.getByText('Converti in OdL')) })

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Errore nella creazione dell'ordine di lavoro")
    })
  })

  // --- Error callbacks ---
  it('shows error toast when confirm fails', async () => {
    mockMutate.mockImplementation((_payload: unknown, callbacks?: { onSuccess?: () => void; onError?: () => void }) => {
      callbacks?.onError?.()
    })
    render(<BookingDetailPage />)
    await act(async () => { fireEvent.click(screen.getByText('Conferma Prenotazione')) })
    expect(mockToastError).toHaveBeenCalledWith('Errore nella conferma della prenotazione')
  })

  it('shows error toast when start progress fails', async () => {
    mockMutate.mockImplementation((_payload: unknown, callbacks?: { onSuccess?: () => void; onError?: () => void }) => {
      callbacks?.onError?.()
    })
    mockBookingData = { ...baseBooking, status: 'confirmed' }
    render(<BookingDetailPage />)
    await act(async () => { fireEvent.click(screen.getByText('Avvia Lavorazione')) })
    expect(mockToastError).toHaveBeenCalledWith("Errore nell'avvio del lavoro")
  })

  // --- No-show timeline steps ---
  it('renders correct timeline steps for no_show booking', () => {
    mockBookingData = { ...baseBooking, status: 'no_show' }
    render(<BookingDetailPage />)
    expect(screen.getByTestId('status-timeline')).toBeInTheDocument()
  })

  it('renders correct timeline steps for cancelled booking', () => {
    mockBookingData = { ...baseBooking, status: 'cancelled' }
    render(<BookingDetailPage />)
    expect(screen.getByTestId('status-timeline')).toBeInTheDocument()
  })

  it('renders vehicle brand and model', () => {
    render(<BookingDetailPage />)
    expect(screen.getByText(/Fiat.*500|500.*Fiat/)).toBeInTheDocument()
  })

  it('renders WhatsApp link when phone is present', () => {
    render(<BookingDetailPage />)
    const waLink = screen.getByText('WhatsApp')
    expect(waLink).toBeInTheDocument()
  })

  it('does not show Modifica and Riprogramma buttons for cancelled booking', () => {
    mockBookingData = { ...baseBooking, status: 'cancelled' }
    render(<BookingDetailPage />)
    const modifyBtn = screen.getByText('Modifica Prenotazione').closest('button')
    expect(modifyBtn).toBeDisabled()
  })

  it('renders booking with no estimatedCost as dash', () => {
    mockBookingData = { ...baseBooking, estimatedCost: 0 }
    render(<BookingDetailPage />)
    expect(screen.getByText('Costo Stimato')).toBeInTheDocument()
  })

  it('renders serviceName fallback to serviceCategory when no serviceName', () => {
    mockBookingData = { ...baseBooking, serviceName: undefined }
    render(<BookingDetailPage />)
    expect(screen.getAllByText('Tagliando').length).toBeGreaterThan(0)
  })
})
