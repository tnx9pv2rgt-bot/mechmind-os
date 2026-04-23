import React from 'react'
import { render, screen } from '@testing-library/react'
import Layout from '@/app/dashboard/customers/new/step4/layout'

describe('customers/new/step4 Layout', () => {
  it('renderizza i children', () => {
    render(<Layout><span>content</span></Layout>)
    expect(screen.getByText('content')).toBeInTheDocument()
  })
})
