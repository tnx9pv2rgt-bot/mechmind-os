import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// ---- SWR ----
let mockData: unknown = undefined
let mockError: unknown = undefined
let mockIsLoading = false
const mockMutate = jest.fn()
let lastSwrKey = ''

jest.mock('swr', () => ({
  __esModule: true,
  default: (key: string) => {
    lastSwrKey = key
    return { data: mockData, error: mockError, isLoading: mockIsLoading, mutate: mockMutate }
  },
}))

jest.mock('@/lib/swr-fetcher', () => ({ fetcher: jest.fn() }))

// ---- recharts ----
jest.mock('recharts', () => {
  const React = require('react')
  const Stub = ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'chart' }, children)
  return {
    BarChart: Stub,
    Bar: Stub,
    XAxis: Stub,
    YAxis: Stub,
    CartesianGrid: Stub,
    Tooltip: Stub,
    ResponsiveContainer: ({ children }: { children?: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'responsive-container' }, children),
    PieChart: Stub,
    Pie: Stub,
    Cell: Stub,
    LineChart: Stub,
    Line: Stub,
    Legend: Stub,
  }
})

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
jest.mock('sonner', () => ({
  toast: {
    success: (...a: unknown[]) => mockToastSuccess(...a),
    error: jest.fn(),
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
    icon,
  }: {
    children?: React.ReactNode
    onClick?: () => void
    icon?: React.ReactNode
  }) => React.createElement('button', { onClick }, icon, children),
}))

jest.mock('@/components/ui/breadcrumb', () => ({
  Breadcrumb: ({ items }: { items: { label: string }[] }) =>
    React.createElement('nav', null, ...items.map(i => React.createElement('span', { key: i.label }, i.label))),
}))

function makeFinancial(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    kpi: { fatturato: 10000, daIncassare: 3000, scaduto: 500, incassato: 6500 },
    revenueTrend: [{ month: 'Gen', revenue: 5000 }, { month: 'Feb', revenue: 5000 }],
    agingReport: [{ range: '0-30gg', amount: 1000 }],
    paymentMethodDistribution: [{ method: 'Bonifico', amount: 5000 }],
    cashFlow: [{ month: 'Gen', entrate: 5000, uscite: 2000 }],
    topCustomers: [{ name: 'Mario Rossi', revenue: 5000, invoiceCount: 3 }],
    ...overrides,
  }
}

import FinancialDashboardPage from '@/app/dashboard/invoices/financial/page'

beforeEach(() => {
  mockData = undefined
  mockError = undefined
  mockIsLoading = false
  mockMutate.mockClear()
  mockToastSuccess.mockClear()
  lastSwrKey = ''
})

describe('FinancialDashboardPage', () => {
  describe('stati di caricamento', () => {
    it('mostra spinner durante il caricamento', () => {
      mockIsLoading = true
      render(<FinancialDashboardPage />)
      expect(document.querySelector('[data-icon="Loader2"]')).toBeTruthy()
    })

    it('mostra errore se SWR fallisce', () => {
      mockError = new Error('err')
      render(<FinancialDashboardPage />)
      expect(screen.getByText('Impossibile caricare i dati finanziari')).toBeInTheDocument()
    })

    it('click Riprova chiama mutate', () => {
      mockError = new Error('err')
      render(<FinancialDashboardPage />)
      fireEvent.click(screen.getByText('Riprova'))
      expect(mockMutate).toHaveBeenCalled()
    })
  })

  describe('rendering con dati', () => {
    beforeEach(() => {
      mockData = { data: makeFinancial() }
    })

    it('mostra titolo Report Finanziario', () => {
      render(<FinancialDashboardPage />)
      expect(screen.getAllByText('Report Finanziario').length).toBeGreaterThan(0)
    })

    it('mostra le 4 KPI card', () => {
      render(<FinancialDashboardPage />)
      expect(screen.getAllByText('Fatturato').length).toBeGreaterThan(0)
      expect(screen.getByText('Da Incassare')).toBeInTheDocument()
      expect(screen.getByText('Scaduto')).toBeInTheDocument()
      expect(screen.getByText('Incassato')).toBeInTheDocument()
    })

    it('mostra i titoli dei grafici', () => {
      render(<FinancialDashboardPage />)
      expect(screen.getByText('Andamento Fatturato')).toBeInTheDocument()
      expect(screen.getByText('Scadenziario (Aging Report)')).toBeInTheDocument()
      expect(screen.getByText('Distribuzione Metodi di Pagamento')).toBeInTheDocument()
      expect(screen.getByText('Cash Flow')).toBeInTheDocument()
    })

    it('mostra top customer', () => {
      render(<FinancialDashboardPage />)
      expect(screen.getByText('Mario Rossi')).toBeInTheDocument()
    })

    it('mostra intestazioni tabella top customers', () => {
      render(<FinancialDashboardPage />)
      expect(screen.getAllByText('Cliente').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Fatture').length).toBeGreaterThan(0)
    })
  })

  describe('period toggle', () => {
    beforeEach(() => {
      mockData = { data: makeFinancial() }
    })

    it('mostra i 3 bottoni periodo: Mese, Trimestre, Anno', () => {
      render(<FinancialDashboardPage />)
      expect(screen.getByText('Mese')).toBeInTheDocument()
      expect(screen.getByText('Trimestre')).toBeInTheDocument()
      expect(screen.getByText('Anno')).toBeInTheDocument()
    })

    it('click Trimestre cambia la SWR key', async () => {
      render(<FinancialDashboardPage />)
      fireEvent.click(screen.getByText('Trimestre'))
      await waitFor(() => {
        expect(lastSwrKey).toContain('period=quarter')
      })
    })

    it('click Anno cambia la SWR key', async () => {
      render(<FinancialDashboardPage />)
      fireEvent.click(screen.getByText('Anno'))
      await waitFor(() => {
        expect(lastSwrKey).toContain('period=year')
      })
    })

    it('default è Mese', () => {
      render(<FinancialDashboardPage />)
      expect(lastSwrKey).toContain('period=month')
    })
  })

  describe('stato vuoto grafici', () => {
    beforeEach(() => {
      mockData = {
        data: makeFinancial({
          revenueTrend: [],
          agingReport: [],
          paymentMethodDistribution: [],
          cashFlow: [],
          topCustomers: [],
        }),
      }
    })

    it('mostra "Nessun dato disponibile" per ogni grafico vuoto', () => {
      render(<FinancialDashboardPage />)
      const messages = screen.getAllByText('Nessun dato disponibile')
      expect(messages.length).toBeGreaterThanOrEqual(4)
    })
  })

  describe('pulsante esporta', () => {
    it('click Esporta Report mostra toast', () => {
      mockData = { data: makeFinancial() }
      render(<FinancialDashboardPage />)
      fireEvent.click(screen.getByText('Esporta Report'))
      expect(mockToastSuccess).toHaveBeenCalledWith('Report esportato')
    })
  })

  describe('response senza data wrapper', () => {
    it('accetta risposta diretta', () => {
      mockData = makeFinancial()
      render(<FinancialDashboardPage />)
      expect(screen.getAllByText('Report Finanziario').length).toBeGreaterThan(0)
    })
  })
})
