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
exports.GdprWebhookPayloadDto = exports.DataRectificationDto = exports.UpdateRetentionPolicyDto = exports.ExportRequestDto = exports.QueueDeletionDto = exports.CreateConsentDto = exports.VerifyIdentityDto = exports.UpdateRequestStatusDto = exports.CreateDataSubjectRequestDto = void 0;
const class_validator_1 = require("class-validator");
class CreateDataSubjectRequestDto {
}
exports.CreateDataSubjectRequestDto = CreateDataSubjectRequestDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateDataSubjectRequestDto.prototype, "tenantId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(['ACCESS', 'DELETION', 'RECTIFICATION', 'PORTABILITY', 'RESTRICTION', 'OBJECTION']),
    __metadata("design:type", String)
], CreateDataSubjectRequestDto.prototype, "requestType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], CreateDataSubjectRequestDto.prototype, "requesterEmail", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateDataSubjectRequestDto.prototype, "requesterPhone", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateDataSubjectRequestDto.prototype, "customerId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['LOW', 'NORMAL', 'HIGH', 'URGENT']),
    __metadata("design:type", String)
], CreateDataSubjectRequestDto.prototype, "priority", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateDataSubjectRequestDto.prototype, "notes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateDataSubjectRequestDto.prototype, "metadata", void 0);
class UpdateRequestStatusDto {
}
exports.UpdateRequestStatusDto = UpdateRequestStatusDto;
__decorate([
    (0, class_validator_1.IsEnum)(['RECEIVED', 'VERIFICATION_PENDING', 'VERIFIED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED']),
    __metadata("design:type", String)
], UpdateRequestStatusDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateRequestStatusDto.prototype, "notes", void 0);
class VerifyIdentityDto {
}
exports.VerifyIdentityDto = VerifyIdentityDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], VerifyIdentityDto.prototype, "method", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], VerifyIdentityDto.prototype, "documents", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], VerifyIdentityDto.prototype, "verifiedBy", void 0);
class CreateConsentDto {
}
exports.CreateConsentDto = CreateConsentDto;
__decorate([
    (0, class_validator_1.IsEnum)(['GDPR', 'MARKETING', 'CALL_RECORDING', 'DATA_SHARING', 'THIRD_PARTY', 'ANALYTICS']),
    __metadata("design:type", String)
], CreateConsentDto.prototype, "consentType", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateConsentDto.prototype, "granted", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateConsentDto.prototype, "collectionMethod", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateConsentDto.prototype, "collectionPoint", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateConsentDto.prototype, "legalBasis", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateConsentDto.prototype, "verifiedIdentity", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateConsentDto.prototype, "metadata", void 0);
class QueueDeletionDto {
}
exports.QueueDeletionDto = QueueDeletionDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], QueueDeletionDto.prototype, "requestId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], QueueDeletionDto.prototype, "reason", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], QueueDeletionDto.prototype, "verificationMethod", void 0);
class ExportRequestDto {
}
exports.ExportRequestDto = ExportRequestDto;
__decorate([
    (0, class_validator_1.IsEnum)(['JSON', 'CSV', 'PDF']),
    __metadata("design:type", String)
], ExportRequestDto.prototype, "format", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ExportRequestDto.prototype, "requestId", void 0);
class UpdateRetentionPolicyDto {
}
exports.UpdateRetentionPolicyDto = UpdateRetentionPolicyDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateRetentionPolicyDto.prototype, "tenantId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateRetentionPolicyDto.prototype, "dataType", void 0);
class DataRectificationDto {
}
exports.DataRectificationDto = DataRectificationDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], DataRectificationDto.prototype, "customerId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], DataRectificationDto.prototype, "tenantId", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], DataRectificationDto.prototype, "changes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DataRectificationDto.prototype, "reason", void 0);
class GdprWebhookPayloadDto {
}
exports.GdprWebhookPayloadDto = GdprWebhookPayloadDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GdprWebhookPayloadDto.prototype, "event", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], GdprWebhookPayloadDto.prototype, "timestamp", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], GdprWebhookPayloadDto.prototype, "data", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GdprWebhookPayloadDto.prototype, "signature", void 0);
