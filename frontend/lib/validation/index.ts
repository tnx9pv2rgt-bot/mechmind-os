/**
 * Validation Engine
 * Validazione multi-layer in stile Stripe per Email, VAT e Indirizzi
 */

// Types
export * from './types';

// Email Validation
export {
  validateEmailSyntax,
  isDisposableDomain,
  isRoleBasedEmail,
  isFreeEmailProvider,
  getEmailSuggestion,
  validateEmailRealTime,
  createDebouncedEmailValidator,
  EMAIL_REGEX,
} from './emailValidator';

// VAT Validation
export {
  normalizeVatNumber,
  extractCountryCode,
  extractVatNumber,
  isValidVatFormat,
  validateItalianLuhn,
  validateVatLocal,
  validateVatRealTime,
  createDebouncedVatValidator,
  formatVatNumber,
  VAT_PATTERNS,
} from './vatValidator';

// Address Validation
export {
  isValidItalianPostalCode,
  isValidItalianProvince,
  autocompleteAddress,
  getAddressDetails,
  validatePostalCode,
  validateCityPostalCodeMatch,
  createDebouncedAutocomplete,
  formatAddress,
  parseAddress,
} from './addressValidator';

// React Hooks
export {
  useEmailValidation,
  useVatValidation,
  useFormValidation,
} from './useValidation';

// Re-export types per comodità
export type {
  EmailValidationResult,
  SimplifiedEmailValidation,
  EmailDeliverability,
  VATValidationResult,
  AddressPrediction,
  AddressDetails,
  PostalCodeValidation,
  ValidationState,
  ValidationOptions,
  UseValidationReturn,
} from './types';
