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
        <label className="block text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-1.5">
          {label}
          {required && <span className="text-[var(--status-error)] ml-1">*</span>}
        </label>
      )}

      {/* Input Container */}
      <div className="relative">
        {/* Icona sinistra */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">
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
            'w-full rounded-lg border bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)]',
            'pl-10 pr-10 font-mono tracking-wide',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'uppercase',
            sizeClasses[size],
            showError
              ? 'border-[var(--status-error)]/30 focus:border-[var(--status-error)] focus:ring-[var(--status-error)]/20'
              : showSuccess
                ? 'border-[var(--status-success)]/30 focus:border-[var(--status-success)] focus:ring-[var(--status-success)]/20'
                : 'border-[var(--border-default)] dark:border-[var(--border-default)] focus:border-[var(--status-info)] focus:ring-[var(--status-info)]/20'
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
              className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <X className={cn('text-[var(--text-tertiary)]', iconSizes[size === 'lg' ? 'md' : 'sm'])} />
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
                  <Loader2 className={cn('animate-spin text-[var(--status-info)]', iconSizes[size])} />
                </motion.div>
              ) : showError ? (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                >
                  <AlertCircle className={cn('text-[var(--status-error)]', iconSizes[size])} />
                </motion.div>
              ) : showSuccess ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                >
                  <FileCheck className={cn('text-[var(--status-success)]', iconSizes[size])} />
                </motion.div>
              ) : null}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Helper text */}
      {!error && !showSuccess && (
        <p className="mt-1.5 text-xs text-[var(--text-tertiary)]">
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
            className="mt-2 text-sm text-[var(--status-error)] flex items-center gap-1.5"
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
            className="mt-3 p-4 bg-[var(--status-success-subtle)] dark:bg-[var(--status-success-subtle)] border border-[var(--status-success)]/30 dark:border-[var(--status-success)] rounded-lg"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-[var(--status-success-subtle)] dark:bg-[var(--status-success)] rounded-lg">
                <Building2 className="w-5 h-5 text-[var(--status-success)] dark:text-[var(--status-success)]" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-[var(--status-success)] dark:text-[var(--status-success)]">
                  {validation.companyName || 'Azienda verificata'}
                </h4>
                {validation.address && (
                  <p className="mt-1 text-sm text-[var(--status-success)] dark:text-[var(--status-success)] flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{validation.address}</span>
                  </p>
                )}
                <p className="mt-2 text-xs text-[var(--status-success)] dark:text-[var(--status-success)] flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  Verificato su VIES (Agenzia delle Entrate)
                  {validation._fallback && (
                    <span className="text-[var(--status-warning)]">- Modalità offline</span>
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
            className="mt-2 text-sm text-[var(--status-success)] flex items-center gap-1.5"
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
