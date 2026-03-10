import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { VoiceWebhookController } from './voice-webhook.controller';
import { VapiWebhookService } from '../services/vapi-webhook.service';
import { VapiWebhookDto, VapiEventType, TransferRequestDto } from '../dto/vapi-webhook.dto';

describe('VoiceWebhookController', () => {
  let controller: VoiceWebhookController;
  let vapiWebhookService: {
    processWebhook: jest.Mock;
    handleTransfer: jest.Mock;
  };
  let configService: { get: jest.Mock };

  const WEBHOOK_SECRET = 'test-vapi-webhook-secret-key-32chars';
  const TENANT_ID = 'tenant-001';
  const CALL_ID = 'call_abc123xyz';
  const CUSTOMER_PHONE = '+390123456789';

  /**
   * Generate a valid HMAC-SHA256 signature for a payload, matching the
   * controller's verifySignature implementation.
   */
  const generateSignature = (payload: Record<string, unknown>, timestamp?: string): string => {
    const signedPayload = timestamp
      ? `${timestamp}.${JSON.stringify(payload)}`
      : JSON.stringify(payload);

    return crypto.createHmac('sha256', WEBHOOK_SECRET).update(signedPayload).digest('hex');
  };

  const buildPayload = (overrides: Partial<VapiWebhookDto> = {}): VapiWebhookDto => ({
    event: VapiEventType.CALL_COMPLETED,
    callId: CALL_ID,
    tenantId: TENANT_ID,
    customerPhone: CUSTOMER_PHONE,
    ...overrides,
  });

  beforeEach(async () => {
    vapiWebhookService = {
      processWebhook: jest.fn().mockResolvedValue({
        action: 'booking_created',
        bookingId: 'booking-001',
      }),
      handleTransfer: jest.fn().mockResolvedValue({
        escalated: true,
        reason: 'Customer requested human',
        agentId: 'agent-001',
      }),
    };

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'VAPI_WEBHOOK_SECRET') return WEBHOOK_SECRET;
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VoiceWebhookController],
      providers: [
        { provide: VapiWebhookService, useValue: vapiWebhookService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    controller = module.get<VoiceWebhookController>(VoiceWebhookController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handleCallEvent', () => {
    it('should process a valid webhook with correct signature and timestamp', async () => {
      // Arrange
      const payload = buildPayload();
      const timestamp = Date.now().toString();
      const signature = generateSignature(payload as unknown as Record<string, unknown>, timestamp);

      // Act
      const result = await controller.handleCallEvent(payload, signature, timestamp);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('Webhook processed successfully');
      expect(result.action).toBe('booking_created');
      expect(result.bookingId).toBe('booking-001');
      expect(vapiWebhookService.processWebhook).toHaveBeenCalledWith(payload);
    });

    it('should reject webhook with invalid signature', async () => {
      // Arrange
      const payload = buildPayload();
      const timestamp = Date.now().toString();
      const invalidSignature = 'invalid-signature-value';

      // Act & Assert
      await expect(
        controller.handleCallEvent(payload, invalidSignature, timestamp),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject webhook with missing signature', async () => {
      // Arrange
      const payload = buildPayload();
      const timestamp = Date.now().toString();

      // Act & Assert
      await expect(
        controller.handleCallEvent(payload, undefined as unknown as string, timestamp),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject webhook when VAPI_WEBHOOK_SECRET is not configured', async () => {
      // Arrange
      configService.get.mockReturnValue(undefined);
      const payload = buildPayload();
      const timestamp = Date.now().toString();
      const signature = 'some-signature';

      // Act & Assert
      await expect(controller.handleCallEvent(payload, signature, timestamp)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should reject webhook with timestamp older than 5 minutes', async () => {
      // Arrange
      const payload = buildPayload();
      const oldTimestamp = (Date.now() - 6 * 60 * 1000).toString(); // 6 minutes ago
      const signature = generateSignature(
        payload as unknown as Record<string, unknown>,
        oldTimestamp,
      );

      // Act & Assert
      await expect(controller.handleCallEvent(payload, signature, oldTimestamp)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should reject webhook with timestamp too far in the future', async () => {
      // Arrange
      const payload = buildPayload();
      const futureTimestamp = (Date.now() + 6 * 60 * 1000).toString(); // 6 minutes in the future
      const signature = generateSignature(
        payload as unknown as Record<string, unknown>,
        futureTimestamp,
      );

      // Act & Assert
      await expect(controller.handleCallEvent(payload, signature, futureTimestamp)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should reject webhook with non-numeric timestamp', async () => {
      // Arrange
      const payload = buildPayload();
      const invalidTimestamp = 'not-a-number';
      const signature = generateSignature(
        payload as unknown as Record<string, unknown>,
        invalidTimestamp,
      );

      // Act & Assert
      await expect(
        controller.handleCallEvent(payload, signature, invalidTimestamp),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should accept webhook without timestamp for backward compatibility', async () => {
      // Arrange
      const payload = buildPayload();
      const signature = generateSignature(payload as unknown as Record<string, unknown>, undefined);

      // Act
      const result = await controller.handleCallEvent(
        payload,
        signature,
        undefined as unknown as string,
      );

      // Assert
      expect(result.success).toBe(true);
    });

    it('should throw BadRequestException when service processing fails', async () => {
      // Arrange
      vapiWebhookService.processWebhook.mockRejectedValue(new Error('Processing failed'));
      const payload = buildPayload();
      const timestamp = Date.now().toString();
      const signature = generateSignature(payload as unknown as Record<string, unknown>, timestamp);

      // Act & Assert
      await expect(controller.handleCallEvent(payload, signature, timestamp)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should include error message in BadRequestException', async () => {
      // Arrange
      vapiWebhookService.processWebhook.mockRejectedValue(new Error('Database unavailable'));
      const payload = buildPayload();
      const timestamp = Date.now().toString();
      const signature = generateSignature(payload as unknown as Record<string, unknown>, timestamp);

      // Act & Assert
      await expect(controller.handleCallEvent(payload, signature, timestamp)).rejects.toThrow(
        'Failed to process webhook: Database unavailable',
      );
    });

    it('should use timing-safe comparison for signature verification', async () => {
      // Arrange - tampered signature that has the same length as a real one
      const payload = buildPayload();
      const timestamp = Date.now().toString();
      const realSignature = generateSignature(
        payload as unknown as Record<string, unknown>,
        timestamp,
      );
      // Flip the first character to create an invalid signature of the same length
      const tamperedSignature = (realSignature[0] === 'a' ? 'b' : 'a') + realSignature.slice(1);

      // Act & Assert
      await expect(
        controller.handleCallEvent(payload, tamperedSignature, timestamp),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('handleTransfer', () => {
    it('should process transfer request with valid signature', async () => {
      // Arrange
      const payload: TransferRequestDto = {
        callId: CALL_ID,
        customerPhone: CUSTOMER_PHONE,
        tenantId: TENANT_ID,
        reason: 'Customer wants human',
      };
      const signature = generateSignature(payload as unknown as Record<string, unknown>);

      // Act
      const result = await controller.handleTransfer(payload, signature);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('Transfer handled successfully');
      expect(result.escalation).toEqual({
        escalated: true,
        reason: 'Customer requested human',
        agentId: 'agent-001',
      });
    });

    it('should reject transfer with invalid signature', async () => {
      // Arrange
      const payload: TransferRequestDto = {
        callId: CALL_ID,
        customerPhone: CUSTOMER_PHONE,
        tenantId: TENANT_ID,
        reason: 'Need help',
      };

      // Act & Assert
      await expect(controller.handleTransfer(payload, 'bad-signature')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should pass the transfer payload to the service', async () => {
      // Arrange
      const payload: TransferRequestDto = {
        callId: CALL_ID,
        customerPhone: CUSTOMER_PHONE,
        tenantId: TENANT_ID,
        reason: 'Escalation needed',
        category: 'billing',
      };
      const signature = generateSignature(payload as unknown as Record<string, unknown>);

      // Act
      await controller.handleTransfer(payload, signature);

      // Assert
      expect(vapiWebhookService.handleTransfer).toHaveBeenCalledWith(payload);
    });
  });

  describe('healthCheck', () => {
    it('should return ok status', async () => {
      // Arrange & Act
      const result = await controller.healthCheck();

      // Assert
      expect(result).toEqual({ status: 'ok' });
    });
  });

  describe('signature verification edge cases', () => {
    it('should reject when signature and expected have different lengths', async () => {
      // Arrange
      const payload = buildPayload();
      const timestamp = Date.now().toString();
      const shortSignature = 'abc';

      // Act & Assert
      await expect(controller.handleCallEvent(payload, shortSignature, timestamp)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should construct signed payload with timestamp when provided', async () => {
      // Arrange - use a current timestamp so it passes timestamp validation
      const payload = buildPayload();
      const timestamp = Date.now().toString();
      // The signature must match `${timestamp}.${JSON.stringify(payload)}`
      const signedPayload = `${timestamp}.${JSON.stringify(payload)}`;
      const correctSignature = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(signedPayload)
        .digest('hex');

      // Act
      const result = await controller.handleCallEvent(payload, correctSignature, timestamp);

      // Assert
      expect(result.success).toBe(true);
      expect(vapiWebhookService.processWebhook).toHaveBeenCalledWith(payload);
    });

    it('should construct signed payload without timestamp when not provided', async () => {
      // Arrange
      const payload = buildPayload();
      // The signature must match just `JSON.stringify(payload)` (no timestamp prefix)
      const signedPayload = JSON.stringify(payload);
      const correctSignature = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(signedPayload)
        .digest('hex');

      // Act
      const result = await controller.handleCallEvent(
        payload,
        correctSignature,
        undefined as unknown as string,
      );

      // Assert
      expect(result.success).toBe(true);
    });
  });
});
