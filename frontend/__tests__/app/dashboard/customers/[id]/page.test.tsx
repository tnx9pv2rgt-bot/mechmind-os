import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

// ---- Navigation ----
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn(), prefetch: jest.fn() }),
  useParams: () => ({ id: 'customer-1' }),
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
    motion: new Proxy(
      {},
      {
        get: (_t: unknown, prop: string) =>
          ({ children, ...rest }: { children?: React.ReactNode; [k: string]: unknown }) => {
            const allowed = ['className', 'style', 'onClick', 'role', 'tabIndex', 'aria-label']
            const valid: Record<string, unknown> = {}
            for (const k of Object.keys(rest)) {
              if (allowed.includes(k) || k.startsWith('data-') || k.startsWith('aria-')) valid[k] = rest[k]
            }
            return React.createElement(prop, valid, children)
          },
      }
    ),
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  }
})

// ---- sonner ----
const mockToastSuccess = jest.fn()
const mockToastError = jest.fn()
jest.mock('sonner', () => ({
  toast: { success: (...a: unknown[]) => mockToastSuccess(...a), error: (...a: unknown[]) => mockToastError(...a) },
}))

// ---- UI components ----
jest.mock('@/components/ui/apple-button', () => ({
  AppleButton: ({ children, onClick, icon, loading, disabled, type, 'aria-label': al, variant, size, className }: {
    children?: React.ReactNode; onClick?: () => void; icon?: React.ReactNode; loading?: boolean
    disabled?: boolean; type?: string; 'aria-label'?: string; variant?: string; size?: string; className?: string
  }) =>
    React.createElement('button', { onClick, disabled: disabled || loading, type, 'aria-label': al, className }, icon, children),
}))

jest.mock('@/components/ui/apple-card', () => ({
  AppleCard: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'apple-card' }, children),
  AppleCardContent: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('div', { className }, children),
  AppleCardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('div', { className }, children),
  AppleCardFooter: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}))

jest.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => React.createElement('input', props),
}))

jest.mock('@/components/ui/breadcrumb', () => ({
  Breadcrumb: ({ items }: { items: { label: string; href?: string }[] }) =>
    React.createElement('nav', null, items.map(i => React.createElement('span', { key: i.label }, i.label))),
}))

jest.mock('@/components/ui/confirm-dialog', () => ({
  ConfirmDialog: ({ open, onConfirm, title, onOpenChange }: {
    open: boolean; onConfirm: () => void; title: string; onOpenChange?: (v: boolean) => void
  }) =>
    open
      ? React.createElement('div', { 'data-testid': 'confirm-dialog' },
          React.createElement('p', null, title),
          React.createElement('button', { onClick: onConfirm }, 'Conferma eliminazione'),
          React.createElement('button', { onClick: () => onOpenChange?.(false) }, 'Annulla')
        )
      : null,
}))

// ---- fetch mock ----
const mockFetch = jest.fn()
global.fetch = mockFetch

// ---- Full customer fixture ----
function makeCustomer(overrides = {}) {
  return {
    id: 'customer-1',
    firstName: 'Mario',
    lastName: 'Rossi',
    customerType: 'PERSONA' as const,
    codiceFiscale: 'RSSMRA80A01H501U',
    partitaIva: null,
    sdiCode: null,
    pecEmail: null,
    phone: '3331234567',
    email: 'mario@example.com',
    address: 'Via Roma 1',
    city: 'Roma',
    postalCode: '00100',
    province: 'RM',
    notes: 'Nota test',
    language: 'it',
    preferredContactChannel: 'email',
    acquisitionSource: 'referral',
    loyaltyTier: 'Silver',
    gdprConsentAt: '2024-01-15T10:00:00Z',
    gdprConsentVersion: '2.0',
    marketingConsentAt: '2024-01-15T10:00:00Z',
    vehicles: [
      { id: 'v1', licensePlate: 'AB123CD', make: 'Fiat', model: 'Panda', year: 2020, mileage: 45000 },
    ],
    invoices: [
      { id: 'inv1', number: 'FT2024/001', status: 'PAID', total: 250.0, createdAt: '2024-03-01T00:00:00Z' },
      { id: 'inv2', number: 'FT2024/002', status: 'SENT', total: 150.0, createdAt: '2024-04-01T00:00:00Z' },
    ],
    workOrders: [
      { id: 'wo1', woNumber: 'WO-001', status: 'COMPLETED', totalCost: 300.0, createdAt: '2024-02-01T00:00:00Z' },
    ],
    bookings: [
      { id: 'bk1', scheduledAt: '2024-05-10T09:00:00Z', status: 'confirmed', serviceName: 'Tagliando' },
    ],
    totalSpent: 700.0,
    visitCount: 3,
    createdAt: '2023-01-01T00:00:00Z',
    ...overrides,
  }
}

import CustomerDetailPage from '@/app/dashboard/customers/[id]/page'

beforeEach(() => {
  jest.clearAllMocks()
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => makeCustomer(),
  })
  Object.defineProperty(window, 'print', { value: jest.fn(), writable: true })
})

// Helper: wait for customer to load by checking a unique anchor text
async function waitForCustomerLoaded() {
  await waitFor(() => expect(screen.getByText('Dati Personali')).toBeInTheDocument())
}

// ============================================================
describe('CustomerDetailPage', () => {
  it('renders loading spinner initially', () => {
    mockFetch.mockReturnValue(new Promise(() => {}))
    render(<CustomerDetailPage />)
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('renders error state when fetch fails', async () => {
    mockFetch.mockResolvedValue({ ok: false, json: async () => ({}) })
    render(<CustomerDetailPage />)
    // 'Cliente non trovato' appears in both h2 and p — use heading role
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Cliente non trovato' })).toBeInTheDocument()
    })
    expect(screen.getByText('Torna ai clienti')).toBeInTheDocument()
  })

  it('renders customer name after loading', async () => {
    render(<CustomerDetailPage />)
    // 'Mario Rossi' appears in h1 + breadcrumb span — check at least one exists
    await waitFor(() => {
      expect(screen.getAllByText('Mario Rossi').length).toBeGreaterThan(0)
    })
  })

  it('renders Persona Fisica badge for PERSONA type', async () => {
    render(<CustomerDetailPage />)
    await waitForCustomerLoaded()
    // Appears in type badge + InfoRow — check at least one
    expect(screen.getAllByText('Persona Fisica').length).toBeGreaterThan(0)
  })

  it('renders Azienda badge for AZIENDA type', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => makeCustomer({ customerType: 'AZIENDA' }),
    })
    render(<CustomerDetailPage />)
    await waitForCustomerLoaded()
    expect(screen.getAllByText('Azienda').length).toBeGreaterThan(0)
  })

  it('renders anagrafica tab content by default', async () => {
    render(<CustomerDetailPage />)
    await waitFor(() => {
      expect(screen.getByText('Dati Personali')).toBeInTheDocument()
      expect(screen.getByText('Dati Fiscali')).toBeInTheDocument()
      expect(screen.getByText('Contatti')).toBeInTheDocument()
    })
  })

  it('shows InfoRow data for personal details', async () => {
    render(<CustomerDetailPage />)
    await waitFor(() => {
      expect(screen.getByText('RSSMRA80A01H501U')).toBeInTheDocument()
      expect(screen.getByText('3331234567')).toBeInTheDocument()
    })
  })

  it('shows GDPR consent date when set', async () => {
    render(<CustomerDetailPage />)
    await waitForCustomerLoaded()
    // Check the GDPR consent span exists (text includes date + version)
    expect(screen.getByText(/v2\.0/)).toBeInTheDocument()
  })

  it('shows loyalty tier', async () => {
    render(<CustomerDetailPage />)
    await waitFor(() => {
      expect(screen.getByText('Silver')).toBeInTheDocument()
    })
  })

  it('switches to Veicoli tab', async () => {
    render(<CustomerDetailPage />)
    await waitForCustomerLoaded()

    fireEvent.click(screen.getByText('Veicoli'))
    expect(screen.getByText('Fiat Panda')).toBeInTheDocument()
    expect(screen.getByText(/AB123CD/)).toBeInTheDocument()
    expect(screen.getByText(/45\.000 km/i)).toBeInTheDocument()
  })

  it('shows empty vehicles state', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => makeCustomer({ vehicles: [] }),
    })
    render(<CustomerDetailPage />)
    await waitForCustomerLoaded()

    fireEvent.click(screen.getByText('Veicoli'))
    expect(screen.getByText('Nessun veicolo associato. Aggiungi il primo veicolo.')).toBeInTheDocument()
  })

  it('switches to Storico tab with work orders and bookings', async () => {
    render(<CustomerDetailPage />)
    await waitForCustomerLoaded()

    fireEvent.click(screen.getByText('Storico Interventi'))
    expect(screen.getByText(/WO-001/)).toBeInTheDocument()
    expect(screen.getByText(/Tagliando/)).toBeInTheDocument()
  })

  it('shows empty storico state', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => makeCustomer({ workOrders: [], bookings: [] }),
    })
    render(<CustomerDetailPage />)
    await waitForCustomerLoaded()

    fireEvent.click(screen.getByText('Storico Interventi'))
    expect(screen.getByText('Nessun intervento registrato.')).toBeInTheDocument()
  })

  it('switches to Fatture tab with invoice stats', async () => {
    render(<CustomerDetailPage />)
    await waitForCustomerLoaded()

    fireEvent.click(screen.getByText('Fatture'))
    expect(screen.getByText('FT2024/001')).toBeInTheDocument()
    expect(screen.getByText('Totale Fatturato')).toBeInTheDocument()
    expect(screen.getByText('Pagato')).toBeInTheDocument()
    expect(screen.getByText('In Sospeso')).toBeInTheDocument()
  })

  it('shows empty invoices state', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => makeCustomer({ invoices: [] }),
    })
    render(<CustomerDetailPage />)
    await waitForCustomerLoaded()

    fireEvent.click(screen.getByText('Fatture'))
    expect(screen.getByText('Nessuna fattura.')).toBeInTheDocument()
  })

  it('switches to Comunicazioni tab', async () => {
    render(<CustomerDetailPage />)
    await waitForCustomerLoaded()

    fireEvent.click(screen.getByText('Comunicazioni'))
    expect(screen.getByText('Nessuna comunicazione registrata.')).toBeInTheDocument()
  })

  it('opens edit modal when Modifica clicked', async () => {
    render(<CustomerDetailPage />)
    await waitForCustomerLoaded()

    fireEvent.click(screen.getByText('Modifica'))
    expect(screen.getByText('Modifica Cliente')).toBeInTheDocument()
  })

  it('closes edit modal via X button', async () => {
    render(<CustomerDetailPage />)
    await waitForCustomerLoaded()

    fireEvent.click(screen.getByText('Modifica'))
    expect(screen.getByText('Modifica Cliente')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Chiudi'))
    expect(screen.queryByText('Modifica Cliente')).not.toBeInTheDocument()
  })

  it('closes edit modal via Annulla button', async () => {
    render(<CustomerDetailPage />)
    await waitForCustomerLoaded()

    fireEvent.click(screen.getByText('Modifica'))
    const annulla = screen.getAllByText('Annulla')[0]
    fireEvent.click(annulla)
    expect(screen.queryByText('Modifica Cliente')).not.toBeInTheDocument()
  })

  it('submits edit form successfully', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => makeCustomer() })
      .mockResolvedValueOnce({ ok: true, json: async () => makeCustomer() })
      .mockResolvedValueOnce({ ok: true, json: async () => makeCustomer() })

    render(<CustomerDetailPage />)
    await waitForCustomerLoaded()

    fireEvent.click(screen.getByText('Modifica'))
    const submitBtn = screen.getByText('Salva modifiche')
    await act(async () => { fireEvent.click(submitBtn) })

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith('Cliente aggiornato con successo')
    })
  })

  it('shows error toast when edit fails', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => makeCustomer() })
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) })

    render(<CustomerDetailPage />)
    await waitForCustomerLoaded()

    fireEvent.click(screen.getByText('Modifica'))
    const submitBtn = screen.getByText('Salva modifiche')
    await act(async () => { fireEvent.click(submitBtn) })

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled()
    })
  })

  it('opens delete confirm dialog', async () => {
    render(<CustomerDetailPage />)
    await waitForCustomerLoaded()

    fireEvent.click(screen.getByText('Elimina'))
    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument()
    expect(screen.getByText('Elimina cliente')).toBeInTheDocument()
  })

  it('deletes customer successfully', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => makeCustomer() })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })

    render(<CustomerDetailPage />)
    await waitForCustomerLoaded()

    fireEvent.click(screen.getByText('Elimina'))
    await act(async () => { fireEvent.click(screen.getByText('Conferma eliminazione')) })

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith('Cliente eliminato con successo')
      expect(mockPush).toHaveBeenCalledWith('/dashboard/customers')
    })
  })

  it('shows error toast when delete fails', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => makeCustomer() })
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) })

    render(<CustomerDetailPage />)
    await waitForCustomerLoaded()

    fireEvent.click(screen.getByText('Elimina'))
    await act(async () => { fireEvent.click(screen.getByText('Conferma eliminazione')) })

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled()
    })
  })

  it('calls window.print when Stampa clicked', async () => {
    render(<CustomerDetailPage />)
    await waitForCustomerLoaded()

    fireEvent.click(screen.getByText('Stampa'))
    expect(window.print).toHaveBeenCalledTimes(1)
  })

  it('renders address components', async () => {
    render(<CustomerDetailPage />)
    await waitForCustomerLoaded()
    // The address p element renders multiple text nodes — check part of them
    expect(screen.getByText('Indirizzo')).toBeInTheDocument()
    // Verify text is present somewhere in the document
    expect(document.body.textContent).toContain('Via Roma 1')
  })

  it('shows Non fornito when GDPR consent is null', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => makeCustomer({ gdprConsentAt: null, marketingConsentAt: null }),
    })
    render(<CustomerDetailPage />)
    await waitForCustomerLoaded()
    const nonFornito = screen.getAllByText('Non fornito')
    expect(nonFornito.length).toBeGreaterThanOrEqual(2)
  })

  it('shows unknown status badge for unrecognized status', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => makeCustomer({
        workOrders: [{ id: 'wo1', woNumber: 'WO-002', status: 'UNKNOWN_STATUS', totalCost: 100, createdAt: '2024-01-01T00:00:00Z' }],
      }),
    })
    render(<CustomerDetailPage />)
    await waitForCustomerLoaded()
    fireEvent.click(screen.getByText('Storico Interventi'))
    expect(screen.getByText(/WO-002/)).toBeInTheDocument()
  })

  it('renders data when json wraps in data key', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: makeCustomer() }),
    })
    render(<CustomerDetailPage />)
    await waitFor(() => {
      expect(screen.getAllByText('Mario Rossi').length).toBeGreaterThan(0)
    })
  })

  it('renders multiple work orders and bookings exercising sort comparators', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => makeCustomer({
        workOrders: [
          { id: 'wo1', woNumber: 'WO-001', status: 'COMPLETED', totalCost: 300.0, createdAt: '2024-01-01T00:00:00Z' },
          { id: 'wo2', woNumber: 'WO-002', status: 'OPEN', totalCost: 100.0, createdAt: '2024-03-15T00:00:00Z' },
        ],
        bookings: [
          { id: 'bk1', scheduledAt: '2024-05-10T09:00:00Z', status: 'confirmed', serviceName: 'Tagliando' },
          { id: 'bk2', scheduledAt: '2024-06-20T09:00:00Z', status: 'pending', serviceName: 'Revisione' },
        ],
      }),
    })
    render(<CustomerDetailPage />)
    await waitForCustomerLoaded()
    fireEvent.click(screen.getByText('Storico Interventi'))
    expect(screen.getByText(/WO-001/)).toBeInTheDocument()
    expect(screen.getByText(/WO-002/)).toBeInTheDocument()
    expect(screen.getByText(/Tagliando/)).toBeInTheDocument()
    expect(screen.getByText(/Revisione/)).toBeInTheDocument()
    // More recent WO-002 (March) should be rendered before WO-001 (January)
    const woLinks = document.querySelectorAll('a[href^="/dashboard/work-orders"]')
    expect(woLinks[0]).toHaveAttribute('href', '/dashboard/work-orders/wo2')
  })
})
