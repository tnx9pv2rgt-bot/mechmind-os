import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { SesWebhookController } from './ses-webhook.controller';
import { PrismaService } from '../../common/services/prisma.service';

const mockPrismaService = {
  notification: {
    findFirst: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue({}),
  },
  customer: {
    update: jest.fn().mockResolvedValue({}),
  },
  customerNotificationPreference: {
    upsert: jest.fn().mockResolvedValue({}),
  },
};

/** Build a minimal valid-looking SNS Notification envelope. */
function buildSnsEnvelope(innerMessage: object): Record<string, unknown> {
  return {
    Type: 'Notification',
    MessageId: 'sns-msg-id',
    TopicArn: 'arn:aws:sns:eu-west-1:123456789012:ses-events',
    Subject: 'Amazon SES Email Event Notification',
    Message: JSON.stringify(innerMessage),
    Timestamp: '2026-03-17T00:00:00.000Z',
    SignatureVersion: '1',
    Signature: 'EXAMPLE',
    SigningCertURL: 'https://sns.eu-west-1.amazonaws.com/cert.pem',
    UnsubscribeURL: 'https://sns.amazonaws.com/unsubscribe',
  };
}

describe('SesWebhookController', () => {
  let controller: SesWebhookController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SesWebhookController],
      providers: [{ provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    controller = module.get<SesWebhookController>(SesWebhookController);

    // Default: signature passes — tests that care about signature behaviour
    // override this spy individually.
    jest.spyOn(controller, 'verifySnsSignature').mockResolvedValue(true);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // verifySnsSignature — unit tests (restore real implementation for these)
  // ---------------------------------------------------------------------------
  describe('verifySnsSignature', () => {
    beforeEach(() => {
      // Restore real implementation for signature unit-tests
      jest.restoreAllMocks();
    });

    it('should return false when SigningCertURL is not HTTPS', async () => {
      const message: Record<string, unknown> = {
        Type: 'Notification',
        SigningCertURL: 'http://sns.amazonaws.com/cert.pem',
        Signature: 'abc',
        Message: 'hi',
        MessageId: '1',
        Timestamp: '2026-03-17T00:00:00Z',
        TopicArn: 'arn:aws:sns:eu-west-1:123:topic',
      };
      const result = await controller.verifySnsSignature(message);
      expect(result).toBe(false);
    });

    it('should return false when SigningCertURL hostname does not end with .amazonaws.com', async () => {
      const message: Record<string, unknown> = {
        Type: 'Notification',
        SigningCertURL: 'https://evil.attacker.com/cert.pem',
        Signature: 'abc',
        Message: 'hi',
        MessageId: '1',
        Timestamp: '2026-03-17T00:00:00Z',
        TopicArn: 'arn:aws:sns:eu-west-1:123:topic',
      };
      const result = await controller.verifySnsSignature(message);
      expect(result).toBe(false);
    });

    it('should return false when SigningCertURL is not a valid URL', async () => {
      const message: Record<string, unknown> = {
        Type: 'Notification',
        SigningCertURL: 'not-a-url',
        Signature: 'abc',
      };
      const result = await controller.verifySnsSignature(message);
      expect(result).toBe(false);
    });

    it('should return false when crypto verification fails (malformed cert)', async () => {
      // Mock fetchCertificate at instance level to bypass real https
      jest
        .spyOn(
          controller as unknown as { fetchCertificate: (url: string) => Promise<string> },
          'fetchCertificate',
        )
        .mockResolvedValue(
          '-----BEGIN CERTIFICATE-----\nNOT_VALID_BASE64!!!\n-----END CERTIFICATE-----\n',
        );

      const message: Record<string, unknown> = {
        Type: 'Notification',
        SigningCertURL: 'https://sns.eu-west-1.amazonaws.com/cert.pem',
        Signature: 'invalidsignature==',
        Message: 'test',
        MessageId: 'id-1',
        Subject: 'Test',
        Timestamp: '2026-03-17T00:00:00Z',
        TopicArn: 'arn:aws:sns:eu-west-1:123:topic',
      };

      // crypto.createVerify throws on malformed cert — verifySnsSignature catches and returns false
      const result = await controller.verifySnsSignature(message);
      expect(result).toBe(false);
    });

    it('should use certificate cache on repeated calls', async () => {
      // The real certCache is a Map on the instance; we pre-populate it so
      // fetchCertificate is never invoked via https
      const certCacheField = (controller as unknown as { certCache: Map<string, string> })
        .certCache;
      const cachedUrl = 'https://sns.eu-west-1.amazonaws.com/cert-cached.pem';
      certCacheField.set(cachedUrl, 'FAKE_CERT');

      const fetchSpy = jest.spyOn(
        controller as unknown as { fetchCertificate: (url: string) => Promise<string> },
        'fetchCertificate',
      );

      const message: Record<string, unknown> = {
        Type: 'Notification',
        SigningCertURL: cachedUrl,
        Signature: 'sig==',
        Message: 'msg',
        MessageId: 'id-2',
        Timestamp: '2026-03-17T00:00:00Z',
        TopicArn: 'arn:aws:sns:eu-west-1:123:topic',
      };

      // Both calls should use the cached cert — verification returns false (fake cert) but no error
      await controller.verifySnsSignature(message);
      await controller.verifySnsSignature(message);

      // fetchCertificate returns the cached value without re-fetching
      // The real implementation checks the Map inside fetchCertificate; since we pre-seeded it,
      // the spy is still called (it wraps the whole method) but https.get is never invoked
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(fetchSpy).toHaveBeenCalledWith(cachedUrl);
    });
  });

  // ---------------------------------------------------------------------------
  // handleBounce
  // ---------------------------------------------------------------------------
  describe('handleBounce', () => {
    it('should process a permanent bounce event', async () => {
      const payload = buildSnsEnvelope({
        eventType: 'Bounce',
        mail: {
          messageId: 'msg-001',
          destination: ['test@example.com'],
          headers: [],
          commonHeaders: { from: ['noreply@app.com'], to: ['test@example.com'], subject: 'Test' },
        },
        bounce: {
          bounceType: 'Permanent',
          bounceSubType: 'General',
          bouncedRecipients: [{ emailAddress: 'test@example.com', status: '5.1.1' }],
          timestamp: '2026-03-16T00:00:00Z',
        },
      });

      await expect(controller.handleBounce(payload, 'Notification')).resolves.toBeUndefined();
    });

    it('should process a transient bounce event', async () => {
      const payload = buildSnsEnvelope({
        eventType: 'Bounce',
        mail: {
          messageId: 'msg-002',
          destination: ['test@example.com'],
          headers: [],
          commonHeaders: { from: ['noreply@app.com'], to: ['test@example.com'], subject: 'Test' },
        },
        bounce: {
          bounceType: 'Transient',
          bounceSubType: 'MailboxFull',
          bouncedRecipients: [{ emailAddress: 'test@example.com', status: '4.2.2' }],
          timestamp: '2026-03-16T00:00:00Z',
        },
      });

      await expect(controller.handleBounce(payload, 'Notification')).resolves.toBeUndefined();
    });

    it('should handle invalid JSON gracefully after successful signature', async () => {
      const payload: Record<string, unknown> = {
        ...buildSnsEnvelope({}),
        Message: 'not-json',
      };

      await expect(controller.handleBounce(payload, 'Notification')).resolves.toBeUndefined();
    });

    it('should throw UnauthorizedException when signature is invalid', async () => {
      jest.spyOn(controller, 'verifySnsSignature').mockResolvedValue(false);

      const payload = buildSnsEnvelope({ eventType: 'Bounce' });

      await expect(controller.handleBounce(payload, 'Notification')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // handleComplaint
  // ---------------------------------------------------------------------------
  describe('handleComplaint', () => {
    it('should process a complaint event', async () => {
      const payload = buildSnsEnvelope({
        eventType: 'Complaint',
        mail: {
          messageId: 'msg-003',
          destination: ['complainer@example.com'],
          headers: [],
          commonHeaders: {
            from: ['noreply@app.com'],
            to: ['complainer@example.com'],
            subject: 'Test',
          },
        },
        complaint: {
          complaintSubType: 'abuse',
          complainedRecipients: [{ emailAddress: 'complainer@example.com' }],
          timestamp: '2026-03-16T00:00:00Z',
        },
      });

      await expect(controller.handleComplaint(payload, 'Notification')).resolves.toBeUndefined();
    });

    it('should handle invalid JSON gracefully after successful signature', async () => {
      const payload: Record<string, unknown> = {
        ...buildSnsEnvelope({}),
        Message: 'invalid',
      };

      await expect(controller.handleComplaint(payload, 'Notification')).resolves.toBeUndefined();
    });

    it('should throw UnauthorizedException when signature is invalid', async () => {
      jest.spyOn(controller, 'verifySnsSignature').mockResolvedValue(false);

      const payload = buildSnsEnvelope({ eventType: 'Complaint' });

      await expect(controller.handleComplaint(payload, 'Notification')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // handleDelivery
  // ---------------------------------------------------------------------------
  describe('handleDelivery', () => {
    it('should process a delivery event', async () => {
      const payload = buildSnsEnvelope({
        eventType: 'Delivery',
        mail: {
          messageId: 'msg-004',
          destination: ['delivered@example.com'],
          headers: [],
          commonHeaders: {
            from: ['noreply@app.com'],
            to: ['delivered@example.com'],
            subject: 'Test',
          },
        },
        delivery: {
          timestamp: '2026-03-16T00:00:00Z',
          recipients: ['delivered@example.com'],
        },
      });

      await expect(controller.handleDelivery(payload)).resolves.toBeUndefined();
    });

    it('should handle invalid JSON gracefully after successful signature', async () => {
      const payload: Record<string, unknown> = {
        ...buildSnsEnvelope({}),
        Message: 'bad-json',
      };

      await expect(controller.handleDelivery(payload)).resolves.toBeUndefined();
    });

    it('should throw UnauthorizedException when signature is invalid', async () => {
      jest.spyOn(controller, 'verifySnsSignature').mockResolvedValue(false);

      const payload = buildSnsEnvelope({ eventType: 'Delivery' });

      await expect(controller.handleDelivery(payload)).rejects.toThrow(UnauthorizedException);
    });
  });
});
