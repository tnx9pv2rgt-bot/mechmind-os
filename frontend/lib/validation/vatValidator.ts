/**
 * VAT Validator
 * Validazione Partita IVA con verifica VIES e algoritmo Luhn
 */

import {
  VATValidationResult,
  ValidationOptions,
} from './types';

const DEFAULT_OPTIONS: ValidationOptions = {
  debounceMs: 300,
  minLength: 9,
  required: true,
  validateOnChange: true,
  validateOnBlur: true,
};

// Cache per prevenire chiamate duplicate
const validationCache = new Map<string, Promise<VATValidationResult>>();

/**
 * Pattern di validazione per Paesi UE
 */
const VAT_PATTERNS: Record<string, RegExp> = {
  'IT': /^\d{11}$/,                    // Italia: 11 cifre
  'DE': /^\d{9}$/,                     // Germania: 9 cifre
  'FR': /^[A-Z0-9]{2}\d{9}$/,          // Francia: 2 caratteri + 9 cifre
  'ES': /^[A-Z]\d{8}$|^\d{8}[A-Z]$/,   // Spagna: lettera + 8 cifre o viceversa
  'GB': /^\d{9}$|^\d{12}$|^GD\d{3}$|^HA\d{3}$/, // UK (storico)
  'AT': /^U\d{8}$/,                    // Austria
  'BE': /^0?\d{9}$/,                   // Belgio
  'BG': /^\d{9,10}$/,                  // Bulgaria
  'CY': /^\d{8}[A-Z]$/,                // Cipro
  'CZ': /^\d{8,10}$/,                  // Rep. Ceca
  'DK': /^\d{8}$/,                     // Danimarca
  'EE': /^\d{9}$/,                     // Estonia
  'FI': /^\d{8}$/,                     // Finlandia
  'EL': /^\d{9}$/,                     // Grecia
  'HU': /^\d{8}$/,                     // Ungheria
  'IE': /^\d{7}[A-W][A-I]?$/,          // Irlanda
  'LV': /^\d{11}$/,                    // Lettonia
  'LT': /^\d{9,12}$/,                  // Lituania
  'LU': /^\d{8}$/,                     // Lussemburgo
  'MT': /^\d{8}$/,                     // Malta
  'NL': /^\d{9}B\d{2}$/,               // Paesi Bassi
  'PL': /^\d{10}$/,                    // Polonia
  'PT': /^\d{9}$/,                     // Portogallo
  'RO': /^\d{2,10}$/,                  // Romania
  'SK': /^\d{10}$/,                    // Slovacchia
  'SI': /^\d{8}$/,                     // Slovenia
  'SE': /^\d{12}$/,                    // Svezia
  'HR': /^\d{11}$/,                    // Croazia
};

/**
 * Normalizza il numero IVA
 */
export function normalizeVatNumber(vat: string): string {
  return vat.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

/**
 * Estrae il country code dal numero IVA
 */
export function extractCountryCode(vat: string): string {
  if (vat.length < 2) return 'IT';
  const code = vat.substring(0, 2);
  return /^[A-Z]{2}$/.test(code) ? code : 'IT';
}

/**
 * Estrae il numero senza country code
 */
export function extractVatNumber(vat: string, countryCode: string): string {
  if (vat.startsWith(countryCode)) {
    return vat.substring(2);
  }
  return vat;
}

/**
 * Validazione formato IVA per paese
 */
export function isValidVatFormat(countryCode: string, vatNumber: string): boolean {
  const pattern = VAT_PATTERNS[countryCode];
  if (!pattern) {
    // Pattern generico per paesi non mappati
    return /^[A-Z0-9]{8,12}$/.test(vatNumber);
  }
  return pattern.test(vatNumber);
}

/**
 * Validazione Luhn per Partita IVA italiana
 */
export function validateItalianLuhn(vatNumber: string): boolean {
  if (!/^\d{11}$/.test(vatNumber)) return false;

  let sum = 0;
  for (let i = 0; i < 10; i++) {
    let digit = parseInt(vatNumber.charAt(i), 10);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(vatNumber.charAt(10), 10);
}

/**
 * Validazione locale completa (senza API)
 */
export function validateVatLocal(vat: string, countryCode?: string): {
  valid: boolean;
  normalized: string;
  country: string;
  number: string;
  formatValid: boolean;
  luhnValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const normalized = normalizeVatNumber(vat);
  
  if (!normalized) {
    errors.push('Partita IVA obbligatoria');
    return {
      valid: false,
      normalized,
      country: countryCode || 'IT',
      number: normalized,
      formatValid: false,
      luhnValid: false,
      errors,
    };
  }

  const country = countryCode?.toUpperCase() || extractCountryCode(normalized);
  const number = extractVatNumber(normalized, country);
  const fullVat = `${country}${number}`;

  // Check formato
  const formatValid = isValidVatFormat(country, number);
  if (!formatValid) {
    errors.push(`Formato Partita IVA non valido per ${country}`);
  }

  // Check Luhn per Italia
  let luhnValid = true;
  if (country === 'IT') {
    luhnValid = validateItalianLuhn(number);
    if (!luhnValid) {
      errors.push('Codice di controllo non valido');
    }
  }

  return {
    valid: formatValid && luhnValid,
    normalized: fullVat,
    country,
    number,
    formatValid,
    luhnValid,
    errors,
  };
}

/**
 * Valida Partita IVA via API VIES con debounce
 */
export async function validateVatRealTime(
  vat: string,
  countryCode?: string,
  options: ValidationOptions = {}
): Promise<VATValidationResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // 1. Validazione locale
  const localValidation = validateVatLocal(vat, countryCode);
  
  if (!localValidation.valid) {
    return {
      valid: false,
      countryCode: localValidation.country,
      vatNumber: localValidation.number,
      requestDate: new Date().toISOString(),
      isValidFormat: localValidation.formatValid,
      luhnValid: localValidation.luhnValid,
    };
  }

  // 2. Check lunghezza minima per chiamare API
  if (opts.minLength && localValidation.number.length < opts.minLength) {
    return {
      valid: localValidation.luhnValid,
      countryCode: localValidation.country,
      vatNumber: localValidation.number,
      requestDate: new Date().toISOString(),
      isValidFormat: localValidation.formatValid,
      luhnValid: localValidation.luhnValid,
    };
  }

  // 3. Chiama API con caching
  const cacheKey = `vat:${localValidation.normalized}`;
  
  if (!validationCache.has(cacheKey)) {
    const promise = fetchVatValidation(localValidation.country, localValidation.number);
    validationCache.set(cacheKey, promise);
    
    // Rimuovi dalla cache dopo 5 secondi
    setTimeout(() => validationCache.delete(cacheKey), 5000);
  }

  return await validationCache.get(cacheKey)!;
}

/**
 * Chiama l'API VIES per validazione
 */
async function fetchVatValidation(
  countryCode: string,
  vatNumber: string
): Promise<VATValidationResult> {
  try {
    const response = await fetch('/api/validate/vat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        vat: vatNumber,
        countryCode,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('VAT validation API error:', error);
    
    // Fallback: trust Luhn validation
    return {
      valid: countryCode === 'IT' ? validateItalianLuhn(vatNumber) : true,
      countryCode,
      vatNumber,
      requestDate: new Date().toISOString(),
      isValidFormat: isValidVatFormat(countryCode, vatNumber),
      luhnValid: countryCode === 'IT' ? validateItalianLuhn(vatNumber) : true,
      _fallback: true,
    };
  }
}

/**
 * Crea un debounced VAT validator
 */
export function createDebouncedVatValidator(
  callback: (result: VATValidationResult) => void,
  countryCode?: string,
  delay: number = 300
) {
  let timeoutId: NodeJS.Timeout | null = null;

  return (vat: string) => {
    // Cancella timeout precedente
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Validazione immediata per formato
    const localValidation = validateVatLocal(vat, countryCode);
    if (!localValidation.valid) {
      callback({
        valid: false,
        countryCode: localValidation.country,
        vatNumber: localValidation.number,
        requestDate: new Date().toISOString(),
        isValidFormat: localValidation.formatValid,
        luhnValid: localValidation.luhnValid,
      });
      return;
    }

    // Debounced validation
    timeoutId = setTimeout(async () => {
      try {
        const result = await validateVatRealTime(vat, countryCode);
        callback(result);
      } catch (error) {
        callback({
          valid: localValidation.luhnValid,
          countryCode: localValidation.country,
          vatNumber: localValidation.number,
          requestDate: new Date().toISOString(),
          isValidFormat: localValidation.formatValid,
          luhnValid: localValidation.luhnValid,
          _fallback: true,
        });
      }
    }, delay);
  };
}

/**
 * Formatta la Partita IVA per visualizzazione
 */
export function formatVatNumber(vat: string, countryCode?: string): string {
  const normalized = normalizeVatNumber(vat);
  const country = countryCode?.toUpperCase() || extractCountryCode(normalized);
  const number = extractVatNumber(normalized, country);

  switch (country) {
    case 'IT':
      // IT XXX XXX XXXXX
      return `${country} ${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6)}`;
    case 'DE':
      // DE XXXXXXXX
      return `${country} ${number}`;
    case 'FR':
      // FR XX XXXXXXXX
      return `${country} ${number.slice(0, 2)} ${number.slice(2)}`;
    default:
      return `${country} ${number}`;
  }
}

// Export di utilità
export {
  DEFAULT_OPTIONS,
  VAT_PATTERNS,
};
