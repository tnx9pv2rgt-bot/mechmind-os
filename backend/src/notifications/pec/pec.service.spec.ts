import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PecService, FirDigitaleData } from './pec.service';
import * as nodemailer from 'nodemailer';

jest.mock('nodemailer');

type MockTransporter = { sendMail: jest.Mock; verify: jest.Mock };
type ConfigMap = Record<string, string | number | undefined>;

describe('PecService', () => {
  let service: PecService;
  let mockTransporter: MockTransporter;

  beforeEach(async () => {
    mockTransporter = {
      sendMail: jest.fn(),
      verify: jest.fn(),
    };

    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PecService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) => {
              const config: ConfigMap = {
                PEC_SMTP_HOST: 'smtps.pec.aruba.it',
                PEC_SMTP_PORT: 465,
                PEC_SMTP_USER: 'test@pec.aruba.it',
                PEC_SMTP_PASS: 'password123',
                PEC_FROM_ADDRESS: 'noreply@pec.aruba.it',
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<PecService>(PecService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isConfigured', () => {
    it('should return true when all required env vars are set', () => {
      expect(service.isConfigured()).toBe(true);
    });

    it('should return false when SMTP_USER is missing', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PecService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string, defaultValue?: unknown) => {
                const config: ConfigMap = {
                  PEC_SMTP_HOST: 'smtps.pec.aruba.it',
                  PEC_SMTP_PORT: 465,
                  PEC_SMTP_USER: undefined,
                  PEC_SMTP_PASS: 'password123',
                };
                return config[key] ?? defaultValue;
              }),
            },
          },
        ],
      }).compile();

      const testService = module.get<PecService>(PecService);
      expect(testService.isConfigured()).toBe(false);
    });
  });

  describe('sendPec', () => {
    it('should send PEC successfully', async () => {
      mockTransporter.sendMail.mockResolvedValue({
        messageId: '<message-id@pec.aruba.it>',
      });

      const result = await service.sendPec(
        'customer@example.com',
        'Test Subject',
        '<p>Test HTML</p>',
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('<message-id@pec.aruba.it>');
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'noreply@pec.aruba.it',
          to: 'customer@example.com',
          subject: 'Test Subject',
          html: '<p>Test HTML</p>',
        }),
      );
    });

    it('should send PEC with attachments', async () => {
      mockTransporter.sendMail.mockResolvedValue({
        messageId: '<message-id@pec.aruba.it>',
      });

      const attachments = [
        {
          filename: 'test.xml',
          content: '<xml>test</xml>',
          contentType: 'application/xml',
        },
      ];

      const result = await service.sendPec(
        'customer@example.com',
        'Test',
        '<p>Test</p>',
        attachments,
      );

      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: expect.arrayContaining([
            expect.objectContaining({
              filename: 'test.xml',
              contentType: 'application/xml',
            }),
          ]),
        }),
      );
    });

    it('should return error on invalid email', async () => {
      const result = await service.sendPec('invalid-email', 'Subject', '<p>Test</p>');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email format');
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });

    it('should handle SMTP errors gracefully', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP connection failed'));

      const result = await service.sendPec('customer@example.com', 'Test', '<p>Test</p>');

      expect(result.success).toBe(false);
      expect(result.error).toBe('SMTP connection failed');
    });

    it('should return error when transporter is not initialized', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PecService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string, defaultValue?: unknown) => {
                if (key === 'PEC_SMTP_HOST') return undefined;
                if (key === 'PEC_SMTP_PORT') return 465;
                return defaultValue;
              }),
            },
          },
        ],
      }).compile();

      const testService = module.get<PecService>(PecService);
      const result = await testService.sendPec('customer@example.com', 'Test', '<p>Test</p>');

      expect(result.success).toBe(false);
      expect(result.error).toBe('PEC service not configured');
    });
  });

  describe('sendFirDigitale', () => {
    it('should send FIR digitale with correct subject and HTML', async () => {
      mockTransporter.sendMail.mockResolvedValue({
        messageId: '<message-id@pec.aruba.it>',
      });

      const firData: FirDigitaleData = {
        firNumber: 'FIR-2024-001',
        wasteType: 'Rifiuti pericolosi',
        quantity: 150,
      };

      const result = await service.sendFirDigitale('recipient@pec.it', firData);

      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: '[FIR Digitale] FIR-2024-001',
          html: expect.stringContaining('FIR-2024-001'),
        }),
      );
    });

    it('should include waste type and quantity in FIR email', async () => {
      mockTransporter.sendMail.mockResolvedValue({
        messageId: '<message-id@pec.aruba.it>',
      });

      const firData: FirDigitaleData = {
        firNumber: 'FIR-2024-002',
        wasteType: 'Oli usati',
        quantity: 250,
      };

      await service.sendFirDigitale('recipient@pec.it', firData);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('Oli usati');
      expect(callArgs.html).toContain('250');
    });
  });

  describe('sendFatturaElettronica', () => {
    it('should send invoice with XML attachment', async () => {
      mockTransporter.sendMail.mockResolvedValue({
        messageId: '<message-id@pec.aruba.it>',
      });

      const xmlContent = '<?xml version="1.0"?><Invoice></Invoice>';

      const result = await service.sendFatturaElettronica(
        'recipient@pec.it',
        'INV-2024-001',
        xmlContent,
      );

      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Fattura Elettronica INV-2024-001',
          attachments: expect.arrayContaining([
            expect.objectContaining({
              filename: 'fattura_INV-2024-001.xml',
              contentType: 'application/xml',
              content: xmlContent,
            }),
          ]),
        }),
      );
    });

    it('should handle XML content correctly as buffer or string', async () => {
      mockTransporter.sendMail.mockResolvedValue({
        messageId: '<message-id@pec.aruba.it>',
      });

      const xmlBuffer = Buffer.from('<?xml version="1.0"?><Invoice></Invoice>');

      const result = await service.sendFatturaElettronica(
        'recipient@pec.it',
        'INV-2024-002',
        xmlBuffer.toString(),
      );

      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalled();
    });
  });

  describe('verifyConnection', () => {
    it('should verify transporter connection successfully', async () => {
      mockTransporter.verify.mockResolvedValue(true);

      const result = await service.verifyConnection();

      expect(result).toBe(true);
      expect(mockTransporter.verify).toHaveBeenCalled();
    });

    it('should handle verification errors', async () => {
      mockTransporter.verify.mockRejectedValue(new Error('Connection failed'));

      const result = await service.verifyConnection();

      expect(result).toBe(false);
    });

    it('should return false when transporter is not initialized', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PecService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string, defaultValue?: unknown) => {
                if (key === 'PEC_SMTP_HOST') return undefined;
                if (key === 'PEC_SMTP_PORT') return 465;
                return defaultValue;
              }),
            },
          },
        ],
      }).compile();

      const testService = module.get<PecService>(PecService);
      const result = await testService.verifyConnection();

      expect(result).toBe(false);
    });
  });
});
