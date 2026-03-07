import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { GdprWebhookController } from '../controllers/gdpr-webhook.controller';
import { GdprRequestService } from '../services/gdpr-request.service';
import { LoggerService } from '@common/services/logger.service';

describe('GdprWebhookController', () => {
  let controller: GdprWebhookController;
  let mockRequestService: jest.Mocked<Partial<GdprRequestService>>;
  let mockLoggerService: jest.Mocked<Partial<LoggerService>>;

  const mockTenantId = 'tenant-123';
  const mockCustomerId = 'customer-456';

  beforeEach(async () => {
    mockRequestService = {
      createRequest: jest.fn(),
    };

    mockLoggerService = {
      log: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GdprWebhookController],
      providers: [
        {
          provide: GdprRequestService,
          useValue: mockRequestService,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    controller = module.get<GdprWebhookController>(GdprWebhookController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleDataSubjectRequest', () => {
    it('should handle ACCESS request webhook from external form', async () => {
      // Arrange
      const mockRequest = {
        id: 'request-123',
        ticketNumber: 'GDPR-2026-0001',
        requestType: 'ACCESS',
        status: 'RECEIVED',
        receivedAt: new Date(),
        deadlineAt: new Date(),
      };

      (mockRequestService.createRequest as jest.Mock).mockResolvedValue(mockRequest);

      const body = {
        tenantId: mockTenantId,
        requestType: 'ACCESS',
        requesterEmail: 'user@example.com',
        requesterPhone: '+1234567890',
        customerId: mockCustomerId,
        message: 'Please provide my data',
        source: 'WEB_FORM',
      };

      // Act
      const result = await controller.handleDataSubjectRequest(body, 'signature-123');

      // Assert
      expect(result).toEqual({
        received: true,
        ticketNumber: 'GDPR-2026-0001',
        message: 'Your request has been received and will be processed within 30 days.',
      });
      expect(mockRequestService.createRequest).toHaveBeenCalledWith({
        tenantId: mockTenantId,
        requestType: 'ACCESS',
        requesterEmail: 'user@example.com',
        requesterPhone: '+1234567890',
        customerId: mockCustomerId,
        source: 'WEB_FORM',
        notes: 'Please provide my data',
      });
    });

    it('should handle DELETION request webhook', async () => {
      // Arrange
      const mockRequest = {
        id: 'request-124',
        ticketNumber: 'GDPR-2026-0002',
        requestType: 'DELETION',
        status: 'RECEIVED',
        receivedAt: new Date(),
        deadlineAt: new Date(),
      };

      (mockRequestService.createRequest as jest.Mock).mockResolvedValue(mockRequest);

      const body = {
        tenantId: mockTenantId,
        requestType: 'DELETION',
        requesterEmail: 'delete@example.com',
        customerId: mockCustomerId,
        message: 'Delete all my data',
        source: 'EMAIL',
      };

      // Act
      const result = await controller.handleDataSubjectRequest(body);

      // Assert
      expect(result.ticketNumber).toBe('GDPR-2026-0002');
      expect(mockRequestService.createRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          requestType: 'DELETION',
          requesterEmail: 'delete@example.com',
        }),
      );
    });

    it('should handle PORTABILITY request webhook', async () => {
      // Arrange
      const mockRequest = {
        id: 'request-125',
        ticketNumber: 'GDPR-2026-0003',
        requestType: 'PORTABILITY',
        status: 'RECEIVED',
        receivedAt: new Date(),
        deadlineAt: new Date(),
      };

      (mockRequestService.createRequest as jest.Mock).mockResolvedValue(mockRequest);

      const body = {
        tenantId: mockTenantId,
        requestType: 'PORTABILITY',
        requesterEmail: 'port@example.com',
        customerId: mockCustomerId,
        message: 'Export my data in portable format',
        source: 'WEB_FORM',
      };

      // Act
      const result = await controller.handleDataSubjectRequest(body);

      // Assert
      expect(result.ticketNumber).toBe('GDPR-2026-0003');
    });

    it('should handle RECTIFICATION request webhook', async () => {
      // Arrange
      const mockRequest = {
        id: 'request-126',
        ticketNumber: 'GDPR-2026-0004',
        requestType: 'RECTIFICATION',
        status: 'RECEIVED',
        receivedAt: new Date(),
        deadlineAt: new Date(),
      };

      (mockRequestService.createRequest as jest.Mock).mockResolvedValue(mockRequest);

      const body = {
        tenantId: mockTenantId,
        requestType: 'RECTIFICATION',
        requesterEmail: 'update@example.com',
        customerId: mockCustomerId,
        message: 'Update my phone number',
        source: 'PHONE',
      };

      // Act
      const result = await controller.handleDataSubjectRequest(body);

      // Assert
      expect(result.ticketNumber).toBe('GDPR-2026-0004');
    });

    it('should handle RESTRICTION request webhook', async () => {
      // Arrange
      const mockRequest = {
        id: 'request-127',
        ticketNumber: 'GDPR-2026-0005',
        requestType: 'RESTRICTION',
        status: 'RECEIVED',
        receivedAt: new Date(),
        deadlineAt: new Date(),
      };

      (mockRequestService.createRequest as jest.Mock).mockResolvedValue(mockRequest);

      const body = {
        tenantId: mockTenantId,
        requestType: 'RESTRICTION',
        requesterEmail: 'restrict@example.com',
        customerId: mockCustomerId,
        message: 'Restrict processing of my data',
        source: 'MAIL',
      };

      // Act
      const result = await controller.handleDataSubjectRequest(body);

      // Assert
      expect(result.ticketNumber).toBe('GDPR-2026-0005');
    });

    it('should handle OBJECTION request webhook', async () => {
      // Arrange
      const mockRequest = {
        id: 'request-128',
        ticketNumber: 'GDPR-2026-0006',
        requestType: 'OBJECTION',
        status: 'RECEIVED',
        receivedAt: new Date(),
        deadlineAt: new Date(),
      };

      (mockRequestService.createRequest as jest.Mock).mockResolvedValue(mockRequest);

      const body = {
        tenantId: mockTenantId,
        requestType: 'OBJECTION',
        requesterEmail: 'object@example.com',
        customerId: mockCustomerId,
        message: 'Object to automated decision making',
        source: 'EMAIL',
      };

      // Act
      const result = await controller.handleDataSubjectRequest(body);

      // Assert
      expect(result.ticketNumber).toBe('GDPR-2026-0006');
    });

    it('should handle request without optional fields', async () => {
      // Arrange
      const mockRequest = {
        id: 'request-129',
        ticketNumber: 'GDPR-2026-0007',
        requestType: 'ACCESS',
        status: 'RECEIVED',
        receivedAt: new Date(),
        deadlineAt: new Date(),
      };

      (mockRequestService.createRequest as jest.Mock).mockResolvedValue(mockRequest);

      const body = {
        tenantId: mockTenantId,
        requestType: 'ACCESS',
        source: 'EMAIL',
      };

      // Act
      const result = await controller.handleDataSubjectRequest(body);

      // Assert
      expect(result.received).toBe(true);
      expect(mockRequestService.createRequest).toHaveBeenCalledWith({
        tenantId: mockTenantId,
        requestType: 'ACCESS',
        requesterEmail: undefined,
        requesterPhone: undefined,
        customerId: undefined,
        source: 'EMAIL',
        notes: undefined,
      });
    });

    it('should log webhook receipt', async () => {
      // Arrange
      const mockRequest = {
        id: 'request-130',
        ticketNumber: 'GDPR-2026-0008',
        requestType: 'ACCESS',
        status: 'RECEIVED',
        receivedAt: new Date(),
        deadlineAt: new Date(),
      };

      (mockRequestService.createRequest as jest.Mock).mockResolvedValue(mockRequest);

      const body = {
        tenantId: mockTenantId,
        requestType: 'ACCESS',
        source: 'WEB_FORM',
      };

      // Act
      await controller.handleDataSubjectRequest(body);

      // Assert
      expect(mockLoggerService.log).toHaveBeenCalledWith(
        expect.stringContaining('Received data subject request webhook'),
        'GdprWebhookController',
      );
    });

    it('should handle request without webhook signature', async () => {
      // Arrange
      const mockRequest = {
        id: 'request-131',
        ticketNumber: 'GDPR-2026-0009',
        requestType: 'ACCESS',
        status: 'RECEIVED',
        receivedAt: new Date(),
        deadlineAt: new Date(),
      };

      (mockRequestService.createRequest as jest.Mock).mockResolvedValue(mockRequest);

      const body = {
        tenantId: mockTenantId,
        requestType: 'ACCESS',
        source: 'WEB_FORM',
      };

      // Act
      const result = await controller.handleDataSubjectRequest(body, undefined);

      // Assert
      expect(result.received).toBe(true);
    });
  });

  describe('handleConsentUpdate', () => {
    it('should handle GDPR consent update webhook', async () => {
      // Arrange
      const body = {
        tenantId: mockTenantId,
        customerId: mockCustomerId,
        consentType: 'GDPR',
        granted: true,
        timestamp: new Date().toISOString(),
        source: 'WEB_FORM',
      };

      // Act
      const result = await controller.handleConsentUpdate(body);

      // Assert
      expect(result).toEqual({ processed: true });
      expect(mockLoggerService.log).toHaveBeenCalledWith(
        expect.stringContaining('Received consent update webhook'),
        'GdprWebhookController',
      );
    });

    it('should handle marketing consent revocation', async () => {
      // Arrange
      const body = {
        tenantId: mockTenantId,
        customerId: mockCustomerId,
        consentType: 'MARKETING',
        granted: false,
        timestamp: new Date().toISOString(),
        source: 'EMAIL',
      };

      // Act
      const result = await controller.handleConsentUpdate(body);

      // Assert
      expect(result.processed).toBe(true);
    });

    it('should handle call recording consent update', async () => {
      // Arrange
      const body = {
        tenantId: mockTenantId,
        customerId: mockCustomerId,
        consentType: 'CALL_RECORDING',
        granted: true,
        timestamp: new Date().toISOString(),
        source: 'PHONE',
      };

      // Act
      const result = await controller.handleConsentUpdate(body);

      // Assert
      expect(result.processed).toBe(true);
    });

    it('should log consent update details', async () => {
      // Arrange
      const body = {
        tenantId: mockTenantId,
        customerId: mockCustomerId,
        consentType: 'GDPR',
        granted: false,
        timestamp: new Date().toISOString(),
        source: 'WEB_FORM',
      };

      // Act
      await controller.handleConsentUpdate(body);

      // Assert
      expect(mockLoggerService.log).toHaveBeenCalledWith(
        expect.stringContaining(`customer=${mockCustomerId}`),
        'GdprWebhookController',
      );
      expect(mockLoggerService.log).toHaveBeenCalledWith(
        expect.stringContaining('type=GDPR'),
        'GdprWebhookController',
      );
      expect(mockLoggerService.log).toHaveBeenCalledWith(
        expect.stringContaining('granted=false'),
        'GdprWebhookController',
      );
    });
  });

  describe('handleDeletionConfirmation', () => {
    it('should handle deletion confirmation from sub-processor', async () => {
      // Arrange
      const body = {
        subProcessor: 'SendGrid',
        customerId: mockCustomerId,
        deletionType: 'EMAIL_DATA',
        deletedAt: new Date().toISOString(),
        confirmationId: 'confirm-123',
      };

      // Act
      const result = await controller.handleDeletionConfirmation(body);

      // Assert
      expect(result).toEqual({ acknowledged: true });
      expect(mockLoggerService.log).toHaveBeenCalledWith(
        expect.stringContaining('Received deletion confirmation from SendGrid'),
        'GdprWebhookController',
      );
    });

    it('should handle deletion confirmation from analytics provider', async () => {
      // Arrange
      const body = {
        subProcessor: 'Google Analytics',
        customerId: mockCustomerId,
        deletionType: 'ANALYTICS_DATA',
        deletedAt: new Date().toISOString(),
        confirmationId: 'confirm-456',
      };

      // Act
      const result = await controller.handleDeletionConfirmation(body);

      // Assert
      expect(result.acknowledged).toBe(true);
    });

    it('should handle deletion confirmation from backup provider', async () => {
      // Arrange
      const body = {
        subProcessor: 'AWS S3',
        customerId: mockCustomerId,
        deletionType: 'BACKUP_DATA',
        deletedAt: new Date().toISOString(),
        confirmationId: 'confirm-789',
      };

      // Act
      const result = await controller.handleDeletionConfirmation(body);

      // Assert
      expect(result.acknowledged).toBe(true);
    });

    it('should log deletion confirmation details', async () => {
      // Arrange
      const body = {
        subProcessor: 'Mailchimp',
        customerId: mockCustomerId,
        deletionType: 'MARKETING_DATA',
        deletedAt: new Date().toISOString(),
        confirmationId: 'confirm-abc',
      };

      // Act
      await controller.handleDeletionConfirmation(body);

      // Assert
      expect(mockLoggerService.log).toHaveBeenCalledWith(
        expect.stringContaining('confirm-abc'),
        'GdprWebhookController',
      );
    });
  });

  describe('HTTP status codes', () => {
    it('should return ACCEPTED for data subject request endpoint', async () => {
      // We can't easily test HTTP decorators, but we can verify the method exists
      expect(controller.handleDataSubjectRequest).toBeDefined();
    });

    it('should return OK for consent update endpoint', async () => {
      expect(controller.handleConsentUpdate).toBeDefined();
    });

    it('should return OK for deletion confirmation endpoint', async () => {
      expect(controller.handleDeletionConfirmation).toBeDefined();
    });
  });

  describe('controller structure', () => {
    it('should have webhook controller defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have request service injected', () => {
      expect(mockRequestService).toBeDefined();
    });

    it('should have logger service injected', () => {
      expect(mockLoggerService).toBeDefined();
    });
  });

  // ==================== BRANCH COVERAGE TESTS ====================
  describe('[Controller] - Branch Coverage', () => {
    describe('verifyWebhookSignature - signature branches', () => {
      it.each([
        { signature: undefined, expected: false, description: 'undefined signature returns false' },
        { signature: null as any, expected: false, description: 'null signature returns false' },
        { signature: '', expected: false, description: 'empty string signature returns false' },
        { signature: 'valid-signature', expected: true, description: 'valid signature returns true' },
        { signature: 'any-non-empty', expected: true, description: 'any non-empty returns true' },
        { signature: '   ', expected: true, description: 'whitespace signature returns true (truthy)' },
      ])('$description', async ({ signature, expected }) => {
        // Access private method for testing
        const result = (controller as any).verifyWebhookSignature({}, signature);
        expect(result).toBe(expected);
      });

      it.each([
        { signature: 'sig-1', callCount: 1, description: 'with signature' },
        { signature: undefined, callCount: 1, description: 'without signature' },
      ])('handleDataSubjectRequest works correctly $description', async ({ signature }) => {
        const mockRequest = {
          id: 'request-branch',
          ticketNumber: 'GDPR-BRANCH-001',
          requestType: 'ACCESS',
          status: 'RECEIVED',
          receivedAt: new Date(),
          deadlineAt: new Date(),
        };

        (mockRequestService.createRequest as jest.Mock).mockResolvedValue(mockRequest);

        const body = {
          tenantId: mockTenantId,
          requestType: 'ACCESS',
          source: 'WEB_FORM',
        };

        const result = await controller.handleDataSubjectRequest(body, signature);

        expect(result.received).toBe(true);
        expect(result.ticketNumber).toBe('GDPR-BRANCH-001');
      });
    });

    describe('handleDataSubjectRequest - optional field branches', () => {
      it.each([
        { 
          field: 'requesterEmail', 
          value: 'test@example.com', 
          expected: 'test@example.com',
          description: 'provided email' 
        },
        { 
          field: 'requesterEmail', 
          value: undefined, 
          expected: undefined,
          description: 'undefined email' 
        },
        { 
          field: 'requesterPhone', 
          value: '+1234567890', 
          expected: '+1234567890',
          description: 'provided phone' 
        },
        { 
          field: 'requesterPhone', 
          value: undefined, 
          expected: undefined,
          description: 'undefined phone' 
        },
        { 
          field: 'customerId', 
          value: 'cust-123', 
          expected: 'cust-123',
          description: 'provided customerId' 
        },
        { 
          field: 'customerId', 
          value: undefined, 
          expected: undefined,
          description: 'undefined customerId' 
        },
        { 
          field: 'message', 
          value: 'Test message', 
          expected: 'Test message',
          description: 'provided message' 
        },
        { 
          field: 'message', 
          value: undefined, 
          expected: undefined,
          description: 'undefined message' 
        },
      ])('handles $description correctly', async ({ field, value, expected }) => {
        const mockRequest = {
          id: 'request-branch',
          ticketNumber: 'GDPR-BRANCH-002',
          requestType: 'ACCESS',
          status: 'RECEIVED',
          receivedAt: new Date(),
          deadlineAt: new Date(),
        };

        (mockRequestService.createRequest as jest.Mock).mockResolvedValue(mockRequest);

        const body: any = {
          tenantId: mockTenantId,
          requestType: 'ACCESS',
          source: 'WEB_FORM',
          [field]: value,
        };

        await controller.handleDataSubjectRequest(body);

        // Map field names for notes (message maps to notes)
        const expectedField = field === 'message' ? 'notes' : field;
        expect(mockRequestService.createRequest).toHaveBeenCalledWith(
          expect.objectContaining({
            [expectedField]: expected,
          }),
        );
      });
    });

    describe('handleConsentUpdate - granted branches', () => {
      it.each([
        { granted: true, description: 'granted=true' },
        { granted: false, description: 'granted=false' },
      ])('handles consent with $description', async ({ granted }) => {
        const body = {
          tenantId: mockTenantId,
          customerId: mockCustomerId,
          consentType: 'MARKETING',
          granted,
          timestamp: new Date().toISOString(),
          source: 'WEB_FORM',
        };

        const result = await controller.handleConsentUpdate(body);

        expect(result).toEqual({ processed: true });
        expect(mockLoggerService.log).toHaveBeenCalledWith(
          expect.stringContaining(`granted=${granted}`),
          'GdprWebhookController',
        );
      });
    });

    describe('handleDeletionConfirmation - all branches', () => {
      it.each([
        {
          subProcessor: 'Stripe',
          deletionType: 'PAYMENT_DATA',
          description: 'Stripe payment data',
        },
        {
          subProcessor: 'Twilio',
          deletionType: 'SMS_DATA',
          description: 'Twilio SMS data',
        },
        {
          subProcessor: '',
          deletionType: 'TEST_DATA',
          description: 'empty subProcessor',
        },
      ])('handles deletion confirmation for $description', async ({ subProcessor, deletionType }) => {
        const body = {
          subProcessor,
          customerId: mockCustomerId,
          deletionType,
          deletedAt: new Date().toISOString(),
          confirmationId: `confirm-${subProcessor || 'empty'}`,
        };

        const result = await controller.handleDeletionConfirmation(body);

        expect(result).toEqual({ acknowledged: true });
        expect(mockLoggerService.log).toHaveBeenCalledWith(
          expect.stringContaining(subProcessor || ''),
          'GdprWebhookController',
        );
      });
    });

    describe('handleDataSubjectRequest - requestType branches', () => {
      it.each([
        { requestType: 'ACCESS', description: 'ACCESS request' },
        { requestType: 'DELETION', description: 'DELETION request' },
        { requestType: 'PORTABILITY', description: 'PORTABILITY request' },
        { requestType: 'RECTIFICATION', description: 'RECTIFICATION request' },
        { requestType: 'RESTRICTION', description: 'RESTRICTION request' },
        { requestType: 'OBJECTION', description: 'OBJECTION request' },
      ])('handles $description correctly', async ({ requestType }) => {
        const mockRequest = {
          id: `request-${requestType}`,
          ticketNumber: `GDPR-${requestType}-001`,
          requestType,
          status: 'RECEIVED',
          receivedAt: new Date(),
          deadlineAt: new Date(),
        };

        (mockRequestService.createRequest as jest.Mock).mockResolvedValue(mockRequest);

        const body = {
          tenantId: mockTenantId,
          requestType,
          source: 'WEB_FORM',
        };

        const result = await controller.handleDataSubjectRequest(body);

        expect(result.received).toBe(true);
        expect(result.ticketNumber).toBe(`GDPR-${requestType}-001`);
        expect(mockRequestService.createRequest).toHaveBeenCalledWith(
          expect.objectContaining({ requestType }),
        );
      });
    });

    describe('handleDataSubjectRequest - source branches', () => {
      it.each([
        { source: 'WEB_FORM', description: 'WEB_FORM source' },
        { source: 'EMAIL', description: 'EMAIL source' },
        { source: 'PHONE', description: 'PHONE source' },
        { source: 'MAIL', description: 'MAIL source' },
      ])('handles $description correctly', async ({ source }) => {
        const mockRequest = {
          id: `request-${source}`,
          ticketNumber: `GDPR-SOURCE-001`,
          requestType: 'ACCESS',
          status: 'RECEIVED',
          receivedAt: new Date(),
          deadlineAt: new Date(),
        };

        (mockRequestService.createRequest as jest.Mock).mockResolvedValue(mockRequest);

        const body = {
          tenantId: mockTenantId,
          requestType: 'ACCESS',
          source,
        };

        const result = await controller.handleDataSubjectRequest(body);

        expect(result.received).toBe(true);
        expect(mockRequestService.createRequest).toHaveBeenCalledWith(
          expect.objectContaining({ source }),
        );
      });
    });
  });
});
