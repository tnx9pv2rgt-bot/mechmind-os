import { Test, TestingModule } from '@nestjs/testing';
import { AdminTenantsController } from './admin-tenants.controller';
import { PrismaService } from '@common/services/prisma.service';

const mockPrisma = {
  tenant: { findUnique: jest.fn() },
};

const mockAuthReq = (tenantId = 'tenant-001') => ({
  user: { userId: 'user-001', tenantId, role: 'ADMIN' },
});

describe('AdminTenantsController', () => {
  let controller: AdminTenantsController;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockPrisma.tenant.findUnique.mockResolvedValue({
      id: 'tenant-001',
      name: 'Officina Test',
      slug: 'test',
      isActive: true,
      createdAt: new Date('2026-01-01'),
    });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminTenantsController],
      providers: [{ provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    controller = module.get(AdminTenantsController);
  });

  describe('findAll', () => {
    it('should return current tenant wrapped in array', async () => {
      const result = await controller.findAll(mockAuthReq());

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(mockPrisma.tenant.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'tenant-001' } }),
      );
    });

    it('should query only by tenantId from request (tenant isolation)', async () => {
      await controller.findAll(mockAuthReq('tenant-xyz'));

      expect(mockPrisma.tenant.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'tenant-xyz' } }),
      );
      expect(mockPrisma.tenant.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when tenant not found', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(null);

      const result = await controller.findAll(mockAuthReq());

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
      expect(mockPrisma.tenant.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should select only safe fields (no secrets)', async () => {
      await controller.findAll(mockAuthReq());

      expect(mockPrisma.tenant.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({ id: true, name: true, slug: true }),
        }),
      );
      expect(mockPrisma.tenant.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should propagate db errors', async () => {
      mockPrisma.tenant.findUnique.mockRejectedValueOnce(new Error('DB error'));

      await expect(controller.findAll(mockAuthReq())).rejects.toThrow('DB error');
      expect(mockPrisma.tenant.findUnique).toHaveBeenCalledTimes(1);
    });
  });
});
