import { BookingEventListener } from './booking-event.listener';
import { BookingCreatedEvent } from '../services/booking.service';
import { LoggerService } from '@common/services/logger.service';
import { QueueService } from '@common/services/queue.service';

describe('BookingEventListener', () => {
  let listener: BookingEventListener;
  let logger: { log: jest.Mock; error: jest.Mock; warn: jest.Mock; debug: jest.Mock };
  let queueService: { addNotificationJob: jest.Mock };

  beforeEach(() => {
    logger = { log: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
    queueService = { addNotificationJob: jest.fn().mockResolvedValue(undefined) };
    listener = new BookingEventListener(
      logger as unknown as LoggerService,
      queueService as unknown as QueueService,
    );
  });

  describe('handleBookingCreated', () => {
    it('should log and queue confirmation + calendar sync', async () => {
      const event = new BookingCreatedEvent(
        'booking-1',
        'tenant-1',
        'customer-1',
        new Date('2026-04-01'),
        'web',
      );

      await listener.handleBookingCreated(event);

      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('booking-1'),
        'BookingEventListener',
      );

      expect(queueService.addNotificationJob).toHaveBeenCalledWith(
        'send-booking-confirmation',
        expect.objectContaining({
          type: 'booking-confirmation',
          payload: expect.objectContaining({
            bookingId: 'booking-1',
            customerId: 'customer-1',
          }),
          tenantId: 'tenant-1',
        }),
      );

      expect(queueService.addNotificationJob).toHaveBeenCalledWith(
        'sync-calendar',
        expect.objectContaining({
          type: 'calendar-sync',
          payload: expect.objectContaining({
            bookingId: 'booking-1',
            action: 'create',
          }),
          tenantId: 'tenant-1',
        }),
      );
    });
  });

  describe('handleBookingUpdated', () => {
    it('should log and queue update notification', async () => {
      const event = {
        bookingId: 'booking-2',
        tenantId: 'tenant-2',
        changes: { status: 'CONFIRMED' },
      };

      await listener.handleBookingUpdated(event);

      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('booking-2'),
        'BookingEventListener',
      );

      expect(queueService.addNotificationJob).toHaveBeenCalledWith(
        'send-booking-update',
        expect.objectContaining({
          type: 'booking-update',
          payload: expect.objectContaining({
            bookingId: 'booking-2',
            changes: { status: 'CONFIRMED' },
          }),
          tenantId: 'tenant-2',
        }),
      );
    });
  });

  describe('handleBookingCancelled', () => {
    it('should log and queue cancellation + calendar delete', async () => {
      const event = {
        bookingId: 'booking-3',
        tenantId: 'tenant-3',
        reason: 'Customer requested',
      };

      await listener.handleBookingCancelled(event);

      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('booking-3'),
        'BookingEventListener',
      );

      expect(queueService.addNotificationJob).toHaveBeenCalledWith(
        'send-cancellation-notice',
        expect.objectContaining({
          type: 'booking-cancellation',
          payload: expect.objectContaining({
            bookingId: 'booking-3',
            reason: 'Customer requested',
          }),
          tenantId: 'tenant-3',
        }),
      );

      expect(queueService.addNotificationJob).toHaveBeenCalledWith(
        'sync-calendar',
        expect.objectContaining({
          type: 'calendar-sync',
          payload: expect.objectContaining({
            bookingId: 'booking-3',
            action: 'delete',
          }),
          tenantId: 'tenant-3',
        }),
      );
    });

    it('should handle cancellation without reason', async () => {
      const event = {
        bookingId: 'booking-4',
        tenantId: 'tenant-4',
      };

      await listener.handleBookingCancelled(event);

      expect(queueService.addNotificationJob).toHaveBeenCalledWith(
        'send-cancellation-notice',
        expect.objectContaining({
          payload: expect.objectContaining({
            reason: undefined,
          }),
        }),
      );
    });
  });
});
