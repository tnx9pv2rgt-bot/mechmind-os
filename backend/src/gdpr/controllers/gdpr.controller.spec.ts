import { Test, TestingModule } from '@nestjs/testing';
import { GdprController } from './gdpr.controller';
import { GdprDeletionService } from '../services/gdpr-deletion.service';
import { DataRetentionService } from '../services/data-retention.service';
import { GdprConsentService } from '../services/gdpr-consent.service';
import { GdprExportService } from '../services/gdpr-export.service';
import { GdprRequestService } from '../services/gdpr-request.service';

describe('GdprController', () => {
  let controller: GdprController;
  let deletionService: jest.Mocked<GdprDeletionService>;
  let retentionService: jest.Mocked<DataRetentionService>;
  let consentService: jest.Mocked<GdprConsentService>;
  let exportService: jest.Mocked<GdprExportService>;
  let requestService: jest.Mocked<GdprRequestService>;

  const TENANT_ID = 'tenant-001';
  const CUSTOMER_ID = 'cust-001';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GdprController],
      providers: [
        {
          provide: GdprDeletionService,
          useValue: {
            queueDeletion: jest.fn(),
            getJobStatus: jest.fn(),
            cancelDeletion: jest.fn(),
            getQueueStats: jest.fn(),
          },
        },
        {
          provide: DataRetentionService,
          useValue: {
            getRetentionPolicy: jest.fn(),
            getTenantRetentionStats: jest.fn(),
            updateTenantRetentionPolicy: jest.fn(),
            queueRetentionEnforcement: jest.fn(),
          },
        },
        {
          provide: GdprConsentService,
          useValue: {
            recordConsent: jest.fn(),
            revokeConsent: jest.fn(),
            getCustomerConsentStatus: jest.fn(),
            getConsentAuditTrail: jest.fn(),
          },
        },
        {
          provide: GdprExportService,
          useValue: {
            exportCustomerData: jest.fn(),
            exportPortableData: jest.fn(),
            generateExport: jest.fn(),
          },
        },
        {
          provide: GdprRequestService,
          useValue: {
            createRequest: jest.fn(),
            listRequests: jest.fn(),
            getPendingRequests: jest.fn(),
            getRequest: jest.fn(),
            updateStatus: jest.fn(),
            verifyIdentity: jest.fn(),
            assignRequest: jest.fn(),
            rejectRequest: jest.fn(),
            getStatistics: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<GdprController>(GdprController);
    deletionService = module.get(GdprDeletionService) as jest.Mocked<GdprDeletionService>;
    retentionService = module.get(DataRetentionService) as jest.Mocked<DataRetentionService>;
    consentService = module.get(GdprConsentService) as jest.Mocked<GdprConsentService>;
    exportService = module.get(GdprExportService) as jest.Mocked<GdprExportService>;
    requestService = module.get(GdprRequestService) as jest.Mocked<GdprRequestService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ==================== DATA EXPORT ====================

  describe('exportCustomerData', () => {
    it('should delegate to exportService.exportCustomerData', async () => {
      const exportData = { customer: { name: 'John' }, vehicles: [] };
      exportService.exportCustomerData.mockResolvedValue(exportData as never);

      const result = await controller.exportCustomerData(CUSTOMER_ID, TENANT_ID, 'JSON');

      expect(exportService.exportCustomerData).toHaveBeenCalledWith(
        CUSTOMER_ID,
        TENANT_ID,
        'JSON',
        undefined,
      );
      expect(result).toEqual(exportData);
    });
  });

  describe('exportPortableData', () => {
    it('should delegate to exportService.exportPortableData', async () => {
      const portableData = { format: 'portable', data: {} };
      exportService.exportPortableData.mockResolvedValue(portableData as never);

      const result = await controller.exportPortableData(CUSTOMER_ID, TENANT_ID);

      expect(exportService.exportPortableData).toHaveBeenCalledWith(CUSTOMER_ID, TENANT_ID);
      expect(result).toEqual(portableData);
    });
  });

  // ==================== DATA DELETION ====================

  describe('queueDeletion', () => {
    it('should delegate to deletionService.queueDeletion', async () => {
      const body = { requestId: 'req-001', reason: 'Customer request' };
      const jobResult = { jobId: 'job-001', status: 'queued' };
      deletionService.queueDeletion.mockResolvedValue(jobResult as never);

      const result = await controller.queueDeletion(CUSTOMER_ID, TENANT_ID, body as never);

      expect(deletionService.queueDeletion).toHaveBeenCalledWith(
        CUSTOMER_ID,
        TENANT_ID,
        'req-001',
        'Customer request',
        { identityVerificationMethod: undefined },
      );
      expect(result).toEqual(jobResult);
    });
  });

  describe('getDeletionJobStatus', () => {
    it('should delegate to deletionService.getJobStatus', async () => {
      const status = { jobId: 'job-001', state: 'completed' };
      deletionService.getJobStatus.mockResolvedValue(status as never);

      const result = await controller.getDeletionJobStatus('job-001');

      expect(deletionService.getJobStatus).toHaveBeenCalledWith('job-001');
      expect(result).toEqual(status);
    });
  });

  describe('cancelDeletion', () => {
    it('should delegate to deletionService.cancelDeletion', async () => {
      deletionService.cancelDeletion.mockResolvedValue({ cancelled: true } as never);

      const result = await controller.cancelDeletion('job-001', 'Changed mind');

      expect(deletionService.cancelDeletion).toHaveBeenCalledWith('job-001', 'Changed mind');
      expect(result).toEqual({ cancelled: true });
    });
  });

  // ==================== CONSENT ====================

  describe('getConsentStatus', () => {
    it('should delegate to consentService.getCustomerConsentStatus', async () => {
      const consent = { marketing: true, analytics: false };
      consentService.getCustomerConsentStatus.mockResolvedValue(consent as never);

      const result = await controller.getConsentStatus(CUSTOMER_ID, TENANT_ID);

      expect(consentService.getCustomerConsentStatus).toHaveBeenCalledWith(CUSTOMER_ID, TENANT_ID);
      expect(result).toEqual(consent);
    });
  });

  describe('getConsentHistory', () => {
    it('should delegate to consentService.getConsentAuditTrail', async () => {
      const history = [{ type: 'MARKETING', granted: true, timestamp: new Date() }];
      consentService.getConsentAuditTrail.mockResolvedValue(history as never);

      const result = await controller.getConsentHistory(CUSTOMER_ID, TENANT_ID);

      expect(consentService.getConsentAuditTrail).toHaveBeenCalledWith(CUSTOMER_ID, TENANT_ID);
      expect(result).toEqual(history);
    });
  });

  describe('recordConsent', () => {
    it('should delegate to consentService.recordConsent with headers', async () => {
      const dto = {
        consentType: 'MARKETING',
        granted: true,
        collectionMethod: 'WEB_FORM',
      };
      consentService.recordConsent.mockResolvedValue({ id: 'consent-001' } as never);

      const result = await controller.recordConsent(
        CUSTOMER_ID,
        TENANT_ID,
        dto as never,
        '1.2.3.4',
        'Mozilla/5.0',
      );

      expect(consentService.recordConsent).toHaveBeenCalledWith(
        CUSTOMER_ID,
        TENANT_ID,
        'MARKETING',
        true,
        expect.objectContaining({
          ipAddress: '1.2.3.4',
          userAgent: 'Mozilla/5.0',
          collectionMethod: 'WEB_FORM',
        }),
      );
      expect(result).toEqual({ id: 'consent-001' });
    });
  });

  // ==================== REQUESTS ====================

  describe('createRequest', () => {
    it('should delegate to requestService.createRequest with tenantId', async () => {
      const dto = { requestType: 'ERASURE', priority: 'HIGH', subjectEmail: 'a@b.com' };
      const created = { id: 'req-001', status: 'PENDING' };
      requestService.createRequest.mockResolvedValue(created as never);

      const result = await controller.createRequest(dto as never, TENANT_ID);

      expect(requestService.createRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT_ID,
          source: 'WEB_FORM',
          requestType: 'ERASURE',
          priority: 'HIGH',
        }),
      );
      expect(result).toEqual(created);
    });
  });

  describe('listRequests', () => {
    it('should delegate to requestService.listRequests with filters', async () => {
      const requests = [{ id: 'req-001', status: 'PENDING' }];
      requestService.listRequests.mockResolvedValue(requests as never);

      const result = await controller.listRequests(TENANT_ID, 'PENDING', 'ERASURE');

      expect(requestService.listRequests).toHaveBeenCalledWith(TENANT_ID, {
        status: 'PENDING',
        type: 'ERASURE',
      });
      expect(result).toEqual(requests);
    });
  });

  // ==================== RETENTION ====================

  describe('getRetentionPolicy', () => {
    it('should delegate to retentionService.getRetentionPolicy', async () => {
      const policy = { defaultDays: 365 };
      retentionService.getRetentionPolicy.mockResolvedValue(policy as never);

      const result = await controller.getRetentionPolicy();

      expect(retentionService.getRetentionPolicy).toHaveBeenCalled();
      expect(result).toEqual(policy);
    });
  });

  describe('getRetentionStats', () => {
    it('should delegate to retentionService.getTenantRetentionStats', async () => {
      const stats = { totalRecords: 100, expiringSoon: 5 };
      retentionService.getTenantRetentionStats.mockResolvedValue(stats as never);

      const result = await controller.getRetentionStats(TENANT_ID);

      expect(retentionService.getTenantRetentionStats).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toEqual(stats);
    });
  });

  describe('enforceRetention', () => {
    it('should delegate to retentionService.queueRetentionEnforcement', async () => {
      retentionService.queueRetentionEnforcement.mockResolvedValue({ queued: true } as never);

      const result = await controller.enforceRetention(TENANT_ID);

      expect(retentionService.queueRetentionEnforcement).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toEqual({ queued: true });
    });
  });

  // ==================== ADDITIONAL BRANCH COVERAGE ====================

  describe('getPendingRequests', () => {
    it('should delegate to requestService.getPendingRequests', async () => {
      const pending = { overdue: [], urgent: [], normal: [] };
      requestService.getPendingRequests.mockResolvedValue(pending as never);

      const result = await controller.getPendingRequests(TENANT_ID);

      expect(requestService.getPendingRequests).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toEqual(pending);
    });
  });

  describe('getRequest', () => {
    it('should delegate to requestService.getRequest with requestId and tenantId', async () => {
      const req = { id: 'req-001', status: 'PENDING' };
      requestService.getRequest.mockResolvedValue(req as never);

      const result = await controller.getRequest('req-001', TENANT_ID);

      expect(requestService.getRequest).toHaveBeenCalledWith('req-001', TENANT_ID);
      expect(result).toEqual(req);
    });
  });

  describe('updateRequestStatus', () => {
    it('should delegate to requestService.updateStatus', async () => {
      const updated = { id: 'req-001', status: 'IN_PROGRESS' };
      requestService.updateStatus.mockResolvedValue(updated as never);

      const dto = { status: 'IN_PROGRESS', notes: 'Working on it' };
      const result = await controller.updateRequestStatus('req-001', TENANT_ID, dto as never);

      expect(requestService.updateStatus).toHaveBeenCalledWith(
        'req-001',
        TENANT_ID,
        'IN_PROGRESS',
        'Working on it',
      );
      expect(result).toEqual(updated);
    });

    it('should pass undefined notes when not provided', async () => {
      requestService.updateStatus.mockResolvedValue({} as never);

      await controller.updateRequestStatus('req-001', TENANT_ID, { status: 'COMPLETED' } as never);

      expect(requestService.updateStatus).toHaveBeenCalledWith(
        'req-001',
        TENANT_ID,
        'COMPLETED',
        undefined,
      );
    });
  });

  describe('verifyIdentity', () => {
    it('should delegate to requestService.verifyIdentity', async () => {
      const verified = { verified: true };
      requestService.verifyIdentity.mockResolvedValue(verified as never);

      const dto = { method: 'ID_CARD', documentId: 'doc-001' };
      const result = await controller.verifyIdentity('req-001', TENANT_ID, dto as never);

      expect(requestService.verifyIdentity).toHaveBeenCalledWith('req-001', TENANT_ID, dto);
      expect(result).toEqual(verified);
    });
  });

  describe('assignRequest', () => {
    it('should delegate to requestService.assignRequest', async () => {
      requestService.assignRequest.mockResolvedValue({ assigned: true } as never);

      const result = await controller.assignRequest('req-001', TENANT_ID, 'user-001');

      expect(requestService.assignRequest).toHaveBeenCalledWith('req-001', TENANT_ID, 'user-001');
      expect(result).toEqual({ assigned: true });
    });
  });

  describe('rejectRequest', () => {
    it('should delegate to requestService.rejectRequest with reason and legalBasis', async () => {
      requestService.rejectRequest.mockResolvedValue({ rejected: true } as never);

      const body = { reason: 'Not applicable', legalBasis: 'Art. 17(3)' };
      const result = await controller.rejectRequest('req-001', TENANT_ID, body);

      expect(requestService.rejectRequest).toHaveBeenCalledWith(
        'req-001',
        TENANT_ID,
        'Not applicable',
        'Art. 17(3)',
      );
      expect(result).toEqual({ rejected: true });
    });

    it('should pass undefined legalBasis when not provided', async () => {
      requestService.rejectRequest.mockResolvedValue({} as never);

      await controller.rejectRequest('req-001', TENANT_ID, { reason: 'Denied' });

      expect(requestService.rejectRequest).toHaveBeenCalledWith(
        'req-001',
        TENANT_ID,
        'Denied',
        undefined,
      );
    });
  });

  describe('getRequestStats', () => {
    it('should delegate to requestService.getStatistics', async () => {
      const stats = { total: 10, pending: 3 };
      requestService.getStatistics.mockResolvedValue(stats as never);

      const result = await controller.getRequestStats(TENANT_ID);

      expect(requestService.getStatistics).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toEqual(stats);
    });
  });

  describe('getDeletionQueueStats', () => {
    it('should delegate to deletionService.getQueueStats', async () => {
      const stats = { waiting: 5, active: 1, completed: 20 };
      deletionService.getQueueStats.mockResolvedValue(stats as never);

      const result = await controller.getDeletionQueueStats();

      expect(deletionService.getQueueStats).toHaveBeenCalled();
      expect(result).toEqual(stats);
    });
  });

  describe('revokeConsent', () => {
    it('should delegate to consentService.revokeConsent with reason', async () => {
      consentService.revokeConsent.mockResolvedValue({ revoked: true } as never);

      const body = { reason: 'Customer request', revokedBy: 'admin-001' };
      const result = await controller.revokeConsent(CUSTOMER_ID, TENANT_ID, 'MARKETING', body);

      expect(consentService.revokeConsent).toHaveBeenCalledWith(
        CUSTOMER_ID,
        TENANT_ID,
        'MARKETING',
        'Customer request',
        'admin-001',
      );
      expect(result).toEqual({ revoked: true });
    });

    it('should pass undefined reason and revokedBy when not provided', async () => {
      consentService.revokeConsent.mockResolvedValue({} as never);

      await controller.revokeConsent(CUSTOMER_ID, TENANT_ID, 'ANALYTICS', {});

      expect(consentService.revokeConsent).toHaveBeenCalledWith(
        CUSTOMER_ID,
        TENANT_ID,
        'ANALYTICS',
        undefined,
        undefined,
      );
    });
  });

  describe('generateExport', () => {
    it('should delegate to exportService.generateExport', async () => {
      exportService.generateExport.mockResolvedValue({ jobId: 'job-exp-001' } as never);

      const result = await controller.generateExport(CUSTOMER_ID, TENANT_ID, 'CSV' as never);

      expect(exportService.generateExport).toHaveBeenCalledWith(CUSTOMER_ID, TENANT_ID, 'CSV');
      expect(result).toEqual({ jobId: 'job-exp-001' });
    });

    it('should default format to JSON', async () => {
      exportService.generateExport.mockResolvedValue({} as never);

      await controller.generateExport(CUSTOMER_ID, TENANT_ID);

      expect(exportService.generateExport).toHaveBeenCalledWith(CUSTOMER_ID, TENANT_ID, 'JSON');
    });
  });

  describe('updateRetentionPolicy', () => {
    it('should delegate to retentionService.updateTenantRetentionPolicy', async () => {
      retentionService.updateTenantRetentionPolicy.mockResolvedValue({ updated: true } as never);

      const result = await controller.updateRetentionPolicy(TENANT_ID, 180);

      expect(retentionService.updateTenantRetentionPolicy).toHaveBeenCalledWith(TENANT_ID, 180);
      expect(result).toEqual({ updated: true });
    });
  });

  describe('exportCustomerData — with requestId', () => {
    it('should pass requestId to exportService', async () => {
      exportService.exportCustomerData.mockResolvedValue({} as never);

      await controller.exportCustomerData(CUSTOMER_ID, TENANT_ID, 'CSV' as never, 'req-export-001');

      expect(exportService.exportCustomerData).toHaveBeenCalledWith(
        CUSTOMER_ID,
        TENANT_ID,
        'CSV',
        'req-export-001',
      );
    });
  });

  describe('recordConsent — without headers', () => {
    it('should pass undefined ipAddress and userAgent when headers not provided', async () => {
      consentService.recordConsent.mockResolvedValue({} as never);

      const dto = { consentType: 'DATA_PROCESSING', granted: false };
      await controller.recordConsent(CUSTOMER_ID, TENANT_ID, dto as never);

      expect(consentService.recordConsent).toHaveBeenCalledWith(
        CUSTOMER_ID,
        TENANT_ID,
        'DATA_PROCESSING',
        false,
        expect.objectContaining({
          ipAddress: undefined,
          userAgent: undefined,
        }),
      );
    });
  });

  describe('listRequests — without filters', () => {
    it('should pass undefined status and type when not provided', async () => {
      requestService.listRequests.mockResolvedValue([] as never);

      await controller.listRequests(TENANT_ID);

      expect(requestService.listRequests).toHaveBeenCalledWith(TENANT_ID, {
        status: undefined,
        type: undefined,
      });
    });
  });

  describe('queueDeletion — with verificationMethod', () => {
    it('should pass verificationMethod to deletionService', async () => {
      deletionService.queueDeletion.mockResolvedValue({} as never);

      const body = { requestId: 'req-002', reason: 'Erasure', verificationMethod: 'ID_CARD' };
      await controller.queueDeletion(CUSTOMER_ID, TENANT_ID, body as never);

      expect(deletionService.queueDeletion).toHaveBeenCalledWith(
        CUSTOMER_ID,
        TENANT_ID,
        'req-002',
        'Erasure',
        { identityVerificationMethod: 'ID_CARD' },
      );
    });
  });
});
