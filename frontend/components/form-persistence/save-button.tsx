'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Save, Check, Clock, ArrowRight } from 'lucide-react';
import { Button, ButtonProps } from '@/components/ui/button';
import { useFormSaveButton, UseFormPersistenceReturn } from '@/hooks/form-persistence';

// ============================================================================
// TYPES
// ============================================================================

interface SaveButtonProps extends Omit<ButtonProps, 'onClick'> {
  /** Persistence hook return */
  persistence: UseFormPersistenceReturn;
  /** Variante del pulsante */
  variant?: 'default' | 'outline' | 'ghost';
  /** Se mostrare l'icona di check dopo il salvataggio */
  showSuccessIcon?: boolean;
  /** Durata dell'icona di successo in ms */
  successDuration?: number;
  /** Testo del pulsante */
  children?: React.ReactNode;
  /** Callback quando il salvataggio è completo */
  onSaveComplete?: () => void;
}

interface SaveAndContinueButtonProps extends Omit<ButtonProps, 'onClick'> {
  /** Persistence hook return */
  persistence: UseFormPersistenceReturn;
  /** Callback quando l'utente clicca */
  onContinue: () => void;
  /** Testo del pulsante */
  children?: React.ReactNode;
  /** Se mostrare il toast di conferma */
  showConfirmation?: boolean;
  /** Messaggio di conferma */
  confirmationMessage?: string;
}

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * Pulsante per salvare manualmente il form.
 * Mostra un'icona di check dopo il salvataggio.
 */
export function SaveButton({
  persistence,
  variant = 'outline',
  showSuccessIcon = true,
  successDuration = 2000,
  children = 'Salva',
  onSaveComplete,
  className = '',
  disabled,
  ...props
}: SaveButtonProps) {
  const saveButton = useFormSaveButton({
    persistence,
    onSaveComplete,
  });

  const handleClick = async (): Promise<void> => {
    await saveButton.handleSave();
    
    // Reset dopo la durata configurata
    if (showSuccessIcon) {
      setTimeout(() => {
        saveButton.reset();
      }, successDuration);
    }
  };

  return (
    <Button
      variant={variant}
      onClick={handleClick}
      disabled={saveButton.isSaving || disabled}
      className={`relative ${className}`}
      {...props}
    >
      <AnimatePresence mode="wait">
        {saveButton.isSaving ? (
          <motion.span
            key="saving"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center"
          >
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
            Salvataggio...
          </motion.span>
        ) : saveButton.isSaved && showSuccessIcon ? (
          <motion.span
            key="saved"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="flex items-center text-green-600"
          >
            <Check className="w-4 h-4 mr-2" />
            Salvato
          </motion.span>
        ) : (
          <motion.span
            key="default"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </Button>
  );
}

/**
 * Pulsante "Salva e continua dopo".
 * Salva il form e poi esegue l'azione specificata (es. navigazione).
 */
export function SaveAndContinueButton({
  persistence,
  onContinue,
  children = 'Salva e continua dopo',
  showConfirmation = true,
  confirmationMessage = 'I tuoi dati sono stati salvati. Puoi tornare a completare il form quando vuoi.',
  className = '',
  variant = 'ghost',
  ...props
}: SaveAndContinueButtonProps) {
  const saveButton = useFormSaveButton({
    persistence,
    showConfirmation,
    confirmationMessage,
    onSaveAndContinueLater: onContinue,
  });

  return (
    <Button
      variant={variant}
      onClick={saveButton.handleSaveAndContinue}
      disabled={saveButton.isSaving}
      className={`group ${className}`}
      {...props}
    >
      {saveButton.isSaving ? (
        <>
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
          Salvataggio...
        </>
      ) : (
        <>
          <Clock className="w-4 h-4 mr-2 group-hover:animate-pulse" />
          {children}
          <ArrowRight className="w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </>
      )}
    </Button>
  );
}

/**
 * Gruppo di pulsanti per le azioni di salvataggio.
 */
interface SaveButtonGroupProps {
  persistence: UseFormPersistenceReturn;
  onSaveComplete?: () => void;
  onSaveAndContinue?: () => void;
  /** Se mostrare il pulsante "Salva e continua dopo" */
  showContinueLater?: boolean;
  /** Testo del pulsante salva */
  saveText?: string;
  /** Testo del pulsante continua dopo */
  continueText?: string;
  /** Classe CSS aggiuntiva */
  className?: string;
}

export function SaveButtonGroup({
  persistence,
  onSaveComplete,
  onSaveAndContinue,
  showContinueLater = true,
  saveText = 'Salva',
  continueText = 'Salva e continua dopo',
  className = '',
}: SaveButtonGroupProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <SaveButton
        persistence={persistence}
        onSaveComplete={onSaveComplete}
      >
        {saveText}
      </SaveButton>
      
      {showContinueLater && onSaveAndContinue && (
        <SaveAndContinueButton
          persistence={persistence}
          onContinue={onSaveAndContinue}
        >
          {continueText}
        </SaveAndContinueButton>
      )}
    </div>
  );
}

export default SaveButton;
