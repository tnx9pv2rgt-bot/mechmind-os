'use client';

import * as React from 'react';
import { type FieldError } from 'react-hook-form';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: FieldError;
  required?: boolean;
  helperText?: string;
  className?: string;
  children: React.ReactNode;
}

export function FormField({
  label,
  htmlFor,
  error,
  required = false,
  helperText,
  className,
  children,
}: FormFieldProps): React.ReactElement {
  const errorId = `${htmlFor}-error`;
  const helperId = `${htmlFor}-helper`;
  const hasError = !!error;

  const describedBy = [
    hasError ? errorId : null,
    helperText ? helperId : null,
  ]
    .filter(Boolean)
    .join(' ') || undefined;

  return (
    <div className={cn('space-y-1.5', className)}>
      <label
        htmlFor={htmlFor}
        className="block text-subhead font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]"
      >
        {label}
        {required && (
          <span className="ml-1 text-[var(--status-error)]" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {/* Inject aria attributes into the child input */}
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<Record<string, unknown>>, {
            id: htmlFor,
            'aria-invalid': hasError || undefined,
            'aria-describedby': describedBy,
            'aria-required': required || undefined,
          });
        }
        return child;
      })}

      {helperText && !hasError && (
        <p id={helperId} className="text-footnote text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
          {helperText}
        </p>
      )}

      {hasError && (
        <p id={errorId} className="text-footnote text-[var(--status-error)]" role="alert">
          {error.message}
        </p>
      )}
    </div>
  );
}
