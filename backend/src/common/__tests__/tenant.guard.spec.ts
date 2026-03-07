import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TenantGuard } from '../guard/tenant.guard';

describe('TenantGuard', () => {
  let guard: TenantGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TenantGuard],
    }).compile();

    guard = module.get<TenantGuard>(TenantGuard);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockExecutionContext = (request: any): ExecutionContext => {
    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
      }),
      getClass: jest.fn(),
      getHandler: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn().mockReturnValue('http'),
    } as unknown as ExecutionContext;
  };

  describe('canActivate', () => {
    it('should allow access when valid tenant ID is present', () => {
      const request = {
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
      };
      const context = createMockExecutionContext(request);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw UnauthorizedException when tenant ID is missing', () => {
      const request = {};
      const context = createMockExecutionContext(request);

      expect(() => guard.canActivate(context)).toThrow(
        new UnauthorizedException('Tenant ID is required')
      );
    });

    it('should throw UnauthorizedException when tenant ID is null', () => {
      const request = { tenantId: null };
      const context = createMockExecutionContext(request);

      expect(() => guard.canActivate(context)).toThrow(
        new UnauthorizedException('Tenant ID is required')
      );
    });

    it('should throw UnauthorizedException when tenant ID is undefined', () => {
      const request = { tenantId: undefined };
      const context = createMockExecutionContext(request);

      expect(() => guard.canActivate(context)).toThrow(
        new UnauthorizedException('Tenant ID is required')
      );
    });

    it('should throw UnauthorizedException when tenant ID is empty string', () => {
      const request = { tenantId: '' };
      const context = createMockExecutionContext(request);

      expect(() => guard.canActivate(context)).toThrow(
        new UnauthorizedException('Tenant ID is required')
      );
    });

    it('should throw ForbiddenException for invalid UUID format', () => {
      const invalidUUIDs = [
        'not-a-uuid',
        '12345',
        '123e4567-e89b-12d3-a456', // incomplete
        '123e4567e89b12d3a456426614174000', // no dashes
        '123e4567-e89b-12d3-a456-42661417400g', // invalid character
      ];

      for (const invalidUUID of invalidUUIDs) {
        const request = { tenantId: invalidUUID };
        const context = createMockExecutionContext(request);

        expect(() => guard.canActivate(context)).toThrow(
          new ForbiddenException('Invalid tenant ID format')
        );
      }
    });

    it('should accept valid UUID v4 format', () => {
      const validUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      ];

      for (const validUUID of validUUIDs) {
        const request = { tenantId: validUUID };
        const context = createMockExecutionContext(request);

        expect(guard.canActivate(context)).toBe(true);
      }
    });

    it('should accept valid UUID v1 format', () => {
      const validUUIDv1 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
      const request = { tenantId: validUUIDv1 };
      const context = createMockExecutionContext(request);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should accept uppercase UUIDs', () => {
      const upperUUID = '123E4567-E89B-12D3-A456-426614174000';
      const request = { tenantId: upperUUID };
      const context = createMockExecutionContext(request);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should throw ForbiddenException when user tenant does not match request tenant', () => {
      const request = {
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        user: {
          tenantId: '999e4567-e89b-12d3-a456-426614174999', // Different tenant
        },
      };
      const context = createMockExecutionContext(request);

      expect(() => guard.canActivate(context)).toThrow(
        new ForbiddenException('User does not have access to this tenant')
      );
    });

    it('should allow access when user tenant matches request tenant', () => {
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      const request = {
        tenantId,
        user: {
          tenantId,
        },
      };
      const context = createMockExecutionContext(request);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access when user has no tenantId (super admin case)', () => {
      const request = {
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        user: {
          id: 'user-123',
          // No tenantId - super admin can access any tenant
        },
      };
      const context = createMockExecutionContext(request);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access when no user is present (unauthenticated request)', () => {
      const request = {
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        // No user property
      };
      const context = createMockExecutionContext(request);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should preserve tenantId on request object', () => {
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      const request = { tenantId };
      const context = createMockExecutionContext(request);

      guard.canActivate(context);

      expect(request.tenantId).toBe(tenantId);
    });
  });

  describe('UUID validation edge cases', () => {
    it('should reject UUID with wrong version', () => {
      // Version 6 UUID (not accepted by our regex)
      const request = { tenantId: '1e8400e7-88b9-6d4a-a716-446655440000' };
      const context = createMockExecutionContext(request);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should reject UUID with wrong variant', () => {
      // Variant 0 (not accepted by our regex)
      const request = { tenantId: '123e4567-e89b-02d3-a456-426614174000' };
      const context = createMockExecutionContext(request);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should accept all valid variant bits (8, 9, a, b)', () => {
      const variants = ['8', '9', 'a', 'b'];
      
      for (const variant of variants) {
        const uuid = `123e4567-e89b-12d3-${variant}456-426614174000`;
        const request = { tenantId: uuid };
        const context = createMockExecutionContext(request);

        expect(guard.canActivate(context)).toBe(true);
      }
    });
  });

  describe('integration with JWT middleware', () => {
    it('should work with JWT-authenticated request', () => {
      const request = {
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        user: {
          id: 'user-123',
          email: 'user@example.com',
          tenantId: '123e4567-e89b-12d3-a456-426614174000',
          role: 'ADMIN',
        },
      };
      const context = createMockExecutionContext(request);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should block cross-tenant access attempt', () => {
      const request = {
        tenantId: '123e4567-e89b-12d3-a456-426614174000', // Request tenant
        user: {
          id: 'user-123',
          tenantId: '999e4567-e89b-12d3-a456-426614174999', // User belongs to different tenant
          role: 'ADMIN',
        },
      };
      const context = createMockExecutionContext(request);

      expect(() => guard.canActivate(context)).toThrow(
        new ForbiddenException('User does not have access to this tenant')
      );
    });
  });
});
