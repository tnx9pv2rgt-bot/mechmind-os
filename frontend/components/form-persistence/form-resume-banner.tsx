'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, X, Save, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UseFormPersistenceReturn } from '@/hooks/form-persistence';

interface FormResumeBannerProps extends Partial<UseFormPersistenceReturn> {
  /** Titolo personalizzato */
  title?: string;
  /** Messaggio personalizzato */
  message?: string;
  /** Callback quando si ripristina */
  onResume?: () => void;
  /** Callback quando si cancella */
  onClear?: () => void;
  /** Classe CSS aggiuntiva */
  className?: string;
}

/**
 * Banner che mostra il ripristino del form in sospeso.
 * Appare in alto quando l'utente ha dati salvati.
 */
export function FormResumeBanner({
  hasRestorableData,
  daysSinceSave,
  lastSavedText,
  restoreForm,
  clearSavedData,
  title = 'Hai una registrazione in sospeso',
  message,
  onResume,
  onClear,
  className = '',
}: FormResumeBannerProps) {
  const handleResume = (): void => {
    restoreForm?.();
    onResume?.();
  };

  const handleClear = (): void => {
    clearSavedData?.();
    onClear?.();
  };

  if (!hasRestorableData) return null;

  const defaultMessage = daysSinceSave && daysSinceSave > 0
    ? `Hai iniziato una registrazione ${daysSinceSave} giorn${daysSinceSave === 1 ? 'o' : 'i'} fa. Vuoi riprenderla?`
    : 'Hai una registrazione in corso. Vuoi riprenderla da dove l\'hai lasciata?';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`bg-gradient-to-r from-[var(--status-warning)]/5 to-[var(--status-warning)]/5 border-b border-[var(--status-warning)]/30 px-4 py-3 ${className}`}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--status-warning)]/10 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-[var(--status-warning)]" />
            </div>
            <div>
              <h3 className="font-medium text-[var(--status-warning)]">{title}</h3>
              <p className="text-sm text-[var(--status-warning)]">
                {message || defaultMessage}
                {lastSavedText && (
                  <span className="ml-1 text-[var(--status-warning)]">({lastSavedText})</span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="text-[var(--status-warning)] hover:text-[var(--status-warning)] hover:bg-[var(--status-warning)]/10"
            >
              <X className="w-4 h-4 mr-1" />
              Cancella
            </Button>
            <Button
              size="sm"
              onClick={handleResume}
              className="bg-[var(--status-warning)] hover:bg-[var(--status-warning)] text-[var(--text-on-brand)]"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Riprendi
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Compact version del banner per form embedded.
 */
export function FormResumeBannerCompact(props: FormResumeBannerProps) {
  return (
    <FormResumeBanner
      {...props}
      className={`${props.className} py-2`}
    />
  );
}

/**
 * Toast notification per il salvataggio automatico.
 */
interface AutoSaveIndicatorProps {
  lastSavedText: string;
  isSaving?: boolean;
}

export function AutoSaveIndicator({ lastSavedText, isSaving }: AutoSaveIndicatorProps) {
  if (!lastSavedText && !isSaving) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2 text-sm text-[var(--text-tertiary)]"
    >
      {isSaving ? (
        <>
          <div className="w-3 h-3 border-2 border-[var(--border-default)] border-t-blue-500 rounded-full animate-spin" />
          <span>Salvataggio...</span>
        </>
      ) : (
        <>
          <Save className="w-3 h-3" />
          <span>{lastSavedText}</span>
        </>
      )}
    </motion.div>
  );
}

export default FormResumeBanner;
