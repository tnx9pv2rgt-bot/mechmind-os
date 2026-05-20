"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Gift, X, ArrowRight, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

interface ExitIntentModalProps {
  onContinue?: () => void
  onDismiss?: () => void
  discountPercentage?: number
}

/**
 * ExitIntentModal - Modal che appare quando l'utente tenta di uscire
 * 
 * Features:
 * - Detect mouseleave verso l'alto (chiusura browser)
 * - Offerta speciale con countdown
 * - Animazioni fluide con Framer Motion
 * - Mobile-friendly (non si attiva su touch)
 */
export function ExitIntentModal({
  onContinue,
  onDismiss,
  discountPercentage = 10
}: ExitIntentModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [hasTriggered, setHasTriggered] = useState(false)
  const [countdown, setCountdown] = useState(300) // 5 minuti in secondi

  // Detect exit intent
  useEffect(() => {
    // Non attivare su touch device
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    if (isTouchDevice) return

    const handleMouseLeave = (e: MouseEvent) => {
      // Solo quando il mouse esce verso l'alto (verso la toolbar/chiusura)
      if (e.clientY < 10 && !hasTriggered && !isOpen) {
        setIsOpen(true)
        setHasTriggered(true)
      }
    }

    // Delay per non triggerare subito all'ingresso
    const timer = setTimeout(() => {
      document.addEventListener("mouseleave", handleMouseLeave)
    }, 3000)

    return () => {
      clearTimeout(timer)
      document.removeEventListener("mouseleave", handleMouseLeave)
    }
  }, [hasTriggered, isOpen])

  // Countdown timer
  useEffect(() => {
    if (!isOpen || countdown <= 0) return

    const timer = setInterval(() => {
      setCountdown(prev => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [isOpen, countdown])

  const handleContinue = useCallback(() => {
    setIsOpen(false)
    onContinue?.()
  }, [onContinue])

  const handleDismiss = useCallback(() => {
    setIsOpen(false)
    onDismiss?.()
  }, [onDismiss])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md border-0 bg-[var(--surface-secondary)]/95 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--status-warning)]/5/50 via-transparent to-[var(--status-warning)]/5/50 pointer-events-none" />
        
        {/* Animated gift icon */}
        <motion.div 
          className="absolute top-4 right-4"
          animate={{ rotate: [0, -10, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Gift className="w-5 h-5 text-[var(--status-warning)]" />
        </motion.div>

        <div className="relative z-10 text-center py-4">
          {/* Icon container */}
          <motion.div 
            className="mx-auto w-20 h-20 bg-gradient-to-br from-[var(--status-warning)]/10 to-[var(--status-warning)]/10 rounded-3xl flex items-center justify-center mb-6 shadow-inner"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
          >
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, -5, 5, 0]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Gift className="w-10 h-10 text-[var(--status-warning)]" />
            </motion.div>
          </motion.div>

          <DialogHeader className="space-y-3">
            <DialogTitle className="text-2xl font-bold text-[var(--text-primary)]">
              Aspetta! Non perdere questo vantaggio
            </DialogTitle>
            <DialogDescription className="text-[var(--text-secondary)] text-base leading-relaxed">
              Completa la registrazione ora e ricevi{' '}
              <span className="font-bold text-[var(--status-warning)] text-lg">
                {discountPercentage}% di sconto
              </span>{' '}
              sul primo ordine.
            </DialogDescription>
          </DialogHeader>

          {/* Countdown */}
          <motion.div 
            className="mt-6 p-4 bg-[var(--status-warning)]/5 rounded-xl border border-[var(--status-warning)]/10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-center gap-2 text-[var(--status-warning)] mb-2">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">Offerta limitata</span>
            </div>
            <div className="text-3xl font-bold text-[var(--status-warning)] tabular-nums">
              {formatTime(countdown)}
            </div>
            <p className="text-xs text-[var(--status-warning)]/70 mt-1">
              Lo sconto scade tra poco
            </p>
          </motion.div>

          {/* Benefits */}
          <motion.div 
            className="mt-4 flex justify-center gap-6 text-sm text-[var(--text-tertiary)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-[var(--status-success-subtle)]0 rounded-full" />
              Setup gratis
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-[var(--status-success-subtle)]0 rounded-full" />
              Nessuna carta
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-[var(--status-success-subtle)]0 rounded-full" />
              Annulla quando vuoi
            </span>
          </motion.div>

          {/* Actions */}
          <motion.div 
            className="mt-8 flex flex-col sm:flex-row gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Button 
              onClick={handleDismiss} 
              variant="outline" 
              className="flex-1 h-12 border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]"
            >
              Continua dopo
            </Button>
            <Button 
              onClick={handleContinue} 
              className="flex-1 h-12 bg-gradient-to-r from-[var(--status-warning)] to-[var(--status-warning)] hover:from-[var(--status-warning)] hover:to-[var(--status-warning)] text-[var(--text-on-brand)] shadow-lg shadow-amber-500/25 group"
            >
              Completa ora
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>

          {/* Trust text */}
          <p className="mt-4 text-xs text-[var(--text-tertiary)]">
            Più di 10.000 officine si sono già unite a noi
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
