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
exports.AuthenticateVerifyDto = exports.RegisterVerifyDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class RegisterVerifyDto {
}
exports.RegisterVerifyDto = RegisterVerifyDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Session ID from registration options' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RegisterVerifyDto.prototype, "sessionId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'WebAuthn attestation response from browser' }),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], RegisterVerifyDto.prototype, "attestation", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Optional device name', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterVerifyDto.prototype, "deviceName", void 0);
class AuthenticateVerifyDto {
}
exports.AuthenticateVerifyDto = AuthenticateVerifyDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Session ID from authentication options' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], AuthenticateVerifyDto.prototype, "sessionId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'WebAuthn assertion response from browser' }),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], AuthenticateVerifyDto.prototype, "assertion", void 0);
