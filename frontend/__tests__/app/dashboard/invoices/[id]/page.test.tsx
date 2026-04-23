import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// ---- Navigation ----
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'invoice-1' }),
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}))

// ---- SWR ----
let mockData: unknown = undefined
let mockError: unknown = undefined
let mockIsLoading = false
const mockMutate = jest.fn()

jest.mock('swr', () => ({
  __esModule: true,
  default: () => ({
    data: mockData,
    error: mockError,
    isLoading: mockIsLoading,
    mutate: mockMutate,
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
          const allowed = ['className', 'style', 'onClick']
          const valid: Record<string, unknown> = {}
          for (const k of Object.keys(rest)) {
            if (allowed.includes(k) || k.startsWith('data-')) valid[k] = rest[k]
          }
          return React.createElement(prop === 'div' ? 'div' : 'div', valid, children)
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

// ---- UI components ----
jest.mock('@/components/ui/apple-card', () => ({
  AppleCard: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'apple-card' }, children),
  AppleCardContent: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('div', { className }, children),
  AppleCardHeader: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  AppleCardFooter: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}))

jest.mock('@/components/ui/apple-button', () => ({
  AppleButton: ({
    children,
    onClick,
    variant,
    loading,
    disabled,
    icon,
  }: {
    children?: React.ReactNode
    onClick?: () => void
    variant?: string
    loading?: boolean
    disabled?: boolean
    icon?: React.ReactNode
  }) =>
    React.createElement(
      'button',
      { onClick, 'data-variant': variant, 'data-loading': loading, disabled },
      icon,
      children,
    ),
}))

jest.mock('@/components/ui/breadcrumb', () => ({
  Breadcrumb: ({ items }: { items: { label: string; href?: string }[] }) =>
    React.createElement(
      'nav',
      { 'aria-label': 'breadcrumb' },
      ...items.map(i => React.createElement('span', { key: i.label }, i.label)),
    ),
}))

jest.mock('@/components/ui/confirm-dialog', () => ({
  ConfirmDialog: ({
    open,
    onConfirm,
    title,
    onOpenChange,
  }: {
    open: boolean
    onConfirm: () => void
    title: string
    onOpenChange?: (v: boolean) => void
  }) =>
    open
      ? React.createElement(
          'div',
          { 'data-testid': 'confirm-dialog' },
          React.createElement('p', null, title),
          React.createElement('button', { onClick: onConfirm }, 'Conferma eliminazione'),
          React.createElement('button', { onClick: () => onOpenChange?.(false) }, 'Annulla dialog'),
        )
      : null,
}))

// ---- fetch mock ----
const mockFetch = jest.fn()
global.fetch = mockFetch

// ---- clipboard mock ----
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: jest.fn().mockResolvedValue(undefined) },
  writable: true,
})

// ---- window.open mock ----
const mockOpen = jest.fn()
global.open = mockOpen

// ---- window.print mock ----
global.print = jest.fn()

// ---- Fixture ----
function makeInvoice(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'invoice-1',
    number: 'FT-2024-001',
    status: 'DRAFT',
    createdAt: '2024-01-15T10:00:00Z',
    dueDate: '2024-02-15T10:00:00Z',
    customerName: 'Mario Rossi',
    customerEmail: 'mario@example.com',
    items: [
      {
        id: 'item-1',
        description: 'Cambio olio',
        quantity: 1,
        unitPrice: 50,
        vatRate: 22,
        total: 50,
      },
    ],
    subtotal: 50,
    taxRate: 22,
    taxAmount: 11,
    total: 61,
    payments: [],
    sdiEvents: [],
    auditLog: [],
    ...overrides,
  }
}

import InvoiceDetailPage from '@/app/dashboard/invoices/[id]/page'

beforeEach(() => {
  mockData = undefined
  mockError = undefined
  mockIsLoading = false
  mockMutate.mockClear()
  mockPush.mockClear()
  mockFetch.mockClear()
  mockToastSuccess.mockClear()
  mockToastError.mockClear()
  mockOpen.mockClear()
  jest.clearAllMocks()
  // Re-set fetch because jest.clearAllMocks resets it
  global.fetch = mockFetch
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: jest.fn().mockResolvedValue(undefined) },
    writable: true,
  })
  global.open = mockOpen
  global.print = jest.fn()
})

describe('InvoiceDetailPage', () => {
  describe('stati di caricamento', () => {
    it('mostra spinner durante il caricamento', () => {
      mockIsLoading = true
      render(<InvoiceDetailPage />)
      expect(document.querySelector('[data-icon="Loader2"]')).toBeTruthy()
    })

    it('mostra errore se SWR restituisce errore', () => {
      mockError = new Error('Network error')
      render(<InvoiceDetailPage />)
      expect(screen.getByText('Impossibile caricare la fattura')).toBeInTheDocument()
    })

    it('bottone torna alle fatture su errore', () => {
      mockError = new Error('Network error')
      render(<InvoiceDetailPage />)
      fireEvent.click(screen.getByText('Torna alle Fatture'))
      expect(mockPush).toHaveBeenCalledWith('/dashboard/invoices')
    })

    it('mostra fattura non trovata se data è null', () => {
      mockData = null
      render(<InvoiceDetailPage />)
      expect(screen.getByText('Fattura non trovata')).toBeInTheDocument()
    })

    it('bottone torna alle fatture quando invoice non trovata', () => {
      mockData = null
      render(<InvoiceDetailPage />)
      fireEvent.click(screen.getByText('Torna alle Fatture'))
      expect(mockPush).toHaveBeenCalledWith('/dashboard/invoices')
    })
  })

  describe('rendering invoice DRAFT', () => {
    beforeEach(() => {
      mockData = { data: makeInvoice() }
    })

    it('mostra il numero fattura', () => {
      render(<InvoiceDetailPage />)
      expect(screen.getAllByText('FT-2024-001').length).toBeGreaterThan(0)
    })

    it('mostra il badge stato DRAFT', () => {
      render(<InvoiceDetailPage />)
      expect(screen.getAllByText('Bozza').length).toBeGreaterThan(0)
    })

    it('mostra il nome del cliente', () => {
      render(<InvoiceDetailPage />)
      expect(screen.getAllByText('Mario Rossi').length).toBeGreaterThan(0)
    })

    it('mostra i pulsanti Invia e Invia a SDI per DRAFT', () => {
      render(<InvoiceDetailPage />)
      expect(screen.getByText('Invia')).toBeInTheDocument()
      expect(screen.getByText('Invia a SDI')).toBeInTheDocument()
    })

    it('mostra il pulsante Elimina per DRAFT', () => {
      render(<InvoiceDetailPage />)
      expect(screen.getByText('Elimina')).toBeInTheDocument()
    })

    it('non mostra pulsanti SENT/OVERDUE per DRAFT', () => {
      render(<InvoiceDetailPage />)
      expect(screen.queryByText('Segna Pagata')).not.toBeInTheDocument()
      expect(screen.queryByText('Sollecito')).not.toBeInTheDocument()
    })

    it('mostra la voce fattura', () => {
      render(<InvoiceDetailPage />)
      expect(screen.getByText('Cambio olio')).toBeInTheDocument()
    })

    it('mostra subtotale', () => {
      render(<InvoiceDetailPage />)
      expect(screen.getByText('Subtotale')).toBeInTheDocument()
    })
  })

  describe('invoice con status SENT', () => {
    beforeEach(() => {
      mockData = { data: makeInvoice({ status: 'SENT' }) }
    })

    it('mostra badge Inviata', () => {
      render(<InvoiceDetailPage />)
      expect(screen.getAllByText('Inviata').length).toBeGreaterThan(0)
    })

    it('mostra pulsanti Segna Pagata, Sollecito, Link Pagamento, Paga a Rate', () => {
      render(<InvoiceDetailPage />)
      expect(screen.getByText('Segna Pagata')).toBeInTheDocument()
      expect(screen.getByText('Sollecito')).toBeInTheDocument()
      expect(screen.getByText('Link Pagamento')).toBeInTheDocument()
      expect(screen.getByText('Paga a Rate')).toBeInTheDocument()
    })
  })

  describe('invoice con status PAID', () => {
    beforeEach(() => {
      mockData = { data: makeInvoice({ status: 'PAID' }) }
    })

    it('mostra badge Pagata', () => {
      render(<InvoiceDetailPage />)
      expect(screen.getAllByText('Pagata').length).toBeGreaterThan(0)
    })

    it('mostra pulsante Nota di Credito per PAID', () => {
      render(<InvoiceDetailPage />)
      expect(screen.getByText('Nota di Credito')).toBeInTheDocument()
    })

    it('click Nota di Credito naviga alla pagina credit-note', () => {
      render(<InvoiceDetailPage />)
      fireEvent.click(screen.getByText('Nota di Credito'))
      expect(mockPush).toHaveBeenCalledWith('/dashboard/invoices/credit-note/new?invoiceId=invoice-1')
    })
  })

  describe('invoice con status OVERDUE', () => {
    beforeEach(() => {
      mockData = { data: makeInvoice({ status: 'OVERDUE' }) }
    })

    it('mostra badge Scaduta', () => {
      render(<InvoiceDetailPage />)
      expect(screen.getAllByText('Scaduta').length).toBeGreaterThan(0)
    })

    it('mostra pulsante Segna Pagata per OVERDUE', () => {
      render(<InvoiceDetailPage />)
      expect(screen.getByText('Segna Pagata')).toBeInTheDocument()
    })
  })

  describe('tabs navigation', () => {
    beforeEach(() => {
      mockData = { data: makeInvoice() }
    })

    it('mostra i 4 tab', () => {
      render(<InvoiceDetailPage />)
      expect(screen.getByText('Dettagli')).toBeInTheDocument()
      expect(screen.getByText('Pagamenti')).toBeInTheDocument()
      expect(screen.getByText('SDI')).toBeInTheDocument()
      expect(screen.getByText('Storico')).toBeInTheDocument()
    })

    it('click tab Pagamenti mostra stato vuoto pagamenti', () => {
      render(<InvoiceDetailPage />)
      fireEvent.click(screen.getByText('Pagamenti'))
      expect(screen.getByText('Nessun pagamento registrato')).toBeInTheDocument()
    })

    it('click tab SDI mostra stato vuoto SDI', () => {
      render(<InvoiceDetailPage />)
      fireEvent.click(screen.getByText('SDI'))
      expect(screen.getByText('Fattura non ancora inviata al Sistema di Interscambio')).toBeInTheDocument()
    })

    it('click tab Storico mostra stato vuoto storico', () => {
      render(<InvoiceDetailPage />)
      fireEvent.click(screen.getByText('Storico'))
      expect(screen.getByText('Nessuna modifica registrata')).toBeInTheDocument()
    })
  })

  describe('tab Pagamenti con dati', () => {
    beforeEach(() => {
      mockData = {
        data: makeInvoice({
          status: 'PAID',
          payments: [
            { id: 'p1', date: '2024-02-01T00:00:00Z', amount: 61, method: 'BANK_TRANSFER', status: 'COMPLETED' },
          ],
        }),
      }
    })

    it('mostra il metodo di pagamento Bonifico', () => {
      render(<InvoiceDetailPage />)
      fireEvent.click(screen.getByText('Pagamenti'))
      expect(screen.getByText('Bonifico')).toBeInTheDocument()
    })

    it('mostra lo stato Completato', () => {
      render(<InvoiceDetailPage />)
      fireEvent.click(screen.getByText('Pagamenti'))
      expect(screen.getByText('Completato')).toBeInTheDocument()
    })

    it('mostra stato In attesa per pagamento non completato', () => {
      mockData = {
        data: makeInvoice({
          status: 'PAID',
          payments: [
            { id: 'p2', date: '2024-02-01T00:00:00Z', amount: 30, method: 'CASH', status: 'PENDING' },
          ],
        }),
      }
      render(<InvoiceDetailPage />)
      fireEvent.click(screen.getByText('Pagamenti'))
      expect(screen.getByText('In attesa')).toBeInTheDocument()
    })
  })

  describe('tab SDI con eventi', () => {
    beforeEach(() => {
      mockData = {
        data: makeInvoice({
          sdiEvents: [
            { id: 's1', status: 'INVIATA', date: '2024-01-15T10:00:00Z', detail: 'Inviata con successo' },
          ],
        }),
      }
    })

    it('mostra lo stato SDI Inviata', () => {
      render(<InvoiceDetailPage />)
      fireEvent.click(screen.getByText('SDI'))
      expect(screen.getByText('Inviata')).toBeInTheDocument()
    })
  })

  describe('tab Storico con audit log', () => {
    beforeEach(() => {
      mockData = {
        data: makeInvoice({
          auditLog: [
            { id: 'a1', action: 'CREAZIONE', date: '2024-01-15T10:00:00Z', userName: 'Admin' },
          ],
        }),
      }
    })

    it('mostra l\'azione CREAZIONE', () => {
      render(<InvoiceDetailPage />)
      fireEvent.click(screen.getByText('Storico'))
      expect(screen.getByText('CREAZIONE')).toBeInTheDocument()
    })
  })

  describe('azioni DRAFT', () => {
    beforeEach(() => {
      mockData = { data: makeInvoice() }
    })

    it('click Invia chiama fetch POST /send e toast success', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue({}) })
      render(<InvoiceDetailPage />)
      fireEvent.click(screen.getByText('Invia'))
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/invoices/invoice-1/send',
          expect.objectContaining({ method: 'POST' }),
        )
      })
      await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith('Fattura inviata con successo'))
    })

    it('click Invia con errore mostra toast error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({ message: 'Errore server' }),
      })
      render(<InvoiceDetailPage />)
      fireEvent.click(screen.getByText('Invia'))
      await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('Errore server'))
    })

    it('click Invia a SDI chiama fetch POST /send con body sdi:true', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue({}) })
      render(<InvoiceDetailPage />)
      fireEvent.click(screen.getByText('Invia a SDI'))
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/invoices/invoice-1/send',
          expect.objectContaining({ method: 'POST', body: JSON.stringify({ sdi: true }) }),
        )
      })
    })

    it('click Elimina apre il dialog di conferma', () => {
      render(<InvoiceDetailPage />)
      fireEvent.click(screen.getByText('Elimina'))
      expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument()
    })

    it('conferma eliminazione chiama DELETE e naviga a /invoices', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue({}) })
      render(<InvoiceDetailPage />)
      fireEvent.click(screen.getByText('Elimina'))
      fireEvent.click(screen.getByText('Conferma eliminazione'))
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/invoices/invoice-1',
          expect.objectContaining({ method: 'DELETE' }),
        )
      })
      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/dashboard/invoices'))
    })

    it('annulla dialog non chiama fetch', () => {
      render(<InvoiceDetailPage />)
      fireEvent.click(screen.getByText('Elimina'))
      fireEvent.click(screen.getByText('Annulla dialog'))
      expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument()
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('azioni SENT', () => {
    beforeEach(() => {
      mockData = { data: makeInvoice({ status: 'SENT' }) }
    })

    it('click Sollecito chiama /send-reminder', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue({}) })
      render(<InvoiceDetailPage />)
      fireEvent.click(screen.getByText('Sollecito'))
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/invoices/invoice-1/send-reminder',
          expect.objectContaining({ method: 'POST' }),
        )
      })
    })

    it('click Segna Pagata apre MarkPaidDialog', () => {
      render(<InvoiceDetailPage />)
      fireEvent.click(screen.getByText('Segna Pagata'))
      expect(screen.getByText('Registra Pagamento')).toBeInTheDocument()
    })

    it('conferma pagamento chiama /mark-paid', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue({}) })
      render(<InvoiceDetailPage />)
      fireEvent.click(screen.getByText('Segna Pagata'))
      fireEvent.click(screen.getByText('Conferma Pagamento'))
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/invoices/invoice-1/mark-paid',
          expect.objectContaining({ method: 'POST' }),
        )
      })
    })

    it('annulla MarkPaidDialog chiude il dialog', () => {
      render(<InvoiceDetailPage />)
      fireEvent.click(screen.getByText('Segna Pagata'))
      expect(screen.getByText('Registra Pagamento')).toBeInTheDocument()
      fireEvent.click(screen.getByText('Annulla'))
      expect(screen.queryByText('Registra Pagamento')).not.toBeInTheDocument()
    })

    it('click Link Pagamento chiama /checkout e copia negli appunti', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ url: 'https://pay.example.com/123' }),
      })
      render(<InvoiceDetailPage />)
      fireEvent.click(screen.getByText('Link Pagamento'))
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/invoices/invoice-1/checkout',
          expect.objectContaining({ method: 'POST' }),
        )
      })
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://pay.example.com/123')
      })
    })

    it('click Paga a Rate chiama /bnpl e window.open', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ redirectUrl: 'https://bnpl.example.com/order' }),
      })
      render(<InvoiceDetailPage />)
      fireEvent.click(screen.getByText('Paga a Rate'))
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/invoices/invoice-1/bnpl',
          expect.objectContaining({ method: 'POST' }),
        )
      })
      await waitFor(() => {
        expect(mockOpen).toHaveBeenCalledWith('https://bnpl.example.com/order', '_blank')
      })
    })
  })

  describe('pulsanti sempre presenti', () => {
    beforeEach(() => {
      mockData = { data: makeInvoice() }
    })

    it('click PDF chiama window.open con url pdf', () => {
      render(<InvoiceDetailPage />)
      fireEvent.click(screen.getByText('PDF'))
      expect(mockOpen).toHaveBeenCalledWith('/api/invoices/invoice-1/pdf', '_blank')
    })

    it('click Indietro naviga a /invoices', () => {
      render(<InvoiceDetailPage />)
      fireEvent.click(screen.getByText('Indietro'))
      expect(mockPush).toHaveBeenCalledWith('/dashboard/invoices')
    })
  })

  describe('invoice con note', () => {
    it('mostra le note se presenti', () => {
      mockData = { data: makeInvoice({ notes: 'Pagamento entro 30 giorni' }) }
      render(<InvoiceDetailPage />)
      expect(screen.getByText('Pagamento entro 30 giorni')).toBeInTheDocument()
    })
  })

  describe('invoice con bollo', () => {
    it('mostra Bollo se bolloAmount > 0', () => {
      mockData = { data: makeInvoice({ bolloAmount: 2, total: 63 }) }
      render(<InvoiceDetailPage />)
      expect(screen.getByText('Bollo')).toBeInTheDocument()
    })
  })

  describe('response format raw (senza data wrapper)', () => {
    it('accetta risposta diretta senza data wrapper', () => {
      mockData = makeInvoice()
      render(<InvoiceDetailPage />)
      expect(screen.getAllByText('FT-2024-001').length).toBeGreaterThan(0)
    })
  })

  describe('invoice senza numero', () => {
    it('mostra id troncato se numero fattura assente', () => {
      mockData = { data: makeInvoice({ number: null }) }
      render(<InvoiceDetailPage />)
      expect(screen.getAllByText(/Fattura #invoice-/).length).toBeGreaterThan(0)
    })
  })

  describe('invoice con metodo di pagamento', () => {
    it('mostra il metodo di pagamento nella sezione date', () => {
      mockData = { data: makeInvoice({ paymentMethod: 'BANK_TRANSFER' }) }
      render(<InvoiceDetailPage />)
      expect(screen.getAllByText('Bonifico').length).toBeGreaterThan(0)
    })
  })

  describe('invoice con campi cliente facoltativi', () => {
    it('mostra indirizzo, P.IVA, C.F., SDI, PEC del cliente se presenti', () => {
      mockData = {
        data: makeInvoice({
          customerAddress: 'Via Roma 1, Milano',
          customerVat: '12345678901',
          customerFiscalCode: 'RSSMRA80A01H501A',
          customerSdi: 'ABCDEF1',
          customerPec: 'mario@pec.it',
        }),
      }
      render(<InvoiceDetailPage />)
      expect(screen.getByText('Via Roma 1, Milano')).toBeInTheDocument()
      expect(screen.getByText(/P\.IVA: 12345678901/)).toBeInTheDocument()
      expect(screen.getByText(/C\.F\.: RSSMRA80A01H501A/)).toBeInTheDocument()
      expect(screen.getByText(/SDI: ABCDEF1/)).toBeInTheDocument()
      expect(screen.getByText(/PEC: mario@pec\.it/)).toBeInTheDocument()
    })
  })

  describe('status sconosciuto (fallback DRAFT)', () => {
    it('usa il badge DRAFT per status non mappato', () => {
      mockData = { data: makeInvoice({ status: 'UNKNOWN_STATUS' }) }
      render(<InvoiceDetailPage />)
      expect(screen.getAllByText('Bozza').length).toBeGreaterThan(0)
    })
  })

  describe('MarkPaidDialog interazione campi', () => {
    beforeEach(() => {
      mockData = { data: makeInvoice({ status: 'SENT' }) }
    })

    it('modifica importo nel dialog di pagamento', () => {
      render(<InvoiceDetailPage />)
      fireEvent.click(screen.getByText('Segna Pagata'))
      const amountInput = screen.getByDisplayValue('61')
      fireEvent.change(amountInput, { target: { value: '50' } })
      expect((amountInput as HTMLInputElement).value).toBe('50')
    })

    it('modifica data pagamento nel dialog', () => {
      render(<InvoiceDetailPage />)
      fireEvent.click(screen.getByText('Segna Pagata'))
      const dateInput = screen.getByDisplayValue(new Date().toISOString().split('T')[0])
      fireEvent.change(dateInput, { target: { value: '2024-03-01' } })
      expect((dateInput as HTMLInputElement).value).toBe('2024-03-01')
    })

    it('modifica metodo nel dialog di pagamento', () => {
      render(<InvoiceDetailPage />)
      fireEvent.click(screen.getByText('Segna Pagata'))
      const methodSelect = screen.getByDisplayValue('Contanti')
      fireEvent.change(methodSelect, { target: { value: 'BANK_TRANSFER' } })
      expect((methodSelect as HTMLSelectElement).value).toBe('BANK_TRANSFER')
    })
  })

  describe('pulsante stampa', () => {
    it('click Stampa chiama window.print', () => {
      mockData = { data: makeInvoice() }
      const printMock = jest.fn()
      Object.defineProperty(window, 'print', { value: printMock, writable: true })
      render(<InvoiceDetailPage />)
      fireEvent.click(screen.getByText('Stampa'))
      expect(printMock).toHaveBeenCalled()
    })
  })
})
