import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface BookingConfirmationData {
  customerName: string;
  customerEmail: string;
  service: string;
  date: string;
  time: string;
  vehicle: string;
  bookingCode: string;
  workshopName: string;
  workshopAddress: string;
  workshopPhone: string;
  notes?: string;
}

export interface BookingReminderData {
  customerName: string;
  customerEmail: string;
  service: string;
  date: string;
  time: string;
  vehicle: string;
  bookingCode: string;
  workshopName: string;
  workshopAddress: string;
}

export interface InvoiceReadyData {
  customerName: string;
  customerEmail: string;
  invoiceNumber: string;
  invoiceDate: string;
  amount: string;
  downloadUrl: string;
  workshopName: string;
}

export interface GdprDataExportData {
  customerName: string;
  customerEmail: string;
  downloadUrl: string;
  expiryDate: string;
  requestId: string;
}

export interface WelcomeData {
  customerName: string;
  customerEmail: string;
  workshopName: string;
  loginUrl: string;
}

export interface PasswordResetData {
  customerName: string;
  customerEmail: string;
  resetUrl: string;
  expiryHours: number;
}

export interface BookingCancelledData {
  customerName: string;
  customerEmail: string;
  service: string;
  date: string;
  bookingCode: string;
  workshopName: string;
  cancellationReason?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly isEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.isEnabled = this.configService.get<boolean>('ENABLE_EMAIL_NOTIFICATIONS', false);
    this.fromEmail = this.configService.get<string>('EMAIL_FROM_ADDRESS', 'noreply@mechmind.io');
    this.fromName = this.configService.get<string>('EMAIL_FROM_NAME', 'MechMind');

    if (apiKey && this.isEnabled) {
      this.resend = new Resend(apiKey);
      this.logger.log('Resend client initialized');
    } else {
      this.logger.debug('Resend API key not configured or email notifications disabled');
    }
  }

  /**
   * Send booking confirmation email
   */
  async sendBookingConfirmation(data: BookingConfirmationData): Promise<EmailResult> {
    const subject = `✅ Prenotazione Confermata - ${data.bookingCode}`;
    const html = this.getBookingConfirmationHtml(data);

    return await this.sendEmail({
      to: data.customerEmail,
      subject,
      html,
      tags: [{ name: 'category', value: 'booking_confirmation' }],
    });
  }

  /**
   * Send booking reminder email
   */
  async sendBookingReminder(data: BookingReminderData): Promise<EmailResult> {
    const subject = `⏰ Promemoria Appuntamento - ${data.bookingCode}`;
    const html = this.getBookingReminderHtml(data);

    return await this.sendEmail({
      to: data.customerEmail,
      subject,
      html,
      tags: [{ name: 'category', value: 'booking_reminder' }],
    });
  }

  /**
   * Send invoice ready notification
   */
  async sendInvoiceReady(data: InvoiceReadyData): Promise<EmailResult> {
    const subject = `🧾 Fattura Disponibile - ${data.invoiceNumber}`;
    const html = this.getInvoiceReadyHtml(data);

    return await this.sendEmail({
      to: data.customerEmail,
      subject,
      html,
      tags: [{ name: 'category', value: 'invoice_ready' }],
    });
  }

  /**
   * Send GDPR data export notification
   */
  async sendGdprDataExport(data: GdprDataExportData): Promise<EmailResult> {
    const subject = `📥 Esportazione Dati Personale - Richiesta ${data.requestId}`;
    const html = this.getGdprExportHtml(data);

    return await this.sendEmail({
      to: data.customerEmail,
      subject,
      html,
      tags: [{ name: 'category', value: 'gdpr_export' }],
    });
  }

  /**
   * Send welcome email to new customers
   */
  async sendWelcome(data: WelcomeData): Promise<EmailResult> {
    const subject = `👋 Benvenuto su ${data.workshopName}`;
    const html = this.getWelcomeHtml(data);

    return await this.sendEmail({
      to: data.customerEmail,
      subject,
      html,
      tags: [{ name: 'category', value: 'welcome' }],
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(data: PasswordResetData): Promise<EmailResult> {
    const subject = '🔐 Reimposta la tua password';
    const html = this.getPasswordResetHtml(data);

    return await this.sendEmail({
      to: data.customerEmail,
      subject,
      html,
      tags: [{ name: 'category', value: 'password_reset' }],
    });
  }

  /**
   * Send booking cancellation email
   */
  async sendBookingCancelled(data: BookingCancelledData): Promise<EmailResult> {
    const subject = `❌ Prenotazione Annullata - ${data.bookingCode}`;
    const html = this.getBookingCancelledHtml(data);

    return await this.sendEmail({
      to: data.customerEmail,
      subject,
      html,
      tags: [{ name: 'category', value: 'booking_cancelled' }],
    });
  }

  /**
   * Send raw email (low level)
   */
  async sendRawEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    tags?: { name: string; value: string }[];
  }): Promise<EmailResult> {
    return this.sendEmail(options);
  }

  /**
   * Get email delivery status
   */
  async getEmailStatus(emailId: string): Promise<{ status: string; deliveredAt?: Date } | null> {
    if (!this.resend) {
      this.logger.warn('Resend not initialized');
      return null;
    }

    try {
      const { data, error } = await this.resend.emails.get(emailId);

      if (error) {
        this.logger.error(`Failed to get email status: ${error.message}`);
        return null;
      }

      return {
        status: data?.last_event || 'unknown',
        deliveredAt: (data as unknown as Record<string, unknown>)?.delivered_at
          ? new Date(String((data as unknown as Record<string, unknown>).delivered_at))
          : undefined,
      };
    } catch (error) {
      this.logger.error(
        `Error getting email status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return null;
    }
  }

  /**
   * Verify domain configuration
   */
  async verifyDomain(domain: string): Promise<{ valid: boolean; records?: unknown[] }> {
    if (!this.resend) {
      return { valid: false };
    }

    try {
      const { data, error } = await this.resend.domains.verify(domain);

      if (error) {
        this.logger.error(`Domain verification failed: ${error.message}`);
        return { valid: false };
      }

      return {
        valid: true,
        records: (data as unknown as Record<string, unknown>)?.records as unknown[],
      };
    } catch (error) {
      this.logger.error(
        `Domain verification error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return { valid: false };
    }
  }

  /**
   * Get sending statistics
   */
  async getStats(): Promise<{
    total: number;
    delivered: number;
    bounced: number;
    complained: number;
  } | null> {
    return null;
  }

  // HTML Templates
  private getBookingConfirmationHtml(data: BookingConfirmationData): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #0071e3;">✅ Prenotazione Confermata</h1>
        <p>Gentile <strong>${data.customerName}</strong>,</p>
        <p>La tua prenotazione è stata confermata!</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Codice:</strong> ${data.bookingCode}</p>
          <p><strong>Servizio:</strong> ${data.service}</p>
          <p><strong>Data:</strong> ${data.date}</p>
          <p><strong>Ora:</strong> ${data.time}</p>
          <p><strong>Veicolo:</strong> ${data.vehicle}</p>
        </div>
        <p><strong>${data.workshopName}</strong><br>${data.workshopAddress}<br>Tel: ${data.workshopPhone}</p>
        ${data.notes ? `<p><strong>Note:</strong> ${data.notes}</p>` : ''}
      </div>
    `;
  }

  private getBookingReminderHtml(data: BookingReminderData): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #f59e0b;">⏰ Promemoria Appuntamento</h1>
        <p>Gentile <strong>${data.customerName}</strong>,</p>
        <p>Ti ricordiamo il tuo appuntamento di domani:</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Codice:</strong> ${data.bookingCode}</p>
          <p><strong>Servizio:</strong> ${data.service}</p>
          <p><strong>Data:</strong> ${data.date}</p>
          <p><strong>Ora:</strong> ${data.time}</p>
          <p><strong>Veicolo:</strong> ${data.vehicle}</p>
        </div>
        <p><strong>${data.workshopName}</strong><br>${data.workshopAddress}</p>
      </div>
    `;
  }

  private getInvoiceReadyHtml(data: InvoiceReadyData): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #22c55e;">🧾 Fattura Disponibile</h1>
        <p>Gentile <strong>${data.customerName}</strong>,</p>
        <p>La tua fattura è pronta per il download:</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Fattura N.:</strong> ${data.invoiceNumber}</p>
          <p><strong>Data:</strong> ${data.invoiceDate}</p>
          <p><strong>Importo:</strong> ${data.amount}</p>
        </div>
        <a href="${data.downloadUrl}" style="background: #0071e3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Scarica Fattura</a>
        <p style="margin-top: 20px;"><strong>${data.workshopName}</strong></p>
      </div>
    `;
  }

  private getGdprExportHtml(data: GdprDataExportData): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #0071e3;">📥 Esportazione Dati Personale</h1>
        <p>Gentile <strong>${data.customerName}</strong>,</p>
        <p>I tuoi dati sono pronti per il download:</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Richiesta ID:</strong> ${data.requestId}</p>
          <p><strong>Scadenza:</strong> ${data.expiryDate}</p>
        </div>
        <a href="${data.downloadUrl}" style="background: #0071e3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Scarica Dati</a>
        <p style="margin-top: 20px; font-size: 12px; color: #666;">Il link scadrà il ${data.expiryDate}</p>
      </div>
    `;
  }

  private getWelcomeHtml(data: WelcomeData): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #0071e3;">👋 Benvenuto su ${data.workshopName}</h1>
        <p>Gentile <strong>${data.customerName}</strong>,</p>
        <p>Grazie per esserti registrato!</p>
        <p>Da ora puoi prenotare i tuoi appuntamenti online e tenere traccia della tua auto.</p>
        <a href="${data.loginUrl}" style="background: #0071e3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 20px;">Accedi al Portale</a>
      </div>
    `;
  }

  private getPasswordResetHtml(data: PasswordResetData): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #0071e3;">🔐 Reimposta la tua password</h1>
        <p>Gentile <strong>${data.customerName}</strong>,</p>
        <p>Hai richiesto di reimpostare la password.</p>
        <p>Clicca il pulsante qui sotto per procedere:</p>
        <a href="${data.resetUrl}" style="background: #0071e3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">Reimposta Password</a>
        <p style="font-size: 12px; color: #666;">Il link scade tra ${data.expiryHours} ore.</p>
      </div>
    `;
  }

  private getBookingCancelledHtml(data: BookingCancelledData): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #ef4444;">❌ Prenotazione Annullata</h1>
        <p>Gentile <strong>${data.customerName}</strong>,</p>
        <p>La tua prenotazione è stata annullata:</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Codice:</strong> ${data.bookingCode}</p>
          <p><strong>Servizio:</strong> ${data.service}</p>
          <p><strong>Data:</strong> ${data.date}</p>
        </div>
        ${data.cancellationReason ? `<p><strong>Motivo:</strong> ${data.cancellationReason}</p>` : ''}
        <p><strong>${data.workshopName}</strong></p>
      </div>
    `;
  }

  private async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    tags?: { name: string; value: string }[];
  }): Promise<EmailResult> {
    if (!this.resend) {
      this.logger.warn('Email service not initialized, logging email instead');
      this.logger.debug(
        `Email to ${options.to.replace(/(.{2}).*(@.*)/, '$1***$2')}: ${options.subject}`,
      );
      return { success: true, messageId: 'mock-email-id' };
    }

    if (!this.isValidEmail(options.to)) {
      return { success: false, error: 'Invalid email format' };
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html),
        tags: options.tags,
      });

      if (error) {
        this.logger.error(`Resend API error: ${error.message}`);
        return { success: false, error: error.message };
      }

      this.logger.log(
        `Email sent successfully: ${data?.id} to ${options.to.replace(/(.{2}).*(@.*)/, '$1***$2')}`,
      );
      return { success: true, messageId: data?.id };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send email: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
