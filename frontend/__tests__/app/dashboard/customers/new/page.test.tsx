import React from 'react'
import { render } from '@testing-library/react'

const mockReplace = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn(), prefetch: jest.fn() }),
}))

jest.mock('lucide-react', () => ({
  Loader2: ({ className }: { className?: string }) =>
    React.createElement('span', { className, 'data-testid': 'loader' }),
}))

import NewCustomerRedirect from '@/app/dashboard/customers/new/page'

describe('NewCustomerRedirect', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('renders a spinner while redirecting', () => {
    const { container } = render(<NewCustomerRedirect />)
    expect(container.querySelector('[data-testid="loader"]')).toBeInTheDocument()
  })

  it('calls router.replace to step1 on mount', () => {
    render(<NewCustomerRedirect />)
    expect(mockReplace).toHaveBeenCalledWith('/dashboard/customers/new/step1')
  })
})
