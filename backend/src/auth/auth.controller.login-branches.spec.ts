/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
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
 * Test suite for AuthController.login() branch coverage
 * Focus: Throttle delay, user null, lockout, risk assessment, MFA/SMS/TOTP logic
 * Target: 25 tests covering all conditional branches
 */
describe('AuthController.login() — Branch Coverage', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let mfaService: jest.Mocked<MfaService>;
  let loginThrottle: jest.Mocked<LoginThrottleService>;
  let sessionService: jest.Mocked<SessionService>;
  let riskAssessment: jest.Mocked<RiskAssessmentService>;
  let trustedDeviceService: jest.Mocked<TrustedDeviceService>;
  let securityActivity: jest.Mocked<SecurityActivityService>;
  let prismaService: any;

  const mockTokens = {
    accessToken: 'access-jwt',
    refreshToken: 'refresh-jwt',
    expiresIn: 3600,
  };

  const mockUser = {
    id: 'user-001',
    email: 'test@example.com',
    tenantId: 'tenant-001',
    role: 'ADMIN',
  };

  const loginDto = {
    email: 'test@example.com',
    password: 'pass123',
    tenantSlug: 'garage-roma',
  };

  beforeEach(async () => {
    const testModule: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            validateUser: jest.fn(),
            isAccountLocked: jest.fn(),
            generateTokens: jest.fn(),
            generateTwoFactorTempToken: jest.fn(),
            verifyTwoFactorTempToken: jest.fn(),
            getUserWithTwoFactorStatus: jest.fn(),
            updateLastLogin: jest.fn(),
            recordFailedLogin: jest.fn(),
            hashPassword: jest.fn(),
            verifyPassword: jest.fn(),
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
          provide: SessionService,
          useValue: {
            createSession: jest.fn().mockResolvedValue('session-1'),
            listSessions: jest.fn(),
            revokeSession: jest.fn(),
            revokeAllOtherSessions: jest.fn(),
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
          provide: RiskAssessmentService,
          useValue: {
            assessLoginRisk: jest.fn(),
            trustDevice: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: TrustedDeviceService,
          useValue: {
            generateFingerprint: jest.fn().mockReturnValue('fp-hash'),
            isDeviceTrusted: jest.fn(),
            trustDevice: jest.fn(),
            listDevices: jest.fn(),
            untrustDevice: jest.fn(),
            untrustAllDevices: jest.fn(),
            markCompromised: jest.fn(),
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
          provide: SecurityActivityService,
          useValue: {
            logEvent: jest.fn().mockReturnValue(Promise.resolve()),
          },
        },
        {
          provide: EncryptionService,
          useValue: {
            encrypt: jest.fn().mockReturnValue('encrypted'),
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
    mfaService = testModule.get(MfaService) as jest.Mocked<MfaService>;
    loginThrottle = testModule.get(LoginThrottleService) as jest.Mocked<LoginThrottleService>;
    sessionService = testModule.get(SessionService) as jest.Mocked<SessionService>;
    riskAssessment = testModule.get(RiskAssessmentService) as jest.Mocked<RiskAssessmentService>;
    trustedDeviceService = testModule.get(
      TrustedDeviceService,
    ) as jest.Mocked<TrustedDeviceService>;
    securityActivity = testModule.get(
      SecurityActivityService,
    ) as jest.Mocked<SecurityActivityService>;
    prismaService = testModule.get(PrismaService);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 1. Throttle Delay Branch
  // ══════════════════════════════════════════════════════════════════════════

  describe('throttle delay enforcement', () => {
    it('1.1 should enforce delay when throttle delay > 0', async () => {
      loginThrottle.getDelay.mockResolvedValue({ delay: 500, attempts: 3 });
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 10,
        level: 'low',
        blockLogin: false,
        requiresMfa: false,
      } as never);
      trustedDeviceService.isDeviceTrusted.mockResolvedValue(false);
      authService.generateTokens.mockResolvedValue(mockTokens as never);

      const startTime = Date.now();
      const result = await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');
      const elapsed = Date.now() - startTime;

      expect(result).toEqual(mockTokens);
      expect(elapsed >= 500).toBe(true);
    });

    it('1.2 should skip delay when throttle delay is 0', async () => {
      loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 });
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 0,
        level: 'low',
        blockLogin: false,
        requiresMfa: false,
      } as never);
      trustedDeviceService.isDeviceTrusted.mockResolvedValue(false);
      authService.generateTokens.mockResolvedValue(mockTokens as never);

      const startTime = Date.now();
      await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');
      const elapsed = Date.now() - startTime;

      expect(elapsed < 200).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 2. User Validation Failure Branch
  // ══════════════════════════════════════════════════════════════════════════

  describe('user validation failure', () => {
    it('2.1 should record failure and throw when validateUser returns null', async () => {
      loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 });
      authService.validateUser.mockResolvedValue(null as never);

      await expect(controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0')).rejects.toThrow(
        UnauthorizedException,
      );

      expect(loginThrottle.recordFailure).toHaveBeenCalledWith('test@example.com', '127.0.0.1');
    });

    it('2.2 should record failure and throw when validateUser throws', async () => {
      loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 });
      authService.validateUser.mockRejectedValue(new Error('Invalid credentials'));

      await expect(
        controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0'),
      ).rejects.toThrow();

      expect(loginThrottle.recordFailure).toHaveBeenCalledWith('test@example.com', '127.0.0.1');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 3. Account Locked Branch
  // ══════════════════════════════════════════════════════════════════════════

  describe('account lockout', () => {
    it('3.1 should throw when account is locked', async () => {
      loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 });
      authService.validateUser.mockResolvedValue(mockUser as never);
      const lockUntil = new Date(Date.now() + 3600000);
      authService.isAccountLocked.mockResolvedValue({ locked: true, until: lockUntil } as never);

      await expect(controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('3.2 should not throw when account is not locked', async () => {
      loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 });
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 0,
        level: 'low',
        blockLogin: false,
        requiresMfa: false,
      } as never);
      trustedDeviceService.isDeviceTrusted.mockResolvedValue(false);
      authService.generateTokens.mockResolvedValue(mockTokens as never);

      const result = await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');
      expect(result).toEqual(mockTokens);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 4. Risk Assessment Branches
  // ══════════════════════════════════════════════════════════════════════════

  describe('risk assessment blocking', () => {
    it('4.1 should block login when risk.blockLogin is true', async () => {
      loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 });
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 95,
        level: 'high',
        blockLogin: true,
        requiresMfa: false,
      } as never);

      await expect(controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('4.2 should allow login when risk.blockLogin is false', async () => {
      loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 });
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 50,
        level: 'medium',
        blockLogin: false,
        requiresMfa: false,
      } as never);
      trustedDeviceService.isDeviceTrusted.mockResolvedValue(false);
      authService.generateTokens.mockResolvedValue(mockTokens as never);

      const result = await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');
      expect(result).toEqual(mockTokens);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 5. Trusted Device Branch
  // ══════════════════════════════════════════════════════════════════════════

  describe('trusted device', () => {
    it('5.1 should skip MFA if device is trusted', async () => {
      loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 });
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      mfaService.getStatus.mockResolvedValue({ enabled: true } as never);
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 0,
        level: 'low',
        blockLogin: false,
        requiresMfa: false,
      } as never);
      trustedDeviceService.isDeviceTrusted.mockResolvedValue(true);
      authService.generateTokens.mockResolvedValue(mockTokens as never);

      const result = await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

      expect(result).toEqual(mockTokens);
      expect(mfaService.verify).not.toHaveBeenCalled();
    });

    it('5.2 should require MFA if device is not trusted and MFA enabled', async () => {
      loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 });
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      mfaService.getStatus.mockResolvedValue({ enabled: true } as never);
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 0,
        level: 'low',
        blockLogin: false,
        requiresMfa: false,
      } as never);
      trustedDeviceService.isDeviceTrusted.mockResolvedValue(false);
      authService.generateTwoFactorTempToken.mockResolvedValue('temp-token');
      prismaService.user.findUnique.mockResolvedValue({
        smsOtpEnabled: false,
        recoveryPhoneVerified: false,
      });

      const result = await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

      expect((result as any).tempToken).toBe('temp-token');
      expect((result as any).requiresMfa).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 6. MFA Required Branch (enabled + not trusted)
  // ══════════════════════════════════════════════════════════════════════════

  describe('MFA required (enabled + untrusted device)', () => {
    it('6.1 should verify TOTP code when provided', async () => {
      const dtoWithTotp = { ...loginDto, totpCode: '123456' };
      loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 });
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      mfaService.getStatus.mockResolvedValue({ enabled: true } as never);
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 0,
        level: 'low',
        blockLogin: false,
        requiresMfa: false,
      } as never);
      trustedDeviceService.isDeviceTrusted.mockResolvedValue(false);
      mfaService.verify.mockResolvedValue({ valid: true } as never);
      authService.generateTokens.mockResolvedValue(mockTokens as never);

      const result = await controller.login(dtoWithTotp as never, '127.0.0.1', 'Mozilla/5.0');

      expect(mfaService.verify).toHaveBeenCalledWith('user-001', '123456');
      expect(result).toEqual(mockTokens);
    });

    it('6.2 should throw when TOTP code is invalid', async () => {
      const dtoWithTotp = { ...loginDto, totpCode: '000000' };
      loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 });
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      mfaService.getStatus.mockResolvedValue({ enabled: true } as never);
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 0,
        level: 'low',
        blockLogin: false,
        requiresMfa: false,
      } as never);
      trustedDeviceService.isDeviceTrusted.mockResolvedValue(false);
      mfaService.verify.mockResolvedValue({ valid: false } as never);

      await expect(
        controller.login(dtoWithTotp as never, '127.0.0.1', 'Mozilla/5.0'),
      ).rejects.toThrow(UnauthorizedException);

      expect(authService.recordFailedLogin).toHaveBeenCalledWith('user-001');
      expect(loginThrottle.recordFailure).toHaveBeenCalledWith('test@example.com', '127.0.0.1');
    });

    it('6.3 should return temp token when TOTP not provided', async () => {
      loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 });
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      mfaService.getStatus.mockResolvedValue({ enabled: true } as never);
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 0,
        level: 'low',
        blockLogin: false,
        requiresMfa: false,
      } as never);
      trustedDeviceService.isDeviceTrusted.mockResolvedValue(false);
      authService.generateTwoFactorTempToken.mockResolvedValue('temp-token-xyz');
      prismaService.user.findUnique.mockResolvedValue({
        smsOtpEnabled: false,
        recoveryPhoneVerified: false,
      });

      const result = await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

      expect((result as any).tempToken).toBe('temp-token-xyz');
      expect((result as any).requiresMfa).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 7. SMS OTP Method Availability Branch
  // ══════════════════════════════════════════════════════════════════════════

  describe('SMS OTP method availability', () => {
    it('7.1 should include SMS in methods when SMS enabled and phone verified', async () => {
      loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 });
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      mfaService.getStatus.mockResolvedValue({ enabled: true } as never);
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 0,
        level: 'low',
        blockLogin: false,
        requiresMfa: false,
      } as never);
      trustedDeviceService.isDeviceTrusted.mockResolvedValue(false);
      authService.generateTwoFactorTempToken.mockResolvedValue('temp-token');
      prismaService.user.findUnique.mockResolvedValue({
        smsOtpEnabled: true,
        recoveryPhoneVerified: true,
      });

      const result = await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

      expect((result as any).methods).toContain('sms');
      expect((result as any).methods).toContain('totp');
      expect((result as any).methods).toContain('backup');
    });

    it('7.2 should exclude SMS when SMS not enabled', async () => {
      loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 });
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      mfaService.getStatus.mockResolvedValue({ enabled: true } as never);
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 0,
        level: 'low',
        blockLogin: false,
        requiresMfa: false,
      } as never);
      trustedDeviceService.isDeviceTrusted.mockResolvedValue(false);
      authService.generateTwoFactorTempToken.mockResolvedValue('temp-token');
      prismaService.user.findUnique.mockResolvedValue({
        smsOtpEnabled: false,
        recoveryPhoneVerified: true,
      });

      const result = await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

      expect((result as any).methods).not.toContain('sms');
      expect((result as any).methods).toContain('totp');
    });

    it('7.3 should exclude SMS when phone not verified', async () => {
      loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 });
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      mfaService.getStatus.mockResolvedValue({ enabled: true } as never);
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 0,
        level: 'low',
        blockLogin: false,
        requiresMfa: false,
      } as never);
      trustedDeviceService.isDeviceTrusted.mockResolvedValue(false);
      authService.generateTwoFactorTempToken.mockResolvedValue('temp-token');
      prismaService.user.findUnique.mockResolvedValue({
        smsOtpEnabled: true,
        recoveryPhoneVerified: false,
      });

      const result = await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

      expect((result as any).methods).not.toContain('sms');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 8. Risk-Induced MFA (requiresMfa without enabled)
  // ══════════════════════════════════════════════════════════════════════════

  describe('risk-induced MFA (high risk forces MFA)', () => {
    it('8.1 should warn but allow when risk requires MFA but user has no MFA configured', async () => {
      loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 });
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 75,
        level: 'high',
        blockLogin: false,
        requiresMfa: true,
      } as never);
      trustedDeviceService.isDeviceTrusted.mockResolvedValue(false);
      authService.generateTokens.mockResolvedValue(mockTokens as never);

      const loggerSpy = jest.spyOn((controller as any).logger, 'warn');

      const result = await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

      expect(result).toEqual(mockTokens);
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('High-risk login'));
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 9. rememberMe Device Trust Duration Branch
  // ══════════════════════════════════════════════════════════════════════════

  describe('rememberMe device trust duration', () => {
    it('9.1 should trust device for 90 days when rememberMe=true and risk=low', async () => {
      const dtoWithRemember = { ...loginDto, rememberMe: true };
      loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 });
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 5,
        level: 'low',
        blockLogin: false,
        requiresMfa: false,
      } as never);
      trustedDeviceService.isDeviceTrusted.mockResolvedValue(false);
      authService.generateTokens.mockResolvedValue(mockTokens as never);

      await controller.login(dtoWithRemember as never, '127.0.0.1', 'Mozilla/5.0');

      expect(riskAssessment.trustDevice).toHaveBeenCalledWith('user-001', expect.any(String), 90);
    });

    it('9.2 should trust device for 30 days when rememberMe=false/undefined', async () => {
      loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 });
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 5,
        level: 'low',
        blockLogin: false,
        requiresMfa: false,
      } as never);
      trustedDeviceService.isDeviceTrusted.mockResolvedValue(false);
      authService.generateTokens.mockResolvedValue(mockTokens as never);

      await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

      expect(riskAssessment.trustDevice).toHaveBeenCalledWith('user-001', expect.any(String), 30);
    });

    it('9.3 should trust device for 90 days when rememberMe=true and risk=medium', async () => {
      const dtoWithRemember = { ...loginDto, rememberMe: true };
      loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 });
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 50,
        level: 'medium',
        blockLogin: false,
        requiresMfa: false,
      } as never);
      trustedDeviceService.isDeviceTrusted.mockResolvedValue(false);
      authService.generateTokens.mockResolvedValue(mockTokens as never);

      await controller.login(dtoWithRemember as never, '127.0.0.1', 'Mozilla/5.0');

      // Medium risk + rememberMe: device is trusted for 90 days (rememberMe controls duration)
      const calls = (riskAssessment.trustDevice as jest.Mock).mock.calls[0];
      expect(calls[2]).toBe(90);
    });

    it('9.4 should not trust device when risk=high', async () => {
      const dtoWithRemember = { ...loginDto, rememberMe: true };
      loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 });
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 90,
        level: 'high',
        blockLogin: false,
        requiresMfa: true,
      } as never);
      trustedDeviceService.isDeviceTrusted.mockResolvedValue(false);
      authService.generateTokens.mockResolvedValue(mockTokens as never);

      await controller.login(dtoWithRemember as never, '127.0.0.1', 'Mozilla/5.0');

      expect(riskAssessment.trustDevice).not.toHaveBeenCalled();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 10. Session Creation Error Handling (non-blocking)
  // ══════════════════════════════════════════════════════════════════════════

  describe('session creation error handling', () => {
    it('10.1 should return tokens even if session creation fails', async () => {
      loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 });
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 0,
        level: 'low',
        blockLogin: false,
        requiresMfa: false,
      } as never);
      trustedDeviceService.isDeviceTrusted.mockResolvedValue(false);
      authService.generateTokens.mockResolvedValue(mockTokens as never);
      sessionService.createSession.mockRejectedValue(new Error('DB error'));

      const result = await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

      expect(result).toEqual(mockTokens);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 11. Success Flow: Throttle Reset
  // ══════════════════════════════════════════════════════════════════════════

  describe('success flow', () => {
    it('11.1 should reset throttle on successful login', async () => {
      loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 });
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 0,
        level: 'low',
        blockLogin: false,
        requiresMfa: false,
      } as never);
      trustedDeviceService.isDeviceTrusted.mockResolvedValue(false);
      authService.generateTokens.mockResolvedValue(mockTokens as never);

      await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

      expect(loginThrottle.resetOnSuccess).toHaveBeenCalledWith('test@example.com', '127.0.0.1');
    });

    it('11.2 should update last login timestamp', async () => {
      loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 });
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 0,
        level: 'low',
        blockLogin: false,
        requiresMfa: false,
      } as never);
      trustedDeviceService.isDeviceTrusted.mockResolvedValue(false);
      authService.generateTokens.mockResolvedValue(mockTokens as never);

      await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

      expect(authService.updateLastLogin).toHaveBeenCalledWith('user-001', '127.0.0.1');
    });

    it('11.3 should log security event on successful login', async () => {
      loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 });
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 0,
        level: 'low',
        blockLogin: false,
        requiresMfa: false,
      } as never);
      trustedDeviceService.isDeviceTrusted.mockResolvedValue(false);
      authService.generateTokens.mockResolvedValue(mockTokens as never);

      await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

      expect(securityActivity.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-001',
          tenantId: 'tenant-001',
          action: 'login_success',
          status: 'success',
        }),
      );
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 12. User Agent Parsing Edge Cases
  // ══════════════════════════════════════════════════════════════════════════

  describe('user agent handling', () => {
    it('12.1 should handle undefined userAgent', async () => {
      loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 });
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 0,
        level: 'low',
        blockLogin: false,
        requiresMfa: false,
      } as never);
      trustedDeviceService.isDeviceTrusted.mockResolvedValue(false);
      authService.generateTokens.mockResolvedValue(mockTokens as never);

      const result = await controller.login(loginDto as never, '127.0.0.1', undefined as never);

      expect(result).toEqual(mockTokens);
    });

    it('12.2 should handle empty userAgent string', async () => {
      loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 });
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 0,
        level: 'low',
        blockLogin: false,
        requiresMfa: false,
      } as never);
      trustedDeviceService.isDeviceTrusted.mockResolvedValue(false);
      authService.generateTokens.mockResolvedValue(mockTokens as never);

      const result = await controller.login(loginDto as never, '127.0.0.1', '');

      expect(result).toEqual(mockTokens);
    });
  });
});
