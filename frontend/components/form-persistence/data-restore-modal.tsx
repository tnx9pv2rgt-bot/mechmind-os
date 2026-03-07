'use client';

import { motion } from 'framer-motion';
import { RotateCcw, Clock, Trash2, X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UseFormPersistenceReturn } from '@/hooks/form-persistence';

interface DataRestoreModalProps extends Partial<UseFormPersistenceReturn> {
  /** Titolo personalizzato */
  title?: string;
  /** Callback quando si ripristina */
  onRestoreConfirm?: () => void;
  /** Callback quando si cancella */
  onClearConfirm?: () => void;
}

/**
 * Modal che appare quando l'utente torna dopo giorni
 * e chiede se vuole recuperare i dati salvati.
 */
export function DataRestoreModal({
  showRestoreModal,
  daysSinceSave,
  lastSavedText,
  restoreForm,
  clearSavedData,
  dismissRestoreModal,
  title = 'Recupera i tuoi dati',
  onRestoreConfirm,
  onClearConfirm,
}: DataRestoreModalProps) {
  const handleRestore = (): void => {
    restoreForm?.();
    onRestoreConfirm?.();
  };

  const handleClear = (): void => {
    clearSavedData?.();
    onClearConfirm?.();
  };

  const handleClose = (): void => {
    dismissRestoreModal?.();
  };

  if (!showRestoreModal) return null;

  const getTimeMessage = (): string => {
    if (daysSinceSave === 0) return 'Oggi';
    if (daysSinceSave === 1) return 'Ieri';
    if (daysSinceSave < 7) return `${daysSinceSave} giorni fa`;
    return 'Più di una settimana fa';
  };

  return (
    <Dialog open={showRestoreModal} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 bg-transparent shadow-2xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-br from-green-500 to-emerald-500 p-6 text-white">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Save className="w-6 h-6" />
                </div>
                <DialogHeader className="space-y-1">
                  <DialogTitle className="text-xl font-semibold text-white">
                    {title}
                  </DialogTitle>
                </DialogHeader>
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
              Abbiamo trovato una registrazione iniziata in precedenza. 
              Vuoi recuperare i dati e continuare da dove avevi lasciato?
            </DialogDescription>

            {/* Info salvataggio */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Ultimo salvataggio</p>
                  <p className="text-2xl font-bold text-green-600">{getTimeMessage()}</p>
                  {lastSavedText && (
                    <p className="text-sm text-gray-500">{lastSavedText}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Info scadenza */}
            <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl text-sm text-amber-700">
              <div className="w-5 h-5 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold">i</span>
              </div>
              <span>
                I dati rimarranno disponibili per 7 giorni dal salvataggio. 
                Passata questa data, verranno eliminati automaticamente.
              </span>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button
                onClick={handleRestore}
                className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Sì, recupera i miei dati
              </Button>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleClear}
                  className="flex-1 h-11 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  No, cancella tutto
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleClose}
                  className="h-11 px-4"
                >
                  Più tardi
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
 * Versione compatta del modal per inline usage.
 */
interface DataRestorePromptProps {
  isVisible: boolean;
  daysSinceSave: number;
  onRestore: () => void;
  onDismiss: () => void;
  onClear: () => void;
}

export function DataRestorePrompt({
  isVisible,
  daysSinceSave,
  onRestore,
  onDismiss,
  onClear,
}: DataRestorePromptProps) {
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-[calc(100%-2rem)]"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <RotateCcw className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900">Recupera i tuoi dati?</h4>
            <p className="text-sm text-gray-500 mt-1">
              Trovata registrazione iniziata {daysSinceSave > 0 ? `${daysSinceSave} giorni fa` : 'oggi'}.
            </p>
            <div className="flex gap-2 mt-4">
              <Button size="sm" onClick={onRestore} className="flex-1 bg-green-500 hover:bg-green-600">
                Recupera
              </Button>
              <Button size="sm" variant="outline" onClick={onDismiss}>
                Ignora
              </Button>
              <Button size="sm" variant="ghost" onClick={onClear} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default DataRestoreModal;
