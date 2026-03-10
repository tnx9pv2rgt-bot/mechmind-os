import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsV2Service, NotificationPayloadV2 } from './notifications-v2.service';
import { RedisPubSubService } from './redis-pubsub.service';
import { SseService } from './sse.service';
import { NotificationEventData } from '../dto/notification-event.dto';

describe('NotificationsV2Service', () => {
  let service: NotificationsV2Service;
  let redisPubSub: RedisPubSubService;
  let sseService: SseService;

  const mockTenantId = 'tenant-uuid-1';
  const mockUserId = 'user-uuid-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsV2Service,
        {
          provide: RedisPubSubService,
          useValue: {
            publishToTenant: jest.fn().mockResolvedValue(1),
            getConnectionStatus: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: SseService,
          useValue: {
            broadcastToTenant: jest.fn().mockResolvedValue(undefined),
            getConnectedClientsCount: jest.fn().mockReturnValue(5),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationsV2Service>(NotificationsV2Service);
    redisPubSub = module.get<RedisPubSubService>(RedisPubSubService);
    sseService = module.get<SseService>(SseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =========================================================================
  // sendNotification()
  // =========================================================================
  describe('sendNotification', () => {
    const mockPayload: NotificationPayloadV2 = {
      tenantId: mockTenantId,
      userId: mockUserId,
      type: 'booking_created',
      title: 'Nuova Prenotazione',
      message: 'Nuova prenotazione da Mario Rossi',
      data: { bookingId: 'booking-123' },
    };

    it('should publish to Redis for multi-instance scaling', async () => {
      await service.sendNotification(mockPayload);

      expect(redisPubSub.publishToTenant).toHaveBeenCalledWith(
        mockTenantId,
        expect.objectContaining({
          type: 'booking_created',
          tenantId: mockTenantId,
          userId: mockUserId,
          title: 'Nuova Prenotazione',
          message: 'Nuova prenotazione da Mario Rossi',
          data: { bookingId: 'booking-123' },
          timestamp: expect.any(String),
        }),
      );
    });

    it('should broadcast via SSE for same-instance clients', async () => {
      await service.sendNotification(mockPayload);

      expect(sseService.broadcastToTenant).toHaveBeenCalledWith(
        mockTenantId,
        expect.objectContaining({
          type: 'booking_created',
          tenantId: mockTenantId,
          timestamp: expect.any(String),
        }),
      );
    });

    it('should include timestamp in notification data', async () => {
      await service.sendNotification(mockPayload);

      const publishedData = (redisPubSub.publishToTenant as jest.Mock).mock
        .calls[0][1] as NotificationEventData;
      expect(publishedData.timestamp).toBeDefined();
      expect(() => new Date(publishedData.timestamp)).not.toThrow();
    });

    it('should send notification without userId', async () => {
      const payloadWithoutUser: NotificationPayloadV2 = {
        tenantId: mockTenantId,
        type: 'booking_created',
        title: 'Test',
        message: 'Test message',
      };

      await service.sendNotification(payloadWithoutUser);

      expect(redisPubSub.publishToTenant).toHaveBeenCalledWith(
        mockTenantId,
        expect.objectContaining({
          userId: undefined,
        }),
      );
    });

    it('should always include tenant ID for isolation', async () => {
      await service.sendNotification(mockPayload);

      const publishedData = (redisPubSub.publishToTenant as jest.Mock).mock
        .calls[0][1] as NotificationEventData;
      expect(publishedData.tenantId).toBe(mockTenantId);

      const sseData = (sseService.broadcastToTenant as jest.Mock).mock
        .calls[0][1] as NotificationEventData;
      expect(sseData.tenantId).toBe(mockTenantId);
    });
  });

  // =========================================================================
  // sendToUser()
  // =========================================================================
  describe('sendToUser', () => {
    it('should send notification to specific user', async () => {
      await service.sendToUser(
        mockTenantId,
        mockUserId,
        'booking_confirmed',
        'Confirmed',
        'Your booking is confirmed',
        { bookingId: 'bk-123' },
      );

      expect(redisPubSub.publishToTenant).toHaveBeenCalledWith(
        mockTenantId,
        expect.objectContaining({
          type: 'booking_confirmed',
          userId: mockUserId,
          title: 'Confirmed',
          message: 'Your booking is confirmed',
          data: { bookingId: 'bk-123' },
        }),
      );
    });
  });

  // =========================================================================
  // broadcastToTenant()
  // =========================================================================
  describe('broadcastToTenant', () => {
    it('should broadcast notification to all tenant users', async () => {
      await service.broadcastToTenant(
        mockTenantId,
        'booking_created',
        'New Booking',
        'A new booking was created',
        { bookingId: 'bk-456' },
      );

      expect(redisPubSub.publishToTenant).toHaveBeenCalledWith(
        mockTenantId,
        expect.objectContaining({
          type: 'booking_created',
          title: 'New Booking',
          tenantId: mockTenantId,
        }),
      );
    });
  });

  // =========================================================================
  // Convenience methods
  // =========================================================================
  describe('notifyBookingCreated', () => {
    it('should send booking created notification', async () => {
      await service.notifyBookingCreated(mockTenantId, 'bk-789', 'Mario Rossi', mockUserId);

      expect(redisPubSub.publishToTenant).toHaveBeenCalledWith(
        mockTenantId,
        expect.objectContaining({
          type: 'booking_created',
          title: 'Nuova Prenotazione',
          message: expect.stringContaining('Mario Rossi'),
          data: { bookingId: 'bk-789', customerName: 'Mario Rossi' },
        }),
      );
    });

    it('should work without userId', async () => {
      await service.notifyBookingCreated(mockTenantId, 'bk-790', 'Luigi Bianchi');

      expect(redisPubSub.publishToTenant).toHaveBeenCalledWith(
        mockTenantId,
        expect.objectContaining({
          userId: undefined,
        }),
      );
    });
  });

  describe('notifyBookingConfirmed', () => {
    it('should send booking confirmed notification', async () => {
      await service.notifyBookingConfirmed(mockTenantId, 'bk-100', 'Mario Rossi', mockUserId);

      expect(redisPubSub.publishToTenant).toHaveBeenCalledWith(
        mockTenantId,
        expect.objectContaining({
          type: 'booking_confirmed',
          title: 'Prenotazione Confermata',
          data: expect.objectContaining({
            bookingId: 'bk-100',
            status: 'confirmed',
          }),
        }),
      );
    });
  });

  describe('notifyBookingCancelled', () => {
    it('should send booking cancelled notification with reason', async () => {
      await service.notifyBookingCancelled(
        mockTenantId,
        'bk-200',
        'Mario Rossi',
        'Customer request',
        mockUserId,
      );

      expect(redisPubSub.publishToTenant).toHaveBeenCalledWith(
        mockTenantId,
        expect.objectContaining({
          type: 'booking_cancelled',
          message: expect.stringContaining('Customer request'),
          data: expect.objectContaining({
            bookingId: 'bk-200',
            reason: 'Customer request',
          }),
        }),
      );
    });

    it('should send booking cancelled notification without reason', async () => {
      await service.notifyBookingCancelled(mockTenantId, 'bk-201', 'Mario Rossi');

      expect(redisPubSub.publishToTenant).toHaveBeenCalledWith(
        mockTenantId,
        expect.objectContaining({
          type: 'booking_cancelled',
        }),
      );
    });
  });

  describe('notifyInvoicePaid', () => {
    it('should send invoice paid notification with amount', async () => {
      await service.notifyInvoicePaid(mockTenantId, 'inv-300', 250.5, 'Mario Rossi', mockUserId);

      expect(redisPubSub.publishToTenant).toHaveBeenCalledWith(
        mockTenantId,
        expect.objectContaining({
          type: 'invoice_paid',
          title: 'Pagamento Ricevuto',
          message: expect.stringContaining('250.50'),
          data: expect.objectContaining({
            invoiceId: 'inv-300',
            amount: 250.5,
          }),
        }),
      );
    });
  });

  describe('notifyGdprDeletionScheduled', () => {
    it('should send GDPR deletion scheduled notification', async () => {
      const scheduledDate = new Date('2024-06-15T00:00:00Z');

      await service.notifyGdprDeletionScheduled(
        mockTenantId,
        mockUserId,
        'Mario Rossi',
        scheduledDate,
        mockUserId,
      );

      expect(redisPubSub.publishToTenant).toHaveBeenCalledWith(
        mockTenantId,
        expect.objectContaining({
          type: 'gdpr_deletion_scheduled',
          title: 'Cancellazione GDPR Programmata',
          data: expect.objectContaining({
            customerId: mockUserId,
            scheduledDate: scheduledDate.toISOString(),
          }),
        }),
      );
    });
  });

  // =========================================================================
  // getStats()
  // =========================================================================
  describe('getStats', () => {
    it('should return connected clients count and Redis status', () => {
      const stats = service.getStats();

      expect(stats).toEqual({
        connectedClients: 5,
        redisConnected: true,
      });
      expect(sseService.getConnectedClientsCount).toHaveBeenCalled();
      expect(redisPubSub.getConnectionStatus).toHaveBeenCalled();
    });

    it('should reflect disconnected Redis status', () => {
      (redisPubSub.getConnectionStatus as jest.Mock).mockReturnValue(false);

      const stats = service.getStats();

      expect(stats.redisConnected).toBe(false);
    });
  });

  // =========================================================================
  // Tenant isolation
  // =========================================================================
  describe('tenant isolation', () => {
    it('should always route notifications to the correct tenant channel', async () => {
      const tenant1 = 'tenant-AAA';
      const tenant2 = 'tenant-BBB';

      await service.notifyBookingCreated(tenant1, 'bk-1', 'Customer A');
      await service.notifyBookingCreated(tenant2, 'bk-2', 'Customer B');

      expect(redisPubSub.publishToTenant).toHaveBeenCalledTimes(2);
      expect((redisPubSub.publishToTenant as jest.Mock).mock.calls[0][0]).toBe(tenant1);
      expect((redisPubSub.publishToTenant as jest.Mock).mock.calls[1][0]).toBe(tenant2);
    });
  });
});
