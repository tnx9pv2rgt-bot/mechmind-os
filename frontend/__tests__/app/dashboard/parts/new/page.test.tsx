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
    type?: 'button' | 'submit' | 'reset'
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

import NewPartPage from '@/app/dashboard/parts/new/page'
import { toast } from 'sonner'

const mockSuppliers = [{ id: 'sup-1', name: 'Autodoc' }]

function setupFetch(createOk = true, createId = 'part-new') {
  mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
    if (typeof url === 'string' && url.includes('/api/parts/suppliers')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSuppliers) })
    }
    if (typeof url === 'string' && url === '/api/parts' && opts?.method === 'POST') {
      if (createOk) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: { id: createId } }),
        })
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ message: 'Limite piano raggiunto' }),
      })
    }
    return Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
  })
}

describe('NewPartPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockResolvedValue({ ok: false, json: () => Promise.resolve({}) })
  })

  // --- Structure ---

  it('renderizza titolo Nuovo Ricambio', () => {
    render(<NewPartPage />)
    expect(screen.getByText('Nuovo Ricambio')).toBeInTheDocument()
  })

  it('renderizza breadcrumb', () => {
    render(<NewPartPage />)
    expect(screen.getByTestId('breadcrumb')).toBeInTheDocument()
  })

  it('renderizza sezione Informazioni Base', () => {
    render(<NewPartPage />)
    expect(screen.getByText('Informazioni Base')).toBeInTheDocument()
  })

  it('renderizza sezione Prezzi e Magazzino', () => {
    render(<NewPartPage />)
    expect(screen.getByText('Prezzi e Magazzino')).toBeInTheDocument()
  })

  it('renderizza sezione Note', () => {
    render(<NewPartPage />)
    expect(screen.getByText('Note')).toBeInTheDocument()
  })

  // --- Navigation ---

  it('Annulla naviga a /dashboard/parts', () => {
    render(<NewPartPage />)
    fireEvent.click(screen.getByText('Annulla'))
    expect(mockRouterPush).toHaveBeenCalledWith('/dashboard/parts')
  })

  it('tasto indietro naviga a /dashboard/parts', () => {
    render(<NewPartPage />)
    fireEvent.click(screen.getByLabelText('Torna ai ricambi'))
    expect(mockRouterPush).toHaveBeenCalledWith('/dashboard/parts')
  })

  // --- Suppliers loading ---

  it('carica fornitori da /api/parts/suppliers', async () => {
    setupFetch()
    render(<NewPartPage />)
    await waitFor(() =>
      expect(screen.getByRole('option', { name: 'Autodoc' })).toBeInTheDocument(),
    )
  })

  // --- Validation ---

  it('submit senza nome mostra errore', async () => {
    render(<NewPartPage />)
    fireEvent.click(screen.getByText('Salva Ricambio'))
    await waitFor(() =>
      expect(screen.getByText('Il nome è obbligatorio')).toBeInTheDocument(),
    )
  })

  it('submit senza SKU mostra errore', async () => {
    render(<NewPartPage />)
    fireEvent.change(screen.getByPlaceholderText('Es. Pastiglie freno anteriori'), {
      target: { value: 'Pastiglie' },
    })
    fireEvent.click(screen.getByText('Salva Ricambio'))
    await waitFor(() =>
      expect(screen.getByText('Lo SKU è obbligatorio')).toBeInTheDocument(),
    )
  })

  // --- Successful submit ---

  it('submit valido chiama router.push e toast.success', async () => {
    setupFetch()
    render(<NewPartPage />)
    fireEvent.change(screen.getByPlaceholderText('Es. Pastiglie freno anteriori'), {
      target: { value: 'Filtro Olio' },
    })
    fireEvent.change(screen.getByPlaceholderText('Es. BRK-PAD-001'), {
      target: { value: 'FLT-OIL-001' },
    })
    fireEvent.click(screen.getByText('Salva Ricambio'))
    await waitFor(() =>
      expect(mockRouterPush).toHaveBeenCalledWith('/dashboard/parts/part-new'),
    )
    expect(toast.success).toHaveBeenCalledWith('Ricambio creato con successo')
  })

  it('fetch fornitori che rigetta non causa crash', async () => {
    mockFetch.mockRejectedValue(new Error('network'))
    render(<NewPartPage />)
    await new Promise(r => setTimeout(r, 50))
    expect(screen.getByText('Nuovo Ricambio')).toBeInTheDocument()
  })

  it('errore API mostra submitError', async () => {
    setupFetch(false)
    render(<NewPartPage />)
    fireEvent.change(screen.getByPlaceholderText('Es. Pastiglie freno anteriori'), {
      target: { value: 'Filtro Olio' },
    })
    fireEvent.change(screen.getByPlaceholderText('Es. BRK-PAD-001'), {
      target: { value: 'FLT-OIL-001' },
    })
    fireEvent.click(screen.getByText('Salva Ricambio'))
    await waitFor(() =>
      expect(screen.getByText('Limite piano raggiunto')).toBeInTheDocument(),
    )
    expect(toast.error).toHaveBeenCalledWith('Limite piano raggiunto')
  })
})
