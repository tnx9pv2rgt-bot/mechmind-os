/**
 * Hook per persistenza form tra step multi-pagina
 * Approccio Big Tech: sessionStorage + sync tra tab
 */

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'customer_form_data';

interface FormData {
  step: number;
  data: Record<string, any>;
  timestamp: number;
}

export const useFormSession = () => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // Carica dati da sessionStorage
  useEffect(() => {
    const load = () => {
      try {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed: FormData = JSON.parse(saved);
          // Validità 24 ore
          if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
            setFormData(parsed.data);
          } else {
            sessionStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch {
        // Ignore
      }
      setIsLoaded(true);
    };
    load();
  }, []);

  // Salva dati
  const saveStep = useCallback((step: number, data: Record<string, any>) => {
    const payload: FormData = {
      step,
      data: { ...formData, ...data },
      timestamp: Date.now(),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    setFormData(payload.data);
  }, [formData]);

  // Ottieni dati di uno specifico step
  const getStepData = useCallback((stepFields: string[]) => {
    const result: Record<string, any> = {};
    stepFields.forEach(field => {
      if (formData[field] !== undefined) {
        result[field] = formData[field];
      }
    });
    return result;
  }, [formData]);

  // Clear tutto
  const clearForm = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setFormData({});
  }, []);

  return {
    formData,
    isLoaded,
    saveStep,
    getStepData,
    clearForm,
  };
};
