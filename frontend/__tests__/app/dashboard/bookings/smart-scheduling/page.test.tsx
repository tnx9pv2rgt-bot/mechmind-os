import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

// ---- SWR ----
const mockSWR = jest.fn()
jest.mock('swr', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockSWR(...args),
}))

jest.mock('@/lib/swr-fetcher', () => ({
  fetcher: jest.fn(),
}))

// ---- fetch ----
const mockFetch = jest.fn()
global.fetch = mockFetch

// ---- sonner ----
const mockToastSuccess = jest.fn()
const mockToastError = jest.fn()
const mockToastInfo = jest.fn()
jest.mock('sonner', () => ({
  toast: {
    success: (...a: unknown[]) => mockToastSuccess(...a),
    error: (...a: unknown[]) => mockToastError(...a),
    info: (...a: unknown[]) => mockToastInfo(...a),
  },
}))

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

// ---- UI components ----
jest.mock('@/components/ui/breadcrumb', () => ({
  Breadcrumb: ({ items }: { items: { label: string; href?: string }[] }) =>
    React.createElement('nav', { 'data-testid': 'breadcrumb' },
      items.map(i => React.createElement('span', { key: i.label }, i.label))
    ),
}))

jest.mock('@/components/ui/apple-card', () => ({
  AppleCard: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'apple-card' }, children),
  AppleCardContent: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'apple-card-content' }, children),
  AppleCardHeader: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'apple-card-header' }, children),
}))

jest.mock('@/components/ui/apple-button', () => ({
  AppleButton: ({ children, onClick, disabled, loading, icon, variant, fullWidth }: {
    children?: React.ReactNode
    onClick?: () => void
    disabled?: boolean
    loading?: boolean
    icon?: React.ReactNode
    variant?: string
    fullWidth?: boolean
  }) => React.createElement('button', {
    onClick,
    disabled: disabled || loading,
    'data-variant': variant,
    'data-loading': loading,
    'data-full-width': fullWidth,
  }, children),
}))

jest.mock('@/components/patterns/error-state', () => ({
  ErrorState: ({ variant, onRetry }: { variant?: string; onRetry?: () => void; className?: string }) =>
    React.createElement('div', { 'data-testid': 'error-state', 'data-variant': variant },
      React.createElement('button', { onClick: onRetry }, 'Ricarica')
    ),
}))

jest.mock('@/lib/utils/format', () => ({
  formatDate: (d: string) => d,
  formatDateTime: (d: string) => d,
}))

// ---- import AFTER mocks ----
import SmartSchedulingPage from '@/app/dashboard/bookings/smart-scheduling/page'

const makeCapacityData = (utilizations: number[]) => ({
  data: utilizations.map((u, i) => ({
    date: `2026-01-${String(i + 1).padStart(2, '0')}`,
    utilization: u,
  })),
})

beforeEach(() => {
  jest.clearAllMocks()
  // Default SWR returns loaded capacity data
  mockSWR.mockReturnValue({ data: makeCapacityData([50, 75, 95, 30]), error: null })
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ data: [] }),
  })
})

describe('SmartSchedulingPage', () => {
  it('renders the page heading', () => {
    render(<SmartSchedulingPage />)
    expect(screen.getByText('Schedulazione Smart AI')).toBeInTheDocument()
  })

  it('renders breadcrumb', () => {
    render(<SmartSchedulingPage />)
    expect(screen.getByTestId('breadcrumb')).toBeInTheDocument()
    expect(screen.getByText('Schedulazione Smart')).toBeInTheDocument()
  })

  it('renders the slot suggestion form', () => {
    render(<SmartSchedulingPage />)
    expect(screen.getByText('Trova slot ottimali')).toBeInTheDocument()
    expect(screen.getByText('Tipo di servizio')).toBeInTheDocument()
    expect(screen.getByText('Durata stimata (min)')).toBeInTheDocument()
    expect(screen.getByText('Data preferita')).toBeInTheDocument()
  })

  it('renders the day optimizer section', () => {
    render(<SmartSchedulingPage />)
    expect(screen.getByText('Ottimizzazione giornata')).toBeInTheDocument()
    expect(screen.getByText('Data da ottimizzare')).toBeInTheDocument()
  })

  it('renders the capacity forecast section', () => {
    render(<SmartSchedulingPage />)
    expect(screen.getByText(/Previsione capacita/)).toBeInTheDocument()
  })

  it('shows capacity chart when data is available', () => {
    render(<SmartSchedulingPage />)
    // Shows utilization percentages
    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
    expect(screen.getByText('95%')).toBeInTheDocument()
  })

  it('shows loading skeleton when capacity data is not yet loaded', () => {
    mockSWR.mockReturnValue({ data: undefined, error: null })
    const { container } = render(<SmartSchedulingPage />)
    // Skeleton bars rendered via animate-pulse
    const pulseBars = container.querySelectorAll('.animate-pulse')
    expect(pulseBars.length).toBeGreaterThan(0)
  })

  it('shows empty state when capacity data returns empty array', () => {
    mockSWR.mockReturnValue({ data: { data: [] }, error: null })
    render(<SmartSchedulingPage />)
    expect(screen.getByText('Nessun dato di capacita disponibile')).toBeInTheDocument()
  })

  it('shows ErrorState when capacity fetch errors', () => {
    mockSWR.mockReturnValue({ data: undefined, error: new Error('fail') })
    render(<SmartSchedulingPage />)
    expect(screen.getByTestId('error-state')).toBeInTheDocument()
  })

  it('shows error toast when serviceType is missing on suggest', async () => {
    render(<SmartSchedulingPage />)
    const btn = screen.getByText('Suggerisci slot ottimali')
    await act(async () => { fireEvent.click(btn) })
    expect(mockToastError).toHaveBeenCalledWith('Seleziona un tipo di servizio')
  })

  it('shows error toast when preferredDate is missing on suggest', async () => {
    render(<SmartSchedulingPage />)
    // Select a service type
    const select = document.querySelector('select') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'Tagliando' } })

    const btn = screen.getByText('Suggerisci slot ottimali')
    await act(async () => { fireEvent.click(btn) })
    expect(mockToastError).toHaveBeenCalledWith('Seleziona una data preferita')
  })

  it('shows info toast when API returns empty slots', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) })

    render(<SmartSchedulingPage />)
    const select = document.querySelector('select') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'Tagliando' } })

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement
    fireEvent.change(dateInput, { target: { value: '2026-06-01' } })

    const btn = screen.getByText('Suggerisci slot ottimali')
    await act(async () => { fireEvent.click(btn) })

    await waitFor(() => {
      expect(mockToastInfo).toHaveBeenCalledWith('Nessuno slot disponibile trovato per i criteri selezionati')
    })
  })

  it('shows success toast with slot count when slots are returned', async () => {
    const slots = [
      { id: 's1', dateTime: '2026-06-01T09:00:00', bayName: 'Ponte 1', technicianName: 'Mario', aiScore: 85, reasoning: 'Ottimale' },
      { id: 's2', dateTime: '2026-06-01T11:00:00', bayName: 'Ponte 2', technicianName: 'Luigi', aiScore: 72, reasoning: 'Buono' },
    ]
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ data: slots }) })

    render(<SmartSchedulingPage />)
    const select = document.querySelector('select') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'Tagliando' } })

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement
    fireEvent.change(dateInput, { target: { value: '2026-06-01' } })

    await act(async () => { fireEvent.click(screen.getByText('Suggerisci slot ottimali')) })

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith('2 slot suggeriti')
    })
  })

  it('shows suggested slots section after receiving results', async () => {
    const slots = [
      { id: 's1', dateTime: '2026-06-01T09:00:00', bayName: 'Ponte 1', technicianName: 'Mario', aiScore: 85, reasoning: 'Ottimale' },
    ]
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ data: slots }) })

    render(<SmartSchedulingPage />)
    const select = document.querySelector('select') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'Freni' } })

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement
    fireEvent.change(dateInput, { target: { value: '2026-06-01' } })

    await act(async () => { fireEvent.click(screen.getByText('Suggerisci slot ottimali')) })

    await waitFor(() => {
      expect(screen.getByText('Slot suggeriti')).toBeInTheDocument()
    })
    expect(screen.getByText('Migliore')).toBeInTheDocument()
    expect(screen.getByText('85%')).toBeInTheDocument()
    expect(screen.getByText('Ottimale')).toBeInTheDocument()
  })

  it('shows error toast when suggest API fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })

    render(<SmartSchedulingPage />)
    const select = document.querySelector('select') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'Tagliando' } })

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement
    fireEvent.change(dateInput, { target: { value: '2026-06-01' } })

    await act(async () => { fireEvent.click(screen.getByText('Suggerisci slot ottimali')) })

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Errore nel calcolo degli slot ottimali')
    })
  })

  it('books a slot successfully when Prenota is clicked', async () => {
    const slots = [
      { id: 's1', dateTime: '2026-06-01T09:00:00', bayName: 'Ponte 1', technicianName: 'Mario', aiScore: 90, reasoning: 'Top' },
    ]
    // First call: suggest slots, second call: book slot
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: slots }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })

    render(<SmartSchedulingPage />)
    const select = document.querySelector('select') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'Diagnosi' } })

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement
    fireEvent.change(dateInput, { target: { value: '2026-06-01' } })

    await act(async () => { fireEvent.click(screen.getByText('Suggerisci slot ottimali')) })

    await waitFor(() => {
      expect(screen.getByText('Prenota')).toBeInTheDocument()
    })

    await act(async () => { fireEvent.click(screen.getByText('Prenota')) })

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith('Prenotazione creata con successo')
    })
  })

  it('shows error toast when booking a slot fails', async () => {
    const slots = [
      { id: 's1', dateTime: '2026-06-01T09:00:00', bayName: 'Ponte 1', technicianName: 'Mario', aiScore: 70, reasoning: 'Ok' },
    ]
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: slots }) })
      .mockResolvedValueOnce({ ok: false, status: 422, json: async () => ({}) })

    render(<SmartSchedulingPage />)
    const select = document.querySelector('select') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'Revisione' } })

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement
    fireEvent.change(dateInput, { target: { value: '2026-06-01' } })

    await act(async () => { fireEvent.click(screen.getByText('Suggerisci slot ottimali')) })
    await waitFor(() => screen.getByText('Prenota'))

    await act(async () => { fireEvent.click(screen.getByText('Prenota')) })

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Errore nella creazione della prenotazione')
    })
  })

  it('shows error toast when optimize is clicked without a date', async () => {
    render(<SmartSchedulingPage />)
    const ottimizzaBtn = screen.getByText('Ottimizza giornata')
    await act(async () => { fireEvent.click(ottimizzaBtn) })
    expect(mockToastError).toHaveBeenCalledWith('Seleziona una data da ottimizzare')
  })

  it('shows optimization results when optimize succeeds', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          timeSavedMinutes: 45,
          currentUtilization: 60,
          optimizedUtilization: 85,
          changes: [
            { bookingId: 'b1', serviceName: 'Tagliando', currentSlot: '09:00', suggestedSlot: '10:00' },
          ],
        },
      }),
    })

    render(<SmartSchedulingPage />)
    const dateInputs = document.querySelectorAll('input[type="date"]')
    // Second date input is the optimize date
    const optimizeInput = dateInputs[1] as HTMLInputElement
    fireEvent.change(optimizeInput, { target: { value: '2026-06-01' } })

    await act(async () => { fireEvent.click(screen.getByText('Ottimizza giornata')) })

    await waitFor(() => {
      expect(screen.getByText('Tempo risparmiato: 45 minuti')).toBeInTheDocument()
    })
    expect(screen.getByText('60%')).toBeInTheDocument()
    expect(screen.getByText('85%')).toBeInTheDocument()
    expect(screen.getAllByText('Tagliando').length).toBeGreaterThan(0)
    expect(mockToastSuccess).toHaveBeenCalledWith('Ottimizzazione completata')
  })

  it('shows error toast when optimize API fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })

    render(<SmartSchedulingPage />)
    const dateInputs = document.querySelectorAll('input[type="date"]')
    const optimizeInput = dateInputs[1] as HTMLInputElement
    fireEvent.change(optimizeInput, { target: { value: '2026-06-01' } })

    await act(async () => { fireEvent.click(screen.getByText('Ottimizza giornata')) })

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Errore nell'ottimizzazione della giornata")
    })
  })

  it('renders duration input with default value 60', () => {
    render(<SmartSchedulingPage />)
    const durationInput = document.querySelector('input[type="number"]') as HTMLInputElement
    expect(durationInput?.value).toBe('60')
  })

  it('updates duration input on change', () => {
    render(<SmartSchedulingPage />)
    const durationInput = document.querySelector('input[type="number"]') as HTMLInputElement
    fireEvent.change(durationInput, { target: { value: '90' } })
    expect(durationInput.value).toBe('90')
  })

  it('updates required skills on change', () => {
    render(<SmartSchedulingPage />)
    const skillsInput = document.querySelector('input[type="text"]') as HTMLInputElement
    fireEvent.change(skillsInput, { target: { value: 'elettronica, freni' } })
    expect(skillsInput.value).toBe('elettronica, freni')
  })

  it('renders legend for capacity chart', () => {
    render(<SmartSchedulingPage />)
    expect(screen.getByText('<70%')).toBeInTheDocument()
    expect(screen.getByText('70-90%')).toBeInTheDocument()
    expect(screen.getByText('>90%')).toBeInTheDocument()
  })
})
