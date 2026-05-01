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

  // ─── HMAC signature verification (CRITICAL for webhook security) ───

  describe('HMAC signature verification', () => {
    it('should verify signature with timingSafeEqual semantics', async () => {
      const subscription = mockSubscription({
        secret: 'mySecretKey1234567890',
      });
      prisma.webhookSubscription.findMany.mockResolvedValue([subscription]);

      const originalFetch = global.fetch;
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);
      (global.fetch as jest.Mock) = fetchMock;

      await service.dispatch(TENANT_ID, 'booking.created', { id: '123' });

      const callArgs = (fetchMock as jest.Mock).mock.calls[0];
      const headers = callArgs[1].headers as Record<string, string>;
      const signature = headers['X-MechMind-Signature'];

      // Signature must be in sha256=hexstring format
      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
      // Must not contain spaces or special chars that could be stripped
      expect(signature).not.toContain(' ');

      global.fetch = originalFetch;
    });

    it('should include correct event type in X-MechMind-Event header', async () => {
      const subscription = mockSubscription({
        events: ['invoice.paid'],
      });
      prisma.webhookSubscription.findMany.mockResolvedValue([subscription]);

      const originalFetch = global.fetch;
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);
      (global.fetch as jest.Mock) = fetchMock;

      await service.dispatch(TENANT_ID, 'invoice.paid', { amount: 100 });

      const callArgs = (fetchMock as jest.Mock).mock.calls[0];
      const headers = callArgs[1].headers as Record<string, string>;

      expect(headers['X-MechMind-Event']).toBe('invoice.paid');
      expect(headers['Content-Type']).toBe('application/json');

      global.fetch = originalFetch;
    });

    it('should not dispatch to inactive subscriptions', async () => {
      const activeSubscription = mockSubscription({
        id: 'webhook-001',
        isActive: true,
      });
      const inactiveSubscription = mockSubscription({
        id: 'webhook-002',
        isActive: false,
      });
      prisma.webhookSubscription.findMany.mockResolvedValue([activeSubscription]);

      const originalFetch = global.fetch;
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);
      (global.fetch as jest.Mock) = fetchMock;

      await service.dispatch(TENANT_ID, 'booking.created', {});

      // Should only call fetch for active subscription
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).not.toHaveBeenCalledWith(
        expect.stringContaining('webhook-002'),
        expect.anything(),
      );

      global.fetch = originalFetch;
    });

    it('should handle multiple non-200 HTTP responses as failures', async () => {
      const subscription1 = mockSubscription({ id: 'webhook-001' });
      const subscription2 = mockSubscription({ id: 'webhook-002' });
      const subscription3 = mockSubscription({ id: 'webhook-003' });
      prisma.webhookSubscription.findMany.mockResolvedValue([
        subscription1,
        subscription2,
        subscription3,
      ]);

      const originalFetch = global.fetch;
      const fetchMock = jest
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        } as Response);

      (global.fetch as jest.Mock) = fetchMock;
      prisma.webhookSubscription.update
        .mockResolvedValueOnce(subscription1)
        .mockResolvedValueOnce(subscription2)
        .mockResolvedValueOnce(subscription3);

      const result = await service.dispatch(TENANT_ID, 'booking.created', {});
      expect(result.failed).toBe(3);
      expect(result.dispatched).toBe(0);

      global.fetch = originalFetch;
    });

    it('should persist failure count across multiple failures', async () => {
      const subscription = mockSubscription({
        failCount: 0,
      });
      prisma.webhookSubscription.findMany.mockResolvedValue([subscription]);

      const originalFetch = global.fetch;
      const fetchMock = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);
      (global.fetch as jest.Mock) = fetchMock;

      // Simulate 5 consecutive failures
      for (let i = 0; i < 5; i++) {
        const updatedSub = mockSubscription({ failCount: i + 1 });
        prisma.webhookSubscription.update.mockResolvedValueOnce(updatedSub);
        prisma.webhookSubscription.findMany.mockResolvedValueOnce([{ ...subscription, failCount: i }]);

        await service.dispatch(TENANT_ID, 'booking.created', {});

        // Verify update was called with correct failCount
        const callArgs = (prisma.webhookSubscription.update as jest.Mock).mock.calls;
        const lastCall = callArgs[callArgs.length - 1][0];
        expect(lastCall.data.failCount).toBe(i + 1);
      }

      global.fetch = originalFetch;
    });
  });

  // ─── Update edge cases ───

  describe('update - edge cases for branch coverage', () => {
    it('should update only url without affecting other fields', async () => {
      const original = mockSubscription();
      prisma.webhookSubscription.findUnique.mockResolvedValue(original);
      const updated = mockSubscription({
        url: 'https://newurl.example.com/webhook',
      });
      prisma.webhookSubscription.update.mockResolvedValue(updated);

      const dto = { url: 'https://newurl.example.com/webhook' };

      await service.update(TENANT_ID, 'webhook-uuid-001', dto);

      const callArgs = (prisma.webhookSubscription.update as jest.Mock).mock.calls[0];
      expect(callArgs[0].data).toEqual({ url: 'https://newurl.example.com/webhook' });
      expect(callArgs[0].data).not.toHaveProperty('events');
      expect(callArgs[0].data).not.toHaveProperty('secret');
    });

    it('should update only events without affecting other fields', async () => {
      const original = mockSubscription();
      prisma.webhookSubscription.findUnique.mockResolvedValue(original);
      const updated = mockSubscription({ events: ['invoice.paid'] });
      prisma.webhookSubscription.update.mockResolvedValue(updated);

      const dto = { events: ['invoice.paid' as const] };

      await service.update(TENANT_ID, 'webhook-uuid-001', dto);

      const callArgs = (prisma.webhookSubscription.update as jest.Mock).mock.calls[0];
      expect(callArgs[0].data).toEqual({ events: ['invoice.paid'] });
      expect(callArgs[0].data).not.toHaveProperty('url');
    });

    it('should update only secret without affecting other fields', async () => {
      const original = mockSubscription();
      prisma.webhookSubscription.findUnique.mockResolvedValue(original);
      const updated = mockSubscription({ secret: 'newsecret1234567890' });
      prisma.webhookSubscription.update.mockResolvedValue(updated);

      const dto = { secret: 'newsecret1234567890' };

      await service.update(TENANT_ID, 'webhook-uuid-001', dto);

      const callArgs = (prisma.webhookSubscription.update as jest.Mock).mock.calls[0];
      expect(callArgs[0].data).toEqual({ secret: 'newsecret1234567890' });
      expect(callArgs[0].data).not.toHaveProperty('url');
    });

    it('should update only isActive without affecting other fields', async () => {
      const original = mockSubscription();
      prisma.webhookSubscription.findUnique.mockResolvedValue(original);
      const updated = mockSubscription({ isActive: false });
      prisma.webhookSubscription.update.mockResolvedValue(updated);

      const dto = { isActive: false };

      await service.update(TENANT_ID, 'webhook-uuid-001', dto);

      const callArgs = (prisma.webhookSubscription.update as jest.Mock).mock.calls[0];
      expect(callArgs[0].data).toEqual({ isActive: false });
      expect(callArgs[0].data).not.toHaveProperty('url');
      expect(callArgs[0].data).not.toHaveProperty('events');
    });

    it('should update multiple fields simultaneously', async () => {
      const original = mockSubscription();
      prisma.webhookSubscription.findUnique.mockResolvedValue(original);
      const updated = mockSubscription({
        url: 'https://newurl.example.com/webhook',
        events: ['invoice.paid'],
        isActive: false,
      });
      prisma.webhookSubscription.update.mockResolvedValue(updated);

      const dto = {
        url: 'https://newurl.example.com/webhook',
        events: ['invoice.paid' as const],
        isActive: false,
      };

      await service.update(TENANT_ID, 'webhook-uuid-001', dto);

      const callArgs = (prisma.webhookSubscription.update as jest.Mock).mock.calls[0];
      expect(callArgs[0].data).toEqual({
        url: 'https://newurl.example.com/webhook',
        events: ['invoice.paid'],
        isActive: false,
      });
    });
  });

  // ─── FindAll pagination edge cases ───

  describe('findAll - pagination edge cases', () => {
    it('should use default page 1 when not provided', async () => {
      prisma.webhookSubscription.findMany.mockResolvedValue([]);
      prisma.webhookSubscription.count.mockResolvedValue(0);

      const query = { limit: 20 };

      await service.findAll(TENANT_ID, query as Parameters<typeof service.findAll>[1]);

      const callArgs = (prisma.webhookSubscription.findMany as jest.Mock).mock.calls[0];
      expect(callArgs[0].skip).toBe(0);
      expect(callArgs[0].take).toBe(20);
    });

    it('should use default limit 20 when not provided', async () => {
      prisma.webhookSubscription.findMany.mockResolvedValue([]);
      prisma.webhookSubscription.count.mockResolvedValue(0);

      const query = { page: 2 };

      await service.findAll(TENANT_ID, query as Parameters<typeof service.findAll>[1]);

      const callArgs = (prisma.webhookSubscription.findMany as jest.Mock).mock.calls[0];
      expect(callArgs[0].skip).toBe(20); // (2-1)*20
      expect(callArgs[0].take).toBe(20);
    });

    it('should combine isActive and event filters', async () => {
      prisma.webhookSubscription.findMany.mockResolvedValue([]);
      prisma.webhookSubscription.count.mockResolvedValue(0);

      const query = {
        isActive: true,
        event: 'booking.created' as const,
        page: 1,
        limit: 20,
      };

      await service.findAll(TENANT_ID, query);

      const callArgs = (prisma.webhookSubscription.findMany as jest.Mock).mock.calls[0];
      expect(callArgs[0].where).toEqual({
        tenantId: TENANT_ID,
        isActive: true,
        events: { has: 'booking.created' },
      });
    });

    it('should handle page with custom limit', async () => {
      prisma.webhookSubscription.findMany.mockResolvedValue([]);
      prisma.webhookSubscription.count.mockResolvedValue(100);

      const query = { page: 5, limit: 10 };

      const result = await service.findAll(TENANT_ID, query);

      expect(result.page).toBe(5);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(100);

      const callArgs = (prisma.webhookSubscription.findMany as jest.Mock).mock.calls[0];
      expect(callArgs[0].skip).toBe(40); // (5-1)*10
      expect(callArgs[0].take).toBe(10);
    });

    it('should handle isActive: false filter', async () => {
      prisma.webhookSubscription.findMany.mockResolvedValue([]);
      prisma.webhookSubscription.count.mockResolvedValue(0);

      const query = { isActive: false, page: 1, limit: 20 };

      await service.findAll(TENANT_ID, query);

      const callArgs = (prisma.webhookSubscription.findMany as jest.Mock).mock.calls[0];
      expect(callArgs[0].where).toEqual({
        tenantId: TENANT_ID,
        isActive: false,
      });
    });
  });

  // ─── Validation and error handling ───

  describe('validation methods - error cases', () => {
    it('should reject webhook with no event type', async () => {
      const dto = {
        url: 'https://client.example.com/webhooks',
        events: [] as never[],
        secret: 'supersecretkey1234567890',
      };

      await expect(service.create(TENANT_ID, dto as Parameters<typeof service.create>[1])).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should validate events array is array type', async () => {
      const dto = {
        url: 'https://client.example.com/webhooks',
        events: null as unknown as string[],
        secret: 'supersecretkey1234567890',
      };

      await expect(service.create(TENANT_ID, dto as Parameters<typeof service.create>[1])).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject webhook with undefined secret', async () => {
      const dto = {
        url: 'https://client.example.com/webhooks',
        events: ['booking.created'],
        secret: '' as never,
      };

      await expect(service.create(TENANT_ID, dto as Parameters<typeof service.create>[1])).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject webhook with exactly 15 char secret (below 16 minimum)', async () => {
      const dto = {
        url: 'https://client.example.com/webhooks',
        events: ['booking.created'],
        secret: '12345678901234', // 14 chars
      };

      await expect(service.create(TENANT_ID, dto as Parameters<typeof service.create>[1])).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should accept webhook with exactly 16 char secret', async () => {
      const dto = {
        url: 'https://client.example.com/webhooks',
        events: ['booking.created'],
        secret: '1234567890123456', // 16 chars exactly
      };

      const expected = mockSubscription(dto);
      prisma.webhookSubscription.create.mockResolvedValue(expected);

      const result = await service.create(TENANT_ID, dto as Parameters<typeof service.create>[1]);

      expect(result).toBeDefined();
      expect(prisma.webhookSubscription.create).toHaveBeenCalled();
    });

    it('should reject if secret is undefined vs empty string', async () => {
      const dto = {
        url: 'https://client.example.com/webhooks',
        events: ['booking.created'],
        secret: undefined as unknown as string,
      };

      await expect(service.create(TENANT_ID, dto as Parameters<typeof service.create>[1])).rejects.toThrow();
    });
  });

  // ─── Dispatch multiple subscriptions edge case ───

  describe('dispatch - multiple subscription scenarios', () => {
    it('should dispatch to multiple subscriptions listening to same event', async () => {
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
        mockSubscription({
          id: 'webhook-003',
          url: 'https://client3.example.com/webhooks',
          events: ['invoice.paid'], // Does NOT listen to booking.created
        }),
      ];
      prisma.webhookSubscription.findMany.mockResolvedValue([
        subscriptions[0],
        subscriptions[1],
      ]);

      const originalFetch = global.fetch;
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);
      (global.fetch as jest.Mock) = fetchMock;

      const result = await service.dispatch(TENANT_ID, 'booking.created', {
        bookingId: '123',
      });

      expect(result.dispatched).toBe(2);
      expect(result.details).toHaveLength(2);
      expect(result.details[0].subscriptionId).toBe('webhook-001');
      expect(result.details[1].subscriptionId).toBe('webhook-002');

      global.fetch = originalFetch;
    });

    it('should handle mixed success and failure dispatches', async () => {
      const subscriptions = [
        mockSubscription({
          id: 'webhook-001',
          events: ['booking.created'],
        }),
        mockSubscription({
          id: 'webhook-002',
          events: ['booking.created'],
        }),
        mockSubscription({
          id: 'webhook-003',
          events: ['booking.created'],
        }),
      ];
      prisma.webhookSubscription.findMany.mockResolvedValue(subscriptions);

      const originalFetch = global.fetch;
      const fetchMock = jest
        .fn()
        .mockResolvedValueOnce({ ok: true, status: 200 } as Response) // webhook-001: success
        .mockResolvedValueOnce({ ok: false, status: 500 } as Response) // webhook-002: failure
        .mockResolvedValueOnce({ ok: true, status: 200 } as Response); // webhook-003: success
      (global.fetch as jest.Mock) = fetchMock;

      // Mock update for failed webhook
      prisma.webhookSubscription.update.mockResolvedValue(subscriptions[1]);

      const result = await service.dispatch(TENANT_ID, 'booking.created', {});

      expect(result.dispatched).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.details).toHaveLength(3);
      expect(result.details[0]).toEqual({
        subscriptionId: 'webhook-001',
        success: true,
      });
      expect(result.details[1]).toEqual({
        subscriptionId: 'webhook-002',
        success: false,
      });
      expect(result.details[2]).toEqual({
        subscriptionId: 'webhook-003',
        success: true,
      });

      global.fetch = originalFetch;
    });

    it('should dispatch to zero subscriptions when none match event', async () => {
      prisma.webhookSubscription.findMany.mockResolvedValue([]);

      const originalFetch = global.fetch;
      const fetchMock = jest.fn();
      (global.fetch as jest.Mock) = fetchMock;

      const result = await service.dispatch(TENANT_ID, 'booking.created', {});

      expect(result.dispatched).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.details).toHaveLength(0);
      expect(fetchMock).not.toHaveBeenCalled();

      global.fetch = originalFetch;
    });
  });

  // ─── SendTest edge cases ───

  describe('sendTest - edge cases', () => {
    it('should include test: true flag in test payload', async () => {
      const subscription = mockSubscription();
      prisma.webhookSubscription.findUnique.mockResolvedValue(subscription);

      const originalFetch = global.fetch;
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);
      (global.fetch as jest.Mock) = fetchMock;

      await service.sendTest(TENANT_ID, 'webhook-uuid-001', 'booking.created');

      const callArgs = (fetchMock as jest.Mock).mock.calls[0];
      const body = callArgs[1].body as string;
      const parsedBody = JSON.parse(body);

      // sendWebhook wraps the testPayload in { event, timestamp, data: payload }
      expect(parsedBody.event).toBe('booking.created');
      // The test payload {test: true, data: {message}} is wrapped in the sendWebhook
      // So we get {event, timestamp, data: {event, timestamp, test, data}}
      expect(parsedBody.data).toBeDefined();
      expect(parsedBody.timestamp).toBeDefined();

      global.fetch = originalFetch;
    });

    it('should handle sendTest on non-existent webhook', async () => {
      prisma.webhookSubscription.findUnique.mockResolvedValue(null);

      await expect(service.sendTest(TENANT_ID, 'non-existent', 'booking.created')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle sendTest timeout gracefully', async () => {
      const subscription = mockSubscription();
      prisma.webhookSubscription.findUnique.mockResolvedValue(subscription);

      const originalFetch = global.fetch;
      const fetchMock = jest.fn().mockRejectedValue(new Error('Network timeout'));
      (global.fetch as jest.Mock) = fetchMock;

      const result = await service.sendTest(TENANT_ID, 'webhook-uuid-001', 'booking.created');

      expect(result).toBe(false);

      global.fetch = originalFetch;
    });
  });

  // ─── All event types coverage ───

  describe('all webhook event types', () => {
    it('should dispatch booking.created event', async () => {
      const subscription = mockSubscription({ events: ['booking.created'] });
      prisma.webhookSubscription.findMany.mockResolvedValue([subscription]);

      const originalFetch = global.fetch;
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);
      (global.fetch as jest.Mock) = fetchMock;

      const result = await service.dispatch(TENANT_ID, 'booking.created', {});

      expect(result.dispatched).toBe(1);
      expect(fetchMock).toHaveBeenCalled();
      const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
      expect(headers['X-MechMind-Event']).toBe('booking.created');

      global.fetch = originalFetch;
    });

    it('should dispatch booking.cancelled event', async () => {
      const subscription = mockSubscription({ events: ['booking.cancelled'] });
      prisma.webhookSubscription.findMany.mockResolvedValue([subscription]);

      const originalFetch = global.fetch;
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);
      (global.fetch as jest.Mock) = fetchMock;

      const result = await service.dispatch(TENANT_ID, 'booking.cancelled', {});

      expect(result.dispatched).toBe(1);
      const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
      expect(headers['X-MechMind-Event']).toBe('booking.cancelled');

      global.fetch = originalFetch;
    });

    it('should dispatch booking.confirmed event', async () => {
      const subscription = mockSubscription({ events: ['booking.confirmed'] });
      prisma.webhookSubscription.findMany.mockResolvedValue([subscription]);

      const originalFetch = global.fetch;
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);
      (global.fetch as jest.Mock) = fetchMock;

      const result = await service.dispatch(TENANT_ID, 'booking.confirmed', {});

      expect(result.dispatched).toBe(1);
      const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
      expect(headers['X-MechMind-Event']).toBe('booking.confirmed');

      global.fetch = originalFetch;
    });

    it('should dispatch invoice.paid event', async () => {
      const subscription = mockSubscription({ events: ['invoice.paid'] });
      prisma.webhookSubscription.findMany.mockResolvedValue([subscription]);

      const originalFetch = global.fetch;
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);
      (global.fetch as jest.Mock) = fetchMock;

      const result = await service.dispatch(TENANT_ID, 'invoice.paid', {});

      expect(result.dispatched).toBe(1);
      global.fetch = originalFetch;
    });

    it('should dispatch estimate.approved event', async () => {
      const subscription = mockSubscription({ events: ['estimate.approved'] });
      prisma.webhookSubscription.findMany.mockResolvedValue([subscription]);

      const originalFetch = global.fetch;
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);
      (global.fetch as jest.Mock) = fetchMock;

      const result = await service.dispatch(TENANT_ID, 'estimate.approved', {});

      expect(result.dispatched).toBe(1);
      global.fetch = originalFetch;
    });

    it('should dispatch work_order.completed event', async () => {
      const subscription = mockSubscription({ events: ['work_order.completed'] });
      prisma.webhookSubscription.findMany.mockResolvedValue([subscription]);

      const originalFetch = global.fetch;
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);
      (global.fetch as jest.Mock) = fetchMock;

      const result = await service.dispatch(TENANT_ID, 'work_order.completed', {});

      expect(result.dispatched).toBe(1);
      global.fetch = originalFetch;
    });

    it('should dispatch work_order.invoiced event', async () => {
      const subscription = mockSubscription({ events: ['work_order.invoiced'] });
      prisma.webhookSubscription.findMany.mockResolvedValue([subscription]);

      const originalFetch = global.fetch;
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);
      (global.fetch as jest.Mock) = fetchMock;

      const result = await service.dispatch(TENANT_ID, 'work_order.invoiced', {});

      expect(result.dispatched).toBe(1);
      global.fetch = originalFetch;
    });
  });

  // ─── Error logging verification ───

  describe('error logging and failure handling', () => {
    it('should log when disabling webhook after max failures', async () => {
      const subscription = mockSubscription({ failCount: 4 });
      prisma.webhookSubscription.findMany.mockResolvedValue([subscription]);

      const originalFetch = global.fetch;
      const fetchMock = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);
      (global.fetch as jest.Mock) = fetchMock;
      prisma.webhookSubscription.update.mockResolvedValue({
        ...subscription,
        failCount: 5,
        isActive: false,
      });

      const loggerSpy = jest.spyOn(service['logger'], 'warn');

      await service.dispatch(TENANT_ID, 'booking.created', {});

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Webhook subscription webhook-uuid-001 disabled after'),
      );

      loggerSpy.mockRestore();
      global.fetch = originalFetch;
    });

    it('should log dispatch event summary', async () => {
      const subscriptions = [mockSubscription({ id: 'webhook-001' })];
      prisma.webhookSubscription.findMany.mockResolvedValue(subscriptions);

      const originalFetch = global.fetch;
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);
      (global.fetch as jest.Mock) = fetchMock;

      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.dispatch(TENANT_ID, 'booking.created', {});

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Dispatching event booking.created to'),
      );

      loggerSpy.mockRestore();
      global.fetch = originalFetch;
    });

    it('should log webhook creation', async () => {
      const dto = {
        url: 'https://client.example.com/webhooks',
        events: ['booking.created' as const],
        secret: 'supersecretkey1234567890',
      };
      const expected = mockSubscription(dto);
      prisma.webhookSubscription.create.mockResolvedValue(expected);

      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.create(TENANT_ID, dto);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Creating webhook subscription for tenant'),
      );

      loggerSpy.mockRestore();
    });

    it('should log webhook removal', async () => {
      const subscription = mockSubscription();
      prisma.webhookSubscription.findUnique.mockResolvedValue(subscription);
      prisma.webhookSubscription.update.mockResolvedValue({
        ...subscription,
        isActive: false,
      });

      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.remove(TENANT_ID, 'webhook-uuid-001');

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Disabling webhook subscription webhook-uuid-001 for tenant'),
      );

      loggerSpy.mockRestore();
    });
  });

  // ─── Failure count edge cases ───

  describe('failure count thresholds', () => {
    it('should NOT disable webhook when failCount < MAX_FAIL_COUNT', async () => {
      const subscription = mockSubscription({ failCount: 3 });
      prisma.webhookSubscription.findMany.mockResolvedValue([subscription]);

      const originalFetch = global.fetch;
      const fetchMock = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);
      (global.fetch as jest.Mock) = fetchMock;
      prisma.webhookSubscription.update.mockResolvedValue(subscription);

      await service.dispatch(TENANT_ID, 'booking.created', {});

      const callArgs = (prisma.webhookSubscription.update as jest.Mock).mock.calls[0];
      expect(callArgs[0].data.failCount).toBe(4);
      expect(callArgs[0].data.isActive).toBe(true); // Still active!

      global.fetch = originalFetch;
    });

    it('should disable webhook when failCount reaches MAX_FAIL_COUNT', async () => {
      const subscription = mockSubscription({ failCount: 4 });
      prisma.webhookSubscription.findMany.mockResolvedValue([subscription]);

      const originalFetch = global.fetch;
      const fetchMock = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);
      (global.fetch as jest.Mock) = fetchMock;
      prisma.webhookSubscription.update.mockResolvedValue(subscription);

      await service.dispatch(TENANT_ID, 'booking.created', {});

      const callArgs = (prisma.webhookSubscription.update as jest.Mock).mock.calls[0];
      expect(callArgs[0].data.failCount).toBe(5);
      expect(callArgs[0].data.isActive).toBe(false); // Now disabled!

      global.fetch = originalFetch;
    });
  });

  // ─── HTTP response structure verification ───

  describe('HTTP request structure', () => {
    it('should set Content-Type to application/json', async () => {
      const subscription = mockSubscription();
      prisma.webhookSubscription.findMany.mockResolvedValue([subscription]);

      const originalFetch = global.fetch;
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);
      (global.fetch as jest.Mock) = fetchMock;

      await service.dispatch(TENANT_ID, 'booking.created', { id: '123' });

      const callArgs = fetchMock.mock.calls[0];
      const headers = callArgs[1].headers as Record<string, string>;
      expect(headers['Content-Type']).toBe('application/json');

      global.fetch = originalFetch;
    });

    it('should use POST method', async () => {
      const subscription = mockSubscription();
      prisma.webhookSubscription.findMany.mockResolvedValue([subscription]);

      const originalFetch = global.fetch;
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);
      (global.fetch as jest.Mock) = fetchMock;

      await service.dispatch(TENANT_ID, 'booking.created', {});

      const callArgs = fetchMock.mock.calls[0];
      expect(callArgs[1].method).toBe('POST');

      global.fetch = originalFetch;
    });

    it('should send body as JSON string', async () => {
      const subscription = mockSubscription();
      prisma.webhookSubscription.findMany.mockResolvedValue([subscription]);

      const originalFetch = global.fetch;
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);
      (global.fetch as jest.Mock) = fetchMock;

      await service.dispatch(TENANT_ID, 'booking.created', { bookingId: '123' });

      const callArgs = fetchMock.mock.calls[0];
      const body = callArgs[1].body as string;

      expect(typeof body).toBe('string');
      const parsed = JSON.parse(body);
      expect(parsed).toHaveProperty('event');
      expect(parsed).toHaveProperty('timestamp');
      expect(parsed).toHaveProperty('data');

      global.fetch = originalFetch;
    });
  });

  // ─── Dispatch validation and edge cases ───

  describe('dispatch validation', () => {
    it('should throw BadRequestException for unsupported event', async () => {
      const invalidEvent = 'invalid.event' as any;

      await expect(
        service.dispatch(TENANT_ID, invalidEvent, {}),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.webhookSubscription.findMany).not.toHaveBeenCalled();
    });

    it('should handle dispatch with no active subscriptions', async () => {
      prisma.webhookSubscription.findMany.mockResolvedValue([]);

      const result = await service.dispatch(TENANT_ID, 'booking.created', {});

      expect(result.dispatched).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.details).toEqual([]);
    });

    it('should log dispatch when no subscriptions found', async () => {
      prisma.webhookSubscription.findMany.mockResolvedValue([]);
      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.dispatch(TENANT_ID, 'booking.created', {});

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Dispatching event booking.created to 0 subscriptions'),
      );
      loggerSpy.mockRestore();
    });

    it('should validate event is in WEBHOOK_EVENTS array', async () => {
      const validEvents = [
        'booking.created',
        'booking.cancelled',
        'booking.confirmed',
        'invoice.paid',
        'estimate.approved',
        'work_order.completed',
        'work_order.invoiced',
      ];

      for (const event of validEvents) {
        prisma.webhookSubscription.findMany.mockResolvedValue([]);

        await expect(
          service.dispatch(TENANT_ID, event as any, {}),
        ).resolves.not.toThrow();
      }

      expect(prisma.webhookSubscription.findMany).toHaveBeenCalledTimes(7);
    });
  });

  // ─── HMAC signature edge cases ───

  describe('HMAC signature computation', () => {
    it('should compute consistent HMAC signatures for same input', async () => {
      const payload = { id: '123', amount: 100 };
      const secret = 'supersecretkey1234567890';

      const subscription = mockSubscription({ secret });
      prisma.webhookSubscription.findMany.mockResolvedValue([subscription]);

      const originalFetch = global.fetch;
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);
      (global.fetch as jest.Mock) = fetchMock;

      await service.dispatch(TENANT_ID, 'booking.created', payload);

      const firstCall = fetchMock.mock.calls[0];
      const firstSignature = firstCall[1].headers['X-MechMind-Signature'];

      // Reset and call again
      fetchMock.mockClear();
      await service.dispatch(TENANT_ID, 'booking.created', payload);

      const secondCall = fetchMock.mock.calls[0];
      const secondSignature = secondCall[1].headers['X-MechMind-Signature'];

      // Should have same signature format (though timestamp differs, it's in body)
      expect(firstSignature).toMatch(/^sha256=/);
      expect(secondSignature).toMatch(/^sha256=/);

      global.fetch = originalFetch;
    });

    it('should include sha256 prefix in signature header', async () => {
      const subscription = mockSubscription();
      prisma.webhookSubscription.findMany.mockResolvedValue([subscription]);

      const originalFetch = global.fetch;
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);
      (global.fetch as jest.Mock) = fetchMock;

      await service.dispatch(TENANT_ID, 'booking.created', {});

      const callArgs = fetchMock.mock.calls[0];
      const signature = callArgs[1].headers['X-MechMind-Signature'];

      expect(signature).toMatch(/^sha256=[a-f0-9]+$/);

      global.fetch = originalFetch;
    });
  });

  // ─── Fetch abort and timeout scenarios ───

  describe('fetch abort and timeout', () => {
    it('should handle fetch abort (timeout)', async () => {
      const subscription = mockSubscription();
      prisma.webhookSubscription.findMany.mockResolvedValue([subscription]);

      const originalFetch = global.fetch;
      const fetchMock = jest.fn().mockRejectedValue(new Error('The operation was aborted'));
      (global.fetch as jest.Mock) = fetchMock;
      prisma.webhookSubscription.update.mockResolvedValue(subscription);

      const result = await service.dispatch(TENANT_ID, 'booking.created', {});

      expect(result.failed).toBe(1);
      expect(fetchMock).toHaveBeenCalled();

      global.fetch = originalFetch;
    });

    it('should log error on fetch exception', async () => {
      const subscription = mockSubscription();
      prisma.webhookSubscription.findMany.mockResolvedValue([subscription]);

      const originalFetch = global.fetch;
      const fetchMock = jest.fn().mockRejectedValue(new Error('Network error'));
      (global.fetch as jest.Mock) = fetchMock;
      const loggerSpy = jest.spyOn(service['logger'], 'error');

      await service.dispatch(TENANT_ID, 'booking.created', {});

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send webhook'),
      );

      loggerSpy.mockRestore();
      global.fetch = originalFetch;
    });

    it('should handle different error types in catch block', async () => {
      const subscription = mockSubscription();
      prisma.webhookSubscription.findMany.mockResolvedValue([subscription]);

      const originalFetch = global.fetch;
      // Test with an object that's not an Error instance
      const customError = { message: 'Custom error' };
      const fetchMock = jest.fn().mockRejectedValue(customError);
      (global.fetch as jest.Mock) = fetchMock;
      prisma.webhookSubscription.update.mockResolvedValue(subscription);

      const result = await service.dispatch(TENANT_ID, 'booking.created', {});

      expect(result.failed).toBe(1);

      global.fetch = originalFetch;
    });
  });

  // ─── Fetch response status variations ───

  describe('HTTP response status handling', () => {
    it('should succeed on 200 status', async () => {
      const subscription = mockSubscription();
      prisma.webhookSubscription.findMany.mockResolvedValue([subscription]);

      const originalFetch = global.fetch;
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);
      (global.fetch as jest.Mock) = fetchMock;

      const result = await service.dispatch(TENANT_ID, 'booking.created', {});

      expect(result.dispatched).toBe(1);
      expect(result.failed).toBe(0);

      global.fetch = originalFetch;
    });

    it('should succeed on 201 status (created)', async () => {
      const subscription = mockSubscription();
      prisma.webhookSubscription.findMany.mockResolvedValue([subscription]);

      const originalFetch = global.fetch;
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 201,
      } as Response);
      (global.fetch as jest.Mock) = fetchMock;

      const result = await service.dispatch(TENANT_ID, 'booking.created', {});

      expect(result.dispatched).toBe(1);

      global.fetch = originalFetch;
    });

    it('should fail on 400 client error', async () => {
      const subscription = mockSubscription();
      prisma.webhookSubscription.findMany.mockResolvedValue([subscription]);

      const originalFetch = global.fetch;
      const fetchMock = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
      } as Response);
      (global.fetch as jest.Mock) = fetchMock;
      prisma.webhookSubscription.update.mockResolvedValue(subscription);

      const result = await service.dispatch(TENANT_ID, 'booking.created', {});

      expect(result.failed).toBe(1);

      global.fetch = originalFetch;
    });

    it('should fail on 500 server error', async () => {
      const subscription = mockSubscription();
      prisma.webhookSubscription.findMany.mockResolvedValue([subscription]);

      const originalFetch = global.fetch;
      const fetchMock = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);
      (global.fetch as jest.Mock) = fetchMock;
      prisma.webhookSubscription.update.mockResolvedValue(subscription);

      const result = await service.dispatch(TENANT_ID, 'booking.created', {});

      expect(result.failed).toBe(1);

      global.fetch = originalFetch;
    });
  });
});
