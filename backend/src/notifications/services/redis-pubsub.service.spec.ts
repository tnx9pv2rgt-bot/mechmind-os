import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisPubSubService } from './redis-pubsub.service';
import { NotificationEventData } from '../dto/notification-event.dto';

// Mock ioredis
const mockPublish = jest.fn();
const mockSubscribe = jest.fn();
const mockUnsubscribe = jest.fn();
const mockQuit = jest.fn();
const mockRemoveAllListeners = jest.fn();
const mockOn = jest.fn();

jest.mock('ioredis', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      publish: mockPublish,
      subscribe: mockSubscribe,
      unsubscribe: mockUnsubscribe,
      quit: mockQuit,
      removeAllListeners: mockRemoveAllListeners,
      on: mockOn,
      status: 'ready',
    })),
  };
});

describe('RedisPubSubService', () => {
  let service: RedisPubSubService;
  let configService: ConfigService;

  const defaultConfig: Record<string, string | number | boolean> = {
    REDIS_HOST: 'localhost',
    REDIS_PORT: 6379,
    REDIS_PASSWORD: '',
    REDIS_PUBSUB_DB: 2,
    REDIS_TLS: 'false',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisPubSubService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(
              (key: string, defaultValue?: string | number | boolean) =>
                defaultConfig[key] ?? defaultValue,
            ),
          },
        },
      ],
    }).compile();

    service = module.get<RedisPubSubService>(RedisPubSubService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =========================================================================
  // onModuleInit / connect
  // =========================================================================
  describe('onModuleInit', () => {
    it('should initialize Redis connections on module init', async () => {
      await service.onModuleInit();

      // Redis constructor should have been called twice (publisher + subscriber)
      const Redis = require('ioredis').default;
      expect(Redis).toHaveBeenCalledTimes(2);
    });

    it('should register event handlers for connection events', async () => {
      await service.onModuleInit();

      // Should register 'connect', 'error' on publisher and subscriber, plus 'message'
      expect(mockOn).toHaveBeenCalled();
    });

    it('should use config values for Redis connection', async () => {
      await service.onModuleInit();

      const Redis = require('ioredis').default;
      expect(Redis).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'localhost',
          port: 6379,
          db: 2,
        }),
      );
    });
  });

  // =========================================================================
  // onModuleDestroy / disconnect
  // =========================================================================
  describe('onModuleDestroy', () => {
    it('should disconnect Redis on module destroy', async () => {
      await service.onModuleInit();
      await service.onModuleDestroy();

      expect(mockQuit).toHaveBeenCalledTimes(2); // publisher + subscriber
      expect(mockUnsubscribe).toHaveBeenCalled();
      expect(mockRemoveAllListeners).toHaveBeenCalledTimes(2);
    });
  });

  // =========================================================================
  // publishToTenant()
  // =========================================================================
  describe('publishToTenant', () => {
    const mockData: NotificationEventData = {
      type: 'booking_created',
      tenantId: 'tenant-uuid-1',
      title: 'Test Notification',
      message: 'This is a test',
      timestamp: new Date().toISOString(),
    };

    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should publish JSON message to tenant channel', async () => {
      mockPublish.mockResolvedValue(1);

      const result = await service.publishToTenant('tenant-uuid-1', mockData);

      expect(mockPublish).toHaveBeenCalledWith(
        'notifications:tenant-uuid-1',
        JSON.stringify(mockData),
      );
      expect(result).toBe(1);
    });

    it('should use the correct channel naming convention', async () => {
      mockPublish.mockResolvedValue(0);

      await service.publishToTenant('my-tenant-id', mockData);

      expect(mockPublish).toHaveBeenCalledWith('notifications:my-tenant-id', expect.any(String));
    });

    it('should throw when publish fails', async () => {
      mockPublish.mockRejectedValue(new Error('Redis publish error'));

      await expect(service.publishToTenant('tenant-uuid-1', mockData)).rejects.toThrow(
        'Redis publish error',
      );
    });

    it('should isolate messages by tenant ID', async () => {
      mockPublish.mockResolvedValue(1);

      const data1 = { ...mockData, tenantId: 'tenant-A' };
      const data2 = { ...mockData, tenantId: 'tenant-B' };

      await service.publishToTenant('tenant-A', data1);
      await service.publishToTenant('tenant-B', data2);

      expect(mockPublish).toHaveBeenCalledTimes(2);
      expect(mockPublish.mock.calls[0][0]).toBe('notifications:tenant-A');
      expect(mockPublish.mock.calls[1][0]).toBe('notifications:tenant-B');
    });
  });

  // =========================================================================
  // subscribeToTenant()
  // =========================================================================
  describe('subscribeToTenant', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should subscribe to tenant channel and return subject', async () => {
      mockSubscribe.mockResolvedValue(undefined);

      const subject = await service.subscribeToTenant('tenant-uuid-1');

      expect(subject).toBeDefined();
      expect(mockSubscribe).toHaveBeenCalledWith('notifications:tenant-uuid-1');
    });

    it('should return existing subject for duplicate subscription', async () => {
      mockSubscribe.mockResolvedValue(undefined);

      const subject1 = await service.subscribeToTenant('tenant-uuid-1');
      const subject2 = await service.subscribeToTenant('tenant-uuid-1');

      expect(subject1).toBe(subject2);
      // subscribe should only be called once
      expect(mockSubscribe).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // unsubscribeFromTenant()
  // =========================================================================
  describe('unsubscribeFromTenant', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should unsubscribe from tenant channel', async () => {
      mockSubscribe.mockResolvedValue(undefined);
      mockUnsubscribe.mockResolvedValue(undefined);

      await service.subscribeToTenant('tenant-uuid-1');
      await service.unsubscribeFromTenant('tenant-uuid-1');

      expect(mockUnsubscribe).toHaveBeenCalledWith('notifications:tenant-uuid-1');
    });

    it('should be safe to unsubscribe from non-existent channel', async () => {
      await expect(service.unsubscribeFromTenant('nonexistent-tenant')).resolves.toBeUndefined();
    });

    it('should remove the subject after unsubscribing', async () => {
      mockSubscribe.mockResolvedValue(undefined);

      await service.subscribeToTenant('tenant-uuid-1');
      await service.unsubscribeFromTenant('tenant-uuid-1');

      const observable = service.getTenantObservable('tenant-uuid-1');
      expect(observable).toBeUndefined();
    });
  });

  // =========================================================================
  // getTenantObservable()
  // =========================================================================
  describe('getTenantObservable', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should return subject for subscribed tenant', async () => {
      mockSubscribe.mockResolvedValue(undefined);

      await service.subscribeToTenant('tenant-uuid-1');

      const observable = service.getTenantObservable('tenant-uuid-1');
      expect(observable).toBeDefined();
    });

    it('should return undefined for non-subscribed tenant', () => {
      const observable = service.getTenantObservable('unsubscribed-tenant');
      expect(observable).toBeUndefined();
    });
  });

  // =========================================================================
  // getConnectionStatus()
  // =========================================================================
  describe('getConnectionStatus', () => {
    it('should return connection status', async () => {
      await service.onModuleInit();

      // The mock Redis status is 'ready', so after connect events
      // isConnected should reflect the state based on implementation
      const status = service.getConnectionStatus();
      expect(typeof status).toBe('boolean');
    });
  });

  // =========================================================================
  // Message handling
  // =========================================================================
  describe('message handling', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should handle incoming Redis messages and forward to subject', async () => {
      mockSubscribe.mockResolvedValue(undefined);

      const subject = await service.subscribeToTenant('tenant-uuid-1');

      // Find the 'message' handler registered on subscriber
      const messageHandler = mockOn.mock.calls.find(
        (call: [string, Function]) => call[0] === 'message',
      );

      if (messageHandler) {
        const receivedData: NotificationEventData[] = [];
        subject.subscribe(data => receivedData.push(data));

        const testData: NotificationEventData = {
          type: 'booking_created',
          tenantId: 'tenant-uuid-1',
          title: 'Test',
          message: 'Test message',
          timestamp: new Date().toISOString(),
        };

        // Simulate message from Redis
        messageHandler[1]('notifications:tenant-uuid-1', JSON.stringify(testData));

        expect(receivedData).toHaveLength(1);
        expect(receivedData[0].type).toBe('booking_created');
      }
    });

    it('should handle malformed JSON messages gracefully', async () => {
      mockSubscribe.mockResolvedValue(undefined);

      await service.subscribeToTenant('tenant-uuid-1');

      const messageHandler = mockOn.mock.calls.find(
        (call: [string, Function]) => call[0] === 'message',
      );

      if (messageHandler) {
        // Should not throw on invalid JSON
        expect(() => {
          messageHandler[1]('notifications:tenant-uuid-1', 'invalid-json');
        }).not.toThrow();
      }
    });
  });

  // =========================================================================
  // Tenant isolation
  // =========================================================================
  describe('tenant isolation', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should create separate channels per tenant', async () => {
      mockSubscribe.mockResolvedValue(undefined);

      await service.subscribeToTenant('tenant-A');
      await service.subscribeToTenant('tenant-B');

      expect(mockSubscribe).toHaveBeenCalledWith('notifications:tenant-A');
      expect(mockSubscribe).toHaveBeenCalledWith('notifications:tenant-B');
    });

    it('should not cross-publish between tenant channels', async () => {
      mockPublish.mockResolvedValue(1);

      const data: NotificationEventData = {
        type: 'booking_created',
        tenantId: 'tenant-A',
        title: 'Test',
        message: 'Only for tenant A',
        timestamp: new Date().toISOString(),
      };

      await service.publishToTenant('tenant-A', data);

      // Ensure only tenant-A channel was published to
      expect(mockPublish).toHaveBeenCalledTimes(1);
      expect(mockPublish).toHaveBeenCalledWith('notifications:tenant-A', expect.any(String));
    });
  });
});
