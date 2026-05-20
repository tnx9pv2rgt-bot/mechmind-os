/**
 * Tests for AuthError component (app/auth/error.tsx)
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('@/components/auth/auth-split-layout', () => ({
  AuthSplitLayout: ({ children }: { children: React.ReactNode }) =>
    require('react').createElement('div', null, children),
}))

jest.mock('@/components/auth/auth-styles', () => ({
  btnPrimary: 'btn-primary',
  btnSecondaryOutline: 'btn-secondary-outline',
}))

import AuthError from '@/app/auth/error'

describe('AuthError', () => {
  const mockReset = jest.fn()
  const error = new Error('Test error') as Error & { digest?: string }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render error title', () => {
    render(<AuthError error={error} reset={mockReset} />)
    expect(screen.getByText('Errore di autenticazione')).toBeInTheDocument()
  })

  it('should render error description', () => {
    render(<AuthError error={error} reset={mockReset} />)
    expect(screen.getByText(/Si è verificato un errore/i)).toBeInTheDocument()
  })

  it('should render warning icon', () => {
    render(<AuthError error={error} reset={mockReset} />)
    expect(screen.getByText('⚠')).toBeInTheDocument()
  })

  it('should render retry button', () => {
    render(<AuthError error={error} reset={mockReset} />)
    expect(screen.getByText('Riprova')).toBeInTheDocument()
  })

  it('should render login link', () => {
    render(<AuthError error={error} reset={mockReset} />)
    const loginLink = screen.getByRole('link', { name: 'Torna al login' })
    expect(loginLink).toHaveAttribute('href', '/auth')
  })

  it('should call reset when retry button is clicked', () => {
    render(<AuthError error={error} reset={mockReset} />)
    fireEvent.click(screen.getByText('Riprova'))
    expect(mockReset).toHaveBeenCalledTimes(1)
  })

  it('should render alert role for error description', () => {
    render(<AuthError error={error} reset={mockReset} />)
    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
  })

  it('should accept error with digest property', () => {
    const errorWithDigest = Object.assign(new Error('digest error'), { digest: 'abc123' })
    render(<AuthError error={errorWithDigest} reset={mockReset} />)
    expect(screen.getByText('Errore di autenticazione')).toBeInTheDocument()
  })
})
