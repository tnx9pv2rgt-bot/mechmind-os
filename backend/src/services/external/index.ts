// DEPRECATED: This module is not imported anywhere. Consider removing.
/**
 * External Services Module
 * Integrazioni con servizi esterni di terze parti
 */

// VIES - VAT Verification
export {
  ViesApiService,
  verifyVatNumber,
  type ViesVerificationResult,
  type ViesError,
} from './viesApi';

// Google Places - Address Autocomplete
export {
  GooglePlacesService,
  autocompleteAddress,
  getPlaceDetails,
  type AddressPrediction,
  type AddressDetails,
  type GeocodeResult,
} from './googlePlaces';

// ZeroBounce - Email Verification
export {
  ZeroBounceService,
  verifyEmail,
  type EmailVerificationResult,
  type BulkVerificationResult,
} from './zerobounce';

// Twilio - Phone Verification
export {
  TwilioService,
  validatePhoneNumber,
  formatE164,
  type PhoneValidationResult,
  type SmsVerificationResult,
  type OtpVerificationResult,
  type OtpSession,
} from './twilio';
