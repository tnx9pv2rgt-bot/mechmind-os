'use client'

/**
 * ProfileCompletionBanner
 * Banner stile Liquid Glass per il completamento del profilo
 * Design: Apple 2026 Liquid Glass
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Gift, X, Sparkles, ChevronRight } from 'lucide-react'
import { AppleButton } from '@/components/ui/apple-button'
import { useProgressiveProfiling, PROFILING_STAGES } from '@/hooks/useProgressiveProfiling'
import { cn } from '@/lib/utils'
import { ProfileCompletionModal } from './profile-completion-modal'

interface ProfileCompletionBannerProps {
  customerId: string
  onComplete?: () => void
  className?: string
  dismissable?: boolean
}

export function ProfileCompletionBanner({
  customerId,
  onComplete,
  className,
  dismissable = true,
}: ProfileCompletionBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  const {
    missingFields,
    currentStage,
    completionPercentage,
    isLoading,
  } = useProgressiveProfiling({ customerId })
  
  const stage = PROFILING_STAGES[currentStage]
  
  // Non mostrare se il profilo è completo o se è stato dismissato
  if (missingFields.length === 0 || isDismissed || currentStage === 'complete') {
    return null
  }
  
  // Calcola la circonferenza del cerchio di progresso
  const radius = 20
  const circumference = 2 * Math.PI * radius
  const progressOffset = circumference - (completionPercentage / 100) * circumference
  
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ 
          duration: 0.5, 
          ease: [0.25, 0.1, 0.25, 1] // Apple ease-out
        }}
        className={cn(
          'relative overflow-hidden',
          'bg-gradient-to-r from-[var(--status-info)]/10 via-[var(--brand)]/10 to-[var(--status-warning)]/10',
          'backdrop-blur-3xl',
          'border border-[var(--border-default)]/50',
          'rounded-[24px]',
          'p-5 mb-6',
          'shadow-apple-lg',
          className
        )}
      >
        {/* Effetto luce sferica (Liquid Glass) */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-[var(--surface-secondary)]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[var(--status-info)]/10 rounded-full blur-2xl pointer-events-none" />
        
        {/* Pulsante chiudi */}
        {dismissable && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsDismissed(true)}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-[var(--surface-secondary)]/40 hover:bg-[var(--surface-secondary)]/60 
                       transition-colors z-10"
            aria-label="Chiudi banner"
          >
            <X className="w-4 h-4 text-[var(--text-secondary)]" />
          </motion.button>
        )}
        
        <div className="flex items-center justify-between gap-4 relative z-0">
          {/* Sezione sinistra: Icona e testo */}
          <div className="flex items-center gap-4">
            {/* Icona incentive */}
            <motion.div
              initial={{ scale: 0.8, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className={cn(
                'w-14 h-14 rounded-2xl flex-shrink-0',
                'bg-gradient-to-br from-[var(--status-info)] to-[var(--brand)]',
                'flex items-center justify-center',
                'shadow-lg shadow-blue-500/25',
                'relative overflow-hidden'
              )}
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--surface-secondary)]/20 to-transparent 
                              translate-x-[-100%] animate-shimmer" />
              <Gift className="w-7 h-7 text-[var(--text-on-brand)]" />
            </motion.div>
            
            {/* Testo */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-[var(--text-primary)] text-base">
                  Completa il tuo profilo
                </h4>
                <Sparkles className="w-4 h-4 text-[var(--status-warning)]" />
              </div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Aggiungi{' '}
                <span className="font-medium text-[var(--text-primary)]">
                  {missingFields.length} campo{missingFields.length > 1 ? 'pi' : ''}
                </span>{' '}
                e ricevi:
              </p>
              <motion.p
                key={stage.incentive}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-sm font-semibold bg-gradient-to-r from-[var(--status-info)] to-[var(--brand)] 
                           bg-clip-text text-transparent mt-0.5"
              >
                {stage.incentive}
              </motion.p>
            </div>
          </div>
          
          {/* Sezione destra: Progresso e CTA */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {/* Progresso circolare */}
            <div className="relative w-14 h-14 flex-shrink-0">
              <svg className="w-14 h-14 transform -rotate-90" viewBox="0 0 48 48">
                {/* Cerchio di sfondo */}
                <circle
                  cx="24"
                  cy="24"
                  r={radius}
                  fill="none"
                  stroke="#E5E7EB"
                  strokeWidth="4"
                />
                {/* Cerchio di progresso */}
                <motion.circle
                  cx="24"
                  cy="24"
                  r={radius}
                  fill="none"
                  stroke="url(#gradient)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: progressOffset }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
                {/* Gradient definition */}
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                  </linearGradient>
                </defs>
              </svg>
              {/* Percentuale */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-[var(--text-secondary)]">
                  {Math.round(completionPercentage)}%
                </span>
              </div>
            </div>
            
            {/* Bottone CTA */}
            <AppleButton
              onClick={() => setIsModalOpen(true)}
              disabled={isLoading}
              className="h-11 px-5 rounded-2xl bg-gradient-to-r from-[var(--status-info)] to-[var(--brand)] 
                         hover:from-[var(--status-info)] hover:to-[var(--brand)] text-[var(--text-on-brand)] font-medium
                         shadow-lg shadow-blue-500/25 hidden sm:flex items-center gap-1.5"
            >
              Completa ora
              <ChevronRight className="w-4 h-4" />
            </AppleButton>
            
            {/* Bottone mobile (solo icona) */}
            <AppleButton
              onClick={() => setIsModalOpen(true)}
              disabled={isLoading}
              size="sm"
              className="h-10 w-10 p-0 rounded-xl bg-gradient-to-r from-[var(--status-info)] to-[var(--brand)] 
                         hover:from-[var(--status-info)] hover:to-[var(--brand)] text-[var(--text-on-brand)]
                         shadow-lg shadow-blue-500/25 sm:hidden flex items-center justify-center"
            >
              <ChevronRight className="w-5 h-5" />
            </AppleButton>
          </div>
        </div>
        
        {/* Progress bar lineare in basso */}
        <div className="mt-4">
          <div className="h-1.5 w-full bg-[var(--border-default)]/50 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[var(--status-info)] via-[var(--brand)] to-[var(--status-warning)] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${completionPercentage}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-[var(--text-tertiary)]">
              {completedFields} di {totalFields} campi completati
            </span>
            <span className="text-xs text-[var(--text-tertiary)]">
              {missingFields.length} rimanenti
            </span>
          </div>
        </div>
      </motion.div>
      
      {/* Modal per completamento */}
      <ProfileCompletionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        customerId={customerId}
        onComplete={() => {
          setIsModalOpen(false)
          onComplete?.()
        }}
      />
    </>
  )
}

// Helper per il calcolo dei campi
const totalFields = 15 // Totale campi nel profilo completo
const completedFields = Math.round((50 / 100) * totalFields) // Esempio

export default ProfileCompletionBanner
