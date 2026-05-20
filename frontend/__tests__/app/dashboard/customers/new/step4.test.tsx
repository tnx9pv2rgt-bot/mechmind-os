import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ---- Navigation ----
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn(), prefetch: jest.fn() }),
  usePathname: () => '/dashboard/customers/new/step4',
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

jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, id, 'aria-invalid': invalid }: {
    checked?: boolean; onCheckedChange?: (v: boolean) => void; id?: string; 'aria-invalid'?: boolean
  }) => React.createElement('input', {
    type: 'checkbox',
    checked,
    id,
    'aria-invalid': invalid,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => onCheckedChange?.(e.target.checked),
  }),
}))

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor, className }: { children?: React.ReactNode; htmlFor?: string; className?: string }) =>
    React.createElement('label', { htmlFor, className }, children),
}))

// ---- FormLayout ----
jest.mock('@/components/customers/FormLayout', () => ({
  FormLayout: ({ children, onNext, onBack, step, title }: {
    children?: React.ReactNode; onNext?: () => void; onBack?: () => void; step?: number; title?: string
  }) => React.createElement('div', { 'data-testid': 'form-layout' },
    React.createElement('h1', null, title || `Step ${step}`),
    onBack ? React.createElement('button', { onClick: onBack, 'data-testid': 'form-back' }, 'Indietro') : null,
    React.createElement('button', { onClick: onNext, 'data-testid': 'form-next' }, 'Salva'),
    children
  ),
}))

// ---- useApi ----
const mockCreateCustomerMutateAsync = jest.fn()
const mockCreateVehicleMutateAsync = jest.fn()
jest.mock('@/hooks/useApi', () => ({
  useCreateCustomer: () => ({ mutateAsync: mockCreateCustomerMutateAsync }),
  useCreateVehicle: () => ({ mutateAsync: mockCreateVehicleMutateAsync }),
}))

// ---- useFormSession ----
const mockClearForm = jest.fn()
let mockIsLoaded = true
let mockFormData: Record<string, unknown> = {}

jest.mock('@/hooks/useFormSession', () => ({
  useFormSession: () => ({
    isLoaded: mockIsLoaded,
    formData: mockFormData,
    saveStep: jest.fn(),
    getStepData: jest.fn().mockReturnValue({}),
    clearForm: mockClearForm,
  }),
}))

// ---- imports AFTER mocks ----
import Step4Page from '@/app/dashboard/customers/new/step4/page'

const baseFormData = {
  firstName: 'Mario',
  lastName: 'Rossi',
  phone: '3331234567',
  email: 'mario@test.it',
  customerType: 'private',
  marketingConsent: false,
  vehicles: [{ plate: 'AB123CD', make: 'Fiat', model: '500' }],
}

beforeEach(() => {
  jest.clearAllMocks()
  mockIsLoaded = true
  mockFormData = { ...baseFormData }
  mockPush.mockClear()
  mockCreateCustomerMutateAsync.mockResolvedValue({ id: 'cust-1' })
  mockCreateVehicleMutateAsync.mockResolvedValue({ id: 'veh-1' })
})

describe('Step4Page — Riepilogo', () => {
  it('renders loading spinner when not yet loaded', () => {
    mockIsLoaded = false
    mockFormData = { ...baseFormData }
    const { container } = render(<Step4Page />)
    expect(container.querySelector('[data-icon="Loader2"]')).toBeInTheDocument()
  })

  it('redirects to step1 when formData is empty', async () => {
    mockFormData = {}
    render(<Step4Page />)
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard/customers/new/step1')
    })
  })

  it('renders the form layout with summary data', () => {
    render(<Step4Page />)
    expect(screen.getByTestId('form-layout')).toBeInTheDocument()
    expect(screen.getByText('Riepilogo')).toBeInTheDocument()
  })

  it('shows Riepilogo Dati section header', () => {
    render(<Step4Page />)
    expect(screen.getByText('Riepilogo Dati')).toBeInTheDocument()
  })

  it('shows Anagrafica section', () => {
    render(<Step4Page />)
    expect(screen.getByText('Anagrafica')).toBeInTheDocument()
  })

  it('displays customer name from formData', () => {
    render(<Step4Page />)
    expect(screen.getByText(/Mario.*Rossi|Rossi.*Mario/)).toBeInTheDocument()
  })

  it('shows Consenso Trattamento Dati section', () => {
    render(<Step4Page />)
    expect(screen.getByText('Consenso Trattamento Dati')).toBeInTheDocument()
  })

  it('shows GDPR checkbox', () => {
    render(<Step4Page />)
    expect(document.querySelector('#gdprConsent')).toBeInTheDocument()
  })

  it('shows GDPR error when submitting without accepting', async () => {
    render(<Step4Page />)
    const saveBtn = screen.getByTestId('form-next')
    await act(async () => { fireEvent.click(saveBtn) })
    await waitFor(() => {
      expect(screen.getByText('Devi accettare il trattamento dei dati per procedere')).toBeInTheDocument()
    })
  })

  it('shows success view after successful submission with GDPR accepted', async () => {
    const user = userEvent.setup()
    render(<Step4Page />)
    const checkbox = document.querySelector('#gdprConsent') as HTMLInputElement
    await user.click(checkbox)

    await user.click(screen.getByTestId('form-next'))

    await waitFor(() => {
      expect(screen.getByText('Cliente Creato!')).toBeInTheDocument()
    }, { timeout: 5000 })

    expect(mockToastSuccess).toHaveBeenCalledWith('Cliente creato con successo!')
    expect(mockClearForm).toHaveBeenCalled()
  })

  it('shows Vai ai Clienti button on success and navigates', async () => {
    const user = userEvent.setup()
    render(<Step4Page />)
    const checkbox = document.querySelector('#gdprConsent') as HTMLInputElement
    await user.click(checkbox)
    await user.click(screen.getByTestId('form-next'))

    await waitFor(() => {
      expect(screen.getByText('Vai ai Clienti')).toBeInTheDocument()
    }, { timeout: 5000 })

    fireEvent.click(screen.getByText('Vai ai Clienti'))
    expect(mockPush).toHaveBeenCalledWith('/dashboard/customers')
  })

  it('shows error message when API call fails', async () => {
    const user = userEvent.setup()
    mockCreateCustomerMutateAsync.mockRejectedValue(new Error('Network error'))
    render(<Step4Page />)
    const checkbox = document.querySelector('#gdprConsent') as HTMLInputElement
    await user.click(checkbox)
    await user.click(screen.getByTestId('form-next'))

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Network error')
    }, { timeout: 5000 })
  })

  it('shows business-specific fields when customerType is business', () => {
    mockFormData = {
      ...baseFormData,
      customerType: 'business',
      companyName: 'Rossi Srl',
      vatNumber: '12345678901',
    }
    render(<Step4Page />)
    expect(screen.getByText('Azienda')).toBeInTheDocument()
  })

  it('shows doNotCall restriction in summary', () => {
    mockFormData = { ...baseFormData, doNotCall: true }
    render(<Step4Page />)
    expect(screen.getByText('Non chiamare')).toBeInTheDocument()
  })

  it('navigates back when back button is clicked', async () => {
    render(<Step4Page />)
    const backBtn = screen.getByTestId('form-back')
    await act(async () => { fireEvent.click(backBtn) })
    expect(mockPush).toHaveBeenCalledWith('/dashboard/customers/new/step3')
  })

  it('shows phone validation error toast when phone is missing', async () => {
    mockFormData = { ...baseFormData, phone: '' }
    render(<Step4Page />)
    await act(async () => { fireEvent.click(screen.getByTestId('form-next')) })
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Il numero di telefono è obbligatorio')
    })
  })

  it('shows Crea Nuovo Cliente button after success', async () => {
    const user = userEvent.setup()
    render(<Step4Page />)
    const checkbox = document.querySelector('#gdprConsent') as HTMLInputElement
    await user.click(checkbox)
    await user.click(screen.getByTestId('form-next'))
    await waitFor(() => {
      expect(screen.getByText('Crea Nuovo Cliente')).toBeInTheDocument()
    }, { timeout: 5000 })
    fireEvent.click(screen.getByText('Crea Nuovo Cliente'))
    expect(screen.getByText('Crea Nuovo Cliente')).toBeInTheDocument()
  })

  it('renders optional personal fields when present', () => {
    mockFormData = {
      ...baseFormData,
      title: 'Sig.',
      dateOfBirth: '1980-01-01',
      gender: 'M',
      maritalStatus: 'celibe',
      sdiCode: 'ABC1234',
      preferredChannel: 'email',
      language: 'it',
      source: 'web',
      tags: 'vip',
      doNotEmail: true,
      notes: 'Cliente importante',
      marketingConsent: true,
    }
    render(<Step4Page />)
    expect(screen.getByText('Sig.')).toBeInTheDocument()
    expect(screen.getByText('Non inviare email')).toBeInTheDocument()
    expect(screen.getByText('Cliente importante')).toBeInTheDocument()
    expect(screen.getByText('Consenso dato')).toBeInTheDocument()
  })

  it('covers optional field branches on submission', async () => {
    const user = userEvent.setup()
    mockFormData = {
      ...baseFormData,
      address: 'Via Roma 1',
      city: 'Roma',
      province: 'RM',
      zipCode: '00100',
      fiscalCode: 'RSSMRA80A01H703Z',
      vatNumber: '12345678901',
      sdiCode: 'ABC1234',
      companyName: 'Rossi Srl',
      notes: 'Note di test',
      vehicles: [{ plate: '', make: '', model: '', km: 0 }],
    }
    render(<Step4Page />)
    const checkbox = document.querySelector('#gdprConsent') as HTMLInputElement
    await user.click(checkbox)
    await user.click(screen.getByTestId('form-next'))
    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith('Cliente creato con successo!')
    }, { timeout: 5000 })
  })
})
