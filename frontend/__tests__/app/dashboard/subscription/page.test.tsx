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
  AppleCardContent: ({ children, className }: { children?: React.ReactNode; className?: string }) =>
    React.createElement('div', { 'data-testid': 'apple-card-content', className }, children),
  AppleCardHeader: ({ children, className }: { children?: React.ReactNode; className?: string }) =>
    React.createElement('div', { 'data-testid': 'apple-card-header', className }, children),
}))

jest.mock('@/components/ui/apple-button', () => ({
  AppleButton: ({ children, onClick, disabled, variant, className }: {
    children?: React.ReactNode; onClick?: () => void; disabled?: boolean
    variant?: string; className?: string
  }) =>
    React.createElement('button', { onClick, disabled, 'data-variant': variant, className }, children),
}))

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children?: React.ReactNode; className?: string }) =>
    React.createElement('span', { 'data-testid': 'badge', className }, children),
}))

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value, className }: { value?: number; className?: string }) =>
    React.createElement('div', { 'data-testid': 'progress', 'data-value': value, className }),
}))

let mockSWRReturn: { data: unknown; error: unknown; isLoading: boolean } = {
  data: undefined, error: undefined, isLoading: false,
}

jest.mock('swr', () => ({
  __esModule: true,
  default: () => mockSWRReturn,
}))

const mockFetch = jest.fn()
global.fetch = mockFetch

import SubscriptionPage from '@/app/dashboard/subscription/page'

const mockSubscription = {
  plan: 'MEDIUM',
  status: 'ACTIVE',
  billingCycle: 'monthly',
  nextRenewal: '2026-05-23T00:00:00Z',
  price: 89,
  usage: {
    users: { current: 5, limit: 15 },
    vehicles: { current: 100, limit: 5000 },
    storage: { current: 1024 * 1024 * 50, limit: 1024 * 1024 * 1024 },
  },
}

beforeEach(() => {
  jest.clearAllMocks()
  mockSWRReturn = { data: undefined, error: undefined, isLoading: false }
  jest.spyOn(window, 'open').mockImplementation(() => null)
})

describe('SubscriptionPage', () => {
  describe('stato loading', () => {
    it('renderizza Loader2', () => {
      mockSWRReturn = { data: undefined, error: undefined, isLoading: true }
      render(<SubscriptionPage />)
      expect(document.querySelector('[data-icon="Loader2"]')).toBeInTheDocument()
    })

    it('non renderizza contenuto principale', () => {
      mockSWRReturn = { data: undefined, error: undefined, isLoading: true }
      render(<SubscriptionPage />)
      expect(screen.queryByText('Abbonamento')).not.toBeInTheDocument()
    })
  })

  describe('stato errore', () => {
    it('mostra "Errore di caricamento"', () => {
      mockSWRReturn = { data: undefined, error: new Error('fail'), isLoading: false }
      render(<SubscriptionPage />)
      expect(screen.getByText('Errore di caricamento')).toBeInTheDocument()
    })

    it('mostra "Impossibile caricare i dati"', () => {
      mockSWRReturn = { data: undefined, error: new Error('fail'), isLoading: false }
      render(<SubscriptionPage />)
      expect(screen.getByText(/Impossibile caricare i dati/)).toBeInTheDocument()
    })
  })

  describe('rendering con dati', () => {
    beforeEach(() => {
      mockSWRReturn = { data: mockSubscription, error: undefined, isLoading: false }
    })

    it('renderizza titolo Abbonamento', () => {
      render(<SubscriptionPage />)
      expect(screen.getByText('Abbonamento')).toBeInTheDocument()
    })

    it('renderizza bottone Gestisci Abbonamento', () => {
      render(<SubscriptionPage />)
      expect(screen.getByText('Gestisci Abbonamento')).toBeInTheDocument()
    })

    it('renderizza sezione Piano Attuale', () => {
      render(<SubscriptionPage />)
      expect(screen.getAllByText('Piano Attuale').length).toBeGreaterThan(0)
    })

    it('mostra nome piano Pro (MEDIUM)', () => {
      render(<SubscriptionPage />)
      expect(screen.getAllByText('Pro').length).toBeGreaterThan(0)
    })

    it('mostra Confronto Piani', () => {
      render(<SubscriptionPage />)
      expect(screen.getByText('Confronto Piani')).toBeInTheDocument()
    })

    it('renderizza Starter tier', () => {
      render(<SubscriptionPage />)
      expect(screen.getByText('Starter')).toBeInTheDocument()
    })

    it('renderizza Enterprise tier', () => {
      render(<SubscriptionPage />)
      expect(screen.getByText('Enterprise')).toBeInTheDocument()
    })

    it('renderizza sezione Add-on Disponibili', () => {
      render(<SubscriptionPage />)
      expect(screen.getByText('Add-on Disponibili')).toBeInTheDocument()
    })

    it('renderizza Assistente Vocale AI addon', () => {
      render(<SubscriptionPage />)
      expect(screen.getAllByText('Assistente Vocale AI').length).toBeGreaterThan(0)
    })

    it('renderizza sezione Utilizzo', () => {
      render(<SubscriptionPage />)
      expect(screen.getByText('Utilizzo')).toBeInTheDocument()
    })

    it('renderizza label Utenti', () => {
      render(<SubscriptionPage />)
      expect(screen.getByText('Utenti')).toBeInTheDocument()
    })

    it('renderizza label Veicoli', () => {
      render(<SubscriptionPage />)
      expect(screen.getByText('Veicoli')).toBeInTheDocument()
    })

    it('renderizza label Storage', () => {
      render(<SubscriptionPage />)
      expect(screen.getByText('Storage')).toBeInTheDocument()
    })

    it('renderizza progress bars (3 per utilizzo)', () => {
      render(<SubscriptionPage />)
      const progressBars = screen.getAllByTestId('progress')
      expect(progressBars.length).toBeGreaterThanOrEqual(3)
    })

    it('mostra Prossimo rinnovo', () => {
      render(<SubscriptionPage />)
      expect(screen.getByText('Prossimo rinnovo')).toBeInTheDocument()
    })

    it('bottone piano corrente mostra "Attivo"', () => {
      render(<SubscriptionPage />)
      const attivoButtons = screen.getAllByRole('button').filter(b => b.textContent === 'Attivo')
      expect(attivoButtons.length).toBeGreaterThan(0)
    })
  })

  describe('getStatusBadge', () => {
    const statusTests = [
      { status: 'ACTIVE', label: 'Attivo' },
      { status: 'TRIAL', label: 'Trial' },
      { status: 'PAST_DUE', label: 'Scaduto' },
      { status: 'CANCELLED', label: 'Cancellato' },
      { status: 'UNPAID', label: 'Non pagato' },
    ]

    statusTests.forEach(({ status, label }) => {
      it(`status ${status} mostra "${label}"`, () => {
        mockSWRReturn = {
          data: { ...mockSubscription, status },
          error: undefined, isLoading: false,
        }
        render(<SubscriptionPage />)
        expect(screen.getAllByText(label).length).toBeGreaterThan(0)
      })
    })
  })

  describe('usagePercent con limit null', () => {
    it('limit null → progress value 0', () => {
      mockSWRReturn = {
        data: {
          ...mockSubscription,
          usage: {
            users: { current: 5, limit: null },
            vehicles: { current: 100, limit: null },
            storage: { current: 0, limit: null },
          },
        },
        error: undefined, isLoading: false,
      }
      render(<SubscriptionPage />)
      const progressBars = screen.getAllByTestId('progress')
      progressBars.forEach(bar => {
        expect(bar.getAttribute('data-value')).toBe('0')
      })
    })

    it('limit null mostra "Illimitati" per utenti', () => {
      mockSWRReturn = {
        data: {
          ...mockSubscription,
          usage: { ...mockSubscription.usage, users: { current: 5, limit: null } },
        },
        error: undefined, isLoading: false,
      }
      render(<SubscriptionPage />)
      expect(screen.getByText(/Illimitati/)).toBeInTheDocument()
    })
  })

  describe('handleUpgrade Enterprise', () => {
    it('click Upgrade su Enterprise chiama window.open con mailto', async () => {
      // With plan=MEDIUM as current, only ENTERPRISE tier shows "Upgrade"
      mockSWRReturn = { data: { ...mockSubscription, plan: 'MEDIUM' }, error: undefined, isLoading: false }
      render(<SubscriptionPage />)
      const upgradeBtns = screen.getAllByRole('button').filter(b => b.textContent === 'Upgrade')
      expect(upgradeBtns.length).toBe(1)
      await act(async () => { fireEvent.click(upgradeBtns[0]) })
      expect(window.open).toHaveBeenCalledWith(expect.stringContaining('mailto:'), '_blank')
    })
  })

  describe('handleManagePortal', () => {
    it('chiama POST /api/stripe/portal', async () => {
      mockSWRReturn = { data: mockSubscription, error: undefined, isLoading: false }
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ url: undefined }) })
      render(<SubscriptionPage />)
      await act(async () => { fireEvent.click(screen.getByText('Gestisci Abbonamento')) })
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/stripe/portal', expect.objectContaining({ method: 'POST' }))
      })
    })

    it('errore chiama toast.error', async () => {
      mockSWRReturn = { data: mockSubscription, error: undefined, isLoading: false }
      mockFetch.mockResolvedValueOnce({ ok: false })
      render(<SubscriptionPage />)
      await act(async () => { fireEvent.click(screen.getByText('Gestisci Abbonamento')) })
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled()
      })
    })
  })

  describe('handleUpgrade SMALL → MEDIUM', () => {
    it('successo senza URL chiama toast.success', async () => {
      mockSWRReturn = { data: { ...mockSubscription, plan: 'SMALL' }, error: undefined, isLoading: false }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })
      render(<SubscriptionPage />)
      const buttons = screen.getAllByRole('button')
      const upgradeBtn = buttons.find(b => b.textContent === 'Upgrade')
      if (upgradeBtn) {
        await act(async () => { fireEvent.click(upgradeBtn) })
        await waitFor(() => {
          expect(toast.success).toHaveBeenCalledWith('Piano aggiornato con successo')
        })
      }
    })

    it('errore fetch chiama toast.error', async () => {
      mockSWRReturn = { data: { ...mockSubscription, plan: 'SMALL' }, error: undefined, isLoading: false }
      mockFetch.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({}) })
      render(<SubscriptionPage />)
      const buttons = screen.getAllByRole('button')
      const upgradeBtn = buttons.find(b => b.textContent === 'Upgrade')
      if (upgradeBtn) {
        await act(async () => { fireEvent.click(upgradeBtn) })
        await waitFor(() => {
          expect(toast.error).toHaveBeenCalled()
        })
      }
    })
  })

  describe('piano FREE (nessuna corrispondenza TIERS)', () => {
    it('mostra il piano come FREE quando non corrisponde ad alcun tier', () => {
      mockSWRReturn = {
        data: { ...mockSubscription, plan: 'FREE', price: 0 },
        error: undefined, isLoading: false,
      }
      render(<SubscriptionPage />)
      expect(screen.getByText('FREE')).toBeInTheDocument()
    })

    it('mostra "Gratuito" quando price è 0', () => {
      mockSWRReturn = {
        data: { ...mockSubscription, plan: 'FREE', price: 0 },
        error: undefined, isLoading: false,
      }
      render(<SubscriptionPage />)
      expect(screen.getAllByText('Gratuito').length).toBeGreaterThan(0)
    })
  })
})
