import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { 
  CurrentUser, 
  CurrentTenant, 
  currentUserFactory, 
  currentTenantFactory 
} from '../decorators/current-user.decorator';
import { UserRole } from '../guards/roles.guard';
import { AuthenticatedUser } from '../strategies/jwt.strategy';

describe('CurrentUser Decorator', () => {
  // Helper to create mock execution context
  const mockExecutionContext = (request: any): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getType: () => 'http',
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    }) as ExecutionContext;

  describe('currentUserFactory - Branch Coverage', () => {
    it.each([
      {
        scenario: 'full user when data is undefined and user exists',
        user: { userId: 'u1', email: 'test@test.com', role: UserRole.USER, tenantId: 't1' },
        data: undefined,
        expected: { userId: 'u1', email: 'test@test.com', role: UserRole.USER, tenantId: 't1' },
      },
      {
        scenario: 'null when user is null',
        user: null,
        data: undefined,
        expected: null,
      },
      {
        scenario: 'null when user is undefined',
        user: undefined,
        data: undefined,
        expected: null,
      },
      {
        scenario: 'specific field (email) when data is provided',
        user: { userId: 'u1', email: 'test@test.com', role: UserRole.USER, tenantId: 't1' },
        data: 'email' as const,
        expected: 'test@test.com',
      },
      {
        scenario: 'specific field (userId) when data is provided',
        user: { userId: 'u1', email: 'test@test.com', role: UserRole.USER, tenantId: 't1' },
        data: 'userId' as const,
        expected: 'u1',
      },
      {
        scenario: 'specific field (tenantId) when data is provided',
        user: { userId: 'u1', email: 'test@test.com', role: UserRole.USER, tenantId: 't1' },
        data: 'tenantId' as const,
        expected: 't1',
      },
      {
        scenario: 'specific field (role) when data is provided',
        user: { userId: 'u1', email: 'test@test.com', role: UserRole.ADMIN, tenantId: 't1' },
        data: 'role' as const,
        expected: UserRole.ADMIN,
      },
      {
        scenario: 'null when user is null and data is requested',
        user: null,
        data: 'email' as const,
        expected: null,
      },
      {
        scenario: 'null when user is undefined and data is requested',
        user: undefined,
        data: 'userId' as const,
        expected: null,
      },
      {
        scenario: 'empty string field value when field exists',
        user: { userId: 'u1', email: '', role: UserRole.USER, tenantId: 't1' },
        data: 'email' as const,
        expected: '',
      },
    ])('returns $scenario', ({ user, data, expected }) => {
      const ctx = mockExecutionContext({ user });
      const result = currentUserFactory(data, ctx);
      expect(result).toEqual(expected);
    });
  });

  describe('currentTenantFactory - Branch Coverage', () => {
    it.each([
      {
        scenario: 'request.tenantId when present',
        request: { tenantId: 'tenant-123' },
        expected: 'tenant-123',
      },
      {
        scenario: 'user.tenantId when request.tenantId is undefined',
        request: { user: { tenantId: 'user-tenant-456' } },
        expected: 'user-tenant-456',
      },
      {
        scenario: 'user.tenantId when request.tenantId is null (falsy fallback)',
        request: { tenantId: null, user: { tenantId: 'fallback-tenant' } },
        expected: 'fallback-tenant',
      },
      {
        scenario: 'user.tenantId when request.tenantId is empty string (falsy fallback)',
        request: { tenantId: '', user: { tenantId: 'empty-fallback' } },
        expected: 'empty-fallback',
      },
      {
        scenario: 'undefined when both are missing',
        request: {},
        expected: undefined,
      },
      {
        scenario: 'undefined when tenantId is null and no user',
        request: { tenantId: null },
        expected: undefined,
      },
      {
        scenario: 'undefined when tenantId is empty and no user',
        request: { tenantId: '' },
        expected: undefined,
      },
      {
        scenario: 'request.tenantId when both are present (priority)',
        request: { tenantId: 'request-priority', user: { tenantId: 'user-tenant' } },
        expected: 'request-priority',
      },
      {
        scenario: 'undefined when user exists but has no tenantId',
        request: { user: { email: 'test@test.com' } },
        expected: undefined,
      },
      {
        scenario: 'user.tenantId when request is empty object',
        request: { user: { tenantId: 'only-user-tenant' } },
        expected: 'only-user-tenant',
      },
    ])('returns $scenario', ({ request, expected }) => {
      const ctx = mockExecutionContext(request);
      const result = currentTenantFactory(undefined, ctx);
      expect(result).toEqual(expected);
    });
  });

  describe('Decorator Creation', () => {
    it('should create CurrentUser decorator without parameters', () => {
      const decorator = CurrentUser();
      expect(typeof decorator).toBe('function');
    });

    it('should create CurrentUser decorator with field parameter', () => {
      const decorator = CurrentUser('email');
      expect(typeof decorator).toBe('function');
    });

    it('should create CurrentUser decorator with different fields', () => {
      expect(typeof CurrentUser('userId')).toBe('function');
      expect(typeof CurrentUser('email')).toBe('function');
      expect(typeof CurrentUser('role')).toBe('function');
      expect(typeof CurrentUser('tenantId')).toBe('function');
    });

    it('should create CurrentTenant decorator', () => {
      const decorator = CurrentTenant();
      expect(typeof decorator).toBe('function');
    });
  });

  describe('Decorator Application', () => {
    it('should apply CurrentUser to class method', () => {
      class TestController {
        getUser(@CurrentUser() user: AuthenticatedUser) {
          return user;
        }
      }
      expect(TestController).toBeDefined();
    });

    it('should apply CurrentUser with field to class method', () => {
      class TestController {
        getEmail(@CurrentUser('email') email: string) {
          return email;
        }
      }
      expect(TestController).toBeDefined();
    });

    it('should apply CurrentTenant to class method', () => {
      class TestController {
        getTenant(@CurrentTenant() tenantId: string) {
          return tenantId;
        }
      }
      expect(TestController).toBeDefined();
    });

    it('should apply multiple decorators to same class', () => {
      class TestController {
        getData(
          @CurrentUser() user: AuthenticatedUser,
          @CurrentTenant() tenantId: string,
        ) {
          return { user, tenantId };
        }
      }
      expect(TestController).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle all user role types', () => {
      const roles = [UserRole.ADMIN, UserRole.MANAGER, UserRole.MECHANIC, UserRole.RECEPTIONIST];
      
      for (const role of roles) {
        const user: AuthenticatedUser = {
          userId: 'u1',
          email: 'test@test.com',
          role,
          tenantId: 't1',
        };
        
        const ctx = mockExecutionContext({ user });
        expect(currentUserFactory('role', ctx)).toBe(role);
      }
    });

    it('should handle falsy tenantId values correctly', () => {
      // Test null fallback
      const ctx1 = mockExecutionContext({ tenantId: null, user: { tenantId: 'fallback' } });
      expect(currentTenantFactory(undefined, ctx1)).toBe('fallback');

      // Test empty string fallback
      const ctx2 = mockExecutionContext({ tenantId: '', user: { tenantId: 'fallback' } });
      expect(currentTenantFactory(undefined, ctx2)).toBe('fallback');

      // Test undefined fallback
      const ctx3 = mockExecutionContext({ tenantId: undefined, user: { tenantId: 'fallback' } });
      expect(currentTenantFactory(undefined, ctx3)).toBe('fallback');

      // Test priority (request over user)
      const ctx4 = mockExecutionContext({ tenantId: 'primary', user: { tenantId: 'fallback' } });
      expect(currentTenantFactory(undefined, ctx4)).toBe('primary');
    });

    it('should handle empty user object', () => {
      const ctx = mockExecutionContext({ user: {} });
      
      // Empty object is truthy, so it should return the object or undefined for fields
      expect(currentUserFactory(undefined, ctx)).toEqual({});
      expect(currentUserFactory('email', ctx)).toBeUndefined();
    });

    it('should handle partial user object', () => {
      const user = { userId: 'u1', email: 'test@test.com' } as AuthenticatedUser;
      const ctx = mockExecutionContext({ user });
      
      expect(currentUserFactory('userId', ctx)).toBe('u1');
      expect(currentUserFactory('email', ctx)).toBe('test@test.com');
    });
  });
});
