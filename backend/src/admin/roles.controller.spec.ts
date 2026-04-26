import { Test, TestingModule } from '@nestjs/testing';
import { RolesController } from './roles.controller';

describe('RolesController', () => {
  let controller: RolesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolesController],
    }).compile();

    controller = module.get<RolesController>(RolesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all roles with labels and permissions', () => {
      const result = controller.findAll();

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThanOrEqual(5);

      const admin = result.data.find((r: Record<string, unknown>) => r.id === 'ADMIN');
      expect(admin).toBeDefined();
      expect(admin).toEqual(
        expect.objectContaining({
          id: 'ADMIN',
          name: 'ADMIN',
          label: 'Amministratore',
          permissions: ['*'],
        }),
      );

      const mechanic = result.data.find((r: Record<string, unknown>) => r.id === 'MECHANIC');
      expect(mechanic).toBeDefined();
      expect(mechanic).toEqual(
        expect.objectContaining({
          id: 'MECHANIC',
          name: 'MECHANIC',
          label: 'Meccanico',
        }),
      );
    });

    it('should include MANAGER, RECEPTIONIST, and VIEWER roles', () => {
      const result = controller.findAll();

      const manager = result.data.find((r: Record<string, unknown>) => r.id === 'MANAGER');
      expect(manager).toBeDefined();
      expect((manager as Record<string, unknown>).label).toBe('Manager');
      expect((manager as Record<string, unknown>).permissions).toEqual(
        expect.arrayContaining(['bookings', 'customers', 'invoices']),
      );

      const receptionist = result.data.find(
        (r: Record<string, unknown>) => r.id === 'RECEPTIONIST',
      );
      expect(receptionist).toBeDefined();
      expect((receptionist as Record<string, unknown>).label).toBe('Receptionist');

      const viewer = result.data.find((r: Record<string, unknown>) => r.id === 'VIEWER');
      expect(viewer).toBeDefined();
      expect((viewer as Record<string, unknown>).label).toBe('Visualizzatore');
      expect((viewer as Record<string, unknown>).permissions).toEqual(['read-only']);
    });

    it('should use fallback label/description for roles not in ROLE_DESCRIPTIONS', () => {
      const result = controller.findAll();
      for (const role of result.data) {
        const r = role as Record<string, unknown>;
        expect(r.label).toBeDefined();
        expect(typeof r.label).toBe('string');
        expect(r.permissions).toBeDefined();
      }
    });
  });

  describe('findAll - fallback branch (unknown role)', () => {
    it('should apply fallback metadata when UserRole has a value missing from ROLE_DESCRIPTIONS', () => {
      jest.isolateModules(() => {
        jest.doMock('@prisma/client', () => ({
          UserRole: {
            ADMIN: 'ADMIN',
            CUSTOM_UNKNOWN: 'CUSTOM_UNKNOWN',
          },
        }));

        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require('./roles.controller') as typeof import('./roles.controller');
        const ctrl = new mod.RolesController();
        const result = ctrl.findAll();

        const unknown = result.data.find(
          (r: unknown) => (r as Record<string, unknown>).id === 'CUSTOM_UNKNOWN',
        ) as Record<string, unknown> | undefined;

        expect(unknown).toBeDefined();
        expect(unknown).toEqual({
          id: 'CUSTOM_UNKNOWN',
          name: 'CUSTOM_UNKNOWN',
          label: 'CUSTOM_UNKNOWN',
          description: '',
          permissions: [],
        });

        const admin = result.data.find(
          (r: unknown) => (r as Record<string, unknown>).id === 'ADMIN',
        ) as Record<string, unknown> | undefined;
        expect(admin).toBeDefined();
        expect(admin?.label).toBe('Amministratore');
      });
    });
  });
});
