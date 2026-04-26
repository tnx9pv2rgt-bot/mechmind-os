import { Test, TestingModule } from '@nestjs/testing';
import { AdminTenantsController } from './admin-tenants.controller';
import { PrismaService } from '@common/services/prisma.service';

describe('AdminTenantsController', () => {
  let controller: AdminTenantsController;
  let prisma: {
    tenant: {
      findUnique: jest.Mock;
    };
  };

  const mockReq = {
    user: { userId: 'user-1', tenantId: 'tenant-1', email: 'test@test.com', role: 'ADMIN' },
  };

  beforeEach(async () => {
    prisma = {
      tenant: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminTenantsController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();

    controller = module.get<AdminTenantsController>(AdminTenantsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return current tenant info', async () => {
      const tenant = {
        id: 'tenant-1',
        name: 'Test Garage',
        slug: 'test-garage',
        isActive: true,
        createdAt: new Date(),
      };
      prisma.tenant.findUnique.mockResolvedValue(tenant);

      const result = await controller.findAll(mockReq);

      expect(result).toEqual({ success: true, data: [tenant] });
      expect(prisma.tenant.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tenant-1' },
        }),
      );
    });

    it('should return empty array when tenant not found', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      const result = await controller.findAll(mockReq);

      expect(result).toEqual({ success: true, data: [] });
    });

    it('should return empty array when tenant is undefined', async () => {
      prisma.tenant.findUnique.mockResolvedValue(undefined);

      const result = await controller.findAll(mockReq);

      expect(result).toEqual({ success: true, data: [] });
      expect(prisma.tenant.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should pass exact select projection to Prisma', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await controller.findAll(mockReq);

      expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { id: 'tenant-1' },
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
          createdAt: true,
        },
      });
    });

    it('should propagate Prisma errors to caller', async () => {
      const dbError = new Error('DB connection lost');
      prisma.tenant.findUnique.mockRejectedValue(dbError);

      await expect(controller.findAll(mockReq)).rejects.toThrow('DB connection lost');
    });

    it('should use tenantId from request user (tenant isolation)', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      const otherTenantReq = {
        user: { userId: 'u2', tenantId: 'other-tenant-99', email: 'x@y.z', role: 'ADMIN' },
      };

      await controller.findAll(otherTenantReq);

      expect(prisma.tenant.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'other-tenant-99' } }),
      );
    });
  });

  describe('decorator metadata fallback', () => {
    it('loads controller module even when PrismaService type is undefined at metadata time', () => {
      jest.isolateModules(() => {
        jest.doMock('@common/services/prisma.service', () => ({}));
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require('./admin-tenants.controller') as {
          AdminTenantsController: new (...args: unknown[]) => unknown;
        };
        expect(mod.AdminTenantsController).toBeDefined();
        expect(typeof mod.AdminTenantsController).toBe('function');
      });
    });
  });
});
