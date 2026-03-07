/**
 * useProactiveAI Hook
 * Hook per integrare i suggerimenti AI proattivi nei form
 * 
 * Esempio d'uso:
 * ```tsx
 * const { suggestions, dismissSuggestion, refreshSuggestions } = useProactiveAI({
 *   formData,
 *   currentField,
 *   currentStep,
 *   fillField: (field, value) => setFormData(prev => ({ ...prev, [field]: value }))
 * });
 * ```
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  ProactiveAI,
  ProactiveContext,
  Suggestion,
  debounce,
  FillFieldFn,
} from '@/lib/ai/proactiveSuggestions';

interface UseProactiveAIOptions {
  /** Dati attuali del form */
  formData: Record<string, any>;
  /** Nome del campo attualmente focusato */
  currentField: string;
  /** Step attuale del form (per wizard multi-step) */
  currentStep?: number;
  /** Funzione per riempire un campo del form */
  fillField: FillFieldFn;
  /** Debounce delay in ms */
  debounceDelay?: number;
  /** Confidence minima per mostrare suggerimenti (0-1) */
  minConfidence?: number;
  /** Abilita/disabilita suggerimenti */
  enabled?: boolean;
  /** Callback quando viene generata una nuova suggestion */
  onSuggestionGenerated?: (suggestion: Suggestion) => void;
  /** Callback quando tutte le suggestion vengono dismissate */
  onAllDismissed?: () => void;
}

interface UseProactiveAIReturn {
  /** Lista delle suggestion attive */
  suggestions: Suggestion[];
  /** Dismissa una specifica suggestion */
  dismissSuggestion: (id: string) => void;
  /** Dismissa tutte le suggestion */
  dismissAll: () => void;
  /** Forza il refresh delle suggestion */
  refreshSuggestions: () => void;
  /** Stato di caricamento */
  isLoading: boolean;
  /** Numero di suggestion attive */
  count: number;
  /** Se ci sono suggestion da mostrare */
  hasSuggestions: boolean;
  /** Ultimo errore verificatosi */
  error: string | null;
}

/**
 * Hook principale per l'AI proattiva
 */
export const useProactiveAI = ({
  formData,
  currentField,
  currentStep = 0,
  fillField,
  debounceDelay = 800,
  minConfidence = 0.6,
  enabled = true,
  onSuggestionGenerated,
  onAllDismissed,
}: UseProactiveAIOptions): UseProactiveAIReturn => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Ref per tracciare se il componente è montato
  const isMounted = useRef(true);
  
  // Ref per tracciare field values precedenti
  const prevValues = useRef<Record<string, string>>({});
  
  // Istanzia ProactiveAI
  const ai = useMemo(() => new ProactiveAI(fillField), [fillField]);

  /**
   * Genera suggestion in modo debounced
   */
  const generateSuggestions = useCallback(
    async (context: ProactiveContext) => {
      if (!enabled) return;
      
      // Non generare se il valore non è cambiato
      const prevValue = prevValues.current[context.currentField];
      if (prevValue === context.currentValue) return;
      
      prevValues.current[context.currentField] = context.currentValue;

      setIsLoading(true);
      setError(null);

      try {
        const newSuggestions = await ai.generateSuggestions(context);
        
        if (isMounted.current) {
          // Filtra per confidence minima
          const filteredSuggestions = newSuggestions.filter(
            s => s.confidence >= minConfidence
          );

          setSuggestions(prev => {
            // Merge con suggestion esistenti, evitando duplicati
            const existingIds = new Set(prev.map(s => s.id));
            const uniqueNewSuggestions = filteredSuggestions.filter(
              s => !existingIds.has(s.id)
            );
            
            // Chiama callback per ogni nuova suggestion
            uniqueNewSuggestions.forEach(s => {
              onSuggestionGenerated?.(s);
            });
            
            return [...prev, ...uniqueNewSuggestions];
          });
        }
      } catch (err) {
        console.error('Error generating suggestions:', err);
        if (isMounted.current) {
          setError('Errore nella generazione dei suggerimenti');
        }
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    },
    [ai, enabled, minConfidence, onSuggestionGenerated]
  );

  /**
   * Debounced version della generazione
   */
  const debouncedGenerate = useMemo(
    () => debounce(generateSuggestions, debounceDelay),
    [generateSuggestions, debounceDelay]
  );

  /**
   * Effect per generare suggestion quando cambiano i dati
   */
  useEffect(() => {
    const currentValue = formData[currentField] || '';
    
    // Solo se il campo ha un valore significativo
    if (currentValue.length < 2) return;

    debouncedGenerate({
      currentField,
      currentValue: String(currentValue),
      formData,
      step: currentStep,
    });
  }, [formData, currentField, currentStep, debouncedGenerate]);

  /**
   * Cleanup al mount/unmount
   */
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  /**
   * Dismissa una specifica suggestion
   */
  const dismissSuggestion = useCallback((id: string) => {
    ai.dismissSuggestion(id);
    setSuggestions(prev => {
      const newSuggestions = prev.filter(s => s.id !== id);
      if (newSuggestions.length === 0 && prev.length > 0) {
        onAllDismissed?.();
      }
      return newSuggestions;
    });
  }, [ai, onAllDismissed]);

  /**
   * Dismissa tutte le suggestion
   */
  const dismissAll = useCallback(() => {
    suggestions.forEach(s => ai.dismissSuggestion(s.id));
    setSuggestions([]);
    onAllDismissed?.();
  }, [suggestions, ai, onAllDismissed]);

  /**
   * Forza il refresh delle suggestion
   */
  const refreshSuggestions = useCallback(() => {
    const currentValue = formData[currentField] || '';
    
    if (currentValue.length < 2) return;

    generateSuggestions({
      currentField,
      currentValue: String(currentValue),
      formData,
      step: currentStep,
    });
  }, [formData, currentField, currentStep, generateSuggestions]);

  return {
    suggestions,
    dismissSuggestion,
    dismissAll,
    refreshSuggestions,
    isLoading,
    count: suggestions.length,
    hasSuggestions: suggestions.length > 0,
    error,
  };
};

/**
 * Hook semplificato per form singolo campo
 */
export const useFieldSuggestion = (
  fieldName: string,
  fieldValue: string,
  formData: Record<string, any>,
  fillField: FillFieldFn
) => {
  const { suggestions, dismissSuggestion, isLoading } = useProactiveAI({
    formData,
    currentField: fieldName,
    fillField,
  });

  // Restituisci solo suggestion rilevanti per questo campo
  const fieldSuggestions = useMemo(
    () => suggestions.filter(s => s.field === fieldName || !s.field),
    [suggestions, fieldName]
  );

  return {
    suggestions: fieldSuggestions,
    dismissSuggestion,
    isLoading,
    hasSuggestion: fieldSuggestions.length > 0,
  };
};

/**
 * Hook per tracciare il campo attivo
 */
export const useActiveField = () => {
  const [activeField, setActiveField] = useState<string>('');

  const onFocus = useCallback((fieldName: string) => {
    setActiveField(fieldName);
  }, []);

  const onBlur = useCallback(() => {
    // Mantieni l'ultimo campo attivo per un po'
    // utile per generare suggestion dopo che l'utente ha finito di scrivere
  }, []);

  return {
    activeField,
    onFocus,
    onBlur,
    fieldProps: (fieldName: string) => ({
      onFocus: () => onFocus(fieldName),
      onBlur,
    }),
  };
};

export default useProactiveAI;
