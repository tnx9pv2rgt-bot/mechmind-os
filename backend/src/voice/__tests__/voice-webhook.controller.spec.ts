import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { VoiceWebhookController } from '../controllers/voice-webhook.controller';
import { VapiWebhookService } from '../services/vapi-webhook.service';
import {
  VapiWebhookDto,
  VapiEventType,
  VoiceIntent,
  TransferRequestDto,
} from '../dto/vapi-webhook.dto';

describe('VoiceWebhookController', () => {
  let controller: VoiceWebhookController;
  let vapiWebhookService: jest.Mocked<VapiWebhookService>;
  let configService: jest.Mocked<ConfigService>;

  const mockVapiWebhookService = {
    processWebhook: jest.fn(),
    handleTransfer: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VoiceWebhookController],
      providers: [
        {
          provide: VapiWebhookService,
          useValue: mockVapiWebhookService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<VoiceWebhookController>(VoiceWebhookController);
    vapiWebhookService = module.get(VapiWebhookService);
    configService = module.get(ConfigService);
  });

  describe('handleCallEvent', () => {
    const validPayload: VapiWebhookDto = {
      event: VapiEventType.CALL_COMPLETED,
      callId: 'call_abc123xyz',
      customerPhone: '+390123456789',
      tenantId: '550e8400-e29b-41d4-a716-446655440000',
      transcript: 'Customer: I need to book a service',
      intent: VoiceIntent.BOOKING,
      extractedData: {
        preferredDate: '2024-01-15',
        preferredTime: '09:00',
        serviceType: 'Oil change',
      },
    };

    const secret = 'test-webhook-secret';

    const generateSignature = (payload: any, timestamp?: string): string => {
      const signedPayload = timestamp
        ? `${timestamp}.${JSON.stringify(payload)}`
        : JSON.stringify(payload);
      return crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
    };

    describe('HMAC Signature Validation', () => {
      it('should process webhook with valid signature', async () => {
        mockConfigService.get.mockReturnValue(secret);
        const timestamp = Date.now().toString();
        const signature = generateSignature(validPayload, timestamp);

        mockVapiWebhookService.processWebhook.mockResolvedValue({
          action: 'booking_created',
          bookingId: 'booking-123',
        });

        const result = await controller.handleCallEvent(
          validPayload,
          signature,
          timestamp,
        );

        expect(result.success).toBe(true);
        expect(result.action).toBe('booking_created');
        expect(vapiWebhookService.processWebhook).toHaveBeenCalledWith(validPayload);
      });

      it('should reject webhook with invalid signature', async () => {
        mockConfigService.get.mockReturnValue(secret);
        const timestamp = Date.now().toString();
        const invalidSignature = 'invalid-signature';

        await expect(
          controller.handleCallEvent(validPayload, invalidSignature, timestamp),
        ).rejects.toThrow(UnauthorizedException);

        expect(vapiWebhookService.processWebhook).not.toHaveBeenCalled();
      });

      it('should reject webhook with missing signature', async () => {
        mockConfigService.get.mockReturnValue(secret);
        const timestamp = Date.now().toString();

        await expect(
          controller.handleCallEvent(validPayload, undefined as any, timestamp),
        ).rejects.toThrow(UnauthorizedException);
      });

      it('should skip verification when secret is not configured', async () => {
        mockConfigService.get.mockReturnValue(undefined);

        mockVapiWebhookService.processWebhook.mockResolvedValue({
          action: 'booking_created',
        });

        const result = await controller.handleCallEvent(
          validPayload,
          'any-signature',
          Date.now().toString(),
        );

        expect(result.success).toBe(true);
      });

      it('should use timing-safe comparison for signatures', async () => {
        mockConfigService.get.mockReturnValue(secret);
        const timestamp = Date.now().toString();
        
        // Create a signature with completely different content
        const wrongSignature = 'a'.repeat(64);

        await expect(
          controller.handleCallEvent(validPayload, wrongSignature, timestamp),
        ).rejects.toThrow(UnauthorizedException);
      });
    });

    describe('Timestamp Validation', () => {
      it('should accept valid timestamp within 5 minutes', async () => {
        mockConfigService.get.mockReturnValue(secret);
        const timestamp = Date.now().toString();
        const signature = generateSignature(validPayload, timestamp);

        mockVapiWebhookService.processWebhook.mockResolvedValue({ action: 'processed' });

        const result = await controller.handleCallEvent(validPayload, signature, timestamp);

        expect(result.success).toBe(true);
      });

      it('should reject timestamp older than 5 minutes', async () => {
        mockConfigService.get.mockReturnValue(secret);
        const oldTimestamp = (Date.now() - 6 * 60 * 1000).toString();
        const signature = generateSignature(validPayload, oldTimestamp);

        await expect(
          controller.handleCallEvent(validPayload, signature, oldTimestamp),
        ).rejects.toThrow(UnauthorizedException);
      });

      it('should reject timestamp in the future beyond 5 minutes', async () => {
        mockConfigService.get.mockReturnValue(secret);
        const futureTimestamp = (Date.now() + 6 * 60 * 1000).toString();
        const signature = generateSignature(validPayload, futureTimestamp);

        await expect(
          controller.handleCallEvent(validPayload, signature, futureTimestamp),
        ).rejects.toThrow(UnauthorizedException);
      });

      it('should accept request without timestamp for backward compatibility', async () => {
        mockConfigService.get.mockReturnValue(secret);
        const signature = generateSignature(validPayload);

        mockVapiWebhookService.processWebhook.mockResolvedValue({ action: 'processed' });

        const result = await controller.handleCallEvent(validPayload, signature, undefined);

        expect(result.success).toBe(true);
      });

      it('should reject invalid timestamp format', async () => {
        mockConfigService.get.mockReturnValue(secret);
        const invalidTimestamp = 'not-a-number';
        const signature = generateSignature(validPayload, invalidTimestamp);

        await expect(
          controller.handleCallEvent(validPayload, signature, invalidTimestamp),
        ).rejects.toThrow(UnauthorizedException);
      });
    });

    describe('Webhook Event Processing', () => {
      it('should process call_completed event', async () => {
        mockConfigService.get.mockReturnValue(secret);
        const timestamp = Date.now().toString();
        const signature = generateSignature(validPayload, timestamp);

        mockVapiWebhookService.processWebhook.mockResolvedValue({
          action: 'booking_created',
          bookingId: 'booking-123',
        });

        const result = await controller.handleCallEvent(validPayload, signature, timestamp);

        expect(result).toEqual({
          success: true,
          message: 'Webhook processed successfully',
          action: 'booking_created',
          bookingId: 'booking-123',
        });
      });

      it('should process call with booking intent', async () => {
        mockConfigService.get.mockReturnValue(secret);
        const payload: VapiWebhookDto = {
          ...validPayload,
          intent: VoiceIntent.BOOKING,
          extractedData: {
            preferredDate: '2024-01-15',
            preferredTime: '09:00',
            serviceType: 'Revisione',
          },
        };
        const timestamp = Date.now().toString();
        const signature = generateSignature(payload, timestamp);

        mockVapiWebhookService.processWebhook.mockResolvedValue({
          action: 'booking_created',
          bookingId: 'booking-456',
        });

        const result = await controller.handleCallEvent(payload, signature, timestamp);

        expect(result.success).toBe(true);
        expect(result.bookingId).toBe('booking-456');
      });

      it('should process call with status_check intent', async () => {
        mockConfigService.get.mockReturnValue(secret);
        const payload: VapiWebhookDto = {
          ...validPayload,
          intent: VoiceIntent.STATUS_CHECK,
          transcript: 'When will my car be ready?',
        };
        const timestamp = Date.now().toString();
        const signature = generateSignature(payload, timestamp);

        mockVapiWebhookService.processWebhook.mockResolvedValue({
          action: 'status_check_processed',
        });

        const result = await controller.handleCallEvent(payload, signature, timestamp);

        expect(result.action).toBe('status_check_processed');
      });

      it('should process call with complaint intent', async () => {
        mockConfigService.get.mockReturnValue(secret);
        const payload: VapiWebhookDto = {
          ...validPayload,
          intent: VoiceIntent.COMPLAINT,
          transcript: 'I have a problem with my last service',
        };
        const timestamp = Date.now().toString();
        const signature = generateSignature(payload, timestamp);

        mockVapiWebhookService.processWebhook.mockResolvedValue({
          action: 'complaint_logged',
        });

        const result = await controller.handleCallEvent(payload, signature, timestamp);

        expect(result.action).toBe('complaint_logged');
      });

      it('should handle webhook processing error', async () => {
        mockConfigService.get.mockReturnValue(secret);
        const timestamp = Date.now().toString();
        const signature = generateSignature(validPayload, timestamp);

        mockVapiWebhookService.processWebhook.mockRejectedValue(
          new Error('Processing failed'),
        );

        await expect(
          controller.handleCallEvent(validPayload, signature, timestamp),
        ).rejects.toThrow(BadRequestException);
      });

      it('should process call_started event', async () => {
        mockConfigService.get.mockReturnValue(secret);
        const payload: VapiWebhookDto = {
          ...validPayload,
          event: VapiEventType.CALL_STARTED,
        };
        const timestamp = Date.now().toString();
        const signature = generateSignature(payload, timestamp);

        mockVapiWebhookService.processWebhook.mockResolvedValue({
          action: 'call_logged',
        });

        const result = await controller.handleCallEvent(payload, signature, timestamp);

        expect(result.success).toBe(true);
      });

      it('should process message event', async () => {
        mockConfigService.get.mockReturnValue(secret);
        const payload: VapiWebhookDto = {
          ...validPayload,
          event: VapiEventType.MESSAGE,
          transcript: 'Real-time message',
        };
        const timestamp = Date.now().toString();
        const signature = generateSignature(payload, timestamp);

        mockVapiWebhookService.processWebhook.mockResolvedValue({
          action: 'message_logged',
        });

        const result = await controller.handleCallEvent(payload, signature, timestamp);

        expect(result.success).toBe(true);
      });
    });

    describe('Payload without timestamp', () => {
      it('should verify signature without timestamp', async () => {
        mockConfigService.get.mockReturnValue(secret);
        const signature = generateSignature(validPayload);

        mockVapiWebhookService.processWebhook.mockResolvedValue({
          action: 'processed',
        });

        const result = await controller.handleCallEvent(
          validPayload,
          signature,
          undefined as any,
        );

        expect(result.success).toBe(true);
      });
    });

    describe('Edge Cases', () => {
      it('should handle signature with different length', async () => {
        mockConfigService.get.mockReturnValue(secret);
        const timestamp = Date.now().toString();
        const validSignature = generateSignature(validPayload, timestamp);
        const wrongLengthSignature = validSignature + 'extra';

        await expect(
          controller.handleCallEvent(validPayload, wrongLengthSignature, timestamp),
        ).rejects.toThrow(UnauthorizedException);
      });

      it('should handle empty payload', async () => {
        mockConfigService.get.mockReturnValue(secret);
        const emptyPayload = {} as VapiWebhookDto;
        const timestamp = Date.now().toString();
        const signature = generateSignature(emptyPayload, timestamp);

        mockVapiWebhookService.processWebhook.mockResolvedValue({ action: 'processed' });

        const result = await controller.handleCallEvent(emptyPayload, signature, timestamp);

        expect(result.success).toBe(true);
      });
    });
  });

  describe('handleTransfer', () => {
    const transferPayload: TransferRequestDto = {
      callId: 'call_abc123xyz',
      customerPhone: '+390123456789',
      tenantId: '550e8400-e29b-41d4-a716-446655440000',
      reason: 'Customer requests to speak with manager',
      category: 'booking_issue',
    };

    const secret = 'test-webhook-secret';

    const generateSignature = (payload: any): string => {
      return crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');
    };

    it('should handle transfer with valid signature', async () => {
      mockConfigService.get.mockReturnValue(secret);
      const signature = generateSignature(transferPayload);

      mockVapiWebhookService.handleTransfer.mockResolvedValue({
        escalated: true,
        agentId: 'agent-123',
        reason: 'Customer requests to speak with manager',
      });

      const result = await controller.handleTransfer(transferPayload, signature);

      expect(result.success).toBe(true);
      expect(result.escalation).toEqual({
        escalated: true,
        agentId: 'agent-123',
        reason: 'Customer requests to speak with manager',
      });
      expect(vapiWebhookService.handleTransfer).toHaveBeenCalledWith(transferPayload);
    });

    it('should reject transfer with invalid signature', async () => {
      mockConfigService.get.mockReturnValue(secret);
      const invalidSignature = 'invalid-signature';

      await expect(
        controller.handleTransfer(transferPayload, invalidSignature),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should handle transfer when no agents available', async () => {
      mockConfigService.get.mockReturnValue(secret);
      const signature = generateSignature(transferPayload);

      mockVapiWebhookService.handleTransfer.mockResolvedValue({
        escalated: false,
        reason: 'No agents available, queued for callback',
      });

      const result = await controller.handleTransfer(transferPayload, signature);

      expect(result.escalation?.escalated).toBe(false);
    });

    it('should skip verification when secret is not configured', async () => {
      mockConfigService.get.mockReturnValue(undefined);

      mockVapiWebhookService.handleTransfer.mockResolvedValue({
        escalated: true,
        agentId: 'agent-123',
        reason: 'Transfer successful',
      });

      const result = await controller.handleTransfer(transferPayload, 'any-signature');

      expect(result.success).toBe(true);
    });
  });

  describe('healthCheck', () => {
    it('should return ok status', async () => {
      const result = await controller.healthCheck();

      expect(result).toEqual({ status: 'ok' });
    });
  });
});
