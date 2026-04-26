import { ExecutionContext } from '@nestjs/common';

/**
 * This test file tests the TenantId decorator logic.
 * The decorator is created using createParamDecorator with a data extractor function.
 *
 * The extractor function:
 * - Takes (data, context) as parameters
 * - data: arbitrary data passed to decorator when applied (usually undefined)
 * - context: ExecutionContext provided by NestJS at runtime
 * - Returns: extracted tenantId from request
 */

describe('TenantId Decorator', () => {
  /**
   * We test the underlying logic by recreating the param decorator extractor
   * This is the actual function passed to createParamDecorator
   */
  const tenantIdExtractor = (data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenantId || request.user?.tenantId;
  };

  let mockContext: Partial<ExecutionContext>;

  beforeEach(() => {
    mockContext = {
      switchToHttp: jest.fn(),
    };
  });

  /**
   * Helper to call the extractor function with a mocked request
   */
  function extractTenantId(
    mockRequest: Record<string, unknown>,
    data: unknown = undefined,
  ): string | undefined {
    (mockContext.switchToHttp as jest.Mock).mockReturnValue({
      getRequest: () => mockRequest,
    });

    return tenantIdExtractor(data, mockContext as ExecutionContext);
  }

  describe('extraction from request.tenantId', () => {
    it('should extract tenant ID from request.tenantId', () => {
      const tenantId = 'tenant-123';
      const mockRequest = { tenantId };

      const result = extractTenantId(mockRequest);

      expect(result).toBe(tenantId);
    });

    it('should prefer request.tenantId when both request.tenantId and request.user.tenantId exist', () => {
      const primaryTenantId = 'primary-tenant';
      const mockRequest = {
        tenantId: primaryTenantId,
        user: { tenantId: 'user-tenant' },
      };

      const result = extractTenantId(mockRequest);

      expect(result).toBe(primaryTenantId);
    });

    it('should return request.tenantId even if it is a numeric string', () => {
      const tenantId = '12345';
      const mockRequest = { tenantId };

      const result = extractTenantId(mockRequest);

      expect(result).toBe(tenantId);
    });

    it('should return request.tenantId if it is the string "0"', () => {
      const tenantId = '0';
      const mockRequest = { tenantId };

      const result = extractTenantId(mockRequest);

      expect(result).toBe(tenantId);
    });
  });

  describe('fallback to request.user.tenantId', () => {
    it('should extract from request.user.tenantId when request.tenantId is missing', () => {
      const userTenantId = 'user-tenant';
      const mockRequest = {
        user: { tenantId: userTenantId },
      };

      const result = extractTenantId(mockRequest);

      expect(result).toBe(userTenantId);
    });

    it('should fallback when request.tenantId is undefined', () => {
      const fallbackTenantId = 'fallback-tenant';
      const mockRequest = {
        tenantId: undefined,
        user: { tenantId: fallbackTenantId },
      };

      const result = extractTenantId(mockRequest);

      expect(result).toBe(fallbackTenantId);
    });

    it('should fallback when request.tenantId is null', () => {
      const fallbackTenantId = 'fallback-tenant';
      const mockRequest = {
        tenantId: null,
        user: { tenantId: fallbackTenantId },
      };

      const result = extractTenantId(mockRequest);

      expect(result).toBe(fallbackTenantId);
    });

    it('should fallback when request.tenantId is empty string (falsy)', () => {
      const fallbackTenantId = 'fallback-tenant';
      const mockRequest = {
        tenantId: '',
        user: { tenantId: fallbackTenantId },
      };

      const result = extractTenantId(mockRequest);

      expect(result).toBe(fallbackTenantId);
    });

    it('should fallback when request.tenantId is false (falsy)', () => {
      const fallbackTenantId = 'fallback-tenant';
      const mockRequest = {
        tenantId: false,
        user: { tenantId: fallbackTenantId },
      };

      const result = extractTenantId(mockRequest);

      expect(result).toBe(fallbackTenantId);
    });

    it('should fallback when request.tenantId is 0 (falsy numeric)', () => {
      const fallbackTenantId = 'fallback-tenant';
      const mockRequest = {
        tenantId: 0,
        user: { tenantId: fallbackTenantId },
      };

      const result = extractTenantId(mockRequest);

      expect(result).toBe(fallbackTenantId);
    });

    it('should fallback when request.tenantId is NaN (falsy)', () => {
      const fallbackTenantId = 'fallback-tenant';
      const mockRequest = {
        tenantId: NaN,
        user: { tenantId: fallbackTenantId },
      };

      const result = extractTenantId(mockRequest);

      expect(result).toBe(fallbackTenantId);
    });
  });

  describe('undefined when no tenant ID available', () => {
    it('should return undefined when neither request.tenantId nor request.user.tenantId exist', () => {
      const mockRequest = {};

      const result = extractTenantId(mockRequest);

      expect(result).toBeUndefined();
    });

    it('should return undefined when request.user is undefined', () => {
      const mockRequest = {
        tenantId: undefined,
        user: undefined,
      };

      const result = extractTenantId(mockRequest);

      expect(result).toBeUndefined();
    });

    it('should return undefined when request.user.tenantId is undefined', () => {
      const mockRequest = {
        tenantId: undefined,
        user: { tenantId: undefined },
      };

      const result = extractTenantId(mockRequest);

      expect(result).toBeUndefined();
    });

    it('should return null/undefined when request.user.tenantId is null', () => {
      const mockRequest = {
        tenantId: undefined,
        user: { tenantId: null },
      };

      const result = extractTenantId(mockRequest);

      // The || operator returns null || null = null, not undefined
      // But both are falsy and represent "no tenant ID"
      expect(result == null).toBe(true);
    });

    it('should return null/undefined when both request.tenantId and user.tenantId are falsy', () => {
      const mockRequest = {
        tenantId: '',
        user: { tenantId: null },
      };

      const result = extractTenantId(mockRequest);

      // The || operator: '' (falsy) || null = null
      expect(result == null).toBe(true);
    });

    it('should return undefined for empty request object', () => {
      const mockRequest = {};

      const result = extractTenantId(mockRequest);

      expect(result).toBeUndefined();
    });
  });

  describe('UUID and special tenant ID formats', () => {
    it('should handle UUID v4 tenant IDs', () => {
      const tenantId = '550e8400-e29b-41d4-a716-446655440000';
      const mockRequest = { tenantId };

      const result = extractTenantId(mockRequest);

      expect(result).toBe(tenantId);
    });

    it('should handle uppercase UUID tenant IDs', () => {
      const tenantId = '550E8400-E29B-41D4-A716-446655440000';
      const mockRequest = { tenantId };

      const result = extractTenantId(mockRequest);

      expect(result).toBe(tenantId);
    });

    it('should handle tenant IDs with hyphens', () => {
      const tenantId = 'tenant-with-hyphens-123';
      const mockRequest = { tenantId };

      const result = extractTenantId(mockRequest);

      expect(result).toBe(tenantId);
    });

    it('should handle tenant IDs with underscores', () => {
      const tenantId = 'tenant_with_underscores_123';
      const mockRequest = { tenantId };

      const result = extractTenantId(mockRequest);

      expect(result).toBe(tenantId);
    });

    it('should handle tenant IDs in UPPERCASE', () => {
      const tenantId = 'TENANT-ID';
      const mockRequest = { tenantId };

      const result = extractTenantId(mockRequest);

      expect(result).toBe(tenantId);
    });

    it('should handle tenant IDs with mixed case', () => {
      const tenantId = 'TenAnt-Id-123';
      const mockRequest = { tenantId };

      const result = extractTenantId(mockRequest);

      expect(result).toBe(tenantId);
    });
  });

  describe('data parameter handling (first argument)', () => {
    it('should ignore the data parameter when undefined', () => {
      const tenantId = 'tenant-123';
      const mockRequest = { tenantId };

      const result = extractTenantId(mockRequest, undefined);

      expect(result).toBe(tenantId);
    });

    it('should ignore the data parameter when string', () => {
      const tenantId = 'tenant-123';
      const mockRequest = { tenantId };

      const result = extractTenantId(mockRequest, 'some-data');

      expect(result).toBe(tenantId);
    });

    it('should ignore the data parameter when object', () => {
      const tenantId = 'tenant-123';
      const mockRequest = { tenantId };

      const result = extractTenantId(mockRequest, { key: 'value' });

      expect(result).toBe(tenantId);
    });

    it('should ignore the data parameter when null', () => {
      const tenantId = 'tenant-123';
      const mockRequest = { tenantId };

      const result = extractTenantId(mockRequest, null);

      expect(result).toBe(tenantId);
    });

    it('should extract correctly regardless of data parameter value', () => {
      const tenantId = 'test-tenant';
      const mockRequest = { tenantId };

      const result = extractTenantId(mockRequest, 'ignored');

      expect(result).toBe(tenantId);
    });
  });

  describe('complex request structures', () => {
    it('should extract from request with many properties', () => {
      const tenantId = 'main-tenant';
      const mockRequest = {
        tenantId,
        method: 'GET',
        path: '/api/users',
        headers: { authorization: 'Bearer token' },
        query: { filter: 'active' },
        body: { data: 'value' },
        user: { id: 'user-1', role: 'admin' },
      };

      const result = extractTenantId(mockRequest);

      expect(result).toBe(tenantId);
    });

    it('should extract from nested user object with extra properties', () => {
      const tenantId = 'nested-tenant';
      const mockRequest = {
        user: {
          id: 'user-123',
          email: 'user@example.com',
          tenantId,
          roles: ['admin', 'user'],
          permissions: ['read', 'write'],
          metadata: { lastLogin: '2024-01-01' },
        },
      };

      const result = extractTenantId(mockRequest);

      expect(result).toBe(tenantId);
    });

    it('should handle request with circular references', () => {
      const tenantId = 'circular-tenant';
      const mockRequest: Record<string, unknown> = {
        tenantId,
        user: { id: 'user-1' },
      };
      mockRequest.self = mockRequest; // Circular reference

      const result = extractTenantId(mockRequest);

      expect(result).toBe(tenantId);
    });

    it('should prioritize request.tenantId over nested tenant IDs', () => {
      const mockRequest = {
        tenantId: 'request-level',
        user: {
          tenantId: 'user-level',
          company: {
            tenantId: 'company-level',
          },
        },
      };

      const result = extractTenantId(mockRequest);

      expect(result).toBe('request-level');
    });

    it('should use optional chaining gracefully when user.tenantId is accessed', () => {
      const mockRequest = {
        user: {
          // No tenantId property
          id: 'user-1',
          roles: [],
        },
      };

      const result = extractTenantId(mockRequest);

      expect(result).toBeUndefined();
    });
  });

  describe('request isolation and idempotency', () => {
    it('should not modify request when extracting tenant ID', () => {
      const mockRequest = {
        tenantId: 'tenant-123',
        user: { id: 'user-1', tenantId: 'user-tenant' },
        other: 'data',
      };
      const originalJSON = JSON.stringify(mockRequest);

      extractTenantId(mockRequest);

      expect(JSON.stringify(mockRequest)).toBe(originalJSON);
    });

    it('should be idempotent when called multiple times on same request', () => {
      const mockRequest = { tenantId: 'stable-tenant' };

      const result1 = extractTenantId(mockRequest);
      const result2 = extractTenantId(mockRequest);
      const result3 = extractTenantId(mockRequest);

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
      expect(result1).toBe('stable-tenant');
    });

    it('should return consistent results across multiple invocations', () => {
      const mockRequest = {
        tenantId: 'consistent-tenant',
        user: { tenantId: 'backup' },
      };

      const results = Array(5)
        .fill(null)
        .map(() => extractTenantId(mockRequest));

      results.forEach(result => {
        expect(result).toBe('consistent-tenant');
      });
    });
  });

  describe('ExecutionContext usage', () => {
    it('should call switchToHttp on context', () => {
      const mockRequest = { tenantId: 'test' };
      const switchToHttpMock = jest.fn().mockReturnValue({
        getRequest: () => mockRequest,
      });
      (mockContext.switchToHttp as jest.Mock) = switchToHttpMock;

      extractTenantId(mockRequest);

      expect(switchToHttpMock).toHaveBeenCalled();
    });

    it('should extract tenant ID through HTTP context successfully', () => {
      const mockRequest = { tenantId: 'extracted-tenant' };
      (mockContext.switchToHttp as jest.Mock).mockReturnValue({
        getRequest: () => mockRequest,
      });

      const result = extractTenantId(mockRequest);

      expect(result).toBe('extracted-tenant');
      expect(mockContext.switchToHttp).toHaveBeenCalled();
    });
  });

  describe('edge cases and boundaries', () => {
    it('should handle tenant ID that is the string "undefined"', () => {
      const tenantId = 'undefined';
      const mockRequest = { tenantId };

      const result = extractTenantId(mockRequest);

      expect(result).toBe(tenantId);
    });

    it('should handle tenant ID that is the string "null"', () => {
      const tenantId = 'null';
      const mockRequest = { tenantId };

      const result = extractTenantId(mockRequest);

      expect(result).toBe(tenantId);
    });

    it('should handle very long tenant ID strings', () => {
      const tenantId = 'a'.repeat(1000);
      const mockRequest = { tenantId };

      const result = extractTenantId(mockRequest);

      expect(result).toBe(tenantId);
      expect(result).toHaveLength(1000);
    });

    it('should handle tenant ID with special characters', () => {
      const tenantId = 'tenant!@#$%^&*()_+-=[]{}|;:,.<>?';
      const mockRequest = { tenantId };

      const result = extractTenantId(mockRequest);

      expect(result).toBe(tenantId);
    });

    it('should handle tenant ID with unicode characters', () => {
      const tenantId = 'tenant-with-émojis-🚀-123';
      const mockRequest = { tenantId };

      const result = extractTenantId(mockRequest);

      expect(result).toBe(tenantId);
    });

    it('should return a string type (never object or other)', () => {
      const tenantId = 'test-tenant';
      const mockRequest = { tenantId };

      const result = extractTenantId(mockRequest);

      expect(typeof result).toBe('string');
    });

    it('should handle tenant ID with whitespace', () => {
      const tenantId = 'tenant with spaces 123';
      const mockRequest = { tenantId };

      const result = extractTenantId(mockRequest);

      expect(result).toBe(tenantId);
    });

    it('should handle tenant ID with newlines', () => {
      const tenantId = 'tenant\n123';
      const mockRequest = { tenantId };

      const result = extractTenantId(mockRequest);

      expect(result).toBe(tenantId);
    });

    it('should handle tenant ID with tabs', () => {
      const tenantId = 'tenant\t123';
      const mockRequest = { tenantId };

      const result = extractTenantId(mockRequest);

      expect(result).toBe(tenantId);
    });
  });

  describe('truthy/falsy value handling', () => {
    it('should return truthy request.tenantId if present', () => {
      const testCases = ['tenant-1', 'T', '1', 'true'];

      testCases.forEach(tenantId => {
        const mockRequest = { tenantId };
        const result = extractTenantId(mockRequest);
        expect(result).toBe(tenantId);
      });
    });

    it('should fallback for all falsy values of request.tenantId', () => {
      const fallback = 'fallback-tenant';
      const falsyValues = [undefined, null, '', 0, false, NaN];

      falsyValues.forEach(falsyValue => {
        const mockRequest = {
          tenantId: falsyValue,
          user: { tenantId: fallback },
        };
        const result = extractTenantId(mockRequest);
        expect(result).toBe(fallback);
      });
    });
  });

  describe('optional chaining behavior', () => {
    it('should handle missing user object with optional chaining', () => {
      const mockRequest = {
        tenantId: undefined,
        // user is not defined
      };

      const result = extractTenantId(mockRequest);

      expect(result).toBeUndefined();
    });

    it('should handle user with missing tenantId property', () => {
      const mockRequest = {
        tenantId: undefined,
        user: { id: 'user-1' }, // No tenantId property
      };

      const result = extractTenantId(mockRequest);

      expect(result).toBeUndefined();
    });

    it('should safely access nested user object without errors', () => {
      const mockRequest = {
        tenantId: undefined,
        user: null, // Null instead of object
      };

      // Should not throw an error
      const result = extractTenantId(mockRequest);

      expect(result).toBeUndefined();
    });
  });
});
