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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestNotificationDto = exports.NotificationPreferencesDto = exports.NotificationStatusDto = exports.SmsWebhookDto = exports.EmailWebhookDto = exports.BulkNotificationDto = exports.SendGdprExportDto = exports.SendInvoiceReadyDto = exports.SendBookingReminderDto = exports.SendBookingConfirmationDto = exports.SendNotificationDto = exports.NotificationPriority = exports.NotificationChannel = exports.NotificationType = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
var NotificationType;
(function (NotificationType) {
    NotificationType["BOOKING_CONFIRMATION"] = "booking_confirmation";
    NotificationType["BOOKING_REMINDER"] = "booking_reminder";
    NotificationType["BOOKING_CANCELLED"] = "booking_cancelled";
    NotificationType["INVOICE_READY"] = "invoice_ready";
    NotificationType["GDPR_EXPORT_READY"] = "gdpr_export_ready";
    NotificationType["WELCOME"] = "welcome";
    NotificationType["PASSWORD_RESET"] = "password_reset";
    NotificationType["CUSTOM"] = "custom";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
var NotificationChannel;
(function (NotificationChannel) {
    NotificationChannel["SMS"] = "sms";
    NotificationChannel["EMAIL"] = "email";
    NotificationChannel["BOTH"] = "both";
    NotificationChannel["AUTO"] = "auto";
})(NotificationChannel || (exports.NotificationChannel = NotificationChannel = {}));
var NotificationPriority;
(function (NotificationPriority) {
    NotificationPriority["LOW"] = "low";
    NotificationPriority["NORMAL"] = "normal";
    NotificationPriority["HIGH"] = "high";
    NotificationPriority["URGENT"] = "urgent";
})(NotificationPriority || (exports.NotificationPriority = NotificationPriority = {}));
class SendNotificationDto {
    constructor() {
        this.channel = NotificationChannel.AUTO;
        this.priority = NotificationPriority.NORMAL;
    }
}
exports.SendNotificationDto = SendNotificationDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Type of notification',
        enum: NotificationType,
        example: NotificationType.BOOKING_CONFIRMATION,
    }),
    (0, class_validator_1.IsEnum)(NotificationType),
    __metadata("design:type", String)
], SendNotificationDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Customer ID',
        example: 'cust_123456789',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendNotificationDto.prototype, "customerId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Tenant/Workshop ID',
        example: 'tenant_abc123',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendNotificationDto.prototype, "tenantId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Notification channel preference',
        enum: NotificationChannel,
        default: NotificationChannel.AUTO,
    }),
    (0, class_validator_1.IsEnum)(NotificationChannel),
    __metadata("design:type", String)
], SendNotificationDto.prototype, "channel", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Notification priority',
        enum: NotificationPriority,
        default: NotificationPriority.NORMAL,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(NotificationPriority),
    __metadata("design:type", String)
], SendNotificationDto.prototype, "priority", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Notification data/payload',
        example: {
            service: 'Tagliando',
            date: '2024-03-15',
            time: '14:30',
        },
    }),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], SendNotificationDto.prototype, "data", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Override customer email',
        example: 'customer@example.com',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], SendNotificationDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Override customer phone',
        example: '+393331234567',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsPhoneNumber)(),
    __metadata("design:type", String)
], SendNotificationDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Schedule notification for later (ISO 8601)',
        example: '2024-03-14T10:00:00Z',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendNotificationDto.prototype, "scheduledAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Additional metadata',
        example: { source: 'booking_system', retry_count: 0 },
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], SendNotificationDto.prototype, "metadata", void 0);
class SendBookingConfirmationDto {
}
exports.SendBookingConfirmationDto = SendBookingConfirmationDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'cust_123456789' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendBookingConfirmationDto.prototype, "customerId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'tenant_abc123' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendBookingConfirmationDto.prototype, "tenantId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Mario Rossi' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendBookingConfirmationDto.prototype, "customerName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'mario.rossi@example.com' }),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], SendBookingConfirmationDto.prototype, "customerEmail", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '+393331234567' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsPhoneNumber)(),
    __metadata("design:type", String)
], SendBookingConfirmationDto.prototype, "customerPhone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Tagliando completo' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendBookingConfirmationDto.prototype, "service", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-03-15' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendBookingConfirmationDto.prototype, "date", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '14:30' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendBookingConfirmationDto.prototype, "time", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Fiat Panda ABC123' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendBookingConfirmationDto.prototype, "vehicle", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'BK-2024-001' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendBookingConfirmationDto.prototype, "bookingCode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Controllare freni anteriori' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendBookingConfirmationDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: NotificationChannel, default: NotificationChannel.AUTO }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(NotificationChannel),
    __metadata("design:type", String)
], SendBookingConfirmationDto.prototype, "channel", void 0);
class SendBookingReminderDto {
    constructor() {
        this.reminderType = '24h';
    }
}
exports.SendBookingReminderDto = SendBookingReminderDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'cust_123456789' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendBookingReminderDto.prototype, "customerId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'tenant_abc123' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendBookingReminderDto.prototype, "tenantId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Mario Rossi' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendBookingReminderDto.prototype, "customerName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'mario.rossi@example.com' }),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], SendBookingReminderDto.prototype, "customerEmail", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '+393331234567' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsPhoneNumber)(),
    __metadata("design:type", String)
], SendBookingReminderDto.prototype, "customerPhone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Tagliando completo' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendBookingReminderDto.prototype, "service", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-03-15' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendBookingReminderDto.prototype, "date", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '14:30' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendBookingReminderDto.prototype, "time", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Fiat Panda ABC123' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendBookingReminderDto.prototype, "vehicle", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'BK-2024-001' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendBookingReminderDto.prototype, "bookingCode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['24h', 'same_day'], default: '24h' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendBookingReminderDto.prototype, "reminderType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: NotificationChannel, default: NotificationChannel.AUTO }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(NotificationChannel),
    __metadata("design:type", String)
], SendBookingReminderDto.prototype, "channel", void 0);
class SendInvoiceReadyDto {
}
exports.SendInvoiceReadyDto = SendInvoiceReadyDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'cust_123456789' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendInvoiceReadyDto.prototype, "customerId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'tenant_abc123' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendInvoiceReadyDto.prototype, "tenantId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Mario Rossi' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendInvoiceReadyDto.prototype, "customerName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'mario.rossi@example.com' }),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], SendInvoiceReadyDto.prototype, "customerEmail", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '+393331234567' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsPhoneNumber)(),
    __metadata("design:type", String)
], SendInvoiceReadyDto.prototype, "customerPhone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'INV-2024-001' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendInvoiceReadyDto.prototype, "invoiceNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-03-15' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendInvoiceReadyDto.prototype, "invoiceDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '250.00' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendInvoiceReadyDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'https://mechmind.io/invoice/inv-2024-001' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendInvoiceReadyDto.prototype, "downloadUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: NotificationChannel, default: NotificationChannel.AUTO }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(NotificationChannel),
    __metadata("design:type", String)
], SendInvoiceReadyDto.prototype, "channel", void 0);
class SendGdprExportDto {
}
exports.SendGdprExportDto = SendGdprExportDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'cust_123456789' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendGdprExportDto.prototype, "customerId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Mario Rossi' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendGdprExportDto.prototype, "customerName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'mario.rossi@example.com' }),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], SendGdprExportDto.prototype, "customerEmail", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'https://mechmind.io/gdpr/download/abc123' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendGdprExportDto.prototype, "downloadUrl", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-03-22' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendGdprExportDto.prototype, "expiryDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'GDPR-2024-001' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendGdprExportDto.prototype, "requestId", void 0);
class BulkNotificationDto {
}
exports.BulkNotificationDto = BulkNotificationDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Array of notification requests',
        type: [SendNotificationDto],
    }),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => SendNotificationDto),
    __metadata("design:type", Array)
], BulkNotificationDto.prototype, "notifications", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Batch processing options',
        example: { throttleMs: 100, continueOnError: true },
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], BulkNotificationDto.prototype, "options", void 0);
class EmailWebhookDto {
}
exports.EmailWebhookDto = EmailWebhookDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EmailWebhookDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], EmailWebhookDto.prototype, "data", void 0);
class SmsWebhookDto {
}
exports.SmsWebhookDto = SmsWebhookDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SmsWebhookDto.prototype, "MessageSid", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SmsWebhookDto.prototype, "MessageStatus", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SmsWebhookDto.prototype, "To", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SmsWebhookDto.prototype, "From", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SmsWebhookDto.prototype, "ErrorCode", void 0);
class NotificationStatusDto {
}
exports.NotificationStatusDto = NotificationStatusDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], NotificationStatusDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: NotificationType }),
    __metadata("design:type", String)
], NotificationStatusDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['pending', 'sent', 'delivered', 'failed'] }),
    __metadata("design:type", String)
], NotificationStatusDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: NotificationChannel }),
    __metadata("design:type", String)
], NotificationStatusDto.prototype, "channel", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Date)
], NotificationStatusDto.prototype, "sentAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Date)
], NotificationStatusDto.prototype, "deliveredAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], NotificationStatusDto.prototype, "error", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], NotificationStatusDto.prototype, "metadata", void 0);
class NotificationPreferencesDto {
}
exports.NotificationPreferencesDto = NotificationPreferencesDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'cust_123456789' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], NotificationPreferencesDto.prototype, "customerId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], NotificationPreferencesDto.prototype, "bookingConfirmations", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], NotificationPreferencesDto.prototype, "bookingReminders", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], NotificationPreferencesDto.prototype, "invoiceNotifications", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: false }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], NotificationPreferencesDto.prototype, "promotionalMessages", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: NotificationChannel }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], NotificationPreferencesDto.prototype, "preferredChannel", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'it' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], NotificationPreferencesDto.prototype, "language", void 0);
class TestNotificationDto {
}
exports.TestNotificationDto = TestNotificationDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: NotificationType }),
    (0, class_validator_1.IsEnum)(NotificationType),
    __metadata("design:type", String)
], TestNotificationDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: NotificationChannel }),
    (0, class_validator_1.IsEnum)(NotificationChannel),
    __metadata("design:type", String)
], TestNotificationDto.prototype, "channel", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'test@example.com' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TestNotificationDto.prototype, "recipient", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], TestNotificationDto.prototype, "data", void 0);
