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
  });
});
