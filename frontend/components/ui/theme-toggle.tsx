'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="w-[44px] h-[24px]" />

  const isDark = resolvedTheme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={`relative inline-flex h-[24px] w-[44px] shrink-0 items-center rounded-full transition-colors duration-300 focus:outline-none ${
        isDark ? 'bg-[var(--brand)]' : 'bg-[var(--surface-active)]'
      }`}
      title={isDark ? 'Passa a light mode' : 'Passa a dark mode'}
      aria-label="Toggle theme"
    >
      <motion.span
        className="flex h-[20px] w-[20px] items-center justify-center rounded-full bg-[var(--surface-secondary)] shadow-sm"
        animate={{ x: isDark ? 22 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      >
        {isDark ? (
          <Moon className="h-3 w-3 text-[var(--text-primary)]" />
        ) : (
          <Sun className="h-3 w-3 text-[var(--status-warning)]" />
        )}
      </motion.span>
    </button>
  )
}
