/**
 * Validation Controller
 * Espone endpoint HTTP per validazione Email, VAT e Indirizzi
 * con rate limiting e cache Redis
 */

import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Headers,
  HttpException,
  HttpStatus,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { ZeroBounceService, EmailVerificationResult } from './zerobounce';
import { ViesApiService, ViesVerificationResult } from './viesApi';
import { GooglePlacesService, AddressPrediction, AddressDetails } from './googlePlaces';

// Rate limiting types
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// DTOs
export interface EmailValidationDto {
  email: string;
}

export interface VatValidationDto {
  vatNumber: string;
  countryCode?: string;
}

export interface AddressAutocompleteDto {
  input: string;
  language?: string;
}

export interface AddressDetailsDto {
  placeId: string;
}

// Extended result types con suggestion
export interface EmailValidationResultWithSuggestion extends EmailVerificationResult {
  suggestion?: string;
  typoCorrected?: string;
}

@Controller('api/validation')
export class ValidationController {
  private readonly logger = new Logger(ValidationController.name);
  private readonly redis: Redis;
  private readonly isDevelopment: boolean;
  private readonly rateLimits: Map<string, RateLimitEntry> = new Map();
  
  // Rate limit config
  private readonly RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto
  private readonly RATE_LIMIT_MAX_REQUESTS = 10; // 10 richieste per minuto per IP

  constructor(
    private readonly configService: ConfigService,
    private readonly zeroBounceService: ZeroBounceService,
    private readonly viesApiService: ViesApiService,
    private readonly googlePlacesService: GooglePlacesService,
  ) {
    this.isDevelopment = this.configService.get('NODE_ENV') === 'development';
    
    const redisUrl = this.configService.get('REDIS_URL') || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl, {
      password: this.configService.get('REDIS_PASSWORD') || undefined,
      db: parseInt(this.configService.get('REDIS_DB') || '0'),
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });

    this.redis.on('error', (err) => {
      this.logger.error('Redis connection error:', err.message);
    });
  }

  // ==================== EMAIL VALIDATION ====================

  @Get('email')
  async validateEmail(
    @Query('email') email: string,
    @Headers('x-forwarded-for') forwardedFor: string,
    @Headers('x-real-ip') realIp: string,
  ): Promise<EmailValidationResultWithSuggestion> {
    // Rate limiting check
    const clientIp = this.getClientIp(forwardedFor, realIp);
    if (!this.checkRateLimit(clientIp)) {
      throw new HttpException(
        'Rate limit exceeded. Maximum 10 requests per minute.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!email || typeof email !== 'string') {
      throw new HttpException('Email parameter is required', HttpStatus.BAD_REQUEST);
    }

    const normalizedEmail = email.trim().toLowerCase();
    
    // Basic regex validation first
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return {
        email: normalizedEmail,
        status: 'invalid',
        isValid: false,
        isDeliverable: false,
        isSyntaxValid: false,
        isDomainValid: false,
        isDisposable: false,
        isRoleBased: false,
        isCatchAll: false,
        isFree: false,
        score: 0,
        processedAt: new Date(),
        suggestion: this.getTypoSuggestion(normalizedEmail),
      };
    }

    // Check cache
    const cacheKey = `validation:email:${Buffer.from(normalizedEmail).toString('base64')}`;
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for email validation: ${normalizedEmail}`);
        return JSON.parse(cached);
      }
    } catch (error) {
      this.logger.warn('Cache read error:', error.message);
    }

    try {
      const result = await this.zeroBounceService.verifyEmail(normalizedEmail);
      
      // Check for typos and add suggestion
      const suggestion = this.getTypoSuggestion(normalizedEmail);
      const resultWithSuggestion: EmailValidationResultWithSuggestion = {
        ...result,
        suggestion: suggestion !== normalizedEmail ? suggestion : undefined,
        typoCorrected: suggestion !== normalizedEmail ? suggestion : undefined,
      };

      // Cache result for 1 hour
      try {
        await this.redis.setex(cacheKey, 3600, JSON.stringify(resultWithSuggestion));
      } catch (error) {
        this.logger.warn('Cache write error:', error.message);
      }

      return resultWithSuggestion;
    } catch (error) {
      this.logger.error(`Email validation error for ${normalizedEmail}:`, error.message);
      
      // Fallback response
      return {
        email: normalizedEmail,
        status: 'unknown',
        isValid: true, // Allow through on API error
        isDeliverable: true,
        isSyntaxValid: true,
        isDomainValid: true,
        isDisposable: false,
        isRoleBased: false,
        isCatchAll: false,
        isFree: this.isFreeEmailProvider(normalizedEmail),
        score: 50,
        processedAt: new Date(),
      };
    }
  }

  // ==================== VAT VALIDATION ====================

  @Post('vat')
  async validateVat(
    @Body() dto: VatValidationDto,
    @Headers('x-forwarded-for') forwardedFor: string,
    @Headers('x-real-ip') realIp: string,
  ): Promise<ViesVerificationResult & { isValidFormat: boolean; luhnValid: boolean }> {
    // Rate limiting check
    const clientIp = this.getClientIp(forwardedFor, realIp);
    if (!this.checkRateLimit(clientIp)) {
      throw new HttpException(
        'Rate limit exceeded. Maximum 10 requests per minute.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!dto.vatNumber || typeof dto.vatNumber !== 'string') {
      throw new HttpException('VAT number is required', HttpStatus.BAD_REQUEST);
    }

    const vatNumber = this.normalizeVatNumber(dto.vatNumber);
    const countryCode = dto.countryCode?.toUpperCase() || this.extractCountryCode(vatNumber) || 'IT';
    const cleanVat = this.extractVatNumber(vatNumber, countryCode);
    const fullVat = `${countryCode}${cleanVat}`;

    // Validate format
    const isValidFormat = this.isValidVatFormat(countryCode, cleanVat);
    const luhnValid = countryCode === 'IT' ? this.validateItalianLuhn(cleanVat) : true;

    if (!isValidFormat) {
      return {
        valid: false,
        countryCode,
        vatNumber: cleanVat,
        requestDate: new Date(),
        isValidFormat: false,
        luhnValid: false,
      };
    }

    // Check cache
    const cacheKey = `validation:vat:${fullVat}`;
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for VAT validation: ${fullVat}`);
        const parsed = JSON.parse(cached);
        return { ...parsed, isValidFormat, luhnValid };
      }
    } catch (error) {
      this.logger.warn('Cache read error:', error.message);
    }

    try {
      const result = await this.viesApiService.verifyVatNumber(fullVat);
      
      const response = {
        ...result,
        isValidFormat,
        luhnValid,
      };

      // Cache result for 24 hours
      try {
        await this.redis.setex(cacheKey, 24 * 3600, JSON.stringify(response));
      } catch (error) {
        this.logger.warn('Cache write error:', error.message);
      }

      return response;
    } catch (error) {
      this.logger.error(`VAT validation error for ${fullVat}:`, error.message);
      
      return {
        valid: luhnValid, // Trust Luhn if API fails
        countryCode,
        vatNumber: cleanVat,
        requestDate: new Date(),
        isValidFormat,
        luhnValid,
      };
    }
  }

  // ==================== ADDRESS VALIDATION ====================

  @Get('address/autocomplete')
  async autocompleteAddress(
    @Query('input') input: string,
    @Query('language') language: string = 'it',
    @Headers('x-forwarded-for') forwardedFor: string,
    @Headers('x-real-ip') realIp: string,
  ): Promise<{ predictions: AddressPrediction[] }> {
    // Rate limiting check
    const clientIp = this.getClientIp(forwardedFor, realIp);
    if (!this.checkRateLimit(clientIp)) {
      throw new HttpException(
        'Rate limit exceeded. Maximum 10 requests per minute.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!input || input.length < 3) {
      return { predictions: [] };
    }

    // Check cache
    const cacheKey = `validation:address:${language}:${Buffer.from(input).toString('base64')}`;
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for address autocomplete: ${input}`);
        return JSON.parse(cached);
      }
    } catch (error) {
      this.logger.warn('Cache read error:', error.message);
    }

    try {
      const result = await this.googlePlacesService.autocompleteAddress(input, {
        language,
        components: 'country:it',
      });

      // Cache for 24 hours
      try {
        await this.redis.setex(cacheKey, 24 * 3600, JSON.stringify(result));
      } catch (error) {
        this.logger.warn('Cache write error:', error.message);
      }

      return result;
    } catch (error) {
      this.logger.error('Address autocomplete error:', error.message);
      return { predictions: [] };
    }
  }

  @Get('address/details')
  async getAddressDetails(
    @Query('placeId') placeId: string,
    @Headers('x-forwarded-for') forwardedFor: string,
    @Headers('x-real-ip') realIp: string,
  ): Promise<AddressDetails> {
    // Rate limiting check
    const clientIp = this.getClientIp(forwardedFor, realIp);
    if (!this.checkRateLimit(clientIp)) {
      throw new HttpException(
        'Rate limit exceeded. Maximum 10 requests per minute.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!placeId) {
      throw new HttpException('Place ID is required', HttpStatus.BAD_REQUEST);
    }

    // Check cache
    const cacheKey = `validation:address:details:${placeId}`;
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for address details: ${placeId}`);
        return JSON.parse(cached);
      }
    } catch (error) {
      this.logger.warn('Cache read error:', error.message);
    }

    try {
      const result = await this.googlePlacesService.getPlaceDetails(placeId);

      // Cache for 30 days
      try {
        await this.redis.setex(cacheKey, 30 * 24 * 3600, JSON.stringify(result));
      } catch (error) {
        this.logger.warn('Cache write error:', error.message);
      }

      return result;
    } catch (error) {
      this.logger.error('Address details error:', error.message);
      throw new HttpException(
        'Failed to fetch address details',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('postalcode/validate')
  async validatePostalCode(
    @Query('code') code: string,
    @Headers('x-forwarded-for') forwardedFor: string,
    @Headers('x-real-ip') realIp: string,
  ): Promise<{ valid: boolean; city?: string; province?: string; region?: string }> {
    // Rate limiting check
    const clientIp = this.getClientIp(forwardedFor, realIp);
    if (!this.checkRateLimit(clientIp)) {
      throw new HttpException(
        'Rate limit exceeded. Maximum 10 requests per minute.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!code || !/^\d{5}$/.test(code)) {
      return { valid: false };
    }

    return this.googlePlacesService.validatePostalCode(code);
  }

  // ==================== PRIVATE HELPERS ====================

  private getClientIp(forwardedFor: string, realIp: string): string {
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }
    if (realIp) {
      return realIp;
    }
    return 'unknown';
  }

  private checkRateLimit(clientIp: string): boolean {
    const now = Date.now();
    const entry = this.rateLimits.get(clientIp);

    if (!entry || now > entry.resetTime) {
      // New window
      this.rateLimits.set(clientIp, {
        count: 1,
        resetTime: now + this.RATE_LIMIT_WINDOW,
      });
      return true;
    }

    if (entry.count >= this.RATE_LIMIT_MAX_REQUESTS) {
      return false;
    }

    entry.count++;
    return true;
  }

  private getTypoSuggestion(email: string): string {
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
    };

    const parts = email.split('@');
    if (parts.length !== 2) return email;

    const domain = parts[1].toLowerCase();
    const correctedDomain = commonTypos[domain];
    
    if (correctedDomain) {
      return `${parts[0]}@${correctedDomain}`;
    }

    return email;
  }

  private isFreeEmailProvider(email: string): boolean {
    const freeDomains = [
      'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
      'libero.it', 'virgilio.it', 'tiscali.it', 'alice.it',
      'live.com', 'icloud.com', 'me.com', 'mac.com',
      'protonmail.com', 'zoho.com', 'yandex.com', 'mail.com',
    ];
    
    const domain = email.split('@')[1]?.toLowerCase();
    return domain ? freeDomains.includes(domain) : false;
  }

  private normalizeVatNumber(vat: string): string {
    return vat.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  }

  private extractCountryCode(vat: string): string | null {
    if (vat.length < 2) return null;
    const code = vat.substring(0, 2);
    return /^[A-Z]{2}$/i.test(code) ? code.toUpperCase() : null;
  }

  private extractVatNumber(vat: string, countryCode: string): string {
    if (vat.startsWith(countryCode)) {
      return vat.substring(2);
    }
    return vat;
  }

  private isValidVatFormat(countryCode: string, vatNumber: string): boolean {
    const patterns: Record<string, RegExp> = {
      'IT': /^\d{11}$/, // 11 cifre per Italia
      'DE': /^\d{9}$/,  // 9 cifre per Germania
      'FR': /^[A-Z0-9]{2}\d{9}$/, // FR + 9 cifre
      'ES': /^[A-Z]\d{8}$|^\d{8}[A-Z]$/, // Spagna
      'GB': /^\d{9}$|^\d{12}$|^GD\d{3}$|^HA\d{3}$/, // UK
    };

    const pattern = patterns[countryCode];
    if (!pattern) return /^[A-Z0-9]{8,12}$/.test(vatNumber); // Generic pattern
    
    return pattern.test(vatNumber);
  }

  private validateItalianLuhn(vatNumber: string): boolean {
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

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}
