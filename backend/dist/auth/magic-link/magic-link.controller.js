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
exports.MagicLinkController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const magic_link_service_1 = require("./magic-link.service");
const magic_link_dto_1 = require("./dto/magic-link.dto");
let MagicLinkController = class MagicLinkController {
    constructor(magicLinkService) {
        this.magicLinkService = magicLinkService;
    }
    async send(dto, ip, req) {
        return this.magicLinkService.sendMagicLink(dto.email, dto.tenantSlug, ip, req.headers['user-agent']);
    }
    async verify(dto, ip) {
        try {
            return await this.magicLinkService.verifyMagicLink(dto.token, ip);
        }
        catch (error) {
            if (error instanceof magic_link_service_1.MagicLinkError) {
                throw new common_1.BadRequestException(error.message);
            }
            throw error;
        }
    }
};
exports.MagicLinkController = MagicLinkController;
__decorate([
    (0, common_1.Post)('send'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, throttler_1.Throttle)({ strict: { ttl: 60000, limit: 5 } }),
    (0, swagger_1.ApiOperation)({
        summary: 'Send magic link email',
        description: 'Sends a magic link to the user email for passwordless login',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Magic link sent (always returns success)' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Ip)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [magic_link_dto_1.SendMagicLinkDto, String, Object]),
    __metadata("design:returntype", Promise)
], MagicLinkController.prototype, "send", null);
__decorate([
    (0, common_1.Post)('verify'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, throttler_1.Throttle)({ strict: { ttl: 60000, limit: 5 } }),
    (0, swagger_1.ApiOperation)({
        summary: 'Verify magic link token',
        description: 'Verifies the magic link token and returns auth tokens',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Token verified, auth tokens returned' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid or expired token' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [magic_link_dto_1.VerifyMagicLinkDto, String]),
    __metadata("design:returntype", Promise)
], MagicLinkController.prototype, "verify", null);
exports.MagicLinkController = MagicLinkController = __decorate([
    (0, swagger_1.ApiTags)('Magic Link'),
    (0, common_1.Controller)('auth/magic-link'),
    __metadata("design:paramtypes", [magic_link_service_1.MagicLinkService])
], MagicLinkController);
