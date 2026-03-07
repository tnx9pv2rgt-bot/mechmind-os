/**
 * MechMind OS - MFA Service with Auth0 TOTP
 * 
 * Implements TOTP (Time-based One-Time Password) with:
 * - RFC 6238 compliant TOTP generation using speakeasy
 * - Encrypted secret storage
 * - Backup codes for account recovery
 * - Rate limiting for verification attempts
 * - Auth0-compatible implementation
 */

import { Injectable, UnauthorizedException, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../../common/services/prisma.service';
import { EncryptionService } from '../../../common/services/encryption.service';

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

@Injectable()
export class MfaService {
  private readonly ISSUER = 'MechMind OS';
  private readonly BACKUP_CODES_COUNT = 10;
  private readonly MAX_VERIFY_ATTEMPTS = 5;
  private readonly VERIFY_WINDOW_MINUTES = 15;

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Enroll a user in MFA
   * Generates TOTP secret and QR code
   */
  async enroll(userId: string, userEmail: string): Promise<MFAEnrollResult> {
    // Check if MFA is already enabled
    const existingMfa = await this.prisma.userMFA.findUnique({
      where: { userId },
    });

    if (existingMfa?.enabled) {
      throw new BadRequestException('MFA is already enabled for this user');
    }

    // Generate TOTP secret using speakeasy
    const secret = speakeasy.generateSecret({
      name: `MechMind:${userEmail}`,
      length: 32,
      issuer: this.ISSUER,
    });

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();
    const hashedBackupCodes = await Promise.all(
      backupCodes.map(code => bcrypt.hash(code, 10))
    );

    // Encrypt the secret for storage
    const encryptedSecret = await this.encryption.encrypt(secret.base32);

    // Save to database
    await this.prisma.userMFA.upsert({
      where: { userId },
      create: {
        userId,
        secret: encryptedSecret,
        enabled: false, // Will be enabled after verification
        backupCodes: hashedBackupCodes,
        verifyAttempts: 0,
        lastVerifyAttempt: null,
      },
      update: {
        secret: encryptedSecret,
        enabled: false,
        backupCodes: hashedBackupCodes,
        verifyAttempts: 0,
        lastVerifyAttempt: null,
      },
    });

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
    const mfa = await this.prisma.userMFA.findUnique({
      where: { userId },
    });

    if (!mfa || !mfa.secret) {
      throw new BadRequestException('MFA enrollment not initiated');
    }

    if (mfa.enabled) {
      throw new BadRequestException('MFA is already enabled');
    }

    // Check rate limiting
    await this.checkRateLimit(mfa);

    // Decrypt secret
    const secret = await this.encryption.decrypt(mfa.secret);

    // Verify TOTP code
    const valid = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1, // Allow 1 step before/after for time drift
    });

    if (!valid) {
      await this.recordFailedAttempt(userId);
      throw new UnauthorizedException('Invalid verification code');
    }

    // Enable MFA
    await this.prisma.userMFA.update({
      where: { userId },
      data: {
        enabled: true,
        verifiedAt: new Date(),
        verifyAttempts: 0,
      },
    });

    return true;
  }

  /**
   * Verify TOTP code during login
   */
  async verify(userId: string, token: string): Promise<MFAVerifyResult> {
    const mfa = await this.prisma.userMFA.findUnique({
      where: { userId },
    });

    if (!mfa || !mfa.enabled) {
      return { valid: true }; // MFA not required
    }

    // Check rate limiting
    const rateLimitCheck = await this.checkRateLimit(mfa);
    if (!rateLimitCheck.allowed) {
      throw new HttpException(
        `Too many attempts. Try again in ${rateLimitCheck.retryAfter} minutes.`,
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // Check if it's a backup code (8 characters with dash: XXXX-XXXX)
    if (token.length === 9 && token.includes('-')) {
      const valid = await this.verifyBackupCode(userId, token, mfa.backupCodes);
      if (valid) {
        return { valid: true };
      }
    }

    // Verify TOTP code
    const secret = await this.encryption.decrypt(mfa.secret);
    
    const valid = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!valid) {
      await this.recordFailedAttempt(userId);
      return { 
        valid: false, 
        remainingAttempts: this.MAX_VERIFY_ATTEMPTS - (mfa.verifyAttempts + 1) 
      };
    }

    // Reset attempts on successful verification
    if (mfa.verifyAttempts > 0) {
      await this.prisma.userMFA.update({
        where: { userId },
        data: { verifyAttempts: 0, lastVerifyAttempt: null },
      });
    }

    return { valid: true };
  }

  /**
   * Disable MFA for a user
   */
  async disable(userId: string, token: string, password: string): Promise<void> {
    const mfa = await this.prisma.userMFA.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!mfa || !mfa.enabled) {
      throw new BadRequestException('MFA is not enabled');
    }

    // Verify password first
    const passwordValid = await bcrypt.compare(password, mfa.user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // Verify TOTP or backup code
    let codeValid = false;

    // Check if it's a backup code
    if (token.length === 9 && token.includes('-')) {
      codeValid = await this.verifyBackupCode(userId, token, mfa.backupCodes);
    } else {
      // Verify TOTP
      const secret = await this.encryption.decrypt(mfa.secret);
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

    // Delete MFA record
    await this.prisma.userMFA.delete({
      where: { userId },
    });
  }

  /**
   * Generate new backup codes
   */
  async generateBackupCodes(userId: string, token: string): Promise<string[]> {
    const mfa = await this.prisma.userMFA.findUnique({
      where: { userId },
    });

    if (!mfa || !mfa.enabled) {
      throw new BadRequestException('MFA is not enabled');
    }

    // Verify TOTP code
    const secret = await this.encryption.decrypt(mfa.secret);
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
    const backupCodes = this.generateBackupCodes();
    const hashedBackupCodes = await Promise.all(
      backupCodes.map(code => bcrypt.hash(code, 10))
    );

    // Update database
    await this.prisma.userMFA.update({
      where: { userId },
      data: { backupCodes: hashedBackupCodes },
    });

    return backupCodes;
  }

  /**
   * Check if MFA is enabled for user
   */
  async isMFAEnabled(userId: string): Promise<boolean> {
    const mfa = await this.prisma.userMFA.findUnique({
      where: { userId },
      select: { enabled: true },
    });
    return mfa?.enabled ?? false;
  }

  /**
   * Get MFA status for a user
   */
  async getStatus(userId: string): Promise<{
    enabled: boolean;
    verifiedAt?: Date;
    backupCodesCount: number;
  }> {
    const mfa = await this.prisma.userMFA.findUnique({
      where: { userId },
      select: { enabled: true, verifiedAt: true, backupCodes: true },
    });

    if (!mfa) {
      return { enabled: false, backupCodesCount: 0 };
    }

    return {
      enabled: mfa.enabled,
      verifiedAt: mfa.verifiedAt ?? undefined,
      backupCodesCount: mfa.backupCodes.length,
    };
  }

  /**
   * Admin: Reset MFA for user (emergency)
   */
  async adminReset(userId: string): Promise<void> {
    await this.prisma.userMFA.deleteMany({
      where: { userId },
    });
  }

  // ============== PRIVATE METHODS ==============

  /**
   * Generate backup codes
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < this.BACKUP_CODES_COUNT; i++) {
      // Generate 8-character code: XXXX-XXXX format (alphanumeric)
      const part1 = Math.random().toString(36).substring(2, 6).toUpperCase();
      const part2 = Math.random().toString(36).substring(2, 6).toUpperCase();
      codes.push(`${part1}-${part2}`);
    }
    
    return codes;
  }

  /**
   * Verify backup code
   */
  private async verifyBackupCode(
    userId: string, 
    code: string, 
    hashedCodes: string[]
  ): Promise<boolean> {
    for (let i = 0; i < hashedCodes.length; i++) {
      const match = await bcrypt.compare(code.toUpperCase(), hashedCodes[i]);
      if (match) {
        // Remove used backup code
        const newCodes = [...hashedCodes];
        newCodes.splice(i, 1);
        
        await this.prisma.userMFA.update({
          where: { userId },
          data: { backupCodes: newCodes },
        });
        
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check rate limiting for verification attempts
   */
  private async checkRateLimit(mfa: any): Promise<{ allowed: boolean; retryAfter?: number }> {
    // Reset attempts if window has passed
    if (mfa.lastVerifyAttempt) {
      const minutesSinceLastAttempt = 
        (Date.now() - new Date(mfa.lastVerifyAttempt).getTime()) / (1000 * 60);
      
      if (minutesSinceLastAttempt > this.VERIFY_WINDOW_MINUTES) {
        await this.prisma.userMFA.update({
          where: { userId: mfa.userId },
          data: { verifyAttempts: 0, lastVerifyAttempt: null },
        });
        return { allowed: true };
      }
    }

    if (mfa.verifyAttempts >= this.MAX_VERIFY_ATTEMPTS) {
      const retryAfter = Math.ceil(
        this.VERIFY_WINDOW_MINUTES - 
        (Date.now() - new Date(mfa.lastVerifyAttempt).getTime()) / (1000 * 60)
      );
      return { allowed: false, retryAfter };
    }

    return { allowed: true };
  }

  /**
   * Record failed verification attempt
   */
  private async recordFailedAttempt(userId: string): Promise<void> {
    await this.prisma.userMFA.update({
      where: { userId },
      data: {
        verifyAttempts: { increment: 1 },
        lastVerifyAttempt: new Date(),
      },
    });
  }
}
