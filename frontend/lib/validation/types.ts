/**
 * Validation Types
 * TypeScript interfaces per i risultati di validazione
 */

// Email Validation
export interface EmailValidationResult {
  email: string;
  status: 'valid' | 'invalid' | 'catch-all' | 'unknown' | 'spamtrap' | 'abuse' | 'do_not_mail';
  subStatus?: string;
  isValid: boolean;
  isDeliverable: boolean;
  isSyntaxValid: boolean;
  isDomainValid: boolean;
  isDisposable: boolean;
  isRoleBased: boolean;
  isCatchAll: boolean;
  isFree: boolean;
  score: number; // 0-100
  mxRecord?: string;
  smtpProvider?: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  country?: string;
  region?: string;
  city?: string;
  zipcode?: string;
  suggestion?: string;
  typoCorrected?: string;
  processedAt: string;
  _fallback?: boolean;
}

export type EmailDeliverability = 'deliverable' | 'undeliverable' | 'risky' | 'unknown';

export interface SimplifiedEmailValidation {
  valid: boolean;
  deliverable: EmailDeliverability;
  disposable: boolean;
  catch_all: boolean;
  role_based: boolean;
  free: boolean;
  score: number;
  suggestion?: string;
  typoCorrected?: string;
}

// VAT Validation
export interface VATValidationResult {
  valid: boolean;
  companyName?: string;
  address?: string;
  countryCode: string;
  vatNumber: string;
  requestDate: string;
  consultationId?: string;
  isValidFormat: boolean;
  luhnValid: boolean;
  _fallback?: boolean;
}

// Address Validation
export interface AddressPrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  types: string[];
}

export interface AddressDetails {
  street: string;
  number: string;
  city: string;
  postalCode: string;
  province: string;
  country: string;
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

export interface PostalCodeValidation {
  valid: boolean;
  city?: string;
  province?: string;
  region?: string;
}

// Validation State
export interface ValidationState<T> {
  value: string;
  result: T | null;
  isValidating: boolean;
  error: string | null;
  touched: boolean;
  dirty: boolean;
}

// Validation Options
export interface ValidationOptions {
  debounceMs?: number;
  minLength?: number;
  required?: boolean;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

// Validation Hook Return
export interface UseValidationReturn<T> {
  value: string;
  setValue: (value: string) => void;
  result: T | null;
  isValidating: boolean;
  isValid: boolean;
  error: string | null;
  touched: boolean;
  dirty: boolean;
  validate: () => Promise<T | null>;
  reset: () => void;
  clearError: () => void;
}
