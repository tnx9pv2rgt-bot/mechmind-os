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
exports.MfaLoginDto = exports.MfaRequiredResponseDto = exports.BackupCodesResponseDto = exports.MfaStatusResponseDto = exports.DisableMfaDto = exports.VerifyLoginMfaDto = exports.VerifyMfaDto = exports.EnrollMfaResponseDto = exports.EnrollMfaDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class EnrollMfaDto {
}
exports.EnrollMfaDto = EnrollMfaDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'User email for the TOTP account label' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EnrollMfaDto.prototype, "email", void 0);
class EnrollMfaResponseDto {
}
exports.EnrollMfaResponseDto = EnrollMfaResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'TOTP secret (base32 encoded)' }),
    __metadata("design:type", String)
], EnrollMfaResponseDto.prototype, "secret", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'QR Code as base64 image' }),
    __metadata("design:type", String)
], EnrollMfaResponseDto.prototype, "qrCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Manual entry key for authenticator apps' }),
    __metadata("design:type", String)
], EnrollMfaResponseDto.prototype, "manualEntryKey", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Backup codes (show only once)' }),
    __metadata("design:type", Array)
], EnrollMfaResponseDto.prototype, "backupCodes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Warning message' }),
    __metadata("design:type", String)
], EnrollMfaResponseDto.prototype, "warning", void 0);
class VerifyMfaDto {
}
exports.VerifyMfaDto = VerifyMfaDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'TOTP code from authenticator app or backup code',
        example: '123456',
        minLength: 6,
        maxLength: 9
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(6, 9),
    __metadata("design:type", String)
], VerifyMfaDto.prototype, "token", void 0);
class VerifyLoginMfaDto {
}
exports.VerifyLoginMfaDto = VerifyLoginMfaDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Temporary token from login step' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], VerifyLoginMfaDto.prototype, "tempToken", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'TOTP code from authenticator app or backup code',
        example: '123456'
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(6, 9),
    __metadata("design:type", String)
], VerifyLoginMfaDto.prototype, "token", void 0);
class DisableMfaDto {
}
exports.DisableMfaDto = DisableMfaDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'TOTP code or backup code',
        example: '123456'
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DisableMfaDto.prototype, "token", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'User password for verification' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DisableMfaDto.prototype, "password", void 0);
class MfaStatusResponseDto {
}
exports.MfaStatusResponseDto = MfaStatusResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Whether MFA is enabled' }),
    __metadata("design:type", Boolean)
], MfaStatusResponseDto.prototype, "enabled", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'When MFA was verified/enabled' }),
    __metadata("design:type", Date)
], MfaStatusResponseDto.prototype, "verifiedAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Number of remaining backup codes' }),
    __metadata("design:type", Number)
], MfaStatusResponseDto.prototype, "backupCodesCount", void 0);
class BackupCodesResponseDto {
}
exports.BackupCodesResponseDto = BackupCodesResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'New backup codes (show only once)' }),
    __metadata("design:type", Array)
], BackupCodesResponseDto.prototype, "backupCodes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Warning message' }),
    __metadata("design:type", String)
], BackupCodesResponseDto.prototype, "warning", void 0);
class MfaRequiredResponseDto {
}
exports.MfaRequiredResponseDto = MfaRequiredResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Temporary token for MFA verification' }),
    __metadata("design:type", String)
], MfaRequiredResponseDto.prototype, "tempToken", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Whether MFA is required' }),
    __metadata("design:type", Boolean)
], MfaRequiredResponseDto.prototype, "requiresMfa", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Methods available for MFA' }),
    __metadata("design:type", Array)
], MfaRequiredResponseDto.prototype, "methods", void 0);
class MfaLoginDto {
}
exports.MfaLoginDto = MfaLoginDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Email address' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MfaLoginDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'User password' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MfaLoginDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Tenant slug' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MfaLoginDto.prototype, "tenantSlug", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'TOTP code or backup code (if MFA enabled)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MfaLoginDto.prototype, "mfaCode", void 0);
