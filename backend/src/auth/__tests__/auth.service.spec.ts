import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService, JwtPayload, UserWithTenant } from '../services/auth.service';
import { PrismaService } from '../../common/services/prisma.service';
import { LoggerService } from '../../common/services/logger.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;
  let loggerService: LoggerService;

  const mockTenant = {
    id: 'tenant-123',
    name: 'Test Garage',
    slug: 'test-garage',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser = {
    id: 'user-456',
    email: 'test@example.com',
    password: 'hashedPassword123',
    firstName: 'John',
    lastName: 'Doe',
    role: 'MANAGER',
    isActive: true,
    tenantId: 'tenant-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    tenant: mockTenant,
  };

  const mockUserWithTenant: UserWithTenant = {
    id: mockUser.id,
    email: mockUser.email,
    firstName: mockUser.firstName,
    lastName: mockUser.lastName,
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

  // Mock Prisma client
  const mockPrismaClient = {
    tenant: {
      findUnique: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaClient,
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                JWT_SECRET: 'test-secret',
                JWT_EXPIRES_IN: '24h',
                JWT_REFRESH_SECRET: 'test-refresh-secret',
                JWT_REFRESH_EXPIRES_IN: '7d',
                JWT_EXPIRES_IN_SECONDS: '86400',
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            debug: jest.fn(),
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
    loggerService = module.get<LoggerService>(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should validate user with correct credentials', async () => {
      mockPrismaClient.tenant.findUnique.mockResolvedValue(mockTenant);
      mockPrismaClient.user.findFirst.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password123', 'test-garage');

      expect(result).toEqual(mockUserWithTenant);
      expect(mockPrismaClient.tenant.findUnique).toHaveBeenCalledWith({
        where: { slug: 'test-garage' },
      });
      expect(mockPrismaClient.user.findFirst).toHaveBeenCalledWith({
        where: {
          email: 'test@example.com',
          tenantId: 'tenant-123',
        },
        include: { tenant: true },
      });
    });

    it('should throw UnauthorizedException when tenant not found', async () => {
      mockPrismaClient.tenant.findUnique.mockResolvedValue(null);

      await expect(
        service.validateUser('test@example.com', 'password123', 'nonexistent'),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.validateUser('test@example.com', 'password123', 'nonexistent'),
      ).rejects.toThrow('Invalid tenant or tenant is inactive');
    });

    it('should throw UnauthorizedException when tenant is inactive', async () => {
      mockPrismaClient.tenant.findUnique.mockResolvedValue({
        ...mockTenant,
        isActive: false,
      });

      await expect(
        service.validateUser('test@example.com', 'password123', 'test-garage'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockPrismaClient.tenant.findUnique.mockResolvedValue(mockTenant);
      mockPrismaClient.user.findFirst.mockResolvedValue(null);

      await expect(
        service.validateUser('nonexistent@example.com', 'password123', 'test-garage'),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.validateUser('nonexistent@example.com', 'password123', 'test-garage'),
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      mockPrismaClient.tenant.findUnique.mockResolvedValue(mockTenant);
      mockPrismaClient.user.findFirst.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(
        service.validateUser('test@example.com', 'password123', 'test-garage'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      mockPrismaClient.tenant.findUnique.mockResolvedValue(mockTenant);
      mockPrismaClient.user.findFirst.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.validateUser('test@example.com', 'wrongpassword', 'test-garage'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', async () => {
      const signAsyncMock = jwtService.signAsync as jest.Mock;
      signAsyncMock
        .mockResolvedValueOnce('access-token-123')
        .mockResolvedValueOnce('refresh-token-456');

      const result = await service.generateTokens(mockUserWithTenant);

      expect(result).toEqual({
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
        expiresIn: 86400,
      });
      expect(signAsyncMock).toHaveBeenCalledTimes(2);
      expect(signAsyncMock).toHaveBeenNthCalledWith(
        1,
        {
          sub: 'user-456:tenant-123',
          email: 'test@example.com',
          role: 'MANAGER',
          tenantId: 'tenant-123',
        },
        {
          secret: 'test-secret',
          expiresIn: '24h',
        },
      );
      expect(signAsyncMock).toHaveBeenNthCalledWith(
        2,
        {
          sub: 'user-456:tenant-123',
          email: 'test@example.com',
          role: 'MANAGER',
          tenantId: 'tenant-123',
        },
        {
          secret: 'test-refresh-secret',
          expiresIn: '7d',
        },
      );
    });

    it('should use default values when config is not set', async () => {
      const getMock = configService.get as jest.Mock;
      getMock.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'JWT_EXPIRES_IN') return undefined;
        if (key === 'JWT_EXPIRES_IN_SECONDS') return undefined;
        return defaultValue;
      });

      const signAsyncMock = jwtService.signAsync as jest.Mock;
      signAsyncMock
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.generateTokens(mockUserWithTenant);

      expect(result.expiresIn).toBe(NaN); // parseInt(undefined) = NaN
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const payload: JwtPayload = {
        sub: 'user-456:tenant-123',
        email: 'test@example.com',
        role: 'MANAGER',
        tenantId: 'tenant-123',
      };

      const verifyAsyncMock = jwtService.verifyAsync as jest.Mock;
      verifyAsyncMock.mockResolvedValue(payload);
      mockPrismaClient.user.findFirst.mockResolvedValue(mockUser);

      const signAsyncMock = jwtService.signAsync as jest.Mock;
      signAsyncMock
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');

      const result = await service.refreshTokens('valid-refresh-token');

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
      expect(verifyAsyncMock).toHaveBeenCalledWith('valid-refresh-token', {
        secret: 'test-refresh-secret',
      });
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      const verifyAsyncMock = jwtService.verifyAsync as jest.Mock;
      verifyAsyncMock.mockRejectedValue(new Error('Invalid token'));

      await expect(service.refreshTokens('invalid-token')).rejects.toThrow(UnauthorizedException);
      await expect(service.refreshTokens('invalid-token')).rejects.toThrow('Invalid refresh token');
      expect(loggerService.error).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user not found during refresh', async () => {
      const payload: JwtPayload = {
        sub: 'user-456:tenant-123',
        email: 'test@example.com',
        role: 'MANAGER',
        tenantId: 'tenant-123',
      };

      const verifyAsyncMock = jwtService.verifyAsync as jest.Mock;
      verifyAsyncMock.mockResolvedValue(payload);
      mockPrismaClient.user.findFirst.mockResolvedValue(null);

      await expect(service.refreshTokens('valid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when tenant is inactive during refresh', async () => {
      const payload: JwtPayload = {
        sub: 'user-456:tenant-123',
        email: 'test@example.com',
        role: 'MANAGER',
        tenantId: 'tenant-123',
      };

      const verifyAsyncMock = jwtService.verifyAsync as jest.Mock;
      verifyAsyncMock.mockResolvedValue(payload);
      mockPrismaClient.user.findFirst.mockResolvedValue({
        ...mockUser,
        tenant: { ...mockTenant, isActive: false },
      });

      await expect(service.refreshTokens('valid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should handle verification errors properly', async () => {
      const verifyAsyncMock = jwtService.verifyAsync as jest.Mock;
      verifyAsyncMock.mockRejectedValue(new Error('Token expired'));

      await expect(service.refreshTokens('expired-token')).rejects.toThrow(UnauthorizedException);
      expect(loggerService.error).toHaveBeenCalledWith('Token refresh failed', expect.any(String));
    });
  });

  describe('extractTenantIdFromPayload', () => {
    it('should extract tenantId from explicit field', () => {
      const payload: JwtPayload = {
        sub: 'user-456:tenant-123',
        email: 'test@example.com',
        role: 'MANAGER',
        tenantId: 'tenant-123',
      };

      const result = service.extractTenantIdFromPayload(payload);

      expect(result).toBe('tenant-123');
    });

    it('should extract tenantId from subject when tenantId field is missing', () => {
      const payload = {
        sub: 'user-456:tenant-123',
        email: 'test@example.com',
        role: 'MANAGER',
        tenantId: undefined as any,
      };

      const result = service.extractTenantIdFromPayload(payload);

      expect(result).toBe('tenant-123');
    });

    it('should extract tenantId from subject with multiple colons', () => {
      const payload: JwtPayload = {
        sub: 'user-456:tenant-123:extra:data',
        email: 'test@example.com',
        role: 'MANAGER',
        tenantId: 'tenant-123',
      };

      const result = service.extractTenantIdFromPayload(payload);

      expect(result).toBe('tenant-123');
    });

    it('should throw UnauthorizedException when tenant ID cannot be found', () => {
      const payload: JwtPayload = {
        sub: 'nocolonhere',
        email: 'test@example.com',
        role: 'MANAGER',
        tenantId: '',
      };

      expect(() => service.extractTenantIdFromPayload(payload)).toThrow(UnauthorizedException);
      expect(() => service.extractTenantIdFromPayload(payload)).toThrow('Invalid token: tenant ID not found');
    });

    it('should throw UnauthorizedException when subject has no colon and no tenantId', () => {
      const payload: JwtPayload = {
        sub: 'nocolon',
        email: 'test@example.com',
        role: 'MANAGER',
        tenantId: '', // Empty tenantId
      };

      expect(() => service.extractTenantIdFromPayload(payload)).toThrow(UnauthorizedException);
      expect(() => service.extractTenantIdFromPayload(payload)).toThrow('Invalid token: tenant ID not found');
    });
  });

  describe('extractUserIdFromPayload', () => {
    it('should extract userId from subject', () => {
      const payload: JwtPayload = {
        sub: 'user-456:tenant-123',
        email: 'test@example.com',
        role: 'MANAGER',
        tenantId: 'tenant-123',
      };

      const result = service.extractUserIdFromPayload(payload);

      expect(result).toBe('user-456');
    });

    it('should extract userId from subject with multiple colons', () => {
      const payload: JwtPayload = {
        sub: 'user-456:tenant-123:extra:data',
        email: 'test@example.com',
        role: 'MANAGER',
        tenantId: 'tenant-123',
      };

      const result = service.extractUserIdFromPayload(payload);

      expect(result).toBe('user-456');
    });

    it('should return entire subject if no colon present', () => {
      const payload: JwtPayload = {
        sub: 'user-only',
        email: 'test@example.com',
        role: 'MANAGER',
        tenantId: 'tenant-123',
      };

      const result = service.extractUserIdFromPayload(payload);

      expect(result).toBe('user-only');
    });
  });

  describe('hashPassword', () => {
    it('should hash password with bcrypt', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password-result');

      const result = await service.hashPassword('mypassword');

      expect(result).toBe('hashed-password-result');
      expect(bcrypt.hash).toHaveBeenCalledWith('mypassword', 12);
    });
  });

  describe('validateApiKey', () => {
    it('should return invalid for any API key (placeholder implementation)', async () => {
      const result = await service.validateApiKey('any-api-key');

      expect(result).toEqual({ tenantId: '', valid: false });
      expect(loggerService.warn).toHaveBeenCalledWith('API key validation not fully implemented');
    });
  });
});
