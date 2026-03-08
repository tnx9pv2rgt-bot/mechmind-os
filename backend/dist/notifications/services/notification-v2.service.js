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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var NotificationV2Service_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationV2Service = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../common/services/prisma.service");
const event_emitter_1 = require("@nestjs/event-emitter");
const twilio_1 = __importDefault(require("twilio"));
const client_1 = require("@prisma/client");
let NotificationV2Service = NotificationV2Service_1 = class NotificationV2Service {
    constructor(configService, prisma, eventEmitter) {
        this.configService = configService;
        this.prisma = prisma;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(NotificationV2Service_1.name);
        this.twilioClient = null;
        this.maxRetries = 3;
        this.retryDelay = 1000;
        const accountSid = this.configService.get('TWILIO_ACCOUNT_SID');
        const authToken = this.configService.get('TWILIO_AUTH_TOKEN');
        this.fromPhone = this.configService.get('TWILIO_PHONE_NUMBER', '');
        this.fromWhatsApp = this.configService.get('TWILIO_WHATSAPP_NUMBER', this.fromPhone);
        this.isEnabled = this.configService.get('ENABLE_SMS_NOTIFICATIONS', true);
        if (accountSid && authToken && this.fromPhone && this.isEnabled) {
            this.twilioClient = (0, twilio_1.default)(accountSid, authToken);
            this.logger.log('Twilio client initialized for Notification v2');
        }
        else {
            this.logger.warn('Twilio not configured or SMS notifications disabled');
        }
    }
    async sendSMS(phone, message) {
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
                statusCallback: this.configService.get('TWILIO_STATUS_CALLBACK_URL'),
            });
            this.logger.log(`SMS sent: ${result.sid} to ${formattedPhone}`);
            return result.sid;
        }
        catch (error) {
            this.logger.error(`Failed to send SMS: ${error.message}`);
            throw error;
        }
    }
    async sendWhatsApp(phone, message) {
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
                statusCallback: this.configService.get('TWILIO_STATUS_CALLBACK_URL'),
            });
            this.logger.log(`WhatsApp sent: ${result.sid} to ${formattedPhone}`);
            return result.sid;
        }
        catch (error) {
            this.logger.error(`Failed to send WhatsApp: ${error.message}`);
            throw error;
        }
    }
    async queueNotification(data) {
        let message = data.message;
        if (!message) {
            const customer = await this.prisma.customer.findUnique({
                where: { id: data.customerId },
            });
            if (!customer) {
                throw new Error(`Customer ${data.customerId} not found`);
            }
        }
        const notification = await this.prisma.notification.create({
            data: {
                customerId: data.customerId,
                tenantId: data.tenantId,
                type: data.type,
                channel: data.channel,
                status: client_1.NotificationStatus.PENDING,
                message: message || '',
                metadata: data.metadata || {},
                maxRetries: data.maxRetries || this.maxRetries,
            },
        });
        this.logger.log(`Notification queued: ${notification.id}`);
        this.eventEmitter.emit('notification.queued', notification);
        return notification;
    }
    async sendImmediate(data) {
        try {
            const customer = await this.prisma.customer.findUnique({
                where: { id: data.customerId },
            });
            if (!customer) {
                return { success: false, error: 'Customer not found' };
            }
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
            const phone = await this.decryptPhone(customer.encryptedPhone);
            const message = data.message || this.generateMessage(data.type, 'it', {
                customerName: await this.getCustomerName(customer),
                ...data.metadata,
            });
            let messageId;
            switch (data.channel) {
                case client_1.NotificationChannel.SMS:
                    messageId = await this.sendSMS(phone, message);
                    break;
                case client_1.NotificationChannel.WHATSAPP:
                    messageId = await this.sendWhatsApp(phone, message);
                    break;
                default:
                    return { success: false, error: 'Unsupported channel' };
            }
            const notification = await this.prisma.notification.create({
                data: {
                    customerId: data.customerId,
                    tenantId: data.tenantId,
                    type: data.type,
                    channel: data.channel,
                    status: client_1.NotificationStatus.SENT,
                    message,
                    messageId,
                    sentAt: new Date(),
                    metadata: data.metadata || {},
                },
            });
            this.eventEmitter.emit('notification.sent', notification);
            return {
                success: true,
                notificationId: notification.id,
                messageId,
            };
        }
        catch (error) {
            this.logger.error(`Failed to send notification: ${error.message}`);
            const notification = await this.prisma.notification.create({
                data: {
                    customerId: data.customerId,
                    tenantId: data.tenantId,
                    type: data.type,
                    channel: data.channel,
                    status: client_1.NotificationStatus.FAILED,
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
    async processPending() {
        const pendingNotifications = await this.prisma.notification.findMany({
            where: {
                OR: [
                    { status: client_1.NotificationStatus.PENDING },
                    {
                        status: client_1.NotificationStatus.FAILED,
                        retries: { lt: this.prisma.notification.fields.maxRetries },
                    },
                ],
            },
            take: 100,
            orderBy: { createdAt: 'asc' },
            include: { customer: true },
        });
        let processed = 0;
        let failed = 0;
        for (const notification of pendingNotifications) {
            try {
                await this.processNotification(notification);
                processed++;
            }
            catch (error) {
                this.logger.error(`Failed to process notification ${notification.id}: ${error.message}`);
                await this.markFailed(notification.id, error.message);
                failed++;
            }
        }
        this.logger.log(`Processed ${processed} notifications, ${failed} failed`);
        return { processed, failed };
    }
    async sendBatch(notifications) {
        const results = [];
        for (const data of notifications) {
            const result = await this.sendImmediate(data);
            results.push(result);
            await this.delay(100);
        }
        return results;
    }
    getTemplate(type, lang = 'it') {
        const templates = lang === 'en' ? this.getEnglishTemplates() : this.getItalianTemplates();
        return templates[type] || templates.STATUS_UPDATE;
    }
    generateMessage(type, lang, vars) {
        const template = this.getTemplate(type, lang);
        return template(vars);
    }
    getAvailableTemplates() {
        return [
            { type: client_1.NotificationType.BOOKING_REMINDER, name: 'Promemoria Appuntamento', description: 'Inviato 24h prima dell\'appuntamento' },
            { type: client_1.NotificationType.BOOKING_CONFIRMATION, name: 'Conferma Prenotazione', description: 'Inviato quando una prenotazione viene confermata' },
            { type: client_1.NotificationType.STATUS_UPDATE, name: 'Aggiornamento Stato', description: 'Aggiornamenti sullo stato del veicolo' },
            { type: client_1.NotificationType.INVOICE_READY, name: 'Fattura Pronta', description: 'Notifica quando la fattura è disponibile' },
            { type: client_1.NotificationType.MAINTENANCE_DUE, name: 'Manutenzione Dovuta', description: 'Promemoria manutenzione periodica' },
            { type: client_1.NotificationType.INSPECTION_COMPLETE, name: 'Ispezione Completata', description: 'Risultati ispezione digitale' },
            { type: client_1.NotificationType.PAYMENT_REMINDER, name: 'Promemoria Pagamento', description: 'Sollecito pagamento fattura' },
        ];
    }
    async updateStatus(messageId, status) {
        const notificationStatus = this.mapTwilioStatus(status);
        await this.prisma.notification.updateMany({
            where: { messageId },
            data: {
                status: notificationStatus,
                ...(notificationStatus === client_1.NotificationStatus.DELIVERED && {
                    deliveredAt: new Date(),
                }),
            },
        });
        this.logger.log(`Updated notification ${messageId} to ${notificationStatus}`);
    }
    async retryNotification(notificationId) {
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
        await this.prisma.notification.update({
            where: { id: notificationId },
            data: {
                status: client_1.NotificationStatus.PENDING,
                retries: { increment: 1 },
                error: null,
            },
        });
        return this.processNotification(notification);
    }
    async getHistory(customerId, options) {
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
    async getPreferences(customerId) {
        const prefs = await this.prisma.customerNotificationPreference.findMany({
            where: { customerId },
        });
        const allChannels = [client_1.NotificationChannel.SMS, client_1.NotificationChannel.WHATSAPP, client_1.NotificationChannel.EMAIL];
        return allChannels.map(channel => ({
            channel,
            enabled: prefs.find(p => p.channel === channel)?.enabled ?? true,
        }));
    }
    async updatePreference(customerId, channel, enabled) {
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
    async processNotification(notification) {
        const { customer, channel, type, message: existingMessage } = notification;
        const phone = await this.decryptPhone(customer.encryptedPhone);
        const message = existingMessage || this.generateMessage(type, 'it', {
            customerName: await this.getCustomerName(customer),
            ...(notification.metadata || {}),
        });
        let messageId;
        switch (channel) {
            case client_1.NotificationChannel.SMS:
                messageId = await this.sendSMS(phone, message);
                break;
            case client_1.NotificationChannel.WHATSAPP:
                messageId = await this.sendWhatsApp(phone, message);
                break;
            default:
                throw new Error('Unsupported channel');
        }
        await this.prisma.notification.update({
            where: { id: notification.id },
            data: {
                status: client_1.NotificationStatus.SENT,
                messageId,
                sentAt: new Date(),
                message,
            },
        });
        this.eventEmitter.emit('notification.sent', { ...notification, status: client_1.NotificationStatus.SENT });
        return {
            success: true,
            notificationId: notification.id,
            messageId,
        };
    }
    async markFailed(notificationId, error) {
        await this.prisma.notification.update({
            where: { id: notificationId },
            data: {
                status: client_1.NotificationStatus.FAILED,
                error,
                failedAt: new Date(),
            },
        });
    }
    mapTwilioStatus(twilioStatus) {
        switch (twilioStatus.toLowerCase()) {
            case 'delivered':
            case 'read':
                return client_1.NotificationStatus.DELIVERED;
            case 'sent':
            case 'queued':
            case 'sending':
                return client_1.NotificationStatus.SENT;
            case 'failed':
            case 'undelivered':
                return client_1.NotificationStatus.FAILED;
            default:
                return client_1.NotificationStatus.PENDING;
        }
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
        const e164Regex = /^\+[1-9]\d{1,14}$/;
        if (!e164Regex.test(cleaned)) {
            return null;
        }
        return cleaned;
    }
    async decryptPhone(encryptedPhone) {
        return encryptedPhone;
    }
    async getCustomerName(customer) {
        return 'Cliente';
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    getItalianTemplates() {
        return {
            [client_1.NotificationType.BOOKING_REMINDER]: (v) => `Ciao ${v.customerName}, ti ricordiamo l'appuntamento domani ${v.date} alle ${v.time}${v.location ? ` presso ${v.location}` : ''}. Conferma o modifica: ${v.link || 'https://mechmind.io/portal'}`,
            [client_1.NotificationType.BOOKING_CONFIRMATION]: (v) => `Ciao ${v.customerName}, appuntamento confermato per ${v.date} alle ${v.time}${v.workshopName ? ` da ${v.workshopName}` : ''}${v.bookingCode ? ` (Codice: ${v.bookingCode})` : ''}. Ti aspettiamo!`,
            [client_1.NotificationType.STATUS_UPDATE]: (v) => `Ciao ${v.customerName}, aggiornamento: ${v.status || 'in lavorazione'}. ${v.link ? `Dettagli: ${v.link}` : ''}`,
            [client_1.NotificationType.INVOICE_READY]: (v) => `Ciao ${v.customerName}, fattura pronta. Importo: ${v.amount || 'N/D'}. Visualizza: ${v.link || 'https://mechmind.io/portal'}`,
            [client_1.NotificationType.MAINTENANCE_DUE]: (v) => `Ciao ${v.customerName}, ${v.service || 'manutenzione'} dovuta tra ${v.days || 'pochi'} giorni. Prenota: ${v.link || 'https://mechmind.io/portal'}`,
            [client_1.NotificationType.INSPECTION_COMPLETE]: (v) => `Ciao ${v.customerName}, ispezione completata!${v.score ? ` Score: ${v.score}/10` : ''}${v.link ? `. Report: ${v.link}` : ''}`,
            [client_1.NotificationType.PAYMENT_REMINDER]: (v) => `Ciao ${v.customerName}, promemoria pagamento fattura ${v.amount ? `di ${v.amount}` : ''}. Paga qui: ${v.link || 'https://mechmind.io/portal'}`,
        };
    }
    getEnglishTemplates() {
        return {
            [client_1.NotificationType.BOOKING_REMINDER]: (v) => `Hi ${v.customerName}, reminder: your appointment is tomorrow ${v.date} at ${v.time}${v.location ? ` at ${v.location}` : ''}. Confirm or modify: ${v.link || 'https://mechmind.io/portal'}`,
            [client_1.NotificationType.BOOKING_CONFIRMATION]: (v) => `Hi ${v.customerName}, appointment confirmed for ${v.date} at ${v.time}${v.workshopName ? ` at ${v.workshopName}` : ''}${v.bookingCode ? ` (Code: ${v.bookingCode})` : ''}. See you soon!`,
            [client_1.NotificationType.STATUS_UPDATE]: (v) => `Hi ${v.customerName}, status update: ${v.status || 'in progress'}. ${v.link ? `Details: ${v.link}` : ''}`,
            [client_1.NotificationType.INVOICE_READY]: (v) => `Hi ${v.customerName}, your invoice is ready. Amount: ${v.amount || 'N/A'}. View: ${v.link || 'https://mechmind.io/portal'}`,
            [client_1.NotificationType.MAINTENANCE_DUE]: (v) => `Hi ${v.customerName}, ${v.service || 'maintenance'} due in ${v.days || 'a few'} days. Book: ${v.link || 'https://mechmind.io/portal'}`,
            [client_1.NotificationType.INSPECTION_COMPLETE]: (v) => `Hi ${v.customerName}, inspection completed!${v.score ? ` Score: ${v.score}/10` : ''}${v.link ? `. Report: ${v.link}` : ''}`,
            [client_1.NotificationType.PAYMENT_REMINDER]: (v) => `Hi ${v.customerName}, payment reminder${v.amount ? ` for ${v.amount}` : ''}. Pay here: ${v.link || 'https://mechmind.io/portal'}`,
        };
    }
};
exports.NotificationV2Service = NotificationV2Service;
exports.NotificationV2Service = NotificationV2Service = NotificationV2Service_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService,
        event_emitter_1.EventEmitter2])
], NotificationV2Service);
