/**
 * Tests for all auth layout components
 */

import React from 'react'
import { render, screen } from '@testing-library/react'

// =========================================================================
// AuthLayout (app/auth/layout.tsx)
// =========================================================================

import AuthLayout from '@/app/auth/layout'

describe('AuthLayout', () => {
  it('should render children', () => {
    render(<AuthLayout>{'auth child'}</AuthLayout>)
    expect(screen.getByText('auth child')).toBeInTheDocument()
  })

  it('should return a React element', () => {
    const result = render(<AuthLayout>{'test'}</AuthLayout>)
    expect(result.container).toBeTruthy()
  })
})

// =========================================================================
// ForgotPasswordLayout (app/auth/forgot-password/layout.tsx)
// =========================================================================

import ForgotPasswordLayout from '@/app/auth/forgot-password/layout'

describe('ForgotPasswordLayout', () => {
  it('should render children', () => {
    render(<ForgotPasswordLayout>{'forgot child'}</ForgotPasswordLayout>)
    expect(screen.getByText('forgot child')).toBeInTheDocument()
  })
})

// =========================================================================
// MagicLinkLayout (app/auth/magic-link/layout.tsx)
// =========================================================================

import MagicLinkLayout from '@/app/auth/magic-link/layout'

describe('MagicLinkLayout', () => {
  it('should render children', () => {
    render(<MagicLinkLayout>{'magic-link child'}</MagicLinkLayout>)
    expect(screen.getByText('magic-link child')).toBeInTheDocument()
  })
})

// =========================================================================
// MagicLinkVerifyLayout (app/auth/magic-link/verify/layout.tsx)
// =========================================================================

import MagicLinkVerifyLayout from '@/app/auth/magic-link/verify/layout'

describe('MagicLinkVerifyLayout', () => {
  it('should render children', () => {
    render(<MagicLinkVerifyLayout>{'verify child'}</MagicLinkVerifyLayout>)
    expect(screen.getByText('verify child')).toBeInTheDocument()
  })
})

// =========================================================================
// RegisterLayout (app/auth/register/layout.tsx)
// =========================================================================

import RegisterLayout from '@/app/auth/register/layout'

describe('RegisterLayout', () => {
  it('should render children', () => {
    render(<RegisterLayout>{'register child'}</RegisterLayout>)
    expect(screen.getByText('register child')).toBeInTheDocument()
  })
})
