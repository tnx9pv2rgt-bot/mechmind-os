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
      <DialogContent className="sm:max-w-md border-0 bg-white/95 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50/50 via-transparent to-orange-50/50 pointer-events-none" />
        
        {/* Animated gift icon */}
        <motion.div 
          className="absolute top-4 right-4"
          animate={{ rotate: [0, -10, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Gift className="w-5 h-5 text-amber-400" />
        </motion.div>

        <div className="relative z-10 text-center py-4">
          {/* Icon container */}
          <motion.div 
            className="mx-auto w-20 h-20 bg-gradient-to-br from-amber-100 to-orange-100 rounded-3xl flex items-center justify-center mb-6 shadow-inner"
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
              <Gift className="w-10 h-10 text-amber-600" />
            </motion.div>
          </motion.div>

          <DialogHeader className="space-y-3">
            <DialogTitle className="text-2xl font-bold text-gray-900">
              Aspetta! Non perdere questo vantaggio
            </DialogTitle>
            <DialogDescription className="text-gray-600 text-base leading-relaxed">
              Completa la registrazione ora e ricevi{' '}
              <span className="font-bold text-amber-600 text-lg">
                {discountPercentage}% di sconto
              </span>{' '}
              sul primo ordine.
            </DialogDescription>
          </DialogHeader>

          {/* Countdown */}
          <motion.div 
            className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-100"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-center gap-2 text-amber-700 mb-2">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">Offerta limitata</span>
            </div>
            <div className="text-3xl font-bold text-amber-600 tabular-nums">
              {formatTime(countdown)}
            </div>
            <p className="text-xs text-amber-600/70 mt-1">
              Lo sconto scade tra poco
            </p>
          </motion.div>

          {/* Benefits */}
          <motion.div 
            className="mt-4 flex justify-center gap-6 text-sm text-gray-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              Setup gratis
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              Nessuna carta
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
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
              className="flex-1 h-12 border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              Continua dopo
            </Button>
            <Button 
              onClick={handleContinue} 
              className="flex-1 h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25 group"
            >
              Completa ora
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>

          {/* Trust text */}
          <p className="mt-4 text-xs text-gray-400">
            Più di 10.000 officine si sono già unite a noi
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
