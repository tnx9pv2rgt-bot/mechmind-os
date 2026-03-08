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
exports.TransferRequestDto = exports.VoiceWebhookResponseDto = exports.VapiWebhookDto = exports.ExtractedDataDto = exports.VoiceIntent = exports.VapiEventType = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
var VapiEventType;
(function (VapiEventType) {
    VapiEventType["CALL_COMPLETED"] = "call_completed";
    VapiEventType["MESSAGE"] = "message";
    VapiEventType["TRANSFER_REQUESTED"] = "transfer_requested";
    VapiEventType["CALL_STARTED"] = "call_started";
    VapiEventType["CALL_UPDATED"] = "call_updated";
})(VapiEventType || (exports.VapiEventType = VapiEventType = {}));
var VoiceIntent;
(function (VoiceIntent) {
    VoiceIntent["BOOKING"] = "booking";
    VoiceIntent["STATUS_CHECK"] = "status_check";
    VoiceIntent["COMPLAINT"] = "complaint";
    VoiceIntent["OTHER"] = "other";
})(VoiceIntent || (exports.VoiceIntent = VoiceIntent = {}));
class ExtractedDataDto {
}
exports.ExtractedDataDto = ExtractedDataDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2024-01-15' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ExtractedDataDto.prototype, "preferredDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '09:00' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ExtractedDataDto.prototype, "preferredTime", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Oil change' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ExtractedDataDto.prototype, "serviceType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'ABC123' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ExtractedDataDto.prototype, "licensePlate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Engine making noise' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ExtractedDataDto.prototype, "issueDescription", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: 'object', additionalProperties: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], ExtractedDataDto.prototype, "additionalData", void 0);
class VapiWebhookDto {
}
exports.VapiWebhookDto = VapiWebhookDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Event type',
        enum: VapiEventType,
        example: VapiEventType.CALL_COMPLETED,
    }),
    (0, class_validator_1.IsEnum)(VapiEventType),
    __metadata("design:type", String)
], VapiWebhookDto.prototype, "event", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Call ID from Vapi',
        example: 'call_abc123xyz',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], VapiWebhookDto.prototype, "callId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Customer phone number',
        example: '+390123456789',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], VapiWebhookDto.prototype, "customerPhone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Tenant ID',
        example: '550e8400-e29b-41d4-a716-446655440000',
    }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], VapiWebhookDto.prototype, "tenantId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Call transcript',
        example: 'Customer: I need to book a service...',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], VapiWebhookDto.prototype, "transcript", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Detected intent',
        enum: VoiceIntent,
        example: VoiceIntent.BOOKING,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(VoiceIntent),
    __metadata("design:type", String)
], VapiWebhookDto.prototype, "intent", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Extracted data from conversation',
        type: ExtractedDataDto,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => ExtractedDataDto),
    __metadata("design:type", ExtractedDataDto)
], VapiWebhookDto.prototype, "extractedData", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Call duration in seconds',
        example: 120,
    }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], VapiWebhookDto.prototype, "duration", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Recording URL',
        example: 'https://cdn.vapi.ai/recordings/rec_123.mp3',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], VapiWebhookDto.prototype, "recordingUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Additional metadata',
        type: 'object',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], VapiWebhookDto.prototype, "metadata", void 0);
class VoiceWebhookResponseDto {
}
exports.VoiceWebhookResponseDto = VoiceWebhookResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: true }),
    __metadata("design:type", Boolean)
], VoiceWebhookResponseDto.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Webhook processed successfully' }),
    __metadata("design:type", String)
], VoiceWebhookResponseDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Action taken',
        example: 'booking_created',
    }),
    __metadata("design:type", String)
], VoiceWebhookResponseDto.prototype, "action", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Booking ID if created',
        example: '550e8400-e29b-41d4-a716-446655440000',
    }),
    __metadata("design:type", String)
], VoiceWebhookResponseDto.prototype, "bookingId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Escalation info if escalated',
        type: 'object',
    }),
    __metadata("design:type", Object)
], VoiceWebhookResponseDto.prototype, "escalation", void 0);
class TransferRequestDto {
}
exports.TransferRequestDto = TransferRequestDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'call_abc123xyz' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TransferRequestDto.prototype, "callId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '+390123456789' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TransferRequestDto.prototype, "customerPhone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '550e8400-e29b-41d4-a716-446655440000' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], TransferRequestDto.prototype, "tenantId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Customer requests to speak with manager' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TransferRequestDto.prototype, "reason", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'booking_issue' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TransferRequestDto.prototype, "category", void 0);
