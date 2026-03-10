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
exports.PasskeyService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const server_1 = require("@simplewebauthn/server");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../../common/services/prisma.service");
const logger_service_1 = require("../../common/services/logger.service");
const redis_service_1 = require("../../common/services/redis.service");
const auth_service_1 = require("../services/auth.service");
let PasskeyService = class PasskeyService {
    constructor(prisma, config, logger, redis, authService) {
        this.prisma = prisma;
        this.config = config;
        this.logger = logger;
        this.redis = redis;
        this.authService = authService;
        this.challengeTtl = 300;
        this.rpId = this.config.get('WEBAUTHN_RP_ID', 'localhost');
        this.rpName = this.config.get('WEBAUTHN_RP_NAME', 'MechMind OS');
        this.origin = this.config.get('WEBAUTHN_ORIGIN', 'http://localhost:3001');
    }
    async generateRegistrationOptions(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, name: true, passkeys: { select: { credentialId: true } } },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const options = await (0, server_1.generateRegistrationOptions)({
            rpName: this.rpName,
            rpID: this.rpId,
            userName: user.email,
            userDisplayName: user.name,
            attestationType: 'none',
            excludeCredentials: user.passkeys.map((pk) => ({
                id: pk.credentialId,
            })),
            authenticatorSelection: {
                residentKey: 'preferred',
                userVerification: 'preferred',
            },
        });
        const sessionId = (0, crypto_1.randomUUID)();
        await this.redis.set(`passkey:reg:${sessionId}`, JSON.stringify({ challenge: options.challenge, userId }), this.challengeTtl);
        return { options: options, sessionId };
    }
    async verifyRegistration(userId, attestation, sessionId, deviceName, userAgent) {
        const stored = await this.redis.get(`passkey:reg:${sessionId}`);
        if (!stored) {
            throw new common_1.BadRequestException('Challenge expired or invalid session');
        }
        const { challenge, userId: storedUserId } = JSON.parse(stored);
        if (storedUserId !== userId) {
            throw new common_1.ForbiddenException('Session mismatch');
        }
        const verification = await (0, server_1.verifyRegistrationResponse)({
            response: attestation,
            expectedChallenge: challenge,
            expectedOrigin: this.origin,
            expectedRPID: this.rpId,
        });
        if (!verification.verified || !verification.registrationInfo) {
            throw new common_1.BadRequestException('Registration verification failed');
        }
        const { credential, credentialDeviceType } = verification.registrationInfo;
        const passkey = await this.prisma.passkey.create({
            data: {
                userId,
                credentialId: Buffer.from(credential.id).toString('base64url'),
                publicKey: Buffer.from(credential.publicKey).toString('base64url'),
                counter: credential.counter,
                transports: (credential.transports ?? []),
                deviceName: deviceName || this.getDeviceName(userAgent),
                deviceType: credentialDeviceType || 'unknown',
                registeredAt: new Date(),
                isBackupKey: false,
            },
        });
        await this.redis.del(`passkey:reg:${sessionId}`);
        this.logger.log(`Passkey registered for user ${userId}: ${passkey.id}`);
        return { id: passkey.id };
    }
    async generateAuthenticationOptions() {
        const options = await (0, server_1.generateAuthenticationOptions)({
            rpID: this.rpId,
            userVerification: 'preferred',
        });
        const sessionId = (0, crypto_1.randomUUID)();
        await this.redis.set(`passkey:auth:${sessionId}`, options.challenge, this.challengeTtl);
        return { options: options, sessionId };
    }
    async verifyAuthentication(assertion, sessionId, ip) {
        const challenge = await this.redis.get(`passkey:auth:${sessionId}`);
        if (!challenge) {
            throw new common_1.BadRequestException('Challenge expired or invalid session');
        }
        const credentialId = assertion.id;
        const passkey = await this.prisma.passkey.findFirst({
            where: { credentialId },
            include: {
                user: {
                    include: { tenant: true },
                },
            },
        });
        if (!passkey || !passkey.user) {
            throw new common_1.BadRequestException('Passkey not found');
        }
        const verification = await (0, server_1.verifyAuthenticationResponse)({
            response: assertion,
            expectedChallenge: challenge,
            expectedOrigin: this.origin,
            expectedRPID: this.rpId,
            credential: {
                id: passkey.credentialId,
                publicKey: Buffer.from(passkey.publicKey, 'base64url'),
                counter: passkey.counter,
                transports: (passkey.transports ?? []),
            },
        });
        if (!verification.verified) {
            throw new common_1.BadRequestException('Authentication verification failed');
        }
        await this.prisma.passkey.update({
            where: { id: passkey.id },
            data: {
                counter: verification.authenticationInfo.newCounter,
                lastUsedAt: new Date(),
            },
        });
        await this.redis.del(`passkey:auth:${sessionId}`);
        const { user } = passkey;
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
        await this.authService.updateLastLogin(user.id, ip);
        return this.authService.generateTokens(userWithTenant);
    }
    async listPasskeys(userId) {
        return this.prisma.passkey.findMany({
            where: { userId },
            select: {
                id: true,
                deviceName: true,
                deviceType: true,
                lastUsedAt: true,
                registeredAt: true,
            },
            orderBy: { registeredAt: 'desc' },
        });
    }
    async deletePasskey(userId, passkeyId) {
        const passkey = await this.prisma.passkey.findUnique({
            where: { id: passkeyId },
        });
        if (!passkey) {
            throw new common_1.NotFoundException('Passkey not found');
        }
        if (passkey.userId !== userId) {
            throw new common_1.ForbiddenException('Not authorized to delete this passkey');
        }
        await this.prisma.passkey.delete({ where: { id: passkeyId } });
        this.logger.log(`Passkey ${passkeyId} deleted by user ${userId}`);
    }
    getDeviceName(userAgent) {
        if (!userAgent)
            return 'Unknown Device';
        if (userAgent.includes('iPhone'))
            return 'iPhone';
        if (userAgent.includes('iPad'))
            return 'iPad';
        if (userAgent.includes('Android'))
            return 'Android';
        if (userAgent.includes('Mac'))
            return 'Mac';
        if (userAgent.includes('Windows'))
            return 'Windows PC';
        return 'Unknown Device';
    }
};
exports.PasskeyService = PasskeyService;
exports.PasskeyService = PasskeyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        logger_service_1.LoggerService,
        redis_service_1.RedisService,
        auth_service_1.AuthService])
], PasskeyService);
