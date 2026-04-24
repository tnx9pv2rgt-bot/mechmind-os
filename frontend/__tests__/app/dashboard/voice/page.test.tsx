import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { toast } from 'sonner'

jest.mock('framer-motion', () => {
  const React = require('react')
  return {
    motion: new Proxy({}, {
      get: (_t: unknown, prop: string) =>
        React.forwardRef(({ children, ...rest }: { children?: React.ReactNode; [k: string]: unknown }, ref: React.Ref<HTMLElement>) => {
          const allowed = ['className', 'style', 'onClick', 'id']
          const valid: Record<string, unknown> = {}
          for (const k of Object.keys(rest)) {
            if (allowed.includes(k) || k.startsWith('data-') || k.startsWith('aria-')) valid[k] = rest[k]
          }
          const tag = ['div', 'span'].includes(prop) ? prop : 'div'
          return React.createElement(tag, { ...valid, ref }, children)
        }),
    }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  }
})

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

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

jest.mock('@/components/ui/apple-card', () => ({
  AppleCard: ({ children, className }: { children?: React.ReactNode; className?: string }) =>
    React.createElement('div', { 'data-testid': 'apple-card', className }, children),
  AppleCardContent: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'apple-card-content' }, children),
  AppleCardHeader: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'apple-card-header' }, children),
}))

jest.mock('@/components/ui/apple-button', () => ({
  AppleButton: ({ children, onClick, variant, className }: {
    children?: React.ReactNode; onClick?: () => void; variant?: string; className?: string
  }) =>
    React.createElement('button', { onClick, 'data-variant': variant, className }, children),
}))

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children?: React.ReactNode; className?: string }) =>
    React.createElement('span', { 'data-testid': 'badge', className }, children),
}))

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange }: { checked?: boolean; onCheckedChange?: (v: boolean) => void }) =>
    React.createElement('button', {
      'data-testid': 'switch-toggle',
      'aria-checked': String(checked ?? false),
      onClick: () => onCheckedChange?.(!checked),
    }),
}))

const mockMutateStats = jest.fn()
const mockMutateCalls = jest.fn()

let mockSWRStats: { data: unknown; error: unknown; isLoading: boolean; mutate: jest.Mock } = {
  data: undefined, error: undefined, isLoading: false, mutate: mockMutateStats,
}
let mockSWRCalls: { data: unknown; error: unknown; isLoading: boolean; mutate: jest.Mock } = {
  data: undefined, error: undefined, isLoading: false, mutate: mockMutateCalls,
}

jest.mock('swr', () => ({
  __esModule: true,
  default: (key: unknown) => {
    if (key === '/api/dashboard/voice/stats') return mockSWRStats
    return mockSWRCalls
  },
}))

import VoicePage from '@/app/dashboard/voice/page'

const mockStats = { callsToday: 12, avgDuration: 125, resolutionRate: 87.5, totalCalls: 240 }
const mockCall = {
  id: 'c1', timestamp: '2026-04-23T10:00:00Z',
  callerNumber: '+39 02 1234567', duration: 125,
  outcome: 'BOOKING_CREATED', transcriptSummary: 'Prenotazione tagliando confermata',
}

beforeEach(() => {
  jest.clearAllMocks()
  mockSWRStats = { data: undefined, error: undefined, isLoading: false, mutate: mockMutateStats }
  mockSWRCalls = { data: undefined, error: undefined, isLoading: false, mutate: mockMutateCalls }
})

describe('VoicePage', () => {
  describe('rendering iniziale', () => {
    it('renderizza titolo Assistente Vocale AI', () => {
      render(<VoicePage />)
      expect(screen.getByText('Assistente Vocale AI')).toBeInTheDocument()
    })

    it('renderizza sottotitolo', () => {
      render(<VoicePage />)
      expect(screen.getByText(/Gestisci le chiamate automatiche/)).toBeInTheDocument()
    })

    it('mostra "Attivo" di default', () => {
      render(<VoicePage />)
      expect(screen.getAllByText('Attivo').length).toBeGreaterThan(0)
    })

    it('renderizza sezione Configurazione', () => {
      render(<VoicePage />)
      expect(screen.getByText('Configurazione')).toBeInTheDocument()
    })

    it('renderizza label stat cards', () => {
      render(<VoicePage />)
      expect(screen.getByText('Chiamate oggi')).toBeInTheDocument()
      expect(screen.getByText('Durata media')).toBeInTheDocument()
      expect(screen.getByText('Tasso risoluzione')).toBeInTheDocument()
      expect(screen.getByText('Totale chiamate')).toBeInTheDocument()
    })
  })

  describe('stato loading', () => {
    it('renderizza Loader2 quando stats è in caricamento', () => {
      mockSWRStats = { data: undefined, error: undefined, isLoading: true, mutate: mockMutateStats }
      render(<VoicePage />)
      expect(document.querySelector('[data-icon="Loader2"]')).toBeInTheDocument()
    })

    it('renderizza Loader2 quando calls è in caricamento', () => {
      mockSWRCalls = { data: undefined, error: undefined, isLoading: true, mutate: mockMutateCalls }
      render(<VoicePage />)
      expect(document.querySelector('[data-icon="Loader2"]')).toBeInTheDocument()
    })

    it('mostra "..." nei valori stat durante caricamento', () => {
      mockSWRStats = { data: undefined, error: undefined, isLoading: true, mutate: mockMutateStats }
      render(<VoicePage />)
      expect(screen.getAllByText('...').length).toBeGreaterThan(0)
    })
  })

  describe('stato errore stats', () => {
    it('mostra messaggio impossibile caricare', () => {
      mockSWRStats = { data: undefined, error: new Error('fail'), isLoading: false, mutate: mockMutateStats }
      render(<VoicePage />)
      expect(screen.getByText(/Impossibile caricare i dati/)).toBeInTheDocument()
    })

    it('mostra bottone Riprova', () => {
      mockSWRStats = { data: undefined, error: new Error('fail'), isLoading: false, mutate: mockMutateStats }
      render(<VoicePage />)
      expect(screen.getByText('Riprova')).toBeInTheDocument()
    })

    it('click Riprova chiama mutateStats e mutateCalls', () => {
      mockSWRStats = { data: undefined, error: new Error('fail'), isLoading: false, mutate: mockMutateStats }
      render(<VoicePage />)
      fireEvent.click(screen.getByText('Riprova'))
      expect(mockMutateStats).toHaveBeenCalledTimes(1)
      expect(mockMutateCalls).toHaveBeenCalledTimes(1)
    })
  })

  describe('stato vuoto chiamate', () => {
    it('mostra "Nessuna chiamata recente"', () => {
      mockSWRStats = { data: mockStats, error: undefined, isLoading: false, mutate: mockMutateStats }
      mockSWRCalls = { data: [], error: undefined, isLoading: false, mutate: mockMutateCalls }
      render(<VoicePage />)
      expect(screen.getByText('Nessuna chiamata recente')).toBeInTheDocument()
    })
  })

  describe('stato con chiamate', () => {
    beforeEach(() => {
      mockSWRStats = { data: mockStats, error: undefined, isLoading: false, mutate: mockMutateStats }
      mockSWRCalls = { data: [mockCall], error: undefined, isLoading: false, mutate: mockMutateCalls }
    })

    it('renderizza numero chiamante', () => {
      render(<VoicePage />)
      expect(screen.getByText('+39 02 1234567')).toBeInTheDocument()
    })

    it('renderizza summary transcript', () => {
      render(<VoicePage />)
      expect(screen.getByText('Prenotazione tagliando confermata')).toBeInTheDocument()
    })

    it('outcome BOOKING_CREATED mostra "Prenotazione creata"', () => {
      render(<VoicePage />)
      expect(screen.getByText('Prenotazione creata')).toBeInTheDocument()
    })

    it('renderizza sezione Chiamate Recenti', () => {
      render(<VoicePage />)
      expect(screen.getByText('Chiamate Recenti')).toBeInTheDocument()
    })
  })

  describe('outcome badges', () => {
    const outcomeTests = [
      { outcome: 'INFO_PROVIDED', label: 'Info fornite' },
      { outcome: 'TRANSFERRED', label: 'Trasferito a operatore' },
      { outcome: 'MISSED', label: 'Persa' },
      { outcome: 'UNKNOWN_OUTCOME', label: 'Info fornite' },
    ]

    outcomeTests.forEach(({ outcome, label }) => {
      it(`outcome ${outcome} mostra "${label}"`, () => {
        mockSWRStats = { data: mockStats, error: undefined, isLoading: false, mutate: mockMutateStats }
        mockSWRCalls = {
          data: [{ ...mockCall, outcome }],
          error: undefined, isLoading: false, mutate: mockMutateCalls,
        }
        render(<VoicePage />)
        expect(screen.getByText(label)).toBeInTheDocument()
      })
    })
  })

  describe('stat values', () => {
    it('mostra callsToday nel valore', () => {
      mockSWRStats = { data: mockStats, error: undefined, isLoading: false, mutate: mockMutateStats }
      render(<VoicePage />)
      expect(screen.getByText('12')).toBeInTheDocument()
    })

    it('formatDuration: 125s → "2:05"', () => {
      mockSWRStats = { data: mockStats, error: undefined, isLoading: false, mutate: mockMutateStats }
      render(<VoicePage />)
      expect(screen.getByText('2:05')).toBeInTheDocument()
    })

    it('resolutionRate mostra "88%"', () => {
      mockSWRStats = { data: mockStats, error: undefined, isLoading: false, mutate: mockMutateStats }
      render(<VoicePage />)
      expect(screen.getByText('88%')).toBeInTheDocument()
    })
  })

  describe('switch toggle', () => {
    it('toggle switch mostra "Disattivato"', () => {
      render(<VoicePage />)
      const switches = screen.getAllByTestId('switch-toggle')
      fireEvent.click(switches[0])
      expect(screen.getAllByText('Disattivato').length).toBeGreaterThan(0)
    })
  })
})
