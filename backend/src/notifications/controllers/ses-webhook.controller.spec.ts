import { Test, TestingModule } from '@nestjs/testing';
import { SesWebhookController } from './ses-webhook.controller';

describe('SesWebhookController', () => {
  let controller: SesWebhookController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SesWebhookController],
    }).compile();

    controller = module.get<SesWebhookController>(SesWebhookController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handleBounce', () => {
    it('should process a permanent bounce event', async () => {
      const payload = {
        Message: JSON.stringify({
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
        }),
      };

      await expect(controller.handleBounce(payload, 'Notification')).resolves.toBeUndefined();
    });

    it('should process a transient bounce event', async () => {
      const payload = {
        Message: JSON.stringify({
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
        }),
      };

      await expect(controller.handleBounce(payload, 'Notification')).resolves.toBeUndefined();
    });

    it('should handle invalid JSON gracefully', async () => {
      const payload = { Message: 'not-json' };

      await expect(controller.handleBounce(payload, 'Notification')).resolves.toBeUndefined();
    });
  });

  describe('handleComplaint', () => {
    it('should process a complaint event', async () => {
      const payload = {
        Message: JSON.stringify({
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
        }),
      };

      await expect(controller.handleComplaint(payload, 'Notification')).resolves.toBeUndefined();
    });

    it('should handle invalid JSON gracefully', async () => {
      const payload = { Message: 'invalid' };

      await expect(controller.handleComplaint(payload, 'Notification')).resolves.toBeUndefined();
    });
  });

  describe('handleDelivery', () => {
    it('should process a delivery event', async () => {
      const payload = {
        Message: JSON.stringify({
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
        }),
      };

      await expect(controller.handleDelivery(payload)).resolves.toBeUndefined();
    });

    it('should handle invalid JSON gracefully', async () => {
      const payload = { Message: 'bad-json' };

      await expect(controller.handleDelivery(payload)).resolves.toBeUndefined();
    });
  });
});
