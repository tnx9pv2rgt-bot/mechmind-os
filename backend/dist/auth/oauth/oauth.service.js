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
exports.OAuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../common/services/prisma.service");
const logger_service_1 = require("../../common/services/logger.service");
const auth_service_1 = require("../services/auth.service");
const jose = __importStar(require("jose"));
let OAuthService = class OAuthService {
    constructor(prisma, authService, configService, logger) {
        this.prisma = prisma;
        this.authService = authService;
        this.configService = configService;
        this.logger = logger;
        this.googleClientId = this.configService.get('GOOGLE_CLIENT_ID', '');
    }
    async loginWithGoogle(credential, tenantSlug, ip) {
        if (!this.googleClientId) {
            throw new common_1.BadRequestException('Google OAuth not configured');
        }
        const payload = await this.verifyGoogleToken(credential);
        if (!payload.email_verified) {
            throw new common_1.UnauthorizedException('Google email not verified');
        }
        const user = await this.findUserByOAuthEmail(payload.email, tenantSlug);
        await this.authService.updateLastLogin(user.id, ip);
        await this.authService.logAuthEvent({
            userId: user.id,
            tenantId: user.tenantId,
            action: 'oauth_google_login',
            status: 'success',
            ipAddress: ip,
        });
        return this.authService.generateTokens(user);
    }
    async verifyGoogleToken(credential) {
        try {
            const JWKS = jose.createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
            const { payload } = await jose.jwtVerify(credential, JWKS, {
                issuer: ['https://accounts.google.com', 'accounts.google.com'],
                audience: this.googleClientId,
            });
            return payload;
        }
        catch (error) {
            this.logger.error('Google token verification failed', error.stack);
            throw new common_1.UnauthorizedException('Invalid Google token');
        }
    }
    async findUserByOAuthEmail(email, tenantSlug) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { slug: tenantSlug },
        });
        if (!tenant || !tenant.isActive) {
            throw new common_1.UnauthorizedException('Tenant not found or inactive');
        }
        await this.prisma.setTenantContext(tenant.id);
        const user = await this.prisma.user.findFirst({
            where: { email, tenantId: tenant.id, isActive: true },
            include: { tenant: true },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('No account found with this email. Contact your administrator.');
        }
        return this.mapUserWithTenant(user);
    }
    mapUserWithTenant(user) {
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
        };
    }
};
exports.OAuthService = OAuthService;
exports.OAuthService = OAuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        auth_service_1.AuthService,
        config_1.ConfigService,
        logger_service_1.LoggerService])
], OAuthService);
