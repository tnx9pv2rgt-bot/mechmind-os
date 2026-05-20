import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { toast } from 'sonner'

// ── framer-motion ──────────────────────────────────────────────────────────────
jest.mock('framer-motion', () => {
  const React = require('react')
  const cache = new Map<string, unknown>()
  return {
    motion: new Proxy({}, {
      get: (_t: unknown, prop: string) => {
        if (!cache.has(prop)) {
          cache.set(prop, React.forwardRef(
            ({ children, ...rest }: { children?: React.ReactNode; [k: string]: unknown }, ref: React.Ref<HTMLElement>) => {
              const allowed = ['className', 'style', 'onClick', 'id', 'role', 'tabIndex']
              const valid: Record<string, unknown> = {}
              for (const k of Object.keys(rest)) {
                if (allowed.includes(k) || k.startsWith('data-') || k.startsWith('aria-')) valid[k] = rest[k]
              }
              const tag = ['div','span','section','header','ul','li','p','form','button','a'].includes(prop) ? prop : 'div'
              return React.createElement(tag, { ...valid, ref }, children)
            }
          ))
        }
        return cache.get(prop)
      },
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
const mockRouterPush = jest.fn()
const mockSearchParamsGet = jest.fn().mockReturnValue(null)

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
  useSearchParams: () => ({ get: mockSearchParamsGet }),
}))

// ── swr ────────────────────────────────────────────────────────────────────────
const mockUseSWR = jest.fn()

jest.mock('swr', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockUseSWR(...args),
}))

// ── sonner ────────────────────────────────────────────────────────────────────
jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}))

// ── UI components ─────────────────────────────────────────────────────────────
jest.mock('@/components/ui/apple-card', () => ({
  AppleCard: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'apple-card' }, children),
  AppleCardContent: ({ children, className }: { children?: React.ReactNode; className?: string }) =>
    React.createElement('div', { 'data-testid': 'apple-card-content', className }, children),
  AppleCardHeader: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'apple-card-header' }, children),
}))

jest.mock('@/components/ui/input', () => ({
  Input: React.forwardRef((props: React.InputHTMLAttributes<HTMLInputElement>, ref: React.Ref<HTMLInputElement>) =>
    React.createElement('input', { ...props, ref }),
  ),
}))

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: { children?: React.ReactNode; variant?: string }) =>
    React.createElement('span', { 'data-testid': 'badge', 'data-variant': variant }, children),
}))

import SearchPage from '@/app/dashboard/search/page'

function setupSWR(data: unknown = undefined, opts: { isLoading?: boolean; error?: Error } = {}) {
  mockUseSWR.mockReturnValue({
    data,
    isLoading: opts.isLoading ?? false,
    error: opts.error,
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers()
  mockSearchParamsGet.mockReturnValue(null)
  setupSWR()
})

afterEach(() => {
  jest.runOnlyPendingTimers()
  jest.useRealTimers()
})

describe('SearchPage', () => {
  describe('stato iniziale (query < 2 chars)', () => {
    it('renderizza header Ricerca', () => {
      render(<SearchPage />)
      expect(screen.getByText('Ricerca')).toBeInTheDocument()
    })

    it('renderizza sottotitolo Cerca in tutto il sistema', () => {
      render(<SearchPage />)
      expect(screen.getByText('Cerca in tutto il sistema')).toBeInTheDocument()
    })

    it('renderizza input di ricerca', () => {
      render(<SearchPage />)
      expect(screen.getByPlaceholderText('Cerca clienti, veicoli, ordini, fatture...')).toBeInTheDocument()
    })

    it('renderizza stato iniziale "Inizia a digitare per cercare"', () => {
      render(<SearchPage />)
      expect(screen.getByText('Inizia a digitare per cercare')).toBeInTheDocument()
    })

    it('SWR chiamato con key null per query corta', () => {
      render(<SearchPage />)
      const [key] = mockUseSWR.mock.calls[0]
      expect(key).toBeNull()
    })
  })

  describe('query iniziale dall\'URL', () => {
    it('popola il campo con q param', () => {
      mockSearchParamsGet.mockReturnValue('mario')
      setupSWR({ results: [] })
      render(<SearchPage />)
      const input = screen.getByPlaceholderText('Cerca clienti, veicoli, ordini, fatture...') as HTMLInputElement
      expect(input.value).toBe('mario')
    })

    it('SWR chiamato con key non-null quando q >= 2', () => {
      mockSearchParamsGet.mockReturnValue('ab')
      setupSWR({ results: [] })
      render(<SearchPage />)
      const [key] = mockUseSWR.mock.calls[0]
      expect(key).toContain('/api/dashboard/search?q=ab')
    })
  })

  describe('debounce', () => {
    it('query < 2 dopo debounce → SWR key null', () => {
      render(<SearchPage />)
      const input = screen.getByPlaceholderText('Cerca clienti, veicoli, ordini, fatture...')
      fireEvent.change(input, { target: { value: 'a' } })
      act(() => { jest.advanceTimersByTime(300) })
      const calls = mockUseSWR.mock.calls
      const lastKey = calls[calls.length - 1][0]
      expect(lastKey).toBeNull()
    })

    it('query >= 2 dopo debounce → SWR key non-null', () => {
      setupSWR({ results: [] })
      render(<SearchPage />)
      const input = screen.getByPlaceholderText('Cerca clienti, veicoli, ordini, fatture...')
      fireEvent.change(input, { target: { value: 'mario' } })
      act(() => { jest.advanceTimersByTime(300) })
      const calls = mockUseSWR.mock.calls
      const lastKey = calls[calls.length - 1][0]
      expect(lastKey).toContain('mario')
    })
  })

  describe('stato loading', () => {
    it('mostra spinner Loader2 nell\'input quando isLoading', () => {
      mockSearchParamsGet.mockReturnValue('test')
      setupSWR(undefined, { isLoading: true })
      render(<SearchPage />)
      expect(document.querySelector('[data-icon="Loader2"]')).toBeInTheDocument()
    })

    it('non mostra stato iniziale durante loading', () => {
      mockSearchParamsGet.mockReturnValue('test')
      setupSWR(undefined, { isLoading: true })
      render(<SearchPage />)
      expect(screen.queryByText('Inizia a digitare per cercare')).not.toBeInTheDocument()
    })
  })

  describe('stato errore', () => {
    it('mostra card errore quando error e debouncedQuery >= 2', () => {
      mockSearchParamsGet.mockReturnValue('test')
      setupSWR(undefined, { error: new Error('err') })
      render(<SearchPage />)
      expect(screen.getByText('Errore durante la ricerca. Riprova.')).toBeInTheDocument()
    })
  })

  describe('risultati vuoti', () => {
    it('mostra "Nessun risultato" quando results è array vuoto', () => {
      mockSearchParamsGet.mockReturnValue('xyz123')
      setupSWR({ results: [] })
      render(<SearchPage />)
      expect(screen.getByText(/Nessun risultato per/)).toBeInTheDocument()
    })

    it('include la query nel messaggio nessun risultato', () => {
      mockSearchParamsGet.mockReturnValue('xyz123')
      setupSWR({ results: [] })
      render(<SearchPage />)
      expect(screen.getByText(/xyz123/)).toBeInTheDocument()
    })
  })

  describe('risultati flat (data.results)', () => {
    it('mostra il titolo del risultato customer', () => {
      mockSearchParamsGet.mockReturnValue('mario')
      setupSWR({
        results: [{ id: '1', type: 'customer', title: 'Mario Rossi', subtitle: 'mario@test.it', url: '/dashboard/customers/1' }],
      })
      render(<SearchPage />)
      expect(screen.getByText('Mario Rossi')).toBeInTheDocument()
    })

    it('mostra il subtitle del risultato', () => {
      mockSearchParamsGet.mockReturnValue('mario')
      setupSWR({
        results: [{ id: '1', type: 'customer', title: 'Mario Rossi', subtitle: 'mario@test.it', url: '/dashboard/customers/1' }],
      })
      render(<SearchPage />)
      expect(screen.getByText('mario@test.it')).toBeInTheDocument()
    })

    it('mostra label tipo "Clienti" per customer', () => {
      mockSearchParamsGet.mockReturnValue('mario')
      setupSWR({
        results: [{ id: '1', type: 'customer', title: 'Mario Rossi', subtitle: '', url: '/url' }],
      })
      render(<SearchPage />)
      expect(screen.getByText('Clienti')).toBeInTheDocument()
    })

    it('mostra label tipo "Veicoli" per vehicle', () => {
      mockSearchParamsGet.mockReturnValue('test')
      setupSWR({
        results: [{ id: '1', type: 'vehicle', title: 'Fiat Punto', subtitle: 'AB123CD', url: '/url' }],
      })
      render(<SearchPage />)
      expect(screen.getByText('Veicoli')).toBeInTheDocument()
    })

    it('mostra label tipo "Ordini di Lavoro" per work-order', () => {
      mockSearchParamsGet.mockReturnValue('test')
      setupSWR({
        results: [{ id: '1', type: 'work-order', title: 'OL-001', subtitle: 'test', url: '/url' }],
      })
      render(<SearchPage />)
      expect(screen.getByText('Ordini di Lavoro')).toBeInTheDocument()
    })

    it('mostra label tipo "Fatture" per invoice', () => {
      mockSearchParamsGet.mockReturnValue('test')
      setupSWR({
        results: [{ id: '1', type: 'invoice', title: 'FAT-001', subtitle: 'test', url: '/url' }],
      })
      render(<SearchPage />)
      expect(screen.getByText('Fatture')).toBeInTheDocument()
    })

    it('mostra label tipo "Prenotazioni" per booking', () => {
      mockSearchParamsGet.mockReturnValue('test')
      setupSWR({
        results: [{ id: '1', type: 'booking', title: 'BK-001', subtitle: 'test', url: '/url' }],
      })
      render(<SearchPage />)
      expect(screen.getByText('Prenotazioni')).toBeInTheDocument()
    })

    it('usa il tipo come label per tipo sconosciuto (fallback)', () => {
      mockSearchParamsGet.mockReturnValue('test')
      setupSWR({
        results: [{ id: '1', type: 'unknown-type', title: 'Risultato', subtitle: '', url: '/url' }],
      })
      render(<SearchPage />)
      expect(screen.getByText('unknown-type')).toBeInTheDocument()
    })

    it('click su risultato chiama router.push con URL', () => {
      mockSearchParamsGet.mockReturnValue('mario')
      setupSWR({
        results: [{ id: '1', type: 'customer', title: 'Mario Rossi', subtitle: '', url: '/dashboard/customers/1' }],
      })
      render(<SearchPage />)
      fireEvent.click(screen.getByText('Mario Rossi'))
      expect(mockRouterPush).toHaveBeenCalledWith('/dashboard/customers/1')
    })

    it('mostra badge con conteggio risultati per gruppo', () => {
      mockSearchParamsGet.mockReturnValue('mario')
      setupSWR({
        results: [{ id: '1', type: 'customer', title: 'Mario', subtitle: '', url: '/url' }],
      })
      render(<SearchPage />)
      expect(screen.getByText('1')).toBeInTheDocument()
    })
  })

  describe('risultati raggruppati (data.data)', () => {
    it('mostra risultato da data.data.customers', () => {
      mockSearchParamsGet.mockReturnValue('test')
      setupSWR({
        data: {
          customers: [{ id: '1', type: 'customer', title: 'Cliente Test', subtitle: '', url: '/url' }],
        },
      })
      render(<SearchPage />)
      expect(screen.getByText('Cliente Test')).toBeInTheDocument()
    })

    it('mostra risultato da data.data.vehicles', () => {
      mockSearchParamsGet.mockReturnValue('test')
      setupSWR({
        data: {
          vehicles: [{ id: '1', type: 'vehicle', title: 'Veicolo Test', subtitle: '', url: '/url' }],
        },
      })
      render(<SearchPage />)
      expect(screen.getByText('Veicolo Test')).toBeInTheDocument()
    })

    it('mostra risultato da data.data.workOrders', () => {
      mockSearchParamsGet.mockReturnValue('test')
      setupSWR({
        data: {
          workOrders: [{ id: '1', type: 'work-order', title: 'OL Test', subtitle: '', url: '/url' }],
        },
      })
      render(<SearchPage />)
      expect(screen.getByText('OL Test')).toBeInTheDocument()
    })

    it('mostra risultato da data.data.invoices', () => {
      mockSearchParamsGet.mockReturnValue('test')
      setupSWR({
        data: {
          invoices: [{ id: '1', type: 'invoice', title: 'FAT Test', subtitle: '', url: '/url' }],
        },
      })
      render(<SearchPage />)
      expect(screen.getByText('FAT Test')).toBeInTheDocument()
    })

    it('mostra risultato da data.data.bookings', () => {
      mockSearchParamsGet.mockReturnValue('test')
      setupSWR({
        data: {
          bookings: [{ id: '1', type: 'booking', title: 'BK Test', subtitle: '', url: '/url' }],
        },
      })
      render(<SearchPage />)
      expect(screen.getByText('BK Test')).toBeInTheDocument()
    })

    it('restituisce array vuoto quando data è undefined', () => {
      mockSearchParamsGet.mockReturnValue('test')
      setupSWR(undefined)
      render(<SearchPage />)
      expect(screen.queryByText('Clienti')).not.toBeInTheDocument()
    })

    it('restituisce array vuoto quando data non ha results né data', () => {
      mockSearchParamsGet.mockReturnValue('test')
      setupSWR({ total: 0 })
      render(<SearchPage />)
      expect(screen.getByText(/Nessun risultato/)).toBeInTheDocument()
    })
  })

  describe('fetcher', () => {
    it('fetcher con res.ok restituisce json', async () => {
      let capturedFetcher: ((url: string) => Promise<unknown>) | undefined
      mockUseSWR.mockImplementation((key: string, fetcher: (url: string) => Promise<unknown>) => {
        capturedFetcher = fetcher
        return { data: undefined, isLoading: false }
      })
      render(<SearchPage />)
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ results: [{ id: '1', type: 'customer', title: 'Test', subtitle: '', url: '/url' }] }),
      }) as jest.Mock
      const result = await capturedFetcher?.('/api/dashboard/search?q=test')
      expect(result).toBeDefined()
      expect((result as { results: unknown[] }).results).toHaveLength(1)
    })

    it('fetcher con !res.ok lancia errore', async () => {
      let capturedFetcher: ((url: string) => Promise<unknown>) | undefined
      mockUseSWR.mockImplementation((key: string, fetcher: (url: string) => Promise<unknown>) => {
        capturedFetcher = fetcher
        return { data: undefined, isLoading: false }
      })
      render(<SearchPage />)
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({}),
      }) as jest.Mock
      await expect(capturedFetcher?.('/api/dashboard/search?q=test')).rejects.toThrow('Errore ricerca')
    })
  })

  describe('onError callback', () => {
    it('onError chiama toast.error', () => {
      mockUseSWR.mockImplementation((_key: unknown, _fetcher: unknown, opts: { onError?: (e: Error) => void }) => {
        opts?.onError?.(new Error('err'))
        return { data: undefined, isLoading: false }
      })
      render(<SearchPage />)
      expect(toast.error).toHaveBeenCalledWith('Errore durante la ricerca')
    })
  })
})
