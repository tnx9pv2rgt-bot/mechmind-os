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

import VehiclesError from '@/app/dashboard/vehicles/error'

describe('VehiclesError', () => {
  it('mostra messaggio errore generico', () => {
    const reset = jest.fn()
    render(<VehiclesError error={new Error('qualcosa è andato storto')} reset={reset} />)
    expect(screen.getByText('Si è verificato un errore')).toBeInTheDocument()
  })

  it('mostra il messaggio di errore specifico', () => {
    const reset = jest.fn()
    render(<VehiclesError error={new Error('Errore specifico XYZ')} reset={reset} />)
    expect(screen.getByText('Errore specifico XYZ')).toBeInTheDocument()
  })

  it('click Riprova chiama reset', () => {
    const reset = jest.fn()
    render(<VehiclesError error={new Error('err')} reset={reset} />)
    fireEvent.click(screen.getByText('Riprova'))
    expect(reset).toHaveBeenCalled()
  })

  it('mostra icona AlertCircle', () => {
    render(<VehiclesError error={new Error('err')} reset={jest.fn()} />)
    expect(document.querySelector('[data-icon="AlertCircle"]')).toBeTruthy()
  })

  it('mostra fallback message quando error.message è vuoto', () => {
    const err = new Error('')
    render(<VehiclesError error={err} reset={jest.fn()} />)
    expect(screen.getByText('Qualcosa è andato storto. Riprova.')).toBeInTheDocument()
  })
})
