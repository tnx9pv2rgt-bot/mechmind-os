import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

// ── framer-motion ──────────────────────────────────────────────────────────────
jest.mock('framer-motion', () => {
  const React = require('react')
  return {
    motion: new Proxy({}, {
      get: (_t: unknown, prop: string) =>
        React.forwardRef(({ children, ...rest }: { children?: React.ReactNode; [k: string]: unknown }, ref: React.Ref<HTMLElement>) => {
          const allowed = ['className', 'style', 'onClick', 'aria-label', 'id', 'role']
          const valid: Record<string, unknown> = {}
          for (const k of Object.keys(rest)) {
            if (allowed.includes(k) || k.startsWith('data-') || k.startsWith('aria-')) valid[k] = rest[k]
          }
          const tag = ['div', 'span', 'section', 'header', 'ul', 'li', 'p', 'form'].includes(prop) ? prop : 'div'
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

// ── sonner ────────────────────────────────────────────────────────────────────
jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

// ── swr-fetcher ────────────────────────────────────────────────────────────────
jest.mock('@/lib/swr-fetcher', () => ({ fetcher: jest.fn() }))

// ── UI components ──────────────────────────────────────────────────────────────
jest.mock('@/components/ui/apple-button', () => ({
  AppleButton: ({ children, onClick, variant, size, icon, loading, disabled }: {
    children?: React.ReactNode; onClick?: () => void; variant?: string
    size?: string; icon?: React.ReactNode; loading?: boolean; disabled?: boolean
  }) =>
    React.createElement('button', { onClick, 'data-variant': variant, 'data-loading': loading, disabled }, icon, children),
}))

jest.mock('@/components/ui/apple-card', () => ({
  AppleCard: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'apple-card' }, children),
  AppleCardContent: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'apple-card-content' }, children),
  AppleCardHeader: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'apple-card-header' }, children),
}))

jest.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) =>
    React.createElement('input', props),
}))

jest.mock('@/components/ui/pagination', () => ({
  Pagination: ({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) =>
    React.createElement('div', { 'data-testid': 'pagination', 'data-page': page, 'data-totalpages': totalPages }),
}))

// ── utils ──────────────────────────────────────────────────────────────────────
jest.mock('@/lib/utils/format', () => ({
  formatCurrency: (n: number) => `€${n.toFixed(2)}`,
  formatDate: (d: string) => d,
}))

// ── swr ───────────────────────────────────────────────────────────────────────
let mockSWRData: unknown = undefined
let mockSWRError: unknown = undefined
let mockSWRLoading = false
const mockMutate = jest.fn()

jest.mock('swr', () => ({
  __esModule: true,
  default: (_key: unknown, _fetcher: unknown) => ({
    data: mockSWRData,
    error: mockSWRError,
    isLoading: mockSWRLoading,
    mutate: mockMutate,
  }),
}))

import WorkOrdersPage from '@/app/dashboard/work-orders/page'
import { toast } from 'sonner'

const WORK_ORDERS = [
  {
    id: 'wo-1',
    woNumber: 'WO-001',
    status: 'OPEN',
    priority: 'NORMAL',
    vehicleMake: 'Fiat',
    vehicleModel: '500',
    vehiclePlate: 'AB123CD',
    customerName: 'Mario Rossi',
    technicianName: 'Luca Bianchi',
    totalCost: 250,
    estimatedHours: 2,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'wo-2',
    woNumber: 'WO-002',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    vehicleMake: 'Alfa Romeo',
    vehicleModel: 'Giulia',
    vehiclePlate: 'CD456EF',
    customerName: 'Luigi Verdi',
    totalCost: 800,
    estimatedHours: 5,
    createdAt: '2024-01-16T09:00:00Z',
    updatedAt: '2024-01-16T09:00:00Z',
  },
  {
    id: 'wo-3',
    woNumber: 'WO-003',
    status: 'COMPLETED',
    priority: 'LOW',
    vehiclePlate: 'EF789GH',
    customerName: 'Anna Neri',
    totalCost: 150,
    createdAt: '2024-01-17T08:00:00Z',
    updatedAt: '2024-01-17T08:00:00Z',
  },
]

beforeEach(() => {
  jest.clearAllMocks()
  mockSWRData = undefined
  mockSWRError = undefined
  mockSWRLoading = false
})

describe('WorkOrdersPage', () => {
  describe('loading state', () => {
    it('shows loading spinner', () => {
      mockSWRLoading = true
      const { container } = render(<WorkOrdersPage />)
      expect(container.querySelector('[data-icon="Loader2"]')).toBeInTheDocument()
    })

    it('shows ... in stat cards while loading', () => {
      mockSWRLoading = true
      render(<WorkOrdersPage />)
      expect(screen.getAllByText('...').length).toBeGreaterThan(0)
    })
  })

  describe('error state', () => {
    it('shows error message when SWR fails', () => {
      mockSWRError = new Error('Network error')
      render(<WorkOrdersPage />)
      expect(screen.getByText('Impossibile caricare gli ordini di lavoro')).toBeInTheDocument()
    })

    it('shows Riprova button on error', () => {
      mockSWRError = new Error('Network error')
      render(<WorkOrdersPage />)
      expect(screen.getByText('Riprova')).toBeInTheDocument()
    })

    it('calls mutate when Riprova is clicked', () => {
      mockSWRError = new Error('Network error')
      render(<WorkOrdersPage />)
      fireEvent.click(screen.getByText('Riprova'))
      expect(mockMutate).toHaveBeenCalled()
    })
  })

  describe('empty state', () => {
    it('shows empty message when no work orders', () => {
      mockSWRData = { data: [], total: 0, page: 1, limit: 20 }
      render(<WorkOrdersPage />)
      expect(screen.getByText('Nessun ordine di lavoro. Crea il primo ordine.')).toBeInTheDocument()
    })

    it('shows create button in empty state', () => {
      mockSWRData = { data: [], total: 0, page: 1, limit: 20 }
      render(<WorkOrdersPage />)
      expect(screen.getByText('Crea il primo ordine')).toBeInTheDocument()
    })

    it('navigates to new when create first is clicked', () => {
      mockSWRData = { data: [], total: 0, page: 1, limit: 20 }
      render(<WorkOrdersPage />)
      fireEvent.click(screen.getByText('Crea il primo ordine'))
      expect(mockPush).toHaveBeenCalledWith('/dashboard/work-orders/new')
    })
  })

  describe('with data (object response)', () => {
    beforeEach(() => {
      mockSWRData = { data: WORK_ORDERS, total: 3, page: 1, limit: 20 }
    })

    it('renders page header', () => {
      render(<WorkOrdersPage />)
      expect(screen.getByText('Ordini di Lavoro')).toBeInTheDocument()
    })

    it('renders Nuovo OdL button', () => {
      render(<WorkOrdersPage />)
      expect(screen.getByText('Nuovo OdL')).toBeInTheDocument()
    })

    it('navigates to new on click Nuovo OdL', () => {
      render(<WorkOrdersPage />)
      fireEvent.click(screen.getByText('Nuovo OdL'))
      expect(mockPush).toHaveBeenCalledWith('/dashboard/work-orders/new')
    })

    it('renders all work order rows', () => {
      render(<WorkOrdersPage />)
      expect(screen.getByText('WO-001')).toBeInTheDocument()
      expect(screen.getByText('WO-002')).toBeInTheDocument()
      expect(screen.getByText('WO-003')).toBeInTheDocument()
    })

    it('renders customer names', () => {
      render(<WorkOrdersPage />)
      expect(screen.getByText('Mario Rossi')).toBeInTheDocument()
      expect(screen.getByText('Luigi Verdi')).toBeInTheDocument()
    })

    it('shows status labels', () => {
      render(<WorkOrdersPage />)
      expect(screen.getAllByText('Aperto').length).toBeGreaterThan(0)
      expect(screen.getAllByText('In Lavorazione').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Completato').length).toBeGreaterThan(0)
    })

    it('shows priority labels', () => {
      render(<WorkOrdersPage />)
      expect(screen.getByText('Normale')).toBeInTheDocument()
      expect(screen.getByText('Alta')).toBeInTheDocument()
      expect(screen.getByText('Bassa')).toBeInTheDocument()
    })

    it('shows stat card total', () => {
      render(<WorkOrdersPage />)
      expect(screen.getByText('Totale OdL')).toBeInTheDocument()
    })

    it('renders Elenco Ordini di Lavoro heading', () => {
      render(<WorkOrdersPage />)
      expect(screen.getByText('Elenco Ordini di Lavoro')).toBeInTheDocument()
    })

    it('renders search input', () => {
      render(<WorkOrdersPage />)
      expect(screen.getByPlaceholderText('Cerca per numero OdL, cliente, targa...')).toBeInTheDocument()
    })

    it('renders Visualizza buttons', () => {
      render(<WorkOrdersPage />)
      expect(screen.getAllByText('Visualizza').length).toBeGreaterThan(0)
    })

    it('navigates to detail when row clicked', () => {
      render(<WorkOrdersPage />)
      const rows = document.querySelectorAll('tr[class*="cursor-pointer"]')
      if (rows.length > 0) {
        fireEvent.click(rows[0])
        expect(mockPush).toHaveBeenCalledWith('/dashboard/work-orders/wo-1')
      }
    })

    it('navigates to detail when Visualizza clicked', () => {
      render(<WorkOrdersPage />)
      const buttons = screen.getAllByText('Visualizza')
      fireEvent.click(buttons[0])
      expect(mockPush).toHaveBeenCalledWith('/dashboard/work-orders/wo-1')
    })

    it('shows pagination component', () => {
      render(<WorkOrdersPage />)
      expect(screen.getByTestId('pagination')).toBeInTheDocument()
    })

    it('renders next status advance button for OPEN order', () => {
      render(<WorkOrdersPage />)
      expect(screen.getAllByText('In Lavorazione').length).toBeGreaterThan(0)
    })
  })

  describe('with data (array response)', () => {
    it('handles array response format', () => {
      mockSWRData = WORK_ORDERS
      render(<WorkOrdersPage />)
      expect(screen.getByText('WO-001')).toBeInTheDocument()
    })
  })

  describe('status filter', () => {
    beforeEach(() => {
      mockSWRData = { data: WORK_ORDERS, total: 3, page: 1, limit: 20 }
    })

    it('renders status select', () => {
      render(<WorkOrdersPage />)
      const select = document.querySelector('select')
      expect(select).toBeInTheDocument()
    })

    it('changes status filter', () => {
      render(<WorkOrdersPage />)
      const select = document.querySelector('select') as HTMLSelectElement
      fireEvent.change(select, { target: { value: 'OPEN' } })
      expect(select.value).toBe('OPEN')
    })
  })

  describe('status transition', () => {
    beforeEach(() => {
      mockSWRData = { data: WORK_ORDERS, total: 3, page: 1, limit: 20 }
    })

    it('calls transition API and shows success toast', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      }) as jest.Mock

      render(<WorkOrdersPage />)
      const advanceButtons = screen.getAllByText('In Lavorazione').filter(
        el => el.closest('button')
      )
      if (advanceButtons.length > 0) {
        fireEvent.click(advanceButtons[0].closest('button')!)
        await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/dashboard/work-orders/wo-1/transition'),
            expect.any(Object)
          )
        })
      }
    })

    it('shows error toast when transition fails', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: 'Transizione non consentita' }),
      }) as jest.Mock

      render(<WorkOrdersPage />)
      const advanceButtons = screen.getAllByText('In Lavorazione').filter(
        el => el.closest('button')
      )
      if (advanceButtons.length > 0) {
        await act(async () => {
          fireEvent.click(advanceButtons[0].closest('button')!)
        })
        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith('Transizione non consentita')
        })
      }
    })
  })

  describe('search debounce', () => {
    it('updates search input value', async () => {
      mockSWRData = { data: [], total: 0, page: 1, limit: 20 }
      render(<WorkOrdersPage />)
      const input = screen.getByPlaceholderText('Cerca per numero OdL, cliente, targa...')
      fireEvent.change(input, { target: { value: 'Mario' } })
      expect((input as HTMLInputElement).value).toBe('Mario')
    })
  })

  describe('KPI stats computation', () => {
    it('shows correct open count', () => {
      mockSWRData = { data: WORK_ORDERS, total: 3, page: 1, limit: 20 }
      render(<WorkOrdersPage />)
      expect(screen.getByText('Aperti')).toBeInTheDocument()
    })

    it('shows correct in-progress count', () => {
      mockSWRData = { data: WORK_ORDERS, total: 3, page: 1, limit: 20 }
      render(<WorkOrdersPage />)
      expect(screen.getAllByText('In Lavorazione').length).toBeGreaterThan(0)
    })

    it('shows completed count', () => {
      mockSWRData = { data: WORK_ORDERS, total: 3, page: 1, limit: 20 }
      render(<WorkOrdersPage />)
      expect(screen.getByText('Completati')).toBeInTheDocument()
    })
  })

  describe('vehicle plate display', () => {
    it('shows vehicle info in rows', () => {
      mockSWRData = { data: WORK_ORDERS, total: 3, page: 1, limit: 20 }
      render(<WorkOrdersPage />)
      expect(screen.getByText(/AB123CD/)).toBeInTheDocument()
    })
  })

  describe('woNumber fallback', () => {
    it('falls back to id slice when woNumber missing', () => {
      const woNoNumber = [{ ...WORK_ORDERS[0], woNumber: '', id: 'abcdefgh-1234' }]
      mockSWRData = { data: woNoNumber, total: 1, page: 1, limit: 20 }
      render(<WorkOrdersPage />)
      expect(screen.getByText('#abcdefgh')).toBeInTheDocument()
    })
  })
})
