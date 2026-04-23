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
          const allowed = ['className', 'style', 'onClick', 'aria-label', 'id', 'role', 'tabIndex']
          const valid: Record<string, unknown> = {}
          for (const k of Object.keys(rest)) {
            if (allowed.includes(k) || k.startsWith('data-') || k.startsWith('aria-')) valid[k] = rest[k]
          }
          const tag = ['div', 'span', 'section', 'header', 'ul', 'li', 'p', 'form', 'button', 'a'].includes(prop) ? prop : 'div'
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
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// ── swr ───────────────────────────────────────────────────────────────────────
const mockMutateInvoices = jest.fn()
const mockMutateStats = jest.fn()
let mockInvoicesData: unknown = undefined
let mockStatsData: unknown = undefined
let mockInvoicesError: unknown = undefined
let mockStatsError: unknown = undefined
let mockIsLoading = false

jest.mock('swr', () => ({
  __esModule: true,
  default: (key: string) => {
    if (key === '/api/invoices') {
      return {
        data: mockInvoicesData,
        error: mockInvoicesError,
        isLoading: mockIsLoading,
        mutate: mockMutateInvoices,
      }
    }
    if (key === '/api/invoices/stats') {
      return {
        data: mockStatsData,
        error: mockStatsError,
        isLoading: false,
        mutate: mockMutateStats,
      }
    }
    return { data: undefined, error: undefined, isLoading: false, mutate: jest.fn() }
  },
}))

jest.mock('@/lib/swr-fetcher', () => ({ fetcher: jest.fn() }))

// ── sonner ────────────────────────────────────────────────────────────────────
jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

// ── UI components ─────────────────────────────────────────────────────────────
jest.mock('@/components/ui/apple-button', () => ({
  AppleButton: ({ children, onClick, variant, disabled, icon, loading }: {
    children?: React.ReactNode; onClick?: () => void; variant?: string
    disabled?: boolean; icon?: React.ReactNode; loading?: boolean
  }) =>
    React.createElement('button', { onClick, 'data-variant': variant, disabled: disabled || loading }, icon, children),
}))

jest.mock('@/components/ui/apple-card', () => ({
  AppleCard: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'apple-card' }, children),
  AppleCardContent: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', null, children),
  AppleCardHeader: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', null, children),
}))

jest.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement> & { 'aria-label'?: string }) =>
    React.createElement('input', props),
}))

jest.mock('@/components/ui/pagination', () => ({
  Pagination: ({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) =>
    React.createElement('div', {
      'data-testid': 'pagination',
      'data-page': page,
      'data-totalpages': totalPages,
      onClick: () => onPageChange(page + 1),
    }),
}))

import InvoicesPage from '@/app/dashboard/invoices/page'

const makeInvoice = (overrides = {}) => ({
  id: 'inv-1',
  number: 'FT-001',
  customerName: 'Mario Rossi',
  createdAt: '2026-01-15T10:00:00Z',
  dueDate: '2026-02-15T00:00:00Z',
  total: 1220,
  subtotal: 1000,
  taxAmount: 220,
  status: 'DRAFT' as const,
  ...overrides,
})

const makeStats = (overrides = {}) => ({
  monthlyRevenue: 5000,
  pendingCount: 3,
  sentCount: 7,
  paidCount: 12,
  ...overrides,
})

beforeEach(() => {
  jest.clearAllMocks()
  mockInvoicesData = undefined
  mockStatsData = undefined
  mockInvoicesError = undefined
  mockStatsError = undefined
  mockIsLoading = false
})

describe('InvoicesPage', () => {
  describe('loading state', () => {
    it('mostra spinner durante caricamento', () => {
      mockIsLoading = true
      render(<InvoicesPage />)
      expect(screen.getAllByText('...').length).toBeGreaterThan(0)
    })
  })

  describe('error state', () => {
    it('mostra messaggio errore se invoices fallisce', () => {
      mockInvoicesError = new Error('Network error')
      render(<InvoicesPage />)
      expect(screen.getByText('Impossibile caricare le fatture')).toBeInTheDocument()
    })

    it('mostra messaggio errore se stats fallisce', () => {
      mockStatsError = new Error('Stats error')
      render(<InvoicesPage />)
      expect(screen.getByText('Impossibile caricare le fatture')).toBeInTheDocument()
    })

    it('chiama mutate su click Riprova', () => {
      mockInvoicesError = new Error('err')
      render(<InvoicesPage />)
      fireEvent.click(screen.getByText('Riprova'))
      expect(mockMutateInvoices).toHaveBeenCalled()
      expect(mockMutateStats).toHaveBeenCalled()
    })
  })

  describe('empty state', () => {
    it('mostra messaggio quando non ci sono fatture', () => {
      mockInvoicesData = []
      mockStatsData = makeStats()
      render(<InvoicesPage />)
      expect(screen.getByText('Nessuna fattura trovata. Crea la prima fattura.')).toBeInTheDocument()
    })

    it('naviga a nuova fattura dal empty state', () => {
      mockInvoicesData = []
      mockStatsData = makeStats()
      render(<InvoicesPage />)
      fireEvent.click(screen.getByText('Crea la prima fattura'))
      expect(mockPush).toHaveBeenCalledWith('/dashboard/invoices/new')
    })
  })

  describe('lista fatture', () => {
    it('mostra fatture quando i dati sono disponibili', () => {
      mockInvoicesData = [makeInvoice()]
      mockStatsData = makeStats()
      render(<InvoicesPage />)
      expect(screen.getByText('FT-001')).toBeInTheDocument()
      expect(screen.getByText(/Mario Rossi/)).toBeInTheDocument()
    })

    it('gestisce formato {data: [...]}', () => {
      mockInvoicesData = { data: [makeInvoice({ number: 'FT-002' })] }
      mockStatsData = { data: makeStats() }
      render(<InvoicesPage />)
      expect(screen.getByText('FT-002')).toBeInTheDocument()
    })

    it('mostra badge stato DRAFT', () => {
      mockInvoicesData = [makeInvoice({ status: 'DRAFT' })]
      mockStatsData = makeStats()
      render(<InvoicesPage />)
      expect(screen.getAllByText('Bozza').length).toBeGreaterThan(0)
    })

    it('mostra badge stato SENT', () => {
      mockInvoicesData = [makeInvoice({ status: 'SENT' })]
      mockStatsData = makeStats()
      render(<InvoicesPage />)
      expect(screen.getAllByText('Inviata').length).toBeGreaterThan(0)
    })

    it('mostra badge stato PAID', () => {
      mockInvoicesData = [makeInvoice({ status: 'PAID' })]
      mockStatsData = makeStats()
      render(<InvoicesPage />)
      expect(screen.getAllByText('Pagata').length).toBeGreaterThan(0)
    })

    it('mostra badge stato OVERDUE', () => {
      mockInvoicesData = [makeInvoice({ status: 'OVERDUE' })]
      mockStatsData = makeStats()
      render(<InvoicesPage />)
      expect(screen.getAllByText('Scaduta').length).toBeGreaterThan(0)
    })

    it('mostra badge stato CANCELLED', () => {
      mockInvoicesData = [makeInvoice({ status: 'CANCELLED' })]
      mockStatsData = makeStats()
      render(<InvoicesPage />)
      expect(screen.getAllByText('Annullata').length).toBeGreaterThan(0)
    })

    it('naviga al dettaglio su click Visualizza', () => {
      mockInvoicesData = [makeInvoice()]
      mockStatsData = makeStats()
      render(<InvoicesPage />)
      fireEvent.click(screen.getByText('Visualizza'))
      expect(mockPush).toHaveBeenCalledWith('/dashboard/invoices/inv-1')
    })

    it('usa id come numero quando number è assente', () => {
      mockInvoicesData = [makeInvoice({ number: undefined })]
      mockStatsData = makeStats()
      render(<InvoicesPage />)
      expect(screen.getByText('#inv-1'.slice(0, 9))).toBeInTheDocument()
    })
  })

  describe('statistiche', () => {
    it('mostra fatturato del mese', () => {
      mockInvoicesData = []
      mockStatsData = makeStats({ monthlyRevenue: 5000 })
      render(<InvoicesPage />)
      expect(screen.getByText('Fatturato Mese')).toBeInTheDocument()
    })

    it('mostra contatori statistiche', () => {
      mockInvoicesData = []
      mockStatsData = makeStats({ pendingCount: 3, sentCount: 7, paidCount: 12 })
      render(<InvoicesPage />)
      expect(screen.getByText('In Attesa')).toBeInTheDocument()
      expect(screen.getByText('Inviate')).toBeInTheDocument()
      expect(screen.getByText('Pagate')).toBeInTheDocument()
    })

    it('mostra ... quando isLoading = true', () => {
      mockIsLoading = true
      mockInvoicesData = undefined
      mockStatsData = undefined
      render(<InvoicesPage />)
      const dots = screen.getAllByText('...')
      expect(dots.length).toBeGreaterThan(0)
    })
  })

  describe('header', () => {
    it('mostra titolo Fatture', () => {
      mockInvoicesData = []
      mockStatsData = makeStats()
      render(<InvoicesPage />)
      expect(screen.getByText('Fatture')).toBeInTheDocument()
    })

    it('naviga a nuova fattura da header', () => {
      mockInvoicesData = []
      mockStatsData = makeStats()
      render(<InvoicesPage />)
      fireEvent.click(screen.getByText('Nuova Fattura'))
      expect(mockPush).toHaveBeenCalledWith('/dashboard/invoices/new')
    })
  })

  describe('filtri', () => {
    it('filtra per ricerca testo numero fattura', () => {
      mockInvoicesData = [makeInvoice({ number: 'FT-001' }), makeInvoice({ id: 'inv-2', number: 'FT-002', customerName: 'Luca Bianchi' })]
      mockStatsData = makeStats()
      render(<InvoicesPage />)
      const input = screen.getByPlaceholderText('Cerca per numero o cliente...')
      fireEvent.change(input, { target: { value: 'FT-001' } })
      expect(screen.getByText('FT-001')).toBeInTheDocument()
      expect(screen.queryByText('FT-002')).not.toBeInTheDocument()
    })

    it('filtra per ricerca nome cliente', () => {
      mockInvoicesData = [makeInvoice(), makeInvoice({ id: 'inv-2', number: 'FT-002', customerName: 'Luca Bianchi' })]
      mockStatsData = makeStats()
      render(<InvoicesPage />)
      const input = screen.getByPlaceholderText('Cerca per numero o cliente...')
      fireEvent.change(input, { target: { value: 'Luca' } })
      expect(screen.queryByText('FT-001')).not.toBeInTheDocument()
      expect(screen.getByText('FT-002')).toBeInTheDocument()
    })

    it('filtra per stato DRAFT via select', () => {
      mockInvoicesData = [
        makeInvoice({ status: 'DRAFT' }),
        makeInvoice({ id: 'inv-2', number: 'FT-002', status: 'PAID' }),
      ]
      mockStatsData = makeStats()
      render(<InvoicesPage />)
      const select = screen.getByDisplayValue('Tutti gli stati')
      fireEvent.change(select, { target: { value: 'DRAFT' } })
      expect(screen.getByText('FT-001')).toBeInTheDocument()
      expect(screen.queryByText('FT-002')).not.toBeInTheDocument()
    })

    it('mostra tutti con filtro ALL', () => {
      mockInvoicesData = [makeInvoice(), makeInvoice({ id: 'inv-2', number: 'FT-002', status: 'PAID' })]
      mockStatsData = makeStats()
      render(<InvoicesPage />)
      expect(screen.getByText('FT-001')).toBeInTheDocument()
      expect(screen.getByText('FT-002')).toBeInTheDocument()
    })
  })

  describe('azioni DRAFT', () => {
    it('mostra bottone Invia per fatture DRAFT', () => {
      mockInvoicesData = [makeInvoice({ status: 'DRAFT' })]
      mockStatsData = makeStats()
      render(<InvoicesPage />)
      expect(screen.getByText('Invia')).toBeInTheDocument()
    })

    it('chiama /api/invoices/:id/send su click Invia', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true })
      mockInvoicesData = [makeInvoice({ status: 'DRAFT' })]
      mockStatsData = makeStats()
      render(<InvoicesPage />)
      fireEvent.click(screen.getByText('Invia'))
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/invoices/inv-1/send', { method: 'POST' })
      })
      expect(toast.success).toHaveBeenCalledWith('Fattura inviata con successo')
      expect(mockMutateInvoices).toHaveBeenCalled()
    })

    it('mostra toast errore se invio fallisce', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false })
      mockInvoicesData = [makeInvoice({ status: 'DRAFT' })]
      mockStatsData = makeStats()
      render(<InvoicesPage />)
      fireEvent.click(screen.getByText('Invia'))
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Errore durante l'invio della fattura")
      })
    })
  })

  describe('azioni SENT', () => {
    it('mostra bottone Segna Pagata per fatture SENT', () => {
      mockInvoicesData = [makeInvoice({ status: 'SENT' })]
      mockStatsData = makeStats()
      render(<InvoicesPage />)
      expect(screen.getByText('Segna Pagata')).toBeInTheDocument()
    })

    it('chiama /api/invoices/:id/pay su click Segna Pagata', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true })
      mockInvoicesData = [makeInvoice({ status: 'SENT' })]
      mockStatsData = makeStats()
      render(<InvoicesPage />)
      fireEvent.click(screen.getByText('Segna Pagata'))
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/invoices/inv-1/pay', { method: 'POST' })
      })
      expect(toast.success).toHaveBeenCalledWith('Pagamento registrato con successo')
    })

    it('mostra toast errore se pagamento fallisce', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false })
      mockInvoicesData = [makeInvoice({ status: 'SENT' })]
      mockStatsData = makeStats()
      render(<InvoicesPage />)
      fireEvent.click(screen.getByText('Segna Pagata'))
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Errore durante la registrazione del pagamento')
      })
    })
  })
})
