import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { PortalAuthController } from './portal-auth.controller';
import { AuthService } from '../services/auth.service';
import { PrismaService } from '@common/services/prisma.service';
import { EncryptionService } from '@common/services/encryption.service';

describe('PortalAuthController', () => {
  let controller: PortalAuthController;
  let authService: jest.Mocked<AuthService>;
  let prisma: jest.Mocked<PrismaService>;
  let encryption: jest.Mocked<EncryptionService>;

  const mockTenant = {
    id: 'tenant-001',
    name: 'Officina Test',
    slug: 'demo',
    isActive: true,
  };

  const mockTokens = {
    accessToken: 'jwt-access',
    refreshToken: 'jwt-refresh',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PortalAuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            hashPassword: jest.fn(),
            verifyPassword: jest.fn(),
            generateTokens: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            tenant: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
            },
            $queryRaw: jest.fn(),
            $executeRaw: jest.fn(),
          },
        },
        {
          provide: EncryptionService,
          useValue: {
            encrypt: jest.fn().mockImplementation((v: string) => `enc_${v}`),
            decrypt: jest.fn().mockImplementation((v: string) => v.replace('enc_', '')),
          },
        },
      ],
    }).compile();

    controller = module.get<PortalAuthController>(PortalAuthController);
    authService = module.get(AuthService) as jest.Mocked<AuthService>;
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    encryption = module.get(EncryptionService) as jest.Mocked<EncryptionService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    const validDto = {
      email: 'mario@test.com',
      password: 'Secure123!',
      firstName: 'Mario',
      lastName: 'Rossi',
      phone: '+39123456789',
      gdprConsent: true,
    };

    it('should throw BadRequestException when gdprConsent is false', async () => {
      const dto = { ...validDto, gdprConsent: false };

      await expect(controller.register(dto as never)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when tenant not found', async () => {
      (prisma.tenant.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(controller.register(validDto as never)).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when customer already exists', async () => {
      (prisma.tenant.findFirst as jest.Mock).mockResolvedValue(mockTenant);
      prisma.$queryRaw.mockResolvedValue([{ id: 'existing-cust' }] as never);

      await expect(controller.register(validDto as never)).rejects.toThrow(ConflictException);
    });

    it('should register customer and return tokens on success', async () => {
      (prisma.tenant.findFirst as jest.Mock).mockResolvedValue(mockTenant);
      prisma.$queryRaw.mockResolvedValue([] as never);
      prisma.$executeRaw.mockResolvedValue(1 as never);
      authService.hashPassword.mockResolvedValue('hashed-pwd');
      authService.generateTokens.mockResolvedValue(mockTokens as never);

      const result = await controller.register(validDto as never);

      expect(result.success).toBe(true);
      expect(result.data.accessToken).toBe('jwt-access');
      expect(result.data.refreshToken).toBe('jwt-refresh');
      expect(result.data.customer.email).toBe('mario@test.com');
      expect(result.data.customer.tenantSlug).toBe('demo');
      expect(authService.hashPassword).toHaveBeenCalledWith('Secure123!');
      expect(encryption.encrypt).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'mario@test.com',
      password: 'Secure123!',
    };

    it('should throw UnauthorizedException when customer not found', async () => {
      prisma.$queryRaw.mockResolvedValue([] as never);

      await expect(controller.login(loginDto as never)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when tenant is inactive', async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          id: 'cust-001',
          password_hash: 'hash',
          tenant_id: 'tenant-001',
          encrypted_first_name: null,
          encrypted_last_name: null,
        },
      ] as never);
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({ ...mockTenant, isActive: false });

      await expect(controller.login(loginDto as never)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          id: 'cust-001',
          password_hash: 'hash',
          tenant_id: 'tenant-001',
          encrypted_first_name: null,
          encrypted_last_name: null,
        },
      ] as never);
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      authService.verifyPassword.mockResolvedValue(false);

      await expect(controller.login(loginDto as never)).rejects.toThrow(UnauthorizedException);
    });

    it('should return tokens on successful login', async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          id: 'cust-001',
          password_hash: 'hash',
          tenant_id: 'tenant-001',
          encrypted_first_name: 'enc_Mario',
          encrypted_last_name: 'enc_Rossi',
        },
      ] as never);
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      authService.verifyPassword.mockResolvedValue(true);
      authService.generateTokens.mockResolvedValue(mockTokens as never);

      const result = await controller.login(loginDto as never);

      expect(result.success).toBe(true);
      expect(result.data.accessToken).toBe('jwt-access');
      expect(result.data.customer.id).toBe('cust-001');
      expect(authService.verifyPassword).toHaveBeenCalledWith('Secure123!', 'hash');
    });
  });
});
