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
          const tag = ['div','span'].includes(prop) ? prop : 'div'
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

jest.mock('@/components/ui/breadcrumb', () => ({
  Breadcrumb: ({ items }: { items: { label: string; href?: string }[] }) =>
    React.createElement('nav', { 'data-testid': 'breadcrumb' },
      items.map(i => React.createElement('span', { key: i.label }, i.label))
    ),
}))

const mockFetch = jest.fn()
global.fetch = mockFetch

const mockWindowOpen = jest.fn()
Object.defineProperty(window, 'open', { value: mockWindowOpen, writable: true })

import GdprExportPage from '@/app/dashboard/gdpr/export/page'

beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers()
})

afterEach(() => {
  jest.runOnlyPendingTimers()
  jest.useRealTimers()
})

describe('GdprExportPage', () => {
  describe('stato idle iniziale', () => {
    it('renderizza titolo Esportazione Dati', () => {
      render(<GdprExportPage />)
      expect(screen.getByText('Esportazione Dati')).toBeInTheDocument()
    })

    it('renderizza bottone "Richiedi Esportazione Dati"', () => {
      render(<GdprExportPage />)
      expect(screen.getByText('Richiedi Esportazione Dati')).toBeInTheDocument()
    })

    it('renderizza descrizione GDPR Art. 20', () => {
      render(<GdprExportPage />)
      expect(screen.getByText(/Art. 20 del GDPR/)).toBeInTheDocument()
    })

    it('renderizza lista contenuto file ZIP', () => {
      render(<GdprExportPage />)
      expect(screen.getByText(/Dati del profilo/)).toBeInTheDocument()
      expect(screen.getByText(/Fatture e documenti fiscali/)).toBeInTheDocument()
      expect(screen.getByText(/Ordini di lavoro/)).toBeInTheDocument()
      expect(screen.getByText(/Comunicazioni e notifiche/)).toBeInTheDocument()
    })

    it('renderizza breadcrumb', () => {
      render(<GdprExportPage />)
      expect(screen.getByTestId('breadcrumb')).toBeInTheDocument()
    })
  })

  describe('pulsante Indietro', () => {
    it('click Indietro chiama router.back()', () => {
      render(<GdprExportPage />)
      fireEvent.click(screen.getByText('Indietro'))
      expect(mockRouterBack).toHaveBeenCalledTimes(1)
    })
  })

  describe('startExport - successo', () => {
    it('mostra spinner "Esportazione in corso..." dopo avvio', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ requestId: 'req-123', estimatedTime: '5 minuti' }),
      })
      render(<GdprExportPage />)
      await act(async () => {
        fireEvent.click(screen.getByText('Richiedi Esportazione Dati'))
      })
      await waitFor(() => {
        expect(screen.getByText('Esportazione in corso...')).toBeInTheDocument()
      })
    })

    it('mostra tempo stimato', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ requestId: 'req-123', estimatedTime: '5 minuti' }),
      })
      render(<GdprExportPage />)
      await act(async () => {
        fireEvent.click(screen.getByText('Richiedi Esportazione Dati'))
      })
      await waitFor(() => {
        expect(screen.getByText(/Tempo stimato: 5 minuti/)).toBeInTheDocument()
      })
    })

    it('usa data.data.requestId se disponibile', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { requestId: 'req-nested', estimatedTime: '3 minuti' } }),
      })
      render(<GdprExportPage />)
      await act(async () => {
        fireEvent.click(screen.getByText('Richiedi Esportazione Dati'))
      })
      await waitFor(() => {
        expect(screen.getByText(/Tempo stimato: 3 minuti/)).toBeInTheDocument()
      })
    })

    it('usa tempo stimato fallback "Pochi minuti" se non presente', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ requestId: 'req-123' }),
      })
      render(<GdprExportPage />)
      await act(async () => {
        fireEvent.click(screen.getByText('Richiedi Esportazione Dati'))
      })
      await waitFor(() => {
        expect(screen.getByText(/Pochi minuti/)).toBeInTheDocument()
      })
    })

    it('mostra progress steps', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ requestId: 'req-123' }),
      })
      render(<GdprExportPage />)
      await act(async () => {
        fireEvent.click(screen.getByText('Richiedi Esportazione Dati'))
      })
      await waitFor(() => {
        expect(screen.getByText('Preparazione')).toBeInTheDocument()
        expect(screen.getByText('Raccolta dati')).toBeInTheDocument()
        expect(screen.getByText('Generazione file')).toBeInTheDocument()
        expect(screen.getByText('Pronto')).toBeInTheDocument()
      })
    })
  })

  describe('startExport - errore res.ok=false', () => {
    it('su res.ok=false passa a stato error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Quota esaurita' }),
      })
      render(<GdprExportPage />)
      await act(async () => {
        fireEvent.click(screen.getByText('Richiedi Esportazione Dati'))
      })
      await waitFor(() => {
        expect(screen.getByText('Quota esaurita')).toBeInTheDocument()
      })
    })

    it('su errore chiama toast.error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Errore server' }),
      })
      render(<GdprExportPage />)
      await act(async () => {
        fireEvent.click(screen.getByText('Richiedi Esportazione Dati'))
      })
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Errore durante l'avvio dell'esportazione")
      })
    })

    it('su errore usa data.error.message se disponibile', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: { message: 'Errore dettagliato' } }),
      })
      render(<GdprExportPage />)
      await act(async () => {
        fireEvent.click(screen.getByText('Richiedi Esportazione Dati'))
      })
      await waitFor(() => {
        expect(screen.getByText('Errore dettagliato')).toBeInTheDocument()
      })
    })

    it('su errore usa fallback quando json fallisce', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.reject(new Error()),
      })
      render(<GdprExportPage />)
      await act(async () => {
        fireEvent.click(screen.getByText('Richiedi Esportazione Dati'))
      })
      await waitFor(() => {
        expect(screen.getByText('Errore avvio esportazione')).toBeInTheDocument()
      })
    })

    it('su catch network error mostra stato errore', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network down'))
      render(<GdprExportPage />)
      await act(async () => {
        fireEvent.click(screen.getByText('Richiedi Esportazione Dati'))
      })
      await waitFor(() => {
        expect(screen.getByText('Network down')).toBeInTheDocument()
      })
    })
  })

  describe('stato error UI', () => {
    it('mostra pulsante Riprova nello stato error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('fail'))
      render(<GdprExportPage />)
      await act(async () => {
        fireEvent.click(screen.getByText('Richiedi Esportazione Dati'))
      })
      await waitFor(() => screen.getByText('Riprova'))
      expect(screen.getByText('Riprova')).toBeInTheDocument()
    })

    it('click Riprova chiama startExport di nuovo', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ requestId: 'r2' }) })
      render(<GdprExportPage />)
      await act(async () => {
        fireEvent.click(screen.getByText('Richiedi Esportazione Dati'))
      })
      await waitFor(() => screen.getByText('Riprova'))
      await act(async () => {
        fireEvent.click(screen.getByText('Riprova'))
      })
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('checkStatus polling', () => {
    async function startExportWithId(requestId = 'req-poll') {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ requestId }),
      })
      render(<GdprExportPage />)
      await act(async () => {
        fireEvent.click(screen.getByText('Richiedi Esportazione Dati'))
      })
      await waitFor(() => screen.getByText('Esportazione in corso...'))
    }

    it('checkStatus: COLLECTING mantiene stato collecting', async () => {
      await startExportWithId()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'COLLECTING' }),
      })
      await act(async () => { jest.advanceTimersByTime(3000) })
      expect(screen.getByText('Esportazione in corso...')).toBeInTheDocument()
    })

    it('checkStatus: GENERATING passa a generating', async () => {
      await startExportWithId()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'GENERATING' }),
      })
      await act(async () => { jest.advanceTimersByTime(3000) })
      await waitFor(() => {
        expect(screen.getByText('Esportazione in corso...')).toBeInTheDocument()
      })
    })

    it('checkStatus: READY → stato ready con "I tuoi dati sono pronti!"', async () => {
      await startExportWithId()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'READY', downloadUrl: 'https://cdn.example.com/export.zip' }),
      })
      await act(async () => { jest.advanceTimersByTime(3000) })
      await waitFor(() => {
        expect(screen.getByText('I tuoi dati sono pronti!')).toBeInTheDocument()
      })
    })

    it('checkStatus: COMPLETED → stato ready', async () => {
      await startExportWithId()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'COMPLETED', downloadUrl: 'https://cdn.example.com/export.zip' }),
      })
      await act(async () => { jest.advanceTimersByTime(3000) })
      await waitFor(() => {
        expect(screen.getByText('I tuoi dati sono pronti!')).toBeInTheDocument()
      })
    })

    it('checkStatus: ERROR → stato error', async () => {
      await startExportWithId()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'ERROR', error: 'Errore elaborazione' }),
      })
      await act(async () => { jest.advanceTimersByTime(3000) })
      await waitFor(() => {
        expect(screen.getByText('Riprova')).toBeInTheDocument()
      })
    })

    it('checkStatus: FAILED → stato error', async () => {
      await startExportWithId()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { status: 'FAILED', error: 'Fallito' } }),
      })
      await act(async () => { jest.advanceTimersByTime(3000) })
      await waitFor(() => {
        expect(screen.getByText('Riprova')).toBeInTheDocument()
      })
    })

    it('checkStatus: res.ok=false → ignora silenziosamente', async () => {
      await startExportWithId()
      mockFetch.mockResolvedValueOnce({ ok: false })
      await act(async () => { jest.advanceTimersByTime(3000) })
      expect(screen.getByText('Esportazione in corso...')).toBeInTheDocument()
    })

    it('checkStatus: usa data.data.status se disponibile', async () => {
      await startExportWithId()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { status: 'READY', downloadUrl: 'https://example.com/data.zip' } }),
      })
      await act(async () => { jest.advanceTimersByTime(3000) })
      await waitFor(() => {
        expect(screen.getByText('I tuoi dati sono pronti!')).toBeInTheDocument()
      })
    })

    it('checkStatus usa data.data.downloadUrl', async () => {
      await startExportWithId()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { status: 'READY', downloadUrl: 'https://cdn.example.com/data.zip' } }),
      })
      await act(async () => { jest.advanceTimersByTime(3000) })
      await waitFor(() => screen.getByText('Scarica i tuoi Dati'))
      fireEvent.click(screen.getByText('Scarica i tuoi Dati'))
      expect(mockWindowOpen).toHaveBeenCalledWith('https://cdn.example.com/data.zip', '_blank')
    })
  })

  describe('stato ready - download', () => {
    async function reachReadyState(url: string | null = 'https://cdn.example.com/export.zip') {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ requestId: 'req-ready' }),
      })
      render(<GdprExportPage />)
      await act(async () => {
        fireEvent.click(screen.getByText('Richiedi Esportazione Dati'))
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'READY', downloadUrl: url }),
      })
      await act(async () => { jest.advanceTimersByTime(3000) })
      await waitFor(() => screen.getByText('Scarica i tuoi Dati'))
    }

    it('click "Scarica i tuoi Dati" chiama window.open con URL', async () => {
      await reachReadyState('https://cdn.example.com/export.zip')
      fireEvent.click(screen.getByText('Scarica i tuoi Dati'))
      expect(mockWindowOpen).toHaveBeenCalledWith('https://cdn.example.com/export.zip', '_blank')
    })

    it('click "Scarica i tuoi Dati" senza URL chiama toast.error', async () => {
      await reachReadyState(null)
      fireEvent.click(screen.getByText('Scarica i tuoi Dati'))
      expect(toast.error).toHaveBeenCalledWith('URL di download non disponibile')
      expect(mockWindowOpen).not.toHaveBeenCalled()
    })

    it('mostra testo "I tuoi dati sono pronti!"', async () => {
      await reachReadyState()
      expect(screen.getByText('I tuoi dati sono pronti!')).toBeInTheDocument()
    })
  })
})
