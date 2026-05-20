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
  }) => React.createElement('button', { onClick, 'data-variant': variant, className }, children),
}))

import BookingsError from '@/app/dashboard/bookings/error'

describe('Bookings Error boundary', () => {
  it('renders error heading', () => {
    render(<BookingsError error={new Error('test')} reset={jest.fn()} />)
    expect(screen.getByText('Si è verificato un errore')).toBeInTheDocument()
  })

  it('renders custom error message', () => {
    render(<BookingsError error={new Error('Connessione persa')} reset={jest.fn()} />)
    expect(screen.getByText('Connessione persa')).toBeInTheDocument()
  })

  it('renders fallback message when error.message is empty', () => {
    const err = new Error('')
    render(<BookingsError error={err} reset={jest.fn()} />)
    expect(screen.getByText('Qualcosa è andato storto. Riprova.')).toBeInTheDocument()
  })

  it('renders Riprova button', () => {
    render(<BookingsError error={new Error('err')} reset={jest.fn()} />)
    expect(screen.getByText('Riprova')).toBeInTheDocument()
  })

  it('calls reset when Riprova is clicked', () => {
    const mockReset = jest.fn()
    render(<BookingsError error={new Error('err')} reset={mockReset} />)
    fireEvent.click(screen.getByText('Riprova'))
    expect(mockReset).toHaveBeenCalledTimes(1)
  })

  it('renders AlertCircle icon', () => {
    const { container } = render(<BookingsError error={new Error('err')} reset={jest.fn()} />)
    expect(container.querySelector('[data-icon="AlertCircle"]')).toBeInTheDocument()
  })
})
