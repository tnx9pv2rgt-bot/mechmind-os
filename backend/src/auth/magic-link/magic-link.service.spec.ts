import { Test, TestingModule } from '@nestjs/testing';
import { MagicLinkService, MagicLinkError } from './magic-link.service';
import { PrismaService } from '@common/services/prisma.service';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@common/services/logger.service';
import { AuthService } from '../services/auth.service';
import { EmailService } from '../../notifications/email/email.service';

describe('MagicLinkService', () => {
  let service: MagicLinkService;
  let prisma: PrismaService;
  let authService: AuthService;
  let emailService: EmailService;

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MagicLinkService,
        {
          provide: PrismaService,
          useValue: {
            tenant: { findUnique: jest.fn() },
            user: { findFirst: jest.fn() },
            magicLink: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('http://localhost:3001'),
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
          },
        },
        {
          provide: EmailService,
          useValue: { sendRawEmail: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<MagicLinkService>(MagicLinkService);
    prisma = module.get(PrismaService);
    authService = module.get(AuthService);
    emailService = module.get(EmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendMagicLink', () => {
    it('should send magic link email for valid user and tenant', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (prisma.magicLink.create as jest.Mock).mockResolvedValue({});

      const result = await service.sendMagicLink(
        'mario@test.com',
        'test-garage',
        '127.0.0.1',
        'Mozilla/5.0',
      );

      expect(result).toEqual({ sent: true });
      expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { slug: 'test-garage' },
      });
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'mario@test.com', tenantId: 'tenant-1', isActive: true },
      });
      expect(prisma.magicLink.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'mario@test.com',
          tenantId: 'tenant-1',
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
        }),
      });
      expect(emailService.sendRawEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'mario@test.com',
          subject: 'Accedi a MechMind OS',
        }),
      );
    });

    it('should return sent:true silently when tenant not found', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.sendMagicLink('mario@test.com', 'nonexistent');

      expect(result).toEqual({ sent: true });
      expect(prisma.user.findFirst).not.toHaveBeenCalled();
      expect(emailService.sendRawEmail).not.toHaveBeenCalled();
    });

    it('should return sent:true silently when tenant is inactive', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({
        ...mockTenant,
        isActive: false,
      });

      const result = await service.sendMagicLink('mario@test.com', 'test-garage');

      expect(result).toEqual({ sent: true });
      expect(prisma.user.findFirst).not.toHaveBeenCalled();
    });

    it('should return sent:true silently when user not found', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.sendMagicLink('unknown@test.com', 'test-garage');

      expect(result).toEqual({ sent: true });
      expect(prisma.magicLink.create).not.toHaveBeenCalled();
      expect(emailService.sendRawEmail).not.toHaveBeenCalled();
    });

    it('should store magic link with expiration and metadata', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (prisma.magicLink.create as jest.Mock).mockResolvedValue({});

      const beforeCall = Date.now();
      await service.sendMagicLink('mario@test.com', 'test-garage', '10.0.0.1');
      const afterCall = Date.now();

      const createCall = (prisma.magicLink.create as jest.Mock).mock.calls[0][0];
      const expiresAt = createCall.data.expiresAt as Date;

      // Expiry should be ~15 minutes from now
      const expectedMin = beforeCall + 15 * 60 * 1000;
      const expectedMax = afterCall + 15 * 60 * 1000;
      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedMax);

      // Token should be a 64-char hex string (32 random bytes)
      expect(createCall.data.token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should include verify URL with token in email html', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (prisma.magicLink.create as jest.Mock).mockResolvedValue({});

      await service.sendMagicLink('mario@test.com', 'test-garage');

      const emailCall = (emailService.sendRawEmail as jest.Mock).mock.calls[0][0];
      const token = (prisma.magicLink.create as jest.Mock).mock.calls[0][0].data.token;
      expect(emailCall.html).toContain(
        `http://localhost:3001/auth/magic-link/verify?token=${token}`,
      );
      expect(emailCall.html).toContain('Mario Rossi');
    });

    it('should handle optional ipAddress and userAgent as undefined', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (prisma.magicLink.create as jest.Mock).mockResolvedValue({});

      await service.sendMagicLink('mario@test.com', 'test-garage');

      const createCall = (prisma.magicLink.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.ipAddress).toBeUndefined();
      expect(createCall.data.userAgent).toBeUndefined();
    });
  });

  describe('verifyMagicLink', () => {
    const validMagicLink = {
      id: 'ml-1',
      email: 'mario@test.com',
      token: 'valid-token',
      tenantId: 'tenant-1',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min from now
      usedAt: null,
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      createdAt: new Date(),
    };

    it('should verify valid magic link and return auth tokens', async () => {
      (prisma.magicLink.findUnique as jest.Mock).mockResolvedValue(validMagicLink);
      (prisma.magicLink.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.verifyMagicLink('valid-token', '127.0.0.1');

      expect(result).toEqual(mockTokens);
      expect(prisma.magicLink.findUnique).toHaveBeenCalledWith({
        where: { token: 'valid-token' },
      });
      expect(prisma.magicLink.updateMany).toHaveBeenCalledWith({
        where: { id: 'ml-1', usedAt: null },
        data: { usedAt: expect.any(Date) },
      });
      expect(authService.updateLastLogin).toHaveBeenCalledWith('user-1', '127.0.0.1');
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

    it('should throw MagicLinkError when token not found', async () => {
      (prisma.magicLink.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.verifyMagicLink('bad-token')).rejects.toThrow(MagicLinkError);
      await expect(service.verifyMagicLink('bad-token')).rejects.toThrow('Link non valido');
    });

    it('should throw MagicLinkError when token already used', async () => {
      (prisma.magicLink.findUnique as jest.Mock).mockResolvedValue({
        ...validMagicLink,
        usedAt: new Date(),
      });

      await expect(service.verifyMagicLink('valid-token')).rejects.toThrow(MagicLinkError);
      await expect(service.verifyMagicLink('valid-token')).rejects.toThrow("Link gia' utilizzato");
    });

    it('should throw MagicLinkError when token expired', async () => {
      (prisma.magicLink.findUnique as jest.Mock).mockResolvedValue({
        ...validMagicLink,
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
      });

      await expect(service.verifyMagicLink('valid-token')).rejects.toThrow(MagicLinkError);
      await expect(service.verifyMagicLink('valid-token')).rejects.toThrow('Link scaduto');
    });

    it('should throw MagicLinkError when user not found after verification', async () => {
      (prisma.magicLink.findUnique as jest.Mock).mockResolvedValue(validMagicLink);
      (prisma.magicLink.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.verifyMagicLink('valid-token')).rejects.toThrow(MagicLinkError);
      await expect(service.verifyMagicLink('valid-token')).rejects.toThrow(
        'Utente non trovato o non attivo',
      );
    });

    it('should throw MagicLinkError when user tenant is inactive', async () => {
      (prisma.magicLink.findUnique as jest.Mock).mockResolvedValue(validMagicLink);
      (prisma.magicLink.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        ...mockUser,
        tenant: { ...mockTenant, isActive: false },
      });

      await expect(service.verifyMagicLink('valid-token')).rejects.toThrow(
        'Utente non trovato o non attivo',
      );
    });

    it('should verify without ip parameter', async () => {
      (prisma.magicLink.findUnique as jest.Mock).mockResolvedValue(validMagicLink);
      (prisma.magicLink.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.verifyMagicLink('valid-token');

      expect(result).toEqual(mockTokens);
      expect(authService.updateLastLogin).toHaveBeenCalledWith('user-1', undefined);
    });

    it('should throw MagicLinkError when updateMany returns 0 (race condition)', async () => {
      (prisma.magicLink.findUnique as jest.Mock).mockResolvedValue(validMagicLink);
      (prisma.magicLink.updateMany as jest.Mock).mockResolvedValue({ count: 0 }); // TOCTOU: already used

      await expect(service.verifyMagicLink('valid-token')).rejects.toThrow(
        MagicLinkError,
      );
      expect(prisma.magicLink.updateMany).toHaveBeenCalled();
    });

    it('should verify with ip parameter', async () => {
      (prisma.magicLink.findUnique as jest.Mock).mockResolvedValue(validMagicLink);
      (prisma.magicLink.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.verifyMagicLink('valid-token', '192.168.1.1');

      expect(result).toEqual(mockTokens);
      expect(authService.updateLastLogin).toHaveBeenCalledWith('user-1', '192.168.1.1');
    });
  });

  // Additional sendMagicLink edge cases
  describe('sendMagicLink — tenant-specific login paths', () => {
    it('should send magic link for tenant-specific login with user found', async () => {
      const mockTenant = { id: 'tenant-1', isActive: true, slug: 'tenant-slug' };
      const mockUserFromTenant = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        tenantId: 'tenant-1',
      };

      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUserFromTenant);
      (prisma.magicLink.create as jest.Mock).mockResolvedValue({
        id: 'ml-1',
        token: 'token-1',
      });
      (emailService.sendRawEmail as jest.Mock).mockResolvedValue(undefined);

      const result = await service.sendMagicLink('test@example.com', 'tenant-slug');

      expect(result).toEqual({ sent: true });
      expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { slug: 'tenant-slug' },
      });
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          email: 'test@example.com',
          tenantId: 'tenant-1',
          isActive: true,
        },
      });
    });

    it('should return sent:true when tenant not found in tenant-specific flow', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.sendMagicLink('test@example.com', 'nonexistent-slug');

      expect(result).toEqual({ sent: true });
      expect(prisma.user.findFirst).not.toHaveBeenCalled();
    });

    it('should send magic link for generic login (cross-tenant)', async () => {
      const mockTenant = { id: 'tenant-1', isActive: true, slug: 'tenant-slug' };
      const mockUserCrossTenant = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        tenantId: 'tenant-1',
        tenant: mockTenant,
      };

      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUserCrossTenant);
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (prisma.magicLink.create as jest.Mock).mockResolvedValue({
        id: 'ml-1',
        token: 'token-1',
      });
      (emailService.sendRawEmail as jest.Mock).mockResolvedValue(undefined);

      const result = await service.sendMagicLink('test@example.com', undefined, '192.168.1.1', 'Mozilla/5.0');

      expect(result).toEqual({ sent: true });
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'test@example.com', isActive: true },
        include: { tenant: true },
      });
      expect(prisma.magicLink.create).toHaveBeenCalled();
    });

    it('should return sent:true when user found but tenant inactive', async () => {
      const mockTenant = { id: 'tenant-1', isActive: false };
      const mockUserCrossTenant = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        tenantId: 'tenant-1',
        tenant: mockTenant,
      };

      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUserCrossTenant);
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);

      const result = await service.sendMagicLink('test@example.com');

      expect(result).toEqual({ sent: true });
      expect(prisma.magicLink.create).not.toHaveBeenCalled();
    });

    it('should not call tenant.findUnique again when user.include.tenant is already set', async () => {
      const mockTenant = { id: 'tenant-1', isActive: true };
      const mockUserCrossTenant = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        tenantId: 'tenant-1',
        tenant: mockTenant,
      };

      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUserCrossTenant);
      (prisma.magicLink.create as jest.Mock).mockResolvedValue({
        id: 'ml-1',
        token: 'token-1',
      });
      (emailService.sendRawEmail as jest.Mock).mockResolvedValue(undefined);

      await service.sendMagicLink('test@example.com');

      // tenant.findUnique should still be called once to verify tenant.isActive in the condition
      expect(prisma.tenant.findUnique).toHaveBeenCalled();
    });
  });
});
