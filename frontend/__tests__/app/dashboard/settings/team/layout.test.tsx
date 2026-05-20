import React from 'react'
import { render, screen } from '@testing-library/react'
import Layout from '@/app/dashboard/settings/team/layout'

describe('settings/team Layout', () => {
  it('renderizza i children', () => {
    render(<Layout><span>content</span></Layout>)
    expect(screen.getByText('content')).toBeInTheDocument()
  })
})
