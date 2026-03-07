import { Test, TestingModule } from '@nestjs/testing';
import { BookingEventListener } from '../listeners/booking-event.listener';
import { LoggerService } from '@common/services/logger.service';
import { QueueService } from '@common/services/queue.service';
import { BookingCreatedEvent } from '../services/booking.service';

describe('BookingEventListener', () => {
  let listener: BookingEventListener;
  let logger: jest.Mocked<LoggerService>;
  let queueService: jest.Mocked<QueueService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingEventListener,
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
        {
          provide: QueueService,
          useValue: {
            addNotificationJob: jest.fn(),
          },
        },
      ],
    }).compile();

    listener = module.get<BookingEventListener>(BookingEventListener);
    logger = module.get(LoggerService) as jest.Mocked<LoggerService>;
    queueService = module.get(QueueService) as jest.Mocked<QueueService>;

    jest.clearAllMocks();
  });

  describe('handleBookingCreated', () => {
    it('should handle booking created event and queue notification jobs', async () => {
      const event = new BookingCreatedEvent(
        'booking-123',
        'tenant-456',
        'customer-789',
        new Date('2024-01-15T09:00:00Z'),
        'WEB',
      );

      await listener.handleBookingCreated(event);

      // Should log the event
      expect(logger.log).toHaveBeenCalledWith(
        'Booking created: booking-123 for tenant tenant-456',
        'BookingEventListener',
      );

      // Should queue booking confirmation notification
      expect(queueService.addNotificationJob).toHaveBeenCalledTimes(2);
      expect(queueService.addNotificationJob).toHaveBeenCalledWith(
        'send-booking-confirmation',
        {
          type: 'booking-confirmation',
          payload: {
            bookingId: 'booking-123',
            customerId: 'customer-789',
            scheduledDate: event.scheduledDate,
          },
          tenantId: 'tenant-456',
        },
      );

      // Should queue calendar sync job
      expect(queueService.addNotificationJob).toHaveBeenCalledWith(
        'sync-calendar',
        {
          type: 'calendar-sync',
          payload: {
            bookingId: 'booking-123',
            action: 'create',
          },
          tenantId: 'tenant-456',
        },
      );
    });

    it('should handle event with VAPI source', async () => {
      const event = new BookingCreatedEvent(
        'booking-456',
        'tenant-789',
        'customer-101',
        new Date('2024-01-20T14:00:00Z'),
        'VAPI',
      );

      await listener.handleBookingCreated(event);

      expect(logger.log).toHaveBeenCalledWith(
        'Booking created: booking-456 for tenant tenant-789',
        'BookingEventListener',
      );
      expect(queueService.addNotificationJob).toHaveBeenCalledTimes(2);
    });
  });

  describe('handleBookingUpdated', () => {
    it('should handle booking updated event', async () => {
      const event = {
        bookingId: 'booking-123',
        tenantId: 'tenant-456',
        changes: {
          status: 'CONFIRMED',
          scheduledDate: '2024-01-16T10:00:00Z',
        },
      };

      await listener.handleBookingUpdated(event);

      expect(logger.log).toHaveBeenCalledWith(
        'Booking updated: booking-123 for tenant tenant-456',
        'BookingEventListener',
      );

      expect(queueService.addNotificationJob).toHaveBeenCalledWith(
        'send-booking-update',
        {
          type: 'booking-update',
          payload: {
            bookingId: 'booking-123',
            changes: event.changes,
          },
          tenantId: 'tenant-456',
        },
      );
    });

    it('should handle booking updated with empty changes', async () => {
      const event = {
        bookingId: 'booking-789',
        tenantId: 'tenant-012',
        changes: {},
      };

      await listener.handleBookingUpdated(event);

      expect(queueService.addNotificationJob).toHaveBeenCalledWith(
        'send-booking-update',
        expect.objectContaining({
          payload: {
            bookingId: 'booking-789',
            changes: {},
          },
        }),
      );
    });
  });

  describe('handleBookingCancelled', () => {
    it('should handle booking cancelled event with reason', async () => {
      const event = {
        bookingId: 'booking-123',
        tenantId: 'tenant-456',
        reason: 'Customer request',
      };

      await listener.handleBookingCancelled(event);

      expect(logger.log).toHaveBeenCalledWith(
        'Booking cancelled: booking-123 for tenant tenant-456',
        'BookingEventListener',
      );

      // Should queue cancellation notification
      expect(queueService.addNotificationJob).toHaveBeenCalledWith(
        'send-cancellation-notice',
        {
          type: 'booking-cancellation',
          payload: {
            bookingId: 'booking-123',
            reason: 'Customer request',
          },
          tenantId: 'tenant-456',
        },
      );

      // Should queue calendar sync to remove event
      expect(queueService.addNotificationJob).toHaveBeenCalledWith(
        'sync-calendar',
        {
          type: 'calendar-sync',
          payload: {
            bookingId: 'booking-123',
            action: 'delete',
          },
          tenantId: 'tenant-456',
        },
      );
    });

    it('should handle booking cancelled event without reason', async () => {
      const event = {
        bookingId: 'booking-789',
        tenantId: 'tenant-012',
      };

      await listener.handleBookingCancelled(event);

      expect(queueService.addNotificationJob).toHaveBeenCalledWith(
        'send-cancellation-notice',
        expect.objectContaining({
          payload: {
            bookingId: 'booking-789',
            reason: undefined,
          },
        }),
      );
    });
  });
});
