import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { GdprDeletionService, DeletionJobPayload, AnonymizationResult, RecordingDeletionResult } from '../services/gdpr-deletion.service';
import { PrismaService } from '@common/services/prisma.service';
import { EncryptionService } from '@common/services/encryption.service';
import { LoggerService } from '@common/services/logger.service';

describe('GdprDeletionService', () => {
  let service: GdprDeletionService;
  let mockPrismaService: jest.Mocked<Partial<PrismaService>>;
  let mockEncryptionService: jest.Mocked<Partial<EncryptionService>>;
  let mockConfigService: jest.Mocked<Partial<ConfigService>>;
  let mockLoggerService: jest.Mocked<Partial<LoggerService>>;
  let mockQueue: jest.Mocked<Partial<Queue>>;

  const mockTenantId = 'tenant-123';
  const mockCustomerId = 'customer-456';
  const mockRequestId = 'request-789';
  const mockJobId = 'deletion:customer-456';

  beforeEach(async () => {
    // Create mock implementations
    mockPrismaService = {
      withTenant: jest.fn(),
    };

    mockEncryptionService = {
      encrypt: jest.fn((data: string) => `encrypted_${data}`),
      decrypt: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn(),
    };

    mockLoggerService = {
      log: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
    };

    mockQueue = {
      add: jest.fn(),
      getJob: jest.fn(),
      getWaitingCount: jest.fn().mockResolvedValue(0),
      getActiveCount: jest.fn().mockResolvedValue(0),
      getCompletedCount: jest.fn().mockResolvedValue(0),
      getFailedCount: jest.fn().mockResolvedValue(0),
      getDelayedCount: jest.fn().mockResolvedValue(0),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GdprDeletionService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: EncryptionService,
          useValue: mockEncryptionService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
        {
          provide: getQueueToken('gdpr-deletion'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<GdprDeletionService>(GdprDeletionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('queueDeletion', () => {
    it('should successfully queue a deletion job', async () => {
      // Arrange
      const mockCustomer = { id: mockCustomerId, tenantId: mockTenantId };
      const mockJob = { id: mockJobId } as Job;

      mockPrismaService.withTenant = jest.fn()
        .mockImplementationOnce(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(mockCustomer),
            },
          };
          return callback(mockPrisma as any);
        })
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            dataSubjectRequests: {
              update: jest.fn().mockResolvedValue({}),
            },
          };
          return callback(mockPrisma as any);
        });

      mockQueue.getJob = jest.fn().mockResolvedValue(null);
      mockQueue.add = jest.fn().mockResolvedValue(mockJob);

      // Act
      const result = await service.queueDeletion(
        mockCustomerId,
        mockTenantId,
        mockRequestId,
        'Customer request',
      );

      // Assert
      expect(result).toHaveProperty('jobId', mockJobId);
      expect(result).toHaveProperty('status', 'QUEUED');
      expect(result).toHaveProperty('estimatedCompletion');
      expect(result).toHaveProperty('slaDeadline');
      expect(result.slaDeadline.getTime()).toBeGreaterThan(Date.now());
      expect(mockQueue.add).toHaveBeenCalledWith(
        'customer-deletion',
        expect.objectContaining({
          customerId: mockCustomerId,
          tenantId: mockTenantId,
          requestId: mockRequestId,
          reason: 'Customer request',
        }),
        expect.objectContaining({
          jobId: mockJobId,
          priority: 5,
          attempts: 3,
        }),
      );
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
        service.queueDeletion(mockCustomerId, mockTenantId, mockRequestId, 'Test'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if customer already anonymized', async () => {
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
        service.queueDeletion(mockCustomerId, mockTenantId, mockRequestId, 'Test'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if deletion already in progress', async () => {
      // Arrange
      const mockCustomer = { id: mockCustomerId, tenantId: mockTenantId };
      const mockExistingJob = {
        getState: jest.fn().mockResolvedValue('active'),
      } as unknown as Job;

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(mockCustomer),
            },
          };
          return callback(mockPrisma as any);
        });

      mockQueue.getJob = jest.fn().mockResolvedValue(mockExistingJob);

      // Act & Assert
      await expect(
        service.queueDeletion(mockCustomerId, mockTenantId, mockRequestId, 'Test'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should support custom priority in options', async () => {
      // Arrange
      const mockCustomer = { id: mockCustomerId, tenantId: mockTenantId };
      const mockJob = { id: mockJobId } as Job;

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(mockCustomer),
            },
            dataSubjectRequests: {
              update: jest.fn().mockResolvedValue({}),
            },
          };
          return callback(mockPrisma as any);
        });

      mockQueue.getJob = jest.fn().mockResolvedValue(null);
      mockQueue.add = jest.fn().mockResolvedValue(mockJob);

      // Act
      await service.queueDeletion(
        mockCustomerId,
        mockTenantId,
        mockRequestId,
        'Urgent request',
        { priority: 1, verifiedBy: 'admin@example.com' },
      );

      // Assert
      expect(mockQueue.add).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          priority: 1,
        }),
      );
    });

    it('should set SLA deadline to 24 hours from now', async () => {
      // Arrange
      const mockCustomer = { id: mockCustomerId, tenantId: mockTenantId };
      const mockJob = { id: mockJobId } as Job;
      const beforeCall = Date.now();

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(mockCustomer),
            },
            dataSubjectRequests: {
              update: jest.fn().mockResolvedValue({}),
            },
          };
          return callback(mockPrisma as any);
        });

      mockQueue.getJob = jest.fn().mockResolvedValue(null);
      mockQueue.add = jest.fn().mockResolvedValue(mockJob);

      // Act
      const result = await service.queueDeletion(
        mockCustomerId,
        mockTenantId,
        mockRequestId,
        'Test',
      );

      // Assert
      const afterCall = Date.now();
      const expectedSlaDeadline = 24 * 60 * 60 * 1000; // 24 hours in ms
      expect(result.slaDeadline.getTime() - beforeCall).toBeGreaterThanOrEqual(expectedSlaDeadline - 1000);
      expect(result.slaDeadline.getTime() - afterCall).toBeLessThanOrEqual(expectedSlaDeadline + 1000);
    });

    it('should update request status to IN_PROGRESS', async () => {
      // Arrange
      const mockCustomer = { id: mockCustomerId, tenantId: mockTenantId };
      const mockJob = { id: mockJobId } as Job;
      const updateMock = jest.fn().mockResolvedValue({});

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(mockCustomer),
            },
            dataSubjectRequests: {
              update: updateMock,
            },
          };
          return callback(mockPrisma as any);
        });

      mockQueue.getJob = jest.fn().mockResolvedValue(null);
      mockQueue.add = jest.fn().mockResolvedValue(mockJob);

      // Act
      await service.queueDeletion(
        mockCustomerId,
        mockTenantId,
        mockRequestId,
        'Test',
      );

      // Assert
      expect(updateMock).toHaveBeenCalledWith({
        where: { id: mockRequestId },
        data: {
          status: 'IN_PROGRESS',
          updatedAt: expect.any(Date),
        },
      });
    });
  });

  describe('verifyIdentity', () => {
    it('should return HIGH confidence with multiple verification methods', async () => {
      // Arrange
      const mockCustomer = {
        id: mockCustomerId,
        tenantId: mockTenantId,
        bookings: [{ id: 'booking-1' }],
      };

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(mockCustomer),
            },
            auditLog: {
              create: jest.fn().mockResolvedValue({}),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.verifyIdentity(mockCustomerId, mockTenantId, {
        method: 'MULTI_FACTOR',
        phoneVerified: true,
        emailVerified: true,
        bookingReference: 'booking-1',
      });

      // Assert
      expect(result.verified).toBe(true);
      expect(result.confidence).toBe('HIGH');
      expect(result.verificationMethod).toContain('PHONE');
      expect(result.verificationMethod).toContain('EMAIL');
      expect(result.verificationMethod).toContain('BOOKING_REFERENCE');
    });

    it('should return MEDIUM confidence with phone and email', async () => {
      // Arrange
      const mockCustomer = {
        id: mockCustomerId,
        tenantId: mockTenantId,
        bookings: [],
      };

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(mockCustomer),
            },
            auditLog: {
              create: jest.fn().mockResolvedValue({}),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.verifyIdentity(mockCustomerId, mockTenantId, {
        method: 'PHONE_EMAIL',
        phoneVerified: true,
        emailVerified: true,
      });

      // Assert
      expect(result.verified).toBe(true);
      expect(result.confidence).toBe('MEDIUM'); // 40 + 30 = 70, which is MEDIUM (>=50, <80)
    });

    it('should return LOW confidence with single verification method', async () => {
      // Arrange
      const mockCustomer = {
        id: mockCustomerId,
        tenantId: mockTenantId,
        bookings: [],
      };

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(mockCustomer),
            },
            auditLog: {
              create: jest.fn().mockResolvedValue({}),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.verifyIdentity(mockCustomerId, mockTenantId, {
        method: 'DOCUMENTS',
        documents: ['id_card.pdf'],
      });

      // Assert
      expect(result.verified).toBe(false); // 20 < 50 threshold
      expect(result.confidence).toBe('LOW');
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
        service.verifyIdentity(mockCustomerId, mockTenantId, { method: 'PHONE' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should not add booking reference score if no match', async () => {
      // Arrange
      const mockCustomer = {
        id: mockCustomerId,
        tenantId: mockTenantId,
        bookings: [{ id: 'booking-1' }],
      };

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(mockCustomer),
            },
            auditLog: {
              create: jest.fn().mockResolvedValue({}),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.verifyIdentity(mockCustomerId, mockTenantId, {
        method: 'PHONE_BOOKING',
        phoneVerified: true,
        bookingReference: 'wrong-booking-id',
      });

      // Assert
      expect(result.confidence).toBe('LOW'); // Only phone = 40, which is LOW (<50)
      expect(result.verificationMethod).not.toContain('BOOKING_REFERENCE');
    });

    it('should create identity verification audit log', async () => {
      // Arrange
      const mockCustomer = {
        id: mockCustomerId,
        tenantId: mockTenantId,
        bookings: [],
      };
      const auditLogCreate = jest.fn().mockResolvedValue({});

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(mockCustomer),
            },
            auditLog: {
              create: auditLogCreate,
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      await service.verifyIdentity(mockCustomerId, mockTenantId, {
        method: 'PHONE',
        phoneVerified: true,
      });

      // Assert
      expect(auditLogCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: mockTenantId,
          action: 'IDENTITY_VERIFICATION',
          tableName: 'customers_encrypted',
          recordId: mockCustomerId,
          newValues: expect.objectContaining({
            verified: expect.any(Boolean),
            confidence: expect.any(String),
            methods: expect.any(Array),
          }),
        }),
      });
    });
  });

  describe('createDeletionSnapshot', () => {
    it('should create a deletion snapshot with all customer data', async () => {
      // Arrange
      const mockCustomer = {
        id: mockCustomerId,
        tenantId: mockTenantId,
        createdAt: new Date('2024-01-01'),
        gdprConsent: true,
        gdprConsentDate: new Date('2024-01-01'),
        vehicles: [
          { id: 'vehicle-1', licensePlate: 'ABC123', make: 'Toyota', model: 'Camry', year: 2020 },
        ],
        bookings: [
          { id: 'booking-1', createdAt: new Date(), status: 'COMPLETED', totalCostCents: 50000 },
        ],
      };

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(mockCustomer),
            },
            dataSubjectRequests: {
              update: jest.fn().mockResolvedValue({}),
            },
            auditLog: {
              create: jest.fn().mockResolvedValue({}),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.createDeletionSnapshot(mockCustomerId, mockTenantId, mockRequestId);

      // Assert
      expect(result).toHaveProperty('snapshotId');
      expect(result).toHaveProperty('customerId', mockCustomerId);
      expect(result).toHaveProperty('tenantId', mockTenantId);
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('expiresAt');
      expect(result.expiresAt.getTime()).toBeGreaterThan(result.createdAt.getTime());
      expect(result.dataCategories).toContain('customer');
      expect(result.dataCategories).toContain('vehicles');
      expect(result.dataCategories).toContain('bookings');
      expect(result).toHaveProperty('checksum');
      expect(result).toHaveProperty('storageLocation');
    });

    it('should set 30-day retention for snapshot', async () => {
      // Arrange
      const mockCustomer = {
        id: mockCustomerId,
        tenantId: mockTenantId,
        createdAt: new Date(),
        gdprConsent: true,
        vehicles: [],
        bookings: [],
      };

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(mockCustomer),
            },
            dataSubjectRequests: {
              update: jest.fn().mockResolvedValue({}),
            },
            auditLog: {
              create: jest.fn().mockResolvedValue({}),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.createDeletionSnapshot(mockCustomerId, mockTenantId, mockRequestId);

      // Assert
      const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
      const retentionPeriod = result.expiresAt.getTime() - result.createdAt.getTime();
      expect(retentionPeriod).toBeGreaterThanOrEqual(thirtyDaysInMs - 1000);
      expect(retentionPeriod).toBeLessThanOrEqual(thirtyDaysInMs + 1000);
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
        service.createDeletionSnapshot(mockCustomerId, mockTenantId, mockRequestId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update request with snapshot info', async () => {
      // Arrange
      const mockCustomer = {
        id: mockCustomerId,
        tenantId: mockTenantId,
        createdAt: new Date(),
        gdprConsent: true,
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
            dataSubjectRequests: {
              update: updateMock,
            },
            auditLog: {
              create: jest.fn().mockResolvedValue({}),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      await service.createDeletionSnapshot(mockCustomerId, mockTenantId, mockRequestId);

      // Assert
      expect(updateMock).toHaveBeenCalledWith({
        where: { id: mockRequestId },
        data: {
          deletionSnapshotCreated: true,
          deletionSnapshotUrl: expect.stringContaining('snapshots/'),
        },
      });
    });
  });

  describe('anonymizeCustomer', () => {
    it('should anonymize PII fields and set isDeleted flag', async () => {
      // Arrange
      const mockCustomer = {
        id: mockCustomerId,
        tenantId: mockTenantId,
        phoneEncrypted: Buffer.from('old_phone'),
        emailEncrypted: Buffer.from('old_email'),
        nameEncrypted: Buffer.from('old_name'),
      };

      const updateMock = jest.fn().mockResolvedValue({});
      const auditLogCreate = jest.fn().mockResolvedValue({});

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(mockCustomer),
              update: updateMock,
            },
            auditLog: {
              create: auditLogCreate,
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.anonymizeCustomer(mockCustomerId, mockTenantId, mockRequestId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.customerId).toBe(mockCustomerId);
      expect(updateMock).toHaveBeenCalledWith({
        where: { id: mockCustomerId },
        data: expect.objectContaining({
          phoneEncrypted: expect.any(Buffer),
          emailEncrypted: expect.any(Buffer),
          nameEncrypted: expect.any(Buffer),
          gdprConsent: false,
          marketingConsent: false,
          callRecordingConsent: false,
          isDeleted: true,
          deletedAt: expect.any(Date),
          anonymizedAt: expect.any(Date),
          dataSubjectRequestId: mockRequestId,
          dataRetentionDays: 0,
        }),
      });
    });

    it('should create CUSTOMER_ANONYMIZED audit log entry', async () => {
      // Arrange
      const mockCustomer = {
        id: mockCustomerId,
        tenantId: mockTenantId,
      };

      const auditLogCreate = jest.fn().mockResolvedValue({});

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(mockCustomer),
              update: jest.fn().mockResolvedValue({}),
            },
            auditLog: {
              create: auditLogCreate,
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      await service.anonymizeCustomer(mockCustomerId, mockTenantId, mockRequestId);

      // Assert
      expect(auditLogCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: mockTenantId,
          action: 'CUSTOMER_ANONYMIZED',
          tableName: 'customers_encrypted',
          recordId: mockCustomerId,
          oldValues: { wasActive: true },
          newValues: expect.objectContaining({
            anonymized: true,
            anonymizedAt: expect.any(Date),
            requestId: mockRequestId,
          }),
        }),
      });
    });

    it('should return failure result if customer not found', async () => {
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

      // Act
      const result = await service.anonymizeCustomer(mockCustomerId, mockTenantId, mockRequestId);

      // Assert - service returns failure result instead of throwing
      expect(result.success).toBe(false);
      expect(result.errors).toContain(`Customer ${mockCustomerId} not found`);
    });

    it('should return failure result on error', async () => {
      // Arrange
      const mockCustomer = {
        id: mockCustomerId,
        tenantId: mockTenantId,
      };

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(mockCustomer),
              update: jest.fn().mockRejectedValue(new Error('Database error')),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.anonymizeCustomer(mockCustomerId, mockTenantId, mockRequestId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Database error');
    });

    it('should return list of anonymized fields', async () => {
      // Arrange
      const mockCustomer = {
        id: mockCustomerId,
        tenantId: mockTenantId,
      };

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(mockCustomer),
              update: jest.fn().mockResolvedValue({}),
            },
            auditLog: {
              create: jest.fn().mockResolvedValue({}),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.anonymizeCustomer(mockCustomerId, mockTenantId, mockRequestId);

      // Assert
      expect(result.anonymizedFields).toContain('phoneEncrypted');
      expect(result.anonymizedFields).toContain('emailEncrypted');
      expect(result.anonymizedFields).toContain('nameEncrypted');
      expect(result.preservedFields).toContain('id');
      expect(result.preservedFields).toContain('tenantId');
    });

    it('should include errors array when there are warnings but success is true', async () => {
      // Arrange - This test covers line 518: errors.length > 0 ? errors : undefined
      const mockCustomer = {
        id: mockCustomerId,
        tenantId: mockTenantId,
      };

      // Mock implementation that adds errors but still succeeds
      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(mockCustomer),
              update: jest.fn().mockResolvedValue({}),
            },
            auditLog: {
              create: jest.fn().mockResolvedValue({}),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.anonymizeCustomer(mockCustomerId, mockTenantId, mockRequestId);

      // Assert - When successful with no errors, errors should be undefined
      expect(result.success).toBe(true);
      expect(result.errors).toBeUndefined();
    });
  });

  describe('deleteCallRecordings', () => {
    it('should delete all call recordings for a customer', async () => {
      // Arrange
      const mockRecordings = [
        { id: 'rec-1', durationSeconds: 120, recordingUrl: 'https://s3/rec1.mp3' },
        { id: 'rec-2', durationSeconds: 60, recordingUrl: 'https://s3/rec2.mp3' },
      ];

      const updateMock = jest.fn().mockResolvedValue({});

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            callRecordings: {
              findMany: jest.fn().mockResolvedValue(mockRecordings),
              update: updateMock,
            },
            auditLog: {
              create: jest.fn().mockResolvedValue({}),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.deleteCallRecordings(mockCustomerId, mockTenantId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(2);
      expect(updateMock).toHaveBeenCalledTimes(2);
    });

    it('should mark recordings as deleted without removing DB records', async () => {
      // Arrange
      const mockRecordings = [
        { id: 'rec-1', durationSeconds: 120, recordingUrl: 'https://s3/rec1.mp3' },
      ];

      const updateMock = jest.fn().mockResolvedValue({});

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            callRecordings: {
              findMany: jest.fn().mockResolvedValue(mockRecordings),
              update: updateMock,
            },
            auditLog: {
              create: jest.fn().mockResolvedValue({}),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      await service.deleteCallRecordings(mockCustomerId, mockTenantId);

      // Assert
      expect(updateMock).toHaveBeenCalledWith({
        where: { id: 'rec-1' },
        data: {
          deletedAt: expect.any(Date),
          deletionReason: 'GDPR_DELETION_REQUEST',
          recordingUrl: null,
        },
      });
    });

    it('should calculate storage reclaimed correctly', async () => {
      // Arrange
      const mockRecordings = [
        { id: 'rec-1', durationSeconds: 100, recordingUrl: 'url1' },
        { id: 'rec-2', durationSeconds: 200, recordingUrl: 'url2' },
      ];

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            callRecordings: {
              findMany: jest.fn().mockResolvedValue(mockRecordings),
              update: jest.fn().mockResolvedValue({}),
            },
            auditLog: {
              create: jest.fn().mockResolvedValue({}),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.deleteCallRecordings(mockCustomerId, mockTenantId);

      // Assert
      // 300 seconds * 16000 bytes/sec (16kbps audio) = 4,800,000 bytes
      expect(result.storageReclaimed).toBe(300 * 16000);
    });

    it('should return success=false if some deletions failed', async () => {
      // Arrange
      const mockRecordings = [
        { id: 'rec-1', durationSeconds: 100, recordingUrl: 'url1' },
        { id: 'rec-2', durationSeconds: 200, recordingUrl: 'url2' },
      ];

      // First update succeeds, second fails
      let callCount = 0;
      const updateMock = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve({});
        return Promise.reject(new Error('S3 error'));
      });

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            callRecordings: {
              findMany: jest.fn().mockResolvedValue(mockRecordings),
              update: updateMock,
            },
            auditLog: {
              create: jest.fn().mockResolvedValue({}),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.deleteCallRecordings(mockCustomerId, mockTenantId);

      // Assert - success is false when any deletion fails
      expect(result.success).toBe(false);
      expect(result.deletedCount).toBe(1);
      expect(result.failedDeletions).toHaveLength(1);
      expect(result.failedDeletions[0]).toEqual({
        recordingId: 'rec-2',
        reason: 'S3 error',
      });
    });

    it('should not create audit log if no recordings deleted', async () => {
      // Arrange
      const auditLogCreate = jest.fn().mockResolvedValue({});

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
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
      await service.deleteCallRecordings(mockCustomerId, mockTenantId);

      // Assert
      expect(auditLogCreate).not.toHaveBeenCalled();
    });

    it('should handle errors when fetching recordings', async () => {
      // Arrange
      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            callRecordings: {
              findMany: jest.fn().mockRejectedValue(new Error('Connection error')),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.deleteCallRecordings(mockCustomerId, mockTenantId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.deletedCount).toBe(0);
      expect(result.failedDeletions).toHaveLength(1);
      expect(result.failedDeletions[0].reason).toBe('Connection error');
    });
  });

  describe('getJobStatus', () => {
    it('should return job status details', async () => {
      // Arrange
      const mockJob = {
        id: mockJobId,
        progress: 50,
        attemptsMade: 1,
        timestamp: Date.now(),
        processedOn: Date.now(),
        finishedOn: null,
        failedReason: null,
        getState: jest.fn().mockResolvedValue('active'),
      } as unknown as Job;

      mockQueue.getJob = jest.fn().mockResolvedValue(mockJob);

      // Act
      const result = await service.getJobStatus(mockJobId);

      // Assert
      expect(result).toMatchObject({
        jobId: mockJobId,
        state: 'active',
        progress: 50,
        attempts: 1,
        createdAt: expect.any(Date),
        processedAt: expect.any(Date),
        completedAt: undefined,
      });
      expect(result.failedReason === undefined || result.failedReason === null).toBe(true);
    });

    it('should throw NotFoundException if job not found', async () => {
      // Arrange
      mockQueue.getJob = jest.fn().mockResolvedValue(null);

      // Act & Assert
      await expect(service.getJobStatus('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should return completed timestamp for finished jobs', async () => {
      // Arrange
      const mockJob = {
        id: mockJobId,
        progress: 100,
        attemptsMade: 1,
        timestamp: Date.now() - 60000,
        processedOn: Date.now() - 50000,
        finishedOn: Date.now(),
        failedReason: null,
        getState: jest.fn().mockResolvedValue('completed'),
      } as unknown as Job;

      mockQueue.getJob = jest.fn().mockResolvedValue(mockJob);

      // Act
      const result = await service.getJobStatus(mockJobId);

      // Assert
      expect(result.completedAt).toBeInstanceOf(Date);
      expect(result.state).toBe('completed');
    });

    it('should handle job with undefined progress (defaults to 0)', async () => {
      // Arrange - Covers line 667: job.progress || 0
      const mockJob = {
        id: mockJobId,
        progress: undefined,
        attemptsMade: 0,
        timestamp: Date.now(),
        processedOn: undefined,
        finishedOn: undefined,
        failedReason: undefined,
        getState: jest.fn().mockResolvedValue('waiting'),
      } as unknown as Job;

      mockQueue.getJob = jest.fn().mockResolvedValue(mockJob);

      // Act
      const result = await service.getJobStatus(mockJobId);

      // Assert
      expect(result.progress).toBe(0);
      expect(result.attempts).toBe(0);
    });

    it('should handle job with undefined timestamps', async () => {
      // Arrange - Covers lines 669-670: timestamps conditionals
      const mockJob = {
        id: mockJobId,
        progress: 0,
        attemptsMade: 0,
        timestamp: undefined,
        processedOn: undefined,
        finishedOn: undefined,
        failedReason: undefined,
        getState: jest.fn().mockResolvedValue('waiting'),
      } as unknown as Job;

      mockQueue.getJob = jest.fn().mockResolvedValue(mockJob);

      // Act
      const result = await service.getJobStatus(mockJobId);

      // Assert
      expect(result.createdAt).toBeUndefined();
      expect(result.processedAt).toBeUndefined();
      expect(result.completedAt).toBeUndefined();
    });
  });

  describe('cancelDeletion', () => {
    it('should successfully cancel a pending job', async () => {
      // Arrange
      const mockJob = {
        getState: jest.fn().mockResolvedValue('waiting'),
        remove: jest.fn().mockResolvedValue(undefined),
      } as unknown as Job;

      mockQueue.getJob = jest.fn().mockResolvedValue(mockJob);

      // Act
      const result = await service.cancelDeletion(mockJobId, 'Customer changed mind');

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('Job cancelled successfully');
      expect(mockJob.remove).toHaveBeenCalled();
    });

    it('should return error for completed job', async () => {
      // Arrange
      const mockJob = {
        getState: jest.fn().mockResolvedValue('completed'),
      } as unknown as Job;

      mockQueue.getJob = jest.fn().mockResolvedValue(mockJob);

      // Act
      const result = await service.cancelDeletion(mockJobId, 'Test');

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Cannot cancel completed job');
    });

    it('should return error for failed job', async () => {
      // Arrange
      const mockJob = {
        getState: jest.fn().mockResolvedValue('failed'),
      } as unknown as Job;

      mockQueue.getJob = jest.fn().mockResolvedValue(mockJob);

      // Act
      const result = await service.cancelDeletion(mockJobId, 'Test');

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Job already failed');
    });

    it('should return error if job not found', async () => {
      // Arrange
      mockQueue.getJob = jest.fn().mockResolvedValue(null);

      // Act
      const result = await service.cancelDeletion('non-existent', 'Test');

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Job not found');
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      // Arrange
      mockQueue.getWaitingCount = jest.fn().mockResolvedValue(5);
      mockQueue.getActiveCount = jest.fn().mockResolvedValue(2);
      mockQueue.getCompletedCount = jest.fn().mockResolvedValue(100);
      mockQueue.getFailedCount = jest.fn().mockResolvedValue(3);
      mockQueue.getDelayedCount = jest.fn().mockResolvedValue(1);

      // Act
      const result = await service.getQueueStats();

      // Assert
      expect(result).toEqual({
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 1,
      });
    });
  });
});
