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
exports.MfaService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto = __importStar(require("crypto"));
const speakeasy = __importStar(require("speakeasy"));
const QRCode = __importStar(require("qrcode"));
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../../common/services/prisma.service");
const encryption_service_1 = require("../../common/services/encryption.service");
let MfaService = class MfaService {
    constructor(prisma, encryption, config) {
        this.prisma = prisma;
        this.encryption = encryption;
        this.config = config;
        this.ISSUER = 'MechMind OS';
        this.BACKUP_CODES_COUNT = 10;
        this.MAX_VERIFY_ATTEMPTS = 5;
        this.VERIFY_WINDOW_MINUTES = 15;
    }
    async enroll(userId, userEmail) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { totpEnabled: true },
        });
        if (user?.totpEnabled) {
            throw new common_1.BadRequestException('MFA is already enabled for this user');
        }
        const secret = speakeasy.generateSecret({
            name: `MechMind:${userEmail}`,
            length: 32,
            issuer: this.ISSUER,
        });
        const backupCodes = this.generateBackupCodesInternal();
        const hashedBackupCodes = await Promise.all(backupCodes.map(code => bcrypt.hash(code, 10)));
        const encryptedSecret = await this.encryption.encrypt(secret.base32);
        await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id: userId },
                data: {
                    totpSecret: encryptedSecret,
                    totpEnabled: false,
                },
            }),
            this.prisma.backupCode.createMany({
                data: hashedBackupCodes.map((codeHash) => ({
                    userId,
                    codeHash,
                })),
            }),
        ]);
        const qrCode = await QRCode.toDataURL(secret.otpauth_url, {
            errorCorrectionLevel: 'H',
            margin: 2,
            width: 300,
        });
        return {
            secret: secret.base32,
            qrCode,
            backupCodes,
            manualEntryKey: secret.base32,
        };
    }
    async verifyAndEnable(userId, token) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { totpSecret: true, totpEnabled: true },
        });
        if (!user?.totpSecret) {
            throw new common_1.BadRequestException('MFA enrollment not initiated');
        }
        if (user.totpEnabled) {
            throw new common_1.BadRequestException('MFA is already enabled');
        }
        const secret = await this.encryption.decrypt(user.totpSecret);
        const valid = speakeasy.totp.verify({
            secret,
            encoding: 'base32',
            token,
            window: 1,
        });
        if (!valid) {
            throw new common_1.UnauthorizedException('Invalid verification code');
        }
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                totpEnabled: true,
                totpVerifiedAt: new Date(),
            },
        });
        return true;
    }
    async verify(userId, token) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { totpSecret: true, totpEnabled: true },
        });
        if (!user?.totpEnabled) {
            return { valid: true };
        }
        if (token.length === 9 && token.includes('-')) {
            const valid = await this.verifyBackupCode(userId, token);
            if (valid) {
                return { valid: true };
            }
        }
        const secret = await this.encryption.decrypt(user.totpSecret);
        const valid = speakeasy.totp.verify({
            secret,
            encoding: 'base32',
            token,
            window: 1,
        });
        if (!valid) {
            return {
                valid: false,
                remainingAttempts: this.MAX_VERIFY_ATTEMPTS - 1
            };
        }
        return { valid: true };
    }
    async disable(userId, token, password) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user?.totpEnabled) {
            throw new common_1.BadRequestException('MFA is not enabled');
        }
        const passwordValid = await bcrypt.compare(password, user.passwordHash || '');
        if (!passwordValid) {
            throw new common_1.UnauthorizedException('Invalid password');
        }
        let codeValid = false;
        if (token.length === 9 && token.includes('-')) {
            codeValid = await this.verifyBackupCode(userId, token);
        }
        else {
            const secret = await this.encryption.decrypt(user.totpSecret);
            codeValid = speakeasy.totp.verify({
                secret,
                encoding: 'base32',
                token,
                window: 1,
            });
        }
        if (!codeValid) {
            throw new common_1.UnauthorizedException('Invalid verification code');
        }
        await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id: userId },
                data: {
                    totpSecret: null,
                    totpEnabled: false,
                    totpVerifiedAt: null,
                },
            }),
            this.prisma.backupCode.deleteMany({
                where: { userId },
            }),
        ]);
    }
    async regenerateBackupCodes(userId, token) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { totpSecret: true, totpEnabled: true },
        });
        if (!user?.totpEnabled) {
            throw new common_1.BadRequestException('MFA is not enabled');
        }
        const secret = await this.encryption.decrypt(user.totpSecret);
        const valid = speakeasy.totp.verify({
            secret,
            encoding: 'base32',
            token,
            window: 1,
        });
        if (!valid) {
            throw new common_1.UnauthorizedException('Invalid verification code');
        }
        const backupCodes = this.generateBackupCodesInternal();
        const hashedBackupCodes = await Promise.all(backupCodes.map(code => bcrypt.hash(code, 10)));
        await this.prisma.$transaction([
            this.prisma.backupCode.deleteMany({ where: { userId } }),
            this.prisma.backupCode.createMany({
                data: hashedBackupCodes.map((codeHash) => ({
                    userId,
                    codeHash,
                })),
            }),
        ]);
        return backupCodes;
    }
    async isMFAEnabled(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { totpEnabled: true },
        });
        return user?.totpEnabled ?? false;
    }
    async getStatus(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                totpEnabled: true,
                totpVerifiedAt: true,
                _count: { select: { backupCodes: true } },
            },
        });
        if (!user) {
            return { enabled: false, backupCodesCount: 0 };
        }
        return {
            enabled: user.totpEnabled,
            verifiedAt: user.totpVerifiedAt ?? undefined,
            backupCodesCount: user._count.backupCodes,
        };
    }
    async adminReset(userId) {
        await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id: userId },
                data: {
                    totpSecret: null,
                    totpEnabled: false,
                    totpVerifiedAt: null,
                },
            }),
            this.prisma.backupCode.deleteMany({
                where: { userId },
            }),
        ]);
    }
    generateBackupCodesInternal() {
        const codes = [];
        for (let i = 0; i < this.BACKUP_CODES_COUNT; i++) {
            const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
            const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
            codes.push(`${part1}-${part2}`);
        }
        return codes;
    }
    async verifyBackupCode(userId, code) {
        const hashedInput = await bcrypt.hash(code.toUpperCase(), 10);
        const backupCodes = await this.prisma.backupCode.findMany({
            where: { userId },
        });
        for (const backupCode of backupCodes) {
            const match = await bcrypt.compare(code.toUpperCase(), backupCode.codeHash);
            if (match) {
                await this.prisma.backupCode.delete({
                    where: { id: backupCode.id },
                });
                return true;
            }
        }
        return false;
    }
};
exports.MfaService = MfaService;
exports.MfaService = MfaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        encryption_service_1.EncryptionService,
        config_1.ConfigService])
], MfaService);
