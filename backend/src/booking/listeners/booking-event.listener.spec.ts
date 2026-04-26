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

  describe('error handling and branch coverage', () => {
    it('should handle queue service errors during booking creation', async () => {
      queueService.addNotificationJob.mockRejectedValueOnce(new Error('Queue failed'));
      const event = new BookingCreatedEvent(
        'booking-5',
        'tenant-5',
        'customer-5',
        new Date('2026-04-01'),
        'api',
      );

      await expect(listener.handleBookingCreated(event)).rejects.toThrow('Queue failed');
      expect(logger.log).toHaveBeenCalled();
    });

    it('should handle queue errors on second call during creation', async () => {
      queueService.addNotificationJob
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Second call failed'));
      const event = new BookingCreatedEvent(
        'booking-6',
        'tenant-6',
        'customer-6',
        new Date('2026-04-02'),
        'kiosk',
      );

      await expect(listener.handleBookingCreated(event)).rejects.toThrow('Second call failed');
    });

    it('should handle queue errors during booking update', async () => {
      queueService.addNotificationJob.mockRejectedValueOnce(new Error('Update failed'));
      const event = {
        bookingId: 'booking-7',
        tenantId: 'tenant-7',
        changes: { status: 'RESCHEDULED' },
      };

      await expect(listener.handleBookingUpdated(event)).rejects.toThrow('Update failed');
    });

    it('should handle queue errors during cancellation', async () => {
      queueService.addNotificationJob.mockRejectedValueOnce(new Error('Cancel failed'));
      const event = {
        bookingId: 'booking-8',
        tenantId: 'tenant-8',
        reason: 'Maintenance',
      };

      await expect(listener.handleBookingCancelled(event)).rejects.toThrow('Cancel failed');
    });

    it('should handle second queue error during cancellation', async () => {
      queueService.addNotificationJob
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Second cancel failed'));
      const event = {
        bookingId: 'booking-9',
        tenantId: 'tenant-9',
        reason: 'Emergency',
      };

      await expect(listener.handleBookingCancelled(event)).rejects.toThrow('Second cancel failed');
    });

    it('should correctly include all payload fields for created event', async () => {
      const scheduledDate = new Date('2026-08-15T10:30:00Z');
      const event = new BookingCreatedEvent(
        'booking-10',
        'tenant-10',
        'customer-10',
        scheduledDate,
        'mobile',
      );

      await listener.handleBookingCreated(event);

      const confirmCall = queueService.addNotificationJob.mock.calls[0];
      expect(confirmCall[1].payload.bookingId).toBe('booking-10');
      expect(confirmCall[1].payload.customerId).toBe('customer-10');
      expect(confirmCall[1].payload.scheduledDate).toEqual(scheduledDate);

      const syncCall = queueService.addNotificationJob.mock.calls[1];
      expect(syncCall[1].payload.action).toBe('create');
    });

    it('should queue exactly 2 jobs on booking creation', async () => {
      const event = new BookingCreatedEvent(
        'booking-11',
        'tenant-11',
        'customer-11',
        new Date(),
        'phone',
      );

      queueService.addNotificationJob.mockClear();
      await listener.handleBookingCreated(event);

      expect(queueService.addNotificationJob).toHaveBeenCalledTimes(2);
    });

    it('should queue exactly 1 job on booking update', async () => {
      const event = {
        bookingId: 'booking-12',
        tenantId: 'tenant-12',
        changes: { notes: 'Updated' },
      };

      queueService.addNotificationJob.mockClear();
      await listener.handleBookingUpdated(event);

      expect(queueService.addNotificationJob).toHaveBeenCalledTimes(1);
    });

    it('should queue exactly 2 jobs on booking cancellation', async () => {
      const event = {
        bookingId: 'booking-13',
        tenantId: 'tenant-13',
        reason: 'System error',
      };

      queueService.addNotificationJob.mockClear();
      await listener.handleBookingCancelled(event);

      expect(queueService.addNotificationJob).toHaveBeenCalledTimes(2);
    });

    it('should log with correct tenant context', async () => {
      const event = new BookingCreatedEvent(
        'booking-14',
        'special-tenant',
        'cust-14',
        new Date(),
        'web',
      );

      await listener.handleBookingCreated(event);

      expect(logger.log).toHaveBeenCalledWith(
        expect.stringMatching(/special-tenant/),
        'BookingEventListener',
      );
    });
  });
});
