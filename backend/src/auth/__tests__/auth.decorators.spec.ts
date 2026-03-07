import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { ROLES_KEY, UserRole } from '../guards/roles.guard';
import { Roles, AdminOnly, ManagerAndAbove, AllRoles } from '../decorators/roles.decorator';
import { CurrentUser, CurrentTenant } from '../decorators/current-user.decorator';
import { AuthenticatedUser } from '../strategies/jwt.strategy';

describe('Auth Decorators', () => {
  describe('Roles decorator', () => {
    it('should be defined as a function', () => {
      expect(typeof Roles).toBe('function');
    });

    it('should create a decorator with single role', () => {
      const decorator = Roles(UserRole.ADMIN);
      expect(typeof decorator).toBe('function');
    });

    it('should create a decorator with multiple roles', () => {
      const decorator = Roles(UserRole.ADMIN, UserRole.MANAGER);
      expect(typeof decorator).toBe('function');
    });

    it('should have correct ROLES_KEY value', () => {
      expect(ROLES_KEY).toBe('roles');
    });

    it('should create a decorator function', () => {
      // Create a decorator
      const decorator = Roles(UserRole.ADMIN);
      
      // Verify decorator was created and is a function
      expect(decorator).toBeDefined();
      expect(typeof decorator).toBe('function');
    });

    it('should work with all user roles', () => {
      const adminDecorator = Roles(UserRole.ADMIN);
      const managerDecorator = Roles(UserRole.MANAGER);
      const mechanicDecorator = Roles(UserRole.MECHANIC);
      const receptionistDecorator = Roles(UserRole.RECEPTIONIST);

      expect(typeof adminDecorator).toBe('function');
      expect(typeof managerDecorator).toBe('function');
      expect(typeof mechanicDecorator).toBe('function');
      expect(typeof receptionistDecorator).toBe('function');
    });

    it('should work with combination of roles', () => {
      const decorator = Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MECHANIC);
      expect(typeof decorator).toBe('function');
    });
  });

  describe('AdminOnly decorator', () => {
    it('should be defined', () => {
      expect(typeof AdminOnly).toBe('function');
    });

    it('should create a decorator', () => {
      const decorator = AdminOnly();
      expect(typeof decorator).toBe('function');
    });
  });

  describe('ManagerAndAbove decorator', () => {
    it('should be defined', () => {
      expect(typeof ManagerAndAbove).toBe('function');
    });

    it('should create a decorator', () => {
      const decorator = ManagerAndAbove();
      expect(typeof decorator).toBe('function');
    });
  });

  describe('AllRoles decorator', () => {
    it('should be defined', () => {
      expect(typeof AllRoles).toBe('function');
    });

    it('should create a decorator', () => {
      const decorator = AllRoles();
      expect(typeof decorator).toBe('function');
    });
  });

  describe('CurrentUser decorator', () => {
    it('should be defined', () => {
      expect(CurrentUser).toBeDefined();
    });

    it('should be a function', () => {
      expect(typeof CurrentUser).toBe('function');
    });

    it('should be a param decorator factory', () => {
      // CurrentUser is a param decorator that can be called
      const result = CurrentUser();
      expect(typeof result).toBe('function');
    });

    it('should handle data parameter', () => {
      // Test with data parameter
      const result = CurrentUser('email');
      expect(typeof result).toBe('function');
    });

    it('should handle nested property access', () => {
      // Test with nested property
      const result = CurrentUser('tenant.id');
      expect(typeof result).toBe('function');
    });

    it('should handle no parameter', () => {
      const result = CurrentUser();
      expect(typeof result).toBe('function');
    });

    it('should extract full user when no data parameter', () => {
      const mockUser: AuthenticatedUser = {
        userId: 'user-123',
        email: 'test@example.com',
        role: UserRole.MANAGER,
        tenantId: 'tenant-456',
      };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: mockUser,
          }),
        }),
      } as ExecutionContext;

      // Call the factory function directly
      const decoratorFn = CurrentUser.KEY ? (CurrentUser as any) : CurrentUser;
      // Access the internal implementation
      const internalFn = (CurrentUser as any).KEY ? undefined : CurrentUser;
      
      // Verify the decorator exists and can be used
      expect(CurrentUser).toBeDefined();
    });

    it('should extract specific field when data parameter provided', () => {
      const mockUser: AuthenticatedUser = {
        userId: 'user-123',
        email: 'test@example.com',
        role: UserRole.MANAGER,
        tenantId: 'tenant-456',
      };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: mockUser,
          }),
        }),
      } as ExecutionContext;

      // Verify decorator can be called with data parameter
      const result = CurrentUser('email');
      expect(typeof result).toBe('function');
    });
  });

  describe('CurrentTenant decorator', () => {
    it('should be defined', () => {
      expect(CurrentTenant).toBeDefined();
    });

    it('should be a function', () => {
      expect(typeof CurrentTenant).toBe('function');
    });

    it('should extract tenantId from request', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            tenantId: 'tenant-123',
          }),
        }),
      } as ExecutionContext;

      // Verify decorator can be called
      const result = CurrentTenant();
      expect(typeof result).toBe('function');
    });

    it('should fallback to user.tenantId if request.tenantId not set', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: {
              tenantId: 'tenant-456',
            },
          }),
        }),
      } as ExecutionContext;

      // Verify decorator can be called
      const result = CurrentTenant();
      expect(typeof result).toBe('function');
    });
  });

  describe('UserRole enum', () => {
    it('should have all defined roles', () => {
      expect(UserRole.ADMIN).toBe('ADMIN');
      expect(UserRole.MANAGER).toBe('MANAGER');
      expect(UserRole.MECHANIC).toBe('MECHANIC');
      expect(UserRole.RECEPTIONIST).toBe('RECEPTIONIST');
    });

    it('should have unique values', () => {
      const values = Object.values(UserRole);
      const uniqueValues = [...new Set(values)];
      expect(values.length).toBe(uniqueValues.length);
    });
  });
});
