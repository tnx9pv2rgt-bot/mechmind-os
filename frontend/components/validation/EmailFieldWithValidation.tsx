'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, 
  AlertCircle, 
  Loader2, 
  Mail,
  X,
  AlertTriangle,
  Shield,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  validateEmailRealTime,
  validateEmailSyntax,
  getEmailSuggestion,
  SimplifiedEmailValidation,
} from '@/lib/validation';

export interface EmailFieldWithValidationProps {
  value: string;
  onChange: (value: string, validation: SimplifiedEmailValidation | null) => void;
  onBlur?: () => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  showValidationIndicator?: boolean;
  allowDisposable?: boolean;
  allowRoleBased?: boolean;
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

export function EmailFieldWithValidation({
  value,
  onChange,
  onBlur,
  label = 'Email',
  placeholder = 'nome@esempio.com',
  required = false,
  disabled = false,
  className,
  showValidationIndicator = true,
  allowDisposable = false,
  allowRoleBased = true,
  debounceMs = 300,
  size = 'md',
}: EmailFieldWithValidationProps) {
  const [validation, setValidation] = useState<SimplifiedEmailValidation | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Validazione debounced
  const debouncedValidate = useCallback((email: string) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (!email) {
      setValidation(null);
      setIsValidating(false);
      setError(required ? 'Email obbligatoria' : null);
      onChange(email, null);
      return;
    }

    // Validazione sintassi immediata
    const syntaxCheck = validateEmailSyntax(email);
    if (!syntaxCheck.valid) {
      setValidation({
        valid: false,
        deliverable: 'undeliverable',
        disposable: false,
        catch_all: false,
        role_based: false,
        free: false,
        score: 0,
      });
      setError(syntaxCheck.errors[0]);
      setIsValidating(false);
      onChange(email, null);
      return;
    }

    setIsValidating(true);
    setError(null);

    debounceTimer.current = setTimeout(async () => {
      try {
        const result = await validateEmailRealTime(email, { debounceMs: 0 });
        setValidation(result);
        
        // Check policy
        if (!allowDisposable && result.disposable) {
          setError('Email temporanea non consentita');
        } else if (!allowRoleBased && result.role_based) {
          setError('Usa un email personale, non di reparto');
        } else if (!result.valid) {
          setError('Email non valida o non raggiungibile');
        } else if (result.deliverable === 'risky') {
          setError(null); // Warning ma non errore
        } else {
          setError(null);
        }

        onChange(email, result);
      } catch {
        setValidation(null);
        setError('Errore durante la validazione');
        onChange(email, null);
      } finally {
        setIsValidating(false);
        setTyping(false);
      }
    }, debounceMs);
  }, [debounceMs, required, allowDisposable, allowRoleBased, onChange]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setTyping(true);
    onChange(newValue, validation);
    debouncedValidate(newValue);
  };

  const handleBlur = () => {
    setTouched(true);
    setTyping(false);
    onBlur?.();
  };

  const handleSuggestionClick = () => {
    if (validation?.suggestion) {
      const suggestedValue = validation.suggestion;
      onChange(suggestedValue, null);
      debouncedValidate(suggestedValue);
      inputRef.current?.focus();
    }
  };

  const clearField = () => {
    onChange('', null);
    setValidation(null);
    setError(null);
    inputRef.current?.focus();
  };

  // Determina lo stato di visualizzazione
  const showSuccess = validation?.valid && !error && !isValidating && !typing && value.length > 0;
  const showWarning = validation?.disposable || validation?.deliverable === 'risky';
  const showError = (touched || value.length > 0) && error && !isValidating;

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
          <Mail className={iconSizes[size]} />
        </div>

        {/* Input */}
        <motion.input
          ref={inputRef}
          type="email"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled || isValidating}
          placeholder={placeholder}
          className={cn(
            'w-full rounded-lg border bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)]',
            'pl-10 pr-10',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            sizeClasses[size],
            showError
              ? 'border-[var(--status-error)]/30 focus:border-[var(--status-error)] focus:ring-[var(--status-error)]/20'
              : showSuccess
                ? 'border-[var(--status-success)]/30 focus:border-[var(--status-success)] focus:ring-[var(--status-success)]/20'
                : showWarning
                  ? 'border-[var(--status-warning)]/30 focus:border-[var(--status-warning)] focus:ring-[var(--status-warning)]/20'
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
                  <Check className={cn('text-[var(--status-success)]', iconSizes[size])} />
                </motion.div>
              ) : showWarning ? (
                <motion.div
                  key="warning"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                >
                  <AlertTriangle className={cn('text-[var(--status-warning)]', iconSizes[size])} />
                </motion.div>
              ) : null}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Messages */}
      <AnimatePresence>
        {/* Typo suggestion */}
        {validation?.suggestion && validation.suggestion !== value.toLowerCase() && !error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-2"
          >
            <button
              type="button"
              onClick={handleSuggestionClick}
              className="text-sm text-[var(--status-info)] hover:text-[var(--status-info)] flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Intendevi <strong>{validation.suggestion}</strong>?
            </button>
          </motion.div>
        )}

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

        {/* Warning: Disposable email */}
        {validation?.disposable && !error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-2 p-3 bg-[var(--status-warning)]/5 dark:bg-[var(--status-warning)]/40/20 border border-[var(--status-warning)]/30 dark:border-[var(--status-warning)] rounded-lg"
          >
            <p className="text-sm text-[var(--status-warning)] dark:text-[var(--status-warning)] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Email temporanea rilevata.</strong>
                <br />
                Usa un email aziendale per accedere a tutte le funzionalità.
              </span>
            </p>
          </motion.div>
        )}

        {/* Warning: Risky email */}
        {validation?.deliverable === 'risky' && !validation?.disposable && !error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-2 p-3 bg-[var(--status-info-subtle)] dark:bg-[var(--status-info-subtle)] border border-[var(--status-info)]/30 dark:border-[var(--status-info)] rounded-lg"
          >
            <p className="text-sm text-[var(--status-info)] dark:text-[var(--status-info)] flex items-start gap-2">
              <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                Questo dominio accetta tutte le email (catch-all). 
                Verifica attentamente l&apos;indirizzo.
              </span>
            </p>
          </motion.div>
        )}

        {/* Success message */}
        {showSuccess && validation && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-2 text-sm text-[var(--status-success)] flex items-center gap-1.5"
          >
            <Check className="w-4 h-4 flex-shrink-0" />
            Email valida e raggiungibile
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden input per form submission */}
      <input
        type="hidden"
        name="email_valid"
        value={validation?.valid ? 'true' : 'false'}
      />
    </div>
  );
}

export default EmailFieldWithValidation;
