'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Package, CheckCircle2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { AppleButton } from '@/components/ui/apple-button'
import { PartForm } from './part-form'
import { PartFormData } from './part-form-schema'

interface PartDialogProps {
  trigger?: React.ReactNode
  onPartCreated?: (data: PartFormData) => void
  initialData?: Partial<PartFormData>
  mode?: 'create' | 'edit'
}

export function PartDialog({
  trigger,
  onPartCreated,
  initialData,
  mode = 'create',
}: PartDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleSubmit = async (data: PartFormData) => {
    setIsSubmitting(true)
    
    // Simula chiamata API
    await new Promise((resolve) => setTimeout(resolve, 1500))
    
    console.log(mode === 'create' ? 'Part created:' : 'Part updated:', data)
    
    setIsSubmitting(false)
    setShowSuccess(true)
    
    // Notifica il parent
    onPartCreated?.(data)
    
    // Chiudi dopo 2 secondi
    setTimeout(() => {
      setShowSuccess(false)
      setIsOpen(false)
    }, 2000)
  }

  const handleCancel = () => {
    setIsOpen(false)
  }

  const isEditMode = mode === 'edit'

  return (
    <>
      {trigger ? (
        <div onClick={() => setIsOpen(true)}>{trigger}</div>
      ) : (
        <AppleButton 
          onClick={() => setIsOpen(true)} 
          icon={<Plus className="w-4 h-4" />}
          variant={isEditMode ? 'secondary' : 'primary'}
        >
          {isEditMode ? 'Modifica' : 'Nuovo Ricambio'}
        </AppleButton>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0 bg-white/95 backdrop-blur-xl border-apple-border/50 rounded-[24px]">
          <AnimatePresence mode="wait">
            {showSuccess ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-12 flex flex-col items-center justify-center text-center min-h-[400px]"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                  className="w-20 h-20 rounded-full bg-apple-green/10 flex items-center justify-center mb-6"
                >
                  <CheckCircle2 className="w-10 h-10 text-apple-green" />
                </motion.div>
                <motion.h3
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-2xl font-semibold text-apple-dark mb-2"
                >
                  {isEditMode ? 'Modifiche Salvate!' : 'Ricambio Creato!'}
                </motion.h3>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-apple-gray"
                >
                  {isEditMode 
                    ? 'Le modifiche sono state salvate con successo.'
                    : 'Il ricambio è stato aggiunto al magazzino.'}
                </motion.p>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <DialogHeader className="px-6 py-5 border-b border-apple-border/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-apple-blue/10 flex items-center justify-center">
                        <Package className="w-5 h-5 text-apple-blue" />
                      </div>
                      <div>
                        <DialogTitle className="text-xl font-semibold text-apple-dark">
                          {isEditMode ? 'Modifica Ricambio' : 'Nuovo Ricambio'}
                        </DialogTitle>
                        <DialogDescription className="text-apple-gray text-sm mt-0.5">
                          {isEditMode 
                            ? 'Modifica le informazioni del ricambio'
                            : 'Aggiungi un nuovo ricambio al magazzino'}
                        </DialogDescription>
                      </div>
                    </div>
                  </div>
                </DialogHeader>

                <div className="p-6">
                  <PartForm
                    initialData={initialData}
                    onSubmit={handleSubmit}
                    onCancel={handleCancel}
                    isLoading={isSubmitting}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Versione compatta per inline usage
export function PartDialogCompact({
  onPartCreated,
}: {
  onPartCreated?: (data: PartFormData) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (data: PartFormData) => {
    setIsSubmitting(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    onPartCreated?.(data)
    setIsSubmitting(false)
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <AppleButton size="sm" icon={<Plus className="w-4 h-4" />}>
          Aggiungi
        </AppleButton>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto p-0 gap-0 bg-white/95 backdrop-blur-xl border-apple-border/50 rounded-[24px]">
        <DialogHeader className="px-6 py-4 border-b border-apple-border/30">
          <DialogTitle className="text-lg font-semibold text-apple-dark">
            Nuovo Ricambio
          </DialogTitle>
        </DialogHeader>
        <div className="p-6">
          <PartForm
            onSubmit={handleSubmit}
            onCancel={() => setIsOpen(false)}
            isLoading={isSubmitting}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Hook per usare il dialog programmaticamente
export function usePartDialog() {
  const [isOpen, setIsOpen] = useState(false)

  const openDialog = () => setIsOpen(true)
  const closeDialog = () => setIsOpen(false)

  return {
    isOpen,
    openDialog,
    closeDialog,
    PartDialogComponent: PartDialog,
  }
}

// Esporta anche il DialogTrigger per uso avanzato
import { DialogTrigger } from '@/components/ui/dialog'
export { DialogTrigger }
