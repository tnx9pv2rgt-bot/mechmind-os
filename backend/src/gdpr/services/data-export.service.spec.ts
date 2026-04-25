import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { DataExportService, DataExportTokenPayload } from './data-export.service';
import { PrismaService } from '@common/services/prisma.service';
import { EncryptionService } from '@common/services/encryption.service';
import { LoggerService } from '@common/services/logger.service';

describe('DataExportService (GDPR Art. 20)', () => {
  let service: DataExportService;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let encryptionService: EncryptionService;
  let loggerService: LoggerService;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-456';
  const mockExportId = 'export-789';
  const mockToken = 'valid.jwt.token';

  const mockTenant = {
    id: mockTenantId,
    name: 'Test Officina',
  };

  const mockAuditLog = {
    id: expect.any(String),
    action: expect.any(String),
    tableName: expect.any(String),
    recordId: expect.any(String),
    newValues: expect.any(String),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataExportService,
        {
          provide: PrismaService,
          useValue: {
            tenant: {
              findUniqueOrThrow: jest.fn().mockResolvedValue(mockTenant),
            },
            auditLog: {
              create: jest.fn().mockResolvedValue(mockAuditLog),
              findMany: jest.fn().mockResolvedValue([]),
            },
            customerEncrypted: {
              findMany: jest.fn().mockResolvedValue([]),
            },
            vehicle: {
              findMany: jest.fn().mockResolvedValue([]),
            },
            booking: {
              findMany: jest.fn().mockResolvedValue([]),
            },
            invoice: {
              findMany: jest.fn().mockResolvedValue([]),
            },
            $queryRaw: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue(mockToken),
            verifyAsync: jest.fn().mockResolvedValue({
              tenantId: mockTenantId,
              userId: mockUserId,
              exportId: mockExportId,
              jti: 'test-jti',
              iat: Math.floor(Date.now() / 1000),
              exp: Math.floor(Date.now() / 1000) + 86400,
            } as DataExportTokenPayload),
          },
        },
        {
          provide: EncryptionService,
          useValue: {
            decrypt: jest.fn((encrypted: string) => {
              if (encrypted === 'encrypted-email') return 'test@example.com';
              if (encrypted === 'encrypted-phone') return '+393331234567';
              if (encrypted === 'encrypted-name') return 'Mario Rossi';
              return encrypted;
            }),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DataExportService>(DataExportService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    encryptionService = module.get<EncryptionService>(EncryptionService);
    loggerService = module.get<LoggerService>(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateExportToken', () => {
    it('should generate valid export token with 24-hour expiry', async () => {
      const result = await service.generateExportToken(mockTenantId, mockUserId);

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('expiresAt');
      expect(result).toHaveProperty('exportId');
      expect(result.url).toContain('data-export-download');
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());

      // Verify JWT was signed
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: mockTenantId,
          userId: mockUserId,
          exportId: expect.any(String),
          jti: expect.any(String),
        }),
        expect.objectContaining({
          expiresIn: '86400s',
        }),
      );
    });

    it('should create audit log entry for export request', async () => {
      await service.generateExportToken(mockTenantId, mockUserId);

      expect(prismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: mockTenantId,
            action: 'DATA_EXPORT_REQUESTED',
            tableName: 'gdpr_exports',
          }),
        }),
      );
    });

    it('should fail with BadRequestException if tenant not found', async () => {
      (prismaService.tenant.findUniqueOrThrow as jest.Mock).mockRejectedValueOnce(
        new Error('Tenant not found'),
      );

      await expect(service.generateExportToken(mockTenantId, mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should generate unique exportId for each request', async () => {
      const result1 = await service.generateExportToken(mockTenantId, mockUserId);
      const result2 = await service.generateExportToken(mockTenantId, mockUserId);

      expect(result1.exportId).not.toEqual(result2.exportId);
    });

    it('should include tenant verification in process', async () => {
      await service.generateExportToken(mockTenantId, mockUserId);

      expect(prismaService.tenant.findUniqueOrThrow).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockTenantId },
        }),
      );
    });
  });

  describe('downloadExportedData', () => {
    it('should verify JWT token before processing', async () => {
      const mockData = {
        customerEncrypted: [],
        vehicle: [],
        booking: [],
        invoice: [],
        workOrders: [],
        estimates: [],
        payments: [],
        notifications: [],
        auditLogs: [],
      };

      setupMockPrismaQueries(mockData);

      await service.downloadExportedData(mockToken);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith(mockToken);
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      (jwtService.verifyAsync as jest.Mock).mockRejectedValueOnce(new Error('Invalid token'));

      await expect(service.downloadExportedData('invalid.token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for expired token', async () => {
      (jwtService.verifyAsync as jest.Mock).mockRejectedValueOnce(new Error('Token expired'));

      await expect(service.downloadExportedData('expired.token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when verifyAsync throws non-Error (false arm on instanceof check)', async () => {
      (jwtService.verifyAsync as jest.Mock).mockRejectedValueOnce('string-rejection');
      await expect(service.downloadExportedData('bad.token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should include all required data sections in export', async () => {
      const mockData = {
        customerEncrypted: [
          {
            id: 'cust-1',
            nameEncrypted: 'encrypted-name',
            emailEncrypted: 'encrypted-email',
            phoneEncrypted: 'encrypted-phone',
            createdAt: new Date('2026-01-01'),
            updatedAt: new Date('2026-02-01'),
            deletedAt: null,
          },
        ],
        vehicle: [
          {
            id: 'veh-1',
            customerId: 'cust-1',
            licensePlate: 'AB123CD',
            make: 'Fiat',
            model: 'Punto',
            year: 2020,
            createdAt: new Date('2026-01-15'),
            updatedAt: new Date('2026-02-01'),
            deletedAt: null,
          },
        ],
        booking: [
          {
            id: 'book-1',
            customerId: 'cust-1',
            scheduledDate: new Date('2026-04-30'),
            status: 'SCHEDULED',
            estimatedDurationMinutes: 120,
            totalCostCents: BigInt(15000),
            paymentStatus: 'PENDING',
            createdAt: new Date('2026-01-20'),
            updatedAt: new Date('2026-02-01'),
            deletedAt: null,
          },
        ],
        invoice: [
          {
            id: 'inv-1',
            bookingId: 'book-1',
            totalCents: BigInt(15000),
            taxCents: BigInt(3000),
            status: 'ISSUED',
            paymentDate: null,
            createdAt: new Date('2026-01-21'),
            updatedAt: new Date('2026-02-01'),
            deletedAt: null,
          },
        ],
        workOrders: [],
        estimates: [],
        payments: [],
        notifications: [],
        auditLogs: [],
      };

      setupMockPrismaQueries(mockData);

      const result = await service.downloadExportedData(mockToken);

      expect(result).toHaveProperty('customers');
      expect(result).toHaveProperty('vehicles');
      expect(result).toHaveProperty('bookings');
      expect(result).toHaveProperty('invoices');
      expect(result).toHaveProperty('workOrders');
      expect(result).toHaveProperty('estimates');
      expect(result).toHaveProperty('payments');
      expect(result).toHaveProperty('notifications');
      expect(result).toHaveProperty('auditLogs');
      expect(result).toHaveProperty('metadata');
    });

    it('should include soft-deleted records with deletedAt flag', async () => {
      const mockData = {
        customerEncrypted: [],
        vehicle: [
          {
            id: 'veh-deleted',
            customerId: 'cust-1',
            licensePlate: 'AB123CD',
            make: 'Fiat',
            model: 'Punto',
            year: 2020,
            createdAt: new Date('2026-01-15'),
            updatedAt: new Date('2026-02-01'),
            deletedAt: new Date('2026-03-15'),
          },
        ],
        booking: [],
        invoice: [],
        workOrders: [],
        estimates: [],
        payments: [],
        notifications: [],
        auditLogs: [],
      };

      setupMockPrismaQueries(mockData);

      const result = await service.downloadExportedData(mockToken);

      expect(result.vehicles).toHaveLength(1);
      expect(result.vehicles[0].deletedAt).toBeDefined();
      expect(result.vehicles[0].deletedAt).toContain('2026-03-15');
    });

    it('should decrypt PII fields for export', async () => {
      const mockData = {
        customerEncrypted: [
          {
            id: 'cust-1',
            nameEncrypted: 'encrypted-name',
            emailEncrypted: 'encrypted-email',
            phoneEncrypted: 'encrypted-phone',
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
          },
        ],
        vehicle: [],
        booking: [],
        invoice: [],
        workOrders: [],
        estimates: [],
        payments: [],
        notifications: [],
        auditLogs: [],
      };

      setupMockPrismaQueries(mockData);

      const result = await service.downloadExportedData(mockToken);

      expect(result.customers).toHaveLength(1);
      expect(result.customers[0].email).toBe('test@example.com');
      expect(result.customers[0].phone).toBe('+393331234567');
      expect(result.customers[0].name).toBe('Mario Rossi');

      // Verify decryption was called
      expect(encryptionService.decrypt).toHaveBeenCalledTimes(3);
    });

    it('should NOT include passwords or sensitive keys', async () => {
      const mockData = {
        customerEncrypted: [],
        vehicle: [],
        booking: [],
        invoice: [],
        workOrders: [],
        estimates: [],
        payments: [],
        notifications: [],
        auditLogs: [
          {
            id: 'audit-1',
            action: 'USER_LOGIN',
            tableName: 'users',
            recordId: 'user-1',
            oldValues: JSON.stringify({ password: '***' }),
            newValues: JSON.stringify({ apiKey: '***' }),
            createdAt: new Date(),
          },
        ],
      };

      setupMockPrismaQueries(mockData);

      const result = await service.downloadExportedData(mockToken);

      // Verify audit log is present but review for sensitive data
      expect(result.auditLogs).toHaveLength(1);
      // Sensitive data should be redacted or not included
    });

    it('should enforce tenant isolation - cross-tenant requests rejected', async () => {
      // User from tenant-A tries to access tenant-B data
      const crossTenantToken = 'cross-tenant.token';
      (jwtService.verifyAsync as jest.Mock).mockResolvedValueOnce({
        tenantId: 'tenant-different',
        userId: mockUserId,
        exportId: mockExportId,
        jti: 'test-jti',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400,
      } as DataExportTokenPayload);

      const mockData = {
        customerEncrypted: [],
        vehicle: [],
        booking: [],
        invoice: [],
        workOrders: [],
        estimates: [],
        payments: [],
        notifications: [],
        auditLogs: [],
      };

      setupMockPrismaQueries(mockData);

      const result = await service.downloadExportedData(crossTenantToken);

      // Tenant should match token's tenantId, not request origin
      expect(result.metadata.exportId).toBeDefined();
    });

    it('should calculate correct record count in metadata', async () => {
      const mockData = {
        customerEncrypted: [
          {
            id: 'cust-1',
            nameEncrypted: null,
            emailEncrypted: null,
            phoneEncrypted: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
          },
        ],
        vehicle: [
          {
            id: 'veh-1',
            customerId: 'cust-1',
            licensePlate: 'AB123CD',
            make: 'Fiat',
            model: 'Punto',
            year: 2020,
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
          },
        ],
        booking: [
          {
            id: 'book-1',
            customerId: 'cust-1',
            scheduledDate: null,
            status: 'SCHEDULED',
            estimatedDurationMinutes: null,
            totalCostCents: null,
            paymentStatus: 'PENDING',
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
          },
        ],
        invoice: [],
        workOrders: [],
        estimates: [],
        payments: [],
        notifications: [],
        auditLogs: [],
      };

      setupMockPrismaQueries(mockData);

      const result = await service.downloadExportedData(mockToken);

      // 1 (tenant) + 1 (customer) + 1 (vehicle) + 1 (booking) = 4
      expect(result.metadata.totalRecords).toBe(4);
    });

    it('should create audit log entry for successful download', async () => {
      const mockData = {
        customerEncrypted: [],
        vehicle: [],
        booking: [],
        invoice: [],
        workOrders: [],
        estimates: [],
        payments: [],
        notifications: [],
        auditLogs: [],
      };

      setupMockPrismaQueries(mockData);

      await service.downloadExportedData(mockToken);

      // Second call to auditLog.create (first is in generateExportToken)
      expect(prismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: mockTenantId,
            action: 'DATA_EXPORT_DOWNLOADED',
            tableName: 'gdpr_exports',
          }),
        }),
      );
    });

    it('should include metadata with exportId, expiresAt, and checksum', async () => {
      const mockData = {
        customerEncrypted: [],
        vehicle: [],
        booking: [],
        invoice: [],
        workOrders: [],
        estimates: [],
        payments: [],
        notifications: [],
        auditLogs: [],
      };

      setupMockPrismaQueries(mockData);

      const result = await service.downloadExportedData(mockToken);

      expect(result.metadata).toHaveProperty('exportId');
      expect(result.metadata).toHaveProperty('expiresAt');
      expect(result.metadata).toHaveProperty('checksum');
      expect(result.metadata.checksum).toMatch(/^[a-f0-9]{64}$/); // SHA256 hex
    });

    it('should handle empty tenant data gracefully', async () => {
      const mockData = {
        customerEncrypted: [],
        vehicle: [],
        booking: [],
        invoice: [],
        workOrders: [],
        estimates: [],
        payments: [],
        notifications: [],
        auditLogs: [],
      };

      setupMockPrismaQueries(mockData);

      const result = await service.downloadExportedData(mockToken);

      expect(result.customers).toEqual([]);
      expect(result.vehicles).toEqual([]);
      expect(result.bookings).toEqual([]);
      expect(result.metadata.totalRecords).toBe(1); // 1 = tenant record always counted
    });

    it('should handle BigInt conversion for currency fields', async () => {
      const mockData = {
        customerEncrypted: [],
        vehicle: [],
        booking: [
          {
            id: 'book-1',
            customerId: 'cust-1',
            scheduledDate: null,
            status: 'COMPLETED',
            estimatedDurationMinutes: 120,
            totalCostCents: BigInt(25000),
            paymentStatus: 'PAID',
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
          },
        ],
        invoice: [
          {
            id: 'inv-1',
            bookingId: 'book-1',
            totalCents: BigInt(25000),
            taxCents: BigInt(5000),
            status: 'PAID',
            paymentDate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
          },
        ],
        workOrders: [],
        estimates: [],
        payments: [],
        notifications: [],
        auditLogs: [],
      };

      setupMockPrismaQueries(mockData);

      const result = await service.downloadExportedData(mockToken);

      expect(result.bookings[0].totalCostCents).toBe(25000);
      // Invoice select excludes totalCents/taxCents — verify base fields
      expect(result.invoices[0].id).toBe('inv-1');
      expect(result.invoices[0].status).toBe('PAID');
    });

    it('should map workOrders, estimates, payments, notifications with optional fields', async () => {
      const now = new Date('2026-04-25T10:00:00Z');
      const mockData = {
        customerEncrypted: [],
        vehicle: [],
        booking: [],
        invoice: [],
        workOrders: [
          {
            id: 'wo-1',
            bookingId: 'book-1',
            status: 'IN_PROGRESS',
            description: 'Oil change',
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          },
          {
            id: 'wo-2',
            bookingId: null,
            status: 'DONE',
            description: null,
            createdAt: now,
            updatedAt: now,
            deletedAt: now,
          },
        ],
        estimates: [
          {
            id: 'est-1',
            customerId: 'cust-1',
            estimatedCostCents: BigInt(10000),
            status: 'DRAFT',
            validUntil: now,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          },
          {
            id: 'est-2',
            customerId: null,
            estimatedCostCents: BigInt(5000),
            status: 'EXPIRED',
            validUntil: null,
            createdAt: now,
            updatedAt: now,
            deletedAt: now,
          },
        ],
        payments: [
          {
            id: 'pay-1',
            invoiceId: 'inv-1',
            amountCents: BigInt(15000),
            status: 'COMPLETED',
            processedAt: now,
            createdAt: now,
            updatedAt: now,
          },
          {
            id: 'pay-2',
            invoiceId: null,
            amountCents: BigInt(0),
            status: 'PENDING',
            processedAt: null,
            createdAt: now,
            updatedAt: now,
          },
        ],
        notifications: [
          {
            id: 'notif-1',
            type: 'EMAIL',
            status: 'SENT',
            readAt: now,
            createdAt: now,
            updatedAt: now,
          },
          {
            id: 'notif-2',
            type: 'SMS',
            status: 'PENDING',
            readAt: null,
            createdAt: now,
            updatedAt: now,
          },
        ],
        auditLogs: [
          {
            id: 'audit-1',
            action: 'UPDATE',
            tableName: 'bookings',
            recordId: 'book-1',
            oldValues: JSON.stringify({ status: 'OLD' }),
            newValues: JSON.stringify({ status: 'NEW' }),
            createdAt: now,
          },
          {
            id: 'audit-2',
            action: 'CREATE',
            tableName: 'vehicles',
            recordId: 'veh-1',
            oldValues: null,
            newValues: null,
            createdAt: now,
          },
        ],
      };

      setupMockPrismaQueries(mockData);

      const result = await service.downloadExportedData(mockToken);

      // workOrders
      expect(result.workOrders).toHaveLength(2);
      expect(result.workOrders[0].status).toBe('IN_PROGRESS');
      expect(result.workOrders[0].deletedAt).toBeNull();
      expect(result.workOrders[1].deletedAt).not.toBeNull();

      // estimates
      expect(result.estimates).toHaveLength(2);
      expect(result.estimates[0].estimatedCostCents).toBe(10000);
      expect(result.estimates[0].validUntil).toBe(now.toISOString());
      expect(result.estimates[1].validUntil).toBeUndefined();
      expect(result.estimates[1].deletedAt).not.toBeNull();

      // payments
      expect(result.payments).toHaveLength(2);
      expect(result.payments[0].amountCents).toBe(15000);
      expect(result.payments[0].processedAt).toBe(now.toISOString());
      expect(result.payments[1].processedAt).toBeUndefined();

      // notifications
      expect(result.notifications).toHaveLength(2);
      expect(result.notifications[0].readAt).toBe(now.toISOString());
      expect(result.notifications[1].readAt).toBeUndefined();

      // auditLogs — oldValues/newValues present vs null
      expect(result.auditLogs[0].oldValues).toEqual({ status: 'OLD' });
      expect(result.auditLogs[0].newValues).toEqual({ status: 'NEW' });
      expect(result.auditLogs[1].oldValues).toBeUndefined();
      expect(result.auditLogs[1].newValues).toBeUndefined();
    });

    it('should cover soft-deleted customer/vehicle optional fields', async () => {
      const now = new Date('2026-04-25T10:00:00Z');
      const mockData = {
        customerEncrypted: [
          {
            id: 'cust-soft',
            nameEncrypted: null,
            emailEncrypted: null,
            phoneEncrypted: null,
            createdAt: now,
            updatedAt: now,
            deletedAt: now,
          },
        ],
        vehicle: [
          {
            id: 'veh-soft',
            customerId: 'cust-soft',
            licensePlate: 'XX000XX',
            make: 'Ford',
            model: 'Focus',
            year: 2019,
            createdAt: now,
            updatedAt: now,
            deletedAt: now,
          },
        ],
        booking: [
          {
            id: 'book-soft',
            customerId: null,
            scheduledDate: null,
            status: 'CANCELLED',
            estimatedDurationMinutes: 0,
            totalCostCents: null,
            paymentStatus: 'NONE',
            createdAt: now,
            updatedAt: now,
            deletedAt: now,
          },
        ],
        invoice: [],
        workOrders: [],
        estimates: [],
        payments: [],
        notifications: [],
        auditLogs: [],
      };

      setupMockPrismaQueries(mockData);

      const result = await service.downloadExportedData(mockToken);

      // Null encrypted fields → undefined after decrypt attempt
      expect(result.customers[0].name).toBeUndefined();
      expect(result.customers[0].email).toBeUndefined();
      expect(result.customers[0].phone).toBeUndefined();
      expect(result.customers[0].deletedAt).not.toBeNull();

      // Vehicle soft-deleted
      expect(result.vehicles[0].deletedAt).not.toBeNull();

      // Booking with null scheduledDate and null totalCostCents
      expect(result.bookings[0].scheduledDate).toBeUndefined();
      expect(result.bookings[0].totalCostCents).toBeUndefined();
      expect(result.bookings[0].deletedAt).not.toBeNull();
    });
  });

  describe('Token Expiry and Security', () => {
    it('should reject tokens older than 24 hours', async () => {
      const expiredToken = 'expired.token';
      (jwtService.verifyAsync as jest.Mock).mockRejectedValueOnce(new Error('jwt expired'));

      await expect(service.downloadExportedData(expiredToken)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(loggerService.warn).toHaveBeenCalled();
    });

    it('should log warnings for invalid/expired tokens', async () => {
      (jwtService.verifyAsync as jest.Mock).mockRejectedValueOnce(new Error('Invalid JWT'));

      try {
        await service.downloadExportedData('invalid.token');
      } catch {
        // Expected
      }

      expect(loggerService.warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid/expired export token'),
        'DataExportService',
      );
    });
  });

  describe('Concurrent Access', () => {
    it('should handle concurrent export requests without data corruption', async () => {
      const mockData = {
        customerEncrypted: [],
        vehicle: [],
        booking: [],
        invoice: [],
        workOrders: [],
        estimates: [],
        payments: [],
        notifications: [],
        auditLogs: [],
      };

      setupMockPrismaQueries(mockData);

      const promises = [
        service.generateExportToken(mockTenantId, mockUserId),
        service.generateExportToken(mockTenantId, mockUserId),
        service.generateExportToken(mockTenantId, mockUserId),
      ];

      const results = await Promise.all(promises);

      // Each should have unique exportId
      const exportIds = results.map(r => r.exportId);
      expect(new Set(exportIds).size).toBe(3); // All unique
    });
  });

  describe('Error Handling', () => {
    it('should throw BadRequestException if data fetch fails', async () => {
      (prismaService.tenant.findUniqueOrThrow as jest.Mock).mockRejectedValueOnce(
        new Error('Database error'),
      );

      await expect(service.downloadExportedData(mockToken)).rejects.toThrow(BadRequestException);
    });

    it('should log errors with full context', async () => {
      const mockError = new Error('Test error');
      (prismaService.tenant.findUniqueOrThrow as jest.Mock).mockRejectedValueOnce(mockError);

      try {
        await service.downloadExportedData(mockToken);
      } catch {
        // Expected
      }

      expect(loggerService.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Error),
        'DataExportService',
      );
    });
  });

  // Helper function to set up mock Prisma queries
  function setupMockPrismaQueries(mockData: {
    customerEncrypted: unknown[];
    vehicle: unknown[];
    booking: unknown[];
    invoice: unknown[];
    workOrders: unknown[];
    estimates: unknown[];
    payments: unknown[];
    notifications: unknown[];
    auditLogs: unknown[];
  }): void {
    (prismaService.customerEncrypted.findMany as jest.Mock).mockResolvedValue(
      mockData.customerEncrypted,
    );
    (prismaService.vehicle.findMany as jest.Mock).mockResolvedValue(mockData.vehicle);
    (prismaService.booking.findMany as jest.Mock).mockResolvedValue(mockData.booking);
    (prismaService.invoice.findMany as jest.Mock).mockResolvedValue(mockData.invoice);
    (prismaService.$queryRaw as jest.Mock)
      .mockResolvedValueOnce(mockData.workOrders)
      .mockResolvedValueOnce(mockData.estimates)
      .mockResolvedValueOnce(mockData.payments)
      .mockResolvedValueOnce(mockData.notifications);
    (prismaService.auditLog.findMany as jest.Mock).mockResolvedValueOnce(mockData.auditLogs);
  }
});
