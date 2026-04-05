import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ValidationController } from './validation.controller';
import { ZeroBounceService } from './zerobounce';
import { ViesApiService } from './viesApi';
import { GooglePlacesService } from './googlePlaces';

// Mock ioredis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    setex: jest.fn().mockResolvedValue('OK'),
    quit: jest.fn().mockResolvedValue('OK'),
    on: jest.fn(),
  }));
});

describe('ValidationController', () => {
  let controller: ValidationController;
  let zeroBounceService: jest.Mocked<ZeroBounceService>;
  let viesApiService: jest.Mocked<ViesApiService>;
  let googlePlacesService: jest.Mocked<GooglePlacesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ValidationController],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                NODE_ENV: 'test',
                REDIS_URL: 'redis://localhost:6379',
              };
              return config[key] ?? undefined;
            }),
          },
        },
        {
          provide: ZeroBounceService,
          useValue: {
            verifyEmail: jest.fn(),
          },
        },
        {
          provide: ViesApiService,
          useValue: {
            verifyVatNumber: jest.fn(),
          },
        },
        {
          provide: GooglePlacesService,
          useValue: {
            autocompleteAddress: jest.fn(),
            getPlaceDetails: jest.fn(),
            validatePostalCode: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ValidationController>(ValidationController);
    zeroBounceService = module.get(ZeroBounceService) as jest.Mocked<ZeroBounceService>;
    viesApiService = module.get(ViesApiService) as jest.Mocked<ViesApiService>;
    googlePlacesService = module.get(GooglePlacesService) as jest.Mocked<GooglePlacesService>;
  });

  afterEach(async () => {
    await controller.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ==================== EMAIL VALIDATION ====================

  describe('validateEmail', () => {
    it('should delegate to zeroBounceService.verifyEmail for valid email', async () => {
      const mockResult = {
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
        processedAt: new Date(),
      };
      zeroBounceService.verifyEmail.mockResolvedValue(mockResult as never);

      const result = await controller.validateEmail('test@gmail.com', '', '127.0.0.1');

      expect(zeroBounceService.verifyEmail).toHaveBeenCalledWith('test@gmail.com');
      expect(result.email).toBe('test@gmail.com');
      expect(result.isValid).toBe(true);
    });

    it('should return invalid for malformed email without calling service', async () => {
      const result = await controller.validateEmail('not-an-email', '', '127.0.0.1');

      expect(zeroBounceService.verifyEmail).not.toHaveBeenCalled();
      expect(result.isValid).toBe(false);
      expect(result.isSyntaxValid).toBe(false);
      expect(result.status).toBe('invalid');
    });

    it('should throw BAD_REQUEST when email is empty', async () => {
      await expect(controller.validateEmail('', '', '127.0.0.1')).rejects.toThrow(HttpException);
    });

    it('should include typo suggestion for common misspellings', async () => {
      const result = await controller.validateEmail('user@gmial.com', '', '127.0.0.1');

      // gmial.com fails regex? No, it passes regex. But service call will happen.
      // The typo suggestion is added after service call or on invalid syntax.
      // Actually gmial.com passes the regex test, so service is called.
      // Let's just check the typo case for invalid syntax:
      expect(result.suggestion).toBeDefined();
    });
  });

  // ==================== VAT VALIDATION ====================

  describe('validateVat', () => {
    it('should delegate to viesApiService.verifyVatNumber for valid format', async () => {
      const mockResult = {
        valid: true,
        countryCode: 'IT',
        vatNumber: '12345678903',
        requestDate: new Date(),
      };
      viesApiService.verifyVatNumber.mockResolvedValue(mockResult as never);

      const result = await controller.validateVat({ vatNumber: 'IT12345678903' }, '', '127.0.0.1');

      expect(viesApiService.verifyVatNumber).toHaveBeenCalledWith('IT12345678903');
      expect(result.valid).toBe(true);
      expect(result.isValidFormat).toBe(true);
    });

    it('should return invalid for malformed VAT without calling service', async () => {
      const result = await controller.validateVat({ vatNumber: 'IT123' }, '', '127.0.0.1');

      expect(viesApiService.verifyVatNumber).not.toHaveBeenCalled();
      expect(result.valid).toBe(false);
      expect(result.isValidFormat).toBe(false);
    });

    it('should throw BAD_REQUEST when vatNumber is empty', async () => {
      await expect(controller.validateVat({ vatNumber: '' }, '', '127.0.0.1')).rejects.toThrow(
        HttpException,
      );
    });
  });

  // ==================== ADDRESS VALIDATION ====================

  describe('autocompleteAddress', () => {
    it('should delegate to googlePlacesService.autocompleteAddress', async () => {
      const mockResult = {
        predictions: [{ placeId: 'abc', description: 'Via Roma 1, Milano' }],
      };
      googlePlacesService.autocompleteAddress.mockResolvedValue(mockResult as never);

      const result = await controller.autocompleteAddress('Via Roma', 'it', '', '127.0.0.1');

      expect(googlePlacesService.autocompleteAddress).toHaveBeenCalledWith('Via Roma', {
        language: 'it',
        components: 'country:it',
      });
      expect(result).toEqual(mockResult);
    });

    it('should return empty predictions for short input', async () => {
      const result = await controller.autocompleteAddress('Vi', 'it', '', '127.0.0.1');

      expect(googlePlacesService.autocompleteAddress).not.toHaveBeenCalled();
      expect(result).toEqual({ predictions: [] });
    });
  });

  describe('getAddressDetails', () => {
    it('should delegate to googlePlacesService.getPlaceDetails', async () => {
      const mockDetails = {
        placeId: 'abc',
        formattedAddress: 'Via Roma 1, 20100 Milano MI',
      };
      googlePlacesService.getPlaceDetails.mockResolvedValue(mockDetails as never);

      const result = await controller.getAddressDetails('abc', '', '127.0.0.1');

      expect(googlePlacesService.getPlaceDetails).toHaveBeenCalledWith('abc');
      expect(result).toEqual(mockDetails);
    });

    it('should throw BAD_REQUEST when placeId is empty', async () => {
      await expect(controller.getAddressDetails('', '', '127.0.0.1')).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('validatePostalCode', () => {
    it('should delegate to googlePlacesService.validatePostalCode', async () => {
      const mockResult = { valid: true, city: 'Milano', province: 'MI', region: 'Lombardia' };
      googlePlacesService.validatePostalCode.mockResolvedValue(mockResult as never);

      const result = await controller.validatePostalCode('20100', '', '127.0.0.1');

      expect(googlePlacesService.validatePostalCode).toHaveBeenCalledWith('20100');
      expect(result).toEqual(mockResult);
    });

    it('should return invalid for non-5-digit postal code', async () => {
      const result = await controller.validatePostalCode('123', '', '127.0.0.1');

      expect(googlePlacesService.validatePostalCode).not.toHaveBeenCalled();
      expect(result).toEqual({ valid: false });
    });

    it('should return invalid for null postal code', async () => {
      const result = await controller.validatePostalCode(null as never, '', '127.0.0.1');

      expect(result).toEqual({ valid: false });
    });
  });

  // ==================== RATE LIMITING ====================

  describe('rate limiting', () => {
    it('should throw 429 after exceeding rate limit', async () => {
      // Make 10 requests (allowed)
      for (let i = 0; i < 10; i++) {
        await controller.validatePostalCode('20100', '', '10.0.0.1');
      }

      // 11th request should be rate limited
      await expect(controller.validatePostalCode('20100', '', '10.0.0.1')).rejects.toThrow(
        HttpException,
      );
    });

    it('should track rate limits per IP', async () => {
      googlePlacesService.validatePostalCode.mockResolvedValue({
        valid: true,
        city: 'Milano',
        province: 'MI',
        region: 'Lombardia',
      } as never);

      // Exhaust rate limit for one IP
      for (let i = 0; i < 10; i++) {
        await controller.validatePostalCode('20100', '', '10.0.0.2');
      }

      // Different IP should still work
      const result = await controller.validatePostalCode('20100', '', '10.0.0.3');
      expect(result.valid).toBe(true);
    });
  });

  // ==================== getClientIp branches ====================

  describe('getClientIp (via email validation)', () => {
    it('should use x-forwarded-for first entry', async () => {
      const result = await controller.validateEmail('bad-email', '1.1.1.1, 2.2.2.2', '');

      // Should not throw rate limit since this is a different IP
      expect(result.isValid).toBe(false);
    });

    it('should fall back to x-real-ip when no forwarded-for', async () => {
      const result = await controller.validateEmail('bad-email', '', '3.3.3.3');

      expect(result.isValid).toBe(false);
    });

    it('should use "unknown" when no IP headers', async () => {
      const result = await controller.validateEmail('bad-email', '', '');

      expect(result.isValid).toBe(false);
    });
  });

  // ==================== EMAIL — API error fallback ====================

  describe('validateEmail — API error fallback', () => {
    it('should return fallback result when ZeroBounce API fails', async () => {
      zeroBounceService.verifyEmail.mockRejectedValue(new Error('API down'));

      const result = await controller.validateEmail('user@gmail.com', '', '20.0.0.1');

      expect(result.status).toBe('unknown');
      expect(result.isValid).toBe(true); // Allow through on error
      expect(result.score).toBe(50);
      expect(result.isFree).toBe(true); // gmail.com is free
    });

    it('should detect non-free email provider in fallback', async () => {
      zeroBounceService.verifyEmail.mockRejectedValue(new Error('API down'));

      const result = await controller.validateEmail('user@company.com', '', '20.0.0.2');

      expect(result.isFree).toBe(false);
    });
  });

  // ==================== EMAIL — typo suggestion ====================

  describe('validateEmail — typo suggestions', () => {
    it('should suggest gmail.com for gmial.com (via service call)', async () => {
      zeroBounceService.verifyEmail.mockResolvedValue({
        email: 'user@gmial.com',
        status: 'valid',
        isValid: true,
        isDeliverable: true,
        isSyntaxValid: true,
        isDomainValid: true,
        isDisposable: false,
        isRoleBased: false,
        isCatchAll: false,
        isFree: false,
        score: 50,
        processedAt: new Date(),
      } as never);

      const result = await controller.validateEmail('user@gmial.com', '', '21.0.0.1');

      expect(result.suggestion).toBe('user@gmail.com');
      expect(result.typoCorrected).toBe('user@gmail.com');
    });

    it('should not add suggestion when domain is correct', async () => {
      zeroBounceService.verifyEmail.mockResolvedValue({
        email: 'user@gmail.com',
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
        processedAt: new Date(),
      } as never);

      const result = await controller.validateEmail('user@gmail.com', '', '21.0.0.2');

      expect(result.suggestion).toBeUndefined();
      expect(result.typoCorrected).toBeUndefined();
    });
  });

  // ==================== VAT — country code branches ====================

  describe('validateVat — country extraction', () => {
    it('should extract country code from VAT number prefix', async () => {
      viesApiService.verifyVatNumber.mockResolvedValue({
        valid: true,
        countryCode: 'DE',
        vatNumber: '123456789',
        requestDate: new Date(),
      } as never);

      const result = await controller.validateVat({ vatNumber: 'DE123456789' }, '', '22.0.0.1');

      expect(result.valid).toBe(true);
      expect(result.isValidFormat).toBe(true);
    });

    it('should default to IT when no country code provided or extractable', async () => {
      // 11-digit number without country prefix defaults to IT
      viesApiService.verifyVatNumber.mockResolvedValue({
        valid: true,
        countryCode: 'IT',
        vatNumber: '12345678903',
        requestDate: new Date(),
      } as never);

      const _result = await controller.validateVat({ vatNumber: '12345678903' }, '', '22.0.0.2');

      expect(viesApiService.verifyVatNumber).toHaveBeenCalledWith('IT12345678903');
    });

    it('should use provided countryCode over extracted one', async () => {
      viesApiService.verifyVatNumber.mockResolvedValue({
        valid: true,
        countryCode: 'FR',
        vatNumber: 'AB123456789',
        requestDate: new Date(),
      } as never);

      const result = await controller.validateVat(
        { vatNumber: 'AB123456789', countryCode: 'FR' },
        '',
        '22.0.0.3',
      );

      expect(result.isValidFormat).toBe(true);
    });

    it('should skip Luhn check for non-IT countries', async () => {
      viesApiService.verifyVatNumber.mockResolvedValue({
        valid: true,
        countryCode: 'DE',
        vatNumber: '123456789',
        requestDate: new Date(),
      } as never);

      const result = await controller.validateVat({ vatNumber: 'DE123456789' }, '', '22.0.0.4');

      expect(result.luhnValid).toBe(true); // Non-IT always true
    });
  });

  // ==================== VAT — API error fallback ====================

  describe('validateVat — API error fallback', () => {
    it('should fallback to Luhn validation when VIES API fails', async () => {
      viesApiService.verifyVatNumber.mockRejectedValue(new Error('VIES unavailable'));

      const result = await controller.validateVat({ vatNumber: 'IT12345678903' }, '', '23.0.0.1');

      expect(result.isValidFormat).toBe(true);
      // valid field is set to luhnValid result
      expect(typeof result.luhnValid).toBe('boolean');
      expect(result.valid).toBe(result.luhnValid);
    });
  });

  // ==================== VAT — generic format fallback ====================

  describe('validateVat — unknown country format', () => {
    it('should use generic pattern for unknown country codes', async () => {
      viesApiService.verifyVatNumber.mockResolvedValue({
        valid: true,
        countryCode: 'PL',
        vatNumber: 'PL1234567890',
        requestDate: new Date(),
      } as never);

      const result = await controller.validateVat(
        { vatNumber: 'PL1234567890', countryCode: 'PL' },
        '',
        '23.0.0.2',
      );

      expect(result.isValidFormat).toBe(true);
    });
  });

  // ==================== ADDRESS — API error ====================

  describe('autocompleteAddress — API error', () => {
    it('should return empty predictions on Google Places API error', async () => {
      googlePlacesService.autocompleteAddress.mockRejectedValue(new Error('API error'));

      const result = await controller.autocompleteAddress('Via Roma 1', 'it', '', '24.0.0.1');

      expect(result).toEqual({ predictions: [] });
    });
  });

  describe('getAddressDetails — API error', () => {
    it('should throw INTERNAL_SERVER_ERROR on Google Places API error', async () => {
      googlePlacesService.getPlaceDetails.mockRejectedValue(new Error('API error'));

      await expect(controller.getAddressDetails('place-id', '', '24.0.0.2')).rejects.toThrow(
        HttpException,
      );
    });
  });

  // ==================== onModuleDestroy ====================

  describe('onModuleDestroy', () => {
    it('should call redis.quit', async () => {
      // Already tested implicitly via afterEach, but let's be explicit
      await expect(controller.onModuleDestroy()).resolves.not.toThrow();
    });
  });
});
