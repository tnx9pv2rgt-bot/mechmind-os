import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

// ── framer-motion ──────────────────────────────────────────────────────────────
jest.mock('framer-motion', () => {
  const React = require('react')
  return {
    motion: new Proxy({}, {
      get: (_t: unknown, prop: string) =>
        React.forwardRef(({ children, ...rest }: { children?: React.ReactNode; [k: string]: unknown }, ref: React.Ref<HTMLElement>) => {
          const allowed = ['className', 'style', 'onClick', 'aria-label', 'id', 'role']
          const valid: Record<string, unknown> = {}
          for (const k of Object.keys(rest)) {
            if (allowed.includes(k) || k.startsWith('data-') || k.startsWith('aria-')) valid[k] = rest[k]
          }
          const tag = ['div', 'span', 'section', 'header', 'ul', 'li', 'p', 'form'].includes(prop) ? prop : 'div'
          return React.createElement(tag, { ...valid, ref }, children)
        }),
    }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  }
})

// ── lucide-react ───────────────────────────────────────────────────────────────
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

// ── next/navigation ────────────────────────────────────────────────────────────
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// ── sonner ────────────────────────────────────────────────────────────────────
jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

// ── UI components ──────────────────────────────────────────────────────────────
jest.mock('@/components/ui/apple-button', () => ({
  AppleButton: ({ children, onClick, type, variant, size, icon, loading, disabled, form, 'aria-label': ariaLabel }: {
    children?: React.ReactNode; onClick?: () => void; type?: string; variant?: string
    size?: string; icon?: React.ReactNode; loading?: boolean; disabled?: boolean
    form?: string; 'aria-label'?: string
  }) =>
    React.createElement('button', {
      onClick, type: type || 'button', 'data-variant': variant,
      'data-loading': loading, disabled, form, 'aria-label': ariaLabel
    }, icon, children),
}))

jest.mock('@/components/ui/apple-card', () => ({
  AppleCard: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'apple-card' }, children),
  AppleCardContent: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'apple-card-content' }, children),
  AppleCardHeader: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'apple-card-header' }, children),
}))

jest.mock('@/components/ui/input', () => ({
  Input: React.forwardRef((props: React.InputHTMLAttributes<HTMLInputElement>, ref: React.Ref<HTMLInputElement>) =>
    React.createElement('input', { ...props, ref })
  ),
}))

jest.mock('@/components/ui/breadcrumb', () => ({
  Breadcrumb: ({ items }: { items: { label: string; href?: string }[] }) =>
    React.createElement('nav', { 'data-testid': 'breadcrumb' },
      items.map((item, i) => React.createElement('span', { key: i }, item.label))
    ),
}))

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children?: React.ReactNode; open?: boolean }) =>
    open ? React.createElement('div', { 'data-testid': 'dialog' }, children) : null,
  DialogContent: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'dialog-content' }, children),
  DialogHeader: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'dialog-header' }, children),
  DialogTitle: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('h2', null, children),
  DialogDescription: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('p', null, children),
}))

// ── Import component ───────────────────────────────────────────────────────────
import NewWorkOrderPage from '@/app/dashboard/work-orders/new/page'
import { toast } from 'sonner'

const TECHNICIANS = [
  { id: 'tech-1', firstName: 'Luca', lastName: 'Bianchi', role: 'TECHNICIAN' },
  { id: 'tech-2', firstName: 'Marco', lastName: 'Rossi', role: 'TECHNICIAN' },
]

const CUSTOMERS = [
  { id: 'cust-1', firstName: 'Mario', lastName: 'Rossi', email: 'mario@test.it', phone: '333000001' },
  { id: 'cust-2', firstName: 'Luigi', lastName: 'Verdi', companyName: 'Verdi SRL', vatNumber: 'IT12345' },
]

const VEHICLES = [
  { id: 'veh-1', make: 'Fiat', model: '500', licensePlate: 'AB123CD', year: 2020, mileage: 45000 },
  { id: 'veh-2', make: 'Alfa Romeo', model: 'Giulia', licensePlate: 'CD456EF', year: 2022 },
]

const CANNED_JOBS = [
  { id: 'cj-1', name: 'Tagliando Base', description: 'Cambio olio e filtri', estimatedHours: 1, estimatedCost: 80, opCode: 'TAG01' },
  { id: 'cj-2', name: 'Freni Anteriori', estimatedHours: 2, estimatedCost: 200 },
]

const BAYS = [
  { id: 'bay-1', name: 'Box 1', status: 'AVAILABLE' },
]

function setupFetchMock(options: { failCannedJobs?: boolean; emptyCannedJobs?: boolean; failWO?: boolean } = {}): void {
  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (url.includes('/api/technicians')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: TECHNICIANS }) })
    }
    if (url.includes('/api/locations/bays')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: BAYS }) })
    }
    if (url.includes('/api/customers')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: CUSTOMERS }) })
    }
    if (url.includes('/api/vehicles')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: VEHICLES }) })
    }
    if (url.includes('/api/canned-jobs')) {
      if (options.failCannedJobs) {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
      }
      const jobs = options.emptyCannedJobs ? [] : CANNED_JOBS
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: jobs }) })
    }
    if (url.includes('/api/dashboard/work-orders')) {
      if (options.failWO) {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({ message: 'Errore server' }) })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: { id: 'new-wo-id' } }) })
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
  }) as jest.Mock
}

beforeEach(() => {
  jest.clearAllMocks()
  setupFetchMock()
})

describe('NewWorkOrderPage', () => {
  describe('initial render', () => {
    it('renders page heading', () => {
      render(<NewWorkOrderPage />)
      expect(screen.getByText('Nuovo Ordine di Lavoro')).toBeInTheDocument()
    })

    it('renders breadcrumb', () => {
      render(<NewWorkOrderPage />)
      expect(screen.getByTestId('breadcrumb')).toBeInTheDocument()
      expect(screen.getByText('Nuovo Ordine')).toBeInTheDocument()
      expect(screen.getByText('OdL')).toBeInTheDocument()
    })

    it('renders Crea OdL button', () => {
      render(<NewWorkOrderPage />)
      expect(screen.getAllByText('Crea OdL').length).toBeGreaterThan(0)
    })

    it('renders Annulla button', () => {
      render(<NewWorkOrderPage />)
      expect(screen.getAllByText('Annulla').length).toBeGreaterThan(0)
    })

    it('navigates back when Annulla clicked', () => {
      render(<NewWorkOrderPage />)
      fireEvent.click(screen.getAllByText('Annulla')[0])
      expect(mockPush).toHaveBeenCalledWith('/dashboard/work-orders')
    })

    it('navigates back when ArrowLeft button clicked', () => {
      render(<NewWorkOrderPage />)
      const backBtn = screen.getByLabelText('Torna agli ordini')
      fireEvent.click(backBtn)
      expect(mockPush).toHaveBeenCalledWith('/dashboard/work-orders')
    })

    it('renders customer search input', () => {
      render(<NewWorkOrderPage />)
      expect(screen.getByPlaceholderText('Cerca per nome, email, P.IVA...')).toBeInTheDocument()
    })
  })

  describe('section headings', () => {
    it('renders section 1: Tipo Ordine e Priorità', () => {
      render(<NewWorkOrderPage />)
      expect(screen.getByText('Tipo Ordine e Priorità')).toBeInTheDocument()
    })

    it('renders section 2: Cliente e Veicolo', () => {
      render(<NewWorkOrderPage />)
      expect(screen.getByText('Cliente e Veicolo')).toBeInTheDocument()
    })

    it('renders section 3: Accettazione Veicolo', () => {
      render(<NewWorkOrderPage />)
      expect(screen.getByText('Accettazione Veicolo')).toBeInTheDocument()
    })

    it('renders section 4: Richiesta Cliente e Diagnosi', () => {
      render(<NewWorkOrderPage />)
      expect(screen.getByText('Richiesta Cliente e Diagnosi')).toBeInTheDocument()
    })

    it('renders section 5: Assegnazione e Tempi', () => {
      render(<NewWorkOrderPage />)
      expect(screen.getByText('Assegnazione e Tempi')).toBeInTheDocument()
    })

    it('renders section 6: Logistica Cliente', () => {
      render(<NewWorkOrderPage />)
      expect(screen.getByText('Logistica Cliente')).toBeInTheDocument()
    })

    it('renders section 7: Lavorazioni', () => {
      render(<NewWorkOrderPage />)
      expect(screen.getByText('Lavorazioni')).toBeInTheDocument()
    })

    it('renders section 8: Note e Dettagli Finanziari', () => {
      render(<NewWorkOrderPage />)
      expect(screen.getByText('Note e Dettagli Finanziari')).toBeInTheDocument()
    })
  })

  describe('WO type selection', () => {
    it('renders Pagamento Cliente option', () => {
      render(<NewWorkOrderPage />)
      expect(screen.getByText('Pagamento Cliente')).toBeInTheDocument()
    })

    it('renders Garanzia option', () => {
      render(<NewWorkOrderPage />)
      expect(screen.getByText('Garanzia')).toBeInTheDocument()
    })

    it('renders Interno option', () => {
      render(<NewWorkOrderPage />)
      expect(screen.getByText('Interno')).toBeInTheDocument()
    })

    it('renders Flotta option', () => {
      render(<NewWorkOrderPage />)
      expect(screen.getByText('Flotta')).toBeInTheDocument()
    })

    it('renders Goodwill option', () => {
      render(<NewWorkOrderPage />)
      expect(screen.getByText('Goodwill')).toBeInTheDocument()
    })
  })

  describe('priority selection', () => {
    it('renders Normale priority', () => {
      render(<NewWorkOrderPage />)
      expect(screen.getByText('Normale')).toBeInTheDocument()
    })

    it('renders Alta priority', () => {
      render(<NewWorkOrderPage />)
      expect(screen.getByText('Alta')).toBeInTheDocument()
    })

    it('renders Urgente priority', () => {
      render(<NewWorkOrderPage />)
      expect(screen.getByText('Urgente')).toBeInTheDocument()
    })

    it('renders Bassa priority', () => {
      render(<NewWorkOrderPage />)
      expect(screen.getByText('Bassa')).toBeInTheDocument()
    })
  })

  describe('technicians loading', () => {
    it('loads technicians on mount', async () => {
      render(<NewWorkOrderPage />)
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/technicians')
      })
    })

    it('loads bays on mount', async () => {
      render(<NewWorkOrderPage />)
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/locations/bays')
      })
    })

    it('shows technician names in select after loading', async () => {
      render(<NewWorkOrderPage />)
      await waitFor(() => {
        expect(screen.queryAllByText('Luca Bianchi').length).toBeGreaterThan(0)
      })
    })
  })

  describe('customer search', () => {
    it('shows dropdown after typing 2+ chars', async () => {
      render(<NewWorkOrderPage />)
      const input = screen.getByPlaceholderText('Cerca per nome, email, P.IVA...')
      fireEvent.change(input, { target: { value: 'Ma' } })
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/customers?search=Ma'))
      }, { timeout: 600 })
    })

    it('shows customer result in dropdown', async () => {
      render(<NewWorkOrderPage />)
      const input = screen.getByPlaceholderText('Cerca per nome, email, P.IVA...')
      fireEvent.change(input, { target: { value: 'Mario' } })
      await waitFor(() => {
        expect(screen.getByText('Mario Rossi')).toBeInTheDocument()
      }, { timeout: 1000 })
    })

    it('shows customer email in dropdown', async () => {
      render(<NewWorkOrderPage />)
      const input = screen.getByPlaceholderText('Cerca per nome, email, P.IVA...')
      fireEvent.change(input, { target: { value: 'Mario' } })
      await waitFor(() => {
        expect(screen.getByText('mario@test.it')).toBeInTheDocument()
      }, { timeout: 1000 })
    })

    it('updates input value when typing', () => {
      render(<NewWorkOrderPage />)
      const input = screen.getByPlaceholderText('Cerca per nome, email, P.IVA...')
      fireEvent.change(input, { target: { value: 'Luigi' } })
      expect((input as HTMLInputElement).value).toBe('Luigi')
    })
  })

  describe('customer selection', () => {
    async function searchAndShowResults(): Promise<void> {
      render(<NewWorkOrderPage />)
      const input = screen.getByPlaceholderText('Cerca per nome, email, P.IVA...')
      fireEvent.change(input, { target: { value: 'Mario' } })
      await waitFor(() => {
        expect(screen.getByText('Mario Rossi')).toBeInTheDocument()
      }, { timeout: 1000 })
    }

    it('fills search input with customer name on selection', async () => {
      await searchAndShowResults()
      fireEvent.click(screen.getByText('Mario Rossi'))
      const input = screen.getByPlaceholderText('Cerca per nome, email, P.IVA...')
      expect((input as HTMLInputElement).value).toBe('Mario Rossi')
    })

    it('loads vehicles after customer selection', async () => {
      await searchAndShowResults()
      fireEvent.click(screen.getByText('Mario Rossi'))
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/vehicles?customerId=cust-1'))
      })
    })

    it('shows vehicle options after customer selection', async () => {
      await searchAndShowResults()
      fireEvent.click(screen.getByText('Mario Rossi'))
      await waitFor(() => {
        expect(screen.getByText(/AB123CD/)).toBeInTheDocument()
      })
    })

    it('shows success indicator after customer selected', async () => {
      await searchAndShowResults()
      fireEvent.click(screen.getByText('Mario Rossi'))
      expect(screen.getAllByText('Mario Rossi').length).toBeGreaterThan(0)
    })
  })

  describe('LiveTotal', () => {
    it('shows Manodopera label', async () => {
      render(<NewWorkOrderPage />)
      fireEvent.click(screen.getByText('Aggiungi lavorazione'))
      await waitFor(() => expect(screen.getByText('Manodopera')).toBeInTheDocument())
    })

    it('shows Materiali/Ricambi label', async () => {
      render(<NewWorkOrderPage />)
      fireEvent.click(screen.getByText('Aggiungi lavorazione'))
      await waitFor(() => expect(screen.getByText('Materiali/Ricambi')).toBeInTheDocument())
    })

    it('shows Imponibile label', async () => {
      render(<NewWorkOrderPage />)
      fireEvent.click(screen.getByText('Aggiungi lavorazione'))
      await waitFor(() => expect(screen.getByText('Imponibile')).toBeInTheDocument())
    })

    it('shows IVA 22% label', async () => {
      render(<NewWorkOrderPage />)
      fireEvent.click(screen.getByText('Aggiungi lavorazione'))
      await waitFor(() => expect(screen.getByText('IVA 22%')).toBeInTheDocument())
    })

    it('shows Totale stimato label', async () => {
      render(<NewWorkOrderPage />)
      fireEvent.click(screen.getByText('Aggiungi lavorazione'))
      await waitFor(() => expect(screen.getByText('Totale stimato')).toBeInTheDocument())
    })
  })

  describe('line items', () => {
    it('renders Aggiungi lavorazione button', () => {
      render(<NewWorkOrderPage />)
      expect(screen.getByText('Aggiungi lavorazione')).toBeInTheDocument()
    })

    it('shows empty state before adding line items', () => {
      render(<NewWorkOrderPage />)
      expect(screen.getByText('Nessuna lavorazione aggiunta')).toBeInTheDocument()
    })

    it('adds a line item when Aggiungi lavorazione clicked', async () => {
      render(<NewWorkOrderPage />)
      fireEvent.click(screen.getByText('Aggiungi lavorazione'))
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Descrizione lavorazione')).toBeInTheDocument()
      })
    })

    it('removes a line item when remove button clicked', async () => {
      render(<NewWorkOrderPage />)
      fireEvent.click(screen.getByText('Aggiungi lavorazione'))
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Descrizione lavorazione')).toBeInTheDocument()
      })
      const removeBtn = screen.getByTitle('Rimuovi')
      fireEvent.click(removeBtn)
      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Descrizione lavorazione')).not.toBeInTheDocument()
      })
    })

    it('shows Dettagli 3C toggle for each line item', async () => {
      render(<NewWorkOrderPage />)
      fireEvent.click(screen.getByText('Aggiungi lavorazione'))
      await waitFor(() => {
        expect(screen.getByTitle('Dettagli 3C')).toBeInTheDocument()
      })
    })
  })

  describe('canned jobs dialog', () => {
    it('renders Lavori Standard trigger button', () => {
      render(<NewWorkOrderPage />)
      expect(screen.getByText('Lavori Standard')).toBeInTheDocument()
    })

    it('opens canned jobs dialog when Lavori Standard clicked', async () => {
      render(<NewWorkOrderPage />)
      fireEvent.click(screen.getByText('Lavori Standard'))
      expect(screen.getByTestId('dialog')).toBeInTheDocument()
    })

    it('loads canned jobs when dialog opens', async () => {
      render(<NewWorkOrderPage />)
      fireEvent.click(screen.getByText('Lavori Standard'))
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/canned-jobs')
      })
    })

    it('shows canned job names in dialog', async () => {
      render(<NewWorkOrderPage />)
      fireEvent.click(screen.getByText('Lavori Standard'))
      await waitFor(() => {
        expect(screen.getByText('Tagliando Base')).toBeInTheDocument()
      })
    })

    it('shows canned job opCode', async () => {
      render(<NewWorkOrderPage />)
      fireEvent.click(screen.getByText('Lavori Standard'))
      await waitFor(() => {
        expect(screen.getByText('TAG01')).toBeInTheDocument()
      })
    })

    it('adds canned job to line items when clicked', async () => {
      render(<NewWorkOrderPage />)
      fireEvent.click(screen.getByText('Lavori Standard'))
      await waitFor(() => screen.getByText('Tagliando Base'))
      fireEvent.click(screen.getByText('Tagliando Base'))
      expect(toast.success).toHaveBeenCalledWith('"Tagliando Base" aggiunto')
    })

    it('shows empty state when no canned jobs configured', async () => {
      setupFetchMock({ emptyCannedJobs: true })
      render(<NewWorkOrderPage />)
      fireEvent.click(screen.getByText('Lavori Standard'))
      await waitFor(() => {
        expect(screen.getByText('Nessun lavoro standard configurato.')).toBeInTheDocument()
      })
    })

    it('shows loader while canned jobs loading', async () => {
      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (url.includes('/api/technicians')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) })
        }
        if (url.includes('/api/locations/bays')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) })
        }
        if (url.includes('/api/canned-jobs')) {
          return new Promise(() => {}) // never resolves
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      }) as jest.Mock

      render(<NewWorkOrderPage />)
      fireEvent.click(screen.getByText('Lavori Standard'))
      expect(screen.getByTestId('dialog')).toBeInTheDocument()
    })
  })

  describe('form validation', () => {
    it('shows customerId validation error when form submitted empty', async () => {
      render(<NewWorkOrderPage />)
      await act(async () => {
        const submitBtn = screen.getAllByText('Crea OdL')[0].closest('button')!
        fireEvent.click(submitBtn)
      })
      await waitFor(() => {
        expect(screen.getByText('Seleziona un cliente')).toBeInTheDocument()
      })
    })

    it('shows vehicleId validation error when form submitted without vehicle', async () => {
      render(<NewWorkOrderPage />)
      await act(async () => {
        fireEvent.click(screen.getAllByText('Crea OdL')[0].closest('button')!)
      })
      await waitFor(() => {
        expect(screen.getByText('Seleziona un veicolo')).toBeInTheDocument()
      })
    })
  })

  describe('form submission', () => {
    it('shows error toast on API failure', async () => {
      setupFetchMock({ failWO: true })
      render(<NewWorkOrderPage />)

      const customerInput = screen.getByPlaceholderText('Cerca per nome, email, P.IVA...')
      fireEvent.change(customerInput, { target: { value: 'Mario' } })
      await waitFor(() => screen.getByText('Mario Rossi'), { timeout: 1000 })
      fireEvent.click(screen.getByText('Mario Rossi'))
      await waitFor(() => screen.getByText(/AB123CD/))

      const selects = document.querySelectorAll('select')
      const vehicleSelect = Array.from(selects).find(s => s.querySelector('option[value="veh-1"]'))
      if (vehicleSelect) {
        fireEvent.change(vehicleSelect, { target: { value: 'veh-1' } })
      }

      await act(async () => {
        fireEvent.click(screen.getAllByText('Crea OdL')[0].closest('button')!)
      })

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Errore'))
      })
    })
  })

  describe('fetch error handling', () => {
    it('handles technicians fetch failure gracefully', async () => {
      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (url.includes('/api/technicians')) {
          return Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) })
      }) as jest.Mock

      render(<NewWorkOrderPage />)
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/technicians')
      })
      expect(screen.getByText('Nuovo Ordine di Lavoro')).toBeInTheDocument()
    })

    it('handles customer search error gracefully', async () => {
      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (url.includes('/api/technicians')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) })
        }
        if (url.includes('/api/locations/bays')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) })
        }
        if (url.includes('/api/customers')) {
          return Promise.reject(new Error('Network error'))
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      }) as jest.Mock

      render(<NewWorkOrderPage />)
      const input = screen.getByPlaceholderText('Cerca per nome, email, P.IVA...')
      fireEvent.change(input, { target: { value: 'Mario' } })
      await new Promise(r => setTimeout(r, 400))
      expect(screen.getByText('Nuovo Ordine di Lavoro')).toBeInTheDocument()
    })

    it('handles vehicles fetch failure gracefully', async () => {
      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (url.includes('/api/technicians')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) })
        }
        if (url.includes('/api/locations/bays')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) })
        }
        if (url.includes('/api/customers')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: CUSTOMERS }) })
        }
        if (url.includes('/api/vehicles')) {
          return Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      }) as jest.Mock

      render(<NewWorkOrderPage />)
      const input = screen.getByPlaceholderText('Cerca per nome, email, P.IVA...')
      fireEvent.change(input, { target: { value: 'Mario' } })
      await waitFor(() => screen.getByText('Mario Rossi'), { timeout: 1000 })
      fireEvent.click(screen.getByText('Mario Rossi'))
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/vehicles'))
      })
      expect(screen.getByText('Nuovo Ordine di Lavoro')).toBeInTheDocument()
    })

    it('handles canned jobs fetch failure gracefully', async () => {
      setupFetchMock({ failCannedJobs: true })
      render(<NewWorkOrderPage />)
      fireEvent.click(screen.getByText('Lavori Standard'))
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/canned-jobs')
      })
      expect(screen.getByTestId('dialog')).toBeInTheDocument()
    })
  })

  describe('vehicle section', () => {
    it('shows Seleziona prima un cliente placeholder before customer selected', () => {
      render(<NewWorkOrderPage />)
      expect(screen.getByText('Seleziona prima un cliente')).toBeInTheDocument()
    })

    it('shows vehicle select after customer selection', async () => {
      render(<NewWorkOrderPage />)
      const input = screen.getByPlaceholderText('Cerca per nome, email, P.IVA...')
      fireEvent.change(input, { target: { value: 'Mario' } })
      await waitFor(() => screen.getByText('Mario Rossi'), { timeout: 1000 })
      fireEvent.click(screen.getByText('Mario Rossi'))
      await waitFor(() => {
        expect(screen.queryAllByText(/AB123CD/).length).toBeGreaterThan(0)
      })
    })
  })

  describe('marketing source select', () => {
    it('renders marketing source select with options', () => {
      render(<NewWorkOrderPage />)
      expect(screen.getByText('Come ci ha trovato il cliente')).toBeInTheDocument()
      const selects = document.querySelectorAll('select')
      expect(selects.length).toBeGreaterThan(0)
    })

    it('shows Google option in marketing source', () => {
      render(<NewWorkOrderPage />)
      expect(screen.getByText('Google')).toBeInTheDocument()
    })
  })

  describe('fuel level selection', () => {
    it('renders fuel level options', () => {
      render(<NewWorkOrderPage />)
      expect(screen.getByText('Pieno')).toBeInTheDocument()
      expect(screen.getByText('Vuoto')).toBeInTheDocument()
      expect(screen.getByText('1/2')).toBeInTheDocument()
    })
  })

  describe('drop-off type', () => {
    it('renders drop-off type options', () => {
      render(<NewWorkOrderPage />)
      expect(screen.getByText('Lascia il veicolo')).toBeInTheDocument()
      expect(screen.getByText('Attende in officina')).toBeInTheDocument()
    })
  })

  describe('notes section', () => {
    it('renders internal notes placeholder', () => {
      render(<NewWorkOrderPage />)
      expect(screen.getByPlaceholderText('Note visibili solo al team interno...')).toBeInTheDocument()
    })

    it('renders customer visible notes placeholder', () => {
      render(<NewWorkOrderPage />)
      expect(screen.getByPlaceholderText('Note che saranno visibili al cliente...')).toBeInTheDocument()
    })
  })

  describe('customer search edge cases', () => {
    it('does not call customers API when query is less than 2 chars', async () => {
      render(<NewWorkOrderPage />)
      const input = screen.getByPlaceholderText('Cerca per nome, email, P.IVA...')
      fireEvent.change(input, { target: { value: 'M' } })
      await new Promise(r => setTimeout(r, 400))
      const calls = (global.fetch as jest.Mock).mock.calls.map((c: unknown[]) => c[0])
      expect(calls.every((url: unknown) => !(url as string).includes('/api/customers'))).toBe(true)
    })

    it('clears selected customer when search input changes after selection', async () => {
      render(<NewWorkOrderPage />)
      const input = screen.getByPlaceholderText('Cerca per nome, email, P.IVA...')
      fireEvent.change(input, { target: { value: 'Mario' } })
      await waitFor(() => screen.getByText('Mario Rossi'), { timeout: 1000 })
      fireEvent.click(screen.getByText('Mario Rossi'))
      fireEvent.change(input, { target: { value: 'Altro cliente' } })
      expect(screen.queryByText('P.IVA:')).not.toBeInTheDocument()
    })

    it('shows P.IVA when customer with vatNumber is selected', async () => {
      render(<NewWorkOrderPage />)
      const input = screen.getByPlaceholderText('Cerca per nome, email, P.IVA...')
      fireEvent.change(input, { target: { value: 'Luigi' } })
      await waitFor(() => screen.getByText('Luigi Verdi'), { timeout: 1000 })
      fireEvent.click(screen.getByText('Luigi Verdi'))
      await waitFor(() => {
        expect(screen.getByText(/IT12345/)).toBeInTheDocument()
      })
    })
  })

  describe('line item 3C and authorized', () => {
    it('expands Dettagli 3C section on toggle click', async () => {
      render(<NewWorkOrderPage />)
      fireEvent.click(screen.getByText('Aggiungi lavorazione'))
      await waitFor(() => screen.getByTitle('Dettagli 3C'))
      fireEvent.click(screen.getByTitle('Dettagli 3C'))
      await waitFor(() => {
        expect(screen.getByText(/Standard 3C/)).toBeInTheDocument()
      })
    })

    it('shows Rifiutato dal cliente badge when authorized toggled off', async () => {
      render(<NewWorkOrderPage />)
      fireEvent.click(screen.getByText('Aggiungi lavorazione'))
      await waitFor(() => screen.getByTitle('Segna come rifiutato'))
      fireEvent.click(screen.getByTitle('Segna come rifiutato'))
      await waitFor(() => {
        expect(screen.getByText('Rifiutato dal cliente')).toBeInTheDocument()
      })
    })

    it('shows subletVendor input when isSublet checkbox checked', async () => {
      render(<NewWorkOrderPage />)
      fireEvent.click(screen.getByText('Aggiungi lavorazione'))
      await waitFor(() => screen.getByTitle('Dettagli 3C'))
      fireEvent.click(screen.getByTitle('Dettagli 3C'))
      await waitFor(() => screen.getByText('Lavoro in subfornitura'))
      const label = screen.getByText('Lavoro in subfornitura').closest('label')!
      const checkbox = label.querySelector('input[type="checkbox"]') as HTMLInputElement
      fireEvent.click(checkbox)
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Nome fornitore esterno')).toBeInTheDocument()
      })
    })
  })

  describe('tax exempt', () => {
    it('shows taxExemptCert input when Esenzione IVA checkbox checked', async () => {
      render(<NewWorkOrderPage />)
      const label = screen.getByText('Esenzione IVA').closest('label')!
      const checkbox = label.querySelector('input[type="checkbox"]') as HTMLInputElement
      fireEvent.click(checkbox)
      await waitFor(() => {
        expect(screen.getByPlaceholderText('N. certificato esenzione')).toBeInTheDocument()
      })
    })
  })

  describe('form submission success', () => {
    it('shows success toast and navigates after successful submission', async () => {
      render(<NewWorkOrderPage />)

      const customerInput = screen.getByPlaceholderText('Cerca per nome, email, P.IVA...')
      fireEvent.change(customerInput, { target: { value: 'Mario' } })
      await waitFor(() => screen.getByText('Mario Rossi'), { timeout: 1000 })
      fireEvent.click(screen.getByText('Mario Rossi'))
      await waitFor(() => screen.getByText(/AB123CD/))

      const selects = document.querySelectorAll('select')
      const vehicleSelect = Array.from(selects).find(
        (s) => s.querySelector('option[value="veh-1"]')
      ) as HTMLSelectElement | undefined
      if (vehicleSelect) {
        fireEvent.change(vehicleSelect, { target: { value: 'veh-1' } })
      }

      await act(async () => {
        fireEvent.click(screen.getAllByText('Crea OdL')[0].closest('button')!)
      })

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Ordine di lavoro creato con successo')
      })
    })

    it('submits with line items when form has lavorazioni', async () => {
      render(<NewWorkOrderPage />)

      const customerInput = screen.getByPlaceholderText('Cerca per nome, email, P.IVA...')
      fireEvent.change(customerInput, { target: { value: 'Mario' } })
      await waitFor(() => screen.getByText('Mario Rossi'), { timeout: 1000 })
      fireEvent.click(screen.getByText('Mario Rossi'))
      await waitFor(() => screen.getByText(/AB123CD/))

      const selects = document.querySelectorAll('select')
      const vehicleSelect = Array.from(selects).find(
        (s) => s.querySelector('option[value="veh-1"]')
      ) as HTMLSelectElement | undefined
      if (vehicleSelect) {
        fireEvent.change(vehicleSelect, { target: { value: 'veh-1' } })
      }

      fireEvent.click(screen.getByText('Aggiungi lavorazione'))
      await waitFor(() => screen.getByPlaceholderText('Descrizione lavorazione'))
      fireEvent.change(screen.getByPlaceholderText('Descrizione lavorazione'), { target: { value: 'Cambio olio' } })

      await act(async () => {
        fireEvent.click(screen.getAllByText('Crea OdL')[0].closest('button')!)
      })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/dashboard/work-orders',
          expect.objectContaining({ method: 'POST' })
        )
      })
    })
  })

  describe('mobile navigation', () => {
    it('mobile Annulla button navigates to work-orders list', () => {
      render(<NewWorkOrderPage />)
      const buttons = screen.getAllByText('Annulla')
      fireEvent.click(buttons[buttons.length - 1])
      expect(mockPush).toHaveBeenCalledWith('/dashboard/work-orders')
    })
  })

  describe('bays fetch error', () => {
    it('handles bays fetch error gracefully', async () => {
      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (url.includes('/api/locations/bays')) {
          return Promise.reject(new Error('Network error'))
        }
        if (url.includes('/api/technicians')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      }) as jest.Mock

      render(<NewWorkOrderPage />)
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/locations/bays')
      })
      expect(screen.getByText('Nuovo Ordine di Lavoro')).toBeInTheDocument()
    })
  })

  describe('selectedCustomer clear on search change', () => {
    it('clears customerId when typing in search after customer was selected', async () => {
      render(<NewWorkOrderPage />)
      const input = screen.getByPlaceholderText('Cerca per nome, email, P.IVA...')
      fireEvent.change(input, { target: { value: 'Mario' } })
      await waitFor(() => screen.getByText('Mario Rossi'), { timeout: 1000 })
      await act(async () => { fireEvent.click(screen.getByText('Mario Rossi')) })
      await act(async () => { fireEvent.change(input, { target: { value: 'Altro' } }) })
      expect(screen.queryByText('P.IVA:')).not.toBeInTheDocument()
    })
  })
})
