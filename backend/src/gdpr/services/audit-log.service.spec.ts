import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogService } from './audit-log.service';
import { PrismaService } from '@common/services/prisma.service';
import { LoggerService } from '@common/services/logger.service';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let prisma: {
    withTenant: jest.Mock;
    auditLog: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      groupBy: jest.Mock;
      updateMany: jest.Mock;
    };
  };

  const TENANT_ID = 'tenant-001';
  const CUSTOMER_ID = 'customer-001';

  const mockAuditRecord = {
    id: 'audit-001',
    tenantId: TENANT_ID,
    action: 'CUSTOMER_UPDATED',
    tableName: 'customers_encrypted',
    recordId: CUSTOMER_ID,
    oldValues: '{"name":"Old"}',
    newValues: '{"name":"New"}',
    performedBy: 'user-001',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    createdAt: new Date('2024-06-01T10:00:00Z'),
  };

  beforeEach(async () => {
    prisma = {
      withTenant: jest.fn((_tenantId, cb) => cb(prisma)),
      auditLog: {
        create: jest.fn().mockResolvedValue(mockAuditRecord),
        findMany: jest.fn().mockResolvedValue([mockAuditRecord]),
        count: jest.fn().mockResolvedValue(1),
        groupBy: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    } as unknown as typeof prisma;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =========================================================================
  // createEntry
  // =========================================================================
  describe('createEntry', () => {
    it('should create an audit log entry', async () => {
      const result = await service.createEntry({
        tenantId: TENANT_ID,
        action: 'CUSTOMER_UPDATED',
        tableName: 'customers_encrypted',
        recordId: CUSTOMER_ID,
        oldValues: { name: 'Old' },
        newValues: { name: 'New' },
        performedBy: 'user-001',
      });

      expect(result.id).toBe('audit-001');
      expect(result.action).toBe('CUSTOMER_UPDATED');
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });

    it('should serialize oldValues and newValues as JSON', async () => {
      await service.createEntry({
        tenantId: TENANT_ID,
        action: 'TEST',
        tableName: 'test',
        recordId: 'rec-001',
        oldValues: { key: 'old' },
        newValues: { key: 'new' },
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          oldValues: '{"key":"old"}',
          newValues: '{"key":"new"}',
        }),
      });
    });

    it('should handle null oldValues and newValues', async () => {
      await service.createEntry({
        tenantId: TENANT_ID,
        action: 'TEST',
        tableName: 'test',
        recordId: 'rec-001',
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          oldValues: null,
          newValues: null,
        }),
      });
    });

    it('should map returned record to AuditLogEntry', async () => {
      const result = await service.createEntry({
        tenantId: TENANT_ID,
        action: 'TEST',
        tableName: 'test',
        recordId: 'rec-001',
      });

      expect(result.oldValues).toEqual({ name: 'Old' });
      expect(result.newValues).toEqual({ name: 'New' });
      expect(result.performedBy).toBe('user-001');
    });
  });

  // =========================================================================
  // getEntries
  // =========================================================================
  describe('getEntries', () => {
    it('should return paginated entries', async () => {
      const result = await service.getEntries({ tenantId: TENANT_ID });

      expect(result.entries).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should apply query filters', async () => {
      (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.auditLog.count as jest.Mock).mockResolvedValue(0);

      await service.getEntries({
        tenantId: TENANT_ID,
        action: 'CUSTOMER_UPDATED',
        tableName: 'customers_encrypted',
        recordId: CUSTOMER_ID,
        performedBy: 'user-001',
      });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            action: 'CUSTOMER_UPDATED',
            tableName: 'customers_encrypted',
            recordId: CUSTOMER_ID,
            performedBy: 'user-001',
          }),
        }),
      );
    });

    it('should apply date range filters', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      await service.getEntries({ startDate, endDate });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { gte: startDate, lte: endDate },
          }),
        }),
      );
    });

    it('should apply pagination', async () => {
      await service.getEntries({ tenantId: TENANT_ID }, { page: 2, limit: 10 });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
    });

    it('should calculate totalPages correctly', async () => {
      (prisma.auditLog.count as jest.Mock).mockResolvedValue(25);

      const result = await service.getEntries({}, { page: 1, limit: 10 });

      expect(result.totalPages).toBe(3);
    });
  });

  // =========================================================================
  // getRecordTrail
  // =========================================================================
  describe('getRecordTrail', () => {
    it('should return audit trail for a specific record', async () => {
      const result = await service.getRecordTrail('customers_encrypted', CUSTOMER_ID, TENANT_ID);

      expect(result).toHaveLength(1);
      expect(result[0].action).toBe('CUSTOMER_UPDATED');
    });

    it('should use withTenant for tenant isolation', async () => {
      await service.getRecordTrail('customers_encrypted', CUSTOMER_ID, TENANT_ID);

      expect(prisma.withTenant).toHaveBeenCalledWith(TENANT_ID, expect.any(Function));
    });
  });

  // =========================================================================
  // getGdprAuditTrail
  // =========================================================================
  describe('getGdprAuditTrail', () => {
    it('should query only GDPR-related actions', async () => {
      await service.getGdprAuditTrail(CUSTOMER_ID, TENANT_ID);

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: {
              in: expect.arrayContaining([
                'CUSTOMER_ANONYMIZED',
                'IDENTITY_VERIFICATION',
                'DELETION_SNAPSHOT_CREATED',
                'CALL_RECORDINGS_DELETED',
              ]),
            },
          }),
        }),
      );
    });
  });

  // =========================================================================
  // getStats
  // =========================================================================
  describe('getStats', () => {
    it('should return aggregate statistics', async () => {
      (prisma.auditLog.count as jest.Mock).mockResolvedValue(100);
      (prisma.auditLog.groupBy as jest.Mock)
        .mockResolvedValueOnce([
          { action: 'CUSTOMER_UPDATED', _count: { action: 60 } },
          { action: 'CUSTOMER_CREATED', _count: { action: 40 } },
        ])
        .mockResolvedValueOnce([
          { tableName: 'customers_encrypted', _count: { tableName: 80 } },
          { tableName: 'bookings', _count: { tableName: 20 } },
        ]);

      const result = await service.getStats(TENANT_ID);

      expect(result.totalEntries).toBe(100);
      expect(result.entriesByAction).toEqual({
        CUSTOMER_UPDATED: 60,
        CUSTOMER_CREATED: 40,
      });
      expect(result.entriesByTable).toEqual({
        customers_encrypted: 80,
        bookings: 20,
      });
      expect(result.recentActivity).toHaveLength(1);
    });

    it('should work without tenant filter', async () => {
      (prisma.auditLog.count as jest.Mock).mockResolvedValue(0);
      (prisma.auditLog.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getStats();

      expect(result.totalEntries).toBe(0);
    });
  });

  // =========================================================================
  // preserveAuditTrail
  // =========================================================================
  describe('preserveAuditTrail', () => {
    it('should count existing entries and create preservation record', async () => {
      (prisma.auditLog.count as jest.Mock).mockResolvedValue(15);

      await service.preserveAuditTrail(CUSTOMER_ID, TENANT_ID, 'req-001');

      expect(prisma.auditLog.count).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          action: 'AUDIT_TRAIL_PRESERVED',
          tableName: 'audit_log',
          recordId: CUSTOMER_ID,
        }),
      });
    });
  });

  // =========================================================================
  // archiveOldEntries
  // =========================================================================
  describe('archiveOldEntries', () => {
    it('should archive entries older than retention period', async () => {
      (prisma.auditLog.count as jest.Mock).mockResolvedValue(50);

      const result = await service.archiveOldEntries(365);

      expect(result.archivedCount).toBe(50);
      expect(result.archivedUpTo).toBeInstanceOf(Date);
      expect(prisma.auditLog.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          createdAt: expect.objectContaining({
            lt: expect.any(Date),
          }),
        }),
        data: {
          archived: true,
          archivedAt: expect.any(Date),
        },
      });
    });

    it('should apply tenant filter when provided', async () => {
      (prisma.auditLog.count as jest.Mock).mockResolvedValue(10);

      await service.archiveOldEntries(365, TENANT_ID);

      expect(prisma.auditLog.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          tenantId: TENANT_ID,
        }),
        data: expect.any(Object),
      });
    });
  });

  // =========================================================================
  // exportForCompliance
  // =========================================================================
  describe('exportForCompliance', () => {
    it('should export entries with compliance metadata', async () => {
      const result = await service.exportForCompliance({ tenantId: TENANT_ID });

      expect(result.entries).toHaveLength(1);
      expect(result.generatedAt).toBeInstanceOf(Date);
      expect(result.retentionPeriod).toBe('7 years');
    });
  });
});
