/**
 * NotificationTriggersService
 *
 * Event-driven notification dispatcher. Listens to domain events
 * (booking.created, inspection.completed, payment.received, etc.)
 * via EventEmitter2 and creates the appropriate notifications through
 * NotificationV2Service. Also runs cron jobs for scheduled notifications.
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';
import { NotificationV2Service } from './notification-v2.service';
import { PrismaService } from '../../common/services/prisma.service';
import { NotificationType, NotificationChannel } from '@prisma/client';
import { NOTIFICATION_EVENTS } from '../constants/notification-events';

@Injectable()
export class NotificationTriggersService {
  private readonly logger = new Logger(NotificationTriggersService.name);

  constructor(
    private readonly notificationService: NotificationV2Service,
    private readonly prisma: PrismaService,
  ) {}

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
  }): Promise<void> {
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
          time: event.scheduledDate.toLocaleTimeString('it-IT', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          bookingCode: event.bookingId.slice(-6).toUpperCase(),
          template: NOTIFICATION_EVENTS.BOOKING_CONFIRMED.template,
          subject: NOTIFICATION_EVENTS.BOOKING_CONFIRMED.subject,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to send booking confirmation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  @OnEvent('booking.updated')
  async onBookingUpdated(event: {
    bookingId: string;
    tenantId: string;
    customerId: string;
    changes: Record<string, unknown>;
  }): Promise<void> {
    this.logger.log(`Booking updated: ${event.bookingId}`);

    if (event.changes.status) {
      try {
        await this.notificationService.sendImmediate({
          customerId: event.customerId,
          tenantId: event.tenantId,
          type: NotificationType.STATUS_UPDATE,
          channel: NotificationChannel.SMS,
          metadata: {
            bookingId: event.bookingId,
            status: this.getStatusLabel(String(event.changes.status)),
          },
        });
      } catch (error) {
        this.logger.error(
          `Failed to send status update: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }
  }

  @OnEvent('booking.cancelled')
  async onBookingCancelled(event: {
    bookingId: string;
    tenantId: string;
    customerId: string;
    reason?: string;
  }): Promise<void> {
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
          template: NOTIFICATION_EVENTS.BOOKING_CANCELLED.template,
          subject: NOTIFICATION_EVENTS.BOOKING_CANCELLED.subject,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to send cancellation notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // ==========================================
  // VEHICLE EVENTS
  // ==========================================

  @OnEvent('vehicle.checkedIn')
  async onVehicleCheckedIn(event: {
    workOrderId: string;
    tenantId: string;
    customerId: string;
    vehiclePlate?: string;
  }): Promise<void> {
    this.logger.log(`Vehicle checked in: WO ${event.workOrderId}`);

    try {
      await this.notificationService.sendImmediate({
        customerId: event.customerId,
        tenantId: event.tenantId,
        type: NotificationType.STATUS_UPDATE,
        channel: NotificationChannel.EMAIL,
        metadata: {
          workOrderId: event.workOrderId,
          vehiclePlate: event.vehiclePlate,
          template: NOTIFICATION_EVENTS.VEHICLE_CHECKED_IN.template,
          subject: NOTIFICATION_EVENTS.VEHICLE_CHECKED_IN.subject,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to send vehicle check-in notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  @OnEvent('vehicle.ready')
  async onVehicleReady(event: {
    workOrderId: string;
    tenantId: string;
    customerId: string;
  }): Promise<void> {
    this.logger.log(`Vehicle ready: WO ${event.workOrderId}`);

    try {
      await this.notificationService.sendImmediate({
        customerId: event.customerId,
        tenantId: event.tenantId,
        type: NotificationType.STATUS_UPDATE,
        channel: NotificationChannel.SMS,
        metadata: {
          workOrderId: event.workOrderId,
          template: NOTIFICATION_EVENTS.VEHICLE_READY.template,
          subject: NOTIFICATION_EVENTS.VEHICLE_READY.subject,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to send vehicle ready notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
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
  }): Promise<void> {
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
          template: NOTIFICATION_EVENTS.INSPECTION_REPORT_SENT.template,
          subject: NOTIFICATION_EVENTS.INSPECTION_REPORT_SENT.subject,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to send inspection complete notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  @OnEvent('inspection.readyForReview')
  async onInspectionReadyForReview(event: {
    inspectionId: string;
    tenantId: string;
    customerId: string;
  }): Promise<void> {
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
      this.logger.error(
        `Failed to send inspection review notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // ==========================================
  // ESTIMATE EVENTS
  // ==========================================

  @OnEvent('estimate.sent')
  async onEstimateSent(event: {
    estimateId: string;
    tenantId: string;
    customerId: string;
    estimateNumber: string;
    totalCents: number;
  }): Promise<void> {
    this.logger.log(`Estimate sent: ${event.estimateId}`);

    try {
      await this.notificationService.sendImmediate({
        customerId: event.customerId,
        tenantId: event.tenantId,
        type: NotificationType.STATUS_UPDATE,
        channel: NotificationChannel.EMAIL,
        metadata: {
          estimateId: event.estimateId,
          estimateNumber: event.estimateNumber,
          amount: `€${(event.totalCents / 100).toFixed(2)}`,
          template: NOTIFICATION_EVENTS.ESTIMATE_SENT.template,
          subject: NOTIFICATION_EVENTS.ESTIMATE_SENT.subject,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to send estimate notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  @OnEvent('estimate.accepted')
  async onEstimateAccepted(event: {
    estimateId: string;
    tenantId: string;
    customerId: string;
  }): Promise<void> {
    this.logger.log(`Estimate accepted: ${event.estimateId}`);

    try {
      await this.notificationService.sendImmediate({
        customerId: event.customerId,
        tenantId: event.tenantId,
        type: NotificationType.STATUS_UPDATE,
        channel: NotificationChannel.IN_APP,
        metadata: {
          estimateId: event.estimateId,
          template: NOTIFICATION_EVENTS.ESTIMATE_APPROVED.template,
          subject: NOTIFICATION_EVENTS.ESTIMATE_APPROVED.subject,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to send estimate accepted notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  @OnEvent('estimate.rejected')
  async onEstimateRejected(event: {
    estimateId: string;
    tenantId: string;
    customerId: string;
  }): Promise<void> {
    this.logger.log(`Estimate rejected: ${event.estimateId}`);

    try {
      await this.notificationService.sendImmediate({
        customerId: event.customerId,
        tenantId: event.tenantId,
        type: NotificationType.STATUS_UPDATE,
        channel: NotificationChannel.IN_APP,
        metadata: {
          estimateId: event.estimateId,
          template: NOTIFICATION_EVENTS.ESTIMATE_REJECTED.template,
          subject: NOTIFICATION_EVENTS.ESTIMATE_REJECTED.subject,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to send estimate rejected notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
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
  }): Promise<void> {
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
          template: NOTIFICATION_EVENTS.INVOICE_SENT.template,
          subject: NOTIFICATION_EVENTS.INVOICE_SENT.subject,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to send invoice notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  @OnEvent('invoice.paid')
  async onPaymentReceived(event: {
    invoiceId: string;
    tenantId: string;
    customerId: string;
    amount: number;
    invoiceNumber: string;
  }): Promise<void> {
    this.logger.log(`Payment received for invoice: ${event.invoiceId}`);

    try {
      await this.notificationService.sendImmediate({
        customerId: event.customerId,
        tenantId: event.tenantId,
        type: NotificationType.PAYMENT_REMINDER,
        channel: NotificationChannel.EMAIL,
        metadata: {
          invoiceId: event.invoiceId,
          invoiceNumber: event.invoiceNumber,
          amount: `€${event.amount.toFixed(2)}`,
          template: NOTIFICATION_EVENTS.PAYMENT_RECEIVED.template,
          subject: NOTIFICATION_EVENTS.PAYMENT_RECEIVED.subject,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to send payment received notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  @OnEvent('invoice.paymentDue')
  async onPaymentDue(event: {
    invoiceId: string;
    tenantId: string;
    customerId: string;
    amount: number;
    dueDate: Date;
  }): Promise<void> {
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
      this.logger.error(
        `Failed to send payment reminder: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // ==========================================
  // WORK ORDER EVENTS
  // ==========================================

  @OnEvent('workOrder.statusChanged')
  async onWorkOrderStatusChanged(event: {
    workOrderId: string;
    tenantId: string;
    customerId: string;
    status: string;
  }): Promise<void> {
    this.logger.log(`Work order status changed: ${event.workOrderId} → ${event.status}`);

    try {
      await this.notificationService.sendImmediate({
        customerId: event.customerId,
        tenantId: event.tenantId,
        type: NotificationType.STATUS_UPDATE,
        channel: NotificationChannel.IN_APP,
        metadata: {
          workOrderId: event.workOrderId,
          status: this.getStatusLabel(event.status),
          template: NOTIFICATION_EVENTS.WORK_ORDER_STATUS_CHANGED.template,
          subject: NOTIFICATION_EVENTS.WORK_ORDER_STATUS_CHANGED.subject,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to send WO status notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  @OnEvent('parts.arrived')
  async onPartsArrived(event: {
    workOrderId: string;
    tenantId: string;
    customerId: string;
    partNames: string[];
  }): Promise<void> {
    this.logger.log(`Parts arrived for WO: ${event.workOrderId}`);

    try {
      await this.notificationService.sendImmediate({
        customerId: event.customerId,
        tenantId: event.tenantId,
        type: NotificationType.STATUS_UPDATE,
        channel: NotificationChannel.SMS,
        metadata: {
          workOrderId: event.workOrderId,
          parts: event.partNames.join(', '),
          template: NOTIFICATION_EVENTS.PARTS_ARRIVED.template,
          subject: NOTIFICATION_EVENTS.PARTS_ARRIVED.subject,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to send parts arrived notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
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
  }): Promise<void> {
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
          template: NOTIFICATION_EVENTS.MAINTENANCE_DUE.template,
          subject: NOTIFICATION_EVENTS.MAINTENANCE_DUE.subject,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to send maintenance reminder: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // ==========================================
  // WORK ORDER DELIVERY — REVIEW REQUEST
  // ==========================================

  @OnEvent('workOrder.delivered')
  async onWorkOrderDelivered(event: {
    workOrderId: string;
    tenantId: string;
    customerId: string;
  }): Promise<void> {
    this.logger.log(`Work order delivered: ${event.workOrderId} — scheduling review request`);

    try {
      // Schedule review request SMS 24h later via delayed notification
      await this.notificationService.sendImmediate({
        customerId: event.customerId,
        tenantId: event.tenantId,
        type: NotificationType.STATUS_UPDATE,
        channel: NotificationChannel.SMS,
        metadata: {
          workOrderId: event.workOrderId,
          template: NOTIFICATION_EVENTS.REVIEW_REQUEST.template,
          subject: NOTIFICATION_EVENTS.REVIEW_REQUEST.subject,
          reviewLink: `https://app.mechmind.io/review/${event.tenantId}`,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to send review request for WO ${event.workOrderId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // ==========================================
  // CRON JOBS — SCHEDULED NOTIFICATIONS
  // ==========================================

  /**
   * Every day at 18:00 (Europe/Rome) — send booking reminders for tomorrow
   */
  @Cron('0 18 * * *', { timeZone: 'Europe/Rome' })
  async sendBookingReminders(): Promise<number> {
    this.logger.log('Running booking reminder cron job...');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    let sentCount = 0;

    try {
      const bookings = await this.prisma.booking.findMany({
        where: {
          scheduledDate: {
            gte: tomorrow,
            lt: dayAfterTomorrow,
          },
          status: 'CONFIRMED',
        },
        select: {
          id: true,
          tenantId: true,
          customerId: true,
          scheduledDate: true,
        },
      });

      for (const booking of bookings) {
        if (!booking.customerId) continue;
        try {
          await this.notificationService.sendImmediate({
            customerId: booking.customerId,
            tenantId: booking.tenantId,
            type: NotificationType.BOOKING_CONFIRMATION,
            channel: NotificationChannel.SMS,
            metadata: {
              bookingId: booking.id,
              date: booking.scheduledDate.toLocaleDateString('it-IT'),
              time: booking.scheduledDate.toLocaleTimeString('it-IT', {
                hour: '2-digit',
                minute: '2-digit',
              }),
              template: NOTIFICATION_EVENTS.BOOKING_REMINDER_24H.template,
              subject: NOTIFICATION_EVENTS.BOOKING_REMINDER_24H.subject,
            },
          });
          sentCount++;
        } catch (error) {
          this.logger.error(
            `Failed to send reminder for booking ${booking.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      this.logger.log(`Booking reminders sent: ${sentCount}/${bookings.length}`);
    } catch (error) {
      this.logger.error(
        `Booking reminder cron failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    return sentCount;
  }

  /**
   * Every Monday at 09:00 (Europe/Rome) — send maintenance reminders
   * for vehicles with last completed WO > 180 days ago
   */
  @Cron('0 9 * * 1', { timeZone: 'Europe/Rome' })
  async sendMaintenanceReminders(): Promise<number> {
    this.logger.log('Running maintenance reminder cron job...');

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);

    let sentCount = 0;

    try {
      // Find vehicles with old completed work orders but no recent ones
      const vehicles = await this.prisma.vehicle.findMany({
        where: {
          status: 'ACTIVE',
          workOrders: {
            some: {
              status: 'COMPLETED',
              actualCompletionTime: { lt: sixMonthsAgo },
            },
            none: {
              status: 'COMPLETED',
              actualCompletionTime: { gte: sixMonthsAgo },
            },
          },
        },
        select: {
          id: true,
          customerId: true,
          make: true,
          model: true,
          workOrders: {
            select: { tenantId: true },
            take: 1,
          },
        },
      });

      for (const vehicle of vehicles) {
        const tenantId = vehicle.workOrders[0]?.tenantId;
        if (!tenantId || !vehicle.customerId) continue;

        try {
          await this.notificationService.sendImmediate({
            customerId: vehicle.customerId,
            tenantId,
            type: NotificationType.MAINTENANCE_DUE,
            channel: NotificationChannel.EMAIL,
            metadata: {
              vehicleId: vehicle.id,
              vehicleName: `${vehicle.make} ${vehicle.model}`,
              template: NOTIFICATION_EVENTS.MAINTENANCE_DUE.template,
              subject: NOTIFICATION_EVENTS.MAINTENANCE_DUE.subject,
            },
          });
          sentCount++;
        } catch (error) {
          this.logger.error(
            `Failed to send maintenance reminder for vehicle ${vehicle.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      this.logger.log(`Maintenance reminders sent: ${sentCount}/${vehicles.length}`);
    } catch (error) {
      this.logger.error(
        `Maintenance reminder cron failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    return sentCount;
  }

  /**
   * Every day at 07:00 (Europe/Rome) — mark overdue invoices.
   * INTENTIONALLY cross-tenant: cron marks overdue invoices system-wide.
   */
  @Cron('0 7 * * *', { timeZone: 'Europe/Rome' })
  async markOverdueInvoices(): Promise<number> {
    this.logger.log('Running mark overdue invoices cron job...');

    try {
      const now = new Date();

      const result = await this.prisma.invoice.updateMany({
        where: {
          status: 'SENT',
          dueDate: { lt: now },
        },
        data: {
          status: 'OVERDUE',
        },
      });

      this.logger.log(`Invoices marked as OVERDUE: ${result.count}`);
      return result.count;
    } catch (error) {
      this.logger.error(
        `Mark overdue invoices cron failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return 0;
    }
  }

  /**
   * Every Monday at 10:00 (Europe/Rome) — send warranty expiring reminders
   * Finds work orders completed between 335-365 days ago (warranty expiring within 30 days
   * assuming 1-year warranty) and sends EMAIL notifications.
   */
  @Cron('0 10 * * 1', { timeZone: 'Europe/Rome' })
  async sendWarrantyExpiringReminders(): Promise<number> {
    this.logger.log('Running warranty expiring reminders cron job...');

    const now = new Date();
    const daysAgo365 = new Date(now);
    daysAgo365.setDate(daysAgo365.getDate() - 365);
    const daysAgo335 = new Date(now);
    daysAgo335.setDate(daysAgo335.getDate() - 335);

    let sentCount = 0;

    try {
      const workOrders = await this.prisma.workOrder.findMany({
        where: {
          status: 'COMPLETED',
          actualCompletionTime: {
            gte: daysAgo365,
            lte: daysAgo335,
          },
        },
        select: {
          id: true,
          tenantId: true,
          customerId: true,
          woNumber: true,
        },
      });

      for (const wo of workOrders) {
        if (!wo.customerId) continue;
        try {
          await this.notificationService.sendImmediate({
            customerId: wo.customerId,
            tenantId: wo.tenantId,
            type: NotificationType.MAINTENANCE_DUE,
            channel: NotificationChannel.EMAIL,
            metadata: {
              workOrderId: wo.id,
              woNumber: wo.woNumber,
              template: NOTIFICATION_EVENTS.WARRANTY_EXPIRING.template,
              subject: NOTIFICATION_EVENTS.WARRANTY_EXPIRING.subject,
            },
          });
          sentCount++;
        } catch (error) {
          this.logger.error(
            `Failed to send warranty reminder for WO ${wo.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      this.logger.log(`Warranty expiring reminders sent: ${sentCount}/${workOrders.length}`);
    } catch (error) {
      this.logger.error(
        `Warranty expiring reminders cron failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    return sentCount;
  }

  // ==========================================
  // CRON: sendReviewRequests
  // ==========================================

  /**
   * Every day at 10:00 (Europe/Rome) — send review requests for work orders
   * delivered yesterday that haven't received a review request yet.
   */
  @Cron('0 10 * * *', { timeZone: 'Europe/Rome' })
  async sendReviewRequests(): Promise<number> {
    this.logger.log('Running review request cron job...');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const startOfYesterday = new Date(yesterday);
    startOfYesterday.setHours(0, 0, 0, 0);
    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    let sentCount = 0;

    try {
      const deliveredOrders = await this.prisma.workOrder.findMany({
        where: {
          status: 'COMPLETED',
          updatedAt: {
            gte: startOfYesterday,
            lt: endOfYesterday,
          },
          reviewRequestSentAt: null,
        },
        select: {
          id: true,
          tenantId: true,
          customerId: true,
        },
      });

      for (const wo of deliveredOrders) {
        if (!wo.customerId) continue;

        try {
          await this.notificationService.sendImmediate({
            customerId: wo.customerId,
            tenantId: wo.tenantId,
            type: NotificationType.STATUS_UPDATE,
            channel: NotificationChannel.SMS,
            metadata: {
              workOrderId: wo.id,
              template: NOTIFICATION_EVENTS.REVIEW_REQUEST.template,
              subject: NOTIFICATION_EVENTS.REVIEW_REQUEST.subject,
              reviewLink: `https://app.mechmind.io/review/${wo.tenantId}`,
            },
          });

          await this.prisma.workOrder.update({
            where: { id: wo.id },
            data: { reviewRequestSentAt: new Date() },
          });

          sentCount++;
        } catch (error) {
          this.logger.error(
            `Failed to send review request for WO ${wo.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      this.logger.log(`Review requests sent: ${sentCount}/${deliveredOrders.length}`);
    } catch (error) {
      this.logger.error(
        `Review request cron failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    return sentCount;
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
