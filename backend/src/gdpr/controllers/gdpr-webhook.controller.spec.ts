import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Request } from 'express';
import { GdprWebhookController } from './gdpr-webhook.controller';
import { GdprRequestService } from '../services/gdpr-request.service';
import { LoggerService } from '@common/services/logger.service';

const GDPR_WEBHOOK_SECRET = 'test-secret-key';

/** Build a valid HMAC-SHA256 hex signature for the given payload. */
function buildSignature(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/** Create a minimal Express Request mock with the given headers. */
function mockReq(headers: Record<string, string> = {}): Request {
  return { headers } as unknown as Request;
}

describe('GdprWebhookController', () => {
  let controller: GdprWebhookController;
  let requestService: jest.Mocked<GdprRequestService>;
  let loggerService: jest.Mocked<LoggerService>;
  let configService: jest.Mocked<ConfigService>;

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
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'GDPR_WEBHOOK_SECRET') return GDPR_WEBHOOK_SECRET;
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<GdprWebhookController>(GdprWebhookController);
    requestService = module.get(GdprRequestService) as jest.Mocked<GdprRequestService>;
    loggerService = module.get(LoggerService) as jest.Mocked<LoggerService>;
    configService = module.get(ConfigService) as jest.Mocked<ConfigService>;
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

    function validReq(): Request {
      const sig = buildSignature(JSON.stringify(validBody), GDPR_WEBHOOK_SECRET);
      return mockReq({ 'x-webhook-signature': sig });
    }

    it('should delegate to requestService.createRequest and return ticket info', async () => {
      requestService.createRequest.mockResolvedValue({
        ticketNumber: 'GDPR-2026-0001',
      } as never);

      const result = await controller.handleDataSubjectRequest(validBody, validReq());

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

      await controller.handleDataSubjectRequest(validBody, validReq());

      expect(loggerService.log).toHaveBeenCalledWith(
        'Received data subject request webhook from WEB_FORM',
        'GdprWebhookController',
      );
    });

    it('should throw UnauthorizedException when signature header is missing', async () => {
      await expect(controller.handleDataSubjectRequest(validBody, mockReq({}))).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when signature is invalid', async () => {
      await expect(
        controller.handleDataSubjectRequest(
          validBody,
          mockReq({ 'x-webhook-signature': 'invalid-signature' }),
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when GDPR_WEBHOOK_SECRET is not configured', async () => {
      (configService.get as jest.Mock).mockReturnValue(undefined);

      await expect(controller.handleDataSubjectRequest(validBody, validReq())).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw BadRequestException when tenantId is missing (valid signature)', async () => {
      const bodyWithoutTenant = { ...validBody, tenantId: undefined } as never;
      const sig = buildSignature(JSON.stringify(bodyWithoutTenant), GDPR_WEBHOOK_SECRET);
      const req = mockReq({ 'x-webhook-signature': sig });

      await expect(controller.handleDataSubjectRequest(bodyWithoutTenant, req)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when requestType is missing (valid signature)', async () => {
      const bodyWithoutType = { ...validBody, requestType: undefined } as never;
      const sig = buildSignature(JSON.stringify(bodyWithoutType), GDPR_WEBHOOK_SECRET);
      const req = mockReq({ 'x-webhook-signature': sig });

      await expect(controller.handleDataSubjectRequest(bodyWithoutType, req)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when source is missing (valid signature)', async () => {
      const bodyWithoutSource = { ...validBody, source: undefined } as never;
      const sig = buildSignature(JSON.stringify(bodyWithoutSource), GDPR_WEBHOOK_SECRET);
      const req = mockReq({ 'x-webhook-signature': sig });

      await expect(controller.handleDataSubjectRequest(bodyWithoutSource, req)).rejects.toThrow(
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

  describe('handleDataSubjectRequest — signature verification: timingSafeEqual buffer comparison', () => {
    it('should verify signature using timing-safe comparison (valid signature)', async () => {
      const body = {
        tenantId: TENANT_ID,
        requestType: 'ERASURE',
        source: 'WEB_FORM',
      };
      const validSig = buildSignature(JSON.stringify(body), GDPR_WEBHOOK_SECRET);
      const req = mockReq({ 'x-webhook-signature': validSig });

      requestService.createRequest.mockResolvedValueOnce({
        ticketNumber: 'GDPR-2026-1000',
      } as never);

      const result = await controller.handleDataSubjectRequest(body as never, req);
      expect(result.received).toBe(true);
      expect(requestService.createRequest).toHaveBeenCalledTimes(1);
    });

    it('should reject signature with completely different content', async () => {
      const body = {
        tenantId: TENANT_ID,
        requestType: 'ERASURE',
        source: 'WEB_FORM',
      };
      const wrongPayload = JSON.stringify({ tenantId: 'wrong', requestType: 'ACCESS', source: 'EMAIL' });
      const sig = buildSignature(wrongPayload, GDPR_WEBHOOK_SECRET);
      const req = mockReq({ 'x-webhook-signature': sig });

      await expect(controller.handleDataSubjectRequest(body as never, req)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should reject when signature length exceeds expected HMAC-SHA256 output', async () => {
      const body = {
        tenantId: TENANT_ID,
        requestType: 'ERASURE',
        source: 'WEB_FORM',
      };
      const validSig = buildSignature(JSON.stringify(body), GDPR_WEBHOOK_SECRET);
      const tooLongSig = validSig + 'extra_padding';
      const req = mockReq({ 'x-webhook-signature': tooLongSig });

      await expect(controller.handleDataSubjectRequest(body as never, req)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('handleDataSubjectRequest — source field variations', () => {
    it('should handle MAIL source', async () => {
      const body = {
        tenantId: TENANT_ID,
        requestType: 'ERASURE',
        source: 'MAIL',
      };
      const sig = buildSignature(JSON.stringify(body), GDPR_WEBHOOK_SECRET);
      const req = mockReq({ 'x-webhook-signature': sig });

      requestService.createRequest.mockResolvedValueOnce({
        ticketNumber: 'GDPR-2026-2000',
      } as never);

      const result = await controller.handleDataSubjectRequest(body as never, req);
      expect(result.received).toBe(true);
      expect(requestService.createRequest).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'MAIL' }),
      );
    });
  });

  describe('handleConsentUpdate — edge cases on field presence', () => {
    it('should throw when tenantId is null (not undefined)', async () => {
      const body = {
        tenantId: null,
        customerId: 'cust-001',
        consentType: 'MARKETING',
        granted: true,
        timestamp: '2026-04-29T08:00:00Z',
        source: 'WEB_FORM',
      } as never;

      await expect(controller.handleConsentUpdate(body)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw when customerId is null (not undefined)', async () => {
      const body = {
        tenantId: TENANT_ID,
        customerId: null,
        consentType: 'MARKETING',
        granted: true,
        timestamp: '2026-04-29T08:00:00Z',
        source: 'WEB_FORM',
      } as never;

      await expect(controller.handleConsentUpdate(body)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw when consentType is null (not undefined)', async () => {
      const body = {
        tenantId: TENANT_ID,
        customerId: 'cust-001',
        consentType: null,
        granted: true,
        timestamp: '2026-04-29T08:00:00Z',
        source: 'WEB_FORM',
      } as never;

      await expect(controller.handleConsentUpdate(body)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('handleDeletionConfirmation — edge cases on field presence', () => {
    it('should throw when subProcessor is null (not undefined)', async () => {
      const body = {
        subProcessor: null,
        customerId: 'cust-001',
        deletionType: 'FULL',
        deletedAt: '2026-04-29T12:00:00Z',
        confirmationId: 'conf-abc-123',
      } as never;

      await expect(controller.handleDeletionConfirmation(body)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw when confirmationId is null (not undefined)', async () => {
      const body = {
        subProcessor: 'stripe',
        customerId: 'cust-001',
        deletionType: 'FULL',
        deletedAt: '2026-04-29T12:00:00Z',
        confirmationId: null,
      } as never;

      await expect(controller.handleDeletionConfirmation(body)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('handleDataSubjectRequest — signature header edge cases', () => {
    it('should reject when signature is empty string', async () => {
      const body = {
        tenantId: TENANT_ID,
        requestType: 'ERASURE',
        source: 'WEB_FORM',
      };
      const req = mockReq({ 'x-webhook-signature': '' });

      await expect(controller.handleDataSubjectRequest(body as never, req)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should reject when signature is whitespace only', async () => {
      const body = {
        tenantId: TENANT_ID,
        requestType: 'ERASURE',
        source: 'WEB_FORM',
      };
      const req = mockReq({ 'x-webhook-signature': '   ' });

      await expect(controller.handleDataSubjectRequest(body as never, req)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
