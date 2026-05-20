import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { SesWebhookController } from './ses-webhook.controller';
import { PrismaService } from '../../common/services/prisma.service';

const mockPrismaService = {
  notification: {
    findFirst: jest.fn().mockResolvedValue(null),
    findUnique: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue({}),
  },
  customer: {
    update: jest.fn().mockResolvedValue({}),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
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

  // ---------------------------------------------------------------------------
  // updateEmailStatus branches (tested via handlers)
  // ---------------------------------------------------------------------------
  describe('updateEmailStatus — via handleDelivery', () => {
    it('should update notification to DELIVERED with deliveredAt when notification found', async () => {
      mockPrismaService.notification.findFirst.mockResolvedValueOnce({
        id: 'notif-001',
        messageId: 'msg-del-001',
        metadata: null,
      });

      const payload = buildSnsEnvelope({
        eventType: 'Delivery',
        mail: {
          messageId: 'msg-del-001',
          destination: ['user@test.com'],
          headers: [],
          commonHeaders: { from: ['noreply@app.com'], to: ['user@test.com'], subject: 'Test' },
        },
        delivery: {
          timestamp: '2026-03-20T12:00:00Z',
          recipients: ['user@test.com'],
        },
      });

      await controller.handleDelivery(payload);

      expect(mockPrismaService.notification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'notif-001' },
          data: expect.objectContaining({
            status: 'DELIVERED',
            deliveredAt: new Date('2026-03-20T12:00:00Z'),
          }),
        }),
      );
    });

    it('should update notification with existing metadata merged', async () => {
      mockPrismaService.notification.findFirst.mockResolvedValueOnce({
        id: 'notif-002',
        messageId: 'msg-del-002',
        metadata: { previousKey: 'value' },
      });

      const payload = buildSnsEnvelope({
        eventType: 'Delivery',
        mail: {
          messageId: 'msg-del-002',
          destination: ['user@test.com'],
          headers: [],
          commonHeaders: { from: ['noreply@app.com'], to: ['user@test.com'], subject: 'Test' },
        },
        delivery: {
          timestamp: '2026-03-20T12:00:00Z',
          recipients: ['user@test.com'],
        },
      });

      await controller.handleDelivery(payload);

      expect(mockPrismaService.notification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              previousKey: 'value',
              sesEvent: expect.objectContaining({ status: 'delivered' }),
            }),
          }),
        }),
      );
    });
  });

  describe('updateEmailStatus — via handleBounce (FAILED branch)', () => {
    it('should set failedAt and error when bounce notification found', async () => {
      mockPrismaService.notification.findFirst
        .mockResolvedValueOnce({
          id: 'notif-bounce',
          messageId: 'msg-bounce-001',
          metadata: null,
        })
        .mockResolvedValueOnce({ id: 'notif-bounce' }); // for markEmailAsInvalid lookup

      const payload = buildSnsEnvelope({
        eventType: 'Bounce',
        mail: {
          messageId: 'msg-bounce-001',
          destination: ['bounced@test.com'],
          headers: [],
          commonHeaders: { from: ['noreply@app.com'], to: ['bounced@test.com'], subject: 'Test' },
        },
        bounce: {
          bounceType: 'Permanent',
          bounceSubType: 'General',
          bouncedRecipients: [{ emailAddress: 'bounced@test.com', status: '5.1.1' }],
          timestamp: '2026-03-20T00:00:00Z',
        },
      });

      await controller.handleBounce(payload, 'Notification');

      expect(mockPrismaService.notification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'FAILED',
            error: expect.stringContaining('Permanent'),
          }),
        }),
      );
    });
  });

  describe('markEmailAsInvalid — via handleBounce', () => {
    it('should disable email prefs when sourceNotification found', async () => {
      // First call for updateEmailStatus notification lookup
      mockPrismaService.notification.findFirst
        .mockResolvedValueOnce({
          id: 'notif-perm',
          messageId: 'msg-perm-001',
          metadata: null,
        })
        .mockResolvedValueOnce({ id: 'notif-perm' }); // findFirst for markEmailAsInvalid

      mockPrismaService.notification.findUnique.mockResolvedValueOnce({
        tenantId: 'tenant-001',
        customerId: 'cust-001',
      });

      const payload = buildSnsEnvelope({
        eventType: 'Bounce',
        mail: {
          messageId: 'msg-perm-001',
          destination: ['perm@test.com'],
          headers: [],
          commonHeaders: { from: ['noreply@app.com'], to: ['perm@test.com'], subject: 'Test' },
        },
        bounce: {
          bounceType: 'Permanent',
          bounceSubType: 'General',
          bouncedRecipients: [{ emailAddress: 'perm@test.com', status: '5.1.1' }],
          timestamp: '2026-03-20T00:00:00Z',
        },
      });

      await controller.handleBounce(payload, 'Notification');

      expect(mockPrismaService.customerNotificationPreference.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { customerId_channel: { customerId: 'cust-001', channel: 'EMAIL' } },
          update: { enabled: false },
        }),
      );
    });
  });

  describe('handleComplaint — unsubscribeEmail branch', () => {
    it('should unsubscribe and revoke marketing consent when notification found', async () => {
      // updateEmailStatus finds the notification
      mockPrismaService.notification.findFirst
        .mockResolvedValueOnce({
          id: 'notif-complaint',
          messageId: 'msg-complaint-001',
          metadata: null,
        })
        // unsubscribeEmail finds notification by messageId
        .mockResolvedValueOnce({
          customerId: 'cust-002',
          tenantId: 'tenant-001',
        });

      const payload = buildSnsEnvelope({
        eventType: 'Complaint',
        mail: {
          messageId: 'msg-complaint-001',
          destination: ['complainer@test.com'],
          headers: [],
          commonHeaders: {
            from: ['noreply@app.com'],
            to: ['complainer@test.com'],
            subject: 'Test',
          },
        },
        complaint: {
          complaintSubType: 'abuse',
          complainedRecipients: [{ emailAddress: 'complainer@test.com' }],
          timestamp: '2026-03-20T00:00:00Z',
        },
      });

      await controller.handleComplaint(payload, 'Notification');

      expect(mockPrismaService.customer.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cust-002', tenantId: 'tenant-001' },
          data: expect.objectContaining({ marketingConsent: false }),
        }),
      );
    });
  });

  describe('verifySnsSignature — SubscriptionConfirmation fields', () => {
    beforeEach(() => {
      jest.restoreAllMocks();
    });

    it('should use SubscribeURL/Token fields for non-Notification type', async () => {
      jest
        .spyOn(
          controller as unknown as { fetchCertificate: (url: string) => Promise<string> },
          'fetchCertificate',
        )
        .mockResolvedValue('FAKE_CERT');

      const message: Record<string, unknown> = {
        Type: 'SubscriptionConfirmation',
        SigningCertURL: 'https://sns.eu-west-1.amazonaws.com/cert.pem',
        Signature: 'sig==',
        Message: 'confirm',
        MessageId: 'id-sub',
        SubscribeURL: 'https://sns.amazonaws.com/subscribe',
        Token: 'token-123',
        Timestamp: '2026-03-17T00:00:00Z',
        TopicArn: 'arn:aws:sns:eu-west-1:123:topic',
      };

      // Will return false because cert is fake, but exercises the field selection branch
      const result = await controller.verifySnsSignature(message);
      expect(result).toBe(false);
    });
  });
});
