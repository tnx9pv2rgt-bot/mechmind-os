import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogsController } from './audit-logs.controller';
import { PrismaService } from '@common/services/prisma.service';

describe('AuditLogsController', () => {
  let controller: AuditLogsController;
  let prisma: {
    auditLog: {
      findMany: jest.Mock;
      count: jest.Mock;
    };
  };

  const mockReq = {
    user: { userId: 'user-1', tenantId: 'tenant-1', email: 'test@test.com', role: 'ADMIN' },
  };

  beforeEach(async () => {
    prisma = {
      auditLog: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditLogsController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();

    controller = module.get<AuditLogsController>(AuditLogsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return audit logs for tenant', async () => {
      const logs = [{ id: 'log-1', action: 'CREATE', tableName: 'User', tenantId: 'tenant-1' }];
      prisma.auditLog.findMany.mockResolvedValue(logs);
      prisma.auditLog.count.mockResolvedValue(1);

      const result = await controller.findAll(mockReq);

      expect(result).toEqual({ success: true, data: logs, total: 1 });
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-1' },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should filter by action', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      await controller.findAll(mockReq, undefined, undefined, 'DELETE');

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-1', action: 'DELETE' },
        }),
      );
    });

    it('should filter by tableName', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      await controller.findAll(mockReq, undefined, undefined, undefined, 'User');

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-1', tableName: 'User' },
        }),
      );
    });

    it('should handle pagination', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(100);

      await controller.findAll(mockReq, '2', '10');

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 10,
        }),
      );
    });

    // ========================================================================
    // ENHANCED TESTS FOR BRANCH COVERAGE
    // ========================================================================

    it('should clamp limit to max 100', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      await controller.findAll(mockReq, '1', '500');

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        }),
      );
    });

    it('should handle page 0 as page 1', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      await controller.findAll(mockReq, '0', '10');

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
        }),
      );
    });

    it('should use default limit of 50', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      await controller.findAll(mockReq);

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        }),
      );
    });

    it('should combine multiple filters', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      await controller.findAll(mockReq, '1', '25', 'UPDATE', 'Invoice');

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: 'tenant-1',
            action: 'UPDATE',
            tableName: 'Invoice',
          },
        }),
      );
    });

    it('should return correct pagination metadata', async () => {
      const logs = [
        { id: 'log-1', action: 'CREATE' },
        { id: 'log-2', action: 'UPDATE' },
      ];
      prisma.auditLog.findMany.mockResolvedValue(logs);
      prisma.auditLog.count.mockResolvedValue(47);

      const result = await controller.findAll(mockReq, '1', '25');

      expect(result.data).toBe(logs);
      expect(result.total).toBe(47);
      expect(result.success).toBe(true);
    });

    it('should handle negative page as page 1', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      await controller.findAll(mockReq, '-5', '10');

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
        }),
      );
    });

    it('should not include action filter when undefined', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      await controller.findAll(mockReq, '1', '50', undefined, 'Customer');

      const callArgs = prisma.auditLog.findMany.mock.calls[0][0];
      expect(callArgs.where).not.toHaveProperty('action');
      expect(callArgs.where.tableName).toBe('Customer');
    });

    it('should not include tableName filter when undefined', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      await controller.findAll(mockReq, '1', '50', 'DELETE', undefined);

      const callArgs = prisma.auditLog.findMany.mock.calls[0][0];
      expect(callArgs.where).not.toHaveProperty('tableName');
      expect(callArgs.where.action).toBe('DELETE');
    });

    it('should enforce tenant isolation', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      const otherTenantReq = {
        user: { userId: 'user-2', tenantId: 'tenant-2', email: 'other@test.com', role: 'ADMIN' },
      };

      await controller.findAll(otherTenantReq);

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-2' },
        }),
      );
    });

    it('should return empty data when no logs found', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      const result = await controller.findAll(mockReq);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should calculate skip correctly for page 3', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      await controller.findAll(mockReq, '3', '20');

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 40,
        }),
      );
    });

    it('should order by createdAt descending', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      await controller.findAll(mockReq);

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should call count with same where clause as findMany', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(42);

      await controller.findAll(mockReq, '2', '20', 'CREATE', 'Booking');

      const findManyCall = prisma.auditLog.findMany.mock.calls[0][0];
      const countCall = prisma.auditLog.count.mock.calls[0][0];

      expect(countCall.where).toEqual(findManyCall.where);
    });

    it('should handle limit = 1', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      await controller.findAll(mockReq, '1', '1');

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 1,
        }),
      );
    });

    it('should use Math.min to enforce limit ceiling', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      // Test boundary: 100 should stay at 100
      await controller.findAll(mockReq, '1', '100');

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        }),
      );
    });

    it('should use Math.max to enforce minimum page', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      await controller.findAll(mockReq, '-10', '50');

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
        }),
      );
    });

    it('should return success true in response', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      const result = await controller.findAll(mockReq);

      expect(result.success).toBe(true);
    });
  });
});
