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
exports.MfaController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../guards/jwt-auth.guard");
const roles_decorator_1 = require("../decorators/roles.decorator");
const current_user_decorator_1 = require("../decorators/current-user.decorator");
const mfa_service_1 = require("./mfa.service");
const auth_service_1 = require("../services/auth.service");
const prisma_service_1 = require("../../common/services/prisma.service");
const mfa_dto_1 = require("./dto/mfa.dto");
const roles_guard_1 = require("../guards/roles.guard");
let MfaController = class MfaController {
    constructor(mfaService, authService, prisma) {
        this.mfaService = mfaService;
        this.authService = authService;
        this.prisma = prisma;
    }
    async getStatus(userId) {
        return this.mfaService.getStatus(userId);
    }
    async enroll(userId, email) {
        const result = await this.mfaService.enroll(userId, email);
        return {
            secret: result.secret,
            qrCode: result.qrCode,
            manualEntryKey: result.manualEntryKey,
            backupCodes: result.backupCodes,
            warning: 'Save these backup codes immediately. They will not be shown again.',
        };
    }
    async verify(userId, dto) {
        await this.mfaService.verifyAndEnable(userId, dto.token);
        return { message: 'Two-factor authentication enabled successfully' };
    }
    async verifyLogin(dto, req) {
        const userId = await this.authService.verifyTwoFactorTempToken(dto.tempToken);
        const result = await this.mfaService.verify(userId, dto.token);
        if (!result.valid) {
            throw new common_1.UnauthorizedException(`Invalid code. ${result.remainingAttempts} attempts remaining.`);
        }
        const user = await this.authService.getUserWithTwoFactorStatus(userId);
        await this.authService.updateLastLogin(userId, req.ip);
        const mfaSession = await this.mfaService.createMfaSession(userId);
        const tokens = await this.authService.generateTokens(user);
        return { ...tokens, mfaSessionToken: mfaSession.mfaSessionToken };
    }
    async disable(userId, dto) {
        await this.mfaService.disable(userId, dto.token, dto.password);
        return { message: 'Two-factor authentication disabled successfully' };
    }
    async createBackupCodes(userId, dto) {
        const backupCodes = await this.mfaService.regenerateBackupCodes(userId, dto.token);
        return {
            backupCodes,
            warning: 'Save these codes immediately. They will not be shown again.',
        };
    }
    async adminReset(targetUserId, adminId) {
        await this.authService.logAdminAction({
            adminId,
            action: 'MFA_RESET',
            targetUserId,
            timestamp: new Date(),
        });
        await this.mfaService.adminReset(targetUserId);
        return { message: 'Two-factor authentication has been reset. User must set up MFA again.' };
    }
    async getUsersWithoutMFA(tenantId) {
        const users = await this.prisma.user.findMany({
            where: {
                tenantId,
                role: { in: [roles_guard_1.UserRole.ADMIN, roles_guard_1.UserRole.MANAGER] },
                totpEnabled: false,
            },
            select: { id: true, email: true, role: true },
        });
        return { users };
    }
};
exports.MfaController = MfaController;
__decorate([
    (0, common_1.Get)('status'),
    (0, swagger_1.ApiOperation)({ summary: 'Get MFA status for current user' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'MFA status retrieved', type: mfa_dto_1.MfaStatusResponseDto }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MfaController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Post)('enroll'),
    (0, swagger_1.ApiOperation)({
        summary: 'Enroll in MFA',
        description: 'Generates TOTP secret and QR code. Returns backup codes - SAVE THEM NOW!',
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'MFA enrollment initiated', type: mfa_dto_1.EnrollMfaResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'MFA already enabled' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MfaController.prototype, "enroll", null);
__decorate([
    (0, common_1.Post)('verify'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Verify and enable MFA',
        description: 'Verifies the TOTP code and enables MFA permanently',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'MFA enabled successfully' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Invalid verification code' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, mfa_dto_1.VerifyMfaDto]),
    __metadata("design:returntype", Promise)
], MfaController.prototype, "verify", null);
__decorate([
    (0, common_1.Post)('verify-login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Verify MFA during login',
        description: 'Completes login with MFA code after receiving tempToken from login',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'MFA verified, tokens issued' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Invalid temp token or MFA code' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [mfa_dto_1.VerifyLoginMfaDto, Object]),
    __metadata("design:returntype", Promise)
], MfaController.prototype, "verifyLogin", null);
__decorate([
    (0, common_1.Delete)('disable'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Disable MFA',
        description: 'Disables MFA for the current user. Requires password and current MFA code.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'MFA disabled successfully' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Invalid credentials' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, mfa_dto_1.DisableMfaDto]),
    __metadata("design:returntype", Promise)
], MfaController.prototype, "disable", null);
__decorate([
    (0, common_1.Post)('backup-codes'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Generate new backup codes',
        description: 'Generates new backup codes. Old codes become invalid immediately.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'New backup codes generated',
        type: mfa_dto_1.BackupCodesResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Invalid MFA code' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, mfa_dto_1.VerifyMfaDto]),
    __metadata("design:returntype", Promise)
], MfaController.prototype, "createBackupCodes", null);
__decorate([
    (0, common_1.Post)('admin/reset'),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({
        summary: 'Admin: Reset MFA for user (emergency)',
        description: 'Administrators can reset MFA for users who lost access. Requires admin role.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'MFA reset successfully' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Insufficient permissions' }),
    __param(0, (0, common_1.Body)('userId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MfaController.prototype, "adminReset", null);
__decorate([
    (0, common_1.Get)('admin/required-users'),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({
        summary: 'Admin: List users requiring MFA',
        description: 'Lists all admin/manager users without MFA enabled',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List retrieved' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MfaController.prototype, "getUsersWithoutMFA", null);
exports.MfaController = MfaController = __decorate([
    (0, swagger_1.ApiTags)('MFA'),
    (0, common_1.Controller)('auth/mfa'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [mfa_service_1.MfaService,
        auth_service_1.AuthService,
        prisma_service_1.PrismaService])
], MfaController);
