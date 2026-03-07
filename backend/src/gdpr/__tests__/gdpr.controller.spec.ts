import { Test, TestingModule } from '@nestjs/testing';
import { GdprController } from '../controllers/gdpr.controller';
import { GdprDeletionService } from '../services/gdpr-deletion.service';
import { DataRetentionService } from '../services/data-retention.service';
import { GdprConsentService } from '../services/gdpr-consent.service';
import { GdprExportService, ExportFormat } from '../services/gdpr-export.service';
import { GdprRequestService, DataSubjectRequestType } from '../services/gdpr-request.service';

describe('GdprController', () => {
  let controller: GdprController;
  let mockDeletionService: jest.Mocked<Partial<GdprDeletionService>>;
  let mockRetentionService: jest.Mocked<Partial<DataRetentionService>>;
  let mockConsentService: jest.Mocked<Partial<GdprConsentService>>;
  let mockExportService: jest.Mocked<Partial<GdprExportService>>;
  let mockRequestService: jest.Mocked<Partial<GdprRequestService>>;

  const mockTenantId = 'tenant-123';
  const mockCustomerId = 'customer-456';
  const mockRequestId = 'request-789';
  const mockJobId = 'job-abc';
  const mockUser = { id: 'user-1', email: 'admin@example.com', role: 'admin' };

  beforeEach(async () => {
    mockDeletionService = {
      queueDeletion: jest.fn(),
      getJobStatus: jest.fn(),
      cancelDeletion: jest.fn(),
      getQueueStats: jest.fn(),
    };

    mockRetentionService = {
      getRetentionPolicy: jest.fn(),
      getTenantRetentionStats: jest.fn(),
      updateTenantRetentionPolicy: jest.fn(),
      queueRetentionEnforcement: jest.fn(),
    };

    mockConsentService = {
      recordConsent: jest.fn(),
      revokeConsent: jest.fn(),
      getCustomerConsentStatus: jest.fn(),
      getConsentAuditTrail: jest.fn(),
    };

    mockExportService = {
      exportCustomerData: jest.fn(),
      exportPortableData: jest.fn(),
      generateExport: jest.fn(),
    };

    mockRequestService = {
      createRequest: jest.fn(),
      listRequests: jest.fn(),
      getPendingRequests: jest.fn(),
      getRequest: jest.fn(),
      updateStatus: jest.fn(),
      verifyIdentity: jest.fn(),
      assignRequest: jest.fn(),
      rejectRequest: jest.fn(),
      getStatistics: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GdprController],
      providers: [
        {
          provide: GdprDeletionService,
          useValue: mockDeletionService,
        },
        {
          provide: DataRetentionService,
          useValue: mockRetentionService,
        },
        {
          provide: GdprConsentService,
          useValue: mockConsentService,
        },
        {
          provide: GdprExportService,
          useValue: mockExportService,
        },
        {
          provide: GdprRequestService,
          useValue: mockRequestService,
        },
      ],
    }).compile();

    controller = module.get<GdprController>(GdprController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Data Subject Requests', () => {
    describe('createRequest', () => {
      it('should create a new data subject request', async () => {
        // Arrange
        const dto = {
          tenantId: mockTenantId,
          requestType: 'DELETION',
          requesterEmail: 'customer@example.com',
          customerId: mockCustomerId,
        };
        const expectedResult = { id: mockRequestId, ticketNumber: 'GDPR-2026-0001' };
        mockRequestService.createRequest.mockResolvedValue(expectedResult);

        // Act
        const result = await controller.createRequest(dto, mockUser);

        // Assert
        expect(result).toEqual(expectedResult);
        expect(mockRequestService.createRequest).toHaveBeenCalledWith({
          ...dto,
          source: 'WEB_FORM',
        });
      });

      it('should handle request without optional fields', async () => {
        // Arrange
        const dto = {
          tenantId: mockTenantId,
          requestType: 'ACCESS',
        };
        mockRequestService.createRequest.mockResolvedValue({ id: mockRequestId });

        // Act
        await controller.createRequest(dto, mockUser);

        // Assert
        expect(mockRequestService.createRequest).toHaveBeenCalledWith({
          tenantId: mockTenantId,
          requestType: 'ACCESS',
          source: 'WEB_FORM',
        });
      });
    });

    describe('listRequests', () => {
      it('should list requests with filters', async () => {
        // Arrange
        const mockRequests = [{ id: 'req-1' }, { id: 'req-2' }];
        mockRequestService.listRequests.mockResolvedValue(mockRequests);

        // Act
        const result = await controller.listRequests(mockTenantId, 'IN_PROGRESS', 'DELETION');

        // Assert
        expect(result).toEqual(mockRequests);
        expect(mockRequestService.listRequests).toHaveBeenCalledWith(mockTenantId, {
          status: 'IN_PROGRESS',
          type: 'DELETION',
        });
      });

      it('should list requests without filters', async () => {
        // Arrange
        mockRequestService.listRequests.mockResolvedValue([]);

        // Act
        await controller.listRequests(mockTenantId);

        // Assert
        expect(mockRequestService.listRequests).toHaveBeenCalledWith(mockTenantId, {
          status: undefined,
          type: undefined,
        });
      });
    });

    describe('getPendingRequests', () => {
      it('should get pending requests', async () => {
        // Arrange
        const mockPending = { overdue: [], urgent: [], normal: [] };
        mockRequestService.getPendingRequests.mockResolvedValue(mockPending);

        // Act
        const result = await controller.getPendingRequests(mockTenantId);

        // Assert
        expect(result).toEqual(mockPending);
        expect(mockRequestService.getPendingRequests).toHaveBeenCalledWith(mockTenantId);
      });

      it('should get pending requests without tenant filter', async () => {
        // Arrange
        mockRequestService.getPendingRequests.mockResolvedValue({ overdue: [], urgent: [], normal: [] });

        // Act
        await controller.getPendingRequests();

        // Assert
        expect(mockRequestService.getPendingRequests).toHaveBeenCalledWith(undefined);
      });
    });

    describe('getRequest', () => {
      it('should get a specific request', async () => {
        // Arrange
        const mockRequest = { id: mockRequestId };
        mockRequestService.getRequest.mockResolvedValue(mockRequest);

        // Act
        const result = await controller.getRequest(mockRequestId, mockTenantId);

        // Assert
        expect(result).toEqual(mockRequest);
        expect(mockRequestService.getRequest).toHaveBeenCalledWith(mockRequestId, mockTenantId);
      });
    });

    describe('updateRequestStatus', () => {
      it('should update request status', async () => {
        // Arrange
        const dto = { status: 'COMPLETED', notes: 'Done' };
        mockRequestService.updateStatus.mockResolvedValue({ id: mockRequestId, status: 'COMPLETED' });

        // Act
        const result = await controller.updateRequestStatus(mockRequestId, mockTenantId, dto);

        // Assert
        expect(result).toEqual({ id: mockRequestId, status: 'COMPLETED' });
        expect(mockRequestService.updateStatus).toHaveBeenCalledWith(
          mockRequestId,
          mockTenantId,
          'COMPLETED',
          'Done',
        );
      });
    });

    describe('verifyIdentity', () => {
      it('should verify requester identity', async () => {
        // Arrange
        const dto = { method: 'PHONE', documents: ['id.pdf'] };
        mockRequestService.verifyIdentity.mockResolvedValue({ success: true });

        // Act
        const result = await controller.verifyIdentity(mockRequestId, mockTenantId, dto);

        // Assert
        expect(result).toEqual({ success: true });
        expect(mockRequestService.verifyIdentity).toHaveBeenCalledWith(mockRequestId, mockTenantId, dto);
      });
    });

    describe('assignRequest', () => {
      it('should assign request to user', async () => {
        // Arrange
        const userId = 'user-456';
        mockRequestService.assignRequest.mockResolvedValue({ id: mockRequestId, assignedTo: userId });

        // Act
        const result = await controller.assignRequest(mockRequestId, mockTenantId, userId);

        // Assert
        expect(result).toEqual({ id: mockRequestId, assignedTo: userId });
        expect(mockRequestService.assignRequest).toHaveBeenCalledWith(mockRequestId, mockTenantId, userId);
      });
    });

    describe('rejectRequest', () => {
      it('should reject a request', async () => {
        // Arrange
        const body = { reason: 'Invalid request', legalBasis: 'Art. 17(3)' };
        mockRequestService.rejectRequest.mockResolvedValue({ id: mockRequestId, status: 'REJECTED' });

        // Act
        const result = await controller.rejectRequest(mockRequestId, mockTenantId, body);

        // Assert
        expect(result).toEqual({ id: mockRequestId, status: 'REJECTED' });
        expect(mockRequestService.rejectRequest).toHaveBeenCalledWith(
          mockRequestId,
          mockTenantId,
          'Invalid request',
          'Art. 17(3)',
        );
      });

      it('should reject without legal basis', async () => {
        // Arrange
        const body = { reason: 'Not applicable' };
        mockRequestService.rejectRequest.mockResolvedValue({ id: mockRequestId, status: 'REJECTED' });

        // Act
        await controller.rejectRequest(mockRequestId, mockTenantId, body);

        // Assert
        expect(mockRequestService.rejectRequest).toHaveBeenCalledWith(
          mockRequestId,
          mockTenantId,
          'Not applicable',
          undefined,
        );
      });
    });

    describe('getRequestStats', () => {
      it('should get request statistics', async () => {
        // Arrange
        const mockStats = { total: 100, completed: 80 };
        mockRequestService.getStatistics.mockResolvedValue(mockStats);

        // Act
        const result = await controller.getRequestStats(mockTenantId);

        // Assert
        expect(result).toEqual(mockStats);
        expect(mockRequestService.getStatistics).toHaveBeenCalledWith(mockTenantId);
      });

      it('should get statistics without tenant filter', async () => {
        // Arrange
        mockRequestService.getStatistics.mockResolvedValue({});

        // Act
        await controller.getRequestStats();

        // Assert
        expect(mockRequestService.getStatistics).toHaveBeenCalledWith(undefined);
      });
    });
  });

  describe('Data Exports', () => {
    describe('exportCustomerData', () => {
      it('should export customer data in JSON format', async () => {
        // Arrange
        const mockExport = { data: {}, format: 'JSON' };
        mockExportService.exportCustomerData.mockResolvedValue(mockExport);

        // Act
        const result = await controller.exportCustomerData(mockCustomerId, mockTenantId, 'JSON', mockRequestId);

        // Assert
        expect(result).toEqual(mockExport);
        expect(mockExportService.exportCustomerData).toHaveBeenCalledWith(
          mockCustomerId,
          mockTenantId,
          'JSON',
          mockRequestId,
        );
      });

      it('should export with default JSON format', async () => {
        // Arrange
        mockExportService.exportCustomerData.mockResolvedValue({});

        // Act
        await controller.exportCustomerData(mockCustomerId, mockTenantId);

        // Assert
        expect(mockExportService.exportCustomerData).toHaveBeenCalledWith(
          mockCustomerId,
          mockTenantId,
          'JSON',
          undefined,
        );
      });

      it('should export in CSV format', async () => {
        // Arrange
        mockExportService.exportCustomerData.mockResolvedValue({});

        // Act
        await controller.exportCustomerData(mockCustomerId, mockTenantId, 'CSV');

        // Assert
        expect(mockExportService.exportCustomerData).toHaveBeenCalledWith(
          mockCustomerId,
          mockTenantId,
          'CSV',
          undefined,
        );
      });
    });

    describe('exportPortableData', () => {
      it('should export portable data', async () => {
        // Arrange
        const mockExport = { data: {}, format: 'JSON' };
        mockExportService.exportPortableData.mockResolvedValue(mockExport);

        // Act
        const result = await controller.exportPortableData(mockCustomerId, mockTenantId);

        // Assert
        expect(result).toEqual(mockExport);
        expect(mockExportService.exportPortableData).toHaveBeenCalledWith(mockCustomerId, mockTenantId);
      });
    });

    describe('generateExport', () => {
      it('should generate and queue export', async () => {
        // Arrange
        mockExportService.generateExport.mockResolvedValue({ jobId: 'export-1' });

        // Act
        const result = await controller.generateExport(mockCustomerId, mockTenantId, 'PDF');

        // Assert
        expect(result).toEqual({ jobId: 'export-1' });
        expect(mockExportService.generateExport).toHaveBeenCalledWith(mockCustomerId, mockTenantId, 'PDF');
      });

      it('should generate with default format', async () => {
        // Arrange
        mockExportService.generateExport.mockResolvedValue({});

        // Act
        await controller.generateExport(mockCustomerId, mockTenantId);

        // Assert
        expect(mockExportService.generateExport).toHaveBeenCalledWith(mockCustomerId, mockTenantId, 'JSON');
      });
    });
  });

  describe('Data Deletion', () => {
    describe('queueDeletion', () => {
      it('should queue customer data deletion', async () => {
        // Arrange
        const body = {
          requestId: mockRequestId,
          reason: 'Customer request',
          verificationMethod: 'PHONE',
        };
        mockDeletionService.queueDeletion.mockResolvedValue({
          jobId: mockJobId,
          status: 'QUEUED',
          estimatedCompletion: new Date(),
          slaDeadline: new Date(),
        });

        // Act
        const result = await controller.queueDeletion(mockCustomerId, mockTenantId, body);

        // Assert
        expect(result).toHaveProperty('jobId');
        expect(mockDeletionService.queueDeletion).toHaveBeenCalledWith(
          mockCustomerId,
          mockTenantId,
          mockRequestId,
          'Customer request',
          { identityVerificationMethod: 'PHONE' },
        );
      });

      it('should queue deletion without verification method', async () => {
        // Arrange
        const body = { requestId: mockRequestId, reason: 'Legal requirement' };
        mockDeletionService.queueDeletion.mockResolvedValue({ jobId: mockJobId, status: 'QUEUED', estimatedCompletion: new Date(), slaDeadline: new Date() });

        // Act
        await controller.queueDeletion(mockCustomerId, mockTenantId, body);

        // Assert
        expect(mockDeletionService.queueDeletion).toHaveBeenCalledWith(
          mockCustomerId,
          mockTenantId,
          mockRequestId,
          'Legal requirement',
          { identityVerificationMethod: undefined },
        );
      });
    });

    describe('getDeletionJobStatus', () => {
      it('should get deletion job status', async () => {
        // Arrange
        const mockStatus = {
          jobId: mockJobId,
          state: 'active',
          progress: 50,
          attempts: 1,
        };
        mockDeletionService.getJobStatus.mockResolvedValue(mockStatus);

        // Act
        const result = await controller.getDeletionJobStatus(mockJobId);

        // Assert
        expect(result).toEqual(mockStatus);
        expect(mockDeletionService.getJobStatus).toHaveBeenCalledWith(mockJobId);
      });
    });

    describe('cancelDeletion', () => {
      it('should cancel a pending deletion job', async () => {
        // Arrange
        mockDeletionService.cancelDeletion.mockResolvedValue({ success: true, message: 'Cancelled' });

        // Act
        const result = await controller.cancelDeletion(mockJobId, 'Customer changed mind');

        // Assert
        expect(result).toEqual({ success: true, message: 'Cancelled' });
        expect(mockDeletionService.cancelDeletion).toHaveBeenCalledWith(mockJobId, 'Customer changed mind');
      });
    });

    describe('getDeletionQueueStats', () => {
      it('should get queue statistics', async () => {
        // Arrange
        const mockStats = { waiting: 5, active: 2, completed: 100, failed: 0, delayed: 0 };
        mockDeletionService.getQueueStats.mockResolvedValue(mockStats);

        // Act
        const result = await controller.getDeletionQueueStats();

        // Assert
        expect(result).toEqual(mockStats);
        expect(mockDeletionService.getQueueStats).toHaveBeenCalled();
      });
    });
  });

  describe('Consent Management', () => {
    describe('recordConsent', () => {
      it('should record customer consent', async () => {
        // Arrange
        const dto = {
          consentType: 'GDPR',
          granted: true,
          collectionMethod: 'WEB_FORM',
          collectionPoint: 'signup',
          legalBasis: 'CONSENT',
          verifiedIdentity: true,
        };
        mockConsentService.recordConsent.mockResolvedValue({
          id: 'consent-1',
          customerId: mockCustomerId,
          consentType: 'GDPR',
          granted: true,
        } as any);

        // Act
        const result = await controller.recordConsent(
          mockCustomerId,
          mockTenantId,
          dto,
          '192.168.1.1',
          'Mozilla/5.0',
        );

        // Assert
        expect(result).toHaveProperty('id', 'consent-1');
        expect(mockConsentService.recordConsent).toHaveBeenCalledWith(
          mockCustomerId,
          mockTenantId,
          'GDPR',
          true,
          {
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0',
            collectionMethod: 'WEB_FORM',
            collectionPoint: 'signup',
            legalBasis: 'CONSENT',
            verifiedIdentity: true,
            metadata: undefined,
          },
        );
      });

      it('should record consent without headers', async () => {
        // Arrange
        const dto = { consentType: 'MARKETING', granted: true };
        mockConsentService.recordConsent.mockResolvedValue({ id: 'consent-1' } as any);

        // Act
        await controller.recordConsent(mockCustomerId, mockTenantId, dto);

        // Assert
        expect(mockConsentService.recordConsent).toHaveBeenCalledWith(
          mockCustomerId,
          mockTenantId,
          'MARKETING',
          true,
          {
            ipAddress: undefined,
            userAgent: undefined,
            collectionMethod: undefined,
            collectionPoint: undefined,
            legalBasis: undefined,
            verifiedIdentity: undefined,
            metadata: undefined,
          },
        );
      });

      it('should handle metadata in consent', async () => {
        // Arrange
        const dto = {
          consentType: 'ANALYTICS',
          granted: true,
          metadata: { campaign: 'spring2024' },
        };
        mockConsentService.recordConsent.mockResolvedValue({ id: 'consent-1' } as any);

        // Act
        await controller.recordConsent(mockCustomerId, mockTenantId, dto);

        // Assert
        expect(mockConsentService.recordConsent).toHaveBeenCalledWith(
          mockCustomerId,
          mockTenantId,
          'ANALYTICS',
          true,
          expect.objectContaining({
            metadata: { campaign: 'spring2024' },
          }),
        );
      });
    });

    describe('revokeConsent', () => {
      it('should revoke customer consent', async () => {
        // Arrange
        const body = { reason: 'No longer interested', revokedBy: 'admin@example.com' };
        mockConsentService.revokeConsent.mockResolvedValue(undefined);

        // Act
        const result = await controller.revokeConsent(mockCustomerId, mockTenantId, 'MARKETING', body);

        // Assert
        expect(result).toBeUndefined();
        expect(mockConsentService.revokeConsent).toHaveBeenCalledWith(
          mockCustomerId,
          mockTenantId,
          'MARKETING',
          'No longer interested',
          'admin@example.com',
        );
      });

      it('should revoke without optional body fields', async () => {
        // Arrange
        mockConsentService.revokeConsent.mockResolvedValue(undefined);

        // Act
        await controller.revokeConsent(mockCustomerId, mockTenantId, 'GDPR', {});

        // Assert
        expect(mockConsentService.revokeConsent).toHaveBeenCalledWith(
          mockCustomerId,
          mockTenantId,
          'GDPR',
          undefined,
          undefined,
        );
      });
    });

    describe('getConsentStatus', () => {
      it('should get customer consent status', async () => {
        // Arrange
        const mockStatus = {
          customerId: mockCustomerId,
          gdprConsent: true,
          marketingConsent: false,
          callRecordingConsent: true,
        };
        mockConsentService.getCustomerConsentStatus.mockResolvedValue(mockStatus as any);

        // Act
        const result = await controller.getConsentStatus(mockCustomerId, mockTenantId);

        // Assert
        expect(result).toEqual(mockStatus);
        expect(mockConsentService.getCustomerConsentStatus).toHaveBeenCalledWith(
          mockCustomerId,
          mockTenantId,
        );
      });
    });

    describe('getConsentHistory', () => {
      it('should get consent audit trail', async () => {
        // Arrange
        const mockHistory = [{ type: 'GDPR', consent: true, timestamp: new Date() }];
        mockConsentService.getConsentAuditTrail.mockResolvedValue(mockHistory as any);

        // Act
        const result = await controller.getConsentHistory(mockCustomerId, mockTenantId);

        // Assert
        expect(result).toEqual(mockHistory);
        expect(mockConsentService.getConsentAuditTrail).toHaveBeenCalledWith(
          mockCustomerId,
          mockTenantId,
        );
      });
    });
  });

  describe('Data Retention', () => {
    describe('getRetentionPolicy', () => {
      it('should get retention policy configuration', async () => {
        // Arrange
        const mockPolicy = { defaultDays: 365, maxDays: 2555 };
        mockRetentionService.getRetentionPolicy.mockResolvedValue(mockPolicy);

        // Act
        const result = await controller.getRetentionPolicy();

        // Assert
        expect(result).toEqual(mockPolicy);
        expect(mockRetentionService.getRetentionPolicy).toHaveBeenCalled();
      });
    });

    describe('getRetentionStats', () => {
      it('should get retention statistics for tenant', async () => {
        // Arrange
        const mockStats = { totalRecords: 1000, expiringSoon: 50 };
        mockRetentionService.getTenantRetentionStats.mockResolvedValue(mockStats);

        // Act
        const result = await controller.getRetentionStats(mockTenantId);

        // Assert
        expect(result).toEqual(mockStats);
        expect(mockRetentionService.getTenantRetentionStats).toHaveBeenCalledWith(mockTenantId);
      });
    });

    describe('updateRetentionPolicy', () => {
      it('should update tenant retention policy', async () => {
        // Arrange
        const days = 730; // 2 years
        mockRetentionService.updateTenantRetentionPolicy.mockResolvedValue({ success: true });

        // Act
        const result = await controller.updateRetentionPolicy(mockTenantId, days);

        // Assert
        expect(result).toEqual({ success: true });
        expect(mockRetentionService.updateTenantRetentionPolicy).toHaveBeenCalledWith(
          mockTenantId,
          days,
        );
      });
    });

    describe('enforceRetention', () => {
      it('should trigger retention enforcement for specific tenant', async () => {
        // Arrange
        mockRetentionService.queueRetentionEnforcement.mockResolvedValue({ queued: true });

        // Act
        const result = await controller.enforceRetention(mockTenantId);

        // Assert
        expect(result).toEqual({ queued: true });
        expect(mockRetentionService.queueRetentionEnforcement).toHaveBeenCalledWith(mockTenantId);
      });

      it('should trigger retention enforcement for all tenants', async () => {
        // Arrange
        mockRetentionService.queueRetentionEnforcement.mockResolvedValue({ queued: true });

        // Act
        await controller.enforceRetention();

        // Assert
        expect(mockRetentionService.queueRetentionEnforcement).toHaveBeenCalledWith(undefined);
      });
    });
  });
});
