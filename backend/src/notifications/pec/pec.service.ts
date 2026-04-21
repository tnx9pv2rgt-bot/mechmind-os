import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface PecAttachment {
  filename: string;
  content: string | Buffer;
  contentType: string;
}

export interface PecResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface FirDigitaleData {
  firNumber: string;
  wasteType: string;
  quantity: number;
}

@Injectable()
export class PecService {
  private readonly logger = new Logger(PecService.name);
  private transporter: Transporter | null = null;
  private readonly smtpHost: string | undefined;
  private readonly smtpPort: number;
  private readonly smtpUser: string | undefined;
  private readonly smtpPass: string | undefined;
  private readonly fromAddress: string;

  constructor(private readonly configService: ConfigService) {
    this.smtpHost = this.configService.get<string>('PEC_SMTP_HOST');
    this.smtpPort = this.configService.get<number>('PEC_SMTP_PORT', 465);
    this.smtpUser = this.configService.get<string>('PEC_SMTP_USER');
    this.smtpPass = this.configService.get<string>('PEC_SMTP_PASS');
    this.fromAddress = this.configService.get<string>(
      'PEC_FROM_ADDRESS',
      'noreply@pec.example.com',
    );

    if (this.isConfigured()) {
      this.initializeTransport();
      this.logger.log('PEC service initialized with Aruba SMTP');
    } else {
      this.logger.debug('PEC service not fully configured - some environment variables missing');
    }
  }

  private initializeTransport(): void {
    if (!this.smtpHost || !this.smtpUser || !this.smtpPass) {
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: this.smtpHost,
        port: this.smtpPort,
        secure: true,
        auth: {
          user: this.smtpUser,
          pass: this.smtpPass,
        },
        connectionTimeout: 10000,
        socketTimeout: 10000,
      });

      this.logger.log(`Nodemailer transport configured for ${this.smtpHost}:${this.smtpPort}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to initialize PEC transporter: ${errorMessage}`);
      this.transporter = null;
    }
  }

  /**
   * Check if PEC service is fully configured
   */
  isConfigured(): boolean {
    return !!(this.smtpUser && this.smtpPass && this.smtpHost);
  }

  /**
   * Send generic PEC email
   */
  async sendPec(
    to: string,
    subject: string,
    html: string,
    attachments?: PecAttachment[],
  ): Promise<PecResult> {
    if (!this.transporter) {
      this.logger.warn('PEC service not initialized - cannot send PEC');
      return {
        success: false,
        error: 'PEC service not configured',
      };
    }

    if (!this.isValidEmail(to)) {
      return {
        success: false,
        error: 'Invalid email format',
      };
    }

    try {
      const mailOptions: nodemailer.SendMailOptions = {
        from: this.fromAddress,
        to,
        subject,
        html,
      };

      if (attachments && attachments.length > 0) {
        mailOptions.attachments = attachments.map(att => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
        }));
      }

      const info = await this.transporter.sendMail(mailOptions);

      this.logger.log(`PEC sent successfully: ${info.messageId} to ${this.maskEmail(to)}`);
      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send PEC: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Send certified FIR digitale via PEC
   */
  async sendFirDigitale(to: string, firData: FirDigitaleData): Promise<PecResult> {
    const subject = `[FIR Digitale] ${firData.firNumber}`;
    const html = this.getFirDigitaleHtml(firData);

    return this.sendPec(to, subject, html);
  }

  /**
   * Send invoice via PEC with XML attachment
   */
  async sendFatturaElettronica(
    to: string,
    invoiceNumber: string,
    xmlContent: string,
  ): Promise<PecResult> {
    const subject = `Fattura Elettronica ${invoiceNumber}`;
    const html = this.getInvoiceHtml(invoiceNumber);
    const attachments: PecAttachment[] = [
      {
        filename: `fattura_${invoiceNumber}.xml`,
        content: xmlContent,
        contentType: 'application/xml',
      },
    ];

    return this.sendPec(to, subject, html, attachments);
  }

  /**
   * Verify PEC transport connection
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      this.logger.log('PEC transport connection verified');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`PEC transport verification failed: ${errorMessage}`);
      return false;
    }
  }

  // Private helper methods
  private getFirDigitaleHtml(firData: FirDigitaleData): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #0071e3;">📋 FIR Digitale RENTRI</h1>
        <p>Certificazione PEC - Posta Elettronica Certificata</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Numero FIR:</strong> ${firData.firNumber}</p>
          <p><strong>Tipo Rifiuto:</strong> ${firData.wasteType}</p>
          <p><strong>Quantità:</strong> ${firData.quantity} kg</p>
          <p><strong>Data:</strong> ${new Date().toLocaleDateString('it-IT')}</p>
        </div>
        <p style="font-size: 12px; color: #666; margin-top: 20px;">
          Questa comunicazione è stata inviata via PEC (Posta Elettronica Certificata) e ha validità legale secondo le normative RENTRI.
        </p>
      </div>
    `;
  }

  private getInvoiceHtml(invoiceNumber: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #22c55e;">🧾 Fattura Elettronica</h1>
        <p>Certificazione PEC - Posta Elettronica Certificata</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Numero Fattura:</strong> ${invoiceNumber}</p>
          <p><strong>Data Invio:</strong> ${new Date().toLocaleDateString('it-IT')} ${new Date().toLocaleTimeString('it-IT')}</p>
        </div>
        <p>In allegato trovate il file XML della fattura elettronica.</p>
        <p style="font-size: 12px; color: #666; margin-top: 20px;">
          Questa comunicazione è stata inviata via PEC (Posta Elettronica Certificata) e ha validità legale secondo la normativa italiana.
        </p>
      </div>
    `;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private maskEmail(email: string): string {
    return email.replace(/(.{2}).*(@.*)/, '$1***$2');
  }
}
