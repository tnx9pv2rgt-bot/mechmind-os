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
exports.RegenerateBackupCodesResponseDto = exports.TwoFactorRequiredResponseDto = exports.TwoFactorStatusDto = exports.TwoFactorLoginDto = exports.DisableTwoFactorDto = exports.VerifyTwoFactorDto = exports.SetupTwoFactorResponseDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class SetupTwoFactorResponseDto {
}
exports.SetupTwoFactorResponseDto = SetupTwoFactorResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'TOTP secret (base32 encoded)' }),
    __metadata("design:type", String)
], SetupTwoFactorResponseDto.prototype, "secret", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'QR Code URI for authenticator apps' }),
    __metadata("design:type", String)
], SetupTwoFactorResponseDto.prototype, "qrCodeUri", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'QR Code as base64 image' }),
    __metadata("design:type", String)
], SetupTwoFactorResponseDto.prototype, "qrCodeImage", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Manual entry key' }),
    __metadata("design:type", String)
], SetupTwoFactorResponseDto.prototype, "manualEntryKey", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Backup codes (show only once)' }),
    __metadata("design:type", Array)
], SetupTwoFactorResponseDto.prototype, "backupCodes", void 0);
class VerifyTwoFactorDto {
}
exports.VerifyTwoFactorDto = VerifyTwoFactorDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'TOTP code from authenticator app', example: '123456' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(6, 6),
    (0, class_validator_1.Matches)(/^\d{6}$/, { message: 'Code must be 6 digits' }),
    __metadata("design:type", String)
], VerifyTwoFactorDto.prototype, "code", void 0);
class DisableTwoFactorDto {
}
exports.DisableTwoFactorDto = DisableTwoFactorDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'TOTP code or backup code', example: '123456' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DisableTwoFactorDto.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'User password for verification' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DisableTwoFactorDto.prototype, "password", void 0);
class TwoFactorLoginDto {
}
exports.TwoFactorLoginDto = TwoFactorLoginDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Email address' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TwoFactorLoginDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'User password' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TwoFactorLoginDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Tenant slug' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TwoFactorLoginDto.prototype, "tenantSlug", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'TOTP code or backup code', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TwoFactorLoginDto.prototype, "totpCode", void 0);
class TwoFactorStatusDto {
}
exports.TwoFactorStatusDto = TwoFactorStatusDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Whether 2FA is enabled' }),
    __metadata("design:type", Boolean)
], TwoFactorStatusDto.prototype, "enabled", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'When 2FA was verified' }),
    __metadata("design:type", Date)
], TwoFactorStatusDto.prototype, "verifiedAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Number of remaining backup codes' }),
    __metadata("design:type", Number)
], TwoFactorStatusDto.prototype, "backupCodesCount", void 0);
class TwoFactorRequiredResponseDto {
}
exports.TwoFactorRequiredResponseDto = TwoFactorRequiredResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Temporary token for 2FA verification' }),
    __metadata("design:type", String)
], TwoFactorRequiredResponseDto.prototype, "tempToken", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Whether 2FA is required' }),
    __metadata("design:type", Boolean)
], TwoFactorRequiredResponseDto.prototype, "requiresTwoFactor", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Methods available for 2FA' }),
    __metadata("design:type", Array)
], TwoFactorRequiredResponseDto.prototype, "methods", void 0);
class RegenerateBackupCodesResponseDto {
}
exports.RegenerateBackupCodesResponseDto = RegenerateBackupCodesResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'New backup codes (show only once)' }),
    __metadata("design:type", Array)
], RegenerateBackupCodesResponseDto.prototype, "backupCodes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Warning message' }),
    __metadata("design:type", String)
], RegenerateBackupCodesResponseDto.prototype, "warning", void 0);
