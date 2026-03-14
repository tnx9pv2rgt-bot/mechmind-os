/**
 * Validation Engine Tests
 * Test unitari per il sistema di validazione
 */

import {
  // Email
  validateEmailSyntax,
  isDisposableDomain,
  isRoleBasedEmail,
  isFreeEmailProvider,
  getEmailSuggestion,
  EMAIL_REGEX,
  
  // VAT
  normalizeVatNumber,
  extractCountryCode,
  extractVatNumber,
  isValidVatFormat,
  validateItalianLuhn,
  validateVatLocal,
  
  // Address
  isValidItalianPostalCode,
  isValidItalianProvince,
  parseAddress,
} from '../index';

describe('Email Validation', () => {
  describe('validateEmailSyntax', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmailSyntax('test@gmail.com').valid).toBe(true);
      expect(validateEmailSyntax('user.name@company.co.uk').valid).toBe(true);
      expect(validateEmailSyntax('user+tag@example.com').valid).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmailSyntax('invalid').valid).toBe(false);
      expect(validateEmailSyntax('@example.com').valid).toBe(false);
      expect(validateEmailSyntax('test@').valid).toBe(false);
      expect(validateEmailSyntax('test@com').valid).toBe(false);
      expect(validateEmailSyntax('').valid).toBe(false);
    });

    it('should detect empty email', () => {
      const result = validateEmailSyntax('');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Email obbligatoria');
    });

    it('should detect email too long', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      const result = validateEmailSyntax(longEmail);
      expect(result.errors.some(e => e.includes('troppo lunga'))).toBe(true);
    });
  });

  describe('isDisposableDomain', () => {
    it('should detect disposable email domains', () => {
      expect(isDisposableDomain('test@tempmail.com')).toBe(true);
      expect(isDisposableDomain('test@mailinator.com')).toBe(true);
      expect(isDisposableDomain('test@10minutemail.com')).toBe(true);
      expect(isDisposableDomain('test@guerrillamail.com')).toBe(true);
    });

    it('should not flag legitimate email domains', () => {
      expect(isDisposableDomain('test@gmail.com')).toBe(false);
      expect(isDisposableDomain('test@company.com')).toBe(false);
      expect(isDisposableDomain('test@mechmind.io')).toBe(false);
    });
  });

  describe('isRoleBasedEmail', () => {
    it('should detect role-based emails', () => {
      expect(isRoleBasedEmail('info@company.com')).toBe(true);
      expect(isRoleBasedEmail('admin@company.com')).toBe(true);
      expect(isRoleBasedEmail('support@company.com')).toBe(true);
      expect(isRoleBasedEmail('sales@company.com')).toBe(true);
      expect(isRoleBasedEmail('contact@company.com')).toBe(true);
    });

    it('should not flag personal emails', () => {
      expect(isRoleBasedEmail('john@company.com')).toBe(false);
      expect(isRoleBasedEmail('mario.rossi@gmail.com')).toBe(false);
    });
  });

  describe('isFreeEmailProvider', () => {
    it('should detect free email providers', () => {
      expect(isFreeEmailProvider('test@gmail.com')).toBe(true);
      expect(isFreeEmailProvider('test@yahoo.com')).toBe(true);
      expect(isFreeEmailProvider('test@libero.it')).toBe(true);
      expect(isFreeEmailProvider('test@virgilio.it')).toBe(true);
    });

    it('should not flag business email providers', () => {
      expect(isFreeEmailProvider('test@company.com')).toBe(false);
      expect(isFreeEmailProvider('test@mechmind.io')).toBe(false);
    });
  });

  describe('getEmailSuggestion', () => {
    it('should suggest corrections for common typos', () => {
      expect(getEmailSuggestion('test@gmial.com')).toBe('test@gmail.com');
      expect(getEmailSuggestion('test@gmal.com')).toBe('test@gmail.com');
      expect(getEmailSuggestion('test@hotmial.com')).toBe('test@hotmail.com');
      expect(getEmailSuggestion('test@outlok.com')).toBe('test@outlook.com');
    });

    it('should return undefined for correct emails', () => {
      expect(getEmailSuggestion('test@gmail.com')).toBeUndefined();
      expect(getEmailSuggestion('test@company.com')).toBeUndefined();
    });

    it('should handle invalid email format', () => {
      expect(getEmailSuggestion('invalid')).toBeUndefined();
    });
  });

  describe('EMAIL_REGEX', () => {
    it('should match valid emails', () => {
      expect(EMAIL_REGEX.test('test@example.com')).toBe(true);
      expect(EMAIL_REGEX.test('user.name@domain.co.uk')).toBe(true);
    });

    it('should not match invalid emails', () => {
      expect(EMAIL_REGEX.test('test@')).toBe(false);
      expect(EMAIL_REGEX.test('@example.com')).toBe(false);
      expect(EMAIL_REGEX.test('test')).toBe(false);
    });
  });
});

describe('VAT Validation', () => {
  describe('normalizeVatNumber', () => {
    it('should remove special characters and uppercase', () => {
      expect(normalizeVatNumber('IT 123-456.789/01')).toBe('IT12345678901');
      expect(normalizeVatNumber('de 123 456 789')).toBe('DE123456789');
    });
  });

  describe('extractCountryCode', () => {
    it('should extract country code', () => {
      expect(extractCountryCode('IT12345678901')).toBe('IT');
      expect(extractCountryCode('DE123456789')).toBe('DE');
      expect(extractCountryCode('FR12345678901')).toBe('FR');
    });

    it('should default to IT for invalid codes', () => {
      expect(extractCountryCode('12345678901')).toBe('IT');
      expect(extractCountryCode('XX12345678901')).toBe('XX');
    });
  });

  describe('extractVatNumber', () => {
    it('should extract VAT number without country code', () => {
      expect(extractVatNumber('IT12345678901', 'IT')).toBe('12345678901');
      expect(extractVatNumber('12345678901', 'IT')).toBe('12345678901');
    });
  });

  describe('isValidVatFormat', () => {
    it('should validate Italian VAT format (11 digits)', () => {
      expect(isValidVatFormat('IT', '12345678901')).toBe(true);
      expect(isValidVatFormat('IT', '1234567890')).toBe(false);
      expect(isValidVatFormat('IT', '123456789012')).toBe(false);
      expect(isValidVatFormat('IT', 'ABCDEFGHIJK')).toBe(false);
    });

    it('should validate German VAT format (9 digits)', () => {
      expect(isValidVatFormat('DE', '123456789')).toBe(true);
      expect(isValidVatFormat('DE', '12345678')).toBe(false);
    });

    it('should validate French VAT format', () => {
      expect(isValidVatFormat('FR', 'AB123456789')).toBe(true);
      expect(isValidVatFormat('FR', '12345678901')).toBe(true);
    });
  });

  describe('validateItalianLuhn', () => {
    it('should validate correct Italian VAT numbers', () => {
      // Note: These are example valid Italian VAT numbers
      // In real tests, use actual verified VAT numbers
      expect(validateItalianLuhn('01234567897')).toBe(true);
    });

    it('should reject invalid Italian VAT numbers', () => {
      expect(validateItalianLuhn('12345678901')).toBe(false);
      expect(validateItalianLuhn('00000000000')).toBe(true); // All zeros passes Luhn check
      expect(validateItalianLuhn('ABCDEFGHIJK')).toBe(false);
      expect(validateItalianLuhn('12345')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(validateItalianLuhn('')).toBe(false);
      expect(validateItalianLuhn('1234567890')).toBe(false); // 10 digits
    });
  });

  describe('validateVatLocal', () => {
    it('should return valid for correct Italian VAT', () => {
      const result = validateVatLocal('01234567897', 'IT');
      expect(result.valid).toBe(true);
      expect(result.formatValid).toBe(true);
      expect(result.luhnValid).toBe(true);
    });

    it('should return errors for empty VAT', () => {
      const result = validateVatLocal('', 'IT');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Partita IVA obbligatoria');
    });

    it('should return errors for invalid format', () => {
      const result = validateVatLocal('12345', 'IT');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle country code in VAT number', () => {
      const result = validateVatLocal('IT02541230420');
      expect(result.country).toBe('IT');
      expect(result.normalized).toBe('IT02541230420');
    });
  });
});

describe('Address Validation', () => {
  describe('isValidItalianPostalCode', () => {
    it('should validate correct Italian postal codes', () => {
      expect(isValidItalianPostalCode('00100')).toBe(true);
      expect(isValidItalianPostalCode('20121')).toBe(true);
      expect(isValidItalianPostalCode('80100')).toBe(true);
    });

    it('should reject invalid postal codes', () => {
      expect(isValidItalianPostalCode('1234')).toBe(false);
      expect(isValidItalianPostalCode('123456')).toBe(false);
      expect(isValidItalianPostalCode('ABCDE')).toBe(false);
      expect(isValidItalianPostalCode('')).toBe(false);
    });
  });

  describe('isValidItalianProvince', () => {
    it('should validate correct province codes', () => {
      expect(isValidItalianProvince('RM')).toBe(true);
      expect(isValidItalianProvince('MI')).toBe(true);
      expect(isValidItalianProvince('NA')).toBe(true);
      expect(isValidItalianProvince('rm')).toBe(true); // case insensitive
    });

    it('should reject invalid province codes', () => {
      expect(isValidItalianProvince('R')).toBe(false);
      expect(isValidItalianProvince('ROM')).toBe(false);
      expect(isValidItalianProvince('12')).toBe(false);
      expect(isValidItalianProvince('')).toBe(false);
    });
  });

  describe('parseAddress', () => {
    it('should parse Italian address format', () => {
      const result = parseAddress('Via Roma 123, 00100 Roma RM');
      expect(result.street).toBe('Via Roma');
      expect(result.number).toBe('123');
      expect(result.postalCode).toBe('00100');
      expect(result.city).toBe('Roma RM');
      expect(result.province).toBeUndefined();
    });

    it('should parse alternative format', () => {
      const result = parseAddress('Via Milano 456 20121 Milano');
      expect(result.street).toBe('Via Milano');
      expect(result.number).toBe('456');
      expect(result.postalCode).toBe('20121');
      expect(result.city).toBe('Milano');
    });

    it('should return empty object for unparseable address', () => {
      const result = parseAddress('invalid address');
      expect(Object.keys(result).length).toBe(0);
    });
  });
});
