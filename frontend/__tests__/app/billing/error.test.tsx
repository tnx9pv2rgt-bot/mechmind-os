import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import BillingError from '@/app/billing/error'

describe('BillingError', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  const mockError = new Error('Billing failed') as Error & { digest?: string }
  const mockReset = jest.fn()

  it('renderizza titolo Errore nel pagamento', () => {
    render(<BillingError error={mockError} reset={mockReset} />)
    expect(screen.getByText('Errore nel pagamento')).toBeInTheDocument()
  })

  it('renderizza messaggio di errore', () => {
    render(<BillingError error={mockError} reset={mockReset} />)
    expect(screen.getByText(/Si è verificato un errore/)).toBeInTheDocument()
  })

  it('renderizza pulsante Riprova', () => {
    render(<BillingError error={mockError} reset={mockReset} />)
    expect(screen.getByText('Riprova')).toBeInTheDocument()
  })

  it('renderizza link Torna alla dashboard', () => {
    render(<BillingError error={mockError} reset={mockReset} />)
    expect(screen.getByText('Torna alla dashboard')).toBeInTheDocument()
  })

  it('click Riprova chiama reset()', () => {
    render(<BillingError error={mockError} reset={mockReset} />)
    fireEvent.click(screen.getByText('Riprova'))
    expect(mockReset).toHaveBeenCalled()
  })

  it('link Torna alla dashboard punta a /dashboard', () => {
    render(<BillingError error={mockError} reset={mockReset} />)
    const link = screen.getByText('Torna alla dashboard').closest('a')
    expect(link?.getAttribute('href')).toBe('/dashboard')
  })

  it('useEffect chiama console.error con l\'errore', () => {
    render(<BillingError error={mockError} reset={mockReset} />)
    expect(console.error).toHaveBeenCalledWith('Billing error:', mockError)
  })
})
