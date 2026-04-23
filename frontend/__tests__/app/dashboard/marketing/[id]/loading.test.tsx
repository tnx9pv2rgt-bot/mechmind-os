import React from 'react'
import { render, screen } from '@testing-library/react'

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

import Loading from '@/app/dashboard/marketing/[id]/loading'

describe('marketing/[id] Loading', () => {
  it('renderizza il componente', () => {
    const { container } = render(<Loading />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renderizza icona Loader2', () => {
    render(<Loading />)
    expect(document.querySelector('[data-icon="Loader2"]')).toBeInTheDocument()
  })
})
