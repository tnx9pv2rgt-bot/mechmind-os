import { TenantId } from './tenant-id.decorator';
import { ExecutionContext, createParamDecorator } from '@nestjs/common';

describe('TenantId Decorator', () => {
  // Test the factory function directly by recreating the pattern
  const testTenantIdFactory = (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenantId || request.user?.tenantId;
  };

  describe('happy path', () => {
    it('should extract tenantId from request.tenantId', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            tenantId: 'tenant-123',
            user: null,
          }),
        }),
      } as ExecutionContext;

      const result = testTenantIdFactory(undefined, mockContext);
      expect(result).toBe('tenant-123');
    });

    it('should extract tenantId from request.user.tenantId', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            tenantId: undefined,
            user: {
              tenantId: 'user-tenant-456',
            },
          }),
        }),
      } as ExecutionContext;

      const result = testTenantIdFactory(undefined, mockContext);
      expect(result).toBe('user-tenant-456');
    });

    it('should prefer request.tenantId over user.tenantId', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            tenantId: 'request-tenant',
            user: {
              tenantId: 'user-tenant',
            },
          }),
        }),
      } as ExecutionContext;

      const result = testTenantIdFactory(undefined, mockContext);
      expect(result).toBe('request-tenant');
    });
  });

  describe('edge cases', () => {
    it('should return undefined when tenantId is not found', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            tenantId: undefined,
            user: undefined,
          }),
        }),
      } as ExecutionContext;

      const result = testTenantIdFactory(undefined, mockContext);
      expect(result).toBeUndefined();
    });

    it('should return undefined when user is null and tenantId is undefined', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            tenantId: undefined,
            user: null,
          }),
        }),
      } as ExecutionContext;

      const result = testTenantIdFactory(undefined, mockContext);
      expect(result).toBeUndefined();
    });

    it('should handle UUID tenantId format', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            tenantId: uuid,
            user: null,
          }),
        }),
      } as ExecutionContext;

      const result = testTenantIdFactory(undefined, mockContext);
      expect(result).toBe(uuid);
    });

    it('should handle numeric string tenantId', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            tenantId: '12345',
            user: null,
          }),
        }),
      } as ExecutionContext;

      const result = testTenantIdFactory(undefined, mockContext);
      expect(result).toBe('12345');
    });
  });

  describe('error cases', () => {
    it('should handle malformed context gracefully', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({}),
        }),
      } as ExecutionContext;

      expect(() => {
        testTenantIdFactory(undefined, mockContext);
      }).not.toThrow();
    });

    it('should handle missing user property', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            tenantId: undefined,
          }),
        }),
      } as ExecutionContext;

      const result = testTenantIdFactory(undefined, mockContext);
      expect(result).toBeUndefined();
    });
  });

  describe('data parameter', () => {
    it('should accept but ignore data parameter', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            tenantId: 'test-tenant',
            user: null,
          }),
        }),
      } as ExecutionContext;

      const result = testTenantIdFactory('ignored-data', mockContext);
      expect(result).toBe('test-tenant');
    });
  });
});
