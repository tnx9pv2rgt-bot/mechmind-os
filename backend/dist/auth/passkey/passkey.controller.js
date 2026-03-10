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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasskeyController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const jwt_auth_guard_1 = require("../guards/jwt-auth.guard");
const current_user_decorator_1 = require("../decorators/current-user.decorator");
const passkey_service_1 = require("./passkey.service");
const passkey_dto_1 = require("./dto/passkey.dto");
let PasskeyController = class PasskeyController {
    constructor(passkeyService) {
        this.passkeyService = passkeyService;
    }
    async registerOptions(userId) {
        return this.passkeyService.generateRegistrationOptions(userId);
    }
    async registerVerify(userId, dto, userAgent) {
        return this.passkeyService.verifyRegistration(userId, dto.attestation, dto.sessionId, dto.deviceName, userAgent);
    }
    async authenticateOptions() {
        return this.passkeyService.generateAuthenticationOptions();
    }
    async authenticateVerify(dto, ip) {
        return this.passkeyService.verifyAuthentication(dto.assertion, dto.sessionId, ip);
    }
    async list(userId) {
        return this.passkeyService.listPasskeys(userId);
    }
    async remove(userId, passkeyId) {
        return this.passkeyService.deletePasskey(userId, passkeyId);
    }
};
exports.PasskeyController = PasskeyController;
__decorate([
    (0, common_1.Post)('register-options'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Generate passkey registration options' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Registration options generated' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PasskeyController.prototype, "registerOptions", null);
__decorate([
    (0, common_1.Post)('register-verify'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Verify and save passkey registration' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Passkey registered successfully' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('user-agent')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, passkey_dto_1.RegisterVerifyDto, String]),
    __metadata("design:returntype", Promise)
], PasskeyController.prototype, "registerVerify", null);
__decorate([
    (0, common_1.Post)('authenticate-options'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Generate passkey authentication options' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Authentication options generated' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PasskeyController.prototype, "authenticateOptions", null);
__decorate([
    (0, common_1.Post)('authenticate-verify'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, throttler_1.Throttle)({ strict: { ttl: 60000, limit: 5 } }),
    (0, swagger_1.ApiOperation)({ summary: 'Verify passkey authentication and login' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Authentication successful, tokens returned' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid assertion or challenge' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [passkey_dto_1.AuthenticateVerifyDto, String]),
    __metadata("design:returntype", Promise)
], PasskeyController.prototype, "authenticateVerify", null);
__decorate([
    (0, common_1.Get)('list'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'List user passkeys' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Passkeys list returned' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PasskeyController.prototype, "list", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a passkey' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'Passkey deleted' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Passkey not found' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PasskeyController.prototype, "remove", null);
exports.PasskeyController = PasskeyController = __decorate([
    (0, swagger_1.ApiTags)('Passkeys'),
    (0, common_1.Controller)('auth/passkey'),
    __metadata("design:paramtypes", [passkey_service_1.PasskeyService])
], PasskeyController);
