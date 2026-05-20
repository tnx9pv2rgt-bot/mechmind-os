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
  AppleButton: ({ children, onClick, variant }: {
    children?: React.ReactNode; onClick?: () => void; variant?: string
  }) =>
    React.createElement('button', { onClick, 'data-variant': variant }, children),
}))

import InvoicesError from '@/app/dashboard/invoices/error'

const GlobalError = global.Error

describe('InvoicesError', () => {
  it('mostra titolo errore', () => {
    const reset = jest.fn()
    render(<InvoicesError error={new GlobalError('Qualcosa è andato storto')} reset={reset} />)
    expect(screen.getByText('Si è verificato un errore')).toBeInTheDocument()
  })

  it('mostra il messaggio di errore', () => {
    const reset = jest.fn()
    render(<InvoicesError error={new GlobalError('Errore di rete')} reset={reset} />)
    expect(screen.getByText('Errore di rete')).toBeInTheDocument()
  })

  it('mostra messaggio fallback se error.message è vuoto', () => {
    const reset = jest.fn()
    const err = new GlobalError('')
    err.message = ''
    render(<InvoicesError error={err} reset={reset} />)
    expect(screen.getByText('Qualcosa è andato storto. Riprova.')).toBeInTheDocument()
  })

  it('chiama reset su click Riprova', () => {
    const reset = jest.fn()
    render(<InvoicesError error={new GlobalError('err')} reset={reset} />)
    fireEvent.click(screen.getByText('Riprova'))
    expect(reset).toHaveBeenCalledTimes(1)
  })
})
