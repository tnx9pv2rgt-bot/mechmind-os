/**
 * zerobounce.spec.ts — Tests for ZeroBounce email verification service
 */

// Mock ioredis
const mockRedis = {
  get: jest.fn(),
  setex: jest.fn(),
  quit: jest.fn(),
  on: jest.fn(),
};

jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn(() => mockRedis),
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

import { ConfigService } from '@nestjs/config';
import { BadGatewayException, HttpException } from '@nestjs/common';
import { ZeroBounceService } from './zerobounce';

describe('ZeroBounceService', () => {
  let service: ZeroBounceService;

  const createService = (overrides: Record<string, string> = {}): ZeroBounceService => {
    const defaults: Record<string, string> = {
      NODE_ENV: 'development',
      ZEROBOUNCE_API_KEY: '',
      REDIS_URL: 'redis://localhost:6379',
      REDIS_PASSWORD: '',
      REDIS_DB: '0',
    };
    const values = { ...defaults, ...overrides };

    return new ZeroBounceService({
      // eslint-disable-next-line security/detect-object-injection
      get: (key: string) => values[key],
    } as ConfigService);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = createService();
  });

  afterEach(async () => {
    mockRedis.quit.mockResolvedValue('OK');
    await service.onModuleDestroy();
  });

  describe('verifyEmail', () => {
    it('should return invalid for malformed email', async () => {
      const result = await service.verifyEmail('not-an-email');

      expect(result.isValid).toBe(false);
      expect(result.isSyntaxValid).toBe(false);
      expect(result.status).toBe('invalid');
    });

    it('should return cached result when available', async () => {
      const cached = {
        email: 'test@gmail.com',
        status: 'valid',
        isValid: true,
        isDeliverable: true,
        isSyntaxValid: true,
        isDomainValid: true,
        isDisposable: false,
        isRoleBased: false,
        isCatchAll: false,
        isFree: true,
        score: 95,
        processedAt: new Date().toISOString(),
      };
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(cached));

      const result = await service.verifyEmail('test@gmail.com');

      expect(result.isValid).toBe(true);
      expect(result.status).toBe('valid');
    });

    it('should return mock result in development without API key', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockRedis.setex.mockResolvedValueOnce('OK');

      const result = await service.verifyEmail('test@gmail.com');

      expect(result.email).toBe('test@gmail.com');
      expect(result.isValid).toBe(true);
    });

    it('should mark disposable emails in mock mode', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockRedis.setex.mockResolvedValueOnce('OK');

      const result = await service.verifyEmail('test@mailinator.com');

      expect(result.isDisposable).toBe(true);
      expect(result.status).toBe('do_not_mail');
    });

    it('should call ZeroBounce API in production', async () => {
      const prodService = createService({
        NODE_ENV: 'production',
        ZEROBOUNCE_API_KEY: 'test-key-123',
      });

      mockRedis.get.mockResolvedValueOnce(null);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'valid',
          sub_status: '',
          disposable: false,
          role: false,
          free: true,
          zerobounce_score: '95',
          mx_record: 'mx.google.com',
          smtp_provider: 'Google',
        }),
      });
      mockRedis.setex.mockResolvedValueOnce('OK');

      const result = await prodService.verifyEmail('test@gmail.com');

      expect(result.isValid).toBe(true);
      expect(result.score).toBe(95);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('zerobounce.net/v2/validate'),
        expect.objectContaining({ method: 'GET' }),
      );

      await prodService.onModuleDestroy();
    });

    it('should throw BadGatewayException on API HTTP error', async () => {
      const prodService = createService({
        NODE_ENV: 'production',
        ZEROBOUNCE_API_KEY: 'test-key-123',
      });

      mockRedis.get.mockResolvedValueOnce(null);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(prodService.verifyEmail('test@gmail.com')).rejects.toThrow(BadGatewayException);

      await prodService.onModuleDestroy();
    });

    it('should handle rate limit exceeded in production', async () => {
      const prodService = createService({
        NODE_ENV: 'production',
        ZEROBOUNCE_API_KEY: 'test-key-123',
      });

      // Fill up the rate limit (20 requests)
      for (let i = 0; i < 20; i++) {
        mockRedis.get.mockResolvedValueOnce(null);
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'valid' }),
        });
        mockRedis.setex.mockResolvedValueOnce('OK');
        await prodService.verifyEmail(`user${i}@gmail.com`);
      }

      // 21st request should be rate limited
      mockRedis.get.mockResolvedValueOnce(null);

      await expect(prodService.verifyEmail('limit@gmail.com')).rejects.toThrow(HttpException);

      await prodService.onModuleDestroy();
    });

    it('should return mock on rate limit in development', async () => {
      // Fill up rate limit
      for (let i = 0; i < 20; i++) {
        mockRedis.get.mockResolvedValueOnce(null);
        mockRedis.setex.mockResolvedValueOnce('OK');
        await service.verifyEmail(`user${i}@gmail.com`);
      }

      mockRedis.get.mockResolvedValueOnce(null);
      const result = await service.verifyEmail('limit@gmail.com');
      // Should return mock instead of throwing
      expect(result).toBeDefined();
    });

    it('should not cache unknown results', async () => {
      const prodService = createService({
        NODE_ENV: 'production',
        ZEROBOUNCE_API_KEY: 'test-key-123',
      });

      mockRedis.get.mockResolvedValueOnce(null);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'unknown' }),
      });

      await prodService.verifyEmail('test@unknown-domain.xyz');

      expect(mockRedis.setex).not.toHaveBeenCalled();

      await prodService.onModuleDestroy();
    });

    it('should pass ipAddress when provided', async () => {
      const prodService = createService({
        NODE_ENV: 'production',
        ZEROBOUNCE_API_KEY: 'test-key-123',
      });

      mockRedis.get.mockResolvedValueOnce(null);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'valid' }),
      });
      mockRedis.setex.mockResolvedValueOnce('OK');

      await prodService.verifyEmail('test@gmail.com', '1.2.3.4');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('ip_address=1.2.3.4'),
        expect.anything(),
      );

      await prodService.onModuleDestroy();
    });

    it('should fallback to mock in dev on API error', async () => {
      service = createService({
        NODE_ENV: 'development',
        ZEROBOUNCE_API_KEY: 'test-key',
      });

      mockRedis.get.mockResolvedValueOnce(null);
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      mockRedis.setex.mockResolvedValueOnce('OK');

      const result = await service.verifyEmail('test@gmail.com');

      expect(result).toBeDefined();
      expect(result.email).toBe('test@gmail.com');
    });
  });

  describe('verifyMultipleEmails', () => {
    it('should verify multiple emails', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');

      const results = await service.verifyMultipleEmails(['user1@gmail.com', 'user2@yahoo.com']);

      expect(results.size).toBe(2);
    });

    it('should handle failures in batch', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');

      // First email succeeds, second fails
      const results = await service.verifyMultipleEmails(['user1@gmail.com', 'not-email']);

      expect(results.size).toBe(2);
      expect(results.get('not-email')!.isValid).toBe(false);
    });
  });

  describe('uploadBulkVerification', () => {
    it('should return mock result in development', async () => {
      const result = await service.uploadBulkVerification(Buffer.from('test'), 'test.csv');

      expect(result.status).toBe('completed');
      expect(result.id).toContain('mock-');
    });

    it('should call bulk API in production', async () => {
      const prodService = createService({
        NODE_ENV: 'production',
        ZEROBOUNCE_API_KEY: 'test-key',
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          file_id: 'file-123',
          total_emails: 100,
        }),
      });

      const result = await prodService.uploadBulkVerification(Buffer.from('test'), 'test.csv');

      expect(result.id).toBe('file-123');
      expect(result.status).toBe('pending');

      await prodService.onModuleDestroy();
    });

    it('should throw on API error', async () => {
      const prodService = createService({
        NODE_ENV: 'production',
        ZEROBOUNCE_API_KEY: 'test-key',
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false, message: 'Invalid file' }),
      });

      await expect(
        prodService.uploadBulkVerification(Buffer.from('test'), 'test.csv'),
      ).rejects.toThrow(BadGatewayException);

      await prodService.onModuleDestroy();
    });

    it('should throw on HTTP error', async () => {
      const prodService = createService({
        NODE_ENV: 'production',
        ZEROBOUNCE_API_KEY: 'test-key',
      });

      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      await expect(
        prodService.uploadBulkVerification(Buffer.from('test'), 'test.csv'),
      ).rejects.toThrow(BadGatewayException);

      await prodService.onModuleDestroy();
    });
  });

  describe('getBulkStatus', () => {
    it('should return mock for mock file IDs', async () => {
      const result = await service.getBulkStatus('mock-12345');

      expect(result.status).toBe('completed');
      expect(result.id).toBe('mock-12345');
    });

    it('should call status API in production', async () => {
      const prodService = createService({
        NODE_ENV: 'production',
        ZEROBOUNCE_API_KEY: 'test-key',
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'Completed',
          file_name: 'test.csv',
          total_emails: 100,
          complete_percentage: 85,
        }),
      });

      const result = await prodService.getBulkStatus('file-123');

      expect(result.status).toBe('completed');

      await prodService.onModuleDestroy();
    });

    it('should handle unknown status', async () => {
      const prodService = createService({
        NODE_ENV: 'production',
        ZEROBOUNCE_API_KEY: 'test-key',
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'SomethingElse' }),
      });

      const result = await prodService.getBulkStatus('file-123');

      expect(result.status).toBe('error');

      await prodService.onModuleDestroy();
    });
  });

  describe('downloadBulkResults', () => {
    it('should return mock CSV for mock file IDs', async () => {
      const result = await service.downloadBulkResults('mock-12345');

      expect(result.toString()).toContain('email,status');
    });

    it('should call download API in production', async () => {
      const prodService = createService({
        NODE_ENV: 'production',
        ZEROBOUNCE_API_KEY: 'test-key',
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => Buffer.from('email,status\ntest@test.com,valid'),
      });

      const result = await prodService.downloadBulkResults('file-123');

      expect(result).toBeInstanceOf(Buffer);

      await prodService.onModuleDestroy();
    });

    it('should throw on HTTP error', async () => {
      const prodService = createService({
        NODE_ENV: 'production',
        ZEROBOUNCE_API_KEY: 'test-key',
      });

      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

      await expect(prodService.downloadBulkResults('file-123')).rejects.toThrow(
        BadGatewayException,
      );

      await prodService.onModuleDestroy();
    });
  });

  describe('getCredits', () => {
    it('should return mock credits in development', async () => {
      const result = await service.getCredits();
      expect(result.credits).toBe(999999);
    });

    it('should call credits API in production', async () => {
      const prodService = createService({
        NODE_ENV: 'production',
        ZEROBOUNCE_API_KEY: 'test-key',
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ credits: 5000 }),
      });

      const result = await prodService.getCredits();

      expect(result.credits).toBe(5000);

      await prodService.onModuleDestroy();
    });

    it('should return 0 credits on error', async () => {
      const prodService = createService({
        NODE_ENV: 'production',
        ZEROBOUNCE_API_KEY: 'test-key',
      });

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await prodService.getCredits();

      expect(result.credits).toBe(0);

      await prodService.onModuleDestroy();
    });
  });

  describe('validateSyntax', () => {
    it('should validate correct email', () => {
      const result = service.validateSyntax('test@gmail.com');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty email', () => {
      const result = service.validateSyntax('');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Email is empty');
    });

    it('should reject email exceeding max length', () => {
      const longLocal = 'a'.repeat(250);
      const result = service.validateSyntax(`${longLocal}@test.com`);
      expect(result.valid).toBe(false);
    });

    it('should reject invalid format', () => {
      const result = service.validateSyntax('not-an-email');
      expect(result.valid).toBe(false);
    });

    it('should reject local part > 64 chars', () => {
      const longLocal = 'a'.repeat(65);
      const result = service.validateSyntax(`${longLocal}@test.com`);
      expect(result.valid).toBe(false);
    });

    it('should reject domain without TLD', () => {
      const result = service.validateSyntax('test@localhost');
      expect(result.valid).toBe(false);
    });

    it('should reject numeric TLD', () => {
      const result = service.validateSyntax('test@domain.123');
      expect(result.valid).toBe(false);
    });

    it('should reject disposable email domains', () => {
      const result = service.validateSyntax('test@mailinator.com');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Disposable email addresses are not allowed');
    });

    it('should reject tempmail.com', () => {
      const result = service.validateSyntax('user@tempmail.com');
      expect(result.valid).toBe(false);
    });

    it('should reject yopmail.com', () => {
      const result = service.validateSyntax('user@yopmail.com');
      expect(result.valid).toBe(false);
    });
  });
});
