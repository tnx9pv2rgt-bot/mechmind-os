import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

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

jest.mock('@/components/ui/apple-card', () => ({
  AppleCard: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'apple-card' }, children),
  AppleCardContent: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'apple-card-content' }, children),
  AppleCardHeader: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'apple-card-header' }, children),
}))

jest.mock('@/components/ui/apple-button', () => ({
  AppleButton: ({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) =>
    React.createElement('button', { onClick }, children),
}))

jest.mock('@/lib/utils/format', () => ({
  formatCurrency: (v: number) => `€${v}`,
}))

const mockMutate = jest.fn()
let mockSWRReturn: { data: unknown; error: unknown; isLoading: boolean; mutate: () => void } = {
  data: undefined, error: undefined, isLoading: false, mutate: mockMutate,
}

jest.mock('swr', () => ({
  __esModule: true,
  default: (_key: unknown) => mockSWRReturn,
}))

jest.mock('@/lib/swr-fetcher', () => ({ fetcher: jest.fn() }))

import BenchmarkingPage from '@/app/dashboard/analytics/benchmarking/page'

const mockMetric = {
  key: 'aro',
  label: 'ARO',
  yourValue: 500,
  industryAvg: 400,
  percentile: 80,
  trend: 'up' as const,
  unit: 'currency' as const,
}

const mockTip = {
  area: 'Margine ricambi',
  suggestion: 'Aumenta il margine sui ricambi del 5%',
  impact: 'high' as const,
}

beforeEach(() => {
  jest.clearAllMocks()
  mockSWRReturn = { data: undefined, error: undefined, isLoading: false, mutate: mockMutate }
})

describe('BenchmarkingPage', () => {
  describe('rendering iniziale', () => {
    it('renderizza titolo Benchmarking', () => {
      render(<BenchmarkingPage />)
      expect(screen.getByText('Benchmarking')).toBeInTheDocument()
    })

    it('renderizza sottotitolo', () => {
      render(<BenchmarkingPage />)
      expect(screen.getByText(/Confronta le performance/)).toBeInTheDocument()
    })

    it('renderizza select mese', () => {
      render(<BenchmarkingPage />)
      expect(document.querySelector('select')).toBeInTheDocument()
    })
  })

  describe('stato loading', () => {
    it('renderizza Loader2 quando isLoading=true', () => {
      mockSWRReturn = { data: undefined, error: undefined, isLoading: true, mutate: mockMutate }
      render(<BenchmarkingPage />)
      expect(document.querySelector('[data-icon="Loader2"]')).toBeInTheDocument()
    })
  })

  describe('stato errore', () => {
    it('mostra messaggio di errore', () => {
      mockSWRReturn = { data: undefined, error: new Error('fail'), isLoading: false, mutate: mockMutate }
      render(<BenchmarkingPage />)
      expect(screen.getByText('Impossibile caricare i dati di benchmarking')).toBeInTheDocument()
    })

    it('click Riprova chiama mutate', () => {
      mockSWRReturn = { data: undefined, error: new Error('fail'), isLoading: false, mutate: mockMutate }
      render(<BenchmarkingPage />)
      fireEvent.click(screen.getByText('Riprova'))
      expect(mockMutate).toHaveBeenCalledTimes(1)
    })
  })

  describe('stato vuoto', () => {
    it('mostra messaggio nessun dato', () => {
      mockSWRReturn = { data: { data: { metrics: [], tips: [], period: '2026-04' } }, error: undefined, isLoading: false, mutate: mockMutate }
      render(<BenchmarkingPage />)
      expect(screen.getByText('Nessun dato disponibile per il periodo selezionato')).toBeInTheDocument()
    })
  })

  describe('stato con dati', () => {
    beforeEach(() => {
      mockSWRReturn = {
        data: { data: { metrics: [mockMetric], tips: [mockTip], period: '2026-04' } },
        error: undefined, isLoading: false, mutate: mockMutate,
      }
    })

    it('renderizza il valore del tuo valore', () => {
      render(<BenchmarkingPage />)
      expect(screen.getByText('Il tuo valore')).toBeInTheDocument()
    })

    it('renderizza media settore', () => {
      render(<BenchmarkingPage />)
      expect(screen.getByText('Media settore')).toBeInTheDocument()
    })

    it('renderizza percentile badge Top 25%', () => {
      render(<BenchmarkingPage />)
      expect(screen.getByText('Top 25%')).toBeInTheDocument()
    })

    it('renderizza sezione suggerimenti', () => {
      render(<BenchmarkingPage />)
      expect(screen.getByText('Suggerimenti per migliorare')).toBeInTheDocument()
    })

    it('renderizza area tip', () => {
      render(<BenchmarkingPage />)
      expect(screen.getByText('Margine ricambi')).toBeInTheDocument()
    })

    it('renderizza suggestion text', () => {
      render(<BenchmarkingPage />)
      expect(screen.getByText('Aumenta il margine sui ricambi del 5%')).toBeInTheDocument()
    })

    it('renderizza label impatto alto', () => {
      render(<BenchmarkingPage />)
      expect(screen.getByText('Impatto alto')).toBeInTheDocument()
    })
  })

  describe('selezione mese', () => {
    it('cambio select aggiorna il valore selezionato', () => {
      mockSWRReturn = { data: undefined, error: undefined, isLoading: true, mutate: mockMutate }
      render(<BenchmarkingPage />)
      const select = document.querySelector('select') as HTMLSelectElement
      const options = Array.from(select.options)
      if (options.length > 1) {
        fireEvent.change(select, { target: { value: options[1].value } })
        expect(select.value).toBe(options[1].value)
      }
    })
  })

  describe('percentile labels', () => {
    const cases: { percentile: number; label: string }[] = [
      { percentile: 95, label: 'Top 10%' },
      { percentile: 50, label: 'Sopra la media' },
      { percentile: 30, label: 'Sotto la media' },
      { percentile: 10, label: 'Bottom 25%' },
    ]

    cases.forEach(({ percentile, label }) => {
      it(`percentile ${percentile} → "${label}"`, () => {
        mockSWRReturn = {
          data: { data: { metrics: [{ ...mockMetric, percentile }], tips: [], period: '2026-04' } },
          error: undefined, isLoading: false, mutate: mockMutate,
        }
        render(<BenchmarkingPage />)
        expect(screen.getByText(label)).toBeInTheDocument()
      })
    })
  })
})
