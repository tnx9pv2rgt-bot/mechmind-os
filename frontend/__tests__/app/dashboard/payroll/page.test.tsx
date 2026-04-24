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
  AppleCard: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'apple-card' }, children),
  AppleCardContent: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'apple-card-content' }, children),
  AppleCardHeader: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'apple-card-header' }, children),
}))

jest.mock('@/components/ui/apple-button', () => ({
  AppleButton: ({ children, onClick, disabled, variant, size, className, loading }: {
    children?: React.ReactNode; onClick?: () => void; disabled?: boolean
    variant?: string; size?: string; className?: string; loading?: boolean
  }) =>
    React.createElement('button', { onClick, disabled: disabled || loading, 'data-variant': variant, className }, children),
}))

let mockSWRReturn: { data: unknown; error: unknown; isLoading: boolean } = {
  data: undefined, error: undefined, isLoading: false,
}

jest.mock('swr', () => ({
  __esModule: true,
  default: () => mockSWRReturn,
  mutate: jest.fn(),
}))

jest.mock('@/lib/swr-fetcher', () => ({ fetcher: jest.fn() }))

const mockFetch = jest.fn()
global.fetch = mockFetch

import PayrollPage from '@/app/dashboard/payroll/page'

const mockEntry = {
  id: 'pay-1',
  technicianId: 'tech-1',
  technicianName: 'Mario Rossi',
  payType: 'HOURLY' as const,
  regularHours: 160,
  overtimeHours: 8,
  regularPay: 2400,
  overtimePay: 240,
  bonus: 100,
  totalPay: 2740,
  status: 'DRAFT' as const,
}

const mockSummary = { totalGross: 10000, totalRegularHours: 640, totalOvertimeHours: 32, totalBonus: 400 }

beforeEach(() => {
  jest.clearAllMocks()
  mockSWRReturn = { data: undefined, error: undefined, isLoading: false }
  global.URL.createObjectURL = jest.fn(() => 'blob:test')
  global.URL.revokeObjectURL = jest.fn()
})

describe('PayrollPage', () => {
  describe('rendering iniziale', () => {
    it('renderizza titolo Buste Paga', () => {
      render(<PayrollPage />)
      expect(screen.getByText('Buste Paga')).toBeInTheDocument()
    })

    it('renderizza bottone Esporta CSV', () => {
      render(<PayrollPage />)
      expect(screen.getByText('Esporta CSV')).toBeInTheDocument()
    })

    it('renderizza bottone Calcola tutto', () => {
      render(<PayrollPage />)
      expect(screen.getByText('Calcola tutto')).toBeInTheDocument()
    })

    it('renderizza selettore mese', () => {
      render(<PayrollPage />)
      const selects = document.querySelectorAll('select')
      expect(selects.length).toBeGreaterThanOrEqual(1)
    })

    it('renderizza selettore anno con opzione 2026', () => {
      render(<PayrollPage />)
      expect(screen.getByText('2026')).toBeInTheDocument()
    })

    it('renderizza stat cards labels', () => {
      render(<PayrollPage />)
      expect(screen.getByText('Totale lordo')).toBeInTheDocument()
      expect(screen.getByText('Ore regolari')).toBeInTheDocument()
      expect(screen.getByText('Ore straordinario')).toBeInTheDocument()
      expect(screen.getByText('Bonus')).toBeInTheDocument()
    })
  })

  describe('stato loading', () => {
    it('renderizza Loader2 durante caricamento', () => {
      mockSWRReturn = { data: undefined, error: undefined, isLoading: true }
      render(<PayrollPage />)
      expect(document.querySelector('[data-icon="Loader2"]')).toBeInTheDocument()
    })

    it('mostra "..." nei valori stat', () => {
      mockSWRReturn = { data: undefined, error: undefined, isLoading: true }
      render(<PayrollPage />)
      expect(screen.getAllByText('...').length).toBeGreaterThan(0)
    })
  })

  describe('stato errore', () => {
    it('mostra "Errore nel caricamento dei dati"', () => {
      mockSWRReturn = { data: undefined, error: new Error('fail'), isLoading: false }
      render(<PayrollPage />)
      expect(screen.getByText('Errore nel caricamento dei dati')).toBeInTheDocument()
    })

    it('mostra bottone Riprova', () => {
      mockSWRReturn = { data: undefined, error: new Error('fail'), isLoading: false }
      render(<PayrollPage />)
      expect(screen.getByText('Riprova')).toBeInTheDocument()
    })
  })

  describe('stato vuoto', () => {
    it('mostra "Nessuna busta paga per questo periodo"', () => {
      mockSWRReturn = { data: { data: [] }, error: undefined, isLoading: false }
      render(<PayrollPage />)
      expect(screen.getByText('Nessuna busta paga per questo periodo')).toBeInTheDocument()
    })

    it('mostra bottone "Calcola buste paga"', () => {
      mockSWRReturn = { data: { data: [] }, error: undefined, isLoading: false }
      render(<PayrollPage />)
      expect(screen.getByText('Calcola buste paga')).toBeInTheDocument()
    })

    it('Esporta CSV è disabilitato con entries vuote', () => {
      mockSWRReturn = { data: { data: [] }, error: undefined, isLoading: false }
      render(<PayrollPage />)
      const btn = screen.getByText('Esporta CSV').closest('button')
      expect(btn).toBeDisabled()
    })
  })

  describe('stato con dati', () => {
    beforeEach(() => {
      mockSWRReturn = {
        data: { data: [mockEntry], summary: mockSummary },
        error: undefined, isLoading: false,
      }
    })

    it('renderizza nome tecnico', () => {
      render(<PayrollPage />)
      expect(screen.getByText('Mario Rossi')).toBeInTheDocument()
    })

    it('renderizza tipo paga: Orario', () => {
      render(<PayrollPage />)
      expect(screen.getByText(/Orario/)).toBeInTheDocument()
    })

    it('status DRAFT mostra "Bozza"', () => {
      render(<PayrollPage />)
      expect(screen.getByText('Bozza')).toBeInTheDocument()
    })

    it('status DRAFT mostra bottone Approva', () => {
      render(<PayrollPage />)
      expect(screen.getByText('Approva')).toBeInTheDocument()
    })

    it('status APPROVED mostra "Approvato"', () => {
      mockSWRReturn = {
        data: { data: [{ ...mockEntry, status: 'APPROVED', bonus: 0 }], summary: mockSummary },
        error: undefined, isLoading: false,
      }
      render(<PayrollPage />)
      expect(screen.getByText('Approvato')).toBeInTheDocument()
    })

    it('status APPROVED mostra "Pronto"', () => {
      mockSWRReturn = {
        data: { data: [{ ...mockEntry, status: 'APPROVED', bonus: 0 }], summary: mockSummary },
        error: undefined, isLoading: false,
      }
      render(<PayrollPage />)
      expect(screen.getByText('Pronto')).toBeInTheDocument()
    })

    it('status PAID mostra label Pagato', () => {
      mockSWRReturn = {
        data: { data: [{ ...mockEntry, status: 'PAID', bonus: 0 }], summary: mockSummary },
        error: undefined, isLoading: false,
      }
      render(<PayrollPage />)
      expect(screen.getAllByText('Pagato').length).toBeGreaterThanOrEqual(2)
    })

    it('entry con bonus mostra riga bonus', () => {
      render(<PayrollPage />)
      expect(screen.getByText(/Bonus: /)).toBeInTheDocument()
    })

    it('renderizza intestazione lista "Elenco Buste Paga"', () => {
      render(<PayrollPage />)
      expect(screen.getByText('Elenco Buste Paga')).toBeInTheDocument()
    })
  })

  describe('handleCalculateAll', () => {
    it('successo chiama toast.success', async () => {
      mockSWRReturn = { data: { data: [] }, error: undefined, isLoading: false }
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      render(<PayrollPage />)
      await act(async () => { fireEvent.click(screen.getByText('Calcola tutto')) })
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/payroll', expect.objectContaining({ method: 'POST' }))
        expect(toast.success).toHaveBeenCalledWith('Calcolo buste paga completato')
      })
    })

    it('errore chiama toast.error', async () => {
      mockSWRReturn = { data: { data: [] }, error: undefined, isLoading: false }
      mockFetch.mockResolvedValueOnce({ ok: false })
      render(<PayrollPage />)
      await act(async () => { fireEvent.click(screen.getByText('Calcola tutto')) })
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Errore durante il calcolo delle buste paga')
      })
    })
  })

  describe('handleApprove', () => {
    it('successo chiama toast.success busta paga approvata', async () => {
      mockSWRReturn = {
        data: { data: [mockEntry], summary: mockSummary },
        error: undefined, isLoading: false,
      }
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      render(<PayrollPage />)
      await act(async () => { fireEvent.click(screen.getByText('Approva')) })
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/payroll', expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"action":"approve"'),
        }))
        expect(toast.success).toHaveBeenCalledWith('Busta paga approvata')
      })
    })

    it('errore chiama toast.error', async () => {
      mockSWRReturn = {
        data: { data: [mockEntry], summary: mockSummary },
        error: undefined, isLoading: false,
      }
      mockFetch.mockResolvedValueOnce({ ok: false })
      render(<PayrollPage />)
      await act(async () => { fireEvent.click(screen.getByText('Approva')) })
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Errore durante l'approvazione")
      })
    })
  })

  describe('handleExportCSV', () => {
    it('successo chiama fetch con format=csv e toast.success', async () => {
      mockSWRReturn = {
        data: { data: [mockEntry], summary: mockSummary },
        error: undefined, isLoading: false,
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(new Blob(['csv'])),
      })
      render(<PayrollPage />)
      await act(async () => { fireEvent.click(screen.getByText('Esporta CSV')) })
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('format=csv'), expect.anything())
        expect(toast.success).toHaveBeenCalledWith('Export CSV completato')
      })
    })

    it('errore chiama toast.error', async () => {
      mockSWRReturn = {
        data: { data: [mockEntry], summary: mockSummary },
        error: undefined, isLoading: false,
      }
      mockFetch.mockResolvedValueOnce({ ok: false })
      render(<PayrollPage />)
      await act(async () => { fireEvent.click(screen.getByText('Esporta CSV')) })
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Errore durante l'export CSV")
      })
    })
  })

  describe('selettori periodo', () => {
    it('cambio mese aggiorna selezione', () => {
      render(<PayrollPage />)
      const selects = document.querySelectorAll('select')
      fireEvent.change(selects[0], { target: { value: '5' } })
      expect((selects[0] as HTMLSelectElement).value).toBe('5')
    })

    it('cambio anno aggiorna selezione', () => {
      render(<PayrollPage />)
      const selects = document.querySelectorAll('select')
      fireEvent.change(selects[1], { target: { value: '2027' } })
      expect((selects[1] as HTMLSelectElement).value).toBe('2027')
    })
  })
})
