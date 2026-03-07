/**
 * ZeroBounce Email Verification Service
 * Verifica email in tempo reale con multiple check
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface EmailVerificationResult {
  email: string;
  status: 'valid' | 'invalid' | 'catch-all' | 'unknown' | 'spamtrap' | 'abuse' | 'do_not_mail';
  subStatus?: string;
  isValid: boolean;
  isDeliverable: boolean;
  isSyntaxValid: boolean;
  isDomainValid: boolean;
  isDisposable: boolean;
  isRoleBased: boolean;
  isCatchAll: boolean;
  isFree: boolean;
  score: number; // 0-100
  mxRecord?: string;
  smtpProvider?: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  country?: string;
  region?: string;
  city?: string;
  zipcode?: string;
  processedAt: Date;
}

export interface BulkVerificationResult {
  id: string;
  fileName: string;
  status: 'pending' | 'completed' | 'error';
  totalEmails: number;
  validEmails: number;
  invalidEmails: number;
  completedAt?: Date;
}

@Injectable()
export class ZeroBounceService {
  private readonly logger = new Logger(ZeroBounceService.name);
  private readonly redis: Redis;
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.zerobounce.net/v2';
  private readonly bulkUrl = 'https://bulkapi.zerobounce.net/v2';
  private readonly cacheTtlSeconds = 7 * 24 * 60 * 60; // 7 giorni
  private readonly isDevelopment: boolean;
  private requestTimestamps: number[] = [];
  private readonly rateLimitWindow = 60000; // 1 minuto
  private readonly rateLimitMax = 20; // 20 check email/minuto

  constructor(private readonly configService: ConfigService) {
    this.isDevelopment = this.configService.get('NODE_ENV') === 'development';
    this.apiKey = this.configService.get('ZEROBOUNCE_API_KEY') || '';
    
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

  /**
   * Verifica singola email in tempo reale
   */
  async verifyEmail(email: string, ipAddress?: string): Promise<EmailVerificationResult> {
    const normalizedEmail = this.normalizeEmail(email);
    
    if (!this.isValidEmailFormat(normalizedEmail)) {
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
      };
    }

    // Check cache
    const cacheKey = `email:verification:${Buffer.from(normalizedEmail).toString('base64')}`;
    const cached = await this.getCached<EmailVerificationResult>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for email: ${normalizedEmail}`);
      return cached;
    }

    // Rate limiting
    if (!this.checkRateLimit()) {
      this.logger.warn('Email verification rate limit exceeded');
      if (this.isDevelopment) {
        return this.getMockResult(normalizedEmail);
      }
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    if (this.isDevelopment && !this.apiKey) {
      const mockResult = this.getMockResult(normalizedEmail);
      await this.setCached(cacheKey, mockResult);
      return mockResult;
    }

    try {
      const params = new URLSearchParams({
        api_key: this.apiKey,
        email: normalizedEmail,
      });

      if (ipAddress) {
        params.append('ip_address', ipAddress);
      }

      const response = await fetch(
        `${this.baseUrl}/validate?${params.toString()}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        throw new Error(`ZeroBounce API HTTP error: ${response.status}`);
      }

      const data = await response.json();
      const result = this.parseApiResponse(normalizedEmail, data);

      // Cache valid and invalid results (not unknown)
      if (result.status !== 'unknown') {
        await this.setCached(cacheKey, result);
      }

      return result;
    } catch (error) {
      this.logger.error(`Email verification error for ${normalizedEmail}:`, error.message);
      
      if (this.isDevelopment) {
        return this.getMockResult(normalizedEmail);
      }
      
      throw error;
    }
  }

  /**
   * Verifica multipla email
   */
  async verifyMultipleEmails(emails: string[]): Promise<Map<string, EmailVerificationResult>> {
    const results = new Map<string, EmailVerificationResult>();
    
    // Process in batches
    const batchSize = 5;
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(email => this.verifyEmail(email))
      );
      
      batch.forEach((email, index) => {
        const result = batchResults[index];
        if (result.status === 'fulfilled') {
          results.set(email, result.value);
        } else {
          results.set(email, {
            email,
            status: 'unknown',
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
          });
        }
      });
      
      if (i + batchSize < emails.length) {
        await this.delay(1000);
      }
    }
    
    return results;
  }

  /**
   * Verifica bulk via file upload
   */
  async uploadBulkVerification(
    fileBuffer: Buffer,
    fileName: string
  ): Promise<BulkVerificationResult> {
    if (this.isDevelopment && !this.apiKey) {
      return {
        id: `mock-${Date.now()}`,
        fileName,
        status: 'completed',
        totalEmails: 100,
        validEmails: 85,
        invalidEmails: 15,
        completedAt: new Date(),
      };
    }

    try {
      // Use multipart form data for file upload
      const boundary = `----FormBoundary${Math.random().toString(36).substring(2)}`;
      const chunks: Buffer[] = [];
      
      // Add api_key field
      chunks.push(Buffer.from(`--${boundary}\r\n`));
      chunks.push(Buffer.from(`Content-Disposition: form-data; name="api_key"\r\n\r\n`));
      chunks.push(Buffer.from(`${this.apiKey}\r\n`));
      
      // Add file field
      chunks.push(Buffer.from(`--${boundary}\r\n`));
      chunks.push(Buffer.from(`Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`));
      chunks.push(Buffer.from(`Content-Type: text/csv\r\n\r\n`));
      chunks.push(fileBuffer);
      chunks.push(Buffer.from(`\r\n--${boundary}--\r\n`));
      
      const body = Buffer.concat(chunks);

      const response = await fetch(`${this.bulkUrl}/sendfile`, {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': body.length.toString(),
        },
        body: body as any,
      });

      if (!response.ok) {
        throw new Error(`ZeroBounce Bulk API HTTP error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success === false) {
        throw new Error(`ZeroBounce Bulk API error: ${data.message}`);
      }

      return {
        id: data.file_id,
        fileName,
        status: 'pending',
        totalEmails: data.total_emails || 0,
        validEmails: 0,
        invalidEmails: 0,
      };
    } catch (error) {
      this.logger.error('Bulk upload error:', error.message);
      throw error;
    }
  }

  /**
   * Check stato verifica bulk
   */
  async getBulkStatus(fileId: string): Promise<BulkVerificationResult> {
    if (this.isDevelopment && fileId.startsWith('mock-')) {
      return {
        id: fileId,
        fileName: 'mock.csv',
        status: 'completed',
        totalEmails: 100,
        validEmails: 85,
        invalidEmails: 15,
        completedAt: new Date(),
      };
    }

    try {
      const params = new URLSearchParams({
        api_key: this.apiKey,
        file_id: fileId,
      });

      const response = await fetch(
        `${this.bulkUrl}/filestatus?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`ZeroBounce Status API HTTP error: ${response.status}`);
      }

      const data = await response.json();
      
      const statusMap: Record<string, BulkVerificationResult['status']> = {
        'Pending': 'pending',
        'Processing': 'pending',
        'Completed': 'completed',
        'Error': 'error',
      };

      return {
        id: fileId,
        fileName: data.file_name || '',
        status: statusMap[data.status] || 'error',
        totalEmails: data.total_emails || 0,
        validEmails: data.complete_percentage || 0,
        invalidEmails: 0,
      };
    } catch (error) {
      this.logger.error('Bulk status error:', error.message);
      throw error;
    }
  }

  /**
   * Scarica risultati verifica bulk
   */
  async downloadBulkResults(fileId: string): Promise<Buffer> {
    if (this.isDevelopment && fileId.startsWith('mock-')) {
      return Buffer.from('email,status\ntest@example.com,valid');
    }

    try {
      const params = new URLSearchParams({
        api_key: this.apiKey,
        file_id: fileId,
      });

      const response = await fetch(
        `${this.bulkUrl}/getfile?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`ZeroBounce Download API HTTP error: ${response.status}`);
      }

      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      this.logger.error('Bulk download error:', error.message);
      throw error;
    }
  }

  /**
   * Ottieni crediti rimanenti
   */
  async getCredits(): Promise<{ credits: number }> {
    if (this.isDevelopment && !this.apiKey) {
      return { credits: 999999 };
    }

    try {
      const params = new URLSearchParams({
        api_key: this.apiKey,
      });

      const response = await fetch(
        `${this.baseUrl}/getcredits?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`ZeroBounce Credits API HTTP error: ${response.status}`);
      }

      const data = await response.json();
      return { credits: data.credits || 0 };
    } catch (error) {
      this.logger.error('Get credits error:', error.message);
      return { credits: 0 };
    }
  }

  /**
   * Check sintassi email (locale, senza API)
   */
  validateSyntax(email: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const normalizedEmail = this.normalizeEmail(email);

    // Regex base per email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!normalizedEmail) {
      errors.push('Email is empty');
      return { valid: false, errors };
    }

    if (normalizedEmail.length > 254) {
      errors.push('Email exceeds maximum length of 254 characters');
    }

    if (!emailRegex.test(normalizedEmail)) {
      errors.push('Invalid email format');
    }

    const [localPart, domain] = normalizedEmail.split('@');

    if (!localPart || localPart.length > 64) {
      errors.push('Local part exceeds 64 characters or is empty');
    }

    if (!domain) {
      errors.push('Domain is missing');
    } else {
      // Check domain has valid TLD
      const domainParts = domain.split('.');
      if (domainParts.length < 2) {
        errors.push('Domain must have a TLD');
      }

      const tld = domainParts[domainParts.length - 1];
      if (!/^[a-zA-Z]{2,}$/.test(tld)) {
        errors.push('Invalid TLD');
      }
    }

    // Check disposable domains (lista base)
    const disposableDomains = [
      'tempmail.com', 'throwaway.com', 'mailinator.com',
      'guerrillamail.com', '10minutemail.com', 'yopmail.com',
    ];
    
    if (domain && disposableDomains.includes(domain.toLowerCase())) {
      errors.push('Disposable email addresses are not allowed');
    }

    return { valid: errors.length === 0, errors };
  }

  // ==================== PRIVATE HELPERS ====================

  private parseApiResponse(email: string, data: any): EmailVerificationResult {
    const statusMap: Record<string, EmailVerificationResult['status']> = {
      'valid': 'valid',
      'invalid': 'invalid',
      'catch-all': 'catch-all',
      'unknown': 'unknown',
      'spamtrap': 'spamtrap',
      'abuse': 'abuse',
      'do_not_mail': 'do_not_mail',
    };

    return {
      email,
      status: statusMap[data.status] || 'unknown',
      subStatus: data.sub_status,
      isValid: data.status === 'valid',
      isDeliverable: ['valid', 'catch-all'].includes(data.status),
      isSyntaxValid: true, // Se arriva qui, la sintassi è valida
      isDomainValid: !['invalid_domain', 'invalid_email'].includes(data.sub_status),
      isDisposable: data.disposable || false,
      isRoleBased: data.role || false,
      isCatchAll: data.status === 'catch-all',
      isFree: data.free || false,
      score: parseInt(data.zerobounce_score) || 0,
      mxRecord: data.mx_record,
      smtpProvider: data.smtp_provider,
      firstName: data.firstname,
      lastName: data.lastname,
      gender: data.gender,
      country: data.country,
      region: data.region,
      city: data.city,
      zipcode: data.zipcode,
      processedAt: new Date(),
    };
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private isValidEmailFormat(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  private checkRateLimit(): boolean {
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter(
      timestamp => now - timestamp < this.rateLimitWindow
    );
    
    if (this.requestTimestamps.length >= this.rateLimitMax) {
      return false;
    }
    
    this.requestTimestamps.push(now);
    return true;
  }

  private async getCached<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      this.logger.warn('Cache get error:', error.message);
      return null;
    }
  }

  private async setCached<T>(key: string, value: T): Promise<void> {
    try {
      await this.redis.setex(key, this.cacheTtlSeconds, JSON.stringify(value));
    } catch (error) {
      this.logger.warn('Cache set error:', error.message);
    }
  }

  private getMockResult(email: string): EmailVerificationResult {
    const validDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'mechmind.io', 'company.com'];
    const disposableDomains = ['tempmail.com', 'throwaway.com', 'mailinator.com'];
    const roleBased = ['info@', 'admin@', 'support@', 'sales@', 'contact@'];
    
    const domain = email.split('@')[1] || '';
    const isDisposable = disposableDomains.includes(domain);
    const isRoleBased = roleBased.some(role => email.startsWith(role));
    const isValid = validDomains.includes(domain) && !isDisposable;

    return {
      email,
      status: isValid ? 'valid' : isDisposable ? 'do_not_mail' : 'invalid',
      isValid,
      isDeliverable: isValid,
      isSyntaxValid: true,
      isDomainValid: !isDisposable,
      isDisposable,
      isRoleBased,
      isCatchAll: false,
      isFree: ['gmail.com', 'yahoo.com', 'outlook.com'].includes(domain),
      score: isValid ? 95 : isDisposable ? 0 : 30,
      processedAt: new Date(),
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}

// Standalone function
export async function verifyEmail(
  email: string,
  config?: { apiKey?: string; redisUrl?: string }
): Promise<EmailVerificationResult> {
  const service = new ZeroBounceService({
    get: (key: string) => {
      const configs: Record<string, string> = {
        ZEROBOUNCE_API_KEY: config?.apiKey || '',
        NODE_ENV: config?.apiKey ? 'production' : 'development',
        REDIS_URL: config?.redisUrl || 'redis://localhost:6379',
      };
      return configs[key];
    },
  } as ConfigService);

  try {
    return await service.verifyEmail(email);
  } finally {
    await service.onModuleDestroy();
  }
}
