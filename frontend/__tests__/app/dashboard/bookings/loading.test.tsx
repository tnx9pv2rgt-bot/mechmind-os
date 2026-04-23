import React from 'react'
import { render } from '@testing-library/react'

jest.mock('lucide-react', () => {
  const React = require('react')
  return new Proxy({}, {
    get: (_t: unknown, name: string) => {
      if (typeof name !== 'string') return undefined
      return ({ className }: { className?: string }) =>
        React.createElement('span', { className, 'data-icon': name })
    },
  })
})

import Loading from '@/app/dashboard/bookings/loading'

describe('Bookings Loading', () => {
  it('renders Loader2 spinner', () => {
    const { container } = render(<Loading />)
    expect(container.querySelector('[data-icon="Loader2"]')).toBeInTheDocument()
  })

  it('renders a container div', () => {
    const { container } = render(<Loading />)
    expect(container.firstChild).toBeInTheDocument()
  })
})
