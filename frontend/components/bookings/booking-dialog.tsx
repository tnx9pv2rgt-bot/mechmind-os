'use client'

/**
 * Booking Dialog Component - Apple Design 2026
 * Modal wrapper for the booking form
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Calendar, X } from 'lucide-react'
import { cn } from '@/lib/utils'

// UI Components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog'
import { AppleButton } from '@/components/ui/apple-button'

// Components
import { BookingForm } from './booking-form'
import type { BookingFormData } from './booking-form-schema'

// =============================================================================
// TYPES
// =============================================================================

interface BookingDialogProps {
  trigger?: React.ReactNode
  onBookingCreated?: (data: BookingFormData) => void
  className?: string
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function BookingDialog({ 
  trigger, 
  onBookingCreated,
  className 
}: BookingDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = () => {
    onBookingCreated?.({} as BookingFormData)

    // Close dialog after success animation
    setTimeout(() => {
      setIsLoading(false)
      setOpen(false)
    }, 2000)
  }

  const handleCancel = () => {
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <AppleButton
            variant="primary"
            size="lg"
            icon={<Plus className="h-5 w-5" />}
            className={cn(
              'shadow-apple hover:shadow-apple-hover transition-shadow',
              className
            )}
          >
            Nuova Prenotazione
          </AppleButton>
        )}
      </DialogTrigger>
      
      <DialogContent 
        className="sm:max-w-[600px] p-0 gap-0 overflow-hidden border-0 bg-transparent shadow-none"
        style={{ 
          background: 'transparent',
          boxShadow: 'none',
          border: 'none'
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="relative rounded-[28px] bg-white/80 backdrop-blur-3xl shadow-apple-lg overflow-hidden"
        >
          {/* Glassmorphism Background Effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/20 to-apple-light-gray/30 pointer-events-none" />
          
          {/* Header */}
          <DialogHeader className="relative px-6 pt-6 pb-4 border-b border-apple-border/30">
            <div className="flex items-center gap-3">
              <motion.div 
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-apple-blue/10"
              >
                <Calendar className="h-6 w-6 text-apple-blue" />
              </motion.div>
              <div>
                <DialogTitle className="text-xl font-semibold text-apple-dark">
                  Nuova Prenotazione
                </DialogTitle>
                <DialogDescription className="text-sm text-apple-gray">
                  Crea una nuova prenotazione servizio
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Form Content */}
          <div className="relative px-6 py-5">
            <BookingForm
              onSuccess={handleSubmit}
              onCancel={handleCancel}
            />
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}

// =============================================================================
// STANDALONE BUTTON VARIANT
// =============================================================================

interface BookingButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  className?: string
  onBookingCreated?: (data: BookingFormData) => void
}

export function BookingButton({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  onBookingCreated,
}: BookingButtonProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSuccess = () => {
    onBookingCreated?.({} as BookingFormData)
    setTimeout(() => {
      setIsLoading(false)
      setOpen(false)
    }, 2000)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <AppleButton
          variant={variant}
          size={size}
          fullWidth={fullWidth}
          icon={<Plus className="h-4 w-4" />}
          className={className}
        >
          Nuova Prenotazione
        </AppleButton>
      </DialogTrigger>

      <DialogContent
        className="sm:max-w-[600px] p-0 gap-0 overflow-hidden border-0"
      >
        <div className="relative rounded-[28px] bg-white/90 backdrop-blur-3xl shadow-apple-lg">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-apple-border/30">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-apple-blue/10">
                <Calendar className="h-6 w-6 text-apple-blue" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold text-apple-dark">
                  Nuova Prenotazione
                </DialogTitle>
                <DialogDescription className="text-sm text-apple-gray">
                  Crea una nuova prenotazione servizio
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="px-6 py-5">
            <BookingForm
              onSuccess={handleSuccess}
              onCancel={() => setOpen(false)}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// =============================================================================
// INLINE FORM VARIANT (for use in pages without modal)
// =============================================================================

interface BookingFormCardProps {
  onBookingCreated?: (data: BookingFormData) => void
  className?: string
}

export function BookingFormCard({ onBookingCreated, className }: BookingFormCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = () => {
    onBookingCreated?.({} as BookingFormData)
    setIsLoading(false)
    setIsSuccess(true)
  }

  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          'rounded-[28px] bg-white/80 backdrop-blur-3xl p-8 shadow-apple-lg',
          className
        )}
      >
        <div className="flex flex-col items-center justify-center text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-apple-green/10"
          >
            <Calendar className="h-8 w-8 text-apple-green" />
          </motion.div>
          <h3 className="text-xl font-semibold text-apple-dark">
            Prenotazione creata!
          </h3>
          <p className="mt-1 text-apple-gray">
            La prenotazione è stata salvata con successo.
          </p>
          <AppleButton 
            variant="primary" 
            className="mt-4"
            onClick={() => setIsSuccess(false)}
          >
            Crea un&apos;altra
          </AppleButton>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        'rounded-[28px] bg-white/80 backdrop-blur-3xl shadow-apple-lg overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-apple-border/30">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-apple-blue/10">
            <Calendar className="h-6 w-6 text-apple-blue" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-apple-dark">
              Nuova Prenotazione
            </h2>
            <p className="text-sm text-apple-gray">
              Crea una nuova prenotazione servizio
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="px-6 py-5">
        <BookingForm
          onSuccess={handleSubmit}
          onCancel={() => {}}
        />
      </div>
    </motion.div>
  )
}
