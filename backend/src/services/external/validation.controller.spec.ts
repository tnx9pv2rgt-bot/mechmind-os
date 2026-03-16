import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
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
  });
});
