/**
 * Twilio Phone Verification Service
 * Formattazione E.164, validazione, lookup carrier e SMS OTP
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import TwilioClient from 'twilio';
import { PhoneNumberInstance } from 'twilio/lib/rest/lookups/v2/phoneNumber';

export interface PhoneValidationResult {
  phoneNumber: string;
  formattedNumber: string;
  isValid: boolean;
  isMobile: boolean;
  isLandline: boolean;
  isVoip: boolean;
  carrier?: string;
  countryCode: string;
  countryName?: string;
  nationalFormat?: string;
  callerName?: string;
}

export interface SmsVerificationResult {
  success: boolean;
  sid?: string;
  status: 'pending' | 'approved' | 'canceled' | 'error';
  message?: string;
}

export interface OtpVerificationResult {
  success: boolean;
  valid: boolean;
  message?: string;
}

export interface OtpSession {
  phoneNumber: string;
  code: string;
  attempts: number;
  expiresAt: Date;
  verified: boolean;
}

@Injectable()
export class TwilioService {
  private readonly logger = new Logger(TwilioService.name);
  private readonly redis: Redis;
  private readonly twilio: TwilioClient.Twilio;
  private readonly accountSid: string;
  private readonly authToken: string;
  private readonly fromNumber: string;
  private readonly verifyServiceSid: string;
  private readonly isDevelopment: boolean;
  private readonly otpTtlSeconds = 10 * 60; // 10 minuti
  private readonly maxAttempts = 3;

  constructor(private readonly configService: ConfigService) {
    this.isDevelopment = this.configService.get('NODE_ENV') === 'development';
    this.accountSid = this.configService.get('TWILIO_ACCOUNT_SID') || '';
    this.authToken = this.configService.get('TWILIO_AUTH_TOKEN') || '';
    this.fromNumber = this.configService.get('TWILIO_PHONE_NUMBER') || '';
    this.verifyServiceSid = this.configService.get('TWILIO_VERIFY_SERVICE_SID') || '';

    this.twilio = TwilioClient(this.accountSid, this.authToken);

    const redisUrl = this.configService.get('REDIS_URL') || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl, {
      password: this.configService.get('REDIS_PASSWORD') || undefined,
      db: parseInt(this.configService.get('REDIS_DB') || '0'),
      retryStrategy: times => Math.min(times * 50, 2000),
    });

    this.redis.on('error', err => {
      this.logger.error('Redis connection error:', err.message);
    });
  }

  /**
   * Formatta numero in formato E.164
   */
  formatE164(phoneNumber: string, defaultCountry: string = 'IT'): string {
    // Rimuovi tutti i caratteri non numerici tranne il +
    let cleaned = phoneNumber.replace(/[^\d+]/g, '');

    // Se inizia con 00, sostituisci con +
    if (cleaned.startsWith('00')) {
      cleaned = '+' + cleaned.substring(2);
    }

    // Se non inizia con +, aggiungi prefisso paese
    if (!cleaned.startsWith('+')) {
      const countryPrefix = this.getCountryPrefix(defaultCountry);
      cleaned = countryPrefix + cleaned;
    }

    return cleaned;
  }

  /**
   * Valida numero telefonico
   */
  async validatePhoneNumber(
    phoneNumber: string,
    options?: { includeCarrier?: boolean; includeCallerName?: boolean },
  ): Promise<PhoneValidationResult> {
    const formattedNumber = this.formatE164(phoneNumber);

    // Check cache
    const cacheKey = `phone:validation:${Buffer.from(formattedNumber).toString('base64')}`;
    const cached = await this.getCached<PhoneValidationResult>(cacheKey);
    if (cached) {
      return cached;
    }

    if (this.isDevelopment && (!this.accountSid || !this.authToken)) {
      const mockResult = this.getMockValidationResult(formattedNumber);
      await this.setCached(cacheKey, mockResult, 24 * 60 * 60);
      return mockResult;
    }

    try {
      const lookup = await this.twilio.lookups.v2.phoneNumbers(formattedNumber).fetch({
        fields: [
          ...(options?.includeCarrier ? ['carrier'] : []),
          ...(options?.includeCallerName ? ['caller_name'] : []),
          'line_type_intelligence',
        ].join(','),
      });

      const result = this.parseLookupResult(formattedNumber, lookup);

      // Cache valid results
      if (result.isValid) {
        await this.setCached(cacheKey, result, 24 * 60 * 60);
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Phone validation error for ${formattedNumber}:`,
        // eslint-disable-next-line sonarjs/no-duplicate-string
        error instanceof Error ? error.message : 'Unknown error',
      );

      if ((error as Record<string, unknown>).code === 20404) {
        return {
          phoneNumber: formattedNumber,
          formattedNumber,
          isValid: false,
          isMobile: false,
          isLandline: false,
          isVoip: false,
          countryCode: this.extractCountryCode(formattedNumber),
        };
      }

      if (this.isDevelopment) {
        return this.getMockValidationResult(formattedNumber);
      }

      throw error;
    }
  }

  /**
   * Verifica se è un numero mobile
   */
  async isMobileNumber(phoneNumber: string): Promise<boolean> {
    const validation = await this.validatePhoneNumber(phoneNumber);
    return validation.isMobile;
  }

  /**
   * Invia SMS OTP (sistema custom)
   */
  async sendOtp(phoneNumber: string, template?: string): Promise<SmsVerificationResult> {
    const formattedNumber = this.formatE164(phoneNumber);
    const code = this.generateOtpCode();

    const session: OtpSession = {
      phoneNumber: formattedNumber,
      code,
      attempts: 0,
      expiresAt: new Date(Date.now() + this.otpTtlSeconds * 1000),
      verified: false,
    };

    // Save session to Redis
    await this.saveOtpSession(formattedNumber, session);

    // Use Twilio Verify if available, otherwise send custom SMS
    if (this.verifyServiceSid && !this.isDevelopment) {
      try {
        const verification = await this.twilio.verify.v2
          .services(this.verifyServiceSid)
          .verifications.create({ to: formattedNumber, channel: 'sms' });

        return {
          success: true,
          sid: verification.sid,
          status: 'pending',
        };
      } catch (error) {
        this.logger.error(
          'Twilio Verify error:',
          error instanceof Error ? error.message : 'Unknown error',
        );
        // Fallback to custom SMS
      }
    }

    // Custom SMS sending
    if (this.isDevelopment && (!this.accountSid || !this.authToken)) {
      this.logger.log(`[DEV] OTP for ${formattedNumber}: ${code}`);
      return {
        success: true,
        status: 'pending',
        message: 'OTP sent (check logs for development code)',
      };
    }

    try {
      const messageBody = template
        ? template.replace('{{code}}', code)
        : `Il tuo codice di verifica MechMind è: ${code}. Valido per 10 minuti.`;

      const message = await this.twilio.messages.create({
        body: messageBody,
        from: this.fromNumber,
        to: formattedNumber,
      });

      return {
        success: true,
        sid: message.sid,
        status: 'pending',
      };
    } catch (error) {
      this.logger.error(
        'SMS sending error:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      return {
        success: false,
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Verifica OTP (sistema custom)
   */
  async verifyOtp(phoneNumber: string, code: string): Promise<OtpVerificationResult> {
    const formattedNumber = this.formatE164(phoneNumber);

    // Check Twilio Verify first
    if (this.verifyServiceSid && !this.isDevelopment) {
      try {
        const verification = await this.twilio.verify.v2
          .services(this.verifyServiceSid)
          .verificationChecks.create({ to: formattedNumber, code });

        return {
          success: true,
          valid: verification.status === 'approved',
        };
      } catch (error) {
        this.logger.error(
          'Twilio Verify check error:',
          error instanceof Error ? error.message : 'Unknown error',
        );
        // Fallback to custom verification
      }
    }

    // Custom verification
    const session = await this.getOtpSession(formattedNumber);

    if (!session) {
      return { success: false, valid: false, message: 'Session not found or expired' };
    }

    if (new Date() > new Date(session.expiresAt)) {
      await this.deleteOtpSession(formattedNumber);
      return { success: false, valid: false, message: 'Code expired' };
    }

    if (session.attempts >= this.maxAttempts) {
      await this.deleteOtpSession(formattedNumber);
      return { success: false, valid: false, message: 'Too many attempts' };
    }

    // Increment attempts
    session.attempts++;
    await this.saveOtpSession(formattedNumber, session);

    if (session.code !== code) {
      return {
        success: false,
        valid: false,
        message: `Invalid code. ${this.maxAttempts - session.attempts} attempts remaining.`,
      };
    }

    // Mark as verified
    session.verified = true;
    await this.saveOtpSession(formattedNumber, session);

    return { success: true, valid: true };
  }

  /**
   * Reinvia OTP
   */
  async resendOtp(phoneNumber: string): Promise<SmsVerificationResult> {
    const formattedNumber = this.formatE164(phoneNumber);
    const session = await this.getOtpSession(formattedNumber);

    if (!session) {
      // No existing session, send new OTP
      return this.sendOtp(phoneNumber);
    }

    // Check if we should allow resend (cooldown 60 seconds)
    const timeSinceLastSend =
      Date.now() - (new Date(session.expiresAt).getTime() - this.otpTtlSeconds * 1000);
    if (timeSinceLastSend < 60000) {
      const waitSeconds = Math.ceil((60000 - timeSinceLastSend) / 1000);
      return {
        success: false,
        status: 'error',
        message: `Please wait ${waitSeconds} seconds before requesting a new code`,
      };
    }

    // Generate new code
    const newCode = this.generateOtpCode();
    session.code = newCode;
    session.attempts = 0;
    session.expiresAt = new Date(Date.now() + this.otpTtlSeconds * 1000);

    await this.saveOtpSession(formattedNumber, session);

    if (this.isDevelopment && (!this.accountSid || !this.authToken)) {
      this.logger.log(`[DEV] Resent OTP for ${formattedNumber}: ${newCode}`);
      return {
        success: true,
        status: 'pending',
        message: 'OTP resent (check logs for development code)',
      };
    }

    try {
      const message = await this.twilio.messages.create({
        body: `Il tuo nuovo codice di verifica MechMind è: ${newCode}. Valido per 10 minuti.`,
        from: this.fromNumber,
        to: formattedNumber,
      });

      return {
        success: true,
        sid: message.sid,
        status: 'pending',
      };
    } catch (error) {
      this.logger.error(
        'SMS resend error:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      return {
        success: false,
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Invia SMS generico
   */
  async sendSms(phoneNumber: string, message: string): Promise<SmsVerificationResult> {
    const formattedNumber = this.formatE164(phoneNumber);

    if (this.isDevelopment && (!this.accountSid || !this.authToken)) {
      this.logger.log(`[DEV] SMS to ${formattedNumber}: ${message}`);
      return {
        success: true,
        status: 'pending',
        message: 'SMS logged (development mode)',
      };
    }

    try {
      const result = await this.twilio.messages.create({
        body: message,
        from: this.fromNumber,
        to: formattedNumber,
      });

      return {
        success: true,
        sid: result.sid,
        status: 'pending',
      };
    } catch (error) {
      this.logger.error(
        'SMS send error:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      return {
        success: false,
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Ottieni info numero (batch)
   */
  async validateMultiplePhones(
    phoneNumbers: string[],
  ): Promise<Map<string, PhoneValidationResult>> {
    const results = new Map<string, PhoneValidationResult>();

    for (const phone of phoneNumbers) {
      try {
        const result = await this.validatePhoneNumber(phone);
        results.set(phone, result);
      } catch (error) {
        this.logger.error(
          `Validation error for ${phone}:`,
          error instanceof Error ? error.message : 'Unknown error',
        );
        results.set(phone, {
          phoneNumber: phone,
          formattedNumber: this.formatE164(phone),
          isValid: false,
          isMobile: false,
          isLandline: false,
          isVoip: false,
          countryCode: this.extractCountryCode(this.formatE164(phone)),
        });
      }

      // Rate limiting per Twilio
      await this.delay(100);
    }

    return results;
  }

  // ==================== PRIVATE HELPERS ====================

  private parseLookupResult(
    formattedNumber: string,
    lookup: PhoneNumberInstance,
  ): PhoneValidationResult {
    const lookupRecord = lookup as unknown as Record<string, Record<string, string>>;
    const lineType = lookupRecord.lineTypeIntelligence?.type;

    return {
      phoneNumber: lookup.phoneNumber,
      formattedNumber,
      isValid: lookup.valid || false,
      isMobile: lineType === 'mobile',
      isLandline: lineType === 'landline',
      isVoip: lineType === 'voip',
      carrier: lookupRecord.carrier?.name,
      countryCode: lookup.countryCode || '',
      countryName: lookup.countryCode || '',
      nationalFormat: lookup.nationalFormat || '',
      callerName: lookupRecord.callerName?.callerName,
    };
  }

  private getCountryPrefix(countryCode: string): string {
    const prefixes: Record<string, string> = {
      IT: '+39',
      US: '+1',
      GB: '+44',
      FR: '+33',
      DE: '+49',
      ES: '+34',
      CH: '+41',
      AT: '+43',
      NL: '+31',
      BE: '+32',
    };
    return prefixes[countryCode.toUpperCase()] || '+39';
  }

  private extractCountryCode(phoneNumber: string): string {
    if (phoneNumber.startsWith('+39')) return 'IT';
    if (phoneNumber.startsWith('+1')) return 'US';
    if (phoneNumber.startsWith('+44')) return 'GB';
    if (phoneNumber.startsWith('+33')) return 'FR';
    if (phoneNumber.startsWith('+49')) return 'DE';
    if (phoneNumber.startsWith('+34')) return 'ES';
    if (phoneNumber.startsWith('+41')) return 'CH';
    if (phoneNumber.startsWith('+43')) return 'AT';
    return 'IT';
  }

  private generateOtpCode(): string {
    // Generate 6-digit code
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async saveOtpSession(phoneNumber: string, session: OtpSession): Promise<void> {
    const key = `otp:session:${Buffer.from(phoneNumber).toString('base64')}`;
    await this.redis.setex(key, this.otpTtlSeconds, JSON.stringify(session));
  }

  private async getOtpSession(phoneNumber: string): Promise<OtpSession | null> {
    const key = `otp:session:${Buffer.from(phoneNumber).toString('base64')}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  private async deleteOtpSession(phoneNumber: string): Promise<void> {
    const key = `otp:session:${Buffer.from(phoneNumber).toString('base64')}`;
    await this.redis.del(key);
  }

  private async getCached<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      this.logger.warn(
        'Cache get error:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      return null;
    }
  }

  private async setCached<T>(key: string, value: T, ttl: number): Promise<void> {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      this.logger.warn(
        'Cache set error:',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  private getMockValidationResult(phoneNumber: string): PhoneValidationResult {
    const countryCode = this.extractCountryCode(phoneNumber);
    const isItalianMobile = phoneNumber.startsWith('+393');

    return {
      phoneNumber,
      formattedNumber: phoneNumber,
      isValid: phoneNumber.length >= 10,
      isMobile: isItalianMobile,
      isLandline: !isItalianMobile && countryCode === 'IT',
      isVoip: false,
      carrier: isItalianMobile ? 'TIM' : 'Telecom Italia',
      countryCode,
      countryName: this.getCountryName(countryCode),
      nationalFormat: phoneNumber.replace(/^\+\d{2}/, ''),
    };
  }

  private getCountryName(code: string): string {
    const names: Record<string, string> = {
      IT: 'Italy',
      US: 'United States',
      GB: 'United Kingdom',
      FR: 'France',
      DE: 'Germany',
      ES: 'Spain',
    };
    // eslint-disable-next-line security/detect-object-injection
    return names[code] || code;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}

// Standalone functions
export async function validatePhoneNumber(
  phoneNumber: string,
  config?: { accountSid?: string; authToken?: string },
): Promise<PhoneValidationResult> {
  const service = new TwilioService({
    get: (key: string) => {
      const configs: Record<string, string> = {
        TWILIO_ACCOUNT_SID: config?.accountSid || '',
        TWILIO_AUTH_TOKEN: config?.authToken || '',
        NODE_ENV: config?.accountSid ? 'production' : 'development',
        REDIS_URL: 'redis://localhost:6379',
      };
      // eslint-disable-next-line security/detect-object-injection
      return configs[key];
    },
  } as ConfigService);

  try {
    return await service.validatePhoneNumber(phoneNumber);
  } finally {
    await service.onModuleDestroy();
  }
}

export function formatE164(phoneNumber: string, defaultCountry: string = 'IT'): string {
  let cleaned = phoneNumber.replace(/[^\d+]/g, '');

  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.substring(2);
  }

  if (!cleaned.startsWith('+')) {
    const prefixes: Record<string, string> = {
      IT: '+39',
      US: '+1',
      GB: '+44',
      FR: '+33',
      DE: '+49',
      ES: '+34',
      CH: '+41',
      AT: '+43',
    };
    cleaned = (prefixes[defaultCountry.toUpperCase()] || '+39') + cleaned;
  }

  return cleaned;
}
