/**
 * NotificationService (v1)
 *
 * Multi-channel notification orchestrator.
 * Routes notifications to Email (Resend), SMS (Twilio), or BullMQ queue
 * based on customer channel preferences. Emits domain events on send/fail.
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@common/services/prisma.service';
import { EncryptionService } from '@common/services/encryption.service';
import { EmailService } from '../email/email.service';
import { SmsService } from '../sms/sms.service';
import {
  NotificationType,
  NotificationChannel,
  SendNotificationDto,
} from '../dto/send-notification.dto';
import {
  NotificationType as PrismaNotificationType,
  NotificationChannel as PrismaNotificationChannel,
} from '@prisma/client';

// Events
export class NotificationSentEvent {
  constructor(
    public readonly notificationId: string,
    public readonly customerId: string,
    public readonly tenantId: string,
    public readonly type: NotificationType,
    public readonly channel: NotificationChannel,
    public readonly success: boolean,
  ) {}
}

export class NotificationFailedEvent {
  constructor(
    public readonly notificationId: string,
    public readonly customerId: string,
    public readonly tenantId: string,
    public readonly type: NotificationType,
    public readonly channel: NotificationChannel,
    public readonly error: string,
    public readonly fallbackAttempted?: boolean,
  ) {}
}

interface CustomerInfo {
  id: string;
  name: string;
  email: string;
  phone?: string;
  notificationPreferences?: {
    preferredChannel?: NotificationChannel;
    [key: string]: unknown;
  };
}

interface WorkshopInfo {
  id: string;
  name: string;
  address: string;
  phone: string;
}

export interface NotificationResult {
  success: boolean;
  channel: NotificationChannel;
  messageId?: string;
  error?: string;
  fallbackUsed?: boolean;
}

@Injectable()
export class NotificationOrchestratorService {
  private readonly logger = new Logger(NotificationOrchestratorService.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    @InjectQueue('notification-queue') private readonly notificationQueue: Queue,
    @InjectQueue('sms-queue') private readonly smsQueue: Queue,
  ) {}

  /**
   * Main method to send notifications with automatic fallback logic
   * Priority: SMS -> Email (if SMS fails or not available)
   */
  async notifyCustomer(
    customerId: string,
    tenantId: string,
    type: NotificationType,
    data: Record<string, unknown>,
    channelPreference: NotificationChannel = NotificationChannel.AUTO,
  ): Promise<NotificationResult> {
    const notificationId = this.generateId();

    this.logger.log(
      `[${notificationId}] Sending ${type} notification to customer ${customerId} (channel: ${channelPreference})`,
    );

    // Get customer info
    const customer = await this.getCustomerInfo(customerId, tenantId);
    if (!customer) {
      throw new NotFoundException(`Customer ${customerId} not found`);
    }

    // Get workshop info
    const workshop = await this.getWorkshopInfo(tenantId);

    // Determine which channel to use
    const channel = this.determineChannel(customer, channelPreference);

    let result: NotificationResult;

    switch (channel) {
      case NotificationChannel.SMS:
        result = await this.trySmsFirst(customer, workshop, type, data, notificationId);
        break;
      case NotificationChannel.EMAIL:
        result = await this.sendEmail(customer, workshop, type, data, notificationId);
        break;
      case NotificationChannel.BOTH:
        result = await this.sendBoth(customer, workshop, type, data, notificationId);
        break;
      default:
        result = await this.trySmsFirst(customer, workshop, type, data, notificationId);
    }

    // Log notification to database
    await this.logNotification(notificationId, customerId, tenantId, type, result);

    // Emit events
    if (result.success) {
      this.eventEmitter.emit(
        'notification.sent',
        new NotificationSentEvent(notificationId, customerId, tenantId, type, result.channel, true),
      );
    } else {
      this.eventEmitter.emit(
        'notification.failed',
        new NotificationFailedEvent(
          notificationId,
          customerId,
          tenantId,
          type,
          result.channel,
          result.error || 'Unknown error',
          result.fallbackUsed,
        ),
      );
    }

    return result;
  }

  /**
   * Try SMS first, fallback to Email if fails
   */
  private async trySmsFirst(
    customer: CustomerInfo,
    workshop: WorkshopInfo,
    type: NotificationType,
    data: Record<string, unknown>,
    notificationId: string,
  ): Promise<NotificationResult> {
    // Try SMS if phone is available
    if (customer.phone) {
      this.logger.log(`[${notificationId}] Attempting SMS notification`);

      const smsResult = await this.sendSmsNotification(customer, workshop, type, data);

      if (smsResult.success) {
        this.logger.log(`[${notificationId}] SMS sent successfully`);
        return { success: true, channel: NotificationChannel.SMS, messageId: smsResult.messageId };
      }

      this.logger.warn(
        `[${notificationId}] SMS failed, attempting email fallback: ${smsResult.error}`,
      );
    } else {
      this.logger.log(`[${notificationId}] No phone number, using email directly`);
    }

    // Fallback to email
    if (customer.email) {
      const emailResult = await this.sendEmailNotification(customer, workshop, type, data);

      if (emailResult.success) {
        this.logger.log(`[${notificationId}] Email fallback successful`);
        return {
          success: true,
          channel: NotificationChannel.EMAIL,
          messageId: emailResult.messageId,
          fallbackUsed: true,
        };
      }

      this.logger.error(`[${notificationId}] Email fallback also failed: ${emailResult.error}`);
      return {
        success: false,
        channel: NotificationChannel.EMAIL,
        error: `SMS failed, Email fallback failed: ${emailResult.error}`,
        fallbackUsed: true,
      };
    }

    return {
      success: false,
      channel: NotificationChannel.SMS,
      error: 'No phone or email available for customer',
    };
  }

  /**
   * Send only email notification
   */
  private async sendEmail(
    customer: CustomerInfo,
    workshop: WorkshopInfo,
    type: NotificationType,
    data: Record<string, unknown>,
    notificationId: string,
  ): Promise<NotificationResult> {
    this.logger.log(`[${notificationId}] Sending email notification`);

    if (!customer.email) {
      return {
        success: false,
        channel: NotificationChannel.EMAIL,
        error: 'Customer has no email address',
      };
    }

    const result = await this.sendEmailNotification(customer, workshop, type, data);

    return {
      success: result.success,
      channel: NotificationChannel.EMAIL,
      messageId: result.messageId,
      error: result.error,
    };
  }

  /**
   * Send both SMS and Email
   */
  private async sendBoth(
    customer: CustomerInfo,
    workshop: WorkshopInfo,
    type: NotificationType,
    data: Record<string, unknown>,
    notificationId: string,
  ): Promise<NotificationResult> {
    this.logger.log(`[${notificationId}] Sending both SMS and Email notifications`);

    const results = await Promise.allSettled([
      customer.phone
        ? this.sendSmsNotification(customer, workshop, type, data)
        : Promise.resolve({ success: false, error: 'No phone' }),
      customer.email
        ? this.sendEmailNotification(customer, workshop, type, data)
        : Promise.resolve({ success: false, error: 'No email' }),
    ]);

    const smsResult =
      results[0].status === 'fulfilled'
        ? results[0].value
        : { success: false, error: 'SMS promise rejected' };
    const emailResult =
      results[1].status === 'fulfilled'
        ? results[1].value
        : { success: false, error: 'Email promise rejected' };

    const success = smsResult.success || emailResult.success;

    return {
      success,
      channel: NotificationChannel.BOTH,
      messageId: smsResult.success
        ? (smsResult as { messageId?: string }).messageId
        : (emailResult as { messageId?: string })?.messageId,
      error: !success ? `SMS: ${smsResult.error}, Email: ${emailResult.error}` : undefined,
    };
  }

  /**
   * Send SMS notification via BullMQ queue with retry (P025 fix)
   */
  private async sendSmsNotification(
    customer: CustomerInfo,
    workshop: WorkshopInfo,
    type: NotificationType,
    data: Record<string, unknown>,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!customer.phone) {
      return { success: false, error: 'No phone number' };
    }

    const s = data as Record<string, string>;

    try {
      const templateMap: Record<
        string,
        { templateType: string; templateData: Record<string, string> }
      > = {
        [NotificationType.BOOKING_CONFIRMATION]: {
          templateType: 'booking_confirmation',
          templateData: {
            date: s.date,
            time: s.time,
            service: s.service,
            workshopName: workshop.name,
            bookingCode: s.bookingCode,
          },
        },
        [NotificationType.BOOKING_REMINDER]: {
          templateType: 'booking_reminder',
          templateData: {
            date: s.date,
            time: s.time,
            service: s.service,
            workshopName: workshop.name,
            bookingCode: s.bookingCode,
          },
        },
        [NotificationType.BOOKING_CANCELLED]: {
          templateType: 'booking_cancelled',
          templateData: {
            date: s.date,
            service: s.service,
            workshopName: workshop.name,
            bookingCode: s.bookingCode,
            cancellationReason: s.cancellationReason,
          },
        },
        [NotificationType.INVOICE_READY]: {
          templateType: 'invoice_ready',
          templateData: {
            invoiceNumber: s.invoiceNumber,
            amount: s.amount,
            downloadUrl: s.downloadUrl,
            workshopName: workshop.name,
          },
        },
      };

      const template = templateMap[type];
      if (!template) {
        return { success: false, error: `SMS not supported for type: ${type}` };
      }

      const job = await this.smsQueue.add(
        'send-sms',
        {
          to: customer.phone,
          body: '',
          category: template.templateType,
          templateType: template.templateType,
          templateData: template.templateData,
          tenantId: workshop.id,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 30000 },
        },
      );

      this.logger.log(
        `SMS queued for ${customer.phone.slice(0, 4)}*** via sms-queue (job ${job.id})`,
      );

      return {
        success: true,
        messageId: `sms-job-${job.id}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`SMS queue failed: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send Email notification based on type
   */
  private async sendEmailNotification(
    customer: CustomerInfo,
    workshop: WorkshopInfo,
    type: NotificationType,
    data: Record<string, unknown>,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!customer.email) {
      return { success: false, error: 'No email address' };
    }

    const s = data as Record<string, string>;

    try {
      switch (type) {
        case NotificationType.BOOKING_CONFIRMATION:
          return await this.emailService.sendBookingConfirmation({
            customerName: customer.name,
            customerEmail: customer.email,
            service: s.service,
            date: s.date,
            time: s.time,
            vehicle: s.vehicle,
            bookingCode: s.bookingCode,
            workshopName: workshop.name,
            workshopAddress: workshop.address,
            workshopPhone: workshop.phone,
            notes: s.notes,
          });

        case NotificationType.BOOKING_REMINDER:
          return await this.emailService.sendBookingReminder({
            customerName: customer.name,
            customerEmail: customer.email,
            service: s.service,
            date: s.date,
            time: s.time,
            vehicle: s.vehicle,
            bookingCode: s.bookingCode,
            workshopName: workshop.name,
            workshopAddress: workshop.address,
          });

        case NotificationType.BOOKING_CANCELLED:
          return await this.emailService.sendBookingCancelled({
            customerName: customer.name,
            customerEmail: customer.email,
            service: s.service,
            date: s.date,
            bookingCode: s.bookingCode,
            workshopName: workshop.name,
            cancellationReason: s.cancellationReason,
          });

        case NotificationType.INVOICE_READY:
          return await this.emailService.sendInvoiceReady({
            customerName: customer.name,
            customerEmail: customer.email,
            invoiceNumber: s.invoiceNumber,
            invoiceDate: s.invoiceDate,
            amount: s.amount,
            downloadUrl: s.downloadUrl,
            workshopName: workshop.name,
          });

        case NotificationType.GDPR_EXPORT_READY:
          return await this.emailService.sendGdprDataExport({
            customerName: customer.name,
            customerEmail: customer.email,
            downloadUrl: s.downloadUrl,
            expiryDate: s.expiryDate,
            requestId: s.requestId,
          });

        case NotificationType.WELCOME:
          return await this.emailService.sendWelcome({
            customerName: customer.name,
            customerEmail: customer.email,
            workshopName: workshop.name,
            loginUrl: s.loginUrl,
          });

        case NotificationType.PASSWORD_RESET:
          return await this.emailService.sendPasswordReset({
            customerName: customer.name,
            customerEmail: customer.email,
            resetUrl: s.resetUrl,
            expiryHours: Number(data.expiryHours) || 24,
          });

        default:
          return { success: false, error: `Email not supported for type: ${type}` };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Email sending failed: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Queue notification for later processing
   */
  async queueNotification(
    dto: SendNotificationDto,
    delayMs?: number,
  ): Promise<{ jobId: string; scheduledFor?: Date }> {
    const jobId = `notif-${this.generateId()}`;

    await this.notificationQueue.add('send-notification', dto, {
      jobId,
      delay: delayMs,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 60000,
      },
      removeOnFail: { count: 0 }, // Keep failed jobs in DLQ for inspection
      removeOnComplete: { count: 1000, age: 7 * 24 * 3600 }, // Keep last 1000 or 7 days
    });

    this.logger.log(`Notification queued: ${jobId}`);

    return {
      jobId,
      scheduledFor: delayMs ? new Date(Date.now() + delayMs) : undefined,
    };
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotifications(
    notifications: SendNotificationDto[],
    options: { throttleMs?: number; continueOnError?: boolean } = {},
  ): Promise<{
    total: number;
    successful: number;
    failed: number;
    results: NotificationResult[];
  }> {
    const results: NotificationResult[] = [];
    let successful = 0;
    let failed = 0;

    // Process in batches of 10 for controlled concurrency
    const BATCH_SIZE = 10;
    const throttleMs = options.throttleMs || 100;

    for (let i = 0; i < notifications.length; i += BATCH_SIZE) {
      const batch = notifications.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.allSettled(
        batch.map(notification =>
          this.notifyCustomer(
            notification.customerId,
            notification.tenantId,
            notification.type,
            notification.data,
            notification.channel,
          ),
        ),
      );

      let shouldBreak = false;
      for (let j = 0; j < batchResults.length; j++) {
        const settled = batchResults[j];
        if (settled.status === 'fulfilled') {
          results.push(settled.value);
          if (settled.value.success) {
            successful++;
          } else {
            failed++;
            if (!options.continueOnError) {
              shouldBreak = true;
              break;
            }
          }
        } else {
          failed++;
          results.push({
            success: false,
            channel: batch[j].channel,
            error: settled.reason instanceof Error ? settled.reason.message : 'Unknown error',
          });
          if (!options.continueOnError) {
            shouldBreak = true;
            break;
          }
        }
      }

      if (shouldBreak) break;

      // Throttle between batches
      if (throttleMs > 0 && i + BATCH_SIZE < notifications.length) {
        await this.delay(throttleMs);
      }
    }

    return {
      total: notifications.length,
      successful,
      failed,
      results,
    };
  }

  /**
   * Get customer notification preferences
   */
  async getCustomerPreferences(
    customerId: string,
    tenantId: string,
  ): Promise<{
    preferredChannel: NotificationChannel;
    bookingConfirmations: boolean;
    bookingReminders: boolean;
    invoiceNotifications: boolean;
    promotionalMessages: boolean;
  }> {
    const defaults = {
      preferredChannel: NotificationChannel.AUTO,
      bookingConfirmations: true,
      bookingReminders: true,
      invoiceNotifications: true,
      promotionalMessages: false,
    };

    try {
      const prefs = await this.prisma.customerNotificationPreference.findMany({
        where: { customerId },
      });

      if (prefs.length === 0) {
        return defaults;
      }

      // Derive preferences from per-channel records
      const smsEnabled = prefs.find(p => p.channel === 'SMS')?.enabled ?? true;
      const emailEnabled = prefs.find(p => p.channel === 'EMAIL')?.enabled ?? true;

      // Determine preferred channel from what's enabled
      let preferredChannel = NotificationChannel.AUTO;
      if (smsEnabled && !emailEnabled) preferredChannel = NotificationChannel.SMS;
      else if (!smsEnabled && emailEnabled) preferredChannel = NotificationChannel.EMAIL;
      else if (smsEnabled && emailEnabled) preferredChannel = NotificationChannel.AUTO;

      // Check customer marketing consent
      const customer = await this.prisma.customer.findFirst({
        where: { id: customerId, tenantId },
        select: { marketingConsent: true },
      });

      return {
        preferredChannel,
        bookingConfirmations: smsEnabled || emailEnabled,
        bookingReminders: smsEnabled || emailEnabled,
        invoiceNotifications: emailEnabled,
        promotionalMessages: customer?.marketingConsent ?? false,
      };
    } catch (error) {
      this.logger.warn(
        `Could not fetch preferences for customer ${customerId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return defaults;
    }
  }

  /**
   * Update customer notification preferences
   */
  async updateCustomerPreferences(
    customerId: string,
    tenantId: string,
    preferences: Record<string, unknown>,
  ): Promise<void> {
    // Update per-channel preferences
    if (preferences.preferredChannel !== undefined) {
      const preferred = String(preferences.preferredChannel).toUpperCase();
      const isValidChannel = preferred === 'SMS' || preferred === 'EMAIL';
      const isAuto = preferred === 'AUTO';

      if (isValidChannel || isAuto) {
        const channels = ['SMS', 'EMAIL'] as const;
        for (const ch of channels) {
          await this.prisma.customerNotificationPreference.upsert({
            where: { customerId_channel: { customerId, channel: ch } },
            update: { enabled: ch === preferred || isAuto },
            create: {
              customerId,
              channel: ch,
              enabled: ch === preferred || isAuto,
            },
          });
        }
      }
    }

    // Update marketing consent on customer record
    if (preferences.promotionalMessages !== undefined) {
      await this.prisma.customer.updateMany({
        where: { id: customerId, tenantId },
        data: {
          marketingConsent: preferences.promotionalMessages as boolean,
          marketingConsentAt: new Date(),
        },
      });
    }

    this.logger.log(`Updated preferences for customer ${customerId}`);
  }

  // Helper methods

  private determineChannel(
    customer: CustomerInfo,
    preference: NotificationChannel,
  ): NotificationChannel {
    if (preference !== NotificationChannel.AUTO) {
      return preference;
    }

    // Check customer preferences
    if (customer.notificationPreferences?.preferredChannel) {
      return customer.notificationPreferences.preferredChannel;
    }

    // Default: AUTO will be processed by trySmsFirst
    return NotificationChannel.AUTO;
  }

  private async getCustomerInfo(
    customerId: string,
    tenantId: string,
  ): Promise<CustomerInfo | null> {
    try {
      const customer = await this.prisma.withTenant(tenantId, async prisma => {
        return prisma.customer.findUnique({
          where: { id: customerId },
          select: {
            id: true,
            encryptedFirstName: true,
            encryptedLastName: true,
            encryptedEmail: true,
            encryptedPhone: true,
          },
        });
      });

      if (!customer) return null;

      const firstName = customer.encryptedFirstName
        ? await this.encryption.decrypt(customer.encryptedFirstName)
        : '';
      const lastName = customer.encryptedLastName
        ? await this.encryption.decrypt(customer.encryptedLastName)
        : '';
      const email = customer.encryptedEmail
        ? await this.encryption.decrypt(customer.encryptedEmail)
        : '';
      const phone = customer.encryptedPhone
        ? await this.encryption.decrypt(customer.encryptedPhone)
        : undefined;

      return {
        id: customer.id,
        name: `${firstName} ${lastName}`.trim() || 'Customer',
        email,
        phone,
      };
    } catch (error) {
      this.logger.error(
        `Error fetching customer: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return null;
    }
  }

  private async getWorkshopInfo(tenantId: string): Promise<WorkshopInfo> {
    try {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          name: true,
          settings: true,
        },
      });

      if (tenant) {
        const settings = (tenant.settings as Record<string, unknown>) || {};
        return {
          id: tenant.id,
          name: tenant.name || 'Officina',
          address: (settings.address as string) || '',
          phone: (settings.phone as string) || '',
        };
      }
    } catch (error) {
      this.logger.warn(
        `Could not fetch workshop info for tenant ${tenantId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    // Fallback defaults
    return {
      id: tenantId,
      name: 'Officina',
      address: '',
      phone: '',
    };
  }

  private async logNotification(
    _notificationId: string,
    customerId: string,
    tenantId: string,
    type: NotificationType,
    result: NotificationResult,
  ): Promise<void> {
    try {
      const typeMap: Record<string, PrismaNotificationType> = {
        [NotificationType.BOOKING_CONFIRMATION]: PrismaNotificationType.BOOKING_CONFIRMATION,
        [NotificationType.BOOKING_REMINDER]: PrismaNotificationType.BOOKING_REMINDER,
        [NotificationType.BOOKING_CANCELLED]: PrismaNotificationType.STATUS_UPDATE,
        [NotificationType.INVOICE_READY]: PrismaNotificationType.INVOICE_READY,
        [NotificationType.GDPR_EXPORT_READY]: PrismaNotificationType.STATUS_UPDATE,
        [NotificationType.WELCOME]: PrismaNotificationType.STATUS_UPDATE,
        [NotificationType.PASSWORD_RESET]: PrismaNotificationType.STATUS_UPDATE,
        [NotificationType.CUSTOM]: PrismaNotificationType.STATUS_UPDATE,
      };

      const channelMap: Record<string, PrismaNotificationChannel> = {
        [NotificationChannel.SMS]: PrismaNotificationChannel.SMS,
        [NotificationChannel.EMAIL]: PrismaNotificationChannel.EMAIL,
        [NotificationChannel.BOTH]: PrismaNotificationChannel.EMAIL,
        [NotificationChannel.AUTO]: PrismaNotificationChannel.SMS,
      };

      await this.prisma.notification.create({
        data: {
          customerId,
          tenantId,
          type: typeMap[type] || PrismaNotificationType.STATUS_UPDATE,
          channel: channelMap[result.channel] || PrismaNotificationChannel.EMAIL,
          status: result.success ? 'SENT' : 'FAILED',
          message: '',
          messageId: result.messageId ?? null,
          sentAt: result.success ? new Date() : null,
          failedAt: result.success ? null : new Date(),
          error: result.error ?? null,
          metadata: { fallbackUsed: result.fallbackUsed ?? false },
        },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to log notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
