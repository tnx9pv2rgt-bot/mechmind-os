'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Save, X, ArrowRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UseExitIntentReturn } from '@/hooks/form-persistence';

interface ExitIntentModalProps {
  /** Exit intent hook return */
  exitIntent: UseExitIntentReturn;
  /** Se mostrare il modal */
  isOpen: boolean;
  /** Callback per chiudere il modal */
  onClose: () => void;
  /** Titolo personalizzato */
  title?: string;
  /** Sottotitolo personalizzato */
  subtitle?: string;
  /** Testo del pulsante "Completa ora" */
  completeButtonText?: string;
  /** Testo del pulsante "Salva per dopo" */
  saveButtonText?: string;
  /** Callback quando l'utente sceglie "Completa ora" */
  onCompleteNow?: () => void;
  /** Callback quando l'utente sceglie "Salva per dopo" */
  onSaveForLater?: () => void;
  /** Se mostrare il tempo rimanente */
  showExpiryInfo?: boolean;
  /** Giorni prima della scadenza */
  daysUntilExpiry?: number;
}

/**
 * Modal che appare quando l'utente sta per abbandonare la pagina.
 * Offre opzioni per completare ora o salvare per dopo.
 */
export function ExitIntentModal({
  exitIntent,
  isOpen,
  onClose,
  title = 'Aspetta! Stavi completando la registrazione.',
  subtitle = 'I tuoi dati sono al sicuro, puoi tornare a completarla quando vuoi.',
  completeButtonText = 'Completa ora',
  saveButtonText = 'Salva per dopo',
  onCompleteNow,
  onSaveForLater,
  showExpiryInfo = true,
  daysUntilExpiry = 7,
}: ExitIntentModalProps) {
  const handleCompleteNow = (): void => {
    onCompleteNow?.();
    exitIntent.reset();
    onClose();
  };

  const handleSaveForLater = (): void => {
    onSaveForLater?.();
    exitIntent.reset();
    onClose();
  };

  const handleClose = (): void => {
    exitIntent.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 bg-transparent shadow-2xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl overflow-hidden"
        >
          {/* Header con gradiente */}
          <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-6 text-white">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <DialogHeader className="space-y-1">
                    <DialogTitle className="text-xl font-semibold text-white">
                      {title}
                    </DialogTitle>
                  </DialogHeader>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="text-white/80 hover:text-white hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            <DialogDescription className="text-gray-600 text-base">
              {subtitle}
            </DialogDescription>

            {showExpiryInfo && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl text-sm text-blue-700">
                <Clock className="w-4 h-4 flex-shrink-0" />
                <span>
                  I tuoi dati rimarranno salvati per <strong>{daysUntilExpiry} giorni</strong>. 
                  Puoi tornare in qualsiasi momento per completare la registrazione.
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <Button
                onClick={handleCompleteNow}
                className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                {completeButtonText}
              </Button>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleSaveForLater}
                  className="flex-1 h-11"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saveButtonText}
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleClose}
                  className="h-11 px-4"
                >
                  Chiudi
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Versione semplificata del modal per uso inline.
 */
interface ExitIntentInlineProps {
  isVisible: boolean;
  onComplete: () => void;
  onSave: () => void;
  onDismiss: () => void;
}

export function ExitIntentInline({
  isVisible,
  onComplete,
  onSave,
  onDismiss,
}: ExitIntentInlineProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-4 right-4 z-50 max-w-sm"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Stai lasciando la pagina?</h4>
                <p className="text-sm text-gray-500 mt-1">
                  I tuoi dati sono stati salvati automaticamente.
                </p>
              </div>
              <button
                onClick={onDismiss}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={onComplete}
                className="flex-1 bg-amber-500 hover:bg-amber-600"
              >
                Completa
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onSave}
              >
                Salva
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ExitIntentModal;
