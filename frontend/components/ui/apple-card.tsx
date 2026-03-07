'use client'

import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface AppleCardProps {
  children: ReactNode
  className?: string
  featured?: boolean
  hover?: boolean
  onClick?: () => void
}

export function AppleCard({ 
  children, 
  className, 
  featured = false, 
  hover = true,
  onClick 
}: AppleCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white overflow-hidden transition-all duration-300 ease-apple',
        featured ? 'rounded-[28px] shadow-apple-lg' : 'rounded-[20px] shadow-apple',
        hover && 'hover:shadow-apple-hover hover:-translate-y-0.5 cursor-pointer',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  )
}

interface AppleCardHeaderProps {
  children: ReactNode
  className?: string
}

export function AppleCardHeader({ children, className }: AppleCardHeaderProps) {
  return (
    <div className={cn('px-6 py-5 border-b border-apple-border/30', className)}>
      {children}
    </div>
  )
}

interface AppleCardContentProps {
  children: ReactNode
  className?: string
}

export function AppleCardContent({ children, className }: AppleCardContentProps) {
  return (
    <div className={cn('p-6', className)}>
      {children}
    </div>
  )
}

interface AppleCardFooterProps {
  children: ReactNode
  className?: string
}

export function AppleCardFooter({ children, className }: AppleCardFooterProps) {
  return (
    <div className={cn('px-6 py-4 border-t border-apple-border/30 bg-apple-light-gray/30', className)}>
      {children}
    </div>
  )
}
