/**
 * Notification Triggers Service
 * Integrates notifications with business events
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationV2Service, CreateNotificationDTO } from './notification-v2.service';
import { NotificationType, NotificationChannel } from '@prisma/client';

@Injectable()
export class NotificationTriggersService {
  private readonly logger = new Logger(NotificationTriggersService.name);

  constructor(private readonly notificationService: NotificationV2Service) {}

  // ==========================================
  // BOOKING EVENTS
  // ==========================================

  @OnEvent('booking.created')
  async onBookingCreated(event: {
    bookingId: string;
    tenantId: string;
    customerId: string;
    scheduledDate: Date;
    source: string;
  }) {
    this.logger.log(`Booking created: ${event.bookingId}`);

    try {
      await this.notificationService.sendImmediate({
        customerId: event.customerId,
        tenantId: event.tenantId,
        type: NotificationType.BOOKING_CONFIRMATION,
        channel: NotificationChannel.SMS,
        metadata: {
          bookingId: event.bookingId,
          date: event.scheduledDate.toLocaleDateString('it-IT'),
          time: event.scheduledDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
          bookingCode: event.bookingId.slice(-6).toUpperCase(),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to send booking confirmation: ${error.message}`);
    }
  }

  @OnEvent('booking.updated')
  async onBookingUpdated(event: {
    bookingId: string;
    tenantId: string;
    customerId: string;
    changes: Record<string, any>;
  }) {
    this.logger.log(`Booking updated: ${event.bookingId}`);

    // Send status update if status changed
    if (event.changes.status) {
      try {
        await this.notificationService.sendImmediate({
          customerId: event.customerId,
          tenantId: event.tenantId,
          type: NotificationType.STATUS_UPDATE,
          channel: NotificationChannel.SMS,
          metadata: {
            bookingId: event.bookingId,
            status: this.getStatusLabel(event.changes.status),
          },
        });
      } catch (error) {
        this.logger.error(`Failed to send status update: ${error.message}`);
      }
    }
  }

  @OnEvent('booking.cancelled')
  async onBookingCancelled(event: {
    bookingId: string;
    tenantId: string;
    customerId: string;
    reason?: string;
  }) {
    this.logger.log(`Booking cancelled: ${event.bookingId}`);

    try {
      await this.notificationService.sendImmediate({
        customerId: event.customerId,
        tenantId: event.tenantId,
        type: NotificationType.STATUS_UPDATE,
        channel: NotificationChannel.SMS,
        metadata: {
          bookingId: event.bookingId,
          status: 'Prenotazione annullata',
        },
      });
    } catch (error) {
      this.logger.error(`Failed to send cancellation notification: ${error.message}`);
    }
  }

  // ==========================================
  // INSPECTION EVENTS
  // ==========================================

  @OnEvent('inspection.completed')
  async onInspectionCompleted(event: {
    inspectionId: string;
    tenantId: string;
    customerId: string;
    score?: string;
    findingsCount?: number;
  }) {
    this.logger.log(`Inspection completed: ${event.inspectionId}`);

    try {
      await this.notificationService.sendImmediate({
        customerId: event.customerId,
        tenantId: event.tenantId,
        type: NotificationType.INSPECTION_COMPLETE,
        channel: NotificationChannel.SMS,
        metadata: {
          inspectionId: event.inspectionId,
          score: event.score,
          link: `https://app.mechmind.io/inspections/${event.inspectionId}`,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to send inspection complete notification: ${error.message}`);
    }
  }

  @OnEvent('inspection.readyForReview')
  async onInspectionReadyForReview(event: {
    inspectionId: string;
    tenantId: string;
    customerId: string;
  }) {
    this.logger.log(`Inspection ready for review: ${event.inspectionId}`);

    try {
      await this.notificationService.sendImmediate({
        customerId: event.customerId,
        tenantId: event.tenantId,
        type: NotificationType.STATUS_UPDATE,
        channel: NotificationChannel.SMS,
        metadata: {
          inspectionId: event.inspectionId,
          status: 'Ispezione completata, in attesa di approvazione',
          link: `https://app.mechmind.io/inspections/${event.inspectionId}`,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to send inspection review notification: ${error.message}`);
    }
  }

  // ==========================================
  // INVOICE EVENTS
  // ==========================================

  @OnEvent('invoice.generated')
  async onInvoiceGenerated(event: {
    invoiceId: string;
    tenantId: string;
    customerId: string;
    amount: number;
    invoiceNumber: string;
  }) {
    this.logger.log(`Invoice generated: ${event.invoiceId}`);

    try {
      await this.notificationService.sendImmediate({
        customerId: event.customerId,
        tenantId: event.tenantId,
        type: NotificationType.INVOICE_READY,
        channel: NotificationChannel.SMS,
        metadata: {
          invoiceId: event.invoiceId,
          invoiceNumber: event.invoiceNumber,
          amount: `€${event.amount.toFixed(2)}`,
          link: `https://app.mechmind.io/invoices/${event.invoiceId}`,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to send invoice notification: ${error.message}`);
    }
  }

  @OnEvent('invoice.paymentDue')
  async onPaymentDue(event: {
    invoiceId: string;
    tenantId: string;
    customerId: string;
    amount: number;
    dueDate: Date;
  }) {
    this.logger.log(`Payment due for invoice: ${event.invoiceId}`);

    try {
      await this.notificationService.sendImmediate({
        customerId: event.customerId,
        tenantId: event.tenantId,
        type: NotificationType.PAYMENT_REMINDER,
        channel: NotificationChannel.SMS,
        metadata: {
          invoiceId: event.invoiceId,
          amount: `€${event.amount.toFixed(2)}`,
          dueDate: event.dueDate.toLocaleDateString('it-IT'),
          link: `https://app.mechmind.io/invoices/${event.invoiceId}/pay`,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to send payment reminder: ${error.message}`);
    }
  }

  // ==========================================
  // MAINTENANCE EVENTS
  // ==========================================

  @OnEvent('maintenance.due')
  async onMaintenanceDue(event: {
    vehicleId: string;
    tenantId: string;
    customerId: string;
    serviceType: string;
    daysUntilDue: number;
  }) {
    this.logger.log(`Maintenance due for vehicle: ${event.vehicleId}`);

    try {
      await this.notificationService.sendImmediate({
        customerId: event.customerId,
        tenantId: event.tenantId,
        type: NotificationType.MAINTENANCE_DUE,
        channel: NotificationChannel.SMS,
        metadata: {
          vehicleId: event.vehicleId,
          service: event.serviceType,
          days: event.daysUntilDue,
          link: 'https://app.mechmind.io/portal',
        },
      });
    } catch (error) {
      this.logger.error(`Failed to send maintenance reminder: ${error.message}`);
    }
  }

  // ==========================================
  // SCHEDULED NOTIFICATIONS
  // ==========================================

  /**
   * Queue booking reminders for tomorrow
   * Called by cron job
   */
  async queueBookingReminders(): Promise<number> {
    this.logger.log('Queueing booking reminders...');
    // Implementation in notification service
    return 0;
  }

  /**
   * Queue maintenance reminders
   * Called by cron job
   */
  async queueMaintenanceReminders(): Promise<number> {
    this.logger.log('Queueing maintenance reminders...');
    // Implementation in notification service
    return 0;
  }

  // ==========================================
  // PRIVATE HELPERS
  // ==========================================

  private getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      PENDING: 'In attesa',
      CONFIRMED: 'Confermato',
      IN_PROGRESS: 'In corso',
      COMPLETED: 'Completato',
      CANCELLED: 'Annullato',
      NO_SHOW: 'No show',
    };
    return labels[status] || status;
  }
}
