import React from 'react'
import { render, screen, act } from '@testing-library/react'

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

const mockReplace = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}))

import NewCannedJobPage from '@/app/dashboard/canned-jobs/new/page'

beforeEach(() => { jest.clearAllMocks() })

describe('NewCannedJobPage', () => {
  it('renderizza il componente', async () => {
    await act(async () => { render(<NewCannedJobPage />) })
    expect(document.querySelector('[data-icon="Loader2"]')).toBeInTheDocument()
  })

  it('chiama router.replace con /dashboard/canned-jobs?action=create', async () => {
    await act(async () => { render(<NewCannedJobPage />) })
    expect(mockReplace).toHaveBeenCalledWith('/dashboard/canned-jobs?action=create')
  })
})
