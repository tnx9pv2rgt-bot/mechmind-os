/**
 * Address Validator
 * Validazione indirizzi con Google Places Autocomplete
 */

import {
  AddressPrediction,
  AddressDetails,
  PostalCodeValidation,
  ValidationOptions,
} from './types';

const DEFAULT_OPTIONS: ValidationOptions = {
  debounceMs: 300,
  minLength: 3,
  validateOnChange: true,
  validateOnBlur: true,
};

// Cache per autocomplete
const autocompleteCache = new Map<string, { data: AddressPrediction[]; timestamp: number }>();
const detailsCache = new Map<string, { data: AddressDetails; timestamp: number }>();
const postalCodeCache = new Map<string, { data: PostalCodeValidation; timestamp: number }>();

const CACHE_DURATION_AUTOCOMPLETE = 24 * 60 * 60 * 1000; // 24 ore
const CACHE_DURATION_DETAILS = 30 * 24 * 60 * 60 * 1000; // 30 giorni

// Abort controllers per cancellare richieste precedenti
let autocompleteAbortController: AbortController | null = null;

/**
 * Regex per validazione CAP italiano
 */
const ITALIAN_POSTAL_CODE_REGEX = /^\d{5}$/;

/**
 * Regex per validazione provincia italiana
 */
const ITALIAN_PROVINCE_REGEX = /^[A-Z]{2}$/i;

/**
 * Valida un CAP italiano
 */
export function isValidItalianPostalCode(code: string): boolean {
  return ITALIAN_POSTAL_CODE_REGEX.test(code);
}

/**
 * Valida una sigla provincia italiana
 */
export function isValidItalianProvince(province: string): boolean {
  return ITALIAN_PROVINCE_REGEX.test(province);
}

/**
 * Autocomplete indirizzo con debounce
 */
export async function autocompleteAddress(
  input: string,
  options: { language?: string; country?: string } = {}
): Promise<AddressPrediction[]> {
  const { language = 'it', country = 'it' } = options;
  
  if (!input || input.length < 3) {
    return [];
  }

  const cacheKey = `${language}:${country}:${input.toLowerCase()}`;
  
  // Check cache
  const cached = autocompleteCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_AUTOCOMPLETE) {
    return cached.data;
  }

  // Cancella richiesta precedente
  if (autocompleteAbortController) {
    autocompleteAbortController.abort();
  }
  autocompleteAbortController = new AbortController();

  try {
    const response = await fetch(
      `/api/validate/address?input=${encodeURIComponent(input)}&language=${language}`,
      {
        signal: autocompleteAbortController.signal,
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();
    const predictions = data.predictions || [];

    // Cache result
    autocompleteCache.set(cacheKey, {
      data: predictions,
      timestamp: Date.now(),
    });

    return predictions;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return [];
    }
    console.error('Address autocomplete error:', error);
    return [];
  }
}

/**
 * Recupera dettagli completi di un indirizzo
 */
export async function getAddressDetails(placeId: string): Promise<AddressDetails | null> {
  if (!placeId) return null;

  // Check cache
  const cached = detailsCache.get(placeId);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_DETAILS) {
    return cached.data;
  }

  try {
    const response = await fetch(`/api/validate/address?placeId=${encodeURIComponent(placeId)}`);

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();

    // Cache result
    detailsCache.set(placeId, {
      data,
      timestamp: Date.now(),
    });

    return data;
  } catch (error) {
    console.error('Address details error:', error);
    return null;
  }
}

/**
 * Valida CAP e restituisce città/provincia
 */
export async function validatePostalCode(
  code: string
): Promise<PostalCodeValidation> {
  if (!isValidItalianPostalCode(code)) {
    return { valid: false };
  }

  // Check cache
  const cached = postalCodeCache.get(code);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_DETAILS) {
    return cached.data;
  }

  try {
    const response = await fetch('/api/validate/address', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ postalCode: code }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();

    // Cache result
    postalCodeCache.set(code, {
      data,
      timestamp: Date.now(),
    });

    return data;
  } catch (error) {
    console.error('Postal code validation error:', error);
    return { valid: false };
  }
}

/**
 * Cross-validazione CAP-Città
 */
export async function validateCityPostalCodeMatch(
  city: string,
  postalCode: string
): Promise<{ valid: boolean; suggestions?: string[] }> {
  const postalValidation = await validatePostalCode(postalCode);
  
  if (!postalValidation.valid) {
    return { valid: false };
  }

  const normalizedCity = city.toLowerCase().trim();
  const normalizedValidatedCity = postalValidation.city?.toLowerCase().trim();

  if (normalizedValidatedCity && normalizedCity !== normalizedValidatedCity) {
    return {
      valid: false,
      suggestions: [postalValidation.city!],
    };
  }

  return { valid: true };
}

/**
 * Crea un debounced autocomplete
 */
export function createDebouncedAutocomplete(
  callback: (predictions: AddressPrediction[]) => void,
  delay: number = 300
) {
  let timeoutId: NodeJS.Timeout | null = null;

  return (input: string, options?: { language?: string; country?: string }) => {
    // Cancella timeout precedente
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (!input || input.length < 3) {
      callback([]);
      return;
    }

    // Debounced search
    timeoutId = setTimeout(async () => {
      try {
        const predictions = await autocompleteAddress(input, options);
        callback(predictions);
      } catch (error) {
        callback([]);
      }
    }, delay);
  };
}

/**
 * Formatta un indirizzo per visualizzazione
 */
export function formatAddress(
  address: Partial<AddressDetails>,
  options: { includeCountry?: boolean; compact?: boolean } = {}
): string {
  const { includeCountry = false, compact = false } = options;
  
  if (compact) {
    const parts = [
      address.street,
      address.number,
    ].filter(Boolean);
    return parts.join(', ');
  }

  const parts = [
    address.street,
    address.number,
    address.postalCode,
    address.city,
    address.province,
    includeCountry ? address.country : null,
  ].filter(Boolean);

  return parts.join(', ');
}

/**
 * Estrae i componenti da un indirizzo formattato (best effort)
 */
export function parseAddress(address: string): Partial<AddressDetails> {
  // Pattern per indirizzi italiani
  const patterns = [
    // Via Roma 123, 00100 Roma RM
    /^(.*?)\s+(\d+),?\s*(\d{5})\s+([^(,]+)(?:\s*\((\w{2})\))?/i,
    // Via Roma 123 00100 Roma
    /^(.*?)\s+(\d+)\s*(\d{5})\s+(.*)$/i,
  ];

  for (const pattern of patterns) {
    const match = address.match(pattern);
    if (match) {
      return {
        street: match[1]?.trim(),
        number: match[2]?.trim(),
        postalCode: match[3]?.trim(),
        city: match[4]?.trim(),
        province: match[5]?.toUpperCase(),
      };
    }
  }

  return {};
}

// Export di utilità
export {
  DEFAULT_OPTIONS,
  ITALIAN_POSTAL_CODE_REGEX,
  ITALIAN_PROVINCE_REGEX,
};
