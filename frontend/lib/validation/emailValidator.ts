/**
 * Email Validator
 * Validazione email multi-layer con API esterna e debounce
 */

import {
  EmailValidationResult,
  SimplifiedEmailValidation,
  ValidationOptions,
} from './types';

const DEFAULT_OPTIONS: ValidationOptions = {
  debounceMs: 300,
  minLength: 5,
  required: true,
  validateOnChange: true,
  validateOnBlur: true,
};

// Cache per prevenire chiamate duplicate
const validationCache = new Map<string, Promise<EmailValidationResult>>();

/**
 * Regex base per validazione sintassi email
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validazione locale sintassi email
 */
export function validateEmailSyntax(email: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    errors.push('Email obbligatoria');
    return { valid: false, errors };
  }

  if (normalizedEmail.length > 254) {
    errors.push('Email troppo lunga (max 254 caratteri)');
  }

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    errors.push('Formato email non valido');
  }

  const [localPart, domain] = normalizedEmail.split('@');

  if (!localPart || localPart.length > 64) {
    errors.push('Parte locale email non valida');
  }

  if (!domain) {
    errors.push('Dominio mancante');
  } else {
    const domainParts = domain.split('.');
    if (domainParts.length < 2) {
      errors.push('Dominio deve avere un TLD');
    }

    const tld = domainParts[domainParts.length - 1];
    if (!/^[a-zA-Z]{2,}$/.test(tld)) {
      errors.push('TLD non valido');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Verifica se un dominio è noto come disposable
 */
export function isDisposableDomain(email: string): boolean {
  const disposableDomains = [
    'tempmail.com', 'throwaway.com', 'mailinator.com',
    'guerrillamail.com', '10minutemail.com', 'yopmail.com',
    'temp-mail.org', 'fakeinbox.com', 'sharklasers.com',
    'getairmail.com', 'burnermail.io', 'tempmailaddress.com',
    'mailnesia.com', 'tempinbox.com', 'kost.pw',
    'mohmal.com', 'sharklasers.com', 'guerrillamail.net',
    'guerrillamail.org', 'grr.la', 'guerrillamailblock.com',
    'spam4.me', 'bccto.me', 'chacuo.net',
    'tempmailbox.us', 'throwawaymail.com', 'tempail.com',
  ];

  const domain = email.split('@')[1]?.toLowerCase();
  return domain ? disposableDomains.includes(domain) : false;
}

/**
 * Verifica se è un email role-based
 */
export function isRoleBasedEmail(email: string): boolean {
  const rolePrefixes = [
    'info@', 'admin@', 'support@', 'sales@', 'contact@',
    'help@', 'service@', 'marketing@', 'webmaster@',
    'postmaster@', 'hostmaster@', 'abuse@', 'noc@',
    'security@', 'billing@', 'jobs@', 'careers@',
    'hello@', 'team@', 'office@', 'general@',
  ];

  const localPart = email.split('@')[0]?.toLowerCase();
  return localPart ? rolePrefixes.some(role => email.toLowerCase().startsWith(role)) : false;
}

/**
 * Verifica se è un provider email gratuito
 */
export function isFreeEmailProvider(email: string): boolean {
  const freeDomains = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
    'libero.it', 'virgilio.it', 'tiscali.it', 'alice.it',
    'live.com', 'icloud.com', 'me.com', 'mac.com',
    'protonmail.com', 'zoho.com', 'yandex.com', 'mail.com',
    'aol.com', 'msn.com', 'ymail.com', 'fastmail.com',
    'gmx.com', 'gmx.net', 'web.de', 'mail.ru',
    'qq.com', '163.com', '126.com', 'sina.com',
    'naver.com', 'daum.net', 'hanmail.net',
  ];

  const domain = email.split('@')[1]?.toLowerCase();
  return domain ? freeDomains.includes(domain) : false;
}

/**
 * Suggerisce correzioni per typo comuni
 */
export function getEmailSuggestion(email: string): string | undefined {
  const commonTypos: Record<string, string> = {
    'gmial.com': 'gmail.com',
    'gmail.co': 'gmail.com',
    'gmail.con': 'gmail.com',
    'gmail.it': 'gmail.com',
    'gnail.com': 'gmail.com',
    'gmaill.com': 'gmail.com',
    'gamil.com': 'gmail.com',
    'gmal.com': 'gmail.com',
    'yahooo.com': 'yahoo.com',
    'yaho.com': 'yahoo.com',
    'yahoo.it': 'yahoo.com',
    'hotmial.com': 'hotmail.com',
    'hotmail.co': 'hotmail.com',
    'hotmail.con': 'hotmail.com',
    'hotmail.it': 'hotmail.com',
    'outlok.com': 'outlook.com',
    'outlook.co': 'outlook.com',
    'outlook.con': 'outlook.com',
    'outlook.it': 'outlook.com',
    'libero.co': 'libero.it',
    'libero.com': 'libero.it',
    'virgilio.co': 'virgilio.it',
    'virgilio.com': 'virgilio.it',
    'tiscali.co': 'tiscali.it',
    'tiscali.com': 'tiscali.it',
    'alice.co': 'alice.it',
    'live.co': 'live.com',
    'live.con': 'live.com',
  };

  const parts = email.split('@');
  if (parts.length !== 2) return undefined;

  const [localPart, domain] = parts;
  const correctedDomain = commonTypos[domain.toLowerCase()];
  
  if (correctedDomain && correctedDomain !== domain.toLowerCase()) {
    return `${localPart}@${correctedDomain}`;
  }

  return undefined;
}

/**
 * Valida email via API con debounce
 */
export async function validateEmailRealTime(
  email: string,
  options: ValidationOptions = {}
): Promise<SimplifiedEmailValidation> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const normalizedEmail = email.trim().toLowerCase();

  // 1. Validazione sintassi locale
  const syntaxCheck = validateEmailSyntax(normalizedEmail);
  if (!syntaxCheck.valid) {
    return {
      valid: false,
      deliverable: 'undeliverable',
      disposable: isDisposableDomain(normalizedEmail),
      catch_all: false,
      role_based: isRoleBasedEmail(normalizedEmail),
      free: isFreeEmailProvider(normalizedEmail),
      score: 0,
      suggestion: getEmailSuggestion(normalizedEmail),
    };
  }

  // 2. Check lunghezza minima per chiamare API
  if (opts.minLength && normalizedEmail.length < opts.minLength) {
    return {
      valid: true, // Sintassi ok, ma non validato via API
      deliverable: 'unknown',
      disposable: isDisposableDomain(normalizedEmail),
      catch_all: false,
      role_based: isRoleBasedEmail(normalizedEmail),
      free: isFreeEmailProvider(normalizedEmail),
      score: 50,
      suggestion: getEmailSuggestion(normalizedEmail),
    };
  }

  // 3. Chiama API con caching
  const cacheKey = `email:${normalizedEmail}`;
  
  if (!validationCache.has(cacheKey)) {
    const promise = fetchEmailValidation(normalizedEmail);
    validationCache.set(cacheKey, promise);
    
    // Rimuovi dalla cache dopo 5 secondi per permettere retry
    setTimeout(() => validationCache.delete(cacheKey), 5000);
  }

  const result = await validationCache.get(cacheKey)!;
  
  return {
    valid: result.isValid && result.isDeliverable,
    deliverable: mapDeliverability(result),
    disposable: result.isDisposable,
    catch_all: result.isCatchAll,
    role_based: result.isRoleBased,
    free: result.isFree,
    score: result.score,
    suggestion: result.suggestion || getEmailSuggestion(normalizedEmail),
    typoCorrected: result.typoCorrected,
  };
}

/**
 * Chiama l'API di validazione email
 */
async function fetchEmailValidation(email: string): Promise<EmailValidationResult> {
  try {
    const response = await fetch(`/api/validate/email?email=${encodeURIComponent(email)}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Email validation API error:', error);
    
    // Fallback: ritorna risultato basato su validazione locale
    return {
      email,
      status: 'unknown',
      isValid: true,
      isDeliverable: true,
      isSyntaxValid: true,
      isDomainValid: true,
      isDisposable: isDisposableDomain(email),
      isRoleBased: isRoleBasedEmail(email),
      isCatchAll: false,
      isFree: isFreeEmailProvider(email),
      score: 50,
      processedAt: new Date().toISOString(),
      _fallback: true,
    };
  }
}

/**
 * Mappa lo status di ZeroBounce in deliverability semplificata
 */
function mapDeliverability(result: EmailValidationResult): EmailDeliverability {
  if (!result.isValid) return 'undeliverable';
  if (result.isCatchAll) return 'risky';
  if (result.status === 'unknown') return 'unknown';
  if (result.isDeliverable) return 'deliverable';
  return 'undeliverable';
}

/**
 * Crea un debounced validator
 */
export function createDebouncedEmailValidator(
  callback: (result: SimplifiedEmailValidation) => void,
  delay: number = 300
) {
  let timeoutId: NodeJS.Timeout | null = null;
  let abortController: AbortController | null = null;

  return (email: string) => {
    // Cancella timeout precedente
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    // Cancella richiesta precedente
    if (abortController) {
      abortController.abort();
    }

    // Validazione immediata per sintassi
    const syntaxCheck = validateEmailSyntax(email);
    if (!syntaxCheck.valid) {
      callback({
        valid: false,
        deliverable: 'undeliverable',
        disposable: false,
        catch_all: false,
        role_based: false,
        free: false,
        score: 0,
      });
      return;
    }

    // Debounced validation
    timeoutId = setTimeout(async () => {
      try {
        const result = await validateEmailRealTime(email);
        callback(result);
      } catch (error) {
        callback({
          valid: true, // Fallback su errore
          deliverable: 'unknown',
          disposable: false,
          catch_all: false,
          role_based: false,
          free: false,
          score: 50,
        });
      }
    }, delay);
  };
}

// Export di utilità
export {
  EMAIL_REGEX,
  DEFAULT_OPTIONS,
};
