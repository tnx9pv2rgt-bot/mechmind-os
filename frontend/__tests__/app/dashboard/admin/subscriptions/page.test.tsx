import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { toast } from 'sonner'

jest.mock('framer-motion', () => {
  const React = require('react')
  return {
    motion: new Proxy({}, {
      get: (_t: unknown, prop: string) =>
        React.forwardRef(({ children, ...rest }: { children?: React.ReactNode; [k: string]: unknown }, ref: React.Ref<HTMLElement>) => {
          const allowed = ['className', 'style', 'onClick', 'id']
          const valid: Record<string, unknown> = {}
          for (const k of Object.keys(rest)) {
            if (allowed.includes(k) || k.startsWith('data-') || k.startsWith('aria-')) valid[k] = rest[k]
          }
          const tag = ['div', 'span'].includes(prop) ? prop : 'div'
          return React.createElement(tag, { ...valid, ref }, children)
        }),
    }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  }
})

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

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

jest.mock('@/components/ui/apple-card', () => ({
  AppleCard: ({ children, className }: { children?: React.ReactNode; className?: string }) =>
    React.createElement('div', { 'data-testid': 'apple-card', className }, children),
  AppleCardContent: ({ children, className }: { children?: React.ReactNode; className?: string }) =>
    React.createElement('div', { 'data-testid': 'apple-card-content', className }, children),
  AppleCardHeader: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'apple-card-header' }, children),
}))

jest.mock('@/components/ui/apple-button', () => ({
  AppleButton: ({ children, onClick, disabled, variant, size, className }: {
    children?: React.ReactNode; onClick?: () => void; disabled?: boolean
    variant?: string; size?: string; className?: string
  }) =>
    React.createElement('button', { onClick, disabled, 'data-variant': variant, className }, children),
}))

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children?: React.ReactNode; className?: string }) =>
    React.createElement('span', { 'data-testid': 'badge', className }, children),
}))

jest.mock('@/components/ui/input', () => ({
  Input: React.forwardRef((props: React.InputHTMLAttributes<HTMLInputElement>, ref: React.Ref<HTMLInputElement>) =>
    React.createElement('input', { ...props, ref }),
  ),
}))

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: { children?: React.ReactNode; value?: string; onValueChange?: (v: string) => void }) =>
    React.createElement('div', { 'data-testid': 'select', 'data-value': value }, children),
  SelectTrigger: ({ children, className }: { children?: React.ReactNode; className?: string }) =>
    React.createElement('div', { 'data-testid': 'select-trigger', className }, children),
  SelectValue: ({ placeholder }: { placeholder?: string }) =>
    React.createElement('span', { 'data-testid': 'select-value' }, placeholder),
  SelectContent: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'select-content' }, children),
  SelectItem: ({ children, value }: { children?: React.ReactNode; value?: string }) =>
    React.createElement('div', { 'data-testid': 'select-item', 'data-value': value }, children),
}))

let dialogOpen = false
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children?: React.ReactNode; open?: boolean }) => {
    dialogOpen = open ?? false
    return open ? React.createElement('div', { 'data-testid': 'dialog', role: 'dialog' }, children) : null
  },
  DialogContent: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'dialog-content' }, children),
  DialogHeader: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'dialog-header' }, children),
  DialogTitle: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('h2', { 'data-testid': 'dialog-title' }, children),
  DialogDescription: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('p', { 'data-testid': 'dialog-description' }, children),
  DialogFooter: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'dialog-footer' }, children),
}))

const mockMutate = jest.fn()
let mockSWRReturn: { data: unknown; error: unknown; isLoading: boolean; mutate: () => void } = {
  data: undefined, error: undefined, isLoading: false, mutate: mockMutate,
}

jest.mock('swr', () => ({
  __esModule: true,
  default: (_key: unknown, _fetcher: unknown, _opts?: unknown) => mockSWRReturn,
}))

const mockFetch = jest.fn()
global.fetch = mockFetch

import AdminSubscriptionsPage from '@/app/dashboard/admin/subscriptions/page'

const mockTenant: {
  id: string; name: string; slug: string; plan: string; status: string
  mrr: number; createdAt: string; userCount: number
} = {
  id: 't1', name: 'Officina Rossi', slug: 'officina-rossi',
  plan: 'PROFESSIONAL', status: 'ACTIVE', mrr: 299, createdAt: '2025-01-15T10:00:00Z', userCount: 5,
}

const mockStats = { mrr: 10000, arr: 120000, churnRate: 2.5, newSignups: 12 }

beforeEach(() => {
  jest.clearAllMocks()
  mockSWRReturn = { data: undefined, error: undefined, isLoading: false, mutate: mockMutate }
})

describe('AdminSubscriptionsPage', () => {
  describe('stato loading', () => {
    it('mostra spinner Loader2', () => {
      mockSWRReturn = { data: undefined, error: undefined, isLoading: true, mutate: mockMutate }
      render(<AdminSubscriptionsPage />)
      expect(document.querySelector('[data-icon="Loader2"]')).toBeInTheDocument()
    })
  })

  describe('stato errore', () => {
    it('mostra "Errore di caricamento"', () => {
      mockSWRReturn = { data: undefined, error: new Error('fail'), isLoading: false, mutate: mockMutate }
      render(<AdminSubscriptionsPage />)
      expect(screen.getByText('Errore di caricamento')).toBeInTheDocument()
    })

    it('mostra "Impossibile caricare i dati dei tenant"', () => {
      mockSWRReturn = { data: undefined, error: new Error('fail'), isLoading: false, mutate: mockMutate }
      render(<AdminSubscriptionsPage />)
      expect(screen.getByText(/Impossibile caricare/)).toBeInTheDocument()
    })
  })

  describe('rendering principale', () => {
    beforeEach(() => {
      mockSWRReturn = {
        data: { data: [mockTenant], stats: mockStats },
        error: undefined, isLoading: false, mutate: mockMutate,
      }
    })

    it('renderizza titolo Gestione Abbonamenti', () => {
      render(<AdminSubscriptionsPage />)
      expect(screen.getByText('Gestione Abbonamenti')).toBeInTheDocument()
    })

    it('renderizza KPI MRR', () => {
      render(<AdminSubscriptionsPage />)
      expect(screen.getAllByText('MRR').length).toBeGreaterThan(0)
    })

    it('renderizza KPI ARR', () => {
      render(<AdminSubscriptionsPage />)
      expect(screen.getAllByText('ARR').length).toBeGreaterThan(0)
    })

    it('renderizza KPI Churn Rate', () => {
      render(<AdminSubscriptionsPage />)
      expect(screen.getByText('Churn Rate')).toBeInTheDocument()
    })

    it('renderizza KPI Nuove iscrizioni', () => {
      render(<AdminSubscriptionsPage />)
      expect(screen.getByText('Nuove iscrizioni')).toBeInTheDocument()
    })

    it('renderizza nome tenant in tabella', () => {
      render(<AdminSubscriptionsPage />)
      expect(screen.getByText('Officina Rossi')).toBeInTheDocument()
    })

    it('renderizza counter tenant', () => {
      render(<AdminSubscriptionsPage />)
      expect(screen.getByText('Tenant (1)')).toBeInTheDocument()
    })

    it('campo ricerca presente', () => {
      render(<AdminSubscriptionsPage />)
      expect(screen.getByPlaceholderText('Cerca tenant...')).toBeInTheDocument()
    })
  })

  describe('filtro ricerca', () => {
    beforeEach(() => {
      mockSWRReturn = {
        data: { data: [mockTenant], stats: mockStats },
        error: undefined, isLoading: false, mutate: mockMutate,
      }
    })

    it('filtra per nome: tenant non trovato mostra messaggio vuoto', () => {
      render(<AdminSubscriptionsPage />)
      fireEvent.change(screen.getByPlaceholderText('Cerca tenant...'), { target: { value: 'ZZZZZ' } })
      expect(screen.getByText('Nessun tenant trovato con i filtri selezionati.')).toBeInTheDocument()
    })

    it('filtra per nome: tenant trovato rimane in lista', () => {
      render(<AdminSubscriptionsPage />)
      fireEvent.change(screen.getByPlaceholderText('Cerca tenant...'), { target: { value: 'Rossi' } })
      expect(screen.getByText('Officina Rossi')).toBeInTheDocument()
    })
  })

  describe('stato vuoto', () => {
    it('mostra messaggio quando nessun tenant', () => {
      mockSWRReturn = {
        data: { data: [] },
        error: undefined, isLoading: false, mutate: mockMutate,
      }
      render(<AdminSubscriptionsPage />)
      expect(screen.getByText('Nessun tenant trovato con i filtri selezionati.')).toBeInTheDocument()
    })
  })

  describe('dialog azioni', () => {
    beforeEach(() => {
      mockSWRReturn = {
        data: { data: [mockTenant], stats: mockStats },
        error: undefined, isLoading: false, mutate: mockMutate,
      }
    })

    it('click MoreHorizontal apre dialog', () => {
      render(<AdminSubscriptionsPage />)
      const btn = document.querySelector('[data-icon="MoreHorizontal"]')?.closest('button')
      fireEvent.click(btn!)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('dialog mostra "Modifica Piano" come titolo di default', () => {
      render(<AdminSubscriptionsPage />)
      const btn = document.querySelector('[data-icon="MoreHorizontal"]')?.closest('button')
      fireEvent.click(btn!)
      expect(screen.getAllByText('Modifica Piano').length).toBeGreaterThan(0)
    })
  })

  describe('handleAction - successo', () => {
    it('PATCH al backend e chiama toast.success', async () => {
      mockSWRReturn = {
        data: { data: [mockTenant], stats: mockStats },
        error: undefined, isLoading: false, mutate: mockMutate,
      }
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      render(<AdminSubscriptionsPage />)
      const btn = document.querySelector('[data-icon="MoreHorizontal"]')?.closest('button')
      fireEvent.click(btn!)
      const confermaBtn = screen.getByText('Conferma')
      await act(async () => { fireEvent.click(confermaBtn) })
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/dashboard/admin/tenants', expect.objectContaining({ method: 'PATCH' }))
        expect(toast.success).toHaveBeenCalledWith('Tenant aggiornato con successo')
      })
    })
  })

  describe('handleAction - errore', () => {
    it('su res.ok=false chiama toast.error', async () => {
      mockSWRReturn = {
        data: { data: [mockTenant], stats: mockStats },
        error: undefined, isLoading: false, mutate: mockMutate,
      }
      mockFetch.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({}) })
      render(<AdminSubscriptionsPage />)
      const btn = document.querySelector('[data-icon="MoreHorizontal"]')?.closest('button')
      fireEvent.click(btn!)
      await act(async () => { fireEvent.click(screen.getByText('Conferma')) })
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled()
      })
    })
  })

  describe('tenants via data.tenants fallback', () => {
    it('legge tenants da data.tenants se data.data assente', () => {
      mockSWRReturn = {
        data: { tenants: [mockTenant] },
        error: undefined, isLoading: false, mutate: mockMutate,
      }
      render(<AdminSubscriptionsPage />)
      expect(screen.getByText('Officina Rossi')).toBeInTheDocument()
    })
  })
})
