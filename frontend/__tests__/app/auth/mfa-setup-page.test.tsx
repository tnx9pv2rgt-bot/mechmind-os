/**
 * Tests for MFASetupPage (app/auth/mfa/setup/page.tsx)
 */

import React from 'react'
import { render, screen } from '@testing-library/react'

jest.mock('@/app/auth/mfa/setup/client', () => ({
  MFASetupPageClient: () => require('react').createElement('div', { 'data-testid': 'mfa-setup-client' }, 'MFA Setup Client'),
}))

import MFASetupPage from '@/app/auth/mfa/setup/page'

describe('MFASetupPage', () => {
  it('should render the MFASetupPageClient component', () => {
    render(<MFASetupPage />)
    expect(screen.getByTestId('mfa-setup-client')).toBeInTheDocument()
  })

  it('should render without crashing', () => {
    const { container } = render(<MFASetupPage />)
    expect(container).toBeTruthy()
  })
})
