import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// ---- Navigation ----
const mockPush = jest.fn()
let mockSearchParamsData: Record<string, string | null> = {}

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useSearchParams: () => ({
    get: (key: string) => mockSearchParamsData[key] ?? null,
  }),
}))

// ---- SWR ----
let mockCustomersData: unknown = undefined
let mockCustomersLoading = false

jest.mock('swr', () => ({
  __esModule: true,
  default: () => ({
    data: mockCustomersData,
    isLoading: mockCustomersLoading,
    error: undefined,
    mutate: jest.fn(),
  }),
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
          return React.createElement('div', valid, children)
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
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) =>
    React.createElement('input', props),
}))

jest.mock('@/components/ui/breadcrumb', () => ({
  Breadcrumb: ({ items }: { items: { label: string }[] }) =>
    React.createElement('nav', null, ...items.map(i => React.createElement('span', { key: i.label }, i.label))),
}))

// ---- crypto.randomUUID ----
let uuidCounter = 0
Object.defineProperty(global, 'crypto', {
  value: { randomUUID: jest.fn(() => `test-uuid-${++uuidCounter}`) },
  writable: true,
})

// ---- fetch mock ----
const mockFetch = jest.fn()
global.fetch = mockFetch

const customers = [
  { id: 'c1', firstName: 'Mario', lastName: 'Rossi', companyName: 'Officina Rossi' },
  { id: 'c2', firstName: 'Luigi', lastName: 'Verdi' },
]

import NewInvoicePage from '@/app/dashboard/invoices/new/page'

beforeEach(() => {
  mockSearchParamsData = {}
  mockCustomersData = { data: customers }
  mockCustomersLoading = false
  mockPush.mockClear()
  mockFetch.mockClear()
  mockToastSuccess.mockClear()
  mockToastError.mockClear()
  global.fetch = mockFetch
  uuidCounter = 0
})

describe('NewInvoicePage', () => {
  describe('rendering iniziale', () => {
    it('mostra titolo Nuova Fattura', () => {
      render(<NewInvoicePage />)
      expect(screen.getAllByText('Nuova Fattura').length).toBeGreaterThan(0)
    })

    it('mostra pulsanti Salva come Bozza e Salva e Invia', () => {
      render(<NewInvoicePage />)
      expect(screen.getByText('Salva come Bozza')).toBeInTheDocument()
      expect(screen.getByText('Salva e Invia')).toBeInTheDocument()
    })

    it('mostra pulsante Annulla', () => {
      render(<NewInvoicePage />)
      expect(screen.getByText('Annulla')).toBeInTheDocument()
    })

    it('mostra campo Numero Fattura', () => {
      render(<NewInvoicePage />)
      expect(screen.getByPlaceholderText('Auto-generato')).toBeInTheDocument()
    })

    it('mostra select clienti', () => {
      render(<NewInvoicePage />)
      expect(screen.getByText('-- Seleziona un cliente --')).toBeInTheDocument()
    })

    it('mostra cliente Officina Rossi nella select', () => {
      render(<NewInvoicePage />)
      expect(screen.getByText('Officina Rossi')).toBeInTheDocument()
    })

    it('mostra loader se clienti in caricamento', () => {
      mockCustomersLoading = true
      mockCustomersData = undefined
      render(<NewInvoicePage />)
      expect(screen.getByText('Caricamento clienti...')).toBeInTheDocument()
    })
  })

  describe('validazione', () => {
    it('mostra errore se si invia senza cliente', async () => {
      render(<NewInvoicePage />)
      fireEvent.click(screen.getByText('Salva come Bozza'))
      await waitFor(() => {
        expect(screen.getAllByText('Seleziona un cliente').length).toBeGreaterThan(0)
      })
    })

    it('mostra errore se riga senza descrizione', async () => {
      render(<NewInvoicePage />)
      const selects = screen.getAllByRole('combobox')
      const customerSelect = selects.find(s =>
        (s as HTMLSelectElement).options[0]?.text === '-- Seleziona un cliente --',
      ) ?? selects[0]
      fireEvent.change(customerSelect, { target: { value: 'c1' } })
      fireEvent.click(screen.getByText('Salva come Bozza'))
      await waitFor(() => {
        expect(screen.getByText('Compila la descrizione di tutte le righe')).toBeInTheDocument()
      })
    })
  })

  describe('line items', () => {
    it('mostra una riga vuota di default', () => {
      render(<NewInvoicePage />)
      expect(screen.getAllByPlaceholderText('es. Cambio olio motore').length).toBe(1)
    })

    it('click Aggiungi Riga aggiunge una riga', () => {
      render(<NewInvoicePage />)
      fireEvent.click(screen.getByText('Aggiungi Riga'))
      expect(screen.getAllByPlaceholderText('es. Cambio olio motore').length).toBe(2)
    })

    it('pulsante rimozione disabilitato quando c\'è una sola riga', () => {
      render(<NewInvoicePage />)
      const removeBtn = screen.getByLabelText('Rimuovi riga fattura')
      expect(removeBtn).toBeDisabled()
    })

    it('con due righe il pulsante rimozione è abilitato', () => {
      render(<NewInvoicePage />)
      fireEvent.click(screen.getByText('Aggiungi Riga'))
      const removeBtns = screen.getAllByLabelText('Rimuovi riga fattura')
      expect(removeBtns[0]).not.toBeDisabled()
    })

    it('aggiornamento descrizione riga funziona', () => {
      render(<NewInvoicePage />)
      const descInput = screen.getByPlaceholderText('es. Cambio olio motore')
      fireEvent.change(descInput, { target: { value: 'Cambio filtro' } })
      expect((descInput as HTMLInputElement).value).toBe('Cambio filtro')
    })
  })

  describe('riepilogo IVA', () => {
    it('mostra Subtotale nella sezione riepilogo', () => {
      render(<NewInvoicePage />)
      expect(screen.getByText('Subtotale')).toBeInTheDocument()
    })

    it('mostra Totale nella sezione riepilogo', () => {
      render(<NewInvoicePage />)
      expect(screen.getAllByText('Totale').length).toBeGreaterThan(0)
    })
  })

  describe('submit', () => {
    function fillAndSubmit(asDraft: boolean) {
      render(<NewInvoicePage />)
      // Select customer
      const selects = screen.getAllByRole('combobox')
      const customerSelect = selects.find(s =>
        (s as HTMLSelectElement).options[0]?.text === '-- Seleziona un cliente --',
      )!
      fireEvent.change(customerSelect, { target: { value: 'c1' } })
      // Fill description
      const descInput = screen.getByPlaceholderText('es. Cambio olio motore')
      fireEvent.change(descInput, { target: { value: 'Cambio olio' } })
      // Submit
      fireEvent.click(screen.getByText(asDraft ? 'Salva come Bozza' : 'Salva e Invia'))
    }

    it('submit come bozza chiama POST /api/invoices con status DRAFT', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: { id: 'new-invoice-id' } }),
      })
      fillAndSubmit(true)
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/invoices',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"status":"DRAFT"'),
          }),
        )
      })
    })

    it('submit e invia chiama POST con status SENT', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: { id: 'new-invoice-id' } }),
      })
      fillAndSubmit(false)
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/invoices',
          expect.objectContaining({
            body: expect.stringContaining('"status":"SENT"'),
          }),
        )
      })
    })

    it('submit successo naviga al dettaglio fattura', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: { id: 'new-invoice-id' } }),
      })
      fillAndSubmit(true)
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard/invoices/new-invoice-id')
      })
    })

    it('submit errore mostra toast error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({ message: 'Errore creazione' }),
      })
      fillAndSubmit(true)
      await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('Errore creazione'))
    })
  })

  describe('prefill da workOrderId', () => {
    it('mostra badge OdL quando workOrderId è presente', async () => {
      mockSearchParamsData = { workOrderId: 'wo-123' }
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: {
            customerId: 'c1',
            items: [{ description: 'Cambio olio', quantity: 2, unitPrice: 30 }],
          },
        }),
      })
      render(<NewInvoicePage />)
      await waitFor(() => {
        expect(screen.getByText(/Da OdL/)).toBeInTheDocument()
      })
    })
  })

  describe('click Annulla', () => {
    it('naviga a /dashboard/invoices', () => {
      render(<NewInvoicePage />)
      fireEvent.click(screen.getByText('Annulla'))
      expect(mockPush).toHaveBeenCalledWith('/dashboard/invoices')
    })
  })

  describe('ricerca cliente', () => {
    it('filtra i clienti per nome azienda', () => {
      render(<NewInvoicePage />)
      const searchInput = screen.getByPlaceholderText('Cerca cliente per nome...')
      fireEvent.change(searchInput, { target: { value: 'Officina' } })
      expect(screen.getByText('Officina Rossi')).toBeInTheDocument()
      expect(screen.queryByText('Luigi Verdi')).not.toBeInTheDocument()
    })

    it('con ricerca vuota mostra tutti i clienti', () => {
      render(<NewInvoicePage />)
      const searchInput = screen.getByPlaceholderText('Cerca cliente per nome...')
      fireEvent.change(searchInput, { target: { value: '' } })
      expect(screen.getByText('Officina Rossi')).toBeInTheDocument()
    })

    it('accetta lista clienti senza data wrapper', () => {
      mockCustomersData = customers
      render(<NewInvoicePage />)
      expect(screen.getByText('Officina Rossi')).toBeInTheDocument()
    })
  })

  describe('prefill da estimateId', () => {
    it('pre-compila le voci dal preventivo', async () => {
      mockSearchParamsData = { estimateId: 'est-123' }
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: {
            customerId: 'c1',
            items: [{ description: 'Tagliando', quantity: 1, unitPrice: 80 }],
          },
        }),
      })
      render(<NewInvoicePage />)
      await waitFor(() => {
        expect(screen.getByDisplayValue('Tagliando')).toBeInTheDocument()
      })
    })
  })

  describe('aggiornamento campi riga', () => {
    it('aggiornamento quantità riga funziona', () => {
      render(<NewInvoicePage />)
      const qtyInputs = screen.getAllByDisplayValue('1')
      fireEvent.change(qtyInputs[0], { target: { value: '3' } })
      expect((qtyInputs[0] as HTMLInputElement).value).toBe('3')
    })

    it('rimozione riga con due righe presenti', () => {
      render(<NewInvoicePage />)
      fireEvent.click(screen.getByText('Aggiungi Riga'))
      expect(screen.getAllByPlaceholderText('es. Cambio olio motore').length).toBe(2)
      const removeBtns = screen.getAllByLabelText('Rimuovi riga fattura')
      fireEvent.click(removeBtns[0])
      expect(screen.getAllByPlaceholderText('es. Cambio olio motore').length).toBe(1)
    })
  })
})
