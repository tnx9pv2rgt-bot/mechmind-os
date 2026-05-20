import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationWebhookController } from './webhook.controller';

describe('NotificationWebhookController', () => {
  let controller: NotificationWebhookController;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationWebhookController],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<NotificationWebhookController>(NotificationWebhookController);
    configService = module.get(ConfigService) as jest.Mocked<ConfigService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handleResendWebhook', () => {
    it('should throw BadRequestException when payload is missing type', async () => {
      const payload = { data: { email_id: 'e1' } } as never;

      await expect(controller.handleResendWebhook(payload, 'sig', 'ts')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when payload is missing data', async () => {
      const payload = { type: 'email.sent' } as never;

      await expect(controller.handleResendWebhook(payload, 'sig', 'ts')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw UnauthorizedException when signature verification fails', async () => {
      configService.get.mockReturnValue('webhook-secret');
      const payload = {
        type: 'email.sent',
        created_at: '2026-01-01',
        data: {
          email_id: 'e1',
          from: 'a@b.com',
          to: ['c@d.com'],
          subject: 'Hi',
          created_at: '2026-01-01',
        },
      };

      await expect(
        controller.handleResendWebhook(payload as never, 'invalid-sig', '12345'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject when RESEND_WEBHOOK_SECRET is not configured', async () => {
      configService.get.mockReturnValue(undefined);
      const payload = {
        type: 'email.sent',
        created_at: '2026-01-01',
        data: {
          email_id: 'e1',
          from: 'a@b.com',
          to: ['c@d.com'],
          subject: 'Hi',
          created_at: '2026-01-01',
        },
      };

      await expect(controller.handleResendWebhook(payload as never, 'sig', 'ts')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('handleTwilioWebhook', () => {
    it('should throw UnauthorizedException when auth token is set but signature missing', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'TWILIO_AUTH_TOKEN') return 'token';
        if (key === 'TWILIO_WEBHOOK_URL') return 'https://example.com/webhook';
        return undefined;
      });

      const payload = { MessageSid: 'SM1', MessageStatus: 'sent', To: '+39', From: '+39' };

      await expect(
        controller.handleTwilioWebhook(payload as never, undefined as never),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return received:true for payload without MessageSid', async () => {
      configService.get.mockReturnValue(undefined);
      const payload = {} as never;

      const result = await controller.handleTwilioWebhook(payload, undefined as never);

      expect(result).toEqual({ received: true });
    });
  });

  describe('handleTwilioIncoming', () => {
    it('should return empty TwiML when payload is missing From', async () => {
      const payload = { Body: 'STOP', From: '', To: '', MessageSid: '' };

      const result = await controller.handleTwilioIncoming(payload);

      expect(result).toContain('<Response>');
    });

    it('should process incoming SMS and return TwiML', async () => {
      const payload = { From: '+39123', Body: 'STOP', To: '+39000', MessageSid: 'SM1' };

      const result = await controller.handleTwilioIncoming(payload);

      expect(result).toContain('<Response>');
    });

    it('should handle INFO keyword', async () => {
      const payload = { From: '+39123', Body: 'INFO', To: '+39000', MessageSid: 'SM2' };

      const result = await controller.handleTwilioIncoming(payload);

      expect(result).toContain('<Response>');
    });

    it('should handle AIUTO keyword (Italian help)', async () => {
      const payload = { From: '+39123', Body: 'AIUTO', To: '+39000', MessageSid: 'SM3' };

      const result = await controller.handleTwilioIncoming(payload);

      expect(result).toContain('<Response>');
    });

    it('should handle START keyword', async () => {
      const payload = { From: '+39123', Body: 'START', To: '+39000', MessageSid: 'SM4' };

      const result = await controller.handleTwilioIncoming(payload);

      expect(result).toContain('<Response>');
    });

    it('should handle AVVIA keyword (Italian start)', async () => {
      const payload = { From: '+39123', Body: 'AVVIA', To: '+39000', MessageSid: 'SM5' };

      const result = await controller.handleTwilioIncoming(payload);

      expect(result).toContain('<Response>');
    });

    it('should handle ISCRIVIMI keyword', async () => {
      const payload = { From: '+39123', Body: 'ISCRIVIMI', To: '+39000', MessageSid: 'SM6' };

      const result = await controller.handleTwilioIncoming(payload);

      expect(result).toContain('<Response>');
    });

    it('should handle ARRESTA keyword (Italian stop)', async () => {
      const payload = { From: '+39123', Body: 'ARRESTA', To: '+39000', MessageSid: 'SM7' };

      const result = await controller.handleTwilioIncoming(payload);

      expect(result).toContain('<Response>');
    });

    it('should handle DISISCRIVIMI keyword', async () => {
      const payload = { From: '+39123', Body: 'DISISCRIVIMI', To: '+39000', MessageSid: 'SM8' };

      const result = await controller.handleTwilioIncoming(payload);

      expect(result).toContain('<Response>');
    });

    it('should handle unknown message text', async () => {
      const payload = {
        From: '+39123',
        Body: 'Ciao, ho una domanda',
        To: '+39000',
        MessageSid: 'SM9',
      };

      const result = await controller.handleTwilioIncoming(payload);

      expect(result).toContain('<Response>');
    });

    it('should handle case insensitivity', async () => {
      const payload = { From: '+39123', Body: '  stop  ', To: '+39000', MessageSid: 'SM10' };

      const result = await controller.handleTwilioIncoming(payload);

      expect(result).toContain('<Response>');
    });
  });

  describe('handleResendWebhook - event type handling', () => {
    const createValidPayload = (type: string) => ({
      type,
      created_at: '2026-01-01',
      data: {
        email_id: 'e1',
        from: 'a@b.com',
        to: ['c@d.com'],
        subject: 'Hi',
        created_at: '2026-01-01',
      },
    });

    // Generate a valid signature
    const getValidSigAndTs = (payload: object) => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const crypto = require('crypto');
      const timestamp = '1234567890';
      const secret = 'webhook-secret-test';
      const signedContent = `${timestamp}.${JSON.stringify(payload)}`;
      const signature = crypto.createHmac('sha256', secret).update(signedContent).digest('hex');
      return { signature, timestamp, secret };
    };

    it('should process email.sent event', async () => {
      const payload = createValidPayload('email.sent');
      const { signature, timestamp, secret } = getValidSigAndTs(payload);
      configService.get.mockReturnValue(secret);

      const result = await controller.handleResendWebhook(payload as never, signature, timestamp);

      expect(result).toEqual({ received: true });
    });

    it('should process email.delivered event', async () => {
      const payload = createValidPayload('email.delivered');
      const { signature, timestamp, secret } = getValidSigAndTs(payload);
      configService.get.mockReturnValue(secret);

      const result = await controller.handleResendWebhook(payload as never, signature, timestamp);

      expect(result).toEqual({ received: true });
    });

    it('should process email.bounced event', async () => {
      const payload = createValidPayload('email.bounced');
      const { signature, timestamp, secret } = getValidSigAndTs(payload);
      configService.get.mockReturnValue(secret);

      const result = await controller.handleResendWebhook(payload as never, signature, timestamp);

      expect(result).toEqual({ received: true });
    });

    it('should process email.complained event', async () => {
      const payload = createValidPayload('email.complained');
      const { signature, timestamp, secret } = getValidSigAndTs(payload);
      configService.get.mockReturnValue(secret);

      const result = await controller.handleResendWebhook(payload as never, signature, timestamp);

      expect(result).toEqual({ received: true });
    });

    it('should process email.opened event', async () => {
      const payload = createValidPayload('email.opened');
      const { signature, timestamp, secret } = getValidSigAndTs(payload);
      configService.get.mockReturnValue(secret);

      const result = await controller.handleResendWebhook(payload as never, signature, timestamp);

      expect(result).toEqual({ received: true });
    });

    it('should process email.clicked event', async () => {
      const payload = createValidPayload('email.clicked');
      const { signature, timestamp, secret } = getValidSigAndTs(payload);
      configService.get.mockReturnValue(secret);

      const result = await controller.handleResendWebhook(payload as never, signature, timestamp);

      expect(result).toEqual({ received: true });
    });

    it('should process email.delivery_delayed event', async () => {
      const payload = createValidPayload('email.delivery_delayed');
      const { signature, timestamp, secret } = getValidSigAndTs(payload);
      configService.get.mockReturnValue(secret);

      const result = await controller.handleResendWebhook(payload as never, signature, timestamp);

      expect(result).toEqual({ received: true });
    });

    it('should handle unknown event type gracefully', async () => {
      const payload = createValidPayload('email.unknown_event');
      const { signature, timestamp, secret } = getValidSigAndTs(payload);
      configService.get.mockReturnValue(secret);

      const result = await controller.handleResendWebhook(payload as never, signature, timestamp);

      expect(result).toEqual({ received: true });
    });
  });

  describe('handleTwilioWebhook - status handling', () => {
    it('should process delivered status', async () => {
      configService.get.mockReturnValue(undefined);
      const payload = { MessageSid: 'SM1', MessageStatus: 'delivered', To: '+39', From: '+39' };

      const result = await controller.handleTwilioWebhook(payload as never, undefined as never);

      expect(result).toEqual({ received: true });
    });

    it('should process failed status', async () => {
      configService.get.mockReturnValue(undefined);
      const payload = {
        MessageSid: 'SM1',
        MessageStatus: 'failed',
        To: '+39',
        From: '+39',
        ErrorCode: '21211',
        ErrorMessage: 'Invalid number',
      };

      const result = await controller.handleTwilioWebhook(payload as never, undefined as never);

      expect(result).toEqual({ received: true });
    });

    it('should process undelivered status', async () => {
      configService.get.mockReturnValue(undefined);
      const payload = {
        MessageSid: 'SM1',
        MessageStatus: 'undelivered',
        To: '+39',
        From: '+39',
        ErrorCode: '30003',
      };

      const result = await controller.handleTwilioWebhook(payload as never, undefined as never);

      expect(result).toEqual({ received: true });
    });

    it('should process read status', async () => {
      configService.get.mockReturnValue(undefined);
      const payload = { MessageSid: 'SM1', MessageStatus: 'read', To: '+39', From: '+39' };

      const result = await controller.handleTwilioWebhook(payload as never, undefined as never);

      expect(result).toEqual({ received: true });
    });

    it('should process sent status', async () => {
      configService.get.mockReturnValue(undefined);
      const payload = { MessageSid: 'SM1', MessageStatus: 'sent', To: '+39', From: '+39' };

      const result = await controller.handleTwilioWebhook(payload as never, undefined as never);

      expect(result).toEqual({ received: true });
    });

    it('should process queued status (default case)', async () => {
      configService.get.mockReturnValue(undefined);
      const payload = { MessageSid: 'SM1', MessageStatus: 'queued', To: '+39', From: '+39' };

      const result = await controller.handleTwilioWebhook(payload as never, undefined as never);

      expect(result).toEqual({ received: true });
    });

    it('should verify Twilio signature when auth token and webhook URL are set', async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const crypto = require('crypto');
      const authToken = 'test-auth-token';
      const webhookUrl = 'https://api.mechmind.io/webhooks/notifications/twilio';
      const payload: Record<string, string> = {
        MessageSid: 'SM1',
        MessageStatus: 'sent',
        To: '+39123',
        From: '+39456',
      };

      // Generate valid Twilio signature
      const sortedKeys = Object.keys(payload).sort();
      let data = webhookUrl;
      for (const key of sortedKeys) {
        // eslint-disable-next-line security/detect-object-injection
        data += key + payload[key];
      }
      const validSignature = crypto.createHmac('sha1', authToken).update(data).digest('base64');

      configService.get.mockImplementation((key: string) => {
        if (key === 'TWILIO_AUTH_TOKEN') return authToken;
        if (key === 'TWILIO_WEBHOOK_URL') return webhookUrl;
        return undefined;
      });

      const result = await controller.handleTwilioWebhook(payload as never, validSignature);

      expect(result).toEqual({ received: true });
    });

    it('should reject invalid Twilio signature', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'TWILIO_AUTH_TOKEN') return 'token';
        if (key === 'TWILIO_WEBHOOK_URL') return 'https://example.com/webhook';
        return undefined;
      });

      const payload = { MessageSid: 'SM1', MessageStatus: 'sent', To: '+39', From: '+39' };

      await expect(
        controller.handleTwilioWebhook(payload as never, 'invalid-signature'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
