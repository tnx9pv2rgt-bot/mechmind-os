/**
 * A11yFormField Component
 * Componente form field con accessibilità completa
 * WCAG 2.1 AA compliant
 */

'use client';

import React, { forwardRef, useId } from 'react';
import { useTranslation } from 'react-i18next';

export interface A11yFormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Label del campo */
  label: string;
  /** Nome campo per errori i18n */
  name: string;
  /** Messaggio di errore */
  error?: string;
  /** Testo di aiuto/suggerimento */
  hint?: string;
  /** Se il campo è richiesto */
  required?: boolean;
  /** Tipo di input */
  type?: string;
  /** Componente custom per input (es. select, textarea) */
  as?: 'input' | 'select' | 'textarea';
  /** Opzioni per select */
  options?: Array<{ value: string; label: string; disabled?: boolean }>;
  /** Callback per validazione */
  onValidate?: (value: string) => string | undefined;
  /** Classe CSS aggiuntiva */
  wrapperClassName?: string;
  /** Se mostrare l'asterisco per required */
  showRequiredIndicator?: boolean;
  /** Testo aria-label personalizzato */
  ariaLabel?: string;
  /** Testo aria-describedby personalizzato (aggiuntivo) */
  additionalDescribedBy?: string;
}

/**
 * A11yFormField - Campo form accessibile
 * Include: label, error, hint, aria attributes
 */
export const A11yFormField = forwardRef<
  HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  A11yFormFieldProps
>((
  {
    label,
    name,
    error,
    hint,
    required = false,
    type = 'text',
    as: Component = 'input',
    options = [],
    onValidate,
    wrapperClassName = '',
    className = '',
    showRequiredIndicator = true,
    ariaLabel,
    additionalDescribedBy,
    id: providedId,
    onBlur,
    onChange,
    'aria-invalid': ariaInvalid,
    ...props
  },
  ref
) => {
  const { t } = useTranslation(['form', 'a11y']);
  const uniqueId = useId();
  const id = providedId || `field-${name}-${uniqueId}`;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const descriptionId = `${id}-description`;

  // Costruisci aria-describedby
  const describedByIds: string[] = [];
  if (hint) describedByIds.push(hintId);
  if (error) describedByIds.push(errorId);
  if (additionalDescribedBy) describedByIds.push(additionalDescribedBy);
  const ariaDescribedBy = describedByIds.length > 0 ? describedByIds.join(' ') : undefined;

  // Aria label
  const finalAriaLabel = ariaLabel || t(`form:aria.${name}`, { defaultValue: label });

  // Stati di validazione
  const hasError = Boolean(error);
  const isInvalid = ariaInvalid !== undefined ? ariaInvalid : hasError;

  // Handler blur con validazione
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (onValidate) {
      const validationError = onValidate(e.target.value);
      // Validazione gestita dal parent
    }
    onBlur?.(e as React.FocusEvent<HTMLInputElement>);
  };

  // Input classes
  const inputClasses = `
    w-full px-3 py-2 rounded-md border
    bg-background text-foreground
    focus:outline-none focus:ring-2 focus:ring-ring focus:border-input
    disabled:opacity-50 disabled:cursor-not-allowed
    ${hasError 
      ? 'border-destructive focus:ring-destructive' 
      : 'border-input'
    }
    ${className}
  `;

  return (
    <div className={`space-y-1 ${wrapperClassName}`}>
      {/* Label */}
      <label 
        htmlFor={id}
        className="block text-sm font-medium"
      >
        {label}
        {required && showRequiredIndicator && (
          <span className="text-destructive ml-1" aria-hidden="true">*</span>
        )}
        {required && (
          <span className="sr-only"> ({t('a11y:screenReader.help.required')})</span>
        )}
      </label>

      {/* Input */}
      {Component === 'select' ? (
        <select
          ref={ref as React.Ref<HTMLSelectElement>}
          id={id}
          name={name}
          required={required}
          aria-required={required}
          aria-invalid={isInvalid}
          aria-label={finalAriaLabel}
          aria-describedby={ariaDescribedBy}
          aria-errormessage={hasError ? errorId : undefined}
          className={inputClasses}
          onBlur={handleBlur}
          {...(props as React.SelectHTMLAttributes<HTMLSelectElement>)}
        >
          {options.map((opt) => (
            <option 
              key={opt.value} 
              value={opt.value}
              disabled={opt.disabled}
            >
              {opt.label}
            </option>
          ))}
        </select>
      ) : Component === 'textarea' ? (
        <textarea
          ref={ref as React.Ref<HTMLTextAreaElement>}
          id={id}
          name={name}
          required={required}
          aria-required={required}
          aria-invalid={isInvalid}
          aria-label={finalAriaLabel}
          aria-describedby={ariaDescribedBy}
          aria-errormessage={hasError ? errorId : undefined}
          className={inputClasses}
          onBlur={handleBlur}
          {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          ref={ref as React.Ref<HTMLInputElement>}
          id={id}
          name={name}
          type={type}
          required={required}
          aria-required={required}
          aria-invalid={isInvalid}
          aria-label={finalAriaLabel}
          aria-describedby={ariaDescribedBy}
          aria-errormessage={hasError ? errorId : undefined}
          className={inputClasses}
          onBlur={handleBlur}
          {...props}
        />
      )}

      {/* Hint */}
      {hint && (
        <p 
          id={hintId}
          className="text-sm text-muted-foreground"
        >
          {hint}
        </p>
      )}

      {/* Error - con aria-live per annunci automatici */}
      {hasError && (
        <p 
          id={errorId}
          className="text-sm text-destructive font-medium"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}

      {/* Descrizione aggiuntiva per screen reader */}
      <span id={descriptionId} className="sr-only">
        {t('a11y:screenReader.instructions.formNavigation')}
      </span>
    </div>
  );
});

A11yFormField.displayName = 'A11yFormField';

export default A11yFormField;
