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
  });
});
