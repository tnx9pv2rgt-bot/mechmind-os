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
exports.AccountingSyncResponseDto = exports.AccountingSyncFilterDto = exports.SyncCustomerDto = exports.SyncInvoiceDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const client_1 = require("@prisma/client");
class SyncInvoiceDto {
}
exports.SyncInvoiceDto = SyncInvoiceDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Invoice ID to sync' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], SyncInvoiceDto.prototype, "invoiceId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.AccountingProvider, description: 'Accounting provider' }),
    (0, class_validator_1.IsEnum)(client_1.AccountingProvider),
    __metadata("design:type", String)
], SyncInvoiceDto.prototype, "provider", void 0);
class SyncCustomerDto {
}
exports.SyncCustomerDto = SyncCustomerDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Customer ID to sync' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], SyncCustomerDto.prototype, "customerId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.AccountingProvider, description: 'Accounting provider' }),
    (0, class_validator_1.IsEnum)(client_1.AccountingProvider),
    __metadata("design:type", String)
], SyncCustomerDto.prototype, "provider", void 0);
class AccountingSyncFilterDto {
}
exports.AccountingSyncFilterDto = AccountingSyncFilterDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.AccountingProvider }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.AccountingProvider),
    __metadata("design:type", String)
], AccountingSyncFilterDto.prototype, "provider", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.AccountingSyncStatus }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.AccountingSyncStatus),
    __metadata("design:type", String)
], AccountingSyncFilterDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Entity type (INVOICE, CUSTOMER, PAYMENT)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AccountingSyncFilterDto.prototype, "entityType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Number of records to return', default: 50 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], AccountingSyncFilterDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Number of records to skip', default: 0 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], AccountingSyncFilterDto.prototype, "offset", void 0);
class AccountingSyncResponseDto {
}
exports.AccountingSyncResponseDto = AccountingSyncResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], AccountingSyncResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], AccountingSyncResponseDto.prototype, "tenantId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.AccountingProvider }),
    __metadata("design:type", String)
], AccountingSyncResponseDto.prototype, "provider", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], AccountingSyncResponseDto.prototype, "externalId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], AccountingSyncResponseDto.prototype, "entityType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], AccountingSyncResponseDto.prototype, "entityId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.AccountingSyncStatus }),
    __metadata("design:type", String)
], AccountingSyncResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], AccountingSyncResponseDto.prototype, "direction", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], AccountingSyncResponseDto.prototype, "syncedAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], AccountingSyncResponseDto.prototype, "error", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], AccountingSyncResponseDto.prototype, "retryCount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], AccountingSyncResponseDto.prototype, "lastRetryAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], AccountingSyncResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], AccountingSyncResponseDto.prototype, "updatedAt", void 0);
