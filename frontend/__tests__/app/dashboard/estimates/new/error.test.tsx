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
  AppleButton: ({
    children,
    onClick,
  }: {
    children?: React.ReactNode
    onClick?: () => void
  }) => React.createElement('button', { onClick }, children),
}))

import EstimatesNewError from '@/app/dashboard/estimates/new/error'

describe('EstimatesNewError', () => {
  it('mostra titolo errore generico', () => {
    render(<EstimatesNewError error={new Error('errore')} reset={jest.fn()} />)
    expect(screen.getByText('Si è verificato un errore')).toBeInTheDocument()
  })

  it('mostra messaggio di errore specifico', () => {
    render(<EstimatesNewError error={new Error('Form non valido')} reset={jest.fn()} />)
    expect(screen.getByText('Form non valido')).toBeInTheDocument()
  })

  it('click Riprova chiama reset', () => {
    const reset = jest.fn()
    render(<EstimatesNewError error={new Error('err')} reset={reset} />)
    fireEvent.click(screen.getByText('Riprova'))
    expect(reset).toHaveBeenCalled()
  })

  it('mostra icona AlertCircle', () => {
    render(<EstimatesNewError error={new Error('err')} reset={jest.fn()} />)
    expect(document.querySelector('[data-icon="AlertCircle"]')).toBeTruthy()
  })

  it('mostra fallback quando error.message è vuoto', () => {
    render(<EstimatesNewError error={new Error('')} reset={jest.fn()} />)
    expect(screen.getByText('Qualcosa è andato storto. Riprova.')).toBeInTheDocument()
  })
})
