import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  CreateWebhookSubscriptionDto,
  UpdateWebhookSubscriptionDto,
  TestWebhookPayloadDto,
  WebhookSubscriptionQueryDto,
  WEBHOOK_EVENTS,
} from './webhook-subscription.dto';

describe('WebhookSubscriptionDto', () => {
  describe('CreateWebhookSubscriptionDto', () => {
    it('should validate valid payload', async () => {
      const payload = {
        url: 'https://client.example.com/webhooks',
        events: ['booking.created'],
        secret: 'supersecretkey1234567890',
      };
      const dto = plainToInstance(CreateWebhookSubscriptionDto, payload);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should reject non-HTTPS URL', async () => {
      const payload = {
        url: 'http://client.example.com/webhooks',
        events: ['booking.created'],
        secret: 'supersecretkey1234567890',
      };
      const dto = plainToInstance(CreateWebhookSubscriptionDto, payload);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('url');
    });

    it('should reject missing URL', async () => {
      const payload = {
        events: ['booking.created'],
        secret: 'supersecretkey1234567890',
      };
      const dto = plainToInstance(CreateWebhookSubscriptionDto, payload);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject empty events array', async () => {
      const payload = {
        url: 'https://client.example.com/webhooks',
        events: [],
        secret: 'supersecretkey1234567890',
      };
      const dto = plainToInstance(CreateWebhookSubscriptionDto, payload);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid event type', async () => {
      const payload = {
        url: 'https://client.example.com/webhooks',
        events: ['invalid.event'],
        secret: 'supersecretkey1234567890',
      };
      const dto = plainToInstance(CreateWebhookSubscriptionDto, payload);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject secret shorter than 16 characters', async () => {
      const payload = {
        url: 'https://client.example.com/webhooks',
        events: ['booking.created'],
        secret: 'short',
      };
      const dto = plainToInstance(CreateWebhookSubscriptionDto, payload);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should accept multiple valid events', async () => {
      const payload = {
        url: 'https://client.example.com/webhooks',
        events: ['booking.created', 'invoice.paid', 'estimate.approved'],
        secret: 'supersecretkey1234567890',
      };
      const dto = plainToInstance(CreateWebhookSubscriptionDto, payload);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should validate all webhook event types', async () => {
      for (const event of WEBHOOK_EVENTS) {
        const payload = {
          url: 'https://client.example.com/webhooks',
          events: [event],
          secret: 'supersecretkey1234567890',
        };
        const dto = plainToInstance(CreateWebhookSubscriptionDto, payload);
        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
      }
    });
  });

  describe('UpdateWebhookSubscriptionDto', () => {
    it('should validate empty partial update', async () => {
      const payload = {};
      const dto = plainToInstance(UpdateWebhookSubscriptionDto, payload);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should validate partial URL update', async () => {
      const payload = {
        url: 'https://new-endpoint.com/webhooks',
      };
      const dto = plainToInstance(UpdateWebhookSubscriptionDto, payload);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should reject non-HTTPS URL in update', async () => {
      const payload = {
        url: 'http://new-endpoint.com/webhooks',
      };
      const dto = plainToInstance(UpdateWebhookSubscriptionDto, payload);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate partial events update', async () => {
      const payload = {
        events: ['invoice.paid'],
      };
      const dto = plainToInstance(UpdateWebhookSubscriptionDto, payload);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should reject empty events array in update', async () => {
      const payload = {
        events: [],
      };
      const dto = plainToInstance(UpdateWebhookSubscriptionDto, payload);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate partial secret update', async () => {
      const payload = {
        secret: 'newsecretkey1234567890',
      };
      const dto = plainToInstance(UpdateWebhookSubscriptionDto, payload);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should validate isActive toggle', async () => {
      const payload = {
        isActive: false,
      };
      const dto = plainToInstance(UpdateWebhookSubscriptionDto, payload);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should validate combination of fields', async () => {
      const payload = {
        url: 'https://new-endpoint.com/webhooks',
        events: ['booking.created', 'invoice.paid'],
        isActive: true,
      };
      const dto = plainToInstance(UpdateWebhookSubscriptionDto, payload);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });
  });

  describe('TestWebhookPayloadDto', () => {
    it('should validate test payload', async () => {
      const payload = {
        id: 'webhook-uuid-001',
        event: 'booking.created',
      };
      const dto = plainToInstance(TestWebhookPayloadDto, payload);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should reject missing id', async () => {
      const payload = {
        event: 'booking.created',
      };
      const dto = plainToInstance(TestWebhookPayloadDto, payload);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject missing event', async () => {
      const payload = {
        id: 'webhook-uuid-001',
      };
      const dto = plainToInstance(TestWebhookPayloadDto, payload);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid event type', async () => {
      const payload = {
        id: 'webhook-uuid-001',
        event: 'invalid.event',
      };
      const dto = plainToInstance(TestWebhookPayloadDto, payload);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('WebhookSubscriptionQueryDto', () => {
    it('should validate empty query', async () => {
      const payload = {};
      const dto = plainToInstance(WebhookSubscriptionQueryDto, payload);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should validate isActive filter', async () => {
      const payload = {
        isActive: true,
      };
      const dto = plainToInstance(WebhookSubscriptionQueryDto, payload);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should validate event filter', async () => {
      const payload = {
        event: 'invoice.paid',
      };
      const dto = plainToInstance(WebhookSubscriptionQueryDto, payload);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should validate pagination', async () => {
      const payload = {
        page: 2,
        limit: 50,
      };
      const dto = plainToInstance(WebhookSubscriptionQueryDto, payload);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should reject page < 1', async () => {
      const payload = {
        page: 0,
      };
      const dto = plainToInstance(WebhookSubscriptionQueryDto, payload);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject limit > 100', async () => {
      const payload = {
        limit: 101,
      };
      const dto = plainToInstance(WebhookSubscriptionQueryDto, payload);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject limit < 1', async () => {
      const payload = {
        limit: 0,
      };
      const dto = plainToInstance(WebhookSubscriptionQueryDto, payload);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should accept limit at boundary (100)', async () => {
      const payload = {
        limit: 100,
      };
      const dto = plainToInstance(WebhookSubscriptionQueryDto, payload);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should validate all combinations of filters and pagination', async () => {
      const payload = {
        isActive: true,
        event: 'booking.created',
        page: 1,
        limit: 20,
      };
      const dto = plainToInstance(WebhookSubscriptionQueryDto, payload);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });
  });
});
