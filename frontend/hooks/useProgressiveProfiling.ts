'use client';

/**
 * useProgressiveProfiling Hook
 * Hook per la gestione della profilazione progressiva dei clienti
 * Design: Apple 2026 Liquid Glass
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  ProfilingStage,
  ProfilingStageId,
  CustomerProfile,
  ProfilingState,
  UserContext,
} from '@/lib/profiling/types';
import { prioritizeFields, calculateFieldImportance } from '@/lib/profiling/prioritization';

// Definizione degli stage di profilazione
export const PROFILING_STAGES: Record<ProfilingStageId, ProfilingStage> = {
  onboarding: {
    id: 'onboarding',
    fields: ['email', 'password', 'firstName', 'lastName'],
    required: true,
    incentive: null,
    trigger: 'signup',
    description: 'Dati base per la registrazione',
  },
  week1: {
    id: 'week1',
    fields: ['companyName', 'vat', 'fiscalCode'],
    required: false,
    incentive: '10% sconto sul prossimo ordine',
    trigger: '7_days_after_signup',
    description: 'Dati aziendali di base',
  },
  week2: {
    id: 'week2',
    fields: [
      'address.street',
      'address.city',
      'address.zipCode',
      'address.province',
      'phone',
      'pec',
      'sdi',
    ],
    required: false,
    incentive: 'Spedizione gratuita',
    trigger: '14_days_after_signup',
    description: 'Dati di contatto e fatturazione',
  },
  month1: {
    id: 'month1',
    fields: ['marketingPrefs.email', 'marketingPrefs.sms', 'industry', 'companySize'],
    required: false,
    incentive: 'Ebook esclusivo: Guida alla manutenzione',
    trigger: '30_days_after_signup',
    description: 'Preferenze marketing e profilazione',
  },
  complete: {
    id: 'complete',
    fields: [],
    required: false,
    incentive: null,
    trigger: 'profile_complete',
    description: 'Profilo completato',
  },
};

// Campi totali nel profilo
const ALL_PROFILE_FIELDS = Object.values(PROFILING_STAGES).flatMap(s => s.fields);

export interface UseProgressiveProfilingOptions {
  customerId: string;
  autoFetch?: boolean;
  userContext?: UserContext;
}

export interface UseProgressiveProfilingReturn extends ProfilingState {
  // Metodi
  checkMissingFields: () => Promise<void>;
  updateProfile: (fieldUpdates: Partial<CustomerProfile>) => Promise<boolean>;
  completeStage: (stage: ProfilingStageId) => Promise<boolean>;
  getNextField: () => string | null;
  getStageIncentive: (stage?: ProfilingStageId) => string | null;

  // Computed
  totalFields: number;
  completedFields: number;
  isOnboardingComplete: boolean;
  canAccessStage: (stage: ProfilingStageId) => boolean;
}

export function useProgressiveProfiling(
  options: UseProgressiveProfilingOptions
): UseProgressiveProfilingReturn {
  const { customerId, autoFetch = true, userContext } = options;

  // State
  const [profile, setProfile] = useState<CustomerProfile>({});
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [currentStage, setCurrentStage] = useState<ProfilingStageId>('onboarding');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calcola la percentuale di completamento
  const completionPercentage = useMemo(() => {
    const completed = ALL_PROFILE_FIELDS.filter(field => {
      const value = getNestedValue(profile as unknown as Record<string, unknown>, field);
      return value !== undefined && value !== null && value !== '';
    }).length;

    return ALL_PROFILE_FIELDS.length > 0
      ? Math.round((completed / ALL_PROFILE_FIELDS.length) * 100)
      : 0;
  }, [profile]);

  // Computed values
  const totalFields = ALL_PROFILE_FIELDS.length;
  const completedFields = Math.round((completionPercentage / 100) * totalFields);
  const isOnboardingComplete = useMemo(() => {
    return PROFILING_STAGES.onboarding.fields.every(field => {
      const value = getNestedValue(profile as unknown as Record<string, unknown>, field);
      return value !== undefined && value !== null && value !== '';
    });
  }, [profile]);

  /**
   * Ottiene un valore annidato da un oggetto usando dot notation
   */
  function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce<unknown>((acc, part) => {
      if (acc && typeof acc === 'object') {
        return (acc as Record<string, unknown>)[part];
      }
      return undefined;
    }, obj);
  }

  /**
   * Verifica quali campi mancano nel profilo
   */
  const checkMissingFields = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/customers/${customerId}/profile`);
      if (!response.ok) throw new Error(`Profile fetch failed: ${response.status}`);
      const profileData: CustomerProfile = await response.json();

      setProfile(profileData);

      // Calcola campi mancanti
      const missing = ALL_PROFILE_FIELDS.filter(field => {
        const value = getNestedValue(profileData as unknown as Record<string, unknown>, field);
        return value === undefined || value === null || value === '';
      });

      const prioritizedMissing = prioritizeFields(missing, userContext);
      setMissingFields(prioritizedMissing);

      // Determina lo stage corrente
      const completedCount = ALL_PROFILE_FIELDS.length - missing.length;

      if (completedCount <= 2) {
        setCurrentStage('onboarding');
      } else if (completedCount <= 5) {
        setCurrentStage('week1');
      } else if (completedCount <= 12) {
        setCurrentStage('week2');
      } else if (completedCount < ALL_PROFILE_FIELDS.length) {
        setCurrentStage('month1');
      } else {
        setCurrentStage('complete');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante il caricamento del profilo');
    } finally {
      setIsLoading(false);
    }
  }, [customerId, userContext]);

  /**
   * Aggiorna il profilo con nuovi dati
   */
  const updateProfile = useCallback(
    async (fieldUpdates: Partial<CustomerProfile>): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/customers/${customerId}/profile`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fieldUpdates),
        });
        if (!response.ok) throw new Error(`Profile update failed: ${response.status}`);

        setProfile(prev => ({ ...prev, ...fieldUpdates }));

        // Ricalcola campi mancanti
        await checkMissingFields();

        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Errore durante l'aggiornamento");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [customerId, checkMissingFields]
  );

  /**
   * Marca uno stage come completato
   */
  const completeStage = useCallback(async (stage: ProfilingStageId): Promise<boolean> => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/customers/${customerId}/profile/stages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage }),
      });
      if (!response.ok) throw new Error(`Stage completion failed: ${response.status}`);

      setProfile(prev => ({
        ...prev,
        completedStages: [...(prev.completedStages || []), stage],
      }));

      return true;
    } catch (err) {
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Ottiene il prossimo campo da compilare
   */
  const getNextField = useCallback((): string | null => {
    if (missingFields.length === 0) return null;
    return missingFields[0];
  }, [missingFields]);

  /**
   * Ottiene l'incentive dello stage corrente o specificato
   */
  const getStageIncentive = useCallback(
    (stage?: ProfilingStageId): string | null => {
      const targetStage = stage || currentStage;
      return PROFILING_STAGES[targetStage]?.incentive || null;
    },
    [currentStage]
  );

  /**
   * Verifica se l'utente può accedere a uno stage specifico
   */
  const canAccessStage = useCallback(
    (stage: ProfilingStageId): boolean => {
      const stageOrder: ProfilingStageId[] = ['onboarding', 'week1', 'week2', 'month1', 'complete'];
      const currentIndex = stageOrder.indexOf(currentStage);
      const targetIndex = stageOrder.indexOf(stage);

      return targetIndex <= currentIndex;
    },
    [currentStage]
  );

  // Auto-fetch al mount
  useEffect(() => {
    if (autoFetch) {
      checkMissingFields();
    }
  }, [autoFetch, checkMissingFields]);

  return {
    profile,
    missingFields,
    currentStage,
    completionPercentage,
    isLoading,
    error,
    checkMissingFields,
    updateProfile,
    completeStage,
    getNextField,
    getStageIncentive,
    totalFields,
    completedFields,
    isOnboardingComplete,
    canAccessStage,
  };
}

export default useProgressiveProfiling;
