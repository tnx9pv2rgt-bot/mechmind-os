'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, ClipboardCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { AppleButton } from '@/components/ui/apple-button';
import { InspectionForm } from './InspectionForm';
import { InspectionFormData } from './InspectionForm';

interface InspectionDialogProps {
  trigger?: React.ReactNode;
  onInspectionCreated?: (data: InspectionFormData) => void;
}

export function InspectionDialog({ trigger, onInspectionCreated }: InspectionDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (data: InspectionFormData) => {
    setIsSubmitting(true);

    // POST to /api/inspections creates inspection via backend
    const res = await fetch('/api/inspections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Errore creazione ispezione: ${res.status}`);

    setIsSubmitting(false);
    setShowSuccess(true);

    // Notifica il parent
    onInspectionCreated?.(data);

    // Chiudi dopo 2 secondi
    setTimeout(() => {
      setShowSuccess(false);
      setIsOpen(false);
    }, 2000);
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  return (
    <>
      {trigger ? (
        <div onClick={() => setIsOpen(true)}>{trigger}</div>
      ) : (
        <AppleButton onClick={() => setIsOpen(true)} icon={<Plus className='w-4 h-4' />}>
          Nuova Ispezione
        </AppleButton>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className='sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0 bg-[var(--surface-secondary)]/95 backdrop-blur-xl border-[var(--border-default)]/50 rounded-[24px]'>
          <AnimatePresence mode='wait'>
            {showSuccess ? (
              <motion.div
                key='success'
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className='p-12 flex flex-col items-center justify-center text-center min-h-[400px]'
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                  className='w-20 h-20 rounded-full bg-[var(--status-success)]/10 flex items-center justify-center mb-6'
                >
                  <ClipboardCheck className='w-10 h-10 text-[var(--status-success)]' />
                </motion.div>
                <motion.h3
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className='text-2xl font-semibold text-[var(--text-primary)] mb-2'
                >
                  Ispezione Completata!
                </motion.h3>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className='text-[var(--text-tertiary)]'
                >
                  L&apos;ispezione è stata salvata con successo.
                </motion.p>
              </motion.div>
            ) : (
              <motion.div
                key='form'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <DialogHeader className='px-6 py-5 border-b border-[var(--border-default)]/30'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                      <div className='w-10 h-10 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center'>
                        <ClipboardCheck className='w-5 h-5 text-[var(--brand)]' />
                      </div>
                      <div>
                        <DialogTitle className='text-xl font-semibold text-[var(--text-primary)]'>
                          Nuova Ispezione DVI
                        </DialogTitle>
                        <DialogDescription className='text-[var(--text-tertiary)] text-sm mt-0.5'>
                          Crea una nuova ispezione digitale del veicolo
                        </DialogDescription>
                      </div>
                    </div>
                  </div>
                </DialogHeader>

                <div className='p-6'>
                  <InspectionForm
                    onSubmit={handleSubmit}
                    onSaveDraft={handleSubmit}
                    vehicles={[]}
                    inspectors={[]}
                    isLoading={isSubmitting}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Versione compatta per inline usage
export function InspectionDialogCompact({
  onInspectionCreated,
}: {
  onInspectionCreated?: (data: InspectionFormData) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: InspectionFormData) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`Errore creazione ispezione: ${res.status}`);
      onInspectionCreated?.(data);
    } finally {
      setIsSubmitting(false);
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <AppleButton size='sm' icon={<Plus className='w-4 h-4' />}>
          Aggiungi
        </AppleButton>
      </DialogTrigger>
      <DialogContent className='sm:max-w-2xl max-h-[85vh] overflow-y-auto p-0 gap-0 bg-[var(--surface-secondary)]/95 backdrop-blur-xl border-[var(--border-default)]/50 rounded-[24px]'>
        <DialogHeader className='px-6 py-4 border-b border-[var(--border-default)]/30'>
          <DialogTitle className='text-lg font-semibold text-[var(--text-primary)]'>
            Nuova Ispezione
          </DialogTitle>
        </DialogHeader>
        <div className='p-6'>
          <InspectionForm
            onSubmit={handleSubmit}
            onSaveDraft={handleSubmit}
            vehicles={[]}
            inspectors={[]}
            isLoading={isSubmitting}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook per usare il dialog programmaticamente
export function useInspectionDialog() {
  const [isOpen, setIsOpen] = useState(false);

  const openDialog = () => setIsOpen(true);
  const closeDialog = () => setIsOpen(false);

  return {
    isOpen,
    openDialog,
    closeDialog,
    InspectionDialogComponent: InspectionDialog,
  };
}

// Esporta anche il DialogTrigger per uso avanzato
import { DialogTrigger } from '@/components/ui/dialog';
export { DialogTrigger };
