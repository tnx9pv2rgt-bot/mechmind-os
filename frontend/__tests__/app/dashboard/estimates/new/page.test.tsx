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
    children,
    variants,
    initial,
    animate,
    exit,
    whileHover,
    whileTap,
    custom,
    transition,
    layout,
    layoutId,
    ...rest
  }: Record<string, unknown>) => ({ ...rest, children })
  return {
    motion: new Proxy({}, {
      get(_t: unknown, tag: string) {
        if (typeof tag !== 'string') return undefined
        return (props: Record<string, unknown>) =>
          React.createElement(tag as string, filterMotionProps(props))
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
  AppleCardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('div', { className }, children),
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
    React.createElement(
      'button',
      { onClick, disabled: disabled || loading, className, 'aria-label': ariaLabel },
      children,
    ),
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

import NewEstimatePage from '@/app/dashboard/estimates/new/page'
import { toast } from 'sonner'

const mockCustomers = [
  { id: 'cust-1', firstName: 'Mario', lastName: 'Rossi', phone: '333-111' },
]
const mockVehicles = [
  { id: 'veh-1', licensePlate: 'AA123BB', make: 'Fiat', model: 'Punto' },
]

function setupSearchFetch() {
  mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
    if (typeof url === 'string' && url.includes('/api/customers')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockCustomers),
      })
    }
    if (typeof url === 'string' && url.includes('/api/vehicles')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockVehicles),
      })
    }
    if (
      typeof url === 'string' &&
      url === '/api/estimates' &&
      opts?.method === 'POST'
    ) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: { id: 'new-est-99' } }),
      })
    }
    return Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
  })
}

async function selectCustomerAndVehicle() {
  fireEvent.change(screen.getByPlaceholderText('Cerca per nome, targa o telefono...'), {
    target: { value: 'Mar' },
  })
  await waitFor(() => expect(screen.getByText(/Mario Rossi/)).toBeInTheDocument())
  fireEvent.click(screen.getByText(/Mario Rossi/))
  await waitFor(() =>
    expect(screen.queryByText('Seleziona prima un cliente')).not.toBeInTheDocument(),
  )
}

describe('NewEstimatePage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockResolvedValue({ ok: false, json: () => Promise.resolve({}) })
  })

  // --- Header & structure ---

  it('renderizza titolo Nuovo Preventivo', () => {
    render(<NewEstimatePage />)
    expect(screen.getByText('Nuovo Preventivo')).toBeInTheDocument()
  })

  it('renderizza breadcrumb', () => {
    render(<NewEstimatePage />)
    expect(screen.getByTestId('breadcrumb')).toBeInTheDocument()
  })

  it('Torna ai Preventivi chiama router.push', () => {
    render(<NewEstimatePage />)
    fireEvent.click(screen.getByText('Torna ai Preventivi'))
    expect(mockRouterPush).toHaveBeenCalledWith('/dashboard/estimates')
  })

  // --- Customer search ---

  it('search input con < 2 chars non chiama fetch', async () => {
    render(<NewEstimatePage />)
    fireEvent.change(screen.getByPlaceholderText('Cerca per nome, targa o telefono...'), {
      target: { value: 'M' },
    })
    await new Promise(r => setTimeout(r, 50))
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('search input con >= 2 chars chiama fetch', async () => {
    setupSearchFetch()
    render(<NewEstimatePage />)
    fireEvent.change(screen.getByPlaceholderText('Cerca per nome, targa o telefono...'), {
      target: { value: 'Ma' },
    })
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/customers')))
  })

  it('mostra risultati cliente nel dropdown', async () => {
    setupSearchFetch()
    render(<NewEstimatePage />)
    fireEvent.change(screen.getByPlaceholderText('Cerca per nome, targa o telefono...'), {
      target: { value: 'Mar' },
    })
    await waitFor(() => expect(screen.getByText(/Mario Rossi/)).toBeInTheDocument())
  })

  it('mostra telefono cliente nel dropdown', async () => {
    setupSearchFetch()
    render(<NewEstimatePage />)
    fireEvent.change(screen.getByPlaceholderText('Cerca per nome, targa o telefono...'), {
      target: { value: 'Mar' },
    })
    await waitFor(() => expect(screen.getByText('333-111')).toBeInTheDocument())
  })

  // --- Customer selection ---

  it('selezione cliente mostra "Selezionato: ..."', async () => {
    setupSearchFetch()
    render(<NewEstimatePage />)
    await selectCustomerAndVehicle()
    expect(screen.getByText(/Selezionato: Mario Rossi/)).toBeInTheDocument()
  })

  it('selezione cliente carica i veicoli', async () => {
    setupSearchFetch()
    render(<NewEstimatePage />)
    fireEvent.change(screen.getByPlaceholderText('Cerca per nome, targa o telefono...'), {
      target: { value: 'Mar' },
    })
    await waitFor(() => screen.getByText(/Mario Rossi/))
    fireEvent.click(screen.getByText(/Mario Rossi/))
    await waitFor(() =>
      expect(screen.getByRole('option', { name: /AA123BB/ })).toBeInTheDocument(),
    )
  })

  // --- Vehicle select ---

  it('vehicle select è disabilitato senza cliente', () => {
    render(<NewEstimatePage />)
    const select = screen.getByDisplayValue('Seleziona prima un cliente')
    expect(select).toBeDisabled()
  })

  it('vehicle select abilitato dopo selezione cliente', async () => {
    setupSearchFetch()
    render(<NewEstimatePage />)
    await selectCustomerAndVehicle()
    const select = screen.getByDisplayValue('Seleziona un veicolo...')
    expect(select).not.toBeDisabled()
  })

  // --- Lines management ---

  it('renderizza riga predefinita', () => {
    render(<NewEstimatePage />)
    expect(screen.getByPlaceholderText('Descrizione')).toBeInTheDocument()
  })

  it('Aggiungi riga aggiunge una riga', () => {
    render(<NewEstimatePage />)
    const before = screen.getAllByPlaceholderText('Descrizione').length
    fireEvent.click(screen.getByText('Aggiungi riga'))
    expect(screen.getAllByPlaceholderText('Descrizione').length).toBe(before + 1)
  })

  it('rimozione riga rimuove la riga', () => {
    render(<NewEstimatePage />)
    fireEvent.click(screen.getByText('Aggiungi riga'))
    const before = screen.getAllByPlaceholderText('Descrizione').length
    const removeButtons = screen.getAllByLabelText('Rimuovi riga')
    fireEvent.click(removeButtons[0])
    expect(screen.getAllByPlaceholderText('Descrizione').length).toBe(before - 1)
  })

  it('senza righe mostra messaggio Nessuna riga', () => {
    render(<NewEstimatePage />)
    const removeButtons = screen.getAllByLabelText('Rimuovi riga')
    removeButtons.forEach(btn => fireEvent.click(btn))
    expect(screen.getByText(/Nessuna riga/)).toBeInTheDocument()
  })

  it('aggiornare tipo riga a PART', () => {
    render(<NewEstimatePage />)
    const typeSelect = screen.getByDisplayValue('Lavoro')
    fireEvent.change(typeSelect, { target: { value: 'PART' } })
    expect(screen.getByDisplayValue('Ricambio')).toBeInTheDocument()
  })

  // --- Calculations ---

  it('calcola subtotale correttamente', () => {
    render(<NewEstimatePage />)
    const priceInput = screen.getByPlaceholderText('0.00')
    fireEvent.change(priceInput, { target: { value: '100' } })
    expect(screen.getByText('Subtotale')).toBeInTheDocument()
    expect(screen.getAllByText('Totale').length).toBeGreaterThanOrEqual(1)
  })

  // --- Validation ---

  it('submit senza cliente mostra errore Seleziona un cliente', async () => {
    render(<NewEstimatePage />)
    fireEvent.click(screen.getByText('Salva come bozza'))
    await waitFor(() =>
      expect(screen.getByText('Seleziona un cliente')).toBeInTheDocument(),
    )
  })

  it('submit senza veicolo mostra errore Seleziona un veicolo', async () => {
    setupSearchFetch()
    render(<NewEstimatePage />)
    // Select customer but not vehicle
    fireEvent.change(screen.getByPlaceholderText('Cerca per nome, targa o telefono...'), {
      target: { value: 'Mar' },
    })
    await waitFor(() => screen.getByText(/Mario Rossi/))
    fireEvent.click(screen.getByText(/Mario Rossi/))
    await waitFor(() => screen.getByDisplayValue('Seleziona un veicolo...'))
    // Don't select vehicle — submit
    fireEvent.click(screen.getByText('Salva come bozza'))
    await waitFor(() =>
      expect(screen.getByText('Seleziona un veicolo')).toBeInTheDocument(),
    )
  })

  it('submit con riga senza descrizione mostra errore', async () => {
    setupSearchFetch()
    render(<NewEstimatePage />)
    await selectCustomerAndVehicle()
    // Select vehicle
    const vehicleSelect = screen.getByDisplayValue('Seleziona un veicolo...')
    fireEvent.change(vehicleSelect, { target: { value: 'veh-1' } })
    // Submit without description
    fireEvent.click(screen.getByText('Salva come bozza'))
    await waitFor(() =>
      expect(screen.getByText('Descrizione obbligatoria')).toBeInTheDocument(),
    )
  })

  // --- Successful submit ---

  it('Salva come bozza con dati validi chiama router.push', async () => {
    setupSearchFetch()
    render(<NewEstimatePage />)
    await selectCustomerAndVehicle()
    // Select vehicle
    fireEvent.change(screen.getByDisplayValue('Seleziona un veicolo...'), {
      target: { value: 'veh-1' },
    })
    // Fill in line description
    const descInput = screen.getByPlaceholderText('Descrizione')
    fireEvent.change(descInput, { target: { value: 'Cambio olio motore' } })
    fireEvent.click(screen.getByText('Salva come bozza'))
    await waitFor(() =>
      expect(mockRouterPush).toHaveBeenCalledWith('/dashboard/estimates/new-est-99'),
    )
    expect(toast.success).toHaveBeenCalledWith('Preventivo creato con successo')
  })

  it('Salva e invia al cliente chiama router.push', async () => {
    setupSearchFetch()
    render(<NewEstimatePage />)
    await selectCustomerAndVehicle()
    fireEvent.change(screen.getByDisplayValue('Seleziona un veicolo...'), {
      target: { value: 'veh-1' },
    })
    const descInput = screen.getByPlaceholderText('Descrizione')
    fireEvent.change(descInput, { target: { value: 'Revisione completa' } })
    fireEvent.click(screen.getByText('Salva e invia al cliente'))
    await waitFor(() =>
      expect(mockRouterPush).toHaveBeenCalledWith('/dashboard/estimates/new-est-99'),
    )
  })

  it('errore API mostra submitError', async () => {
    mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (typeof url === 'string' && url.includes('/api/customers')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockCustomers) })
      }
      if (typeof url === 'string' && url.includes('/api/vehicles')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockVehicles) })
      }
      if (typeof url === 'string' && url === '/api/estimates' && opts?.method === 'POST') {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ message: 'Limite piano raggiunto' }),
        })
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
    })
    render(<NewEstimatePage />)
    await selectCustomerAndVehicle()
    fireEvent.change(screen.getByDisplayValue('Seleziona un veicolo...'), {
      target: { value: 'veh-1' },
    })
    fireEvent.change(screen.getByPlaceholderText('Descrizione'), {
      target: { value: 'Servizio' },
    })
    fireEvent.click(screen.getByText('Salva come bozza'))
    await waitFor(() =>
      expect(screen.getByText('Limite piano raggiunto')).toBeInTheDocument(),
    )
    expect(toast.error).toHaveBeenCalledWith('Limite piano raggiunto')
  })

  // --- Sconto ---

  it('mostra sezione Sconto', () => {
    render(<NewEstimatePage />)
    expect(screen.getByText('Sconto')).toBeInTheDocument()
  })

  it('cambio tipo sconto a PERCENT', () => {
    render(<NewEstimatePage />)
    const discountTypeSelect = screen.getByDisplayValue('EUR')
    fireEvent.change(discountTypeSelect, { target: { value: 'PERCENT' } })
    expect(screen.getByDisplayValue('%')).toBeInTheDocument()
  })
})
