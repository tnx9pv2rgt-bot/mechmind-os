import React from 'react'
import { render } from '@testing-library/react'

jest.mock('lucide-react', () => ({
  Loader2: ({ className }: { className?: string }) =>
    React.createElement('span', { className, 'data-testid': 'loader' }),
}))

import Loading from '@/app/dashboard/customers/loading'

describe('Customers Loading', () => {
  it('renders a spinner', () => {
    const { container } = render(<Loading />)
    expect(container.querySelector('[data-testid="loader"]')).toBeInTheDocument()
  })
})
