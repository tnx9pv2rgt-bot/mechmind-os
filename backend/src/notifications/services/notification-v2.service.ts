/**
 * Notification Service v2
 * Enhanced service for SMS/WhatsApp/Email notifications with Twilio
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@common/services/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import twilio from 'twilio';
import type { Twilio } from 'twilio';
import { 
  Notification, 
  NotificationType, 
  NotificationChannel, 
  NotificationStatus,
  Customer,
} from '@prisma/client';

export interface CreateNotificationDTO {
  customerId: string;
  tenantId: string;
  type: NotificationType;
  channel: NotificationChannel;
  message?: string;
  metadata?: Record<string, any>;
  maxRetries?: number;
}

export interface NotificationResult {
  success: boolean;
  notificationId?: string;
  messageId?: string;
  error?: string;
}

export interface NotificationTemplateData {
  customerName: string;
  date?: string;
  time?: string;
  location?: string;
  status?: string;
  amount?: string;
  link?: string;
  service?: string;
  days?: number;
  score?: string;
  bookingCode?: string;
  workshopName?: string;
}

@Injectable()
export class NotificationV2Service {
  private readonly logger = new Logger(NotificationV2Service.name);
  private twilioClient: Twilio | null = null;
  private readonly fromPhone: string;
  private readonly fromWhatsApp: string;
  private readonly isEnabled: boolean;
  private readonly maxRetries: number = 3;
  private readonly retryDelay: number = 1000;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.fromPhone = this.configService.get<string>('TWILIO_PHONE_NUMBER', '');
    this.fromWhatsApp = this.configService.get<string>('TWILIO_WHATSAPP_NUMBER', this.fromPhone);
    this.isEnabled = this.configService.get<boolean>('ENABLE_SMS_NOTIFICATIONS', true);

    if (accountSid && authToken && this.fromPhone && this.isEnabled) {
      this.twilioClient = twilio(accountSid, authToken);
      this.logger.log('Twilio client initialized for Notification v2');
    } else {
      this.logger.warn('Twilio not configured or SMS notifications disabled');
    }
  }

  // ==========================================
  // CORE NOTIFICATION METHODS
  // ==========================================

  /**
   * Send SMS notification
   */
  async sendSMS(phone: string, message: string): Promise<string> {
    if (!this.twilioClient) {
      this.logger.warn(`[DEV] SMS to ${phone}: ${message.substring(0, 50)}...`);
      return 'mock-sms-id-' + Date.now();
    }

    const formattedPhone = this.formatPhoneNumber(phone);
    if (!formattedPhone) {
      throw new Error('Invalid phone number format');
    }

    try {
      const result = await this.twilioClient.messages.create({
        from: this.fromPhone,
        to: formattedPhone,
        body: message,
        statusCallback: this.configService.get<string>('TWILIO_STATUS_CALLBACK_URL'),
      });

      this.logger.log(`SMS sent: ${result.sid} to ${formattedPhone}`);
      return result.sid;
    } catch (error) {
      this.logger.error(`Failed to send SMS: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send WhatsApp notification
   */
  async sendWhatsApp(phone: string, message: string): Promise<string> {
    if (!this.twilioClient) {
      this.logger.warn(`[DEV] WhatsApp to ${phone}: ${message.substring(0, 50)}...`);
      return 'mock-whatsapp-id-' + Date.now();
    }

    const formattedPhone = this.formatPhoneNumber(phone);
    if (!formattedPhone) {
      throw new Error('Invalid phone number format');
    }

    try {
      const result = await this.twilioClient.messages.create({
        from: `whatsapp:${this.fromWhatsApp}`,
        to: `whatsapp:${formattedPhone}`,
        body: message,
        statusCallback: this.configService.get<string>('TWILIO_STATUS_CALLBACK_URL'),
      });

      this.logger.log(`WhatsApp sent: ${result.sid} to ${formattedPhone}`);
      return result.sid;
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp: ${error.message}`);
      throw error;
    }
  }

  /**
   * Queue notification for later processing
   */
  async queueNotification(data: CreateNotificationDTO): Promise<Notification> {
    // Generate message if not provided
    let message = data.message;
    if (!message) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: data.customerId },
      });
      if (!customer) {
        throw new Error(`Customer ${data.customerId} not found`);
      }
      // Message will be generated during processing
    }

    const notification = await this.prisma.notification.create({
      data: {
        customerId: data.customerId,
        tenantId: data.tenantId,
        type: data.type,
        channel: data.channel,
        status: NotificationStatus.PENDING,
        message: message || '', // Will be updated during processing
        metadata: data.metadata || {},
        maxRetries: data.maxRetries || this.maxRetries,
      },
    });

    this.logger.log(`Notification queued: ${notification.id}`);
    
    // Emit event for immediate processing if needed
    this.eventEmitter.emit('notification.queued', notification);
    
    return notification;
  }

  /**
   * Send notification immediately
   */
  async sendImmediate(data: CreateNotificationDTO): Promise<NotificationResult> {
    try {
      // Get customer data
      const customer = await this.prisma.customer.findUnique({
        where: { id: data.customerId },
      });

      if (!customer) {
        return { success: false, error: 'Customer not found' };
      }

      // Check channel preference
      const preference = await this.prisma.customerNotificationPreference.findUnique({
        where: {
          customerId_channel: {
            customerId: data.customerId,
            channel: data.channel,
          },
        },
      });

      if (preference && !preference.enabled) {
        return { success: false, error: 'Channel disabled by customer preference' };
      }

      // Decrypt phone number
      const phone = await this.decryptPhone(customer.encryptedPhone);

      // Generate message from template
      const message = data.message || this.generateMessage(data.type, 'it', {
        customerName: await this.getCustomerName(customer),
        ...data.metadata,
      });

      // Send based on channel
      let messageId: string;
      switch (data.channel) {
        case NotificationChannel.SMS:
          messageId = await this.sendSMS(phone, message);
          break;
        case NotificationChannel.WHATSAPP:
          messageId = await this.sendWhatsApp(phone, message);
          break;
        default:
          return { success: false, error: 'Unsupported channel' };
      }

      // Create notification record
      const notification = await this.prisma.notification.create({
        data: {
          customerId: data.customerId,
          tenantId: data.tenantId,
          type: data.type,
          channel: data.channel,
          status: NotificationStatus.SENT,
          message,
          messageId,
          sentAt: new Date(),
          metadata: data.metadata || {},
        },
      });

      // Emit event
      this.eventEmitter.emit('notification.sent', notification);

      return {
        success: true,
        notificationId: notification.id,
        messageId,
      };
    } catch (error) {
      this.logger.error(`Failed to send notification: ${error.message}`);
      
      // Create failed notification record
      const notification = await this.prisma.notification.create({
        data: {
          customerId: data.customerId,
          tenantId: data.tenantId,
          type: data.type,
          channel: data.channel,
          status: NotificationStatus.FAILED,
          message: data.message || '',
          error: error.message,
          metadata: data.metadata || {},
        },
      });

      return {
        success: false,
        notificationId: notification.id,
        error: error.message,
      };
    }
  }

  /**
   * Process pending notifications (called by cron job)
   */
  async processPending(): Promise<{ processed: number; failed: number }> {
    const pendingNotifications = await this.prisma.notification.findMany({
      where: {
        OR: [
          { status: NotificationStatus.PENDING },
          { 
            status: NotificationStatus.FAILED,
            retries: { lt: this.prisma.notification.fields.maxRetries },
          },
        ],
      },
      take: 100, // Process in batches
      orderBy: { createdAt: 'asc' },
      include: { customer: true },
    });

    let processed = 0;
    let failed = 0;

    for (const notification of pendingNotifications) {
      try {
        await this.processNotification(notification);
        processed++;
      } catch (error) {
        this.logger.error(`Failed to process notification ${notification.id}: ${error.message}`);
        await this.markFailed(notification.id, error.message);
        failed++;
      }
    }

    this.logger.log(`Processed ${processed} notifications, ${failed} failed`);
    return { processed, failed };
  }

  /**
   * Send batch notifications
   */
  async sendBatch(notifications: CreateNotificationDTO[]): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];
    
    for (const data of notifications) {
      const result = await this.sendImmediate(data);
      results.push(result);
      
      // Rate limiting - small delay between sends
      await this.delay(100);
    }

    return results;
  }

  // ==========================================
  // TEMPLATE METHODS
  // ==========================================

  /**
   * Get message template for notification type
   */
  getTemplate(type: NotificationType, lang: string = 'it'): (vars: NotificationTemplateData) => string {
    const templates = lang === 'en' ? this.getEnglishTemplates() : this.getItalianTemplates();
    return templates[type] || templates.STATUS_UPDATE;
  }

  /**
   * Generate message from template
   */
  generateMessage(type: NotificationType, lang: string, vars: NotificationTemplateData): string {
    const template = this.getTemplate(type, lang);
    return template(vars);
  }

  /**
   * Get available templates
   */
  getAvailableTemplates(): { type: NotificationType; name: string; description: string }[] {
    return [
      { type: NotificationType.BOOKING_REMINDER, name: 'Promemoria Appuntamento', description: 'Inviato 24h prima dell\'appuntamento' },
      { type: NotificationType.BOOKING_CONFIRMATION, name: 'Conferma Prenotazione', description: 'Inviato quando una prenotazione viene confermata' },
      { type: NotificationType.STATUS_UPDATE, name: 'Aggiornamento Stato', description: 'Aggiornamenti sullo stato del veicolo' },
      { type: NotificationType.INVOICE_READY, name: 'Fattura Pronta', description: 'Notifica quando la fattura è disponibile' },
      { type: NotificationType.MAINTENANCE_DUE, name: 'Manutenzione Dovuta', description: 'Promemoria manutenzione periodica' },
      { type: NotificationType.INSPECTION_COMPLETE, name: 'Ispezione Completata', description: 'Risultati ispezione digitale' },
      { type: NotificationType.PAYMENT_REMINDER, name: 'Promemoria Pagamento', description: 'Sollecito pagamento fattura' },
    ];
  }

  // ==========================================
  // STATUS & RETRY METHODS
  // ==========================================

  /**
   * Update notification status from Twilio webhook
   */
  async updateStatus(messageId: string, status: string): Promise<void> {
    const notificationStatus = this.mapTwilioStatus(status);
    
    await this.prisma.notification.updateMany({
      where: { messageId },
      data: {
        status: notificationStatus,
        ...(notificationStatus === NotificationStatus.DELIVERED && {
          deliveredAt: new Date(),
        }),
      },
    });

    this.logger.log(`Updated notification ${messageId} to ${notificationStatus}`);
  }

  /**
   * Retry failed notification
   */
  async retryNotification(notificationId: string): Promise<NotificationResult> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      include: { customer: true },
    });

    if (!notification) {
      return { success: false, error: 'Notification not found' };
    }

    if (notification.retries >= notification.maxRetries) {
      return { success: false, error: 'Max retries exceeded' };
    }

    // Reset status and increment retries
    await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.PENDING,
        retries: { increment: 1 },
        error: null,
      },
    });

    // Re-process
    return this.processNotification(notification);
  }

  /**
   * Get notification history for customer
   */
  async getHistory(
    customerId: string,
    options?: { limit?: number; offset?: number; type?: NotificationType },
  ): Promise<{ notifications: Notification[]; total: number }> {
    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: {
          customerId,
          ...(options?.type && { type: options.type }),
        },
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      this.prisma.notification.count({
        where: { customerId },
      }),
    ]);

    return { notifications, total };
  }

  // ==========================================
  // CUSTOMER PREFERENCES
  // ==========================================

  /**
   * Get customer notification preferences
   */
  async getPreferences(customerId: string): Promise<{ channel: NotificationChannel; enabled: boolean }[]> {
    const prefs = await this.prisma.customerNotificationPreference.findMany({
      where: { customerId },
    });

    // Return all channels with defaults if not set
    const allChannels = [NotificationChannel.SMS, NotificationChannel.WHATSAPP, NotificationChannel.EMAIL];
    return allChannels.map(channel => ({
      channel,
      enabled: prefs.find(p => p.channel === channel)?.enabled ?? true,
    }));
  }

  /**
   * Update customer notification preference
   */
  async updatePreference(
    customerId: string,
    channel: NotificationChannel,
    enabled: boolean,
  ): Promise<void> {
    await this.prisma.customerNotificationPreference.upsert({
      where: {
        customerId_channel: {
          customerId,
          channel,
        },
      },
      update: { enabled },
      create: {
        customerId,
        channel,
        enabled,
      },
    });
  }

  // ==========================================
  // PRIVATE HELPERS
  // ==========================================

  private async processNotification(notification: Notification & { customer: Customer }): Promise<NotificationResult> {
    const { customer, channel, type, message: existingMessage } = notification;

    // Decrypt phone
    const phone = await this.decryptPhone(customer.encryptedPhone);

    // Generate message if needed
    const message = existingMessage || this.generateMessage(type, 'it', {
      customerName: await this.getCustomerName(customer),
      ...((notification.metadata as any) || {}),
    });

    // Send based on channel
    let messageId: string;
    switch (channel) {
      case NotificationChannel.SMS:
        messageId = await this.sendSMS(phone, message);
        break;
      case NotificationChannel.WHATSAPP:
        messageId = await this.sendWhatsApp(phone, message);
        break;
      default:
        throw new Error('Unsupported channel');
    }

    // Update notification
    await this.prisma.notification.update({
      where: { id: notification.id },
      data: {
        status: NotificationStatus.SENT,
        messageId,
        sentAt: new Date(),
        message,
      },
    });

    this.eventEmitter.emit('notification.sent', { ...notification, status: NotificationStatus.SENT });

    return {
      success: true,
      notificationId: notification.id,
      messageId,
    };
  }

  private async markFailed(notificationId: string, error: string): Promise<void> {
    await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.FAILED,
        error,
        failedAt: new Date(),
      },
    });
  }

  private mapTwilioStatus(twilioStatus: string): NotificationStatus {
    switch (twilioStatus.toLowerCase()) {
      case 'delivered':
      case 'read':
        return NotificationStatus.DELIVERED;
      case 'sent':
      case 'queued':
      case 'sending':
        return NotificationStatus.SENT;
      case 'failed':
      case 'undelivered':
        return NotificationStatus.FAILED;
      default:
        return NotificationStatus.PENDING;
    }
  }

  private formatPhoneNumber(phone: string): string | null {
    let cleaned = phone.replace(/[^\d+]/g, '');

    if (!cleaned.startsWith('+')) {
      if (cleaned.startsWith('00')) {
        cleaned = '+' + cleaned.substring(2);
      } else if (cleaned.startsWith('3')) {
        cleaned = '+' + cleaned;
      } else if (cleaned.startsWith('0')) {
        cleaned = '+39' + cleaned;
      } else {
        cleaned = '+39' + cleaned;
      }
    }

    const e164Regex = /^\+[1-9]\d{1,14}$/;
    if (!e164Regex.test(cleaned)) {
      return null;
    }

    return cleaned;
  }

  private async decryptPhone(encryptedPhone: string): Promise<string> {
    // TODO: Implement actual decryption using EncryptionService
    // For now, assume phone is stored in plain text format for testing
    return encryptedPhone;
  }

  private async getCustomerName(customer: Customer): Promise<string> {
    // TODO: Decrypt first name
    return 'Cliente';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getItalianTemplates(): Record<NotificationType, (vars: NotificationTemplateData) => string> {
    return {
      [NotificationType.BOOKING_REMINDER]: (v) =>
        `Ciao ${v.customerName}, ti ricordiamo l'appuntamento domani ${v.date} alle ${v.time}${v.location ? ` presso ${v.location}` : ''}. Conferma o modifica: ${v.link || 'https://mechmind.io/portal'}`,
      
      [NotificationType.BOOKING_CONFIRMATION]: (v) =>
        `Ciao ${v.customerName}, appuntamento confermato per ${v.date} alle ${v.time}${v.workshopName ? ` da ${v.workshopName}` : ''}${v.bookingCode ? ` (Codice: ${v.bookingCode})` : ''}. Ti aspettiamo!`,
      
      [NotificationType.STATUS_UPDATE]: (v) =>
        `Ciao ${v.customerName}, aggiornamento: ${v.status || 'in lavorazione'}. ${v.link ? `Dettagli: ${v.link}` : ''}`,
      
      [NotificationType.INVOICE_READY]: (v) =>
        `Ciao ${v.customerName}, fattura pronta. Importo: ${v.amount || 'N/D'}. Visualizza: ${v.link || 'https://mechmind.io/portal'}`,
      
      [NotificationType.MAINTENANCE_DUE]: (v) =>
        `Ciao ${v.customerName}, ${v.service || 'manutenzione'} dovuta tra ${v.days || 'pochi'} giorni. Prenota: ${v.link || 'https://mechmind.io/portal'}`,
      
      [NotificationType.INSPECTION_COMPLETE]: (v) =>
        `Ciao ${v.customerName}, ispezione completata!${v.score ? ` Score: ${v.score}/10` : ''}${v.link ? `. Report: ${v.link}` : ''}`,
      
      [NotificationType.PAYMENT_REMINDER]: (v) =>
        `Ciao ${v.customerName}, promemoria pagamento fattura ${v.amount ? `di ${v.amount}` : ''}. Paga qui: ${v.link || 'https://mechmind.io/portal'}`,
    };
  }

  private getEnglishTemplates(): Record<NotificationType, (vars: NotificationTemplateData) => string> {
    return {
      [NotificationType.BOOKING_REMINDER]: (v) =>
        `Hi ${v.customerName}, reminder: your appointment is tomorrow ${v.date} at ${v.time}${v.location ? ` at ${v.location}` : ''}. Confirm or modify: ${v.link || 'https://mechmind.io/portal'}`,
      
      [NotificationType.BOOKING_CONFIRMATION]: (v) =>
        `Hi ${v.customerName}, appointment confirmed for ${v.date} at ${v.time}${v.workshopName ? ` at ${v.workshopName}` : ''}${v.bookingCode ? ` (Code: ${v.bookingCode})` : ''}. See you soon!`,
      
      [NotificationType.STATUS_UPDATE]: (v) =>
        `Hi ${v.customerName}, status update: ${v.status || 'in progress'}. ${v.link ? `Details: ${v.link}` : ''}`,
      
      [NotificationType.INVOICE_READY]: (v) =>
        `Hi ${v.customerName}, your invoice is ready. Amount: ${v.amount || 'N/A'}. View: ${v.link || 'https://mechmind.io/portal'}`,
      
      [NotificationType.MAINTENANCE_DUE]: (v) =>
        `Hi ${v.customerName}, ${v.service || 'maintenance'} due in ${v.days || 'a few'} days. Book: ${v.link || 'https://mechmind.io/portal'}`,
      
      [NotificationType.INSPECTION_COMPLETE]: (v) =>
        `Hi ${v.customerName}, inspection completed!${v.score ? ` Score: ${v.score}/10` : ''}${v.link ? `. Report: ${v.link}` : ''}`,
      
      [NotificationType.PAYMENT_REMINDER]: (v) =>
        `Hi ${v.customerName}, payment reminder${v.amount ? ` for ${v.amount}` : ''}. Pay here: ${v.link || 'https://mechmind.io/portal'}`,
    };
  }
}
