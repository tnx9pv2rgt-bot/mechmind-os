import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@common/services/prisma.service';
import { EmailService, BookingConfirmationData, InvoiceReadyData, GdprDataExportData, WelcomeData, PasswordResetData, BookingReminderData, BookingCancelledData } from '../email/email.service';
import { SmsService, BookingConfirmationSmsData, BookingReminderSmsData, InvoiceReadySmsData, BookingCancelledSmsData } from '../sms/sms.service';
import { NotificationType, NotificationChannel, NotificationPriority, SendNotificationDto } from '../dto/send-notification.dto';

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
    [key: string]: any;
  };
}

interface WorkshopInfo {
  id: string;
  name: string;
  address: string;
  phone: string;
}

interface NotificationResult {
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
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    @InjectQueue('notification-queue') private readonly notificationQueue: Queue,
  ) {}

  /**
   * Main method to send notifications with automatic fallback logic
   * Priority: SMS -> Email (if SMS fails or not available)
   */
  async notifyCustomer(
    customerId: string,
    tenantId: string,
    type: NotificationType,
    data: Record<string, any>,
    channelPreference: NotificationChannel = NotificationChannel.AUTO,
  ): Promise<NotificationResult> {
    const notificationId = this.generateId();
    
    this.logger.log(
      `[${notificationId}] Sending ${type} notification to customer ${customerId} (channel: ${channelPreference})`,
    );

    // Get customer info
    const customer = await this.getCustomerInfo(customerId, tenantId);
    if (!customer) {
      throw new Error(`Customer ${customerId} not found`);
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
        new NotificationSentEvent(
          notificationId,
          customerId,
          tenantId,
          type,
          result.channel,
          true,
        ),
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
    data: Record<string, any>,
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

      this.logger.warn(`[${notificationId}] SMS failed, attempting email fallback: ${smsResult.error}`);
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
    data: Record<string, any>,
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
    data: Record<string, any>,
    notificationId: string,
  ): Promise<NotificationResult> {
    this.logger.log(`[${notificationId}] Sending both SMS and Email notifications`);

    const results = await Promise.allSettled([
      customer.phone ? this.sendSmsNotification(customer, workshop, type, data) : Promise.resolve({ success: false, error: 'No phone' }),
      customer.email ? this.sendEmailNotification(customer, workshop, type, data) : Promise.resolve({ success: false, error: 'No email' }),
    ]);

    const smsResult = results[0].status === 'fulfilled' ? results[0].value : { success: false, error: 'SMS promise rejected' };
    const emailResult = results[1].status === 'fulfilled' ? results[1].value : { success: false, error: 'Email promise rejected' };

    const success = smsResult.success || emailResult.success;
    
    return {
      success,
      channel: NotificationChannel.BOTH,
      messageId: smsResult.success ? smsResult.messageId : emailResult.messageId,
      error: !success ? `SMS: ${smsResult.error}, Email: ${emailResult.error}` : undefined,
    };
  }

  /**
   * Send SMS notification based on type
   */
  private async sendSmsNotification(
    customer: CustomerInfo,
    workshop: WorkshopInfo,
    type: NotificationType,
    data: Record<string, any>,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!customer.phone) {
      return { success: false, error: 'No phone number' };
    }

    try {
      switch (type) {
        case NotificationType.BOOKING_CONFIRMATION:
          return await this.smsService.sendBookingConfirmation(customer.phone, {
            date: data.date,
            time: data.time,
            service: data.service,
            workshopName: workshop.name,
            bookingCode: data.bookingCode,
          });

        case NotificationType.BOOKING_REMINDER:
          return await this.smsService.sendBookingReminder(customer.phone, {
            date: data.date,
            time: data.time,
            service: data.service,
            workshopName: workshop.name,
            bookingCode: data.bookingCode,
          });

        case NotificationType.BOOKING_CANCELLED:
          return await this.smsService.sendBookingCancelled(customer.phone, {
            date: data.date,
            service: data.service,
            workshopName: workshop.name,
            bookingCode: data.bookingCode,
            cancellationReason: data.cancellationReason,
          });

        case NotificationType.INVOICE_READY:
          return await this.smsService.sendInvoiceReady(customer.phone, {
            invoiceNumber: data.invoiceNumber,
            amount: data.amount,
            downloadUrl: data.downloadUrl,
            workshopName: workshop.name,
          });

        default:
          // For unsupported types, return failure to trigger fallback
          return { success: false, error: `SMS not supported for type: ${type}` };
      }
    } catch (error) {
      this.logger.error(`SMS sending failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send Email notification based on type
   */
  private async sendEmailNotification(
    customer: CustomerInfo,
    workshop: WorkshopInfo,
    type: NotificationType,
    data: Record<string, any>,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!customer.email) {
      return { success: false, error: 'No email address' };
    }

    try {
      switch (type) {
        case NotificationType.BOOKING_CONFIRMATION:
          return await this.emailService.sendBookingConfirmation({
            customerName: customer.name,
            customerEmail: customer.email,
            service: data.service,
            date: data.date,
            time: data.time,
            vehicle: data.vehicle,
            bookingCode: data.bookingCode,
            workshopName: workshop.name,
            workshopAddress: workshop.address,
            workshopPhone: workshop.phone,
            notes: data.notes,
          });

        case NotificationType.BOOKING_REMINDER:
          return await this.emailService.sendBookingReminder({
            customerName: customer.name,
            customerEmail: customer.email,
            service: data.service,
            date: data.date,
            time: data.time,
            vehicle: data.vehicle,
            bookingCode: data.bookingCode,
            workshopName: workshop.name,
            workshopAddress: workshop.address,
          });

        case NotificationType.BOOKING_CANCELLED:
          return await this.emailService.sendBookingCancelled({
            customerName: customer.name,
            customerEmail: customer.email,
            service: data.service,
            date: data.date,
            bookingCode: data.bookingCode,
            workshopName: workshop.name,
            cancellationReason: data.cancellationReason,
          });

        case NotificationType.INVOICE_READY:
          return await this.emailService.sendInvoiceReady({
            customerName: customer.name,
            customerEmail: customer.email,
            invoiceNumber: data.invoiceNumber,
            invoiceDate: data.invoiceDate,
            amount: data.amount,
            downloadUrl: data.downloadUrl,
            workshopName: workshop.name,
          });

        case NotificationType.GDPR_EXPORT_READY:
          return await this.emailService.sendGdprDataExport({
            customerName: customer.name,
            customerEmail: customer.email,
            downloadUrl: data.downloadUrl,
            expiryDate: data.expiryDate,
            requestId: data.requestId,
          });

        case NotificationType.WELCOME:
          return await this.emailService.sendWelcome({
            customerName: customer.name,
            customerEmail: customer.email,
            workshopName: workshop.name,
            loginUrl: data.loginUrl,
          });

        case NotificationType.PASSWORD_RESET:
          return await this.emailService.sendPasswordReset({
            customerName: customer.name,
            customerEmail: customer.email,
            resetUrl: data.resetUrl,
            expiryHours: data.expiryHours || 24,
          });

        default:
          return { success: false, error: `Email not supported for type: ${type}` };
      }
    } catch (error) {
      this.logger.error(`Email sending failed: ${error.message}`);
      return { success: false, error: error.message };
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
    
    const job = await this.notificationQueue.add(
      'send-notification',
      dto,
      {
        jobId,
        delay: delayMs,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    );

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

    const throttleMs = options.throttleMs || 100;

    for (const notification of notifications) {
      try {
        const result = await this.notifyCustomer(
          notification.customerId,
          notification.tenantId,
          notification.type,
          notification.data,
          notification.channel,
        );

        results.push(result);

        if (result.success) {
          successful++;
        } else {
          failed++;
          if (!options.continueOnError) {
            break;
          }
        }

        // Throttle
        if (throttleMs > 0) {
          await this.delay(throttleMs);
        }
      } catch (error) {
        failed++;
        results.push({
          success: false,
          channel: notification.channel,
          error: error.message,
        });

        if (!options.continueOnError) {
          break;
        }
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
  async getCustomerPreferences(customerId: string, tenantId: string): Promise<{
    preferredChannel: NotificationChannel;
    bookingConfirmations: boolean;
    bookingReminders: boolean;
    invoiceNotifications: boolean;
    promotionalMessages: boolean;
  }> {
    // Default preferences
    const defaults = {
      preferredChannel: NotificationChannel.AUTO,
      bookingConfirmations: true,
      bookingReminders: true,
      invoiceNotifications: true,
      promotionalMessages: false,
    };

    try {
      // Query from database if preferences are stored
      // This would typically query a notification_preferences table
      return defaults;
    } catch (error) {
      this.logger.warn(`Could not fetch preferences for customer ${customerId}`);
      return defaults;
    }
  }

  /**
   * Update customer notification preferences
   */
  async updateCustomerPreferences(
    customerId: string,
    tenantId: string,
    preferences: Partial<ReturnType<typeof this.getCustomerPreferences>>,
  ): Promise<void> {
    // Implementation would update database
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
      const customer = await this.prisma.withTenant(tenantId, async (prisma) => {
        return prisma.customer.findUnique({
          where: { id: customerId },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        });
      });

      if (!customer) return null;

      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone || undefined,
      };
    } catch (error) {
      this.logger.error(`Error fetching customer: ${error.message}`);
      return null;
    }
  }

  private async getWorkshopInfo(tenantId: string): Promise<WorkshopInfo> {
    // In a real implementation, fetch from database
    // For now, return mock data
    return {
      id: tenantId,
      name: 'Officia Meccanica',
      address: 'Via Roma 123, Milano',
      phone: '+39 02 1234567',
    };
  }

  private async logNotification(
    notificationId: string,
    customerId: string,
    tenantId: string,
    type: NotificationType,
    result: NotificationResult,
  ): Promise<void> {
    // Log to database for analytics and audit
    // This would typically insert into a notifications table
    this.logger.debug(
      `[${notificationId}] Logged: ${type} to ${customerId} via ${result.channel} - ${result.success ? 'success' : 'failed'}`,
    );
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
