import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { render } from '@react-email/render';
// @ts-ignore
import * as React from 'react';
import {
  BookingConfirmationEmail,
  BookingReminderEmail,
  InvoiceReadyEmail,
  GdprDataExportEmail,
  WelcomeEmail,
  PasswordResetEmail,
  BookingCancelledEmail,
} from '../templates/email-templates';

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
      this.logger.warn('Resend API key not configured or email notifications disabled');
    }
  }

  /**
   * Send booking confirmation email
   */
  async sendBookingConfirmation(data: BookingConfirmationData): Promise<EmailResult> {
    const subject = `✅ Prenotazione Confermata - ${data.bookingCode}`;
    
    try {
      const html = await render(
        React.createElement(BookingConfirmationEmail, data)
      );

      return await this.sendEmail({
        to: data.customerEmail,
        subject,
        html,
        tags: [{ name: 'category', value: 'booking_confirmation' }],
      });
    } catch (error) {
      this.logger.error(`Failed to send booking confirmation: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send booking reminder email
   */
  async sendBookingReminder(data: BookingReminderData): Promise<EmailResult> {
    const subject = `⏰ Promemoria Appuntamento - ${data.bookingCode}`;
    
    try {
      const html = await render(
        React.createElement(BookingReminderEmail, data)
      );

      return await this.sendEmail({
        to: data.customerEmail,
        subject,
        html,
        tags: [{ name: 'category', value: 'booking_reminder' }],
      });
    } catch (error) {
      this.logger.error(`Failed to send booking reminder: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send invoice ready notification
   */
  async sendInvoiceReady(data: InvoiceReadyData): Promise<EmailResult> {
    const subject = `🧾 Fattura Disponibile - ${data.invoiceNumber}`;
    
    try {
      const html = await render(
        React.createElement(InvoiceReadyEmail, data)
      );

      return await this.sendEmail({
        to: data.customerEmail,
        subject,
        html,
        tags: [{ name: 'category', value: 'invoice_ready' }],
      });
    } catch (error) {
      this.logger.error(`Failed to send invoice notification: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send GDPR data export notification
   */
  async sendGdprDataExport(data: GdprDataExportData): Promise<EmailResult> {
    const subject = `📥 Esportazione Dati Personale - Richiesta ${data.requestId}`;
    
    try {
      const html = await render(
        React.createElement(GdprDataExportEmail, data)
      );

      return await this.sendEmail({
        to: data.customerEmail,
        subject,
        html,
        tags: [{ name: 'category', value: 'gdpr_export' }],
      });
    } catch (error) {
      this.logger.error(`Failed to send GDPR export notification: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send welcome email to new customers
   */
  async sendWelcome(data: WelcomeData): Promise<EmailResult> {
    const subject = `👋 Benvenuto su ${data.workshopName}`;
    
    try {
      const html = await render(
        React.createElement(WelcomeEmail, data)
      );

      return await this.sendEmail({
        to: data.customerEmail,
        subject,
        html,
        tags: [{ name: 'category', value: 'welcome' }],
      });
    } catch (error) {
      this.logger.error(`Failed to send welcome email: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(data: PasswordResetData): Promise<EmailResult> {
    const subject = '🔐 Reimposta la tua password';
    
    try {
      const html = await render(
        React.createElement(PasswordResetEmail, data)
      );

      return await this.sendEmail({
        to: data.customerEmail,
        subject,
        html,
        tags: [{ name: 'category', value: 'password_reset' }],
      });
    } catch (error) {
      this.logger.error(`Failed to send password reset email: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send booking cancellation email
   */
  async sendBookingCancelled(data: BookingCancelledData): Promise<EmailResult> {
    const subject = `❌ Prenotazione Annullata - ${data.bookingCode}`;
    
    try {
      const html = await render(
        React.createElement(BookingCancelledEmail, data)
      );

      return await this.sendEmail({
        to: data.customerEmail,
        subject,
        html,
        tags: [{ name: 'category', value: 'booking_cancelled' }],
      });
    } catch (error) {
      this.logger.error(`Failed to send cancellation email: ${error.message}`);
      return { success: false, error: error.message };
    }
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
        deliveredAt: (data as any)?.delivered_at ? new Date((data as any).delivered_at) : undefined,
      };
    } catch (error) {
      this.logger.error(`Error getting email status: ${error.message}`);
      return null;
    }
  }

  /**
   * Verify domain configuration
   */
  async verifyDomain(domain: string): Promise<{ valid: boolean; records?: any[] }> {
    if (!this.resend) {
      return { valid: false };
    }

    try {
      const { data, error } = await this.resend.domains.verify(domain);
      
      if (error) {
        this.logger.error(`Domain verification failed: ${error.message}`);
        return { valid: false };
      }

      return { valid: true, records: (data as any)?.records };
    } catch (error) {
      this.logger.error(`Domain verification error: ${error.message}`);
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
    // Resend doesn't provide aggregated stats API yet
    // This would typically be fetched from your database
    return null;
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
      this.logger.debug(`Email to ${options.to}: ${options.subject}`);
      return { success: true, messageId: 'mock-email-id' };
    }

    // Validate email format
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

      this.logger.log(`Email sent successfully: ${data?.id} to ${options.to}`);
      return { success: true, messageId: data?.id };
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`);
      return { success: false, error: error.message };
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
