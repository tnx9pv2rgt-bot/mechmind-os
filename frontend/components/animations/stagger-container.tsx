'use client'

/**
 * MechMind OS - Stagger Animation Components
 * 
 * Componenti riutilizzabili per animazioni a cascata (stagger)
 * Usano Framer Motion per creare effetti fluidi Apple-style
 */

import { motion, Variants } from 'framer-motion'
import { ReactNode } from 'react'

// 🎭 Variants predefiniti
export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    }
  }
}

export const staggerItemVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 20,
    scale: 0.95
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1] // Apple-style cubic-bezier
    }
  }
}

export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.5, ease: 'easeOut' }
  }
}

export const slideUpVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }
  }
}

export const slideDownVariants: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' }
  }
}

export const scaleInVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.3, ease: 'easeOut' }
  }
}

// 🎬 Componente Container
interface StaggerContainerProps {
  children: ReactNode
  className?: string
  delay?: number
  staggerDelay?: number
}

export function StaggerContainer({ 
  children, 
  className = '',
  delay = 0.05,
  staggerDelay = 0.1
}: StaggerContainerProps) {
  const customVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: delay,
      }
    }
  }

  return (
    <motion.div
      variants={customVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  )
}

// 🎭 Componente Item
interface StaggerItemProps {
  children: ReactNode
  className?: string
  hoverScale?: number
  hoverX?: number
}

export function StaggerItem({ 
  children, 
  className = '',
  hoverScale,
  hoverX
}: StaggerItemProps) {
  const hoverProps: { scale?: number; x?: number } = {}
  if (hoverScale) hoverProps.scale = hoverScale
  if (hoverX) hoverProps.x = hoverX

  return (
    <motion.div
      variants={staggerItemVariants}
      whileHover={Object.keys(hoverProps).length > 0 ? hoverProps : undefined}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// 📄 Componente Pagina con Header Animato
interface AnimatedPageProps {
  children: ReactNode
  title: string
  subtitle?: string
  className?: string
}

export function AnimatedPage({ children, title, subtitle, className = '' }: AnimatedPageProps) {
  return (
    <div className={`min-h-screen ${className}`}>
      <motion.header 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="bg-[var(--surface-secondary)] backdrop-blur-apple sticky top-0 z-40 border-b border-[var(--border-default)]/20"
      >
        <div className="px-8 py-5">
          <h1 className="text-headline text-[var(--text-primary)]">{title}</h1>
          {subtitle && (
            <p className="text-[var(--text-tertiary)] text-body mt-1">{subtitle}</p>
          )}
        </div>
      </motion.header>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="p-8"
      >
        {children}
      </motion.div>
    </div>
  )
}

// 🃏 Componente Card Animata
interface AnimatedCardProps {
  children: ReactNode
  className?: string
  delay?: number
  hover?: boolean
}

export function AnimatedCard({ 
  children, 
  className = '',
  delay = 0,
  hover = true
}: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.4, 
        delay,
        ease: [0.25, 0.1, 0.25, 1]
      }}
      whileHover={hover ? { scale: 1.02, y: -2 } : undefined}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// 📊 Componente per liste animate
interface AnimatedListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => ReactNode
  className?: string
  itemClassName?: string
  staggerDelay?: number
}

export function AnimatedList<T>({ 
  items, 
  renderItem, 
  className = '',
  itemClassName = '',
  staggerDelay = 0.05
}: AnimatedListProps<T>) {
  const listVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
      }
    }
  }

  const itemVariants: Variants = {
    hidden: { opacity: 0, x: -10 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.3 }
    }
  }

  return (
    <motion.div
      variants={listVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {items.map((item, index) => (
        <motion.div key={index} variants={itemVariants} className={itemClassName}>
          {renderItem(item, index)}
        </motion.div>
      ))}
    </motion.div>
  )
}

// 🔄 Componente Loading Skeleton Animato
export function AnimatedSkeleton({ count = 3, className = '' }: { count?: number, className?: string }) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity, 
            delay: i * 0.2 
          }}
          className="h-20 bg-[var(--surface-secondary)] rounded-2xl mb-4"
        />
      ))}
    </div>
  )
}
