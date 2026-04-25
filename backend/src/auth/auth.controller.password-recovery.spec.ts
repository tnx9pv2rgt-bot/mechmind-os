/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { MfaService } from './mfa/mfa.service';
import { SmsOtpService } from './services/sms-otp.service';
import { LoginThrottleService } from './services/login-throttle.service';
import { SessionService } from './services/session.service';
import { RiskAssessmentService } from './services/risk-assessment.service';
import { TrustedDeviceService } from './services/trusted-device.service';
import { SecurityActivityService } from './services/security-activity.service';
import { PrismaService } from '@common/services/prisma.service';
import { EncryptionService } from '@common/services/encryption.service';

/**
 * Test suite for AuthController password recovery & phone verification branches
 * Methods: changePassword(), setRecoveryPhone(), verifyRecoveryPhone()
 * Target: 10 tests covering validation paths and error cases
 */
describe('AuthController — Password Recovery & Phone Verification', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let smsOtpService: jest.Mocked<SmsOtpService>;
  let securityActivity: jest.Mocked<SecurityActivityService>;
  let prismaService: any;
  let encryptionService: jest.Mocked<EncryptionService>;

  const mockUser = {
    userId: 'user-001',
    email: 'test@example.com',
    tenantId: 'tenant-001',
    role: 'ADMIN',
  };

  beforeEach(async () => {
    const testModule: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            verifyPassword: jest.fn(),
            hashPassword: jest.fn(),
            generateTwoFactorTempToken: jest.fn(),
            getUserWithTwoFactorStatus: jest.fn(),
            updateLastLogin: jest.fn(),
            validateUser: jest.fn(),
            isAccountLocked: jest.fn(),
            generateTokens: jest.fn(),
            recordFailedLogin: jest.fn(),
          },
        },
        {
          provide: MfaService,
          useValue: {
            getStatus: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: SmsOtpService,
          useValue: {
            sendOtp: jest.fn(),
            verifyOtp: jest.fn(),
          },
        },
        {
          provide: LoginThrottleService,
          useValue: {
            getDelay: jest.fn(),
            recordFailure: jest.fn(),
            resetOnSuccess: jest.fn(),
          },
        },
        {
          provide: SessionService,
          useValue: {
            createSession: jest.fn(),
            listSessions: jest.fn(),
            revokeSession: jest.fn(),
            revokeAllOtherSessions: jest.fn(),
          },
        },
        {
          provide: RiskAssessmentService,
          useValue: {
            assessLoginRisk: jest.fn(),
            trustDevice: jest.fn(),
          },
        },
        {
          provide: TrustedDeviceService,
          useValue: {
            generateFingerprint: jest.fn(),
            isDeviceTrusted: jest.fn(),
            trustDevice: jest.fn(),
            listDevices: jest.fn(),
            untrustDevice: jest.fn(),
            untrustAllDevices: jest.fn(),
            markCompromised: jest.fn(),
          },
        },
        {
          provide: SecurityActivityService,
          useValue: {
            logEvent: jest.fn().mockReturnValue(Promise.resolve()),
          },
        },
        {
          provide: EncryptionService,
          useValue: {
            encrypt: jest.fn().mockReturnValue('encrypted-phone'),
            decrypt: jest.fn().mockReturnValue('+393331234567'),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
            },
            tenant: { findFirst: jest.fn() },
          },
        },
      ],
    }).compile();

    controller = testModule.get<AuthController>(AuthController);
    authService = testModule.get(AuthService) as jest.Mocked<AuthService>;
    smsOtpService = testModule.get(SmsOtpService) as jest.Mocked<SmsOtpService>;
    securityActivity = testModule.get(
      SecurityActivityService,
    ) as jest.Mocked<SecurityActivityService>;
    encryptionService = testModule.get(EncryptionService) as jest.Mocked<EncryptionService>;
    prismaService = testModule.get(PrismaService);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 1. changePassword() — Current password validation
  // ══════════════════════════════════════════════════════════════════════════

  describe('changePassword() — current password validation', () => {
    it('1.1 should throw NotFoundException when user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        controller.changePassword(
          mockUser as never,
          {
            currentPassword: 'old-pass-123',
            newPassword: 'NewPass123',
          } as never,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('1.2 should throw NotFoundException when tenantId does not match', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-001',
        passwordHash: '$2b$10$...',
        tenantId: 'different-tenant',
      });

      await expect(
        controller.changePassword(
          mockUser as never,
          {
            currentPassword: 'old-pass-123',
            newPassword: 'NewPass123',
          } as never,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('1.3 should throw UnauthorizedException when current password is incorrect', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-001',
        passwordHash: '$2b$10$...',
        tenantId: 'tenant-001',
      });
      authService.verifyPassword.mockResolvedValue(false);

      await expect(
        controller.changePassword(
          mockUser as never,
          {
            currentPassword: 'wrong-pass',
            newPassword: 'NewPass123',
          } as never,
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('1.4 should throw BadRequestException when new password equals current password', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-001',
        passwordHash: '$2b$10$...',
        tenantId: 'tenant-001',
      });
      authService.verifyPassword.mockResolvedValue(true);

      await expect(
        controller.changePassword(
          mockUser as never,
          {
            currentPassword: 'SamePass123',
            newPassword: 'SamePass123',
          } as never,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 2. changePassword() — Success flow
  // ══════════════════════════════════════════════════════════════════════════

  describe('changePassword() — success flow', () => {
    it('2.1 should hash and update password when validation passes', async () => {
      const newHash = '$2b$10$hashed-new-pass';
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-001',
        passwordHash: '$2b$10$old-hash',
        tenantId: 'tenant-001',
      });
      authService.verifyPassword.mockResolvedValue(true);
      authService.hashPassword.mockResolvedValue(newHash);
      prismaService.user.update.mockResolvedValue({ id: 'user-001' });

      const result = await controller.changePassword(
        mockUser as never,
        {
          currentPassword: 'OldPass123',
          newPassword: 'NewPass123',
        } as never,
      );

      expect(authService.verifyPassword).toHaveBeenCalledWith('OldPass123', '$2b$10$old-hash');
      expect(authService.hashPassword).toHaveBeenCalledWith('NewPass123');
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-001' },
        data: { passwordHash: newHash },
      });
      expect(result).toEqual({
        success: true,
        message: 'Password aggiornata con successo',
      });
    });

    it('2.2 should log security event after password change', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-001',
        passwordHash: '$2b$10$old-hash',
        tenantId: 'tenant-001',
      });
      authService.verifyPassword.mockResolvedValue(true);
      authService.hashPassword.mockResolvedValue('$2b$10$new-hash');
      prismaService.user.update.mockResolvedValue({ id: 'user-001' });

      await controller.changePassword(
        mockUser as never,
        {
          currentPassword: 'OldPass123',
          newPassword: 'NewPass123',
        } as never,
      );

      expect(securityActivity.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-001',
          tenantId: 'tenant-001',
          details: { action: 'password_changed' },
        }),
      );
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 3. setRecoveryPhone() — Phone encryption and OTP sending
  // ══════════════════════════════════════════════════════════════════════════

  describe('setRecoveryPhone() — phone encryption and OTP', () => {
    it('3.1 should encrypt phone and store unverified', async () => {
      prismaService.user.update.mockResolvedValue({ id: 'user-001' });
      smsOtpService.sendOtp.mockResolvedValue({ success: true, expiresIn: 300 });

      await controller.setRecoveryPhone(
        mockUser as never,
        {
          phone: '+393331234567',
        } as never,
      );

      expect(encryptionService.encrypt).toHaveBeenCalledWith('+393331234567');
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-001' },
        data: {
          recoveryPhone: 'encrypted-phone',
          recoveryPhoneVerified: false,
        },
      });
    });

    it('3.2 should send OTP after setting phone', async () => {
      prismaService.user.update.mockResolvedValue({ id: 'user-001' });
      smsOtpService.sendOtp.mockResolvedValue({ success: true, expiresIn: 300 });

      const result = await controller.setRecoveryPhone(
        mockUser as never,
        {
          phone: '+393331234567',
        } as never,
      );

      expect(smsOtpService.sendOtp).toHaveBeenCalledWith({
        userId: 'user-001',
        tenantId: 'tenant-001',
        phone: '+393331234567',
        purpose: 'phone_verify',
      });
      expect(result).toEqual({ success: true, expiresIn: 300 });
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 4. verifyRecoveryPhone() — OTP verification and phone confirmation
  // ══════════════════════════════════════════════════════════════════════════

  describe('verifyRecoveryPhone() — OTP verification', () => {
    it('4.1 should throw BadRequestException when OTP is invalid', async () => {
      smsOtpService.verifyOtp.mockResolvedValue({
        valid: false,
        remainingAttempts: 2,
      } as never);

      await expect(
        controller.verifyRecoveryPhone(
          mockUser as never,
          {
            code: '000000',
          } as never,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('4.2 should include remaining attempts in error message', async () => {
      smsOtpService.verifyOtp.mockResolvedValue({
        valid: false,
        remainingAttempts: 1,
      } as never);

      try {
        await controller.verifyRecoveryPhone(
          mockUser as never,
          {
            code: '000000',
          } as never,
        );
        fail('should have thrown');
      } catch (error) {
        expect((error as BadRequestException).message).toContain('1');
      }
    });

    it('4.3 should mark phone as verified on valid OTP', async () => {
      smsOtpService.verifyOtp.mockResolvedValue({
        valid: true,
        remainingAttempts: 3,
      } as never);
      prismaService.user.update.mockResolvedValue({ id: 'user-001' });

      const result = await controller.verifyRecoveryPhone(
        mockUser as never,
        {
          code: '123456',
        } as never,
      );

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-001' },
        data: { recoveryPhoneVerified: true },
      });
      expect(result).toEqual({ success: true });
    });

    it('4.4 should verify OTP with correct purpose', async () => {
      smsOtpService.verifyOtp.mockResolvedValue({
        valid: true,
        remainingAttempts: 3,
      } as never);
      prismaService.user.update.mockResolvedValue({ id: 'user-001' });

      await controller.verifyRecoveryPhone(
        mockUser as never,
        {
          code: '123456',
        } as never,
      );

      expect(smsOtpService.verifyOtp).toHaveBeenCalledWith({
        userId: 'user-001',
        code: '123456',
        purpose: 'phone_verify',
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 5. removeRecoveryPhone() — Cleanup flow
  // ══════════════════════════════════════════════════════════════════════════

  describe('removeRecoveryPhone()', () => {
    it('5.1 should clear both recoveryPhone and recoveryPhoneVerified', async () => {
      prismaService.user.update.mockResolvedValue({ id: 'user-001' });

      const result = await controller.removeRecoveryPhone(mockUser as never);

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-001' },
        data: {
          recoveryPhone: null,
          recoveryPhoneVerified: false,
        },
      });
      expect(result).toEqual({ success: true });
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 6. Recovery Phone Handler — Email Enumeration Prevention
  // ══════════════════════════════════════════════════════════════════════════

  describe('sendRecoveryOtp() — email enumeration prevention', () => {
    it('6.1 should return success even when user not found (no enumeration)', async () => {
      prismaService.user.findFirst.mockResolvedValue(null);

      const result = await controller.sendRecoveryOtp({
        email: 'nonexistent@example.com',
      } as never);

      expect(result).toEqual({ success: true, expiresIn: 300 });
    });

    it('6.2 should return success when recovery phone not configured (no enumeration)', async () => {
      prismaService.user.findFirst.mockResolvedValue({
        id: 'user-001',
        tenantId: 'tenant-001',
        recoveryPhone: null,
        recoveryPhoneVerified: false,
      });

      const result = await controller.sendRecoveryOtp({
        email: 'test@example.com',
      } as never);

      expect(result).toEqual({ success: true, expiresIn: 300 });
      expect(smsOtpService.sendOtp).not.toHaveBeenCalled();
    });

    it('6.3 should return success when phone not verified (no enumeration)', async () => {
      prismaService.user.findFirst.mockResolvedValue({
        id: 'user-001',
        tenantId: 'tenant-001',
        recoveryPhone: 'encrypted-phone',
        recoveryPhoneVerified: false,
      });

      const result = await controller.sendRecoveryOtp({
        email: 'test@example.com',
      } as never);

      expect(result).toEqual({ success: true, expiresIn: 300 });
      expect(smsOtpService.sendOtp).not.toHaveBeenCalled();
    });

    it('6.4 should send OTP when user exists and phone is verified', async () => {
      prismaService.user.findFirst.mockResolvedValue({
        id: 'user-001',
        tenantId: 'tenant-001',
        recoveryPhone: 'encrypted-phone',
        recoveryPhoneVerified: true,
      });
      smsOtpService.sendOtp.mockResolvedValue({ success: true, expiresIn: 300 });

      const result = await controller.sendRecoveryOtp({
        email: 'test@example.com',
      } as never);

      expect(smsOtpService.sendOtp).toHaveBeenCalledWith({
        userId: 'user-001',
        tenantId: 'tenant-001',
        phone: '+393331234567',
        purpose: 'recovery',
      });
      expect(result).toEqual({ success: true, expiresIn: 300 });
    });

    it('6.5 should decrypt phone for recovery OTP', async () => {
      prismaService.user.findFirst.mockResolvedValue({
        id: 'user-001',
        tenantId: 'tenant-001',
        recoveryPhone: 'encrypted-phone-data',
        recoveryPhoneVerified: true,
      });
      smsOtpService.sendOtp.mockResolvedValue({ success: true, expiresIn: 300 });

      await controller.sendRecoveryOtp({
        email: 'test@example.com',
      } as never);

      expect(encryptionService.decrypt).toHaveBeenCalledWith('encrypted-phone-data');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 7. verifyRecoveryOtp() — OTP verification during recovery
  // ══════════════════════════════════════════════════════════════════════════

  describe('verifyRecoveryOtp() — recovery OTP verification', () => {
    it('7.1 should throw BadRequestException when user not found', async () => {
      prismaService.user.findFirst.mockResolvedValue(null);

      await expect(
        controller.verifyRecoveryOtp({
          email: 'nonexistent@example.com',
          code: '123456',
        } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('7.2 should throw BadRequestException when OTP is invalid', async () => {
      prismaService.user.findFirst.mockResolvedValue({
        id: 'user-001',
      });
      smsOtpService.verifyOtp.mockResolvedValue({
        valid: false,
        remainingAttempts: 1,
      } as never);

      await expect(
        controller.verifyRecoveryOtp({
          email: 'test@example.com',
          code: '000000',
        } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('7.3 should generate temp token on valid recovery OTP', async () => {
      prismaService.user.findFirst.mockResolvedValue({
        id: 'user-001',
      });
      smsOtpService.verifyOtp.mockResolvedValue({
        valid: true,
        remainingAttempts: 3,
      } as never);
      authService.generateTwoFactorTempToken.mockResolvedValue('recovery-temp-token');

      const result = await controller.verifyRecoveryOtp({
        email: 'test@example.com',
        code: '123456',
      } as never);

      expect(authService.generateTwoFactorTempToken).toHaveBeenCalledWith('user-001');
      expect(result).toEqual({ tempToken: 'recovery-temp-token' });
    });

    it('7.4 should normalize email (lowercase + trim)', async () => {
      prismaService.user.findFirst.mockResolvedValue({
        id: 'user-001',
      });
      smsOtpService.verifyOtp.mockResolvedValue({
        valid: true,
        remainingAttempts: 3,
      } as never);
      authService.generateTwoFactorTempToken.mockResolvedValue('temp-token');

      await controller.verifyRecoveryOtp({
        email: '  Test@Example.COM  ',
        code: '123456',
      } as never);

      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: { id: true },
      });
    });
  });
});
