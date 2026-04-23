import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

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

jest.mock('@/components/ui/apple-button', () => ({
  AppleButton: ({ children, onClick, variant, className }: {
    children?: React.ReactNode; onClick?: () => void; variant?: string; className?: string
  }) =>
    React.createElement('button', { onClick, 'data-variant': variant, className }, children),
}))

import DashboardError from '@/app/dashboard/error'

describe('DashboardError', () => {
  const mockReset = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renderizza icona AlertCircle', () => {
    render(<DashboardError error={new Error('test')} reset={mockReset} />)
    expect(document.querySelector('[data-icon="AlertCircle"]')).toBeInTheDocument()
  })

  it('renderizza titolo Si è verificato un errore', () => {
    render(<DashboardError error={new Error('test')} reset={mockReset} />)
    expect(screen.getByText('Si è verificato un errore')).toBeInTheDocument()
  })

  it('renderizza il messaggio dell\'errore', () => {
    render(<DashboardError error={new Error('Messaggio personalizzato')} reset={mockReset} />)
    expect(screen.getByText('Messaggio personalizzato')).toBeInTheDocument()
  })

  it('renderizza testo fallback quando error.message è vuoto', () => {
    const errNoMsg = new Error()
    render(<DashboardError error={errNoMsg} reset={mockReset} />)
    expect(screen.getByText('Qualcosa è andato storto. Riprova.')).toBeInTheDocument()
  })

  it('renderizza pulsante Riprova', () => {
    render(<DashboardError error={new Error('test')} reset={mockReset} />)
    expect(screen.getByText('Riprova')).toBeInTheDocument()
  })

  it('click Riprova chiama reset()', () => {
    render(<DashboardError error={new Error('test')} reset={mockReset} />)
    fireEvent.click(screen.getByText('Riprova'))
    expect(mockReset).toHaveBeenCalledTimes(1)
  })
})
