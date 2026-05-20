import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'

// ── framer-motion ──────────────────────────────────────────────────────────────
jest.mock('framer-motion', () => {
  const React = require('react')
  return {
    motion: new Proxy({}, {
      get: (_t: unknown, prop: string) =>
        React.forwardRef(({ children, ...rest }: { children?: React.ReactNode; [k: string]: unknown }, ref: React.Ref<HTMLElement>) => {
          const allowed = ['className', 'style', 'onClick', 'id', 'role']
          const valid: Record<string, unknown> = {}
          for (const k of Object.keys(rest)) {
            if (allowed.includes(k) || k.startsWith('data-') || k.startsWith('aria-')) valid[k] = rest[k]
          }
          const tag = ['div','span','button'].includes(prop) ? prop : 'div'
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

// ── UI components ─────────────────────────────────────────────────────────────
jest.mock('@/components/ui/apple-button', () => ({
  AppleButton: ({ children, onClick, variant, icon, fullWidth, disabled, className }: {
    children?: React.ReactNode; onClick?: () => void; variant?: string
    icon?: React.ReactNode; fullWidth?: boolean; disabled?: boolean; className?: string
  }) =>
    React.createElement('button', { onClick, 'data-variant': variant, className }, icon, children),
}))

jest.mock('@/components/ui/apple-card', () => ({
  AppleCard: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'apple-card' }, children),
  AppleCardContent: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'apple-card-content' }, children),
  AppleCardHeader: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'apple-card-header' }, children),
}))

// ── Maintenance sub-components ─────────────────────────────────────────────────
let capturedFormProps: {
  isOpen?: boolean; onClose?: () => void; onSuccess?: () => void;
  schedule?: unknown; mode?: string
} = {}

let capturedListProps: { onEdit?: (s: unknown) => void; onComplete?: (s: unknown) => void } = {}
let capturedCalendarProps: { onEventClick?: (s: unknown) => void } = {}

jest.mock('@/components/maintenance/OverdueAlert', () => ({
  OverdueAlert: () => React.createElement('div', { 'data-testid': 'overdue-alert' }),
}))

jest.mock('@/components/maintenance/MaintenanceList', () => ({
  MaintenanceList: (props: { onEdit?: (s: unknown) => void; onComplete?: (s: unknown) => void; showFilters?: boolean }) => {
    capturedListProps = props
    return React.createElement('div', { 'data-testid': 'maintenance-list' })
  },
}))

jest.mock('@/components/maintenance/MaintenanceCalendar', () => ({
  MaintenanceCalendar: (props: { onEventClick?: (s: unknown) => void }) => {
    capturedCalendarProps = props
    return React.createElement('div', { 'data-testid': 'maintenance-calendar' })
  },
}))

jest.mock('@/components/maintenance/MaintenanceForm', () => ({
  MaintenanceForm: (props: {
    isOpen?: boolean; onClose?: () => void; onSuccess?: () => void;
    schedule?: unknown; mode?: string
  }) => {
    capturedFormProps = props
    return React.createElement('div', { 'data-testid': 'maintenance-form', 'data-open': String(props.isOpen) })
  },
}))

jest.mock('@/components/maintenance/MaintenanceWidget', () => ({
  MaintenanceWidget: ({ className }: { className?: string }) =>
    React.createElement('div', { 'data-testid': 'maintenance-widget', className }),
}))

import MaintenancePage from '@/app/dashboard/maintenance/page'

const mockSchedule = { id: 'sched-1', vehicleId: 'v1', type: 'oil_change' }

beforeEach(() => {
  capturedFormProps = {}
  capturedListProps = {}
  capturedCalendarProps = {}
})

describe('MaintenancePage', () => {
  describe('rendering iniziale', () => {
    it('renderizza titolo Manutenzione Preventiva', () => {
      render(<MaintenancePage />)
      expect(screen.getByText('Manutenzione Preventiva')).toBeInTheDocument()
    })

    it('renderizza sottotitolo', () => {
      render(<MaintenancePage />)
      expect(screen.getByText(/Gestisci le programmazioni/)).toBeInTheDocument()
    })

    it('renderizza OverdueAlert', () => {
      render(<MaintenancePage />)
      expect(screen.getByTestId('overdue-alert')).toBeInTheDocument()
    })

    it('renderizza tab Elenco, Calendario, Pannello', () => {
      render(<MaintenancePage />)
      expect(screen.getByText('Elenco')).toBeInTheDocument()
      expect(screen.getByText('Calendario')).toBeInTheDocument()
      expect(screen.getByText('Pannello')).toBeInTheDocument()
    })

    it('tab list attivo per default → MaintenanceList visibile', () => {
      render(<MaintenancePage />)
      expect(screen.getByTestId('maintenance-list')).toBeInTheDocument()
      expect(screen.queryByTestId('maintenance-calendar')).not.toBeInTheDocument()
    })

    it('MaintenanceForm inizialmente chiuso (isOpen=false)', () => {
      render(<MaintenancePage />)
      expect(capturedFormProps.isOpen).toBe(false)
    })
  })

  describe('navigazione tab', () => {
    it('click Calendario mostra MaintenanceCalendar', () => {
      render(<MaintenancePage />)
      fireEvent.click(screen.getByText('Calendario'))
      expect(screen.getByTestId('maintenance-calendar')).toBeInTheDocument()
      expect(screen.queryByTestId('maintenance-list')).not.toBeInTheDocument()
    })

    it('click Pannello mostra dashboard content', () => {
      render(<MaintenancePage />)
      fireEvent.click(screen.getByText('Pannello'))
      expect(screen.getByTestId('maintenance-widget')).toBeInTheDocument()
      expect(screen.getByText('Prossime Scadenze')).toBeInTheDocument()
      expect(screen.getByText('Storico Manutenzioni')).toBeInTheDocument()
    })

    it('click Elenco dopo Calendario ripristina lista', () => {
      render(<MaintenancePage />)
      fireEvent.click(screen.getByText('Calendario'))
      fireEvent.click(screen.getByText('Elenco'))
      expect(screen.getByTestId('maintenance-list')).toBeInTheDocument()
    })
  })

  describe('handleCreate', () => {
    it('click "Nuova Programmazione" apre form in modalità create', () => {
      render(<MaintenancePage />)
      fireEvent.click(screen.getByText('Nuova Programmazione'))
      expect(screen.getByTestId('maintenance-form').getAttribute('data-open')).toBe('true')
      expect(capturedFormProps.mode).toBe('create')
      expect(capturedFormProps.schedule).toBeNull()
    })
  })

  describe('handleEdit', () => {
    it('onEdit da MaintenanceList apre form in modalità edit con schedule', () => {
      render(<MaintenancePage />)
      act(() => { capturedListProps.onEdit?.(mockSchedule) })
      expect(screen.getByTestId('maintenance-form').getAttribute('data-open')).toBe('true')
      expect(capturedFormProps.mode).toBe('edit')
      expect(capturedFormProps.schedule).toBe(mockSchedule)
    })
  })

  describe('handleComplete', () => {
    it('onComplete da MaintenanceList apre form in modalità complete con schedule', () => {
      render(<MaintenancePage />)
      act(() => { capturedListProps.onComplete?.(mockSchedule) })
      expect(screen.getByTestId('maintenance-form').getAttribute('data-open')).toBe('true')
      expect(capturedFormProps.mode).toBe('complete')
      expect(capturedFormProps.schedule).toBe(mockSchedule)
    })
  })

  describe('handleFormSuccess', () => {
    it('onSuccess chiude il form', () => {
      render(<MaintenancePage />)
      fireEvent.click(screen.getByText('Nuova Programmazione'))
      expect(screen.getByTestId('maintenance-form').getAttribute('data-open')).toBe('true')
      act(() => { capturedFormProps.onSuccess?.() })
      expect(screen.getByTestId('maintenance-form').getAttribute('data-open')).toBe('false')
    })
  })

  describe('handleFormClose', () => {
    it('onClose chiude il form', () => {
      render(<MaintenancePage />)
      fireEvent.click(screen.getByText('Nuova Programmazione'))
      expect(screen.getByTestId('maintenance-form').getAttribute('data-open')).toBe('true')
      act(() => { capturedFormProps.onClose?.() })
      expect(screen.getByTestId('maintenance-form').getAttribute('data-open')).toBe('false')
    })
  })

  describe('handleEdit da calendario', () => {
    it('onEventClick da MaintenanceCalendar apre form in edit', () => {
      render(<MaintenancePage />)
      fireEvent.click(screen.getByText('Calendario'))
      act(() => { capturedCalendarProps.onEventClick?.(mockSchedule) })
      expect(screen.getByTestId('maintenance-form').getAttribute('data-open')).toBe('true')
      expect(capturedFormProps.mode).toBe('edit')
    })
  })

  describe('dashboard tab - bottoni ritorno lista', () => {
    it('"Vai all\'elenco" porta a tab list', () => {
      render(<MaintenancePage />)
      fireEvent.click(screen.getByText('Pannello'))
      expect(screen.getByTestId('maintenance-widget')).toBeInTheDocument()
      fireEvent.click(screen.getByText("Vai all'elenco"))
      expect(screen.getByTestId('maintenance-list')).toBeInTheDocument()
    })

    it('"Vedi storico" porta a tab list', () => {
      render(<MaintenancePage />)
      fireEvent.click(screen.getByText('Pannello'))
      fireEvent.click(screen.getByText('Vedi storico'))
      expect(screen.getByTestId('maintenance-list')).toBeInTheDocument()
    })
  })
})
