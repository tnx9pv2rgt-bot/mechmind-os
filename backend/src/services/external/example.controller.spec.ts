import { Test, TestingModule } from '@nestjs/testing';

// Mock middleware module to avoid transitive import issues
jest.mock('../../middleware', () => ({
  ApplyRateLimit: () => () => undefined,
  RedisRateLimiterMiddleware: {
    VAT_VERIFICATION_LIMIT: {},
    EMAIL_CHECK_LIMIT: {},
    PHONE_CHECK_LIMIT: {},
  },
}));

import { ExternalServicesExampleController } from './example.controller';
import { ViesApiService, GooglePlacesService, ZeroBounceService, TwilioService } from './index';

describe('ExternalServicesExampleController', () => {
  let controller: ExternalServicesExampleController;
  let viesService: jest.Mocked<ViesApiService>;
  let placesService: jest.Mocked<GooglePlacesService>;
  let emailService: jest.Mocked<ZeroBounceService>;
  let phoneService: jest.Mocked<TwilioService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExternalServicesExampleController],
      providers: [
        {
          provide: ViesApiService,
          useValue: {
            verifyVatNumber: jest.fn(),
            verifyMultipleVatNumbers: jest.fn(),
          },
        },
        {
          provide: GooglePlacesService,
          useValue: {
            autocompleteAddress: jest.fn(),
            getPlaceDetails: jest.fn(),
            geocodeAddress: jest.fn(),
            reverseGeocode: jest.fn(),
            validatePostalCode: jest.fn(),
          },
        },
        {
          provide: ZeroBounceService,
          useValue: {
            verifyEmail: jest.fn(),
            validateSyntax: jest.fn(),
          },
        },
        {
          provide: TwilioService,
          useValue: {
            validatePhoneNumber: jest.fn(),
            formatE164: jest.fn(),
            sendOtp: jest.fn(),
            verifyOtp: jest.fn(),
            resendOtp: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ExternalServicesExampleController>(ExternalServicesExampleController);
    viesService = module.get(ViesApiService) as jest.Mocked<ViesApiService>;
    placesService = module.get(GooglePlacesService) as jest.Mocked<GooglePlacesService>;
    emailService = module.get(ZeroBounceService) as jest.Mocked<ZeroBounceService>;
    phoneService = module.get(TwilioService) as jest.Mocked<TwilioService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ==================== VIES ====================

  describe('verifyVat', () => {
    it('should delegate to viesService.verifyVatNumber', async () => {
      const mockResult = { valid: true, countryCode: 'IT', vatNumber: '12345678901' };
      viesService.verifyVatNumber.mockResolvedValue(mockResult as never);

      const result = await controller.verifyVat('IT12345678901');

      expect(viesService.verifyVatNumber).toHaveBeenCalledWith('IT12345678901');
      expect(result).toEqual({ success: true, data: mockResult });
    });
  });

  describe('verifyVatBulk', () => {
    it('should delegate to viesService.verifyMultipleVatNumbers', async () => {
      const mockMap = new Map([
        ['IT12345678901', { valid: true }],
        ['DE123456789', { valid: false }],
      ]);
      viesService.verifyMultipleVatNumbers.mockResolvedValue(mockMap as never);

      const result = await controller.verifyVatBulk(['IT12345678901', 'DE123456789']);

      expect(viesService.verifyMultipleVatNumbers).toHaveBeenCalledWith([
        'IT12345678901',
        'DE123456789',
      ]);
      expect(result).toEqual({
        success: true,
        data: Object.fromEntries(mockMap),
      });
    });
  });

  // ==================== Google Places ====================

  describe('autocompleteAddress', () => {
    it('should delegate to placesService.autocompleteAddress', async () => {
      const mockResults = [{ placeId: 'abc', description: 'Via Roma 1' }];
      placesService.autocompleteAddress.mockResolvedValue(mockResults as never);

      const result = await controller.autocompleteAddress('Via Roma');

      expect(placesService.autocompleteAddress).toHaveBeenCalledWith('Via Roma');
      expect(result).toEqual({ success: true, data: mockResults });
    });
  });

  describe('getPlaceDetails', () => {
    it('should delegate to placesService.getPlaceDetails', async () => {
      const mockDetails = { placeId: 'abc', formattedAddress: 'Via Roma 1, Milano' };
      placesService.getPlaceDetails.mockResolvedValue(mockDetails as never);

      const result = await controller.getPlaceDetails('abc');

      expect(placesService.getPlaceDetails).toHaveBeenCalledWith('abc');
      expect(result).toEqual({ success: true, data: mockDetails });
    });
  });

  describe('geocodeAddress', () => {
    it('should delegate to placesService.geocodeAddress', async () => {
      const mockResults = [{ lat: 45.46, lng: 9.19 }];
      placesService.geocodeAddress.mockResolvedValue(mockResults as never);

      const result = await controller.geocodeAddress('Via Roma 1, Milano');

      expect(placesService.geocodeAddress).toHaveBeenCalledWith('Via Roma 1, Milano');
      expect(result).toEqual({ success: true, data: mockResults });
    });
  });

  describe('reverseGeocode', () => {
    it('should delegate to placesService.reverseGeocode with parsed coordinates', async () => {
      const mockResults = [{ formattedAddress: 'Via Roma 1' }];
      placesService.reverseGeocode.mockResolvedValue(mockResults as never);

      const result = await controller.reverseGeocode('45.46', '9.19');

      expect(placesService.reverseGeocode).toHaveBeenCalledWith(45.46, 9.19);
      expect(result).toEqual({ success: true, data: mockResults });
    });
  });

  describe('validatePostalCode', () => {
    it('should delegate to placesService.validatePostalCode', async () => {
      const mockResult = { valid: true, city: 'Milano', province: 'MI' };
      placesService.validatePostalCode.mockResolvedValue(mockResult as never);

      const result = await controller.validatePostalCode('20100');

      expect(placesService.validatePostalCode).toHaveBeenCalledWith('20100');
      expect(result).toEqual({ success: true, data: mockResult });
    });
  });

  // ==================== ZeroBounce ====================

  describe('verifyEmail', () => {
    it('should delegate to emailService.verifyEmail', async () => {
      const mockResult = { email: 'test@gmail.com', isValid: true, status: 'valid' };
      emailService.verifyEmail.mockResolvedValue(mockResult as never);

      const result = await controller.verifyEmail('test@gmail.com');

      expect(emailService.verifyEmail).toHaveBeenCalledWith('test@gmail.com');
      expect(result).toEqual({ success: true, data: mockResult });
    });
  });

  describe('validateEmailSyntax', () => {
    it('should delegate to emailService.validateSyntax', () => {
      const mockResult = { isValid: true, localPart: 'test', domain: 'gmail.com' };
      emailService.validateSyntax.mockReturnValue(mockResult as never);

      const result = controller.validateEmailSyntax('test@gmail.com');

      expect(emailService.validateSyntax).toHaveBeenCalledWith('test@gmail.com');
      expect(result).toEqual({ success: true, data: mockResult });
    });
  });

  // ==================== Twilio ====================

  describe('validatePhone', () => {
    it('should delegate to phoneService.validatePhoneNumber', async () => {
      const mockResult = { valid: true, phoneNumber: '+393331234567' };
      phoneService.validatePhoneNumber.mockResolvedValue(mockResult as never);

      const result = await controller.validatePhone('+393331234567');

      expect(phoneService.validatePhoneNumber).toHaveBeenCalledWith('+393331234567');
      expect(result).toEqual({ success: true, data: mockResult });
    });
  });

  describe('formatPhoneE164', () => {
    it('should delegate to phoneService.formatE164 with country default IT', () => {
      phoneService.formatE164.mockReturnValue('+393331234567' as never);

      const result = controller.formatPhoneE164('3331234567');

      expect(phoneService.formatE164).toHaveBeenCalledWith('3331234567', 'IT');
      expect(result).toEqual({ success: true, data: { formatted: '+393331234567' } });
    });

    it('should pass provided country code', () => {
      phoneService.formatE164.mockReturnValue('+491234567890' as never);

      const result = controller.formatPhoneE164('1234567890', 'DE');

      expect(phoneService.formatE164).toHaveBeenCalledWith('1234567890', 'DE');
      expect(result).toEqual({ success: true, data: { formatted: '+491234567890' } });
    });
  });

  describe('sendOtp', () => {
    it('should delegate to phoneService.sendOtp', async () => {
      const mockResult = { success: true, sid: 'SM123' };
      phoneService.sendOtp.mockResolvedValue(mockResult as never);

      const result = await controller.sendOtp('+393331234567');

      expect(phoneService.sendOtp).toHaveBeenCalledWith('+393331234567');
      expect(result).toEqual({ success: true, data: mockResult });
    });
  });

  describe('verifyOtp', () => {
    it('should delegate to phoneService.verifyOtp', async () => {
      const mockResult = { success: true, valid: true };
      phoneService.verifyOtp.mockResolvedValue(mockResult as never);

      const result = await controller.verifyOtp('+393331234567', '123456');

      expect(phoneService.verifyOtp).toHaveBeenCalledWith('+393331234567', '123456');
      expect(result).toEqual({ success: true, valid: true, data: mockResult });
    });
  });

  describe('resendOtp', () => {
    it('should delegate to phoneService.resendOtp', async () => {
      const mockResult = { success: true, sid: 'SM456' };
      phoneService.resendOtp.mockResolvedValue(mockResult as never);

      const result = await controller.resendOtp('+393331234567');

      expect(phoneService.resendOtp).toHaveBeenCalledWith('+393331234567');
      expect(result).toEqual({ success: true, data: mockResult });
    });
  });
});
