/**
 * Tests for MFAVerifyPage (app/auth/mfa/verify/page.tsx)
 */

import React from 'react'
import { render, screen } from '@testing-library/react'

jest.mock('@/app/auth/mfa/verify/client', () => ({
  MFAVerifyPageClient: () => require('react').createElement('div', { 'data-testid': 'mfa-verify-client' }, 'MFA Verify Client'),
}))

import MFAVerifyPage from '@/app/auth/mfa/verify/page'

describe('MFAVerifyPage', () => {
  it('should render the MFAVerifyPageClient inside Suspense', () => {
    render(<MFAVerifyPage />)
    expect(screen.getByTestId('mfa-verify-client')).toBeInTheDocument()
  })

  it('should render without crashing', () => {
    const { container } = render(<MFAVerifyPage />)
    expect(container).toBeTruthy()
  })
})
