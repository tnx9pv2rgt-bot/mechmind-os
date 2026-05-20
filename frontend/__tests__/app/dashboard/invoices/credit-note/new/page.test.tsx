import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// ---- Navigation ----
const mockPush = jest.fn()
const mockBack = jest.fn()
let mockSearchParamsData: Record<string, string | null> = { invoiceId: 'inv-1' }

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: mockBack }),
  useSearchParams: () => ({
    get: (key: string) => mockSearchParamsData[key] ?? null,
  }),
}))

// ---- SWR ----
let mockData: unknown = undefined
let mockError: unknown = undefined
let mockIsLoading = false

jest.mock('swr', () => ({
  __esModule: true,
  default: () => ({
    data: mockData,
    error: mockError,
    isLoading: mockIsLoading,
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
  }: {
    children?: React.ReactNode
    onClick?: () => void
    disabled?: boolean
    loading?: boolean
    icon?: React.ReactNode
  }) =>
    React.createElement('button', { onClick, disabled: disabled || loading }, icon, children),
}))

jest.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => React.createElement('input', props),
}))

jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
  }: {
    checked?: boolean
    onCheckedChange?: () => void
  }) =>
    React.createElement('input', {
      type: 'checkbox',
      checked,
      readOnly: true,
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation()
        onCheckedChange?.()
      },
    }),
}))

jest.mock('@/components/ui/breadcrumb', () => ({
  Breadcrumb: ({ items }: { items: { label: string }[] }) =>
    React.createElement('nav', null, ...items.map(i => React.createElement('span', { key: i.label }, i.label))),
}))

// ---- fetch mock ----
const mockFetch = jest.fn()
global.fetch = mockFetch

function makeInvoice() {
  return {
    id: 'inv-1',
    number: 'FT-2024-001',
    customerName: 'Mario Rossi',
    items: [
      { id: 'item-1', description: 'Cambio olio', quantity: 1, unitPrice: 50, vatRate: 22, total: 61 },
      { id: 'item-2', description: 'Filtro aria', quantity: 2, unitPrice: 15, vatRate: 22, total: 36.6 },
    ],
    total: 97.6,
  }
}

import CreditNotePage from '@/app/dashboard/invoices/credit-note/new/page'

beforeEach(() => {
  mockSearchParamsData = { invoiceId: 'inv-1' }
  mockData = { data: makeInvoice() }
  mockError = undefined
  mockIsLoading = false
  mockPush.mockClear()
  mockBack.mockClear()
  mockFetch.mockClear()
  mockToastSuccess.mockClear()
  mockToastError.mockClear()
  global.fetch = mockFetch
})

describe('CreditNotePage', () => {
  describe('stati di caricamento', () => {
    it('mostra spinner durante il caricamento', () => {
      mockIsLoading = true
      mockData = undefined
      render(<CreditNotePage />)
      expect(document.querySelector('[data-icon="Loader2"]')).toBeTruthy()
    })

    it('mostra errore se SWR restituisce errore', () => {
      mockError = new Error('Network error')
      mockData = undefined
      render(<CreditNotePage />)
      expect(screen.getByText('Fattura non trovata')).toBeInTheDocument()
    })

    it('mostra messaggio se invoiceId è null', () => {
      mockSearchParamsData = {}
      mockData = undefined
      render(<CreditNotePage />)
      expect(screen.getByText('Nessuna fattura di riferimento specificata')).toBeInTheDocument()
    })

    it('bottone torna alle fatture su errore', () => {
      mockError = new Error('err')
      mockData = undefined
      render(<CreditNotePage />)
      fireEvent.click(screen.getByText('Torna alle Fatture'))
      expect(mockPush).toHaveBeenCalledWith('/dashboard/invoices')
    })
  })

  describe('rendering con invoice', () => {
    it('mostra titolo Nota di Credito', () => {
      render(<CreditNotePage />)
      expect(screen.getAllByText('Nota di Credito').length).toBeGreaterThan(0)
    })

    it('mostra il numero fattura di riferimento', () => {
      render(<CreditNotePage />)
      expect(screen.getAllByText(/FT-2024-001/).length).toBeGreaterThan(0)
    })

    it('mostra le due voci dell\'invoice', () => {
      render(<CreditNotePage />)
      expect(screen.getByText('Cambio olio')).toBeInTheDocument()
      expect(screen.getByText('Filtro aria')).toBeInTheDocument()
    })

    it('auto-seleziona tutte le voci al caricamento', () => {
      render(<CreditNotePage />)
      const checkboxes = screen.getAllByRole('checkbox')
      checkboxes.forEach(cb => {
        expect((cb as HTMLInputElement).checked).toBe(true)
      })
    })

    it('mostra il conteggio voci selezionate', () => {
      render(<CreditNotePage />)
      expect(screen.getByText('2 voci selezionate su 2')).toBeInTheDocument()
    })

    it('mostra importo nota di credito', () => {
      render(<CreditNotePage />)
      expect(screen.getByText(/Importo Nota di Credito/)).toBeInTheDocument()
    })
  })

  describe('toggle selezione voci', () => {
    it('deselezionare una voce aggiorna il conteggio', () => {
      render(<CreditNotePage />)
      fireEvent.click(screen.getAllByRole('checkbox')[0])
      expect(screen.getByText(/1 voci selezionate su 2/)).toBeInTheDocument()
    })

    it('riselezionare una voce aggiorna il conteggio', () => {
      render(<CreditNotePage />)
      fireEvent.click(screen.getAllByRole('checkbox')[0])
      fireEvent.click(screen.getAllByRole('checkbox')[0])
      expect(screen.getByText(/2 voci selezionate su 2/)).toBeInTheDocument()
    })
  })

  describe('causale', () => {
    it('mostra le opzioni di causale', () => {
      render(<CreditNotePage />)
      expect(screen.getByText('Reso merce')).toBeInTheDocument()
      expect(screen.getByText('Sconto successivo')).toBeInTheDocument()
      expect(screen.getByText('Errore fatturazione')).toBeInTheDocument()
      expect(screen.getByText('Altro')).toBeInTheDocument()
    })

    it('cambia causale via select', () => {
      render(<CreditNotePage />)
      const selects = screen.getAllByRole('combobox')
      const reasonSelect = selects[selects.length - 1]
      fireEvent.change(reasonSelect, { target: { value: 'ERRORE_FATTURAZIONE' } })
      expect((reasonSelect as HTMLSelectElement).value).toBe('ERRORE_FATTURAZIONE')
    })

    it('cambia dettaglio causale via textarea', () => {
      render(<CreditNotePage />)
      const textarea = screen.getByPlaceholderText('Descrivi il motivo della nota di credito...')
      fireEvent.change(textarea, { target: { value: 'Errore nel calcolo IVA' } })
      expect((textarea as HTMLTextAreaElement).value).toBe('Errore nel calcolo IVA')
    })

    it('click sulla riga elemento la deseleziona via onClick del div', () => {
      render(<CreditNotePage />)
      fireEvent.click(screen.getByText('Cambio olio'))
      expect(screen.getByText(/1 voci selezionate su 2/)).toBeInTheDocument()
    })
  })

  describe('submit', () => {
    it('submit chiama POST /api/invoices/credit-notes', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: { id: 'cn-1' } }),
      })
      render(<CreditNotePage />)
      fireEvent.click(screen.getByText('Emetti Nota di Credito'))
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/invoices/credit-notes',
          expect.objectContaining({ method: 'POST' }),
        )
      })
    })

    it('submit successo mostra toast e naviga al dettaglio', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: { id: 'cn-1' } }),
      })
      render(<CreditNotePage />)
      fireEvent.click(screen.getByText('Emetti Nota di Credito'))
      await waitFor(() =>
        expect(mockToastSuccess).toHaveBeenCalledWith('Nota di credito emessa con successo'),
      )
      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/dashboard/invoices/cn-1'))
    })

    it('submit con nessuna voce selezionata disabilita il bottone', () => {
      render(<CreditNotePage />)
      fireEvent.click(screen.getAllByRole('checkbox')[0])
      fireEvent.click(screen.getAllByRole('checkbox')[1])
      const submitBtn = screen.getByText('Emetti Nota di Credito').closest('button')
      expect(submitBtn).toBeDisabled()
    })

    it('submit errore mostra toast error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({ message: 'Errore creazione nota' }),
      })
      render(<CreditNotePage />)
      fireEvent.click(screen.getByText('Emetti Nota di Credito'))
      await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('Errore creazione nota'))
    })

    it('click Annulla chiama router.back()', () => {
      render(<CreditNotePage />)
      fireEvent.click(screen.getByText('Annulla'))
      expect(mockBack).toHaveBeenCalled()
    })
  })

  describe('response format senza data wrapper', () => {
    it('accetta risposta diretta senza data wrapper', () => {
      mockData = makeInvoice()
      render(<CreditNotePage />)
      expect(screen.getAllByText('Nota di Credito').length).toBeGreaterThan(0)
    })
  })
})
