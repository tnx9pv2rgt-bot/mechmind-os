import React from 'react'
import { render, screen } from '@testing-library/react'
import Layout from '@/app/dashboard/customers/new/landing/layout'

describe('customers/new/landing Layout', () => {
  it('renderizza i children', () => {
    render(<Layout><span>content</span></Layout>)
    expect(screen.getByText('content')).toBeInTheDocument()
  })
})
