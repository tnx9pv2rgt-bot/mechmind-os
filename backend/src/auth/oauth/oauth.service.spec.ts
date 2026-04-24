import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { OAuthService } from './oauth.service';
import { PrismaService } from '@common/services/prisma.service';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@common/services/logger.service';
import { AuthService } from '../services/auth.service';
import * as jose from 'jose';

jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(),
  jwtVerify: jest.fn(),
}));

describe('OAuthService', () => {
  let service: OAuthService;
  let prisma: jest.Mocked<PrismaService>;
  let authService: jest.Mocked<AuthService>;

  const mockTenant = {
    id: 'tenant-1',
    name: 'Test Garage',
    slug: 'test-garage',
    isActive: true,
  };

  const mockUser = {
    id: 'user-1',
    email: 'mario@test.com',
    name: 'Mario Rossi',
    role: 'ADMIN',
    isActive: true,
    tenantId: 'tenant-1',
    tenant: mockTenant,
  };

  const mockTokens = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresIn: 3600,
  };

  const mockGooglePayload = {
    iss: 'https://accounts.google.com',
    sub: 'google-uid-123',
    aud: 'google-client-id',
    email: 'mario@test.com',
    email_verified: true,
    name: 'Mario Rossi',
    picture: 'https://photo.url',
    given_name: 'Mario',
    family_name: 'Rossi',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    (jose.createRemoteJWKSet as jest.Mock).mockReturnValue('mock-jwks');
    (jose.jwtVerify as jest.Mock).mockResolvedValue({ payload: mockGooglePayload });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OAuthService,
        {
          provide: PrismaService,
          useValue: {
            tenant: { findUnique: jest.fn() },
            user: { findFirst: jest.fn() },
            setTenantContext: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('google-client-id'),
          },
        },
        {
          provide: LoggerService,
          useValue: { log: jest.fn(), error: jest.fn(), warn: jest.fn() },
        },
        {
          provide: AuthService,
          useValue: {
            generateTokens: jest.fn().mockResolvedValue(mockTokens),
            updateLastLogin: jest.fn().mockResolvedValue(undefined),
            logAuthEvent: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<OAuthService>(OAuthService);
    prisma = module.get(PrismaService);
    authService = module.get(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('loginWithGoogle', () => {
    it('should authenticate user with valid Google token and tenant slug', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant as never);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser as never);

      const result = await service.loginWithGoogle('google-credential', 'test-garage', '127.0.0.1');

      expect(result).toEqual(mockTokens);
      expect(jose.jwtVerify).toHaveBeenCalledWith('google-credential', 'mock-jwks', {
        issuer: ['https://accounts.google.com', 'accounts.google.com'],
        audience: 'google-client-id',
      });
      expect(prisma.setTenantContext).toHaveBeenCalledWith('tenant-1');
      expect(authService.updateLastLogin).toHaveBeenCalledWith('user-1', '127.0.0.1');
      expect(authService.logAuthEvent).toHaveBeenCalledWith({
        userId: 'user-1',
        tenantId: 'tenant-1',
        action: 'oauth_google_login',
        status: 'success',
        ipAddress: '127.0.0.1',
      });
      expect(authService.generateTokens).toHaveBeenCalledWith({
        id: 'user-1',
        email: 'mario@test.com',
        name: 'Mario Rossi',
        role: 'ADMIN',
        isActive: true,
        tenantId: 'tenant-1',
        tenant: mockTenant,
      });
    });

    it('should require tenantSlug for tenant isolation', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant as never);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser as never);

      const result = await service.loginWithGoogle('google-credential', 'test-garage', '10.0.0.1');

      expect(result).toEqual(mockTokens);
      expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { slug: 'test-garage' },
      });
      expect(prisma.setTenantContext).toHaveBeenCalledWith('tenant-1');
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'mario@test.com', tenantId: 'tenant-1', isActive: true },
        include: { tenant: true },
      });
    });

    it('should throw BadRequestException when Google OAuth is not configured', async () => {
      // Re-create service with empty GOOGLE_CLIENT_ID
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          OAuthService,
          {
            provide: PrismaService,
            useValue: {
              tenant: { findUnique: jest.fn() },
              user: { findFirst: jest.fn() },
              setTenantContext: jest.fn(),
            },
          },
          {
            provide: ConfigService,
            useValue: { get: jest.fn().mockReturnValue('') },
          },
          {
            provide: LoggerService,
            useValue: { log: jest.fn(), error: jest.fn(), warn: jest.fn() },
          },
          {
            provide: AuthService,
            useValue: {
              generateTokens: jest.fn(),
              updateLastLogin: jest.fn(),
              logAuthEvent: jest.fn(),
            },
          },
        ],
      }).compile();

      const unconfiguredService = module.get<OAuthService>(OAuthService);

      await expect(
        unconfiguredService.loginWithGoogle('credential', 'test-garage'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        unconfiguredService.loginWithGoogle('credential', 'test-garage'),
      ).rejects.toThrow('Google OAuth not configured');
    });

    it('should throw UnauthorizedException when Google email is not verified', async () => {
      (jose.jwtVerify as jest.Mock).mockResolvedValue({
        payload: { ...mockGooglePayload, email_verified: false },
      });

      await expect(service.loginWithGoogle('credential', 'test-garage')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.loginWithGoogle('credential', 'test-garage')).rejects.toThrow(
        'Google email not verified',
      );
    });

    it('should throw UnauthorizedException when Google token verification fails', async () => {
      (jose.jwtVerify as jest.Mock).mockRejectedValue(new Error('Invalid signature'));

      await expect(service.loginWithGoogle('bad-credential', 'test-garage')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.loginWithGoogle('bad-credential', 'test-garage')).rejects.toThrow(
        'Invalid Google token',
      );
    });

    it('should throw UnauthorizedException when tenant not found', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(null as never);

      await expect(service.loginWithGoogle('credential', 'nonexistent')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.loginWithGoogle('credential', 'nonexistent')).rejects.toThrow(
        'Tenant not found or inactive',
      );
    });

    it('should throw UnauthorizedException when tenant is inactive', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({
        ...mockTenant,
        isActive: false,
      } as never);

      await expect(service.loginWithGoogle('credential', 'test-garage')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.loginWithGoogle('credential', 'test-garage')).rejects.toThrow(
        'Tenant not found or inactive',
      );
    });

    it('should throw UnauthorizedException when user not found in tenant', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant as never);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null as never);

      await expect(service.loginWithGoogle('credential', 'test-garage')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.loginWithGoogle('credential', 'test-garage')).rejects.toThrow(
        'No account found with this email',
      );
    });

    it('should throw UnauthorizedException when user not found in specified tenant', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant as never);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null as never);

      await expect(service.loginWithGoogle('credential', 'test-garage')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.loginWithGoogle('credential', 'test-garage')).rejects.toThrow(
        'No account found with this email',
      );
    });

    it('should call setTenantContext when tenant slug is provided', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant as never);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser as never);

      await service.loginWithGoogle('credential', 'test-garage');

      expect(prisma.setTenantContext).toHaveBeenCalledWith('tenant-1');
    });

    it('should handle login without ip parameter', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant as never);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser as never);

      const result = await service.loginWithGoogle('credential', 'test-garage');

      expect(result).toEqual(mockTokens);
      expect(authService.updateLastLogin).toHaveBeenCalledWith('user-1', undefined);
      expect(authService.logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({ ipAddress: undefined }),
      );
    });

    it('should log auth event with correct status', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant as never);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser as never);

      await service.loginWithGoogle('credential', 'test-garage', '192.168.1.1');

      expect(authService.logAuthEvent).toHaveBeenCalledWith({
        userId: 'user-1',
        tenantId: 'tenant-1',
        action: 'oauth_google_login',
        status: 'success',
        ipAddress: '192.168.1.1',
      });
    });

    it('should handle user with inactive tenant', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({
        ...mockTenant,
        isActive: false,
      } as never);

      await expect(service.loginWithGoogle('credential', 'test-garage')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should properly format mapUserWithTenant output', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant as never);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser as never);

      await service.loginWithGoogle('credential', 'test-garage');

      expect(authService.generateTokens).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'user-1',
          email: 'mario@test.com',
          name: 'Mario Rossi',
          role: 'ADMIN',
          isActive: true,
          tenantId: 'tenant-1',
          tenant: expect.objectContaining({
            id: 'tenant-1',
            name: 'Test Garage',
            slug: 'test-garage',
            isActive: true,
          }),
        }),
      );
    });

    it('should pass different IP formats to updateLastLogin', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant as never);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser as never);

      const ips = ['127.0.0.1', '::1', '192.168.0.1', '2001:db8::1', 'user-proxy-ip'];

      for (const ip of ips) {
        await service.loginWithGoogle('credential', 'test-garage', ip);
        expect(authService.updateLastLogin).toHaveBeenCalledWith('user-1', ip);
      }
    });
  });
});
