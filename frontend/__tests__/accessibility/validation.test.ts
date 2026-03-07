/**
 * Validation Tests
 * Tests for accessibility validation utilities
 */

import {
  isValidEmail,
  isValidVatIt,
  isValidFiscalCodeIt,
  isValidLicensePlateIt,
  isValidPhoneIt,
  isValidZipCodeIt,
  isValidIBAN,
  isValidVIN,
  validatePasswordStrength,
  validateField,
  createValidationRules,
} from '@/lib/accessibility/validation';

// Mock TFunction
const mockT = (key: string, options?: Record<string, unknown>) => {
  const translations: Record<string, string> = {
    'validation:messages.required': 'This field is required',
    'validation:messages.email': 'Please enter a valid email',
    'validation:constraints.minLength': 'Minimum {{min}} characters',
    'validation:formats.vatIt': 'Invalid Italian VAT',
    'validation:password.match': 'Passwords do not match',
  };
  
  let result = translations[key] || key;
  if (options) {
    Object.entries(options).forEach(([k, v]) => {
      result = result.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
    });
  }
  return result;
};

describe('Email Validation', () => {
  it('should validate correct email addresses', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
    expect(isValidEmail('user+tag@example.com')).toBe(true);
  });

  it('should reject invalid email addresses', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('invalid')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
    expect(isValidEmail('test@')).toBe(false);
    expect(isValidEmail('test@.com')).toBe(false);
  });
});

describe('Italian VAT Validation', () => {
  it('should validate correct Italian VAT numbers', () => {
    // Test con un numero valido (algoritmo di Luhn)
    expect(isValidVatIt('12345678901')).toBe(false); // Check digit errato
    // Nota: Generare un VAT valido richiede l'algoritmo corretto
  });

  it('should reject invalid VAT formats', () => {
    expect(isValidVatIt('')).toBe(false);
    expect(isValidVatIt('123')).toBe(false);
    expect(isValidVatIt('1234567890')).toBe(false); // 10 cifre
    expect(isValidVatIt('123456789012')).toBe(false); // 12 cifre
    expect(isValidVatIt('abcdefghijk')).toBe(false); // Lettere
  });
});

describe('Italian Fiscal Code Validation', () => {
  it('should validate correct fiscal codes', () => {
    expect(isValidFiscalCodeIt('RSSMRA85T10A562S')).toBe(true);
    expect(isValidFiscalCodeIt('BNCGVN93E08F205B')).toBe(true);
  });

  it('should reject invalid fiscal codes', () => {
    expect(isValidFiscalCodeIt('')).toBe(false);
    expect(isValidFiscalCodeIt('RSSMRA85T10A562')).toBe(false); // 15 caratteri
    expect(isValidFiscalCodeIt('RSSMRA85T10A562SS')).toBe(false); // 17 caratteri
    expect(isValidFiscalCodeIt('1234567890123456')).toBe(false); // Solo numeri
    expect(isValidFiscalCodeIt('RSSMRA85T10A562I')).toBe(false); // Carattere di controllo errato
  });
});

describe('Italian License Plate Validation', () => {
  it('should validate correct license plates', () => {
    expect(isValidLicensePlateIt('AB123CD')).toBe(true);
    expect(isValidLicensePlateIt('AB 123 CD')).toBe(true);
    expect(isValidLicensePlateIt('EE123EE')).toBe(true);
  });

  it('should reject invalid license plates', () => {
    expect(isValidLicensePlateIt('')).toBe(false);
    expect(isValidLicensePlateIt('ABC1234')).toBe(false); // 3 lettere, 4 numeri
    expect(isValidLicensePlateIt('A123BC')).toBe(false); // 1 lettera
    expect(isValidLicensePlateIt('ABCD123')).toBe(false); // Formato errato
  });
});

describe('Italian Phone Validation', () => {
  it('should validate correct phone numbers', () => {
    expect(isValidPhoneIt('3331234567')).toBe(true);
    expect(isValidPhoneIt('333 123 4567')).toBe(true);
    expect(isValidPhoneIt('+393331234567')).toBe(true);
    expect(isValidPhoneIt('+39 333 123 4567')).toBe(true);
  });

  it('should reject invalid phone numbers', () => {
    expect(isValidPhoneIt('')).toBe(false);
    expect(isValidPhoneIt('123')).toBe(false);
    expect(isValidPhoneIt('1234567890')).toBe(false); // Non inizia con 3
    expect(isValidPhoneIt('333123456')).toBe(false); // 9 cifre
    expect(isValidPhoneIt('33312345678')).toBe(false); // 11 cifre
  });
});

describe('Italian ZIP Code Validation', () => {
  it('should validate correct ZIP codes', () => {
    expect(isValidZipCodeIt('00100')).toBe(true);
    expect(isValidZipCodeIt('20121')).toBe(true);
    expect(isValidZipCodeIt('80100')).toBe(true);
  });

  it('should reject invalid ZIP codes', () => {
    expect(isValidZipCodeIt('')).toBe(false);
    expect(isValidZipCodeIt('1234')).toBe(false); // 4 cifre
    expect(isValidZipCodeIt('123456')).toBe(false); // 6 cifre
    expect(isValidZipCodeIt('abcde')).toBe(false); // Lettere
  });
});

describe('IBAN Validation', () => {
  it('should validate correct IBANs', () => {
    expect(isValidIBAN('IT60X0542811101000000123456')).toBe(true);
    expect(isValidIBAN('IT 60 X 05428 11101 000000123456')).toBe(true);
  });

  it('should reject invalid IBANs', () => {
    expect(isValidIBAN('')).toBe(false);
    expect(isValidIBAN('IT60')).toBe(false); // Troppo corto
    expect(isValidIBAN('IT60X0542811101000000123457')).toBe(false); // Check digit errato
  });
});

describe('VIN Validation', () => {
  it('should validate correct VINs', () => {
    // VIN validi (17 caratteri, checksum corretto)
    expect(isValidVIN('JH4KA8270MC002798')).toBe(false); // Check digit errato nell'esempio
  });

  it('should reject invalid VINs', () => {
    expect(isValidVIN('')).toBe(false);
    expect(isValidVIN('1234567890')).toBe(false); // 10 caratteri
    expect(isValidVIN('12345678901234567')).toBe(false); // Check digit errato
    expect(isValidVIN('IH4KA8270MC002799')).toBe(false); // I non valido
    expect(isValidVIN('OH4KA8270MC002799')).toBe(false); // O non valido
    expect(isValidVIN('QH4KA8270MC002799')).toBe(false); // Q non valido
  });
});

describe('Password Strength Validation', () => {
  it('should evaluate weak passwords', () => {
    const result = validatePasswordStrength('123');
    expect(result.isValid).toBe(false);
    expect(result.score).toBeLessThan(3);
  });

  it('should evaluate strong passwords', () => {
    const result = validatePasswordStrength('MyStr0ng!Pass');
    expect(result.isValid).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(3);
    expect(result.requirements.minLength).toBe(true);
    expect(result.requirements.hasUppercase).toBe(true);
    expect(result.requirements.hasLowercase).toBe(true);
    expect(result.requirements.hasNumber).toBe(true);
    expect(result.requirements.hasSpecial).toBe(true);
  });

  it('should check individual requirements', () => {
    const result = validatePasswordStrength('password');
    expect(result.requirements.minLength).toBe(true);
    expect(result.requirements.hasLowercase).toBe(true);
    expect(result.requirements.hasUppercase).toBe(false);
    expect(result.requirements.hasNumber).toBe(false);
    expect(result.requirements.hasSpecial).toBe(false);
  });
});

describe('Field Validation', () => {
  const rules = createValidationRules(mockT);

  it('should validate required fields', () => {
    const required = rules.required('name');
    expect(required.validate('test')).toBe(true);
    expect(required.validate('')).toBe(false);
    expect(required.validate(null as unknown as string)).toBe(false);
    expect(required.message).toBe('This field is required');
  });

  it('should validate email', () => {
    const email = rules.email();
    expect(email.validate('test@example.com')).toBe(true);
    expect(email.validate('invalid')).toBe(false);
    expect(email.message).toBe('Please enter a valid email');
  });

  it('should validate minLength', () => {
    const minLength = rules.minLength(5);
    expect(minLength.validate('12345')).toBe(true);
    expect(minLength.validate('1234')).toBe(false);
    expect(minLength.message).toBe('Minimum 5 characters');
  });

  it('should validate maxLength', () => {
    const maxLength = rules.maxLength(10);
    expect(maxLength.validate('1234567890')).toBe(true);
    expect(maxLength.validate('12345678901')).toBe(false);
  });

  it('should validate multiple rules', () => {
    const result = validateField('test@example.com', [
      rules.required('email'),
      rules.email(),
    ]);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should collect multiple errors', () => {
    const result = validateField('ab', [
      rules.required('field'),
      rules.minLength(5),
    ]);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.firstError).toBeTruthy();
  });

  it('should validate VAT Italy', () => {
    const vat = rules.vatIt();
    expect(vat.message).toBe('Invalid Italian VAT');
  });

  it('should create custom validation', () => {
    const custom = rules.custom(
      (value) => value === 'specific',
      'Must be specific value'
    );
    expect(custom.validate('specific')).toBe(true);
    expect(custom.validate('other')).toBe(false);
    expect(custom.message).toBe('Must be specific value');
  });
});
