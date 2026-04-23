import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('lucide-react', () => ({
  AlertCircle: () => React.createElement('span', { 'data-testid': 'alert-icon' }),
}))

jest.mock('@/components/ui/apple-button', () => ({
  AppleButton: ({ children, onClick, variant, className }: {
    children?: React.ReactNode; onClick?: () => void; variant?: string; className?: string
  }) => React.createElement('button', { onClick, className }, children),
}))

import ErrorPage from '@/app/dashboard/customers/[id]/error'

describe('CustomerDetail ErrorPage', () => {
  it('renders error message', () => {
    const reset = jest.fn()
    render(<ErrorPage error={new Error('Qualcosa è andato storto')} reset={reset} />)
    expect(screen.getByText('Qualcosa è andato storto')).toBeInTheDocument()
    expect(screen.getByText('Si è verificato un errore')).toBeInTheDocument()
  })

  it('shows fallback message when error.message is empty', () => {
    const reset = jest.fn()
    render(<ErrorPage error={new Error('')} reset={reset} />)
    expect(screen.getByText('Qualcosa è andato storto. Riprova.')).toBeInTheDocument()
  })

  it('calls reset when Riprova clicked', () => {
    const reset = jest.fn()
    render(<ErrorPage error={new Error('err')} reset={reset} />)
    fireEvent.click(screen.getByText('Riprova'))
    expect(reset).toHaveBeenCalledTimes(1)
  })
})
