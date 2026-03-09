/**
 * MechMind OS - Two-Factor Authentication Service
 * 
 * Implements TOTP (Time-based One-Time Password) with:
 * - RFC 6238 compliant TOTP generation
 * - Encrypted secret storage
 * - Backup codes for account recovery
 * - Integration with Google Authenticator, Authy, etc.
 */

import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import * as QRCode from 'qrcode';
import { PrismaService } from '@common/services/prisma.service';
import { EncryptionService } from '@common/services/encryption.service';

@Injectable()
export class TwoFactorService {
  private readonly ISSUER = 'MechMind OS';
  private readonly DIGITS = 6;
  private readonly STEP = 30; // 30 seconds
  private readonly WINDOW = 1; // Allow 1 step before/after for time drift
  private readonly BACKUP_CODES_COUNT = 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Generate a new TOTP secret and QR code for setup
   */
  async generateSecret(userId: string, email: string, tenantName: string): Promise<{
    secret: string;
    qrCodeUri: string;
    qrCodeImage: string;
    manualEntryKey: string;
    backupCodes: string[];
  }> {
    // Generate cryptographically secure random secret
    const secret = this.generateBase32Secret(32);
    
    // Generate backup codes
    const backupCodes = this.generateBackupCodes();
    const hashedBackupCodes = await Promise.all(
      backupCodes.map(code => bcrypt.hash(code, 10))
    );

    // Encrypt secret for storage
    const encryptedSecret = await this.encryption.encrypt(secret);

    // Store encrypted secret (but don't enable yet)
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        totpSecret: encryptedSecret,
        totpEnabled: false, // Will be enabled after verification
      },
    });

    // Store backup codes in separate model
    await this.prisma.backupCode.createMany({
      data: hashedBackupCodes.map(codeHash => ({
        userId,
        codeHash,
      })),
    });

    // Generate QR code URI (otpauth format)
    const accountName = `${tenantName}:${email}`;
    const qrCodeUri = this.generateOtpAuthUri(accountName, secret);

    // Generate QR code image
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
      backupCodes, // Return plaintext - user sees this ONCE
    };
  }

  /**
   * Verify TOTP code and enable 2FA
   */
  async verifyAndEnable(userId: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { totpSecret: true, totpEnabled: true },
    });

    if (!user || !user.totpSecret) {
      throw new BadRequestException('2FA setup not initiated');
    }

    if (user.totpEnabled) {
      throw new BadRequestException('2FA is already enabled');
    }

    // Decrypt secret
    const secret = await this.encryption.decrypt(user.totpSecret);

    // Verify code
    if (!this.verifyTotp(secret, code)) {
      throw new UnauthorizedException('Invalid verification code');
    }

    // Enable 2FA
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
  async verifyLogin(userId: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { 
        totpSecret: true, 
        totpEnabled: true,
      },
    });

    if (!user || !user.totpEnabled) {
      return true; // 2FA not required
    }

    // Check if it's a backup code (8 digits)
    if (code.length === 8) {
      return this.verifyBackupCode(userId, code);
    }

    // Verify TOTP code
    const secret = await this.encryption.decrypt(user.totpSecret!);
    
    if (!this.verifyTotp(secret, code)) {
      throw new UnauthorizedException('Invalid authentication code');
    }

    return true;
  }

  /**
   * Disable 2FA for a user
   */
  async disable(userId: string, code: string, password: string, passwordVerify: (hash: string) => Promise<boolean>): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { 
        totpSecret: true, 
        totpEnabled: true, 
        passwordHash: true,
      },
    });

    if (!user || !user.totpEnabled) {
      throw new BadRequestException('2FA is not enabled');
    }

    // Verify password
    const isPasswordValid = await passwordVerify(user.passwordHash || '');
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // Verify TOTP or backup code
    let isCodeValid = false;
    
    if (code.length === 8) {
      isCodeValid = await this.verifyBackupCode(userId, code);
    } else {
      const secret = await this.encryption.decrypt(user.totpSecret!);
      isCodeValid = this.verifyTotp(secret, code);
    }

    if (!isCodeValid) {
      throw new UnauthorizedException('Invalid authentication code');
    }

    // Disable 2FA and delete backup codes
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
   * Regenerate backup codes
   */
  async regenerateBackupCodes(userId: string, code: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { totpSecret: true, totpEnabled: true },
    });

    if (!user || !user.totpEnabled) {
      throw new BadRequestException('2FA is not enabled');
    }

    // Verify current TOTP code
    const secret = await this.encryption.decrypt(user.totpSecret!);
    if (!this.verifyTotp(secret, code)) {
      throw new UnauthorizedException('Invalid authentication code');
    }

    // Generate new backup codes
    const backupCodes = this.generateBackupCodes();
    const hashedBackupCodes = await Promise.all(
      backupCodes.map(c => bcrypt.hash(c, 10))
    );

    // Delete old backup codes and create new ones
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

  /**
   * Admin disable 2FA (emergency reset)
   */
  async adminDisable(userId: string): Promise<void> {
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
   * Check if 2FA is required for user
   */
  async isTwoFactorRequired(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { totpEnabled: true },
    });
    return user?.totpEnabled ?? false;
  }

  /**
   * Get 2FA status for a user
   */
  async getStatus(userId: string): Promise<{
    enabled: boolean;
    verifiedAt?: Date;
    backupCodesCount: number;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { totpEnabled: true, totpVerifiedAt: true, _count: { select: { backupCodes: true } } },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      enabled: user.totpEnabled,
      verifiedAt: user.totpVerifiedAt ?? undefined,
      backupCodesCount: user._count.backupCodes,
    };
  }

  // ============== PRIVATE METHODS ==============

  /**
   * Generate cryptographically secure base32 secret
   */
  private generateBase32Secret(length: number): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const bytes = crypto.randomBytes(length);
    let secret = '';
    
    for (let i = 0; i < length; i++) {
      secret += alphabet[bytes[i] % alphabet.length];
    }
    
    return secret;
  }

  /**
   * Generate otpauth URI for QR codes
   */
  private generateOtpAuthUri(accountName: string, secret: string): string {
    const params = new URLSearchParams({
      secret,
      issuer: this.ISSUER,
      algorithm: 'SHA1',
      digits: this.DIGITS.toString(),
      period: this.STEP.toString(),
    });
    
    return `otpauth://totp/${encodeURIComponent(accountName)}?${params.toString()}`;
  }

  /**
   * Generate backup codes (8 characters, alphanumeric)
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < this.BACKUP_CODES_COUNT; i++) {
      // Generate 8-character code: XXXX-XXXX format
      const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
      const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
      codes.push(`${part1}-${part2}`);
    }
    
    return codes;
  }

  /**
   * Verify backup code using bcrypt comparison
   */
  private async verifyBackupCode(userId: string, code: string): Promise<boolean> {
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

  /**
   * Verify TOTP code against secret
   */
  private verifyTotp(secret: string, code: string): boolean {
    const secretBuffer = this.base32Decode(secret);
    const codeNum = parseInt(code, 10);
    
    if (isNaN(codeNum) || code.length !== this.DIGITS) {
      return false;
    }

    // Check current window and adjacent windows for time drift
    const now = Math.floor(Date.now() / 1000 / this.STEP);
    
    for (let i = -this.WINDOW; i <= this.WINDOW; i++) {
      const expectedCode = this.generateTotp(secretBuffer, now + i);
      if (this.timingSafeEqual(expectedCode, codeNum)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generate TOTP code for a specific time step
   */
  private generateTotp(secret: Buffer, step: number): number {
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64BE(BigInt(step), 0);
    
    const hmac = crypto.createHmac('sha1', secret);
    hmac.update(buffer);
    const hash = hmac.digest();
    
    // Dynamic truncation
    const offset = hash[hash.length - 1] & 0x0f;
    const code = ((hash[offset] & 0x7f) << 24 |
                  (hash[offset + 1] & 0xff) << 16 |
                  (hash[offset + 2] & 0xff) << 8 |
                  (hash[offset + 3] & 0xff)) % Math.pow(10, this.DIGITS);
    
    return code;
  }

  /**
   * Decode base32 string to buffer
   */
  private base32Decode(str: string): Buffer {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const bits: number[] = [];
    
    for (const char of str.toUpperCase()) {
      const val = alphabet.indexOf(char);
      if (val === -1) continue;
      
      for (let i = 4; i >= 0; i--) {
        bits.push((val >> i) & 1);
      }
    }
    
    const bytes: number[] = [];
    for (let i = 0; i < bits.length; i += 8) {
      let byte = 0;
      for (let j = 0; j < 8 && i + j < bits.length; j++) {
        byte = (byte << 1) | bits[i + j];
      }
      bytes.push(byte);
    }
    
    return Buffer.from(bytes);
  }

  /**
   * Timing-safe comparison to prevent timing attacks
   */
  private timingSafeEqual(a: number, b: number): boolean {
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
}
