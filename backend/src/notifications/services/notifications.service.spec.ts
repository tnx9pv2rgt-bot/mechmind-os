import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotificationsV2Service } from './notifications-v2.service';
import { RedisPubSubService } from './redis-pubsub.service';
import { SseService } from './sse.service';

describe('NotificationsV2Service', () => {
  let service: NotificationsV2Service;
  let redisPubSubService: jest.Mocked<RedisPubSubService>;
  let sseService: jest.Mocked<SseService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsV2Service,
        {
          provide: RedisPubSubService,
          useValue: {
            publishToTenant: jest.fn().mockResolvedValue(1),
            getConnectionStatus: jest.fn().mockReturnValue(true),
            subscribeToTenant: jest.fn().mockResolvedValue({
              next: jest.fn(),
              subscribe: jest.fn(),
            } as any),
            unsubscribeFromTenant: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: SseService,
          useValue: {
            broadcastToTenant: jest.fn().mockResolvedValue(undefined),
            sendToUser: jest.fn().mockResolvedValue(undefined),
            getConnectedClientsCount: jest.fn().mockReturnValue(5),
            getTenantClientsCount: jest.fn().mockReturnValue(2),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue: any) => defaultValue),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationsV2Service>(NotificationsV2Service);
    redisPubSubService = module.get(RedisPubSubService);
    sseService = module.get(SseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendNotification', () => {
    it('should publish notification to Redis and broadcast via SSE', async () => {
      const payload = {
        tenantId: 'tenant-123',
        userId: 'user-456',
        type: 'booking_created' as const,
        title: 'Test Notification',
        message: 'Test message',
        data: { bookingId: 'booking-789' },
      };

      await service.sendNotification(payload);

      expect(redisPubSubService.publishToTenant).toHaveBeenCalledWith(
        'tenant-123',
        expect.objectContaining({
          type: 'booking_created',
          tenantId: 'tenant-123',
          userId: 'user-456',
          title: 'Test Notification',
          message: 'Test message',
          data: { bookingId: 'booking-789' },
          timestamp: expect.any(String),
        }),
      );

      expect(sseService.broadcastToTenant).toHaveBeenCalled();
    });
  });

  describe('notifyBookingCreated', () => {
    it('should send booking created notification', async () => {
      await service.notifyBookingCreated(
        'tenant-123',
        'booking-789',
        'Mario Rossi',
        'user-456',
      );

      expect(redisPubSubService.publishToTenant).toHaveBeenCalledWith(
        'tenant-123',
        expect.objectContaining({
          type: 'booking_created',
          title: 'Nuova Prenotazione',
          message: 'Nuova prenotazione da Mario Rossi',
          data: { bookingId: 'booking-789', customerName: 'Mario Rossi' },
        }),
      );
    });
  });

  describe('notifyBookingConfirmed', () => {
    it('should send booking confirmed notification', async () => {
      await service.notifyBookingConfirmed(
        'tenant-123',
        'booking-789',
        'Mario Rossi',
        'user-456',
      );

      expect(redisPubSubService.publishToTenant).toHaveBeenCalledWith(
        'tenant-123',
        expect.objectContaining({
          type: 'booking_confirmed',
          title: 'Prenotazione Confermata',
          message: 'La prenotazione di Mario Rossi è stata confermata',
        }),
      );
    });
  });

  describe('notifyBookingCancelled', () => {
    it('should send booking cancelled notification with reason', async () => {
      await service.notifyBookingCancelled(
        'tenant-123',
        'booking-789',
        'Mario Rossi',
        'Cliente ha annullato',
        'user-456',
      );

      expect(redisPubSubService.publishToTenant).toHaveBeenCalledWith(
        'tenant-123',
        expect.objectContaining({
          type: 'booking_cancelled',
          title: 'Prenotazione Cancellata',
          message: 'La prenotazione di Mario Rossi è stata cancellata: Cliente ha annullato',
        }),
      );
    });
  });

  describe('notifyInvoicePaid', () => {
    it('should send invoice paid notification', async () => {
      await service.notifyInvoicePaid(
        'tenant-123',
        'invoice-456',
        150.5,
        'Mario Rossi',
        'user-456',
      );

      expect(redisPubSubService.publishToTenant).toHaveBeenCalledWith(
        'tenant-123',
        expect.objectContaining({
          type: 'invoice_paid',
          title: 'Pagamento Ricevuto',
          message: 'Pagamento di €150.50 ricevuto da Mario Rossi',
          data: { invoiceId: 'invoice-456', amount: 150.5, customerName: 'Mario Rossi' },
        }),
      );
    });
  });

  describe('notifyGdprDeletionScheduled', () => {
    it('should send GDPR deletion scheduled notification', async () => {
      const scheduledDate = new Date('2024-12-31');
      
      await service.notifyGdprDeletionScheduled(
        'tenant-123',
        'customer-789',
        'Mario Rossi',
        scheduledDate,
        'user-456',
      );

      expect(redisPubSubService.publishToTenant).toHaveBeenCalledWith(
        'tenant-123',
        expect.objectContaining({
          type: 'gdpr_deletion_scheduled',
          title: 'Cancellazione GDPR Programmata',
          data: expect.objectContaining({
            customerId: 'customer-789',
            customerName: 'Mario Rossi',
            scheduledDate: scheduledDate.toISOString(),
          }),
        }),
      );
    });
  });

  describe('getStats', () => {
    it('should return notification statistics', () => {
      const stats = service.getStats();

      expect(stats).toEqual({
        connectedClients: 5,
        redisConnected: true,
      });
    });
  });
});
