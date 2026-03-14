import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bullmq';
import { DataRetentionService, RetentionPolicy } from './data-retention.service';
import { PrismaService } from '@common/services/prisma.service';
import { EncryptionService } from '@common/services/encryption.service';
import { LoggerService } from '@common/services/logger.service';

describe('DataRetentionService', () => {
  let service: DataRetentionService;
  let prisma: {
    withTenant: jest.Mock;
    dataRetentionExecutionLog: {
      create: jest.Mock;
      updateMany: jest.Mock;
    };
    customerEncrypted: {
      findMany: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
    consentAuditLog: {
      findMany: jest.Mock;
      updateMany: jest.Mock;
    };
    booking: {
      count: jest.Mock;
    };
    callRecordings: {
      findMany: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
    auditLog: {
      deleteMany: jest.Mock;
    };
    dataSubjectRequest: {
      findMany: jest.Mock;
      update: jest.Mock;
    };
    tenant: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    $executeRaw: jest.Mock;
  };
  let encryption: { encrypt: jest.Mock };
  let configService: { get: jest.Mock };
  let loggerService: { log: jest.Mock; warn: jest.Mock; error: jest.Mock; debug: jest.Mock };
  let retentionQueue: { add: jest.Mock };

  const TENANT_ID = 'tenant-001';
  const CUSTOMER_ID = 'customer-001';

  beforeEach(async () => {
    prisma = {
      withTenant: jest.fn((_tenantId: string, cb: (p: typeof prisma) => Promise<void>) =>
        cb(prisma),
      ),
      dataRetentionExecutionLog: {
        create: jest.fn().mockResolvedValue({ id: 'exec-001' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      customerEncrypted: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
        count: jest.fn().mockResolvedValue(0),
      },
      consentAuditLog: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      booking: {
        count: jest.fn().mockResolvedValue(0),
      },
      callRecordings: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
        count: jest.fn().mockResolvedValue(0),
      },
      auditLog: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      dataSubjectRequest: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
      },
      tenant: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({}),
      },
      $executeRaw: jest.fn().mockResolvedValue(0),
    } as unknown as typeof prisma;

    encryption = {
      encrypt: jest.fn().mockReturnValue('encrypted-value'),
    };

    configService = {
      get: jest.fn().mockImplementation((key: string, defaultVal: string) => defaultVal),
    };

    loggerService = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    retentionQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-001' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataRetentionService,
        { provide: PrismaService, useValue: prisma },
        { provide: EncryptionService, useValue: encryption },
        { provide: ConfigService, useValue: configService },
        { provide: LoggerService, useValue: loggerService },
        { provide: getQueueToken('gdpr-retention'), useValue: retentionQueue },
      ],
    }).compile();

    service = module.get<DataRetentionService>(DataRetentionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =========================================================================
  // getRetentionPolicy
  // =========================================================================
  describe('getRetentionPolicy', () => {
    it('should return default retention policy when no env vars set', () => {
      const policy = service.getRetentionPolicy();

      expect(policy).toEqual<RetentionPolicy>({
        customerDataDays: 2555,
        bookingDataDays: 30,
        optOutDataDays: 30,
        callRecordingDays: 30,
        auditLogDays: 365,
        webhookEventDays: 90,
        consentAuditLogDays: 2555,
      });
    });

    it('should return custom values from config', () => {
      configService.get.mockImplementation((key: string) => {
        const map: Record<string, string> = {
          GDPR_CUSTOMER_RETENTION_DAYS: '1000',
          GDPR_BOOKING_RETENTION_DAYS: '60',
          GDPR_OPTOUT_RETENTION_DAYS: '15',
          GDPR_RECORDING_RETENTION_DAYS: '45',
          GDPR_AUDIT_LOG_DAYS: '180',
          GDPR_WEBHOOK_EVENT_DAYS: '30',
          GDPR_CONSENT_LOG_DAYS: '3650',
        };
        return map[key];
      });

      const policy = service.getRetentionPolicy();

      expect(policy.customerDataDays).toBe(1000);
      expect(policy.bookingDataDays).toBe(60);
      expect(policy.optOutDataDays).toBe(15);
      expect(policy.callRecordingDays).toBe(45);
      expect(policy.auditLogDays).toBe(180);
      expect(policy.webhookEventDays).toBe(30);
      expect(policy.consentAuditLogDays).toBe(3650);
    });

    it('should call config.get for each policy field', () => {
      service.getRetentionPolicy();

      expect(configService.get).toHaveBeenCalledWith('GDPR_CUSTOMER_RETENTION_DAYS', '2555');
      expect(configService.get).toHaveBeenCalledWith('GDPR_BOOKING_RETENTION_DAYS', '30');
      expect(configService.get).toHaveBeenCalledWith('GDPR_OPTOUT_RETENTION_DAYS', '30');
      expect(configService.get).toHaveBeenCalledWith('GDPR_RECORDING_RETENTION_DAYS', '30');
      expect(configService.get).toHaveBeenCalledWith('GDPR_AUDIT_LOG_DAYS', '365');
      expect(configService.get).toHaveBeenCalledWith('GDPR_WEBHOOK_EVENT_DAYS', '90');
      expect(configService.get).toHaveBeenCalledWith('GDPR_CONSENT_LOG_DAYS', '2555');
    });
  });

  // =========================================================================
  // enforceRetentionPolicy
  // =========================================================================
  describe('enforceRetentionPolicy', () => {
    it('should create execution log at start', async () => {
      await service.enforceRetentionPolicy();

      expect(prisma.dataRetentionExecutionLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: null,
          executionType: 'RETENTION_POLICY',
          status: 'RUNNING',
          retentionDaysApplied: 2555,
        }),
      });
    });

    it('should pass tenantId to execution log when provided', async () => {
      await service.enforceRetentionPolicy(TENANT_ID);

      expect(prisma.dataRetentionExecutionLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
        }),
      });
    });

    it('should return success result when no errors', async () => {
      const result = await service.enforceRetentionPolicy();

      expect(result.success).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.executionId).toMatch(/^retention-\d+$/);
      expect(result.startedAt).toBeInstanceOf(Date);
      expect(result.completedAt).toBeInstanceOf(Date);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should update execution log to COMPLETED on success', async () => {
      await service.enforceRetentionPolicy();

      expect(prisma.dataRetentionExecutionLog.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          executionType: 'RETENTION_POLICY',
        }),
        data: expect.objectContaining({
          status: 'COMPLETED',
          errorMessage: null,
        }),
      });
    });

    it('should count anonymized customers from both expired and opt-out', async () => {
      prisma.customerEncrypted.findMany.mockResolvedValueOnce([
        { id: 'c1', tenantId: TENANT_ID },
        { id: 'c2', tenantId: TENANT_ID },
      ]);
      prisma.consentAuditLog.findMany.mockResolvedValueOnce([
        {
          customer: { id: 'c3', tenantId: TENANT_ID },
        },
      ]);

      const result = await service.enforceRetentionPolicy();

      expect(result.customersAnonymized).toBe(3);
    });

    it('should handle error during sub-step and mark PARTIAL', async () => {
      prisma.customerEncrypted.findMany.mockRejectedValueOnce(new Error('DB connection lost'));

      const result = await service.enforceRetentionPolicy();

      expect(result.success).toBe(false);
      expect(result.errors).toContain('DB connection lost');
      expect(prisma.dataRetentionExecutionLog.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PARTIAL',
            errorMessage: 'DB connection lost',
          }),
        }),
      );
    });

    it('should count bookings, recordings, logs, webhook events', async () => {
      prisma.booking.count.mockResolvedValueOnce(5);
      prisma.callRecordings.findMany.mockResolvedValueOnce([
        { id: 'r1', tenantId: TENANT_ID, recordingSid: 'sid1' },
      ]);
      prisma.auditLog.deleteMany.mockResolvedValueOnce({ count: 10 });
      prisma.$executeRaw.mockResolvedValueOnce(3);

      const result = await service.enforceRetentionPolicy();

      expect(result.bookingsAnonymized).toBe(5);
      expect(result.recordingsDeleted).toBe(1);
      expect(result.logsDeleted).toBe(10);
      expect(result.webhookEventsDeleted).toBe(3);
    });

    it('should filter by tenantId when provided', async () => {
      await service.enforceRetentionPolicy(TENANT_ID);

      expect(prisma.customerEncrypted.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
          }),
        }),
      );
    });
  });

  // =========================================================================
  // scheduledRetentionEnforcement
  // =========================================================================
  describe('scheduledRetentionEnforcement', () => {
    it('should call enforceRetentionPolicy and log result', async () => {
      const spy = jest.spyOn(service, 'enforceRetentionPolicy').mockResolvedValueOnce({
        executionId: 'retention-1',
        startedAt: new Date(),
        completedAt: new Date(),
        durationMs: 100,
        customersAnonymized: 2,
        bookingsAnonymized: 0,
        recordingsDeleted: 1,
        logsDeleted: 5,
        webhookEventsDeleted: 0,
        consentLogsArchived: 0,
        errors: [],
        success: true,
      });

      await service.scheduledRetentionEnforcement();

      expect(spy).toHaveBeenCalled();
      expect(loggerService.log).toHaveBeenCalled();
    });

    it('should catch and log errors without throwing', async () => {
      jest
        .spyOn(service, 'enforceRetentionPolicy')
        .mockRejectedValueOnce(new Error('Scheduled failure'));

      await expect(service.scheduledRetentionEnforcement()).resolves.toBeUndefined();
    });
  });

  // =========================================================================
  // weeklyDeepCleanup
  // =========================================================================
  describe('weeklyDeepCleanup', () => {
    it('should run snapshot cleanup, archive consent logs, and purge soft-deletes', async () => {
      prisma.dataSubjectRequest.findMany.mockResolvedValueOnce([]);
      prisma.consentAuditLog.updateMany.mockResolvedValueOnce({ count: 0 });

      await service.weeklyDeepCleanup();

      expect(prisma.dataSubjectRequest.findMany).toHaveBeenCalled();
      expect(prisma.consentAuditLog.updateMany).toHaveBeenCalled();
      expect(loggerService.log).toHaveBeenCalledWith(
        'Weekly deep cleanup completed',
        'DataRetentionService',
      );
    });

    it('should catch and log errors without throwing', async () => {
      prisma.dataSubjectRequest.findMany.mockRejectedValueOnce(new Error('Cleanup failed'));

      await expect(service.weeklyDeepCleanup()).resolves.toBeUndefined();
    });
  });

  // =========================================================================
  // anonymizeExpiredCustomers (via enforceRetentionPolicy)
  // =========================================================================
  describe('anonymizeExpiredCustomers', () => {
    it('should anonymize customers with encrypted RETENTION_EXPIRED values', async () => {
      prisma.customerEncrypted.findMany.mockResolvedValueOnce([
        { id: CUSTOMER_ID, tenantId: TENANT_ID },
      ]);

      await service.enforceRetentionPolicy();

      expect(prisma.customerEncrypted.update).toHaveBeenCalledWith({
        where: { id: CUSTOMER_ID },
        data: expect.objectContaining({
          gdprConsent: false,
          marketingConsent: false,
          anonymizedAt: expect.any(Date),
        }),
      });
      expect(encryption.encrypt).toHaveBeenCalledWith('RETENTION_EXPIRED');
    });

    it('should use withTenant for tenant isolation', async () => {
      prisma.customerEncrypted.findMany.mockResolvedValueOnce([
        { id: CUSTOMER_ID, tenantId: TENANT_ID },
      ]);

      await service.enforceRetentionPolicy();

      expect(prisma.withTenant).toHaveBeenCalledWith(TENANT_ID, expect.any(Function));
    });

    it('should continue processing remaining customers if one fails', async () => {
      prisma.customerEncrypted.findMany.mockResolvedValueOnce([
        { id: 'c1', tenantId: TENANT_ID },
        { id: 'c2', tenantId: TENANT_ID },
      ]);
      prisma.customerEncrypted.update
        .mockRejectedValueOnce(new Error('Update failed'))
        .mockResolvedValueOnce({});

      const result = await service.enforceRetentionPolicy();

      // c1 failed, c2 succeeded; opt-out step also runs with 0
      expect(result.customersAnonymized).toBe(1);
    });

    it('should query with createdAt cutoff based on retention policy', async () => {
      await service.enforceRetentionPolicy();

      const callArgs = prisma.customerEncrypted.findMany.mock.calls[0][0];
      expect(callArgs.where.createdAt.lt).toBeInstanceOf(Date);
      expect(callArgs.where.anonymizedAt).toBeNull();
      expect(callArgs.where.isDeleted).toBe(false);
    });

    it('should batch process with take: 100', async () => {
      await service.enforceRetentionPolicy();

      expect(prisma.customerEncrypted.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });
  });

  // =========================================================================
  // processOptOutCustomers (via enforceRetentionPolicy)
  // =========================================================================
  describe('processOptOutCustomers', () => {
    it('should anonymize opt-out customers after grace period', async () => {
      prisma.consentAuditLog.findMany.mockResolvedValueOnce([
        {
          customer: { id: CUSTOMER_ID, tenantId: TENANT_ID },
        },
      ]);

      await service.enforceRetentionPolicy();

      expect(encryption.encrypt).toHaveBeenCalledWith('OPTED_OUT');
    });

    it('should skip consent logs without customer reference', async () => {
      prisma.consentAuditLog.findMany.mockResolvedValueOnce([{ customer: null }]);

      const result = await service.enforceRetentionPolicy();

      // Only the expired customers step contributes (0) + opt-out with null customer (0)
      expect(result.customersAnonymized).toBe(0);
    });

    it('should query consentAuditLog with GDPR type and granted=false', async () => {
      await service.enforceRetentionPolicy();

      expect(prisma.consentAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            consentType: 'GDPR',
            granted: false,
          }),
        }),
      );
    });

    it('should handle individual opt-out processing errors gracefully', async () => {
      prisma.consentAuditLog.findMany.mockResolvedValueOnce([
        { customer: { id: 'c1', tenantId: TENANT_ID } },
        { customer: { id: 'c2', tenantId: TENANT_ID } },
      ]);

      // First call is from anonymizeExpiredCustomers (no customers)
      // Then processOptOutCustomers calls withTenant twice
      // We need to handle the interleaving - withTenant is used by both steps
      prisma.withTenant
        .mockImplementationOnce((_t: string, cb: (p: typeof prisma) => Promise<void>) => {
          // First opt-out customer fails
          const failPrisma = {
            ...prisma,
            customerEncrypted: {
              ...prisma.customerEncrypted,
              update: jest.fn().mockRejectedValueOnce(new Error('fail')),
            },
          };
          return cb(failPrisma as typeof prisma);
        })
        .mockImplementationOnce((_t: string, cb: (p: typeof prisma) => Promise<void>) =>
          cb(prisma),
        );

      const result = await service.enforceRetentionPolicy();

      // Only second opt-out customer succeeded
      expect(result.customersAnonymized).toBe(1);
    });
  });

  // =========================================================================
  // anonymizeOldBookings (via enforceRetentionPolicy)
  // =========================================================================
  describe('anonymizeOldBookings', () => {
    it('should count old bookings based on bookingDataDays policy', async () => {
      prisma.booking.count.mockResolvedValueOnce(42);

      const result = await service.enforceRetentionPolicy();

      expect(result.bookingsAnonymized).toBe(42);
      const callArgs = prisma.booking.count.mock.calls[0][0];
      expect(callArgs.where.createdAt.lt).toBeInstanceOf(Date);
    });

    it('should pass tenantId filter when provided', async () => {
      await service.enforceRetentionPolicy(TENANT_ID);

      expect(prisma.booking.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
          }),
        }),
      );
    });
  });

  // =========================================================================
  // deleteExpiredRecordings (via enforceRetentionPolicy)
  // =========================================================================
  describe('deleteExpiredRecordings', () => {
    it('should soft-delete recordings past retentionUntil', async () => {
      prisma.callRecordings.findMany.mockResolvedValueOnce([
        { id: 'rec-1', tenantId: TENANT_ID, recordingSid: 'sid-1' },
        { id: 'rec-2', tenantId: TENANT_ID, recordingSid: 'sid-2' },
      ]);

      const result = await service.enforceRetentionPolicy();

      expect(result.recordingsDeleted).toBe(2);
      expect(prisma.callRecordings.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
          }),
          take: 500,
        }),
      );
    });

    it('should set deletionReason and null out recordingUrl', async () => {
      prisma.callRecordings.findMany.mockResolvedValueOnce([
        { id: 'rec-1', tenantId: TENANT_ID, recordingSid: 'sid-1' },
      ]);

      await service.enforceRetentionPolicy();

      // The update happens inside withTenant callback, which delegates to prisma
      expect(prisma.callRecordings.update).toHaveBeenCalledWith({
        where: { id: 'rec-1' },
        data: expect.objectContaining({
          deletionReason: 'RETENTION_EXPIRED',
          recordingUrl: null,
          deletedAt: expect.any(Date),
        }),
      });
    });

    it('should continue on individual recording deletion failure', async () => {
      prisma.callRecordings.findMany.mockResolvedValueOnce([
        { id: 'rec-1', tenantId: TENANT_ID, recordingSid: 'sid-1' },
        { id: 'rec-2', tenantId: TENANT_ID, recordingSid: 'sid-2' },
      ]);

      prisma.withTenant
        // anonymizeExpiredCustomers - no customers
        // anonymizeOldBookings - not using withTenant
        // deleteExpiredRecordings - first recording
        .mockImplementationOnce((_t: string, cb: (p: typeof prisma) => Promise<void>) => {
          const failPrisma = {
            ...prisma,
            callRecordings: {
              ...prisma.callRecordings,
              update: jest.fn().mockRejectedValueOnce(new Error('S3 error')),
            },
          };
          return cb(failPrisma as typeof prisma);
        })
        // deleteExpiredRecordings - second recording
        .mockImplementationOnce((_t: string, cb: (p: typeof prisma) => Promise<void>) =>
          cb(prisma),
        );

      const result = await service.enforceRetentionPolicy();

      expect(result.recordingsDeleted).toBe(1);
    });
  });

  // =========================================================================
  // deleteOldAuditLogs (via enforceRetentionPolicy)
  // =========================================================================
  describe('deleteOldAuditLogs', () => {
    it('should delete audit logs older than auditLogDays', async () => {
      prisma.auditLog.deleteMany.mockResolvedValueOnce({ count: 25 });

      const result = await service.enforceRetentionPolicy();

      expect(result.logsDeleted).toBe(25);
    });

    it('should exclude GDPR-related actions from deletion', async () => {
      await service.enforceRetentionPolicy();

      expect(prisma.auditLog.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: {
              notIn: [
                'CUSTOMER_ANONYMIZED',
                'DELETION_SNAPSHOT_CREATED',
                'CALL_RECORDINGS_DELETED',
              ],
            },
          }),
        }),
      );
    });
  });

  // =========================================================================
  // deleteOldWebhookEvents (via enforceRetentionPolicy)
  // =========================================================================
  describe('deleteOldWebhookEvents', () => {
    it('should delete webhook events using raw query', async () => {
      prisma.$executeRaw.mockResolvedValueOnce(7);

      const result = await service.enforceRetentionPolicy();

      expect(result.webhookEventsDeleted).toBe(7);
      expect(prisma.$executeRaw).toHaveBeenCalled();
    });

    it('should return 0 if table does not exist', async () => {
      prisma.$executeRaw.mockRejectedValueOnce(
        new Error('relation "voice_webhook_events" does not exist'),
      );

      const result = await service.enforceRetentionPolicy();

      expect(result.webhookEventsDeleted).toBe(0);
    });
  });

  // =========================================================================
  // cleanExpiredSnapshots (via weeklyDeepCleanup)
  // =========================================================================
  describe('cleanExpiredSnapshots', () => {
    it('should null out deletionSnapshotUrl for expired completed requests', async () => {
      prisma.dataSubjectRequest.findMany.mockResolvedValueOnce([
        { id: 'req-1', deletionSnapshotUrl: 's3://snapshots/req-1.json' },
      ]);

      await service.weeklyDeepCleanup();

      expect(prisma.dataSubjectRequest.update).toHaveBeenCalledWith({
        where: { id: 'req-1' },
        data: { deletionSnapshotUrl: null },
      });
    });

    it('should query for COMPLETED requests with non-null snapshot', async () => {
      await service.weeklyDeepCleanup();

      expect(prisma.dataSubjectRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'COMPLETED',
            deletionSnapshotUrl: { not: null },
          }),
        }),
      );
    });

    it('should continue processing on individual snapshot cleanup failure', async () => {
      prisma.dataSubjectRequest.findMany.mockResolvedValueOnce([
        { id: 'req-1', deletionSnapshotUrl: 'url1' },
        { id: 'req-2', deletionSnapshotUrl: 'url2' },
      ]);
      prisma.dataSubjectRequest.update
        .mockRejectedValueOnce(new Error('S3 delete failed'))
        .mockResolvedValueOnce({});

      await service.weeklyDeepCleanup();

      expect(prisma.dataSubjectRequest.update).toHaveBeenCalledTimes(2);
    });
  });

  // =========================================================================
  // archiveOldConsentLogs (via weeklyDeepCleanup)
  // =========================================================================
  describe('archiveOldConsentLogs', () => {
    it('should mark consent logs older than 365 days as archived', async () => {
      prisma.consentAuditLog.updateMany.mockResolvedValueOnce({ count: 15 });

      await service.weeklyDeepCleanup();

      expect(prisma.consentAuditLog.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            metadata: expect.objectContaining({
              path: ['archived'],
              not: true,
            }),
          }),
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              set: expect.objectContaining({
                archived: true,
              }),
            }),
          }),
        }),
      );
    });
  });

  // =========================================================================
  // getTenantRetentionStats
  // =========================================================================
  describe('getTenantRetentionStats', () => {
    it('should return stats for a valid tenant', async () => {
      prisma.tenant.findUnique.mockResolvedValueOnce({
        id: TENANT_ID,
        name: 'Test Garage',
      });
      prisma.customerEncrypted.count
        .mockResolvedValueOnce(100) // activeCustomers
        .mockResolvedValueOnce(5); // pendingAnonymization
      prisma.callRecordings.count.mockResolvedValueOnce(3);

      const stats = await service.getTenantRetentionStats(TENANT_ID);

      expect(stats.tenantId).toBe(TENANT_ID);
      expect(stats.tenantName).toBe('Test Garage');
      expect(stats.activeCustomers).toBe(100);
      expect(stats.customersPendingAnonymization).toBe(5);
      expect(stats.expiredRecordings).toBe(3);
      expect(stats.dataRetentionDays).toBe(2555);
      expect(stats.storageUsed).toBe(0);
    });

    it('should throw if tenant not found', async () => {
      prisma.tenant.findUnique.mockResolvedValueOnce(null);

      await expect(service.getTenantRetentionStats('nonexistent')).rejects.toThrow(
        'Tenant nonexistent not found',
      );
    });

    it('should use tenant-specific dataRetentionDays when present', async () => {
      prisma.tenant.findUnique.mockResolvedValueOnce({
        id: TENANT_ID,
        name: 'Custom Garage',
        dataRetentionDays: 1000,
      });
      prisma.customerEncrypted.count.mockResolvedValue(0);
      prisma.callRecordings.count.mockResolvedValue(0);

      const stats = await service.getTenantRetentionStats(TENANT_ID);

      expect(stats.dataRetentionDays).toBe(1000);
    });

    it('should query active customers with correct filters', async () => {
      prisma.tenant.findUnique.mockResolvedValueOnce({
        id: TENANT_ID,
        name: 'Test',
      });
      prisma.customerEncrypted.count.mockResolvedValue(0);
      prisma.callRecordings.count.mockResolvedValue(0);

      await service.getTenantRetentionStats(TENANT_ID);

      expect(prisma.customerEncrypted.count).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID,
          anonymizedAt: null,
          isDeleted: false,
        },
      });
    });
  });

  // =========================================================================
  // updateTenantRetentionPolicy
  // =========================================================================
  describe('updateTenantRetentionPolicy', () => {
    it('should update tenant settings with valid days', async () => {
      await service.updateTenantRetentionPolicy(TENANT_ID, 365);

      expect(prisma.tenant.update).toHaveBeenCalledWith({
        where: { id: TENANT_ID },
        data: {
          settings: {
            set: { dataRetentionDays: 365 },
          },
        },
      });
      expect(loggerService.log).toHaveBeenCalled();
    });

    it('should throw for days below minimum (30)', async () => {
      await expect(service.updateTenantRetentionPolicy(TENANT_ID, 29)).rejects.toThrow(
        'Retention days must be between 30 and 3650',
      );
    });

    it('should throw for days above maximum (3650)', async () => {
      await expect(service.updateTenantRetentionPolicy(TENANT_ID, 3651)).rejects.toThrow(
        'Retention days must be between 30 and 3650',
      );
    });

    it('should accept boundary value 30', async () => {
      await expect(service.updateTenantRetentionPolicy(TENANT_ID, 30)).resolves.toBeUndefined();
    });

    it('should accept boundary value 3650', async () => {
      await expect(service.updateTenantRetentionPolicy(TENANT_ID, 3650)).resolves.toBeUndefined();
    });
  });

  // =========================================================================
  // queueRetentionEnforcement
  // =========================================================================
  describe('queueRetentionEnforcement', () => {
    it('should add job to retention queue with correct config', async () => {
      const result = await service.queueRetentionEnforcement(TENANT_ID);

      expect(result).toEqual({ jobId: 'job-001', status: 'QUEUED' });
      expect(retentionQueue.add).toHaveBeenCalledWith(
        'enforce-retention',
        expect.objectContaining({
          tenantId: TENANT_ID,
          triggeredAt: expect.any(String),
        }),
        expect.objectContaining({
          jobId: expect.stringContaining(`retention-${TENANT_ID}-`),
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 10000,
          },
        }),
      );
    });

    it('should use "all" in jobId when no tenantId provided', async () => {
      await service.queueRetentionEnforcement();

      expect(retentionQueue.add).toHaveBeenCalledWith(
        'enforce-retention',
        expect.objectContaining({
          tenantId: undefined,
        }),
        expect.objectContaining({
          jobId: expect.stringContaining('retention-all-'),
        }),
      );
    });

    it('should set tenantId to undefined in payload when not provided', async () => {
      await service.queueRetentionEnforcement();

      const payload = retentionQueue.add.mock.calls[0][1];
      expect(payload.tenantId).toBeUndefined();
    });
  });
});
