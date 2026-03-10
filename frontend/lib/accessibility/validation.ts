/**
 * Accessibility Validation Utilities
 * Validazione form accessibile con messaggi i18n
 */

import { TFunction } from 'i18next';

export interface ValidationRule<T = string> {
  validate: (value: T) => boolean;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  firstError: string | null;
}

export interface FieldValidation<T = string> {
  value: T;
  rules: ValidationRule<T>[];
  fieldName: string;
}

/**
 * Validazione email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validazione Partita IVA italiana
 */
export function isValidVatIt(vat: string): boolean {
  const vatRegex = /^\d{11}$/;
  if (!vatRegex.test(vat)) return false;

  // Algoritmo di validazione codice fiscale P.IVA
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const digit = parseInt(vat[i], 10);
    if (i % 2 === 0) {
      // Posizioni dispari (0-based pari)
      const doubled = digit * 2;
      sum += doubled > 9 ? doubled - 9 : doubled;
    } else {
      // Posizioni pari (0-based dispari)
      sum += digit;
    }
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(vat[10], 10);
}

/**
 * Validazione Codice Fiscale italiano
 */
export function isValidFiscalCodeIt(code: string): boolean {
  const cfRegex = /^[A-Z]{6}\d{2}[A-EHLMPRST]\d{2}[A-Z]\d{3}[A-Z]$/i;
  return cfRegex.test(code);
}

/**
 * Validazione targa italiana
 */
export function isValidLicensePlateIt(plate: string): boolean {
  // Formati supportati: AB123CD, AB 123 CD, EE123EE, etc.
  const plateRegex = /^[A-Z]{2}\s*\d{3}\s*[A-Z]{2}$/i;
  return plateRegex.test(plate.replace(/\s/g, ''));
}

/**
 * Validazione telefono italiano
 */
export function isValidPhoneIt(phone: string): boolean {
  // +39 opzionale, spazi opzionali, 9-10 cifre
  const phoneRegex = /^(\+39\s?)?[\s]?\d{3}[\s]?\d{3}[\s]?\d{4}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * Validazione CAP italiano
 */
export function isValidZipCodeIt(zip: string): boolean {
  return /^\d{5}$/.test(zip);
}

/**
 * Validazione IBAN
 */
export function isValidIBAN(iban: string): boolean {
  const cleanIBAN = iban.replace(/\s/g, '').toUpperCase();
  if (cleanIBAN.length < 15 || cleanIBAN.length > 34) return false;

  // Sposta i primi 4 caratteri alla fine
  const rearranged = cleanIBAN.slice(4) + cleanIBAN.slice(0, 4);

  // Converte lettere in numeri (A=10, B=11, ...)
  let numeric = '';
  for (const char of rearranged) {
    if (/[A-Z]/.test(char)) {
      numeric += (char.charCodeAt(0) - 55).toString();
    } else {
      numeric += char;
    }
  }

  // Calcola modulo 97
  let remainder = '';
  for (let i = 0; i < numeric.length; i++) {
    remainder = (parseInt(remainder + numeric[i], 10) % 97).toString();
  }

  return parseInt(remainder, 10) === 1;
}

/**
 * Validazione VIN (Vehicle Identification Number)
 */
export function isValidVIN(vin: string): boolean {
  const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/i;
  if (!vinRegex.test(vin)) return false;

  // Caratteri validi (esclude I, O, Q)
  const validChars = '0123456789.ABCDEFGH..JKLMN.P.R..STUVWXYZ';
  const weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
  const transliteration: Record<string, number> = {
    A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
    J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
    S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
  };

  let sum = 0;
  const upperVIN = vin.toUpperCase();

  for (let i = 0; i < 17; i++) {
    const char = upperVIN[i];
    let value: number;

    if (/\d/.test(char)) {
      value = parseInt(char, 10);
    } else {
      value = transliteration[char] || 0;
    }

    sum += value * weights[i];
  }

  const checkDigit = upperVIN[8];
  const expectedCheck = sum % 11;
  const expectedChar = expectedCheck === 10 ? 'X' : expectedCheck.toString();

  return checkDigit === expectedChar;
}

/**
 * Validazione password strength
 */
export interface PasswordStrength {
  score: number; // 0-4
  isValid: boolean;
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
}

export function validatePasswordStrength(password: string): PasswordStrength {
  const requirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  const score = Object.values(requirements).filter(Boolean).length;
  const isValid = requirements.minLength && score >= 3;

  return {
    score,
    isValid,
    requirements,
  };
}

/**
 * Crea regole di validazione con i18n
 */
export function createValidationRules(t: TFunction) {
  return {
    required: (fieldName: string): ValidationRule => ({
      validate: (value) => value !== '' && value !== null && value !== undefined,
      message: t('validation:messages.required'),
    }),

    email: (): ValidationRule => ({
      validate: isValidEmail,
      message: t('validation:messages.email'),
    }),

    minLength: (min: number): ValidationRule => ({
      validate: (value) => value.length >= min,
      message: t('validation:constraints.minLength', { min }),
    }),

    maxLength: (max: number): ValidationRule => ({
      validate: (value) => value.length <= max,
      message: t('validation:constraints.maxLength', { max }),
    }),

    vatIt: (): ValidationRule => ({
      validate: isValidVatIt,
      message: t('validation:formats.vatIt'),
    }),

    fiscalCodeIt: (): ValidationRule => ({
      validate: isValidFiscalCodeIt,
      message: t('validation:formats.fiscalCodeIt'),
    }),

    phoneIt: (): ValidationRule => ({
      validate: isValidPhoneIt,
      message: t('validation:formats.phoneIt'),
    }),

    zipCodeIt: (): ValidationRule => ({
      validate: isValidZipCodeIt,
      message: t('validation:formats.zipCodeIt'),
    }),

    iban: (): ValidationRule => ({
      validate: isValidIBAN,
      message: t('validation:formats.iban'),
    }),

    vin: (): ValidationRule => ({
      validate: isValidVIN,
      message: t('form:errors.invalidVIN'),
    }),

    match: (otherValue: string, otherFieldName: string): ValidationRule => ({
      validate: (value) => value === otherValue,
      message: t('validation:password.match', { field: otherFieldName }),
    }),

    pattern: (regex: RegExp, message?: string): ValidationRule => ({
      validate: (value) => regex.test(value),
      message: message || t('validation:messages.pattern'),
    }),

    custom: (validateFn: (value: string) => boolean, message: string): ValidationRule => ({
      validate: validateFn,
      message,
    }),
  };
}

/**
 * Valida un campo con multiple regole
 */
export function validateField<T = string>(
  value: T,
  rules: ValidationRule<T>[]
): ValidationResult {
  const errors: string[] = [];

  for (const rule of rules) {
    if (!rule.validate(value)) {
      errors.push(rule.message);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    firstError: errors.length > 0 ? errors[0] : null,
  };
}

/**
 * Valida un form completo
 */
export function validateForm<T extends Record<string, unknown>>(
  values: T,
  validations: Record<keyof T, ValidationRule<unknown>[]>
): Record<keyof T, ValidationResult> & { isValid: boolean } {
  const results = {} as Record<keyof T, ValidationResult> & { isValid: boolean };
  let formIsValid = true;

  for (const [field, rules] of Object.entries(validations) as [
    keyof T,
    ValidationRule<unknown>[]
  ][]) {
    const result = validateField(values[field], rules);
    (results as Record<string, ValidationResult>)[field as string] = result;
    if (!result.isValid) {
      formIsValid = false;
    }
  }

  results.isValid = formIsValid;
  return results;
}

export default {
  isValidEmail,
  isValidVatIt,
  isValidFiscalCodeIt,
  isValidLicensePlateIt,
  isValidPhoneIt,
  isValidZipCodeIt,
  isValidIBAN,
  isValidVIN,
  validatePasswordStrength,
  createValidationRules,
  validateField,
  validateForm,
};
