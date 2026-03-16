import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bullmq';
import { PrismaService } from '@common/services/prisma.service';
import { EncryptionService } from '@common/services/encryption.service';
import { LoggerService } from '@common/services/logger.service';
import { GdprDeletionService, AnonymizationResult } from './gdpr-deletion.service';

// ---------------------------------------------------------------------------
// Mock types
// ---------------------------------------------------------------------------

interface MockQueue {
  add: jest.Mock;
  getJob: jest.Mock;
  getWaitingCount: jest.Mock;
  getActiveCount: jest.Mock;
  getCompletedCount: jest.Mock;
  getFailedCount: jest.Mock;
  getDelayedCount: jest.Mock;
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

interface MockLoggerService {
  log: jest.Mock;
  warn: jest.Mock;
  error: jest.Mock;
  debug: jest.Mock;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-550e8400-e29b-41d4-a716-446655440000';
const CUSTOMER_ID = 'cust-660e8400-e29b-41d4-a716-446655440001';
const REQUEST_ID = 'req-770e8400-e29b-41d4-a716-446655440002';

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
      Invoice: [],
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
  },
  {
    id: 'rec-002',
    customerId: CUSTOMER_ID,
    tenantId: TENANT_ID,
    durationSeconds: 60,
    deletedAt: null,
  },
];

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

const createMockQueue = (): MockQueue => ({
  add: jest.fn(),
  getJob: jest.fn(),
  getWaitingCount: jest.fn().mockResolvedValue(0),
  getActiveCount: jest.fn().mockResolvedValue(0),
  getCompletedCount: jest.fn().mockResolvedValue(0),
  getFailedCount: jest.fn().mockResolvedValue(0),
  getDelayedCount: jest.fn().mockResolvedValue(0),
});

const createMockJob = (overrides?: Partial<MockJob>): MockJob => ({
  id: 'job-001',
  getState: jest.fn().mockResolvedValue('waiting'),
  progress: 0,
  attemptsMade: 0,
  timestamp: Date.now(),
  processedOn: undefined,
  finishedOn: undefined,
  failedReason: undefined,
  remove: jest.fn(),
  ...overrides,
});

const createMockLogger = (): MockLoggerService => ({
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GdprDeletionService', () => {
  let service: GdprDeletionService;
  let mockPrisma: Record<string, jest.Mock>;
  let mockEncryption: { encrypt: jest.Mock; decrypt: jest.Mock; hash: jest.Mock };
  let mockQueue: MockQueue;
  let mockLogger: MockLoggerService;

  // Inner mock models for withTenant callback
  let mockPrismaModels: {
    customerEncrypted: { findFirst: jest.Mock; update: jest.Mock };
    dataSubjectRequest: { update: jest.Mock };
    auditLog: { create: jest.Mock };
    callRecording: { findMany: jest.Mock; updateMany: jest.Mock };
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockPrismaModels = {
      customerEncrypted: { findFirst: jest.fn(), update: jest.fn() },
      dataSubjectRequest: { update: jest.fn() },
      auditLog: { create: jest.fn() },
      callRecording: { findMany: jest.fn(), updateMany: jest.fn() },
    };

    mockPrisma = {
      withTenant: jest
        .fn()
        .mockImplementation(
          (_tenantId: string, cb: (prisma: typeof mockPrismaModels) => Promise<unknown>) =>
            cb(mockPrismaModels),
        ),
      customerEncrypted: mockPrismaModels.customerEncrypted as unknown as jest.Mock,
    };

    mockEncryption = {
      encrypt: jest.fn().mockReturnValue('encrypted-value'),
      decrypt: jest.fn().mockReturnValue('decrypted-value'),
      hash: jest.fn().mockReturnValue('hashed-value'),
    };

    mockQueue = createMockQueue();
    mockLogger = createMockLogger();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GdprDeletionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EncryptionService, useValue: mockEncryption },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: LoggerService, useValue: mockLogger },
        { provide: getQueueToken('gdpr-deletion'), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<GdprDeletionService>(GdprDeletionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // -----------------------------------------------------------------------
  // queueDeletion
  // -----------------------------------------------------------------------

  describe('queueDeletion', () => {
    it('should queue deletion job for existing customer', async () => {
      mockPrismaModels.customerEncrypted.findFirst.mockResolvedValueOnce({
        id: CUSTOMER_ID,
        tenantId: TENANT_ID,
      });
      mockQueue.getJob.mockResolvedValueOnce(null);
      mockQueue.add.mockResolvedValueOnce({ id: `deletion:${CUSTOMER_ID}` });

      const result = await service.queueDeletion(
        CUSTOMER_ID,
        TENANT_ID,
        REQUEST_ID,
        'Customer request',
      );

      expect(result.jobId).toBe(`deletion:${CUSTOMER_ID}`);
      expect(result.status).toBe('QUEUED');
      expect(result.estimatedCompletion).toBeInstanceOf(Date);
      expect(result.slaDeadline).toBeInstanceOf(Date);

      // Verify request status updated
      expect(mockPrismaModels.dataSubjectRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: REQUEST_ID },
          data: { status: 'IN_PROGRESS' },
        }),
      );
    });

    it('should throw NotFoundException if customer not found', async () => {
      mockPrismaModels.customerEncrypted.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.queueDeletion(CUSTOMER_ID, TENANT_ID, REQUEST_ID, 'reason'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if deletion already in progress', async () => {
      mockPrismaModels.customerEncrypted.findFirst.mockResolvedValueOnce({
        id: CUSTOMER_ID,
        tenantId: TENANT_ID,
      });
      const activeJob = createMockJob();
      activeJob.getState.mockResolvedValueOnce('active');
      mockQueue.getJob.mockResolvedValueOnce(activeJob);

      await expect(
        service.queueDeletion(CUSTOMER_ID, TENANT_ID, REQUEST_ID, 'reason'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // -----------------------------------------------------------------------
  // anonymizeCustomer
  // -----------------------------------------------------------------------

  describe('anonymizeCustomer', () => {
    it('should anonymize all PII fields', async () => {
      mockPrismaModels.customerEncrypted.findFirst.mockResolvedValueOnce(MOCK_CUSTOMER);
      mockPrismaModels.customerEncrypted.update.mockResolvedValueOnce({});
      mockPrismaModels.auditLog.create.mockResolvedValueOnce({});

      const result: AnonymizationResult = await service.anonymizeCustomer(
        CUSTOMER_ID,
        TENANT_ID,
        REQUEST_ID,
      );

      expect(result.success).toBe(true);
      expect(result.customerId).toBe(CUSTOMER_ID);
      expect(result.anonymizedFields).toContain('phoneEncrypted');
      expect(result.anonymizedFields).toContain('emailEncrypted');
      expect(result.anonymizedFields).toContain('nameEncrypted');
      expect(result.preservedFields).toContain('id');
      expect(result.preservedFields).toContain('tenantId');
    });

    it('should set isDeleted, deletedAt, anonymizedAt, and clear consents', async () => {
      mockPrismaModels.customerEncrypted.findFirst.mockResolvedValueOnce(MOCK_CUSTOMER);
      mockPrismaModels.customerEncrypted.update.mockResolvedValueOnce({});
      mockPrismaModels.auditLog.create.mockResolvedValueOnce({});

      await service.anonymizeCustomer(CUSTOMER_ID, TENANT_ID, REQUEST_ID);

      expect(mockPrismaModels.customerEncrypted.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            gdprConsent: false,
            marketingConsent: false,
            callRecordingConsent: false,
            isDeleted: true,
            dataRetentionDays: 0,
            dataSubjectRequestId: REQUEST_ID,
          }),
        }),
      );
    });

    it('should encrypt PII with "DELETED" value', async () => {
      mockPrismaModels.customerEncrypted.findFirst.mockResolvedValueOnce(MOCK_CUSTOMER);
      mockPrismaModels.customerEncrypted.update.mockResolvedValueOnce({});
      mockPrismaModels.auditLog.create.mockResolvedValueOnce({});

      await service.anonymizeCustomer(CUSTOMER_ID, TENANT_ID, REQUEST_ID);

      // encrypt should be called 3 times: phone, email, name
      expect(mockEncryption.encrypt).toHaveBeenCalledTimes(3);
      expect(mockEncryption.encrypt).toHaveBeenCalledWith('DELETED');
    });

    it('should create audit log entry', async () => {
      mockPrismaModels.customerEncrypted.findFirst.mockResolvedValueOnce(MOCK_CUSTOMER);
      mockPrismaModels.customerEncrypted.update.mockResolvedValueOnce({});
      mockPrismaModels.auditLog.create.mockResolvedValueOnce({});

      await service.anonymizeCustomer(CUSTOMER_ID, TENANT_ID, REQUEST_ID);

      expect(mockPrismaModels.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            action: 'CUSTOMER_ANONYMIZED',
            tableName: 'customers_encrypted',
            recordId: CUSTOMER_ID,
          }),
        }),
      );
    });

    it('should return failure result if customer not found', async () => {
      mockPrismaModels.customerEncrypted.findFirst.mockResolvedValueOnce(null);

      const result = await service.anonymizeCustomer(CUSTOMER_ID, TENANT_ID, REQUEST_ID);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });

  // -----------------------------------------------------------------------
  // deleteCallRecordings
  // -----------------------------------------------------------------------

  describe('deleteCallRecordings', () => {
    it('should soft-delete all recordings and reclaim storage', async () => {
      mockPrismaModels.callRecording.findMany.mockResolvedValueOnce(MOCK_RECORDINGS);
      mockPrismaModels.callRecording.updateMany.mockResolvedValueOnce({ count: 2 });
      mockPrismaModels.auditLog.create.mockResolvedValueOnce({});

      const result = await service.deleteCallRecordings(CUSTOMER_ID, TENANT_ID);

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(2);
      expect(result.storageReclaimed).toBeGreaterThan(0);
      expect(result.failedDeletions).toHaveLength(0);
    });

    it('should return success with zero count when no recordings exist', async () => {
      mockPrismaModels.callRecording.findMany.mockResolvedValueOnce([]);

      const result = await service.deleteCallRecordings(CUSTOMER_ID, TENANT_ID);

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(0);
    });

    it('should set deletionReason to GDPR_DELETION_REQUEST', async () => {
      mockPrismaModels.callRecording.findMany.mockResolvedValueOnce(MOCK_RECORDINGS);
      mockPrismaModels.callRecording.updateMany.mockResolvedValueOnce({ count: 2 });
      mockPrismaModels.auditLog.create.mockResolvedValueOnce({});

      await service.deleteCallRecordings(CUSTOMER_ID, TENANT_ID);

      expect(mockPrismaModels.callRecording.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deletionReason: 'GDPR_DELETION_REQUEST',
            recordingUrl: null,
          }),
        }),
      );
    });

    it('should handle updateMany failure gracefully', async () => {
      mockPrismaModels.callRecording.findMany.mockResolvedValueOnce(MOCK_RECORDINGS);
      mockPrismaModels.callRecording.updateMany.mockRejectedValueOnce(new Error('DB error'));

      const result = await service.deleteCallRecordings(CUSTOMER_ID, TENANT_ID);

      expect(result.success).toBe(false);
      expect(result.failedDeletions.length).toBeGreaterThan(0);
    });
  });

  // -----------------------------------------------------------------------
  // createDeletionSnapshot
  // -----------------------------------------------------------------------

  describe('createDeletionSnapshot', () => {
    it('should create encrypted snapshot with correct metadata', async () => {
      mockPrismaModels.customerEncrypted.findFirst.mockResolvedValueOnce(MOCK_CUSTOMER);
      mockPrismaModels.dataSubjectRequest.update.mockResolvedValueOnce({});
      mockPrismaModels.auditLog.create.mockResolvedValueOnce({});

      const snapshot = await service.createDeletionSnapshot(CUSTOMER_ID, TENANT_ID, REQUEST_ID);

      expect(snapshot.customerId).toBe(CUSTOMER_ID);
      expect(snapshot.tenantId).toBe(TENANT_ID);
      expect(snapshot.requestId).toBe(REQUEST_ID);
      expect(snapshot.dataCategories).toEqual(['customer', 'vehicles', 'bookings']);
      expect(snapshot.storageLocation).toContain(`snapshots/${TENANT_ID}/`);
      expect(snapshot.checksum).toBeDefined();
      expect(snapshot.fileSize).toBeGreaterThan(0);
      expect(snapshot.expiresAt.getTime()).toBeGreaterThan(snapshot.createdAt.getTime());
    });

    it('should encrypt snapshot content via EncryptionService', async () => {
      mockPrismaModels.customerEncrypted.findFirst.mockResolvedValueOnce(MOCK_CUSTOMER);
      mockPrismaModels.dataSubjectRequest.update.mockResolvedValueOnce({});
      mockPrismaModels.auditLog.create.mockResolvedValueOnce({});

      await service.createDeletionSnapshot(CUSTOMER_ID, TENANT_ID, REQUEST_ID);

      expect(mockEncryption.encrypt).toHaveBeenCalledWith(expect.any(String));
    });

    it('should throw NotFoundException if customer not found', async () => {
      mockPrismaModels.customerEncrypted.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.createDeletionSnapshot(CUSTOMER_ID, TENANT_ID, REQUEST_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // getJobStatus
  // -----------------------------------------------------------------------

  describe('getJobStatus', () => {
    it('should return job status details', async () => {
      const mockJob = createMockJob({
        id: 'deletion:cust-001',
        progress: 50,
        attemptsMade: 1,
      });
      mockJob.getState.mockResolvedValueOnce('active');
      mockQueue.getJob.mockResolvedValueOnce(mockJob);

      const result = await service.getJobStatus('deletion:cust-001');

      expect(result.jobId).toBe('deletion:cust-001');
      expect(result.state).toBe('active');
      expect(result.progress).toBe(50);
      expect(result.attempts).toBe(1);
    });

    it('should throw NotFoundException for unknown job', async () => {
      mockQueue.getJob.mockResolvedValueOnce(null);

      await expect(service.getJobStatus('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // cancelDeletion
  // -----------------------------------------------------------------------

  describe('cancelDeletion', () => {
    it('should cancel a waiting job', async () => {
      const mockJob = createMockJob();
      mockJob.getState.mockResolvedValueOnce('waiting');
      mockQueue.getJob.mockResolvedValueOnce(mockJob);

      const result = await service.cancelDeletion('job-001', 'Customer changed mind');

      expect(result.success).toBe(true);
      expect(mockJob.remove).toHaveBeenCalled();
    });

    it('should not cancel a completed job', async () => {
      const mockJob = createMockJob();
      mockJob.getState.mockResolvedValueOnce('completed');
      mockQueue.getJob.mockResolvedValueOnce(mockJob);

      const result = await service.cancelDeletion('job-001', 'reason');

      expect(result.success).toBe(false);
      expect(result.message).toContain('completed');
    });

    it('should not cancel a failed job', async () => {
      const mockJob = createMockJob();
      mockJob.getState.mockResolvedValueOnce('failed');
      mockQueue.getJob.mockResolvedValueOnce(mockJob);

      const result = await service.cancelDeletion('job-001', 'reason');

      expect(result.success).toBe(false);
      expect(result.message).toContain('failed');
    });

    it('should return failure when job not found', async () => {
      mockQueue.getJob.mockResolvedValueOnce(null);

      const result = await service.cancelDeletion('nonexistent', 'reason');

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });
  });

  // -----------------------------------------------------------------------
  // getQueueStats
  // -----------------------------------------------------------------------

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      mockQueue.getWaitingCount.mockResolvedValueOnce(3);
      mockQueue.getActiveCount.mockResolvedValueOnce(1);
      mockQueue.getCompletedCount.mockResolvedValueOnce(50);
      mockQueue.getFailedCount.mockResolvedValueOnce(2);
      mockQueue.getDelayedCount.mockResolvedValueOnce(0);

      const stats = await service.getQueueStats();

      expect(stats).toEqual({
        waiting: 3,
        active: 1,
        completed: 50,
        failed: 2,
        delayed: 0,
      });
    });
  });
});
