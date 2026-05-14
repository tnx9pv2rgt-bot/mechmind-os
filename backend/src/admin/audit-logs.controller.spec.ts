import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogsController } from './audit-logs.controller';
import { PrismaService } from '@common/services/prisma.service';

const mockPrisma = {
  auditLog: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

const mockReq = (tenantId = 'tenant-001') => ({
  user: { userId: 'user-001', tenantId },
});

const mockLogs = [
  {
    id: 'log-001',
    tenantId: 'tenant-001',
    action: 'CREATE',
    tableName: 'user',
    createdAt: new Date(),
  },
  {
    id: 'log-002',
    tenantId: 'tenant-001',
    action: 'UPDATE',
    tableName: 'invoice',
    createdAt: new Date(),
  },
];

describe('AuditLogsController', () => {
  let controller: AuditLogsController;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockPrisma.auditLog.findMany.mockResolvedValue(mockLogs);
    mockPrisma.auditLog.count.mockResolvedValue(2);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditLogsController],
      providers: [{ provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    controller = module.get(AuditLogsController);
  });

  describe('findAll', () => {
    it('should return paginated logs with total count', async () => {
      const result = await controller.findAll(mockReq());

      expect(result.success).toBe(true);
      expect(result.total).toBe(2);
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledTimes(1);
    });

    it('should filter by tenantId — tenant isolation', async () => {
      await controller.findAll(mockReq('tenant-xyz'));

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ tenantId: 'tenant-xyz' }) }),
      );
      expect(mockPrisma.auditLog.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ tenantId: 'tenant-xyz' }) }),
      );
    });

    it('should apply action filter when provided', async () => {
      await controller.findAll(mockReq(), undefined, undefined, 'CREATE');

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ action: 'CREATE' }) }),
      );
      expect(mockPrisma.auditLog.count).toHaveBeenCalledTimes(1);
    });

    it('should apply tableName filter when provided', async () => {
      await controller.findAll(mockReq(), undefined, undefined, undefined, 'invoice');

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ tableName: 'invoice' }) }),
      );
      expect(mockPrisma.auditLog.count).toHaveBeenCalledTimes(1);
    });

    it('should respect custom page and limit', async () => {
      await controller.findAll(mockReq(), '2', '20');

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 20, skip: 20 }),
      );
      expect(mockPrisma.auditLog.count).toHaveBeenCalledTimes(1);
    });

    it('should cap limit at 100', async () => {
      await controller.findAll(mockReq(), '1', '999');

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
      expect(mockPrisma.auditLog.count).toHaveBeenCalledTimes(1);
    });

    it('should default to take=50 skip=0 when no page/limit provided', async () => {
      await controller.findAll(mockReq());

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50, skip: 0 }),
      );
      expect(mockPrisma.auditLog.count).toHaveBeenCalledTimes(1);
    });

    it('should order by createdAt descending', async () => {
      await controller.findAll(mockReq());

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledTimes(1);
    });
  });
});
