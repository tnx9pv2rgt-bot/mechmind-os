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

import Loading from '@/app/dashboard/loading'

describe('DashboardLoading', () => {
  it('renderizza il componente senza crash', () => {
    const { container } = render(<Loading />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renderizza icona Loader2', () => {
    render(<Loading />)
    expect(screen.getByTestId ? document.querySelector('[data-icon="Loader2"]') : null).toBeTruthy()
    expect(document.querySelector('[data-icon="Loader2"]')).toBeInTheDocument()
  })

  it('ha classe animate-spin', () => {
    render(<Loading />)
    const icon = document.querySelector('[data-icon="Loader2"]')
    expect(icon?.className).toContain('animate-spin')
  })

  it('ha wrapper con flex e justify-center', () => {
    const { container } = render(<Loading />)
    const div = container.firstChild as HTMLElement
    expect(div.className).toContain('flex')
    expect(div.className).toContain('justify-center')
  })
})
