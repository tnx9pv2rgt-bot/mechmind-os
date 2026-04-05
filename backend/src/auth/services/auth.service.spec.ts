import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as argon2 from 'argon2';
import { AuthService, JwtPayload, UserWithTenant } from './auth.service';
import { TokenBlacklistService } from './token-blacklist.service';
import { PasswordPolicyService } from './password-policy.service';
import { JwksService } from './jwks.service';
import { PrismaService } from '@common/services/prisma.service';
import { LoggerService } from '@common/services/logger.service';
import { MetricsService } from '@common/metrics/metrics.service';

jest.mock('bcrypt');
jest.mock('argon2');

describe('AuthService', () => {
  let module: TestingModule;
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
    module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verifyAsync: jest.fn(),
            decode: jest.fn(),
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
            session: {
              updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            },
            setTenantContext: jest.fn().mockResolvedValue(undefined),
            clearTenantContext: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              const configMap: Record<string, string> = {
                JWT_SECRET: 'test-jwt-secret',
                JWT_REFRESH_SECRET: 'test-jwt-refresh-secret',
                JWT_EXPIRES_IN: '15m',
                JWT_REFRESH_EXPIRES_IN: '7d',
                JWT_EXPIRES_IN_SECONDS: '900',
                JWT_2FA_SECRET: 'test-2fa-secret',
              };
              return configMap[key] ?? defaultValue;
            }),
          },
        },
        {
          provide: TokenBlacklistService,
          useValue: {
            blacklistToken: jest.fn(),
            isBlacklisted: jest.fn().mockResolvedValue(false),
            invalidateAllUserSessions: jest.fn(),
            isSessionValid: jest.fn().mockResolvedValue(true),
            markRefreshTokenUsed: jest.fn().mockResolvedValue(false),
            invalidateRefreshFamily: jest.fn(),
            isRefreshFamilyRevoked: jest.fn().mockResolvedValue(false),
          },
        },
        {
          provide: PasswordPolicyService,
          useValue: {
            validatePassword: jest.fn().mockResolvedValue({ valid: true, strength: 'strong' }),
            checkBreachedPassword: jest.fn().mockResolvedValue({ breached: false, count: 0 }),
          },
        },
        {
          provide: JwksService,
          useValue: {
            isAsymmetricEnabled: jest.fn().mockReturnValue(false),
            getSigningKey: jest.fn().mockReturnValue(null),
            getSigningOptions: jest.fn().mockReturnValue({
              algorithm: 'HS256',
              secret: 'test-jwt-secret',
            }),
            getPassportJwtOptions: jest.fn().mockReturnValue({
              algorithms: ['HS256'],
              secretOrKey: 'test-jwt-secret',
            }),
            getJwks: jest.fn().mockReturnValue({ keys: [] }),
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
        {
          provide: MetricsService,
          useValue: {
            authFailuresTotal: { inc: jest.fn() },
            httpRequestsTotal: { inc: jest.fn() },
            httpRequestDuration: { observe: jest.fn() },
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
      (argon2.hash as jest.Mock).mockResolvedValue('$argon2id$v=19$migrated-hash');
      (prisma.user.update as jest.Mock).mockResolvedValue({});

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
      expect(bcrypt.compare).toHaveBeenCalledWith('correct-password', '$2b$12$hashedpassword');
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

    it('should reject login when passwordHash is null (no bcrypt call needed)', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        ...mockUser,
        passwordHash: null,
      });

      await expect(
        service.validateUser('mario@test.com', 'password', 'test-garage'),
      ).rejects.toThrow('Invalid credentials');

      // verifyAndMigratePassword returns { valid: false } for empty hash
      // without calling bcrypt or argon2
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // generateTokens()
  // =========================================================================
  describe('generateTokens', () => {
    it('should return access token, refresh token, and expiresIn (15min default)', async () => {
      (jwtService.signAsync as jest.Mock)
        .mockResolvedValueOnce('mock-access-token')
        .mockResolvedValueOnce('mock-refresh-token');

      const result = await service.generateTokens(mockUserWithTenant);

      expect(result).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 900,
      });
    });

    it('should create compound subject userId:tenantId in payload', async () => {
      (jwtService.signAsync as jest.Mock)
        .mockResolvedValueOnce('access')
        .mockResolvedValueOnce('refresh');

      await service.generateTokens(mockUserWithTenant);

      // Verify first call (access token) has correct payload structure
      const firstCall = (jwtService.signAsync as jest.Mock).mock.calls[0];
      expect(firstCall[0]).toEqual(
        expect.objectContaining({
          sub: 'user-uuid-1:tenant-uuid-1',
          email: 'mario@test.com',
          role: 'ADMIN',
          tenantId: 'tenant-uuid-1',
        }),
      );
      expect(firstCall[0].jti).toBeDefined();
      expect(firstCall[0]).not.toHaveProperty('familyId'); // access token has no familyId
      expect(firstCall[1]).toEqual({
        secret: 'test-jwt-secret',
        expiresIn: '15m',
      });

      // Verify second call (refresh token) has familyId
      const secondCall = (jwtService.signAsync as jest.Mock).mock.calls[1];
      expect(secondCall[0].familyId).toBeDefined();
      expect(secondCall[1]).toEqual({
        secret: 'test-jwt-refresh-secret',
        expiresIn: '7d',
      });
    });

    it('should reuse provided familyId for refresh token rotation', async () => {
      (jwtService.signAsync as jest.Mock).mockResolvedValue('token');

      await service.generateTokens(mockUserWithTenant, 'existing-family-id');

      const refreshCall = (jwtService.signAsync as jest.Mock).mock.calls[1];
      expect(refreshCall[0].familyId).toBe('existing-family-id');
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
      expect(configService.get).toHaveBeenCalledWith('JWT_EXPIRES_IN', '15m');
      expect(configService.get).toHaveBeenCalledWith('JWT_REFRESH_EXPIRES_IN', '7d');
      expect(configService.get).toHaveBeenCalledWith('JWT_EXPIRES_IN_SECONDS', '900');
    });
  });

  // =========================================================================
  // refreshTokens()
  // =========================================================================
  describe('refreshTokens', () => {
    let tokenBlacklist: TokenBlacklistService;

    const mockPayload: JwtPayload = {
      sub: 'user-uuid-1:tenant-uuid-1',
      email: 'mario@test.com',
      role: 'ADMIN',
      tenantId: 'tenant-uuid-1',
      jti: 'refresh-jti-1',
      familyId: 'family-1',
    };

    beforeEach(() => {
      tokenBlacklist = module.get(TokenBlacklistService);
    });

    it('should verify refresh token and return new rotated token pair', async () => {
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue(mockPayload);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (jwtService.signAsync as jest.Mock)
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');

      const result = await service.refreshTokens('valid-refresh-token');

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 900,
      });

      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-refresh-token', {
        secret: 'test-jwt-refresh-secret',
      });

      // Should mark the old refresh token JTI as used
      expect(tokenBlacklist.markRefreshTokenUsed).toHaveBeenCalledWith('refresh-jti-1', 'family-1');
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
    });

    it('should detect reuse and invalidate all sessions', async () => {
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue(mockPayload);
      (tokenBlacklist.markRefreshTokenUsed as jest.Mock).mockResolvedValue(true); // REUSE

      await expect(service.refreshTokens('reused-refresh-token')).rejects.toThrow(
        'Token reuse detected',
      );

      expect(tokenBlacklist.invalidateRefreshFamily).toHaveBeenCalledWith('family-1');
      expect(tokenBlacklist.invalidateAllUserSessions).toHaveBeenCalledWith('user-uuid-1');
    });

    it('should reject if refresh token family is revoked', async () => {
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue(mockPayload);
      (tokenBlacklist.isRefreshFamilyRevoked as jest.Mock).mockResolvedValue(true);

      await expect(service.refreshTokens('revoked-family-token')).rejects.toThrow(
        'Session revoked',
      );
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue(mockPayload);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.refreshTokens('valid-refresh-token')).rejects.toThrow(
        'User or tenant is no longer active',
      );
    });

    it('should throw UnauthorizedException when tenant is inactive', async () => {
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue(mockPayload);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        ...mockUser,
        tenant: { ...mockTenant, isActive: false },
      });

      await expect(service.refreshTokens('valid-refresh-token')).rejects.toThrow(
        'User or tenant is no longer active',
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
    it('should hash password with Argon2id', async () => {
      (argon2.hash as jest.Mock).mockResolvedValue('$argon2id$v=19$m=47104,t=1,p=1$hash');

      const result = await service.hashPassword('my-secure-password');

      expect(result).toBe('$argon2id$v=19$m=47104,t=1,p=1$hash');
      expect(argon2.hash).toHaveBeenCalledWith('my-secure-password', {
        type: argon2.argon2id,
        memoryCost: 47104,
        timeCost: 1,
        parallelism: 1,
        hashLength: 32,
      });
    });
  });

  describe('verifyAndMigratePassword', () => {
    it('should verify bcrypt hash and return new argon2id hash for migration', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (argon2.hash as jest.Mock).mockResolvedValue('$argon2id$migrated');

      const result = await service.verifyAndMigratePassword('password', '$2b$12$oldhash');

      expect(result.valid).toBe(true);
      expect(result.newHash).toBe('$argon2id$migrated');
    });

    it('should verify argon2id hash without migration', async () => {
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      const result = await service.verifyAndMigratePassword('password', '$argon2id$v=19$hash');

      expect(result.valid).toBe(true);
      expect(result.newHash).toBeUndefined();
    });

    it('should return invalid for wrong bcrypt password', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.verifyAndMigratePassword('wrong', '$2b$12$oldhash');

      expect(result.valid).toBe(false);
    });

    it('should return invalid for empty hash', async () => {
      const result = await service.verifyAndMigratePassword('password', '');

      expect(result.valid).toBe(false);
    });
  });

  // =========================================================================
  // verifyPassword()
  // =========================================================================
  describe('verifyPassword', () => {
    it('should verify bcrypt hash', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.verifyPassword('password', '$2b$12$hash');

      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith('password', '$2b$12$hash');
    });

    it('should verify argon2id hash', async () => {
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      const result = await service.verifyPassword('password', '$argon2id$v=19$hash');

      expect(result).toBe(true);
      expect(argon2.verify).toHaveBeenCalledWith('$argon2id$v=19$hash', 'password');
    });

    it('should return false when password does not match', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.verifyPassword('wrong', '$2b$12$hash');

      expect(result).toBe(false);
    });

    it('should return false for empty hash', async () => {
      const result = await service.verifyPassword('password', '');
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
    it('should return invalid result for empty API key', async () => {
      const result = await service.validateApiKey('');
      expect(result).toEqual({ tenantId: '', valid: false });
    });

    it('should return invalid result for malformed API key (no mk prefix)', async () => {
      const result = await service.validateApiKey('some-api-key');
      expect(result).toEqual({ tenantId: '', valid: false });
    });

    it('should return invalid result for API key with wrong prefix', async () => {
      const result = await service.validateApiKey('xx_tenant1_secret');
      expect(result).toEqual({ tenantId: '', valid: false });
    });

    it('should return invalid result when tenant is not found', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.validateApiKey('mk_tenant1_secret');
      expect(result).toEqual({ tenantId: '', valid: false });
    });

    it('should return invalid result when tenant is inactive', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({
        id: 'tenant1',
        isActive: false,
        apiKeyHash: '$2b$12$hash',
      });

      const result = await service.validateApiKey('mk_tenant1_secret');
      expect(result).toEqual({ tenantId: '', valid: false });
    });

    it('should return invalid result when tenant has no apiKeyHash', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({
        id: 'tenant1',
        isActive: true,
        apiKeyHash: null,
      });

      const result = await service.validateApiKey('mk_tenant1_secret');
      expect(result).toEqual({ tenantId: '', valid: false });
    });

    it('should return valid result when API key matches hash', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({
        id: 'tenant1',
        isActive: true,
        apiKeyHash: '$2b$12$validhash',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateApiKey('mk_tenant1_secretvalue');
      expect(result).toEqual({ tenantId: 'tenant1', valid: true });
      expect(bcrypt.compare).toHaveBeenCalledWith('mk_tenant1_secretvalue', '$2b$12$validhash');
    });

    it('should return invalid result when API key does not match hash', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({
        id: 'tenant1',
        isActive: true,
        apiKeyHash: '$2b$12$validhash',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateApiKey('mk_tenant1_wrongsecret');
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

  // =========================================================================
  // logAuthEvent()
  // =========================================================================
  describe('logAuthEvent', () => {
    it('should create audit log entry', async () => {
      (prisma.authAuditLog.create as jest.Mock).mockResolvedValue({});

      await service.logAuthEvent({
        userId: 'user-uuid-1',
        tenantId: 'tenant-uuid-1',
        action: 'login',
        status: 'success',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        details: { method: 'password' },
      });

      expect(prisma.authAuditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-uuid-1',
          tenantId: 'tenant-uuid-1',
          action: 'login',
          status: 'success',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          details: { method: 'password' },
        },
      });
    });

    it('should use empty object when details is undefined', async () => {
      (prisma.authAuditLog.create as jest.Mock).mockResolvedValue({});

      await service.logAuthEvent({
        tenantId: 'tenant-uuid-1',
        action: 'logout',
        status: 'success',
      });

      expect(prisma.authAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          details: {},
        }),
      });
    });

    it('should not throw when audit log creation fails', async () => {
      (prisma.authAuditLog.create as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(
        service.logAuthEvent({
          tenantId: 'tenant-uuid-1',
          action: 'login',
          status: 'failed',
        }),
      ).resolves.toBeUndefined();

      expect(logger.error).toHaveBeenCalledWith('Failed to log auth event', expect.any(String));
    });

    it('should log failed and blocked statuses', async () => {
      (prisma.authAuditLog.create as jest.Mock).mockResolvedValue({});

      await service.logAuthEvent({
        tenantId: 'tenant-uuid-1',
        action: 'login',
        status: 'blocked',
        details: { reason: 'account_locked' },
      });

      expect(prisma.authAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'blocked',
        }),
      });
    });
  });

  // =========================================================================
  // findUserByEmailAndTenant()
  // =========================================================================
  describe('findUserByEmailAndTenant', () => {
    it('should return user when found and active', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.findUserByEmailAndTenant('mario@test.com', 'tenant-uuid-1');

      expect(result).toEqual(mockUserWithTenant);
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'mario@test.com', tenantId: 'tenant-uuid-1', isActive: true },
        include: { tenant: true },
      });
    });

    it('should return null when user not found', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.findUserByEmailAndTenant('unknown@test.com', 'tenant-uuid-1');

      expect(result).toBeNull();
    });

    it('should return null when tenant is inactive', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        ...mockUser,
        tenant: { ...mockTenant, isActive: false },
      });

      const result = await service.findUserByEmailAndTenant('mario@test.com', 'tenant-uuid-1');

      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // logout()
  // =========================================================================
  describe('logout', () => {
    let tokenBlacklist: TokenBlacklistService;

    beforeEach(() => {
      tokenBlacklist = module.get(TokenBlacklistService);
    });

    it('should blacklist access token jti with correct TTL', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 600; // 10 min from now
      const payload = { sub: 'u1:t1', jti: 'access-jti', exp: futureExp };
      (jwtService.decode as jest.Mock) = jest.fn().mockReturnValue(payload);

      await service.logout('access-token');

      expect(tokenBlacklist.blacklistToken).toHaveBeenCalledWith('access-jti', expect.any(Number));
    });

    it('should also invalidate refresh token family when refreshToken is provided', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 600;
      const accessPayload = { sub: 'u1:t1', jti: 'access-jti', exp: futureExp };
      const refreshPayload = {
        sub: 'u1:t1',
        jti: 'refresh-jti',
        exp: futureExp,
        familyId: 'family-1',
      };

      (jwtService.decode as jest.Mock) = jest
        .fn()
        .mockReturnValueOnce(accessPayload) // first call for access token
        .mockReturnValueOnce(refreshPayload); // second call for refresh token

      (prisma.session.updateMany as jest.Mock) = jest.fn().mockResolvedValue({ count: 1 });

      await service.logout('access-token', 'refresh-token');

      expect(tokenBlacklist.invalidateRefreshFamily).toHaveBeenCalledWith('family-1');
      expect(tokenBlacklist.blacklistToken).toHaveBeenCalledTimes(2);
    });

    it('should not blacklist when token has no jti', async () => {
      (jwtService.decode as jest.Mock) = jest.fn().mockReturnValue({ sub: 'u1:t1' });

      await service.logout('no-jti-token');

      expect(tokenBlacklist.blacklistToken).not.toHaveBeenCalled();
    });

    it('should not blacklist when TTL is zero or negative (expired token)', async () => {
      const pastExp = Math.floor(Date.now() / 1000) - 100;
      (jwtService.decode as jest.Mock) = jest.fn().mockReturnValue({
        sub: 'u1:t1',
        jti: 'expired-jti',
        exp: pastExp,
      });

      await service.logout('expired-token');

      expect(tokenBlacklist.blacklistToken).not.toHaveBeenCalled();
    });

    it('should deactivate session in DB when payload has sub', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 600;
      (jwtService.decode as jest.Mock) = jest.fn().mockReturnValue({
        sub: 'u1:t1',
        jti: 'jti-1',
        exp: futureExp,
      });
      (prisma.session.updateMany as jest.Mock) = jest.fn().mockResolvedValue({ count: 1 });

      await service.logout('access-token');

      expect(prisma.session.updateMany).toHaveBeenCalledWith({
        where: { jwtToken: 'access-token', userId: 'u1', isActive: true },
        data: {
          isActive: false,
          revokedAt: expect.any(Date),
          revokedReason: 'logout',
        },
      });
    });

    it('should not throw when decode throws (token already invalid)', async () => {
      (jwtService.decode as jest.Mock) = jest.fn().mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.logout('garbage-token')).resolves.toBeUndefined();
    });

    it('should continue when refresh token parsing fails', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 600;
      (jwtService.decode as jest.Mock) = jest
        .fn()
        .mockReturnValueOnce({ sub: 'u1:t1', jti: 'access-jti', exp: futureExp })
        .mockImplementationOnce(() => {
          throw new Error('Bad refresh');
        });

      (prisma.session.updateMany as jest.Mock) = jest.fn().mockResolvedValue({ count: 1 });

      // Should not throw
      await expect(service.logout('access-token', 'bad-refresh')).resolves.toBeUndefined();

      // Access token should still be blacklisted
      expect(tokenBlacklist.blacklistToken).toHaveBeenCalledWith('access-jti', expect.any(Number));
    });
  });

  // =========================================================================
  // invalidateAllSessions()
  // =========================================================================
  describe('invalidateAllSessions', () => {
    it('should delegate to tokenBlacklist.invalidateAllUserSessions', async () => {
      const tokenBlacklist = module.get(TokenBlacklistService);

      await service.invalidateAllSessions('user-uuid-1');

      expect(tokenBlacklist.invalidateAllUserSessions).toHaveBeenCalledWith('user-uuid-1');
    });
  });

  // =========================================================================
  // isTokenValid()
  // =========================================================================
  describe('isTokenValid', () => {
    let tokenBlacklist: TokenBlacklistService;

    beforeEach(() => {
      tokenBlacklist = module.get(TokenBlacklistService);
    });

    it('should return false when token JTI is blacklisted', async () => {
      (tokenBlacklist.isBlacklisted as jest.Mock).mockResolvedValue(true);

      const result = await service.isTokenValid({
        sub: 'u1:t1',
        email: 'a@b.com',
        role: 'ADMIN',
        tenantId: 't1',
        jti: 'blacklisted-jti',
        iat: 1000,
      });

      expect(result).toBe(false);
    });

    it('should return true when token is not blacklisted and session is valid', async () => {
      (tokenBlacklist.isBlacklisted as jest.Mock).mockResolvedValue(false);
      (tokenBlacklist.isSessionValid as jest.Mock).mockResolvedValue(true);

      const result = await service.isTokenValid({
        sub: 'u1:t1',
        email: 'a@b.com',
        role: 'ADMIN',
        tenantId: 't1',
        jti: 'valid-jti',
        iat: 1000,
      });

      expect(result).toBe(true);
    });

    it('should return false when session is invalidated', async () => {
      (tokenBlacklist.isBlacklisted as jest.Mock).mockResolvedValue(false);
      (tokenBlacklist.isSessionValid as jest.Mock).mockResolvedValue(false);

      const result = await service.isTokenValid({
        sub: 'u1:t1',
        email: 'a@b.com',
        role: 'ADMIN',
        tenantId: 't1',
        jti: 'valid-jti',
        iat: 1000,
      });

      expect(result).toBe(false);
    });

    it('should check session validity even when jti is undefined', async () => {
      (tokenBlacklist.isSessionValid as jest.Mock).mockResolvedValue(true);

      const result = await service.isTokenValid({
        sub: 'u1:t1',
        email: 'a@b.com',
        role: 'ADMIN',
        tenantId: 't1',
        iat: 1000,
      });

      expect(result).toBe(true);
      expect(tokenBlacklist.isBlacklisted).not.toHaveBeenCalled();
    });

    it('should default iat to 0 when not provided', async () => {
      (tokenBlacklist.isSessionValid as jest.Mock).mockResolvedValue(true);

      await service.isTokenValid({
        sub: 'u1:t1',
        email: 'a@b.com',
        role: 'ADMIN',
        tenantId: 't1',
      });

      expect(tokenBlacklist.isSessionValid).toHaveBeenCalledWith('u1', 0);
    });
  });

  // =========================================================================
  // registerTenant()
  // =========================================================================
  describe('registerTenant', () => {
    it('should throw ConflictException when slug is already taken', async () => {
      const _passwordPolicy = module.get(PasswordPolicyService);
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({ id: 'existing' });

      await expect(
        service.registerTenant({
          shopName: 'Test',
          slug: 'taken-slug',
          name: 'Mario',
          email: 'mario@test.com',
          password: 'password123',
        }),
      ).rejects.toThrow('Questo slug è già in uso');
    });

    it('should create tenant and user in transaction and return tokens', async () => {
      const _passwordPolicy = module.get(PasswordPolicyService);
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      (argon2.hash as jest.Mock).mockResolvedValue('$argon2id$hash');

      // Mock $transaction
      (prisma as unknown as Record<string, jest.Mock>).$transaction = jest.fn().mockResolvedValue({
        tenant: { id: 't1', name: 'Test Shop', slug: 'test-shop' },
        user: {
          id: 'u1',
          email: 'mario@test.com',
          name: 'Mario',
          role: 'ADMIN',
        },
      });

      (jwtService.signAsync as jest.Mock)
        .mockResolvedValueOnce('mock-access')
        .mockResolvedValueOnce('mock-refresh');

      (prisma.authAuditLog.create as jest.Mock).mockResolvedValue({});

      const result = await service.registerTenant({
        shopName: 'Test Shop',
        slug: 'test-shop',
        name: 'Mario',
        email: 'mario@test.com',
        password: 'password123',
      });

      expect(result.tokens.accessToken).toBe('mock-access');
      expect(result.tenant.slug).toBe('test-shop');
      expect(result.user.email).toBe('mario@test.com');
    });
  });

  // =========================================================================
  // refreshTokens — additional edge cases
  // =========================================================================
  describe('refreshTokens — additional edge cases', () => {
    it('should handle payload without familyId (no reuse detection)', async () => {
      const payloadNoFamily: JwtPayload = {
        sub: 'user-uuid-1:tenant-uuid-1',
        email: 'mario@test.com',
        role: 'ADMIN',
        tenantId: 'tenant-uuid-1',
        jti: 'refresh-jti-1',
        // no familyId
      };

      (jwtService.verifyAsync as jest.Mock).mockResolvedValue(payloadNoFamily);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (jwtService.signAsync as jest.Mock)
        .mockResolvedValueOnce('new-access')
        .mockResolvedValueOnce('new-refresh');

      const result = await service.refreshTokens('no-family-token');

      expect(result.accessToken).toBe('new-access');
    });

    it('should handle payload without jti (no reuse marking)', async () => {
      const payloadNoJti: JwtPayload = {
        sub: 'user-uuid-1:tenant-uuid-1',
        email: 'mario@test.com',
        role: 'ADMIN',
        tenantId: 'tenant-uuid-1',
        familyId: 'family-1',
        // no jti
      };

      (jwtService.verifyAsync as jest.Mock).mockResolvedValue(payloadNoJti);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (jwtService.signAsync as jest.Mock)
        .mockResolvedValueOnce('new-access')
        .mockResolvedValueOnce('new-refresh');

      const result = await service.refreshTokens('no-jti-token');

      expect(result.accessToken).toBe('new-access');
    });
  });

  // =========================================================================
  // verifyAndMigratePassword — $2a$ prefix
  // =========================================================================
  describe('verifyAndMigratePassword — $2a$ prefix', () => {
    it('should handle $2a$ bcrypt prefix (legacy)', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (argon2.hash as jest.Mock).mockResolvedValue('$argon2id$migrated');

      const result = await service.verifyAndMigratePassword('password', '$2a$12$legacyhash');

      expect(result.valid).toBe(true);
      expect(result.newHash).toBe('$argon2id$migrated');
      expect(bcrypt.compare).toHaveBeenCalledWith('password', '$2a$12$legacyhash');
    });
  });
});
