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
        className="block text-subhead font-medium text-gray-900 dark:text-gray-100"
      >
        {label}
        {required && (
          <span className="ml-1 text-destructive" aria-hidden="true">
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
        <p id={helperId} className="text-footnote text-gray-500 dark:text-gray-400">
          {helperText}
        </p>
      )}

      {hasError && (
        <p id={errorId} className="text-footnote text-destructive" role="alert">
          {error.message}
        </p>
      )}
    </div>
  );
}
