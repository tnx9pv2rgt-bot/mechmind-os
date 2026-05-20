import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

// ---- Navigation ----
jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'v-1' }),
}))

// ---- SWR ----
const mockUseSWR = jest.fn()
jest.mock('swr', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockUseSWR(...args),
}))

jest.mock('@/lib/swr-fetcher', () => ({ fetcher: jest.fn() }))

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

// ---- next/link ----
jest.mock('next/link', () => {
  const React = require('react')
  return function Link({ href, children }: { href: string; children: React.ReactNode }) {
    return React.createElement('a', { href }, children)
  }
})

// ---- UI components ----
jest.mock('@/components/ui/breadcrumb', () => ({
  Breadcrumb: ({ items }: { items: { label: string; href?: string }[] }) => {
    const React = require('react')
    return React.createElement('nav', { 'data-testid': 'breadcrumb' },
      ...items.map((i: { label: string }) => React.createElement('span', { key: i.label }, i.label)),
    )
  },
}))

jest.mock('@/components/ui/apple-card', () => ({
  AppleCard: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  AppleCardContent: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  AppleCardHeader: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
}))

jest.mock('@/components/ui/apple-button', () => ({
  AppleButton: ({
    children,
    onClick,
    disabled,
    loading,
    type,
    icon,
  }: {
    children?: React.ReactNode
    onClick?: () => void
    disabled?: boolean
    loading?: boolean
    type?: string
    icon?: React.ReactNode
  }) =>
    React.createElement('button', { onClick, disabled: disabled || loading, type: type ?? 'button' }, icon, children),
}))

jest.mock('@/components/patterns/error-state', () => ({
  ErrorState: ({ onRetry }: { onRetry?: () => void }) => {
    const React = require('react')
    return React.createElement('div', { 'data-testid': 'error-state' },
      React.createElement('button', { onClick: onRetry }, 'Riprova'),
    )
  },
}))

jest.mock('@/components/patterns/empty-state', () => ({
  EmptyState: ({ title, description }: { title: string; description?: string }) => {
    const React = require('react')
    return React.createElement('div', { 'data-testid': 'empty-state' },
      React.createElement('span', null, title),
      description ? React.createElement('span', null, description) : null,
    )
  },
}))

jest.mock('@/lib/utils/format', () => ({
  formatDate: (d: string) => `data:${d}`,
  formatNumber: (n: number) => `num:${n}`,
}))

// ---- fetch ----
const mockFetch = jest.fn()
global.fetch = mockFetch

import PredictiveMaintenancePage from '@/app/dashboard/vehicles/[id]/maintenance/page'

// ---- Helpers ----
const vehicle = {
  id: 'v-1',
  licensePlate: 'AB123CD',
  make: 'Fiat',
  model: 'Panda',
  year: 2020,
  mileage: 50000,
}

const makePrediction = (overrides: Partial<{
  id: string
  serviceType: string
  predictedDate: string
  predictedMileage: number
  confidence: number
  status: 'overdue' | 'due_soon' | 'upcoming' | 'completed'
  description: string
  lastPerformed: string
}> = {}) => ({
  id: 'pred-1',
  serviceType: 'Tagliando',
  predictedDate: '2024-06-01',
  predictedMileage: 60000,
  confidence: 85,
  status: 'upcoming' as const,
  description: 'Sostituzione filtri e olio',
  ...overrides,
})

const makeScheduleItem = (overrides: Partial<{
  service: string
  recommendedInterval: string
  lastDone: string
  isDone: boolean
}> = {}) => ({
  service: 'Cambio cinghia',
  recommendedInterval: '4 anni / 60.000 km',
  isDone: false,
  ...overrides,
})

beforeEach(() => {
  mockFetch.mockClear()
  mockToastSuccess.mockClear()
  mockToastError.mockClear()
mockUseSWR.mockClear()
})

describe('PredictiveMaintenancePage', () => {
  describe('loading state', () => {
    it('mostra spinner Loader2', () => {
      mockUseSWR.mockReturnValue({ data: undefined, isLoading: true, error: undefined })
      render(<PredictiveMaintenancePage />)
      expect(document.querySelector('[data-icon="Loader2"]')).toBeTruthy()
    })

    it('non mostra predizioni durante caricamento', () => {
      mockUseSWR.mockReturnValue({ data: undefined, isLoading: true, error: undefined })
      render(<PredictiveMaintenancePage />)
      expect(screen.queryByText('Manutenzioni previste')).not.toBeInTheDocument()
    })
  })

  describe('error state', () => {
    it('mostra ErrorState quando SWR ritorna errore', () => {
      mockUseSWR.mockReturnValue({ data: undefined, isLoading: false, error: new Error('500') })
      render(<PredictiveMaintenancePage />)
      expect(screen.getByTestId('error-state')).toBeInTheDocument()
    })

    it('mostra heading Manutenzione Predittiva anche in errore', () => {
      mockUseSWR.mockReturnValue({ data: undefined, isLoading: false, error: new Error('500') })
      render(<PredictiveMaintenancePage />)
      expect(screen.getAllByText('Manutenzione Predittiva').length).toBeGreaterThan(0)
    })

    it('click Riprova non genera eccezioni', () => {
      mockUseSWR.mockReturnValue({ data: undefined, isLoading: false, error: new Error('500') })
      render(<PredictiveMaintenancePage />)
      expect(() => fireEvent.click(screen.getByText('Riprova'))).not.toThrow()
    })
  })

  describe('empty state', () => {
    it('mostra EmptyState con predictions e schedule vuoti', () => {
      mockUseSWR.mockReturnValue({
        data: { data: { vehicle, predictions: [], manufacturerSchedule: [] } },
        isLoading: false,
        error: undefined,
      })
      render(<PredictiveMaintenancePage />)
      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
      expect(screen.getByText('Nessuna previsione disponibile')).toBeInTheDocument()
    })

    it('non mostra EmptyState quando ci sono predizioni', () => {
      mockUseSWR.mockReturnValue({
        data: { data: { vehicle, predictions: [makePrediction()], manufacturerSchedule: [] } },
        isLoading: false,
        error: undefined,
      })
      render(<PredictiveMaintenancePage />)
      expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument()
    })

    it('non mostra EmptyState quando ci sono voci nel schedule', () => {
      mockUseSWR.mockReturnValue({
        data: { data: { vehicle, predictions: [], manufacturerSchedule: [makeScheduleItem()] } },
        isLoading: false,
        error: undefined,
      })
      render(<PredictiveMaintenancePage />)
      expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument()
    })
  })

  describe('vehicle info subheader', () => {
    it('mostra make, model, year, targa e km', () => {
      mockUseSWR.mockReturnValue({
        data: { data: { vehicle, predictions: [], manufacturerSchedule: [] } },
        isLoading: false,
        error: undefined,
      })
      render(<PredictiveMaintenancePage />)
      expect(screen.getAllByText(/Fiat/).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/Panda/).length).toBeGreaterThan(0)
      expect(screen.getByText(/2020/)).toBeInTheDocument()
      expect(screen.getByText(/AB123CD/)).toBeInTheDocument()
      expect(screen.getByText(/num:50000/)).toBeInTheDocument()
    })

    it('non mostra year e km se assenti', () => {
      const vehicleNoYearKm = { id: 'v-1', licensePlate: 'AB123CD', make: 'Fiat', model: 'Panda' }
      mockUseSWR.mockReturnValue({
        data: { data: { vehicle: vehicleNoYearKm, predictions: [], manufacturerSchedule: [] } },
        isLoading: false,
        error: undefined,
      })
      render(<PredictiveMaintenancePage />)
      expect(screen.queryByText(/num:/)).not.toBeInTheDocument()
      expect(screen.queryByText(/\(20/)).not.toBeInTheDocument()
    })

    it('mostra Veicolo in breadcrumb quando vehicle è undefined', () => {
      mockUseSWR.mockReturnValue({
        data: { data: { vehicle: undefined, predictions: [makePrediction()], manufacturerSchedule: [] } },
        isLoading: false,
        error: undefined,
      })
      render(<PredictiveMaintenancePage />)
      expect(screen.getByText('Veicolo')).toBeInTheDocument()
    })

    it('mostra make+model in breadcrumb quando vehicle presente', () => {
      mockUseSWR.mockReturnValue({
        data: { data: { vehicle, predictions: [], manufacturerSchedule: [] } },
        isLoading: false,
        error: undefined,
      })
      render(<PredictiveMaintenancePage />)
      expect(screen.getByTestId('breadcrumb')).toBeInTheDocument()
      expect(screen.getByText('Fiat Panda')).toBeInTheDocument()
    })
  })

  describe('predictions section', () => {
    it('mostra header Manutenzioni previste', () => {
      mockUseSWR.mockReturnValue({
        data: { data: { vehicle, predictions: [makePrediction()], manufacturerSchedule: [] } },
        isLoading: false,
        error: undefined,
      })
      render(<PredictiveMaintenancePage />)
      expect(screen.getByText('Manutenzioni previste')).toBeInTheDocument()
    })

    it('mostra serviceType e description', () => {
      mockUseSWR.mockReturnValue({
        data: { data: { vehicle, predictions: [makePrediction()], manufacturerSchedule: [] } },
        isLoading: false,
        error: undefined,
      })
      render(<PredictiveMaintenancePage />)
      expect(screen.getByText('Tagliando')).toBeInTheDocument()
      expect(screen.getByText('Sostituzione filtri e olio')).toBeInTheDocument()
    })

    it('mostra formatDate e formatNumber per data e km previsti', () => {
      mockUseSWR.mockReturnValue({
        data: { data: { vehicle, predictions: [makePrediction()], manufacturerSchedule: [] } },
        isLoading: false,
        error: undefined,
      })
      render(<PredictiveMaintenancePage />)
      expect(screen.getByText('data:2024-06-01')).toBeInTheDocument()
      expect(screen.getByText('num:60000')).toBeInTheDocument()
    })

    it('mostra la percentuale di confidenza', () => {
      mockUseSWR.mockReturnValue({
        data: { data: { vehicle, predictions: [makePrediction({ confidence: 85 })], manufacturerSchedule: [] } },
        isLoading: false,
        error: undefined,
      })
      render(<PredictiveMaintenancePage />)
      expect(screen.getByText('85%')).toBeInTheDocument()
    })

    it('mostra lastPerformed quando presente', () => {
      mockUseSWR.mockReturnValue({
        data: { data: { vehicle, predictions: [makePrediction({ lastPerformed: '2023-06-01' })], manufacturerSchedule: [] } },
        isLoading: false,
        error: undefined,
      })
      render(<PredictiveMaintenancePage />)
      expect(screen.getByText('Ultimo intervento')).toBeInTheDocument()
      expect(screen.getByText('data:2023-06-01')).toBeInTheDocument()
    })

    it('non mostra lastPerformed quando assente', () => {
      mockUseSWR.mockReturnValue({
        data: { data: { vehicle, predictions: [makePrediction()], manufacturerSchedule: [] } },
        isLoading: false,
        error: undefined,
      })
      render(<PredictiveMaintenancePage />)
      expect(screen.queryByText('Ultimo intervento')).not.toBeInTheDocument()
    })

    it('mostra link Prenota con vehicleId e service codificato', () => {
      mockUseSWR.mockReturnValue({
        data: { data: { vehicle, predictions: [makePrediction({ serviceType: 'Cambio Olio' })], manufacturerSchedule: [] } },
        isLoading: false,
        error: undefined,
      })
      render(<PredictiveMaintenancePage />)
      const link = document.querySelector('a[href*="bookings/new"]') as HTMLAnchorElement
      expect(link).toBeTruthy()
      expect(link.href).toContain('vehicleId=v-1')
      expect(link.href).toContain('service=Cambio%20Olio')
    })
  })

  describe('status labels', () => {
    it('status overdue mostra Scaduto', () => {
      mockUseSWR.mockReturnValue({
        data: { data: { vehicle, predictions: [makePrediction({ status: 'overdue' })], manufacturerSchedule: [] } },
        isLoading: false,
        error: undefined,
      })
      render(<PredictiveMaintenancePage />)
      expect(screen.getByText('Scaduto')).toBeInTheDocument()
    })

    it('status due_soon mostra In scadenza', () => {
      mockUseSWR.mockReturnValue({
        data: { data: { vehicle, predictions: [makePrediction({ status: 'due_soon' })], manufacturerSchedule: [] } },
        isLoading: false,
        error: undefined,
      })
      render(<PredictiveMaintenancePage />)
      expect(screen.getByText('In scadenza')).toBeInTheDocument()
    })

    it('status upcoming mostra Futuro', () => {
      mockUseSWR.mockReturnValue({
        data: { data: { vehicle, predictions: [makePrediction({ status: 'upcoming' })], manufacturerSchedule: [] } },
        isLoading: false,
        error: undefined,
      })
      render(<PredictiveMaintenancePage />)
      expect(screen.getByText('Futuro')).toBeInTheDocument()
    })

    it('status completed mostra Completato', () => {
      mockUseSWR.mockReturnValue({
        data: { data: { vehicle, predictions: [makePrediction({ status: 'completed' })], manufacturerSchedule: [] } },
        isLoading: false,
        error: undefined,
      })
      render(<PredictiveMaintenancePage />)
      expect(screen.getByText('Completato')).toBeInTheDocument()
    })

    it('status sconosciuto usa fallback upcoming (Futuro)', () => {
      mockUseSWR.mockReturnValue({
        data: {
          data: {
            vehicle,
            predictions: [makePrediction({ status: 'unknown' as 'upcoming' })],
            manufacturerSchedule: [],
          },
        },
        isLoading: false,
        error: undefined,
      })
      render(<PredictiveMaintenancePage />)
      expect(screen.getByText('Futuro')).toBeInTheDocument()
    })
  })

  describe('confidence bar colore', () => {
    it('confidenza ≥80 usa classe status-success', () => {
      mockUseSWR.mockReturnValue({
        data: { data: { vehicle, predictions: [makePrediction({ confidence: 80 })], manufacturerSchedule: [] } },
        isLoading: false,
        error: undefined,
      })
      const { container } = render(<PredictiveMaintenancePage />)
      expect(container.innerHTML).toContain('status-success')
    })

    it('confidenza ≥60 <80 usa classe status-warning', () => {
      mockUseSWR.mockReturnValue({
        data: { data: { vehicle, predictions: [makePrediction({ confidence: 65 })], manufacturerSchedule: [] } },
        isLoading: false,
        error: undefined,
      })
      const { container } = render(<PredictiveMaintenancePage />)
      expect(container.innerHTML).toContain('status-warning')
    })

    it('confidenza <60 usa classe status-error', () => {
      mockUseSWR.mockReturnValue({
        data: { data: { vehicle, predictions: [makePrediction({ confidence: 40 })], manufacturerSchedule: [] } },
        isLoading: false,
        error: undefined,
      })
      const { container } = render(<PredictiveMaintenancePage />)
      expect(container.innerHTML).toContain('status-error')
    })
  })

  describe('manufacturer schedule', () => {
    it('mostra header Piano manutenzione costruttore', () => {
      mockUseSWR.mockReturnValue({
        data: { data: { vehicle, predictions: [], manufacturerSchedule: [makeScheduleItem()] } },
        isLoading: false,
        error: undefined,
      })
      render(<PredictiveMaintenancePage />)
      expect(screen.getByText('Piano manutenzione costruttore')).toBeInTheDocument()
    })

    it('mostra service e recommendedInterval', () => {
      mockUseSWR.mockReturnValue({
        data: { data: { vehicle, predictions: [], manufacturerSchedule: [makeScheduleItem()] } },
        isLoading: false,
        error: undefined,
      })
      render(<PredictiveMaintenancePage />)
      expect(screen.getByText('Cambio cinghia')).toBeInTheDocument()
      expect(screen.getByText(/4 anni \/ 60\.000 km/)).toBeInTheDocument()
    })

    it('isDone=false mostra icona Clock', () => {
      mockUseSWR.mockReturnValue({
        data: { data: { vehicle, predictions: [], manufacturerSchedule: [makeScheduleItem({ isDone: false })] } },
        isLoading: false,
        error: undefined,
      })
      render(<PredictiveMaintenancePage />)
      expect(document.querySelector('[data-icon="Clock"]')).toBeTruthy()
    })

    it('isDone=true mostra icona CheckCircle', () => {
      mockUseSWR.mockReturnValue({
        data: { data: { vehicle, predictions: [], manufacturerSchedule: [makeScheduleItem({ isDone: true })] } },
        isLoading: false,
        error: undefined,
      })
      render(<PredictiveMaintenancePage />)
      expect(document.querySelector('[data-icon="CheckCircle"]')).toBeTruthy()
    })

    it('lastDone presente mostra Ultimo: formatDate', () => {
      mockUseSWR.mockReturnValue({
        data: {
          data: {
            vehicle,
            predictions: [],
            manufacturerSchedule: [makeScheduleItem({ lastDone: '2023-01-15' })],
          },
        },
        isLoading: false,
        error: undefined,
      })
      render(<PredictiveMaintenancePage />)
      expect(screen.getByText(/Ultimo: data:2023-01-15/)).toBeInTheDocument()
    })

    it('lastDone assente non mostra Ultimo', () => {
      mockUseSWR.mockReturnValue({
        data: { data: { vehicle, predictions: [], manufacturerSchedule: [makeScheduleItem()] } },
        isLoading: false,
        error: undefined,
      })
      render(<PredictiveMaintenancePage />)
      expect(screen.queryByText(/Ultimo:/)).not.toBeInTheDocument()
    })

    it('non mostra sezione schedule quando è vuota', () => {
      mockUseSWR.mockReturnValue({
        data: { data: { vehicle, predictions: [makePrediction()], manufacturerSchedule: [] } },
        isLoading: false,
        error: undefined,
      })
      render(<PredictiveMaintenancePage />)
      expect(screen.queryByText('Piano manutenzione costruttore')).not.toBeInTheDocument()
    })
  })

  describe('handleSendReminder', () => {
    it('successo mostra toast success', async () => {
      mockUseSWR.mockReturnValue({
        data: { data: { vehicle, predictions: [makePrediction()], manufacturerSchedule: [] } },
        isLoading: false,
        error: undefined,
      })
      mockFetch.mockResolvedValue({ ok: true })
      render(<PredictiveMaintenancePage />)
      fireEvent.click(screen.getByText('Invia promemoria'))
      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith('Promemoria inviato al cliente')
      })
    })

    it('risposta !ok mostra toast error', async () => {
      mockUseSWR.mockReturnValue({
        data: { data: { vehicle, predictions: [makePrediction()], manufacturerSchedule: [] } },
        isLoading: false,
        error: undefined,
      })
      mockFetch.mockResolvedValue({ ok: false, status: 500 })
      render(<PredictiveMaintenancePage />)
      fireEvent.click(screen.getByText('Invia promemoria'))
      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalled()
      })
    })

    it('fetch throws mostra toast error', async () => {
      mockUseSWR.mockReturnValue({
        data: { data: { vehicle, predictions: [makePrediction()], manufacturerSchedule: [] } },
        isLoading: false,
        error: undefined,
      })
      mockFetch.mockRejectedValue(new Error('Network error'))
      render(<PredictiveMaintenancePage />)
      fireEvent.click(screen.getByText('Invia promemoria'))
      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalled()
      })
    })

    it('durante invio il bottone è disabilitato', async () => {
      mockUseSWR.mockReturnValue({
        data: { data: { vehicle, predictions: [makePrediction()], manufacturerSchedule: [] } },
        isLoading: false,
        error: undefined,
      })
      let resolvePromise: (v: unknown) => void = () => undefined
      mockFetch.mockReturnValue(new Promise(r => { resolvePromise = r }))
      render(<PredictiveMaintenancePage />)
      fireEvent.click(screen.getByText('Invia promemoria'))
      await waitFor(() => {
        expect(screen.getByText('Invia promemoria').closest('button')).toBeDisabled()
      })
      await act(async () => { resolvePromise({ ok: true }) })
      await waitFor(() => {
        expect(screen.getByText('Invia promemoria').closest('button')).not.toBeDisabled()
      })
    })

    it('dopo invio il bottone è di nuovo abilitato', async () => {
      mockUseSWR.mockReturnValue({
        data: { data: { vehicle, predictions: [makePrediction()], manufacturerSchedule: [] } },
        isLoading: false,
        error: undefined,
      })
      mockFetch.mockResolvedValue({ ok: true })
      render(<PredictiveMaintenancePage />)
      fireEvent.click(screen.getByText('Invia promemoria'))
      await waitFor(() => {
        expect(screen.getByText('Invia promemoria').closest('button')).not.toBeDisabled()
      })
    })

    it('chiama fetch con vehicleId e predictionId corretti', async () => {
      mockUseSWR.mockReturnValue({
        data: { data: { vehicle, predictions: [makePrediction({ id: 'pred-99' })], manufacturerSchedule: [] } },
        isLoading: false,
        error: undefined,
      })
      mockFetch.mockResolvedValue({ ok: true })
      render(<PredictiveMaintenancePage />)
      fireEvent.click(screen.getByText('Invia promemoria'))
      await waitFor(() => expect(mockFetch).toHaveBeenCalled())
      const [url, opts] = mockFetch.mock.calls[0]
      expect(url).toBe('/api/notifications')
      const body = JSON.parse((opts as { body: string }).body)
      expect(body.vehicleId).toBe('v-1')
      expect(body.predictionId).toBe('pred-99')
    })
  })

  describe('sezioni presenti insieme', () => {
    it('mostra sia predizioni che schedule quando entrambi presenti', () => {
      mockUseSWR.mockReturnValue({
        data: {
          data: {
            vehicle,
            predictions: [makePrediction()],
            manufacturerSchedule: [makeScheduleItem()],
          },
        },
        isLoading: false,
        error: undefined,
      })
      render(<PredictiveMaintenancePage />)
      expect(screen.getByText('Manutenzioni previste')).toBeInTheDocument()
      expect(screen.getByText('Piano manutenzione costruttore')).toBeInTheDocument()
    })
  })
})
