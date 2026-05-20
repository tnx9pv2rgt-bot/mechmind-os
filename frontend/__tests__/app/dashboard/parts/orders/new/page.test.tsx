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
    type,
    'aria-label': ariaLabel,
  }: {
    children?: React.ReactNode
    onClick?: () => void
    loading?: boolean
    disabled?: boolean
    type?: string
    'aria-label'?: string
  }) =>
    React.createElement('button', { onClick, disabled: disabled || loading, type, 'aria-label': ariaLabel }, children),
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

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

const mockFetch = jest.fn()
global.fetch = mockFetch

import NewSupplierOrderPage from '@/app/dashboard/parts/orders/new/page'
import { toast } from 'sonner'

const mockSuppliers = [{ id: 'sup-1', name: 'Autodoc' }]
const mockPartsResults = [
  { id: 'part-1', name: 'Filtro Olio', sku: 'FLT-OIL-001', currentStock: 5, costPrice: 10.0 },
]

function setupFetch(submitOk = true) {
  mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
    if (typeof url === 'string' && url.includes('/api/parts/suppliers')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSuppliers) })
    }
    if (typeof url === 'string' && url.includes('/api/parts') && !opts?.method) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: mockPartsResults }) })
    }
    if (typeof url === 'string' && url === '/api/parts/orders' && opts?.method === 'POST') {
      if (submitOk) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'order-new' }) })
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ message: 'Quota esaurita' }),
      })
    }
    return Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
  })
}

async function addPartToOrder() {
  setupFetch()
  fireEvent.change(screen.getByLabelText('Cerca ricambio'), { target: { value: 'fi' } })
  await waitFor(() => expect(screen.getByText('Filtro Olio')).toBeInTheDocument())
  fireEvent.click(screen.getByText('Filtro Olio'))
}

describe('NewSupplierOrderPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockResolvedValue({ ok: false, json: () => Promise.resolve({}) })
  })

  // --- Structure ---

  it('renderizza titolo Ordine Fornitore', () => {
    render(<NewSupplierOrderPage />)
    expect(screen.getByText('Ordine Fornitore')).toBeInTheDocument()
  })

  it('renderizza breadcrumb', () => {
    render(<NewSupplierOrderPage />)
    expect(screen.getByTestId('breadcrumb')).toBeInTheDocument()
  })

  it('renderizza sezione Fornitore', () => {
    render(<NewSupplierOrderPage />)
    expect(screen.getByText('Fornitore')).toBeInTheDocument()
  })

  it('renderizza sezione Ricambi da Ordinare', () => {
    render(<NewSupplierOrderPage />)
    expect(screen.getByText('Ricambi da Ordinare')).toBeInTheDocument()
  })

  it('renderizza sezione Note Ordine', () => {
    render(<NewSupplierOrderPage />)
    expect(screen.getByText('Note Ordine')).toBeInTheDocument()
  })

  // --- Navigation ---

  it('Annulla naviga a /dashboard/parts', () => {
    render(<NewSupplierOrderPage />)
    fireEvent.click(screen.getByText('Annulla'))
    expect(mockRouterPush).toHaveBeenCalledWith('/dashboard/parts')
  })

  it('tasto indietro naviga a /dashboard/parts', () => {
    render(<NewSupplierOrderPage />)
    fireEvent.click(screen.getByLabelText('Torna ai ricambi'))
    expect(mockRouterPush).toHaveBeenCalledWith('/dashboard/parts')
  })

  // --- Suppliers loading ---

  it('carica fornitori da /api/parts/suppliers', async () => {
    setupFetch()
    render(<NewSupplierOrderPage />)
    await waitFor(() =>
      expect(screen.getByRole('option', { name: 'Autodoc' })).toBeInTheDocument(),
    )
  })

  // --- Validation ---

  it('submit senza fornitore mostra errore', async () => {
    render(<NewSupplierOrderPage />)
    fireEvent.click(screen.getByText('Invia Ordine'))
    await waitFor(() =>
      expect(screen.getByText('Seleziona un fornitore')).toBeInTheDocument(),
    )
  })

  it('submit senza ricambi mostra errore', async () => {
    setupFetch()
    render(<NewSupplierOrderPage />)
    await waitFor(() => screen.getByRole('option', { name: 'Autodoc' }))
    fireEvent.change(screen.getByDisplayValue('Seleziona fornitore...'), {
      target: { value: 'sup-1' },
    })
    fireEvent.click(screen.getByText('Invia Ordine'))
    await waitFor(() =>
      expect(screen.getByText('Aggiungi almeno un ricambio')).toBeInTheDocument(),
    )
  })

  // --- Empty parts state ---

  it('fetch fornitori che rigetta non causa crash', async () => {
    mockFetch.mockRejectedValue(new Error('network'))
    render(<NewSupplierOrderPage />)
    await new Promise(r => setTimeout(r, 50))
    expect(screen.getByText('Ordine Fornitore')).toBeInTheDocument()
  })

  it('mostra messaggio empty state ricambi', () => {
    render(<NewSupplierOrderPage />)
    expect(screen.getByText('Cerca e aggiungi ricambi da ordinare')).toBeInTheDocument()
  })

  // --- Part search ---

  it('ricerca ricambi che rigetta non causa crash', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('/api/parts/suppliers')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSuppliers) })
      }
      return Promise.reject(new Error('network'))
    })
    render(<NewSupplierOrderPage />)
    fireEvent.change(screen.getByLabelText('Cerca ricambio'), { target: { value: 'fi' } })
    await new Promise(r => setTimeout(r, 50))
    expect(screen.queryByText('Filtro Olio')).not.toBeInTheDocument()
  })

  it('ricerca con < 2 chars non mostra risultati', async () => {
    setupFetch()
    render(<NewSupplierOrderPage />)
    fireEvent.change(screen.getByLabelText('Cerca ricambio'), { target: { value: 'f' } })
    await new Promise(r => setTimeout(r, 50))
    expect(screen.queryByText('Filtro Olio')).not.toBeInTheDocument()
  })

  it('ricerca con >= 2 chars mostra risultati', async () => {
    setupFetch()
    render(<NewSupplierOrderPage />)
    fireEvent.change(screen.getByLabelText('Cerca ricambio'), { target: { value: 'fi' } })
    await waitFor(() => expect(screen.getByText('Filtro Olio')).toBeInTheDocument())
  })

  it('click su ricambio lo aggiunge alla lista', async () => {
    render(<NewSupplierOrderPage />)
    await addPartToOrder()
    expect(screen.getByText('Filtro Olio')).toBeInTheDocument()
    expect(screen.getByText('FLT-OIL-001')).toBeInTheDocument()
  })

  it('ricambio duplicato mostra toast.error', async () => {
    render(<NewSupplierOrderPage />)
    await addPartToOrder()
    fireEvent.change(screen.getByLabelText('Cerca ricambio'), { target: { value: 'fi' } })
    // wait for the dropdown to appear (2nd occurrence of 'Filtro Olio': one in table, one in dropdown)
    await waitFor(() => expect(screen.getAllByText('Filtro Olio').length).toBeGreaterThanOrEqual(2))
    fireEvent.click(screen.getByText('Filtro Olio', { selector: 'span' }))
    expect(toast.error).toHaveBeenCalledWith('Ricambio già aggiunto')
  })

  it('rimozione riga rimuove il ricambio', async () => {
    render(<NewSupplierOrderPage />)
    await addPartToOrder()
    fireEvent.click(screen.getByLabelText('Rimuovi'))
    expect(screen.queryByText('FLT-OIL-001')).not.toBeInTheDocument()
  })

  it('modifica quantità riga aggiorna il valore', async () => {
    render(<NewSupplierOrderPage />)
    await addPartToOrder()
    const qtyInput = document.querySelector('input[type="number"]') as HTMLInputElement
    fireEvent.change(qtyInput, { target: { value: '3' } })
    expect(qtyInput.value).toBe('3')
  })

  it('modifica prezzo riga aggiorna il valore', async () => {
    render(<NewSupplierOrderPage />)
    await addPartToOrder()
    const numInputs = document.querySelectorAll('input[type="number"]')
    const priceInput = numInputs[1] as HTMLInputElement
    if (priceInput) {
      fireEvent.change(priceInput, { target: { value: '25.5' } })
      expect(priceInput.value).toBe('25.5')
    }
  })

  it('modifica note aggiorna il valore', async () => {
    render(<NewSupplierOrderPage />)
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: 'note ordine' } })
    expect(textarea.value).toBe('note ordine')
  })

  it('focus su campo ricerca con risultati mostra dropdown', async () => {
    setupFetch()
    render(<NewSupplierOrderPage />)
    const input = screen.getByLabelText('Cerca ricambio')
    fireEvent.change(input, { target: { value: 'fi' } })
    await waitFor(() => expect(screen.getAllByText('Filtro Olio').length).toBeGreaterThanOrEqual(1))
    // blur then refocus — should re-show the dropdown
    fireEvent.blur(input)
    fireEvent.focus(input)
    expect(screen.getAllByText('Filtro Olio').length).toBeGreaterThanOrEqual(1)
  })

  it('mostra Totale Ordine quando ci sono righe', async () => {
    render(<NewSupplierOrderPage />)
    await addPartToOrder()
    expect(screen.getByText('Totale Ordine')).toBeInTheDocument()
  })

  // --- Successful submit ---

  it('submit valido chiama router.push e toast.success', async () => {
    setupFetch(true)
    render(<NewSupplierOrderPage />)
    await waitFor(() => screen.getByRole('option', { name: 'Autodoc' }))
    fireEvent.change(screen.getByLabelText('Cerca ricambio'), { target: { value: 'fi' } })
    await waitFor(() => expect(screen.getByText('Filtro Olio')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Filtro Olio'))
    await waitFor(() => expect(screen.getByText('FLT-OIL-001')).toBeInTheDocument())
    fireEvent.change(screen.getByDisplayValue('Seleziona fornitore...'), {
      target: { value: 'sup-1' },
    })
    fireEvent.click(screen.getByText('Invia Ordine'))
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Ordine fornitore creato con successo'),
    )
    expect(mockRouterPush).toHaveBeenCalledWith('/dashboard/parts')
  })

  it('errore API mostra submitError', async () => {
    setupFetch(false)
    render(<NewSupplierOrderPage />)
    await waitFor(() => screen.getByRole('option', { name: 'Autodoc' }))
    fireEvent.change(screen.getByLabelText('Cerca ricambio'), { target: { value: 'fi' } })
    await waitFor(() => expect(screen.getByText('Filtro Olio')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Filtro Olio'))
    await waitFor(() => expect(screen.getByText('FLT-OIL-001')).toBeInTheDocument())
    fireEvent.change(screen.getByDisplayValue('Seleziona fornitore...'), {
      target: { value: 'sup-1' },
    })
    fireEvent.click(screen.getByText('Invia Ordine'))
    await waitFor(() =>
      expect(screen.getByText('Quota esaurita')).toBeInTheDocument(),
    )
    expect(toast.error).toHaveBeenCalledWith('Quota esaurita')
  })
})
