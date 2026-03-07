import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard, ROLES_KEY, UserRole } from '../guards/roles.guard';
import { AuthenticatedUser } from '../strategies/jwt.strategy';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const createMockExecutionContext = (user?: AuthenticatedUser): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
        }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate - no roles required', () => {
    it('should allow access when no roles are required', () => {
      const getAllAndOverrideMock = reflector.getAllAndOverride as jest.Mock;
      getAllAndOverrideMock.mockReturnValue(null);

      const context = createMockExecutionContext();

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(getAllAndOverrideMock).toHaveBeenCalledWith(ROLES_KEY, [
        expect.any(Object),
        expect.any(Object),
      ]);
    });

    it('should allow access when empty roles array is provided', () => {
      const getAllAndOverrideMock = reflector.getAllAndOverride as jest.Mock;
      getAllAndOverrideMock.mockReturnValue([]);

      const context = createMockExecutionContext();

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when roles is undefined', () => {
      const getAllAndOverrideMock = reflector.getAllAndOverride as jest.Mock;
      getAllAndOverrideMock.mockReturnValue(undefined);

      const context = createMockExecutionContext();

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('canActivate - with roles required', () => {
    it('should allow access when user has required role', () => {
      const getAllAndOverrideMock = reflector.getAllAndOverride as jest.Mock;
      getAllAndOverrideMock.mockReturnValue([UserRole.MANAGER]);

      const user: AuthenticatedUser = {
        userId: 'user-123',
        email: 'manager@example.com',
        role: UserRole.MANAGER,
        tenantId: 'tenant-456',
      };

      const context = createMockExecutionContext(user);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when user has one of multiple required roles', () => {
      const getAllAndOverrideMock = reflector.getAllAndOverride as jest.Mock;
      getAllAndOverrideMock.mockReturnValue([UserRole.ADMIN, UserRole.MANAGER]);

      const user: AuthenticatedUser = {
        userId: 'user-123',
        email: 'manager@example.com',
        role: UserRole.MANAGER,
        tenantId: 'tenant-456',
      };

      const context = createMockExecutionContext(user);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny access when user does not have required role', () => {
      const getAllAndOverrideMock = reflector.getAllAndOverride as jest.Mock;
      getAllAndOverrideMock.mockReturnValue([UserRole.ADMIN]);

      const user: AuthenticatedUser = {
        userId: 'user-123',
        email: 'mechanic@example.com',
        role: UserRole.MECHANIC,
        tenantId: 'tenant-456',
      };

      const context = createMockExecutionContext(user);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('Access denied. Required roles: ADMIN');
    });

    it('should deny access when user role is not in required roles list', () => {
      const getAllAndOverrideMock = reflector.getAllAndOverride as jest.Mock;
      getAllAndOverrideMock.mockReturnValue([UserRole.ADMIN, UserRole.MANAGER]);

      const user: AuthenticatedUser = {
        userId: 'user-123',
        email: 'receptionist@example.com',
        role: UserRole.RECEPTIONIST,
        tenantId: 'tenant-456',
      };

      const context = createMockExecutionContext(user);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        'Access denied. Required roles: ADMIN, MANAGER',
      );
    });

    it('should throw ForbiddenException when user is not authenticated', () => {
      const getAllAndOverrideMock = reflector.getAllAndOverride as jest.Mock;
      getAllAndOverrideMock.mockReturnValue([UserRole.MANAGER]);

      const context = createMockExecutionContext(undefined);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('User not authenticated');
    });

    it('should throw ForbiddenException when user is null', () => {
      const getAllAndOverrideMock = reflector.getAllAndOverride as jest.Mock;
      getAllAndOverrideMock.mockReturnValue([UserRole.MANAGER]);

      const context = createMockExecutionContext(null as any);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should work with all user roles', () => {
      const testCases = [
        { role: UserRole.ADMIN, required: [UserRole.ADMIN], shouldPass: true },
        { role: UserRole.MANAGER, required: [UserRole.MANAGER], shouldPass: true },
        { role: UserRole.MECHANIC, required: [UserRole.MECHANIC], shouldPass: true },
        { role: UserRole.RECEPTIONIST, required: [UserRole.RECEPTIONIST], shouldPass: true },
        { role: UserRole.MECHANIC, required: [UserRole.ADMIN], shouldPass: false },
        { role: UserRole.RECEPTIONIST, required: [UserRole.MANAGER], shouldPass: false },
      ];

      for (const { role, required, shouldPass } of testCases) {
        jest.clearAllMocks();
        const getAllAndOverrideMock = reflector.getAllAndOverride as jest.Mock;
        getAllAndOverrideMock.mockReturnValue(required);

        const user: AuthenticatedUser = {
          userId: 'user-123',
          email: 'test@example.com',
          role,
          tenantId: 'tenant-456',
        };

        const context = createMockExecutionContext(user);

        if (shouldPass) {
          expect(guard.canActivate(context)).toBe(true);
        } else {
          expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
        }
      }
    });

    it('should handle multiple roles correctly', () => {
      const getAllAndOverrideMock = reflector.getAllAndOverride as jest.Mock;
      getAllAndOverrideMock.mockReturnValue([
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.MECHANIC,
      ]);

      const user: AuthenticatedUser = {
        userId: 'user-123',
        email: 'mechanic@example.com',
        role: UserRole.MECHANIC,
        tenantId: 'tenant-456',
      };

      const context = createMockExecutionContext(user);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should handle custom role strings', () => {
      const getAllAndOverrideMock = reflector.getAllAndOverride as jest.Mock;
      getAllAndOverrideMock.mockReturnValue(['CUSTOM_ROLE']);

      const user: AuthenticatedUser = {
        userId: 'user-123',
        email: 'custom@example.com',
        role: 'CUSTOM_ROLE',
        tenantId: 'tenant-456',
      };

      const context = createMockExecutionContext(user);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should handle case-sensitive role matching', () => {
      const getAllAndOverrideMock = reflector.getAllAndOverride as jest.Mock;
      getAllAndOverrideMock.mockReturnValue([UserRole.ADMIN]);

      const user: AuthenticatedUser = {
        userId: 'user-123',
        email: 'admin@example.com',
        role: 'admin' as UserRole, // lowercase
        tenantId: 'tenant-456',
      };

      const context = createMockExecutionContext(user);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('role hierarchy', () => {
    it('should have correct role hierarchy defined', () => {
      // Verify the role hierarchy exists in the code
      // ADMIN=4, MANAGER=3, MECHANIC=2, RECEPTIONIST=1
      expect(UserRole.ADMIN).toBe('ADMIN');
      expect(UserRole.MANAGER).toBe('MANAGER');
      expect(UserRole.MECHANIC).toBe('MECHANIC');
      expect(UserRole.RECEPTIONIST).toBe('RECEPTIONIST');
    });

    // Test the private checkRoleHierarchy method to achieve 100% coverage
    it('should correctly check role hierarchy levels', () => {
      // Access private method using type assertion
      const checkRoleHierarchy = (guard as any).checkRoleHierarchy.bind(guard);

      // Admin should be >= all other roles
      expect(checkRoleHierarchy(UserRole.ADMIN, UserRole.ADMIN)).toBe(true);
      expect(checkRoleHierarchy(UserRole.ADMIN, UserRole.MANAGER)).toBe(true);
      expect(checkRoleHierarchy(UserRole.ADMIN, UserRole.MECHANIC)).toBe(true);
      expect(checkRoleHierarchy(UserRole.ADMIN, UserRole.RECEPTIONIST)).toBe(true);

      // Manager should be >= MECHANIC and RECEPTIONIST, but not ADMIN
      expect(checkRoleHierarchy(UserRole.MANAGER, UserRole.ADMIN)).toBe(false);
      expect(checkRoleHierarchy(UserRole.MANAGER, UserRole.MANAGER)).toBe(true);
      expect(checkRoleHierarchy(UserRole.MANAGER, UserRole.MECHANIC)).toBe(true);
      expect(checkRoleHierarchy(UserRole.MANAGER, UserRole.RECEPTIONIST)).toBe(true);

      // Mechanic should be >= RECEPTIONIST, but not MANAGER or ADMIN
      expect(checkRoleHierarchy(UserRole.MECHANIC, UserRole.ADMIN)).toBe(false);
      expect(checkRoleHierarchy(UserRole.MECHANIC, UserRole.MANAGER)).toBe(false);
      expect(checkRoleHierarchy(UserRole.MECHANIC, UserRole.MECHANIC)).toBe(true);
      expect(checkRoleHierarchy(UserRole.MECHANIC, UserRole.RECEPTIONIST)).toBe(true);

      // Receptionist should only be >= RECEPTIONIST
      expect(checkRoleHierarchy(UserRole.RECEPTIONIST, UserRole.ADMIN)).toBe(false);
      expect(checkRoleHierarchy(UserRole.RECEPTIONIST, UserRole.MANAGER)).toBe(false);
      expect(checkRoleHierarchy(UserRole.RECEPTIONIST, UserRole.MECHANIC)).toBe(false);
      expect(checkRoleHierarchy(UserRole.RECEPTIONIST, UserRole.RECEPTIONIST)).toBe(true);
    });

    it('should handle unknown roles in hierarchy check', () => {
      const checkRoleHierarchy = (guard as any).checkRoleHierarchy.bind(guard);

      // Unknown user role should return level 0
      expect(checkRoleHierarchy('UNKNOWN_ROLE', UserRole.ADMIN)).toBe(false);
      expect(checkRoleHierarchy('UNKNOWN_ROLE', UserRole.RECEPTIONIST)).toBe(false);

      // Unknown required role should also return level 0
      expect(checkRoleHierarchy(UserRole.ADMIN, 'UNKNOWN_ROLE' as UserRole)).toBe(true);
      expect(checkRoleHierarchy('UNKNOWN_USER', 'UNKNOWN_REQUIRED' as UserRole)).toBe(true);
    });
  });

  describe('ROLES_KEY constant', () => {
    it('should have correct ROLES_KEY value', () => {
      expect(ROLES_KEY).toBe('roles');
    });
  });

  describe('guard metadata', () => {
    it('should be injectable', () => {
      expect(guard).toBeInstanceOf(RolesGuard);
    });

    it('should implement CanActivate', () => {
      expect(guard.canActivate).toBeDefined();
      expect(typeof guard.canActivate).toBe('function');
    });
  });
});
