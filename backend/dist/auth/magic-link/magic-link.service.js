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
exports.MagicLinkError = exports.MagicLinkService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto = __importStar(require("crypto"));
const prisma_service_1 = require("../../common/services/prisma.service");
const logger_service_1 = require("../../common/services/logger.service");
const auth_service_1 = require("../services/auth.service");
const email_service_1 = require("../../notifications/email/email.service");
let MagicLinkService = class MagicLinkService {
    constructor(prisma, config, logger, authService, emailService) {
        this.prisma = prisma;
        this.config = config;
        this.logger = logger;
        this.authService = authService;
        this.emailService = emailService;
        this.tokenExpiryMinutes = 15;
        this.frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3001');
    }
    async sendMagicLink(email, tenantSlug, ipAddress, userAgent) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { slug: tenantSlug },
        });
        if (!tenant || !tenant.isActive) {
            return { sent: true };
        }
        const user = await this.prisma.user.findFirst({
            where: { email, tenantId: tenant.id, isActive: true },
        });
        if (!user) {
            return { sent: true };
        }
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + this.tokenExpiryMinutes * 60 * 1000);
        await this.prisma.magicLink.create({
            data: {
                email,
                token,
                tenantId: tenant.id,
                expiresAt,
                ipAddress,
                userAgent,
            },
        });
        const verifyUrl = `${this.frontendUrl}/auth/magic-link/verify?token=${token}`;
        await this.emailService.sendRawEmail({
            to: email,
            subject: 'Accedi a MechMind OS',
            html: this.getMagicLinkEmailHtml(user.name, verifyUrl, this.tokenExpiryMinutes),
        });
        this.logger.log(`Magic link sent to ${email} for tenant ${tenantSlug}`);
        return { sent: true };
    }
    async verifyMagicLink(token, ip) {
        const magicLink = await this.prisma.magicLink.findUnique({
            where: { token },
        });
        if (!magicLink) {
            throw new MagicLinkError('Link non valido');
        }
        if (magicLink.usedAt) {
            throw new MagicLinkError('Link gia\' utilizzato');
        }
        if (magicLink.expiresAt < new Date()) {
            throw new MagicLinkError('Link scaduto');
        }
        await this.prisma.magicLink.update({
            where: { id: magicLink.id },
            data: { usedAt: new Date() },
        });
        const user = await this.prisma.user.findFirst({
            where: {
                email: magicLink.email,
                tenantId: magicLink.tenantId,
                isActive: true,
            },
            include: { tenant: true },
        });
        if (!user || !user.tenant.isActive) {
            throw new MagicLinkError('Utente non trovato o non attivo');
        }
        await this.authService.updateLastLogin(user.id, ip);
        return this.authService.generateTokens({
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
        });
    }
    getMagicLinkEmailHtml(name, url, expiryMinutes) {
        return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #1d1d1f; font-size: 28px; font-weight: 600; margin: 0;">MechMind OS</h1>
        </div>
        <p style="color: #1d1d1f; font-size: 17px; line-height: 1.5;">Ciao <strong>${name}</strong>,</p>
        <p style="color: #424245; font-size: 17px; line-height: 1.5;">Clicca il pulsante qui sotto per accedere al tuo account:</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${url}" style="background: #0071e3; color: white; padding: 14px 32px; text-decoration: none; border-radius: 12px; font-size: 17px; font-weight: 500; display: inline-block;">Accedi ora</a>
        </div>
        <p style="color: #86868b; font-size: 14px; line-height: 1.5;">Questo link scade tra ${expiryMinutes} minuti ed e' utilizzabile una sola volta.</p>
        <p style="color: #86868b; font-size: 14px; line-height: 1.5;">Se non hai richiesto questo link, puoi ignorare questa email.</p>
        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;" />
        <p style="color: #86868b; font-size: 12px; text-align: center;">MechMind OS - Gestionale Officine</p>
      </div>
    `;
    }
};
exports.MagicLinkService = MagicLinkService;
exports.MagicLinkService = MagicLinkService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        logger_service_1.LoggerService,
        auth_service_1.AuthService,
        email_service_1.EmailService])
], MagicLinkService);
class MagicLinkError extends Error {
    constructor(message) {
        super(message);
        this.name = 'MagicLinkError';
    }
}
exports.MagicLinkError = MagicLinkError;
