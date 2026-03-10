import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService, JwtPayload, UserWithTenant } from './auth.service';
import { PrismaService } from '@common/services/prisma.service';
import { LoggerService } from '@common/services/logger.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let prisma: PrismaService;
  let configService: ConfigService;
  let logger: LoggerService;

  const mockTenant = {
    id: 'tenant-uuid-1',
    name: 'Test Garage',
    slug: 'test-garage',
    isActive: true,
  };

  const mockUser = {
    id: 'user-uuid-1',
    email: 'mario@test.com',
    name: 'Mario Rossi',
    role: 'ADMIN',
    isActive: true,
    tenantId: 'tenant-uuid-1',
    passwordHash: '$2b$12$hashedpassword',
    totpEnabled: false,
    failedAttempts: 0,
    lockedUntil: null,
    lastLoginAt: null,
    lastLoginIp: null,
    tenant: mockTenant,
  };

  const mockUserWithTenant: UserWithTenant = {
    id: mockUser.id,
    email: mockUser.email,
    name: mockUser.name,
    role: mockUser.role,
    isActive: mockUser.isActive,
    tenantId: mockUser.tenantId,
    tenant: {
      id: mockTenant.id,
      name: mockTenant.name,
      slug: mockTenant.slug,
      isActive: mockTenant.isActive,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            tenant: {
              findUnique: jest.fn(),
            },
            user: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            authAuditLog: {
              create: jest.fn(),
            },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              const configMap: Record<string, string> = {
                JWT_SECRET: 'test-jwt-secret',
                JWT_REFRESH_SECRET: 'test-jwt-refresh-secret',
                JWT_EXPIRES_IN: '24h',
                JWT_REFRESH_EXPIRES_IN: '7d',
                JWT_EXPIRES_IN_SECONDS: '86400',
                JWT_2FA_SECRET: 'test-2fa-secret',
              };
              return configMap[key] ?? defaultValue;
            }),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    prisma = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
    logger = module.get<LoggerService>(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =========================================================================
  // validateUser()
  // =========================================================================
  describe('validateUser', () => {
    it('should return user with tenant info on valid credentials', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser(
        'mario@test.com',
        'correct-password',
        'test-garage',
      );

      expect(result).toEqual(mockUserWithTenant);
      expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { slug: 'test-garage' },
      });
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'mario@test.com', tenantId: 'tenant-uuid-1' },
        include: { tenant: true },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('correct-password', mockUser.passwordHash);
    });

    it('should throw UnauthorizedException when tenant is not found', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.validateUser('mario@test.com', 'password', 'nonexistent-slug'),
      ).rejects.toThrow(UnauthorizedException);

      await expect(
        service.validateUser('mario@test.com', 'password', 'nonexistent-slug'),
      ).rejects.toThrow('Invalid tenant or tenant is inactive');
    });

    it('should throw UnauthorizedException when tenant is inactive', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({
        ...mockTenant,
        isActive: false,
      });

      await expect(
        service.validateUser('mario@test.com', 'password', 'test-garage'),
      ).rejects.toThrow('Invalid tenant or tenant is inactive');
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.validateUser('unknown@test.com', 'password', 'test-garage'),
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(
        service.validateUser('mario@test.com', 'password', 'test-garage'),
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.validateUser('mario@test.com', 'wrong-password', 'test-garage'),
      ).rejects.toThrow('Invalid credentials');
    });

    it('should compare against empty string when passwordHash is null', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        ...mockUser,
        passwordHash: null,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.validateUser('mario@test.com', 'password', 'test-garage'),
      ).rejects.toThrow('Invalid credentials');

      expect(bcrypt.compare).toHaveBeenCalledWith('password', '');
    });
  });

  // =========================================================================
  // generateTokens()
  // =========================================================================
  describe('generateTokens', () => {
    it('should return access token, refresh token, and expiresIn', async () => {
      (jwtService.signAsync as jest.Mock)
        .mockResolvedValueOnce('mock-access-token')
        .mockResolvedValueOnce('mock-refresh-token');

      const result = await service.generateTokens(mockUserWithTenant);

      expect(result).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 86400,
      });
    });

    it('should create compound subject userId:tenantId in payload', async () => {
      (jwtService.signAsync as jest.Mock)
        .mockResolvedValueOnce('access')
        .mockResolvedValueOnce('refresh');

      await service.generateTokens(mockUserWithTenant);

      const expectedPayload: JwtPayload = {
        sub: 'user-uuid-1:tenant-uuid-1',
        email: 'mario@test.com',
        role: 'ADMIN',
        tenantId: 'tenant-uuid-1',
      };

      expect(jwtService.signAsync).toHaveBeenCalledWith(expectedPayload, {
        secret: 'test-jwt-secret',
        expiresIn: '24h',
      });
      expect(jwtService.signAsync).toHaveBeenCalledWith(expectedPayload, {
        secret: 'test-jwt-refresh-secret',
        expiresIn: '7d',
      });
    });

    it('should call signAsync twice (access + refresh)', async () => {
      (jwtService.signAsync as jest.Mock).mockResolvedValue('token');

      await service.generateTokens(mockUserWithTenant);

      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
    });

    it('should use config values for secrets and expiry', async () => {
      (jwtService.signAsync as jest.Mock).mockResolvedValue('token');

      await service.generateTokens(mockUserWithTenant);

      expect(configService.get).toHaveBeenCalledWith('JWT_SECRET');
      expect(configService.get).toHaveBeenCalledWith('JWT_REFRESH_SECRET');
      expect(configService.get).toHaveBeenCalledWith('JWT_EXPIRES_IN', '24h');
      expect(configService.get).toHaveBeenCalledWith('JWT_REFRESH_EXPIRES_IN', '7d');
      expect(configService.get).toHaveBeenCalledWith('JWT_EXPIRES_IN_SECONDS', '86400');
    });
  });

  // =========================================================================
  // refreshTokens()
  // =========================================================================
  describe('refreshTokens', () => {
    const mockPayload: JwtPayload = {
      sub: 'user-uuid-1:tenant-uuid-1',
      email: 'mario@test.com',
      role: 'ADMIN',
      tenantId: 'tenant-uuid-1',
    };

    it('should verify refresh token and return new token pair', async () => {
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue(mockPayload);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (jwtService.signAsync as jest.Mock)
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');

      const result = await service.refreshTokens('valid-refresh-token');

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 86400,
      });

      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-refresh-token', {
        secret: 'test-jwt-refresh-secret',
      });
    });

    it('should look up user by userId and tenantId from payload subject', async () => {
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue(mockPayload);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (jwtService.signAsync as jest.Mock).mockResolvedValue('token');

      await service.refreshTokens('valid-refresh-token');

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'user-uuid-1',
          tenantId: 'tenant-uuid-1',
          isActive: true,
        },
        include: { tenant: true },
      });
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      (jwtService.verifyAsync as jest.Mock).mockRejectedValue(new Error('jwt expired'));

      await expect(service.refreshTokens('expired-refresh-token')).rejects.toThrow(
        UnauthorizedException,
      );

      await expect(service.refreshTokens('expired-refresh-token')).rejects.toThrow(
        'Invalid refresh token',
      );

      expect(logger.error).toHaveBeenCalledWith('Token refresh failed', expect.any(String));
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue(mockPayload);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.refreshTokens('valid-refresh-token')).rejects.toThrow(
        'Invalid refresh token',
      );
    });

    it('should throw UnauthorizedException when tenant is inactive', async () => {
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue(mockPayload);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        ...mockUser,
        tenant: { ...mockTenant, isActive: false },
      });

      await expect(service.refreshTokens('valid-refresh-token')).rejects.toThrow(
        'Invalid refresh token',
      );
    });
  });

  // =========================================================================
  // extractTenantIdFromPayload()
  // =========================================================================
  describe('extractTenantIdFromPayload', () => {
    it('should return tenantId from explicit payload field', () => {
      const payload: JwtPayload = {
        sub: 'user-uuid-1:tenant-uuid-1',
        email: 'mario@test.com',
        role: 'ADMIN',
        tenantId: 'tenant-uuid-1',
      };

      expect(service.extractTenantIdFromPayload(payload)).toBe('tenant-uuid-1');
    });

    it('should fallback to parsing tenantId from subject when tenantId field is empty', () => {
      const payload = {
        sub: 'user-uuid-1:tenant-uuid-from-sub',
        email: 'mario@test.com',
        role: 'ADMIN',
        tenantId: '',
      } as JwtPayload;

      expect(service.extractTenantIdFromPayload(payload)).toBe('tenant-uuid-from-sub');
    });

    it('should throw UnauthorizedException when tenantId cannot be extracted', () => {
      const payload = {
        sub: 'user-uuid-only',
        email: 'mario@test.com',
        role: 'ADMIN',
        tenantId: '',
      } as JwtPayload;

      expect(() => service.extractTenantIdFromPayload(payload)).toThrow(UnauthorizedException);
      expect(() => service.extractTenantIdFromPayload(payload)).toThrow(
        'Invalid token: tenant ID not found',
      );
    });
  });

  // =========================================================================
  // extractUserIdFromPayload()
  // =========================================================================
  describe('extractUserIdFromPayload', () => {
    it('should return userId from subject before the colon', () => {
      const payload: JwtPayload = {
        sub: 'user-uuid-1:tenant-uuid-1',
        email: 'mario@test.com',
        role: 'ADMIN',
        tenantId: 'tenant-uuid-1',
      };

      expect(service.extractUserIdFromPayload(payload)).toBe('user-uuid-1');
    });

    it('should return full subject if no colon is present', () => {
      const payload = {
        sub: 'user-uuid-only',
        email: 'mario@test.com',
        role: 'ADMIN',
        tenantId: 'tenant-uuid-1',
      } as JwtPayload;

      expect(service.extractUserIdFromPayload(payload)).toBe('user-uuid-only');
    });
  });

  // =========================================================================
  // recordFailedLogin()
  // =========================================================================
  describe('recordFailedLogin', () => {
    it('should increment failedAttempts by 1', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValue({
        failedAttempts: 1,
      });

      await service.recordFailedLogin('user-uuid-1');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-uuid-1' },
        data: { failedAttempts: { increment: 1 } },
        select: { failedAttempts: true },
      });
    });

    it('should log a warning with attempt count', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValue({
        failedAttempts: 3,
      });

      await service.recordFailedLogin('user-uuid-1');

      expect(logger.warn).toHaveBeenCalledWith(
        'Failed login attempt for user user-uuid-1 (attempt 3/5)',
      );
    });

    it('should NOT lock account when failedAttempts is below threshold', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValue({
        failedAttempts: 4,
      });

      await service.recordFailedLogin('user-uuid-1');

      // update should be called only once (the increment call)
      expect(prisma.user.update).toHaveBeenCalledTimes(1);
    });

    it('should lock account when failedAttempts reaches 5', async () => {
      (prisma.user.update as jest.Mock)
        .mockResolvedValueOnce({ failedAttempts: 5 }) // increment call
        .mockResolvedValueOnce({}); // lock call

      const beforeTest = Date.now();
      await service.recordFailedLogin('user-uuid-1');
      const afterTest = Date.now();

      expect(prisma.user.update).toHaveBeenCalledTimes(2);

      const lockCall = (prisma.user.update as jest.Mock).mock.calls[1];
      expect(lockCall[0].where).toEqual({ id: 'user-uuid-1' });

      const lockedUntil = lockCall[0].data.lockedUntil as Date;
      // lockedUntil should be ~15 minutes in the future
      const fifteenMinutesMs = 15 * 60 * 1000;
      expect(lockedUntil.getTime()).toBeGreaterThanOrEqual(beforeTest + fifteenMinutesMs);
      expect(lockedUntil.getTime()).toBeLessThanOrEqual(afterTest + fifteenMinutesMs);
    });

    it('should lock account when failedAttempts exceeds 5', async () => {
      (prisma.user.update as jest.Mock)
        .mockResolvedValueOnce({ failedAttempts: 7 })
        .mockResolvedValueOnce({});

      await service.recordFailedLogin('user-uuid-1');

      expect(prisma.user.update).toHaveBeenCalledTimes(2);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Account locked for user user-uuid-1'),
      );
    });
  });

  // =========================================================================
  // resetFailedAttempts()
  // =========================================================================
  describe('resetFailedAttempts', () => {
    it('should reset failedAttempts to 0 and clear lockedUntil', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      await service.resetFailedAttempts('user-uuid-1');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-uuid-1' },
        data: { failedAttempts: 0, lockedUntil: null },
      });
    });
  });

  // =========================================================================
  // isAccountLocked()
  // =========================================================================
  describe('isAccountLocked', () => {
    it('should return locked: false when lockedUntil is null', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        lockedUntil: null,
      });

      const result = await service.isAccountLocked('user-uuid-1');

      expect(result).toEqual({ locked: false });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-uuid-1' },
        select: { lockedUntil: true },
      });
    });

    it('should return locked: false when user is not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.isAccountLocked('user-uuid-1');

      expect(result).toEqual({ locked: false });
    });

    it('should return locked: true with until date when lock is active', async () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000); // 10 min in future
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        lockedUntil: futureDate,
      });

      const result = await service.isAccountLocked('user-uuid-1');

      expect(result).toEqual({ locked: true, until: futureDate });
    });

    it('should clear expired lock and return locked: false', async () => {
      const pastDate = new Date(Date.now() - 5 * 60 * 1000); // 5 min in past
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        lockedUntil: pastDate,
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await service.isAccountLocked('user-uuid-1');

      expect(result).toEqual({ locked: false });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-uuid-1' },
        data: { lockedUntil: null },
      });
    });
  });

  // =========================================================================
  // hashPassword()
  // =========================================================================
  describe('hashPassword', () => {
    it('should hash password with 12 salt rounds', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const result = await service.hashPassword('my-secure-password');

      expect(result).toBe('hashed-password');
      expect(bcrypt.hash).toHaveBeenCalledWith('my-secure-password', 12);
    });
  });

  // =========================================================================
  // verifyPassword()
  // =========================================================================
  describe('verifyPassword', () => {
    it('should return true when password matches hash', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.verifyPassword('password', 'hash');

      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith('password', 'hash');
    });

    it('should return false when password does not match hash', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.verifyPassword('wrong', 'hash');

      expect(result).toBe(false);
    });
  });

  // =========================================================================
  // generateTwoFactorTempToken()
  // =========================================================================
  describe('generateTwoFactorTempToken', () => {
    it('should generate a short-lived 2FA pending token', async () => {
      (jwtService.signAsync as jest.Mock).mockResolvedValue('2fa-temp-token');

      const result = await service.generateTwoFactorTempToken('user-uuid-1');

      expect(result).toBe('2fa-temp-token');
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'user-uuid-1',
          type: '2fa_pending',
          iat: expect.any(Number),
        }),
        {
          secret: 'test-2fa-secret',
          expiresIn: '5m',
        },
      );
    });
  });

  // =========================================================================
  // verifyTwoFactorTempToken()
  // =========================================================================
  describe('verifyTwoFactorTempToken', () => {
    it('should return userId for valid 2FA pending token', async () => {
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue({
        sub: 'user-uuid-1',
        type: '2fa_pending',
      });

      const result = await service.verifyTwoFactorTempToken('valid-2fa-token');

      expect(result).toBe('user-uuid-1');
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-2fa-token', {
        secret: 'test-2fa-secret',
      });
    });

    it('should throw UnauthorizedException for wrong token type', async () => {
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue({
        sub: 'user-uuid-1',
        type: 'not_2fa',
      });

      await expect(service.verifyTwoFactorTempToken('wrong-type-token')).rejects.toThrow(
        'Invalid or expired 2FA token',
      );
    });

    it('should throw UnauthorizedException for expired token', async () => {
      (jwtService.verifyAsync as jest.Mock).mockRejectedValue(new Error('jwt expired'));

      await expect(service.verifyTwoFactorTempToken('expired-token')).rejects.toThrow(
        'Invalid or expired 2FA token',
      );
    });
  });

  // =========================================================================
  // getUserWithTwoFactorStatus()
  // =========================================================================
  describe('getUserWithTwoFactorStatus', () => {
    it('should return user with totpEnabled field', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.getUserWithTwoFactorStatus('user-uuid-1');

      expect(result).toEqual({
        ...mockUserWithTenant,
        totpEnabled: false,
      });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-uuid-1' },
        include: { tenant: true },
      });
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getUserWithTwoFactorStatus('nonexistent')).rejects.toThrow(
        'User not found or inactive',
      );
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(service.getUserWithTwoFactorStatus('user-uuid-1')).rejects.toThrow(
        'User not found or inactive',
      );
    });

    it('should throw UnauthorizedException when tenant is inactive', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        tenant: { ...mockTenant, isActive: false },
      });

      await expect(service.getUserWithTwoFactorStatus('user-uuid-1')).rejects.toThrow(
        'User not found or inactive',
      );
    });
  });

  // =========================================================================
  // updateLastLogin()
  // =========================================================================
  describe('updateLastLogin', () => {
    it('should update lastLoginAt and lastLoginIp', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const beforeTest = new Date();
      await service.updateLastLogin('user-uuid-1', '192.168.1.1');
      const afterTest = new Date();

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-uuid-1' },
        data: {
          lastLoginAt: expect.any(Date),
          lastLoginIp: '192.168.1.1',
        },
      });

      const callData = (prisma.user.update as jest.Mock).mock.calls[0][0].data;
      expect(callData.lastLoginAt.getTime()).toBeGreaterThanOrEqual(beforeTest.getTime());
      expect(callData.lastLoginAt.getTime()).toBeLessThanOrEqual(afterTest.getTime());
    });

    it('should set lastLoginIp to undefined when ip is not provided', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      await service.updateLastLogin('user-uuid-1');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-uuid-1' },
        data: {
          lastLoginAt: expect.any(Date),
          lastLoginIp: undefined,
        },
      });
    });
  });

  // =========================================================================
  // validateApiKey()
  // =========================================================================
  describe('validateApiKey', () => {
    it('should return invalid result for malformed API key', async () => {
      const result = await service.validateApiKey('some-api-key');

      // API key format requires mk_tenantId_secret (3+ parts starting with 'mk')
      expect(result).toEqual({ tenantId: '', valid: false });
    });
  });

  // =========================================================================
  // logAdminAction()
  // =========================================================================
  describe('logAdminAction', () => {
    it('should log admin action and create audit log entry', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        tenantId: 'tenant-uuid-1',
      });
      (prisma.authAuditLog.create as jest.Mock).mockResolvedValue({});

      const action = {
        adminId: 'admin-uuid-1',
        action: 'disable_user',
        targetUserId: 'user-uuid-2',
        metadata: { reason: 'policy violation' },
        timestamp: new Date('2024-01-15T10:00:00Z'),
      };

      await service.logAdminAction(action);

      expect(logger.warn).toHaveBeenCalledWith(
        'Admin action: disable_user by admin admin-uuid-1 on user user-uuid-2',
      );
      expect(prisma.authAuditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'admin-uuid-1',
          tenantId: 'tenant-uuid-1',
          action: 'admin_action',
          status: 'success',
          details: action,
        },
      });
    });

    it('should log admin action without targetUserId', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        tenantId: 'tenant-uuid-1',
      });
      (prisma.authAuditLog.create as jest.Mock).mockResolvedValue({});

      const action = {
        adminId: 'admin-uuid-1',
        action: 'export_data',
        timestamp: new Date('2024-01-15T10:00:00Z'),
      };

      await service.logAdminAction(action);

      expect(logger.warn).toHaveBeenCalledWith('Admin action: export_data by admin admin-uuid-1');
    });

    it('should throw when admin user is not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const action = {
        adminId: 'nonexistent-admin',
        action: 'some_action',
        timestamp: new Date(),
      };

      await expect(service.logAdminAction(action)).rejects.toThrow(UnauthorizedException);
    });
  });
});
