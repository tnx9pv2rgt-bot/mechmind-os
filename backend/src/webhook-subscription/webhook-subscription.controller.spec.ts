import { Test, TestingModule } from '@nestjs/testing';
import { WebhookSubscriptionController } from './webhook-subscription.controller';
import { WebhookSubscriptionService } from './webhook-subscription.service';

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

describe('WebhookSubscriptionController', () => {
  let controller: WebhookSubscriptionController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    sendTest: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      sendTest: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookSubscriptionController],
      providers: [{ provide: WebhookSubscriptionService, useValue: service }],
    }).compile();

    controller = module.get(WebhookSubscriptionController);
  });

  describe('create', () => {
    it('should call service.create', async () => {
      const dto = {
        url: 'https://client.example.com/webhooks',
        events: ['booking.created' as const],
        secret: 'supersecretkey1234567890',
      };
      const expected = mockSubscription(dto);
      service.create.mockResolvedValue(expected);

      const result = await controller.create(TENANT_ID, dto);

      expect(service.create).toHaveBeenCalledWith(TENANT_ID, dto);
      expect(result).toEqual(expected);
    });
  });

  describe('findAll', () => {
    it('should call service.findAll with query', async () => {
      const query = { page: 1, limit: 20 };
      const subscriptions = [mockSubscription()];
      const expected = { data: subscriptions, total: 1, page: 1, limit: 20 };
      service.findAll.mockResolvedValue(expected);

      const result = await controller.findAll(TENANT_ID, query);

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, query);
      expect(result).toEqual(expected);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne', async () => {
      const expected = mockSubscription();
      service.findOne.mockResolvedValue(expected);

      const result = await controller.findOne(TENANT_ID, 'webhook-uuid-001');

      expect(service.findOne).toHaveBeenCalledWith(TENANT_ID, 'webhook-uuid-001');
      expect(result).toEqual(expected);
    });
  });

  describe('update', () => {
    it('should call service.update', async () => {
      const dto = { isActive: false };
      const expected = mockSubscription({ isActive: false });
      service.update.mockResolvedValue(expected);

      const result = await controller.update(TENANT_ID, 'webhook-uuid-001', dto);

      expect(service.update).toHaveBeenCalledWith(TENANT_ID, 'webhook-uuid-001', dto);
      expect(result).toEqual(expected);
    });
  });

  describe('remove', () => {
    it('should call service.remove', async () => {
      service.remove.mockResolvedValue(mockSubscription({ isActive: false }));

      await controller.remove(TENANT_ID, 'webhook-uuid-001');

      expect(service.remove).toHaveBeenCalledWith(TENANT_ID, 'webhook-uuid-001');
    });
  });

  describe('test', () => {
    it('should call service.sendTest and return success', async () => {
      const dto = { id: 'webhook-uuid-001', event: 'booking.created' as const };
      service.sendTest.mockResolvedValue(true);

      const result = await controller.test(TENANT_ID, 'webhook-uuid-001', dto);

      expect(service.sendTest).toHaveBeenCalledWith(
        TENANT_ID,
        'webhook-uuid-001',
        'booking.created',
      );
      expect(result).toEqual({ success: true });
    });

    it('should return success false on failure', async () => {
      const dto = { id: 'webhook-uuid-001', event: 'booking.created' as const };
      service.sendTest.mockResolvedValue(false);

      const result = await controller.test(TENANT_ID, 'webhook-uuid-001', dto);

      expect(result).toEqual({ success: false });
    });
  });
});
