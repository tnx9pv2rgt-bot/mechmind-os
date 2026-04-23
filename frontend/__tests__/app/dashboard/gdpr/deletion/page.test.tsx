import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { toast } from 'sonner'

// ── framer-motion ──────────────────────────────────────────────────────────────
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
const mockRouterBack = jest.fn()
const mockRouterPush = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ back: mockRouterBack, push: mockRouterPush }),
}))

// ── sonner ─────────────────────────────────────────────────────────────────────
jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

// ── UI components ──────────────────────────────────────────────────────────────
jest.mock('@/components/ui/apple-button', () => ({
  AppleButton: ({ children, onClick, disabled, loading, variant, size, icon, className }: {
    children?: React.ReactNode; onClick?: () => void; disabled?: boolean
    loading?: boolean; variant?: string; size?: string; icon?: React.ReactNode; className?: string
  }) =>
    React.createElement('button', { onClick, disabled: disabled || loading, 'data-variant': variant, className }, icon, children),
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
    React.createElement('input', { ...props, ref }),
  ),
}))

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, className }: { children?: React.ReactNode; className?: string }) =>
    React.createElement('label', { className }, children),
}))

jest.mock('@/components/ui/breadcrumb', () => ({
  Breadcrumb: ({ items }: { items: { label: string; href?: string }[] }) =>
    React.createElement('nav', { 'data-testid': 'breadcrumb' },
      items.map(i => React.createElement('span', { key: i.label }, i.label))
    ),
}))

const mockFetch = jest.fn()
global.fetch = mockFetch

import GdprDeletionPage from '@/app/dashboard/gdpr/deletion/page'

beforeEach(() => {
  jest.clearAllMocks()
})

describe('GdprDeletionPage', () => {
  describe('rendering iniziale', () => {
    it('renderizza titolo Eliminazione Account', () => {
      render(<GdprDeletionPage />)
      expect(screen.getByText('Eliminazione Account')).toBeInTheDocument()
    })

    it('renderizza avviso irreversibile', () => {
      render(<GdprDeletionPage />)
      expect(screen.getByText(/Questa azione/)).toBeInTheDocument()
    })

    it('renderizza sezione "Cosa verrà eliminato"', () => {
      render(<GdprDeletionPage />)
      expect(screen.getByText(/Cosa verra eliminato/)).toBeInTheDocument()
    })

    it('renderizza tutti i DELETED_ITEMS', () => {
      render(<GdprDeletionPage />)
      expect(screen.getByText('Account e profilo utente')).toBeInTheDocument()
      expect(screen.getByText('Fatture e documenti fiscali')).toBeInTheDocument()
      expect(screen.getByText('Veicoli e ordini di lavoro')).toBeInTheDocument()
      expect(screen.getByText('Dati di pagamento')).toBeInTheDocument()
      expect(screen.getByText('Comunicazioni e notifiche')).toBeInTheDocument()
      expect(screen.getByText('Log di accesso e audit')).toBeInTheDocument()
    })

    it('renderizza campo password', () => {
      render(<GdprDeletionPage />)
      expect(screen.getByPlaceholderText('Inserisci la tua password')).toBeInTheDocument()
    })

    it('renderizza campo conferma', () => {
      render(<GdprDeletionPage />)
      expect(screen.getByPlaceholderText('Digita ELIMINA')).toBeInTheDocument()
    })

    it('pulsante elimina disabilitato inizialmente', () => {
      render(<GdprDeletionPage />)
      expect(screen.getByText('Elimina il mio Account').closest('button')).toBeDisabled()
    })

    it('renderizza breadcrumb', () => {
      render(<GdprDeletionPage />)
      expect(screen.getByTestId('breadcrumb')).toBeInTheDocument()
    })
  })

  describe('pulsante Indietro', () => {
    it('click Indietro chiama router.back()', () => {
      render(<GdprDeletionPage />)
      fireEvent.click(screen.getByText('Indietro'))
      expect(mockRouterBack).toHaveBeenCalledTimes(1)
    })
  })

  describe('validazione conferma', () => {
    it('mostra errore se conferma non è "ELIMINA"', () => {
      render(<GdprDeletionPage />)
      fireEvent.change(screen.getByPlaceholderText('Digita ELIMINA'), { target: { value: 'elimina' } })
      expect(screen.getByText(/Devi digitare esattamente/)).toBeInTheDocument()
    })

    it('non mostra errore se conferma è esattamente "ELIMINA"', () => {
      render(<GdprDeletionPage />)
      fireEvent.change(screen.getByPlaceholderText('Digita ELIMINA'), { target: { value: 'ELIMINA' } })
      expect(screen.queryByText(/Devi digitare esattamente/)).not.toBeInTheDocument()
    })

    it('non mostra errore con campo vuoto', () => {
      render(<GdprDeletionPage />)
      expect(screen.queryByText(/Devi digitare esattamente/)).not.toBeInTheDocument()
    })
  })

  describe('canSubmit', () => {
    it('pulsante abilitato con password + ELIMINA', () => {
      render(<GdprDeletionPage />)
      fireEvent.change(screen.getByPlaceholderText('Inserisci la tua password'), { target: { value: 'mypassword' } })
      fireEvent.change(screen.getByPlaceholderText('Digita ELIMINA'), { target: { value: 'ELIMINA' } })
      expect(screen.getByText('Elimina il mio Account').closest('button')).not.toBeDisabled()
    })

    it('pulsante disabilitato con solo password (senza ELIMINA)', () => {
      render(<GdprDeletionPage />)
      fireEvent.change(screen.getByPlaceholderText('Inserisci la tua password'), { target: { value: 'mypassword' } })
      expect(screen.getByText('Elimina il mio Account').closest('button')).toBeDisabled()
    })

    it('pulsante disabilitato con ELIMINA ma senza password', () => {
      render(<GdprDeletionPage />)
      fireEvent.change(screen.getByPlaceholderText('Digita ELIMINA'), { target: { value: 'ELIMINA' } })
      expect(screen.getByText('Elimina il mio Account').closest('button')).toBeDisabled()
    })
  })

  describe('handleDelete - successo', () => {
    it('POST a /api/gdpr/deletion con password e conferma', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      render(<GdprDeletionPage />)
      fireEvent.change(screen.getByPlaceholderText('Inserisci la tua password'), { target: { value: 'secret123' } })
      fireEvent.change(screen.getByPlaceholderText('Digita ELIMINA'), { target: { value: 'ELIMINA' } })
      await act(async () => {
        fireEvent.click(screen.getByText('Elimina il mio Account'))
      })
      expect(mockFetch).toHaveBeenCalledWith('/api/gdpr/deletion', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ password: 'secret123', confirmation: 'ELIMINA' }),
      }))
    })

    it('su successo mostra "Richiesta Ricevuta"', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      render(<GdprDeletionPage />)
      fireEvent.change(screen.getByPlaceholderText('Inserisci la tua password'), { target: { value: 'secret' } })
      fireEvent.change(screen.getByPlaceholderText('Digita ELIMINA'), { target: { value: 'ELIMINA' } })
      await act(async () => {
        fireEvent.click(screen.getByText('Elimina il mio Account'))
      })
      await waitFor(() => {
        expect(screen.getByText('Richiesta Ricevuta')).toBeInTheDocument()
      })
    })

    it('su successo chiama toast.success', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      render(<GdprDeletionPage />)
      fireEvent.change(screen.getByPlaceholderText('Inserisci la tua password'), { target: { value: 'secret' } })
      fireEvent.change(screen.getByPlaceholderText('Digita ELIMINA'), { target: { value: 'ELIMINA' } })
      await act(async () => {
        fireEvent.click(screen.getByText('Elimina il mio Account'))
      })
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Richiesta di eliminazione account inviata')
      })
    })

    it('success state: "Torna alla Dashboard" → router.push(/dashboard)', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      render(<GdprDeletionPage />)
      fireEvent.change(screen.getByPlaceholderText('Inserisci la tua password'), { target: { value: 'secret' } })
      fireEvent.change(screen.getByPlaceholderText('Digita ELIMINA'), { target: { value: 'ELIMINA' } })
      await act(async () => {
        fireEvent.click(screen.getByText('Elimina il mio Account'))
      })
      await waitFor(() => screen.getByText('Torna alla Dashboard'))
      fireEvent.click(screen.getByText('Torna alla Dashboard'))
      expect(mockRouterPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  describe('handleDelete - errore', () => {
    it('su res.ok=false mostra errore dal data.message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Password errata' }),
      })
      render(<GdprDeletionPage />)
      fireEvent.change(screen.getByPlaceholderText('Inserisci la tua password'), { target: { value: 'wrong' } })
      fireEvent.change(screen.getByPlaceholderText('Digita ELIMINA'), { target: { value: 'ELIMINA' } })
      await act(async () => {
        fireEvent.click(screen.getByText('Elimina il mio Account'))
      })
      await waitFor(() => {
        expect(screen.getByText('Password errata')).toBeInTheDocument()
      })
    })

    it('su res.ok=false chiama toast.error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Accesso negato' }),
      })
      render(<GdprDeletionPage />)
      fireEvent.change(screen.getByPlaceholderText('Inserisci la tua password'), { target: { value: 'x' } })
      fireEvent.change(screen.getByPlaceholderText('Digita ELIMINA'), { target: { value: 'ELIMINA' } })
      await act(async () => {
        fireEvent.click(screen.getByText('Elimina il mio Account'))
      })
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Accesso negato')
      })
    })

    it('su res.ok=false usa fallback error.message quando json fallisce', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.reject(new Error('json parse fail')),
      })
      render(<GdprDeletionPage />)
      fireEvent.change(screen.getByPlaceholderText('Inserisci la tua password'), { target: { value: 'x' } })
      fireEvent.change(screen.getByPlaceholderText('Digita ELIMINA'), { target: { value: 'ELIMINA' } })
      await act(async () => {
        fireEvent.click(screen.getByText('Elimina il mio Account'))
      })
      await waitFor(() => {
        expect(screen.getByText('Errore nella richiesta di eliminazione')).toBeInTheDocument()
      })
    })

    it('su network error mostra messaggio di errore generico', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      render(<GdprDeletionPage />)
      fireEvent.change(screen.getByPlaceholderText('Inserisci la tua password'), { target: { value: 'x' } })
      fireEvent.change(screen.getByPlaceholderText('Digita ELIMINA'), { target: { value: 'ELIMINA' } })
      await act(async () => {
        fireEvent.click(screen.getByText('Elimina il mio Account'))
      })
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })

    it('su res.ok=false usa data.error.message se disponibile', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: { message: 'Errore dettagliato' } }),
      })
      render(<GdprDeletionPage />)
      fireEvent.change(screen.getByPlaceholderText('Inserisci la tua password'), { target: { value: 'x' } })
      fireEvent.change(screen.getByPlaceholderText('Digita ELIMINA'), { target: { value: 'ELIMINA' } })
      await act(async () => {
        fireEvent.click(screen.getByText('Elimina il mio Account'))
      })
      await waitFor(() => {
        expect(screen.getByText('Errore dettagliato')).toBeInTheDocument()
      })
    })
  })

  describe('handleDelete - guard canSubmit', () => {
    it('non chiama fetch quando canSubmit è false', async () => {
      render(<GdprDeletionPage />)
      await act(async () => {
        fireEvent.click(screen.getByText('Elimina il mio Account'))
      })
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })
})
