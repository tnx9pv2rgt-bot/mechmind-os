'use client';

import React, { useRef, useEffect, useCallback } from 'react';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  autoSubmit?: boolean;
  onComplete?: (code: string) => void;
}

export function OtpInput({
  length = 6,
  value,
  onChange,
  disabled = false,
  autoSubmit = false,
  onComplete,
}: OtpInputProps): React.ReactElement {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const digits = value.padEnd(length, '').split('').slice(0, length);

  const setDigit = useCallback(
    (index: number, digit: string): void => {
      const newDigits = [...digits];
      newDigits[index] = digit;
      const newValue = newDigits.join('').replace(/[^0-9]/g, '');
      onChange(newValue);

      if (digit && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }

      if (newValue.length === length && onComplete) {
        onComplete(newValue);
      }
    },
    [digits, length, onChange, onComplete],
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>): void => {
      if (e.key === 'Backspace') {
        e.preventDefault();
        if (digits[index]) {
          setDigit(index, '');
        } else if (index > 0) {
          inputRefs.current[index - 1]?.focus();
          setDigit(index - 1, '');
        }
      } else if (e.key === 'ArrowLeft' && index > 0) {
        e.preventDefault();
        inputRefs.current[index - 1]?.focus();
      } else if (e.key === 'ArrowRight' && index < length - 1) {
        e.preventDefault();
        inputRefs.current[index + 1]?.focus();
      }
    },
    [digits, length, setDigit],
  );

  const handleInput = useCallback(
    (index: number, e: React.FormEvent<HTMLInputElement>): void => {
      const target = e.target as HTMLInputElement;
      const char = target.value.slice(-1);
      if (/^\d$/.test(char)) {
        setDigit(index, char);
      } else {
        target.value = digits[index] || '';
      }
    },
    [digits, setDigit],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>): void => {
      e.preventDefault();
      const pasted = e.clipboardData
        .getData('text')
        .replace(/[^0-9]/g, '')
        .slice(0, length);

      if (pasted.length > 0) {
        onChange(pasted);
        const focusIndex = Math.min(pasted.length, length - 1);
        setTimeout(() => inputRefs.current[focusIndex]?.focus(), 0);

        if (pasted.length === length && onComplete) {
          onComplete(pasted);
        }
      }
    },
    [length, onChange, onComplete],
  );

  return (
    <div className="flex items-center justify-center gap-2" role="group" aria-label="Codice OTP">
      {digits.map((digit, i) => (
        <React.Fragment key={i}>
          {i === Math.floor(length / 2) && (
            <span
              className="mx-1 text-xl font-normal text-[var(--text-tertiary)]"
              aria-hidden="true"
            >
              &middot;
            </span>
          )}
          <input
            ref={(el) => {
              inputRefs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digit || ''}
            disabled={disabled}
            onInput={(e) => handleInput(i, e)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            aria-label={`Cifra ${i + 1} di ${length}`}
            className={[
              'h-14 w-12 rounded-xl border text-center text-xl font-normal',
              'outline-none transition-all duration-150',
              'bg-[var(--surface-elevated)] text-[var(--text-on-brand)]',
              'border-[var(--border-strong)]',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'placeholder:text-[var(--text-tertiary)]',
            ].join(' ')}
          />
        </React.Fragment>
      ))}
    </div>
  );
}

/** Alias for backward compatibility */
export const OTPInput = OtpInput;
