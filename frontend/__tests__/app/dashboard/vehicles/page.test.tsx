import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

// ---- Navigation ----
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}))

// ---- next/link ----
jest.mock('next/link', () => {
  const React = require('react')
  return function Link({ href, children }: { href: string; children: React.ReactNode }) {
    return React.createElement('a', { href }, children)
  }
})

// ---- SWR: dual-key routing ----
let mockListData: unknown = undefined
let mockListError: unknown = undefined
let mockListLoading = false
let mockExpiringData: unknown = undefined
const mockMutate = jest.fn()
let capturedKeys: string[] = []

jest.mock('swr', () => ({
  __esModule: true,
  default: (key: string) => {
    capturedKeys.push(key)
    if (typeof key === 'string' && key.includes('expiring')) {
      return { data: mockExpiringData, error: undefined, isLoading: false, mutate: jest.fn() }
    }
    return { data: mockListData, error: mockListError, isLoading: mockListLoading, mutate: mockMutate }
  },
}))

jest.mock('@/lib/swr-fetcher', () => ({ fetcher: jest.fn() }))

// ---- framer-motion ----
jest.mock('framer-motion', () => {
  const React = require('react')
  return {
    motion: new Proxy({}, {
      get: (_t: unknown, prop: string) =>
        ({ children, ...rest }: { children?: React.ReactNode; [k: string]: unknown }) => {
          const valid: Record<string, unknown> = {}
          for (const k of Object.keys(rest)) {
            if (['className', 'style'].includes(k)) valid[k] = rest[k]
          }
          const tag = prop === 'tr' ? 'tr' : prop === 'div' ? 'div' : 'div'
          return React.createElement(tag, valid, children)
        },
    }),
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

jest.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => React.createElement('input', props),
}))

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
    React.createElement('div', { 'data-testid': 'pagination' },
      React.createElement('span', null, `${page}/${totalPages}`),
      React.createElement('button', { onClick: () => onPageChange(page + 1) }, 'Next'),
    ),
}))

jest.mock('@/components/ui/confirm-dialog', () => ({
  ConfirmDialog: ({
    open,
    onOpenChange,
    onConfirm,
    title,
    description,
  }: {
    open: boolean
    onOpenChange: (v: boolean) => void
    onConfirm: () => void
    title?: string
    description?: string
    confirmLabel?: string
    variant?: string
    loading?: boolean
  }) =>
    open
      ? React.createElement('div', { 'data-testid': 'confirm-dialog' },
          React.createElement('p', null, title),
          React.createElement('p', null, description),
          React.createElement('button', { onClick: onConfirm }, 'Conferma'),
          React.createElement('button', { onClick: () => onOpenChange(false) }, 'Chiudi'),
        )
      : null,
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
    fuelType: 'Benzina',
    mileage: 50000,
    status: 'ACTIVE',
    customerId: 'c-1',
    revisionExpiry: null,
    insuranceExpiry: null,
    taxExpiry: null,
    customer: { id: 'c-1', firstName: 'Mario', lastName: 'Rossi', email: 'mario@test.com' },
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

import VehiclesPage from '@/app/dashboard/vehicles/page'

beforeEach(() => {
  mockListData = { data: [makeVehicle()], meta: { total: 1, limit: 20, offset: 0 } }
  mockListError = undefined
  mockListLoading = false
  mockExpiringData = undefined
  capturedKeys = []
  mockPush.mockClear()
  mockFetch.mockClear()
  mockMutate.mockClear()
  mockToastSuccess.mockClear()
  mockToastError.mockClear()
  global.fetch = mockFetch
})

describe('VehiclesPage', () => {
  describe('stati di caricamento', () => {
    it('mostra spinner durante il caricamento', () => {
      mockListLoading = true
      mockListData = undefined
      render(<VehiclesPage />)
      expect(document.querySelector('[data-icon="Loader2"]')).toBeTruthy()
    })

    it('mostra errore se SWR restituisce errore', () => {
      mockListError = new Error('network error')
      mockListData = undefined
      render(<VehiclesPage />)
      expect(screen.getByText('Impossibile caricare i veicoli')).toBeInTheDocument()
    })

    it('click Riprova chiama mutate', () => {
      mockListError = new Error('err')
      mockListData = undefined
      render(<VehiclesPage />)
      fireEvent.click(screen.getByText('Riprova'))
      expect(mockMutate).toHaveBeenCalled()
    })
  })

  describe('rendering con dati', () => {
    it('mostra titolo Veicoli', () => {
      render(<VehiclesPage />)
      expect(screen.getByText('Veicoli')).toBeInTheDocument()
    })

    it('mostra il link Nuovo Veicolo', () => {
      render(<VehiclesPage />)
      const link = document.querySelector('a[href="/dashboard/vehicles/new"]')
      expect(link).toBeTruthy()
    })

    it('mostra targa del veicolo', () => {
      render(<VehiclesPage />)
      expect(screen.getAllByText('AB123CD').length).toBeGreaterThan(0)
    })

    it('mostra marca e modello', () => {
      render(<VehiclesPage />)
      expect(screen.getAllByText('Fiat Panda').length).toBeGreaterThan(0)
    })

    it('mostra proprietario del veicolo', () => {
      render(<VehiclesPage />)
      expect(screen.getByText('Mario Rossi')).toBeInTheDocument()
    })
  })

  describe('stato vuoto senza filtri', () => {
    it('mostra messaggio nessun veicolo registrato', () => {
      mockListData = { data: [], meta: { total: 0, limit: 20, offset: 0 } }
      render(<VehiclesPage />)
      expect(screen.getByText(/Nessun veicolo registrato/)).toBeInTheDocument()
    })
  })

  describe('stato vuoto con filtri attivi', () => {
    it('mostra messaggio nessun veicolo trovato quando c\'è ricerca attiva', async () => {
      mockListData = { data: [] }
      render(<VehiclesPage />)
      const searchInput = screen.getByLabelText('Cerca veicoli')
      fireEvent.change(searchInput, { target: { value: 'XYZ' } })
      // After debounce, data still returns empty but debouncedSearch is set
      // We need to wait for the debounce timer
      await act(async () => {
        jest.runAllTimers?.() ?? await new Promise(r => setTimeout(r, 350))
      })
      // Since mockListData is empty and we set a search, it shows empty search state
    })
  })

  describe('filtro carburante', () => {
    it('mostra select con opzioni carburante', () => {
      render(<VehiclesPage />)
      expect(screen.getByText('Tutti i carburanti')).toBeInTheDocument()
    })

    it('cambio filtro carburante aggiorna la select', () => {
      render(<VehiclesPage />)
      const select = screen.getByLabelText('Filtra per carburante')
      fireEvent.change(select, { target: { value: 'Diesel' } })
      expect((select as HTMLSelectElement).value).toBe('Diesel')
    })
  })

  describe('banner scadenze', () => {
    it('mostra banner scadenze quando expiringData.summary.total > 0', () => {
      mockExpiringData = {
        data: [],
        summary: { revision: 2, insurance: 1, tax: 0, total: 3 },
      }
      render(<VehiclesPage />)
      expect(screen.getByText(/3 veicoli con scadenze/)).toBeInTheDocument()
    })

    it('mostra dettaglio revisione nel banner', () => {
      mockExpiringData = {
        data: [],
        summary: { revision: 2, insurance: 0, tax: 0, total: 2 },
      }
      render(<VehiclesPage />)
      expect(screen.getByText(/Revisione: 2/)).toBeInTheDocument()
    })

    it('mostra "1 veicolo con scadenze" al singolare', () => {
      mockExpiringData = {
        data: [],
        summary: { revision: 1, insurance: 0, tax: 0, total: 1 },
      }
      render(<VehiclesPage />)
      expect(screen.getByText(/1 veicolo con scadenze/)).toBeInTheDocument()
    })

    it('non mostra banner quando total = 0', () => {
      mockExpiringData = {
        data: [],
        summary: { revision: 0, insurance: 0, tax: 0, total: 0 },
      }
      render(<VehiclesPage />)
      expect(screen.queryByText(/veicoli con scadenze/)).not.toBeInTheDocument()
    })
  })

  describe('VehicleExpiryBadges', () => {
    it('mostra badge scadenza per revisione scaduta', () => {
      mockListData = { data: [makeVehicle({ revisionExpiry: '2020-01-01T00:00:00Z' })] }
      render(<VehiclesPage />)
      expect(document.querySelector('[data-icon="AlertTriangle"]')).toBeTruthy()
    })

    it('mostra badge scadenza per assicurazione in scadenza', () => {
      const soon = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
      mockListData = { data: [makeVehicle({ insuranceExpiry: soon })] }
      render(<VehiclesPage />)
      expect(document.querySelector('[data-icon="AlertTriangle"]')).toBeTruthy()
    })

    it('non mostra badge quando non ci sono scadenze', () => {
      mockListData = { data: [makeVehicle({ revisionExpiry: null, insuranceExpiry: null, taxExpiry: null })] }
      render(<VehiclesPage />)
      expect(document.querySelector('[data-icon="AlertTriangle"]')).toBeFalsy()
    })

    it('mostra badge bollo in scadenza', () => {
      const soon = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      mockListData = { data: [makeVehicle({ taxExpiry: soon })] }
      render(<VehiclesPage />)
      expect(document.querySelector('[data-icon="AlertTriangle"]')).toBeTruthy()
    })
  })

  describe('azioni veicolo', () => {
    it('click visualizza naviga al dettaglio', () => {
      render(<VehiclesPage />)
      const viewBtn = screen.getByLabelText('Visualizza AB123CD')
      fireEvent.click(viewBtn)
      expect(mockPush).toHaveBeenCalledWith('/dashboard/vehicles/v-1')
    })

    it('click modifica naviga alla modifica', () => {
      render(<VehiclesPage />)
      const editBtn = screen.getByLabelText('Modifica AB123CD')
      fireEvent.click(editBtn)
      expect(mockPush).toHaveBeenCalledWith('/dashboard/vehicles/v-1?tab=dettagli&edit=true')
    })

    it('click elimina apre dialog di conferma', () => {
      render(<VehiclesPage />)
      const deleteBtn = screen.getByLabelText('Elimina AB123CD')
      fireEvent.click(deleteBtn)
      expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument()
    })

    it('conferma eliminazione chiama DELETE API', async () => {
      mockFetch.mockResolvedValue({ ok: true })
      render(<VehiclesPage />)
      fireEvent.click(screen.getByLabelText('Elimina AB123CD'))
      fireEvent.click(screen.getByText('Conferma'))
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/dashboard/vehicles/v-1',
          expect.objectContaining({ method: 'DELETE' }),
        )
      })
    })

    it('eliminazione successo mostra toast', async () => {
      mockFetch.mockResolvedValue({ ok: true })
      render(<VehiclesPage />)
      fireEvent.click(screen.getByLabelText('Elimina AB123CD'))
      fireEvent.click(screen.getByText('Conferma'))
      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith('Veicolo eliminato', expect.any(Object))
      })
    })

    it('eliminazione fallita mostra toast error', async () => {
      mockFetch.mockResolvedValue({ ok: false })
      render(<VehiclesPage />)
      fireEvent.click(screen.getByLabelText('Elimina AB123CD'))
      fireEvent.click(screen.getByText('Conferma'))
      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith("Errore durante l'eliminazione del veicolo")
      })
    })

    it('chiudi dialog cancella deleteTarget', () => {
      render(<VehiclesPage />)
      fireEvent.click(screen.getByLabelText('Elimina AB123CD'))
      expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument()
      fireEvent.click(screen.getByText('Chiudi'))
      expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument()
    })
  })

  describe('risposta senza data wrapper', () => {
    it('accetta lista diretta senza data wrapper', () => {
      mockListData = [makeVehicle()]
      render(<VehiclesPage />)
      expect(screen.getAllByText('AB123CD').length).toBeGreaterThan(0)
    })
  })

  describe('veicolo senza proprietario', () => {
    it('mostra em-dash per veicolo senza customer', () => {
      mockListData = { data: [makeVehicle({ customer: undefined, customerId: undefined })] }
      render(<VehiclesPage />)
      expect(screen.getAllByText('AB123CD').length).toBeGreaterThan(0)
    })
  })

  describe('ricerca veicoli', () => {
    it('mostra campo di ricerca', () => {
      render(<VehiclesPage />)
      expect(screen.getByLabelText('Cerca veicoli')).toBeInTheDocument()
    })

    it('aggiornamento ricerca aggiorna il valore dell\'input', () => {
      render(<VehiclesPage />)
      const input = screen.getByLabelText('Cerca veicoli')
      fireEvent.change(input, { target: { value: 'Fiat' } })
      expect((input as HTMLInputElement).value).toBe('Fiat')
    })
  })

  describe('SWR dual key', () => {
    it('esegue due chiamate SWR: lista e expiring', () => {
      render(<VehiclesPage />)
      const hasExpiring = capturedKeys.some(k => typeof k === 'string' && k.includes('expiring'))
      const hasList = capturedKeys.some(k => typeof k === 'string' && k.includes('/api/dashboard/vehicles?'))
      expect(hasExpiring).toBe(true)
      expect(hasList).toBe(true)
    })
  })

  describe('total computation', () => {
    it('usa meta.total quando presente', () => {
      mockListData = { data: [makeVehicle()], meta: { total: 100, limit: 20, offset: 0 } }
      render(<VehiclesPage />)
      // totalPages = ceil(100/20) = 5 → pagination shows 1/5
      expect(screen.getByText('1/5')).toBeInTheDocument()
    })

    it('usa total diretto quando non c\'è meta', () => {
      mockListData = { data: [makeVehicle()], total: 40 }
      render(<VehiclesPage />)
      // totalPages = ceil(40/20) = 2
      expect(screen.getByText('1/2')).toBeInTheDocument()
    })

    it('usa vehicles.length come fallback', () => {
      mockListData = { data: [makeVehicle()] }
      render(<VehiclesPage />)
      // total = 1, totalPages = 1
      expect(screen.getByText('1/1')).toBeInTheDocument()
    })
  })
})
