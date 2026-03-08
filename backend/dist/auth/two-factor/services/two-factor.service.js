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
exports.TwoFactorService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto = __importStar(require("crypto"));
const QRCode = __importStar(require("qrcode"));
const prisma_service_1 = require("../../../common/services/prisma.service");
const encryption_service_1 = require("../../../common/services/encryption.service");
let TwoFactorService = class TwoFactorService {
    constructor(prisma, encryption, config) {
        this.prisma = prisma;
        this.encryption = encryption;
        this.config = config;
        this.ISSUER = 'MechMind OS';
        this.DIGITS = 6;
        this.STEP = 30;
        this.WINDOW = 1;
        this.BACKUP_CODES_COUNT = 10;
    }
    async generateSecret(userId, email, tenantName) {
        const secret = this.generateBase32Secret(32);
        const backupCodes = this.generateBackupCodes();
        const hashedBackupCodes = backupCodes.map(code => this.hashBackupCode(code));
        const encryptedSecret = await this.encryption.encrypt(secret);
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                totpSecret: encryptedSecret,
                totpEnabled: false,
            },
        });
        await this.prisma.backupCode.createMany({
            data: hashedBackupCodes.map(codeHash => ({
                userId,
                codeHash,
            })),
        });
        const accountName = `${tenantName}:${email}`;
        const qrCodeUri = this.generateOtpAuthUri(accountName, secret);
        const qrCodeImage = await QRCode.toDataURL(qrCodeUri, {
            errorCorrectionLevel: 'H',
            margin: 2,
            width: 300,
        });
        return {
            secret,
            qrCodeUri,
            qrCodeImage,
            manualEntryKey: secret,
            backupCodes,
        };
    }
    async verifyAndEnable(userId, code) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { totpSecret: true, totpEnabled: true },
        });
        if (!user || !user.totpSecret) {
            throw new common_1.BadRequestException('2FA setup not initiated');
        }
        if (user.totpEnabled) {
            throw new common_1.BadRequestException('2FA is already enabled');
        }
        const secret = await this.encryption.decrypt(user.totpSecret);
        if (!this.verifyTotp(secret, code)) {
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
    async verifyLogin(userId, code) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                totpSecret: true,
                totpEnabled: true,
            },
        });
        if (!user || !user.totpEnabled) {
            return true;
        }
        if (code.length === 8) {
            return this.verifyBackupCode(userId, code);
        }
        const secret = await this.encryption.decrypt(user.totpSecret);
        if (!this.verifyTotp(secret, code)) {
            throw new common_1.UnauthorizedException('Invalid authentication code');
        }
        return true;
    }
    async disable(userId, code, password, passwordVerify) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                totpSecret: true,
                totpEnabled: true,
                passwordHash: true,
            },
        });
        if (!user || !user.totpEnabled) {
            throw new common_1.BadRequestException('2FA is not enabled');
        }
        const isPasswordValid = await passwordVerify(user.passwordHash || '');
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Invalid password');
        }
        let isCodeValid = false;
        if (code.length === 8) {
            isCodeValid = await this.verifyBackupCode(userId, code);
        }
        else {
            const secret = await this.encryption.decrypt(user.totpSecret);
            isCodeValid = this.verifyTotp(secret, code);
        }
        if (!isCodeValid) {
            throw new common_1.UnauthorizedException('Invalid authentication code');
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
    async regenerateBackupCodes(userId, code) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { totpSecret: true, totpEnabled: true },
        });
        if (!user || !user.totpEnabled) {
            throw new common_1.BadRequestException('2FA is not enabled');
        }
        const secret = await this.encryption.decrypt(user.totpSecret);
        if (!this.verifyTotp(secret, code)) {
            throw new common_1.UnauthorizedException('Invalid authentication code');
        }
        const backupCodes = this.generateBackupCodes();
        const hashedBackupCodes = backupCodes.map(c => this.hashBackupCode(c));
        await this.prisma.$transaction([
            this.prisma.backupCode.deleteMany({ where: { userId } }),
            this.prisma.backupCode.createMany({
                data: hashedBackupCodes.map(codeHash => ({
                    userId,
                    codeHash,
                })),
            }),
        ]);
        return backupCodes;
    }
    async adminDisable(userId) {
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
    async isTwoFactorRequired(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { totpEnabled: true },
        });
        return user?.totpEnabled ?? false;
    }
    async getStatus(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { totpEnabled: true, totpVerifiedAt: true, _count: { select: { backupCodes: true } } },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        return {
            enabled: user.totpEnabled,
            verifiedAt: user.totpVerifiedAt ?? undefined,
            backupCodesCount: user._count.backupCodes,
        };
    }
    generateBase32Secret(length) {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        const bytes = crypto.randomBytes(length);
        let secret = '';
        for (let i = 0; i < length; i++) {
            secret += alphabet[bytes[i] % alphabet.length];
        }
        return secret;
    }
    generateOtpAuthUri(accountName, secret) {
        const params = new URLSearchParams({
            secret,
            issuer: this.ISSUER,
            algorithm: 'SHA1',
            digits: this.DIGITS.toString(),
            period: this.STEP.toString(),
        });
        return `otpauth://totp/${encodeURIComponent(accountName)}?${params.toString()}`;
    }
    generateBackupCodes() {
        const codes = [];
        for (let i = 0; i < this.BACKUP_CODES_COUNT; i++) {
            const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
            const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
            codes.push(`${part1}-${part2}`);
        }
        return codes;
    }
    hashBackupCode(code) {
        return crypto.createHash('sha256').update(code).digest('hex');
    }
    async verifyBackupCode(userId, code) {
        const hashedInput = this.hashBackupCode(code.toUpperCase());
        const backupCode = await this.prisma.backupCode.findFirst({
            where: { userId, codeHash: hashedInput },
        });
        if (!backupCode) {
            return false;
        }
        await this.prisma.backupCode.delete({
            where: { id: backupCode.id },
        });
        return true;
    }
    verifyTotp(secret, code) {
        const secretBuffer = this.base32Decode(secret);
        const codeNum = parseInt(code, 10);
        if (isNaN(codeNum) || code.length !== this.DIGITS) {
            return false;
        }
        const now = Math.floor(Date.now() / 1000 / this.STEP);
        for (let i = -this.WINDOW; i <= this.WINDOW; i++) {
            const expectedCode = this.generateTotp(secretBuffer, now + i);
            if (this.timingSafeEqual(expectedCode, codeNum)) {
                return true;
            }
        }
        return false;
    }
    generateTotp(secret, step) {
        const buffer = Buffer.alloc(8);
        buffer.writeBigUInt64BE(BigInt(step), 0);
        const hmac = crypto.createHmac('sha1', secret);
        hmac.update(buffer);
        const hash = hmac.digest();
        const offset = hash[hash.length - 1] & 0x0f;
        const code = ((hash[offset] & 0x7f) << 24 |
            (hash[offset + 1] & 0xff) << 16 |
            (hash[offset + 2] & 0xff) << 8 |
            (hash[offset + 3] & 0xff)) % Math.pow(10, this.DIGITS);
        return code;
    }
    base32Decode(str) {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        const bits = [];
        for (const char of str.toUpperCase()) {
            const val = alphabet.indexOf(char);
            if (val === -1)
                continue;
            for (let i = 4; i >= 0; i--) {
                bits.push((val >> i) & 1);
            }
        }
        const bytes = [];
        for (let i = 0; i < bits.length; i += 8) {
            let byte = 0;
            for (let j = 0; j < 8 && i + j < bits.length; j++) {
                byte = (byte << 1) | bits[i + j];
            }
            bytes.push(byte);
        }
        return Buffer.from(bytes);
    }
    timingSafeEqual(a, b) {
        const aStr = a.toString().padStart(this.DIGITS, '0');
        const bStr = b.toString().padStart(this.DIGITS, '0');
        if (aStr.length !== bStr.length) {
            return false;
        }
        let result = 0;
        for (let i = 0; i < aStr.length; i++) {
            result |= aStr.charCodeAt(i) ^ bStr.charCodeAt(i);
        }
        return result === 0;
    }
};
exports.TwoFactorService = TwoFactorService;
exports.TwoFactorService = TwoFactorService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        encryption_service_1.EncryptionService,
        config_1.ConfigService])
], TwoFactorService);
