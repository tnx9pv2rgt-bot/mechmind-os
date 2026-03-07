'use client'

/**
 * ProfileCompletionModal
 * Modal stile Liquid Glass per completare i campi mancanti del profilo
 * Design: Apple 2026 Liquid Glass
 */

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, ChevronLeft, ChevronRight, Check, Building2, 
  MapPin, Phone, Mail, Briefcase, Gift, Sparkles 
} from 'lucide-react'
import { useProgressiveProfiling, PROFILING_STAGES } from '@/hooks/useProgressiveProfiling'
import { AppleButton } from '@/components/ui/apple-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface ProfileCompletionModalProps {
  isOpen: boolean
  onClose: () => void
  customerId: string
  onComplete?: () => void
}

// Mappatura icone per campo
const FIELD_ICONS: Record<string, React.ReactNode> = {
  companyName: <Building2 className="w-5 h-5" />,
  vat: <Briefcase className="w-5 h-5" />,
  fiscalCode: <Briefcase className="w-5 h-5" />,
  'address.street': <MapPin className="w-5 h-5" />,
  'address.city': <MapPin className="w-5 h-5" />,
  'address.zipCode': <MapPin className="w-5 h-5" />,
  'address.province': <MapPin className="w-5 h-5" />,
  phone: <Phone className="w-5 h-5" />,
  pec: <Mail className="w-5 h-5" />,
  sdi: <Briefcase className="w-5 h-5" />,
  industry: <Building2 className="w-5 h-5" />,
}

// Mappatura label per campo
const FIELD_LABELS: Record<string, string> = {
  companyName: 'Ragione Sociale',
  vat: 'Partita IVA',
  fiscalCode: 'Codice Fiscale',
  'address.street': 'Indirizzo',
  'address.city': 'Città',
  'address.zipCode': 'CAP',
  'address.province': 'Provincia',
  phone: 'Telefono',
  pec: 'PEC',
  sdi: 'Codice SDI',
  'marketingPrefs.email': 'Marketing Email',
  'marketingPrefs.sms': 'Marketing SMS',
  industry: 'Settore',
  companySize: 'Dimensione Azienda',
}

// Mappatura placeholder per campo
const FIELD_PLACEHOLDERS: Record<string, string> = {
  companyName: 'Es. Rossi Srl',
  vat: 'IT12345678901',
  fiscalCode: 'RSSMRA85T10A562S',
  'address.street': 'Via Roma 123',
  'address.city': 'Milano',
  'address.zipCode': '20121',
  'address.province': 'MI',
  phone: '+39 333 123 4567',
  pec: 'pec@azienda.it',
  sdi: 'ABC1234',
  industry: 'Automotive',
  companySize: '1-10 dipendenti',
}

export function ProfileCompletionModal({
  isOpen,
  onClose,
  customerId,
  onComplete,
}: ProfileCompletionModalProps) {
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0)
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  
  const {
    missingFields,
    currentStage,
    completionPercentage,
    updateProfile,
    isLoading,
  } = useProgressiveProfiling({ customerId, autoFetch: isOpen })
  
  const stage = PROFILING_STAGES[currentStage]
  const currentField = missingFields[currentFieldIndex]
  const isLastField = currentFieldIndex === missingFields.length - 1
  const progress = ((currentFieldIndex + 1) / missingFields.length) * 100
  
  // Gestisce il cambio valore di un campo
  const handleFieldChange = useCallback((field: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [field]: value }))
  }, [])
  
  // Passa al campo successivo
  const handleNext = useCallback(async () => {
    if (!currentField) return
    
    // Se c'è un valore, salvalo
    if (fieldValues[currentField]) {
      // Converte il valore in formato oggetto per campi annidati
      const update: Record<string, unknown> = {}
      if (currentField.includes('.')) {
        const [parent, child] = currentField.split('.')
        update[parent] = { [child]: fieldValues[currentField] }
      } else {
        update[currentField] = fieldValues[currentField]
      }
      
      await updateProfile(update)
    }
    
    if (isLastField) {
      setIsSubmitting(true)
      // Simula salvataggio finale
      await new Promise(resolve => setTimeout(resolve, 800))
      setIsSubmitting(false)
      setIsSuccess(true)
      
      // Chiudi dopo un delay
      setTimeout(() => {
        onComplete?.()
        onClose()
        setIsSuccess(false)
        setCurrentFieldIndex(0)
        setFieldValues({})
      }, 2000)
    } else {
      setCurrentFieldIndex(prev => prev + 1)
    }
  }, [currentField, fieldValues, isLastField, updateProfile, onComplete, onClose])
  
  // Torna al campo precedente
  const handlePrevious = useCallback(() => {
    if (currentFieldIndex > 0) {
      setCurrentFieldIndex(prev => prev - 1)
    }
  }, [currentFieldIndex])
  
  // Salta il campo corrente
  const handleSkip = useCallback(() => {
    if (isLastField) {
      onClose()
    } else {
      setCurrentFieldIndex(prev => prev + 1)
    }
  }, [isLastField, onClose])
  
  // Chiudi e resetta
  const handleClose = useCallback(() => {
    onClose()
    setCurrentFieldIndex(0)
    setFieldValues({})
    setIsSuccess(false)
  }, [onClose])
  
  // Render del campo dinamico
  const renderField = () => {
    if (!currentField) return null
    
    const isNested = currentField.includes('.')
    const baseField = isNested ? currentField.split('.')[0] : currentField
    const subField = isNested ? currentField.split('.')[1] : null
    
    // Checkbox per marketing prefs
    if (baseField === 'marketingPrefs') {
      return (
        <div className="flex items-center space-x-3 py-4">
          <Checkbox
            id={currentField}
            checked={fieldValues[currentField] === 'true'}
            onCheckedChange={(checked) => 
              handleFieldChange(currentField, checked ? 'true' : 'false')
            }
            className="w-5 h-5 rounded-lg border-2 data-[state=checked]:bg-blue-500 
                       data-[state=checked]:border-blue-500"
          />
          <Label htmlFor={currentField} className="text-base cursor-pointer">
            Voglio ricevere comunicazioni marketing via {subField === 'email' ? 'email' : 'SMS'}
          </Label>
        </div>
      )
    }
    
    // Input standard
    return (
      <div className="space-y-3">
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            {FIELD_ICONS[currentField] || <Sparkles className="w-5 h-5" />}
          </div>
          <Input
            id={currentField}
            value={fieldValues[currentField] || ''}
            onChange={(e) => handleFieldChange(currentField, e.target.value)}
            placeholder={FIELD_PLACEHOLDERS[currentField] || ''}
            className="h-14 pl-12 pr-4 rounded-2xl bg-white/60 border-0 
                       text-gray-900 placeholder:text-gray-400
                       focus:ring-2 focus:ring-blue-500/20 focus:bg-white/80
                       transition-all duration-300"
            autoFocus
          />
        </div>
        <p className="text-xs text-gray-500 px-1">
          Questo campo ci aiuterà a personalizzare la tua esperienza
        </p>
      </div>
    )
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="max-w-lg bg-white/80 backdrop-blur-3xl border border-white/50 
                   rounded-[28px] p-0 overflow-hidden shadow-apple-xl"
      >
        {/* Header gradient */}
        <div className="relative h-24 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 
                        flex items-center justify-center overflow-hidden">
          {/* Effetti luce */}
          <div className="absolute top-0 left-1/4 w-32 h-32 bg-white/30 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-24 h-24 bg-blue-400/20 rounded-full blur-2xl" />
          
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 
                       flex items-center justify-center shadow-lg shadow-blue-500/25 relative z-10"
          >
            <Gift className="w-8 h-8 text-white" />
          </motion.div>
        </div>
        
        <div className="p-6 pt-4">
          <DialogHeader className="text-center mb-6">
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Completa il tuo profilo
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              {isSuccess ? (
                <span className="text-green-600 font-medium">
                  🎉 Profilo aggiornato con successo!
                </span>
              ) : (
                `Campo ${currentFieldIndex + 1} di ${missingFields.length}`
              )}
            </DialogDescription>
          </DialogHeader>
          
          <AnimatePresence mode="wait">
            {isSuccess ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="py-8 flex flex-col items-center"
              >
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <Check className="w-10 h-10 text-green-600" />
                </div>
                <p className="text-center text-gray-600">
                  Hai sbloccato:<br />
                  <span className="font-semibold text-transparent bg-clip-text 
                                   bg-gradient-to-r from-blue-600 to-purple-600">
                    {stage.incentive}
                  </span>
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Progress bar */}
                <div className="mb-6">
                  <div className="flex justify-between text-xs text-gray-500 mb-2">
                    <span>Progresso</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 bg-gray-200/50 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 
                                 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
                
                {/* Incentive card */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 
                             border border-amber-200/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xs text-amber-700 font-medium">Ricompensa attuale</p>
                      <p className="text-sm font-semibold text-amber-900">{stage.incentive}</p>
                    </div>
                  </div>
                </motion.div>
                
                {/* Campo corrente */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentField}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="mb-6"
                  >
                    <Label 
                      htmlFor={currentField}
                      className="text-base font-medium text-gray-900 mb-3 block"
                    >
                      {FIELD_LABELS[currentField] || currentField}
                    </Label>
                    {renderField()}
                  </motion.div>
                </AnimatePresence>
                
                {/* Azioni */}
                <div className="flex items-center gap-3">
                  {currentFieldIndex > 0 && (
                    <AppleButton
                      type="button"
                      variant="secondary"
                      onClick={handlePrevious}
                      className="h-12 px-4 rounded-2xl"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </AppleButton>
                  )}
                  
                  <AppleButton
                    type="button"
                    variant="secondary"
                    onClick={handleSkip}
                    className="h-12 px-4 rounded-2xl flex-1"
                  >
                    Salta
                  </AppleButton>
                  
                  <AppleButton
                    type="button"
                    onClick={handleNext}
                    disabled={isSubmitting || (!fieldValues[currentField] && !isLastField)}
                    className={cn(
                      'h-12 px-6 rounded-2xl flex-1 font-medium',
                      'bg-gradient-to-r from-blue-500 to-indigo-600',
                      'hover:from-blue-600 hover:to-indigo-700',
                      'text-white shadow-lg shadow-blue-500/25',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    {isSubmitting ? (
                      <motion.svg
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-5 h-5"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </motion.svg>
                    ) : isLastField ? (
                      <>
                        Completa
                        <Check className="w-4 h-4 ml-1" />
                      </>
                    ) : (
                      <>
                        Avanti
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </AppleButton>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ProfileCompletionModal
