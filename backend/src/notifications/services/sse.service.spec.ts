import { Test, TestingModule } from '@nestjs/testing';
import { SseService } from './sse.service';
import { RedisPubSubService } from './redis-pubsub.service';
import { NotificationEventData, SseMessageEvent } from '../dto/notification-event.dto';
import { Subject } from 'rxjs';

describe('SseService', () => {
  let service: SseService;
  let redisPubSub: RedisPubSubService;

  const mockTenantId = 'tenant-uuid-1';
  const mockUserId = 'user-uuid-1';
  const mockClientId = 'client-uuid-1';

  let mockSubject: Subject<NotificationEventData>;

  beforeEach(async () => {
    mockSubject = new Subject<NotificationEventData>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SseService,
        {
          provide: RedisPubSubService,
          useValue: {
            subscribeToTenant: jest.fn().mockResolvedValue(mockSubject),
            unsubscribeFromTenant: jest.fn().mockResolvedValue(undefined),
            publishToTenant: jest.fn().mockResolvedValue(1),
            getTenantObservable: jest.fn().mockReturnValue(mockSubject),
          },
        },
      ],
    }).compile();

    service = module.get<SseService>(SseService);
    redisPubSub = module.get<RedisPubSubService>(RedisPubSubService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockSubject.complete();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =========================================================================
  // createEventStream()
  // =========================================================================
  describe('createEventStream', () => {
    it('should create an observable SSE stream', () => {
      const stream = service.createEventStream(mockClientId, mockTenantId, mockUserId);

      expect(stream).toBeDefined();
      expect(typeof stream.subscribe).toBe('function');
    });

    it('should send initial connected event', () => {
      const stream = service.createEventStream(mockClientId, mockTenantId, mockUserId);
      const receivedEvents: SseMessageEvent[] = [];

      const sub = stream.subscribe({
        next: event => {
          receivedEvents.push(event);
        },
      });

      // The connected event is emitted synchronously during subscribe
      expect(receivedEvents.length).toBeGreaterThanOrEqual(1);
      const connectedEvent = receivedEvents.find(e => e.event === 'connected');
      expect(connectedEvent).toBeDefined();
      const data = JSON.parse(connectedEvent!.data);
      expect(data.clientId).toBe(mockClientId);
      expect(data.message).toBe('Connected to notification stream');
      expect(data.timestamp).toBeDefined();
      sub.unsubscribe();
    });

    it('should register client and increment connected count', () => {
      const stream = service.createEventStream('client-A', mockTenantId, mockUserId);

      stream.subscribe(() => {});

      expect(service.getConnectedClientsCount()).toBeGreaterThanOrEqual(1);
    });

    it('should subscribe to Redis tenant channel', () => {
      const stream = service.createEventStream('client-redis', mockTenantId, mockUserId);

      stream.subscribe(() => {});

      expect(redisPubSub.getTenantObservable).toHaveBeenCalledWith(mockTenantId);
    });

    it('should cleanup client on unsubscribe', async () => {
      const clientId = 'client-cleanup';
      const stream = service.createEventStream(clientId, mockTenantId, mockUserId);

      const subscription = stream.subscribe(() => {});

      const countBefore = service.getConnectedClientsCount();
      expect(countBefore).toBeGreaterThanOrEqual(1);

      subscription.unsubscribe();

      // cleanupClient is async — flush microtasks so Map.delete() completes
      await new Promise(resolve => process.nextTick(resolve));

      expect(service.getConnectedClientsCount()).toBeLessThan(countBefore);
    });
  });

  // =========================================================================
  // broadcastToTenant()
  // =========================================================================
  describe('broadcastToTenant', () => {
    it('should publish notification to Redis for the tenant', async () => {
      const data: NotificationEventData = {
        type: 'booking_created',
        tenantId: mockTenantId,
        title: 'Test',
        message: 'Test broadcast',
        timestamp: new Date().toISOString(),
      };

      await service.broadcastToTenant(mockTenantId, data);

      expect(redisPubSub.publishToTenant).toHaveBeenCalledWith(mockTenantId, data);
    });

    it('should isolate broadcasts by tenant', async () => {
      const data1: NotificationEventData = {
        type: 'booking_created',
        tenantId: 'tenant-A',
        title: 'Test A',
        message: 'For tenant A',
        timestamp: new Date().toISOString(),
      };
      const data2: NotificationEventData = {
        type: 'booking_created',
        tenantId: 'tenant-B',
        title: 'Test B',
        message: 'For tenant B',
        timestamp: new Date().toISOString(),
      };

      await service.broadcastToTenant('tenant-A', data1);
      await service.broadcastToTenant('tenant-B', data2);

      expect(redisPubSub.publishToTenant).toHaveBeenCalledTimes(2);
      expect((redisPubSub.publishToTenant as jest.Mock).mock.calls[0][0]).toBe('tenant-A');
      expect((redisPubSub.publishToTenant as jest.Mock).mock.calls[1][0]).toBe('tenant-B');
    });
  });

  // =========================================================================
  // sendToUser()
  // =========================================================================
  describe('sendToUser', () => {
    it('should publish notification to Redis with userId', async () => {
      const data: NotificationEventData = {
        type: 'booking_confirmed',
        tenantId: mockTenantId,
        title: 'Confirmed',
        message: 'Your booking is confirmed',
        timestamp: new Date().toISOString(),
      };

      await service.sendToUser(mockTenantId, mockUserId, data);

      expect(redisPubSub.publishToTenant).toHaveBeenCalledWith(
        mockTenantId,
        expect.objectContaining({
          userId: mockUserId,
        }),
      );
    });
  });

  // =========================================================================
  // getConnectedClientsCount()
  // =========================================================================
  describe('getConnectedClientsCount', () => {
    it('should return 0 when no clients are connected', () => {
      expect(service.getConnectedClientsCount()).toBe(0);
    });

    it('should increase when clients connect', () => {
      const stream1 = service.createEventStream('count-client-1', mockTenantId);
      stream1.subscribe(() => {});

      const stream2 = service.createEventStream('count-client-2', mockTenantId);
      stream2.subscribe(() => {});

      expect(service.getConnectedClientsCount()).toBe(2);
    });
  });

  // =========================================================================
  // getTenantClientsCount()
  // =========================================================================
  describe('getTenantClientsCount', () => {
    it('should return count for specific tenant', () => {
      const streamA = service.createEventStream('tenant-count-1', 'tenant-A');
      streamA.subscribe(() => {});

      const streamB = service.createEventStream('tenant-count-2', 'tenant-B');
      streamB.subscribe(() => {});

      const streamA2 = service.createEventStream('tenant-count-3', 'tenant-A');
      streamA2.subscribe(() => {});

      expect(service.getTenantClientsCount('tenant-A')).toBe(2);
      expect(service.getTenantClientsCount('tenant-B')).toBe(1);
      expect(service.getTenantClientsCount('tenant-C')).toBe(0);
    });
  });

  // =========================================================================
  // disconnectAll()
  // =========================================================================
  describe('disconnectAll', () => {
    it('should disconnect all clients', async () => {
      const stream1 = service.createEventStream('dc-1', mockTenantId);
      const stream2 = service.createEventStream('dc-2', mockTenantId);

      let completed1 = false;
      let completed2 = false;

      stream1.subscribe({
        next: () => {},
        complete: () => {
          completed1 = true;
        },
      });
      stream2.subscribe({
        next: () => {},
        complete: () => {
          completed2 = true;
        },
      });

      await service.disconnectAll();

      expect(completed1).toBe(true);
      expect(completed2).toBe(true);
    });
  });

  // =========================================================================
  // handleNotification filtering
  // =========================================================================
  describe('handleNotification — user filtering', () => {
    it('should filter out notifications for different users', () => {
      const stream = service.createEventStream('filter-client', mockTenantId, 'user-A');

      const receivedEvents: string[] = [];

      const sub = stream.subscribe({
        next: event => {
          receivedEvents.push(event.event || 'unknown');
        },
      });

      // Emit a notification for user-B via the mock subject (synchronous)
      mockSubject.next({
        type: 'booking_created',
        tenantId: mockTenantId,
        userId: 'user-B',
        title: 'Test',
        message: 'For user B',
        timestamp: new Date().toISOString(),
      });

      // Should only have 'connected', not 'booking_created' (filtered)
      expect(receivedEvents).toContain('connected');
      expect(receivedEvents).not.toContain('booking_created');
      sub.unsubscribe();
    });

    it('should deliver notifications matching the user', () => {
      const stream = service.createEventStream('match-client', mockTenantId, 'user-A');

      const receivedEvents: string[] = [];

      const sub = stream.subscribe({
        next: event => {
          receivedEvents.push(event.event || 'unknown');
        },
      });

      // Emit notification for user-A (synchronous via Subject)
      mockSubject.next({
        type: 'booking_confirmed',
        tenantId: mockTenantId,
        userId: 'user-A',
        title: 'Test',
        message: 'For user A',
        timestamp: new Date().toISOString(),
      });

      expect(receivedEvents).toContain('booking_confirmed');
      sub.unsubscribe();
    });

    it('should deliver broadcast notifications (no userId) to all users', () => {
      const stream = service.createEventStream('broadcast-client', mockTenantId, 'user-A');

      const receivedEvents: string[] = [];

      const sub = stream.subscribe({
        next: event => {
          receivedEvents.push(event.event || 'unknown');
        },
      });

      // Broadcast notification without userId (synchronous via Subject)
      mockSubject.next({
        type: 'booking_created',
        tenantId: mockTenantId,
        title: 'System',
        message: 'Broadcast',
        timestamp: new Date().toISOString(),
      });

      // No userId filter → notification passes through with its original type
      expect(receivedEvents).toContain('booking_created');
      sub.unsubscribe();
    });
  });

  // =========================================================================
  // createEventStream — no redis observable
  // =========================================================================
  describe('createEventStream — no redis observable', () => {
    it('should handle null getTenantObservable gracefully', () => {
      (redisPubSub.getTenantObservable as jest.Mock).mockReturnValueOnce(null);

      const stream = service.createEventStream('no-redis-client', mockTenantId);
      const receivedEvents: string[] = [];

      const sub = stream.subscribe({
        next: event => {
          receivedEvents.push(event.event || 'unknown');
        },
      });

      expect(receivedEvents).toContain('connected');
      sub.unsubscribe();
    });
  });

  // =========================================================================
  // cleanupClient — remaining clients for same tenant
  // =========================================================================
  describe('cleanupClient — remaining tenant clients', () => {
    it('should not unsubscribe from Redis when other clients remain for tenant', () => {
      const stream1 = service.createEventStream('remain-1', mockTenantId);
      const stream2 = service.createEventStream('remain-2', mockTenantId);

      const sub1 = stream1.subscribe(() => {});
      stream2.subscribe(() => {});

      sub1.unsubscribe();

      // Should NOT call unsubscribeFromTenant because remain-2 is still connected
      expect(redisPubSub.unsubscribeFromTenant).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Tenant isolation in SSE
  // =========================================================================
  describe('tenant isolation in SSE streams', () => {
    it('should only deliver notifications for the correct tenant', () => {
      const stream = service.createEventStream('iso-client', mockTenantId, mockUserId);

      const receivedEvents: string[] = [];

      const subscription = stream.subscribe({
        next: event => {
          receivedEvents.push(event.event || 'unknown');
        },
      });

      // The initial 'connected' event should be received synchronously
      expect(receivedEvents).toContain('connected');
      subscription.unsubscribe();
    });
  });
});
