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
exports.TwoFactorController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../../guards/jwt-auth.guard");
const roles_guard_1 = require("../../guards/roles.guard");
const roles_decorator_1 = require("../../decorators/roles.decorator");
const current_user_decorator_1 = require("../../decorators/current-user.decorator");
const two_factor_service_1 = require("../services/two-factor.service");
const auth_service_1 = require("../../services/auth.service");
const prisma_service_1 = require("../../../common/services/prisma.service");
const two_factor_dto_1 = require("../dto/two-factor.dto");
const roles_guard_2 = require("../../guards/roles.guard");
let TwoFactorController = class TwoFactorController {
    constructor(twoFactorService, authService, prisma) {
        this.twoFactorService = twoFactorService;
        this.authService = authService;
        this.prisma = prisma;
    }
    async getStatus(userId) {
        return this.twoFactorService.getStatus(userId);
    }
    async setup(userId, email, tenantId) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { name: true },
        });
        return this.twoFactorService.generateSecret(userId, email, tenant?.name || 'MechMind');
    }
    async verify(userId, dto) {
        await this.twoFactorService.verifyAndEnable(userId, dto.code);
        return { message: 'Two-factor authentication enabled successfully' };
    }
    async disable(userId, dto) {
        await this.twoFactorService.disable(userId, dto.code, dto.password, (hash) => this.authService.verifyPassword(dto.password, hash));
        return { message: 'Two-factor authentication disabled successfully' };
    }
    async regenerateBackupCodes(userId, dto) {
        const backupCodes = await this.twoFactorService.regenerateBackupCodes(userId, dto.code);
        return {
            backupCodes,
            warning: 'Save these codes immediately. They will not be shown again.',
        };
    }
    async adminReset(targetUserId, adminId) {
        await this.authService.logAdminAction({
            adminId,
            action: '2FA_RESET',
            targetUserId,
            timestamp: new Date(),
        });
        await this.twoFactorService.adminDisable(targetUserId);
        return { message: 'Two-factor authentication has been reset. User must set up 2FA again.' };
    }
    async requireTwoFactorForAdmins(tenantId) {
        const users = await this.prisma.user.findMany({
            where: {
                tenantId,
                role: { in: [roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.MANAGER] },
                totpEnabled: false,
            },
            select: { id: true, email: true },
        });
        return {
            message: '2FA requirement policy updated for admin users',
            affectedUsers: users.length,
        };
    }
};
exports.TwoFactorController = TwoFactorController;
__decorate([
    (0, common_1.Get)('status'),
    (0, swagger_1.ApiOperation)({ summary: 'Get 2FA status for current user' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: '2FA status retrieved', type: two_factor_dto_1.TwoFactorStatusDto }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TwoFactorController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Post)('setup'),
    (0, swagger_1.ApiOperation)({
        summary: 'Setup 2FA for current user',
        description: 'Generates TOTP secret and QR code. Returns backup codes - SAVE THEM NOW!'
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: '2FA setup initiated', type: two_factor_dto_1.SetupTwoFactorResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 400, description: '2FA already enabled' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('email')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], TwoFactorController.prototype, "setup", null);
__decorate([
    (0, common_1.Post)('verify'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Verify and enable 2FA',
        description: 'Verifies the TOTP code and enables 2FA permanently'
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: '2FA enabled successfully' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Invalid verification code' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, two_factor_dto_1.VerifyTwoFactorDto]),
    __metadata("design:returntype", Promise)
], TwoFactorController.prototype, "verify", null);
__decorate([
    (0, common_1.Post)('disable'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Disable 2FA',
        description: 'Disables 2FA for the current user. Requires password and current TOTP/backup code.'
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: '2FA disabled successfully' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Invalid credentials' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, two_factor_dto_1.DisableTwoFactorDto]),
    __metadata("design:returntype", Promise)
], TwoFactorController.prototype, "disable", null);
__decorate([
    (0, common_1.Post)('backup-codes/regenerate'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Regenerate backup codes',
        description: 'Generates new backup codes. Old codes become invalid immediately.'
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'New backup codes generated', type: two_factor_dto_1.RegenerateBackupCodesResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Invalid TOTP code' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, two_factor_dto_1.VerifyTwoFactorDto]),
    __metadata("design:returntype", Promise)
], TwoFactorController.prototype, "regenerateBackupCodes", null);
__decorate([
    (0, common_1.Post)('admin/reset'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({
        summary: 'Admin: Reset 2FA for user (emergency)',
        description: 'Administrators can reset 2FA for users who lost access. Requires admin role.'
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: '2FA reset successfully' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Insufficient permissions' }),
    __param(0, (0, common_1.Body)('userId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TwoFactorController.prototype, "adminReset", null);
__decorate([
    (0, common_1.Post)('admin/require'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({
        summary: 'Admin: Require 2FA for all admin users',
        description: 'Sets policy requiring 2FA for admin and manager roles'
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Policy updated' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TwoFactorController.prototype, "requireTwoFactorForAdmins", null);
exports.TwoFactorController = TwoFactorController = __decorate([
    (0, swagger_1.ApiTags)('Two-Factor Authentication'),
    (0, common_1.Controller)('auth/2fa'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [two_factor_service_1.TwoFactorService,
        auth_service_1.AuthService,
        prisma_service_1.PrismaService])
], TwoFactorController);
