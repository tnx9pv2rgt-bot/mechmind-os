/**
 * useConditionalFlow Hook
 * 
 * Hook per gestire form dinamici con logica condizionale tipo Typeform.
 * Supporta branching, skip logic, time estimation e URL sync.
 */

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  FormAnswers,
  FormFlowConfig,
  UseConditionalFlowOptions,
  UseConditionalFlowReturn,
  URLSyncOptions,
} from '@/lib/formFlow/types';
import {
  formFlowConfig as defaultConfig,
  calculateSteps,
  calculateTime,
  calculateProgress,
  getPreviousValidStep,
  getNextValidStep,
  validateStep,
} from '@/lib/formFlow/conditionalLogic';
import {
  syncWithURL,
  getStepFromURL,
  createPopStateHandler,
  parseAnswersFromURL,
} from '@/lib/formFlow/urlSync';
import {
  debounce,
  mergeAnswers,
  haveAnswersChanged,
  generateSessionId,
  saveFormState,
  loadFormState,
  clearFormState,
  getOptimizedStepId,
} from '@/lib/formFlow/utils';

const DEFAULT_URL_SYNC: URLSyncOptions = {
  enabled: true,
  paramName: 'step',
  useHash: false,
  replace: true,
};

/**
 * Hook principale per il conditional form flow
 */
export function useConditionalFlow(
  options: UseConditionalFlowOptions = {}
): UseConditionalFlowReturn {
  const {
    initialAnswers = {},
    config = defaultConfig,
    urlSync: urlSyncOptions,
    onStepChange,
    onAnswersChange,
    onComplete,
  } = options;

  // Merge URL sync options
  const urlSync = useMemo(
    () => ({ ...DEFAULT_URL_SYNC, ...urlSyncOptions }),
    [urlSyncOptions]
  );

  // Session ID per persistence
  const sessionIdRef = useRef<string>(generateSessionId());

  // Stato iniziale
  const [answers, setAnswers] = useState<FormAnswers>(() => {
    // Prova a caricare da URL prima
    const urlAnswers = parseAnswersFromURL();
    return { ...initialAnswers, ...urlAnswers };
  });

  // Calcola step attivi in base alle risposte
  const activeSteps = useMemo(() => calculateSteps(answers, config), [answers, config]);

  // Stato dello step corrente
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(() => {
    // Prova a leggere dallo stato salvato o dall'URL
    const savedState = loadFormState(sessionIdRef.current);
    const urlStep = getStepFromURL(urlSync);
    
    if (savedState) {
      return Math.min(savedState.stepIndex, activeSteps.length - 1);
    }
    
    return Math.min(urlStep, activeSteps.length - 1);
  });

  // Storico degli step visitati
  const [visitedSteps, setVisitedSteps] = useState<string[]>(() => {
    const savedState = loadFormState(sessionIdRef.current);
    if (savedState) {
      return activeSteps.slice(0, savedState.stepIndex + 1);
    }
    return activeSteps.length > 0 ? [activeSteps[0]] : [];
  });

  // Ref per tracciare se è il primo render
  const isFirstRender = useRef(true);

  // Calcola valori derivati
  const currentStepId = activeSteps[currentStepIndex] || '';
  const estimatedTime = useMemo(
    () => calculateTime(activeSteps, currentStepIndex, config.stepTiming),
    [activeSteps, currentStepIndex, config.stepTiming]
  );
  const progress = useMemo(
    () => calculateProgress(currentStepIndex, activeSteps.length),
    [currentStepIndex, activeSteps.length]
  );

  // Flag di navigazione
  const canGoBack = currentStepIndex > 0;
  const canGoNext = currentStepIndex < activeSteps.length - 1 && validateStep(currentStepId, answers);
  const isLastStep = currentStepIndex === activeSteps.length - 1;
  const isFirstStep = currentStepIndex === 0;

  // Salva stato quando cambia
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    saveFormState(sessionIdRef.current, {
      stepIndex: currentStepIndex,
      answers,
    });
  }, [currentStepIndex, answers]);

  // URL Sync
  useEffect(() => {
    if (urlSync.enabled) {
      syncWithURL(currentStepIndex, urlSync);
    }
  }, [currentStepIndex, urlSync]);

  // Gestisci popstate per back/forward browser
  useEffect(() => {
    if (!urlSync.enabled) return;

    const cleanup = createPopStateHandler((stepIndex) => {
      if (stepIndex >= 0 && stepIndex < activeSteps.length) {
        setCurrentStepIndex(stepIndex);
      }
    }, urlSync);

    return cleanup;
  }, [activeSteps.length, urlSync]);

  // Callback quando cambia lo step
  useEffect(() => {
    onStepChange?.(currentStepIndex, currentStepId);
  }, [currentStepIndex, currentStepId, onStepChange]);

  // Vai allo step successivo
  const goToNext = useCallback(() => {
    if (isLastStep) return;

    // Valida lo step corrente prima di procedere
    if (!validateStep(currentStepId, answers)) {
      console.warn(`Validation failed for step: ${currentStepId}`);
      return;
    }

    const nextIndex = getNextValidStep(currentStepIndex, activeSteps, answers, config);
    
    setCurrentStepIndex(nextIndex);
    setVisitedSteps((prev) => {
      const nextStepId = activeSteps[nextIndex];
      if (!prev.includes(nextStepId)) {
        return [...prev, nextStepId];
      }
      return prev;
    });
  }, [currentStepIndex, currentStepId, activeSteps, answers, config, isLastStep]);

  // Vai allo step precedente
  const goToPrevious = useCallback(() => {
    if (isFirstStep) return;

    const prevIndex = getPreviousValidStep(currentStepIndex, activeSteps, answers, config);
    setCurrentStepIndex(prevIndex);
  }, [currentStepIndex, activeSteps, answers, config, isFirstStep]);

  // Vai a uno specifico step
  const goToStep = useCallback(
    (stepIndex: number) => {
      if (stepIndex >= 0 && stepIndex < activeSteps.length) {
        // Verifica che tutti gli step precedenti siano validi
        for (let i = 0; i < stepIndex; i++) {
          if (!validateStep(activeSteps[i], answers)) {
            console.warn(`Cannot navigate to step ${stepIndex}: step ${i} is invalid`);
            return;
          }
        }

        setCurrentStepIndex(stepIndex);
        setVisitedSteps((prev) => {
          const targetStepId = activeSteps[stepIndex];
          if (!prev.includes(targetStepId)) {
            return [...prev, targetStepId];
          }
          return prev;
        });
      }
    },
    [activeSteps, answers]
  );

  // Aggiorna le risposte (con debounce per performance)
  const updateAnswers = useCallback(
    debounce((updates: Partial<FormAnswers>) => {
      setAnswers((prev) => {
        const merged = mergeAnswers(prev, updates);
        
        if (haveAnswersChanged(prev, merged)) {
          onAnswersChange?.(merged);
        }
        
        return merged;
      });
    }, 100),
    [onAnswersChange]
  );

  // Aggiornamento immediato delle risposte (senza debounce)
  const updateAnswersImmediate = useCallback(
    (updates: Partial<FormAnswers>) => {
      setAnswers((prev) => {
        const merged = mergeAnswers(prev, updates);
        
        if (haveAnswersChanged(prev, merged)) {
          onAnswersChange?.(merged);
        }
        
        return merged;
      });
    },
    [onAnswersChange]
  );

  // Salta uno step specifico
  const skipStep = useCallback(
    (stepId: string) => {
      const stepIndex = activeSteps.indexOf(stepId);
      if (stepIndex === -1) return;

      if (stepIndex === currentStepIndex) {
        // Se stiamo saltando lo step corrente, vai al prossimo
        goToNext();
      }
    },
    [activeSteps, currentStepIndex, goToNext]
  );

  // Resetta il form
  const reset = useCallback(() => {
    setAnswers(initialAnswers);
    setCurrentStepIndex(0);
    setVisitedSteps(activeSteps.length > 0 ? [activeSteps[0]] : []);
    clearFormState(sessionIdRef.current);
    sessionIdRef.current = generateSessionId();
  }, [initialAnswers, activeSteps]);

  // Completa il form
  const complete = useCallback(() => {
    if (!isLastStep) {
      console.warn('Cannot complete: not on last step');
      return;
    }

    // Valida tutti gli step
    const allValid = activeSteps.every((step) => validateStep(step, answers));
    if (!allValid) {
      console.warn('Cannot complete: some steps are invalid');
      return;
    }

    onComplete?.(answers);
    clearFormState(sessionIdRef.current);
  }, [isLastStep, activeSteps, answers, onComplete]);

  // Ottieni componente ottimizzato per dispositivo
  const getStepComponent = useCallback(
    (stepId: string) => getOptimizedStepId(stepId),
    []
  );

  return {
    // State
    activeSteps,
    currentStepIndex,
    currentStepId,
    estimatedTime,
    progress,
    canGoBack,
    canGoNext,
    isLastStep,
    isFirstStep,
    visitedSteps,
    answers,

    // Actions
    goToNext,
    goToPrevious,
    goToStep,
    updateAnswers,
    updateAnswersImmediate,
    skipStep,
    reset,
    complete,

    // Utility
    getStepComponent,
  };
}

export default useConditionalFlow;
