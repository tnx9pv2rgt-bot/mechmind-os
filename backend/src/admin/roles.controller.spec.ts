import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { RolesController } from './roles.controller';

describe('RolesController', () => {
  let controller: RolesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolesController],
    }).compile();

    controller = module.get(RolesController);
  });

  describe('findAll', () => {
    it('should return success true and non-empty data array', () => {
      const result = controller.findAll();

      expect(result.success).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('should include all UserRole values in response', () => {
      const result = controller.findAll();
      const roleIds = (result.data as { id: string }[]).map(r => r.id);

      expect(roleIds).toContain(UserRole.ADMIN);
      expect(roleIds).toContain(UserRole.MANAGER);
    });

    it('should include MECHANIC and RECEPTIONIST roles', () => {
      const result = controller.findAll();
      const roleIds = (result.data as { id: string }[]).map(r => r.id);

      expect(roleIds).toContain(UserRole.MECHANIC);
      expect(roleIds).toContain(UserRole.RECEPTIONIST);
    });

    it('should include label and permissions for known roles', () => {
      const result = controller.findAll();
      const adminRole = (
        result.data as { id: string; label: string; permissions: string[] }[]
      ).find(r => r.id === UserRole.ADMIN);

      expect(adminRole).toBeDefined();
      expect(adminRole?.label).toBe('Amministratore');
      expect(adminRole?.permissions).toContain('*');
    });

    it('should include description for MANAGER role', () => {
      const result = controller.findAll();
      const managerRole = (result.data as { id: string; description: string }[]).find(
        r => r.id === UserRole.MANAGER,
      );

      expect(managerRole).toBeDefined();
      expect(managerRole?.description).toBeTruthy();
    });
  });
});
