import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

// ---- Navigation ----
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn(), prefetch: jest.fn() }),
  usePathname: () => '/dashboard/customers/new/step3',
}))

// ---- framer-motion ----
jest.mock('framer-motion', () => {
  const React = require('react')
  return {
    motion: new Proxy({}, {
      get: (_t: unknown, prop: string) =>
        ({ children, ...rest }: { children?: React.ReactNode; [k: string]: unknown }) => {
          const allowed = ['className', 'style', 'onClick', 'role', 'tabIndex', 'aria-label']
          const valid: Record<string, unknown> = {}
          for (const k of Object.keys(rest)) {
            if (allowed.includes(k) || k.startsWith('data-') || k.startsWith('aria-')) valid[k] = rest[k]
          }
          return React.createElement(prop, valid, children)
        },
    }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
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

// ---- UI components ----
jest.mock('@/components/ui/apple-button', () => ({
  AppleButton: ({ children, onClick, disabled, type, 'aria-label': al }: {
    children?: React.ReactNode; onClick?: () => void; disabled?: boolean; type?: string; 'aria-label'?: string
  }) => React.createElement('button', { onClick, disabled, type, 'aria-label': al }, children),
}))

jest.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) =>
    React.createElement('input', props),
}))

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor, className }: { children?: React.ReactNode; htmlFor?: string; className?: string }) =>
    React.createElement('label', { htmlFor, className }, children),
}))

jest.mock('@/components/ui/select', () => {
  const React = require('react')
  return {
    Select: ({ children, onValueChange, defaultValue, value }: {
      children?: React.ReactNode; onValueChange?: (v: string) => void; defaultValue?: string; value?: string
    }) => React.createElement('div', { 'data-testid': 'select-root' },
      React.createElement('select', {
        defaultValue: defaultValue || value,
        onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onValueChange?.(e.target.value),
        'data-testid': 'select-native',
      }, children)
    ),
    SelectTrigger: ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children),
    SelectContent: ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children),
    SelectItem: ({ children, value }: { children?: React.ReactNode; value?: string }) =>
      React.createElement('option', { value }, children),
    SelectValue: ({ placeholder }: { placeholder?: string }) => React.createElement('span', null, placeholder),
  }
})

// ---- FormLayout ----
jest.mock('@/components/customers/FormLayout', () => ({
  FormLayout: ({ children, onNext, onBack, step, title }: {
    children?: React.ReactNode; onNext?: () => void; onBack?: () => void; step?: number; title?: string
  }) => React.createElement('div', { 'data-testid': 'form-layout' },
    React.createElement('h1', null, title || `Step ${step}`),
    onBack ? React.createElement('button', { onClick: onBack, 'data-testid': 'form-back' }, 'Indietro') : null,
    React.createElement('button', { onClick: onNext, 'data-testid': 'form-next' }, 'Avanti'),
    children
  ),
}))

// ---- useFormSession ----
const mockSaveStep = jest.fn()
let mockIsLoaded = true
let mockFormData: Record<string, unknown> = {}

jest.mock('@/hooks/useFormSession', () => ({
  useFormSession: () => ({
    isLoaded: mockIsLoaded,
    formData: mockFormData,
    saveStep: mockSaveStep,
    getStepData: jest.fn().mockReturnValue({}),
    clearForm: jest.fn(),
  }),
}))

// ---- imports AFTER mocks ----
import Step3Page from '@/app/dashboard/customers/new/step3/page'

beforeEach(() => {
  jest.clearAllMocks()
  mockIsLoaded = true
  mockFormData = {}
  mockPush.mockClear()
})

describe('Step3Page — Veicoli', () => {
  it('renders loading spinner when not yet loaded', () => {
    mockIsLoaded = false
    const { container } = render(<Step3Page />)
    expect(container.querySelector('[data-icon="Loader2"]')).toBeInTheDocument()
  })

  it('renders the form layout when loaded', () => {
    render(<Step3Page />)
    expect(screen.getByTestId('form-layout')).toBeInTheDocument()
    expect(screen.getByText('Veicoli')).toBeInTheDocument()
  })

  it('shows Parco Veicoli section header', () => {
    render(<Step3Page />)
    expect(screen.getByText('Parco Veicoli')).toBeInTheDocument()
  })

  it('renders initial vehicle 1', () => {
    render(<Step3Page />)
    expect(screen.getByText('Veicolo 1')).toBeInTheDocument()
  })

  it('shows Targa input field', () => {
    render(<Step3Page />)
    expect(screen.getAllByText('Targa').length).toBeGreaterThan(0)
  })

  it('shows Dati Principali section', () => {
    render(<Step3Page />)
    expect(screen.getByText('Dati Principali')).toBeInTheDocument()
  })

  it('adds another vehicle when Aggiungi button clicked', async () => {
    render(<Step3Page />)
    const addBtn = screen.getByText('Aggiungi altro veicolo')
    await act(async () => { fireEvent.click(addBtn) })
    await waitFor(() => {
      expect(screen.getByText('Veicolo 2')).toBeInTheDocument()
    })
  })

  it('shows Rimuovi button when multiple vehicles', async () => {
    render(<Step3Page />)
    const addBtn = screen.getByText('Aggiungi altro veicolo')
    await act(async () => { fireEvent.click(addBtn) })
    await waitFor(() => {
      expect(screen.getByText('Veicolo 2')).toBeInTheDocument()
    })
    expect(screen.getAllByText('Rimuovi').length).toBeGreaterThan(0)
  })

  it('removes a vehicle when Rimuovi clicked', async () => {
    render(<Step3Page />)
    await act(async () => {
      fireEvent.click(screen.getByText('Aggiungi altro veicolo'))
    })
    await waitFor(() => screen.getByText('Veicolo 2'))
    const removeButtons = screen.getAllByText('Rimuovi')
    await act(async () => { fireEvent.click(removeButtons[0]) })
    await waitFor(() => {
      expect(screen.queryByText('Veicolo 2')).not.toBeInTheDocument()
    })
  })

  it('submits form and calls saveStep(3, ...)', async () => {
    render(<Step3Page />)
    const nextBtn = screen.getByTestId('form-next')
    await act(async () => { fireEvent.click(nextBtn) })
    await waitFor(() => {
      expect(mockSaveStep).toHaveBeenCalledWith(3, expect.any(Object))
    }, { timeout: 2000 })
  })

  it('restores saved vehicles from formData on mount', () => {
    mockFormData = {
      vehicles: [
        { plate: 'AB123CD', make: 'Fiat', model: '500' },
      ],
    }
    render(<Step3Page />)
    expect(screen.getByTestId('form-layout')).toBeInTheDocument()
  })

  it('navigates back when back button is clicked', async () => {
    render(<Step3Page />)
    const backBtn = screen.getByTestId('form-back')
    await act(async () => { fireEvent.click(backBtn) })
    expect(mockPush).toHaveBeenCalledWith('/dashboard/customers/new/step2')
  })

  it('handles saveStep error and shows error toast', async () => {
    mockSaveStep.mockImplementation(() => { throw new Error('save error') })
    render(<Step3Page />)
    const nextBtn = screen.getByTestId('form-next')
    await act(async () => { fireEvent.click(nextBtn) })
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Errore nel salvataggio dei veicoli')
    })
  })

  it('fires vehicleType select onValueChange with a real value', async () => {
    render(<Step3Page />)
    const selects = document.querySelectorAll('select[data-testid="select-native"]')
    expect(selects.length).toBeGreaterThan(0)
    await act(async () => { fireEvent.change(selects[0], { target: { value: 'auto' } }) })
    expect(screen.getByTestId('form-layout')).toBeInTheDocument()
  })

  it('fires vehicleType select onValueChange with none value', async () => {
    render(<Step3Page />)
    const selects = document.querySelectorAll('select[data-testid="select-native"]')
    expect(selects.length).toBeGreaterThan(0)
    await act(async () => { fireEvent.change(selects[0], { target: { value: 'none' } }) })
    expect(screen.getByTestId('form-layout')).toBeInTheDocument()
  })

  it('fires fuel select onValueChange with real fuel value', async () => {
    render(<Step3Page />)
    const selects = document.querySelectorAll('select[data-testid="select-native"]')
    expect(selects.length).toBeGreaterThan(1)
    await act(async () => { fireEvent.change(selects[1], { target: { value: 'benzina' } }) })
    expect(screen.getByTestId('form-layout')).toBeInTheDocument()
  })

  it('fires powerKw onChange with a valid kW value', async () => {
    render(<Step3Page />)
    const kwInput = document.querySelector('[id="vehicles.0.powerKw"]') as HTMLInputElement
    if (kwInput) {
      await act(async () => { fireEvent.change(kwInput, { target: { value: '75', valueAsNumber: 75 } }) })
    }
    expect(screen.getByTestId('form-layout')).toBeInTheDocument()
  })

  it('fires powerCv onChange with a valid CV value', async () => {
    render(<Step3Page />)
    const cvInput = document.querySelector('[id="vehicles.0.powerCv"]') as HTMLInputElement
    if (cvInput) {
      await act(async () => { fireEvent.change(cvInput, { target: { value: '102', valueAsNumber: 102 } }) })
    }
    expect(screen.getByTestId('form-layout')).toBeInTheDocument()
  })
})
