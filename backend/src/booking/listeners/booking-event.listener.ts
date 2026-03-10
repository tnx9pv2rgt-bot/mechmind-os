import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { LoggerService } from '@common/services/logger.service';
import { QueueService } from '@common/services/queue.service';
import { BookingCreatedEvent } from '../services/booking.service';

@Injectable()
export class BookingEventListener {
  constructor(
    private readonly logger: LoggerService,
    private readonly queueService: QueueService,
  ) {}

  @OnEvent('booking.created')
  async handleBookingCreated(event: BookingCreatedEvent) {
    this.logger.log(
      `Booking created: ${event.bookingId} for tenant ${event.tenantId}`,
      'BookingEventListener',
    );

    // Queue notification job
    await this.queueService.addNotificationJob('send-booking-confirmation', {
      type: 'booking-confirmation',
      payload: {
        bookingId: event.bookingId,
        customerId: event.customerId,
        scheduledDate: event.scheduledDate,
      },
      tenantId: event.tenantId,
    });

    // Queue calendar sync job if needed
    await this.queueService.addNotificationJob('sync-calendar', {
      type: 'calendar-sync',
      payload: {
        bookingId: event.bookingId,
        action: 'create',
      },
      tenantId: event.tenantId,
    });
  }

  @OnEvent('booking.updated')
  async handleBookingUpdated(event: {
    bookingId: string;
    tenantId: string;
    changes: Record<string, any>;
  }) {
    this.logger.log(
      `Booking updated: ${event.bookingId} for tenant ${event.tenantId}`,
      'BookingEventListener',
    );

    // Queue notification for booking update
    await this.queueService.addNotificationJob('send-booking-update', {
      type: 'booking-update',
      payload: {
        bookingId: event.bookingId,
        changes: event.changes,
      },
      tenantId: event.tenantId,
    });
  }

  @OnEvent('booking.cancelled')
  async handleBookingCancelled(event: { bookingId: string; tenantId: string; reason?: string }) {
    this.logger.log(
      `Booking cancelled: ${event.bookingId} for tenant ${event.tenantId}`,
      'BookingEventListener',
    );

    // Queue notification for cancellation
    await this.queueService.addNotificationJob('send-cancellation-notice', {
      type: 'booking-cancellation',
      payload: {
        bookingId: event.bookingId,
        reason: event.reason,
      },
      tenantId: event.tenantId,
    });

    // Queue calendar sync to remove event
    await this.queueService.addNotificationJob('sync-calendar', {
      type: 'calendar-sync',
      payload: {
        bookingId: event.bookingId,
        action: 'delete',
      },
      tenantId: event.tenantId,
    });
  }
}
