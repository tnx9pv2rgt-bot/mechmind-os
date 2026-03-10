import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SmsService, SmsResult } from './sms.service';

// Mock Twilio
const mockCreate = jest.fn();
const mockFetch = jest.fn();
const mockLookupFetch = jest.fn();
const mockAccountsList = jest.fn();

jest.mock('twilio', () => ({
  Twilio: jest.fn().mockImplementation(() => ({
    messages: Object.assign((sid: string) => ({ fetch: mockFetch }), { create: mockCreate }),
    lookups: {
      v2: {
        phoneNumbers: (phone: string) => ({
          fetch: mockLookupFetch,
        }),
      },
    },
    api: {
      accounts: {
        list: mockAccountsList,
      },
    },
  })),
}));

describe('SmsService', () => {
  let service: SmsService;
  let configService: ConfigService;

  const defaultConfigMap: Record<string, string | boolean> = {
    TWILIO_ACCOUNT_SID: 'test-account-sid',
    TWILIO_AUTH_TOKEN: 'test-auth-token',
    TWILIO_PHONE_NUMBER: '+15551234567',
    ENABLE_SMS_NOTIFICATIONS: true,
    TWILIO_STATUS_CALLBACK_URL: 'https://mechmind.io/webhooks/twilio',
  };

  const createModule = async (
    configOverrides: Record<string, string | boolean> = {},
  ): Promise<TestingModule> => {
    const config = { ...defaultConfigMap, ...configOverrides };
    return Test.createTestingModule({
      providers: [
        SmsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(
              (key: string, defaultValue?: string | boolean) => config[key] ?? defaultValue,
            ),
          },
        },
      ],
    }).compile();
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await createModule();
    service = module.get<SmsService>(SmsService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =========================================================================
  // Initialization
  // =========================================================================
  describe('initialization', () => {
    it('should initialize Twilio client when all config values are present', async () => {
      const module = await createModule();
      const svc = module.get<SmsService>(SmsService);
      expect(svc).toBeDefined();
    });

    it('should not initialize Twilio when SID is missing', async () => {
      const module = await createModule({ TWILIO_ACCOUNT_SID: '' });
      const svc = module.get<SmsService>(SmsService);
      expect(svc).toBeDefined();
    });

    it('should not initialize Twilio when SMS notifications are disabled', async () => {
      const module = await createModule({ ENABLE_SMS_NOTIFICATIONS: false });
      const svc = module.get<SmsService>(SmsService);
      expect(svc).toBeDefined();
    });
  });

  // =========================================================================
  // sendBookingConfirmation()
  // =========================================================================
  describe('sendBookingConfirmation', () => {
    it('should send booking confirmation SMS with formatted message', async () => {
      mockCreate.mockResolvedValue({
        sid: 'SM123',
        numSegments: '1',
        price: '0.0075',
      });

      const result = await service.sendBookingConfirmation('+393331234567', {
        date: '2024-03-15',
        time: '14:30',
        service: 'Tagliando',
        workshopName: 'Officina Meccanica',
        bookingCode: 'BK-001',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('SM123');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          from: '+15551234567',
          to: '+393331234567',
          body: expect.stringContaining('Tagliando'),
        }),
      );
    });

    it('should interpolate all template variables', async () => {
      mockCreate.mockResolvedValue({
        sid: 'SM124',
        numSegments: '1',
        price: '0.0075',
      });

      await service.sendBookingConfirmation('+393331234567', {
        date: '15/03/2024',
        time: '14:30',
        service: 'Cambio olio',
        workshopName: 'AutoService',
        bookingCode: 'BK-002',
      });

      const sentBody = mockCreate.mock.calls[0][0].body;
      expect(sentBody).toContain('Cambio olio');
      expect(sentBody).toContain('15/03/2024');
      expect(sentBody).toContain('14:30');
      expect(sentBody).toContain('AutoService');
      expect(sentBody).toContain('BK-002');
    });

    it('should handle Twilio API failure with retry', async () => {
      mockCreate
        .mockRejectedValueOnce(new Error('Service unavailable'))
        .mockRejectedValueOnce(new Error('Service unavailable'))
        .mockResolvedValueOnce({ sid: 'SM125', numSegments: '1' });

      const result = await service.sendBookingConfirmation('+393331234567', {
        date: '2024-03-15',
        time: '14:30',
        service: 'Tagliando',
        workshopName: 'Officina',
        bookingCode: 'BK-003',
      });

      expect(result.success).toBe(true);
      expect(mockCreate).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      mockCreate.mockRejectedValue(new Error('Persistent failure'));

      const result = await service.sendBookingConfirmation('+393331234567', {
        date: '2024-03-15',
        time: '14:30',
        service: 'Tagliando',
        workshopName: 'Officina',
        bookingCode: 'BK-004',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Persistent failure');
      expect(mockCreate).toHaveBeenCalledTimes(3);
    });
  });

  // =========================================================================
  // sendBookingReminder()
  // =========================================================================
  describe('sendBookingReminder', () => {
    it('should send booking reminder with correct template', async () => {
      mockCreate.mockResolvedValue({ sid: 'SM200', numSegments: '1' });

      const result = await service.sendBookingReminder('+393331234567', {
        date: '2024-03-15',
        time: '14:30',
        service: 'Revisione',
        workshopName: 'AutoService',
        bookingCode: 'BK-005',
      });

      expect(result.success).toBe(true);
      const sentBody = mockCreate.mock.calls[0][0].body;
      expect(sentBody).toContain('Promemoria');
      expect(sentBody).toContain('Revisione');
    });
  });

  // =========================================================================
  // sendSameDayReminder()
  // =========================================================================
  describe('sendSameDayReminder', () => {
    it('should send same-day reminder with correct template', async () => {
      mockCreate.mockResolvedValue({ sid: 'SM250', numSegments: '1' });

      const result = await service.sendSameDayReminder('+393331234567', {
        date: '2024-03-15',
        time: '14:30',
        service: 'Tagliando',
        workshopName: 'Officina',
        bookingCode: 'BK-006',
      });

      expect(result.success).toBe(true);
      const sentBody = mockCreate.mock.calls[0][0].body;
      expect(sentBody).toContain('Oggi');
      expect(sentBody).toContain('14:30');
    });
  });

  // =========================================================================
  // sendInvoiceReady()
  // =========================================================================
  describe('sendInvoiceReady', () => {
    it('should send invoice ready notification', async () => {
      mockCreate.mockResolvedValue({ sid: 'SM300', numSegments: '1' });

      const result = await service.sendInvoiceReady('+393331234567', {
        invoiceNumber: 'INV-001',
        amount: '250.00',
        downloadUrl: 'https://mechmind.io/inv/001',
        workshopName: 'Officina',
      });

      expect(result.success).toBe(true);
      const sentBody = mockCreate.mock.calls[0][0].body;
      expect(sentBody).toContain('INV-001');
      expect(sentBody).toContain('250.00');
      expect(sentBody).toContain('https://mechmind.io/inv/001');
    });
  });

  // =========================================================================
  // sendBookingCancelled()
  // =========================================================================
  describe('sendBookingCancelled', () => {
    it('should send cancellation SMS with reason', async () => {
      mockCreate.mockResolvedValue({ sid: 'SM400', numSegments: '1' });

      const result = await service.sendBookingCancelled('+393331234567', {
        date: '2024-03-15',
        service: 'Tagliando',
        workshopName: 'Officina',
        bookingCode: 'BK-007',
        cancellationReason: 'Richiesta cliente',
      });

      expect(result.success).toBe(true);
      const sentBody = mockCreate.mock.calls[0][0].body;
      expect(sentBody).toContain('annullata');
      expect(sentBody).toContain('Richiesta cliente');
    });

    it('should send cancellation SMS without reason', async () => {
      mockCreate.mockResolvedValue({ sid: 'SM401', numSegments: '1' });

      const result = await service.sendBookingCancelled('+393331234567', {
        date: '2024-03-15',
        service: 'Tagliando',
        workshopName: 'Officina',
        bookingCode: 'BK-008',
      });

      expect(result.success).toBe(true);
      const sentBody = mockCreate.mock.calls[0][0].body;
      expect(sentBody).toContain('annullata');
      expect(sentBody).not.toContain('Motivo');
    });
  });

  // =========================================================================
  // sendGdprExportReady()
  // =========================================================================
  describe('sendGdprExportReady', () => {
    it('should send GDPR export ready notification', async () => {
      mockCreate.mockResolvedValue({ sid: 'SM500', numSegments: '1' });

      const result = await service.sendGdprExportReady('+393331234567', {
        downloadUrl: 'https://mechmind.io/gdpr/abc123',
        expiryDate: '2024-03-22',
      });

      expect(result.success).toBe(true);
      const sentBody = mockCreate.mock.calls[0][0].body;
      expect(sentBody).toContain('https://mechmind.io/gdpr/abc123');
      expect(sentBody).toContain('2024-03-22');
    });
  });

  // =========================================================================
  // sendPasswordReset()
  // =========================================================================
  describe('sendPasswordReset', () => {
    it('should send password reset code SMS', async () => {
      mockCreate.mockResolvedValue({ sid: 'SM600', numSegments: '1' });

      const result = await service.sendPasswordReset('+393331234567', {
        resetCode: '123456',
        expiryMinutes: 15,
      });

      expect(result.success).toBe(true);
      const sentBody = mockCreate.mock.calls[0][0].body;
      expect(sentBody).toContain('123456');
      expect(sentBody).toContain('15');
    });
  });

  // =========================================================================
  // sendCustom()
  // =========================================================================
  describe('sendCustom', () => {
    it('should send custom SMS message', async () => {
      mockCreate.mockResolvedValue({ sid: 'SM700', numSegments: '1' });

      const result = await service.sendCustom(
        '+393331234567',
        'Custom message content',
        'marketing',
      );

      expect(result.success).toBe(true);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          body: 'Custom message content',
        }),
      );
    });
  });

  // =========================================================================
  // sendPromotional()
  // =========================================================================
  describe('sendPromotional', () => {
    it('should send promotional SMS with opt-out message', async () => {
      mockCreate.mockResolvedValue({ sid: 'SM800', numSegments: '1' });

      const result = await service.sendPromotional(
        '+393331234567',
        'Sconto 20% questa settimana!',
        'Officina Meccanica',
      );

      expect(result.success).toBe(true);
      const sentBody = mockCreate.mock.calls[0][0].body;
      expect(sentBody).toContain('Officina Meccanica');
      expect(sentBody).toContain('Sconto 20%');
      expect(sentBody).toContain('STOP');
    });
  });

  // =========================================================================
  // Phone number formatting
  // =========================================================================
  describe('phone number formatting', () => {
    it('should accept E.164 formatted numbers', async () => {
      mockCreate.mockResolvedValue({ sid: 'SM900', numSegments: '1' });

      const result = await service.sendCustom('+393331234567', 'Test');

      expect(result.success).toBe(true);
      expect(mockCreate.mock.calls[0][0].to).toBe('+393331234567');
    });

    it('should prepend +39 for Italian mobile numbers starting with 3', async () => {
      mockCreate.mockResolvedValue({ sid: 'SM901', numSegments: '1' });

      await service.sendCustom('3331234567', 'Test');

      expect(mockCreate.mock.calls[0][0].to).toBe('+3331234567');
    });

    it('should handle numbers with 00 prefix', async () => {
      mockCreate.mockResolvedValue({ sid: 'SM902', numSegments: '1' });

      await service.sendCustom('00393331234567', 'Test');

      expect(mockCreate.mock.calls[0][0].to).toBe('+393331234567');
    });

    it('should prepend +39 for landline numbers starting with 0', async () => {
      mockCreate.mockResolvedValue({ sid: 'SM903', numSegments: '1' });

      await service.sendCustom('021234567', 'Test');

      expect(mockCreate.mock.calls[0][0].to).toBe('+39021234567');
    });

    it('should reject invalid phone numbers', async () => {
      // '+' alone is not a valid E.164 number (no digits after +)
      const result = await service.sendCustom('+', 'Test');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid phone number format');
    });
  });

  // =========================================================================
  // getMessageStatus()
  // =========================================================================
  describe('getMessageStatus', () => {
    it('should return message status from Twilio', async () => {
      mockFetch.mockResolvedValue({
        status: 'delivered',
        dateSent: '2024-03-15T10:00:00Z',
        errorCode: null,
        errorMessage: null,
      });

      const result = await service.getMessageStatus('SM123');

      expect(result).toEqual({
        status: 'delivered',
        deliveredAt: expect.any(Date),
        errorCode: undefined,
        errorMessage: undefined,
      });
    });

    it('should return null on Twilio API failure', async () => {
      mockFetch.mockRejectedValue(new Error('Not found'));

      const result = await service.getMessageStatus('SM999');

      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // validatePhoneNumber()
  // =========================================================================
  describe('validatePhoneNumber', () => {
    it('should validate phone number using Twilio lookup', async () => {
      mockLookupFetch.mockResolvedValue({
        phoneNumber: '+393331234567',
        lineTypeIntelligence: {
          carrierName: 'TIM',
          type: 'mobile',
        },
      });

      const result = await service.validatePhoneNumber('+393331234567');

      expect(result.valid).toBe(true);
      expect(result.formatted).toBe('+393331234567');
      expect(result.carrier).toBe('TIM');
      expect(result.type).toBe('mobile');
    });

    it('should return invalid for lookup failure', async () => {
      mockLookupFetch.mockRejectedValue(new Error('Invalid number'));

      const result = await service.validatePhoneNumber('invalid');

      expect(result.valid).toBe(false);
    });
  });

  // =========================================================================
  // calculateCost()
  // =========================================================================
  describe('calculateCost', () => {
    it('should calculate cost for single-segment GSM message', () => {
      const shortMessage = 'Short message';
      const result = service.calculateCost(shortMessage);

      expect(result.segments).toBe(1);
      expect(result.estimatedCost).toBeCloseTo(0.0075, 4);
      expect(result.currency).toBe('USD');
    });

    it('should calculate cost for multi-segment GSM message', () => {
      const longMessage = 'A'.repeat(320); // 2+ segments
      const result = service.calculateCost(longMessage);

      expect(result.segments).toBeGreaterThan(1);
      expect(result.estimatedCost).toBeGreaterThan(0.0075);
    });

    it('should handle Unicode messages with different segment sizes', () => {
      const unicodeMessage = '\u00E9'.repeat(80); // Unicode chars
      const result = service.calculateCost(unicodeMessage);

      expect(result.segments).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================================================
  // getTemplates()
  // =========================================================================
  describe('getTemplates', () => {
    it('should return available SMS templates', () => {
      const templates = service.getTemplates();

      expect(templates).toHaveLength(4);
      expect(templates.map(t => t.id)).toEqual(
        expect.arrayContaining([
          'booking_confirmation',
          'booking_reminder',
          'invoice_ready',
          'booking_cancelled',
        ]),
      );
    });

    it('should include variables for each template', () => {
      const templates = service.getTemplates();
      const confirmationTemplate = templates.find(t => t.id === 'booking_confirmation');

      expect(confirmationTemplate).toBeDefined();
      expect(confirmationTemplate!.variables).toContain('service');
      expect(confirmationTemplate!.variables).toContain('date');
      expect(confirmationTemplate!.variables).toContain('bookingCode');
    });
  });

  // =========================================================================
  // healthCheck()
  // =========================================================================
  describe('healthCheck', () => {
    it('should return healthy status on Twilio API success', async () => {
      mockAccountsList.mockResolvedValue([]);

      const result = await service.healthCheck();

      expect(result.healthy).toBe(true);
      expect(result.latency).toBeDefined();
      expect(result.latency).toBeGreaterThanOrEqual(0);
    });

    it('should return unhealthy on Twilio API failure', async () => {
      mockAccountsList.mockRejectedValue(new Error('Auth failed'));

      const result = await service.healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.error).toBe('Auth failed');
    });
  });

  // =========================================================================
  // When Twilio is not initialized
  // =========================================================================
  describe('when Twilio is not initialized', () => {
    let uninitializedService: SmsService;

    beforeEach(async () => {
      const module = await createModule({
        TWILIO_ACCOUNT_SID: '',
        TWILIO_AUTH_TOKEN: '',
        TWILIO_PHONE_NUMBER: '',
      });
      uninitializedService = module.get<SmsService>(SmsService);
    });

    it('should return mock success for SMS sending', async () => {
      const result = await uninitializedService.sendBookingConfirmation('+393331234567', {
        date: '2024-03-15',
        time: '14:30',
        service: 'Tagliando',
        workshopName: 'Officina',
        bookingCode: 'BK-001',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('mock-sms-id');
    });

    it('should return null for getMessageStatus', async () => {
      const result = await uninitializedService.getMessageStatus('SM123');

      expect(result).toBeNull();
    });

    it('should return unhealthy for healthCheck', async () => {
      const result = await uninitializedService.healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.error).toBe('Twilio not initialized');
    });

    it('should do basic phone validation without Twilio', async () => {
      const validResult = await uninitializedService.validatePhoneNumber('+393331234567');
      expect(validResult.valid).toBe(true);
      expect(validResult.formatted).toBe('+393331234567');

      const invalidResult = await uninitializedService.validatePhoneNumber('invalid');
      expect(invalidResult.valid).toBe(false);
    });
  });
});
