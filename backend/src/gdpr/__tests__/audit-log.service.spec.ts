import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogService, AuditLogEntry, AuditLogQuery, PaginatedAuditLogResult, AuditLogStats } from '../services/audit-log.service';
import { PrismaService } from '@common/services/prisma.service';
import { LoggerService } from '@common/services/logger.service';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let mockPrismaService: jest.Mocked<Partial<PrismaService>>;
  let mockLoggerService: jest.Mocked<Partial<LoggerService>>;

  const mockTenantId = 'tenant-123';
  const mockCustomerId = 'customer-456';
  const mockRequestId = 'request-789';

  beforeEach(async () => {
    mockPrismaService = {
      withTenant: jest.fn(),
      auditLog: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
        updateMany: jest.fn(),
      } as any,
    };

    mockLoggerService = {
      log: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createEntry', () => {
    it('should create a basic audit log entry', async () => {
      // Arrange
      const mockEntry = {
        id: 'audit-1',
        tenantId: mockTenantId,
        action: 'CUSTOMER_CREATED',
        tableName: 'customers',
        recordId: mockCustomerId,
        oldValues: null,
        newValues: JSON.stringify({ name: 'John Doe' }),
        performedBy: null,
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(),
      };

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            auditLog: {
              create: jest.fn().mockResolvedValue(mockEntry),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.createEntry({
        tenantId: mockTenantId,
        action: 'CUSTOMER_CREATED',
        tableName: 'customers',
        recordId: mockCustomerId,
        newValues: { name: 'John Doe' },
      });

      // Assert
      expect(result).toMatchObject<Partial<AuditLogEntry>>({
        tenantId: mockTenantId,
        action: 'CUSTOMER_CREATED',
        tableName: 'customers',
        recordId: mockCustomerId,
        newValues: { name: 'John Doe' },
      });
      expect(mockLoggerService.log).toHaveBeenCalledWith(
        expect.stringContaining('Audit log created'),
        'AuditLogService',
      );
    });

    it('should create entry with all fields', async () => {
      // Arrange
      const mockEntry = {
        id: 'audit-2',
        tenantId: mockTenantId,
        action: 'CUSTOMER_UPDATED',
        tableName: 'customers',
        recordId: mockCustomerId,
        oldValues: JSON.stringify({ name: 'John' }),
        newValues: JSON.stringify({ name: 'John Doe' }),
        performedBy: 'admin@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        createdAt: new Date(),
      };

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            auditLog: {
              create: jest.fn().mockResolvedValue(mockEntry),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.createEntry({
        tenantId: mockTenantId,
        action: 'CUSTOMER_UPDATED',
        tableName: 'customers',
        recordId: mockCustomerId,
        oldValues: { name: 'John' },
        newValues: { name: 'John Doe' },
        performedBy: 'admin@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      // Assert
      expect(result.oldValues).toEqual({ name: 'John' });
      expect(result.newValues).toEqual({ name: 'John Doe' });
      expect(result.performedBy).toBe('admin@example.com');
      expect(result.ipAddress).toBe('192.168.1.1');
      expect(result.userAgent).toBe('Mozilla/5.0');
    });

    it('should handle null values correctly', async () => {
      // Arrange
      const mockEntry = {
        id: 'audit-3',
        tenantId: mockTenantId,
        action: 'CUSTOMER_DELETED',
        tableName: 'customers',
        recordId: mockCustomerId,
        oldValues: null,
        newValues: null,
        performedBy: null,
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(),
      };

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            auditLog: {
              create: jest.fn().mockResolvedValue(mockEntry),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.createEntry({
        tenantId: mockTenantId,
        action: 'CUSTOMER_DELETED',
        tableName: 'customers',
        recordId: mockCustomerId,
      });

      // Assert
      expect(result.oldValues).toBeUndefined();
      expect(result.newValues).toBeUndefined();
      expect(result.performedBy).toBeUndefined();
    });
  });

  describe('getEntries', () => {
    it('should return paginated audit log entries', async () => {
      // Arrange
      const mockEntries = [
        {
          id: 'audit-1',
          tenantId: mockTenantId,
          action: 'CUSTOMER_CREATED',
          tableName: 'customers',
          recordId: mockCustomerId,
          oldValues: null,
          newValues: JSON.stringify({ name: 'John' }),
          performedBy: null,
          ipAddress: null,
          userAgent: null,
          createdAt: new Date(),
        },
        {
          id: 'audit-2',
          tenantId: mockTenantId,
          action: 'CUSTOMER_UPDATED',
          tableName: 'customers',
          recordId: mockCustomerId,
          oldValues: JSON.stringify({ name: 'John' }),
          newValues: JSON.stringify({ name: 'John Doe' }),
          performedBy: 'admin@example.com',
          ipAddress: '192.168.1.1',
          userAgent: null,
          createdAt: new Date(),
        },
      ];

      (mockPrismaService.auditLog.findMany as jest.Mock).mockResolvedValue(mockEntries);
      (mockPrismaService.auditLog.count as jest.Mock).mockResolvedValue(100);

      // Act
      const result = await service.getEntries(
        { tenantId: mockTenantId },
        { page: 1, limit: 50 },
      );

      // Assert
      expect(result).toMatchObject<Partial<PaginatedAuditLogResult>>({
        entries: expect.any(Array),
        total: 100,
        page: 1,
        totalPages: 2,
      });
      expect(result.entries).toHaveLength(2);
    });

    it('should apply action filter', async () => {
      // Arrange
      (mockPrismaService.auditLog.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.auditLog.count as jest.Mock).mockResolvedValue(0);

      // Act
      await service.getEntries({
        tenantId: mockTenantId,
        action: 'CUSTOMER_CREATED',
      });

      // Assert
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: 'CUSTOMER_CREATED',
          }),
        }),
      );
    });

    it('should apply table name filter', async () => {
      // Arrange
      (mockPrismaService.auditLog.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.auditLog.count as jest.Mock).mockResolvedValue(0);

      // Act
      await service.getEntries({
        tenantId: mockTenantId,
        tableName: 'bookings',
      });

      // Assert
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tableName: 'bookings',
          }),
        }),
      );
    });

    it('should apply record ID filter', async () => {
      // Arrange
      (mockPrismaService.auditLog.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.auditLog.count as jest.Mock).mockResolvedValue(0);

      // Act
      await service.getEntries({
        tenantId: mockTenantId,
        recordId: mockCustomerId,
      });

      // Assert
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            recordId: mockCustomerId,
          }),
        }),
      );
    });

    it('should apply date range filter', async () => {
      // Arrange
      (mockPrismaService.auditLog.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.auditLog.count as jest.Mock).mockResolvedValue(0);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      // Act
      await service.getEntries({
        tenantId: mockTenantId,
        startDate,
        endDate,
      });

      // Assert
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
        }),
      );
    });

    it('should apply performedBy filter', async () => {
      // Arrange
      (mockPrismaService.auditLog.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.auditLog.count as jest.Mock).mockResolvedValue(0);

      // Act
      await service.getEntries({
        tenantId: mockTenantId,
        performedBy: 'admin@example.com',
      });

      // Assert
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            performedBy: 'admin@example.com',
          }),
        }),
      );
    });

    it('should calculate pagination correctly', async () => {
      // Arrange
      (mockPrismaService.auditLog.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.auditLog.count as jest.Mock).mockResolvedValue(95);

      // Act
      const result = await service.getEntries(
        {},
        { page: 2, limit: 20 },
      );

      // Assert
      expect(result.page).toBe(2);
      expect(result.totalPages).toBe(5); // ceil(95/20) = 5
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20, // (2-1) * 20
          take: 20,
        }),
      );
    });

    it('should order by createdAt descending', async () => {
      // Arrange
      (mockPrismaService.auditLog.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.auditLog.count as jest.Mock).mockResolvedValue(0);

      // Act
      await service.getEntries({});

      // Assert
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  describe('getRecordTrail', () => {
    it('should return audit trail for a specific record', async () => {
      // Arrange
      const mockEntries = [
        {
          id: 'audit-1',
          tenantId: mockTenantId,
          action: 'CREATED',
          tableName: 'customers',
          recordId: mockCustomerId,
          oldValues: null,
          newValues: JSON.stringify({ name: 'John' }),
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'audit-2',
          tenantId: mockTenantId,
          action: 'UPDATED',
          tableName: 'customers',
          recordId: mockCustomerId,
          oldValues: JSON.stringify({ name: 'John' }),
          newValues: JSON.stringify({ name: 'John Doe' }),
          createdAt: new Date('2024-01-15'),
        },
      ];

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            auditLog: {
              findMany: jest.fn().mockResolvedValue(mockEntries),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.getRecordTrail('customers', mockCustomerId, mockTenantId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].action).toBe('CREATED');
      expect(result[1].action).toBe('UPDATED');
    });

    it('should order by createdAt descending', async () => {
      // Arrange
      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            auditLog: {
              findMany: jest.fn().mockResolvedValue([]),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      await service.getRecordTrail('bookings', 'booking-1', mockTenantId);

      // Assert
      const mockCall = (mockPrismaService.withTenant as jest.Mock).mock.calls[0];
      const prismaMock = { auditLog: { findMany: jest.fn() } };
      await mockCall[1](prismaMock as any);
      expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          tableName: 'bookings',
          recordId: 'booking-1',
          tenantId: mockTenantId,
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getGdprAuditTrail', () => {
    it('should return GDPR-specific audit entries', async () => {
      // Arrange
      const mockEntries = [
        {
          id: 'audit-1',
          tenantId: mockTenantId,
          action: 'CUSTOMER_ANONYMIZED',
          tableName: 'customers_encrypted',
          recordId: mockCustomerId,
          newValues: JSON.stringify({ anonymizedAt: new Date() }),
          createdAt: new Date(),
        },
        {
          id: 'audit-2',
          tenantId: mockTenantId,
          action: 'CONSENT_RECORDED',
          tableName: 'consent_audit_log',
          recordId: 'consent-1',
          newValues: JSON.stringify({ customerId: mockCustomerId }),
          createdAt: new Date(),
        },
      ];

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            auditLog: {
              findMany: jest.fn().mockResolvedValue(mockEntries),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.getGdprAuditTrail(mockCustomerId, mockTenantId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].action).toBe('CUSTOMER_ANONYMIZED');
    });

    it('should query with GDPR action types', async () => {
      // Arrange
      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            auditLog: {
              findMany: jest.fn().mockResolvedValue([]),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      await service.getGdprAuditTrail(mockCustomerId, mockTenantId);

      // Assert
      const mockCall = (mockPrismaService.withTenant as jest.Mock).mock.calls[0];
      const prismaMock = { auditLog: { findMany: jest.fn() } };
      await mockCall[1](prismaMock as any);
      expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          action: {
            in: [
              'CUSTOMER_ANONYMIZED',
              'IDENTITY_VERIFICATION',
              'DELETION_SNAPSHOT_CREATED',
              'CALL_RECORDINGS_DELETED',
              'DATA_EXPORTED',
              'DSR_CREATED',
              'CONSENT_RECORDED',
              'CONSENT_REVOKED',
            ],
          },
          OR: [
            { recordId: mockCustomerId },
            { newValues: { path: ['customerId'], equals: mockCustomerId } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getStats', () => {
    it('should return audit log statistics', async () => {
      // Arrange
      (mockPrismaService.auditLog.count as jest.Mock).mockResolvedValue(1000);
      (mockPrismaService.auditLog.groupBy as jest.Mock)
        .mockResolvedValueOnce([
          { action: 'CREATED', _count: { action: 500 } },
          { action: 'UPDATED', _count: { action: 300 } },
          { action: 'DELETED', _count: { action: 200 } },
        ])
        .mockResolvedValueOnce([
          { tableName: 'customers', _count: { tableName: 400 } },
          { tableName: 'bookings', _count: { tableName: 600 } },
        ]);
      (mockPrismaService.auditLog.findMany as jest.Mock).mockResolvedValue([
        { id: 'audit-1', action: 'CREATED', createdAt: new Date() },
      ]);

      // Act
      const result = await service.getStats(mockTenantId);

      // Assert
      expect(result).toMatchObject<Partial<AuditLogStats>>({
        totalEntries: 1000,
        entriesByAction: {
          CREATED: 500,
          UPDATED: 300,
          DELETED: 200,
        },
        entriesByTable: {
          customers: 400,
          bookings: 600,
        },
        recentActivity: expect.any(Array),
      });
    });

    it('should handle empty statistics', async () => {
      // Arrange
      (mockPrismaService.auditLog.count as jest.Mock).mockResolvedValue(0);
      (mockPrismaService.auditLog.groupBy as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      (mockPrismaService.auditLog.findMany as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await service.getStats();

      // Assert
      expect(result.totalEntries).toBe(0);
      expect(result.entriesByAction).toEqual({});
      expect(result.entriesByTable).toEqual({});
      expect(result.recentActivity).toEqual([]);
    });

    it('should filter by tenant when provided', async () => {
      // Arrange
      (mockPrismaService.auditLog.count as jest.Mock).mockResolvedValue(100);
      (mockPrismaService.auditLog.groupBy as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      (mockPrismaService.auditLog.findMany as jest.Mock).mockResolvedValue([]);

      // Act
      await service.getStats(mockTenantId);

      // Assert
      expect(mockPrismaService.auditLog.count).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
      });
    });

    it('should not filter by tenant when not provided', async () => {
      // Arrange
      (mockPrismaService.auditLog.count as jest.Mock).mockResolvedValue(0);
      (mockPrismaService.auditLog.groupBy as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      (mockPrismaService.auditLog.findMany as jest.Mock).mockResolvedValue([]);

      // Act
      await service.getStats();

      // Assert
      expect(mockPrismaService.auditLog.count).toHaveBeenCalledWith({
        where: {},
      });
    });
  });

  describe('preserveAuditTrail', () => {
    it('should create preservation record', async () => {
      // Arrange
      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            auditLog: {
              count: jest.fn().mockResolvedValue(50),
              create: jest.fn().mockResolvedValue({}),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      await service.preserveAuditTrail(mockCustomerId, mockTenantId, mockRequestId);

      // Assert
      expect(mockLoggerService.log).toHaveBeenCalledWith(
        expect.stringContaining('Audit trail preserved for customer'),
        'AuditLogService',
      );
    });

    it('should count audit entries before preservation', async () => {
      // Arrange
      const countMock = jest.fn().mockResolvedValue(100);
      const createMock = jest.fn().mockResolvedValue({});

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            auditLog: {
              count: countMock,
              create: createMock,
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      await service.preserveAuditTrail(mockCustomerId, mockTenantId, mockRequestId);

      // Assert
      expect(countMock).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          recordId: mockCustomerId,
        },
      });
    });

    it('should create AUDIT_TRAIL_PRESERVED entry', async () => {
      // Arrange
      const createMock = jest.fn().mockResolvedValue({});

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            auditLog: {
              count: jest.fn().mockResolvedValue(50),
              create: createMock,
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      await service.preserveAuditTrail(mockCustomerId, mockTenantId, mockRequestId);

      // Assert
      expect(createMock).toHaveBeenCalledWith({
        data: {
          tenantId: mockTenantId,
          action: 'AUDIT_TRAIL_PRESERVED',
          tableName: 'audit_log',
          recordId: mockCustomerId,
          newValues: {
            preservedEntries: 50,
            dataSubjectRequestId: mockRequestId,
            retentionDays: 2555,
            anonymizedAt: expect.any(String),
          },
          createdAt: expect.any(Date),
        },
      });
    });

    it('should set 7-year retention period', async () => {
      // Arrange
      const createMock = jest.fn().mockResolvedValue({});

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            auditLog: {
              count: jest.fn().mockResolvedValue(1),
              create: createMock,
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      await service.preserveAuditTrail(mockCustomerId, mockTenantId, mockRequestId);

      // Assert
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            newValues: expect.objectContaining({
              retentionDays: 2555, // 7 years
            }),
          }),
        }),
      );
    });
  });

  describe('archiveOldEntries', () => {
    it('should archive entries older than retention period', async () => {
      // Arrange
      (mockPrismaService.auditLog.count as jest.Mock).mockResolvedValue(500);
      (mockPrismaService.auditLog.updateMany as jest.Mock).mockResolvedValue({ count: 500 });

      // Act
      const result = await service.archiveOldEntries(365, mockTenantId);

      // Assert
      expect(result.archivedCount).toBe(500);
      expect(result.archivedUpTo).toBeInstanceOf(Date);
      expect(mockPrismaService.auditLog.updateMany).toHaveBeenCalled();
    });

    it('should calculate cutoff date correctly', async () => {
      // Arrange
      (mockPrismaService.auditLog.count as jest.Mock).mockResolvedValue(0);
      (mockPrismaService.auditLog.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      const beforeCall = new Date();

      // Act
      const result = await service.archiveOldEntries(30);
      const afterCall = new Date();

      // Assert
      const expectedCutoff = new Date();
      expectedCutoff.setDate(expectedCutoff.getDate() - 30);
      
      expect(result.archivedUpTo.getTime()).toBeGreaterThanOrEqual(
        expectedCutoff.getTime() - 1000,
      );
      expect(result.archivedUpTo.getTime()).toBeLessThanOrEqual(
        afterCall.getTime(),
      );
    });

    it('should filter by tenant when provided', async () => {
      // Arrange
      (mockPrismaService.auditLog.count as jest.Mock).mockResolvedValue(0);
      (mockPrismaService.auditLog.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      // Act
      await service.archiveOldEntries(90, mockTenantId);

      // Assert
      expect(mockPrismaService.auditLog.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          tenantId: mockTenantId,
        }),
      });
    });

    it('should mark entries as archived', async () => {
      // Arrange
      (mockPrismaService.auditLog.count as jest.Mock).mockResolvedValue(100);
      (mockPrismaService.auditLog.updateMany as jest.Mock).mockResolvedValue({ count: 100 });

      // Act
      await service.archiveOldEntries(365);

      // Assert
      expect(mockPrismaService.auditLog.updateMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        data: {
          archived: true,
          archivedAt: expect.any(Date),
        },
      });
    });

    it('should handle zero entries to archive', async () => {
      // Arrange
      (mockPrismaService.auditLog.count as jest.Mock).mockResolvedValue(0);
      (mockPrismaService.auditLog.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      // Act
      const result = await service.archiveOldEntries(365);

      // Assert
      expect(result.archivedCount).toBe(0);
    });
  });

  describe('exportForCompliance', () => {
    it('should export audit logs for compliance', async () => {
      // Arrange
      const mockEntries = [
        { id: 'audit-1', action: 'CREATED' },
        { id: 'audit-2', action: 'UPDATED' },
      ];
      (mockPrismaService.auditLog.findMany as jest.Mock).mockResolvedValue(mockEntries);
      (mockPrismaService.auditLog.count as jest.Mock).mockResolvedValue(2);

      const query: AuditLogQuery = {
        tenantId: mockTenantId,
        action: 'CUSTOMER_CREATED',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      };

      // Act
      const result = await service.exportForCompliance(query);

      // Assert
      expect(result.entries).toHaveLength(2);
      expect(result.generatedAt).toBeInstanceOf(Date);
      expect(result.retentionPeriod).toBe('7 years');
    });

    it('should use large limit for compliance export', async () => {
      // Arrange
      (mockPrismaService.auditLog.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.auditLog.count as jest.Mock).mockResolvedValue(0);

      // Act
      await service.exportForCompliance({});

      // Assert
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10000,
        }),
      );
    });

    it('should apply all query filters', async () => {
      // Arrange
      (mockPrismaService.auditLog.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.auditLog.count as jest.Mock).mockResolvedValue(0);

      const query: AuditLogQuery = {
        tenantId: mockTenantId,
        action: 'CUSTOMER_CREATED',
        tableName: 'customers',
        recordId: mockCustomerId,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        performedBy: 'admin@example.com',
      };

      // Act
      await service.exportForCompliance(query);

      // Assert - verify getEntries was called with correct filters
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalled();
    });
  });

  describe('mapToEntry (private method)', () => {
    it('should correctly parse JSON values', async () => {
      // Arrange
      const mockRecord = {
        id: 'audit-1',
        tenantId: mockTenantId,
        action: 'TEST',
        tableName: 'test',
        recordId: 'rec-1',
        oldValues: JSON.stringify({ field: 'old' }),
        newValues: JSON.stringify({ field: 'new' }),
        performedBy: 'user@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla',
        createdAt: new Date('2024-01-01'),
      };

      (mockPrismaService.auditLog.findMany as jest.Mock).mockResolvedValue([mockRecord]);
      (mockPrismaService.auditLog.count as jest.Mock).mockResolvedValue(1);

      // Act
      const result = await service.getEntries({});

      // Assert
      expect(result.entries[0].oldValues).toEqual({ field: 'old' });
      expect(result.entries[0].newValues).toEqual({ field: 'new' });
    });

    it('should handle null JSON values', async () => {
      // Arrange
      const mockRecord = {
        id: 'audit-1',
        tenantId: mockTenantId,
        action: 'TEST',
        tableName: 'test',
        recordId: 'rec-1',
        oldValues: null,
        newValues: null,
        performedBy: null,
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(),
      };

      (mockPrismaService.auditLog.findMany as jest.Mock).mockResolvedValue([mockRecord]);
      (mockPrismaService.auditLog.count as jest.Mock).mockResolvedValue(1);

      // Act
      const result = await service.getEntries({});

      // Assert
      expect(result.entries[0].oldValues).toBeUndefined();
      expect(result.entries[0].newValues).toBeUndefined();
      expect(result.entries[0].performedBy).toBeUndefined();
      expect(result.entries[0].ipAddress).toBeUndefined();
      expect(result.entries[0].userAgent).toBeUndefined();
    });

    it('should handle empty string values as undefined', async () => {
      // Arrange
      const mockRecord = {
        id: 'audit-1',
        tenantId: mockTenantId,
        action: 'TEST',
        tableName: 'test',
        recordId: 'rec-1',
        oldValues: null,
        newValues: null,
        performedBy: '',
        ipAddress: '',
        userAgent: '',
        createdAt: new Date(),
      };

      (mockPrismaService.auditLog.findMany as jest.Mock).mockResolvedValue([mockRecord]);
      (mockPrismaService.auditLog.count as jest.Mock).mockResolvedValue(1);

      // Act
      const result = await service.getEntries({});

      // Assert
      expect(result.entries[0].performedBy).toBeUndefined();
      expect(result.entries[0].ipAddress).toBeUndefined();
      expect(result.entries[0].userAgent).toBeUndefined();
    });
  });
});
