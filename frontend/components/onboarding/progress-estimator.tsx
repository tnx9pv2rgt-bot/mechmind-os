"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Clock, CheckCircle2, Sparkles } from "lucide-react"

interface ProgressEstimatorProps {
  currentStep: number
  totalSteps: number
  fieldsCompleted: number
  totalFields: number
  className?: string
}

/**
 * ProgressEstimator - Barra di progresso animata con stima tempo
 * 
 * Features:
 * - Animazione spring sulla barra di progresso
 * - Calcolo dinamico tempo rimanente (9s per campo)
 * - Indicatore visivo step corrente
 * - Celebrations al completamento
 */
export function ProgressEstimator({
  currentStep,
  totalSteps,
  fieldsCompleted,
  totalFields,
  className = ""
}: ProgressEstimatorProps) {
  const percentComplete = Math.round((fieldsCompleted / totalFields) * 100)
  const estimatedSeconds = Math.max(0, (totalFields - fieldsCompleted) * 9)
  const estimatedMinutes = Math.ceil(estimatedSeconds / 60)
  
  const isComplete = fieldsCompleted === totalFields
  const isNearComplete = percentComplete >= 80 && !isComplete

  // Calculate segments for multi-step visualization
  const stepProgress = (currentStep / totalSteps) * 100

  return (
    <motion.div 
      className={`bg-white/70 backdrop-blur-md rounded-2xl p-5 shadow-sm border border-gray-100/50 ${className}`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {/* Header with step info and time estimate */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">
            Step {currentStep} di {totalSteps}
          </span>
          {isNearComplete && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full"
            >
              Quasi fatto!
            </motion.span>
          )}
        </div>
        
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          {isComplete ? (
            <motion.div 
              className="flex items-center gap-1.5 text-green-600 font-medium"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
            >
              <Sparkles className="w-4 h-4" />
              Completato!
            </motion.div>
          ) : (
            <>
              <Clock className="w-3.5 h-3.5" />
              <span>
                {estimatedMinutes < 1 
                  ? "Meno di 1 min" 
                  : `${estimatedMinutes} min rimanenti`
                }
              </span>
            </>
          )}
        </div>
      </div>

      {/* Progress bar container */}
      <div className="relative">
        {/* Background track */}
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          {/* Main progress fill */}
          <motion.div 
            className={`h-full rounded-full ${
              isComplete 
                ? "bg-gradient-to-r from-green-400 to-green-500" 
                : isNearComplete
                  ? "bg-gradient-to-r from-blue-400 via-blue-500 to-green-400"
                  : "bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600"
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${percentComplete}%` }}
            transition={{ 
              type: "spring", 
              stiffness: 100, 
              damping: 20,
              mass: 1
            }}
          />
        </div>

        {/* Step markers */}
        <div className="absolute inset-0 flex justify-between px-1">
          {[...Array(totalSteps)].map((_, i) => {
            const stepNum = i + 1
            const isActive = stepNum === currentStep
            const isPast = stepNum < currentStep
            
            return (
              <motion.div
                key={i}
                className={`w-2 h-2 rounded-full mt-0.5 ${
                  isPast 
                    ? "bg-white/50" 
                    : isActive 
                      ? "bg-white shadow-sm" 
                      : "bg-gray-300"
                }`}
                animate={isActive ? { scale: [1, 1.3, 1] } : {}}
                transition={{ duration: 0.5, repeat: isActive ? Infinity : 0 }}
              />
            )
          })}
        </div>
      </div>

      {/* Footer with completion stats */}
      <div className="flex justify-between items-center mt-3">
        <p className="text-xs text-gray-500">
          {fieldsCompleted} di {totalFields} campi completati
          {isComplete && (
            <motion.span 
              className="ml-2 text-green-600 font-medium"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              🎉 Ottimo lavoro!
            </motion.span>
          )}
        </p>
        
        {/* Completion percentage badge */}
        <motion.span 
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            isComplete 
              ? "bg-green-100 text-green-700" 
              : "bg-blue-50 text-blue-600"
          }`}
          key={percentComplete}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
        >
          {percentComplete}%
        </motion.span>
      </div>

      {/* Motivational message */}
      <AnimatePresence mode="wait">
        {!isComplete && percentComplete > 0 && (
          <motion.p
            key={percentComplete}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 text-xs text-center text-gray-400 italic"
          >
            {percentComplete < 30 && "Ottimo inizio! Continua così 💪"}
            {percentComplete >= 30 && percentComplete < 60 && "Stai andando alla grande! 🚀"}
            {percentComplete >= 60 && percentComplete < 80 && "Manca poco, dai! 🔥"}
            {percentComplete >= 80 && "Ultimo sforzo! 🎯"}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// Simple version for compact layouts
interface CompactProgressProps {
  value: number
  className?: string
}

export function CompactProgress({ value, className = "" }: CompactProgressProps) {
  return (
    <div className={`h-1.5 bg-gray-100 rounded-full overflow-hidden ${className}`}>
      <motion.div 
        className="h-full bg-blue-500 rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
      />
    </div>
  )
}


