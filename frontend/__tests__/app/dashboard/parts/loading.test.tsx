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

import PartsLoading from '@/app/dashboard/parts/loading'

describe('PartsLoading', () => {
  it('renderizza lo spinner Loader2', () => {
    render(<PartsLoading />)
    expect(document.querySelector('[data-icon="Loader2"]')).toBeTruthy()
  })
})
