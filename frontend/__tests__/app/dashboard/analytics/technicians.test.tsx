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
  AppleButton: ({ children, onClick, variant }: { children?: React.ReactNode; onClick?: () => void; variant?: string }) =>
    React.createElement('button', { onClick, 'data-variant': variant }, children),
}))

let mockSWRReturn: { data: unknown; error: unknown; isLoading: boolean } = {
  data: undefined, error: undefined, isLoading: false,
}

jest.mock('swr', () => ({
  __esModule: true,
  default: (_key: unknown) => mockSWRReturn,
  mutate: jest.fn(),
}))

jest.mock('@/lib/swr-fetcher', () => ({ fetcher: jest.fn() }))

import TechnicianEfficiencyPage from '@/app/dashboard/analytics/technicians/page'

const mockTech = {
  id: 'tech-1',
  name: 'Mario Rossi',
  efficiencyPercent: 92,
  revenue: 5000,
  jobsCompleted: 20,
  hoursBilled: 40,
  hoursWorked: 44,
  trend: 'UP' as const,
  goalTarget: 100,
  goalCurrent: 92,
}

const mockKpis = {
  avgEfficiency: 92,
  totalRevenue: 5000,
  totalHoursBilled: 40,
  totalJobsCompleted: 20,
}

beforeEach(() => {
  jest.clearAllMocks()
  mockSWRReturn = { data: undefined, error: undefined, isLoading: false }
})

describe('TechnicianEfficiencyPage', () => {
  describe('rendering iniziale', () => {
    it('renderizza titolo Efficienza Tecnici', () => {
      render(<TechnicianEfficiencyPage />)
      expect(screen.getByText('Efficienza Tecnici')).toBeInTheDocument()
    })

    it('renderizza sottotitolo', () => {
      render(<TechnicianEfficiencyPage />)
      expect(screen.getByText(/Metriche di performance/)).toBeInTheDocument()
    })

    it('renderizza bottoni periodo', () => {
      render(<TechnicianEfficiencyPage />)
      expect(screen.getByText('Settimana')).toBeInTheDocument()
      expect(screen.getByText('Mese')).toBeInTheDocument()
      expect(screen.getByText('Trimestre')).toBeInTheDocument()
    })

    it('Mese è selezionato di default (primary variant)', () => {
      render(<TechnicianEfficiencyPage />)
      const meseBtn = screen.getByText('Mese').closest('button')
      expect(meseBtn?.getAttribute('data-variant')).toBe('primary')
    })
  })

  describe('stato loading', () => {
    it('renderizza Loader2 quando isLoading=true', () => {
      mockSWRReturn = { data: undefined, error: undefined, isLoading: true }
      render(<TechnicianEfficiencyPage />)
      expect(document.querySelector('[data-icon="Loader2"]')).toBeInTheDocument()
    })
  })

  describe('stato errore', () => {
    it('mostra messaggio di errore', () => {
      mockSWRReturn = { data: undefined, error: new Error('fail'), isLoading: false }
      render(<TechnicianEfficiencyPage />)
      expect(screen.getByText('Errore nel caricamento dei dati')).toBeInTheDocument()
    })

    it('mostra bottone Riprova', () => {
      mockSWRReturn = { data: undefined, error: new Error('fail'), isLoading: false }
      render(<TechnicianEfficiencyPage />)
      expect(screen.getByText('Riprova')).toBeInTheDocument()
    })
  })

  describe('stato vuoto', () => {
    it('mostra messaggio nessun dato tecnico', () => {
      mockSWRReturn = { data: { data: [], kpis: mockKpis }, error: undefined, isLoading: false }
      render(<TechnicianEfficiencyPage />)
      expect(screen.getByText('Nessun dato tecnico disponibile')).toBeInTheDocument()
    })
  })

  describe('stato con dati', () => {
    beforeEach(() => {
      mockSWRReturn = {
        data: { data: [mockTech], kpis: mockKpis },
        error: undefined, isLoading: false,
      }
    })

    it('renderizza nome tecnico', () => {
      render(<TechnicianEfficiencyPage />)
      expect(screen.getAllByText('Mario Rossi').length).toBeGreaterThan(0)
    })

    it('renderizza KPI "Efficienza media"', () => {
      render(<TechnicianEfficiencyPage />)
      expect(screen.getByText('Efficienza media')).toBeInTheDocument()
    })

    it('renderizza KPI "Revenue totale"', () => {
      render(<TechnicianEfficiencyPage />)
      expect(screen.getByText('Revenue totale')).toBeInTheDocument()
    })

    it('renderizza KPI "Ore fatturate"', () => {
      render(<TechnicianEfficiencyPage />)
      expect(screen.getAllByText('Ore fatturate').length).toBeGreaterThan(0)
    })

    it('renderizza classifica tecnici', () => {
      render(<TechnicianEfficiencyPage />)
      expect(screen.getByText('Classifica Tecnici')).toBeInTheDocument()
    })

    it('renderizza sezione ore fatturate vs ore lavorate', () => {
      render(<TechnicianEfficiencyPage />)
      expect(screen.getByText('Ore fatturate vs Ore lavorate')).toBeInTheDocument()
    })
  })

  describe('selezione periodo', () => {
    it('click Settimana cambia periodo', () => {
      render(<TechnicianEfficiencyPage />)
      fireEvent.click(screen.getByText('Settimana'))
      const settBtn = screen.getByText('Settimana').closest('button')
      expect(settBtn?.getAttribute('data-variant')).toBe('primary')
    })

    it('click Trimestre cambia periodo', () => {
      render(<TechnicianEfficiencyPage />)
      fireEvent.click(screen.getByText('Trimestre'))
      const trimBtn = screen.getByText('Trimestre').closest('button')
      expect(trimBtn?.getAttribute('data-variant')).toBe('primary')
    })
  })

  describe('trend icons', () => {
    it('trend DOWN mostra TrendingDown', () => {
      mockSWRReturn = {
        data: { data: [{ ...mockTech, trend: 'DOWN' }], kpis: mockKpis },
        error: undefined, isLoading: false,
      }
      render(<TechnicianEfficiencyPage />)
      expect(document.querySelector('[data-icon="TrendingDown"]')).toBeInTheDocument()
    })

    it('trend STABLE mostra Minus', () => {
      mockSWRReturn = {
        data: { data: [{ ...mockTech, trend: 'STABLE' }], kpis: mockKpis },
        error: undefined, isLoading: false,
      }
      render(<TechnicianEfficiencyPage />)
      expect(document.querySelector('[data-icon="Minus"]')).toBeInTheDocument()
    })
  })

  describe('goalPct null quando goalTarget=0', () => {
    it('mostra N/D quando non c\'è obiettivo', () => {
      mockSWRReturn = {
        data: { data: [{ ...mockTech, goalTarget: 0, goalCurrent: undefined }], kpis: mockKpis },
        error: undefined, isLoading: false,
      }
      render(<TechnicianEfficiencyPage />)
      expect(screen.getAllByText('N/D').length).toBeGreaterThan(0)
    })
  })
})
