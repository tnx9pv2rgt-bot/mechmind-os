"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var EmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const resend_1 = require("resend");
let EmailService = EmailService_1 = class EmailService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(EmailService_1.name);
        this.resend = null;
        const apiKey = this.configService.get('RESEND_API_KEY');
        this.isEnabled = this.configService.get('ENABLE_EMAIL_NOTIFICATIONS', false);
        this.fromEmail = this.configService.get('EMAIL_FROM_ADDRESS', 'noreply@mechmind.io');
        this.fromName = this.configService.get('EMAIL_FROM_NAME', 'MechMind');
        if (apiKey && this.isEnabled) {
            this.resend = new resend_1.Resend(apiKey);
            this.logger.log('Resend client initialized');
        }
        else {
            this.logger.warn('Resend API key not configured or email notifications disabled');
        }
    }
    async sendBookingConfirmation(data) {
        const subject = `✅ Prenotazione Confermata - ${data.bookingCode}`;
        const html = this.getBookingConfirmationHtml(data);
        return await this.sendEmail({
            to: data.customerEmail,
            subject,
            html,
            tags: [{ name: 'category', value: 'booking_confirmation' }],
        });
    }
    async sendBookingReminder(data) {
        const subject = `⏰ Promemoria Appuntamento - ${data.bookingCode}`;
        const html = this.getBookingReminderHtml(data);
        return await this.sendEmail({
            to: data.customerEmail,
            subject,
            html,
            tags: [{ name: 'category', value: 'booking_reminder' }],
        });
    }
    async sendInvoiceReady(data) {
        const subject = `🧾 Fattura Disponibile - ${data.invoiceNumber}`;
        const html = this.getInvoiceReadyHtml(data);
        return await this.sendEmail({
            to: data.customerEmail,
            subject,
            html,
            tags: [{ name: 'category', value: 'invoice_ready' }],
        });
    }
    async sendGdprDataExport(data) {
        const subject = `📥 Esportazione Dati Personale - Richiesta ${data.requestId}`;
        const html = this.getGdprExportHtml(data);
        return await this.sendEmail({
            to: data.customerEmail,
            subject,
            html,
            tags: [{ name: 'category', value: 'gdpr_export' }],
        });
    }
    async sendWelcome(data) {
        const subject = `👋 Benvenuto su ${data.workshopName}`;
        const html = this.getWelcomeHtml(data);
        return await this.sendEmail({
            to: data.customerEmail,
            subject,
            html,
            tags: [{ name: 'category', value: 'welcome' }],
        });
    }
    async sendPasswordReset(data) {
        const subject = '🔐 Reimposta la tua password';
        const html = this.getPasswordResetHtml(data);
        return await this.sendEmail({
            to: data.customerEmail,
            subject,
            html,
            tags: [{ name: 'category', value: 'password_reset' }],
        });
    }
    async sendBookingCancelled(data) {
        const subject = `❌ Prenotazione Annullata - ${data.bookingCode}`;
        const html = this.getBookingCancelledHtml(data);
        return await this.sendEmail({
            to: data.customerEmail,
            subject,
            html,
            tags: [{ name: 'category', value: 'booking_cancelled' }],
        });
    }
    async sendRawEmail(options) {
        return this.sendEmail(options);
    }
    async getEmailStatus(emailId) {
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
                deliveredAt: data?.delivered_at ? new Date(data.delivered_at) : undefined,
            };
        }
        catch (error) {
            this.logger.error(`Error getting email status: ${error.message}`);
            return null;
        }
    }
    async verifyDomain(domain) {
        if (!this.resend) {
            return { valid: false };
        }
        try {
            const { data, error } = await this.resend.domains.verify(domain);
            if (error) {
                this.logger.error(`Domain verification failed: ${error.message}`);
                return { valid: false };
            }
            return { valid: true, records: data?.records };
        }
        catch (error) {
            this.logger.error(`Domain verification error: ${error.message}`);
            return { valid: false };
        }
    }
    async getStats() {
        return null;
    }
    getBookingConfirmationHtml(data) {
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
    getBookingReminderHtml(data) {
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
    getInvoiceReadyHtml(data) {
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
    getGdprExportHtml(data) {
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
    getWelcomeHtml(data) {
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
    getPasswordResetHtml(data) {
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
    getBookingCancelledHtml(data) {
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
    async sendEmail(options) {
        if (!this.resend) {
            this.logger.warn('Email service not initialized, logging email instead');
            this.logger.debug(`Email to ${options.to}: ${options.subject}`);
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
            this.logger.log(`Email sent successfully: ${data?.id} to ${options.to}`);
            return { success: true, messageId: data?.id };
        }
        catch (error) {
            this.logger.error(`Failed to send email: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    stripHtml(html) {
        return html
            .replace(/<[^>]*>/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = EmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EmailService);
