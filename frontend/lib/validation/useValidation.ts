/**
 * useValidation Hook
 * Hook React per gestire la validazione dei campi con stato
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  validateEmailRealTime,
  validateVatRealTime,
  SimplifiedEmailValidation,
  VATValidationResult,
  ValidationOptions,
  UseValidationReturn,
} from './validation';

// ==================== EMAIL VALIDATION HOOK ====================

interface UseEmailValidationOptions extends ValidationOptions {
  allowDisposable?: boolean;
  allowRoleBased?: boolean;
  onValidationChange?: (result: SimplifiedEmailValidation | null) => void;
}

export function useEmailValidation(
  initialValue: string = '',
  options: UseEmailValidationOptions = {}
): UseValidationReturn<SimplifiedEmailValidation> {
  const {
    debounceMs = 300,
    required = false,
    allowDisposable = false,
    allowRoleBased = true,
    onValidationChange,
  } = options;

  const [value, setValueState] = useState(initialValue);
  const [result, setResult] = useState<SimplifiedEmailValidation | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [dirty, setDirty] = useState(false);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const abortController = useRef<AbortController | null>(null);

  const validate = useCallback(async (): Promise<SimplifiedEmailValidation | null> => {
    if (!value) {
      setResult(null);
      setError(required ? 'Email obbligatoria' : null);
      onValidationChange?.(null);
      return null;
    }

    setIsValidating(true);
    setError(null);

    // Abort previous request
    if (abortController.current) {
      abortController.current.abort();
    }
    abortController.current = new AbortController();

    try {
      const validationResult = await validateEmailRealTime(value, { debounceMs: 0 });
      setResult(validationResult);

      // Check policies
      if (!allowDisposable && validationResult.disposable) {
        setError('Email temporanea non consentita');
      } else if (!allowRoleBased && validationResult.role_based) {
        setError('Usa un email personale, non di reparto');
      } else if (!validationResult.valid) {
        setError('Email non valida');
      }

      onValidationChange?.(validationResult);
      return validationResult;
    } catch {
      setError('Errore durante la validazione');
      onValidationChange?.(null);
      return null;
    } finally {
      setIsValidating(false);
    }
  }, [value, debounceMs, required, allowDisposable, allowRoleBased, onValidationChange]);

  const setValue = useCallback((newValue: string) => {
    setValueState(newValue);
    setDirty(true);
    
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      validate();
    }, debounceMs);
  }, [debounceMs, validate]);

  const reset = useCallback(() => {
    setValueState(initialValue);
    setResult(null);
    setError(null);
    setTouched(false);
    setDirty(false);
    setIsValidating(false);
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
  }, [initialValue]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleBlur = useCallback(() => {
    setTouched(true);
    validate();
  }, [validate]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, []);

  const isValid = result?.valid && !error;

  return {
    value,
    setValue,
    result,
    isValidating,
    isValid,
    error,
    touched,
    dirty,
    validate,
    reset,
    clearError,
  };
}

// ==================== VAT VALIDATION HOOK ====================

interface UseVatValidationOptions extends ValidationOptions {
  countryCode?: string;
  onValidationChange?: (result: VATValidationResult | null) => void;
  onCompanyData?: (data: { name?: string; address?: string }) => void;
}

export function useVatValidation(
  initialValue: string = '',
  options: UseVatValidationOptions = {}
): UseValidationReturn<VATValidationResult> {
  const {
    debounceMs = 400,
    required = false,
    countryCode = 'IT',
    onValidationChange,
    onCompanyData,
  } = options;

  const [value, setValueState] = useState(initialValue);
  const [result, setResult] = useState<VATValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [dirty, setDirty] = useState(false);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const abortController = useRef<AbortController | null>(null);

  const validate = useCallback(async (): Promise<VATValidationResult | null> => {
    if (!value) {
      setResult(null);
      setError(required ? 'Partita IVA obbligatoria' : null);
      onValidationChange?.(null);
      return null;
    }

    setIsValidating(true);
    setError(null);

    // Abort previous request
    if (abortController.current) {
      abortController.current.abort();
    }
    abortController.current = new AbortController();

    try {
      const validationResult = await validateVatRealTime(value, countryCode, { debounceMs: 0 });
      setResult(validationResult);

      if (!validationResult.valid && !validationResult._fallback) {
        setError('Partita IVA non valida');
      } else if (!validationResult.luhnValid) {
        setError('Codice di controllo non valido');
      }

      // Notify company data
      if (validationResult.companyName || validationResult.address) {
        onCompanyData?.({
          name: validationResult.companyName,
          address: validationResult.address,
        });
      }

      onValidationChange?.(validationResult);
      return validationResult;
    } catch {
      setError('Errore durante la validazione');
      onValidationChange?.(null);
      return null;
    } finally {
      setIsValidating(false);
    }
  }, [value, debounceMs, required, countryCode, onValidationChange, onCompanyData]);

  const setValue = useCallback((newValue: string) => {
    setValueState(newValue);
    setDirty(true);
    
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      validate();
    }, debounceMs);
  }, [debounceMs, validate]);

  const reset = useCallback(() => {
    setValueState(initialValue);
    setResult(null);
    setError(null);
    setTouched(false);
    setDirty(false);
    setIsValidating(false);
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
  }, [initialValue]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleBlur = useCallback(() => {
    setTouched(true);
    validate();
  }, [validate]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, []);

  const isValid = result?.valid && !error;

  return {
    value,
    setValue,
    result,
    isValidating,
    isValid,
    error,
    touched,
    dirty,
    validate,
    reset,
    clearError,
  };
}

// ==================== COMBINED VALIDATION HOOK ====================

interface UseFormValidationOptions {
  email?: UseEmailValidationOptions;
  vat?: UseVatValidationOptions;
}

interface UseFormValidationReturn {
  email: ReturnType<typeof useEmailValidation>;
  vat: ReturnType<typeof useVatValidation>;
  isValid: boolean;
  isValidating: boolean;
  validateAll: () => Promise<boolean>;
  resetAll: () => void;
}

export function useFormValidation(
  options: UseFormValidationOptions = {}
): UseFormValidationReturn {
  const email = useEmailValidation('', options.email);
  const vat = useVatValidation('', options.vat);

  const isValid = email.isValid && vat.isValid;
  const isValidating = email.isValidating || vat.isValidating;

  const validateAll = useCallback(async (): Promise<boolean> => {
    const [emailResult, vatResult] = await Promise.all([
      email.validate(),
      vat.validate(),
    ]);
    return !!emailResult?.valid && !!vatResult?.valid;
  }, [email, vat]);

  const resetAll = useCallback(() => {
    email.reset();
    vat.reset();
  }, [email, vat]);

  return {
    email,
    vat,
    isValid,
    isValidating,
    validateAll,
    resetAll,
  };
}

// Export
export default useFormValidation;
