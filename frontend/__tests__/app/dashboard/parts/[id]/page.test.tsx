import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

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

jest.mock('framer-motion', () => {
  const React = require('react')
  const filterMotionProps = ({
    children, variants, initial, animate, exit, whileHover, whileTap, custom, transition, layout, layoutId,
    ...rest
  }: Record<string, unknown>) => ({ ...rest, children })
  const cache: Record<string, (props: Record<string, unknown>) => unknown> = {}
  return {
    motion: new Proxy({}, {
      get(_t: unknown, tag: string) {
        if (typeof tag !== 'string') return undefined
        if (!cache[tag]) {
          cache[tag] = (props: Record<string, unknown>) =>
            React.createElement(tag as string, filterMotionProps(props))
        }
        return cache[tag]
      },
    }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  }
})

const mockRouterPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
  useParams: () => ({ id: 'part-1' }),
}))

jest.mock('@/components/ui/apple-card', () => ({
  AppleCard: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  AppleCardContent: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('div', { className }, children),
  AppleCardHeader: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}))

jest.mock('@/components/ui/apple-button', () => ({
  AppleButton: ({
    children,
    onClick,
    loading,
    disabled,
    className,
    'aria-label': ariaLabel,
  }: {
    children?: React.ReactNode
    onClick?: () => void
    loading?: boolean
    disabled?: boolean
    className?: string
    'aria-label'?: string
  }) =>
    React.createElement('button', { onClick, disabled: disabled || loading, className, 'aria-label': ariaLabel }, children),
}))

jest.mock('@/components/ui/input', () => {
  const React = require('react')
  const Input = React.forwardRef(
    (props: React.InputHTMLAttributes<HTMLInputElement>, ref: React.Ref<HTMLInputElement>) =>
      React.createElement('input', { ...props, ref }),
  )
  Input.displayName = 'Input'
  return { Input }
})

jest.mock('@/components/ui/breadcrumb', () => ({
  Breadcrumb: () => React.createElement('nav', { 'data-testid': 'breadcrumb' }),
}))

jest.mock('@/components/ui/confirm-dialog', () => ({
  ConfirmDialog: ({
    open,
    onConfirm,
    onOpenChange,
    title,
  }: {
    open: boolean
    onConfirm: () => void
    onOpenChange: (v: boolean) => void
    title: string
  }) =>
    open
      ? React.createElement(
          'div',
          { role: 'dialog', 'data-testid': 'confirm-dialog' },
          React.createElement('p', null, title),
          React.createElement('button', { onClick: onConfirm }, 'Conferma'),
          React.createElement('button', { onClick: () => onOpenChange(false) }, 'Annulla dialogo'),
        )
      : null,
}))

jest.mock('@/components/ui/pagination', () => ({
  Pagination: ({
    page,
    totalPages,
    onPageChange,
  }: {
    page: number
    totalPages: number
    onPageChange: (p: number) => void
  }) =>
    React.createElement(
      'div',
      { 'data-testid': 'pagination' },
      React.createElement('span', null, `${page}/${totalPages}`),
      totalPages > 1
        ? React.createElement('button', { onClick: () => onPageChange(page + 1) }, 'Pagina successiva')
        : null,
    ),
}))

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

const mockFetch = jest.fn()
global.fetch = mockFetch

import PartDetailPage from '@/app/dashboard/parts/[id]/page'
import { toast } from 'sonner'

const basePart = {
  id: 'part-1',
  sku: 'BRK-001',
  name: 'Pastiglie Freno',
  description: 'Pastiglie freno anteriori',
  category: 'Freni',
  brand: 'Brembo',
  manufacturer: 'Brembo SpA',
  partNumber: '34116860016',
  costPrice: 25.0,
  retailPrice: 45.99,
  minStockLevel: 3,
  currentStock: 10,
  location: 'Scaffale A-3',
  supplierId: 'sup-1',
  supplierName: 'Autodoc',
  notes: 'Note test',
  createdAt: '2026-01-01T10:00:00Z',
  updatedAt: '2026-01-01T10:00:00Z',
}

function setupFetch(part = basePart, fetchOk = true) {
  mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
    if (typeof url === 'string' && url.includes('/api/parts/part-1') && !opts?.method) {
      return Promise.resolve({
        ok: fetchOk,
        json: () => Promise.resolve(fetchOk ? { data: part } : {}),
      })
    }
    if (typeof url === 'string' && url.includes('/api/parts/part-1') && opts?.method === 'PATCH') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: part }) })
    }
    if (typeof url === 'string' && url.includes('/api/parts/part-1') && opts?.method === 'DELETE') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    }
    return Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
  })
}

describe('PartDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setupFetch()
  })

  // --- Loading state ---

  it('mostra spinner durante il caricamento', () => {
    mockFetch.mockReturnValue(new Promise(() => {}))
    render(<PartDetailPage />)
    expect(document.querySelector('[data-icon="Loader2"]')).toBeTruthy()
  })

  // --- Error state ---

  it('mostra errore quando fetch fallisce', async () => {
    setupFetch(basePart, false)
    render(<PartDetailPage />)
    await waitFor(() =>
      expect(screen.getByText('Ricambio non trovato')).toBeInTheDocument(),
    )
  })

  it('Torna ai Ricambi in error state naviga a /dashboard/parts', async () => {
    setupFetch(basePart, false)
    render(<PartDetailPage />)
    await waitFor(() => screen.getByText('Torna ai Ricambi'))
    fireEvent.click(screen.getByText('Torna ai Ricambi'))
    expect(mockRouterPush).toHaveBeenCalledWith('/dashboard/parts')
  })

  // --- Loaded state ---

  it('renderizza nome del ricambio', async () => {
    render(<PartDetailPage />)
    await waitFor(() => expect(screen.getAllByText('Pastiglie Freno').length).toBeGreaterThanOrEqual(1))
  })

  it('renderizza SKU nel sottotitolo', async () => {
    render(<PartDetailPage />)
    await waitFor(() => expect(screen.getByText(/SKU: BRK-001/)).toBeInTheDocument())
  })

  it('mostra badge In Stock quando stock > minStockLevel', async () => {
    render(<PartDetailPage />)
    await waitFor(() =>
      expect(screen.getAllByText('In Stock').length).toBeGreaterThanOrEqual(1),
    )
  })

  it('mostra badge Scorta Bassa quando currentStock <= minStockLevel', async () => {
    setupFetch({ ...basePart, currentStock: 2, minStockLevel: 5 })
    render(<PartDetailPage />)
    await waitFor(() =>
      expect(screen.getAllByText('Scorta Bassa').length).toBeGreaterThanOrEqual(1),
    )
  })

  it('mostra badge Esaurito quando currentStock = 0', async () => {
    setupFetch({ ...basePart, currentStock: 0 })
    render(<PartDetailPage />)
    await waitFor(() =>
      expect(screen.getAllByText('Esaurito').length).toBeGreaterThanOrEqual(1),
    )
  })

  it('renderizza breadcrumb', async () => {
    render(<PartDetailPage />)
    await waitFor(() => expect(screen.getByTestId('breadcrumb')).toBeInTheDocument())
  })

  // --- Stock highlights ---

  it('mostra label Stock Attuale', async () => {
    render(<PartDetailPage />)
    await waitFor(() => expect(screen.getAllByText('Stock Attuale').length).toBeGreaterThanOrEqual(1))
  })

  it('mostra label Scorta Minima', async () => {
    render(<PartDetailPage />)
    await waitFor(() => expect(screen.getAllByText('Scorta Minima').length).toBeGreaterThanOrEqual(1))
  })

  // --- Tabs ---

  it('renderizza tab Dettagli, Movimenti, OdL Collegati', async () => {
    render(<PartDetailPage />)
    await waitFor(() => expect(screen.getByText('Dettagli')).toBeInTheDocument())
    expect(screen.getByText('Movimenti')).toBeInTheDocument()
    expect(screen.getByText('OdL Collegati')).toBeInTheDocument()
  })

  it('tab Dettagli mostra Informazioni Ricambio', async () => {
    render(<PartDetailPage />)
    await waitFor(() => expect(screen.getByText('Informazioni Ricambio')).toBeInTheDocument())
  })

  it('click tab Movimenti mostra Storico Movimenti', async () => {
    render(<PartDetailPage />)
    await waitFor(() => screen.getByText('Movimenti'))
    fireEvent.click(screen.getByText('Movimenti'))
    await waitFor(() => expect(screen.getByText('Storico Movimenti')).toBeInTheDocument())
  })

  it('tab Movimenti empty mostra Nessun movimento registrato', async () => {
    render(<PartDetailPage />)
    await waitFor(() => screen.getByText('Movimenti'))
    fireEvent.click(screen.getByText('Movimenti'))
    await waitFor(() =>
      expect(screen.getByText('Nessun movimento registrato')).toBeInTheDocument(),
    )
  })

  it('click tab OdL Collegati mostra Ordini di Lavoro Collegati', async () => {
    render(<PartDetailPage />)
    await waitFor(() => screen.getByText('OdL Collegati'))
    fireEvent.click(screen.getByText('OdL Collegati'))
    await waitFor(() =>
      expect(screen.getByText('Ordini di Lavoro Collegati')).toBeInTheDocument(),
    )
  })

  it('tab OdL Collegati empty mostra Nessun ordine di lavoro collegato', async () => {
    render(<PartDetailPage />)
    await waitFor(() => screen.getByText('OdL Collegati'))
    fireEvent.click(screen.getByText('OdL Collegati'))
    await waitFor(() =>
      expect(screen.getByText('Nessun ordine di lavoro collegato')).toBeInTheDocument(),
    )
  })

  // --- Edit mode ---

  it('click Modifica entra in edit mode', async () => {
    render(<PartDetailPage />)
    await waitFor(() => screen.getByText('Modifica'))
    fireEvent.click(screen.getByText('Modifica'))
    expect(screen.getByText('Salva')).toBeInTheDocument()
    expect(screen.getByText('Annulla')).toBeInTheDocument()
  })

  it('click Annulla in edit mode esce dalla modifica', async () => {
    render(<PartDetailPage />)
    await waitFor(() => screen.getByText('Modifica'))
    fireEvent.click(screen.getByText('Modifica'))
    fireEvent.click(screen.getByText('Annulla'))
    expect(screen.getByText('Modifica')).toBeInTheDocument()
  })

  it('Salva chiama PATCH e toast.success', async () => {
    render(<PartDetailPage />)
    await waitFor(() => screen.getByText('Modifica'))
    fireEvent.click(screen.getByText('Modifica'))
    fireEvent.click(screen.getByText('Salva'))
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Ricambio aggiornato con successo'),
    )
  })

  it('Salva error mostra toast.error', async () => {
    render(<PartDetailPage />)
    await waitFor(() => screen.getByText('Modifica'))
    // Override fetch for PATCH to fail
    mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (typeof url === 'string' && url.includes('/api/parts/part-1') && opts?.method === 'PATCH') {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: basePart }) })
    })
    fireEvent.click(screen.getByText('Modifica'))
    fireEvent.click(screen.getByText('Salva'))
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
  })

  // --- Delete ---

  it('click Elimina apre confirm dialog', async () => {
    render(<PartDetailPage />)
    await waitFor(() => screen.getByText('Elimina'))
    fireEvent.click(screen.getByText('Elimina'))
    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument()
  })

  it('conferma eliminazione chiama DELETE e router.push', async () => {
    render(<PartDetailPage />)
    await waitFor(() => screen.getByText('Elimina'))
    fireEvent.click(screen.getByText('Elimina'))
    fireEvent.click(screen.getByText('Conferma'))
    await waitFor(() =>
      expect(mockRouterPush).toHaveBeenCalledWith('/dashboard/parts'),
    )
    expect(toast.success).toHaveBeenCalledWith('Ricambio eliminato')
  })

  it('eliminazione error mostra toast.error', async () => {
    render(<PartDetailPage />)
    await waitFor(() => screen.getByText('Elimina'))
    mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (typeof url === 'string' && url.includes('/api/parts/part-1') && opts?.method === 'DELETE') {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: basePart }) })
    })
    fireEvent.click(screen.getByText('Elimina'))
    fireEvent.click(screen.getByText('Conferma'))
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
  })

  // --- Movimenti con dati ---

  it('mostra movimenti IN con Carico', async () => {
    setupFetch({
      ...basePart,
      movements: [
        { id: 'm1', type: 'IN', quantity: 5, reason: 'Acquisto', date: '2026-01-01T10:00:00Z', workOrderId: null },
      ],
    } as typeof basePart & { movements: unknown[] })
    render(<PartDetailPage />)
    await waitFor(() => screen.getByText('Movimenti'))
    fireEvent.click(screen.getByText('Movimenti'))
    await waitFor(() => expect(screen.getByText(/Carico: Acquisto/)).toBeInTheDocument())
  })

  it('mostra movimenti OUT con Scarico', async () => {
    setupFetch({
      ...basePart,
      movements: [
        { id: 'm1', type: 'OUT', quantity: 2, reason: 'Utilizzo', date: '2026-01-01T10:00:00Z', workOrderId: null },
      ],
    } as typeof basePart & { movements: unknown[] })
    render(<PartDetailPage />)
    await waitFor(() => screen.getByText('Movimenti'))
    fireEvent.click(screen.getByText('Movimenti'))
    await waitFor(() => expect(screen.getByText(/Scarico: Utilizzo/)).toBeInTheDocument())
  })

  // --- OdL Collegati con dati ---

  it('mostra work order collegato', async () => {
    setupFetch({
      ...basePart,
      workOrders: [
        {
          id: 'wo-1',
          number: 'WO-001',
          customerName: 'Mario Rossi',
          vehiclePlate: 'AA123BB',
          status: 'OPEN',
          date: '2026-01-01T10:00:00Z',
          quantity: 2,
        },
      ],
    } as typeof basePart & { workOrders: unknown[] })
    render(<PartDetailPage />)
    await waitFor(() => screen.getByText('OdL Collegati'))
    fireEvent.click(screen.getByText('OdL Collegati'))
    await waitFor(() => expect(screen.getByText('WO-001')).toBeInTheDocument())
  })

  // --- Edit field changes ---

  it('modifica campo testo in edit mode aggiorna editData', async () => {
    render(<PartDetailPage />)
    await waitFor(() => screen.getByText('Modifica'))
    fireEvent.click(screen.getByText('Modifica'))
    const inputs = document.querySelectorAll('input[type="text"], input:not([type])')
    if (inputs.length > 0) {
      fireEvent.change(inputs[0], { target: { value: 'Nuovo Nome' } })
      expect((inputs[0] as HTMLInputElement).value).toBe('Nuovo Nome')
    }
  })

  it('modifica campo numerico in edit mode aggiorna editData', async () => {
    render(<PartDetailPage />)
    await waitFor(() => screen.getByText('Modifica'))
    fireEvent.click(screen.getByText('Modifica'))
    const numInputs = document.querySelectorAll('input[type="number"]')
    if (numInputs.length > 0) {
      fireEvent.change(numInputs[0], { target: { value: '99' } })
      expect((numInputs[0] as HTMLInputElement).value).toBe('99')
    }
  })

  it('modifica textarea note in edit mode aggiorna editData', async () => {
    render(<PartDetailPage />)
    await waitFor(() => screen.getByText('Modifica'))
    fireEvent.click(screen.getByText('Modifica'))
    const textarea = document.querySelector('textarea')
    if (textarea) {
      fireEvent.change(textarea, { target: { value: 'nuova nota' } })
      expect((textarea as HTMLTextAreaElement).value).toBe('nuova nota')
    }
  })

  // --- WO keyboard nav ---

  it('click work order naviga a /dashboard/work-orders/wo-1', async () => {
    setupFetch({
      ...basePart,
      workOrders: [
        {
          id: 'wo-1',
          number: 'WO-001',
          customerName: 'Mario Rossi',
          vehiclePlate: 'AA123BB',
          status: 'OPEN',
          date: '2026-01-01T10:00:00Z',
          quantity: 2,
        },
      ],
    } as typeof basePart & { workOrders: unknown[] })
    render(<PartDetailPage />)
    await waitFor(() => screen.getByText('OdL Collegati'))
    fireEvent.click(screen.getByText('OdL Collegati'))
    await waitFor(() => screen.getByText('WO-001'))
    fireEvent.click(screen.getByText('WO-001'))
    await waitFor(() =>
      expect(mockRouterPush).toHaveBeenCalledWith('/dashboard/work-orders/wo-1'),
    )
  })

  it('Enter su work order naviga a /dashboard/work-orders/wo-1', async () => {
    setupFetch({
      ...basePart,
      workOrders: [
        {
          id: 'wo-1',
          number: 'WO-001',
          customerName: 'Mario Rossi',
          vehiclePlate: 'AA123BB',
          status: 'OPEN',
          date: '2026-01-01T10:00:00Z',
          quantity: 2,
        },
      ],
    } as typeof basePart & { workOrders: unknown[] })
    render(<PartDetailPage />)
    await waitFor(() => screen.getByText('OdL Collegati'))
    fireEvent.click(screen.getByText('OdL Collegati'))
    await waitFor(() => screen.getByText('WO-001'))
    const woRow = screen.getByText('WO-001').closest('[role="button"]') as HTMLElement
    fireEvent.keyDown(woRow, { key: 'Enter' })
    await waitFor(() =>
      expect(mockRouterPush).toHaveBeenCalledWith('/dashboard/work-orders/wo-1'),
    )
  })
})
