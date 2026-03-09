import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bullmq';
import { PrismaService } from '@common/services/prisma.service';
import { EncryptionService } from '@common/services/encryption.service';
import { LoggerService } from '@common/services/logger.service';
import {
  GdprDeletionService,
  DeletionJobPayload,
  DeletionSnapshot,
  AnonymizationResult,
  RecordingDeletionResult,
} from './gdpr-deletion.service';

// ---------------------------------------------------------------------------
// Mock types
// ---------------------------------------------------------------------------

interface MockPrismaModels {
  customerEncrypted: {
    findFirst: jest.Mock;
    update: jest.Mock;
  };
  dataSubjectRequest: {
    update: jest.Mock;
  };
  auditLog: {
    create: jest.Mock;
  };
  callRecordings: {
    findMany: jest.Mock;
    update: jest.Mock;
  };
  withTenant: jest.Mock;
}

interface MockQueue {
  add: jest.Mock;
  getJob: jest.Mock;
  getWaitingCount: jest.Mock;
  getActiveCount: jest.Mock;
  getCompletedCount: jest.Mock;
  getFailedCount: jest.Mock;
  getDelayedCount: jest.Mock;
}

interface MockEncryption {
  encrypt: jest.Mock;
  decrypt: jest.Mock;
  hash: jest.Mock;
}

interface MockLoggerService {
  log: jest.Mock;
  warn: jest.Mock;
  error: jest.Mock;
  debug: jest.Mock;
}

interface MockJob {
  id: string;
  getState: jest.Mock;
  progress: number;
  attemptsMade: number;
  timestamp: number;
  processedOn: number | undefined;
  finishedOn: number | undefined;
  failedReason: string | undefined;
  remove: jest.Mock;
}

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-550e8400-e29b-41d4-a716-446655440000';
const CUSTOMER_ID = 'cust-660e8400-e29b-41d4-a716-446655440001';
const REQUEST_ID = 'req-770e8400-e29b-41d4-a716-446655440002';
const OTHER_TENANT_ID = 'tenant-other-0000-0000-000000000099';

const MOCK_CUSTOMER = {
  id: CUSTOMER_ID,
  tenantId: TENANT_ID,
  createdAt: new Date('2024-01-15T10:00:00Z'),
  gdprConsent: true,
  gdprConsentDate: new Date('2024-01-15T10:00:00Z'),
  marketingConsent: true,
  callRecordingConsent: false,
  phoneEncrypted: Buffer.from('enc-phone'),
  emailEncrypted: Buffer.from('enc-email'),
  nameEncrypted: Buffer.from('enc-name'),
  anonymizedAt: null,
  bookings: [
    {
      id: 'booking-001',
      createdAt: new Date('2024-02-10T08:00:00Z'),
      status: 'COMPLETED',
      totalCostCents: BigInt(15000),
      invoices: [{ id: 'inv-001', totalCents: BigInt(15000) }],
    },
  ],
  vehicles: [
    {
      id: 'vehicle-001',
      licensePlate: 'AB123CD',
      make: 'Fiat',
      model: 'Panda',
      year: 2020,
    },
  ],
};

const MOCK_RECORDINGS = [
  {
    id: 'rec-001',
    customerId: CUSTOMER_ID,
    tenantId: TENANT_ID,
    durationSeconds: 120,
    deletedAt: null,
    recordingUrl: 'https://storage/rec-001.wav',
  },
  {
    id: 'rec-002',
    customerId: CUSTOMER_ID,
    tenantId: TENANT_ID,
    durationSeconds: 60,
    deletedAt: null,
    recordingUrl: 'https://storage/rec-002.wav',
  },
];

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('GdprDeletionService', () => {
  let service: GdprDeletionService;
  let prisma: MockPrismaModels;
  let queue: MockQueue;
  let encryption: MockEncryption;
  let loggerService: MockLoggerService;

  // -----------------------------------------------------------------------
  // Setup
  // -----------------------------------------------------------------------

  beforeEach(async () => {
    // Build a mock prisma that delegates withTenant's callback to itself
    prisma = {
      customerEncrypted: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      dataSubjectRequest: {
        update: jest.fn(),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-001' }),
      },
      callRecordings: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
      withTenant: jest.fn((_tenantId: string, cb: (p: MockPrismaModels) => Promise<unknown>) =>
        cb(prisma),
      ),
    };

    queue = {
      add: jest.fn().mockResolvedValue({ id: `deletion:${CUSTOMER_ID}` }),
      getJob: jest.fn(),
      getWaitingCount: jest.fn().mockResolvedValue(0),
      getActiveCount: jest.fn().mockResolvedValue(0),
      getCompletedCount: jest.fn().mockResolvedValue(0),
      getFailedCount: jest.fn().mockResolvedValue(0),
      getDelayedCount: jest.fn().mockResolvedValue(0),
    };

    encryption = {
      encrypt: jest.fn().mockReturnValue('encrypted-value'),
      decrypt: jest.fn().mockReturnValue('decrypted-value'),
      hash: jest.fn().mockReturnValue('hashed-value'),
    };

    loggerService = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GdprDeletionService,
        { provide: PrismaService, useValue: prisma },
        { provide: EncryptionService, useValue: encryption },
        { provide: LoggerService, useValue: loggerService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-value'),
          },
        },
        { provide: getQueueToken('gdpr-deletion'), useValue: queue },
      ],
    }).compile();

    service = module.get<GdprDeletionService>(GdprDeletionService);
  });

  // -----------------------------------------------------------------------
  // Sanity
  // -----------------------------------------------------------------------

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =======================================================================
  // queueDeletion
  // =======================================================================

  describe('queueDeletion', () => {
    beforeEach(() => {
      prisma.customerEncrypted.findFirst.mockResolvedValue({
        id: CUSTOMER_ID,
        tenantId: TENANT_ID,
      });
      prisma.dataSubjectRequest.update.mockResolvedValue({ id: REQUEST_ID });
      queue.getJob.mockResolvedValue(null);
    });

    it('should queue a deletion job and return job metadata', async () => {
      // Arrange - defaults set in beforeEach

      // Act
      const result = await service.queueDeletion(
        CUSTOMER_ID,
        TENANT_ID,
        REQUEST_ID,
        'User requested account deletion',
      );

      // Assert
      expect(result.jobId).toBe(`deletion:${CUSTOMER_ID}`);
      expect(result.status).toBe('QUEUED');
      expect(result.estimatedCompletion).toBeInstanceOf(Date);
      expect(result.slaDeadline).toBeInstanceOf(Date);

      // SLA deadline should be ~24 hours in the future
      const hoursUntilSla =
        (result.slaDeadline.getTime() - Date.now()) / (1000 * 60 * 60);
      expect(hoursUntilSla).toBeGreaterThan(23);
      expect(hoursUntilSla).toBeLessThanOrEqual(24);
    });

    it('should set tenant context in all prisma calls', async () => {
      // Act
      await service.queueDeletion(CUSTOMER_ID, TENANT_ID, REQUEST_ID, 'reason');

      // Assert - withTenant called with the correct tenantId
      const withTenantCalls = prisma.withTenant.mock.calls;
      for (const call of withTenantCalls) {
        expect(call[0]).toBe(TENANT_ID);
      }
    });

    it('should update request status to IN_PROGRESS', async () => {
      // Act
      await service.queueDeletion(CUSTOMER_ID, TENANT_ID, REQUEST_ID, 'reason');

      // Assert
      expect(prisma.dataSubjectRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: REQUEST_ID },
          data: expect.objectContaining({
            status: 'IN_PROGRESS',
          }),
        }),
      );
    });

    it('should add job to BullMQ queue with correct payload', async () => {
      // Act
      await service.queueDeletion(CUSTOMER_ID, TENANT_ID, REQUEST_ID, 'User request', {
        verifiedBy: 'admin-001',
        identityVerificationMethod: 'PHONE',
        priority: 1,
      });

      // Assert
      expect(queue.add).toHaveBeenCalledWith(
        'customer-deletion',
        expect.objectContaining({
          customerId: CUSTOMER_ID,
          tenantId: TENANT_ID,
          requestId: REQUEST_ID,
          reason: 'User request',
          verifiedBy: 'admin-001',
          identityVerificationMethod: 'PHONE',
        } satisfies Partial<DeletionJobPayload>),
        expect.objectContaining({
          jobId: `deletion:${CUSTOMER_ID}`,
          priority: 1,
          attempts: 3,
        }),
      );
    });

    it('should log queued deletion', async () => {
      // Act
      await service.queueDeletion(CUSTOMER_ID, TENANT_ID, REQUEST_ID, 'reason');

      // Assert
      expect(loggerService.log).toHaveBeenCalledWith(
        expect.stringContaining('Queued deletion job'),
        'GdprDeletionService',
      );
    });

    // Error cases

    it('should throw NotFoundException if customer does not exist', async () => {
      // Arrange
      prisma.customerEncrypted.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.queueDeletion(CUSTOMER_ID, TENANT_ID, REQUEST_ID, 'reason'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if customer is already anonymized', async () => {
      // Arrange
      prisma.customerEncrypted.findFirst.mockResolvedValue(null); // findFirst with anonymizedAt: null returns null

      // Act & Assert
      await expect(
        service.queueDeletion(CUSTOMER_ID, TENANT_ID, REQUEST_ID, 'reason'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.queueDeletion(CUSTOMER_ID, TENANT_ID, REQUEST_ID, 'reason'),
      ).rejects.toThrow(/not found or already anonymized/);
    });

    it('should throw BadRequestException if deletion is already in progress', async () => {
      // Arrange
      const activeJob: Partial<MockJob> = {
        id: `deletion:${CUSTOMER_ID}`,
        getState: jest.fn().mockResolvedValue('active'),
      };
      queue.getJob.mockResolvedValue(activeJob);

      // Act & Assert
      await expect(
        service.queueDeletion(CUSTOMER_ID, TENANT_ID, REQUEST_ID, 'reason'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.queueDeletion(CUSTOMER_ID, TENANT_ID, REQUEST_ID, 'reason'),
      ).rejects.toThrow(/already in progress/);
    });

    it('should allow re-queuing when previous job is not active', async () => {
      // Arrange - job exists but is completed
      const completedJob: Partial<MockJob> = {
        id: `deletion:${CUSTOMER_ID}`,
        getState: jest.fn().mockResolvedValue('completed'),
      };
      queue.getJob.mockResolvedValue(completedJob);

      // Act
      const result = await service.queueDeletion(
        CUSTOMER_ID,
        TENANT_ID,
        REQUEST_ID,
        'reason',
      );

      // Assert
      expect(result.status).toBe('QUEUED');
    });

    it('should enforce tenant isolation - never query without tenantId', async () => {
      // Act
      await service.queueDeletion(CUSTOMER_ID, TENANT_ID, REQUEST_ID, 'reason');

      // Assert - every withTenant call uses the correct tenant
      expect(prisma.withTenant).toHaveBeenCalled();
      prisma.withTenant.mock.calls.forEach((call: [string, unknown]) => {
        expect(call[0]).toBe(TENANT_ID);
      });
    });
  });

  // =======================================================================
  // verifyIdentity
  // =======================================================================

  describe('verifyIdentity', () => {
    beforeEach(() => {
      prisma.customerEncrypted.findFirst.mockResolvedValue({
        ...MOCK_CUSTOMER,
        bookings: [{ id: 'booking-001' }],
      });
    });

    it('should return MEDIUM confidence when phone and email are verified', async () => {
      // Arrange
      const verificationData = {
        method: 'PHONE_AND_EMAIL',
        phoneVerified: true,
        emailVerified: true,
      };

      // Act
      const result = await service.verifyIdentity(CUSTOMER_ID, TENANT_ID, verificationData);

      // Assert
      expect(result.verified).toBe(true);
      expect(result.confidence).toBe('MEDIUM'); // 40 + 30 = 70 < 80 threshold for HIGH
    });

    it('should return HIGH confidence when phone, email, and booking match', async () => {
      // Arrange
      const verificationData = {
        method: 'MULTI_FACTOR',
        phoneVerified: true,
        emailVerified: true,
        bookingReference: 'booking-001',
      };

      // Act
      const result = await service.verifyIdentity(CUSTOMER_ID, TENANT_ID, verificationData);

      // Assert
      expect(result.verified).toBe(true);
      expect(result.confidence).toBe('HIGH'); // 40 + 30 + 30 = 100
      expect(result.verificationMethod).toContain('PHONE');
      expect(result.verificationMethod).toContain('EMAIL');
      expect(result.verificationMethod).toContain('BOOKING_REFERENCE');
    });

    it('should return MEDIUM confidence when only phone is verified with documents', async () => {
      // Arrange
      const verificationData = {
        method: 'PHONE_AND_DOCS',
        phoneVerified: true,
        documents: ['id-card.pdf'],
      };

      // Act
      const result = await service.verifyIdentity(CUSTOMER_ID, TENANT_ID, verificationData);

      // Assert
      expect(result.verified).toBe(true);
      expect(result.confidence).toBe('MEDIUM'); // 40 + 20 = 60
    });

    it('should return LOW confidence and verified=false when score is below threshold', async () => {
      // Arrange - only documents provided (20 points < 50 threshold)
      const verificationData = {
        method: 'DOCUMENTS_ONLY',
        documents: ['passport.pdf'],
      };

      // Act
      const result = await service.verifyIdentity(CUSTOMER_ID, TENANT_ID, verificationData);

      // Assert
      expect(result.verified).toBe(false);
      expect(result.confidence).toBe('LOW');
    });

    it('should not match booking reference if customer has no matching booking', async () => {
      // Arrange
      const verificationData = {
        method: 'BOOKING',
        bookingReference: 'non-existent-booking-999',
      };

      // Act
      const result = await service.verifyIdentity(CUSTOMER_ID, TENANT_ID, verificationData);

      // Assert
      expect(result.verified).toBe(false);
      expect(result.verificationMethod).not.toContain('BOOKING_REFERENCE');
    });

    it('should create audit log entry for identity verification', async () => {
      // Arrange
      const verificationData = {
        method: 'PHONE',
        phoneVerified: true,
      };

      // Act
      await service.verifyIdentity(CUSTOMER_ID, TENANT_ID, verificationData);

      // Assert
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            action: 'IDENTITY_VERIFICATION',
            tableName: 'customers_encrypted',
            recordId: CUSTOMER_ID,
          }),
        }),
      );
    });

    it('should throw NotFoundException when customer does not exist', async () => {
      // Arrange
      prisma.customerEncrypted.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.verifyIdentity(CUSTOMER_ID, TENANT_ID, { method: 'PHONE' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should include verifiedAt timestamp in result', async () => {
      // Arrange
      const beforeCall = new Date();
      const verificationData = {
        method: 'EMAIL',
        emailVerified: true,
        phoneVerified: true,
      };

      // Act
      const result = await service.verifyIdentity(CUSTOMER_ID, TENANT_ID, verificationData);

      // Assert
      expect(result.verifiedAt).toBeInstanceOf(Date);
      expect(result.verifiedAt.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
    });

    it('should enforce tenant isolation on verification queries', async () => {
      // Act
      await service.verifyIdentity(CUSTOMER_ID, TENANT_ID, {
        method: 'PHONE',
        phoneVerified: true,
      });

      // Assert
      prisma.withTenant.mock.calls.forEach((call: [string, unknown]) => {
        expect(call[0]).toBe(TENANT_ID);
      });
    });
  });

  // =======================================================================
  // createDeletionSnapshot
  // =======================================================================

  describe('createDeletionSnapshot', () => {
    beforeEach(() => {
      prisma.customerEncrypted.findFirst.mockResolvedValue(MOCK_CUSTOMER);
      prisma.dataSubjectRequest.update.mockResolvedValue({ id: REQUEST_ID });
    });

    it('should create snapshot with correct metadata', async () => {
      // Act
      const snapshot: DeletionSnapshot = await service.createDeletionSnapshot(
        CUSTOMER_ID,
        TENANT_ID,
        REQUEST_ID,
      );

      // Assert
      expect(snapshot.snapshotId).toMatch(/^snap-\d+-/);
      expect(snapshot.customerId).toBe(CUSTOMER_ID);
      expect(snapshot.tenantId).toBe(TENANT_ID);
      expect(snapshot.requestId).toBe(REQUEST_ID);
      expect(snapshot.createdAt).toBeInstanceOf(Date);
      expect(snapshot.expiresAt).toBeInstanceOf(Date);
    });

    it('should set snapshot expiry to 30 days from creation', async () => {
      // Act
      const snapshot = await service.createDeletionSnapshot(
        CUSTOMER_ID,
        TENANT_ID,
        REQUEST_ID,
      );

      // Assert
      const diffDays =
        (snapshot.expiresAt.getTime() - snapshot.createdAt.getTime()) /
        (1000 * 60 * 60 * 24);
      expect(Math.round(diffDays)).toBe(30);
    });

    it('should include correct data categories', async () => {
      // Act
      const snapshot = await service.createDeletionSnapshot(
        CUSTOMER_ID,
        TENANT_ID,
        REQUEST_ID,
      );

      // Assert
      expect(snapshot.dataCategories).toEqual(
        expect.arrayContaining(['customer', 'vehicles', 'bookings']),
      );
    });

    it('should encrypt snapshot content using EncryptionService', async () => {
      // Act
      await service.createDeletionSnapshot(CUSTOMER_ID, TENANT_ID, REQUEST_ID);

      // Assert
      expect(encryption.encrypt).toHaveBeenCalled();
      const encryptCallArg = encryption.encrypt.mock.calls[0][0] as string;
      const parsed = JSON.parse(encryptCallArg) as Record<string, unknown>;
      expect(parsed).toHaveProperty('snapshotId');
      expect(parsed).toHaveProperty('data');
    });

    it('should generate a SHA-256 checksum', async () => {
      // Act
      const snapshot = await service.createDeletionSnapshot(
        CUSTOMER_ID,
        TENANT_ID,
        REQUEST_ID,
      );

      // Assert - SHA-256 hex is 64 chars
      expect(snapshot.checksum).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should store snapshot location under tenant namespace', async () => {
      // Act
      const snapshot = await service.createDeletionSnapshot(
        CUSTOMER_ID,
        TENANT_ID,
        REQUEST_ID,
      );

      // Assert
      expect(snapshot.storageLocation).toContain(TENANT_ID);
      expect(snapshot.storageLocation).toMatch(/^snapshots\//);
      expect(snapshot.storageLocation).toMatch(/\.enc$/);
    });

    it('should update dataSubjectRequest with snapshot info', async () => {
      // Act
      await service.createDeletionSnapshot(CUSTOMER_ID, TENANT_ID, REQUEST_ID);

      // Assert
      expect(prisma.dataSubjectRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: REQUEST_ID },
          data: expect.objectContaining({
            deletionSnapshotCreated: true,
            deletionSnapshotUrl: expect.stringContaining('snapshots/'),
          }),
        }),
      );
    });

    it('should write audit log entry for snapshot creation', async () => {
      // Act
      await service.createDeletionSnapshot(CUSTOMER_ID, TENANT_ID, REQUEST_ID);

      // Assert
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            action: 'DELETION_SNAPSHOT_CREATED',
            tableName: 'customers_encrypted',
            recordId: CUSTOMER_ID,
          }),
        }),
      );
    });

    it('should log snapshot creation via LoggerService', async () => {
      // Act
      await service.createDeletionSnapshot(CUSTOMER_ID, TENANT_ID, REQUEST_ID);

      // Assert
      expect(loggerService.log).toHaveBeenCalledWith(
        expect.stringContaining('Deletion snapshot'),
        'GdprDeletionService',
      );
    });

    it('should throw NotFoundException if customer not found', async () => {
      // Arrange
      prisma.customerEncrypted.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.createDeletionSnapshot(CUSTOMER_ID, TENANT_ID, REQUEST_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should have positive fileSize in snapshot result', async () => {
      // Act
      const snapshot = await service.createDeletionSnapshot(
        CUSTOMER_ID,
        TENANT_ID,
        REQUEST_ID,
      );

      // Assert
      expect(snapshot.fileSize).toBeGreaterThan(0);
    });

    it('should include vehicle and booking count in snapshot audit', async () => {
      // Act
      await service.createDeletionSnapshot(CUSTOMER_ID, TENANT_ID, REQUEST_ID);

      // Assert - audit newValues should contain recordCount
      const auditCalls = prisma.auditLog.create.mock.calls;
      const snapshotAuditCall = auditCalls.find(
        (call: [{ data: { action: string } }]) => call[0].data.action === 'DELETION_SNAPSHOT_CREATED',
      );
      expect(snapshotAuditCall).toBeDefined();
      const newValues = snapshotAuditCall![0].data.newValues as {
        recordCount: number;
        snapshotId: string;
        expiresAt: Date;
      };
      // 1 customer + 1 vehicle + 1 booking = 3
      expect(newValues.recordCount).toBe(3);
    });
  });

  // =======================================================================
  // anonymizeCustomer
  // =======================================================================

  describe('anonymizeCustomer', () => {
    beforeEach(() => {
      prisma.customerEncrypted.findFirst.mockResolvedValue(MOCK_CUSTOMER);
      prisma.customerEncrypted.update.mockResolvedValue({
        ...MOCK_CUSTOMER,
        isDeleted: true,
        anonymizedAt: new Date(),
      });
    });

    it('should return successful anonymization result', async () => {
      // Act
      const result: AnonymizationResult = await service.anonymizeCustomer(
        CUSTOMER_ID,
        TENANT_ID,
        REQUEST_ID,
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.customerId).toBe(CUSTOMER_ID);
      expect(result.anonymizedAt).toBeInstanceOf(Date);
    });

    it('should anonymize PII fields with encrypted DELETED markers', async () => {
      // Act
      await service.anonymizeCustomer(CUSTOMER_ID, TENANT_ID, REQUEST_ID);

      // Assert
      expect(prisma.customerEncrypted.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: CUSTOMER_ID },
          data: expect.objectContaining({
            phoneEncrypted: expect.any(Buffer),
            emailEncrypted: expect.any(Buffer),
            nameEncrypted: expect.any(Buffer),
          }),
        }),
      );

      // Verify encrypt was called with 'DELETED' for each PII field
      const encryptCalls = encryption.encrypt.mock.calls.map(
        (call: [string]) => call[0],
      );
      expect(encryptCalls.filter((arg: string) => arg === 'DELETED')).toHaveLength(3);
    });

    it('should revoke all consent flags', async () => {
      // Act
      await service.anonymizeCustomer(CUSTOMER_ID, TENANT_ID, REQUEST_ID);

      // Assert
      expect(prisma.customerEncrypted.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            gdprConsent: false,
            marketingConsent: false,
            callRecordingConsent: false,
          }),
        }),
      );
    });

    it('should set isDeleted and deletedAt timestamps', async () => {
      // Arrange
      const beforeCall = new Date();

      // Act
      await service.anonymizeCustomer(CUSTOMER_ID, TENANT_ID, REQUEST_ID);

      // Assert
      const updateCall = prisma.customerEncrypted.update.mock.calls[0][0] as {
        data: { isDeleted: boolean; deletedAt: Date; anonymizedAt: Date };
      };
      expect(updateCall.data.isDeleted).toBe(true);
      expect(updateCall.data.deletedAt).toBeInstanceOf(Date);
      expect(updateCall.data.deletedAt.getTime()).toBeGreaterThanOrEqual(
        beforeCall.getTime(),
      );
      expect(updateCall.data.anonymizedAt).toEqual(updateCall.data.deletedAt);
    });

    it('should link anonymization to the data subject request', async () => {
      // Act
      await service.anonymizeCustomer(CUSTOMER_ID, TENANT_ID, REQUEST_ID);

      // Assert
      expect(prisma.customerEncrypted.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dataSubjectRequestId: REQUEST_ID,
          }),
        }),
      );
    });

    it('should set dataRetentionDays to zero', async () => {
      // Act
      await service.anonymizeCustomer(CUSTOMER_ID, TENANT_ID, REQUEST_ID);

      // Assert
      expect(prisma.customerEncrypted.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dataRetentionDays: 0,
          }),
        }),
      );
    });

    it('should report which fields were anonymized vs preserved', async () => {
      // Act
      const result = await service.anonymizeCustomer(
        CUSTOMER_ID,
        TENANT_ID,
        REQUEST_ID,
      );

      // Assert
      expect(result.anonymizedFields).toContain('phoneEncrypted');
      expect(result.anonymizedFields).toContain('emailEncrypted');
      expect(result.anonymizedFields).toContain('nameEncrypted');

      // Referential integrity fields are preserved
      expect(result.preservedFields).toContain('id');
      expect(result.preservedFields).toContain('tenantId');
      expect(result.preservedFields).toContain('createdAt');
    });

    it('should create audit log for anonymization action', async () => {
      // Act
      await service.anonymizeCustomer(CUSTOMER_ID, TENANT_ID, REQUEST_ID);

      // Assert
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            action: 'CUSTOMER_ANONYMIZED',
            tableName: 'customers_encrypted',
            recordId: CUSTOMER_ID,
            newValues: expect.objectContaining({
              anonymized: true,
              requestId: REQUEST_ID,
            }),
          }),
        }),
      );
    });

    it('should return success=false if customer not found', async () => {
      // Arrange - findFirst returns customer but update throws
      prisma.customerEncrypted.findFirst.mockResolvedValue(null);

      // Act
      const result = await service.anonymizeCustomer(
        CUSTOMER_ID,
        TENANT_ID,
        REQUEST_ID,
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should return success=false with error details on database failure', async () => {
      // Arrange
      prisma.customerEncrypted.findFirst.mockResolvedValue(MOCK_CUSTOMER);
      prisma.customerEncrypted.update.mockRejectedValue(
        new Error('Database connection lost'),
      );

      // Act
      const result = await service.anonymizeCustomer(
        CUSTOMER_ID,
        TENANT_ID,
        REQUEST_ID,
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Database connection lost');
      expect(result.snapshotCreated).toBe(false);
    });

    it('should enforce tenant isolation during anonymization', async () => {
      // Act
      await service.anonymizeCustomer(CUSTOMER_ID, TENANT_ID, REQUEST_ID);

      // Assert
      prisma.withTenant.mock.calls.forEach((call: [string, unknown]) => {
        expect(call[0]).toBe(TENANT_ID);
      });
    });

    it('should log successful anonymization', async () => {
      // Act
      await service.anonymizeCustomer(CUSTOMER_ID, TENANT_ID, REQUEST_ID);

      // Assert
      expect(loggerService.log).toHaveBeenCalledWith(
        expect.stringContaining('anonymized successfully'),
        'GdprDeletionService',
      );
    });
  });

  // =======================================================================
  // deleteCallRecordings
  // =======================================================================

  describe('deleteCallRecordings', () => {
    beforeEach(() => {
      prisma.callRecordings.findMany.mockResolvedValue(MOCK_RECORDINGS);
      prisma.callRecordings.update.mockResolvedValue({ id: 'rec-001' });
    });

    it('should delete all call recordings for a customer', async () => {
      // Act
      const result: RecordingDeletionResult = await service.deleteCallRecordings(
        CUSTOMER_ID,
        TENANT_ID,
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(2);
      expect(result.failedDeletions).toHaveLength(0);
    });

    it('should only query non-deleted recordings', async () => {
      // Act
      await service.deleteCallRecordings(CUSTOMER_ID, TENANT_ID);

      // Assert
      expect(prisma.callRecordings.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            customerId: CUSTOMER_ID,
            tenantId: TENANT_ID,
            deletedAt: null,
          }),
        }),
      );
    });

    it('should mark each recording as soft-deleted with GDPR reason', async () => {
      // Act
      await service.deleteCallRecordings(CUSTOMER_ID, TENANT_ID);

      // Assert
      expect(prisma.callRecordings.update).toHaveBeenCalledTimes(2);
      for (const call of prisma.callRecordings.update.mock.calls) {
        const updateArg = call[0] as {
          data: { deletionReason: string; recordingUrl: null };
        };
        expect(updateArg.data.deletionReason).toBe('GDPR_DELETION_REQUEST');
        expect(updateArg.data.recordingUrl).toBeNull();
      }
    });

    it('should calculate reclaimed storage from recording durations', async () => {
      // Act
      const result = await service.deleteCallRecordings(CUSTOMER_ID, TENANT_ID);

      // Assert - 120 * 16000 + 60 * 16000 = 2,880,000
      expect(result.storageReclaimed).toBe(2_880_000);
    });

    it('should create audit log when recordings are deleted', async () => {
      // Act
      await service.deleteCallRecordings(CUSTOMER_ID, TENANT_ID);

      // Assert
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            action: 'CALL_RECORDINGS_DELETED',
            tableName: 'call_recordings',
            recordId: CUSTOMER_ID,
            newValues: expect.objectContaining({
              deletedCount: 2,
            }),
          }),
        }),
      );
    });

    it('should not create audit log when no recordings exist', async () => {
      // Arrange
      prisma.callRecordings.findMany.mockResolvedValue([]);

      // Act
      const result = await service.deleteCallRecordings(CUSTOMER_ID, TENANT_ID);

      // Assert
      expect(result.deletedCount).toBe(0);
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });

    it('should handle partial failures gracefully', async () => {
      // Arrange - first update succeeds, second fails
      prisma.callRecordings.update
        .mockResolvedValueOnce({ id: 'rec-001' })
        .mockRejectedValueOnce(new Error('Storage service unavailable'));

      // Act
      const result = await service.deleteCallRecordings(CUSTOMER_ID, TENANT_ID);

      // Assert
      expect(result.success).toBe(false);
      expect(result.deletedCount).toBe(1);
      expect(result.failedDeletions).toHaveLength(1);
      expect(result.failedDeletions[0].recordingId).toBe('rec-002');
      expect(result.failedDeletions[0].reason).toBe('Storage service unavailable');
    });

    it('should return success=false on complete failure', async () => {
      // Arrange
      prisma.callRecordings.findMany.mockRejectedValue(
        new Error('Database timeout'),
      );

      // Act
      const result = await service.deleteCallRecordings(CUSTOMER_ID, TENANT_ID);

      // Assert
      expect(result.success).toBe(false);
      expect(result.failedDeletions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            recordingId: 'N/A',
            reason: 'Database timeout',
          }),
        ]),
      );
    });

    it('should enforce tenant isolation for recording queries', async () => {
      // Act
      await service.deleteCallRecordings(CUSTOMER_ID, TENANT_ID);

      // Assert
      prisma.withTenant.mock.calls.forEach((call: [string, unknown]) => {
        expect(call[0]).toBe(TENANT_ID);
      });
    });
  });

  // =======================================================================
  // getJobStatus
  // =======================================================================

  describe('getJobStatus', () => {
    const JOB_ID = `deletion:${CUSTOMER_ID}`;
    const NOW = Date.now();

    it('should return status details for an existing job', async () => {
      // Arrange
      const mockJob: Partial<MockJob> = {
        id: JOB_ID,
        getState: jest.fn().mockResolvedValue('completed'),
        progress: 100,
        attemptsMade: 1,
        timestamp: NOW - 60000,
        processedOn: NOW - 50000,
        finishedOn: NOW,
        failedReason: undefined,
      };
      queue.getJob.mockResolvedValue(mockJob);

      // Act
      const result = await service.getJobStatus(JOB_ID);

      // Assert
      expect(result.jobId).toBe(JOB_ID);
      expect(result.state).toBe('completed');
      expect(result.progress).toBe(100);
      expect(result.attempts).toBe(1);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.processedAt).toBeInstanceOf(Date);
      expect(result.completedAt).toBeInstanceOf(Date);
      expect(result.failedReason).toBeUndefined();
    });

    it('should return progress=0 when job has no progress', async () => {
      // Arrange
      const mockJob: Partial<MockJob> = {
        id: JOB_ID,
        getState: jest.fn().mockResolvedValue('waiting'),
        progress: 0,
        attemptsMade: 0,
        timestamp: NOW,
        processedOn: undefined,
        finishedOn: undefined,
        failedReason: undefined,
      };
      queue.getJob.mockResolvedValue(mockJob);

      // Act
      const result = await service.getJobStatus(JOB_ID);

      // Assert
      expect(result.progress).toBe(0);
      expect(result.processedAt).toBeUndefined();
      expect(result.completedAt).toBeUndefined();
    });

    it('should include failedReason when job has failed', async () => {
      // Arrange
      const mockJob: Partial<MockJob> = {
        id: JOB_ID,
        getState: jest.fn().mockResolvedValue('failed'),
        progress: 50,
        attemptsMade: 3,
        timestamp: NOW,
        processedOn: NOW,
        finishedOn: NOW,
        failedReason: 'Anonymization step failed: database lock timeout',
      };
      queue.getJob.mockResolvedValue(mockJob);

      // Act
      const result = await service.getJobStatus(JOB_ID);

      // Assert
      expect(result.state).toBe('failed');
      expect(result.failedReason).toBe(
        'Anonymization step failed: database lock timeout',
      );
    });

    it('should throw NotFoundException when job does not exist', async () => {
      // Arrange
      queue.getJob.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getJobStatus('non-existent-job')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // =======================================================================
  // cancelDeletion
  // =======================================================================

  describe('cancelDeletion', () => {
    const JOB_ID = `deletion:${CUSTOMER_ID}`;

    it('should successfully cancel a waiting job', async () => {
      // Arrange
      const mockJob: Partial<MockJob> = {
        id: JOB_ID,
        getState: jest.fn().mockResolvedValue('waiting'),
        remove: jest.fn().mockResolvedValue(undefined),
      };
      queue.getJob.mockResolvedValue(mockJob);

      // Act
      const result = await service.cancelDeletion(JOB_ID, 'Customer changed mind');

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('Job cancelled successfully');
      expect(mockJob.remove).toHaveBeenCalled();
    });

    it('should return failure when job is not found', async () => {
      // Arrange
      queue.getJob.mockResolvedValue(null);

      // Act
      const result = await service.cancelDeletion(JOB_ID, 'reason');

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Job not found');
    });

    it('should return failure when job is already completed', async () => {
      // Arrange
      const mockJob: Partial<MockJob> = {
        id: JOB_ID,
        getState: jest.fn().mockResolvedValue('completed'),
        remove: jest.fn(),
      };
      queue.getJob.mockResolvedValue(mockJob);

      // Act
      const result = await service.cancelDeletion(JOB_ID, 'Too late');

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toContain('completed');
      expect(mockJob.remove).not.toHaveBeenCalled();
    });

    it('should return failure when job already failed', async () => {
      // Arrange
      const mockJob: Partial<MockJob> = {
        id: JOB_ID,
        getState: jest.fn().mockResolvedValue('failed'),
        remove: jest.fn(),
      };
      queue.getJob.mockResolvedValue(mockJob);

      // Act
      const result = await service.cancelDeletion(JOB_ID, 'Clean up');

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toContain('failed');
      expect(mockJob.remove).not.toHaveBeenCalled();
    });

    it('should log cancellation with reason', async () => {
      // Arrange
      const mockJob: Partial<MockJob> = {
        id: JOB_ID,
        getState: jest.fn().mockResolvedValue('delayed'),
        remove: jest.fn().mockResolvedValue(undefined),
      };
      queue.getJob.mockResolvedValue(mockJob);

      // Act
      await service.cancelDeletion(JOB_ID, 'Customer withdrew request');

      // Assert
      expect(loggerService.log).toHaveBeenCalledWith(
        expect.stringContaining('cancelled'),
        'GdprDeletionService',
      );
      expect(loggerService.log).toHaveBeenCalledWith(
        expect.stringContaining('Customer withdrew request'),
        'GdprDeletionService',
      );
    });
  });

  // =======================================================================
  // getQueueStats
  // =======================================================================

  describe('getQueueStats', () => {
    it('should return all queue counters', async () => {
      // Arrange
      queue.getWaitingCount.mockResolvedValue(5);
      queue.getActiveCount.mockResolvedValue(2);
      queue.getCompletedCount.mockResolvedValue(100);
      queue.getFailedCount.mockResolvedValue(3);
      queue.getDelayedCount.mockResolvedValue(1);

      // Act
      const stats = await service.getQueueStats();

      // Assert
      expect(stats).toEqual({
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 1,
      });
    });

    it('should return zeros when queue is empty', async () => {
      // Arrange - defaults from beforeEach are all 0

      // Act
      const stats = await service.getQueueStats();

      // Assert
      expect(stats.waiting).toBe(0);
      expect(stats.active).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.delayed).toBe(0);
    });
  });

  // =======================================================================
  // Full deletion flow integration (unit-level)
  // =======================================================================

  describe('full deletion flow', () => {
    beforeEach(() => {
      prisma.customerEncrypted.findFirst.mockResolvedValue(MOCK_CUSTOMER);
      prisma.customerEncrypted.update.mockResolvedValue({
        ...MOCK_CUSTOMER,
        isDeleted: true,
      });
      prisma.dataSubjectRequest.update.mockResolvedValue({ id: REQUEST_ID });
      prisma.callRecordings.findMany.mockResolvedValue(MOCK_RECORDINGS);
      prisma.callRecordings.update.mockResolvedValue({ id: 'rec-001' });
      queue.getJob.mockResolvedValue(null);
    });

    it('should execute complete deletion: queue -> snapshot -> anonymize -> recordings', async () => {
      // Step 1: Queue the deletion
      const queueResult = await service.queueDeletion(
        CUSTOMER_ID,
        TENANT_ID,
        REQUEST_ID,
        'Right to be forgotten',
      );
      expect(queueResult.status).toBe('QUEUED');

      // Step 2: Create deletion snapshot
      const snapshot = await service.createDeletionSnapshot(
        CUSTOMER_ID,
        TENANT_ID,
        REQUEST_ID,
      );
      expect(snapshot.snapshotId).toBeDefined();
      expect(snapshot.dataCategories).toContain('customer');

      // Step 3: Anonymize customer data
      const anonymizationResult = await service.anonymizeCustomer(
        CUSTOMER_ID,
        TENANT_ID,
        REQUEST_ID,
      );
      expect(anonymizationResult.success).toBe(true);
      expect(anonymizationResult.anonymizedFields).toContain('phoneEncrypted');
      expect(anonymizationResult.anonymizedFields).toContain('emailEncrypted');
      expect(anonymizationResult.anonymizedFields).toContain('nameEncrypted');

      // Step 4: Delete call recordings
      const recordingResult = await service.deleteCallRecordings(
        CUSTOMER_ID,
        TENANT_ID,
      );
      expect(recordingResult.success).toBe(true);
      expect(recordingResult.deletedCount).toBe(2);
    });

    it('should preserve referential integrity after full deletion', async () => {
      // Execute anonymization
      const result = await service.anonymizeCustomer(
        CUSTOMER_ID,
        TENANT_ID,
        REQUEST_ID,
      );

      // Preserved fields (bookings, vehicles) allow historical reporting
      expect(result.preservedFields).toContain('bookings');
      expect(result.preservedFields).toContain('vehicles');
      expect(result.preservedFields).toContain('id');
    });

    it('should generate audit trail through entire flow', async () => {
      // Execute full flow
      await service.createDeletionSnapshot(CUSTOMER_ID, TENANT_ID, REQUEST_ID);
      await service.anonymizeCustomer(CUSTOMER_ID, TENANT_ID, REQUEST_ID);
      await service.deleteCallRecordings(CUSTOMER_ID, TENANT_ID);

      // Verify audit entries: snapshot + anonymization + recording deletion
      const auditCalls = prisma.auditLog.create.mock.calls;
      const actions = auditCalls.map(
        (call: [{ data: { action: string } }]) => call[0].data.action,
      );

      expect(actions).toContain('DELETION_SNAPSHOT_CREATED');
      expect(actions).toContain('CUSTOMER_ANONYMIZED');
      expect(actions).toContain('CALL_RECORDINGS_DELETED');
    });
  });

  // =======================================================================
  // Tenant isolation (cross-cutting)
  // =======================================================================

  describe('tenant isolation', () => {
    it('should never allow cross-tenant data access in queueDeletion', async () => {
      // Arrange
      prisma.customerEncrypted.findFirst.mockResolvedValue(null);

      // Act - try to delete a customer belonging to another tenant
      await expect(
        service.queueDeletion(CUSTOMER_ID, OTHER_TENANT_ID, REQUEST_ID, 'reason'),
      ).rejects.toThrow(NotFoundException);

      // Assert - withTenant was called with OTHER_TENANT_ID (not the customer's tenant)
      expect(prisma.withTenant).toHaveBeenCalledWith(
        OTHER_TENANT_ID,
        expect.any(Function),
      );
    });

    it('should pass tenantId consistently through snapshot creation', async () => {
      // Arrange
      prisma.customerEncrypted.findFirst.mockResolvedValue(MOCK_CUSTOMER);
      prisma.dataSubjectRequest.update.mockResolvedValue({ id: REQUEST_ID });

      // Act
      await service.createDeletionSnapshot(CUSTOMER_ID, TENANT_ID, REQUEST_ID);

      // Assert - all withTenant calls use correct tenantId
      const tenantIds = prisma.withTenant.mock.calls.map(
        (call: [string, unknown]) => call[0],
      );
      expect(tenantIds.every((id: string) => id === TENANT_ID)).toBe(true);
    });

    it('should include tenantId in all audit log entries', async () => {
      // Arrange
      prisma.customerEncrypted.findFirst.mockResolvedValue({
        ...MOCK_CUSTOMER,
        bookings: [{ id: 'booking-001' }],
      });

      // Act
      await service.verifyIdentity(CUSTOMER_ID, TENANT_ID, {
        method: 'PHONE',
        phoneVerified: true,
      });

      // Assert
      for (const call of prisma.auditLog.create.mock.calls) {
        const data = (call[0] as { data: { tenantId: string } }).data;
        expect(data.tenantId).toBe(TENANT_ID);
      }
    });
  });

  // =======================================================================
  // GDPR compliance checks
  // =======================================================================

  describe('GDPR compliance', () => {
    it('should respect right to be forgotten by anonymizing rather than deleting', async () => {
      // Arrange
      prisma.customerEncrypted.findFirst.mockResolvedValue(MOCK_CUSTOMER);
      prisma.customerEncrypted.update.mockResolvedValue({ id: CUSTOMER_ID });

      // Act
      const result = await service.anonymizeCustomer(
        CUSTOMER_ID,
        TENANT_ID,
        REQUEST_ID,
      );

      // Assert - data is anonymized, not hard-deleted
      expect(result.anonymizedFields.length).toBeGreaterThan(0);
      expect(result.preservedFields).toContain('id'); // Record structure preserved
      // The update call uses 'DELETED' markers, not actual deletion
      expect(encryption.encrypt).toHaveBeenCalledWith('DELETED');
    });

    it('should create a snapshot before any deletion for legal retention', async () => {
      // Arrange
      prisma.customerEncrypted.findFirst.mockResolvedValue(MOCK_CUSTOMER);
      prisma.dataSubjectRequest.update.mockResolvedValue({ id: REQUEST_ID });

      // Act
      const snapshot = await service.createDeletionSnapshot(
        CUSTOMER_ID,
        TENANT_ID,
        REQUEST_ID,
      );

      // Assert
      expect(snapshot.snapshotId).toBeDefined();
      expect(snapshot.expiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(snapshot.checksum).toBeTruthy();
    });

    it('should enforce 24-hour SLA deadline on deletion requests', async () => {
      // Arrange
      prisma.customerEncrypted.findFirst.mockResolvedValue({
        id: CUSTOMER_ID,
        tenantId: TENANT_ID,
      });
      prisma.dataSubjectRequest.update.mockResolvedValue({ id: REQUEST_ID });
      queue.getJob.mockResolvedValue(null);

      // Act
      const result = await service.queueDeletion(
        CUSTOMER_ID,
        TENANT_ID,
        REQUEST_ID,
        'GDPR Art. 17',
      );

      // Assert
      const hoursToSla =
        (result.slaDeadline.getTime() - Date.now()) / (1000 * 60 * 60);
      expect(hoursToSla).toBeLessThanOrEqual(24);
      expect(hoursToSla).toBeGreaterThan(23);
    });

    it('should retain deletion snapshots for 30 days', async () => {
      // Arrange
      prisma.customerEncrypted.findFirst.mockResolvedValue(MOCK_CUSTOMER);
      prisma.dataSubjectRequest.update.mockResolvedValue({ id: REQUEST_ID });

      // Act
      const snapshot = await service.createDeletionSnapshot(
        CUSTOMER_ID,
        TENANT_ID,
        REQUEST_ID,
      );

      // Assert
      const retentionDays =
        (snapshot.expiresAt.getTime() - snapshot.createdAt.getTime()) /
        (1000 * 60 * 60 * 24);
      expect(Math.round(retentionDays)).toBe(30);
    });

    it('should never include raw PII in snapshot data sent to encrypt', async () => {
      // Arrange
      prisma.customerEncrypted.findFirst.mockResolvedValue(MOCK_CUSTOMER);
      prisma.dataSubjectRequest.update.mockResolvedValue({ id: REQUEST_ID });

      // Act
      await service.createDeletionSnapshot(CUSTOMER_ID, TENANT_ID, REQUEST_ID);

      // Assert - the encrypted content should NOT contain raw PII buffers
      const encryptCallArg = encryption.encrypt.mock.calls[0][0] as string;
      expect(encryptCallArg).not.toContain('phoneEncrypted');
      expect(encryptCallArg).not.toContain('emailEncrypted');
      expect(encryptCallArg).not.toContain('nameEncrypted');
    });

    it('should allow cancellation before execution starts', async () => {
      // Arrange
      const mockJob: Partial<MockJob> = {
        id: `deletion:${CUSTOMER_ID}`,
        getState: jest.fn().mockResolvedValue('waiting'),
        remove: jest.fn().mockResolvedValue(undefined),
      };
      queue.getJob.mockResolvedValue(mockJob);

      // Act
      const result = await service.cancelDeletion(
        `deletion:${CUSTOMER_ID}`,
        'Customer withdrew consent',
      );

      // Assert
      expect(result.success).toBe(true);
    });

    it('should configure BullMQ job with retry policy for reliability', async () => {
      // Arrange
      prisma.customerEncrypted.findFirst.mockResolvedValue({
        id: CUSTOMER_ID,
        tenantId: TENANT_ID,
      });
      prisma.dataSubjectRequest.update.mockResolvedValue({ id: REQUEST_ID });
      queue.getJob.mockResolvedValue(null);

      // Act
      await service.queueDeletion(CUSTOMER_ID, TENANT_ID, REQUEST_ID, 'reason');

      // Assert
      const addCallOptions = queue.add.mock.calls[0][2] as {
        attempts: number;
        backoff: { type: string; delay: number };
      };
      expect(addCallOptions.attempts).toBe(3);
      expect(addCallOptions.backoff.type).toBe('exponential');
      expect(addCallOptions.backoff.delay).toBe(60000);
    });

    it('should soft-delete recordings with GDPR deletion reason marker', async () => {
      // Arrange
      prisma.callRecordings.findMany.mockResolvedValue([MOCK_RECORDINGS[0]]);
      prisma.callRecordings.update.mockResolvedValue({ id: 'rec-001' });

      // Act
      await service.deleteCallRecordings(CUSTOMER_ID, TENANT_ID);

      // Assert
      expect(prisma.callRecordings.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deletionReason: 'GDPR_DELETION_REQUEST',
            recordingUrl: null, // URL removed
          }),
        }),
      );
    });
  });

  // =======================================================================
  // Error handling edge cases
  // =======================================================================

  describe('error handling', () => {
    it('should handle concurrent deletion requests for same customer', async () => {
      // Arrange
      prisma.customerEncrypted.findFirst.mockResolvedValue({
        id: CUSTOMER_ID,
        tenantId: TENANT_ID,
      });
      const activeJob: Partial<MockJob> = {
        id: `deletion:${CUSTOMER_ID}`,
        getState: jest.fn().mockResolvedValue('active'),
      };
      queue.getJob.mockResolvedValue(activeJob);

      // Act & Assert
      await expect(
        service.queueDeletion(CUSTOMER_ID, TENANT_ID, REQUEST_ID, 'reason'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle encryption service failure during anonymization', async () => {
      // Arrange
      prisma.customerEncrypted.findFirst.mockResolvedValue(MOCK_CUSTOMER);
      encryption.encrypt.mockImplementation(() => {
        throw new Error('Encryption key expired');
      });

      // Act
      const result = await service.anonymizeCustomer(
        CUSTOMER_ID,
        TENANT_ID,
        REQUEST_ID,
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('Encryption key expired');
    });

    it('should handle missing timestamps gracefully in job status', async () => {
      // Arrange
      const mockJob: Partial<MockJob> = {
        id: 'job-123',
        getState: jest.fn().mockResolvedValue('waiting'),
        progress: 0,
        attemptsMade: 0,
        timestamp: 0, // falsy timestamp
        processedOn: undefined,
        finishedOn: undefined,
        failedReason: undefined,
      };
      queue.getJob.mockResolvedValue(mockJob);

      // Act
      const result = await service.getJobStatus('job-123');

      // Assert
      expect(result.processedAt).toBeUndefined();
      expect(result.completedAt).toBeUndefined();
    });

    it('should handle queue add failure', async () => {
      // Arrange
      prisma.customerEncrypted.findFirst.mockResolvedValue({
        id: CUSTOMER_ID,
        tenantId: TENANT_ID,
      });
      prisma.dataSubjectRequest.update.mockResolvedValue({ id: REQUEST_ID });
      queue.getJob.mockResolvedValue(null);
      queue.add.mockRejectedValue(new Error('Redis connection refused'));

      // Act & Assert
      await expect(
        service.queueDeletion(CUSTOMER_ID, TENANT_ID, REQUEST_ID, 'reason'),
      ).rejects.toThrow('Redis connection refused');
    });

    it('should handle prisma withTenant callback error in recording deletion', async () => {
      // Arrange
      prisma.withTenant.mockRejectedValue(new Error('Tenant context error'));

      // Act
      const result = await service.deleteCallRecordings(CUSTOMER_ID, TENANT_ID);

      // Assert
      expect(result.success).toBe(false);
      expect(result.failedDeletions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            reason: 'Tenant context error',
          }),
        ]),
      );
    });
  });
});
