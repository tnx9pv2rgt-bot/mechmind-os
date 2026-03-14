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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const class_validator_1 = require("class-validator");
const auth_service_1 = require("../services/auth.service");
const mfa_service_1 = require("../mfa/mfa.service");
class LoginDto {
}
__decorate([
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], LoginDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], LoginDto.prototype, "password", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], LoginDto.prototype, "tenantSlug", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LoginDto.prototype, "totpCode", void 0);
class RefreshTokenDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RefreshTokenDto.prototype, "refreshToken", void 0);
class Verify2FADto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], Verify2FADto.prototype, "tempToken", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], Verify2FADto.prototype, "totpCode", void 0);
class RegisterDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "shopName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Matches)(/^[a-z0-9-]+$/, { message: 'Lo slug può contenere solo lettere minuscole, numeri e trattini' }),
    __metadata("design:type", String)
], RegisterDto.prototype, "slug", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8, { message: 'La password deve avere almeno 8 caratteri' }),
    __metadata("design:type", String)
], RegisterDto.prototype, "password", void 0);
let AuthController = class AuthController {
    constructor(authService, mfaService) {
        this.authService = authService;
        this.mfaService = mfaService;
    }
    async register(dto) {
        return this.authService.registerTenant({
            shopName: dto.shopName,
            slug: dto.slug,
            name: dto.name,
            email: dto.email,
            password: dto.password,
        });
    }
    async login(dto, ip) {
        const user = await this.authService.validateUser(dto.email, dto.password, dto.tenantSlug);
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const lockStatus = await this.authService.isAccountLocked(user.id);
        if (lockStatus.locked) {
            throw new common_1.UnauthorizedException(`Account locked until ${lockStatus.until?.toISOString()}`);
        }
        const mfaStatus = await this.mfaService.getStatus(user.id);
        if (mfaStatus.enabled) {
            if (dto.totpCode) {
                const result = await this.mfaService.verify(user.id, dto.totpCode);
                if (!result.valid) {
                    await this.authService.recordFailedLogin(user.id);
                    throw new common_1.UnauthorizedException('Invalid 2FA code');
                }
            }
            else {
                const tempToken = await this.authService.generateTwoFactorTempToken(user.id);
                return {
                    tempToken,
                    requiresMfa: true,
                    methods: ['totp', 'backup'],
                };
            }
        }
        await this.authService.updateLastLogin(user.id, ip);
        return this.authService.generateTokens(user);
    }
    async verifyTwoFactor(dto, ip) {
        const userId = await this.authService.verifyTwoFactorTempToken(dto.tempToken);
        const result = await this.mfaService.verify(userId, dto.totpCode);
        if (!result.valid) {
            throw new common_1.UnauthorizedException('Invalid 2FA code');
        }
        const user = await this.authService.getUserWithTwoFactorStatus(userId);
        await this.authService.updateLastLogin(userId, ip);
        return this.authService.generateTokens(user);
    }
    async refreshToken(dto) {
        return this.authService.refreshTokens(dto.refreshToken);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('register'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, throttler_1.Throttle)({ strict: { ttl: 3600000, limit: 3 } }),
    (0, swagger_1.ApiOperation)({
        summary: 'Registra nuovo tenant',
        description: 'Crea un nuovo tenant con il primo utente admin. Restituisce JWT tokens.',
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Tenant creato con successo' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Dati non validi' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Slug o email già in uso' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [RegisterDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, throttler_1.Throttle)({ strict: { ttl: 60000, limit: 5 } }),
    (0, swagger_1.ApiOperation)({
        summary: 'User login',
        description: 'Login with email/password. If 2FA is enabled, returns tempToken for verification.',
    }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                email: { type: 'string', example: 'user@example.com' },
                password: { type: 'string', example: 'password123' },
                tenantSlug: { type: 'string', example: 'garage-roma' },
                totpCode: {
                    type: 'string',
                    example: '123456',
                    description: 'Optional: TOTP code if 2FA enabled',
                },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Login successful or 2FA required',
        schema: {
            oneOf: [
                {
                    type: 'object',
                    properties: {
                        accessToken: { type: 'string' },
                        refreshToken: { type: 'string' },
                        expiresIn: { type: 'number' },
                    },
                },
                {
                    type: 'object',
                    properties: {
                        tempToken: { type: 'string' },
                        requiresTwoFactor: { type: 'boolean', example: true },
                        methods: { type: 'array', items: { type: 'string' } },
                    },
                },
            ],
        },
    }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Invalid credentials' }),
    (0, swagger_1.ApiResponse)({ status: 423, description: 'Account locked' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [LoginDto, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('verify-2fa'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, throttler_1.Throttle)({ strict: { ttl: 60000, limit: 10 } }),
    (0, swagger_1.ApiOperation)({
        summary: 'Verify 2FA code',
        description: 'Complete login with TOTP code or backup code after receiving tempToken',
    }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                tempToken: { type: 'string', description: 'Temporary token from login' },
                totpCode: { type: 'string', example: '123456', description: 'TOTP or backup code' },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '2FA verified, login complete',
        schema: {
            type: 'object',
            properties: {
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
                expiresIn: { type: 'number' },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Invalid temp token or 2FA code' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Verify2FADto, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyTwoFactor", null);
__decorate([
    (0, common_1.Post)('refresh'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, throttler_1.Throttle)({ default: { ttl: 60000, limit: 20 } }),
    (0, swagger_1.ApiOperation)({ summary: 'Refresh access token' }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                refreshToken: { type: 'string' },
            },
        },
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [RefreshTokenDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refreshToken", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('Authentication'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        mfa_service_1.MfaService])
], AuthController);
