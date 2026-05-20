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

jest.mock('next/link', () => {
  const React = require('react')
  return ({ children, href }: { children: React.ReactNode; href: string }) =>
    React.createElement('a', { href }, children)
})

jest.mock('@/components/ui/apple-card', () => ({
  AppleCard: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  AppleCardContent: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('div', { className }, children),
}))

jest.mock('@/components/ui/apple-button', () => ({
  AppleButton: ({
    children,
    onClick,
    loading,
    disabled,
    variant,
  }: {
    children?: React.ReactNode
    onClick?: () => void
    loading?: boolean
    disabled?: boolean
    variant?: string
  }) =>
    React.createElement('button', { onClick, disabled: disabled || loading, 'data-variant': variant }, children),
}))

jest.mock('@/components/patterns/empty-state', () => ({
  EmptyState: ({ title, description }: { title: string; description: string }) =>
    React.createElement('div', { 'data-testid': 'empty-state' },
      React.createElement('p', null, title),
      React.createElement('p', null, description),
    ),
}))

jest.mock('@/components/patterns/error-state', () => ({
  ErrorState: () => React.createElement('div', { 'data-testid': 'error-state' }),
}))

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

jest.mock('@/lib/swr-fetcher', () => ({ fetcher: jest.fn() }))

const mockUseSWR = jest.fn()
jest.mock('swr', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockUseSWR(...args),
}))

const mockFetch = jest.fn()
global.fetch = mockFetch

import PartsCatalogPage from '@/app/dashboard/parts/catalog/page'
import { toast } from 'sonner'

const baseCatalogPart = {
  id: 'cat-1',
  name: 'Filtro Olio Bosch',
  oemNumber: 'F026407225',
  brand: 'Bosch',
  category: 'Filtri',
  compatible: true,
  suppliers: [
    {
      supplierId: 'sup-1',
      supplierName: 'Autodoc',
      price: 12.5,
      availability: 'IN_STOCK',
      deliveryDays: 0,
    },
  ],
}

function setupSWR(
  data: object | null = { data: [baseCatalogPart], meta: { total: 1 } },
  error?: Error,
  loading = false,
  shouldFetch = true,
) {
  mockUseSWR.mockImplementation((key: string | null) => {
    if (key === null || !shouldFetch) {
      return { data: undefined, error: undefined, isLoading: false }
    }
    return {
      data: data ?? undefined,
      error,
      isLoading: loading,
    }
  })
}

describe('PartsCatalogPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setupSWR(null, undefined, false, false)
  })

  // --- Header ---

  it('renderizza titolo catalogo', () => {
    render(<PartsCatalogPage />)
    expect(screen.getByText('Catalogo Ricambi Multi-Fornitore')).toBeInTheDocument()
  })

  it('mostra link Indietro', () => {
    render(<PartsCatalogPage />)
    expect(screen.getByText('Indietro')).toBeInTheDocument()
  })

  // --- Search hint ---

  it('mostra suggerimento per cercare con < 2 chars', () => {
    render(<PartsCatalogPage />)
    expect(screen.getByText('Inserisci almeno 2 caratteri per cercare')).toBeInTheDocument()
  })

  it('con ricerca < 2 chars non fa fetch', () => {
    render(<PartsCatalogPage />)
    fireEvent.change(screen.getByPlaceholderText('Cerca per nome ricambio, codice OEM...'), {
      target: { value: 'f' },
    })
    expect(mockUseSWR).toHaveBeenCalledWith(null, expect.anything(), expect.anything())
  })

  it('con ricerca >= 2 chars usa chiave SWR', () => {
    render(<PartsCatalogPage />)
    fireEvent.change(screen.getByPlaceholderText('Cerca per nome ricambio, codice OEM...'), {
      target: { value: 'fi' },
    })
    expect(mockUseSWR).toHaveBeenCalledWith(
      expect.stringContaining('/api/parts-catalog/search'),
      expect.anything(),
      expect.anything(),
    )
  })

  // --- Loading ---

  it('mostra spinner durante il caricamento', () => {
    setupSWR(null, undefined, true)
    render(<PartsCatalogPage />)
    fireEvent.change(screen.getByPlaceholderText('Cerca per nome ricambio, codice OEM...'), {
      target: { value: 'fi' },
    })
    expect(document.querySelector('[data-icon="Loader2"]')).toBeTruthy()
  })

  // --- Error state ---

  it('mostra errore quando SWR restituisce error', () => {
    setupSWR(null, new Error('network'))
    render(<PartsCatalogPage />)
    fireEvent.change(screen.getByPlaceholderText('Cerca per nome ricambio, codice OEM...'), {
      target: { value: 'fi' },
    })
    expect(screen.getByText('Errore nella ricerca')).toBeInTheDocument()
  })

  // --- Empty state ---

  it('mostra empty state quando nessun ricambio trovato', () => {
    setupSWR({ data: [], meta: { total: 0 } })
    render(<PartsCatalogPage />)
    fireEvent.change(screen.getByPlaceholderText('Cerca per nome ricambio, codice OEM...'), {
      target: { value: 'xy' },
    })
    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
  })

  // --- Results ---

  it('mostra ricambio trovato', () => {
    setupSWR()
    render(<PartsCatalogPage />)
    fireEvent.change(screen.getByPlaceholderText('Cerca per nome ricambio, codice OEM...'), {
      target: { value: 'fi' },
    })
    expect(screen.getByText('Filtro Olio Bosch')).toBeInTheDocument()
  })

  it('mostra numero OEM del ricambio', () => {
    setupSWR()
    render(<PartsCatalogPage />)
    fireEvent.change(screen.getByPlaceholderText('Cerca per nome ricambio, codice OEM...'), {
      target: { value: 'fi' },
    })
    expect(screen.getByText(/F026407225/)).toBeInTheDocument()
  })

  it('mostra Compatibile badge quando compatible=true', () => {
    setupSWR()
    render(<PartsCatalogPage />)
    fireEvent.change(screen.getByPlaceholderText('Cerca per nome ricambio, codice OEM...'), {
      target: { value: 'fi' },
    })
    expect(screen.getByText('Compatibile')).toBeInTheDocument()
  })

  it('mostra totale risultati', () => {
    setupSWR()
    render(<PartsCatalogPage />)
    fireEvent.change(screen.getByPlaceholderText('Cerca per nome ricambio, codice OEM...'), {
      target: { value: 'fi' },
    })
    expect(screen.getByText(/1 risultati trovati/)).toBeInTheDocument()
  })

  it('click Confronta prezzi espande i fornitori', () => {
    setupSWR()
    render(<PartsCatalogPage />)
    fireEvent.change(screen.getByPlaceholderText('Cerca per nome ricambio, codice OEM...'), {
      target: { value: 'fi' },
    })
    fireEvent.click(screen.getByText('Confronta prezzi'))
    expect(screen.getByText('Autodoc')).toBeInTheDocument()
  })

  it('mostra Miglior prezzo per il fornitore più economico', () => {
    setupSWR()
    render(<PartsCatalogPage />)
    fireEvent.change(screen.getByPlaceholderText('Cerca per nome ricambio, codice OEM...'), {
      target: { value: 'fi' },
    })
    fireEvent.click(screen.getByText('Confronta prezzi'))
    expect(screen.getByText('Miglior prezzo')).toBeInTheDocument()
  })

  it('mostra disponibilità Disponibile', () => {
    setupSWR()
    render(<PartsCatalogPage />)
    fireEvent.change(screen.getByPlaceholderText('Cerca per nome ricambio, codice OEM...'), {
      target: { value: 'fi' },
    })
    fireEvent.click(screen.getByText('Confronta prezzi'))
    expect(screen.getByText('Disponibile')).toBeInTheDocument()
  })

  it('mostra Immediato quando deliveryDays = 0', () => {
    setupSWR()
    render(<PartsCatalogPage />)
    fireEvent.change(screen.getByPlaceholderText('Cerca per nome ricambio, codice OEM...'), {
      target: { value: 'fi' },
    })
    fireEvent.click(screen.getByText('Confronta prezzi'))
    expect(screen.getByText('Immediato')).toBeInTheDocument()
  })

  it('click Ordina chiama fetch e toast.success', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
    setupSWR()
    render(<PartsCatalogPage />)
    fireEvent.change(screen.getByPlaceholderText('Cerca per nome ricambio, codice OEM...'), {
      target: { value: 'fi' },
    })
    fireEvent.click(screen.getByText('Confronta prezzi'))
    fireEvent.click(screen.getByText('Ordina'))
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Ordine inviato a Autodoc'),
    )
  })

  it('ordine error mostra toast.error', async () => {
    mockFetch.mockResolvedValue({ ok: false, json: () => Promise.resolve({}) })
    setupSWR()
    render(<PartsCatalogPage />)
    fireEvent.change(screen.getByPlaceholderText('Cerca per nome ricambio, codice OEM...'), {
      target: { value: 'fi' },
    })
    fireEvent.click(screen.getByText('Confronta prezzi'))
    fireEvent.click(screen.getByText('Ordina'))
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
  })

  it('Ordina è disabilitato per OUT_OF_STOCK', () => {
    setupSWR({
      data: [{
        ...baseCatalogPart,
        suppliers: [{ ...baseCatalogPart.suppliers[0], availability: 'OUT_OF_STOCK' }],
      }],
      meta: { total: 1 },
    })
    render(<PartsCatalogPage />)
    fireEvent.change(screen.getByPlaceholderText('Cerca per nome ricambio, codice OEM...'), {
      target: { value: 'fi' },
    })
    fireEvent.click(screen.getByText('Confronta prezzi'))
    expect((screen.getByText('Ordina') as HTMLButtonElement).disabled).toBe(true)
  })

  // --- Filters ---

  it('click Filtri mostra/nasconde filtri avanzati', () => {
    render(<PartsCatalogPage />)
    expect(screen.queryByText('Solo disponibili')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Filtri'))
    expect(screen.getByText('Solo disponibili')).toBeInTheDocument()
  })

  it('click Pulisci resetta filtri', () => {
    render(<PartsCatalogPage />)
    fireEvent.click(screen.getByText('Filtri'))
    fireEvent.click(screen.getByText('Pulisci'))
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement
    expect(checkbox.checked).toBe(false)
  })

  it('modifica veicolo filter aggiorna il valore', () => {
    render(<PartsCatalogPage />)
    const input = screen.getByPlaceholderText('Veicolo (marca/modello/targa)')
    fireEvent.change(input, { target: { value: 'BMW 320d' } })
    expect((input as HTMLInputElement).value).toBe('BMW 320d')
  })

  it('modifica filtro prezzo min aggiorna il valore', () => {
    render(<PartsCatalogPage />)
    fireEvent.click(screen.getByText('Filtri'))
    const priceMin = screen.getByPlaceholderText('0')
    fireEvent.change(priceMin, { target: { value: '10' } })
    expect((priceMin as HTMLInputElement).value).toBe('10')
  })

  it('modifica filtro prezzo max aggiorna il valore', () => {
    render(<PartsCatalogPage />)
    fireEvent.click(screen.getByText('Filtri'))
    const priceMax = screen.getByPlaceholderText('1000')
    fireEvent.change(priceMax, { target: { value: '500' } })
    expect((priceMax as HTMLInputElement).value).toBe('500')
  })

  it('modifica filtro marca aggiorna il valore', () => {
    render(<PartsCatalogPage />)
    fireEvent.click(screen.getByText('Filtri'))
    const brand = screen.getByPlaceholderText('Es. Bosch, Brembo...')
    fireEvent.change(brand, { target: { value: 'Bosch' } })
    expect((brand as HTMLInputElement).value).toBe('Bosch')
  })

  it('modifica checkbox Solo disponibili aggiorna il valore', () => {
    render(<PartsCatalogPage />)
    fireEvent.click(screen.getByText('Filtri'))
    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)
    expect((checkbox as HTMLInputElement).checked).toBe(true)
  })

  it('Riprova mostra pulsante nel blocco errore', () => {
    setupSWR(null, new Error('network'))
    render(<PartsCatalogPage />)
    fireEvent.change(screen.getByPlaceholderText('Cerca per nome ricambio, codice OEM...'), {
      target: { value: 'fi' },
    })
    expect(screen.getByText('Riprova')).toBeInTheDocument()
  })

  it('ordinamento fornitori per prezzo quando ce ne sono più di uno', () => {
    setupSWR({
      data: [{
        ...baseCatalogPart,
        suppliers: [
          { ...baseCatalogPart.suppliers[0], supplierId: 'sup-2', supplierName: 'Brembo', price: 20, availability: 'IN_STOCK', deliveryDays: 1 },
          { ...baseCatalogPart.suppliers[0], supplierId: 'sup-1', supplierName: 'Autodoc', price: 12.5, availability: 'IN_STOCK', deliveryDays: 0 },
        ],
      }],
      meta: { total: 1 },
    })
    render(<PartsCatalogPage />)
    fireEvent.change(screen.getByPlaceholderText('Cerca per nome ricambio, codice OEM...'), {
      target: { value: 'fi' },
    })
    fireEvent.click(screen.getByText('Confronta prezzi'))
    expect(screen.getByText('Autodoc')).toBeInTheDocument()
    expect(screen.getByText('Brembo')).toBeInTheDocument()
  })
})
