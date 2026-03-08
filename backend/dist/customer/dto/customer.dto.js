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
exports.CustomerWithBookingsDto = exports.MarketingConsentDto = exports.GdprConsentDto = exports.CustomerSearchDto = exports.CustomerResponseDto = exports.UpdateCustomerDto = exports.CreateCustomerDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateCustomerDto {
}
exports.CreateCustomerDto = CreateCustomerDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Customer phone number',
        example: '+390123456789',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(8, 20),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Customer email',
        example: 'customer@example.com',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'First name',
        example: 'Mario',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Last name',
        example: 'Rossi',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'GDPR consent given',
        example: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateCustomerDto.prototype, "gdprConsent", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Marketing consent given',
        example: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateCustomerDto.prototype, "marketingConsent", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Customer notes',
        example: 'Preferred contact time: morning',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "notes", void 0);
class UpdateCustomerDto {
}
exports.UpdateCustomerDto = UpdateCustomerDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '+390123456789' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCustomerDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'customer@example.com' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], UpdateCustomerDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Mario' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCustomerDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Rossi' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCustomerDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Preferred contact time: morning' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCustomerDto.prototype, "notes", void 0);
class CustomerResponseDto {
}
exports.CustomerResponseDto = CustomerResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '550e8400-e29b-41d4-a716-446655440000' }),
    __metadata("design:type", String)
], CustomerResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '+390123456789' }),
    __metadata("design:type", String)
], CustomerResponseDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'customer@example.com' }),
    __metadata("design:type", String)
], CustomerResponseDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Mario' }),
    __metadata("design:type", String)
], CustomerResponseDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Rossi' }),
    __metadata("design:type", String)
], CustomerResponseDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true }),
    __metadata("design:type", Boolean)
], CustomerResponseDto.prototype, "gdprConsent", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-01-10T10:00:00Z' }),
    __metadata("design:type", Date)
], CustomerResponseDto.prototype, "gdprConsentAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: false }),
    __metadata("design:type", Boolean)
], CustomerResponseDto.prototype, "marketingConsent", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Preferred contact time: morning' }),
    __metadata("design:type", String)
], CustomerResponseDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-01-10T08:30:00Z' }),
    __metadata("design:type", Date)
], CustomerResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-01-10T08:30:00Z' }),
    __metadata("design:type", Date)
], CustomerResponseDto.prototype, "updatedAt", void 0);
class CustomerSearchDto {
}
exports.CustomerSearchDto = CustomerSearchDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Search by phone number',
        example: '+390123456789',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CustomerSearchDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Search by email',
        example: 'customer@example.com',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], CustomerSearchDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Search by name',
        example: 'Mario',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CustomerSearchDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Limit results',
        example: 20,
    }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CustomerSearchDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Offset for pagination',
        example: 0,
    }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CustomerSearchDto.prototype, "offset", void 0);
class GdprConsentDto {
}
exports.GdprConsentDto = GdprConsentDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'GDPR consent given',
        example: true,
    }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], GdprConsentDto.prototype, "consent", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Consent timestamp',
        example: '2024-01-10T10:00:00Z',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], GdprConsentDto.prototype, "consentAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Consent method',
        example: 'web_form',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GdprConsentDto.prototype, "method", void 0);
class MarketingConsentDto {
}
exports.MarketingConsentDto = MarketingConsentDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Marketing consent given',
        example: true,
    }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], MarketingConsentDto.prototype, "consent", void 0);
class CustomerWithBookingsDto extends CustomerResponseDto {
}
exports.CustomerWithBookingsDto = CustomerWithBookingsDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Customer bookings',
        type: 'array',
    }),
    __metadata("design:type", Array)
], CustomerWithBookingsDto.prototype, "bookings", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Customer vehicles',
        type: 'array',
    }),
    __metadata("design:type", Array)
], CustomerWithBookingsDto.prototype, "vehicles", void 0);
