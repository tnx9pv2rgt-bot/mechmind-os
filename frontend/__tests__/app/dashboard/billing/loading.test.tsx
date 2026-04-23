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

import React from 'react'
import { render } from '@testing-library/react'
import Loading from '@/app/dashboard/billing/loading'

describe('DashboardBillingLoading', () => {
  it('renderizza spinner Loader2', () => {
    render(<Loading />)
    expect(document.querySelector('[data-icon="Loader2"]')).toBeTruthy()
  })
})
