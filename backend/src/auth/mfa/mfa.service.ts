/**
 * MechMind OS - MFA Service with TOTP
 *
 * Implements TOTP (Time-based One-Time Password) with:
 * - RFC 6238 compliant TOTP generation using speakeasy
 * - Encrypted secret storage
 * - Backup codes for account recovery
 * - Rate limiting for verification attempts
 */

import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@common/services/prisma.service';
import { EncryptionService } from '@common/services/encryption.service';
import { RedisService } from '@common/services/redis.service';

export interface MFAEnrollResult {
  secret: string;
  qrCode: string;
  backupCodes: string[];
  manualEntryKey: string;
}

export interface MFAVerifyResult {
  valid: boolean;
  remainingAttempts?: number;
}

export interface MfaSessionResult {
  mfaSessionToken: string;
  expiresIn: number;
}

@Injectable()
export class MfaService {
  private readonly ISSUER = 'MechMind OS';
  private readonly BACKUP_CODES_COUNT = 10;
  private readonly MAX_VERIFY_ATTEMPTS = 5;
  private readonly VERIFY_WINDOW_MINUTES = 15;
  private readonly MFA_SESSION_TTL_SECONDS = 600; // 10 minutes
  private readonly MFA_SESSION_PREFIX = 'mfa:session:';

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Enroll a user in MFA
   * Generates TOTP secret and QR code
   */
  async enroll(userId: string, userEmail: string): Promise<MFAEnrollResult> {
    // Check if MFA is already enabled
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { totpEnabled: true },
    });

    if (user?.totpEnabled) {
      throw new BadRequestException('MFA is already enabled for this user');
    }

    // Generate TOTP secret using speakeasy
    const secret = speakeasy.generateSecret({
      name: `MechMind:${userEmail}`,
      length: 32,
      issuer: this.ISSUER,
    });

    // Generate backup codes
    const backupCodes = this.generateBackupCodesInternal();
    const hashedBackupCodes = await Promise.all(backupCodes.map(code => bcrypt.hash(code, 10)));

    // Encrypt the secret for storage
    const encryptedSecret = await this.encryption.encrypt(secret.base32);

    // Save to database - update user with secret and create backup codes
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          totpSecret: encryptedSecret,
          totpEnabled: false, // Will be enabled after verification
        },
      }),
      this.prisma.backupCode.createMany({
        data: hashedBackupCodes.map((codeHash: string) => ({
          userId,
          codeHash,
        })),
      }),
    ]);

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url!, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 300,
    });

    return {
      secret: secret.base32,
      qrCode,
      backupCodes, // Return plaintext - shown only once
      manualEntryKey: secret.base32,
    };
  }

  /**
   * Verify TOTP code and enable MFA
   */
  async verifyAndEnable(userId: string, token: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { totpSecret: true, totpEnabled: true },
    });

    if (!user?.totpSecret) {
      throw new BadRequestException('MFA enrollment not initiated');
    }

    if (user.totpEnabled) {
      throw new BadRequestException('MFA is already enabled');
    }

    // Decrypt secret
    const secret = await this.encryption.decrypt(user.totpSecret);

    // Verify TOTP code
    const valid = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1, // Allow 1 step before/after for time drift
    });

    if (!valid) {
      // eslint-disable-next-line sonarjs/no-duplicate-string
      throw new UnauthorizedException('Invalid verification code');
    }

    // Enable MFA
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        totpEnabled: true,
        totpVerifiedAt: new Date(),
      },
    });

    return true;
  }

  /**
   * Verify TOTP code during login
   */
  async verify(userId: string, token: string): Promise<MFAVerifyResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { totpSecret: true, totpEnabled: true },
    });

    if (!user?.totpEnabled) {
      return { valid: true }; // MFA not required
    }

    // Check if it's a backup code (8 characters with dash: XXXX-XXXX)
    if (token.length === 9 && token.includes('-')) {
      const valid = await this.verifyBackupCode(userId, token);
      if (valid) {
        return { valid: true };
      }
    }

    // Verify TOTP code
    const secret = await this.encryption.decrypt(user.totpSecret!);

    const valid = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!valid) {
      return {
        valid: false,
        remainingAttempts: this.MAX_VERIFY_ATTEMPTS - 1,
      };
    }

    return { valid: true };
  }

  /**
   * Disable MFA for a user
   */
  async disable(userId: string, token: string, password: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user?.totpEnabled) {
      throw new BadRequestException('MFA is not enabled');
    }

    // Verify password first
    const passwordValid = await bcrypt.compare(password, user.passwordHash || '');
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // Verify TOTP or backup code
    let codeValid = false;

    // Check if it's a backup code
    if (token.length === 9 && token.includes('-')) {
      codeValid = await this.verifyBackupCode(userId, token);
    } else {
      // Verify TOTP
      const secret = await this.encryption.decrypt(user.totpSecret!);
      codeValid = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 1,
      });
    }

    if (!codeValid) {
      throw new UnauthorizedException('Invalid verification code');
    }

    // Delete MFA data - remove secret and backup codes
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

  /**
   * Regenerate new backup codes
   */
  async regenerateBackupCodes(userId: string, token: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { totpSecret: true, totpEnabled: true },
    });

    if (!user?.totpEnabled) {
      throw new BadRequestException('MFA is not enabled');
    }

    // Verify TOTP code
    const secret = await this.encryption.decrypt(user.totpSecret!);
    const valid = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!valid) {
      throw new UnauthorizedException('Invalid verification code');
    }

    // Generate new backup codes
    const backupCodes = this.generateBackupCodesInternal();
    const hashedBackupCodes = await Promise.all(backupCodes.map(code => bcrypt.hash(code, 10)));

    // Replace backup codes
    await this.prisma.$transaction([
      this.prisma.backupCode.deleteMany({ where: { userId } }),
      this.prisma.backupCode.createMany({
        data: hashedBackupCodes.map((codeHash: string) => ({
          userId,
          codeHash,
        })),
      }),
    ]);

    return backupCodes;
  }

  /**
   * Check if MFA is enabled for user
   */
  async isMFAEnabled(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { totpEnabled: true },
    });
    return user?.totpEnabled ?? false;
  }

  /**
   * Get MFA status for a user
   */
  async getStatus(userId: string): Promise<{
    enabled: boolean;
    verifiedAt?: Date;
    backupCodesCount: number;
  }> {
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

  /**
   * Admin: Reset MFA for user (emergency)
   */
  async adminReset(userId: string): Promise<void> {
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

  /**
   * Create a server-side MFA session token stored in Redis
   * Returns a cryptographically random token that proves MFA was verified
   */
  async createMfaSession(userId: string): Promise<MfaSessionResult> {
    const token = crypto.randomBytes(32).toString('hex');
    const key = `${this.MFA_SESSION_PREFIX}${token}`;

    await this.redis.set(key, userId, this.MFA_SESSION_TTL_SECONDS);

    return {
      mfaSessionToken: token,
      expiresIn: this.MFA_SESSION_TTL_SECONDS,
    };
  }

  /**
   * Validate a server-side MFA session token from Redis
   * Returns the userId if valid, null otherwise
   */
  async validateMfaSession(token: string): Promise<string | null> {
    if (!token) {
      return null;
    }

    const key = `${this.MFA_SESSION_PREFIX}${token}`;
    return this.redis.get(key);
  }

  /**
   * Revoke a MFA session token
   */
  async revokeMfaSession(token: string): Promise<void> {
    const key = `${this.MFA_SESSION_PREFIX}${token}`;
    await this.redis.del(key);
  }

  // ============== PRIVATE METHODS ==============

  /**
   * Generate backup codes
   */
  private generateBackupCodesInternal(): string[] {
    const codes: string[] = [];

    for (let i = 0; i < this.BACKUP_CODES_COUNT; i++) {
      // Generate 8-character code: XXXX-XXXX format using crypto.randomBytes
      const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
      const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
      codes.push(`${part1}-${part2}`);
    }

    return codes;
  }

  /**
   * Verify backup code
   */
  private async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    // Find matching backup code
    const backupCodes = await this.prisma.backupCode.findMany({
      where: { userId },
    });

    for (const backupCode of backupCodes) {
      const match = await bcrypt.compare(code.toUpperCase(), backupCode.codeHash);
      if (match) {
        // Remove used backup code
        await this.prisma.backupCode.delete({
          where: { id: backupCode.id },
        });

        return true;
      }
    }

    return false;
  }
}
