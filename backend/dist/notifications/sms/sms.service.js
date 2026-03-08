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
var SmsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const twilio_1 = require("twilio");
let SmsService = SmsService_1 = class SmsService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(SmsService_1.name);
        this.twilioClient = null;
        this.maxRetries = 3;
        this.retryDelay = 1000;
        this.SMS_SEGMENT_LENGTH = 153;
        this.SMS_SINGLE_LIMIT = 160;
        const accountSid = this.configService.get('TWILIO_ACCOUNT_SID');
        const authToken = this.configService.get('TWILIO_AUTH_TOKEN');
        this.fromPhone = this.configService.get('TWILIO_PHONE_NUMBER', '');
        this.isEnabled = this.configService.get('ENABLE_SMS_NOTIFICATIONS', true);
        if (accountSid && authToken && this.fromPhone && this.isEnabled) {
            this.twilioClient = new twilio_1.Twilio(accountSid, authToken);
            this.logger.log('Twilio client initialized');
        }
        else {
            this.logger.warn('Twilio not configured or SMS notifications disabled');
        }
    }
    async sendBookingConfirmation(phone, data) {
        const message = this.formatMessage(`Ciao! La tua prenotazione per {{service}} è confermata.\n` +
            `📅 {{date}} alle {{time}}\n` +
            `📍 {{workshopName}}\n` +
            `🔢 Codice: {{bookingCode}}\n` +
            `Grazie per averci scelto!`, data);
        return this.sendSmsWithRetry(phone, message, 'booking_confirmation');
    }
    async sendBookingReminder(phone, data) {
        const message = this.formatMessage(`⏰ Promemoria da {{workshopName}}:\n` +
            `Domani {{date}} alle {{time}} hai un appuntamento per {{service}}.\n` +
            `🔢 Codice: {{bookingCode}}\n` +
            `Per modifiche, chiamaci o rispondi a questo messaggio.`, data);
        return this.sendSmsWithRetry(phone, message, 'booking_reminder');
    }
    async sendSameDayReminder(phone, data) {
        const message = this.formatMessage(`⏰ Oggi alle {{time}} il tuo appuntamento per {{service}} da {{workshopName}}.\n` +
            `🔢 Codice: {{bookingCode}}\n` +
            `Ti aspettiamo!`, data);
        return this.sendSmsWithRetry(phone, message, 'same_day_reminder');
    }
    async sendInvoiceReady(phone, data) {
        const message = this.formatMessage(`🧾 {{workshopName}}: La tua fattura {{invoiceNumber}} di €{{amount}} è pronta.\n` +
            `Scaricala qui: {{downloadUrl}}\n` +
            `Grazie per la fiducia!`, data);
        return this.sendSmsWithRetry(phone, message, 'invoice_ready');
    }
    async sendBookingCancelled(phone, data) {
        let message = this.formatMessage(`❌ {{workshopName}}: La tua prenotazione del {{date}} per {{service}} è stata annullata.\n` +
            `🔢 Codice: {{bookingCode}}`, data);
        if (data.cancellationReason) {
            message += `\nMotivo: ${data.cancellationReason}`;
        }
        message += '\nPer riprogrammare, chiamaci.';
        return this.sendSmsWithRetry(phone, message, 'booking_cancelled');
    }
    async sendGdprExportReady(phone, data) {
        const message = this.formatMessage(`📥 I tuoi dati sono pronti per il download.\n` +
            `Link: {{downloadUrl}}\n` +
            `Scade il: {{expiryDate}}\n` +
            `Per sicurezza, il link è valido 7 giorni.`, data);
        return this.sendSmsWithRetry(phone, message, 'gdpr_export');
    }
    async sendPasswordReset(phone, data) {
        const message = this.formatMessage(`🔐 Codice di ripristino password MechMind: {{resetCode}}\n` +
            `Valido per {{expiryMinutes}} minuti.\n` +
            `Non condividere questo codice.`, data);
        return this.sendSmsWithRetry(phone, message, 'password_reset');
    }
    async sendCustom(phone, message, category = 'custom') {
        return this.sendSmsWithRetry(phone, message, category);
    }
    async sendPromotional(phone, message, workshopName) {
        const brandedMessage = `${workshopName}: ${message}\n\nPer disiscriverti: rispondi STOP`;
        return this.sendSmsWithRetry(phone, brandedMessage, 'promotional');
    }
    async getMessageStatus(messageSid) {
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
        }
        catch (error) {
            this.logger.error(`Failed to get message status: ${error.message}`);
            return null;
        }
    }
    async validatePhoneNumber(phone) {
        if (!this.twilioClient) {
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
        }
        catch (error) {
            this.logger.warn(`Phone validation failed for ${phone}: ${error.message}`);
            return { valid: false };
        }
    }
    calculateCost(message) {
        const segments = this.calculateSegments(message);
        const costPerSegment = 0.0075;
        return {
            segments,
            estimatedCost: segments * costPerSegment,
            currency: 'USD',
        };
    }
    getTemplates() {
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
    async healthCheck() {
        if (!this.twilioClient) {
            return { healthy: false, error: 'Twilio not initialized' };
        }
        const startTime = Date.now();
        try {
            await this.twilioClient.api.accounts.list({ limit: 1 });
            return {
                healthy: true,
                latency: Date.now() - startTime,
            };
        }
        catch (error) {
            return {
                healthy: false,
                latency: Date.now() - startTime,
                error: error.message,
            };
        }
    }
    async sendSmsWithRetry(phone, message, category, attempt = 1) {
        const result = await this.sendSms(phone, message, category);
        if (!result.success && attempt < this.maxRetries) {
            this.logger.warn(`SMS send failed, retrying (${attempt}/${this.maxRetries})...`);
            await this.delay(this.retryDelay * attempt);
            return this.sendSmsWithRetry(phone, message, category, attempt + 1);
        }
        return result;
    }
    async sendSms(phone, message, category) {
        if (!this.twilioClient) {
            this.logger.warn('SMS service not initialized, logging message instead');
            this.logger.debug(`SMS to ${phone} [${category}]: ${message}`);
            return { success: true, messageId: 'mock-sms-id' };
        }
        const formattedPhone = this.formatPhoneNumber(phone);
        if (!formattedPhone) {
            return { success: false, error: 'Invalid phone number format' };
        }
        try {
            const twilioMessage = await this.twilioClient.messages.create({
                from: this.fromPhone,
                to: formattedPhone,
                body: message,
                statusCallback: this.configService.get('TWILIO_STATUS_CALLBACK_URL'),
            });
            this.logger.log(`SMS sent successfully: ${twilioMessage.sid} to ${formattedPhone} (${category})`);
            return {
                success: true,
                messageId: twilioMessage.sid,
                segmentCount: twilioMessage.numSegments ? parseInt(twilioMessage.numSegments, 10) : 1,
                price: twilioMessage.price,
            };
        }
        catch (error) {
            this.logger.error(`Failed to send SMS: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
    formatMessage(template, data) {
        return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return data[key] !== undefined ? String(data[key]) : match;
        });
    }
    formatPhoneNumber(phone) {
        let cleaned = phone.replace(/[^\d+]/g, '');
        if (!cleaned.startsWith('+')) {
            if (cleaned.startsWith('00')) {
                cleaned = '+' + cleaned.substring(2);
            }
            else if (cleaned.startsWith('3')) {
                cleaned = '+' + cleaned;
            }
            else if (cleaned.startsWith('0')) {
                cleaned = '+39' + cleaned;
            }
            else {
                cleaned = '+39' + cleaned;
            }
        }
        if (!this.isValidE164(cleaned)) {
            return null;
        }
        return cleaned;
    }
    isValidE164(phone) {
        const e164Regex = /^\+[1-9]\d{1,14}$/;
        return e164Regex.test(phone);
    }
    calculateSegments(message) {
        const hasUnicode = /[^\x00-\x7F]/.test(message);
        if (hasUnicode) {
            const segmentLength = message.length <= 70 ? 70 : 67;
            return Math.ceil(message.length / segmentLength);
        }
        else {
            const segmentLength = message.length <= 160 ? 160 : 153;
            return Math.ceil(message.length / segmentLength);
        }
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};
exports.SmsService = SmsService;
exports.SmsService = SmsService = SmsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], SmsService);
