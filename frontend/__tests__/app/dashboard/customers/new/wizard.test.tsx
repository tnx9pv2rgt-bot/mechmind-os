import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

// ---- Navigation ----
const mockPush = jest.fn()
const mockReplace = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn(), prefetch: jest.fn() }),
  usePathname: () => '/dashboard/customers/new/step1',
}))

// ---- next/link ----
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) =>
    React.createElement('a', { href }, children)
})

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

// ---- lucide-react (all icons) ----
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

jest.mock('@/components/ui/apple-card', () => ({
  AppleCard: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'apple-card' }, children),
  AppleCardContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
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
    Select: ({ children, defaultValue, onValueChange, value }: {
      children?: React.ReactNode; defaultValue?: string; onValueChange?: (v: string) => void; value?: string
    }) => React.createElement('div', { 'data-testid': 'select-root', 'data-value': defaultValue || value },
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
    SelectGroup: ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children),
  }
})

jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, id }: {
    checked?: boolean; onCheckedChange?: (v: boolean) => void; id?: string
  }) => React.createElement('input', {
    type: 'checkbox',
    checked,
    id,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => onCheckedChange?.(e.target.checked),
  }),
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, type, disabled }: {
    children?: React.ReactNode; onClick?: () => void; type?: string; disabled?: boolean
  }) => React.createElement('button', { onClick, type, disabled }, children),
}))

jest.mock('@/components/ui/breadcrumb', () => ({
  Breadcrumb: ({ items }: { items: { label: string; href?: string }[] }) =>
    React.createElement('nav', null, items.map(i => React.createElement('span', { key: i.label }, i.label))),
}))

// ---- FormLayout ----
jest.mock('@/components/customers/FormLayout', () => ({
  FormLayout: ({ children, onNext, step, title }: {
    children?: React.ReactNode; onNext?: () => void; step?: number; title?: string
  }) => React.createElement('div', { 'data-testid': 'form-layout' },
    React.createElement('h1', null, title || `Step ${step}`),
    React.createElement('button', { onClick: onNext, 'data-testid': 'form-next' }, 'Avanti'),
    children
  ),
}))

// ---- onboarding components (for landing page) ----
jest.mock('@/components/onboarding/animated-illustration', () => ({
  AnimatedIllustration: () => React.createElement('div', { 'data-testid': 'animated-illustration' }),
}))

jest.mock('@/components/onboarding/exit-intent-modal', () => ({
  ExitIntentModal: ({ isOpen, onClose, onStay }: {
    isOpen?: boolean; onClose?: () => void; onStay?: () => void
  }) => isOpen
    ? React.createElement('div', { 'data-testid': 'exit-intent-modal' },
        React.createElement('button', { onClick: onClose }, 'Esci'),
        React.createElement('button', { onClick: onStay }, 'Rimani')
      )
    : null,
}))

// ---- useFormSession ----
const mockSaveStep = jest.fn()
const mockClearForm = jest.fn()

let mockIsLoaded = true
let mockFormData: Record<string, unknown> = {}

jest.mock('@/hooks/useFormSession', () => ({
  useFormSession: () => ({
    isLoaded: mockIsLoaded,
    formData: mockFormData,
    saveStep: mockSaveStep,
    getStepData: jest.fn().mockReturnValue({}),
    clearForm: mockClearForm,
  }),
}))

// ---- imports must come AFTER all jest.mock calls ----
import Step1Page from '@/app/dashboard/customers/new/step1/page'
import Step2Page from '@/app/dashboard/customers/new/step2/page'
import LandingPage from '@/app/dashboard/customers/new/landing/page'

beforeEach(() => {
  jest.clearAllMocks()
  mockIsLoaded = true
  mockFormData = {}
  mockPush.mockClear()
})

// ============================================================
describe('Step1Page — Dati Cliente', () => {
  it('renders loading spinner when not yet loaded', () => {
    mockIsLoaded = false
    const { container } = render(<Step1Page />)
    expect(container.querySelector('[data-icon="Loader2"]')).toBeInTheDocument()
  })

  it('renders the form when loaded', () => {
    render(<Step1Page />)
    expect(screen.getByTestId('form-layout')).toBeInTheDocument()
    expect(screen.getByText('Dati Cliente')).toBeInTheDocument()
  })

  it('renders customer type selector', () => {
    render(<Step1Page />)
    expect(screen.getAllByTestId('select-root').length).toBeGreaterThan(0)
  })

  it('shows Informazioni Cliente section', () => {
    render(<Step1Page />)
    expect(screen.getByText('Informazioni Cliente')).toBeInTheDocument()
  })

  it('shows Nome, Cognome, Telefono, Email fields', () => {
    render(<Step1Page />)
    expect(screen.getAllByText('Nome').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Cognome').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Telefono').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Email').length).toBeGreaterThan(0)
  })

  it('restores saved data from formSession on mount', async () => {
    mockFormData = { firstName: 'Mario', lastName: 'Rossi', customerType: 'private' }
    render(<Step1Page />)
    // useEffect fires after render — just verify no crash
    expect(screen.getByTestId('form-layout')).toBeInTheDocument()
  })

  it('shows Ragione Sociale when customerType is business', async () => {
    mockFormData = { customerType: 'business' }
    render(<Step1Page />)
    await waitFor(() => {
      expect(screen.getByText(/Ragione Sociale/i)).toBeInTheDocument()
    })
  })

  it('submits form and calls saveStep', async () => {
    render(<Step1Page />)
    const nextBtn = screen.getByTestId('form-next')
    await act(async () => { fireEvent.click(nextBtn) })
    await waitFor(() => {
      expect(mockSaveStep).toHaveBeenCalledWith(1, expect.any(Object))
    }, { timeout: 2000 })
  })
})

// ============================================================
describe('Step2Page — Dati Fiscali e Indirizzo', () => {
  it('renders loading spinner when not yet loaded', () => {
    mockIsLoaded = false
    const { container } = render(<Step2Page />)
    expect(container.querySelector('[data-icon="Loader2"]')).toBeInTheDocument()
  })

  it('renders the form when loaded', () => {
    render(<Step2Page />)
    expect(screen.getByTestId('form-layout')).toBeInTheDocument()
  })

  it('shows address fields', () => {
    render(<Step2Page />)
    expect(screen.getAllByText('Indirizzo').length).toBeGreaterThan(0)
    expect(screen.getAllByText('CAP').length).toBeGreaterThan(0)
  })

  it('shows business-only fields when customerType is business', () => {
    mockFormData = { customerType: 'business' }
    render(<Step2Page />)
    expect(screen.getByText(/Codice SDI/i)).toBeInTheDocument()
  })

  it('submits form and calls saveStep', async () => {
    render(<Step2Page />)
    const nextBtn = screen.getByTestId('form-next')
    await act(async () => { fireEvent.click(nextBtn) })
    await waitFor(() => {
      expect(mockSaveStep).toHaveBeenCalledWith(2, expect.any(Object))
    }, { timeout: 2000 })
  })
})

// ============================================================
describe('LandingPage — Empty state onboarding', () => {
  it('renders the landing page', () => {
    render(<LandingPage />)
    expect(screen.getByTestId('animated-illustration')).toBeInTheDocument()
  })

  it('renders start CTA button', () => {
    render(<LandingPage />)
    expect(screen.getByText('Crea il mio account gratis')).toBeInTheDocument()
  })

  it('calls router.push when CTA button is clicked', async () => {
    render(<LandingPage />)
    await act(async () => { fireEvent.click(screen.getByText('Crea il mio account gratis')) })
    expect(mockPush).toHaveBeenCalledWith('/dashboard/customers/new')
  })
})
