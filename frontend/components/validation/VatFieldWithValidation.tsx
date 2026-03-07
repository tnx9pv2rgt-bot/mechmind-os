'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, 
  AlertCircle, 
  Loader2, 
  Building2,
  X,
  MapPin,
  FileCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  validateVatLocal,
  validateVatRealTime,
  formatVatNumber,
  VATValidationResult,
} from '@/lib/validation';

export interface VatFieldWithValidationProps {
  value: string;
  onChange: (value: string, validation: VATValidationResult | null) => void;
  onBlur?: () => void;
  onCompanyData?: (data: { name?: string; address?: string }) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  countryCode?: string;
  showValidationIndicator?: boolean;
  showCompanyData?: boolean;
  debounceMs?: number;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-9 text-sm',
  md: 'h-11 text-base',
  lg: 'h-14 text-lg',
};

const iconSizes = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

export function VatFieldWithValidation({
  value,
  onChange,
  onBlur,
  onCompanyData,
  label = 'Partita IVA',
  placeholder = 'IT12345678901',
  required = false,
  disabled = false,
  className,
  countryCode = 'IT',
  showValidationIndicator = true,
  showCompanyData = true,
  debounceMs = 400,
  size = 'md',
}: VatFieldWithValidationProps) {
  const [validation, setValidation] = useState<VATValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Formatta il valore per la visualizzazione
  const displayValue = useCallback((vat: string) => {
    if (!vat) return '';
    try {
      return formatVatNumber(vat, countryCode);
    } catch {
      return vat;
    }
  }, [countryCode]);

  // Validazione debounced
  const debouncedValidate = useCallback((vat: string) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (!vat) {
      setValidation(null);
      setIsValidating(false);
      setError(required ? 'Partita IVA obbligatoria' : null);
      onChange(vat, null);
      return;
    }

    // Validazione locale immediata
    const localValidation = validateVatLocal(vat, countryCode);
    
    if (!localValidation.valid) {
      setValidation({
        valid: false,
        countryCode: localValidation.country,
        vatNumber: localValidation.number,
        requestDate: new Date().toISOString(),
        isValidFormat: localValidation.formatValid,
        luhnValid: localValidation.luhnValid,
      });
      setError(localValidation.errors[0]);
      setIsValidating(false);
      onChange(vat, null);
      return;
    }

    // Se la validazione locale passa, chiama l'API
    setIsValidating(true);
    setError(null);

    debounceTimer.current = setTimeout(async () => {
      try {
        const result = await validateVatRealTime(vat, countryCode, { debounceMs: 0 });
        setValidation(result);
        
        if (!result.valid && !result._fallback) {
          setError('Partita IVA non valida o non esistente');
        } else if (!result.luhnValid) {
          setError('Codice di controllo non valido');
        } else {
          setError(null);
          
          // Notifica dati azienda
          if (result.companyName || result.address) {
            onCompanyData?.({
              name: result.companyName,
              address: result.address,
            });
          }
        }

        onChange(vat, result);
      } catch {
        // Fallback su validazione locale
        setValidation({
          valid: localValidation.luhnValid,
          countryCode: localValidation.country,
          vatNumber: localValidation.number,
          requestDate: new Date().toISOString(),
          isValidFormat: localValidation.formatValid,
          luhnValid: localValidation.luhnValid,
          _fallback: true,
        });
        setError(null);
        onChange(vat, null);
      } finally {
        setIsValidating(false);
        setTyping(false);
      }
    }, debounceMs);
  }, [debounceMs, required, countryCode, onChange, onCompanyData]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^A-Za-z0-9]/g, '');
    setTyping(true);
    onChange(rawValue, validation);
    debouncedValidate(rawValue);
  };

  const handleBlur = () => {
    setTouched(true);
    setTyping(false);
    onBlur?.();
  };

  const clearField = () => {
    onChange('', null);
    setValidation(null);
    setError(null);
    inputRef.current?.focus();
  };

  // Determina lo stato di visualizzazione
  const showSuccess = validation?.valid && !error && !isValidating && !typing && value.length > 0;
  const showError = (touched || value.length >= 9) && error && !isValidating;

  return (
    <div className={cn('relative', className)}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Input Container */}
      <div className="relative">
        {/* Icona sinistra */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <Building2 className={iconSizes[size]} />
        </div>

        {/* Input */}
        <motion.input
          ref={inputRef}
          type="text"
          value={displayValue(value)}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled || isValidating}
          placeholder={placeholder}
          className={cn(
            'w-full rounded-lg border bg-white dark:bg-gray-900',
            'pl-10 pr-10 font-mono tracking-wide',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'uppercase',
            sizeClasses[size],
            showError
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
              : showSuccess
                ? 'border-green-300 focus:border-green-500 focus:ring-green-500/20'
                : 'border-gray-300 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500/20'
          )}
          whileFocus={{ scale: 1.005 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        />

        {/* Right side indicators */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {/* Clear button */}
          {value && !disabled && (
            <motion.button
              type="button"
              onClick={clearField}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <X className={cn('text-gray-400', iconSizes[size === 'lg' ? 'md' : 'sm'])} />
            </motion.button>
          )}

          {/* Validation indicators */}
          {showValidationIndicator && (
            <AnimatePresence mode="wait">
              {isValidating ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, rotate: -180 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 180 }}
                >
                  <Loader2 className={cn('animate-spin text-blue-500', iconSizes[size])} />
                </motion.div>
              ) : showError ? (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                >
                  <AlertCircle className={cn('text-red-500', iconSizes[size])} />
                </motion.div>
              ) : showSuccess ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                >
                  <FileCheck className={cn('text-green-500', iconSizes[size])} />
                </motion.div>
              ) : null}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Helper text */}
      {!error && !showSuccess && (
        <p className="mt-1.5 text-xs text-gray-500">
          Inserisci la Partita IVA completa di prefisso nazionale (es: IT12345678901)
        </p>
      )}

      {/* Messages */}
      <AnimatePresence>
        {/* Error message */}
        {showError && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-2 text-sm text-red-600 flex items-center gap-1.5"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </motion.p>
        )}

        {/* Company Data Card */}
        {showCompanyData && validation?.valid && (validation.companyName || validation.address) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg">
                <Building2 className="w-5 h-5 text-green-600 dark:text-green-300" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-green-900 dark:text-green-100">
                  {validation.companyName || 'Azienda verificata'}
                </h4>
                {validation.address && (
                  <p className="mt-1 text-sm text-green-700 dark:text-green-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{validation.address}</span>
                  </p>
                )}
                <p className="mt-2 text-xs text-green-600 dark:text-green-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  Verificato su VIES (Agenzia delle Entrate)
                  {validation._fallback && (
                    <span className="text-amber-600">- Modalità offline</span>
                  )}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Success message senza dati */}
        {showSuccess && !validation?.companyName && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-2 text-sm text-green-600 flex items-center gap-1.5"
          >
            <Check className="w-4 h-4 flex-shrink-0" />
            Partita IVA valida
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden inputs per form submission */}
      <input
        type="hidden"
        name="vat_valid"
        value={validation?.valid ? 'true' : 'false'}
      />
      <input
        type="hidden"
        name="vat_country"
        value={validation?.countryCode || ''}
      />
      {validation?.companyName && (
        <input
          type="hidden"
          name="company_name"
          value={validation.companyName}
        />
      )}
    </div>
  );
}

export default VatFieldWithValidation;
