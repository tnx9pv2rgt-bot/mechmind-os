import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GdprExportService, ExportFormat, CustomerDataExport, DataPortabilityExport, ExportJobResult } from '../services/gdpr-export.service';
import { PrismaService } from '@common/services/prisma.service';
import { EncryptionService } from '@common/services/encryption.service';
import { LoggerService } from '@common/services/logger.service';

describe('GdprExportService', () => {
  let service: GdprExportService;
  let mockPrismaService: jest.Mocked<Partial<PrismaService>>;
  let mockEncryptionService: jest.Mocked<Partial<EncryptionService>>;
  let mockLoggerService: jest.Mocked<Partial<LoggerService>>;

  const mockTenantId = 'tenant-123';
  const mockCustomerId = 'customer-456';
  const mockRequestId = 'request-789';

  beforeEach(async () => {
    mockPrismaService = {
      withTenant: jest.fn(),
    };

    mockEncryptionService = {
      encrypt: jest.fn((data: string) => Buffer.from(`encrypted_${data}`)),
      decrypt: jest.fn((data: Buffer) => `decrypted_${data.toString()}`),
    };

    mockLoggerService = {
      log: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GdprExportService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: EncryptionService,
          useValue: mockEncryptionService,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    service = module.get<GdprExportService>(GdprExportService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('exportCustomerData', () => {
    it('should export customer data in JSON format', async () => {
      // Arrange
      const mockCustomer = {
        id: mockCustomerId,
        tenantId: mockTenantId,
        createdAt: new Date('2024-01-01'),
        gdprConsent: true,
        gdprConsentDate: new Date('2024-01-01'),
        marketingConsent: false,
        phoneEncrypted: Buffer.from('encrypted_phone'),
        emailEncrypted: Buffer.from('encrypted_email'),
        nameEncrypted: Buffer.from('encrypted_name'),
        vehicles: [
          { id: 'vehicle-1', licensePlate: 'ABC123', make: 'Toyota', model: 'Camry', year: 2020, lastServiceDate: new Date(), nextServiceDueKm: 50000 },
        ],
        bookings: [
          { 
            id: 'booking-1', 
            createdAt: new Date(), 
            scheduledDate: new Date(), 
            status: 'COMPLETED', 
            estimatedDurationMinutes: 60,
            totalCostCents: BigInt(50000),
            paymentStatus: 'PAID',
            invoices: [
              { id: 'invoice-1', createdAt: new Date(), totalCents: BigInt(50000), taxCents: BigInt(10000), status: 'PAID', paymentDate: new Date() },
            ],
          },
        ],
      };

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(mockCustomer),
            },
            consentAuditLog: {
              findMany: jest.fn().mockResolvedValue([]),
            },
            callRecordings: {
              findMany: jest.fn().mockResolvedValue([]),
            },
            auditLog: {
              create: jest.fn().mockResolvedValue({}),
            },
            dataSubjectRequests: {
              update: jest.fn().mockResolvedValue({}),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.exportCustomerData(mockCustomerId, mockTenantId, 'JSON', mockRequestId);

      // Assert
      expect(result).toMatchObject<Partial<CustomerDataExport>>({
        format: 'JSON',
        customerId: mockCustomerId,
        tenantId: mockTenantId,
        personalData: expect.objectContaining({
          id: mockCustomerId,
          gdprConsent: true,
          marketingConsent: false,
          phone: expect.any(String),
          email: expect.any(String),
          name: expect.any(String),
        }),
        vehicles: expect.arrayContaining([
          expect.objectContaining({
            id: 'vehicle-1',
            licensePlate: 'ABC123',
            make: 'Toyota',
            model: 'Camry',
          }),
        ]),
        bookings: expect.arrayContaining([
          expect.objectContaining({
            id: 'booking-1',
            status: 'COMPLETED',
            paymentStatus: 'PAID',
          }),
        ]),
        invoices: expect.arrayContaining([
          expect.objectContaining({
            id: 'invoice-1',
            totalCents: expect.any(BigInt),
            status: 'PAID',
          }),
        ]),
      });
      expect(result.metadata.totalRecords).toBeGreaterThan(0);
      expect(result.metadata.generatedBy).toBe('MechMind OS GDPR Export Service');
    });

    it('should export customer data in CSV format', async () => {
      // Arrange
      const mockCustomer = {
        id: mockCustomerId,
        tenantId: mockTenantId,
        createdAt: new Date('2024-01-01'),
        gdprConsent: true,
        gdprConsentDate: new Date('2024-01-01'),
        marketingConsent: false,
        phoneEncrypted: Buffer.from('encrypted_phone'),
        emailEncrypted: Buffer.from('encrypted_email'),
        nameEncrypted: Buffer.from('encrypted_name'),
        vehicles: [
          { id: 'vehicle-1', licensePlate: 'ABC123', make: 'Toyota', model: 'Camry', year: 2020 },
        ],
        bookings: [
          { id: 'booking-1', createdAt: new Date(), scheduledDate: new Date(), status: 'COMPLETED', estimatedDurationMinutes: 60, totalCostCents: BigInt(50000), paymentStatus: 'PAID', invoices: [] },
        ],
      };

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(mockCustomer),
            },
            consentAuditLog: {
              findMany: jest.fn().mockResolvedValue([]),
            },
            callRecordings: {
              findMany: jest.fn().mockResolvedValue([]),
            },
            auditLog: {
              create: jest.fn().mockResolvedValue({}),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.exportCustomerData(mockCustomerId, mockTenantId, 'CSV');

      // Assert
      expect(result.format).toBe('CSV');
    });

    it('should throw NotFoundException if customer not found', async () => {
      // Arrange
      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(null),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act & Assert
      await expect(
        service.exportCustomerData(mockCustomerId, mockTenantId, 'JSON'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle customer without optional email and name', async () => {
      // Arrange
      const mockCustomer = {
        id: mockCustomerId,
        tenantId: mockTenantId,
        createdAt: new Date('2024-01-01'),
        gdprConsent: true,
        gdprConsentDate: new Date('2024-01-01'),
        marketingConsent: false,
        phoneEncrypted: Buffer.from('encrypted_phone'),
        emailEncrypted: null,
        nameEncrypted: null,
        vehicles: [],
        bookings: [],
      };

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(mockCustomer),
            },
            consentAuditLog: {
              findMany: jest.fn().mockResolvedValue([]),
            },
            callRecordings: {
              findMany: jest.fn().mockResolvedValue([]),
            },
            auditLog: {
              create: jest.fn().mockResolvedValue({}),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.exportCustomerData(mockCustomerId, mockTenantId, 'JSON');

      // Assert
      expect(result.personalData.email).toBeUndefined();
      expect(result.personalData.name).toBeUndefined();
      expect(result.personalData.phone).toBeDefined();
    });

    it('should include consent history in export', async () => {
      // Arrange
      const mockCustomer = {
        id: mockCustomerId,
        tenantId: mockTenantId,
        createdAt: new Date(),
        gdprConsent: true,
        gdprConsentDate: new Date(),
        marketingConsent: false,
        phoneEncrypted: Buffer.from('encrypted_phone'),
        emailEncrypted: null,
        nameEncrypted: null,
        vehicles: [],
        bookings: [],
      };

      const mockConsentHistory = [
        { consentType: 'GDPR', granted: true, timestamp: new Date(), ipSource: '192.168.1.1', collectionMethod: 'WEB_FORM' },
        { consentType: 'MARKETING', granted: false, timestamp: new Date(), ipSource: null, collectionMethod: null },
      ];

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(mockCustomer),
            },
            consentAuditLog: {
              findMany: jest.fn().mockResolvedValue(mockConsentHistory),
            },
            callRecordings: {
              findMany: jest.fn().mockResolvedValue([]),
            },
            auditLog: {
              create: jest.fn().mockResolvedValue({}),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.exportCustomerData(mockCustomerId, mockTenantId, 'JSON');

      // Assert
      expect(result.consentHistory).toHaveLength(2);
      expect(result.consentHistory[0]).toMatchObject({
        type: 'GDPR',
        granted: true,
        ipSource: '192.168.1.1',
        method: 'WEB_FORM',
      });
      expect(result.consentHistory[1].ipSource).toBeUndefined();
      expect(result.consentHistory[1].method).toBeUndefined();
    });

    it('should include call recordings in export', async () => {
      // Arrange
      const mockCustomer = {
        id: mockCustomerId,
        tenantId: mockTenantId,
        createdAt: new Date(),
        gdprConsent: true,
        gdprConsentDate: new Date(),
        marketingConsent: false,
        phoneEncrypted: Buffer.from('encrypted_phone'),
        emailEncrypted: null,
        nameEncrypted: null,
        vehicles: [],
        bookings: [],
      };

      const mockRecordings = [
        { id: 'rec-1', recordedAt: new Date(), durationSeconds: 120, direction: 'INBOUND' },
        { id: 'rec-2', recordedAt: new Date(), durationSeconds: 60, direction: 'OUTBOUND' },
      ];

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(mockCustomer),
            },
            consentAuditLog: {
              findMany: jest.fn().mockResolvedValue([]),
            },
            callRecordings: {
              findMany: jest.fn().mockResolvedValue(mockRecordings),
            },
            auditLog: {
              create: jest.fn().mockResolvedValue({}),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.exportCustomerData(mockCustomerId, mockTenantId, 'JSON');

      // Assert
      expect(result.callRecordings).toHaveLength(2);
      expect(result.callRecordings[0]).toMatchObject({
        id: 'rec-1',
        durationSeconds: 120,
        direction: 'INBOUND',
      });
    });

    it('should update request status when requestId is provided', async () => {
      // Arrange
      const mockCustomer = {
        id: mockCustomerId,
        tenantId: mockTenantId,
        createdAt: new Date(),
        gdprConsent: true,
        gdprConsentDate: new Date(),
        marketingConsent: false,
        phoneEncrypted: Buffer.from('encrypted_phone'),
        emailEncrypted: null,
        nameEncrypted: null,
        vehicles: [],
        bookings: [],
      };

      const updateMock = jest.fn().mockResolvedValue({});

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(mockCustomer),
            },
            consentAuditLog: {
              findMany: jest.fn().mockResolvedValue([]),
            },
            callRecordings: {
              findMany: jest.fn().mockResolvedValue([]),
            },
            auditLog: {
              create: jest.fn().mockResolvedValue({}),
            },
            dataSubjectRequests: {
              update: updateMock,
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      await service.exportCustomerData(mockCustomerId, mockTenantId, 'JSON', mockRequestId);

      // Assert
      expect(updateMock).toHaveBeenCalledWith({
        where: { id: mockRequestId },
        data: {
          exportFormat: 'JSON',
          status: 'COMPLETED',
          completedAt: expect.any(Date),
        },
      });
    });

    it('should create audit log entry for export', async () => {
      // Arrange
      const mockCustomer = {
        id: mockCustomerId,
        tenantId: mockTenantId,
        createdAt: new Date(),
        gdprConsent: true,
        gdprConsentDate: new Date(),
        marketingConsent: false,
        phoneEncrypted: Buffer.from('encrypted_phone'),
        emailEncrypted: null,
        nameEncrypted: null,
        vehicles: [],
        bookings: [],
      };

      const auditLogCreate = jest.fn().mockResolvedValue({});

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(mockCustomer),
            },
            consentAuditLog: {
              findMany: jest.fn().mockResolvedValue([]),
            },
            callRecordings: {
              findMany: jest.fn().mockResolvedValue([]),
            },
            auditLog: {
              create: auditLogCreate,
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      await service.exportCustomerData(mockCustomerId, mockTenantId, 'JSON');

      // Assert
      expect(auditLogCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: mockTenantId,
          action: 'DATA_EXPORT_CREATED',
          tableName: 'customers_encrypted',
          recordId: mockCustomerId,
          newValues: expect.objectContaining({
            format: 'JSON',
            recordCount: expect.any(Number),
          }),
        }),
      });
    });

    it('should set export expiry to 7 days from creation', async () => {
      // Arrange
      const mockCustomer = {
        id: mockCustomerId,
        tenantId: mockTenantId,
        createdAt: new Date(),
        gdprConsent: true,
        gdprConsentDate: new Date(),
        marketingConsent: false,
        phoneEncrypted: Buffer.from('encrypted_phone'),
        emailEncrypted: null,
        nameEncrypted: null,
        vehicles: [],
        bookings: [],
      };

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(mockCustomer),
            },
            consentAuditLog: {
              findMany: jest.fn().mockResolvedValue([]),
            },
            callRecordings: {
              findMany: jest.fn().mockResolvedValue([]),
            },
            auditLog: {
              create: jest.fn().mockResolvedValue({}),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.exportCustomerData(mockCustomerId, mockTenantId, 'JSON');

      // Assert
      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
      const expiryDiff = result.metadata.expiresAt.getTime() - result.exportDate.getTime();
      expect(expiryDiff).toBeGreaterThanOrEqual(sevenDaysInMs - 1000);
      expect(expiryDiff).toBeLessThanOrEqual(sevenDaysInMs + 1000);
    });
  });

  describe('exportPortableData', () => {
    it('should create machine-readable data portability export', async () => {
      // Arrange
      const mockCustomer = {
        id: mockCustomerId,
        tenantId: mockTenantId,
        phoneEncrypted: Buffer.from('encrypted_phone'),
        emailEncrypted: Buffer.from('encrypted_email'),
        nameEncrypted: Buffer.from('encrypted_name'),
        gdprConsent: true,
        gdprConsentDate: new Date('2024-01-01'),
        marketingConsent: false,
        createdAt: new Date('2024-01-01'),
        vehicles: [
          { id: 'vehicle-1', licensePlate: 'ABC123', make: 'Toyota', model: 'Camry', year: 2020 },
        ],
        bookings: [
          { id: 'booking-1', scheduledDate: new Date(), status: 'COMPLETED', estimatedDurationMinutes: 60, totalCostCents: BigInt(50000), paymentStatus: 'PAID' },
        ],
      };

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(mockCustomer),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.exportPortableData(mockCustomerId, mockTenantId);

      // Assert
      expect(result).toMatchObject<Partial<DataPortabilityExport>>({
        schemaVersion: '1.0',
        dataController: {
          name: 'MechMind Technologies S.r.l.',
          contact: 'dpo@mechmind.io',
        },
        customer: expect.objectContaining({
          id: mockCustomerId,
          personalData: expect.any(Object),
          vehicles: expect.any(Array),
          bookings: expect.any(Array),
          services: expect.any(Array),
        }),
      });
      expect(new Date(result.exportDate)).toBeInstanceOf(Date);
    });

    it('should throw NotFoundException if customer not found for portability', async () => {
      // Arrange
      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(null),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act & Assert
      await expect(
        service.exportPortableData(mockCustomerId, mockTenantId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('generateExport', () => {
    it('should generate JSON export with download URL', async () => {
      // Arrange
      const mockCustomer = {
        id: mockCustomerId,
        tenantId: mockTenantId,
        createdAt: new Date(),
        gdprConsent: true,
        gdprConsentDate: new Date(),
        marketingConsent: false,
        phoneEncrypted: Buffer.from('encrypted_phone'),
        emailEncrypted: null,
        nameEncrypted: null,
        vehicles: [],
        bookings: [],
      };

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(mockCustomer),
            },
            consentAuditLog: {
              findMany: jest.fn().mockResolvedValue([]),
            },
            callRecordings: {
              findMany: jest.fn().mockResolvedValue([]),
            },
            auditLog: {
              create: jest.fn().mockResolvedValue({}),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.generateExport(mockCustomerId, mockTenantId, 'JSON');

      // Assert
      expect(result).toMatchObject<Partial<ExportJobResult>>({
        status: 'COMPLETED',
        format: 'JSON',
        downloadUrl: expect.stringContaining('/gdpr/exports/'),
        fileSize: expect.any(Number),
        checksum: expect.any(String),
      });
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should generate CSV export', async () => {
      // Arrange
      const mockCustomer = {
        id: mockCustomerId,
        tenantId: mockTenantId,
        createdAt: new Date(),
        gdprConsent: true,
        gdprConsentDate: new Date(),
        marketingConsent: false,
        phoneEncrypted: Buffer.from('encrypted_phone'),
        emailEncrypted: Buffer.from('encrypted_email'),
        nameEncrypted: Buffer.from('encrypted_name'),
        vehicles: [
          { id: 'vehicle-1', licensePlate: 'ABC123', make: 'Toyota', model: 'Camry' },
        ],
        bookings: [
          { id: 'booking-1', createdAt: new Date(), scheduledDate: new Date(), status: 'COMPLETED', estimatedDurationMinutes: 60, totalCostCents: BigInt(50000), paymentStatus: 'PAID', invoices: [] },
        ],
      };

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(mockCustomer),
            },
            consentAuditLog: {
              findMany: jest.fn().mockResolvedValue([]),
            },
            callRecordings: {
              findMany: jest.fn().mockResolvedValue([]),
            },
            auditLog: {
              create: jest.fn().mockResolvedValue({}),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.generateExport(mockCustomerId, mockTenantId, 'CSV');

      // Assert
      expect(result.status).toBe('COMPLETED');
      expect(result.format).toBe('CSV');
      expect(result.fileSize).toBeGreaterThan(0);
    });

    it('should return FAILED status for PDF format (not implemented)', async () => {
      // Arrange
      const mockCustomer = {
        id: mockCustomerId,
        tenantId: mockTenantId,
        createdAt: new Date(),
        gdprConsent: true,
        gdprConsentDate: new Date(),
        marketingConsent: false,
        phoneEncrypted: Buffer.from('encrypted_phone'),
        emailEncrypted: null,
        nameEncrypted: null,
        vehicles: [],
        bookings: [],
      };

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(mockCustomer),
            },
            consentAuditLog: {
              findMany: jest.fn().mockResolvedValue([]),
            },
            callRecordings: {
              findMany: jest.fn().mockResolvedValue([]),
            },
            auditLog: {
              create: jest.fn().mockResolvedValue({}),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.generateExport(mockCustomerId, mockTenantId, 'PDF');

      // Assert
      expect(result.status).toBe('FAILED');
      expect(result.error).toBe('PDF export not yet implemented');
    });

    it('should return FAILED status for unsupported format', async () => {
      // Arrange
      const mockCustomer = {
        id: mockCustomerId,
        tenantId: mockTenantId,
        createdAt: new Date(),
        gdprConsent: true,
        gdprConsentDate: new Date(),
        marketingConsent: false,
        phoneEncrypted: Buffer.from('encrypted_phone'),
        emailEncrypted: null,
        nameEncrypted: null,
        vehicles: [],
        bookings: [],
      };

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(mockCustomer),
            },
            consentAuditLog: {
              findMany: jest.fn().mockResolvedValue([]),
            },
            callRecordings: {
              findMany: jest.fn().mockResolvedValue([]),
            },
            auditLog: {
              create: jest.fn().mockResolvedValue({}),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.generateExport(mockCustomerId, mockTenantId, 'XML' as ExportFormat);

      // Assert
      expect(result.status).toBe('FAILED');
      expect(result.error).toContain('Unsupported format');
    });
  });

  describe('getExportStatus', () => {
    it('should return null for export status (placeholder)', async () => {
      // Act
      const result = await service.getExportStatus('export-123');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('logging', () => {
    it('should log export start and completion', async () => {
      // Arrange
      const mockCustomer = {
        id: mockCustomerId,
        tenantId: mockTenantId,
        createdAt: new Date(),
        gdprConsent: true,
        gdprConsentDate: new Date(),
        marketingConsent: false,
        phoneEncrypted: Buffer.from('encrypted_phone'),
        emailEncrypted: null,
        nameEncrypted: null,
        vehicles: [],
        bookings: [],
      };

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(mockCustomer),
            },
            consentAuditLog: {
              findMany: jest.fn().mockResolvedValue([]),
            },
            callRecordings: {
              findMany: jest.fn().mockResolvedValue([]),
            },
            auditLog: {
              create: jest.fn().mockResolvedValue({}),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      await service.exportCustomerData(mockCustomerId, mockTenantId, 'JSON');

      // Assert
      expect(mockLoggerService.log).toHaveBeenCalledWith(
        expect.stringContaining('Starting data export'),
        'GdprExportService',
      );
      expect(mockLoggerService.log).toHaveBeenCalledWith(
        expect.stringContaining('Data export'),
        'GdprExportService',
      );
    });
  });
});
