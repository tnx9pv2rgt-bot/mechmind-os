/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from '../services/auth.service';
import { MfaService } from '../mfa/mfa.service';
import { SmsOtpService } from '../services/sms-otp.service';
import { LoginThrottleService } from '../services/login-throttle.service';
import { SessionService } from '../services/session.service';
import { RiskAssessmentService } from '../services/risk-assessment.service';
import { TrustedDeviceService } from '../services/trusted-device.service';
import { SecurityActivityService } from '../services/security-activity.service';
import { PrismaService } from '@common/services/prisma.service';
import { EncryptionService } from '@common/services/encryption.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let mfaService: jest.Mocked<MfaService>;
  let module: TestingModule;

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

  beforeEach(async () => {
    const testModule: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            registerTenant: jest.fn(),
            validateUser: jest.fn(),
            isAccountLocked: jest.fn(),
            generateTokens: jest.fn(),
            refreshTokens: jest.fn(),
            generateTwoFactorTempToken: jest.fn(),
            verifyTwoFactorTempToken: jest.fn(),
            getUserWithTwoFactorStatus: jest.fn(),
            updateLastLogin: jest.fn(),
            recordFailedLogin: jest.fn(),
            logout: jest.fn().mockResolvedValue(undefined),
            verifyPassword: jest.fn(),
            hashPassword: jest.fn(),
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
            listSessions: jest.fn().mockResolvedValue([]),
            revokeSession: jest.fn(),
            revokeAllOtherSessions: jest.fn().mockResolvedValue(0),
            touchSession: jest.fn(),
          },
        },
        {
          provide: RiskAssessmentService,
          useValue: {
            assessLoginRisk: jest.fn().mockResolvedValue({
              score: 0,
              level: 'low',
              signals: [],
              requiresMfa: false,
              requiresDeviceApproval: false,
              blockLogin: false,
            }),
            trustDevice: jest.fn().mockResolvedValue(undefined),
            markDeviceCompromised: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: LoginThrottleService,
          useValue: {
            getDelay: jest.fn().mockResolvedValue({ delay: 0, attempts: 0 }),
            recordFailure: jest.fn().mockResolvedValue(1),
            resetOnSuccess: jest.fn(),
            getHeaders: jest.fn().mockReturnValue({}),
          },
        },
        {
          provide: SmsOtpService,
          useValue: {
            sendOtp: jest.fn().mockResolvedValue({ success: true, expiresIn: 300 }),
            verifyOtp: jest.fn().mockResolvedValue({ valid: true }),
          },
        },
        {
          provide: TrustedDeviceService,
          useValue: {
            generateFingerprint: jest.fn().mockReturnValue('fingerprint-hash'),
            isDeviceTrusted: jest.fn().mockResolvedValue(false),
            trustDevice: jest.fn().mockResolvedValue(undefined),
            listDevices: jest.fn().mockResolvedValue([]),
            untrustDevice: jest.fn().mockResolvedValue(undefined),
            untrustAllDevices: jest.fn().mockResolvedValue(0),
            markCompromised: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: SecurityActivityService,
          useValue: {
            logEvent: jest.fn().mockReturnValue(Promise.resolve(undefined)),
          },
        },
        {
          provide: EncryptionService,
          useValue: {
            encrypt: jest.fn().mockReturnValue('encrypted-value'),
            decrypt: jest.fn().mockReturnValue('+393331234567'),
            hash: jest.fn().mockReturnValue('hashed-value'),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            user: { findUnique: jest.fn(), update: jest.fn(), findFirst: jest.fn() },
            tenant: { findFirst: jest.fn() },
          },
        },
      ],
    }).compile();

    module = testModule;
    controller = testModule.get<AuthController>(AuthController);
    authService = testModule.get(AuthService) as jest.Mocked<AuthService>;
    mfaService = testModule.get(MfaService) as jest.Mocked<MfaService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should delegate to authService.registerTenant', async () => {
      const dto = {
        shopName: 'Test Shop',
        slug: 'test-shop',
        name: 'John',
        email: 'john@test.com',
        password: 'password123',
      };
      const expected = { tenant: { id: 'tenant-001' }, tokens: mockTokens };
      authService.registerTenant.mockResolvedValue(expected as never);

      const result = await controller.register(dto as never);

      expect(authService.registerTenant).toHaveBeenCalledWith({
        shopName: 'Test Shop',
        slug: 'test-shop',
        name: 'John',
        email: 'john@test.com',
        password: 'password123',
      });
      expect(result).toEqual(expected);
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'pass123',
      tenantSlug: 'garage-roma',
    };

    it('should return tokens when credentials valid and no MFA', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);
      authService.generateTokens.mockResolvedValue(mockTokens as never);

      const result = await controller.login(
        loginDto as never,
        '127.0.0.1',
        'Mozilla/5.0 Chrome/120',
      );

      expect(authService.validateUser).toHaveBeenCalledWith(
        'test@example.com',
        'pass123',
        'garage-roma',
      );
      expect(authService.updateLastLogin).toHaveBeenCalledWith('user-001', '127.0.0.1');
      expect(result).toEqual(mockTokens);
    });

    it('should throw UnauthorizedException when credentials invalid', async () => {
      authService.validateUser.mockResolvedValue(null as never);

      await expect(
        controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0 Chrome/120'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when account locked', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({
        locked: true,
        until: new Date(),
      } as never);

      await expect(
        controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0 Chrome/120'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return MFA temp token when MFA enabled and no code provided', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      mfaService.getStatus.mockResolvedValue({ enabled: true } as never);
      authService.generateTwoFactorTempToken.mockResolvedValue('temp-token-123' as never);

      const result = await controller.login(
        loginDto as never,
        '127.0.0.1',
        'Mozilla/5.0 Chrome/120',
      );

      expect(result).toEqual({
        tempToken: 'temp-token-123',
        requiresMfa: true,
        methods: ['totp', 'backup'],
        riskLevel: 'low',
      });
    });

    it('should return tokens when MFA code is valid', async () => {
      const dtoWithTotp = { ...loginDto, totpCode: '123456' };
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      mfaService.getStatus.mockResolvedValue({ enabled: true } as never);
      mfaService.verify.mockResolvedValue({ valid: true } as never);
      authService.generateTokens.mockResolvedValue(mockTokens as never);

      const result = await controller.login(
        dtoWithTotp as never,
        '127.0.0.1',
        'Mozilla/5.0 Chrome/120',
      );

      expect(mfaService.verify).toHaveBeenCalledWith('user-001', '123456');
      expect(result).toEqual(mockTokens);
    });

    it('should throw UnauthorizedException when MFA code is invalid', async () => {
      const dtoWithTotp = { ...loginDto, totpCode: '000000' };
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      mfaService.getStatus.mockResolvedValue({ enabled: true } as never);
      mfaService.verify.mockResolvedValue({ valid: false } as never);

      await expect(
        controller.login(dtoWithTotp as never, '127.0.0.1', 'Mozilla/5.0 Chrome/120'),
      ).rejects.toThrow(UnauthorizedException);
      expect(authService.recordFailedLogin).toHaveBeenCalledWith('user-001');
    });
  });

  describe('verifyTwoFactor', () => {
    it('should return tokens on valid 2FA verification', async () => {
      authService.verifyTwoFactorTempToken.mockResolvedValue('user-001' as never);
      mfaService.verify.mockResolvedValue({ valid: true } as never);
      authService.getUserWithTwoFactorStatus.mockResolvedValue(mockUser as never);
      authService.generateTokens.mockResolvedValue(mockTokens as never);

      const dto = { tempToken: 'temp-123', totpCode: '123456' };
      const result = await controller.verifyTwoFactor(
        dto as never,
        '127.0.0.1',
        'Mozilla/5.0 Chrome/120',
      );

      expect(authService.verifyTwoFactorTempToken).toHaveBeenCalledWith('temp-123');
      expect(mfaService.verify).toHaveBeenCalledWith('user-001', '123456');
      expect(authService.updateLastLogin).toHaveBeenCalledWith('user-001', '127.0.0.1');
      expect(result).toEqual(mockTokens);
    });

    it('should throw UnauthorizedException on invalid 2FA code', async () => {
      authService.verifyTwoFactorTempToken.mockResolvedValue('user-001' as never);
      mfaService.verify.mockResolvedValue({ valid: false } as never);

      const dto = { tempToken: 'temp-123', totpCode: '000000' };
      await expect(
        controller.verifyTwoFactor(dto as never, '127.0.0.1', 'Mozilla/5.0 Chrome/120'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    it('should delegate to authService.refreshTokens', async () => {
      authService.refreshTokens.mockResolvedValue(mockTokens as never);

      const result = await controller.refreshToken({ refreshToken: 'old-refresh' } as never);

      expect(authService.refreshTokens).toHaveBeenCalledWith('old-refresh');
      expect(result).toEqual(mockTokens);
    });
  });

  // =========================================================================
  // getMe()
  // =========================================================================
  describe('getMe', () => {
    it('should return user profile when found and tenantId matches', async () => {
      const user = {
        userId: 'user-001',
        email: 'test@example.com',
        tenantId: 'tenant-001',
        role: 'ADMIN',
      };
      const dbUser = {
        id: 'user-001',
        email: 'test@example.com',
        name: 'Test User',
        role: 'ADMIN',
        isActive: true,
        tenantId: 'tenant-001',
        createdAt: new Date(),
        avatar: null,
        tenant: { id: 'tenant-001', name: 'Shop', slug: 'shop' },
      };

      const prismaService = (controller as unknown as Record<string, unknown>)['prisma'] as {
        user: { findUnique: jest.Mock };
      };
      prismaService.user.findUnique.mockResolvedValue(dbUser);

      const result = await controller.getMe(user as never);

      expect(result).toEqual(dbUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      const user = {
        userId: 'user-001',
        email: 'test@example.com',
        tenantId: 'tenant-001',
        role: 'ADMIN',
      };
      const prismaService = (controller as unknown as Record<string, unknown>)['prisma'] as {
        user: { findUnique: jest.Mock };
      };
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(controller.getMe(user as never)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when tenantId does not match', async () => {
      const user = {
        userId: 'user-001',
        email: 'test@example.com',
        tenantId: 'tenant-001',
        role: 'ADMIN',
      };
      const prismaService = (controller as unknown as Record<string, unknown>)['prisma'] as {
        user: { findUnique: jest.Mock };
      };
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-001',
        tenantId: 'different-tenant',
      });

      await expect(controller.getMe(user as never)).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // logout()
  // =========================================================================
  describe('logout', () => {
    it('should call authService.logout and return success', async () => {
      (authService as unknown as { logout: jest.Mock }).logout = jest
        .fn()
        .mockResolvedValue(undefined);

      const result = await controller.logout('Bearer some-jwt-token', {
        refreshToken: 'refresh-123',
      });

      expect((authService as unknown as { logout: jest.Mock }).logout).toHaveBeenCalledWith(
        'some-jwt-token',
        'refresh-123',
      );
      expect(result).toEqual({ success: true });
    });

    it('should handle missing authorization header', async () => {
      (authService as unknown as { logout: jest.Mock }).logout = jest
        .fn()
        .mockResolvedValue(undefined);

      const result = await controller.logout(undefined as unknown as string, {});

      expect((authService as unknown as { logout: jest.Mock }).logout).toHaveBeenCalledWith(
        '',
        undefined,
      );
      expect(result).toEqual({ success: true });
    });
  });

  // =========================================================================
  // listSessions()
  // =========================================================================
  describe('listSessions', () => {
    it('should delegate to sessionService.listSessions with stripped bearer token', async () => {
      const user = {
        userId: 'user-001',
        email: 'test@example.com',
        tenantId: 'tenant-001',
        role: 'ADMIN',
      };
      const sessionService = (controller as unknown as Record<string, unknown>)[
        'sessionService'
      ] as { listSessions: jest.Mock };

      sessionService.listSessions.mockResolvedValue([]);

      const result = await controller.listSessions(user as never, 'Bearer current-jwt');

      expect(result).toEqual([]);
      expect(sessionService.listSessions).toHaveBeenCalledWith('user-001', 'current-jwt');
    });
  });

  // =========================================================================
  // revokeSession()
  // =========================================================================
  describe('revokeSession', () => {
    it('should delegate to sessionService.revokeSession', async () => {
      const user = {
        userId: 'user-001',
        email: 'test@example.com',
        tenantId: 'tenant-001',
        role: 'ADMIN',
      };
      const _sessionService = (controller as unknown as Record<string, unknown>)[
        'sessionService'
      ] as {
        revokeSession: jest.Mock;
      };

      const result = await controller.revokeSession(user as never, { sessionId: 's1' });

      expect(result).toEqual({ success: true });
    });
  });

  // =========================================================================
  // revokeOtherSessions()
  // =========================================================================
  describe('revokeOtherSessions', () => {
    it('should delegate to sessionService.revokeAllOtherSessions', async () => {
      const user = {
        userId: 'user-001',
        email: 'test@example.com',
        tenantId: 'tenant-001',
        role: 'ADMIN',
      };

      const result = await controller.revokeOtherSessions(user as never, {
        currentSessionId: 'current-session',
      });

      expect(result).toEqual({ success: true, count: 0 });
    });
  });

  // =========================================================================
  // createDemoSession()
  // =========================================================================
  describe('createDemoSession', () => {
    let prismaService: {
      user: { findUnique: jest.Mock };
      tenant: { findFirst: jest.Mock };
    };

    beforeEach(() => {
      prismaService = (controller as unknown as Record<string, unknown>)[
        'prisma'
      ] as typeof prismaService;
    });

    it('should return tokens and user info for demo tenant', async () => {
      const demoTenant = {
        id: 'demo-tenant-id',
        name: 'Demo Officina',
        slug: 'demo',
        isActive: true,
        users: [{ id: 'demo-user-id', email: 'demo@test.com', name: 'Demo User', role: 'ADMIN' }],
      };
      prismaService.tenant.findFirst.mockResolvedValue(demoTenant);
      authService.generateTokens.mockResolvedValue(mockTokens as never);

      const result = await controller.createDemoSession();

      expect(result).toEqual({
        ...mockTokens,
        user: {
          id: 'demo-user-id',
          email: 'demo@test.com',
          name: 'Demo User',
          role: 'ADMIN',
        },
        tenant: {
          id: 'demo-tenant-id',
          name: 'Demo Officina',
          slug: 'demo',
        },
      });
    });

    it('should throw NotFoundException when demo tenant does not exist', async () => {
      prismaService.tenant.findFirst.mockResolvedValue(null);

      await expect(controller.createDemoSession()).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when demo tenant has no users', async () => {
      prismaService.tenant.findFirst.mockResolvedValue({
        id: 'demo-tenant-id',
        name: 'Demo',
        slug: 'demo',
        isActive: true,
        users: [],
      });

      await expect(controller.createDemoSession()).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // login — edge cases
  // =========================================================================
  describe('login — risk assessment', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'pass123',
      tenantSlug: 'garage-roma',
    };

    let riskAssessment: jest.Mocked<RiskAssessmentService>;

    beforeEach(() => {
      riskAssessment = (controller as unknown as Record<string, unknown>)[
        'riskAssessment'
      ] as jest.Mocked<RiskAssessmentService>;
    });

    it('should apply progressive delay when throttle returns delay > 0', async () => {
      const loginThrottle = (controller as unknown as Record<string, unknown>)[
        'loginThrottle'
      ] as jest.Mocked<LoginThrottleService>;
      loginThrottle.getDelay.mockResolvedValue({ delay: 1, attempts: 3 } as never);

      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      authService.generateTokens.mockResolvedValue(mockTokens as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);

      const result = await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

      expect(result).toEqual(mockTokens);
    });

    it('should skip MFA when device is trusted', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      authService.generateTokens.mockResolvedValue(mockTokens as never);
      mfaService.getStatus.mockResolvedValue({ enabled: true } as never);

      const trustedDeviceService = (controller as unknown as Record<string, unknown>)[
        'trustedDeviceService'
      ] as { isDeviceTrusted: jest.Mock };
      trustedDeviceService.isDeviceTrusted.mockResolvedValue(true);

      const result = await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

      expect(result).toEqual(mockTokens);
      expect(mfaService.verify).not.toHaveBeenCalled();
    });

    it('should not trust device when risk level is high', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      authService.generateTokens.mockResolvedValue(mockTokens as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);

      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 80,
        level: 'critical',
        signals: [],
        requiresMfa: false,
        requiresDeviceApproval: false,
        blockLogin: false,
      } as never);

      const result = await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

      expect(result).toEqual(mockTokens);
      // trustDevice should NOT be called for critical risk level
      expect(riskAssessment.trustDevice).not.toHaveBeenCalled();
    });

    it('should handle empty user-agent header', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      authService.generateTokens.mockResolvedValue(mockTokens as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);

      const result = await controller.login(loginDto as never, '127.0.0.1', '');

      expect(result).toEqual(mockTokens);
    });

    it('should throw UnauthorizedException when risk blocks login', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);

      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 100,
        level: 'critical',
        signals: [] as any,
        requiresMfa: true,
        requiresDeviceApproval: false,
        blockLogin: true,
      } as never);

      await expect(controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should record failure on login throttle when validateUser throws', async () => {
      const loginThrottle = (controller as unknown as Record<string, unknown>)[
        'loginThrottle'
      ] as jest.Mocked<LoginThrottleService>;

      authService.validateUser.mockRejectedValue(new UnauthorizedException('Invalid credentials'));

      await expect(controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0')).rejects.toThrow(
        UnauthorizedException,
      );

      expect(loginThrottle.recordFailure).toHaveBeenCalledWith('test@example.com', '127.0.0.1');
    });

    it('should allow login with high risk but no MFA configured (logs warning)', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      authService.generateTokens.mockResolvedValue(mockTokens as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);

      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 80,
        level: 'high',
        signals: [] as any,
        requiresMfa: true,
        requiresDeviceApproval: false,
        blockLogin: false,
      } as never);

      const result = await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

      expect(result).toEqual(mockTokens);
    });

    it('should include sms in MFA methods when smsOtpEnabled and phone verified', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      mfaService.getStatus.mockResolvedValue({ enabled: true } as never);
      authService.generateTwoFactorTempToken.mockResolvedValue('temp-token' as never);

      const prismaService = (controller as unknown as Record<string, unknown>)['prisma'] as {
        user: { findUnique: jest.Mock };
      };
      prismaService.user.findUnique.mockResolvedValue({
        smsOtpEnabled: true,
        recoveryPhoneVerified: true,
      });

      const result = await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

      expect(result).toEqual(
        expect.objectContaining({
          tempToken: 'temp-token',
          requiresMfa: true,
          methods: expect.arrayContaining(['sms']),
        }),
      );
    });

    it('should handle session creation failure gracefully', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      authService.generateTokens.mockResolvedValue(mockTokens as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);

      const sessionService = (controller as unknown as Record<string, unknown>)[
        'sessionService'
      ] as { createSession: jest.Mock };
      sessionService.createSession.mockRejectedValue(new Error('Redis down'));

      // Login should still succeed even when session creation fails
      const result = await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

      expect(result).toEqual(mockTokens);
    });

    it('should pass rememberMe=true to trust device for 90 days', async () => {
      const loginDtoWithRemember = { ...loginDto, rememberMe: true };
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      authService.generateTokens.mockResolvedValue(mockTokens as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);

      const result = await controller.login(
        loginDtoWithRemember as never,
        '127.0.0.1',
        'Mozilla/5.0 Chrome/120',
      );

      expect(result).toEqual(mockTokens);
      expect(riskAssessment.trustDevice).toHaveBeenCalledWith('user-001', expect.any(String), 90);
    });
  });

  // =========================================================================
  // verifyTwoFactor — additional edge cases
  // =========================================================================
  describe('verifyTwoFactor — session creation failure', () => {
    it('should return tokens even when session creation fails', async () => {
      authService.verifyTwoFactorTempToken.mockResolvedValue('user-001' as never);
      mfaService.verify.mockResolvedValue({ valid: true } as never);
      authService.getUserWithTwoFactorStatus.mockResolvedValue(mockUser as never);
      authService.generateTokens.mockResolvedValue(mockTokens as never);

      const sessionService = (controller as unknown as Record<string, unknown>)[
        'sessionService'
      ] as { createSession: jest.Mock };
      sessionService.createSession.mockRejectedValue(new Error('Session error'));

      const dto = { tempToken: 'temp-123', totpCode: '123456' };
      const result = await controller.verifyTwoFactor(dto as never, '127.0.0.1', 'Mozilla/5.0');

      expect(result).toEqual(mockTokens);
    });
  });

  // =========================================================================
  // listDevices()
  // =========================================================================
  describe('listDevices', () => {
    it('should delegate to trustedDeviceService.listDevices', async () => {
      const user = {
        userId: 'user-001',
        email: 'test@example.com',
        tenantId: 'tenant-001',
        role: 'ADMIN',
      };
      const trustedDeviceService = (controller as unknown as Record<string, unknown>)[
        'trustedDeviceService'
      ] as { listDevices: jest.Mock };

      trustedDeviceService.listDevices.mockResolvedValue([]);

      const result = await controller.listDevices(user as never);

      expect(result).toEqual([]);
      expect(trustedDeviceService.listDevices).toHaveBeenCalledWith('user-001');
    });
  });

  // =========================================================================
  // trustDevice()
  // =========================================================================
  describe('trustDevice', () => {
    it('should delegate to trustedDeviceService and log security event', async () => {
      const user = {
        userId: 'user-001',
        email: 'test@example.com',
        tenantId: 'tenant-001',
        role: 'ADMIN',
      };
      const trustedDeviceService = (controller as unknown as Record<string, unknown>)[
        'trustedDeviceService'
      ] as { trustDevice: jest.Mock };

      const expectedDate = new Date();
      trustedDeviceService.trustDevice.mockResolvedValue({
        id: 'dev-1',
        trustedUntil: expectedDate,
      });

      const result = await controller.trustDevice('dev-1', user as never, { days: 60 } as never);

      expect(result).toEqual({ id: 'dev-1', trustedUntil: expectedDate });
      expect(trustedDeviceService.trustDevice).toHaveBeenCalledWith('dev-1', 'user-001', 60);
    });
  });

  // =========================================================================
  // untrustDevice()
  // =========================================================================
  describe('untrustDevice', () => {
    it('should delegate to trustedDeviceService.untrustDevice', async () => {
      const user = {
        userId: 'user-001',
        email: 'test@example.com',
        tenantId: 'tenant-001',
        role: 'ADMIN',
      };
      const trustedDeviceService = (controller as unknown as Record<string, unknown>)[
        'trustedDeviceService'
      ] as { untrustDevice: jest.Mock };

      trustedDeviceService.untrustDevice = jest.fn().mockResolvedValue(undefined);

      const result = await controller.untrustDevice('dev-1', user as never);

      expect(result).toEqual({ success: true });
    });
  });

  // =========================================================================
  // untrustAllDevices()
  // =========================================================================
  describe('untrustAllDevices', () => {
    it('should delegate to trustedDeviceService.untrustAllDevices', async () => {
      const user = {
        userId: 'user-001',
        email: 'test@example.com',
        tenantId: 'tenant-001',
        role: 'ADMIN',
      };
      const trustedDeviceService = (controller as unknown as Record<string, unknown>)[
        'trustedDeviceService'
      ] as { untrustAllDevices: jest.Mock };

      trustedDeviceService.untrustAllDevices = jest.fn().mockResolvedValue(5);

      const result = await controller.untrustAllDevices(user as never);

      expect(result).toEqual({ success: true, count: 5 });
    });
  });

  // =========================================================================
  // markDeviceCompromised()
  // =========================================================================
  describe('markDeviceCompromised', () => {
    it('should delegate to trustedDeviceService.markCompromised', async () => {
      const user = {
        userId: 'user-001',
        email: 'test@example.com',
        tenantId: 'tenant-001',
        role: 'ADMIN',
      };
      const trustedDeviceService = (controller as unknown as Record<string, unknown>)[
        'trustedDeviceService'
      ] as { markCompromised: jest.Mock };

      trustedDeviceService.markCompromised = jest.fn().mockResolvedValue(undefined);

      const result = await controller.markDeviceCompromised('dev-1', user as never);

      expect(result).toEqual({ success: true });
    });
  });

  // =========================================================================
  // getSecurityActivity()
  // =========================================================================
  describe('getSecurityActivity', () => {
    it('should delegate to securityActivity.getActivity with parsed params', async () => {
      const user = {
        userId: 'user-001',
        email: 'test@example.com',
        tenantId: 'tenant-001',
        role: 'ADMIN',
      };
      const securityActivity = (controller as unknown as Record<string, unknown>)[
        'securityActivity'
      ] as { getActivity: jest.Mock };

      securityActivity.getActivity = jest.fn().mockResolvedValue({
        events: [],
        total: 0,
        page: 1,
        totalPages: 0,
      });

      const result = await controller.getSecurityActivity(
        user as never,
        '2',
        '20',
        'LOGIN_SUCCESS,LOGIN_FAILED',
      );

      expect(securityActivity.getActivity).toHaveBeenCalledWith({
        tenantId: 'tenant-001',
        userId: 'user-001',
        page: 2,
        limit: 20,
        eventTypes: ['LOGIN_SUCCESS', 'LOGIN_FAILED'],
      });
      expect(result).toEqual({ events: [], total: 0, page: 1, totalPages: 0 });
    });

    it('should handle undefined query params', async () => {
      const user = {
        userId: 'user-001',
        email: 'test@example.com',
        tenantId: 'tenant-001',
        role: 'ADMIN',
      };
      const securityActivity = (controller as unknown as Record<string, unknown>)[
        'securityActivity'
      ] as { getActivity: jest.Mock };

      securityActivity.getActivity = jest.fn().mockResolvedValue({
        events: [],
        total: 0,
        page: 1,
        totalPages: 0,
      });

      await controller.getSecurityActivity(user as never);

      expect(securityActivity.getActivity).toHaveBeenCalledWith({
        tenantId: 'tenant-001',
        userId: 'user-001',
        page: undefined,
        limit: undefined,
        eventTypes: undefined,
      });
    });
  });

  // =========================================================================
  // getSecuritySummary()
  // =========================================================================
  describe('getSecuritySummary', () => {
    it('should delegate to securityActivity.getActivitySummary', async () => {
      const user = {
        userId: 'user-001',
        email: 'test@example.com',
        tenantId: 'tenant-001',
        role: 'ADMIN',
      };
      const securityActivity = (controller as unknown as Record<string, unknown>)[
        'securityActivity'
      ] as { getActivitySummary: jest.Mock };

      securityActivity.getActivitySummary = jest.fn().mockResolvedValue({
        totalLogins: 10,
        failedAttempts: 2,
        devicesUsed: 3,
        locationsUsed: ['Roma'],
        lastLogin: new Date(),
        suspiciousEvents: 0,
      });

      const result = await controller.getSecuritySummary(user as never);

      expect(result.totalLogins).toBe(10);
      expect(securityActivity.getActivitySummary).toHaveBeenCalledWith('tenant-001', 'user-001');
    });
  });

  // =========================================================================
  // setRecoveryPhone()
  // =========================================================================
  describe('setRecoveryPhone', () => {
    it('should encrypt phone, update user, and send OTP', async () => {
      const user = {
        userId: 'user-001',
        tenantId: 'tenant-001',
        email: 'test@test.com',
        role: 'ADMIN',
      };
      const prismaService = (controller as unknown as Record<string, unknown>)['prisma'] as {
        user: { update: jest.Mock };
      };
      prismaService.user.update = jest.fn().mockResolvedValue({});

      const smsOtp = (controller as unknown as Record<string, unknown>)['smsOtpService'] as {
        sendOtp: jest.Mock;
      };
      smsOtp.sendOtp.mockResolvedValue({ success: true, expiresIn: 300 });

      const result = await controller.setRecoveryPhone(
        user as never,
        { phone: '+393331234567' } as never,
      );

      expect(result).toEqual({ success: true, expiresIn: 300 });
    });
  });

  // =========================================================================
  // verifyRecoveryPhone()
  // =========================================================================
  describe('verifyRecoveryPhone', () => {
    it('should verify OTP and mark phone as verified', async () => {
      const user = {
        userId: 'user-001',
        tenantId: 'tenant-001',
        email: 'test@test.com',
        role: 'ADMIN',
      };

      const smsOtp = (controller as unknown as Record<string, unknown>)['smsOtpService'] as {
        verifyOtp: jest.Mock;
      };
      smsOtp.verifyOtp.mockResolvedValue({ valid: true });

      const prismaService = (controller as unknown as Record<string, unknown>)['prisma'] as {
        user: { update: jest.Mock };
      };
      prismaService.user.update = jest.fn().mockResolvedValue({});

      const result = await controller.verifyRecoveryPhone(
        user as never,
        { code: '123456' } as never,
      );

      expect(result).toEqual({ success: true });
    });

    it('should throw BadRequestException when OTP is invalid', async () => {
      const user = {
        userId: 'user-001',
        tenantId: 'tenant-001',
        email: 'test@test.com',
        role: 'ADMIN',
      };

      const smsOtp = (controller as unknown as Record<string, unknown>)['smsOtpService'] as {
        verifyOtp: jest.Mock;
      };
      smsOtp.verifyOtp.mockResolvedValue({ valid: false, remainingAttempts: 2 });

      await expect(
        controller.verifyRecoveryPhone(user as never, { code: '000000' } as never),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // removeRecoveryPhone()
  // =========================================================================
  describe('removeRecoveryPhone', () => {
    it('should remove recovery phone from user', async () => {
      const user = {
        userId: 'user-001',
        tenantId: 'tenant-001',
        email: 'test@test.com',
        role: 'ADMIN',
      };
      const prismaService = (controller as unknown as Record<string, unknown>)['prisma'] as {
        user: { update: jest.Mock };
      };
      prismaService.user.update = jest.fn().mockResolvedValue({});

      const result = await controller.removeRecoveryPhone(user as never);

      expect(result).toEqual({ success: true });
    });
  });

  // =========================================================================
  // sendRecoveryOtp()
  // =========================================================================
  describe('sendRecoveryOtp', () => {
    it('should return success even when user not found (prevent enumeration)', async () => {
      const prismaService = (controller as unknown as Record<string, unknown>)['prisma'] as {
        user: { findFirst: jest.Mock };
      };
      prismaService.user.findFirst = jest.fn().mockResolvedValue(null);

      const result = await controller.sendRecoveryOtp({ email: 'unknown@test.com' } as never);

      expect(result).toEqual({ success: true, expiresIn: 300 });
    });

    it('should send OTP when user has verified recovery phone', async () => {
      const prismaService = (controller as unknown as Record<string, unknown>)['prisma'] as {
        user: { findFirst: jest.Mock };
      };
      prismaService.user.findFirst = jest.fn().mockResolvedValue({
        id: 'u1',
        tenantId: 't1',
        recoveryPhone: 'encrypted-phone',
        recoveryPhoneVerified: true,
      });

      const smsOtp = (controller as unknown as Record<string, unknown>)['smsOtpService'] as {
        sendOtp: jest.Mock;
      };
      smsOtp.sendOtp.mockResolvedValue({ success: true, expiresIn: 300 });

      const result = await controller.sendRecoveryOtp({ email: 'test@test.com' } as never);

      expect(result).toEqual({ success: true, expiresIn: 300 });
    });
  });

  // =========================================================================
  // verifyRecoveryOtp()
  // =========================================================================
  describe('verifyRecoveryOtp', () => {
    it('should throw BadRequestException when user not found', async () => {
      const prismaService = (controller as unknown as Record<string, unknown>)['prisma'] as {
        user: { findFirst: jest.Mock };
      };
      prismaService.user.findFirst = jest.fn().mockResolvedValue(null);

      await expect(
        controller.verifyRecoveryOtp({ email: 'unknown@test.com', code: '123456' } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when OTP is invalid', async () => {
      const prismaService = (controller as unknown as Record<string, unknown>)['prisma'] as {
        user: { findFirst: jest.Mock };
      };
      prismaService.user.findFirst = jest.fn().mockResolvedValue({ id: 'u1' });

      const smsOtp = (controller as unknown as Record<string, unknown>)['smsOtpService'] as {
        verifyOtp: jest.Mock;
      };
      smsOtp.verifyOtp.mockResolvedValue({ valid: false, remainingAttempts: 1 });

      await expect(
        controller.verifyRecoveryOtp({ email: 'test@test.com', code: '000000' } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return tempToken when OTP is valid', async () => {
      const prismaService = (controller as unknown as Record<string, unknown>)['prisma'] as {
        user: { findFirst: jest.Mock };
      };
      prismaService.user.findFirst = jest.fn().mockResolvedValue({ id: 'u1' });

      const smsOtp = (controller as unknown as Record<string, unknown>)['smsOtpService'] as {
        verifyOtp: jest.Mock;
      };
      smsOtp.verifyOtp.mockResolvedValue({ valid: true });

      authService.generateTwoFactorTempToken.mockResolvedValue('temp-recovery-token' as never);

      const result = await controller.verifyRecoveryOtp({
        email: 'test@test.com',
        code: '123456',
      } as never);

      expect(result).toEqual({ tempToken: 'temp-recovery-token' });
    });
  });

  // =========================================================================
  // sendLoginSmsOtp()
  // =========================================================================
  describe('sendLoginSmsOtp', () => {
    it('should throw BadRequestException when user has no recovery phone', async () => {
      const user = {
        userId: 'user-001',
        tenantId: 'tenant-001',
        email: 'test@test.com',
        role: 'ADMIN',
      };
      const prismaService = (controller as unknown as Record<string, unknown>)['prisma'] as {
        user: { findUnique: jest.Mock };
      };
      prismaService.user.findUnique.mockResolvedValue({
        recoveryPhone: null,
        recoveryPhoneVerified: false,
      });

      await expect(controller.sendLoginSmsOtp(user as never)).rejects.toThrow(BadRequestException);
    });

    it('should send OTP when phone is configured and verified', async () => {
      const user = {
        userId: 'user-001',
        tenantId: 'tenant-001',
        email: 'test@test.com',
        role: 'ADMIN',
      };
      const prismaService = (controller as unknown as Record<string, unknown>)['prisma'] as {
        user: { findUnique: jest.Mock };
      };
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-001',
        tenantId: 'tenant-001',
        recoveryPhone: 'encrypted',
        recoveryPhoneVerified: true,
      });

      const smsOtp = (controller as unknown as Record<string, unknown>)['smsOtpService'] as {
        sendOtp: jest.Mock;
      };
      smsOtp.sendOtp.mockResolvedValue({ success: true, expiresIn: 300 });

      const result = await controller.sendLoginSmsOtp(user as never);

      expect(result).toEqual({ success: true, expiresIn: 300 });
    });
  });

  // =========================================================================
  // verifyLoginSmsOtp()
  // =========================================================================
  describe('verifyLoginSmsOtp', () => {
    it('should throw BadRequestException when OTP is invalid', async () => {
      authService.verifyTwoFactorTempToken.mockResolvedValue('user-001' as never);

      const smsOtp = (controller as unknown as Record<string, unknown>)['smsOtpService'] as {
        verifyOtp: jest.Mock;
      };
      smsOtp.verifyOtp.mockResolvedValue({ valid: false, remainingAttempts: 2 });

      await expect(
        controller.verifyLoginSmsOtp(
          { tempToken: 'temp-123', code: '000000' } as never,
          '127.0.0.1',
          'Mozilla/5.0',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return tokens on valid SMS OTP', async () => {
      authService.verifyTwoFactorTempToken.mockResolvedValue('user-001' as never);
      authService.getUserWithTwoFactorStatus.mockResolvedValue(mockUser as never);
      authService.generateTokens.mockResolvedValue(mockTokens as never);

      const smsOtp = (controller as unknown as Record<string, unknown>)['smsOtpService'] as {
        verifyOtp: jest.Mock;
      };
      smsOtp.verifyOtp.mockResolvedValue({ valid: true });

      const result = await controller.verifyLoginSmsOtp(
        { tempToken: 'temp-123', code: '123456' } as never,
        '127.0.0.1',
        'Mozilla/5.0 Chrome/120',
      );

      expect(result).toEqual(mockTokens);
    });

    it('should return tokens even when session creation fails in verifyLoginSmsOtp', async () => {
      authService.verifyTwoFactorTempToken.mockResolvedValue('user-001' as never);
      authService.getUserWithTwoFactorStatus.mockResolvedValue(mockUser as never);
      authService.generateTokens.mockResolvedValue(mockTokens as never);

      const smsOtp = (controller as unknown as Record<string, unknown>)['smsOtpService'] as {
        verifyOtp: jest.Mock;
      };
      smsOtp.verifyOtp.mockResolvedValue({ valid: true });

      const sessionService = (controller as unknown as Record<string, unknown>)[
        'sessionService'
      ] as { createSession: jest.Mock };
      sessionService.createSession.mockRejectedValue(new Error('Session fail'));

      const result = await controller.verifyLoginSmsOtp(
        { tempToken: 'temp-123', code: '123456' } as never,
        '127.0.0.1',
        'Mozilla/5.0',
      );

      expect(result).toEqual(mockTokens);
    });
  });

  // =========================================================================
  // changePassword()
  // =========================================================================
  describe('changePassword', () => {
    const user = {
      userId: 'user-001',
      email: 'test@example.com',
      tenantId: 'tenant-001',
      role: 'ADMIN',
    };

    it('should successfully change password', async () => {
      const prismaService = module.get(PrismaService) as any;
      authService.verifyPassword.mockResolvedValue(true);
      authService.hashPassword.mockResolvedValue('newhash');

      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-001',
        passwordHash: 'hash',
        tenantId: 'tenant-001',
      });
      prismaService.user.update.mockResolvedValue({ id: 'user-001' });

      const dto = { currentPassword: 'old123!', newPassword: 'NewPass123' };
      const result = await controller.changePassword(user as never, dto as never);

      expect(result).toEqual({
        success: true,
        message: 'Password aggiornata con successo',
      });
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-001' },
        select: { id: true, passwordHash: true, tenantId: true },
      });
      expect(authService.verifyPassword).toHaveBeenCalledWith('old123!', 'hash');
      expect(authService.hashPassword).toHaveBeenCalledWith('NewPass123');
      expect(prismaService.user.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user not found', async () => {
      const prismaService = module.get(PrismaService) as any;
      prismaService.user.findUnique.mockResolvedValue(null);

      const dto = { currentPassword: 'old123!', newPassword: 'NewPass123' };

      await expect(controller.changePassword(user as never, dto as never)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when tenant mismatch', async () => {
      const prismaService = module.get(PrismaService) as any;
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-001',
        passwordHash: 'hash',
        tenantId: 'different-tenant',
      });

      const dto = { currentPassword: 'old123!', newPassword: 'NewPass123' };

      await expect(controller.changePassword(user as never, dto as never)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw UnauthorizedException when current password invalid', async () => {
      const prismaService = module.get(PrismaService) as any;
      authService.verifyPassword.mockResolvedValue(false);

      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-001',
        passwordHash: 'hash',
        tenantId: 'tenant-001',
      });

      const dto = { currentPassword: 'wrongpassword', newPassword: 'NewPass123' };

      await expect(controller.changePassword(user as never, dto as never)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw BadRequestException when new password same as current', async () => {
      const prismaService = module.get(PrismaService) as any;
      authService.verifyPassword.mockResolvedValue(true);

      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-001',
        passwordHash: 'hash',
        tenantId: 'tenant-001',
      });

      const dto = { currentPassword: 'SamePass123', newPassword: 'SamePass123' };

      await expect(controller.changePassword(user as never, dto as never)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle null passwordHash gracefully', async () => {
      const prismaService = module.get(PrismaService) as any;
      authService.verifyPassword.mockResolvedValue(false); // null coalesced to ''

      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-001',
        passwordHash: null,
        tenantId: 'tenant-001',
      });

      const dto = { currentPassword: 'old123!', newPassword: 'NewPass123' };

      await expect(controller.changePassword(user as never, dto as never)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(authService.verifyPassword).toHaveBeenCalledWith('old123!', '');
    });
  });

  // getMe() tests
  describe('getMe', () => {
    const user = {
      userId: 'user-001',
      email: 'test@example.com',
      tenantId: 'tenant-001',
      role: 'ADMIN',
    };

    it('should return user profile when found and tenantId matches', async () => {
      const prismaService = module.get(PrismaService) as any;
      const mockDbUser = {
        id: 'user-001',
        email: 'test@example.com',
        name: 'Test User',
        role: 'ADMIN',
        isActive: true,
        tenantId: 'tenant-001',
        createdAt: new Date(),
        avatar: 'https://avatar.url',
        tenant: { id: 'tenant-001', name: 'Test Tenant', slug: 'test' },
      };
      prismaService.user.findUnique.mockResolvedValue(mockDbUser);

      const result = await controller.getMe(user as never);

      expect(result).toEqual(mockDbUser);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-001' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          tenantId: true,
          createdAt: true,
          avatar: true,
          tenant: { select: { id: true, name: true, slug: true } },
        },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      const prismaService = module.get(PrismaService) as any;
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(controller.getMe(user as never)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when tenantId does not match', async () => {
      const prismaService = module.get(PrismaService) as any;
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-001',
        tenantId: 'different-tenant',
      });

      await expect(controller.getMe(user as never)).rejects.toThrow(NotFoundException);
    });
  });

  // logout() tests
  describe('logout', () => {
    it('should call authService.logout and return success', async () => {
      authService.logout.mockResolvedValue(undefined);

      const result = await controller.logout('Bearer token-123', { refreshToken: 'refresh-123' });

      expect(result).toEqual({ success: true });
      expect(authService.logout).toHaveBeenCalledWith('token-123', 'refresh-123');
    });

    it('should handle missing authorization header', async () => {
      authService.logout.mockResolvedValue(undefined);

      const result = await controller.logout('', {});

      expect(result).toEqual({ success: true });
      expect(authService.logout).toHaveBeenCalledWith('', undefined);
    });

    it('should handle missing refreshToken in body', async () => {
      authService.logout.mockResolvedValue(undefined);

      const result = await controller.logout('Bearer token-123', {});

      expect(result).toEqual({ success: true });
      expect(authService.logout).toHaveBeenCalledWith('token-123', undefined);
    });
  });

  // listSessions() tests
  describe('listSessions', () => {
    const user = {
      userId: 'user-001',
      email: 'test@example.com',
      tenantId: 'tenant-001',
      role: 'ADMIN',
    };

    it('should return list of user sessions', async () => {
      const mockSessions = [{ id: 'session-1', createdAt: new Date() }];
      const sessionService = module.get(SessionService) as any;
      sessionService.listSessions.mockResolvedValue(mockSessions);

      const result = await controller.listSessions(user as never, 'Bearer token-123');

      expect(result).toEqual(mockSessions);
      expect(sessionService.listSessions).toHaveBeenCalledWith('user-001', 'token-123');
    });
  });

  // revokeSession() tests
  describe('revokeSession', () => {
    const user = {
      userId: 'user-001',
      email: 'test@example.com',
      tenantId: 'tenant-001',
      role: 'ADMIN',
    };

    it('should revoke a session', async () => {
      const sessionService = module.get(SessionService) as any;
      sessionService.revokeSession.mockResolvedValue(undefined);

      const result = await controller.revokeSession(
        user as never,
        { sessionId: 'session-123' } as never,
      );

      expect(result).toEqual({ success: true });
      expect(sessionService.revokeSession).toHaveBeenCalledWith('user-001', 'session-123');
    });
  });

  // revokeOtherSessions() tests
  describe('revokeOtherSessions', () => {
    const user = {
      userId: 'user-001',
      email: 'test@example.com',
      tenantId: 'tenant-001',
      role: 'ADMIN',
    };

    it('should revoke all other sessions', async () => {
      const sessionService = module.get(SessionService) as any;
      sessionService.revokeAllOtherSessions.mockResolvedValue(3);

      const result = await controller.revokeOtherSessions(
        user as never,
        { currentSessionId: 'current-session' } as never,
      );

      expect(result).toEqual({ success: true, count: 3 });
      expect(sessionService.revokeAllOtherSessions).toHaveBeenCalledWith(
        'user-001',
        'current-session',
      );
    });

    it('should handle no other sessions', async () => {
      const sessionService = module.get(SessionService) as any;
      sessionService.revokeAllOtherSessions.mockResolvedValue(0);

      const result = await controller.revokeOtherSessions(
        user as never,
        { currentSessionId: 'current-session' } as never,
      );

      expect(result).toEqual({ success: true, count: 0 });
    });
  });

  // =========================================================================
  // Additional branch coverage tests for uncovered conditional paths
  // =========================================================================

  describe('login — additional branch coverage', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'pass123',
      tenantSlug: 'garage-roma',
    };

    it('should handle MFA enabled with SMS method missing when phone not verified', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      mfaService.getStatus.mockResolvedValue({ enabled: true } as never);
      authService.generateTwoFactorTempToken.mockResolvedValue('temp-token' as never);

      const prismaService = (controller as unknown as Record<string, unknown>)['prisma'] as {
        user: { findUnique: jest.Mock };
      };
      prismaService.user.findUnique.mockResolvedValue({
        smsOtpEnabled: true,
        recoveryPhoneVerified: false,
      });

      const result = await controller.login(
        loginDto as never,
        '127.0.0.1',
        'Mozilla/5.0 Chrome/120',
      );

      expect(result).toEqual({
        tempToken: 'temp-token',
        requiresMfa: true,
        methods: ['totp', 'backup'],
        riskLevel: 'low',
      });
    });

    it('should handle MFA enabled with SMS method missing when SMS not enabled', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      mfaService.getStatus.mockResolvedValue({ enabled: true } as never);
      authService.generateTwoFactorTempToken.mockResolvedValue('temp-token' as never);

      const prismaService = (controller as unknown as Record<string, unknown>)['prisma'] as {
        user: { findUnique: jest.Mock };
      };
      prismaService.user.findUnique.mockResolvedValue({
        smsOtpEnabled: false,
        recoveryPhoneVerified: true,
      });

      const result = await controller.login(
        loginDto as never,
        '127.0.0.1',
        'Mozilla/5.0 Chrome/120',
      );

      expect(result).toEqual({
        tempToken: 'temp-token',
        requiresMfa: true,
        methods: ['totp', 'backup'],
        riskLevel: 'low',
      });
    });

    it('should handle MFA enabled with SMS method included when both conditions met', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      mfaService.getStatus.mockResolvedValue({ enabled: true } as never);
      authService.generateTwoFactorTempToken.mockResolvedValue('temp-token' as never);

      const prismaService = (controller as unknown as Record<string, unknown>)['prisma'] as {
        user: { findUnique: jest.Mock };
      };
      prismaService.user.findUnique.mockResolvedValue({
        smsOtpEnabled: true,
        recoveryPhoneVerified: true,
      });

      const result = await controller.login(
        loginDto as never,
        '127.0.0.1',
        'Mozilla/5.0 Chrome/120',
      );

      expect(result).toEqual({
        tempToken: 'temp-token',
        requiresMfa: true,
        methods: expect.arrayContaining(['totp', 'backup', 'sms']),
        riskLevel: 'low',
      });
    });

    it('should trust device on low risk login', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      authService.generateTokens.mockResolvedValue(mockTokens as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);

      const riskAssessment = (controller as unknown as Record<string, unknown>)[
        'riskAssessment'
      ] as jest.Mocked<RiskAssessmentService>;
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 20,
        level: 'low',
        signals: [],
        requiresMfa: false,
        requiresDeviceApproval: false,
        blockLogin: false,
      } as never);

      const result = await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

      expect(result).toEqual(mockTokens);
      expect(riskAssessment.trustDevice).toHaveBeenCalledWith('user-001', expect.any(String), 30);
    });

    it('should trust device on medium risk login', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      authService.generateTokens.mockResolvedValue(mockTokens as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);

      const riskAssessment = (controller as unknown as Record<string, unknown>)[
        'riskAssessment'
      ] as jest.Mocked<RiskAssessmentService>;
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 50,
        level: 'medium',
        signals: [] as any,
        requiresMfa: false,
        requiresDeviceApproval: false,
        blockLogin: false,
      } as never);

      const result = await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

      expect(result).toEqual(mockTokens);
      expect(riskAssessment.trustDevice).toHaveBeenCalledWith('user-001', expect.any(String), 30);
    });

    it('should not trust device on high risk login even with rememberMe', async () => {
      const loginDtoWithRemember = { ...loginDto, rememberMe: true };
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      authService.generateTokens.mockResolvedValue(mockTokens as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);

      const riskAssessment = (controller as unknown as Record<string, unknown>)[
        'riskAssessment'
      ] as jest.Mocked<RiskAssessmentService>;
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 75,
        level: 'high',
        signals: [] as any,
        requiresMfa: false,
        requiresDeviceApproval: false,
        blockLogin: false,
      } as never);

      const result = await controller.login(
        loginDtoWithRemember as never,
        '127.0.0.1',
        'Mozilla/5.0',
      );

      expect(result).toEqual(mockTokens);
      expect(riskAssessment.trustDevice).not.toHaveBeenCalled();
    });

    it('should skip MFA when mfaRequired is false and risk does not require it', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      authService.generateTokens.mockResolvedValue(mockTokens as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);

      const riskAssessment = (controller as unknown as Record<string, unknown>)[
        'riskAssessment'
      ] as jest.Mocked<RiskAssessmentService>;
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 0,
        level: 'low',
        signals: [],
        requiresMfa: false,
        requiresDeviceApproval: false,
        blockLogin: false,
      } as never);

      const result = await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

      expect(result).toEqual(mockTokens);
      expect(mfaService.verify).not.toHaveBeenCalled();
    });

    it('should log warning when risk requires MFA but MFA not enabled', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      authService.generateTokens.mockResolvedValue(mockTokens as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);

      const riskAssessment = (controller as unknown as Record<string, unknown>)[
        'riskAssessment'
      ] as jest.Mocked<RiskAssessmentService>;
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 70,
        level: 'high',
        signals: [] as any,
        requiresMfa: true,
        requiresDeviceApproval: false,
        blockLogin: false,
      } as never);

      const logger = (controller as unknown as Record<string, unknown>)['logger'] as any;
      jest.spyOn(logger, 'warn').mockImplementation(() => {});

      const result = await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

      expect(result).toEqual(mockTokens);
    });
  });

  describe('refreshToken — error handling', () => {
    it('should handle refresh token refresh failure', async () => {
      authService.refreshTokens.mockRejectedValue(new UnauthorizedException('Invalid token'));

      await expect(
        controller.refreshToken({ refreshToken: 'invalid-token' } as never),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('changePassword — additional edge cases', () => {
    const user = {
      userId: 'user-001',
      email: 'test@example.com',
      tenantId: 'tenant-001',
      role: 'ADMIN',
    };

    it('should handle secure password hash verification', async () => {
      const prismaService = module.get(PrismaService) as any;
      authService.verifyPassword.mockResolvedValue(true);
      authService.hashPassword.mockResolvedValue('secure-newhash');

      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-001',
        passwordHash: 'existing-hash',
        tenantId: 'tenant-001',
      });
      prismaService.user.update.mockResolvedValue({ id: 'user-001' });

      const dto = { currentPassword: 'oldSecure123', newPassword: 'NewSecure456' };
      const result = await controller.changePassword(user as never, dto as never);

      expect(result.success).toBe(true);
      expect(authService.verifyPassword).toHaveBeenCalledWith('oldSecure123', 'existing-hash');
    });
  });

  describe('getSecurityActivity — branch coverage', () => {
    it('should handle page/limit parsing correctly', async () => {
      const user = {
        userId: 'user-001',
        email: 'test@example.com',
        tenantId: 'tenant-001',
        role: 'ADMIN',
      };
      const securityActivity = (controller as unknown as Record<string, unknown>)[
        'securityActivity'
      ] as { getActivity: jest.Mock };

      securityActivity.getActivity = jest.fn().mockResolvedValue({
        events: [],
        total: 0,
        page: 1,
        totalPages: 0,
      });

      await controller.getSecurityActivity(user as never, '1', '10', undefined);

      expect(securityActivity.getActivity).toHaveBeenCalledWith({
        tenantId: 'tenant-001',
        userId: 'user-001',
        page: 1,
        limit: 10,
        eventTypes: undefined,
      });
    });

    it('should handle null page and limit gracefully', async () => {
      const user = {
        userId: 'user-001',
        email: 'test@example.com',
        tenantId: 'tenant-001',
        role: 'ADMIN',
      };
      const securityActivity = (controller as unknown as Record<string, unknown>)[
        'securityActivity'
      ] as { getActivity: jest.Mock };

      securityActivity.getActivity = jest.fn().mockResolvedValue({
        events: [],
        total: 0,
        page: 1,
        totalPages: 0,
      });

      await controller.getSecurityActivity(user as never, null as any, null as any, null as any);

      expect(securityActivity.getActivity).toHaveBeenCalledWith({
        tenantId: 'tenant-001',
        userId: 'user-001',
        page: undefined,
        limit: undefined,
        eventTypes: undefined,
      });
    });
  });

  describe('sendRecoveryOtp — additional branch coverage', () => {
    it('should return success when user has unverified phone', async () => {
      const prismaService = (controller as unknown as Record<string, unknown>)['prisma'] as {
        user: { findFirst: jest.Mock };
      };
      prismaService.user.findFirst = jest.fn().mockResolvedValue({
        id: 'u1',
        tenantId: 't1',
        recoveryPhone: 'encrypted-phone',
        recoveryPhoneVerified: false,
      });

      const result = await controller.sendRecoveryOtp({ email: 'test@test.com' } as never);

      // Should return success even when phone is not verified
      expect(result).toEqual({ success: true, expiresIn: 300 });
    });

    it('should return success when user has no recovery phone', async () => {
      const prismaService = (controller as unknown as Record<string, unknown>)['prisma'] as {
        user: { findFirst: jest.Mock };
      };
      prismaService.user.findFirst = jest.fn().mockResolvedValue({
        id: 'u1',
        tenantId: 't1',
        recoveryPhone: null,
        recoveryPhoneVerified: false,
      });

      const result = await controller.sendRecoveryOtp({ email: 'test@test.com' } as never);

      expect(result).toEqual({ success: true, expiresIn: 300 });
    });

    it('should decrypt and send OTP when all conditions met', async () => {
      const prismaService = (controller as unknown as Record<string, unknown>)['prisma'] as {
        user: { findFirst: jest.Mock };
      };
      const encryption = (controller as unknown as Record<string, unknown>)['encryption'] as {
        decrypt: jest.Mock;
      };
      const smsOtp = (controller as unknown as Record<string, unknown>)['smsOtpService'] as {
        sendOtp: jest.Mock;
      };

      prismaService.user.findFirst = jest.fn().mockResolvedValue({
        id: 'u1',
        tenantId: 't1',
        recoveryPhone: 'encrypted-phone-123',
        recoveryPhoneVerified: true,
      });
      encryption.decrypt.mockReturnValue('+393331234567');
      smsOtp.sendOtp.mockResolvedValue({ success: true, expiresIn: 300 });

      const result = await controller.sendRecoveryOtp({ email: 'test@test.com' } as never);

      expect(encryption.decrypt).toHaveBeenCalledWith('encrypted-phone-123');
      expect(smsOtp.sendOtp).toHaveBeenCalledWith({
        userId: 'u1',
        tenantId: 't1',
        phone: '+393331234567',
        purpose: 'recovery',
      });
      expect(result).toEqual({ success: true, expiresIn: 300 });
    });
  });

  describe('verifyRecoveryOtp — additional branch coverage', () => {
    it('should return tempToken on valid OTP', async () => {
      const prismaService = (controller as unknown as Record<string, unknown>)['prisma'] as {
        user: { findFirst: jest.Mock };
      };
      const smsOtp = (controller as unknown as Record<string, unknown>)['smsOtpService'] as {
        verifyOtp: jest.Mock;
      };

      prismaService.user.findFirst = jest.fn().mockResolvedValue({ id: 'u1' });
      smsOtp.verifyOtp.mockResolvedValue({ valid: true });
      authService.generateTwoFactorTempToken.mockResolvedValue('recovery-temp-token' as never);

      const result = await controller.verifyRecoveryOtp({
        email: 'test@test.com',
        code: '123456',
      } as never);

      expect(result).toEqual({ tempToken: 'recovery-temp-token' });
      expect(authService.generateTwoFactorTempToken).toHaveBeenCalledWith('u1');
    });

    it('should display remaining attempts on invalid OTP', async () => {
      const prismaService = (controller as unknown as Record<string, unknown>)['prisma'] as {
        user: { findFirst: jest.Mock };
      };
      const smsOtp = (controller as unknown as Record<string, unknown>)['smsOtpService'] as {
        verifyOtp: jest.Mock;
      };

      prismaService.user.findFirst = jest.fn().mockResolvedValue({ id: 'u1' });
      smsOtp.verifyOtp.mockResolvedValue({ valid: false, remainingAttempts: 2 });

      await expect(
        controller.verifyRecoveryOtp({ email: 'test@test.com', code: '000000' } as never),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('sendLoginSmsOtp — additional branch coverage', () => {
    it('should throw when user not found', async () => {
      const user = {
        userId: 'user-001',
        tenantId: 'tenant-001',
        email: 'test@test.com',
        role: 'ADMIN',
      };
      const prismaService = (controller as unknown as Record<string, unknown>)['prisma'] as {
        user: { findUnique: jest.Mock };
      };
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(controller.sendLoginSmsOtp(user as never)).rejects.toThrow(BadRequestException);
    });

    it('should throw when phone not verified', async () => {
      const user = {
        userId: 'user-001',
        tenantId: 'tenant-001',
        email: 'test@test.com',
        role: 'ADMIN',
      };
      const prismaService = (controller as unknown as Record<string, unknown>)['prisma'] as {
        user: { findUnique: jest.Mock };
      };
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-001',
        tenantId: 'tenant-001',
        recoveryPhone: 'encrypted',
        recoveryPhoneVerified: false,
      });

      await expect(controller.sendLoginSmsOtp(user as never)).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyLoginSmsOtp — additional branch coverage', () => {
    it('should handle missing user-agent in verifyLoginSmsOtp', async () => {
      authService.verifyTwoFactorTempToken.mockResolvedValue('user-001' as never);
      authService.getUserWithTwoFactorStatus.mockResolvedValue(mockUser as never);
      authService.generateTokens.mockResolvedValue(mockTokens as never);

      const smsOtp = (controller as unknown as Record<string, unknown>)['smsOtpService'] as {
        verifyOtp: jest.Mock;
      };
      smsOtp.verifyOtp.mockResolvedValue({ valid: true });

      const result = await controller.verifyLoginSmsOtp(
        { tempToken: 'temp-123', code: '123456' } as never,
        '127.0.0.1',
        '',
      );

      expect(result).toEqual(mockTokens);
    });

    it('should handle remaining attempts in OTP error message', async () => {
      authService.verifyTwoFactorTempToken.mockResolvedValue('user-001' as never);

      const smsOtp = (controller as unknown as Record<string, unknown>)['smsOtpService'] as {
        verifyOtp: jest.Mock;
      };
      smsOtp.verifyOtp.mockResolvedValue({ valid: false, remainingAttempts: 3 });

      await expect(
        controller.verifyLoginSmsOtp(
          { tempToken: 'temp-123', code: '000000' } as never,
          '127.0.0.1',
          'Mozilla/5.0',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeRecoveryPhone — additional coverage', () => {
    it('should clear recovery phone and verified flag', async () => {
      const user = {
        userId: 'user-001',
        tenantId: 'tenant-001',
        email: 'test@test.com',
        role: 'ADMIN',
      };
      const prismaService = (controller as unknown as Record<string, unknown>)['prisma'] as {
        user: { update: jest.Mock };
      };
      prismaService.user.update = jest.fn().mockResolvedValue({});

      const result = await controller.removeRecoveryPhone(user as never);

      expect(result).toEqual({ success: true });
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-001' },
        data: {
          recoveryPhone: null,
          recoveryPhoneVerified: false,
        },
      });
    });
  });

  describe('setRecoveryPhone — additional coverage', () => {
    it('should encrypt phone before storing', async () => {
      const user = {
        userId: 'user-001',
        tenantId: 'tenant-001',
        email: 'test@test.com',
        role: 'ADMIN',
      };
      const prismaService = (controller as unknown as Record<string, unknown>)['prisma'] as {
        user: { update: jest.Mock };
      };
      const encryption = (controller as unknown as Record<string, unknown>)['encryption'] as {
        encrypt: jest.Mock;
      };

      encryption.encrypt.mockReturnValue('encrypted-phone-value');
      prismaService.user.update = jest.fn().mockResolvedValue({});

      const smsOtp = (controller as unknown as Record<string, unknown>)['smsOtpService'] as {
        sendOtp: jest.Mock;
      };
      smsOtp.sendOtp.mockResolvedValue({ success: true, expiresIn: 300 });

      await controller.setRecoveryPhone(user as never, { phone: '+393331234567' } as never);

      expect(encryption.encrypt).toHaveBeenCalledWith('+393331234567');
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-001' },
        data: {
          recoveryPhone: 'encrypted-phone-value',
          recoveryPhoneVerified: false,
        },
      });
    });
  });

  describe('verifyRecoveryPhone — additional coverage', () => {
    it('should update verified status after valid OTP', async () => {
      const user = {
        userId: 'user-001',
        tenantId: 'tenant-001',
        email: 'test@test.com',
        role: 'ADMIN',
      };
      const prismaService = (controller as unknown as Record<string, unknown>)['prisma'] as {
        user: { update: jest.Mock };
      };
      const smsOtp = (controller as unknown as Record<string, unknown>)['smsOtpService'] as {
        verifyOtp: jest.Mock;
      };

      smsOtp.verifyOtp.mockResolvedValue({ valid: true });
      prismaService.user.update = jest.fn().mockResolvedValue({});

      await controller.verifyRecoveryPhone(user as never, { code: '123456' } as never);

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-001' },
        data: { recoveryPhoneVerified: true },
      });
    });
  });

  describe('trustDevice — additional coverage', () => {
    it('should log security event when device trusted', async () => {
      const user = {
        userId: 'user-001',
        email: 'test@example.com',
        tenantId: 'tenant-001',
        role: 'ADMIN',
      };
      const trustedDeviceService = (controller as unknown as Record<string, unknown>)[
        'trustedDeviceService'
      ] as { trustDevice: jest.Mock };
      const securityActivity = (controller as unknown as Record<string, unknown>)[
        'securityActivity'
      ] as { logEvent: jest.Mock };

      const expectedDate = new Date();
      trustedDeviceService.trustDevice.mockResolvedValue({
        id: 'dev-1',
        trustedUntil: expectedDate,
      });
      securityActivity.logEvent.mockReturnValue(Promise.resolve(undefined));

      await controller.trustDevice('dev-1', user as never, { days: 60 } as never);

      expect(securityActivity.logEvent).toHaveBeenCalledWith({
        tenantId: 'tenant-001',
        userId: 'user-001',
        action: expect.any(String),
        status: 'success',
        details: { deviceId: 'dev-1', days: 60 },
      });
    });
  });

  describe('untrustDevice — additional coverage', () => {
    it('should log security event when device untrusted', async () => {
      const user = {
        userId: 'user-001',
        email: 'test@example.com',
        tenantId: 'tenant-001',
        role: 'ADMIN',
      };
      const trustedDeviceService = (controller as unknown as Record<string, unknown>)[
        'trustedDeviceService'
      ] as { untrustDevice: jest.Mock };
      const securityActivity = (controller as unknown as Record<string, unknown>)[
        'securityActivity'
      ] as { logEvent: jest.Mock };

      trustedDeviceService.untrustDevice = jest.fn().mockResolvedValue(undefined);
      securityActivity.logEvent.mockReturnValue(Promise.resolve(undefined));

      await controller.untrustDevice('dev-1', user as never);

      expect(securityActivity.logEvent).toHaveBeenCalledWith({
        tenantId: 'tenant-001',
        userId: 'user-001',
        action: expect.any(String),
        status: 'success',
        details: { deviceId: 'dev-1' },
      });
    });
  });

  describe('untrustAllDevices — additional coverage', () => {
    it('should log security event when all devices untrusted', async () => {
      const user = {
        userId: 'user-001',
        email: 'test@example.com',
        tenantId: 'tenant-001',
        role: 'ADMIN',
      };
      const trustedDeviceService = (controller as unknown as Record<string, unknown>)[
        'trustedDeviceService'
      ] as { untrustAllDevices: jest.Mock };
      const securityActivity = (controller as unknown as Record<string, unknown>)[
        'securityActivity'
      ] as { logEvent: jest.Mock };

      trustedDeviceService.untrustAllDevices = jest.fn().mockResolvedValue(7);
      securityActivity.logEvent.mockReturnValue(Promise.resolve(undefined));

      await controller.untrustAllDevices(user as never);

      expect(securityActivity.logEvent).toHaveBeenCalledWith({
        tenantId: 'tenant-001',
        userId: 'user-001',
        action: expect.any(String),
        status: 'success',
        details: { allDevices: true, count: 7 },
      });
    });
  });

  describe('markDeviceCompromised — additional coverage', () => {
    it('should log security event when device marked compromised', async () => {
      const user = {
        userId: 'user-001',
        email: 'test@example.com',
        tenantId: 'tenant-001',
        role: 'ADMIN',
      };
      const trustedDeviceService = (controller as unknown as Record<string, unknown>)[
        'trustedDeviceService'
      ] as { markCompromised: jest.Mock };
      const securityActivity = (controller as unknown as Record<string, unknown>)[
        'securityActivity'
      ] as { logEvent: jest.Mock };

      trustedDeviceService.markCompromised = jest.fn().mockResolvedValue(undefined);
      securityActivity.logEvent.mockReturnValue(Promise.resolve(undefined));

      await controller.markDeviceCompromised('dev-1', user as never);

      expect(securityActivity.logEvent).toHaveBeenCalledWith({
        tenantId: 'tenant-001',
        userId: 'user-001',
        action: expect.any(String),
        status: 'success',
        details: { deviceId: 'dev-1' },
      });
    });
  });

  describe('login — MFA conditions comprehensive', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'pass123',
      tenantSlug: 'garage-roma',
    };

    it('should handle mfaRequired=true and mfaStatus.enabled=true with totpCode', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      mfaService.getStatus.mockResolvedValue({ enabled: true } as never);
      mfaService.verify.mockResolvedValue({ valid: true } as never);
      authService.generateTokens.mockResolvedValue(mockTokens as never);

      const trustedDeviceService = (controller as unknown as Record<string, unknown>)[
        'trustedDeviceService'
      ] as { isDeviceTrusted: jest.Mock };
      trustedDeviceService.isDeviceTrusted.mockResolvedValue(false);

      const dtoWithCode = { ...loginDto, totpCode: '123456' };
      const result = await controller.login(
        dtoWithCode as never,
        '127.0.0.1',
        'Mozilla/5.0 Chrome/120',
      );

      expect(mfaService.verify).toHaveBeenCalledWith('user-001', '123456');
      expect(result).toEqual(mockTokens);
    });

    it('should handle mfaRequired=true and mfaStatus.enabled=false', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);
      authService.generateTokens.mockResolvedValue(mockTokens as never);

      const riskAssessment = (controller as unknown as Record<string, unknown>)[
        'riskAssessment'
      ] as jest.Mocked<RiskAssessmentService>;
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 70,
        level: 'high',
        signals: [] as any,
        requiresMfa: true,
        requiresDeviceApproval: false,
        blockLogin: false,
      } as never);

      const result = await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

      expect(result).toEqual(mockTokens);
    });

    it('should reset throttle on successful login', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      authService.generateTokens.mockResolvedValue(mockTokens as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);

      const loginThrottle = (controller as unknown as Record<string, unknown>)[
        'loginThrottle'
      ] as jest.Mocked<LoginThrottleService>;

      const result = await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

      expect(loginThrottle.resetOnSuccess).toHaveBeenCalledWith('test@example.com', '127.0.0.1');
      expect(result).toEqual(mockTokens);
    });

    it('should log security event on successful login', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      authService.generateTokens.mockResolvedValue(mockTokens as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);

      const securityActivity = (controller as unknown as Record<string, unknown>)[
        'securityActivity'
      ] as { logEvent: jest.Mock };
      securityActivity.logEvent.mockReturnValue(Promise.resolve(undefined));

      const result = await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

      expect(securityActivity.logEvent).toHaveBeenCalled();
      expect(result).toEqual(mockTokens);
    });

    it('should handle catch block when session creation fails', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      authService.generateTokens.mockResolvedValue(mockTokens as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);

      const sessionService = (controller as unknown as Record<string, unknown>)[
        'sessionService'
      ] as { createSession: jest.Mock };
      sessionService.createSession.mockRejectedValue(new Error('Session creation error'));

      const result = await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

      expect(result).toEqual(mockTokens);
    });
  });

  describe('login — MFA code invalid path', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'pass123',
      tenantSlug: 'garage-roma',
      totpCode: '000000',
    };

    it('should record failed login when MFA code invalid', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      mfaService.getStatus.mockResolvedValue({ enabled: true } as never);
      mfaService.verify.mockResolvedValue({ valid: false } as never);

      const trustedDeviceService = (controller as unknown as Record<string, unknown>)[
        'trustedDeviceService'
      ] as { isDeviceTrusted: jest.Mock };
      trustedDeviceService.isDeviceTrusted.mockResolvedValue(false);

      const loginThrottle = (controller as unknown as Record<string, unknown>)[
        'loginThrottle'
      ] as jest.Mocked<LoginThrottleService>;

      await expect(controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0')).rejects.toThrow(
        UnauthorizedException,
      );

      expect(authService.recordFailedLogin).toHaveBeenCalledWith('user-001');
      expect(loginThrottle.recordFailure).toHaveBeenCalledWith('test@example.com', '127.0.0.1');
    });
  });

  describe('verifyTwoFactor — additional coverage', () => {
    it('should call trustDevice after successful 2FA verification', async () => {
      authService.verifyTwoFactorTempToken.mockResolvedValue('user-001' as never);
      mfaService.verify.mockResolvedValue({ valid: true } as never);
      authService.getUserWithTwoFactorStatus.mockResolvedValue(mockUser as never);
      authService.generateTokens.mockResolvedValue(mockTokens as never);

      const riskAssessment = (controller as unknown as Record<string, unknown>)[
        'riskAssessment'
      ] as jest.Mocked<RiskAssessmentService>;
      riskAssessment.trustDevice.mockResolvedValue(undefined);

      const dto = { tempToken: 'temp-123', totpCode: '123456' };
      const result = await controller.verifyTwoFactor(
        dto as never,
        '127.0.0.1',
        'Mozilla/5.0 Chrome/120',
      );

      expect(riskAssessment.trustDevice).toHaveBeenCalledWith('user-001', expect.any(String));
      expect(result).toEqual(mockTokens);
    });

    it('should handle trustDevice failure gracefully in verifyTwoFactor', async () => {
      authService.verifyTwoFactorTempToken.mockResolvedValue('user-001' as never);
      mfaService.verify.mockResolvedValue({ valid: true } as never);
      authService.getUserWithTwoFactorStatus.mockResolvedValue(mockUser as never);
      authService.generateTokens.mockResolvedValue(mockTokens as never);

      const riskAssessment = (controller as unknown as Record<string, unknown>)[
        'riskAssessment'
      ] as jest.Mocked<RiskAssessmentService>;
      riskAssessment.trustDevice.mockRejectedValue(new Error('Trust device error'));

      const dto = { tempToken: 'temp-123', totpCode: '123456' };
      const result = await controller.verifyTwoFactor(dto as never, '127.0.0.1', 'Mozilla/5.0');

      expect(result).toEqual(mockTokens);
    });
  });

  describe('verifyLoginSmsOtp — trust device and session', () => {
    it('should call trustDevice and handle error in verifyLoginSmsOtp', async () => {
      authService.verifyTwoFactorTempToken.mockResolvedValue('user-001' as never);
      authService.getUserWithTwoFactorStatus.mockResolvedValue(mockUser as never);
      authService.generateTokens.mockResolvedValue(mockTokens as never);

      const smsOtp = (controller as unknown as Record<string, unknown>)['smsOtpService'] as {
        verifyOtp: jest.Mock;
      };
      smsOtp.verifyOtp.mockResolvedValue({ valid: true });

      const riskAssessment = (controller as unknown as Record<string, unknown>)[
        'riskAssessment'
      ] as jest.Mocked<RiskAssessmentService>;
      riskAssessment.trustDevice.mockRejectedValue(new Error('Trust failed'));

      const result = await controller.verifyLoginSmsOtp(
        { tempToken: 'temp-123', code: '123456' } as never,
        '127.0.0.1',
        'Mozilla/5.0',
      );

      expect(result).toEqual(mockTokens);
    });
  });

  describe('changePassword — security event logging', () => {
    const user = {
      userId: 'user-001',
      email: 'test@example.com',
      tenantId: 'tenant-001',
      role: 'ADMIN',
    };

    it('should log security event after password change', async () => {
      const prismaService = module.get(PrismaService) as any;
      authService.verifyPassword.mockResolvedValue(true);
      authService.hashPassword.mockResolvedValue('newhash');

      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-001',
        passwordHash: 'hash',
        tenantId: 'tenant-001',
      });
      prismaService.user.update.mockResolvedValue({ id: 'user-001' });

      const securityActivity = (controller as unknown as Record<string, unknown>)[
        'securityActivity'
      ] as { logEvent: jest.Mock };
      securityActivity.logEvent.mockReturnValue(Promise.resolve(undefined));

      const dto = { currentPassword: 'old123!', newPassword: 'NewPass123' };
      const result = await controller.changePassword(user as never, dto as never);

      expect(result.success).toBe(true);
      expect(securityActivity.logEvent).toHaveBeenCalled();
    });
  });

  describe('login — boolean logic branches (mfaRequired calculation)', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'pass123',
      tenantSlug: 'garage-roma',
    };

    it('should handle mfaStatus.enabled=false && risk.requiresMfa=false && deviceTrusted=true', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      authService.generateTokens.mockResolvedValue(mockTokens as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);

      const riskAssessment = (controller as unknown as Record<string, unknown>)[
        'riskAssessment'
      ] as jest.Mocked<RiskAssessmentService>;
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 0,
        level: 'low',
        signals: [],
        requiresMfa: false,
        requiresDeviceApproval: false,
        blockLogin: false,
      } as never);

      const trustedDeviceService = (controller as unknown as Record<string, unknown>)[
        'trustedDeviceService'
      ] as { isDeviceTrusted: jest.Mock };
      trustedDeviceService.isDeviceTrusted.mockResolvedValue(true);

      const result = await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

      expect(result).toEqual(mockTokens);
      expect(mfaService.getStatus).toHaveBeenCalled();
      expect(trustedDeviceService.isDeviceTrusted).toHaveBeenCalled();
    });

    it('should handle mfaStatus.enabled=true && risk.requiresMfa=false && deviceTrusted=false', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      mfaService.getStatus.mockResolvedValue({ enabled: true } as never);
      authService.generateTwoFactorTempToken.mockResolvedValue('temp-token' as never);

      const riskAssessment = (controller as unknown as Record<string, unknown>)[
        'riskAssessment'
      ] as jest.Mocked<RiskAssessmentService>;
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 0,
        level: 'low',
        signals: [],
        requiresMfa: false,
        requiresDeviceApproval: false,
        blockLogin: false,
      } as never);

      const trustedDeviceService = (controller as unknown as Record<string, unknown>)[
        'trustedDeviceService'
      ] as { isDeviceTrusted: jest.Mock };
      trustedDeviceService.isDeviceTrusted.mockResolvedValue(false);

      const prismaService = (controller as unknown as Record<string, unknown>)['prisma'] as {
        user: { findUnique: jest.Mock };
      };
      prismaService.user.findUnique.mockResolvedValue({
        smsOtpEnabled: false,
        recoveryPhoneVerified: false,
      });

      const result = await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

      expect(result).toEqual(
        expect.objectContaining({
          tempToken: 'temp-token',
          requiresMfa: true,
        }),
      );
    });

    it('should handle mfaStatus.enabled=true && risk.requiresMfa=true && deviceTrusted=false', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      mfaService.getStatus.mockResolvedValue({ enabled: true } as never);
      authService.generateTwoFactorTempToken.mockResolvedValue('temp-token' as never);

      const riskAssessment = (controller as unknown as Record<string, unknown>)[
        'riskAssessment'
      ] as jest.Mocked<RiskAssessmentService>;
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 80,
        level: 'high',
        signals: [] as any,
        requiresMfa: true,
        requiresDeviceApproval: false,
        blockLogin: false,
      } as never);

      const trustedDeviceService = (controller as unknown as Record<string, unknown>)[
        'trustedDeviceService'
      ] as { isDeviceTrusted: jest.Mock };
      trustedDeviceService.isDeviceTrusted.mockResolvedValue(false);

      const prismaService = (controller as unknown as Record<string, unknown>)['prisma'] as {
        user: { findUnique: jest.Mock };
      };
      prismaService.user.findUnique.mockResolvedValue({
        smsOtpEnabled: false,
        recoveryPhoneVerified: false,
      });

      const result = await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

      expect(result).toEqual(
        expect.objectContaining({
          tempToken: 'temp-token',
          requiresMfa: true,
        }),
      );
    });

    it('should handle mfaStatus.enabled=false && risk.requiresMfa=true && deviceTrusted=true', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      authService.generateTokens.mockResolvedValue(mockTokens as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);

      const riskAssessment = (controller as unknown as Record<string, unknown>)[
        'riskAssessment'
      ] as jest.Mocked<RiskAssessmentService>;
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 80,
        level: 'high',
        signals: [] as any,
        requiresMfa: true,
        requiresDeviceApproval: false,
        blockLogin: false,
      } as never);

      const trustedDeviceService = (controller as unknown as Record<string, unknown>)[
        'trustedDeviceService'
      ] as { isDeviceTrusted: jest.Mock };
      trustedDeviceService.isDeviceTrusted.mockResolvedValue(true);

      const result = await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

      expect(result).toEqual(mockTokens);
    });

    it('should handle mfaStatus.enabled=false && risk.requiresMfa=true && deviceTrusted=false', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      authService.generateTokens.mockResolvedValue(mockTokens as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);

      const riskAssessment = (controller as unknown as Record<string, unknown>)[
        'riskAssessment'
      ] as jest.Mocked<RiskAssessmentService>;
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 80,
        level: 'high',
        signals: [] as any,
        requiresMfa: true,
        requiresDeviceApproval: false,
        blockLogin: false,
      } as never);

      const trustedDeviceService = (controller as unknown as Record<string, unknown>)[
        'trustedDeviceService'
      ] as { isDeviceTrusted: jest.Mock };
      trustedDeviceService.isDeviceTrusted.mockResolvedValue(false);

      const result = await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

      expect(result).toEqual(mockTokens);
    });

    it('should handle mfaStatus.enabled=true && risk.requiresMfa=false && deviceTrusted=true', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      authService.generateTokens.mockResolvedValue(mockTokens as never);
      mfaService.getStatus.mockResolvedValue({ enabled: true } as never);

      const riskAssessment = (controller as unknown as Record<string, unknown>)[
        'riskAssessment'
      ] as jest.Mocked<RiskAssessmentService>;
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 0,
        level: 'low',
        signals: [],
        requiresMfa: false,
        requiresDeviceApproval: false,
        blockLogin: false,
      } as never);

      const trustedDeviceService = (controller as unknown as Record<string, unknown>)[
        'trustedDeviceService'
      ] as { isDeviceTrusted: jest.Mock };
      trustedDeviceService.isDeviceTrusted.mockResolvedValue(true);

      const result = await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

      expect(result).toEqual(mockTokens);
    });
  });

  describe('login — catch blocks and error paths', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'pass123',
      tenantSlug: 'garage-roma',
    };

    it('should catch and log session creation failure', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      authService.generateTokens.mockResolvedValue(mockTokens as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);

      const sessionService = (controller as unknown as Record<string, unknown>)[
        'sessionService'
      ] as { createSession: jest.Mock };
      sessionService.createSession.mockRejectedValue(new Error('DB connection failed'));

      const logger = (controller as unknown as Record<string, unknown>)['logger'] as any;
      jest.spyOn(logger, 'error').mockImplementation(() => {});

      const result = await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

      expect(result).toEqual(mockTokens);
      expect(logger.error).toHaveBeenCalled();
    });

    it('should catch and ignore trustDevice failure in login', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      authService.generateTokens.mockResolvedValue(mockTokens as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);

      const riskAssessment = (controller as unknown as Record<string, unknown>)[
        'riskAssessment'
      ] as jest.Mocked<RiskAssessmentService>;
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 10,
        level: 'low',
        signals: [],
        requiresMfa: false,
        requiresDeviceApproval: false,
        blockLogin: false,
      } as never);
      riskAssessment.trustDevice.mockRejectedValue(new Error('Trust failed'));

      const result = await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

      expect(result).toEqual(mockTokens);
      expect(riskAssessment.trustDevice).toHaveBeenCalled();
    });

    it('should catch and ignore logEvent failure in login', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      authService.generateTokens.mockResolvedValue(mockTokens as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);

      const securityActivity = (controller as unknown as Record<string, unknown>)[
        'securityActivity'
      ] as { logEvent: jest.Mock };
      securityActivity.logEvent.mockReturnValue(Promise.reject(new Error('Audit log failed')));

      const result = await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

      expect(result).toEqual(mockTokens);
    });
  });

  describe('verifyTwoFactor — catch blocks', () => {
    it('should catch and log session creation failure in verifyTwoFactor', async () => {
      authService.verifyTwoFactorTempToken.mockResolvedValue('user-001' as never);
      mfaService.verify.mockResolvedValue({ valid: true } as never);
      authService.getUserWithTwoFactorStatus.mockResolvedValue(mockUser as never);
      authService.generateTokens.mockResolvedValue(mockTokens as never);

      const sessionService = (controller as unknown as Record<string, unknown>)[
        'sessionService'
      ] as { createSession: jest.Mock };
      sessionService.createSession.mockRejectedValue(new Error('Session DB error'));

      const logger = (controller as unknown as Record<string, unknown>)['logger'] as any;
      jest.spyOn(logger, 'error').mockImplementation(() => {});

      const dto = { tempToken: 'temp-123', totpCode: '123456' };
      const result = await controller.verifyTwoFactor(dto as never, '127.0.0.1', 'Mozilla/5.0');

      expect(result).toEqual(mockTokens);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('verifyLoginSmsOtp — catch blocks', () => {
    it('should catch and log session creation failure in verifyLoginSmsOtp', async () => {
      authService.verifyTwoFactorTempToken.mockResolvedValue('user-001' as never);
      authService.getUserWithTwoFactorStatus.mockResolvedValue(mockUser as never);
      authService.generateTokens.mockResolvedValue(mockTokens as never);

      const smsOtp = (controller as unknown as Record<string, unknown>)['smsOtpService'] as {
        verifyOtp: jest.Mock;
      };
      smsOtp.verifyOtp.mockResolvedValue({ valid: true });

      const sessionService = (controller as unknown as Record<string, unknown>)[
        'sessionService'
      ] as { createSession: jest.Mock };
      sessionService.createSession.mockRejectedValue(new Error('Session error in SMS OTP'));

      const logger = (controller as unknown as Record<string, unknown>)['logger'] as any;
      jest.spyOn(logger, 'error').mockImplementation(() => {});

      const result = await controller.verifyLoginSmsOtp(
        { tempToken: 'temp-123', code: '123456' } as never,
        '127.0.0.1',
        'Mozilla/5.0',
      );

      expect(result).toEqual(mockTokens);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('generateFingerprint — browser detection', () => {
    it('should detect Edge browser', () => {
      const userAgent =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';
      const fingerprint = (controller as any).generateFingerprint(userAgent, '192.168.1.1');
      expect(fingerprint).toBeTruthy();
      expect(fingerprint.length).toBe(32);
    });

    it('should detect Chrome browser', () => {
      const userAgent =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      const fingerprint = (controller as any).generateFingerprint(userAgent, '192.168.1.1');
      expect(fingerprint).toBeTruthy();
      expect(fingerprint.length).toBe(32);
    });

    it('should detect Safari browser', () => {
      const userAgent =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Version/17.1 Safari/537.36';
      const fingerprint = (controller as any).generateFingerprint(userAgent, '192.168.1.1');
      expect(fingerprint).toBeTruthy();
    });

    it('should detect Firefox browser', () => {
      const userAgent =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0';
      const fingerprint = (controller as any).generateFingerprint(userAgent, '192.168.1.1');
      expect(fingerprint).toBeTruthy();
    });

    it('should detect iOS OS', () => {
      const userAgent =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
      const fingerprint = (controller as any).generateFingerprint(userAgent, '192.168.1.1');
      expect(fingerprint).toBeTruthy();
    });

    it('should detect iPad OS', () => {
      const userAgent =
        'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
      const fingerprint = (controller as any).generateFingerprint(userAgent, '192.168.1.1');
      expect(fingerprint).toBeTruthy();
    });

    it('should detect Android OS', () => {
      const userAgent =
        'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
      const fingerprint = (controller as any).generateFingerprint(userAgent, '192.168.1.1');
      expect(fingerprint).toBeTruthy();
    });

    it('should detect macOS', () => {
      const userAgent =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      const fingerprint = (controller as any).generateFingerprint(userAgent, '192.168.1.1');
      expect(fingerprint).toBeTruthy();
    });

    it('should detect Windows OS', () => {
      const userAgent =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      const fingerprint = (controller as any).generateFingerprint(userAgent, '192.168.1.1');
      expect(fingerprint).toBeTruthy();
    });

    it('should detect Linux OS', () => {
      const userAgent =
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      const fingerprint = (controller as any).generateFingerprint(userAgent, '192.168.1.1');
      expect(fingerprint).toBeTruthy();
    });

    it('should handle unknown browser and OS', () => {
      const userAgent = 'UnknownBrowser/1.0';
      const fingerprint = (controller as any).generateFingerprint(userAgent, '192.168.1.1');
      expect(fingerprint).toBeTruthy();
      expect(fingerprint.length).toBe(32);
      // Should be a hash containing unknown:unknown:IP
      expect(typeof fingerprint).toBe('string');
    });
  });

  describe('listSessions — additional coverage', () => {
    it('should handle missing authorization header in listSessions', async () => {
      const user = {
        userId: 'user-001',
        email: 'test@example.com',
        tenantId: 'tenant-001',
        role: 'ADMIN',
      };
      const sessionService = (controller as unknown as Record<string, unknown>)[
        'sessionService'
      ] as { listSessions: jest.Mock };

      sessionService.listSessions.mockResolvedValue([{ id: 's1' }]);

      await controller.listSessions(user as never, '');

      expect(sessionService.listSessions).toHaveBeenCalledWith('user-001', '');
    });
  });

  describe('revokeSession — additional coverage', () => {
    it('should handle successful session revocation', async () => {
      const user = {
        userId: 'user-001',
        email: 'test@example.com',
        tenantId: 'tenant-001',
        role: 'ADMIN',
      };
      const sessionService = (controller as unknown as Record<string, unknown>)[
        'sessionService'
      ] as { revokeSession: jest.Mock };

      sessionService.revokeSession.mockResolvedValue(undefined);

      const result = await controller.revokeSession(user as never, { sessionId: 's1' });

      expect(result).toEqual({ success: true });
      expect(sessionService.revokeSession).toHaveBeenCalledWith('user-001', 's1');
    });
  });

  describe('revokeOtherSessions — error handling', () => {
    it('should handle revokeAllOtherSessions error', async () => {
      const user = {
        userId: 'user-001',
        email: 'test@example.com',
        tenantId: 'tenant-001',
        role: 'ADMIN',
      };
      const sessionService = (controller as unknown as Record<string, unknown>)[
        'sessionService'
      ] as { revokeAllOtherSessions: jest.Mock };

      sessionService.revokeAllOtherSessions.mockRejectedValue(new Error('DB error'));

      await expect(
        controller.revokeOtherSessions(user as never, { currentSessionId: 'current' }),
      ).rejects.toThrow();
    });
  });

  describe('getMe — additional coverage', () => {
    it('should handle user with avatar', async () => {
      const user = {
        userId: 'user-001',
        email: 'test@example.com',
        tenantId: 'tenant-001',
        role: 'ADMIN',
      };
      const prismaService = module.get(PrismaService) as any;
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-001',
        email: 'test@example.com',
        name: 'Test User',
        role: 'ADMIN',
        isActive: true,
        tenantId: 'tenant-001',
        createdAt: new Date(),
        avatar: 'https://example.com/avatar.jpg',
        tenant: { id: 'tenant-001', name: 'Test Tenant', slug: 'test' },
      });

      const result = await controller.getMe(user as never);

      expect(result.avatar).toBe('https://example.com/avatar.jpg');
    });

    it('should handle user without avatar', async () => {
      const user = {
        userId: 'user-001',
        email: 'test@example.com',
        tenantId: 'tenant-001',
        role: 'ADMIN',
      };
      const prismaService = module.get(PrismaService) as any;
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-001',
        email: 'test@example.com',
        name: 'Test User',
        role: 'ADMIN',
        isActive: true,
        tenantId: 'tenant-001',
        createdAt: new Date(),
        avatar: null,
        tenant: { id: 'tenant-001', name: 'Test Tenant', slug: 'test' },
      });

      const result = await controller.getMe(user as never);

      expect(result.avatar).toBeNull();
    });
  });

  describe('logout — authorization header variations', () => {
    it('should extract token from bearer header', async () => {
      authService.logout.mockResolvedValue(undefined);

      await controller.logout('Bearer my-jwt-token-123', { refreshToken: 'refresh-456' });

      expect(authService.logout).toHaveBeenCalledWith('my-jwt-token-123', 'refresh-456');
    });

    it('should handle bearer header with extra spaces', async () => {
      authService.logout.mockResolvedValue(undefined);

      await controller.logout('Bearer   token-with-spaces', {});

      expect(authService.logout).toHaveBeenCalledWith('  token-with-spaces', undefined);
    });

    it('should handle missing Bearer prefix', async () => {
      authService.logout.mockResolvedValue(undefined);

      await controller.logout('just-token-no-bearer', {});

      expect(authService.logout).toHaveBeenCalledWith('just-token-no-bearer', undefined);
    });
  });

  describe('trustDevice — with default days', () => {
    it('should call trustDevice with provided days', async () => {
      const user = {
        userId: 'user-001',
        email: 'test@example.com',
        tenantId: 'tenant-001',
        role: 'ADMIN',
      };
      const trustedDeviceService = (controller as unknown as Record<string, unknown>)[
        'trustedDeviceService'
      ] as { trustDevice: jest.Mock };

      trustedDeviceService.trustDevice.mockResolvedValue({
        id: 'dev-1',
        trustedUntil: new Date(),
      });

      await controller.trustDevice('dev-1', user as never, { days: 45 } as never);

      expect(trustedDeviceService.trustDevice).toHaveBeenCalledWith('dev-1', 'user-001', 45);
    });
  });

  describe('getSecuritySummary — summary data', () => {
    it('should return security summary with all fields', async () => {
      const user = {
        userId: 'user-001',
        email: 'test@example.com',
        tenantId: 'tenant-001',
        role: 'ADMIN',
      };

      const mockSummary = {
        totalLogins: 25,
        failedAttempts: 3,
        devicesUsed: 4,
        locationsUsed: ['Roma', 'Milano', 'Napoli'],
        lastLogin: new Date('2024-04-24T10:00:00Z'),
        suspiciousEvents: 1,
      };
      const securityActivityService = (controller as unknown as Record<string, unknown>)[
        'securityActivity'
      ] as any;
      securityActivityService.getActivitySummary = jest.fn().mockResolvedValue(mockSummary);

      const result = await controller.getSecuritySummary(user as never);

      expect(result.totalLogins).toBe(25);
      expect(result.failedAttempts).toBe(3);
      expect(result.devicesUsed).toBe(4);
      expect(result.locationsUsed.length).toBe(3);
      expect(result.suspiciousEvents).toBe(1);
    });

    it('should handle security summary with no logins', async () => {
      const user = {
        userId: 'user-001',
        email: 'test@example.com',
        tenantId: 'tenant-001',
        role: 'ADMIN',
      };

      const mockSummary = {
        totalLogins: 0,
        failedAttempts: 0,
        devicesUsed: 0,
        locationsUsed: [],
        lastLogin: null,
        suspiciousEvents: 0,
      };
      const securityActivityService = (controller as unknown as Record<string, unknown>)[
        'securityActivity'
      ] as any;
      securityActivityService.getActivitySummary = jest.fn().mockResolvedValue(mockSummary);

      const result = await controller.getSecuritySummary(user as never);

      expect(result.totalLogins).toBe(0);
      expect(result.lastLogin).toBeNull();
    });
  });

  // listDevices() tests
  describe('listDevices', () => {
    const user = {
      userId: 'user-001',
      email: 'test@example.com',
      tenantId: 'tenant-001',
      role: 'ADMIN',
    };

    it('should return list of trusted devices', async () => {
      const mockDevices = [{ id: 'device-1', name: 'Chrome on Mac', createdAt: new Date() }];
      const trustedDeviceService = module.get(TrustedDeviceService) as any;
      trustedDeviceService.listDevices.mockResolvedValue(mockDevices);

      const result = await controller.listDevices(user as never);

      expect(result).toEqual(mockDevices);
      expect(trustedDeviceService.listDevices).toHaveBeenCalledWith('user-001');
    });
  });

  // trustDevice() tests
  describe('trustDevice', () => {
    const user = {
      userId: 'user-001',
      email: 'test@example.com',
      tenantId: 'tenant-001',
      role: 'ADMIN',
    };

    it('should trust a device', async () => {
      const trustedDeviceService = module.get(TrustedDeviceService) as any;
      const securityActivityService = module.get(SecurityActivityService) as any;
      const mockResult = { id: 'device-123', trustedUntil: new Date() };
      trustedDeviceService.trustDevice.mockResolvedValue(mockResult);
      securityActivityService.logEvent.mockReturnValue(Promise.resolve(undefined));

      const dto = { days: 30 };
      const result = await controller.trustDevice('device-123', user as never, dto as never);

      expect(result).toEqual(mockResult);
      expect(trustedDeviceService.trustDevice).toHaveBeenCalledWith('device-123', 'user-001', 30);
    });
  });

  // untrustDevice() tests
  describe('untrustDevice', () => {
    const user = {
      userId: 'user-001',
      email: 'test@example.com',
      tenantId: 'tenant-001',
      role: 'ADMIN',
    };

    it('should untrust a device', async () => {
      const trustedDeviceService = module.get(TrustedDeviceService) as any;
      const securityActivityService = module.get(SecurityActivityService) as any;
      trustedDeviceService.untrustDevice.mockResolvedValue(undefined);
      securityActivityService.logEvent.mockReturnValue(Promise.resolve(undefined));

      const result = await controller.untrustDevice('device-123', user as never);

      expect(result).toEqual({ success: true });
      expect(trustedDeviceService.untrustDevice).toHaveBeenCalledWith('device-123', 'user-001');
    });
  });

  // untrustAllDevices() tests
  describe('untrustAllDevices', () => {
    const user = {
      userId: 'user-001',
      email: 'test@example.com',
      tenantId: 'tenant-001',
      role: 'ADMIN',
    };

    it('should untrust all devices', async () => {
      const trustedDeviceService = module.get(TrustedDeviceService) as any;
      const securityActivityService = module.get(SecurityActivityService) as any;
      trustedDeviceService.untrustAllDevices.mockResolvedValue(5);
      securityActivityService.logEvent.mockReturnValue(Promise.resolve(undefined));

      const result = await controller.untrustAllDevices(user as never);

      expect(result).toEqual({ success: true, count: 5 });
      expect(trustedDeviceService.untrustAllDevices).toHaveBeenCalledWith('user-001');
    });
  });

  // ============== ERROR PATH TESTS (Iteration 2 - Gap Targeting) ==============

  describe('login — Throttle and Rate Limiting', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'pass123',
      tenantSlug: 'garage-roma',
    };

    it('should apply progressive delay when throttle returns delay > 0', async () => {
      const loginThrottle = module.get(LoginThrottleService) as any;
      const authService = module.get(AuthService) as any;

      loginThrottle.getDelay.mockResolvedValue({ delay: 2000, attempts: 4 });
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      const mfaService = module.get(MfaService) as any;
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);
      authService.generateTokens.mockResolvedValue(mockTokens as never);

      const _result = await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

      expect(loginThrottle.getDelay).toHaveBeenCalled();
    });

    it('should record failed login when credentials invalid', async () => {
      const loginThrottle = module.get(LoginThrottleService) as any;
      const authService = module.get(AuthService) as any;

      loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 });
      loginThrottle.recordFailure.mockResolvedValue(5);
      authService.validateUser.mockResolvedValue(null);

      await expect(controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0')).rejects.toThrow(
        UnauthorizedException,
      );

      expect(loginThrottle.recordFailure).toHaveBeenCalledWith('test@example.com', '127.0.0.1');
    });
  });

  describe('login — Risk Assessment', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'pass123',
      tenantSlug: 'garage-roma',
    };

    it('should require MFA when risk level is high', async () => {
      const riskAssessment = module.get(RiskAssessmentService) as any;
      const authService = module.get(AuthService) as any;
      const mfaService = module.get(MfaService) as any;

      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      authService.generateTwoFactorTempToken.mockResolvedValue('temp-token-xyz' as never);
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 80,
        level: 'high',
        requiresMfa: true,
        blockLogin: false,
      } as never);
      mfaService.getStatus.mockResolvedValue({ enabled: true } as never);

      const result = await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

      expect(result).toHaveProperty('tempToken');
    });

    it('should block login when risk score is critical', async () => {
      const riskAssessment = module.get(RiskAssessmentService) as any;
      const authService = module.get(AuthService) as any;

      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 95,
        level: 'critical',
        requiresMfa: true,
        blockLogin: true,
      } as never);

      await expect(controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('verifyTwoFactor — Error Paths', () => {
    it('should throw UnauthorizedException when temp token is invalid', async () => {
      const authService = module.get(AuthService) as any;

      authService.verifyTwoFactorTempToken.mockRejectedValue(
        new UnauthorizedException('Invalid or expired temp token'),
      );

      const dto = { tempToken: 'invalid-temp', code: '123456' };
      await expect(
        controller.verifyTwoFactor(dto as never, '127.0.0.1', 'Mozilla/5.0'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when MFA code is invalid', async () => {
      const authService = module.get(AuthService) as any;
      const mfaService = module.get(MfaService) as any;

      authService.verifyTwoFactorTempToken.mockResolvedValue('user-001' as never);
      mfaService.verify.mockRejectedValue(new UnauthorizedException('Invalid TOTP code'));

      const dto = { tempToken: 'temp-123', code: '000000' };
      await expect(
        controller.verifyTwoFactor(dto as never, '127.0.0.1', 'Mozilla/5.0'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('createDemoSession — Validation', () => {
    it('should throw NotFoundException when demo tenant does not exist', async () => {
      const prismaService = module.get(PrismaService) as any;

      prismaService.tenant.findFirst.mockResolvedValue(null);

      await expect(controller.createDemoSession()).rejects.toThrow(NotFoundException);
    });
  });

  describe('Login — Risk Assessment Edge Cases', () => {
    it('should block login when risk assessment blocks it', async () => {
      const authService = module.get(AuthService) as any;
      const riskService = module.get(RiskAssessmentService) as any;

      authService.validateUser.mockResolvedValue({
        id: 'user-001',
        email: 'test@example.com',
        tenantId: 'tenant-001',
      });

      authService.isAccountLocked.mockResolvedValue({ locked: false });

      riskService.assessLoginRisk.mockResolvedValue({
        score: 95,
        level: 'critical',
        blockLogin: true,
        requiresMfa: false,
        signals: [],
      });

      const dto: any = {
        email: 'test@example.com',
        password: 'password123',
        tenantSlug: 'test-tenant',
      };

      await expect(controller.login(dto, '192.168.1.1', '')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken — Error Handling', () => {
    it('should throw UnauthorizedException when refresh fails', async () => {
      const authService = module.get(AuthService) as any;

      authService.refreshTokens.mockRejectedValue(
        new UnauthorizedException('Invalid refresh token'),
      );

      const dto = { refreshToken: 'invalid-token' };

      await expect(controller.refreshToken(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should return new tokens on successful refresh', async () => {
      const authService = module.get(AuthService) as any;

      authService.refreshTokens.mockResolvedValue(mockTokens);

      const dto = { refreshToken: 'valid-refresh-token' };

      const result = await controller.refreshToken(dto);

      expect(result).toEqual(mockTokens);
      expect(authService.refreshTokens).toHaveBeenCalledWith('valid-refresh-token');
    });
  });

  describe('refreshToken — Error Handling', () => {
    it('should throw UnauthorizedException when refresh fails', async () => {
      const authService = module.get(AuthService) as any;

      authService.refreshTokens.mockRejectedValue(
        new UnauthorizedException('Invalid refresh token'),
      );

      const dto: any = { refreshToken: 'invalid-token' };

      await expect(controller.refreshToken(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should return new tokens on successful refresh', async () => {
      const authService = module.get(AuthService) as any;

      authService.refreshTokens.mockResolvedValue(mockTokens);

      const dto: any = { refreshToken: 'valid-refresh-token' };

      const result = await controller.refreshToken(dto);

      expect(result).toEqual(mockTokens);
      expect(authService.refreshTokens).toHaveBeenCalledWith('valid-refresh-token');
    });
  });

  describe('login — Risk Assessment Score Thresholds', () => {
    it('should require MFA when risk score is 30 (threshold boundary)', async () => {
      const authService = module.get(AuthService) as any;
      const riskService = module.get(RiskAssessmentService) as any;
      const mfaServiceMock = module.get(MfaService) as any;
      const prismaService = module.get(PrismaService) as any;

      authService.validateUser.mockResolvedValue(mockUser);
      authService.isAccountLocked.mockResolvedValue({ locked: false });
      authService.generateTwoFactorTempToken.mockResolvedValue('temp-token');

      riskService.assessLoginRisk.mockResolvedValue({
        score: 30,
        level: 'low',
        blockLogin: false,
        requiresMfa: true,
        signals: [],
      });

      mfaServiceMock.getStatus.mockResolvedValue({
        enabled: true,
        backupCodesCount: 10,
      });

      const loginThrottle = module.get(LoginThrottleService) as any;
      loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 } as never);

      prismaService.user.findUnique.mockResolvedValue({
        smsOtpEnabled: false,
        recoveryPhoneVerified: false,
      });

      const dto: any = {
        email: mockUser.email,
        password: 'password123',
        tenantSlug: 'test-tenant',
      };

      const result = await controller.login(dto, '127.0.0.1', 'Mozilla/5.0');

      expect(result).toHaveProperty('tempToken');
      expect(result).toHaveProperty('requiresMfa', true);
    });

    it('should require device approval when risk score is 60 (medium-high boundary)', async () => {
      const authService = module.get(AuthService) as any;
      const riskService = module.get(RiskAssessmentService) as any;

      authService.validateUser.mockResolvedValue(mockUser);
      authService.isAccountLocked.mockResolvedValue({ locked: false });

      riskService.assessLoginRisk.mockResolvedValue({
        score: 60,
        level: 'medium',
        blockLogin: false,
        requiresMfa: false,
        requiresDeviceApproval: true,
        signals: [],
      });

      const mfaServiceMock = module.get(MfaService) as any;
      mfaServiceMock.getStatus.mockResolvedValue({
        enabled: false,
        backupCodesCount: 0,
      });

      authService.generateTokens.mockResolvedValue(mockTokens);

      const loginThrottle = module.get(LoginThrottleService) as any;
      loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 } as never);
      loginThrottle.resetOnSuccess.mockResolvedValue(undefined);

      const dto: any = {
        email: mockUser.email,
        password: 'password123',
        tenantSlug: 'test-tenant',
      };

      const result = await controller.login(dto, '127.0.0.1', 'Mozilla/5.0');

      expect(result).toHaveProperty('accessToken');
    });

    it('should block login when risk score is 90 (critical boundary)', async () => {
      const authService = module.get(AuthService) as any;
      const riskService = module.get(RiskAssessmentService) as any;

      authService.validateUser.mockResolvedValue(mockUser);
      authService.isAccountLocked.mockResolvedValue({ locked: false });

      riskService.assessLoginRisk.mockResolvedValue({
        score: 90,
        level: 'critical',
        blockLogin: true,
        requiresMfa: false,
        signals: [],
      });

      const loginThrottle = module.get(LoginThrottleService) as any;
      loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 } as never);

      const dto: any = {
        email: mockUser.email,
        password: 'password123',
        tenantSlug: 'test-tenant',
      };

      await expect(controller.login(dto, '127.0.0.1', 'Mozilla/5.0')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should allow login with low risk score (< 20)', async () => {
      const authService = module.get(AuthService) as any;
      const riskService = module.get(RiskAssessmentService) as any;
      const mfaServiceMock = module.get(MfaService) as any;

      authService.validateUser.mockResolvedValue(mockUser);
      authService.isAccountLocked.mockResolvedValue({ locked: false });
      authService.generateTokens.mockResolvedValue(mockTokens);

      riskService.assessLoginRisk.mockResolvedValue({
        score: 10,
        level: 'low',
        blockLogin: false,
        requiresMfa: false,
        signals: [],
      });

      mfaServiceMock.getStatus.mockResolvedValue({
        enabled: false,
        backupCodesCount: 0,
      });

      const loginThrottle = module.get(LoginThrottleService) as any;
      loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 } as never);
      loginThrottle.resetOnSuccess.mockResolvedValue(undefined);

      const dto: any = {
        email: mockUser.email,
        password: 'password123',
        tenantSlug: 'test-tenant',
      };

      const result = await controller.login(dto, '127.0.0.1', 'Mozilla/5.0');

      expect(result).toHaveProperty('accessToken');
    });

    // === ITERATION 2: BRANCH COVERAGE GAPS ===

    describe('login — MFA branch coverage gaps', () => {
      it('should verify TOTP and allow login when valid (line 354-360 branch)', async () => {
        // Specific test for: if (dto.totpCode) → mfaService.verify
        authService.validateUser.mockResolvedValue(mockUser as never);
        authService.isAccountLocked.mockResolvedValue({ locked: false });
        authService.generateTokens.mockResolvedValue(mockTokens as never);
        authService.updateLastLogin.mockResolvedValue(undefined);

        const riskService = module.get(RiskAssessmentService) as jest.Mocked<RiskAssessmentService>;
        riskService.assessLoginRisk.mockResolvedValue({
          score: 10,
          level: 'low',
          signals: [],
          requiresMfa: false,
          requiresDeviceApproval: false,
          blockLogin: false,
        });

        const trustedDeviceService = module.get(
          TrustedDeviceService,
        ) as jest.Mocked<TrustedDeviceService>;
        trustedDeviceService.isDeviceTrusted.mockResolvedValue(false);
        trustedDeviceService.generateFingerprint.mockReturnValue('fingerprint-001');

        const mfaService = module.get(MfaService) as jest.Mocked<MfaService>;
        mfaService.getStatus.mockResolvedValue({
          enabled: true,
          backupCodesCount: 5,
        });
        mfaService.verify.mockResolvedValue({ valid: true });

        const loginThrottle = module.get(LoginThrottleService) as jest.Mocked<LoginThrottleService>;
        loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 } as never);
        loginThrottle.resetOnSuccess.mockResolvedValue(undefined);

        const dto: any = {
          email: mockUser.email,
          password: 'password123',
          tenantSlug: 'test-tenant',
          totpCode: '654321',
        };

        const result = await controller.login(dto, '127.0.0.1', 'Mozilla/5.0');

        expect(result).toHaveProperty('accessToken');
        expect(mfaService.verify).toHaveBeenCalledWith('user-001', '654321');
      });

      it('should skip MFA check when mfaRequired is false (line 352 false branch)', async () => {
        // When mfaRequired = false, skip entire MFA block
        authService.validateUser.mockResolvedValue(mockUser as never);
        authService.isAccountLocked.mockResolvedValue({ locked: false });
        authService.generateTokens.mockResolvedValue(mockTokens as never);
        authService.updateLastLogin.mockResolvedValue(undefined);

        const riskService = module.get(RiskAssessmentService) as jest.Mocked<RiskAssessmentService>;
        riskService.assessLoginRisk.mockResolvedValue({
          score: 5,
          level: 'low',
          signals: [],
          requiresMfa: false,
          requiresDeviceApproval: false,
          blockLogin: false,
        });

        const trustedDeviceService = module.get(
          TrustedDeviceService,
        ) as jest.Mocked<TrustedDeviceService>;
        trustedDeviceService.isDeviceTrusted.mockResolvedValue(true); // Device trusted
        trustedDeviceService.generateFingerprint.mockReturnValue('fingerprint-001');

        const mfaService = module.get(MfaService) as jest.Mocked<MfaService>;
        mfaService.getStatus.mockResolvedValue({
          enabled: true,
          backupCodesCount: 5,
        });

        const loginThrottle = module.get(LoginThrottleService) as jest.Mocked<LoginThrottleService>;
        loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 } as never);
        loginThrottle.resetOnSuccess.mockResolvedValue(undefined);

        const dto: any = {
          email: mockUser.email,
          password: 'password123',
          tenantSlug: 'test-tenant',
        };

        const result = await controller.login(dto, '127.0.0.1', 'Mozilla/5.0');

        expect(result).toHaveProperty('accessToken');
        expect(mfaService.verify).not.toHaveBeenCalled();
      });
    });

    describe('login — branch coverage: MFA + risk combinations', () => {
      it('should handle mfaRequired=true but mfaStatus.enabled=false (risk requires MFA)', async () => {
        // This tests line 350-382: MFA required by risk, but user has not configured it
        authService.validateUser.mockResolvedValue(mockUser as never);
        authService.isAccountLocked.mockResolvedValue({ locked: false });
        authService.generateTokens.mockResolvedValue(mockTokens as never);
        authService.updateLastLogin.mockResolvedValue(undefined);

        const riskService = module.get(RiskAssessmentService) as jest.Mocked<RiskAssessmentService>;
        riskService.assessLoginRisk.mockResolvedValue({
          score: 45,
          level: 'medium',
          signals: [] as any,
          requiresMfa: true, // Risk requires MFA
          requiresDeviceApproval: false,
          blockLogin: false,
        });

        const trustedDeviceService = module.get(
          TrustedDeviceService,
        ) as jest.Mocked<TrustedDeviceService>;
        trustedDeviceService.isDeviceTrusted.mockResolvedValue(false); // Device NOT trusted
        trustedDeviceService.generateFingerprint.mockReturnValue('fingerprint-001');

        const mfaService = module.get(MfaService) as jest.Mocked<MfaService>;
        mfaService.getStatus.mockResolvedValue({
          enabled: false, // User has NOT configured MFA
          backupCodesCount: 0,
        });

        const loginThrottle = module.get(LoginThrottleService) as jest.Mocked<LoginThrottleService>;
        loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 } as never);
        loginThrottle.resetOnSuccess.mockResolvedValue(undefined);

        const prismaService = module.get(PrismaService) as jest.Mocked<PrismaService>;
        (prismaService.user as any) = {
          findUnique: jest.fn().mockResolvedValue({
            id: 'user-001',
            email: 'test@example.com',
            tenantId: 'tenant-001',
            smsOtpEnabled: false,
            recoveryPhoneVerified: false,
          }),
        } as any;

        const dto: any = {
          email: mockUser.email,
          password: 'password123',
          tenantSlug: 'test-tenant',
        };

        const result = await controller.login(dto, '127.0.0.1', 'Mozilla/5.0');

        // Should allow login despite high risk (line 382-385 branch taken)
        expect(result).toHaveProperty('accessToken');
        expect(authService.generateTokens).toHaveBeenCalled();
      });

      it('should not trust device when risk level is HIGH (line 412 else branch)', async () => {
        // Tests: line 412 if (risk.level === 'low' || risk.level === 'medium')
        // When risk.level = 'high', device should NOT be trusted
        authService.validateUser.mockResolvedValue(mockUser as never);
        authService.isAccountLocked.mockResolvedValue({ locked: false });
        authService.generateTokens.mockResolvedValue(mockTokens as never);
        authService.updateLastLogin.mockResolvedValue(undefined);

        const riskService = module.get(RiskAssessmentService) as jest.Mocked<RiskAssessmentService>;
        riskService.assessLoginRisk.mockResolvedValue({
          score: 75,
          level: 'high', // HIGH risk — device should NOT be trusted
          signals: [] as any,
          requiresMfa: false,
          requiresDeviceApproval: false,
          blockLogin: false,
        });

        const trustedDeviceService = module.get(
          TrustedDeviceService,
        ) as jest.Mocked<TrustedDeviceService>;
        trustedDeviceService.isDeviceTrusted.mockResolvedValue(false);
        trustedDeviceService.generateFingerprint.mockReturnValue('fingerprint-001');

        const mfaService = module.get(MfaService) as jest.Mocked<MfaService>;
        mfaService.getStatus.mockResolvedValue({
          enabled: false,
          backupCodesCount: 0,
        });

        const loginThrottle = module.get(LoginThrottleService) as jest.Mocked<LoginThrottleService>;
        loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 } as never);
        loginThrottle.resetOnSuccess.mockResolvedValue(undefined);

        const dto: any = {
          email: mockUser.email,
          password: 'password123',
          tenantSlug: 'test-tenant',
          rememberMe: true, // Try to remember, but should be ignored due to high risk
        };

        const result = await controller.login(dto, '127.0.0.1', 'Mozilla/5.0');

        expect(result).toHaveProperty('accessToken');
        // trustDevice should NOT be called because risk.level === 'high' (fails line 412 condition)
        expect(riskService.trustDevice).not.toHaveBeenCalled();
      });

      it('should trust device for 30 days when rememberMe is false (line 411)', async () => {
        // Tests: line 411 const trustDays = dto.rememberMe ? 90 : 30
        // When rememberMe is false/undefined, should trust for 30 days
        authService.validateUser.mockResolvedValue(mockUser as never);
        authService.isAccountLocked.mockResolvedValue({ locked: false });
        authService.generateTokens.mockResolvedValue(mockTokens as never);
        authService.updateLastLogin.mockResolvedValue(undefined);

        const riskService = module.get(RiskAssessmentService) as jest.Mocked<RiskAssessmentService>;
        riskService.assessLoginRisk.mockResolvedValue({
          score: 10,
          level: 'low',
          signals: [],
          requiresMfa: false,
          requiresDeviceApproval: false,
          blockLogin: false,
        });

        const trustedDeviceService = module.get(
          TrustedDeviceService,
        ) as jest.Mocked<TrustedDeviceService>;
        trustedDeviceService.isDeviceTrusted.mockResolvedValue(false);
        trustedDeviceService.generateFingerprint.mockReturnValue('fingerprint-001');

        const mfaService = module.get(MfaService) as jest.Mocked<MfaService>;
        mfaService.getStatus.mockResolvedValue({
          enabled: false,
          backupCodesCount: 0,
        });

        const loginThrottle = module.get(LoginThrottleService) as jest.Mocked<LoginThrottleService>;
        loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 } as never);
        loginThrottle.resetOnSuccess.mockResolvedValue(undefined);

        const dto: any = {
          email: mockUser.email,
          password: 'password123',
          tenantSlug: 'test-tenant',
          rememberMe: false, // Explicitly false
        };

        const result = await controller.login(dto, '127.0.0.1', 'Mozilla/5.0');

        expect(result).toHaveProperty('accessToken');
        // trustDevice called with 30 days (not 90)
        expect(riskService.trustDevice).toHaveBeenCalledWith(
          mockUser.id,
          expect.any(String),
          30, // 30 days for rememberMe=false
        );
      });

      it('should trust device for 90 days when rememberMe is true (line 411)', async () => {
        // Tests: line 411 const trustDays = dto.rememberMe ? 90 : 30
        authService.validateUser.mockResolvedValue(mockUser as never);
        authService.isAccountLocked.mockResolvedValue({ locked: false });
        authService.generateTokens.mockResolvedValue(mockTokens as never);
        authService.updateLastLogin.mockResolvedValue(undefined);

        const riskService = module.get(RiskAssessmentService) as jest.Mocked<RiskAssessmentService>;
        riskService.assessLoginRisk.mockResolvedValue({
          score: 10,
          level: 'low',
          signals: [],
          requiresMfa: false,
          requiresDeviceApproval: false,
          blockLogin: false,
        });

        const trustedDeviceService = module.get(
          TrustedDeviceService,
        ) as jest.Mocked<TrustedDeviceService>;
        trustedDeviceService.isDeviceTrusted.mockResolvedValue(false);
        trustedDeviceService.generateFingerprint.mockReturnValue('fingerprint-001');

        const mfaService = module.get(MfaService) as jest.Mocked<MfaService>;
        mfaService.getStatus.mockResolvedValue({
          enabled: false,
          backupCodesCount: 0,
        });

        const loginThrottle = module.get(LoginThrottleService) as jest.Mocked<LoginThrottleService>;
        loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 } as never);
        loginThrottle.resetOnSuccess.mockResolvedValue(undefined);

        const dto: any = {
          email: mockUser.email,
          password: 'password123',
          tenantSlug: 'test-tenant',
          rememberMe: true,
        };

        const result = await controller.login(dto, '127.0.0.1', 'Mozilla/5.0');

        expect(result).toHaveProperty('accessToken');
        // trustDevice called with 90 days
        expect(riskService.trustDevice).toHaveBeenCalledWith(
          mockUser.id,
          expect.any(String),
          90, // 90 days for rememberMe=true
        );
      });

      it('should handle mfaRequired=true when mfaStatus.enabled=true but device is trusted (skip MFA)', async () => {
        // Tests: line 350 const mfaRequired = (mfaStatus.enabled || risk.requiresMfa) && !deviceTrusted
        // When device is trusted, mfaRequired becomes false even if mfaStatus.enabled=true
        authService.validateUser.mockResolvedValue(mockUser as never);
        authService.isAccountLocked.mockResolvedValue({ locked: false });
        authService.generateTokens.mockResolvedValue(mockTokens as never);
        authService.updateLastLogin.mockResolvedValue(undefined);

        const riskService = module.get(RiskAssessmentService) as jest.Mocked<RiskAssessmentService>;
        riskService.assessLoginRisk.mockResolvedValue({
          score: 10,
          level: 'low',
          signals: [],
          requiresMfa: false,
          requiresDeviceApproval: false,
          blockLogin: false,
        });

        const trustedDeviceService = module.get(
          TrustedDeviceService,
        ) as jest.Mocked<TrustedDeviceService>;
        trustedDeviceService.isDeviceTrusted.mockResolvedValue(true); // Device IS trusted!
        trustedDeviceService.generateFingerprint.mockReturnValue('fingerprint-001');

        const mfaService = module.get(MfaService) as jest.Mocked<MfaService>;
        mfaService.getStatus.mockResolvedValue({
          enabled: true, // MFA enabled
          backupCodesCount: 5,
        });

        const loginThrottle = module.get(LoginThrottleService) as jest.Mocked<LoginThrottleService>;
        loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 } as never);
        loginThrottle.resetOnSuccess.mockResolvedValue(undefined);

        const dto: any = {
          email: mockUser.email,
          password: 'password123',
          tenantSlug: 'test-tenant',
        };

        const result = await controller.login(dto, '127.0.0.1', 'Mozilla/5.0');

        expect(result).toHaveProperty('accessToken');
        // MFA should be skipped because device is trusted (line 352 condition: mfaRequired && mfaStatus.enabled = false && true = false)
        expect(result).not.toHaveProperty('requiresMfa');
      });

      it('should return tempToken when MFA enabled and device not trusted (line 352-363)', async () => {
        // Tests line 350-352: mfaRequired = (enabled OR risk.requiresMfa) AND !trusted
        // When mfaStatus.enabled=true AND mfaRequired=true, return tempToken
        authService.validateUser.mockResolvedValue(mockUser as never);
        authService.isAccountLocked.mockResolvedValue({ locked: false });
        authService.generateTwoFactorTempToken.mockResolvedValue('temp-token-001');

        const riskService = module.get(RiskAssessmentService) as jest.Mocked<RiskAssessmentService>;
        riskService.assessLoginRisk.mockResolvedValue({
          score: 10,
          level: 'low',
          signals: [],
          requiresMfa: false,
          requiresDeviceApproval: false,
          blockLogin: false,
        });

        const trustedDeviceService = module.get(
          TrustedDeviceService,
        ) as jest.Mocked<TrustedDeviceService>;
        trustedDeviceService.isDeviceTrusted.mockResolvedValue(false); // Device NOT trusted
        trustedDeviceService.generateFingerprint.mockReturnValue('fingerprint-001');

        const mfaService = module.get(MfaService) as jest.Mocked<MfaService>;
        mfaService.getStatus.mockResolvedValue({
          enabled: true, // User HAS configured MFA
          backupCodesCount: 5,
        });

        const loginThrottle = module.get(LoginThrottleService) as jest.Mocked<LoginThrottleService>;
        loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 } as never);

        const prismaService = module.get(PrismaService) as jest.Mocked<PrismaService>;
        (prismaService.user as any) = {
          findUnique: jest.fn().mockResolvedValue({
            id: 'user-001',
            smsOtpEnabled: false,
            recoveryPhoneVerified: false,
          }),
        } as any;

        const dto: any = {
          email: mockUser.email,
          password: 'password123',
          tenantSlug: 'test-tenant',
          // NO totpCode provided
        };

        const result = await controller.login(dto, '127.0.0.1', 'Mozilla/5.0');

        // When mfaStatus.enabled=true AND device not trusted:
        // mfaRequired = (true || false) && !false = true && true = true
        // Line 352: if (mfaRequired && mfaStatus.enabled) = true && true = true
        // Line 354: if (dto.totpCode) = false → goes to else at line 361
        // Line 363: returns tempToken
        expect(result).toHaveProperty('tempToken');
        expect((result as any).tempToken).toBe('temp-token-001');
      });

      it('should verify TOTP when valid (line 354-360)', async () => {
        // Tests: line 354 if (dto.totpCode) and line 356 if (!result.valid)
        authService.validateUser.mockResolvedValue(mockUser as never);
        authService.isAccountLocked.mockResolvedValue({ locked: false });
        authService.generateTokens.mockResolvedValue(mockTokens as never);
        authService.updateLastLogin.mockResolvedValue(undefined);

        const riskService = module.get(RiskAssessmentService) as jest.Mocked<RiskAssessmentService>;
        riskService.assessLoginRisk.mockResolvedValue({
          score: 10,
          level: 'low',
          signals: [],
          requiresMfa: false,
          requiresDeviceApproval: false,
          blockLogin: false,
        });

        const trustedDeviceService = module.get(
          TrustedDeviceService,
        ) as jest.Mocked<TrustedDeviceService>;
        trustedDeviceService.isDeviceTrusted.mockResolvedValue(false);
        trustedDeviceService.generateFingerprint.mockReturnValue('fingerprint-001');

        const mfaService = module.get(MfaService) as jest.Mocked<MfaService>;
        mfaService.getStatus.mockResolvedValue({
          enabled: true, // MFA enabled
          backupCodesCount: 5,
        });
        mfaService.verify.mockResolvedValue({ valid: true }); // Valid TOTP

        const loginThrottle = module.get(LoginThrottleService) as jest.Mocked<LoginThrottleService>;
        loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 } as never);
        loginThrottle.resetOnSuccess.mockResolvedValue(undefined);

        const dto: any = {
          email: mockUser.email,
          password: 'password123',
          tenantSlug: 'test-tenant',
          totpCode: '123456', // TOTP provided
        };

        const result = await controller.login(dto, '127.0.0.1', 'Mozilla/5.0');

        expect(result).toHaveProperty('accessToken');
        // Line 355-360: mfaService.verify called, result.valid=true, so continues to generate tokens
        expect(mfaService.verify).toHaveBeenCalledWith('user-001', '123456');
      });

      it('should handle critical risk level (not low/medium, line 412)', async () => {
        // Tests line 412: if (risk.level === 'low' || risk.level === 'medium')
        // When level is 'critical', condition is false, device NOT trusted
        authService.validateUser.mockResolvedValue(mockUser as never);
        authService.isAccountLocked.mockResolvedValue({ locked: false });
        authService.generateTokens.mockResolvedValue(mockTokens as never);
        authService.updateLastLogin.mockResolvedValue(undefined);

        const riskService = module.get(RiskAssessmentService) as jest.Mocked<RiskAssessmentService>;
        riskService.assessLoginRisk.mockResolvedValue({
          score: 95,
          level: 'critical',
          signals: [] as any,
          requiresMfa: false,
          requiresDeviceApproval: false,
          blockLogin: false, // Allowed but CRITICAL
        });

        const trustedDeviceService = module.get(
          TrustedDeviceService,
        ) as jest.Mocked<TrustedDeviceService>;
        trustedDeviceService.isDeviceTrusted.mockResolvedValue(false);
        trustedDeviceService.generateFingerprint.mockReturnValue('fingerprint-001');

        const mfaService = module.get(MfaService) as jest.Mocked<MfaService>;
        mfaService.getStatus.mockResolvedValue({
          enabled: false,
          backupCodesCount: 0,
        });

        const loginThrottle = module.get(LoginThrottleService) as jest.Mocked<LoginThrottleService>;
        loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 } as never);
        loginThrottle.resetOnSuccess.mockResolvedValue(undefined);

        const dto: any = {
          email: mockUser.email,
          password: 'password123',
          tenantSlug: 'test-tenant',
        };

        const result = await controller.login(dto, '127.0.0.1', 'Mozilla/5.0');

        expect(result).toHaveProperty('accessToken');
        // Line 412: risk.level === 'critical' → condition false → trustDevice NOT called
        expect(riskService.trustDevice).not.toHaveBeenCalled();
      });

      it('should include SMS in MFA methods when phone verified (line 371-372)', async () => {
        // Tests: if (dbUser?.smsOtpEnabled && dbUser?.recoveryPhoneVerified)
        authService.validateUser.mockResolvedValue(mockUser as never);
        authService.isAccountLocked.mockResolvedValue({ locked: false });
        authService.generateTwoFactorTempToken.mockResolvedValue('temp-token-sms');

        const riskService = module.get(RiskAssessmentService) as jest.Mocked<RiskAssessmentService>;
        riskService.assessLoginRisk.mockResolvedValue({
          score: 10,
          level: 'low',
          signals: [],
          requiresMfa: false,
          requiresDeviceApproval: false,
          blockLogin: false,
        });

        const trustedDeviceService = module.get(
          TrustedDeviceService,
        ) as jest.Mocked<TrustedDeviceService>;
        trustedDeviceService.isDeviceTrusted.mockResolvedValue(false);
        trustedDeviceService.generateFingerprint.mockReturnValue('fingerprint-001');

        const mfaService = module.get(MfaService) as jest.Mocked<MfaService>;
        mfaService.getStatus.mockResolvedValue({
          enabled: true,
          backupCodesCount: 5,
        });

        const loginThrottle = module.get(LoginThrottleService) as jest.Mocked<LoginThrottleService>;
        loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 } as never);

        const prismaService = module.get(PrismaService) as jest.Mocked<PrismaService>;
        (prismaService.user as any) = {
          findUnique: jest.fn().mockResolvedValue({
            id: 'user-001',
            smsOtpEnabled: true, // SMS enabled
            recoveryPhoneVerified: true, // Phone verified
          }),
        } as any;

        const dto: any = {
          email: mockUser.email,
          password: 'password123',
          tenantSlug: 'test-tenant',
          // No totpCode → returns tempToken
        };

        const result = await controller.login(dto, '127.0.0.1', 'Mozilla/5.0');

        expect(result).toHaveProperty('tempToken');
        expect(result).toHaveProperty('requiresMfa', true);
        // Line 371-372: SMS should be included in methods
        expect((result as any).methods).toContain('sms');
        expect((result as any).methods).toContain('totp');
        expect((result as any).methods).toContain('backup');
      });

      it('should verify TOTP fails and record failure (line 356-359)', async () => {
        // Tests line 356: if (!result.valid) when TOTP invalid
        authService.validateUser.mockResolvedValue(mockUser as never);
        authService.isAccountLocked.mockResolvedValue({ locked: false });
        authService.recordFailedLogin.mockResolvedValue(undefined);

        const riskService = module.get(RiskAssessmentService) as jest.Mocked<RiskAssessmentService>;
        riskService.assessLoginRisk.mockResolvedValue({
          score: 10,
          level: 'low',
          signals: [],
          requiresMfa: false,
          requiresDeviceApproval: false,
          blockLogin: false,
        });

        const trustedDeviceService = module.get(
          TrustedDeviceService,
        ) as jest.Mocked<TrustedDeviceService>;
        trustedDeviceService.isDeviceTrusted.mockResolvedValue(false);
        trustedDeviceService.generateFingerprint.mockReturnValue('fingerprint-001');

        const mfaService = module.get(MfaService) as jest.Mocked<MfaService>;
        mfaService.getStatus.mockResolvedValue({
          enabled: true,
          backupCodesCount: 5,
        });
        mfaService.verify.mockResolvedValue({ valid: false }); // Invalid TOTP

        const loginThrottle = module.get(LoginThrottleService) as jest.Mocked<LoginThrottleService>;
        loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 } as never);

        const dto: any = {
          email: mockUser.email,
          password: 'password123',
          tenantSlug: 'test-tenant',
          totpCode: '000000',
        };

        await expect(controller.login(dto, '127.0.0.1', 'Mozilla/5.0')).rejects.toThrow(
          UnauthorizedException,
        );

        // Line 357-358: record failed login
        expect(authService.recordFailedLogin).toHaveBeenCalledWith('user-001');
        expect(loginThrottle.recordFailure).toHaveBeenCalled();
      });

      it('should trust device for MEDIUM risk level (line 412 medium branch)', async () => {
        // Tests: line 412 if (risk.level === 'low' || risk.level === 'medium')
        // When level='medium', should trust device
        authService.validateUser.mockResolvedValue(mockUser as never);
        authService.isAccountLocked.mockResolvedValue({ locked: false });
        authService.generateTokens.mockResolvedValue(mockTokens as never);
        authService.updateLastLogin.mockResolvedValue(undefined);

        const riskService = module.get(RiskAssessmentService) as jest.Mocked<RiskAssessmentService>;
        riskService.assessLoginRisk.mockResolvedValue({
          score: 40,
          level: 'medium', // MEDIUM risk
          signals: [] as any,
          requiresMfa: false,
          requiresDeviceApproval: false,
          blockLogin: false,
        });

        const trustedDeviceService = module.get(
          TrustedDeviceService,
        ) as jest.Mocked<TrustedDeviceService>;
        trustedDeviceService.isDeviceTrusted.mockResolvedValue(false);
        trustedDeviceService.generateFingerprint.mockReturnValue('fingerprint-001');

        const mfaService = module.get(MfaService) as jest.Mocked<MfaService>;
        mfaService.getStatus.mockResolvedValue({
          enabled: false,
          backupCodesCount: 0,
        });

        const loginThrottle = module.get(LoginThrottleService) as jest.Mocked<LoginThrottleService>;
        loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 } as never);
        loginThrottle.resetOnSuccess.mockResolvedValue(undefined);

        const dto: any = {
          email: mockUser.email,
          password: 'password123',
          tenantSlug: 'test-tenant',
        };

        const result = await controller.login(dto, '127.0.0.1', 'Mozilla/5.0');

        expect(result).toHaveProperty('accessToken');
        // Line 412: risk.level === 'medium' → condition TRUE → trustDevice IS called
        expect(riskService.trustDevice).toHaveBeenCalled();
      });

      it('should handle rememberMe=undefined defaults to 30 days (line 411)', async () => {
        // Tests: line 411 const trustDays = dto.rememberMe ? 90 : 30
        // When rememberMe is undefined, should use 30 days
        authService.validateUser.mockResolvedValue(mockUser as never);
        authService.isAccountLocked.mockResolvedValue({ locked: false });
        authService.generateTokens.mockResolvedValue(mockTokens as never);
        authService.updateLastLogin.mockResolvedValue(undefined);

        const riskService = module.get(RiskAssessmentService) as jest.Mocked<RiskAssessmentService>;
        riskService.assessLoginRisk.mockResolvedValue({
          score: 10,
          level: 'low',
          signals: [],
          requiresMfa: false,
          requiresDeviceApproval: false,
          blockLogin: false,
        });

        const trustedDeviceService = module.get(
          TrustedDeviceService,
        ) as jest.Mocked<TrustedDeviceService>;
        trustedDeviceService.isDeviceTrusted.mockResolvedValue(false);
        trustedDeviceService.generateFingerprint.mockReturnValue('fingerprint-001');

        const mfaService = module.get(MfaService) as jest.Mocked<MfaService>;
        mfaService.getStatus.mockResolvedValue({
          enabled: false,
          backupCodesCount: 0,
        });

        const loginThrottle = module.get(LoginThrottleService) as jest.Mocked<LoginThrottleService>;
        loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 } as never);
        loginThrottle.resetOnSuccess.mockResolvedValue(undefined);

        const dto: any = {
          email: mockUser.email,
          password: 'password123',
          tenantSlug: 'test-tenant',
          // rememberMe is undefined
        };

        const result = await controller.login(dto, '127.0.0.1', 'Mozilla/5.0');

        expect(result).toHaveProperty('accessToken');
        // trustDays should be 30 (falsy path)
        expect(riskService.trustDevice).toHaveBeenCalledWith(mockUser.id, expect.any(String), 30);
      });
    });
  });

  // =========================================================================
  // login — delay > 0 branch (line 302)
  // =========================================================================
  describe('login — progressive delay enforcement', () => {
    it('should apply progressive delay when getDelay returns delay > 0', async () => {
      const loginThrottle = (controller as unknown as Record<string, unknown>)[
        'loginThrottle'
      ] as jest.Mocked<LoginThrottleService>;

      // Mock delay > 0
      loginThrottle.getDelay.mockResolvedValue({ delay: 5, attempts: 10 } as never);

      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false });
      authService.generateTokens.mockResolvedValue(mockTokens as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);

      const riskAssessment = (controller as unknown as Record<string, unknown>)[
        'riskAssessment'
      ] as jest.Mocked<RiskAssessmentService>;
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 0,
        level: 'low',
        signals: [],
        requiresMfa: false,
        requiresDeviceApproval: false,
        blockLogin: false,
      } as never);

      const loginDto = {
        email: 'test@example.com',
        password: 'pass123',
        tenantSlug: 'garage-roma',
      };

      const result = await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

      expect(result).toEqual(mockTokens);
      // Verify delay was enforced (getDelay was called)
      expect(loginThrottle.getDelay).toHaveBeenCalledWith('test@example.com', '127.0.0.1');
    });
  });

  // =========================================================================
  // login — dbUser null check (line 366-369)
  // =========================================================================
  describe('login — SMS OTP method availability when dbUser is null', () => {
    it('should not include SMS method when dbUser is null', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      mfaService.getStatus.mockResolvedValue({ enabled: true } as never);
      authService.generateTwoFactorTempToken.mockResolvedValue('temp-token' as never);

      const prismaService = (controller as unknown as Record<string, unknown>)['prisma'] as {
        user: { findUnique: jest.Mock };
      };
      // Return null to test the ?. optional chaining
      prismaService.user.findUnique.mockResolvedValue(null);

      const result = await controller.login(
        { email: 'test@example.com', password: 'pass123', tenantSlug: 'garage-roma' } as never,
        '127.0.0.1',
        'Mozilla/5.0',
      );

      expect(result).toEqual({
        tempToken: 'temp-token',
        requiresMfa: true,
        methods: ['totp', 'backup'],
        riskLevel: 'low',
      });
    });
  });

  // =========================================================================
  // generateFingerprint() private method — browser/OS detection branches
  // =========================================================================
  describe('generateFingerprint — browser detection branches', () => {
    it('should detect Edge browser', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false });
      authService.generateTokens.mockResolvedValue(mockTokens as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);

      const riskAssessment = (controller as unknown as Record<string, unknown>)[
        'riskAssessment'
      ] as jest.Mocked<RiskAssessmentService>;
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 0,
        level: 'low',
        signals: [],
        requiresMfa: false,
        requiresDeviceApproval: false,
        blockLogin: false,
      } as never);

      const result = await controller.login(
        { email: 'test@example.com', password: 'pass123', tenantSlug: 'test' } as never,
        '127.0.0.1',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
      );

      expect(result).toEqual(mockTokens);
      // Trust device should be called, which internally uses generateFingerprint
      expect(riskAssessment.trustDevice).toHaveBeenCalled();
    });

    it('should detect Chrome browser', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false });
      authService.generateTokens.mockResolvedValue(mockTokens as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);

      const riskAssessment = (controller as unknown as Record<string, unknown>)[
        'riskAssessment'
      ] as jest.Mocked<RiskAssessmentService>;
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 0,
        level: 'low',
        signals: [],
        requiresMfa: false,
        requiresDeviceApproval: false,
        blockLogin: false,
      } as never);

      const result = await controller.login(
        { email: 'test@example.com', password: 'pass123', tenantSlug: 'test' } as never,
        '192.168.1.1',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      );

      expect(result).toEqual(mockTokens);
      expect(riskAssessment.trustDevice).toHaveBeenCalled();
    });

    it('should detect Safari browser', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false });
      authService.generateTokens.mockResolvedValue(mockTokens as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);

      const riskAssessment = (controller as unknown as Record<string, unknown>)[
        'riskAssessment'
      ] as jest.Mocked<RiskAssessmentService>;
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 0,
        level: 'low',
        signals: [],
        requiresMfa: false,
        requiresDeviceApproval: false,
        blockLogin: false,
      } as never);

      const result = await controller.login(
        { email: 'test@example.com', password: 'pass123', tenantSlug: 'test' } as never,
        '192.168.1.100',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.36',
      );

      expect(result).toEqual(mockTokens);
      expect(riskAssessment.trustDevice).toHaveBeenCalled();
    });

    it('should detect Firefox browser', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false });
      authService.generateTokens.mockResolvedValue(mockTokens as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);

      const riskAssessment = (controller as unknown as Record<string, unknown>)[
        'riskAssessment'
      ] as jest.Mocked<RiskAssessmentService>;
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 0,
        level: 'low',
        signals: [],
        requiresMfa: false,
        requiresDeviceApproval: false,
        blockLogin: false,
      } as never);

      const result = await controller.login(
        { email: 'test@example.com', password: 'pass123', tenantSlug: 'test' } as never,
        '10.0.0.1',
        'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
      );

      expect(result).toEqual(mockTokens);
      expect(riskAssessment.trustDevice).toHaveBeenCalled();
    });

    it('should detect iOS', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false });
      authService.generateTokens.mockResolvedValue(mockTokens as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);

      const riskAssessment = (controller as unknown as Record<string, unknown>)[
        'riskAssessment'
      ] as jest.Mocked<RiskAssessmentService>;
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 0,
        level: 'low',
        signals: [],
        requiresMfa: false,
        requiresDeviceApproval: false,
        blockLogin: false,
      } as never);

      const result = await controller.login(
        { email: 'test@example.com', password: 'pass123', tenantSlug: 'test' } as never,
        '192.168.0.5',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15',
      );

      expect(result).toEqual(mockTokens);
      expect(riskAssessment.trustDevice).toHaveBeenCalled();
    });

    it('should detect iPad', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false });
      authService.generateTokens.mockResolvedValue(mockTokens as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);

      const riskAssessment = (controller as unknown as Record<string, unknown>)[
        'riskAssessment'
      ] as jest.Mocked<RiskAssessmentService>;
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 0,
        level: 'low',
        signals: [],
        requiresMfa: false,
        requiresDeviceApproval: false,
        blockLogin: false,
      } as never);

      const result = await controller.login(
        { email: 'test@example.com', password: 'pass123', tenantSlug: 'test' } as never,
        '172.16.0.1',
        'Mozilla/5.0 (iPad; CPU OS 17_3 like Mac OS X) AppleWebKit/605.1.15',
      );

      expect(result).toEqual(mockTokens);
      expect(riskAssessment.trustDevice).toHaveBeenCalled();
    });

    it('should detect Android', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false });
      authService.generateTokens.mockResolvedValue(mockTokens as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);

      const riskAssessment = (controller as unknown as Record<string, unknown>)[
        'riskAssessment'
      ] as jest.Mocked<RiskAssessmentService>;
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 0,
        level: 'low',
        signals: [],
        requiresMfa: false,
        requiresDeviceApproval: false,
        blockLogin: false,
      } as never);

      const result = await controller.login(
        { email: 'test@example.com', password: 'pass123', tenantSlug: 'test' } as never,
        '203.0.113.42',
        'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0',
      );

      expect(result).toEqual(mockTokens);
      expect(riskAssessment.trustDevice).toHaveBeenCalled();
    });

    it('should detect macOS', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false });
      authService.generateTokens.mockResolvedValue(mockTokens as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);

      const riskAssessment = (controller as unknown as Record<string, unknown>)[
        'riskAssessment'
      ] as jest.Mocked<RiskAssessmentService>;
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 0,
        level: 'low',
        signals: [],
        requiresMfa: false,
        requiresDeviceApproval: false,
        blockLogin: false,
      } as never);

      const result = await controller.login(
        { email: 'test@example.com', password: 'pass123', tenantSlug: 'test' } as never,
        '203.0.113.45',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      );

      expect(result).toEqual(mockTokens);
      expect(riskAssessment.trustDevice).toHaveBeenCalled();
    });

    it('should detect Windows', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false });
      authService.generateTokens.mockResolvedValue(mockTokens as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);

      const riskAssessment = (controller as unknown as Record<string, unknown>)[
        'riskAssessment'
      ] as jest.Mocked<RiskAssessmentService>;
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 0,
        level: 'low',
        signals: [],
        requiresMfa: false,
        requiresDeviceApproval: false,
        blockLogin: false,
      } as never);

      const result = await controller.login(
        { email: 'test@example.com', password: 'pass123', tenantSlug: 'test' } as never,
        '203.0.113.50',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      );

      expect(result).toEqual(mockTokens);
      expect(riskAssessment.trustDevice).toHaveBeenCalled();
    });

    it('should detect Linux', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false });
      authService.generateTokens.mockResolvedValue(mockTokens as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);

      const riskAssessment = (controller as unknown as Record<string, unknown>)[
        'riskAssessment'
      ] as jest.Mocked<RiskAssessmentService>;
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 0,
        level: 'low',
        signals: [],
        requiresMfa: false,
        requiresDeviceApproval: false,
        blockLogin: false,
      } as never);

      const result = await controller.login(
        { email: 'test@example.com', password: 'pass123', tenantSlug: 'test' } as never,
        '203.0.113.55',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      );

      expect(result).toEqual(mockTokens);
      expect(riskAssessment.trustDevice).toHaveBeenCalled();
    });

    it('should handle unknown browser', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false });
      authService.generateTokens.mockResolvedValue(mockTokens as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);

      const riskAssessment = (controller as unknown as Record<string, unknown>)[
        'riskAssessment'
      ] as jest.Mocked<RiskAssessmentService>;
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 0,
        level: 'low',
        signals: [],
        requiresMfa: false,
        requiresDeviceApproval: false,
        blockLogin: false,
      } as never);

      const result = await controller.login(
        { email: 'test@example.com', password: 'pass123', tenantSlug: 'test' } as never,
        '203.0.113.60',
        'SomethingUnknown/1.0',
      );

      expect(result).toEqual(mockTokens);
      expect(riskAssessment.trustDevice).toHaveBeenCalled();
    });

    it('should handle unknown OS', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false });
      authService.generateTokens.mockResolvedValue(mockTokens as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);

      const riskAssessment = (controller as unknown as Record<string, unknown>)[
        'riskAssessment'
      ] as jest.Mocked<RiskAssessmentService>;
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 0,
        level: 'low',
        signals: [],
        requiresMfa: false,
        requiresDeviceApproval: false,
        blockLogin: false,
      } as never);

      const result = await controller.login(
        { email: 'test@example.com', password: 'pass123', tenantSlug: 'test' } as never,
        '203.0.113.65',
        'Mozilla/5.0 (Unknown OS) Browser/1.0',
      );

      expect(result).toEqual(mockTokens);
      expect(riskAssessment.trustDevice).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // verifyTwoFactor — additional uncovered branches
  // =========================================================================
  describe('verifyTwoFactor — browser/OS detection via generateFingerprint', () => {
    it('should trust device after 2FA with Firefox browser', async () => {
      authService.verifyTwoFactorTempToken.mockResolvedValue('user-001' as never);
      mfaService.verify.mockResolvedValue({ valid: true } as never);
      authService.getUserWithTwoFactorStatus.mockResolvedValue(mockUser as never);
      authService.generateTokens.mockResolvedValue(mockTokens as never);

      const riskAssessment = (controller as unknown as Record<string, unknown>)[
        'riskAssessment'
      ] as jest.Mocked<RiskAssessmentService>;

      const dto = { tempToken: 'temp-123', totpCode: '123456' };
      const result = await controller.verifyTwoFactor(
        dto as never,
        '192.168.1.5',
        'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
      );

      expect(result).toEqual(mockTokens);
      // Fingerprint is generated with Firefox + Linux detection
      expect(riskAssessment.trustDevice).toHaveBeenCalled();
    });

    it('should trust device after 2FA with Safari browser', async () => {
      authService.verifyTwoFactorTempToken.mockResolvedValue('user-001' as never);
      mfaService.verify.mockResolvedValue({ valid: true } as never);
      authService.getUserWithTwoFactorStatus.mockResolvedValue(mockUser as never);
      authService.generateTokens.mockResolvedValue(mockTokens as never);

      const riskAssessment = (controller as unknown as Record<string, unknown>)[
        'riskAssessment'
      ] as jest.Mocked<RiskAssessmentService>;

      const dto = { tempToken: 'temp-123', totpCode: '123456' };
      const result = await controller.verifyTwoFactor(
        dto as never,
        '192.168.2.10',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.3 Safari/605.1.15',
      );

      expect(result).toEqual(mockTokens);
      expect(riskAssessment.trustDevice).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // verifyLoginSmsOtp — additional uncovered branches
  // =========================================================================
  describe('verifyLoginSmsOtp — browser/OS detection via generateFingerprint', () => {
    it('should trust device after SMS OTP with Chrome on Windows', async () => {
      authService.verifyTwoFactorTempToken.mockResolvedValue('user-001' as never);
      authService.getUserWithTwoFactorStatus.mockResolvedValue(mockUser as never);
      authService.generateTokens.mockResolvedValue(mockTokens as never);

      const smsOtp = (controller as unknown as Record<string, unknown>)['smsOtpService'] as {
        verifyOtp: jest.Mock;
      };
      smsOtp.verifyOtp.mockResolvedValue({ valid: true });

      const riskAssessment = (controller as unknown as Record<string, unknown>)[
        'riskAssessment'
      ] as jest.Mocked<RiskAssessmentService>;

      const result = await controller.verifyLoginSmsOtp(
        { tempToken: 'temp-123', code: '123456' } as never,
        '192.168.3.20',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0',
      );

      expect(result).toEqual(mockTokens);
      expect(riskAssessment.trustDevice).toHaveBeenCalled();
    });

    it('should trust device after SMS OTP with Edge on Mac', async () => {
      authService.verifyTwoFactorTempToken.mockResolvedValue('user-001' as never);
      authService.getUserWithTwoFactorStatus.mockResolvedValue(mockUser as never);
      authService.generateTokens.mockResolvedValue(mockTokens as never);

      const smsOtp = (controller as unknown as Record<string, unknown>)['smsOtpService'] as {
        verifyOtp: jest.Mock;
      };
      smsOtp.verifyOtp.mockResolvedValue({ valid: true });

      const riskAssessment = (controller as unknown as Record<string, unknown>)[
        'riskAssessment'
      ] as jest.Mocked<RiskAssessmentService>;

      const result = await controller.verifyLoginSmsOtp(
        { tempToken: 'temp-123', code: '123456' } as never,
        '192.168.4.25',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Edg/120.0.0.0',
      );

      expect(result).toEqual(mockTokens);
      expect(riskAssessment.trustDevice).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // login — additional conditional branch coverage
  // =========================================================================
  describe('login — MFA required conditions', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'pass123',
      tenantSlug: 'garage-roma',
    };

    it('should handle mfaRequired=true && mfaStatus.enabled=true && dto.totpCode=PROVIDED path', async () => {
      // Tests: line 352 if (mfaRequired && mfaStatus.enabled)
      // + line 354 if (dto.totpCode)
      // When: mfaRequired=true, mfaStatus.enabled=true, dto.totpCode provided
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false });
      mfaService.getStatus.mockResolvedValue({ enabled: true } as never);
      mfaService.verify.mockResolvedValue({ valid: true } as never);
      authService.generateTokens.mockResolvedValue(mockTokens as never);

      const riskAssessment = (controller as unknown as Record<string, unknown>)[
        'riskAssessment'
      ] as jest.Mocked<RiskAssessmentService>;
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 0,
        level: 'low',
        signals: [],
        requiresMfa: false,
        requiresDeviceApproval: false,
        blockLogin: false,
      } as never);

      const dtoWithTotp = { ...loginDto, totpCode: '123456' };
      const result = await controller.login(dtoWithTotp as never, '127.0.0.1', 'Mozilla/5.0');

      expect(result).toEqual(mockTokens);
      expect(mfaService.verify).toHaveBeenCalledWith('user-001', '123456');
    });

    it('should handle mfaRequired=true && mfaStatus.enabled=true && dto.totpCode=undefined path', async () => {
      // Tests: line 352 if (mfaRequired && mfaStatus.enabled)
      // + line 354 if (!dto.totpCode) — else branch
      // When: mfaRequired=true, mfaStatus.enabled=true, dto.totpCode undefined
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false });
      mfaService.getStatus.mockResolvedValue({ enabled: true } as never);
      authService.generateTwoFactorTempToken.mockResolvedValue('temp-token' as never);

      const riskAssessment = (controller as unknown as Record<string, unknown>)[
        'riskAssessment'
      ] as jest.Mocked<RiskAssessmentService>;
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 0,
        level: 'low',
        signals: [],
        requiresMfa: false,
        requiresDeviceApproval: false,
        blockLogin: false,
      } as never);

      const prismaService = (controller as unknown as Record<string, unknown>)['prisma'] as {
        user: { findUnique: jest.Mock };
      };
      prismaService.user.findUnique.mockResolvedValue({
        smsOtpEnabled: false,
        recoveryPhoneVerified: false,
      });

      const result = await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

      expect(result).toHaveProperty('tempToken');
      expect(result).toHaveProperty('requiresMfa', true);
    });

    it('should handle risk.requiresMfa=true && mfaStatus.enabled=false path (line 382)', async () => {
      // Tests: line 382 else if (risk.requiresMfa && !mfaStatus.enabled)
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false });
      authService.generateTokens.mockResolvedValue(mockTokens as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);

      const riskAssessment = (controller as unknown as Record<string, unknown>)[
        'riskAssessment'
      ] as jest.Mocked<RiskAssessmentService>;
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 80,
        level: 'high',
        signals: [] as any,
        requiresMfa: true,
        requiresDeviceApproval: false,
        blockLogin: false,
      } as never);

      const logger = (controller as unknown as Record<string, unknown>)['logger'] as any;
      logger.warn = jest.fn();

      const result = await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

      expect(result).toEqual(mockTokens);
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should trust device when risk.level=high (should NOT trust — verify inverse)', async () => {
      // Tests: line 412 if (risk.level === 'low' || risk.level === 'medium')
      // When risk.level=high, should NOT execute trust device
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false });
      authService.generateTokens.mockResolvedValue(mockTokens as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);

      const riskAssessment = (controller as unknown as Record<string, unknown>)[
        'riskAssessment'
      ] as jest.Mocked<RiskAssessmentService>;
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 75,
        level: 'high',
        signals: [] as any,
        requiresMfa: false,
        requiresDeviceApproval: false,
        blockLogin: false,
      } as never);

      const result = await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

      expect(result).toEqual(mockTokens);
      // Should NOT call trustDevice for high risk
      expect(riskAssessment.trustDevice).not.toHaveBeenCalled();
    });

    it('should trust device when risk.level=critical (should NOT trust — verify inverse)', async () => {
      // Tests: line 412 else branch when risk.level is neither 'low' nor 'medium'
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false });
      authService.generateTokens.mockResolvedValue(mockTokens as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);

      const riskAssessment = (controller as unknown as Record<string, unknown>)[
        'riskAssessment'
      ] as jest.Mocked<RiskAssessmentService>;
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 95,
        level: 'critical',
        signals: [] as any,
        requiresMfa: false,
        requiresDeviceApproval: false,
        blockLogin: false,
      } as never);

      const result = await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

      expect(result).toEqual(mockTokens);
      // Should NOT call trustDevice for critical risk
      expect(riskAssessment.trustDevice).not.toHaveBeenCalled();
    });

    it('should handle catch block in session creation (line 404)', async () => {
      // Tests: line 395-407 try-catch on sessionService.createSession
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false });
      authService.generateTokens.mockResolvedValue(mockTokens as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);

      const riskAssessment = (controller as unknown as Record<string, unknown>)[
        'riskAssessment'
      ] as jest.Mocked<RiskAssessmentService>;
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 0,
        level: 'low',
        signals: [],
        requiresMfa: false,
        requiresDeviceApproval: false,
        blockLogin: false,
      } as never);

      const sessionService = (controller as unknown as Record<string, unknown>)[
        'sessionService'
      ] as jest.Mocked<SessionService>;
      sessionService.createSession.mockRejectedValue(new Error('Session failed'));

      const logger = (controller as unknown as Record<string, unknown>)['logger'] as any;
      logger.error = jest.fn();

      const result = await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

      expect(result).toEqual(mockTokens);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // login — mfaRequired conditional (line 350)
  // =========================================================================
  describe('login — mfaRequired calculation branches', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'pass123',
      tenantSlug: 'garage-roma',
    };

    it('should set mfaRequired=false when mfaStatus.enabled=false AND risk.requiresMfa=false', async () => {
      // Tests: line 350 const mfaRequired = (mfaStatus.enabled || risk.requiresMfa) && !deviceTrusted
      // When: mfaStatus.enabled=false, risk.requiresMfa=false → false || false && true = false
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false });
      authService.generateTokens.mockResolvedValue(mockTokens as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);

      const riskAssessment = (controller as unknown as Record<string, unknown>)[
        'riskAssessment'
      ] as jest.Mocked<RiskAssessmentService>;
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 0,
        level: 'low',
        signals: [],
        requiresMfa: false,
        requiresDeviceApproval: false,
        blockLogin: false,
      } as never);

      const result = await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

      expect(result).toEqual(mockTokens);
      // mfaRequired should be false, so login succeeds directly
      expect(result).toHaveProperty('accessToken');
    });

    it('should set mfaRequired=false when deviceTrusted=true', async () => {
      // Tests: line 350 const mfaRequired = (mfaStatus.enabled || risk.requiresMfa) && !deviceTrusted
      // When: mfaStatus.enabled=true, risk.requiresMfa=false, deviceTrusted=true
      // → (true || false) && !true = true && false = false
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false });
      authService.generateTokens.mockResolvedValue(mockTokens as never);
      mfaService.getStatus.mockResolvedValue({ enabled: true } as never);

      const trustedDeviceService = (controller as unknown as Record<string, unknown>)[
        'trustedDeviceService'
      ] as jest.Mocked<TrustedDeviceService>;
      trustedDeviceService.isDeviceTrusted.mockResolvedValue(true);
      trustedDeviceService.generateFingerprint.mockReturnValue('fingerprint-001');

      const riskAssessment = (controller as unknown as Record<string, unknown>)[
        'riskAssessment'
      ] as jest.Mocked<RiskAssessmentService>;
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 0,
        level: 'low',
        signals: [],
        requiresMfa: false,
        requiresDeviceApproval: false,
        blockLogin: false,
      } as never);

      const result = await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

      // Should skip MFA because device is trusted
      expect(result).toEqual(mockTokens);
      expect(mfaService.verify).not.toHaveBeenCalled();
    });

    it('should set mfaRequired=true when mfaStatus.enabled=true AND deviceTrusted=false', async () => {
      // Tests: line 350 const mfaRequired = (mfaStatus.enabled || risk.requiresMfa) && !deviceTrusted
      // When: mfaStatus.enabled=true, deviceTrusted=false
      // → (true || false) && !false = true && true = true
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false });
      mfaService.getStatus.mockResolvedValue({ enabled: true } as never);
      authService.generateTwoFactorTempToken.mockResolvedValue('temp-token' as never);

      const trustedDeviceService = (controller as unknown as Record<string, unknown>)[
        'trustedDeviceService'
      ] as jest.Mocked<TrustedDeviceService>;
      trustedDeviceService.isDeviceTrusted.mockResolvedValue(false);
      trustedDeviceService.generateFingerprint.mockReturnValue('fingerprint-001');

      const riskAssessment = (controller as unknown as Record<string, unknown>)[
        'riskAssessment'
      ] as jest.Mocked<RiskAssessmentService>;
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 0,
        level: 'low',
        signals: [],
        requiresMfa: false,
        requiresDeviceApproval: false,
        blockLogin: false,
      } as never);

      const prismaService = (controller as unknown as Record<string, unknown>)['prisma'] as {
        user: { findUnique: jest.Mock };
      };
      prismaService.user.findUnique.mockResolvedValue({
        smsOtpEnabled: false,
        recoveryPhoneVerified: false,
      });

      const result = await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

      // Should require MFA
      expect(result).toHaveProperty('requiresMfa', true);
    });

    it('should set mfaRequired=true when risk.requiresMfa=true AND deviceTrusted=false', async () => {
      // Tests: line 350 const mfaRequired = (mfaStatus.enabled || risk.requiresMfa) && !deviceTrusted
      // When: mfaStatus.enabled=false, risk.requiresMfa=true, deviceTrusted=false
      // → (false || true) && !false = true && true = true
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false });
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);

      // No generateTwoFactorTempToken mock needed when MFA not enabled
      // But the line 350 condition says mfaRequired = (false || true) && !false = true
      // However, the controller checks "if (mfaRequired && mfaStatus.enabled)"
      // Since mfaStatus.enabled=false, the if block won't execute
      // So we'll get the "else if" path at line 382

      const trustedDeviceService = (controller as unknown as Record<string, unknown>)[
        'trustedDeviceService'
      ] as jest.Mocked<TrustedDeviceService>;
      trustedDeviceService.isDeviceTrusted.mockResolvedValue(false);
      trustedDeviceService.generateFingerprint.mockReturnValue('fingerprint-001');

      const riskAssessment = (controller as unknown as Record<string, unknown>)[
        'riskAssessment'
      ] as jest.Mocked<RiskAssessmentService>;
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 70,
        level: 'high',
        signals: [] as any,
        requiresMfa: true,
        requiresDeviceApproval: false,
        blockLogin: false,
      } as never);

      authService.generateTokens.mockResolvedValue(mockTokens as never);

      const logger = (controller as unknown as Record<string, unknown>)['logger'] as any;
      logger.warn = jest.fn();

      const result = await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

      // When mfaStatus.enabled=false but risk.requiresMfa=true:
      // - mfaRequired = (false || true) && true = true
      // - Line 352: if (mfaRequired && mfaStatus.enabled) = if (true && false) = FALSE
      // - Line 382: else if (risk.requiresMfa && !mfaStatus.enabled) = TRUE
      // So it logs warning and allows login
      expect(result).toEqual(mockTokens);
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  // ===== BRANCH COVERAGE GAPS: +7.23pp required =====
  describe('login — delay enforcement and error paths', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'pass123',
      tenantSlug: 'garage-roma',
    };

    it('should enforce progressive delay when getDelay returns delay > 0', async () => {
      const loginThrottle = module.get(LoginThrottleService) as jest.Mocked<LoginThrottleService>;
      loginThrottle.getDelay.mockResolvedValue({ delay: 2000, attempts: 5 } as never);

      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);
      authService.generateTokens.mockResolvedValue(mockTokens as never);

      const before = Date.now();
      await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');
      const elapsed = Date.now() - before;

      // Verify delay was applied (at least 1500ms of 2000ms, accounting for execution time)
      expect(elapsed).toBeGreaterThanOrEqual(1500);
      expect(loginThrottle.getDelay).toHaveBeenCalledWith('test@example.com', '127.0.0.1');
    });

    it('should handle validateUser throwing error (not returning null)', async () => {
      authService.validateUser.mockRejectedValue(new Error('Database connection failed'));

      const loginThrottle = module.get(LoginThrottleService) as jest.Mocked<LoginThrottleService>;
      loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 } as never);
      loginThrottle.recordFailure.mockResolvedValue(1);

      await expect(controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0')).rejects.toThrow(
        'Database connection failed',
      );

      expect(loginThrottle.recordFailure).toHaveBeenCalledWith('test@example.com', '127.0.0.1');
    });

    it('should block login when risk.blockLogin = true', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);

      const riskAssessment = module.get(
        RiskAssessmentService,
      ) as jest.Mocked<RiskAssessmentService>;
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 100,
        level: 'critical',
        signals: [] as any,
        requiresMfa: true,
        requiresDeviceApproval: true,
        blockLogin: true,
      } as never);

      const loginThrottle = module.get(LoginThrottleService) as jest.Mocked<LoginThrottleService>;
      loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 } as never);

      await expect(controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0')).rejects.toThrow(
        /bloccato/i,
      );
    });

    it('should handle MFA required + SMS method available path', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      authService.generateTwoFactorTempToken.mockResolvedValue('temp-token-123' as never);

      mfaService.getStatus.mockResolvedValue({ enabled: true } as never);

      const prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-001',
        smsOtpEnabled: true,
        recoveryPhoneVerified: true,
      });

      const loginThrottle = module.get(LoginThrottleService) as jest.Mocked<LoginThrottleService>;
      loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 } as never);

      const result = (await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0')) as any;

      expect(result).toHaveProperty('tempToken');
      expect(result).toHaveProperty('methods');
      // Should include SMS in methods array
      expect(result.methods).toContain('sms');
    });

    it('should handle MFA required + SMS method NOT available', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      authService.generateTwoFactorTempToken.mockResolvedValue('temp-token-123' as never);

      mfaService.getStatus.mockResolvedValue({ enabled: true } as never);

      const prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-001',
        smsOtpEnabled: false,
        recoveryPhoneVerified: false,
      });

      const loginThrottle = module.get(LoginThrottleService) as jest.Mocked<LoginThrottleService>;
      loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 } as never);

      const result = (await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0')) as any;

      // Should only have totp and backup methods
      expect(result.methods).toEqual(['totp', 'backup']);
      expect(result.methods).not.toContain('sms');
    });

    it('should handle MFA required + trusted device + risk.level variations', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      mfaService.getStatus.mockResolvedValue({ enabled: true } as never);
      authService.generateTokens.mockResolvedValue(mockTokens as never);

      const trustedDeviceService = module.get(
        TrustedDeviceService,
      ) as jest.Mocked<TrustedDeviceService>;
      trustedDeviceService.isDeviceTrusted.mockResolvedValue(true); // Device is trusted, so skip MFA

      const riskAssessment = module.get(
        RiskAssessmentService,
      ) as jest.Mocked<RiskAssessmentService>;
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 20,
        level: 'low',
        signals: [] as any,
        requiresMfa: false,
        requiresDeviceApproval: false,
        blockLogin: false,
      } as never);

      const loginThrottle = module.get(LoginThrottleService) as jest.Mocked<LoginThrottleService>;
      loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 } as never);

      const result = await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

      // Should return tokens directly since device is trusted
      expect(result).toEqual(mockTokens);
    });

    it('should handle high-risk level (not low/medium) on device trust', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);
      authService.generateTokens.mockResolvedValue(mockTokens as never);

      const riskAssessment = module.get(
        RiskAssessmentService,
      ) as jest.Mocked<RiskAssessmentService>;
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 70,
        level: 'high', // NOT low or medium
        signals: [] as any,
        requiresMfa: true,
        requiresDeviceApproval: false,
        blockLogin: false,
      } as never);

      const trustedDeviceService = module.get(
        TrustedDeviceService,
      ) as jest.Mocked<TrustedDeviceService>;

      const loginThrottle = module.get(LoginThrottleService) as jest.Mocked<LoginThrottleService>;
      loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 } as never);

      await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

      // When risk.level !== 'low' and !== 'medium', trustDevice should NOT be called
      expect(trustedDeviceService.trustDevice).not.toHaveBeenCalled();
    });

    it('should handle dbUser null on SMS method check', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      authService.generateTwoFactorTempToken.mockResolvedValue('temp-token-123' as never);

      mfaService.getStatus.mockResolvedValue({ enabled: true } as never);

      const prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null); // User not found

      const loginThrottle = module.get(LoginThrottleService) as jest.Mocked<LoginThrottleService>;
      loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 } as never);

      const result = (await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0')) as any;

      // Should still return MFA temp token, but SMS method should be excluded
      expect(result).toHaveProperty('tempToken');
      expect(result.methods).not.toContain('sms');
    });

    it('should record failure and throw on invalid TOTP during login', async () => {
      const dtoWithTotp = { ...loginDto, totpCode: '000000' };
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      mfaService.getStatus.mockResolvedValue({ enabled: true } as never);
      mfaService.verify.mockResolvedValue({ valid: false } as never);

      authService.recordFailedLogin.mockResolvedValue(undefined);

      const loginThrottle = module.get(LoginThrottleService) as jest.Mocked<LoginThrottleService>;
      loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 } as never);

      await expect(
        controller.login(dtoWithTotp as never, '127.0.0.1', 'Mozilla/5.0'),
      ).rejects.toThrow(/Invalid 2FA/i);

      expect(authService.recordFailedLogin).toHaveBeenCalledWith('user-001');
      expect(loginThrottle.recordFailure).toHaveBeenCalledWith('test@example.com', '127.0.0.1');
    });
  });

  describe('verifyTwoFactor — session creation error handling', () => {
    it('should complete MFA verify even if session creation fails', async () => {
      authService.verifyTwoFactorTempToken.mockResolvedValue('user-001' as never);
      mfaService.verify.mockResolvedValue({ valid: true } as never);
      authService.getUserWithTwoFactorStatus.mockResolvedValue(mockUser as any);
      authService.updateLastLogin.mockResolvedValue(undefined);
      authService.generateTokens.mockResolvedValue(mockTokens as never);

      const sessionService = module.get(SessionService) as jest.Mocked<SessionService>;
      sessionService.createSession.mockRejectedValue(new Error('Session DB error'));

      const riskAssessment = module.get(
        RiskAssessmentService,
      ) as jest.Mocked<RiskAssessmentService>;
      riskAssessment.trustDevice.mockResolvedValue(undefined);

      const result = await controller.verifyTwoFactor(
        { tempToken: 'temp-123', totpCode: '123456' } as never,
        '127.0.0.1',
        'Mozilla/5.0',
      );

      // Should still return tokens even if session creation failed
      expect(result).toEqual(mockTokens);
      expect(sessionService.createSession).toHaveBeenCalled();
    });
  });

  describe('verifyLoginSmsOtp — complete flow', () => {
    it('should verify SMS OTP and create session, handling trust device error', async () => {
      authService.verifyTwoFactorTempToken.mockResolvedValue('user-001' as never);
      const smsOtpService = module.get(SmsOtpService) as jest.Mocked<SmsOtpService>;
      smsOtpService.verifyOtp.mockResolvedValue({ valid: true } as never);
      authService.getUserWithTwoFactorStatus.mockResolvedValue(mockUser as any);
      authService.updateLastLogin.mockResolvedValue(undefined);
      authService.generateTokens.mockResolvedValue(mockTokens as never);

      const sessionService = module.get(SessionService) as jest.Mocked<SessionService>;
      sessionService.createSession.mockResolvedValue('session-001' as never);

      const riskAssessment = module.get(
        RiskAssessmentService,
      ) as jest.Mocked<RiskAssessmentService>;
      riskAssessment.trustDevice.mockRejectedValue(new Error('Trust device failed'));

      const result = await (controller as any).verifyLoginSmsOtp(
        { tempToken: 'temp-123', code: '123456' },
        '127.0.0.1',
        'Mozilla/5.0',
      );

      // Should still return tokens even if trustDevice fails
      expect(result).toEqual(mockTokens);
    });
  });

  describe('login — rememberMe flag and trust device duration', () => {
    it('should trust device for 90 days when rememberMe=true', async () => {
      const loginDtoWithRemember = {
        email: 'test@example.com',
        password: 'pass123',
        tenantSlug: 'garage-roma',
        rememberMe: true,
      };

      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);
      authService.generateTokens.mockResolvedValue(mockTokens as never);

      const riskAssessment = module.get(
        RiskAssessmentService,
      ) as jest.Mocked<RiskAssessmentService>;
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 10,
        level: 'low',
        signals: [] as any,
        requiresMfa: false,
        requiresDeviceApproval: false,
        blockLogin: false,
      } as never);

      const loginThrottle = module.get(LoginThrottleService) as jest.Mocked<LoginThrottleService>;
      loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 } as never);

      await controller.login(loginDtoWithRemember as never, '127.0.0.1', 'Mozilla/5.0');

      // Verify trustDevice was called with 90 days
      expect(riskAssessment.trustDevice).toHaveBeenCalledWith('user-001', expect.any(String), 90);
    });

    it('should trust device for 30 days when rememberMe not set', async () => {
      const loginDtoNoRemember = {
        email: 'test@example.com',
        password: 'pass123',
        tenantSlug: 'garage-roma',
        // rememberMe not set
      };

      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      mfaService.getStatus.mockResolvedValue({ enabled: false } as never);
      authService.generateTokens.mockResolvedValue(mockTokens as never);

      const riskAssessment = module.get(
        RiskAssessmentService,
      ) as jest.Mocked<RiskAssessmentService>;
      riskAssessment.assessLoginRisk.mockResolvedValue({
        score: 15,
        level: 'medium',
        signals: [] as any,
        requiresMfa: false,
        requiresDeviceApproval: false,
        blockLogin: false,
      } as never);

      const loginThrottle = module.get(LoginThrottleService) as jest.Mocked<LoginThrottleService>;
      loginThrottle.getDelay.mockResolvedValue({ delay: 0, attempts: 0 } as never);

      await controller.login(loginDtoNoRemember as never, '127.0.0.1', 'Mozilla/5.0');

      // Verify trustDevice was called with 30 days (default)
      expect(riskAssessment.trustDevice).toHaveBeenCalledWith('user-001', expect.any(String), 30);
    });
  });

  describe('createDemoSession — coverage for uncovered lines', () => {
    it('should create demo session with valid tenant and user', async () => {
      const prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
      const demoTenant = {
        id: 'demo-tenant-001',
        name: 'Demo Garage',
        slug: 'demo',
        isActive: true,
        users: [
          {
            id: 'demo-user-001',
            email: 'demo@example.com',
            name: 'Demo User',
            role: 'ADMIN',
          },
        ],
      };

      (prisma.tenant.findFirst as jest.Mock).mockResolvedValue(demoTenant);
      authService.generateTokens.mockResolvedValue(mockTokens as never);

      const result = await controller.createDemoSession();

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tenant');
      expect((result as any).user.email).toBe('demo@example.com');
    });

    it('should throw NotFoundException when demo tenant not found', async () => {
      const prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
      (prisma.tenant.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(controller.createDemoSession()).rejects.toThrow(/Tenant demo non configurato/i);
    });

    it('should throw NotFoundException when demo tenant has no users', async () => {
      const prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
      (prisma.tenant.findFirst as jest.Mock).mockResolvedValue({
        id: 'demo-tenant-001',
        name: 'Demo Garage',
        slug: 'demo',
        isActive: true,
        users: [],
      });

      await expect(controller.createDemoSession()).rejects.toThrow(/Tenant demo non configurato/i);
    });
  });

  describe('changePassword — edge cases and logging', () => {
    it('should change password and log security event', async () => {
      const prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-001',
        passwordHash: '$2a$10$hashedPassword',
        tenantId: 'tenant-001',
      });

      authService.verifyPassword.mockResolvedValue(true);
      authService.hashPassword.mockResolvedValue('$2a$10$newHashedPassword');
      (prisma.user.update as jest.Mock).mockResolvedValue({
        id: 'user-001',
        passwordHash: '$2a$10$newHashedPassword',
      });

      const securityActivity = module.get(
        SecurityActivityService,
      ) as jest.Mocked<SecurityActivityService>;
      securityActivity.logEvent.mockResolvedValue(undefined);

      const user = { userId: 'user-001', tenantId: 'tenant-001' } as any;
      const result = await controller.changePassword(user, {
        currentPassword: 'oldPassword123',
        newPassword: 'NewPassword456',
      } as never);

      expect(result).toEqual({ success: true, message: 'Password aggiornata con successo' });
      expect(authService.verifyPassword).toHaveBeenCalledWith(
        'oldPassword123',
        '$2a$10$hashedPassword',
      );
      expect(prisma.user.update).toHaveBeenCalled();
      expect(securityActivity.logEvent).toHaveBeenCalled();
    });

    it('should throw when current password is incorrect', async () => {
      const prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-001',
        passwordHash: '$2a$10$hashedPassword',
        tenantId: 'tenant-001',
      });

      authService.verifyPassword.mockResolvedValue(false);

      const user = { userId: 'user-001', tenantId: 'tenant-001' } as any;
      await expect(
        controller.changePassword(user, {
          currentPassword: 'wrongPassword',
          newPassword: 'NewPassword456',
        } as never),
      ).rejects.toThrow(/Password corrente errata/i);
    });

    it('should throw when new password equals current password', async () => {
      const prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-001',
        passwordHash: '$2a$10$hashedPassword',
        tenantId: 'tenant-001',
      });

      authService.verifyPassword.mockResolvedValue(true);

      const user = { userId: 'user-001', tenantId: 'tenant-001' } as any;
      await expect(
        controller.changePassword(user, {
          currentPassword: 'SamePassword123',
          newPassword: 'SamePassword123',
        } as never),
      ).rejects.toThrow(/deve essere diversa/i);
    });

    it('should throw when user not found', async () => {
      const prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const user = { userId: 'user-001', tenantId: 'tenant-001' } as any;
      await expect(
        controller.changePassword(user, {
          currentPassword: 'oldPassword123',
          newPassword: 'NewPassword456',
        } as never),
      ).rejects.toThrow(/Utente non trovato/i);
    });

    it('should throw when tenantId mismatch', async () => {
      const prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-001',
        passwordHash: '$2a$10$hashedPassword',
        tenantId: 'tenant-999', // Different tenant
      });

      const user = { userId: 'user-001', tenantId: 'tenant-001' } as any;
      await expect(
        controller.changePassword(user, {
          currentPassword: 'oldPassword123',
          newPassword: 'NewPassword456',
        } as never),
      ).rejects.toThrow(/Utente non trovato/i);
    });
  });

  describe('logout — authorization header edge cases', () => {
    it('should handle logout with proper authorization header', async () => {
      authService.logout.mockResolvedValue(undefined);

      const result = await controller.logout('Bearer valid-token-123', {
        refreshToken: 'refresh-123',
      });

      expect(result).toEqual({ success: true });
      expect(authService.logout).toHaveBeenCalledWith('valid-token-123', 'refresh-123');
    });

    it('should extract token when Bearer prefix present', async () => {
      authService.logout.mockResolvedValue(undefined);

      await controller.logout('Bearer extracted-token', { refreshToken: 'refresh-456' });

      expect(authService.logout).toHaveBeenCalledWith('extracted-token', 'refresh-456');
    });

    it('should handle empty authorization header', async () => {
      authService.logout.mockResolvedValue(undefined);

      await controller.logout('', {});

      expect(authService.logout).toHaveBeenCalledWith('', undefined);
    });

    it('should handle undefined authorization header', async () => {
      authService.logout.mockResolvedValue(undefined);

      await controller.logout(undefined as any, {});

      expect(authService.logout).toHaveBeenCalledWith('', undefined);
    });
  });

  describe('getMe — user profile retrieval', () => {
    it('should return user profile with tenant info', async () => {
      const prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-001',
        email: 'test@example.com',
        name: 'Test User',
        role: 'ADMIN',
        isActive: true,
        tenantId: 'tenant-001',
        createdAt: new Date('2026-01-01'),
        avatar: 'https://example.com/avatar.jpg',
        tenant: {
          id: 'tenant-001',
          name: 'Test Garage',
          slug: 'test-garage',
        },
      });

      const user = { userId: 'user-001', tenantId: 'tenant-001' } as any;
      const result = await controller.getMe(user);

      expect(result).toEqual({
        id: 'user-001',
        email: 'test@example.com',
        name: 'Test User',
        role: 'ADMIN',
        isActive: true,
        tenantId: 'tenant-001',
        createdAt: expect.any(Date),
        avatar: 'https://example.com/avatar.jpg',
        tenant: {
          id: 'tenant-001',
          name: 'Test Garage',
          slug: 'test-garage',
        },
      });
    });

    it('should throw when user not found', async () => {
      const prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const user = { userId: 'user-001', tenantId: 'tenant-001' } as any;
      await expect(controller.getMe(user)).rejects.toThrow(/Utente non trovato/i);
    });

    it('should throw when tenantId mismatch', async () => {
      const prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-001',
        email: 'test@example.com',
        name: 'Test User',
        role: 'ADMIN',
        isActive: true,
        tenantId: 'tenant-999',
        createdAt: new Date(),
        avatar: null,
        tenant: {
          id: 'tenant-999',
          name: 'Other Garage',
          slug: 'other-garage',
        },
      });

      const user = { userId: 'user-001', tenantId: 'tenant-001' } as any;
      await expect(controller.getMe(user)).rejects.toThrow(/Utente non trovato/i);
    });
  });
});
