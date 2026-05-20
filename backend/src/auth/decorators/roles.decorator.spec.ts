import { Roles, AdminOnly, ManagerAndAbove, AllRoles } from './roles.decorator';
import { UserRole, ROLES_KEY } from '../guards/roles.guard';

describe('Roles Decorators', () => {
  describe('@Roles()', () => {
    it('should set ROLES_KEY metadata with provided roles', () => {
      class TestController {
        @Roles(UserRole.ADMIN, UserRole.MANAGER)
        testMethod() {}
      }

      const metadata = Reflect.getMetadata(ROLES_KEY, TestController.prototype.testMethod);
      expect(metadata).toEqual([UserRole.ADMIN, UserRole.MANAGER]);
    });

    it('should work with single role', () => {
      class TestController {
        @Roles(UserRole.ADMIN)
        testMethod() {}
      }

      const metadata = Reflect.getMetadata(ROLES_KEY, TestController.prototype.testMethod);
      expect(metadata).toEqual([UserRole.ADMIN]);
    });

    it('should work with all available roles', () => {
      class TestController {
        @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MECHANIC, UserRole.RECEPTIONIST)
        testMethod() {}
      }

      const metadata = Reflect.getMetadata(ROLES_KEY, TestController.prototype.testMethod);
      expect(metadata).toEqual([
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.MECHANIC,
        UserRole.RECEPTIONIST,
      ]);
    });

    it('should allow empty roles array', () => {
      class TestController {
        @Roles()
        testMethod() {}
      }

      const metadata = Reflect.getMetadata(ROLES_KEY, TestController.prototype.testMethod);
      expect(metadata).toEqual([]);
    });

    it('should set metadata on different methods independently', () => {
      class TestController {
        @Roles(UserRole.ADMIN)
        method1() {}

        @Roles(UserRole.MANAGER)
        method2() {}

        @Roles(UserRole.ADMIN, UserRole.MANAGER)
        method3() {}
      }

      const metadata1 = Reflect.getMetadata(ROLES_KEY, TestController.prototype.method1);
      const metadata2 = Reflect.getMetadata(ROLES_KEY, TestController.prototype.method2);
      const metadata3 = Reflect.getMetadata(ROLES_KEY, TestController.prototype.method3);

      expect(metadata1).toEqual([UserRole.ADMIN]);
      expect(metadata2).toEqual([UserRole.MANAGER]);
      expect(metadata3).toEqual([UserRole.ADMIN, UserRole.MANAGER]);
    });

    it('should not affect methods without the decorator', () => {
      class TestController {
        @Roles(UserRole.ADMIN)
        decoratedMethod() {}

        unDecoratedMethod() {}
      }

      const metadata = Reflect.getMetadata(ROLES_KEY, TestController.prototype.unDecoratedMethod);
      expect(metadata).toBeUndefined();
    });
  });

  describe('@AdminOnly()', () => {
    it('should set ROLES_KEY metadata with only ADMIN role', () => {
      class TestController {
        @AdminOnly()
        testMethod() {}
      }

      const metadata = Reflect.getMetadata(ROLES_KEY, TestController.prototype.testMethod);
      expect(metadata).toEqual([UserRole.ADMIN]);
    });

    it('should be equivalent to @Roles(UserRole.ADMIN)', () => {
      class TestController1 {
        @AdminOnly()
        method1() {}
      }

      class TestController2 {
        @Roles(UserRole.ADMIN)
        method2() {}
      }

      const metadata1 = Reflect.getMetadata(ROLES_KEY, TestController1.prototype.method1);
      const metadata2 = Reflect.getMetadata(ROLES_KEY, TestController2.prototype.method2);

      expect(metadata1).toEqual(metadata2);
    });

    it('should work on multiple methods', () => {
      class TestController {
        @AdminOnly()
        method1() {}

        @AdminOnly()
        method2() {}
      }

      const metadata1 = Reflect.getMetadata(ROLES_KEY, TestController.prototype.method1);
      const metadata2 = Reflect.getMetadata(ROLES_KEY, TestController.prototype.method2);

      expect(metadata1).toEqual([UserRole.ADMIN]);
      expect(metadata2).toEqual([UserRole.ADMIN]);
    });
  });

  describe('@ManagerAndAbove()', () => {
    it('should set ROLES_KEY metadata with ADMIN and MANAGER roles', () => {
      class TestController {
        @ManagerAndAbove()
        testMethod() {}
      }

      const metadata = Reflect.getMetadata(ROLES_KEY, TestController.prototype.testMethod);
      expect(metadata).toEqual([UserRole.ADMIN, UserRole.MANAGER]);
    });

    it('should include both ADMIN and MANAGER', () => {
      class TestController {
        @ManagerAndAbove()
        testMethod() {}
      }

      const metadata = Reflect.getMetadata(ROLES_KEY, TestController.prototype.testMethod);
      expect(metadata).toContain(UserRole.ADMIN);
      expect(metadata).toContain(UserRole.MANAGER);
      expect(metadata).toHaveLength(2);
    });

    it('should not include MECHANIC or RECEPTIONIST roles', () => {
      class TestController {
        @ManagerAndAbove()
        testMethod() {}
      }

      const metadata = Reflect.getMetadata(ROLES_KEY, TestController.prototype.testMethod);
      expect(metadata).not.toContain(UserRole.MECHANIC);
      expect(metadata).not.toContain(UserRole.RECEPTIONIST);
    });

    it('should work on multiple methods independently', () => {
      class TestController {
        @ManagerAndAbove()
        method1() {}

        @ManagerAndAbove()
        method2() {}
      }

      const metadata1 = Reflect.getMetadata(ROLES_KEY, TestController.prototype.method1);
      const metadata2 = Reflect.getMetadata(ROLES_KEY, TestController.prototype.method2);

      expect(metadata1).toEqual([UserRole.ADMIN, UserRole.MANAGER]);
      expect(metadata2).toEqual([UserRole.ADMIN, UserRole.MANAGER]);
    });
  });

  describe('@AllRoles()', () => {
    it('should set ROLES_KEY metadata with all available roles', () => {
      class TestController {
        @AllRoles()
        testMethod() {}
      }

      const metadata = Reflect.getMetadata(ROLES_KEY, TestController.prototype.testMethod);
      expect(metadata).toEqual([
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.MECHANIC,
        UserRole.RECEPTIONIST,
      ]);
    });

    it('should include all four roles', () => {
      class TestController {
        @AllRoles()
        testMethod() {}
      }

      const metadata = Reflect.getMetadata(ROLES_KEY, TestController.prototype.testMethod);
      expect(metadata).toContain(UserRole.ADMIN);
      expect(metadata).toContain(UserRole.MANAGER);
      expect(metadata).toContain(UserRole.MECHANIC);
      expect(metadata).toContain(UserRole.RECEPTIONIST);
      expect(metadata).toHaveLength(4);
    });

    it('should allow all authenticated users access', () => {
      class TestController {
        @AllRoles()
        testMethod() {}
      }

      const metadata = Reflect.getMetadata(ROLES_KEY, TestController.prototype.testMethod);
      // Verify it matches AllRoles expectation
      expect(metadata.length).toBe(4);
    });
  });

  describe('Decorator combinations', () => {
    it('should allow stacking decorators on same method (first decorator wins)', () => {
      class TestController {
        @AdminOnly()
        @Roles(UserRole.MANAGER)
        testMethod() {}
      }

      const metadata = Reflect.getMetadata(ROLES_KEY, TestController.prototype.testMethod);
      // In decorator execution order: Roles is applied first, then AdminOnly overwrites it
      expect(metadata).toEqual([UserRole.ADMIN]);
    });

    it('should not affect class-level metadata', () => {
      @Roles(UserRole.ADMIN)
      class TestController {
        testMethod() {}
      }

      const classMetadata = Reflect.getMetadata(ROLES_KEY, TestController);
      const methodMetadata = Reflect.getMetadata(ROLES_KEY, TestController.prototype.testMethod);

      // Class decorator sets metadata on the class, method decorator on the method
      expect(classMetadata).toEqual([UserRole.ADMIN]);
      expect(methodMetadata).toBeUndefined();
    });
  });

  describe('Edge cases', () => {
    it('should work with async methods', () => {
      class TestController {
        @Roles(UserRole.ADMIN)
        async testMethod() {}
      }

      const metadata = Reflect.getMetadata(ROLES_KEY, TestController.prototype.testMethod);
      expect(metadata).toEqual([UserRole.ADMIN]);
    });

    it('should maintain role order as provided', () => {
      class TestController {
        @Roles(UserRole.RECEPTIONIST, UserRole.MECHANIC, UserRole.ADMIN, UserRole.MANAGER)
        testMethod() {}
      }

      const metadata = Reflect.getMetadata(ROLES_KEY, TestController.prototype.testMethod);
      expect(metadata).toEqual([
        UserRole.RECEPTIONIST,
        UserRole.MECHANIC,
        UserRole.ADMIN,
        UserRole.MANAGER,
      ]);
    });
  });
});
