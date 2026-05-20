import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { randomInt } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@common/services/prisma.service';
import { EncryptionService } from '@common/services/encryption.service';
import { SmsService } from '../../notifications/sms/sms.service';

export type OtpPurpose = 'login_mfa' | 'recovery' | 'phone_verify';

interface SendOtpParams {
  userId: string;
  tenantId: string;
  phone: string;
  purpose: OtpPurpose;
}

interface SendOtpResult {
  success: boolean;
  expiresIn: number;
}

interface VerifyOtpParams {
  userId: string;
  code: string;
  purpose: OtpPurpose;
}

interface VerifyOtpResult {
  valid: boolean;
  remainingAttempts?: number;
}

const OTP_EXPIRY_SECONDS = 300; // 5 minutes
const OTP_COOLDOWN_SECONDS = 30;
const OTP_MAX_ATTEMPTS = 5;
const BCRYPT_ROUNDS = 10;

@Injectable()
export class SmsOtpService {
  private readonly logger = new Logger(SmsOtpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly smsService: SmsService,
    private readonly encryption: EncryptionService,
  ) {}

  /**
   * Generate 6-digit OTP, hash it, store in DB, send via SMS.
   * Rate limited: max 1 OTP per 30 seconds per user+purpose.
   */
  async sendOtp(params: SendOtpParams): Promise<SendOtpResult> {
    const { userId, tenantId, phone, purpose } = params;

    // Clean up expired OTPs for this user
    await this.cleanupExpiredOtps(userId);

    // Rate limit: check cooldown
    await this.enforceRateLimit(userId, purpose);

    // Generate 6-digit code
    const code = this.generateOtpCode();

    // Hash the code with bcrypt before storing
    const hashedCode = await bcrypt.hash(code, BCRYPT_ROUNDS);

    // Hash the phone for storage (lookup-safe, not reversible)
    const phoneHash = this.encryption.hash(phone);

    // Invalidate any existing unused OTPs for this user+purpose
    await this.prisma.smsOtp.updateMany({
      where: {
        userId,
        tenantId,
        purpose,
        usedAt: null,
      },
      data: {
        usedAt: new Date(), // mark as consumed
      },
    });

    // Store new OTP
    await this.prisma.smsOtp.create({
      data: {
        userId,
        tenantId,
        phone: phoneHash,
        code: hashedCode,
        purpose,
        attempts: 0,
        maxAttempts: OTP_MAX_ATTEMPTS,
        expiresAt: new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000),
      },
    });

    // Send SMS
    const smsMessage =
      `Il tuo codice di verifica MechMind è: ${code}. ` +
      `Valido per 5 minuti. Non condividere questo codice.`;

    const smsResult = await this.smsService.sendCustom(phone, smsMessage, 'otp_verification');

    if (!smsResult.success) {
      this.logger.error(`Invio SMS OTP fallito per utente ${userId}: ${smsResult.error}`);
      throw new BadRequestException("Impossibile inviare l'SMS. Riprova più tardi.");
    }

    this.logger.log(
      `OTP inviato per utente ${userId} (scopo: ${purpose}), messageId: ${smsResult.messageId}`,
    );

    return {
      success: true,
      expiresIn: OTP_EXPIRY_SECONDS,
    };
  }

  /**
   * Verify OTP code against stored hash.
   * Increments attempts and invalidates after max attempts.
   */
  async verifyOtp(params: VerifyOtpParams): Promise<VerifyOtpResult> {
    const { userId, code, purpose } = params;

    // Find the latest unused, non-expired OTP for this user+purpose
    const otp = await this.prisma.smsOtp.findFirst({
      where: {
        userId,
        purpose,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      throw new BadRequestException('Codice OTP non trovato o scaduto. Richiedi un nuovo codice.');
    }

    // Check max attempts
    if (otp.attempts >= otp.maxAttempts) {
      // Invalidate the OTP
      await this.prisma.smsOtp.update({
        where: { id: otp.id },
        data: { usedAt: new Date() },
      });
      throw new BadRequestException('Troppi tentativi falliti. Richiedi un nuovo codice.');
    }

    // Verify the code against bcrypt hash
    const isValid = await bcrypt.compare(code, otp.code);

    if (!isValid) {
      // Increment attempts
      const updated = await this.prisma.smsOtp.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });

      const remaining = otp.maxAttempts - updated.attempts;

      this.logger.warn(
        `Tentativo OTP fallito per utente ${userId} (scopo: ${purpose}), tentativi rimasti: ${remaining}`,
      );

      return {
        valid: false,
        remainingAttempts: remaining,
      };
    }

    // Mark OTP as used
    await this.prisma.smsOtp.update({
      where: { id: otp.id },
      data: { usedAt: new Date() },
    });

    this.logger.log(`OTP verificato con successo per utente ${userId} (scopo: ${purpose})`);

    return { valid: true };
  }

  /**
   * Generate a cryptographically secure 6-digit OTP code.
   */
  private generateOtpCode(): string {
    const code = randomInt(100000, 999999);
    return code.toString();
  }

  /**
   * Enforce rate limit: max 1 OTP per 30 seconds per user+purpose.
   */
  private async enforceRateLimit(userId: string, purpose: OtpPurpose): Promise<void> {
    const cooldownThreshold = new Date(Date.now() - OTP_COOLDOWN_SECONDS * 1000);

    const recentOtp = await this.prisma.smsOtp.findFirst({
      where: {
        userId,
        purpose,
        createdAt: { gt: cooldownThreshold },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentOtp) {
      const waitSeconds = Math.ceil(
        (recentOtp.createdAt.getTime() + OTP_COOLDOWN_SECONDS * 1000 - Date.now()) / 1000,
      );
      throw new BadRequestException(
        `Attendi ${waitSeconds} secondi prima di richiedere un nuovo codice.`,
      );
    }
  }

  /**
   * Clean up expired OTPs for a given user.
   */
  private async cleanupExpiredOtps(userId: string): Promise<void> {
    await this.prisma.smsOtp.deleteMany({
      where: {
        userId,
        expiresAt: { lt: new Date() },
      },
    });
  }
}
