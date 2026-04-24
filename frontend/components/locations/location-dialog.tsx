'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { LocationForm } from './location-form';
import { LocationFormData } from './location-form-schema';
import { AppleButton } from '@/components/ui/apple-button';
import { Building2, CheckCircle2, ArrowRight, Sparkles, MapPin } from 'lucide-react';

interface LocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  initialData?: Partial<LocationFormData>;
  mode?: 'create' | 'edit';
}

// Animation variants
const contentVariants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    filter: 'blur(10px)',
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    filter: 'blur(10px)',
    transition: {
      duration: 0.2,
    },
  },
};

const successVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 20,
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const successItemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15,
    },
  },
};

export function LocationDialog({
  open,
  onOpenChange,
  onSuccess,
  initialData,
  mode = 'create',
}: LocationDialogProps) {
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdLocationName, setCreatedLocationName] = useState('');

  const handleSubmit = async (data: Record<string, unknown>) => {
    const res = await fetch('/api/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as Record<string, string>).message || `Errore salvataggio sede: ${res.status}`);
    }
    setCreatedLocationName((data.name as string) || 'Nuova sede');
    setIsSuccess(true);

    setTimeout(() => {
      setIsSuccess(false);
      onOpenChange(false);
      onSuccess?.();
    }, 3000);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const isEdit = mode === 'edit' || !!initialData;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0 bg-transparent border-0'>
        <AnimatePresence mode='wait'>
          {!isSuccess ? (
            <motion.div
              key='form'
              variants={contentVariants}
              initial='hidden'
              animate='visible'
              exit='exit'
              className='bg-[var(--surface-secondary)]/90 backdrop-blur-2xl rounded-[28px] shadow-apple-xl border border-[var(--border-default)]/50 overflow-hidden'
            >
              {/* Header con liquid glass effect */}
              <div className='relative overflow-hidden'>
                <div className='absolute inset-0 bg-gradient-to-br from-[var(--brand)]/10 via-apple-purple/5 to-transparent' />
                <div className='absolute -top-20 -right-20 w-40 h-40 bg-[var(--brand)]/20 rounded-full blur-3xl' />
                <div className='absolute -bottom-20 -left-20 w-40 h-40 bg-[var(--brand)]/20 rounded-full blur-3xl' />

                <DialogHeader className='relative p-8 pb-4'>
                  <div className='flex items-center gap-4'>
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                      className='w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--brand)] to-[var(--status-info)] flex items-center justify-center shadow-apple'
                    >
                      {isEdit ? (
                        <MapPin className='h-7 w-7 text-[var(--text-on-brand)]' />
                      ) : (
                        <Building2 className='h-7 w-7 text-[var(--text-on-brand)]' />
                      )}
                    </motion.div>
                    <div>
                      <DialogTitle className='text-title-1 font-semibold text-[var(--text-primary)]'>
                        {isEdit ? 'Modifica Sede' : 'Nuova Sede'}
                      </DialogTitle>
                      <DialogDescription className='text-body text-[var(--text-tertiary)] mt-1'>
                        {isEdit
                          ? 'Modifica i dati della sede esistente'
                          : 'Aggiungi una nuova sede alla tua rete'}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
              </div>

              {/* Form */}
              <div className='p-8 pt-4'>
                <LocationForm
                  onSubmit={handleSubmit}
                  onCancel={handleCancel}
                  initialData={initialData}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key='success'
              variants={successVariants}
              initial='hidden'
              animate='visible'
              className='bg-[var(--surface-secondary)]/95 backdrop-blur-2xl rounded-[28px] shadow-apple-xl border border-[var(--border-default)]/50 p-12 text-center'
            >
              {/* Success animation */}
              <motion.div variants={successItemVariants} className='relative mx-auto mb-8'>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 200,
                    damping: 15,
                    delay: 0.1,
                  }}
                  className='w-24 h-24 rounded-full bg-gradient-to-br from-apple-green to-[var(--status-success)] flex items-center justify-center mx-auto shadow-apple-lg'
                >
                  <CheckCircle2 className='h-12 w-12 text-[var(--text-on-brand)]' />
                </motion.div>

                {/* Confetti effect */}
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{
                      scale: 0,
                      x: 0,
                      y: 0,
                      opacity: 1,
                    }}
                    animate={{
                      scale: [0, 1, 0],
                      x: [0, (i % 2 === 0 ? 1 : -1) * (50 + Math.random() * 50)],
                      y: [0, -50 - Math.random() * 50],
                      opacity: [1, 1, 0],
                    }}
                    transition={{
                      duration: 1,
                      delay: 0.3 + i * 0.1,
                      ease: 'easeOut',
                    }}
                    className='absolute top-1/2 left-1/2 w-3 h-3 rounded-full'
                    style={{
                      backgroundColor: [
                        '#0071e3',
                        '#34c759',
                        '#ff9500',
                        '#af52de',
                        '#ff3b30',
                        '#5856d6',
                      ][i],
                    }}
                  />
                ))}
              </motion.div>

              <motion.h3
                variants={successItemVariants}
                className='text-title-1 font-semibold text-[var(--text-primary)] mb-2'
              >
                {isEdit ? 'Sede Aggiornata!' : 'Sede Creata!'}
              </motion.h3>

              <motion.p variants={successItemVariants} className='text-body text-[var(--text-tertiary)] mb-6'>
                La sede{' '}
                <span className='font-semibold text-[var(--text-primary)]'>{createdLocationName}</span> è stata{' '}
                {isEdit ? 'aggiornata' : 'creata'} con successo
              </motion.p>

              <motion.div
                variants={successItemVariants}
                className='flex items-center justify-center gap-3'
              >
                <AppleButton
                  variant='secondary'
                  onClick={() => {
                    setIsSuccess(false);
                    onOpenChange(false);
                    onSuccess?.();
                  }}
                >
                  Chiudi
                </AppleButton>
                <AppleButton icon={<ArrowRight className='h-4 w-4' />} iconPosition='right'>
                  Visualizza Sede
                </AppleButton>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

// Hook per usare il dialog
export function useLocationDialog() {
  const [open, setOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Partial<LocationFormData> | undefined>();

  return {
    isOpen: open,
    editingLocation,
    openDialog: (location?: Partial<LocationFormData>) => {
      setEditingLocation(location);
      setOpen(true);
    },
    closeDialog: () => {
      setOpen(false);
      setEditingLocation(undefined);
    },
    LocationDialog: (
      props: Omit<LocationDialogProps, 'open' | 'onOpenChange' | 'initialData' | 'mode'>
    ) => (
      <LocationDialog
        open={open}
        onOpenChange={setOpen}
        initialData={editingLocation}
        mode={editingLocation ? 'edit' : 'create'}
        {...props}
      />
    ),
  };
}
