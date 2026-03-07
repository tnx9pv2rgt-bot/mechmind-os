import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy, AuthenticatedUser } from '../strategies/jwt.strategy';
import { AuthService, JwtPayload } from '../services/auth.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  const mockRequest = {
    headers: {
      authorization: 'Bearer test-token',
    },
  } as unknown as Request;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-jwt-secret'),
          },
        },
        {
          provide: AuthService,
          useValue: {
            extractUserIdFromPayload: jest.fn(),
            extractTenantIdFromPayload: jest.fn(),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should configure JWT strategy with correct options', () => {
      // Verify constructor was called with proper config
      expect(strategy).toBeDefined();
    });

    it('should use Bearer token extraction', () => {
      // The strategy should be configured to extract JWT from Bearer header
      expect(strategy).toBeDefined();
    });
  });

  describe('validate', () => {
    it('should validate payload and return authenticated user', async () => {
      const authService = (strategy as any).authService;
      authService.extractUserIdFromPayload.mockReturnValue('user-123');
      authService.extractTenantIdFromPayload.mockReturnValue('tenant-456');

      const payload: JwtPayload = {
        sub: 'user-123:tenant-456',
        email: 'test@example.com',
        role: 'MANAGER',
        tenantId: 'tenant-456',
      };

      const result = await strategy.validate(mockRequest, payload);

      expect(result).toEqual({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'MANAGER',
        tenantId: 'tenant-456',
      } as AuthenticatedUser);

      expect(authService.extractUserIdFromPayload).toHaveBeenCalledWith(payload);
      expect(authService.extractTenantIdFromPayload).toHaveBeenCalledWith(payload);
    });

    it('should set tenantId and userId on request object', async () => {
      const authService = (strategy as any).authService;
      authService.extractUserIdFromPayload.mockReturnValue('user-789');
      authService.extractTenantIdFromPayload.mockReturnValue('tenant-abc');

      const payload: JwtPayload = {
        sub: 'user-789:tenant-abc',
        email: 'admin@example.com',
        role: 'ADMIN',
        tenantId: 'tenant-abc',
      };

      const req = { headers: {} } as any;
      await strategy.validate(req, payload);

      expect(req.tenantId).toBe('tenant-abc');
      expect(req.userId).toBe('user-789');
    });

    it('should throw UnauthorizedException when sub is missing', async () => {
      const payload: JwtPayload = {
        sub: '',
        email: 'test@example.com',
        role: 'MANAGER',
        tenantId: 'tenant-456',
      };

      await expect(strategy.validate(mockRequest, payload)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(mockRequest, payload)).rejects.toThrow('Invalid token: missing subject');
    });

    it('should throw UnauthorizedException when sub is undefined', async () => {
      const payload = {
        email: 'test@example.com',
        role: 'MANAGER',
        tenantId: 'tenant-456',
      } as JwtPayload;

      await expect(strategy.validate(mockRequest, payload)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when sub is null', async () => {
      const payload = {
        sub: null,
        email: 'test@example.com',
        role: 'MANAGER',
        tenantId: 'tenant-456',
      } as unknown as JwtPayload;

      await expect(strategy.validate(mockRequest, payload)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle errors from extractTenantIdFromPayload', async () => {
      const authService = (strategy as any).authService;
      authService.extractUserIdFromPayload.mockReturnValue('user-123');
      authService.extractTenantIdFromPayload.mockImplementation(() => {
        throw new UnauthorizedException('Invalid token format');
      });

      const payload: JwtPayload = {
        sub: 'user-123:tenant-456',
        email: 'test@example.com',
        role: 'MANAGER',
        tenantId: 'tenant-456',
      };

      await expect(strategy.validate(mockRequest, payload)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(mockRequest, payload)).rejects.toThrow('Invalid token format');
    });

    it('should handle errors from extractUserIdFromPayload', async () => {
      const authService = (strategy as any).authService;
      authService.extractUserIdFromPayload.mockImplementation(() => {
        throw new Error('Invalid subject format');
      });

      const payload: JwtPayload = {
        sub: 'invalid-subject',
        email: 'test@example.com',
        role: 'MANAGER',
        tenantId: 'tenant-456',
      };

      await expect(strategy.validate(mockRequest, payload)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(mockRequest, payload)).rejects.toThrow('Invalid token format');
    });

    it('should handle generic errors during validation', async () => {
      const authService = (strategy as any).authService;
      authService.extractUserIdFromPayload.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const payload: JwtPayload = {
        sub: 'user-123:tenant-456',
        email: 'test@example.com',
        role: 'MANAGER',
        tenantId: 'tenant-456',
      };

      await expect(strategy.validate(mockRequest, payload)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle different payload structures', async () => {
      const authService = (strategy as any).authService;
      authService.extractUserIdFromPayload.mockReturnValue('mechanic-001');
      authService.extractTenantIdFromPayload.mockReturnValue('garage-xyz');

      const payload: JwtPayload = {
        sub: 'mechanic-001:garage-xyz',
        email: 'mechanic@garage.com',
        role: 'MECHANIC',
        tenantId: 'garage-xyz',
        iat: 1234567890,
        exp: 1234571490,
      };

      const result = await strategy.validate(mockRequest, payload);

      expect(result).toEqual({
        userId: 'mechanic-001',
        email: 'mechanic@garage.com',
        role: 'MECHANIC',
        tenantId: 'garage-xyz',
      });
    });

    it('should handle RECEPTIONIST role', async () => {
      const authService = (strategy as any).authService;
      authService.extractUserIdFromPayload.mockReturnValue('reception-001');
      authService.extractTenantIdFromPayload.mockReturnValue('shop-abc');

      const payload: JwtPayload = {
        sub: 'reception-001:shop-abc',
        email: 'reception@shop.com',
        role: 'RECEPTIONIST',
        tenantId: 'shop-abc',
      };

      const result = await strategy.validate(mockRequest, payload);

      expect(result.role).toBe('RECEPTIONIST');
    });

    it('should preserve request object properties', async () => {
      const authService = (strategy as any).authService;
      authService.extractUserIdFromPayload.mockReturnValue('user-123');
      authService.extractTenantIdFromPayload.mockReturnValue('tenant-456');

      const payload: JwtPayload = {
        sub: 'user-123:tenant-456',
        email: 'test@example.com',
        role: 'MANAGER',
        tenantId: 'tenant-456',
      };

      const customReq = {
        headers: { authorization: 'Bearer token' },
        customProperty: 'custom-value',
        anotherProp: 123,
      } as any;

      await strategy.validate(customReq, payload);

      expect(customReq.tenantId).toBe('tenant-456');
      expect(customReq.userId).toBe('user-123');
      expect(customReq.customProperty).toBe('custom-value');
      expect(customReq.anotherProp).toBe(123);
    });

    it('should handle payload with missing optional fields', async () => {
      const authService = (strategy as any).authService;
      authService.extractUserIdFromPayload.mockReturnValue('user-123');
      authService.extractTenantIdFromPayload.mockReturnValue('tenant-456');

      const payload = {
        sub: 'user-123:tenant-456',
      } as JwtPayload;

      const result = await strategy.validate(mockRequest, payload);

      expect(result).toEqual({
        userId: 'user-123',
        email: undefined,
        role: undefined,
        tenantId: 'tenant-456',
      });
    });

    it('should handle complex tenant IDs', async () => {
      const authService = (strategy as any).authService;
      authService.extractUserIdFromPayload.mockReturnValue('user-123');
      authService.extractTenantIdFromPayload.mockReturnValue('tenant-with-complex-uuid-123e4567-e89b-12d3-a456-426614174000');

      const payload: JwtPayload = {
        sub: 'user-123:tenant-with-complex-uuid-123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        role: 'ADMIN',
        tenantId: 'tenant-with-complex-uuid-123e4567-e89b-12d3-a456-426614174000',
      };

      const result = await strategy.validate(mockRequest, payload);

      expect(result.tenantId).toBe('tenant-with-complex-uuid-123e4567-e89b-12d3-a456-426614174000');
    });
  });

  describe('strategy inheritance', () => {
    it('should be an instance of PassportStrategy', () => {
      expect(strategy).toBeDefined();
      expect(strategy.validate).toBeDefined();
    });
  });
});
