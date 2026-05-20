import React from 'react'
import { render, screen } from '@testing-library/react'
import Layout from '@/app/dashboard/invoices/new/layout'

describe('invoices/new Layout', () => {
  it('renderizza i children', () => {
    render(<Layout><span>content</span></Layout>)
    expect(screen.getByText('content')).toBeInTheDocument()
  })
})
