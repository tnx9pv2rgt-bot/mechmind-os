import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { WebhookSubscriptionService } from './webhook-subscription.service';
import { PrismaService } from '@common/services/prisma.service';
import { WEBHOOK_EVENTS } from './dto/webhook-subscription.dto';

type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

const TENANT_ID = 'tenant-uuid-001';

function mockSubscription(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'webhook-uuid-001',
    tenantId: TENANT_ID,
    url: 'https://client.example.com/webhooks',
    events: ['booking.created', 'invoice.paid'],
    secret: 'supersecretkey1234567890',
    isActive: true,
    failCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('WebhookSubscriptionService', () => {
  let service: WebhookSubscriptionService;
  let prisma: {
    webhookSubscription: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      webhookSubscription: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [WebhookSubscriptionService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(WebhookSubscriptionService);
  });

  // ─── create ───

  describe('create', () => {
    it('should create a new webhook subscription', async () => {
      const dto = {
        url: 'https://client.example.com/webhooks',
        events: ['booking.created', 'invoice.paid'],
        secret: 'supersecretkey1234567890',
      };
      const expected = mockSubscription(dto);
      prisma.webhookSubscription.create.mockResolvedValue(expected);

      const result = await service.create(TENANT_ID, dto as Parameters<typeof service.create>[1]);

      expect(result).toEqual(expected);
      expect(prisma.webhookSubscription.create).toHaveBeenCalledWith({
        data: {
          tenantId: TENANT_ID,
          url: dto.url,
          events: dto.events,
          secret: dto.secret,
          isActive: true,
          failCount: 0,
        },
      });
    });

    it('should reject non-HTTPS URLs', async () => {
      const dto = {
        url: 'http://client.example.com/webhooks', // HTTP, not HTTPS
        events: ['booking.created'],
        secret: 'supersecretkey1234567890',
      };

      await expect(
        service.create(TENANT_ID, dto as Parameters<typeof service.create>[1]),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject empty events array', async () => {
      const dto = {
        url: 'https://client.example.com/webhooks',
        events: [],
        secret: 'supersecretkey1234567890',
      };

      await expect(
        service.create(TENANT_ID, dto as Parameters<typeof service.create>[1]),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject short secrets', async () => {
      const dto = {
        url: 'https://client.example.com/webhooks',
        events: ['booking.created'],
        secret: 'short', // Less than 16 chars
      };

      // DTO validation will catch this, but we test service isolation
      await expect(
        service.create(TENANT_ID, dto as Parameters<typeof service.create>[1]),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── findAll ───

  describe('findAll', () => {
    it('should return paginated webhooks', async () => {
      const subscriptions = [
        mockSubscription({ id: 'webhook-001' }),
        mockSubscription({ id: 'webhook-002' }),
      ];
      prisma.webhookSubscription.findMany.mockResolvedValue(subscriptions);
      prisma.webhookSubscription.count.mockResolvedValue(2);

      const result = await service.findAll(TENANT_ID, { page: 1, limit: 20 });

      expect(result).toEqual({ data: subscriptions, total: 2, page: 1, limit: 20 });
      expect(prisma.webhookSubscription.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });

    it('should filter by isActive', async () => {
      const activeSubscriptions = [mockSubscription({ isActive: true })];
      prisma.webhookSubscription.findMany.mockResolvedValue(activeSubscriptions);
      prisma.webhookSubscription.count.mockResolvedValue(1);

      await service.findAll(TENANT_ID, { isActive: true, page: 1, limit: 20 });

      expect(prisma.webhookSubscription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID, isActive: true },
        }),
      );
    });

    it('should filter by event', async () => {
      const subscriptions = [mockSubscription({ events: ['booking.created'] })];
      prisma.webhookSubscription.findMany.mockResolvedValue(subscriptions);
      prisma.webhookSubscription.count.mockResolvedValue(1);

      await service.findAll(TENANT_ID, { event: 'booking.created' as const, page: 1, limit: 20 });

      expect(prisma.webhookSubscription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID, events: { has: 'booking.created' } },
        }),
      );
    });

    it('should respect pagination offset', async () => {
      prisma.webhookSubscription.findMany.mockResolvedValue([]);
      prisma.webhookSubscription.count.mockResolvedValue(50);

      await service.findAll(TENANT_ID, { page: 3, limit: 10 });

      expect(prisma.webhookSubscription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
    });
  });

  // ─── findOne ───

  describe('findOne', () => {
    it('should return a webhook subscription', async () => {
      const expected = mockSubscription();
      prisma.webhookSubscription.findUnique.mockResolvedValue(expected);

      const result = await service.findOne(TENANT_ID, 'webhook-uuid-001');

      expect(result).toEqual(expected);
      expect(prisma.webhookSubscription.findUnique).toHaveBeenCalledWith({
        where: { id: 'webhook-uuid-001' },
      });
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.webhookSubscription.findUnique.mockResolvedValue(null);

      await expect(service.findOne(TENANT_ID, 'non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if tenant mismatch', async () => {
      prisma.webhookSubscription.findUnique.mockResolvedValue(
        mockSubscription({ tenantId: 'other-tenant' }),
      );

      await expect(service.findOne(TENANT_ID, 'webhook-uuid-001')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── update ───

  describe('update', () => {
    it('should update webhook subscription', async () => {
      const original = mockSubscription();
      prisma.webhookSubscription.findUnique.mockResolvedValue(original);
      const updated = mockSubscription({
        url: 'https://newendpoint.example.com/webhooks',
        events: ['booking.created'],
      });
      prisma.webhookSubscription.update.mockResolvedValue(updated);

      const dto = {
        url: 'https://newendpoint.example.com/webhooks',
        events: ['booking.created' as const],
      };

      const result = await service.update(TENANT_ID, 'webhook-uuid-001', dto);

      expect(result).toEqual(updated);
      expect(prisma.webhookSubscription.update).toHaveBeenCalledWith({
        where: { id: 'webhook-uuid-001' },
        data: {
          url: 'https://newendpoint.example.com/webhooks',
          events: ['booking.created'],
        },
      });
    });

    it('should reject non-HTTPS URLs on update', async () => {
      prisma.webhookSubscription.findUnique.mockResolvedValue(mockSubscription());

      const dto = {
        url: 'http://unsafe.example.com/webhooks',
      };

      await expect(service.update(TENANT_ID, 'webhook-uuid-001', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if webhook not found', async () => {
      prisma.webhookSubscription.findUnique.mockResolvedValue(null);

      await expect(service.update(TENANT_ID, 'non-existent', { isActive: false })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── remove ───

  describe('remove', () => {
    it('should disable webhook subscription', async () => {
      const original = mockSubscription();
      prisma.webhookSubscription.findUnique.mockResolvedValue(original);
      const disabled = mockSubscription({ isActive: false });
      prisma.webhookSubscription.update.mockResolvedValue(disabled);

      await service.remove(TENANT_ID, 'webhook-uuid-001');

      expect(prisma.webhookSubscription.update).toHaveBeenCalledWith({
        where: { id: 'webhook-uuid-001' },
        data: { isActive: false },
      });
    });

    it('should throw NotFoundException if webhook not found', async () => {
      prisma.webhookSubscription.findUnique.mockResolvedValue(null);

      await expect(service.remove(TENANT_ID, 'non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── dispatch ───

  describe('dispatch', () => {
    it('should dispatch event to matching subscriptions', async () => {
      const subscriptions = [
        mockSubscription({
          id: 'webhook-001',
          url: 'https://client1.example.com/webhooks',
          events: ['booking.created'],
        }),
        mockSubscription({
          id: 'webhook-002',
          url: 'https://client2.example.com/webhooks',
          events: ['booking.created', 'invoice.paid'],
        }),
      ];
      prisma.webhookSubscription.findMany.mockResolvedValue(subscriptions);

      // Mock fetch globally
      const originalFetch = global.fetch;
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);
      (global.fetch as jest.Mock) = fetchMock;

      const result = await service.dispatch(TENANT_ID, 'booking.created', {
        bookingId: 'booking-001',
      });

      expect(result.dispatched).toBe(2);
      expect(result.failed).toBe(0);
      expect(fetchMock).toHaveBeenCalledTimes(2);

      global.fetch = originalFetch;
    });

    it('should compute HMAC-SHA256 signature correctly', async () => {
      const subscription = mockSubscription({
        secret: 'testSecret1234567890',
      });
      prisma.webhookSubscription.findMany.mockResolvedValue([subscription]);

      const originalFetch = global.fetch;
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);
      (global.fetch as jest.Mock) = fetchMock;

      await service.dispatch(TENANT_ID, 'booking.created', { test: true });

      const callArgs = (fetchMock as jest.Mock).mock.calls[0];
      const headers = callArgs[1].headers as Record<string, string>;
      const signature = headers['X-MechMind-Signature'];

      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);

      global.fetch = originalFetch;
    });

    it('should increment failCount and disable after 5 failures', async () => {
      const subscription = mockSubscription({
        failCount: 4, // Will become 5 after one more failure
      });
      prisma.webhookSubscription.findMany.mockResolvedValue([subscription]);

      const originalFetch = global.fetch;
      const fetchMock = jest.fn().mockResolvedValue({
        ok: false, // Failure
        status: 500,
      } as Response);
      (global.fetch as jest.Mock) = fetchMock;

      prisma.webhookSubscription.update.mockResolvedValue(subscription);

      await service.dispatch(TENANT_ID, 'booking.created', { test: true });

      expect(prisma.webhookSubscription.update).toHaveBeenCalledWith({
        where: { id: subscription.id },
        data: {
          failCount: 5,
          isActive: false, // Should be disabled
        },
      });

      global.fetch = originalFetch;
    });

    it('should reject invalid events', async () => {
      await expect(
        service.dispatch(TENANT_ID, 'invalid.event' as unknown as WebhookEvent, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle network timeout', async () => {
      const subscription = mockSubscription();
      prisma.webhookSubscription.findMany.mockResolvedValue([subscription]);

      const originalFetch = global.fetch;
      const fetchMock = jest.fn().mockRejectedValue(new Error('Network timeout'));
      (global.fetch as jest.Mock) = fetchMock;
      prisma.webhookSubscription.update.mockResolvedValue(subscription);

      const result = await service.dispatch(TENANT_ID, 'booking.created', {});

      expect(result.failed).toBe(1);
      expect(result.dispatched).toBe(0);

      global.fetch = originalFetch;
    });
  });

  // ─── sendTest ───

  describe('sendTest', () => {
    it('should send test payload to webhook', async () => {
      const subscription = mockSubscription();
      prisma.webhookSubscription.findUnique.mockResolvedValue(subscription);

      const originalFetch = global.fetch;
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);
      (global.fetch as jest.Mock) = fetchMock;

      const result = await service.sendTest(TENANT_ID, 'webhook-uuid-001', 'booking.created');

      expect(result).toBe(true);
      expect(fetchMock).toHaveBeenCalled();

      const callArgs = (fetchMock as jest.Mock).mock.calls[0];
      const body = callArgs[1].body as string;
      const parsedBody = JSON.parse(body);

      expect(parsedBody.event).toBe('booking.created');
      expect(parsedBody.data.test).toBe(true);

      global.fetch = originalFetch;
    });

    it('should return false on webhook error', async () => {
      const subscription = mockSubscription();
      prisma.webhookSubscription.findUnique.mockResolvedValue(subscription);

      const originalFetch = global.fetch;
      const fetchMock = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);
      (global.fetch as jest.Mock) = fetchMock;

      const result = await service.sendTest(TENANT_ID, 'webhook-uuid-001', 'booking.created');

      expect(result).toBe(false);

      global.fetch = originalFetch;
    });

    it('should throw NotFoundException if webhook not found', async () => {
      prisma.webhookSubscription.findUnique.mockResolvedValue(null);

      await expect(service.sendTest(TENANT_ID, 'non-existent', 'booking.created')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── tenant isolation ───

  describe('tenant isolation', () => {
    it('should isolate subscriptions per tenant', async () => {
      const _tenant2Subscription = mockSubscription({ tenantId: 'tenant-002' });

      prisma.webhookSubscription.findUnique.mockResolvedValue(_tenant2Subscription);

      await expect(service.findOne('tenant-001', 'webhook-uuid-001')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
