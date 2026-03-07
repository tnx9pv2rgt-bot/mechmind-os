'use client';

import { useCallback, useState } from 'react';
import { UseFormPersistenceReturn } from './useFormPersistence';

// ============================================================================
// TYPES
// ============================================================================

export interface UseFormSaveButtonOptions {
  /** Persistence hook return */
  persistence: UseFormPersistenceReturn;
  /** Callback quando il salvataggio è completo */
  onSaveComplete?: () => void;
  /** Callback quando l'utente vuole continuare dopo */
  onSaveAndContinueLater?: () => void;
  /** Messaggio di conferma */
  confirmationMessage?: string;
  /** Se mostrare il toast di conferma */
  showConfirmation?: boolean;
}

export interface UseFormSaveButtonReturn {
  /** Se sta salvando */
  isSaving: boolean;
  /** Se il salvataggio è completo */
  isSaved: boolean;
  /** Salva il form */
  handleSave: () => Promise<void>;
  /** Salva e continua dopo */
  handleSaveAndContinue: () => void;
  /** Resetta lo stato */
  reset: () => void;
  /** Timestamp dell'ultimo salvataggio */
  lastSavedAt: Date | null;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook per gestire il pulsante "Salva e continua dopo".
 * 
 * @example
 * ```tsx
 * function MyForm() {
 *   const persistence = useFormPersistence(form, { formId: 'my-form' });
 *   const saveButton = useFormSaveButton({
 *     persistence,
 *     onSaveComplete: () => toast.success('Salvato!'),
 *     onSaveAndContinueLater: () => router.push('/dashboard'),
 *   });
 *   
 *   return (
 *     <div className="flex gap-2">
 *       <Button onClick={saveButton.handleSave} disabled={saveButton.isSaving}>
 *         {saveButton.isSaving ? 'Salvataggio...' : 'Salva'}
 *       </Button>
 *       <Button variant="outline" onClick={saveButton.handleSaveAndContinue}>
 *         Salva e continua dopo
 *       </Button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useFormSaveButton(
  options: UseFormSaveButtonOptions
): UseFormSaveButtonReturn {
  const {
    persistence,
    onSaveComplete,
    onSaveAndContinueLater,
    confirmationMessage = 'I tuoi dati sono stati salvati. Puoi tornare a completare il form quando vuoi.',
    showConfirmation = true,
  } = options;

  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  /**
   * Salva il form manualmente.
   */
  const handleSave = useCallback(async (): Promise<void> => {
    setIsSaving(true);

    try {
      // Forza il salvataggio
      persistence.forceSave();

      // Attendi un momento per assicurarsi che il salvataggio sia completato
      await new Promise(resolve => setTimeout(resolve, 500));

      setIsSaved(true);
      setLastSavedAt(new Date());
      onSaveComplete?.();
    } catch (error) {
      console.error('[useFormSaveButton] Error saving:', error);
    } finally {
      setIsSaving(false);
    }
  }, [persistence, onSaveComplete]);

  /**
   * Salva e continua dopo (es: torna alla dashboard).
   */
  const handleSaveAndContinue = useCallback((): void => {
    handleSave().then(() => {
      if (showConfirmation) {
        // Qui potresti mostrare un toast o un modal
        console.log(confirmationMessage);
      }
      onSaveAndContinueLater?.();
    });
  }, [handleSave, showConfirmation, confirmationMessage, onSaveAndContinueLater]);

  /**
   * Resetta lo stato del pulsante.
   */
  const reset = useCallback((): void => {
    setIsSaving(false);
    setIsSaved(false);
    setLastSavedAt(null);
  }, []);

  return {
    isSaving,
    isSaved,
    handleSave,
    handleSaveAndContinue,
    reset,
    lastSavedAt,
  };
}

export default useFormSaveButton;
