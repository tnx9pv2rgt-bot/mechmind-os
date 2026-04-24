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
        signals: ['impossible_travel'],
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
        signals: ['new_device'],
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

      const result = await controller.revokeSession(user as never, { sessionId: 'session-123' } as never);

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

      const result = await controller.revokeOtherSessions(user as never, { currentSessionId: 'current-session' } as never);

      expect(result).toEqual({ success: true, count: 3 });
      expect(sessionService.revokeAllOtherSessions).toHaveBeenCalledWith('user-001', 'current-session');
    });

    it('should handle no other sessions', async () => {
      const sessionService = module.get(SessionService) as any;
      sessionService.revokeAllOtherSessions.mockResolvedValue(0);

      const result = await controller.revokeOtherSessions(user as never, { currentSessionId: 'current-session' } as never);

      expect(result).toEqual({ success: true, count: 0 });
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

      const result = await controller.login(loginDto as never, '127.0.0.1', 'Mozilla/5.0');

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
      await expect(controller.verifyTwoFactor(dto as never, '127.0.0.1')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when MFA code is invalid', async () => {
      const authService = module.get(AuthService) as any;
      const mfaService = module.get(MfaService) as any;

      authService.verifyTwoFactorTempToken.mockResolvedValue('user-001' as never);
      mfaService.verify.mockRejectedValue(new UnauthorizedException('Invalid TOTP code'));

      const dto = { tempToken: 'temp-123', code: '000000' };
      await expect(controller.verifyTwoFactor(dto as never, '127.0.0.1')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('createDemoSession — Validation', () => {
    it('should throw NotFoundException when demo tenant does not exist', async () => {
      const prismaService = module.get(PrismaService) as any;

      prismaService.tenant.findFirst.mockResolvedValue(null);

      await expect(controller.createDemoSession({} as never)).rejects.toThrow(NotFoundException);
    });
  });
});
