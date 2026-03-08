"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../../common/services/prisma.service");
const logger_service_1 = require("../../common/services/logger.service");
let AuthService = class AuthService {
    constructor(jwtService, prisma, configService, logger) {
        this.jwtService = jwtService;
        this.prisma = prisma;
        this.configService = configService;
        this.logger = logger;
    }
    async validateUser(email, password, tenantSlug) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { slug: tenantSlug },
        });
        if (!tenant || !tenant.isActive) {
            throw new common_1.UnauthorizedException('Invalid tenant or tenant is inactive');
        }
        const user = await this.prisma.user.findFirst({
            where: {
                email,
                tenantId: tenant.id,
            },
            include: {
                tenant: true,
            },
        });
        if (!user || !user.isActive) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash || '');
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            isActive: user.isActive,
            tenantId: user.tenantId,
            tenant: {
                id: tenant.id,
                name: tenant.name,
                slug: tenant.slug,
                isActive: tenant.isActive,
            },
        };
    }
    async generateTokens(user) {
        const subject = `${user.id}:${user.tenantId}`;
        const payload = {
            sub: subject,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
        };
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, {
                secret: this.configService.get('JWT_SECRET'),
                expiresIn: this.configService.get('JWT_EXPIRES_IN', '24h'),
            }),
            this.jwtService.signAsync(payload, {
                secret: this.configService.get('JWT_REFRESH_SECRET'),
                expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
            }),
        ]);
        const expiresIn = parseInt(this.configService.get('JWT_EXPIRES_IN_SECONDS', '86400'));
        return {
            accessToken,
            refreshToken,
            expiresIn,
        };
    }
    async refreshTokens(refreshToken) {
        try {
            const payload = await this.jwtService.verifyAsync(refreshToken, {
                secret: this.configService.get('JWT_REFRESH_SECRET'),
            });
            const [userId, tenantId] = payload.sub.split(':');
            const user = await this.prisma.user.findFirst({
                where: {
                    id: userId,
                    tenantId: tenantId,
                    isActive: true,
                },
                include: {
                    tenant: true,
                },
            });
            if (!user || !user.tenant.isActive) {
                throw new common_1.UnauthorizedException('User or tenant is no longer active');
            }
            const userWithTenant = {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                isActive: user.isActive,
                tenantId: user.tenantId,
                tenant: {
                    id: user.tenant.id,
                    name: user.tenant.name,
                    slug: user.tenant.slug,
                    isActive: user.tenant.isActive,
                },
            };
            return this.generateTokens(userWithTenant);
        }
        catch (error) {
            this.logger.error('Token refresh failed', error.stack);
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
    }
    extractTenantIdFromPayload(payload) {
        if (payload.tenantId) {
            return payload.tenantId;
        }
        const parts = payload.sub.split(':');
        if (parts.length >= 2) {
            return parts[1];
        }
        throw new common_1.UnauthorizedException('Invalid token: tenant ID not found');
    }
    extractUserIdFromPayload(payload) {
        const parts = payload.sub.split(':');
        return parts[0];
    }
    async hashPassword(password) {
        const saltRounds = 12;
        return bcrypt.hash(password, saltRounds);
    }
    async validateApiKey(apiKey) {
        this.logger.warn('API key validation not fully implemented');
        return { tenantId: '', valid: false };
    }
    async generateTwoFactorTempToken(userId) {
        const payload = {
            sub: userId,
            type: '2fa_pending',
            iat: Math.floor(Date.now() / 1000),
        };
        return this.jwtService.signAsync(payload, {
            secret: this.configService.get('JWT_2FA_SECRET'),
            expiresIn: '5m',
        });
    }
    async verifyTwoFactorTempToken(tempToken) {
        try {
            const payload = await this.jwtService.verifyAsync(tempToken, {
                secret: this.configService.get('JWT_2FA_SECRET'),
            });
            if (payload.type !== '2fa_pending') {
                throw new common_1.UnauthorizedException('Invalid token type');
            }
            return payload.sub;
        }
        catch (error) {
            throw new common_1.UnauthorizedException('Invalid or expired 2FA token');
        }
    }
    async getUserWithTwoFactorStatus(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { tenant: true },
        });
        if (!user || !user.isActive || !user.tenant.isActive) {
            throw new common_1.UnauthorizedException('User not found or inactive');
        }
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            isActive: user.isActive,
            tenantId: user.tenantId,
            tenant: {
                id: user.tenant.id,
                name: user.tenant.name,
                slug: user.tenant.slug,
                isActive: user.tenant.isActive,
            },
            totpEnabled: user.totpEnabled,
        };
    }
    async verifyPassword(password, hash) {
        return bcrypt.compare(password, hash);
    }
    async logAdminAction(action) {
        this.logger.warn(`Admin action: ${action.action} by admin ${action.adminId}${action.targetUserId ? ` on user ${action.targetUserId}` : ''}`);
        const tenantId = (await this.getUserTenant(action.adminId)).tenantId;
        await this.prisma.authAuditLog.create({
            data: {
                userId: action.adminId,
                tenantId: tenantId,
                action: 'admin_action',
                status: 'success',
                details: action,
            },
        });
    }
    async getUserTenant(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { tenantId: true },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        return user;
    }
    async updateLastLogin(userId, ip) {
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                lastLoginAt: new Date(),
                lastLoginIp: ip,
            },
        });
    }
    async recordFailedLogin(userId) {
        this.logger.warn(`Failed login attempt for user ${userId}`);
    }
    async isAccountLocked(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { lockedUntil: true },
        });
        if (!user?.lockedUntil) {
            return { locked: false };
        }
        if (user.lockedUntil < new Date()) {
            await this.prisma.user.update({
                where: { id: userId },
                data: { lockedUntil: null },
            });
            return { locked: false };
        }
        return { locked: true, until: user.lockedUntil };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        prisma_service_1.PrismaService,
        config_1.ConfigService,
        logger_service_1.LoggerService])
], AuthService);
