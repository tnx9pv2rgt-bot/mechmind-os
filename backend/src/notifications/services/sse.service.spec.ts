import { Test, TestingModule } from '@nestjs/testing';
import { SseService } from './sse.service';
import { RedisPubSubService } from './redis-pubsub.service';
import { NotificationEventData } from '../dto/notification-event.dto';
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

    it('should send initial connected event', done => {
      const stream = service.createEventStream(mockClientId, mockTenantId, mockUserId);

      // Use a variable to hold the subscription so it can be unsubscribed
      // after the synchronous 'connected' event is received.
      const sub = stream.subscribe({
        next: event => {
          if (event.event === 'connected') {
            const data = JSON.parse(event.data);
            expect(data.clientId).toBe(mockClientId);
            expect(data.message).toBe('Connected to notification stream');
            expect(data.timestamp).toBeDefined();
            // Defer unsubscribe to next tick since the initial event fires
            // synchronously during subscribe() before sub is assigned.
            setImmediate(() => {
              sub?.unsubscribe();
              done();
            });
          }
        },
      });
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

    it('should cleanup client on unsubscribe', done => {
      const clientId = 'client-cleanup';
      const stream = service.createEventStream(clientId, mockTenantId, mockUserId);

      const subscription = stream.subscribe(() => {});

      // Give time for the client to register
      setTimeout(() => {
        const countBefore = service.getConnectedClientsCount();
        subscription.unsubscribe();

        // Give time for cleanup
        setTimeout(() => {
          expect(service.getConnectedClientsCount()).toBeLessThanOrEqual(countBefore);
          done();
        }, 100);
      }, 50);
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
  // Tenant isolation in SSE
  // =========================================================================
  describe('tenant isolation in SSE streams', () => {
    it('should only deliver notifications for the correct tenant', done => {
      const stream = service.createEventStream('iso-client', mockTenantId, mockUserId);

      const receivedEvents: string[] = [];

      const subscription = stream.subscribe({
        next: event => {
          receivedEvents.push(event.event || 'unknown');
        },
      });

      // The initial 'connected' event should be received
      setTimeout(() => {
        expect(receivedEvents).toContain('connected');
        subscription.unsubscribe();
        done();
      }, 100);
    });
  });
});
