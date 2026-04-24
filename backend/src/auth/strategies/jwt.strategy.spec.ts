/* eslint-disable @typescript-eslint/no-explicit-any */
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy, AuthenticatedUser } from './jwt.strategy';
import { AuthService, JwtPayload } from '../services/auth.service';
import { TokenBlacklistService } from '../services/token-blacklist.service';
import { JwksService } from '../services/jwks.service';

/**
 * Test suite for JwtStrategy.validate() method.
 *
 * Since JwtStrategy extends PassportStrategy (passport-jwt), the constructor requires
 * passport configuration to initialize. We test the validate() method directly
 * by instantiating with mocks that provide proper passport options.
 */
describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let authService: jest.Mocked<AuthService>;
  let tokenBlacklist: jest.Mocked<TokenBlacklistService>;
  let jwksService: jest.Mocked<JwksService>;

  const mockRequest = {
    headers: {
      authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    },
  } as any;

  const validPayload: JwtPayload = {
    sub: 'user-123:tenant-abc',
    email: 'test@example.com',
    role: 'USER',
    tenantId: 'tenant-abc',
    jti: 'token-id-123',
    iat: Math.floor(Date.now() / 1000),
  };

  beforeEach(() => {
    // Create mocks for dependencies
    authService = {
      extractUserIdFromPayload: jest.fn(),
      extractTenantIdFromPayload: jest.fn(),
    } as any;

    tokenBlacklist = {
      isBlacklisted: jest.fn(),
      isSessionValid: jest.fn(),
    } as any;

    // jwksService mock that returns HS256 options (symmetric)
    jwksService = {
      getPassportJwtOptions: jest.fn().mockReturnValue({
        algorithms: ['HS256'],
        secretOrKey: 'test-secret-key',
      }),
    } as any;

    // Create strategy instance with mocks
    // Note: We pass dummy ConfigService as it's not used in validate()
    strategy = new JwtStrategy(
      { get: () => undefined } as any, // ConfigService (unused in validate)
      authService,
      tokenBlacklist,
      jwksService,
    );
  });

  describe('validate', () => {
    describe('happy path', () => {
      it('should validate and return AuthenticatedUser when all checks pass', async () => {
        authService.extractUserIdFromPayload.mockReturnValue('user-123');
        authService.extractTenantIdFromPayload.mockReturnValue('tenant-abc');
        tokenBlacklist.isBlacklisted.mockResolvedValue(false);
        tokenBlacklist.isSessionValid.mockResolvedValue(true);

        const result = await strategy.validate(mockRequest, validPayload);

        expect(result).toEqual<AuthenticatedUser>({
          userId: 'user-123',
          email: 'test@example.com',
          role: 'USER',
          tenantId: 'tenant-abc',
        });
      });

      it('should attach tenantId and userId to request object', async () => {
        authService.extractUserIdFromPayload.mockReturnValue('user-123');
        authService.extractTenantIdFromPayload.mockReturnValue('tenant-abc');
        tokenBlacklist.isBlacklisted.mockResolvedValue(false);
        tokenBlacklist.isSessionValid.mockResolvedValue(true);

        await strategy.validate(mockRequest, validPayload);

        expect(mockRequest.tenantId).toBe('tenant-abc');
        expect(mockRequest.userId).toBe('user-123');
      });
    });

    describe('payload validation', () => {
      it('should throw UnauthorizedException if payload.sub is missing', async () => {
        const invalidPayload = { ...validPayload, sub: undefined } as any;

        await expect(strategy.validate(mockRequest, invalidPayload)).rejects.toThrow(
          new UnauthorizedException('Invalid token: missing subject'),
        );
      });

      it('should throw UnauthorizedException if payload.sub is null', async () => {
        const invalidPayload = { ...validPayload, sub: null } as any;

        await expect(strategy.validate(mockRequest, invalidPayload)).rejects.toThrow(
          new UnauthorizedException('Invalid token: missing subject'),
        );
      });

      it('should throw UnauthorizedException if payload.sub is empty string', async () => {
        const invalidPayload = { ...validPayload, sub: '' } as any;

        await expect(strategy.validate(mockRequest, invalidPayload)).rejects.toThrow(
          new UnauthorizedException('Invalid token: missing subject'),
        );
      });
    });

    describe('token blacklist checks', () => {
      it('should check if token is blacklisted when jti is present', async () => {
        authService.extractUserIdFromPayload.mockReturnValue('user-123');
        authService.extractTenantIdFromPayload.mockReturnValue('tenant-abc');
        tokenBlacklist.isBlacklisted.mockResolvedValue(false);
        tokenBlacklist.isSessionValid.mockResolvedValue(true);

        await strategy.validate(mockRequest, validPayload);

        expect(tokenBlacklist.isBlacklisted).toHaveBeenCalledWith('token-id-123');
      });

      it('should throw UnauthorizedException if token is blacklisted', async () => {
        authService.extractUserIdFromPayload.mockReturnValue('user-123');
        authService.extractTenantIdFromPayload.mockReturnValue('tenant-abc');
        tokenBlacklist.isBlacklisted.mockResolvedValue(true);

        await expect(strategy.validate(mockRequest, validPayload)).rejects.toThrow(
          new UnauthorizedException('Token revocato'),
        );
      });

      it('should skip blacklist check if jti is not present', async () => {
        const payloadWithoutJti = { ...validPayload, jti: undefined };
        authService.extractUserIdFromPayload.mockReturnValue('user-123');
        authService.extractTenantIdFromPayload.mockReturnValue('tenant-abc');
        tokenBlacklist.isSessionValid.mockResolvedValue(true);

        await strategy.validate(mockRequest, payloadWithoutJti);

        expect(tokenBlacklist.isBlacklisted).not.toHaveBeenCalled();
      });

      it('should skip blacklist check if jti is empty string', async () => {
        const payloadWithEmptyJti = { ...validPayload, jti: '' };
        authService.extractUserIdFromPayload.mockReturnValue('user-123');
        authService.extractTenantIdFromPayload.mockReturnValue('tenant-abc');
        tokenBlacklist.isSessionValid.mockResolvedValue(true);

        await strategy.validate(mockRequest, payloadWithEmptyJti);

        expect(tokenBlacklist.isBlacklisted).not.toHaveBeenCalled();
      });
    });

    describe('session validity checks', () => {
      it('should check if session is valid', async () => {
        authService.extractUserIdFromPayload.mockReturnValue('user-123');
        authService.extractTenantIdFromPayload.mockReturnValue('tenant-abc');
        tokenBlacklist.isBlacklisted.mockResolvedValue(false);
        tokenBlacklist.isSessionValid.mockResolvedValue(true);

        await strategy.validate(mockRequest, validPayload);

        expect(tokenBlacklist.isSessionValid).toHaveBeenCalledWith('user-123', validPayload.iat);
      });

      it('should throw UnauthorizedException if session is invalid', async () => {
        authService.extractUserIdFromPayload.mockReturnValue('user-123');
        authService.extractTenantIdFromPayload.mockReturnValue('tenant-abc');
        tokenBlacklist.isBlacklisted.mockResolvedValue(false);
        tokenBlacklist.isSessionValid.mockResolvedValue(false);

        await expect(strategy.validate(mockRequest, validPayload)).rejects.toThrow(
          new UnauthorizedException('Sessione invalidata'),
        );
      });

      it('should use 0 as default iat if not present in payload', async () => {
        const payloadWithoutIat = { ...validPayload, iat: undefined };
        authService.extractUserIdFromPayload.mockReturnValue('user-123');
        authService.extractTenantIdFromPayload.mockReturnValue('tenant-abc');
        tokenBlacklist.isBlacklisted.mockResolvedValue(false);
        tokenBlacklist.isSessionValid.mockResolvedValue(true);

        await strategy.validate(mockRequest, payloadWithoutIat);

        expect(tokenBlacklist.isSessionValid).toHaveBeenCalledWith('user-123', 0);
      });
    });

    describe('error handling', () => {
      it('should rethrow UnauthorizedException from authService', async () => {
        authService.extractUserIdFromPayload.mockReturnValue('user-123');
        authService.extractTenantIdFromPayload.mockImplementation(() => {
          throw new UnauthorizedException('Custom auth error');
        });

        await expect(strategy.validate(mockRequest, validPayload)).rejects.toThrow(
          new UnauthorizedException('Custom auth error'),
        );
      });

      it('should catch non-UnauthorizedException errors and throw generic message', async () => {
        authService.extractUserIdFromPayload.mockImplementation(() => {
          throw new Error('Unexpected error');
        });

        await expect(strategy.validate(mockRequest, validPayload)).rejects.toThrow(
          new UnauthorizedException('Invalid token format'),
        );
      });

      it('should catch UnauthorizedException from tokenBlacklist and rethrow', async () => {
        authService.extractUserIdFromPayload.mockReturnValue('user-123');
        authService.extractTenantIdFromPayload.mockReturnValue('tenant-abc');
        tokenBlacklist.isBlacklisted.mockImplementation(() => {
          throw new UnauthorizedException('Blacklist check failed');
        });

        await expect(strategy.validate(mockRequest, validPayload)).rejects.toThrow(
          new UnauthorizedException('Blacklist check failed'),
        );
      });

      it('should handle errors from isSessionValid gracefully', async () => {
        authService.extractUserIdFromPayload.mockReturnValue('user-123');
        authService.extractTenantIdFromPayload.mockReturnValue('tenant-abc');
        tokenBlacklist.isBlacklisted.mockResolvedValue(false);
        tokenBlacklist.isSessionValid.mockImplementation(() => {
          throw new Error('Session service error');
        });

        await expect(strategy.validate(mockRequest, validPayload)).rejects.toThrow(
          new UnauthorizedException('Invalid token format'),
        );
      });
    });

    describe('request context attachment', () => {
      it('should properly type-cast request when attaching properties', async () => {
        const testReq = {} as any;
        authService.extractUserIdFromPayload.mockReturnValue('user-456');
        authService.extractTenantIdFromPayload.mockReturnValue('tenant-xyz');
        tokenBlacklist.isBlacklisted.mockResolvedValue(false);
        tokenBlacklist.isSessionValid.mockResolvedValue(true);

        await strategy.validate(testReq, validPayload);

        expect(testReq.tenantId).toBe('tenant-xyz');
        expect(testReq.userId).toBe('user-456');
      });

      it('should overwrite existing tenantId on request', async () => {
        const testReq = { tenantId: 'old-tenant' } as any;
        authService.extractUserIdFromPayload.mockReturnValue('user-123');
        authService.extractTenantIdFromPayload.mockReturnValue('new-tenant');
        tokenBlacklist.isBlacklisted.mockResolvedValue(false);
        tokenBlacklist.isSessionValid.mockResolvedValue(true);

        await strategy.validate(testReq, validPayload);

        expect(testReq.tenantId).toBe('new-tenant');
      });

      it('should overwrite existing userId on request', async () => {
        const testReq = { userId: 'old-user' } as any;
        authService.extractUserIdFromPayload.mockReturnValue('new-user');
        authService.extractTenantIdFromPayload.mockReturnValue('tenant-abc');
        tokenBlacklist.isBlacklisted.mockResolvedValue(false);
        tokenBlacklist.isSessionValid.mockResolvedValue(true);

        await strategy.validate(testReq, validPayload);

        expect(testReq.userId).toBe('new-user');
      });
    });

    describe('payload extraction and transformation', () => {
      it('should extract userId via authService', async () => {
        authService.extractUserIdFromPayload.mockReturnValue('extracted-user-id');
        authService.extractTenantIdFromPayload.mockReturnValue('tenant-abc');
        tokenBlacklist.isBlacklisted.mockResolvedValue(false);
        tokenBlacklist.isSessionValid.mockResolvedValue(true);

        const result = await strategy.validate(mockRequest, validPayload);

        expect(result.userId).toBe('extracted-user-id');
        expect(authService.extractUserIdFromPayload).toHaveBeenCalledWith(validPayload);
      });

      it('should extract tenantId via authService', async () => {
        authService.extractUserIdFromPayload.mockReturnValue('user-123');
        authService.extractTenantIdFromPayload.mockReturnValue('extracted-tenant-id');
        tokenBlacklist.isBlacklisted.mockResolvedValue(false);
        tokenBlacklist.isSessionValid.mockResolvedValue(true);

        const result = await strategy.validate(mockRequest, validPayload);

        expect(result.tenantId).toBe('extracted-tenant-id');
        expect(authService.extractTenantIdFromPayload).toHaveBeenCalledWith(validPayload);
      });

      it('should use payload email directly in response', async () => {
        authService.extractUserIdFromPayload.mockReturnValue('user-123');
        authService.extractTenantIdFromPayload.mockReturnValue('tenant-abc');
        tokenBlacklist.isBlacklisted.mockResolvedValue(false);
        tokenBlacklist.isSessionValid.mockResolvedValue(true);

        const result = await strategy.validate(mockRequest, validPayload);

        expect(result.email).toBe('test@example.com');
      });

      it('should use payload role directly in response', async () => {
        authService.extractUserIdFromPayload.mockReturnValue('user-123');
        authService.extractTenantIdFromPayload.mockReturnValue('tenant-abc');
        tokenBlacklist.isBlacklisted.mockResolvedValue(false);
        tokenBlacklist.isSessionValid.mockResolvedValue(true);

        const result = await strategy.validate(mockRequest, validPayload);

        expect(result.role).toBe('USER');
      });

      it('should handle different roles in payload', async () => {
        const adminPayload = { ...validPayload, role: 'ADMIN' };
        authService.extractUserIdFromPayload.mockReturnValue('user-123');
        authService.extractTenantIdFromPayload.mockReturnValue('tenant-abc');
        tokenBlacklist.isBlacklisted.mockResolvedValue(false);
        tokenBlacklist.isSessionValid.mockResolvedValue(true);

        const result = await strategy.validate(mockRequest, adminPayload);

        expect(result.role).toBe('ADMIN');
      });
    });

    describe('edge cases', () => {
      it('should handle payload with all optional fields missing', async () => {
        const minimalPayload: JwtPayload = {
          sub: 'user-123:tenant-abc',
          email: 'test@example.com',
          role: 'USER',
          tenantId: 'tenant-abc',
        };
        authService.extractUserIdFromPayload.mockReturnValue('user-123');
        authService.extractTenantIdFromPayload.mockReturnValue('tenant-abc');
        tokenBlacklist.isSessionValid.mockResolvedValue(true);

        const result = await strategy.validate(mockRequest, minimalPayload);

        expect(result).toBeDefined();
        expect(tokenBlacklist.isBlacklisted).not.toHaveBeenCalled();
      });

      it('should handle payload with all fields populated', async () => {
        const fullPayload: JwtPayload = {
          sub: 'user-123:tenant-abc',
          email: 'test@example.com',
          role: 'SUPER_ADMIN',
          tenantId: 'tenant-abc',
          jti: 'jti-123',
          familyId: 'family-456',
          iat: 1000,
          exp: 2000,
        };
        authService.extractUserIdFromPayload.mockReturnValue('user-123');
        authService.extractTenantIdFromPayload.mockReturnValue('tenant-abc');
        tokenBlacklist.isBlacklisted.mockResolvedValue(false);
        tokenBlacklist.isSessionValid.mockResolvedValue(true);

        const result = await strategy.validate(mockRequest, fullPayload);

        expect(result.email).toBe('test@example.com');
        expect(result.role).toBe('SUPER_ADMIN');
      });

      it('should handle very large iat values', async () => {
        const largeIat = 9999999999;
        const payloadWithLargeIat = { ...validPayload, iat: largeIat };
        authService.extractUserIdFromPayload.mockReturnValue('user-123');
        authService.extractTenantIdFromPayload.mockReturnValue('tenant-abc');
        tokenBlacklist.isBlacklisted.mockResolvedValue(false);
        tokenBlacklist.isSessionValid.mockResolvedValue(true);

        await strategy.validate(mockRequest, payloadWithLargeIat);

        expect(tokenBlacklist.isSessionValid).toHaveBeenCalledWith('user-123', largeIat);
      });

      it('should handle zero iat value', async () => {
        const payloadWithZeroIat = { ...validPayload, iat: 0 };
        authService.extractUserIdFromPayload.mockReturnValue('user-123');
        authService.extractTenantIdFromPayload.mockReturnValue('tenant-abc');
        tokenBlacklist.isBlacklisted.mockResolvedValue(false);
        tokenBlacklist.isSessionValid.mockResolvedValue(true);

        await strategy.validate(mockRequest, payloadWithZeroIat);

        expect(tokenBlacklist.isSessionValid).toHaveBeenCalledWith('user-123', 0);
      });

      it('should handle special characters in email', async () => {
        const specialEmailPayload = {
          ...validPayload,
          email: 'test+alias@example.co.uk',
        };
        authService.extractUserIdFromPayload.mockReturnValue('user-123');
        authService.extractTenantIdFromPayload.mockReturnValue('tenant-abc');
        tokenBlacklist.isBlacklisted.mockResolvedValue(false);
        tokenBlacklist.isSessionValid.mockResolvedValue(true);

        const result = await strategy.validate(mockRequest, specialEmailPayload);

        expect(result.email).toBe('test+alias@example.co.uk');
      });
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete valid authentication flow', async () => {
      authService.extractUserIdFromPayload.mockReturnValue('user-123');
      authService.extractTenantIdFromPayload.mockReturnValue('tenant-abc');
      tokenBlacklist.isBlacklisted.mockResolvedValue(false);
      tokenBlacklist.isSessionValid.mockResolvedValue(true);

      const result = await strategy.validate(mockRequest, validPayload);

      expect(result).toEqual<AuthenticatedUser>({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'USER',
        tenantId: 'tenant-abc',
      });
      expect(mockRequest.tenantId).toBe('tenant-abc');
      expect(mockRequest.userId).toBe('user-123');
    });

    it('should handle multiple validation attempts independently', async () => {
      authService.extractUserIdFromPayload.mockReturnValue('user-123');
      authService.extractTenantIdFromPayload.mockReturnValue('tenant-abc');
      tokenBlacklist.isBlacklisted.mockResolvedValue(false);
      tokenBlacklist.isSessionValid.mockResolvedValue(true);

      const result1 = await strategy.validate(mockRequest, validPayload);
      expect(result1.userId).toBe('user-123');

      // Reset mocks and test with different user
      authService.extractUserIdFromPayload.mockReturnValue('user-456');
      authService.extractTenantIdFromPayload.mockReturnValue('tenant-xyz');

      const result2 = await strategy.validate(mockRequest, {
        ...validPayload,
        tenantId: 'tenant-xyz',
      });
      expect(result2.userId).toBe('user-456');
      expect(result2.tenantId).toBe('tenant-xyz');
    });
  });
});
