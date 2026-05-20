import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

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
}))

jest.mock('@/components/ui/apple-card', () => ({
  AppleCard: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  AppleCardContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
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

const mockMutateAsync = jest.fn()
const mockPartsRefetch = jest.fn()
const mockSuppliersRefetch = jest.fn()

const mockUseSuppliers = jest.fn()
const mockUseParts = jest.fn()
const mockUseCreateSupplier = jest.fn()

jest.mock('@/hooks/useApi', () => ({
  useSuppliers: (...args: unknown[]) => mockUseSuppliers(...args),
  useParts: (...args: unknown[]) => mockUseParts(...args),
  useCreateSupplier: (...args: unknown[]) => mockUseCreateSupplier(...args),
}))

import PartsPage from '@/app/dashboard/parts/page'
import { toast } from 'sonner'

const basePart = {
  id: 'part-1',
  name: 'Pastiglie Freno',
  sku: 'BRK-001',
  partNumber: '34116860016',
  brand: 'Brembo',
  supplierName: 'Autodoc',
  supplier: { name: 'Autodoc' },
  retailPrice: 45.99,
  currentStock: 10,
  minStockLevel: 3,
  partType: 'GENUINE',
}

const baseSupplier = { id: 'sup-1', name: 'Autodoc' }

function setupHooks(
  parts: object[] = [basePart],
  suppliers: object[] = [baseSupplier],
  options: {
    partsLoading?: boolean
    suppliersLoading?: boolean
    partsError?: boolean
    suppliersError?: boolean
    total?: number
  } = {},
) {
  mockUseSuppliers.mockReturnValue({
    data: options.suppliersLoading || options.suppliersError ? undefined : suppliers,
    isLoading: options.suppliersLoading ?? false,
    isError: options.suppliersError ?? false,
    refetch: mockSuppliersRefetch,
  })
  mockUseParts.mockReturnValue({
    data: options.partsLoading || options.partsError
      ? undefined
      : { data: parts, total: options.total ?? parts.length },
    isLoading: options.partsLoading ?? false,
    isError: options.partsError ?? false,
    refetch: mockPartsRefetch,
  })
  mockUseCreateSupplier.mockReturnValue({
    mutateAsync: mockMutateAsync,
    isPending: false,
  })
}

describe('PartsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setupHooks()
  })

  // --- Header ---

  it('renderizza titolo Ricambi', () => {
    render(<PartsPage />)
    expect(screen.getByText('Ricambi')).toBeInTheDocument()
  })

  it('Ordine Fornitore naviga a /dashboard/parts/orders/new', () => {
    render(<PartsPage />)
    fireEvent.click(screen.getByText('Ordine Fornitore'))
    expect(mockRouterPush).toHaveBeenCalledWith('/dashboard/parts/orders/new')
  })

  it('Nuovo Ricambio naviga a /dashboard/parts/new', () => {
    render(<PartsPage />)
    fireEvent.click(screen.getByText('Nuovo Ricambio'))
    expect(mockRouterPush).toHaveBeenCalledWith('/dashboard/parts/new')
  })

  // --- Stats ---

  it('mostra label stats card', () => {
    render(<PartsPage />)
    expect(screen.getByText('Ricambi Totali')).toBeInTheDocument()
    expect(screen.getByText('Fornitori')).toBeInTheDocument()
    expect(screen.getByText('Stock Basso')).toBeInTheDocument()
  })

  it('mostra valori stats', () => {
    render(<PartsPage />)
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1)
  })

  it('mostra "..." durante il caricamento', () => {
    setupHooks([], [], { partsLoading: true, suppliersLoading: true })
    render(<PartsPage />)
    const dots = screen.getAllByText('...')
    expect(dots.length).toBeGreaterThanOrEqual(3)
  })

  // --- Error state ---

  it('mostra errore quando partsQuery.isError', () => {
    setupHooks([], [baseSupplier], { partsError: true })
    render(<PartsPage />)
    expect(screen.getByText('Impossibile caricare i ricambi')).toBeInTheDocument()
  })

  it('mostra errore quando suppliersQuery.isError', () => {
    setupHooks([basePart], [], { suppliersError: true })
    render(<PartsPage />)
    expect(screen.getByText('Impossibile caricare i ricambi')).toBeInTheDocument()
  })

  it('Riprova chiama refetch su entrambi', () => {
    setupHooks([], [], { partsError: true })
    render(<PartsPage />)
    fireEvent.click(screen.getByText('Riprova'))
    expect(mockPartsRefetch).toHaveBeenCalled()
    expect(mockSuppliersRefetch).toHaveBeenCalled()
  })

  // --- Loading spinner ---

  it('mostra spinner durante il caricamento', () => {
    setupHooks([], [], { partsLoading: true })
    render(<PartsPage />)
    expect(document.querySelector('[data-icon="Loader2"]')).toBeTruthy()
  })

  // --- Empty state ---

  it('mostra empty state quando nessun ricambio', () => {
    setupHooks([])
    render(<PartsPage />)
    expect(screen.getByText('Nessun ricambio trovato. Aggiungi il primo ricambio.')).toBeInTheDocument()
  })

  it('Aggiungi il primo ricambio naviga a /dashboard/parts/new', () => {
    setupHooks([])
    render(<PartsPage />)
    fireEvent.click(screen.getByText('Aggiungi il primo ricambio'))
    expect(mockRouterPush).toHaveBeenCalledWith('/dashboard/parts/new')
  })

  // --- List rendering ---

  it('renderizza ricambio nella lista', () => {
    render(<PartsPage />)
    expect(screen.getByText('Pastiglie Freno')).toBeInTheDocument()
  })

  it('mostra badge stock Disponibile per stock alto', () => {
    render(<PartsPage />)
    expect(screen.getAllByText('Disponibile').length).toBeGreaterThanOrEqual(1)
  })

  it('mostra badge stock Pochi rimasti quando currentStock <= minStockLevel', () => {
    setupHooks([{ ...basePart, currentStock: 2, minStockLevel: 3 }])
    render(<PartsPage />)
    expect(screen.getAllByText('Pochi rimasti').length).toBeGreaterThanOrEqual(1)
  })

  it('mostra badge stock Esaurito quando currentStock = 0', () => {
    setupHooks([{ ...basePart, currentStock: 0 }])
    render(<PartsPage />)
    expect(screen.getAllByText('Esaurito').length).toBeGreaterThanOrEqual(1)
  })

  it('mostra badge tipo OEM per GENUINE', () => {
    render(<PartsPage />)
    expect(screen.getAllByText('OEM').length).toBeGreaterThanOrEqual(1)
  })

  it('mostra badge tipo Aftermarket', () => {
    setupHooks([{ ...basePart, partType: 'AFTERMARKET' }])
    render(<PartsPage />)
    expect(screen.getAllByText('Aftermarket').length).toBeGreaterThanOrEqual(1)
  })

  it('mostra badge tipo Rigenerato', () => {
    setupHooks([{ ...basePart, partType: 'REGENERATED' }])
    render(<PartsPage />)
    expect(screen.getAllByText('Rigenerato').length).toBeGreaterThanOrEqual(1)
  })

  it('mostra badge tipo Usato', () => {
    setupHooks([{ ...basePart, partType: 'USED' }])
    render(<PartsPage />)
    expect(screen.getAllByText('Usato').length).toBeGreaterThanOrEqual(1)
  })

  it('Dettagli naviga alla pagina di dettaglio', () => {
    render(<PartsPage />)
    fireEvent.click(screen.getByText('Dettagli'))
    expect(mockRouterPush).toHaveBeenCalledWith('/dashboard/parts/part-1')
  })

  it('mostra Pagination', () => {
    render(<PartsPage />)
    expect(screen.getByTestId('pagination')).toBeInTheDocument()
  })

  // --- Filters ---

  it('ricerca input aggiorna searchInput', () => {
    render(<PartsPage />)
    const input = screen.getByPlaceholderText('Cerca per codice OEM, marca o nome ricambio...')
    fireEvent.change(input, { target: { value: 'freno' } })
    expect((input as HTMLInputElement).value).toBe('freno')
  })

  it('filtro fornitore mostra opzioni', () => {
    render(<PartsPage />)
    const select = screen.getByDisplayValue('Tutti i fornitori')
    expect(select).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Autodoc' })).toBeInTheDocument()
  })

  it('empty state con ricerca mostra messaggio con termine', async () => {
    setupHooks([])
    render(<PartsPage />)
    const input = screen.getByPlaceholderText('Cerca per codice OEM, marca o nome ricambio...')
    fireEvent.change(input, { target: { value: 'xyz' } })
    await act(async () => {
      await new Promise(r => setTimeout(r, 350))
    })
    expect(screen.getByText(/Nessun risultato per "xyz"/)).toBeInTheDocument()
  })

  // --- Supplier dialog ---

  it('Nuovo Fornitore apre il dialog', () => {
    render(<PartsPage />)
    fireEvent.click(screen.getByText('Nuovo Fornitore'))
    expect(screen.getByText('Nuovo Fornitore', { selector: 'h2' })).toBeInTheDocument()
  })

  it('Chiudi dialog con X button', () => {
    render(<PartsPage />)
    fireEvent.click(screen.getByText('Nuovo Fornitore'))
    fireEvent.click(screen.getByLabelText('Chiudi'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('submit fornitore senza nome mostra errore', async () => {
    render(<PartsPage />)
    fireEvent.click(screen.getByText('Nuovo Fornitore'))
    fireEvent.click(screen.getByText('Aggiungi fornitore'))
    await waitFor(() =>
      expect(screen.getByText('Il nome del fornitore è obbligatorio')).toBeInTheDocument(),
    )
  })

  it('submit fornitore valido chiama mutateAsync e toast.success', async () => {
    mockMutateAsync.mockResolvedValue({ id: 'sup-new', name: 'Nuovo Fornitore Test' })
    render(<PartsPage />)
    fireEvent.click(screen.getByText('Nuovo Fornitore'))
    fireEvent.change(screen.getByPlaceholderText('Es. Autodoc Italia'), { target: { value: 'Bosch Parts' } })
    fireEvent.click(screen.getByText('Aggiungi fornitore'))
    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalled())
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Fornitore aggiunto con successo'))
  })

  it('mutateAsync error mostra toast.error', async () => {
    mockMutateAsync.mockRejectedValue(new Error('Server error'))
    render(<PartsPage />)
    fireEvent.click(screen.getByText('Nuovo Fornitore'))
    fireEvent.change(screen.getByPlaceholderText('Es. Autodoc Italia'), { target: { value: 'Fail Supplier' } })
    fireEvent.click(screen.getByText('Aggiungi fornitore'))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Errore durante la creazione del fornitore'))
  })

  it('auto-genera codice da nome fornitore', async () => {
    render(<PartsPage />)
    fireEvent.click(screen.getByText('Nuovo Fornitore'))
    const nameInput = screen.getByPlaceholderText('Es. Autodoc Italia')
    fireEvent.change(nameInput, { target: { value: 'Bosch Parts' } })
    await waitFor(() => {
      const codeInput = screen.getByPlaceholderText('AUTO_GEN') as HTMLInputElement
      expect(codeInput.value).toBe('BOSCH_PARTS')
    })
  })

  it('mostra/nasconde Dettagli opzionale', () => {
    render(<PartsPage />)
    fireEvent.click(screen.getByText('Nuovo Fornitore'))
    expect(screen.queryByPlaceholderText('Contatto')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Dettagli (opzionale)'))
    expect(screen.getByPlaceholderText('Contatto')).toBeInTheDocument()
  })

  // --- N/D stock status ---

  it('mostra N/D quando currentStock è null', () => {
    setupHooks([{ ...basePart, currentStock: null }])
    render(<PartsPage />)
    expect(screen.getAllByText('N/D').length).toBeGreaterThanOrEqual(1)
  })
})
