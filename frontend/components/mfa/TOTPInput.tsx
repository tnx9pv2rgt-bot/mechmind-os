'use client'

import { useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react'
import { cn } from '@/lib/utils'

interface TOTPInputProps {
  value: string
  onChange: (value: string) => void
  length?: 6 | 8
  error?: string
  disabled?: boolean
  autoFocus?: boolean
}

export function TOTPInput({
  value,
  onChange,
  length = 6,
  error,
  disabled = false,
  autoFocus = false,
}: TOTPInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  
  // Ensure value is a string of the correct length
  const paddedValue = value.padEnd(length, '').slice(0, length)
  const digits = paddedValue.split('')

  // Focus first input on mount if autoFocus
  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus()
    }
  }, [autoFocus])

  const handleChange = (index: number, inputValue: string) => {
    // Only allow digits
    const digit = inputValue.replace(/\D/g, '').slice(-1)
    
    if (!digit) return

    // Update value
    const newValue = value.split('')
    newValue[index] = digit
    const newValueStr = newValue.join('')
    onChange(newValueStr)

    // Move to next input
    if (index < length - 1 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'Backspace':
        e.preventDefault()
        if (value[index]) {
          // Clear current digit
          const newValue = value.split('')
          newValue[index] = ''
          onChange(newValue.join('').trim())
        } else if (index > 0) {
          // Move to previous input and clear it
          const newValue = value.split('')
          newValue[index - 1] = ''
          onChange(newValue.join('').trim())
          inputRefs.current[index - 1]?.focus()
        }
        break
        
      case 'ArrowLeft':
        if (index > 0) {
          inputRefs.current[index - 1]?.focus()
        }
        break
        
      case 'ArrowRight':
        if (index < length - 1) {
          inputRefs.current[index + 1]?.focus()
        }
        break
        
      case 'Delete':
        e.preventDefault()
        if (value[index]) {
          const newValue = value.split('')
          newValue[index] = ''
          onChange(newValue.join('').trim())
        }
        break
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text')
    
    // Extract only digits
    const digits = pastedData.replace(/\D/g, '').slice(0, length)
    
    if (digits) {
      onChange(digits)
      
      // Focus the appropriate input
      const focusIndex = Math.min(digits.length, length - 1)
      inputRefs.current[focusIndex]?.focus()
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-2">
        {Array.from({ length }).map((_, index) => (
          <input
            key={index}
            ref={(el) => { inputRefs.current[index] = el }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digits[index] || ''}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            disabled={disabled}
            className={cn(
              'h-12 w-10 rounded-lg border-2 text-center text-xl font-bold',
              'transition-all duration-200',
              'focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20',
              'dark:bg-[var(--surface-primary)] dark:text-[var(--text-on-brand)]',
              error 
                ? 'border-[var(--status-error)] bg-[var(--status-error-subtle)] dark:border-[var(--status-error)] dark:bg-[var(--status-error-subtle)]' 
                : 'border-[var(--border-default)] dark:border-[var(--border-default)]',
              disabled && 'cursor-not-allowed opacity-50'
            )}
            aria-label={`Digit ${index + 1}`}
            autoComplete="one-time-code"
          />
        ))}
      </div>
      
      {error && (
        <p className="text-sm text-[var(--status-error)] dark:text-[var(--status-error)]">
          {error}
        </p>
      )}
      
      <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
        Inserisci il codice a {length} cifre
      </p>
    </div>
  )
}

export default TOTPInput
