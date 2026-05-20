import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

// ---- Navigation ----
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}))

// ---- framer-motion ----
jest.mock('framer-motion', () => {
  const React = require('react')
  return {
    motion: new Proxy({}, {
      get: (_t: unknown, prop: string) =>
        ({ children, ...rest }: { children?: React.ReactNode; [k: string]: unknown }) => {
          const valid: Record<string, unknown> = {}
          for (const k of Object.keys(rest)) {
            if (['className', 'style'].includes(k)) valid[k] = rest[k]
          }
          return React.createElement('div', valid, children)
        },
    }),
  }
})

// ---- lucide-react ----
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

// ---- sonner ----
const mockToastSuccess = jest.fn()
const mockToastError = jest.fn()
jest.mock('sonner', () => ({
  toast: {
    success: (...a: unknown[]) => mockToastSuccess(...a),
    error: (...a: unknown[]) => mockToastError(...a),
  },
}))

// ---- UI ----
jest.mock('@/components/ui/apple-card', () => ({
  AppleCard: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  AppleCardContent: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  AppleCardHeader: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
}))

jest.mock('@/components/ui/apple-button', () => ({
  AppleButton: ({
    children,
    onClick,
    disabled,
    loading,
    type,
    icon,
  }: {
    children?: React.ReactNode
    onClick?: () => void
    disabled?: boolean
    loading?: boolean
    type?: 'button' | 'submit' | 'reset'
    icon?: React.ReactNode
  }) =>
    React.createElement('button', { onClick, disabled: disabled || loading, type: type ?? 'button' }, icon, children),
}))

jest.mock('@/components/ui/input', () => ({
  Input: React.forwardRef((props: React.InputHTMLAttributes<HTMLInputElement>, ref: React.Ref<HTMLInputElement>) =>
    React.createElement('input', { ...props, ref }),
  ),
}))

jest.mock('@/components/ui/breadcrumb', () => ({
  Breadcrumb: ({ items }: { items: { label: string }[] }) =>
    React.createElement('nav', null, ...items.map(i => React.createElement('span', { key: i.label }, i.label))),
}))

// ---- fetch mock ----
const mockFetch = jest.fn()
global.fetch = mockFetch

import NewVehiclePage from '@/app/dashboard/vehicles/new/page'

beforeEach(() => {
  mockPush.mockClear()
  mockFetch.mockClear()
  mockToastSuccess.mockClear()
  mockToastError.mockClear()
  global.fetch = mockFetch
})

describe('NewVehiclePage', () => {
  describe('rendering iniziale', () => {
    it('mostra titolo Nuovo Veicolo', () => {
      render(<NewVehiclePage />)
      expect(screen.getAllByText('Nuovo Veicolo').length).toBeGreaterThan(0)
    })

    it('mostra sezione Dati Veicolo', () => {
      render(<NewVehiclePage />)
      expect(screen.getByText('Dati Veicolo')).toBeInTheDocument()
    })

    it('mostra sezione Proprietario', () => {
      render(<NewVehiclePage />)
      expect(screen.getAllByText(/Proprietario/).length).toBeGreaterThan(0)
    })

    it('mostra campo Targa', () => {
      render(<NewVehiclePage />)
      expect(screen.getByPlaceholderText('AB123CD')).toBeInTheDocument()
    })

    it('mostra campo VIN', () => {
      render(<NewVehiclePage />)
      expect(screen.getByPlaceholderText('17 caratteri')).toBeInTheDocument()
    })

    it('mostra campo Marca', () => {
      render(<NewVehiclePage />)
      expect(screen.getByPlaceholderText('es. Fiat')).toBeInTheDocument()
    })

    it('mostra campo Modello', () => {
      render(<NewVehiclePage />)
      expect(screen.getByPlaceholderText('es. Panda')).toBeInTheDocument()
    })

    it('mostra select carburante con opzione Seleziona', () => {
      render(<NewVehiclePage />)
      expect(screen.getByText('Seleziona...')).toBeInTheDocument()
    })

    it('mostra tutte le opzioni carburante', () => {
      render(<NewVehiclePage />)
      expect(screen.getByText('Benzina')).toBeInTheDocument()
      expect(screen.getByText('Diesel')).toBeInTheDocument()
      expect(screen.getByText('Elettrico')).toBeInTheDocument()
    })

    it('mostra bottone Salva Veicolo', () => {
      render(<NewVehiclePage />)
      expect(screen.getByText('Salva Veicolo')).toBeInTheDocument()
    })

    it('mostra bottone Annulla', () => {
      render(<NewVehiclePage />)
      expect(screen.getAllByText('Annulla').length).toBeGreaterThan(0)
    })

    it('mostra bottone Torna ai Veicoli', () => {
      render(<NewVehiclePage />)
      expect(screen.getByText('Torna ai Veicoli')).toBeInTheDocument()
    })

    it('mostra campo ricerca proprietario', () => {
      render(<NewVehiclePage />)
      expect(screen.getByPlaceholderText('Cerca per nome o email...')).toBeInTheDocument()
    })
  })

  describe('breadcrumb', () => {
    it('mostra breadcrumb con Veicoli', () => {
      render(<NewVehiclePage />)
      expect(screen.getByText('Veicoli')).toBeInTheDocument()
    })
  })

  describe('click Annulla naviga ai veicoli', () => {
    it('click Torna ai Veicoli naviga a /dashboard/vehicles', () => {
      render(<NewVehiclePage />)
      fireEvent.click(screen.getByText('Torna ai Veicoli'))
      expect(mockPush).toHaveBeenCalledWith('/dashboard/vehicles')
    })

    it('click Annulla naviga a /dashboard/vehicles', () => {
      render(<NewVehiclePage />)
      fireEvent.click(screen.getAllByText('Annulla')[0])
      expect(mockPush).toHaveBeenCalledWith('/dashboard/vehicles')
    })
  })

  describe('ricerca proprietario', () => {
    it('query < 2 caratteri non fa fetch', async () => {
      render(<NewVehiclePage />)
      const input = screen.getByPlaceholderText('Cerca per nome o email...')
      fireEvent.change(input, { target: { value: 'A' } })
      await new Promise(r => setTimeout(r, 350))
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('query >= 2 caratteri fa fetch dopo debounce', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: [{ id: 'c-1', firstName: 'Mario', lastName: 'Rossi', email: 'mario@test.com' }],
        }),
      })
      render(<NewVehiclePage />)
      const input = screen.getByPlaceholderText('Cerca per nome o email...')
      fireEvent.change(input, { target: { value: 'Ma' } })
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/customers?search=Ma')
      }, { timeout: 600 })
    })

    it('mostra risultati nel dropdown', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: [{ id: 'c-1', firstName: 'Mario', lastName: 'Rossi', email: 'mario@test.com' }],
        }),
      })
      render(<NewVehiclePage />)
      const input = screen.getByPlaceholderText('Cerca per nome o email...')
      fireEvent.change(input, { target: { value: 'Mario' } })
      await waitFor(() => {
        expect(screen.getByText('Mario Rossi')).toBeInTheDocument()
      }, { timeout: 600 })
    })

    it('click su cliente nel dropdown lo seleziona', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: [{ id: 'c-1', firstName: 'Mario', lastName: 'Rossi', email: 'mario@test.com' }],
        }),
      })
      render(<NewVehiclePage />)
      const input = screen.getByPlaceholderText('Cerca per nome o email...')
      fireEvent.change(input, { target: { value: 'Mario' } })
      await waitFor(() => screen.getByText('Mario Rossi'), { timeout: 600 })
      fireEvent.click(screen.getByText('Mario Rossi'))
      expect(screen.getByText(/Proprietario selezionato:/)).toBeInTheDocument()
    })

    it('errore fetch non mostra dropdown', async () => {
      mockFetch.mockResolvedValue({ ok: false })
      render(<NewVehiclePage />)
      const input = screen.getByPlaceholderText('Cerca per nome o email...')
      fireEvent.change(input, { target: { value: 'Mario' } })
      await new Promise(r => setTimeout(r, 400))
      expect(screen.queryByText('Mario Rossi')).not.toBeInTheDocument()
    })

    it('accetta risposta senza data wrapper', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue([{ id: 'c-1', firstName: 'Luigi', lastName: 'Verdi', email: 'luigi@test.com' }]),
      })
      render(<NewVehiclePage />)
      const input = screen.getByPlaceholderText('Cerca per nome o email...')
      fireEvent.change(input, { target: { value: 'Luigi' } })
      await waitFor(() => {
        expect(screen.getByText('Luigi Verdi')).toBeInTheDocument()
      }, { timeout: 600 })
    })
  })

  describe('submit form', () => {
    async function fillAndSubmit() {
      render(<NewVehiclePage />)

      // Fill mandatory fields
      fireEvent.change(screen.getByPlaceholderText('AB123CD'), { target: { value: 'AB123CD' } })
      fireEvent.change(screen.getByPlaceholderText('es. Fiat'), { target: { value: 'Fiat' } })
      fireEvent.change(screen.getByPlaceholderText('es. Panda'), { target: { value: 'Panda' } })

      // Select carburante
      const selects = screen.getAllByRole('combobox')
      const fuelSelect = selects[0]
      fireEvent.change(fuelSelect, { target: { value: 'Benzina' } })

      // Select customer via search
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            data: [{ id: 'c-1', firstName: 'Mario', lastName: 'Rossi', email: 'mario@test.com' }],
          }),
        })

      const customerInput = screen.getByPlaceholderText('Cerca per nome o email...')
      fireEvent.change(customerInput, { target: { value: 'Mario' } })
      await waitFor(() => screen.getByText('Mario Rossi'), { timeout: 600 })
      fireEvent.click(screen.getByText('Mario Rossi'))

      // Submit
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: { id: 'new-v-id' } }),
      })
      fireEvent.click(screen.getByText('Salva Veicolo'))
    }

    it('submit successo mostra toast e naviga al dettaglio', async () => {
      await fillAndSubmit()
      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith(
          'Veicolo creato con successo',
          expect.any(Object),
        )
      }, { timeout: 1000 })
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard/vehicles/new-v-id')
      })
    })

    it('submit errore mostra toast error', async () => {
      render(<NewVehiclePage />)
      fireEvent.change(screen.getByPlaceholderText('AB123CD'), { target: { value: 'AB123CD' } })
      fireEvent.change(screen.getByPlaceholderText('es. Fiat'), { target: { value: 'Fiat' } })
      fireEvent.change(screen.getByPlaceholderText('es. Panda'), { target: { value: 'Panda' } })
      const selects = screen.getAllByRole('combobox')
      fireEvent.change(selects[0], { target: { value: 'Benzina' } })

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ data: [{ id: 'c-1', firstName: 'Mario', lastName: 'Rossi' }] }),
        })
      const customerInput = screen.getByPlaceholderText('Cerca per nome o email...')
      fireEvent.change(customerInput, { target: { value: 'Mario' } })
      await waitFor(() => screen.getByText('Mario Rossi'), { timeout: 600 })
      fireEvent.click(screen.getByText('Mario Rossi'))

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValue({ message: 'Veicolo già esistente' }),
      })
      fireEvent.click(screen.getByText('Salva Veicolo'))
      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Veicolo già esistente')
      }, { timeout: 1000 })
    })

    it('submit con risposta senza id naviga a /dashboard/vehicles', async () => {
      render(<NewVehiclePage />)
      fireEvent.change(screen.getByPlaceholderText('AB123CD'), { target: { value: 'AB123CD' } })
      fireEvent.change(screen.getByPlaceholderText('es. Fiat'), { target: { value: 'Fiat' } })
      fireEvent.change(screen.getByPlaceholderText('es. Panda'), { target: { value: 'Panda' } })
      const selects = screen.getAllByRole('combobox')
      fireEvent.change(selects[0], { target: { value: 'Benzina' } })

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ data: [{ id: 'c-1', firstName: 'Mario', lastName: 'Rossi' }] }),
        })
      const customerInput = screen.getByPlaceholderText('Cerca per nome o email...')
      fireEvent.change(customerInput, { target: { value: 'Mario' } })
      await waitFor(() => screen.getByText('Mario Rossi'), { timeout: 600 })
      fireEvent.click(screen.getByText('Mario Rossi'))

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: {} }), // no id
      })
      fireEvent.click(screen.getByText('Salva Veicolo'))
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard/vehicles')
      }, { timeout: 1000 })
    })
  })

  describe('dropdown comportamento', () => {
    it('focus sull\'input apre dropdown', () => {
      render(<NewVehiclePage />)
      const input = screen.getByPlaceholderText('Cerca per nome o email...')
      fireEvent.focus(input)
      // No crash
    })

    it('cambiare input dopo selezione resetta il cliente', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: [{ id: 'c-1', firstName: 'Mario', lastName: 'Rossi', email: 'mario@test.com' }],
        }),
      })
      render(<NewVehiclePage />)
      const input = screen.getByPlaceholderText('Cerca per nome o email...')
      fireEvent.change(input, { target: { value: 'Mario' } })
      await waitFor(() => screen.getByText('Mario Rossi'), { timeout: 600 })
      fireEvent.click(screen.getByText('Mario Rossi'))
      expect(screen.getByText(/Proprietario selezionato:/)).toBeInTheDocument()

      // Now change input to reset — use fireEvent.input which React's onChange listens to
      const input2 = screen.getByPlaceholderText('Cerca per nome o email...')
      fireEvent.input(input2, { target: { value: 'Luig' } })
      await waitFor(() => {
        expect(screen.queryByText(/Proprietario selezionato:/)).not.toBeInTheDocument()
      }, { timeout: 500 })
    })

    it('cliente senza nome mostra "Cliente senza nome"', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: [{ id: 'c-2' }], // no firstName/lastName
        }),
      })
      render(<NewVehiclePage />)
      const input = screen.getByPlaceholderText('Cerca per nome o email...')
      fireEvent.change(input, { target: { value: 'test' } })
      await waitFor(() => {
        expect(screen.getByText('Cliente senza nome')).toBeInTheDocument()
      }, { timeout: 600 })
    })
  })
})
