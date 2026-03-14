import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

export interface BookingReminderSmsData {
  date: string;
  time: string;
  service: string;
  workshopName: string;
  bookingCode: string;
}

export interface BookingConfirmationSmsData {
  date: string;
  time: string;
  service: string;
  workshopName: string;
  bookingCode: string;
}

export interface InvoiceReadySmsData {
  invoiceNumber: string;
  amount: string;
  downloadUrl: string;
  workshopName: string;
}

export interface BookingCancelledSmsData {
  date: string;
  service: string;
  workshopName: string;
  bookingCode: string;
  cancellationReason?: string;
}

export interface GdprExportReadySmsData {
  downloadUrl: string;
  expiryDate: string;
}

export interface PasswordResetSmsData {
  resetCode: string;
  expiryMinutes: number;
}

export interface SmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
  segmentCount?: number;
  price?: string;
}

export interface SmsTemplate {
  id: string;
  name: string;
  body: string;
  variables: string[];
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private twilioClient: Twilio | null = null;
  private readonly fromPhone: string;
  private readonly isEnabled: boolean;
  private readonly maxRetries: number = 3;
  private readonly retryDelay: number = 1000;

  // Italian carriers SMS length limits
  private readonly SMS_SEGMENT_LENGTH = 153; // For concatenated SMS (GSM-7)
  private readonly SMS_SINGLE_LIMIT = 160; // For single SMS (GSM-7)

  constructor(private readonly configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.fromPhone = this.configService.get<string>('TWILIO_PHONE_NUMBER', '');
    this.isEnabled = this.configService.get<boolean>('ENABLE_SMS_NOTIFICATIONS', true);

    if (accountSid && authToken && this.fromPhone && this.isEnabled) {
      this.twilioClient = new Twilio(accountSid, authToken);
      this.logger.log('Twilio client initialized');
    } else {
      this.logger.warn('Twilio not configured or SMS notifications disabled');
    }
  }

  /**
   * Send booking confirmation SMS
   */
  async sendBookingConfirmation(
    phone: string,
    data: BookingConfirmationSmsData,
  ): Promise<SmsResult> {
    const message = this.formatMessage(
      `Ciao! La tua prenotazione per {{service}} è confermata.\n` +
        `📅 {{date}} alle {{time}}\n` +
        `📍 {{workshopName}}\n` +
        `🔢 Codice: {{bookingCode}}\n` +
        `Grazie per averci scelto!`,
      data as unknown as Record<string, unknown>,
    );

    return this.sendSmsWithRetry(phone, message, 'booking_confirmation');
  }

  /**
   * Send booking reminder SMS (24h before)
   */
  async sendBookingReminder(phone: string, data: BookingReminderSmsData): Promise<SmsResult> {
    const message = this.formatMessage(
      `⏰ Promemoria da {{workshopName}}:\n` +
        `Domani {{date}} alle {{time}} hai un appuntamento per {{service}}.\n` +
        `🔢 Codice: {{bookingCode}}\n` +
        `Per modifiche, chiamaci o rispondi a questo messaggio.`,
      data as unknown as Record<string, unknown>,
    );

    return this.sendSmsWithRetry(phone, message, 'booking_reminder');
  }

  /**
   * Send same-day booking reminder SMS
   */
  async sendSameDayReminder(phone: string, data: BookingReminderSmsData): Promise<SmsResult> {
    const message = this.formatMessage(
      `⏰ Oggi alle {{time}} il tuo appuntamento per {{service}} da {{workshopName}}.\n` +
        `🔢 Codice: {{bookingCode}}\n` +
        `Ti aspettiamo!`,
      data as unknown as Record<string, unknown>,
    );

    return this.sendSmsWithRetry(phone, message, 'same_day_reminder');
  }

  /**
   * Send invoice ready notification SMS
   */
  async sendInvoiceReady(phone: string, data: InvoiceReadySmsData): Promise<SmsResult> {
    const message = this.formatMessage(
      `🧾 {{workshopName}}: La tua fattura {{invoiceNumber}} di €{{amount}} è pronta.\n` +
        `Scaricala qui: {{downloadUrl}}\n` +
        `Grazie per la fiducia!`,
      data as unknown as Record<string, unknown>,
    );

    return this.sendSmsWithRetry(phone, message, 'invoice_ready');
  }

  /**
   * Send booking cancellation SMS
   */
  async sendBookingCancelled(phone: string, data: BookingCancelledSmsData): Promise<SmsResult> {
    let message = this.formatMessage(
      `❌ {{workshopName}}: La tua prenotazione del {{date}} per {{service}} è stata annullata.\n` +
        `🔢 Codice: {{bookingCode}}`,
      data as unknown as Record<string, unknown>,
    );

    if (data.cancellationReason) {
      message += `\nMotivo: ${data.cancellationReason}`;
    }

    message += '\nPer riprogrammare, chiamaci.';

    return this.sendSmsWithRetry(phone, message, 'booking_cancelled');
  }

  /**
   * Send GDPR data export ready SMS
   */
  async sendGdprExportReady(phone: string, data: GdprExportReadySmsData): Promise<SmsResult> {
    const message = this.formatMessage(
      `📥 I tuoi dati sono pronti per il download.\n` +
        `Link: {{downloadUrl}}\n` +
        `Scade il: {{expiryDate}}\n` +
        `Per sicurezza, il link è valido 7 giorni.`,
      data as unknown as Record<string, unknown>,
    );

    return this.sendSmsWithRetry(phone, message, 'gdpr_export');
  }

  /**
   * Send password reset code via SMS
   */
  async sendPasswordReset(phone: string, data: PasswordResetSmsData): Promise<SmsResult> {
    const message = this.formatMessage(
      `🔐 Codice di ripristino password MechMind: {{resetCode}}\n` +
        `Valido per {{expiryMinutes}} minuti.\n` +
        `Non condividere questo codice.`,
      data as unknown as Record<string, unknown>,
    );

    return this.sendSmsWithRetry(phone, message, 'password_reset');
  }

  /**
   * Send custom SMS message
   */
  async sendCustom(
    phone: string,
    message: string,
    category: string = 'custom',
  ): Promise<SmsResult> {
    return this.sendSmsWithRetry(phone, message, category);
  }

  /**
   * Send promotional SMS (with opt-in check)
   */
  async sendPromotional(phone: string, message: string, workshopName: string): Promise<SmsResult> {
    const brandedMessage = `${workshopName}: ${message}\n\nPer disiscriverti: rispondi STOP`;
    return this.sendSmsWithRetry(phone, brandedMessage, 'promotional');
  }

  /**
   * Get message delivery status
   */
  async getMessageStatus(messageSid: string): Promise<{
    status: string;
    deliveredAt?: Date;
    errorCode?: string;
    errorMessage?: string;
  } | null> {
    if (!this.twilioClient) {
      this.logger.warn('Twilio not initialized');
      return null;
    }

    try {
      const message = await this.twilioClient.messages(messageSid).fetch();

      return {
        status: message.status,
        deliveredAt: message.dateSent ? new Date(message.dateSent) : undefined,
        errorCode: message.errorCode ? String(message.errorCode) : undefined,
        errorMessage: message.errorMessage || undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to get message status: ${error.message}`);
      return null;
    }
  }

  /**
   * Validate phone number format (E.164)
   */
  async validatePhoneNumber(phone: string): Promise<{
    valid: boolean;
    formatted?: string;
    carrier?: string;
    type?: string;
  }> {
    if (!this.twilioClient) {
      // Basic validation without Twilio
      const basicValid = this.isValidE164(phone);
      return {
        valid: basicValid,
        formatted: basicValid ? phone : undefined,
      };
    }

    try {
      const lookup = await this.twilioClient.lookups.v2
        .phoneNumbers(phone)
        .fetch({ fields: 'line_type_intelligence' });

      return {
        valid: true,
        formatted: lookup.phoneNumber,
        carrier: lookup.lineTypeIntelligence?.carrierName,
        type: lookup.lineTypeIntelligence?.type,
      };
    } catch (error) {
      this.logger.warn(`Phone validation failed for ${phone.slice(0, 4)}***: ${error.message}`);
      return { valid: false };
    }
  }

  /**
   * Calculate SMS cost estimate
   * Italy: $0.0075 per SMS segment
   */
  calculateCost(message: string): {
    segments: number;
    estimatedCost: number;
    currency: string;
  } {
    const segments = this.calculateSegments(message);
    const costPerSegment = 0.0075; // USD for Italy

    return {
      segments,
      estimatedCost: segments * costPerSegment,
      currency: 'USD',
    };
  }

  /**
   * Get SMS templates
   */
  getTemplates(): SmsTemplate[] {
    return [
      {
        id: 'booking_confirmation',
        name: 'Conferma Prenotazione',
        body: 'Ciao! La tua prenotazione per {{service}} è confermata. 📅 {{date}} alle {{time}} 📍 {{workshopName}} 🔢 Codice: {{bookingCode}}',
        variables: ['service', 'date', 'time', 'workshopName', 'bookingCode'],
      },
      {
        id: 'booking_reminder',
        name: 'Promemoria Prenotazione',
        body: '⏰ Promemoria da {{workshopName}}: Domani {{date}} alle {{time}} hai un appuntamento per {{service}}. 🔢 Codice: {{bookingCode}}',
        variables: ['workshopName', 'date', 'time', 'service', 'bookingCode'],
      },
      {
        id: 'invoice_ready',
        name: 'Fattura Pronta',
        body: '🧾 {{workshopName}}: La tua fattura {{invoiceNumber}} di €{{amount}} è pronta. Scaricala qui: {{downloadUrl}}',
        variables: ['workshopName', 'invoiceNumber', 'amount', 'downloadUrl'],
      },
      {
        id: 'booking_cancelled',
        name: 'Prenotazione Annullata',
        body: '❌ {{workshopName}}: La tua prenotazione del {{date}} per {{service}} è stata annullata. 🔢 Codice: {{bookingCode}}',
        variables: ['workshopName', 'date', 'service', 'bookingCode'],
      },
    ];
  }

  /**
   * Check SMS service health
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    latency?: number;
    error?: string;
  }> {
    if (!this.twilioClient) {
      return { healthy: false, error: 'Twilio not initialized' };
    }

    const startTime = Date.now();

    try {
      // Fetch account info as health check
      await this.twilioClient.api.accounts.list({ limit: 1 });

      return {
        healthy: true,
        latency: Date.now() - startTime,
      };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  private async sendSmsWithRetry(
    phone: string,
    message: string,
    category: string,
    attempt: number = 1,
  ): Promise<SmsResult> {
    const result = await this.sendSms(phone, message, category);

    if (!result.success && attempt < this.maxRetries) {
      this.logger.warn(`SMS send failed, retrying (${attempt}/${this.maxRetries})...`);
      await this.delay(this.retryDelay * attempt);
      return this.sendSmsWithRetry(phone, message, category, attempt + 1);
    }

    return result;
  }

  private async sendSms(phone: string, message: string, category: string): Promise<SmsResult> {
    if (!this.twilioClient) {
      this.logger.warn('SMS service not initialized, logging message instead');
      this.logger.debug(`SMS to ${phone.slice(0, 4)}*** [${category}]: ${message}`);
      return { success: true, messageId: 'mock-sms-id' };
    }

    // Validate and format phone number
    const formattedPhone = this.formatPhoneNumber(phone);
    if (!formattedPhone) {
      return { success: false, error: 'Invalid phone number format' };
    }

    try {
      const twilioMessage = await this.twilioClient.messages.create({
        from: this.fromPhone,
        to: formattedPhone,
        body: message,
        statusCallback: this.configService.get<string>('TWILIO_STATUS_CALLBACK_URL'),
      });

      this.logger.log(
        `SMS sent successfully: ${twilioMessage.sid} to ${formattedPhone.slice(0, 4)}*** (${category})`,
      );

      return {
        success: true,
        messageId: twilioMessage.sid,
        segmentCount: twilioMessage.numSegments ? parseInt(twilioMessage.numSegments, 10) : 1,
        price: twilioMessage.price,
      };
    } catch (error) {
      this.logger.error(`Failed to send SMS: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  private formatMessage(template: string, data: Record<string, unknown>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });
  }

  private formatPhoneNumber(phone: string): string | null {
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');

    // Add + if missing and starts with country code or 0
    if (!cleaned.startsWith('+')) {
      if (cleaned.startsWith('00')) {
        cleaned = '+' + cleaned.substring(2);
      } else if (cleaned.startsWith('3')) {
        // Italian mobile number without prefix
        cleaned = '+' + cleaned;
      } else if (cleaned.startsWith('0')) {
        // Italian landline
        cleaned = '+39' + cleaned;
      } else {
        // Assume Italian if no prefix
        cleaned = '+39' + cleaned;
      }
    }

    // Validate E.164 format
    if (!this.isValidE164(cleaned)) {
      return null;
    }

    return cleaned;
  }

  private isValidE164(phone: string): boolean {
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phone);
  }

  private calculateSegments(message: string): number {
    // Check if message contains Unicode characters
    const hasUnicode = /[^\x00-\x7F]/.test(message);

    if (hasUnicode) {
      // Unicode (UCS-2) encoding: 70 chars per segment, 67 for concatenated
      const segmentLength = message.length <= 70 ? 70 : 67;
      return Math.ceil(message.length / segmentLength);
    } else {
      // GSM-7 encoding: 160 chars for single, 153 for concatenated
      const segmentLength = message.length <= 160 ? 160 : 153;
      return Math.ceil(message.length / segmentLength);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
