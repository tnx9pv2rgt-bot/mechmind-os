import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GdprExportService } from './gdpr-export.service';
import { PrismaService } from '@common/services/prisma.service';
import { EncryptionService } from '@common/services/encryption.service';
import { LoggerService } from '@common/services/logger.service';

describe('GdprExportService', () => {
  let service: GdprExportService;
  let prisma: {
    withTenant: jest.Mock;
    customerEncrypted: { findFirst: jest.Mock };
    consentAuditLog: { findMany: jest.Mock };
    callRecording: { findMany: jest.Mock };
    auditLog: { create: jest.Mock };
    dataSubjectRequest: { update: jest.Mock };
  };
  let encryption: { decrypt: jest.Mock };

  const TENANT_ID = 'tenant-001';
  const CUSTOMER_ID = 'customer-001';

  const mockCustomer = {
    id: CUSTOMER_ID,
    tenantId: TENANT_ID,
    createdAt: new Date('2024-01-01'),
    gdprConsent: true,
    gdprConsentDate: new Date('2024-01-01'),
    marketingConsent: false,
    phoneEncrypted: 'enc-phone',
    emailEncrypted: 'enc-email',
    nameEncrypted: 'enc-name',
    vehicles: [
      {
        id: 'vehicle-001',
        licensePlate: 'AB123CD',
        make: 'Toyota',
        model: 'Corolla',
        year: 2020,
      },
    ],
    bookings: [
      {
        id: 'booking-001',
        createdAt: new Date('2024-06-01'),
        scheduledDate: new Date('2024-06-10'),
        status: 'COMPLETED',
        estimatedDurationMinutes: 60,
        totalCostCents: BigInt(5000),
        paymentStatus: 'PAID',
        Invoice: [
          {
            id: 'inv-001',
            createdAt: new Date('2024-06-10'),
            totalCents: BigInt(5000),
            taxCents: BigInt(1000),
            status: 'PAID',
            paymentDate: new Date('2024-06-10'),
          },
        ],
      },
    ],
  };

  const mockConsentHistory = [
    {
      id: 'consent-001',
      consentType: 'DATA_PROCESSING',
      granted: true,
      timestamp: new Date('2024-01-01'),
      ipSource: '192.168.1.1',
      collectionMethod: 'WEB_FORM',
      customerId: CUSTOMER_ID,
      tenantId: TENANT_ID,
    },
  ];

  const mockCallRecordings = [
    {
      id: 'rec-001',
      recordedAt: new Date('2024-05-01'),
      durationSeconds: 300,
      direction: 'INBOUND',
      customerId: CUSTOMER_ID,
      tenantId: TENANT_ID,
    },
  ];

  beforeEach(async () => {
    prisma = {
      withTenant: jest.fn((_tenantId, cb) => cb(prisma)),
      customerEncrypted: {
        findFirst: jest.fn().mockResolvedValue(mockCustomer),
      },
      consentAuditLog: {
        findMany: jest.fn().mockResolvedValue(mockConsentHistory),
      },
      callRecording: {
        findMany: jest.fn().mockResolvedValue(mockCallRecordings),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({}),
      },
      dataSubjectRequest: {
        update: jest.fn().mockResolvedValue({}),
      },
    } as unknown as typeof prisma;

    encryption = {
      decrypt: jest.fn((val: string) => `decrypted-${val}`),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GdprExportService,
        { provide: PrismaService, useValue: prisma },
        { provide: EncryptionService, useValue: encryption },
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

    service = module.get<GdprExportService>(GdprExportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =========================================================================
  // exportCustomerData
  // =========================================================================
  describe('exportCustomerData', () => {
    it('should export complete customer data', async () => {
      const result = await service.exportCustomerData(CUSTOMER_ID, TENANT_ID);

      expect(result.customerId).toBe(CUSTOMER_ID);
      expect(result.tenantId).toBe(TENANT_ID);
      expect(result.format).toBe('JSON');
      expect(result.exportId).toContain('export-');
    });

    it('should decrypt PII fields', async () => {
      const result = await service.exportCustomerData(CUSTOMER_ID, TENANT_ID);

      expect(result.personalData.phone).toBe('decrypted-enc-phone');
      expect(result.personalData.email).toBe('decrypted-enc-email');
      expect(result.personalData.name).toBe('decrypted-enc-name');
      expect(encryption.decrypt).toHaveBeenCalledTimes(3);
    });

    it('should include vehicles', async () => {
      const result = await service.exportCustomerData(CUSTOMER_ID, TENANT_ID);

      expect(result.vehicles).toHaveLength(1);
      expect(result.vehicles[0].licensePlate).toBe('AB123CD');
      expect(result.vehicles[0].make).toBe('Toyota');
    });

    it('should include bookings', async () => {
      const result = await service.exportCustomerData(CUSTOMER_ID, TENANT_ID);

      expect(result.bookings).toHaveLength(1);
      expect(result.bookings[0].status).toBe('COMPLETED');
    });

    it('should include invoices from bookings', async () => {
      const result = await service.exportCustomerData(CUSTOMER_ID, TENANT_ID);

      expect(result.invoices).toHaveLength(1);
      expect(result.invoices[0].id).toBe('inv-001');
    });

    it('should include consent history', async () => {
      const result = await service.exportCustomerData(CUSTOMER_ID, TENANT_ID);

      expect(result.consentHistory).toHaveLength(1);
      expect(result.consentHistory[0].type).toBe('DATA_PROCESSING');
      expect(result.consentHistory[0].granted).toBe(true);
    });

    it('should include call recordings', async () => {
      const result = await service.exportCustomerData(CUSTOMER_ID, TENANT_ID);

      expect(result.callRecordings).toHaveLength(1);
      expect(result.callRecordings[0].durationSeconds).toBe(300);
    });

    it('should include metadata with total records and checksum', async () => {
      const result = await service.exportCustomerData(CUSTOMER_ID, TENANT_ID);

      // 1 customer + 1 vehicle + 1 booking + 1 consent + 1 recording = 5
      expect(result.metadata.totalRecords).toBe(5);
      expect(result.metadata.generatedBy).toBe('MechMind OS GDPR Export Service');
      expect(result.metadata.checksum).toBeDefined();
      expect(result.metadata.expiresAt).toBeInstanceOf(Date);
    });

    it('should throw NotFoundException when customer not found', async () => {
      (prisma.customerEncrypted.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.exportCustomerData(CUSTOMER_ID, TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should create audit log entry', async () => {
      await service.exportCustomerData(CUSTOMER_ID, TENANT_ID);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          action: 'DATA_EXPORT_CREATED',
          tableName: 'customers_encrypted',
          recordId: CUSTOMER_ID,
        }),
      });
    });

    it('should update request status when requestId provided', async () => {
      await service.exportCustomerData(CUSTOMER_ID, TENANT_ID, 'JSON', 'req-001');

      expect(prisma.dataSubjectRequest.update).toHaveBeenCalledWith({
        where: { id: 'req-001' },
        data: expect.objectContaining({
          status: 'COMPLETED',
          exportFormat: 'JSON',
        }),
      });
    });

    it('should not update request when requestId not provided', async () => {
      await service.exportCustomerData(CUSTOMER_ID, TENANT_ID);

      expect(prisma.dataSubjectRequest.update).not.toHaveBeenCalled();
    });

    it('should handle missing encrypted fields', async () => {
      (prisma.customerEncrypted.findFirst as jest.Mock).mockResolvedValue({
        ...mockCustomer,
        phoneEncrypted: null,
        emailEncrypted: null,
        nameEncrypted: null,
      });

      const result = await service.exportCustomerData(CUSTOMER_ID, TENANT_ID);

      expect(result.personalData.phone).toBeUndefined();
      expect(result.personalData.email).toBeUndefined();
      expect(result.personalData.name).toBeUndefined();
    });
  });

  // =========================================================================
  // exportPortableData
  // =========================================================================
  describe('exportPortableData', () => {
    it('should return structured portable data', async () => {
      const result = await service.exportPortableData(CUSTOMER_ID, TENANT_ID);

      expect(result.schemaVersion).toBe('1.0');
      expect(result.dataController.name).toBe('MechMind Technologies S.r.l.');
      expect(result.customer.id).toBe(CUSTOMER_ID);
    });

    it('should decrypt PII in portable format', async () => {
      const result = await service.exportPortableData(CUSTOMER_ID, TENANT_ID);

      expect(result.customer.personalData.phone).toBe('decrypted-enc-phone');
      expect(result.customer.personalData.email).toBe('decrypted-enc-email');
    });

    it('should include vehicles and bookings', async () => {
      const result = await service.exportPortableData(CUSTOMER_ID, TENANT_ID);

      expect(result.customer.vehicles).toHaveLength(1);
      expect(result.customer.bookings).toHaveLength(1);
    });

    it('should throw NotFoundException when customer not found', async () => {
      (prisma.customerEncrypted.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.exportPortableData(CUSTOMER_ID, TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // =========================================================================
  // generateExport
  // =========================================================================
  describe('generateExport', () => {
    it('should generate JSON export with download URL', async () => {
      const result = await service.generateExport(CUSTOMER_ID, TENANT_ID, 'JSON');

      expect(result.status).toBe('COMPLETED');
      expect(result.format).toBe('JSON');
      expect(result.downloadUrl).toContain('/gdpr/exports/');
      expect(result.fileSize).toBeGreaterThan(0);
      expect(result.checksum).toBeDefined();
    });

    it('should generate CSV export', async () => {
      const result = await service.generateExport(CUSTOMER_ID, TENANT_ID, 'CSV');

      expect(result.status).toBe('COMPLETED');
      expect(result.format).toBe('CSV');
    });

    it('should return FAILED for PDF format (not implemented)', async () => {
      const result = await service.generateExport(CUSTOMER_ID, TENANT_ID, 'PDF');

      expect(result.status).toBe('FAILED');
      expect(result.error).toContain('PDF');
    });

    it('should return FAILED when customer not found', async () => {
      (prisma.customerEncrypted.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.generateExport(CUSTOMER_ID, TENANT_ID, 'JSON');

      expect(result.status).toBe('FAILED');
    });
  });

  // =========================================================================
  // getExportStatus
  // =========================================================================
  describe('getExportStatus', () => {
    it('should return null (placeholder implementation)', async () => {
      const result = await service.getExportStatus('export-123');

      expect(result).toBeNull();
    });
  });
});
