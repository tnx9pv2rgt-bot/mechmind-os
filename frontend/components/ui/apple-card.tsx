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
        'bg-[#2f2f2f] border border-[#4e4e4e] overflow-hidden transition-all duration-300 ease-apple',
        featured ? 'rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.5)]' : 'rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.5)]',
        hover && 'hover:bg-[#383838] hover:-translate-y-0.5 cursor-pointer',
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
    <div className={cn('px-6 py-5 border-b border-[#4e4e4e]', className)}>
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
    <div className={cn('px-6 py-4 border-t border-[#4e4e4e] bg-[#383838]', className)}>
      {children}
    </div>
  )
}
