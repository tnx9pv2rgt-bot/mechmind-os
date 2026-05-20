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

import Loading from '@/app/dashboard/invoices/loading'

describe('InvoicesLoading', () => {
  it('renderizza lo spinner', () => {
    render(<Loading />)
    expect(document.querySelector('[data-icon="Loader2"]')).toBeTruthy()
  })

  it('mostra il contenitore centrato', () => {
    const { container } = render(<Loading />)
    const div = container.firstChild as HTMLElement
    expect(div.className).toMatch(/flex/)
    expect(div.className).toMatch(/items-center/)
  })
})
