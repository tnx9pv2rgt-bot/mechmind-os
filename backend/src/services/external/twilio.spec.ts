/**
 * twilio.spec.ts — Tests for Twilio SMS/phone verification service
 */

// Mock ioredis
const mockRedis = {
  get: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  quit: jest.fn(),
  on: jest.fn(),
};

jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn(() => mockRedis),
}));

// Mock Twilio SDK
const mockLookupFetch = jest.fn();
const mockVerifyCreate = jest.fn();
const mockVerifyCheckCreate = jest.fn();
const mockMessagesCreate = jest.fn();

jest.mock('twilio', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    lookups: {
      v2: {
        phoneNumbers: jest.fn(() => ({
          fetch: mockLookupFetch,
        })),
      },
    },
    verify: {
      v2: {
        services: jest.fn(() => ({
          verifications: { create: mockVerifyCreate },
          verificationChecks: { create: mockVerifyCheckCreate },
        })),
      },
    },
    messages: {
      create: mockMessagesCreate,
    },
  })),
}));

import { ConfigService } from '@nestjs/config';
import { TwilioService, formatE164 } from './twilio';

describe('TwilioService', () => {
  let service: TwilioService;

  const createService = (overrides: Record<string, string> = {}): TwilioService => {
    const defaults: Record<string, string> = {
      NODE_ENV: 'development',
      TWILIO_ACCOUNT_SID: '',
      TWILIO_AUTH_TOKEN: '',
      TWILIO_PHONE_NUMBER: '+15551234567',
      TWILIO_VERIFY_SERVICE_SID: '',
      REDIS_URL: 'redis://localhost:6379',
      REDIS_PASSWORD: '',
      REDIS_DB: '0',
    };

    const values = { ...defaults, ...overrides };

    return new TwilioService({
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

  describe('formatE164', () => {
    it('should add Italian prefix by default', () => {
      expect(service.formatE164('3331234567')).toBe('+393331234567');
    });

    it('should replace 00 prefix with +', () => {
      expect(service.formatE164('0039333123')).toBe('+39333123');
    });

    it('should keep existing + prefix', () => {
      expect(service.formatE164('+393331234567')).toBe('+393331234567');
    });

    it('should strip non-numeric chars except +', () => {
      expect(service.formatE164('+39 333-123-4567')).toBe('+393331234567');
    });

    it('should use specified country prefix', () => {
      expect(service.formatE164('1234567890', 'US')).toBe('+11234567890');
    });

    it('should default to +39 for unknown country', () => {
      expect(service.formatE164('1234567890', 'XX')).toBe('+391234567890');
    });
  });

  describe('validatePhoneNumber', () => {
    it('should return cached result when available', async () => {
      const cached = {
        phoneNumber: '+393331234567',
        formattedNumber: '+393331234567',
        isValid: true,
        isMobile: true,
        isLandline: false,
        isVoip: false,
        countryCode: 'IT',
      };
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(cached));

      const result = await service.validatePhoneNumber('3331234567');

      expect(result.isValid).toBe(true);
      expect(result.isMobile).toBe(true);
    });

    it('should return mock result in development when no credentials', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockRedis.setex.mockResolvedValueOnce('OK');

      const result = await service.validatePhoneNumber('3331234567');

      expect(result.phoneNumber).toBe('+393331234567');
      expect(result.isValid).toBeDefined();
    });

    it('should call Twilio lookup API in production', async () => {
      const prodService = createService({
        NODE_ENV: 'production',
        TWILIO_ACCOUNT_SID: 'AC_test',
        TWILIO_AUTH_TOKEN: 'token_test',
      });

      mockRedis.get.mockResolvedValueOnce(null);
      mockLookupFetch.mockResolvedValueOnce({
        phoneNumber: '+393331234567',
        valid: true,
        countryCode: 'IT',
        nationalFormat: '333 123 4567',
        lineTypeIntelligence: { type: 'mobile' },
        carrier: { name: 'TIM' },
        callerName: { callerName: 'Test' },
      });
      mockRedis.setex.mockResolvedValueOnce('OK');

      const result = await prodService.validatePhoneNumber('3331234567');

      expect(result.isValid).toBe(true);
      expect(mockLookupFetch).toHaveBeenCalled();

      await prodService.onModuleDestroy();
    });

    it('should handle Twilio 20404 (number not found) error', async () => {
      const prodService = createService({
        NODE_ENV: 'production',
        TWILIO_ACCOUNT_SID: 'AC_test',
        TWILIO_AUTH_TOKEN: 'token_test',
      });

      mockRedis.get.mockResolvedValueOnce(null);
      const error = new Error('Not found') as Error & { code: number };
      error.code = 20404;
      mockLookupFetch.mockRejectedValueOnce(error);

      const result = await prodService.validatePhoneNumber('0000000000');

      expect(result.isValid).toBe(false);

      await prodService.onModuleDestroy();
    });

    it('should fallback to mock in development on API error', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockLookupFetch.mockRejectedValueOnce(new Error('API Error'));
      mockRedis.setex.mockResolvedValueOnce('OK');

      const result = await service.validatePhoneNumber('3331234567');

      expect(result).toBeDefined();
      expect(result.phoneNumber).toBe('+393331234567');
    });

    it('should handle Redis cache errors gracefully', async () => {
      mockRedis.get.mockRejectedValueOnce(new Error('Redis down'));
      mockRedis.setex.mockResolvedValueOnce('OK');

      const result = await service.validatePhoneNumber('3331234567');

      expect(result).toBeDefined();
    });
  });

  describe('isMobileNumber', () => {
    it('should return true for mobile number', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockRedis.setex.mockResolvedValueOnce('OK');

      const result = await service.isMobileNumber('3331234567');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('sendOtp', () => {
    it('should log OTP in development mode', async () => {
      mockRedis.setex.mockResolvedValueOnce('OK');

      const result = await service.sendOtp('3331234567');

      expect(result.success).toBe(true);
      expect(result.status).toBe('pending');
    });

    it('should use Twilio Verify when configured in production', async () => {
      const prodService = createService({
        NODE_ENV: 'production',
        TWILIO_ACCOUNT_SID: 'AC_test',
        TWILIO_AUTH_TOKEN: 'token_test',
        TWILIO_VERIFY_SERVICE_SID: 'VA_test',
      });

      mockRedis.setex.mockResolvedValueOnce('OK');
      mockVerifyCreate.mockResolvedValueOnce({
        sid: 'VE_test',
        status: 'pending',
      });

      const result = await prodService.sendOtp('3331234567');

      expect(result.success).toBe(true);
      expect(result.sid).toBe('VE_test');

      await prodService.onModuleDestroy();
    });

    it('should fallback to custom SMS on Verify error', async () => {
      const prodService = createService({
        NODE_ENV: 'production',
        TWILIO_ACCOUNT_SID: 'AC_test',
        TWILIO_AUTH_TOKEN: 'token_test',
        TWILIO_VERIFY_SERVICE_SID: 'VA_test',
      });

      mockRedis.setex.mockResolvedValueOnce('OK');
      mockVerifyCreate.mockRejectedValueOnce(new Error('Verify error'));
      mockMessagesCreate.mockResolvedValueOnce({ sid: 'SM_test' });

      const result = await prodService.sendOtp('3331234567');

      expect(result.success).toBe(true);
      expect(result.sid).toBe('SM_test');

      await prodService.onModuleDestroy();
    });

    it('should handle SMS sending failure', async () => {
      const prodService = createService({
        NODE_ENV: 'production',
        TWILIO_ACCOUNT_SID: 'AC_test',
        TWILIO_AUTH_TOKEN: 'token_test',
      });

      mockRedis.setex.mockResolvedValueOnce('OK');
      mockMessagesCreate.mockRejectedValueOnce(new Error('SMS failed'));

      const result = await prodService.sendOtp('3331234567');

      expect(result.success).toBe(false);
      expect(result.status).toBe('error');

      await prodService.onModuleDestroy();
    });

    it('should use custom template when provided', async () => {
      const prodService = createService({
        NODE_ENV: 'production',
        TWILIO_ACCOUNT_SID: 'AC_test',
        TWILIO_AUTH_TOKEN: 'token_test',
      });

      mockRedis.setex.mockResolvedValueOnce('OK');
      mockMessagesCreate.mockResolvedValueOnce({ sid: 'SM_tmpl' });

      await prodService.sendOtp('3331234567', 'Your code is {{code}}');

      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.stringMatching(/Your code is \d{6}/),
        }),
      );

      await prodService.onModuleDestroy();
    });
  });

  describe('verifyOtp', () => {
    it('should verify correct OTP from session', async () => {
      const session = {
        phoneNumber: '+393331234567',
        code: '123456',
        attempts: 0,
        expiresAt: new Date(Date.now() + 600000).toISOString(),
        verified: false,
      };
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(session));
      mockRedis.setex.mockResolvedValue('OK');

      const result = await service.verifyOtp('3331234567', '123456');

      expect(result.success).toBe(true);
      expect(result.valid).toBe(true);
    });

    it('should reject incorrect OTP', async () => {
      const session = {
        phoneNumber: '+393331234567',
        code: '123456',
        attempts: 0,
        expiresAt: new Date(Date.now() + 600000).toISOString(),
        verified: false,
      };
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(session));
      mockRedis.setex.mockResolvedValue('OK');

      const result = await service.verifyOtp('3331234567', '999999');

      expect(result.valid).toBe(false);
      expect(result.message).toContain('Invalid code');
    });

    it('should reject when session not found', async () => {
      mockRedis.get.mockResolvedValueOnce(null);

      const result = await service.verifyOtp('3331234567', '123456');

      expect(result.valid).toBe(false);
      expect(result.message).toContain('Session not found');
    });

    it('should reject expired OTP', async () => {
      const session = {
        phoneNumber: '+393331234567',
        code: '123456',
        attempts: 0,
        expiresAt: new Date(Date.now() - 60000).toISOString(),
        verified: false,
      };
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(session));
      mockRedis.del.mockResolvedValueOnce(1);

      const result = await service.verifyOtp('3331234567', '123456');

      expect(result.valid).toBe(false);
      expect(result.message).toContain('expired');
    });

    it('should reject after max attempts', async () => {
      const session = {
        phoneNumber: '+393331234567',
        code: '123456',
        attempts: 3,
        expiresAt: new Date(Date.now() + 600000).toISOString(),
        verified: false,
      };
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(session));
      mockRedis.del.mockResolvedValueOnce(1);

      const result = await service.verifyOtp('3331234567', '123456');

      expect(result.valid).toBe(false);
      expect(result.message).toContain('Too many attempts');
    });

    it('should use Twilio Verify when configured in production', async () => {
      const prodService = createService({
        NODE_ENV: 'production',
        TWILIO_ACCOUNT_SID: 'AC_test',
        TWILIO_AUTH_TOKEN: 'token_test',
        TWILIO_VERIFY_SERVICE_SID: 'VA_test',
      });

      mockVerifyCheckCreate.mockResolvedValueOnce({ status: 'approved' });

      const result = await prodService.verifyOtp('3331234567', '123456');

      expect(result.success).toBe(true);
      expect(result.valid).toBe(true);

      await prodService.onModuleDestroy();
    });
  });

  describe('sendSms', () => {
    it('should log SMS in development mode', async () => {
      const result = await service.sendSms('3331234567', 'Test message');

      expect(result.success).toBe(true);
      expect(result.status).toBe('pending');
    });

    it('should send via Twilio in production', async () => {
      const prodService = createService({
        NODE_ENV: 'production',
        TWILIO_ACCOUNT_SID: 'AC_test',
        TWILIO_AUTH_TOKEN: 'token_test',
      });

      mockMessagesCreate.mockResolvedValueOnce({ sid: 'SM_test' });

      const result = await prodService.sendSms('3331234567', 'Test');

      expect(result.success).toBe(true);
      expect(result.sid).toBe('SM_test');

      await prodService.onModuleDestroy();
    });

    it('should handle SMS error in production', async () => {
      const prodService = createService({
        NODE_ENV: 'production',
        TWILIO_ACCOUNT_SID: 'AC_test',
        TWILIO_AUTH_TOKEN: 'token_test',
      });

      mockMessagesCreate.mockRejectedValueOnce(new Error('Failed'));

      const result = await prodService.sendSms('3331234567', 'Test');

      expect(result.success).toBe(false);
      expect(result.status).toBe('error');

      await prodService.onModuleDestroy();
    });
  });

  describe('resendOtp', () => {
    it('should send new OTP when no session exists', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockRedis.setex.mockResolvedValueOnce('OK');

      const result = await service.resendOtp('3331234567');

      expect(result.success).toBe(true);
    });

    it('should reject if cooldown not elapsed', async () => {
      const session = {
        phoneNumber: '+393331234567',
        code: '123456',
        attempts: 0,
        expiresAt: new Date(Date.now() + 590000).toISOString(), // sent ~10s ago
        verified: false,
      };
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(session));

      const result = await service.resendOtp('3331234567');

      expect(result.success).toBe(false);
      expect(result.message).toContain('wait');
    });
  });

  describe('validateMultiplePhones', () => {
    it('should validate multiple phone numbers', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');

      const results = await service.validateMultiplePhones(['3331234567', '3337654321']);

      expect(results.size).toBe(2);
    });
  });

  describe('onModuleDestroy', () => {
    it('should quit Redis connection', async () => {
      mockRedis.quit.mockResolvedValueOnce('OK');
      await service.onModuleDestroy();
      expect(mockRedis.quit).toHaveBeenCalled();
    });
  });
});

describe('formatE164 standalone', () => {
  it('should add Italian prefix by default', () => {
    expect(formatE164('3331234567')).toBe('+393331234567');
  });

  it('should handle 00 prefix', () => {
    expect(formatE164('0039333123')).toBe('+39333123');
  });

  it('should handle US country code', () => {
    expect(formatE164('1234567890', 'US')).toBe('+11234567890');
  });

  it('should default to +39 for unknown country', () => {
    expect(formatE164('1234567890', 'ZZ')).toBe('+391234567890');
  });
});
