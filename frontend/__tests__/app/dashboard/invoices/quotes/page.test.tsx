import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// ---- Navigation ----
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}))

// ---- SWR ----
let mockData: unknown = undefined
let mockIsLoading = false
const mockMutate = jest.fn()

jest.mock('swr', () => ({
  __esModule: true,
  default: () => ({
    data: mockData,
    isLoading: mockIsLoading,
    error: undefined,
    mutate: mockMutate,
  }),
}))

jest.mock('@/lib/swr-fetcher', () => ({ fetcher: jest.fn() }))

// ---- @/lib/utils ----
jest.mock('@/lib/utils', () => ({
  formatCurrency: (v: number) => `€${v.toFixed(2)}`,
  formatDate: (d: string) => d ? d.split('T')[0] : '',
}))

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
    icon,
    size,
  }: {
    children?: React.ReactNode
    onClick?: () => void
    disabled?: boolean
    icon?: React.ReactNode
    size?: string
  }) =>
    React.createElement('button', { onClick, disabled, 'data-size': size }, icon, children),
}))

jest.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => React.createElement('input', props),
}))

// ---- fetch mock ----
const mockFetch = jest.fn()
global.fetch = mockFetch

// ---- URL mock for blob download ----
global.URL = {
  createObjectURL: jest.fn(() => 'blob:mock-url'),
  revokeObjectURL: jest.fn(),
} as unknown as typeof URL

// ---- document.createElement mock for download link ----
const mockClick = jest.fn()
const origCreateElement = document.createElement.bind(document)
jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
  if (tag === 'a') {
    const el = origCreateElement(tag) as HTMLAnchorElement
    el.click = mockClick
    return el
  }
  return origCreateElement(tag)
})

// Fixtures
function makeEstimate(overrides: Partial<Record<string, unknown>> = {}) {
  const now = '2024-01-15T10:00:00Z'
  const future = '2024-02-15T10:00:00Z'
  return {
    id: 'est-1',
    estimateNumber: 'EST-001',
    customerId: 'customer-1',
    vehicleId: null,
    status: 'DRAFT',
    subtotalCents: '5000',
    vatCents: '1100',
    totalCents: '6100',
    discountCents: '0',
    validUntil: future,
    sentAt: null,
    acceptedAt: null,
    rejectedAt: null,
    bookingId: null,
    notes: null,
    createdBy: 'user-1',
    createdAt: now,
    updatedAt: now,
    lines: [
      {
        id: 'line-1',
        type: 'LABOR',
        description: 'Manodopera',
        quantity: 2,
        unitPriceCents: '2500',
        totalCents: '5000',
        vatRate: 22,
        partId: null,
        position: 1,
      },
    ],
    ...overrides,
  }
}

import QuotesPage from '@/app/dashboard/invoices/quotes/page'

beforeEach(() => {
  mockData = undefined
  mockIsLoading = false
  mockMutate.mockClear()
  mockPush.mockClear()
  mockFetch.mockClear()
  mockClick.mockClear()
  global.fetch = mockFetch
})

describe('QuotesPage', () => {
  describe('stati di caricamento', () => {
    it('mostra spinner durante il caricamento', () => {
      mockIsLoading = true
      render(<QuotesPage />)
      expect(document.querySelector('[data-icon="Loader2"]')).toBeTruthy()
    })

    it('mostra ... nei valori statistici durante il caricamento', () => {
      mockIsLoading = true
      render(<QuotesPage />)
      const dots = screen.getAllByText('...')
      expect(dots.length).toBeGreaterThan(0)
    })
  })

  describe('rendering con dati', () => {
    beforeEach(() => {
      mockData = { data: [makeEstimate()] }
    })

    it('mostra titolo Preventivi', () => {
      render(<QuotesPage />)
      expect(screen.getByText('Preventivi')).toBeInTheDocument()
    })

    it('mostra pulsante Nuovo Preventivo', () => {
      render(<QuotesPage />)
      expect(screen.getByText('Nuovo Preventivo')).toBeInTheDocument()
    })

    it('mostra il numero del preventivo', () => {
      render(<QuotesPage />)
      expect(screen.getByText('EST-001')).toBeInTheDocument()
    })

    it('mostra le intestazioni della tabella', () => {
      render(<QuotesPage />)
      expect(screen.getByText('Numero')).toBeInTheDocument()
      expect(screen.getByText('Cliente')).toBeInTheDocument()
      expect(screen.getByText('Stato')).toBeInTheDocument()
    })

    it('mostra le 5 stat cards', () => {
      render(<QuotesPage />)
      expect(screen.getByText('In Bozza')).toBeInTheDocument()
      expect(screen.getByText('Inviati')).toBeInTheDocument()
      expect(screen.getByText('Approvati')).toBeInTheDocument()
      expect(screen.getByText('Rifiutati')).toBeInTheDocument()
      expect(screen.getByText('Scaduti')).toBeInTheDocument()
    })
  })

  describe('stato vuoto', () => {
    it('mostra messaggio Nessun preventivo trovato', () => {
      mockData = { data: [] }
      render(<QuotesPage />)
      expect(screen.getByText('Nessun preventivo trovato')).toBeInTheDocument()
    })
  })

  describe('mapEstimateToQuote', () => {
    it('mappa correttamente DRAFT → Bozza', () => {
      mockData = { data: [makeEstimate({ status: 'DRAFT' })] }
      render(<QuotesPage />)
      expect(screen.getAllByText('Bozza').length).toBeGreaterThan(0)
    })

    it('mappa SENT → Inviato', () => {
      mockData = { data: [makeEstimate({ status: 'SENT' })] }
      render(<QuotesPage />)
      expect(screen.getAllByText('Inviato').length).toBeGreaterThan(0)
    })

    it('mappa ACCEPTED → Approvato', () => {
      mockData = { data: [makeEstimate({ status: 'ACCEPTED' })] }
      render(<QuotesPage />)
      expect(screen.getAllByText('Approvato').length).toBeGreaterThan(0)
    })

    it('mappa REJECTED → Rifiutato', () => {
      mockData = { data: [makeEstimate({ status: 'REJECTED' })] }
      render(<QuotesPage />)
      expect(screen.getAllByText('Rifiutato').length).toBeGreaterThan(0)
    })

    it('mappa EXPIRED → Scaduto (badge)', () => {
      mockData = { data: [makeEstimate({ status: 'EXPIRED', validUntil: '2023-01-01T00:00:00Z' })] }
      render(<QuotesPage />)
      const scadutoBadge = screen.getAllByText('Scaduto')
      expect(scadutoBadge.length).toBeGreaterThan(0)
    })

    it('mappa CONVERTED → Approvato', () => {
      mockData = { data: [makeEstimate({ status: 'CONVERTED' })] }
      render(<QuotesPage />)
      expect(screen.getAllByText('Approvato').length).toBeGreaterThan(0)
    })
  })

  describe('ExpiryBadge', () => {
    it('non mostra expiry badge per status approved', () => {
      mockData = { data: [makeEstimate({ status: 'ACCEPTED' })] }
      render(<QuotesPage />)
      expect(screen.queryByText(/Valido ancora/)).not.toBeInTheDocument()
      expect(screen.queryByText(/Scade tra/)).not.toBeInTheDocument()
    })

    it('mostra "Scade tra X gg" per scadenza entro 3 giorni', () => {
      const soon = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
      mockData = { data: [makeEstimate({ status: 'SENT', validUntil: soon })] }
      render(<QuotesPage />)
      expect(screen.getByText(/Scade tra/)).toBeInTheDocument()
    })

    it('mostra "Valido ancora X gg" per scadenza lontana', () => {
      const far = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      mockData = { data: [makeEstimate({ status: 'SENT', validUntil: far })] }
      render(<QuotesPage />)
      expect(screen.getByText(/Valido ancora/)).toBeInTheDocument()
    })
  })

  describe('ricerca e filtri', () => {
    beforeEach(() => {
      mockData = { data: [makeEstimate()] }
    })

    it('mostra campo di ricerca', () => {
      render(<QuotesPage />)
      expect(screen.getByPlaceholderText('Cerca preventivo...')).toBeInTheDocument()
    })

    it('mostra select filtro stato', () => {
      render(<QuotesPage />)
      expect(screen.getByText('Tutti gli stati')).toBeInTheDocument()
    })

    it('ricerca che non trova risultati mostra messaggio vuoto', () => {
      render(<QuotesPage />)
      fireEvent.change(screen.getByPlaceholderText('Cerca preventivo...'), {
        target: { value: 'preventivo inesistente xyz' },
      })
      expect(screen.getByText('Nessun preventivo trovato')).toBeInTheDocument()
    })
  })

  describe('azioni', () => {
    beforeEach(() => {
      mockData = { data: [makeEstimate()] }
    })

    it('click Nuovo Preventivo naviga a /dashboard/estimates/new', () => {
      render(<QuotesPage />)
      fireEvent.click(screen.getByText('Nuovo Preventivo'))
      expect(mockPush).toHaveBeenCalledWith('/dashboard/estimates/new')
    })

    it('click back naviga a /dashboard/invoices', () => {
      render(<QuotesPage />)
      fireEvent.click(screen.getByText('Fatture'))
      expect(mockPush).toHaveBeenCalledWith('/dashboard/invoices')
    })
  })

  describe('azione converti SENT', () => {
    it('mostra pulsante converti per preventivo SENT', () => {
      mockData = { data: [makeEstimate({ status: 'SENT' })] }
      render(<QuotesPage />)
      const buttons = screen.getAllByRole('button')
      // Il pulsante FileCheck è presente per SENT
      const fileCheckBtn = buttons.find(b => b.querySelector('[data-icon="FileCheck"]'))
      expect(fileCheckBtn).toBeTruthy()
    })

    it('click converti chiama POST /api/invoices/quotes/:id/convert', async () => {
      mockData = { data: [makeEstimate({ status: 'SENT' })] }
      mockFetch.mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue({}) })
      render(<QuotesPage />)
      const buttons = screen.getAllByRole('button')
      const convertBtn = buttons.find(b => b.querySelector('[data-icon="FileCheck"]'))!
      fireEvent.click(convertBtn)
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/invoices/quotes/est-1/convert',
          expect.objectContaining({ method: 'POST' }),
        )
      })
    })

    it('errore conversione mostra messaggio di errore', async () => {
      mockData = { data: [makeEstimate({ status: 'SENT' })] }
      mockFetch.mockResolvedValue({ ok: false })
      render(<QuotesPage />)
      const buttons = screen.getAllByRole('button')
      const convertBtn = buttons.find(b => b.querySelector('[data-icon="FileCheck"]'))!
      fireEvent.click(convertBtn)
      await waitFor(() => {
        expect(screen.getByText(/Errore nella conversione del preventivo/)).toBeInTheDocument()
      })
    })
  })

  describe('azione invia DRAFT', () => {
    it('mostra pulsante Send per preventivo DRAFT', () => {
      mockData = { data: [makeEstimate({ status: 'DRAFT' })] }
      render(<QuotesPage />)
      const buttons = screen.getAllByRole('button')
      const sendBtn = buttons.find(b => b.querySelector('[data-icon="Send"]'))
      expect(sendBtn).toBeTruthy()
    })

    it('click invia chiama POST /api/estimates/:id/send e chiama mutate', async () => {
      mockData = { data: [makeEstimate({ status: 'DRAFT' })] }
      mockFetch.mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue({}) })
      render(<QuotesPage />)
      const buttons = screen.getAllByRole('button')
      const sendBtn = buttons.find(b => b.querySelector('[data-icon="Send"]'))!
      fireEvent.click(sendBtn)
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/estimates/est-1/send',
          expect.objectContaining({ method: 'POST' }),
        )
      })
      await waitFor(() => expect(mockMutate).toHaveBeenCalled())
    })
  })

  describe('download PDF', () => {
    it('click download PDF chiama fetch blob', async () => {
      mockData = { data: [makeEstimate()] }
      const mockBlob = new Blob(['pdf-content'], { type: 'application/pdf' })
      mockFetch.mockResolvedValue({
        ok: true,
        blob: jest.fn().mockResolvedValue(mockBlob),
      })
      render(<QuotesPage />)
      const buttons = screen.getAllByRole('button')
      const downloadBtn = buttons.find(b => b.querySelector('[data-icon="Download"]'))!
      fireEvent.click(downloadBtn)
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/estimates/est-1/pdf')
      })
    })
  })
})
