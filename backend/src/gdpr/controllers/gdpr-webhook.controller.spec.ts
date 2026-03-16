import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { GdprWebhookController } from './gdpr-webhook.controller';
import { GdprRequestService } from '../services/gdpr-request.service';
import { LoggerService } from '@common/services/logger.service';

describe('GdprWebhookController', () => {
  let controller: GdprWebhookController;
  let requestService: jest.Mocked<GdprRequestService>;
  let loggerService: jest.Mocked<LoggerService>;

  const TENANT_ID = 'tenant-001';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GdprWebhookController],
      providers: [
        {
          provide: GdprRequestService,
          useValue: {
            createRequest: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<GdprWebhookController>(GdprWebhookController);
    requestService = module.get(GdprRequestService) as jest.Mocked<GdprRequestService>;
    loggerService = module.get(LoggerService) as jest.Mocked<LoggerService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handleDataSubjectRequest', () => {
    const validBody = {
      tenantId: TENANT_ID,
      requestType: 'ERASURE',
      requesterEmail: 'john@example.com',
      requesterPhone: '+39123456789',
      customerId: 'cust-001',
      message: 'Please delete my data',
      source: 'WEB_FORM',
    };

    it('should delegate to requestService.createRequest and return ticket info', async () => {
      requestService.createRequest.mockResolvedValue({
        ticketNumber: 'GDPR-2026-0001',
      } as never);

      const result = await controller.handleDataSubjectRequest(validBody, 'sig-123');

      expect(requestService.createRequest).toHaveBeenCalledWith({
        tenantId: TENANT_ID,
        requestType: 'ERASURE',
        requesterEmail: 'john@example.com',
        requesterPhone: '+39123456789',
        customerId: 'cust-001',
        source: 'WEB_FORM',
        notes: 'Please delete my data',
      });
      expect(result).toEqual({
        received: true,
        ticketNumber: 'GDPR-2026-0001',
        message: 'Your request has been received and will be processed within 30 days.',
      });
    });

    it('should log the incoming webhook', async () => {
      requestService.createRequest.mockResolvedValue({
        ticketNumber: 'GDPR-2026-0002',
      } as never);

      await controller.handleDataSubjectRequest(validBody, 'sig-123');

      expect(loggerService.log).toHaveBeenCalledWith(
        'Received data subject request webhook from WEB_FORM',
        'GdprWebhookController',
      );
    });

    it('should throw BadRequestException when tenantId is missing', async () => {
      const invalidBody = { ...validBody, tenantId: undefined } as never;

      await expect(controller.handleDataSubjectRequest(invalidBody, 'sig')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when requestType is missing', async () => {
      const invalidBody = { ...validBody, requestType: undefined } as never;

      await expect(controller.handleDataSubjectRequest(invalidBody, 'sig')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when source is missing', async () => {
      const invalidBody = { ...validBody, source: undefined } as never;

      await expect(controller.handleDataSubjectRequest(invalidBody, 'sig')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('handleConsentUpdate', () => {
    const validBody = {
      tenantId: TENANT_ID,
      customerId: 'cust-001',
      consentType: 'MARKETING',
      granted: true,
      timestamp: '2026-03-16T00:00:00Z',
      source: 'WEB_FORM',
    };

    it('should return processed true for valid consent update', async () => {
      const result = await controller.handleConsentUpdate(validBody);

      expect(result).toEqual({ processed: true });
    });

    it('should log the consent update', async () => {
      await controller.handleConsentUpdate(validBody);

      expect(loggerService.log).toHaveBeenCalledWith(
        'Received consent update webhook: customer=cust-001, type=MARKETING, granted=true',
        'GdprWebhookController',
      );
    });

    it('should throw BadRequestException when tenantId is missing', async () => {
      const invalidBody = { ...validBody, tenantId: undefined } as never;

      await expect(controller.handleConsentUpdate(invalidBody)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when customerId is missing', async () => {
      const invalidBody = { ...validBody, customerId: undefined } as never;

      await expect(controller.handleConsentUpdate(invalidBody)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when consentType is missing', async () => {
      const invalidBody = { ...validBody, consentType: undefined } as never;

      await expect(controller.handleConsentUpdate(invalidBody)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('handleDeletionConfirmation', () => {
    const validBody = {
      subProcessor: 'stripe',
      customerId: 'cust-001',
      deletionType: 'FULL',
      deletedAt: '2026-03-16T00:00:00Z',
      confirmationId: 'conf-abc-123',
    };

    it('should return acknowledged true for valid deletion confirmation', async () => {
      const result = await controller.handleDeletionConfirmation(validBody);

      expect(result).toEqual({ acknowledged: true });
    });

    it('should log the deletion confirmation', async () => {
      await controller.handleDeletionConfirmation(validBody);

      expect(loggerService.log).toHaveBeenCalledWith(
        'Received deletion confirmation from stripe: conf-abc-123',
        'GdprWebhookController',
      );
    });

    it('should throw BadRequestException when subProcessor is missing', async () => {
      const invalidBody = { ...validBody, subProcessor: undefined } as never;

      await expect(controller.handleDeletionConfirmation(invalidBody)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when confirmationId is missing', async () => {
      const invalidBody = { ...validBody, confirmationId: undefined } as never;

      await expect(controller.handleDeletionConfirmation(invalidBody)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
