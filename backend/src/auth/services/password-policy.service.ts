import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { createHash } from 'crypto';

/**
 * NIST 800-63B Rev 4 (2024) compliant password policy.
 *
 * Key rules:
 * - Minimum 8 characters (NIST SHALL), recommend 15+
 * - Maximum at least 64 characters supported
 * - NO complexity rules (no forced uppercase/special/number)
 * - MUST check against breached password databases (HaveIBeenPwned)
 * - MUST check against common/context-specific passwords
 * - NO periodic rotation requirements
 * - Unicode NFKC normalization
 */
@Injectable()
export class PasswordPolicyService {
  private readonly logger = new Logger(PasswordPolicyService.name);

  private static readonly MIN_LENGTH = 8;
  private static readonly RECOMMENDED_LENGTH = 15;
  private static readonly MAX_LENGTH = 128;

  /** Top common passwords to block (subset — HaveIBeenPwned catches the rest) */
  private static readonly COMMON_PASSWORDS = new Set([
    'password',
    'password1',
    '12345678',
    '123456789',
    '1234567890',
    'qwerty123',
    'iloveyou',
    'admin123',
    'welcome1',
    'letmein',
    'monkey123',
    'dragon12',
    'master12',
    'qwerty12',
    'login123',
    'princess',
    'football',
    'shadow12',
    'sunshine',
    'trustno1',
    'password123',
    'admin1234',
    'welcome123',
    'abc12345',
    'test1234',
  ]);

  /**
   * Validate password against NIST 800-63B policy.
   * Throws BadRequestException with Italian error message if invalid.
   */
  async validatePassword(
    password: string,
    context?: { email?: string; name?: string; shopName?: string },
  ): Promise<{ valid: true; strength: 'weak' | 'fair' | 'strong' }> {
    // 1. Normalize Unicode (NFKC as per NIST)
    const normalized = password.normalize('NFKC');

    // 2. Length check
    if (normalized.length < PasswordPolicyService.MIN_LENGTH) {
      throw new BadRequestException(
        `La password deve avere almeno ${PasswordPolicyService.MIN_LENGTH} caratteri`,
      );
    }

    if (normalized.length > PasswordPolicyService.MAX_LENGTH) {
      throw new BadRequestException(
        `La password non può superare ${PasswordPolicyService.MAX_LENGTH} caratteri`,
      );
    }

    // 3. Block sequential/repetitive patterns
    if (/^(.)\1+$/.test(normalized)) {
      throw new BadRequestException(
        'La password non può essere composta da un singolo carattere ripetuto',
      );
    }
    if (this.isSequential(normalized)) {
      throw new BadRequestException(
        'La password non può essere una sequenza numerica o alfabetica',
      );
    }

    // 4. Block common passwords
    if (PasswordPolicyService.COMMON_PASSWORDS.has(normalized.toLowerCase())) {
      throw new BadRequestException('Questa password è troppo comune. Scegline una più unica.');
    }

    // 5. Block context-specific passwords (username, email, shop name)
    if (context) {
      const contextWords = [
        context.email?.split('@')[0],
        context.name,
        context.shopName,
        'mechmind',
        'officina',
      ]
        .filter(Boolean)
        .map(w => w!.toLowerCase());

      for (const word of contextWords) {
        if (word.length >= 4 && normalized.toLowerCase().includes(word)) {
          throw new BadRequestException(
            "La password non può contenere il tuo nome, email o il nome dell'officina",
          );
        }
      }
    }

    // 6. Check HaveIBeenPwned (k-anonymity — only first 5 chars of SHA1 sent)
    const breachResult = await this.checkBreachedPassword(normalized);
    if (breachResult.breached) {
      throw new BadRequestException(
        `Questa password è apparsa in ${breachResult.count.toLocaleString('it-IT')} violazioni di dati. Scegline un'altra.`,
      );
    }

    // 7. Strength assessment (informational, not blocking)
    const strength = this.assessStrength(normalized);

    return { valid: true, strength };
  }

  /**
   * Check password against HaveIBeenPwned using k-anonymity model.
   * Only the first 5 characters of the SHA-1 hash are sent to the API.
   * The full hash never leaves the server.
   */
  async checkBreachedPassword(password: string): Promise<{ breached: boolean; count: number }> {
    try {
      const sha1 = createHash('sha1').update(password).digest('hex').toUpperCase();
      const prefix = sha1.substring(0, 5);
      const suffix = sha1.substring(5);

      const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
        headers: { 'Add-Padding': 'true' },
        signal: AbortSignal.timeout(3000), // 3s timeout — don't block registration
      });

      if (!response.ok) {
        // API down — allow the password (fail open, registration will still work)
        this.logger.warn(`HaveIBeenPwned API returned ${response.status}`);
        return { breached: false, count: 0 };
      }

      const text = await response.text();
      const lines = text.split('\r\n');
      for (const line of lines) {
        const [hashSuffix, countStr] = line.split(':');
        if (hashSuffix === suffix) {
          const count = parseInt(countStr, 10);
          if (count > 0) {
            return { breached: true, count };
          }
        }
      }

      return { breached: false, count: 0 };
    } catch (_error) {
      // Network error — fail open (don't block registration if HIBP is down)
      this.logger.warn('HaveIBeenPwned API unreachable, skipping breach check');
      return { breached: false, count: 0 };
    }
  }

  /**
   * Assess password strength (informational only, NOT for blocking).
   * NIST says don't require complexity, but users appreciate feedback.
   */
  private assessStrength(password: string): 'weak' | 'fair' | 'strong' {
    let score = 0;
    if (password.length >= 12) score++;
    if (password.length >= PasswordPolicyService.RECOMMENDED_LENGTH) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    // Bonus for length over 20
    if (password.length >= 20) score++;

    if (score <= 2) return 'weak';
    if (score <= 4) return 'fair';
    return 'strong';
  }

  /** Detect sequential patterns like 12345678, abcdefgh */
  private isSequential(password: string): boolean {
    if (password.length < 8) return false;
    const lower = password.toLowerCase();
    let ascending = true;
    let descending = true;
    for (let i = 1; i < lower.length; i++) {
      if (lower.charCodeAt(i) !== lower.charCodeAt(i - 1) + 1) ascending = false;
      if (lower.charCodeAt(i) !== lower.charCodeAt(i - 1) - 1) descending = false;
    }
    return ascending || descending;
  }
}
