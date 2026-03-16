import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from '../services/auth.service';
import { MfaService } from '../mfa/mfa.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let mfaService: jest.Mocked<MfaService>;

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
    const module: TestingModule = await Test.createTestingModule({
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
          },
        },
        {
          provide: MfaService,
          useValue: {
            getStatus: jest.fn(),
            verify: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService) as jest.Mocked<AuthService>;
    mfaService = module.get(MfaService) as jest.Mocked<MfaService>;
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

      const result = await controller.login(loginDto as never, '127.0.0.1');

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

      await expect(controller.login(loginDto as never, '127.0.0.1')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when account locked', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({
        locked: true,
        until: new Date(),
      } as never);

      await expect(controller.login(loginDto as never, '127.0.0.1')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return MFA temp token when MFA enabled and no code provided', async () => {
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      mfaService.getStatus.mockResolvedValue({ enabled: true } as never);
      authService.generateTwoFactorTempToken.mockResolvedValue('temp-token-123' as never);

      const result = await controller.login(loginDto as never, '127.0.0.1');

      expect(result).toEqual({
        tempToken: 'temp-token-123',
        requiresMfa: true,
        methods: ['totp', 'backup'],
      });
    });

    it('should return tokens when MFA code is valid', async () => {
      const dtoWithTotp = { ...loginDto, totpCode: '123456' };
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      mfaService.getStatus.mockResolvedValue({ enabled: true } as never);
      mfaService.verify.mockResolvedValue({ valid: true } as never);
      authService.generateTokens.mockResolvedValue(mockTokens as never);

      const result = await controller.login(dtoWithTotp as never, '127.0.0.1');

      expect(mfaService.verify).toHaveBeenCalledWith('user-001', '123456');
      expect(result).toEqual(mockTokens);
    });

    it('should throw UnauthorizedException when MFA code is invalid', async () => {
      const dtoWithTotp = { ...loginDto, totpCode: '000000' };
      authService.validateUser.mockResolvedValue(mockUser as never);
      authService.isAccountLocked.mockResolvedValue({ locked: false } as never);
      mfaService.getStatus.mockResolvedValue({ enabled: true } as never);
      mfaService.verify.mockResolvedValue({ valid: false } as never);

      await expect(controller.login(dtoWithTotp as never, '127.0.0.1')).rejects.toThrow(
        UnauthorizedException,
      );
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
      const result = await controller.verifyTwoFactor(dto as never, '127.0.0.1');

      expect(authService.verifyTwoFactorTempToken).toHaveBeenCalledWith('temp-123');
      expect(mfaService.verify).toHaveBeenCalledWith('user-001', '123456');
      expect(authService.updateLastLogin).toHaveBeenCalledWith('user-001', '127.0.0.1');
      expect(result).toEqual(mockTokens);
    });

    it('should throw UnauthorizedException on invalid 2FA code', async () => {
      authService.verifyTwoFactorTempToken.mockResolvedValue('user-001' as never);
      mfaService.verify.mockResolvedValue({ valid: false } as never);

      const dto = { tempToken: 'temp-123', totpCode: '000000' };
      await expect(controller.verifyTwoFactor(dto as never, '127.0.0.1')).rejects.toThrow(
        UnauthorizedException,
      );
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
});
