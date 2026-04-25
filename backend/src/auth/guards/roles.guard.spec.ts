import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { RolesGuard, UserRole, ROLES_KEY } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

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
    reflector = module.get(Reflector) as jest.Mocked<Reflector>;
  });

  const createMockContext = (user?: Record<string, unknown>): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as unknown as ExecutionContext;

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  // =========================================================================
  // No roles required
  // =========================================================================
  describe('when no roles are required', () => {
    it('should return true when requiredRoles is undefined', () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);

      const result = guard.canActivate(createMockContext());

      expect(result).toBe(true);
    });

    it('should return true when requiredRoles is null', () => {
      reflector.getAllAndOverride.mockReturnValue(null);

      const result = guard.canActivate(createMockContext());

      expect(result).toBe(true);
    });

    it('should return true when requiredRoles is empty array', () => {
      reflector.getAllAndOverride.mockReturnValue([]);

      const result = guard.canActivate(createMockContext());

      expect(result).toBe(true);
    });
  });

  // =========================================================================
  // User not authenticated
  // =========================================================================
  describe('when user is not authenticated', () => {
    it('should throw ForbiddenException when user is undefined', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

      const context = createMockContext(undefined);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('User not authenticated');
    });

    it('should throw ForbiddenException when user is null', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

      const context = createMockContext(null as unknown as undefined);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('User not authenticated');
    });
  });

  // =========================================================================
  // Role matching
  // =========================================================================
  describe('role matching', () => {
    it('should return true when user has ADMIN role and ADMIN is required', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

      const context = createMockContext({ role: UserRole.ADMIN });
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when user has MANAGER role and MANAGER is required', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.MANAGER]);

      const context = createMockContext({ role: UserRole.MANAGER });
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when user has MECHANIC role and MECHANIC is required', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.MECHANIC]);

      const context = createMockContext({ role: UserRole.MECHANIC });
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when user has RECEPTIONIST role and RECEPTIONIST is required', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.RECEPTIONIST]);

      const context = createMockContext({ role: UserRole.RECEPTIONIST });
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when user role is one of multiple required roles', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN, UserRole.MANAGER]);

      const context = createMockContext({ role: UserRole.MANAGER });
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user role does not match required roles', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

      const context = createMockContext({ role: UserRole.MECHANIC });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('Access denied. Required roles: ADMIN');
    });

    it('should include all required roles in error message', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN, UserRole.MANAGER]);

      const context = createMockContext({ role: UserRole.RECEPTIONIST });

      expect(() => guard.canActivate(context)).toThrow(
        'Access denied. Required roles: ADMIN, MANAGER',
      );
    });

    it('should throw when user role is undefined', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

      const context = createMockContext({ role: undefined });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  // =========================================================================
  // Reflector metadata key
  // =========================================================================
  describe('metadata key', () => {
    it('should use ROLES_KEY constant for metadata lookup', () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);

      guard.canActivate(createMockContext());

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, expect.any(Array));
    });
  });

  // =========================================================================
  // Multiple role scenarios
  // =========================================================================
  describe('multiple role access', () => {
    it('should allow access when any of multiple required roles match', () => {
      reflector.getAllAndOverride.mockReturnValue([
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.MECHANIC,
      ]);

      const context = createMockContext({ role: UserRole.MECHANIC });
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny access when none of multiple required roles match', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN, UserRole.MANAGER]);

      const context = createMockContext({ role: UserRole.RECEPTIONIST });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should check all required roles against user role', () => {
      reflector.getAllAndOverride.mockReturnValue([
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.MECHANIC,
        UserRole.RECEPTIONIST,
      ]);

      const context = createMockContext({ role: UserRole.RECEPTIONIST });
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  // =========================================================================
  // Edge cases with multiple roles
  // =========================================================================
  describe('edge cases', () => {
    it('should handle single role in array', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

      const context = createMockContext({ role: UserRole.ADMIN });
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should handle multiple occurrences of same role in required roles', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN, UserRole.ADMIN]);

      const context = createMockContext({ role: UserRole.ADMIN });
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user has no matching role', () => {
      reflector.getAllAndOverride.mockReturnValue([
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.MECHANIC,
      ]);

      const context = createMockContext({ role: UserRole.RECEPTIONIST });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        'Access denied. Required roles: ADMIN, MANAGER, MECHANIC',
      );
    });

    it('should handle user object with additional properties', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

      const context = createMockContext({
        id: 'user-001',
        email: 'admin@example.com',
        tenantId: 'tenant-001',
        role: UserRole.ADMIN,
        extra: 'ignored',
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('checkRoleHierarchy (private — lines 50-62)', () => {
    type GuardWithPrivate = {
      checkRoleHierarchy: (userRole: string, requiredRole: UserRole) => boolean;
    };

    it('should return true when userLevel >= requiredLevel (ADMIN >= MECHANIC)', () => {
      const result = (guard as unknown as GuardWithPrivate).checkRoleHierarchy(
        UserRole.ADMIN,
        UserRole.MECHANIC,
      );
      expect(result).toBe(true);
    });

    it('should return false when userLevel < requiredLevel (MECHANIC < ADMIN)', () => {
      const result = (guard as unknown as GuardWithPrivate).checkRoleHierarchy(
        UserRole.MECHANIC,
        UserRole.ADMIN,
      );
      expect(result).toBe(false);
    });

    it('should return true when same level (MANAGER === MANAGER)', () => {
      const result = (guard as unknown as GuardWithPrivate).checkRoleHierarchy(
        UserRole.MANAGER,
        UserRole.MANAGER,
      );
      expect(result).toBe(true);
    });

    it('should use 0 fallback when userRole not in hierarchy (line 58 || 0 branch)', () => {
      const result = (guard as unknown as GuardWithPrivate).checkRoleHierarchy(
        'UNKNOWN_ROLE',
        UserRole.RECEPTIONIST,
      );
      expect(result).toBe(false);
    });

    it('should use 0 fallback when requiredRole not in hierarchy (line 59 || 0 branch)', () => {
      const result = (guard as unknown as GuardWithPrivate).checkRoleHierarchy(
        UserRole.ADMIN,
        'INVALID_ROLE' as UserRole,
      );
      expect(result).toBe(true);
    });
  });
});
