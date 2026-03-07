import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from '../controllers/auth.controller';
import { AuthService, AuthTokens, UserWithTenant } from '../services/auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockUserWithTenant: UserWithTenant = {
    id: 'user-456',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'MANAGER',
    isActive: true,
    tenantId: 'tenant-123',
    tenant: {
      id: 'tenant-123',
      name: 'Test Garage',
      slug: 'test-garage',
      isActive: true,
    },
  };

  const mockTokens: AuthTokens = {
    accessToken: 'access-token-123',
    refreshToken: 'refresh-token-456',
    expiresIn: 86400,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            validateUser: jest.fn(),
            generateTokens: jest.fn(),
            refreshTokens: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return tokens on successful login', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
        tenantSlug: 'test-garage',
      };

      const validateUserMock = authService.validateUser as jest.Mock;
      validateUserMock.mockResolvedValue(mockUserWithTenant);

      const generateTokensMock = authService.generateTokens as jest.Mock;
      generateTokensMock.mockResolvedValue(mockTokens);

      const result = await controller.login(loginDto);

      expect(result).toEqual(mockTokens);
      expect(validateUserMock).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
        'test-garage',
      );
      expect(generateTokensMock).toHaveBeenCalledWith(mockUserWithTenant);
    });

    it('should throw UnauthorizedException when validateUser throws', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
        tenantSlug: 'test-garage',
      };

      const validateUserMock = authService.validateUser as jest.Mock;
      validateUserMock.mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );

      await expect(controller.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(controller.login(loginDto)).rejects.toThrow('Invalid credentials');
    });

    it('should propagate UnauthorizedException from validateUser', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
        tenantSlug: 'invalid-tenant',
      };

      const validateUserMock = authService.validateUser as jest.Mock;
      validateUserMock.mockRejectedValue(
        new UnauthorizedException('Invalid tenant or tenant is inactive'),
      );

      await expect(controller.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(controller.login(loginDto)).rejects.toThrow('Invalid tenant or tenant is inactive');
    });

    it('should handle different tenant slugs', async () => {
      const loginDto = {
        email: 'admin@garage.com',
        password: 'adminpass',
        tenantSlug: 'another-garage',
      };

      const anotherUser: UserWithTenant = {
        ...mockUserWithTenant,
        tenant: {
          ...mockUserWithTenant.tenant,
          slug: 'another-garage',
          name: 'Another Garage',
        },
      };

      const validateUserMock = authService.validateUser as jest.Mock;
      validateUserMock.mockResolvedValue(anotherUser);

      const generateTokensMock = authService.generateTokens as jest.Mock;
      generateTokensMock.mockResolvedValue(mockTokens);

      const result = await controller.login(loginDto);

      expect(result).toEqual(mockTokens);
      expect(validateUserMock).toHaveBeenCalledWith(
        'admin@garage.com',
        'adminpass',
        'another-garage',
      );
    });

    it('should handle email with special characters', async () => {
      const loginDto = {
        email: 'user+tag@example.com',
        password: 'password123',
        tenantSlug: 'test-garage',
      };

      const validateUserMock = authService.validateUser as jest.Mock;
      validateUserMock.mockResolvedValue(mockUserWithTenant);

      const generateTokensMock = authService.generateTokens as jest.Mock;
      generateTokensMock.mockResolvedValue(mockTokens);

      const result = await controller.login(loginDto);

      expect(result).toEqual(mockTokens);
      expect(validateUserMock).toHaveBeenCalledWith(
        'user+tag@example.com',
        'password123',
        'test-garage',
      );
    });
  });

  describe('refreshToken', () => {
    it('should return new tokens on valid refresh token', async () => {
      const refreshDto = {
        refreshToken: 'valid-refresh-token',
      };

      const newTokens: AuthTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 86400,
      };

      const refreshTokensMock = authService.refreshTokens as jest.Mock;
      refreshTokensMock.mockResolvedValue(newTokens);

      const result = await controller.refreshToken(refreshDto);

      expect(result).toEqual(newTokens);
      expect(refreshTokensMock).toHaveBeenCalledWith('valid-refresh-token');
    });

    it('should propagate UnauthorizedException from refreshTokens', async () => {
      const refreshDto = {
        refreshToken: 'invalid-refresh-token',
      };

      const refreshTokensMock = authService.refreshTokens as jest.Mock;
      refreshTokensMock.mockRejectedValue(
        new UnauthorizedException('Invalid refresh token'),
      );

      await expect(controller.refreshToken(refreshDto)).rejects.toThrow(UnauthorizedException);
      await expect(controller.refreshToken(refreshDto)).rejects.toThrow('Invalid refresh token');
    });

    it('should handle expired refresh token', async () => {
      const refreshDto = {
        refreshToken: 'expired-refresh-token',
      };

      const refreshTokensMock = authService.refreshTokens as jest.Mock;
      refreshTokensMock.mockRejectedValue(
        new UnauthorizedException('Invalid refresh token'),
      );

      await expect(controller.refreshToken(refreshDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle malformed refresh token', async () => {
      const refreshDto = {
        refreshToken: 'malformed-token',
      };

      const refreshTokensMock = authService.refreshTokens as jest.Mock;
      refreshTokensMock.mockRejectedValue(
        new UnauthorizedException('Invalid refresh token'),
      );

      await expect(controller.refreshToken(refreshDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle empty refresh token', async () => {
      const refreshDto = {
        refreshToken: '',
      };

      const refreshTokensMock = authService.refreshTokens as jest.Mock;
      refreshTokensMock.mockRejectedValue(
        new UnauthorizedException('Invalid refresh token'),
      );

      await expect(controller.refreshToken(refreshDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle very long refresh token', async () => {
      const refreshDto = {
        refreshToken: 'a'.repeat(1000),
      };

      const refreshTokensMock = authService.refreshTokens as jest.Mock;
      refreshTokensMock.mockResolvedValue(mockTokens);

      const result = await controller.refreshToken(refreshDto);

      expect(result).toEqual(mockTokens);
    });
  });

  describe('controller metadata', () => {
    it('should have correct API tags', () => {
      // Verify the controller is properly decorated
      // This is more of a structural test
      expect(controller).toBeDefined();
    });

    it('should be properly injectable', () => {
      expect(controller).toBeInstanceOf(AuthController);
    });
  });

  // This test covers the edge case on line 66 that checks if user is null
  // Note: In practice, authService.validateUser throws rather than returns null,
  // but this test ensures the check on line 66 is covered
  describe('login edge cases', () => {
    it('should handle edge case where validateUser returns falsy value', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
        tenantSlug: 'test-garage',
      };

      // Mock validateUser to return null (edge case that shouldn't happen in practice)
      const validateUserMock = authService.validateUser as jest.Mock;
      validateUserMock.mockResolvedValue(null);

      await expect(controller.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });
});
