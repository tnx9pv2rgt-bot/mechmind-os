import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// ---- Navigation ----
const mockPush = jest.fn()
const mockParamsId = { id: 'v-1' }
let mockSearchParamsData: Record<string, string | null> = {}

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useParams: () => mockParamsId,
  useSearchParams: () => ({
    get: (key: string) => mockSearchParamsData[key] ?? null,
    toString: () => Object.entries(mockSearchParamsData)
      .filter(([, v]) => v !== null)
      .map(([k, v]) => `${k}=${v}`)
      .join('&'),
  }),
}))

// ---- next/link ----
jest.mock('next/link', () => {
  const React = require('react')
  return function Link({ href, children }: { href: string; children: React.ReactNode }) {
    return React.createElement('a', { href }, children)
  }
})

// ---- SWR ----
let mockData: unknown = undefined
let mockError: unknown = undefined
let mockIsLoading = false
const mockMutate = jest.fn()

jest.mock('swr', () => ({
  __esModule: true,
  default: () => ({ data: mockData, error: mockError, isLoading: mockIsLoading, mutate: mockMutate }),
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

// ---- UI ----
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
    icon,
    'aria-label': ariaLabel,
  }: {
    children?: React.ReactNode
    onClick?: () => void
    disabled?: boolean
    loading?: boolean
    icon?: React.ReactNode
    'aria-label'?: string
  }) =>
    React.createElement('button', { onClick, disabled: disabled || loading, 'aria-label': ariaLabel }, icon, children),
}))

jest.mock('@/components/ui/breadcrumb', () => ({
  Breadcrumb: ({ items }: { items: { label: string }[] }) =>
    React.createElement('nav', null, ...items.map(i => React.createElement('span', { key: i.label }, i.label))),
}))

// ---- Pattern components ----
jest.mock('@/components/patterns/error-state', () => ({
  ErrorState: ({ title, onRetry }: { title?: string; onRetry?: () => void }) =>
    React.createElement('div', null,
      React.createElement('p', null, title ?? 'Errore'),
      onRetry ? React.createElement('button', { onClick: onRetry }, 'Riprova') : null,
    ),
}))

jest.mock('@/components/patterns/empty-state', () => ({
  EmptyState: ({ title }: { title?: string }) =>
    React.createElement('div', null, title ?? 'Vuoto'),
}))

// ---- Vehicle sub-components ----
jest.mock('@/components/vehicles/service-history', () => ({
  ServiceHistory: ({ vehicleId }: { vehicleId: string }) =>
    React.createElement('div', { 'data-testid': 'service-history' }, `ServiceHistory:${vehicleId}`),
}))

jest.mock('@/components/vehicles/maintenance-alerts', () => ({
  MaintenanceAlerts: ({ vehicle }: { vehicle: { id: string } }) =>
    React.createElement('div', { 'data-testid': 'maintenance-alerts' }, `MaintenanceAlerts:${vehicle.id}`),
}))

jest.mock('@/components/vehicles/vehicle-documents', () => ({
  VehicleDocuments: ({ vehicleId }: { vehicleId: string }) =>
    React.createElement('div', { 'data-testid': 'vehicle-documents' }, `VehicleDocuments:${vehicleId}`),
}))

// ---- @/lib/utils/format ----
jest.mock('@/lib/utils/format', () => ({
  formatPlate: (p: string) => p?.toUpperCase() ?? p,
  formatNumber: (n: number) => n.toLocaleString('it-IT'),
  formatDate: (d: string) => d ? d.split('T')[0] : '',
  formatCurrency: (n: number) => `€${n.toFixed(2)}`,
}))

// ---- fetch mock ----
const mockFetch = jest.fn()
global.fetch = mockFetch

function makeVehicle(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'v-1',
    licensePlate: 'AB123CD',
    make: 'Fiat',
    model: 'Panda',
    year: 2020,
    vin: 'VIN123456789',
    color: 'Bianco',
    fuelType: 'BENZINA',
    mileage: 50000,
    status: 'ACTIVE',
    customerId: 'c-1',
    revisionExpiry: null,
    insuranceExpiry: null,
    taxExpiry: null,
    lastServiceDate: null,
    nextServiceDueKm: null,
    customer: { id: 'c-1', firstName: 'Mario', lastName: 'Rossi', email: 'mario@test.com', phone: '0123456789' },
    workOrders: [],
    inspections: [],
    obdData: undefined,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

import VehicleDetailPage from '@/app/dashboard/vehicles/[id]/page'

beforeEach(() => {
  mockSearchParamsData = {}
  mockData = { data: makeVehicle() }
  mockError = undefined
  mockIsLoading = false
  mockPush.mockClear()
  mockMutate.mockClear()
  mockFetch.mockClear()
  mockToastSuccess.mockClear()
  mockToastError.mockClear()
  global.fetch = mockFetch
})

describe('VehicleDetailPage', () => {
  describe('stati di caricamento', () => {
    it('mostra spinner durante il caricamento', () => {
      mockIsLoading = true
      mockData = undefined
      render(<VehicleDetailPage />)
      expect(document.querySelector('[data-icon="Loader2"]')).toBeTruthy()
    })

    it('mostra ErrorState se SWR restituisce errore', () => {
      mockError = new Error('Not found')
      mockData = undefined
      render(<VehicleDetailPage />)
      expect(screen.getByText('Veicolo non trovato')).toBeInTheDocument()
    })

    it('click Riprova chiama mutate', () => {
      mockError = new Error('err')
      mockData = undefined
      render(<VehicleDetailPage />)
      fireEvent.click(screen.getByText('Riprova'))
      expect(mockMutate).toHaveBeenCalled()
    })

    it('mostra ErrorState se rawData è null', () => {
      mockData = null
      render(<VehicleDetailPage />)
      expect(screen.getByText('Veicolo non trovato')).toBeInTheDocument()
    })
  })

  describe('rendering tab dettagli', () => {
    it('mostra targa del veicolo', () => {
      render(<VehicleDetailPage />)
      expect(screen.getAllByText('AB123CD').length).toBeGreaterThan(0)
    })

    it('mostra marca e modello', () => {
      render(<VehicleDetailPage />)
      expect(screen.getByText(/Fiat.*Panda/)).toBeInTheDocument()
    })

    it('mostra tab Dettagli attivo di default', () => {
      render(<VehicleDetailPage />)
      expect(screen.getByText('Dettagli')).toBeInTheDocument()
    })

    it('mostra tutti i 6 tab', () => {
      render(<VehicleDetailPage />)
      expect(screen.getByText('Dettagli')).toBeInTheDocument()
      expect(screen.getByText('Manutenzione')).toBeInTheDocument()
      expect(screen.getByText('Documenti')).toBeInTheDocument()
      expect(screen.getByText('Storico OdL')).toBeInTheDocument()
      expect(screen.getByText('Ispezioni')).toBeInTheDocument()
      expect(screen.getByText('OBD')).toBeInTheDocument()
    })

    it('mostra proprietario con link', () => {
      render(<VehicleDetailPage />)
      expect(screen.getAllByText('Mario Rossi').length).toBeGreaterThan(0)
    })

    it('mostra email proprietario', () => {
      render(<VehicleDetailPage />)
      expect(screen.getByText('mario@test.com')).toBeInTheDocument()
    })

    it('mostra telefono proprietario', () => {
      render(<VehicleDetailPage />)
      expect(screen.getByText('0123456789')).toBeInTheDocument()
    })

    it('mostra chilometraggio formattato', () => {
      render(<VehicleDetailPage />)
      expect(screen.getByText(/50/)).toBeInTheDocument()
    })

    it('accetta risposta diretta senza data wrapper', () => {
      mockData = makeVehicle()
      render(<VehicleDetailPage />)
      expect(screen.getAllByText('AB123CD').length).toBeGreaterThan(0)
    })
  })

  describe('tab navigation', () => {
    it('click tab Manutenzione naviga', () => {
      render(<VehicleDetailPage />)
      fireEvent.click(screen.getByText('Manutenzione'))
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('tab=manutenzione'))
    })

    it('click tab Documenti naviga', () => {
      render(<VehicleDetailPage />)
      fireEvent.click(screen.getByText('Documenti'))
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('tab=documenti'))
    })

    it('click tab Storico OdL naviga', () => {
      render(<VehicleDetailPage />)
      fireEvent.click(screen.getByText('Storico OdL'))
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('tab=storico-odl'))
    })
  })

  describe('tab manutenzione', () => {
    beforeEach(() => {
      mockSearchParamsData = { tab: 'manutenzione' }
    })

    it('mostra MaintenanceAlerts', () => {
      render(<VehicleDetailPage />)
      expect(screen.getByTestId('maintenance-alerts')).toBeInTheDocument()
    })

    it('mostra ServiceHistory', () => {
      render(<VehicleDetailPage />)
      expect(screen.getByTestId('service-history')).toBeInTheDocument()
    })
  })

  describe('tab documenti', () => {
    it('mostra VehicleDocuments', () => {
      mockSearchParamsData = { tab: 'documenti' }
      render(<VehicleDetailPage />)
      expect(screen.getByTestId('vehicle-documents')).toBeInTheDocument()
    })
  })

  describe('tab storico OdL', () => {
    it('mostra EmptyState quando non ci sono work orders', () => {
      mockSearchParamsData = { tab: 'storico-odl' }
      render(<VehicleDetailPage />)
      expect(screen.getByText('Nessun ordine di lavoro')).toBeInTheDocument()
    })

    it('mostra work orders quando presenti', () => {
      mockSearchParamsData = { tab: 'storico-odl' }
      mockData = {
        data: makeVehicle({
          workOrders: [{
            id: 'wo-1', woNumber: 'WO-001', status: 'COMPLETED',
            totalCost: 150, createdAt: '2024-01-15T00:00:00Z',
          }],
        }),
      }
      render(<VehicleDetailPage />)
      expect(screen.getByText('WO-001')).toBeInTheDocument()
    })

    it('mostra status sconosciuto come raw value', () => {
      mockSearchParamsData = { tab: 'storico-odl' }
      mockData = {
        data: makeVehicle({
          workOrders: [{
            id: 'wo-2', woNumber: 'WO-002', status: 'UNKNOWN_STATUS',
            totalCost: 0, createdAt: '2024-01-15T00:00:00Z',
          }],
        }),
      }
      render(<VehicleDetailPage />)
      expect(screen.getByText('UNKNOWN_STATUS')).toBeInTheDocument()
    })
  })

  describe('tab ispezioni', () => {
    it('mostra EmptyState quando non ci sono ispezioni', () => {
      mockSearchParamsData = { tab: 'ispezioni' }
      render(<VehicleDetailPage />)
      expect(screen.getByText('Nessuna ispezione')).toBeInTheDocument()
    })

    it('mostra ispezione COMPLETED', () => {
      mockSearchParamsData = { tab: 'ispezioni' }
      mockData = {
        data: makeVehicle({
          inspections: [{
            id: 'ins-1', inspectionNumber: 'INS-001',
            status: 'COMPLETED', createdAt: '2024-01-15T00:00:00Z',
          }],
        }),
      }
      render(<VehicleDetailPage />)
      expect(screen.getByText('INS-001')).toBeInTheDocument()
      expect(screen.getByText('Completata')).toBeInTheDocument()
    })

    it('mostra ispezione In corso per status non-COMPLETED', () => {
      mockSearchParamsData = { tab: 'ispezioni' }
      mockData = {
        data: makeVehicle({
          inspections: [{
            id: 'ins-2', inspectionNumber: 'INS-002',
            status: 'IN_PROGRESS', createdAt: '2024-01-15T00:00:00Z',
          }],
        }),
      }
      render(<VehicleDetailPage />)
      expect(screen.getByText('In corso')).toBeInTheDocument()
    })

    it('mostra overallCondition se presente', () => {
      mockSearchParamsData = { tab: 'ispezioni' }
      mockData = {
        data: makeVehicle({
          inspections: [{
            id: 'ins-3', inspectionNumber: 'INS-003',
            status: 'COMPLETED', createdAt: '2024-01-15T00:00:00Z',
            overallCondition: 'GOOD',
          }],
        }),
      }
      render(<VehicleDetailPage />)
      expect(screen.getByText(/Condizione: GOOD/)).toBeInTheDocument()
    })
  })

  describe('tab OBD', () => {
    it('mostra EmptyState quando obdData è undefined', () => {
      mockSearchParamsData = { tab: 'obd' }
      render(<VehicleDetailPage />)
      expect(screen.getByText('Nessun dispositivo OBD collegato')).toBeInTheDocument()
    })

    it('mostra EmptyState quando obdData.connected è false', () => {
      mockSearchParamsData = { tab: 'obd' }
      mockData = { data: makeVehicle({ obdData: { connected: false } }) }
      render(<VehicleDetailPage />)
      expect(screen.getByText('Nessun dispositivo OBD collegato')).toBeInTheDocument()
    })

    it('mostra dati OBD quando connected è true', () => {
      mockSearchParamsData = { tab: 'obd' }
      mockData = {
        data: makeVehicle({
          obdData: {
            connected: true,
            engineRpm: 1500,
            coolantTemp: 90,
            batteryVoltage: 12.5,
            lastReading: '2024-01-15T00:00:00Z',
          },
        }),
      }
      render(<VehicleDetailPage />)
      expect(screen.getByText('Dispositivo connesso')).toBeInTheDocument()
      expect(screen.getByText('1500')).toBeInTheDocument()
      expect(screen.getByText('90')).toBeInTheDocument()
    })

    it('mostra codici DTC quando presenti', () => {
      mockSearchParamsData = { tab: 'obd' }
      mockData = {
        data: makeVehicle({
          obdData: {
            connected: true,
            dtcCodes: ['P0301', 'P0302'],
          },
        }),
      }
      render(<VehicleDetailPage />)
      expect(screen.getByText('P0301')).toBeInTheDocument()
      expect(screen.getByText('P0302')).toBeInTheDocument()
    })
  })

  describe('modalità editing', () => {
    it('mostra form di modifica quando isEditing è true', () => {
      mockSearchParamsData = { tab: 'dettagli', edit: 'true' }
      render(<VehicleDetailPage />)
      expect(screen.getByText('Modifica Veicolo')).toBeInTheDocument()
    })

    it('non mostra bottone Modifica quando in modalità editing', () => {
      mockSearchParamsData = { tab: 'dettagli', edit: 'true' }
      render(<VehicleDetailPage />)
      expect(screen.queryByText('Modifica')).not.toBeInTheDocument()
    })

    it('mostra bottone Modifica quando non in editing', () => {
      render(<VehicleDetailPage />)
      expect(screen.getByText('Modifica')).toBeInTheDocument()
    })

    it('click Modifica naviga a ?tab=dettagli&edit=true', () => {
      render(<VehicleDetailPage />)
      fireEvent.click(screen.getByText('Modifica'))
      expect(mockPush).toHaveBeenCalledWith('/dashboard/vehicles/v-1?tab=dettagli&edit=true')
    })

    it('click Annulla nel form chiama handleCancelEdit', () => {
      mockSearchParamsData = { tab: 'dettagli', edit: 'true' }
      render(<VehicleDetailPage />)
      const cancelBtn = screen.getAllByText('Annulla')[0]
      fireEvent.click(cancelBtn)
      expect(mockPush).toHaveBeenCalledWith(expect.not.stringContaining('edit=true'))
    })

    it('submit salva chiama PUT API', async () => {
      mockSearchParamsData = { tab: 'dettagli', edit: 'true' }
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({}),
      })
      render(<VehicleDetailPage />)
      fireEvent.click(screen.getByText('Salva'))
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/dashboard/vehicles/v-1',
          expect.objectContaining({ method: 'PUT' }),
        )
      })
    })

    it('submit successo mostra toast', async () => {
      mockSearchParamsData = { tab: 'dettagli', edit: 'true' }
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({}),
      })
      render(<VehicleDetailPage />)
      fireEvent.click(screen.getByText('Salva'))
      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith('Veicolo aggiornato')
      })
    })

    it('submit con targa vuota mostra toast error', async () => {
      mockSearchParamsData = { tab: 'dettagli', edit: 'true' }
      mockData = { data: makeVehicle({ licensePlate: '' }) }
      render(<VehicleDetailPage />)
      fireEvent.click(screen.getByText('Salva'))
      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Targa obbligatoria')
      })
    })

    it('submit errore API mostra toast error', async () => {
      mockSearchParamsData = { tab: 'dettagli', edit: 'true' }
      mockFetch.mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({ message: 'Veicolo non aggiornabile' }),
      })
      render(<VehicleDetailPage />)
      fireEvent.click(screen.getByText('Salva'))
      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Veicolo non aggiornabile')
      })
    })
  })

  describe('veicolo senza proprietario', () => {
    it('renderizza senza errori se customer è undefined', () => {
      mockData = { data: makeVehicle({ customer: undefined }) }
      render(<VehicleDetailPage />)
      expect(screen.getAllByText('AB123CD').length).toBeGreaterThan(0)
    })

    it('veicolo senza anno non mostra anno', () => {
      mockData = { data: makeVehicle({ year: undefined }) }
      render(<VehicleDetailPage />)
      expect(screen.getAllByText('AB123CD').length).toBeGreaterThan(0)
    })
  })
})
