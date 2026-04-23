import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

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

jest.mock('framer-motion', () => {
  const React = require('react')
  const filterMotionProps = ({
    children, variants, initial, animate, exit, whileHover, whileTap, custom, transition, layout, layoutId,
    ...rest
  }: Record<string, unknown>) => ({ ...rest, children })
  const cache: Record<string, (props: Record<string, unknown>) => unknown> = {}
  return {
    motion: new Proxy({}, {
      get(_t: unknown, tag: string) {
        if (typeof tag !== 'string') return undefined
        if (!cache[tag]) {
          cache[tag] = (props: Record<string, unknown>) =>
            React.createElement(tag as string, filterMotionProps(props))
        }
        return cache[tag]
      },
    }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  }
})

const mockRouterPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}))

jest.mock('@/components/ui/apple-card', () => ({
  AppleCard: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  AppleCardContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  AppleCardHeader: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}))

jest.mock('@/components/ui/apple-button', () => ({
  AppleButton: ({
    children,
    onClick,
    variant,
  }: {
    children?: React.ReactNode
    onClick?: () => void
    variant?: string
  }) =>
    React.createElement('button', { onClick, 'data-variant': variant }, children),
}))

import BillingCancelPage from '@/app/billing/cancel/page'

describe('BillingCancelPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renderizza titolo Pagamento Annullato', () => {
    render(<BillingCancelPage />)
    expect(screen.getByText('Pagamento Annullato')).toBeInTheDocument()
  })

  it('renderizza descrizione annullamento', () => {
    render(<BillingCancelPage />)
    expect(screen.getByText(/Nessun addebito è stato effettuato/)).toBeInTheDocument()
  })

  it('renderizza sezione Possibili motivi', () => {
    render(<BillingCancelPage />)
    expect(screen.getByText('Possibili motivi')).toBeInTheDocument()
  })

  it('renderizza motivo annullamento manuale', () => {
    render(<BillingCancelPage />)
    expect(screen.getByText('Hai annullato il pagamento')).toBeInTheDocument()
  })

  it('click Riprova naviga a /dashboard/billing', () => {
    render(<BillingCancelPage />)
    fireEvent.click(screen.getByText('Riprova'))
    expect(mockRouterPush).toHaveBeenCalledWith('/dashboard/billing')
  })

  it('click Torna alla Dashboard naviga a /dashboard', () => {
    render(<BillingCancelPage />)
    fireEvent.click(screen.getByText('Torna alla Dashboard'))
    expect(mockRouterPush).toHaveBeenCalledWith('/dashboard')
  })
})
